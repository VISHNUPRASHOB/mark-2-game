import * as THREE from 'three';
import { clamp, lerp, normalizeAngle } from './utils/math.js';

/**
 * GTA 5 Style Arcade-Sim Vehicle Physics
 * Features:
 * - Dynamic 5-speed transmission with simulated RPM & torque curves
 * - Authentic GTA 5 weight transfer: suspension pitch (dive/squat) & roll (body lean)
 * - Power-slide & handbrake drift with oversteer, counter-steer stabilization & tire slip calculation
 * - Dynamic steering angle with speed sensitivity
 * - Smooth barrier deflection with realistic impulse response & sparks
 */
export class CarPhysics {
  /**
   * @param {object} carStats - Stats from carData.js { topSpeed, acceleration, handling, braking, drift }
   * @param {THREE.CatmullRomCurve3} trackCurve - The track spline
   * @param {number} trackWidth - Track width for boundary detection
   */
  constructor(carStats, trackCurve, trackWidth) {
    this.carStats = carStats;
    this.trackCurve = trackCurve;
    this.trackWidth = trackWidth;
    
    // Core transforms
    this.position = new THREE.Vector3();
    this.rotation = 0; // Heading in radians
    this.speed = 0;    // Forward/backward speed
    this.lateralVelocity = 0; // Sideways slip velocity
    
    // GTA 5 Visual & Handling dynamics
    this.steerAngle = 0;     // Front wheels steer angle (-maxSteer to +maxSteer)
    this.driftAngle = 0;     // Visual chassis yaw offset during slides
    this.pitch = 0;          // Suspension pitch (acceleration squat / braking dive)
    this.roll = 0;           // Suspension roll (centrifugal cornering lean)
    this.drifting = false;
    this.braking = false;
    this.reversing = false;
    this.tireSlip = 0;       // 0..1 slip ratio for skid marks and screech audio
    this.sparkTrigger = false;
    this.sparkPosition = new THREE.Vector3();
    this.sparkNormal = new THREE.Vector3();
    
    // 5-Speed Transmission Simulation
    this.gear = 1;
    this.rpm = 0.2; // 0..1 RPM gauge
    this.gearShifted = false;
    this._shiftCooldown = 0;
    
    this.trackProgress = 0;
    
    // Pre-cache track samples for efficient nearest-point lookups
    this._trackSamples = 250;
    this._cachedPoints = [];
    if (trackCurve) {
      for (let i = 0; i <= this._trackSamples; i++) {
        const t = i / this._trackSamples;
        this._cachedPoints.push({
          t,
          point: trackCurve.getPointAt(t)
        });
      }
    }
  }
  
  /**
   * Update physics one frame
   * @param {number} dt - Delta time in seconds
   * @param {{ forward: boolean, backward: boolean, left: boolean, right: boolean, brake: boolean }} input
   */
  update(dt, input) {
    const { topSpeed, acceleration, handling, braking, drift } = this.carStats;
    const absSpeed = Math.abs(this.speed);
    const speedRatio = absSpeed / topSpeed;
    
    this.sparkTrigger = false;
    this.gearShifted = false;
    if (this._shiftCooldown > 0) this._shiftCooldown -= dt;
    
    // ─── 1. STEERING DYNAMICS (GTA 5 Style) ────────────────────────
    // Steer angle target: wide at low speed, tighter and stable at high speeds
    const maxSteerAngle = 0.55; // ~31.5 degrees
    let targetSteer = 0;
    if (input.left) targetSteer += 1;
    if (input.right) targetSteer -= 1;
    
    // Steer speed sensitivity (GTA 5 responsive feel)
    const steerSensitivity = clamp(1.2 - speedRatio * 0.45, 0.45, 1.2);
    const targetAngle = targetSteer * maxSteerAngle * steerSensitivity;
    
    // Smoothly turn front wheels toward target steer angle
    const steerSpeed = 10.0; // Fast response
    this.steerAngle = lerp(this.steerAngle, targetAngle, 1 - Math.exp(-steerSpeed * dt));
    
    // ─── 2. ACCELERATION, GEARS & BRAKING ──────────────────────────
    this.braking = false;
    this.reversing = false;
    
    // Calculate current gear and RPM for engine audio and torque delivery
    this._updateTransmission(dt, absSpeed, topSpeed);
    
    // Gear torque multiplier (higher torque in 1st/2nd gear like GTA 5)
    const gearTorque = [1.35, 1.15, 1.0, 0.9, 0.82][this.gear - 1] || 1.0;
    
    if (input.forward && !input.backward) {
      if (this.speed < -1.0) {
        // Braking while reversing
        this.braking = true;
        this.speed += braking * 1.5 * dt;
      } else {
        // Forward drive
        const accelForce = acceleration * gearTorque;
        // Natural power drop near top speed
        const topEndFactor = clamp(1.0 - Math.pow(speedRatio, 3), 0.05, 1.0);
        this.speed += accelForce * topEndFactor * dt;
        if (this.speed > topSpeed) this.speed = topSpeed;
      }
    } else if (input.backward && !input.forward) {
      if (this.speed > 2.0) {
        // Braking while moving forward
        this.braking = true;
        this.speed -= braking * dt;
        if (this.speed < 0) this.speed = 0;
      } else {
        // Reverse gear
        this.reversing = true;
        const revMax = -topSpeed * 0.35;
        this.speed -= acceleration * 0.7 * dt;
        if (this.speed < revMax) this.speed = revMax;
      }
    } else {
      // Coasting friction (air resistance + rolling drag)
      if (absSpeed < 1.0) {
        this.speed = 0;
      } else {
        const drag = 0.8 + speedRatio * 1.5;
        this.speed *= Math.max(0, 1 - drag * dt);
      }
    }
    
    // Handbrake / Spacebar braking
    const isHandbrake = input.brake;
    if (isHandbrake) {
      this.braking = true;
      if (absSpeed > 1.0) {
        this.speed -= Math.sign(this.speed) * braking * 0.85 * dt;
      } else {
        this.speed = 0;
      }
    }
    
    // ─── 3. GTA 5 DRIFT & CORNERING PHYSICS ─────────────────────────
    // Yaw angular velocity based on steering and speed
    const baseTurnRate = handling * 3.8;
    // Turn authority curve: minimal at 0 speed, optimal around 30-70% speed
    let speedTurnFactor = clamp(speedRatio * 3.0, 0.1, 1.0);
    if (speedRatio > 0.75) {
      speedTurnFactor = clamp(1.0 - (speedRatio - 0.75) * 0.8, 0.6, 1.0);
    }
    
    let yawDelta = (this.steerAngle / maxSteerAngle) * baseTurnRate * speedTurnFactor * dt;
    
    // Handbrake Initiates Power Slide / Oversteer
    const isSlideRequested = (isHandbrake && Math.abs(this.steerAngle) > 0.1 && speedRatio > 0.25) ||
                             (input.forward && isHandbrake && absSpeed < 10); // Burnout
    
    if (isSlideRequested) {
      this.drifting = true;
      // Drift multiplier kicks the back out
      const driftPower = 1.0 + (drift * 1.4);
      yawDelta *= driftPower;
      
      // Target drift visual angle (counter-steer angle)
      const targetDriftAngle = -Math.sign(this.steerAngle) * clamp(0.25 + drift * 0.45, 0.2, 0.7);
      this.driftAngle = lerp(this.driftAngle, targetDriftAngle, 1 - Math.exp(-6.0 * dt));
      
      // Lateral tire slip
      this.tireSlip = lerp(this.tireSlip, 1.0, 1 - Math.exp(-8.0 * dt));
      // Handbrake drift bleeds some forward momentum into lateral slide
      this.speed *= Math.max(0, 1 - dt * 0.4);
    } else {
      // Normal turning / High-G slip
      const highGCorner = Math.abs(this.steerAngle) > 0.35 && speedRatio > 0.65;
      if (highGCorner) {
        this.drifting = true;
        this.tireSlip = lerp(this.tireSlip, 0.6 * drift, 1 - Math.exp(-4.0 * dt));
        this.driftAngle = lerp(this.driftAngle, -Math.sign(this.steerAngle) * 0.15 * drift, 1 - Math.exp(-4.0 * dt));
      } else {
        this.drifting = false;
        this.tireSlip = lerp(this.tireSlip, 0.0, 1 - Math.exp(-7.0 * dt));
        this.driftAngle = lerp(this.driftAngle, 0.0, 1 - Math.exp(-8.0 * dt));
      }
    }
    
    // Burnout donut handling at low speeds
    if (input.forward && isHandbrake && absSpeed < 15) {
      this.drifting = true;
      this.tireSlip = 1.0;
      if (Math.abs(this.steerAngle) > 0.1) {
        yawDelta = Math.sign(this.steerAngle) * 4.5 * dt;
      }
    }
    
    // Apply vehicle heading rotation
    this.rotation += yawDelta;
    this.rotation = normalizeAngle(this.rotation);
    
    // ─── 4. SUSPENSION PITCH & ROLL (GTA 5 Body Dynamics) ───────────
    // Pitch: Acceleration squats the rear (+), heavy braking dives the nose (-)
    let targetPitch = 0;
    if (input.forward && !this.braking) {
      targetPitch = 0.04 * (acceleration / 100);
    } else if (this.braking) {
      targetPitch = -0.06 * (braking / 100);
    }
    this.pitch = lerp(this.pitch, targetPitch, 1 - Math.exp(-8.0 * dt));
    
    // Roll: Centrifugal force leans car chassis outwards in turns
    const lateralG = (this.speed / topSpeed) * (this.steerAngle / maxSteerAngle);
    const targetRoll = -lateralG * 0.08;
    this.roll = lerp(this.roll, targetRoll, 1 - Math.exp(-9.0 * dt));
    
    // ─── 5. POSITION & VELOCITY UPDATE ──────────────────────────────
    // Total effective heading including drift slip angle
    const movementAngle = this.rotation + (this.driftAngle * 0.65);
    this.position.x += Math.sin(movementAngle) * this.speed * dt;
    this.position.z += Math.cos(movementAngle) * this.speed * dt;
    
    // ─── 6. TRACK BOUNDARY & GTA 5 GUARDRAIL DEFLECTION ─────────────
    if (this.trackCurve && this._cachedPoints.length > 0) {
      const trackInfo = this._getClosestTrackPoint();
      if (trackInfo) {
        this.trackProgress = trackInfo.t;
        
        // Horizontal distance from spline center
        const dx = this.position.x - trackInfo.point.x;
        const dz = this.position.z - trackInfo.point.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const halfWidth = (this.trackWidth / 2) - 0.2;
        
        if (dist > halfWidth) {
          // Wall collision normal pointing inwards toward track center
          const nx = dx / (dist || 1);
          const nz = dz / (dist || 1);
          
          // Clamp position to stay inside track barrier
          this.position.x = trackInfo.point.x + nx * halfWidth;
          this.position.z = trackInfo.point.z + nz * halfWidth;
          
          // Get the forward track direction at current progress
          const trackTangent = this.trackCurve.getTangentAt(this.trackProgress);
          const trackHeading = Math.atan2(trackTangent.x, trackTangent.z);
          
          // Dot product to check if moving into the wall
          const forwardX = Math.sin(this.rotation);
          const forwardZ = Math.cos(this.rotation);
          const dot = forwardX * nx + forwardZ * nz;
          
          if (dot > 0.05) {
            // Smoothly align vehicle heading forward with track flow (never spin backwards!)
            this.rotation = lerp(this.rotation, trackHeading, 1 - Math.exp(-8.0 * dt));
            this.rotation = normalizeAngle(this.rotation);
            
            // Speed penalty
            const speedPenalty = clamp(dot * 0.4, 0.05, 0.35);
            this.speed *= (1.0 - speedPenalty);
            
            // Trigger sparks and sound
            this.sparkTrigger = true;
            this.sparkPosition.set(this.position.x, this.position.y + 0.35, this.position.z);
            this.sparkNormal.set(-nx, 0.4, -nz).normalize();
          } else {
            // Light scraping along barrier
            this.speed *= Math.max(0, 1 - dt * 1.0);
            if (absSpeed > 20) {
              this.sparkTrigger = true;
              this.sparkPosition.set(this.position.x, this.position.y + 0.3, this.position.z);
              this.sparkNormal.set(-nx, 0.2, -nz).normalize();
            }
          }
        }
        
        // Smooth suspension ground height adaptation
        this.position.y = lerp(this.position.y, trackInfo.point.y + 0.28, 1 - Math.exp(-15.0 * dt));
      }
    }
  }
  
  /**
   * Internal simulation for 5-speed automatic gearbox
   */
  _updateTransmission(dt, absSpeed, topSpeed) {
    const gearRatios = [0.22, 0.42, 0.65, 0.85, 1.05];
    const numGears = 5;
    
    let targetGear = 1;
    for (let i = 0; i < numGears; i++) {
      if (absSpeed > topSpeed * gearRatios[i] * 0.88 && i < numGears - 1) {
        targetGear = i + 2;
      }
    }
    
    // Trigger upshift / downshift
    if (targetGear !== this.gear && this._shiftCooldown <= 0) {
      if (targetGear > this.gear) {
        this.gearShifted = true; // Upshift pop!
      }
      this.gear = targetGear;
      this._shiftCooldown = 0.6;
    }
    
    // Compute RPM within current gear range (0.2 idle to 1.0 redline)
    const prevRatio = this.gear === 1 ? 0 : gearRatios[this.gear - 2];
    const currRatio = gearRatios[this.gear - 1];
    const gearProgress = clamp((absSpeed / topSpeed - prevRatio) / (currRatio - prevRatio + 0.001), 0, 1);
    
    const targetRPM = 0.25 + gearProgress * 0.75;
    this.rpm = lerp(this.rpm, targetRPM, 1 - Math.exp(-8.0 * dt));
  }
  
  /**
   * Find closest point on track spline
   */
  _getClosestTrackPoint() {
    let minDist = Infinity;
    let bestIdx = 0;
    
    for (let i = 0; i < this._cachedPoints.length; i++) {
      const pt = this._cachedPoints[i].point;
      const dx = this.position.x - pt.x;
      const dz = this.position.z - pt.z;
      const d = dx * dx + dz * dz;
      if (d < minDist) {
        minDist = d;
        bestIdx = i;
      }
    }
    
    // Fine refinement step
    const step = 1 / (this._trackSamples * 8);
    const tCenter = this._cachedPoints[bestIdx].t;
    const tMin = Math.max(0, tCenter - 2 / this._trackSamples);
    const tMax = Math.min(1, tCenter + 2 / this._trackSamples);
    
    let bestT = tCenter;
    let bestPoint = this._cachedPoints[bestIdx].point;
    let bestDist = minDist;
    
    for (let t = tMin; t <= tMax; t += step) {
      const pt = this.trackCurve.getPointAt(t);
      const dx = this.position.x - pt.x;
      const dz = this.position.z - pt.z;
      const d = dx * dx + dz * dz;
      if (d < bestDist) {
        bestDist = d;
        bestT = t;
        bestPoint = pt;
      }
    }
    
    return { point: bestPoint, t: bestT };
  }
  
  // ─── GETTERS ───────────────────────────────────────────────────
  getPosition() { return this.position; }
  getRotation() { return this.rotation; }
  getVisualRotation() { return this.rotation + this.driftAngle; }
  getSteerAngle() { return this.steerAngle; }
  getPitch() { return this.pitch; }
  getRoll() { return this.roll; }
  getSpeed() { return Math.abs(this.speed); }
  getRawSpeed() { return this.speed; }
  getSpeedFraction() { return clamp(Math.abs(this.speed) / this.carStats.topSpeed, 0, 1); }
  isDrifting() { return this.drifting; }
  isBraking() { return this.braking; }
  isReversing() { return this.reversing; }
  getTireSlip() { return this.tireSlip; }
  getCurrentGear() { return this.gear; }
  getRPM() { return this.rpm; }
  hasGearShifted() { return this.gearShifted; }
  getTrackProgress() { return this.trackProgress; }
  
  /**
   * Reset car to a position and rotation
   */
  reset(position, rotation) {
    this.position.copy(position);
    this.rotation = rotation;
    this.speed = 0;
    this.steerAngle = 0;
    this.driftAngle = 0;
    this.pitch = 0;
    this.roll = 0;
    this.drifting = false;
    this.braking = false;
    this.reversing = false;
    this.tireSlip = 0;
    this.gear = 1;
    this.rpm = 0.2;
    this.trackProgress = 0;
  }
}
