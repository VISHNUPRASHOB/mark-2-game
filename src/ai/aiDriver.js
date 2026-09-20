import * as THREE from 'three';

/**
 * AI-controlled car driver
 */
export class AIDriver {
  /**
   * @param {object} carStats - Car stats from carData.js
   * @param {THREE.CatmullRomCurve3} trackCurve - Track spline to follow
   * @param {number} trackWidth - Track width
   * @param {number} difficulty - 0..1 difficulty factor
   * @param {number} laneOffset - Lateral offset from centerline (-1 to 1)
   */
  constructor(carStats, trackCurve, trackWidth, difficulty, laneOffset) {
    this.carStats = carStats;
    this.trackCurve = trackCurve;
    this.trackWidth = trackWidth;
    this.difficulty = difficulty;
    this.laneOffset = laneOffset;

    this.progress = 0;
    this.speed = 0;
    this.position = new THREE.Vector3();
    this.rotation = 0;
    this.lapsCompleted = 0;
    this.checkpointsPassed = 0;
    this.lastCheckpoint = -1;
    
    // Cache track length (expensive to compute)
    this.trackLength = trackCurve ? trackCurve.getLength() : 1;
    
    // Reusable vectors
    this._normal = new THREE.Vector3();
  }
  
  /**
   * Update AI driver
   * @param {number} dt
   */
  update(dt) {
    // Difficulty scales max speed: 0.55 to 0.90 of top speed
    const difficultyFactor = 0.55 + (this.difficulty * 0.35);
    const maxSpeed = this.carStats.topSpeed * difficultyFactor;
    
    // Look ahead on curve to anticipate turns
    const lookAhead1 = (this.progress + 0.03) % 1.0;
    const lookAhead2 = (this.progress + 0.08) % 1.0;
    
    const currTan = this.trackCurve.getTangentAt(this.progress);
    const nextTan1 = this.trackCurve.getTangentAt(lookAhead1);
    const nextTan2 = this.trackCurve.getTangentAt(lookAhead2);
    
    // Measure curvature at two distances
    const angle1 = currTan.angleTo(nextTan1);
    const angle2 = currTan.angleTo(nextTan2);
    const maxAngle = Math.max(angle1, angle2 * 0.7);
    
    // Target speed: slow for sharp turns, fast on straights
    const turnFactor = Math.max(0.25, 1.0 - maxAngle * 3.0);
    const targetSpeed = maxSpeed * turnFactor;
    
    // Accelerate or brake toward target speed
    if (this.speed < targetSpeed) {
      this.speed += this.carStats.acceleration * dt * 0.8;
    } else {
      this.speed -= this.carStats.braking * dt * 0.6;
    }
    
    // Clamp speed
    this.speed = Math.max(5, Math.min(this.speed, maxSpeed));
    
    // Slight randomness for natural feel
    this.speed *= (1.0 + (Math.random() - 0.5) * 0.01);
    
    // Advance progress along curve
    const progressDelta = (this.speed * dt) / this.trackLength;
    this.progress += progressDelta;
    
    // Track lap completion
    if (this.progress >= 1.0) {
      this.progress -= 1.0;
      this.lapsCompleted++;
    }
    
    // Compute position from curve point + lane offset
    const basePt = this.trackCurve.getPointAt(this.progress);
    const tan = this.trackCurve.getTangentAt(this.progress);
    
    // Normal = perpendicular to tangent in XZ plane
    this._normal.set(-tan.z, 0, tan.x).normalize();
    
    this.position.copy(basePt);
    this.position.x += this._normal.x * this.laneOffset * (this.trackWidth * 0.3);
    this.position.z += this._normal.z * this.laneOffset * (this.trackWidth * 0.3);
    this.position.y = basePt.y + 0.3; // Slight offset above road
    
    // Compute rotation from tangent direction
    this.rotation = Math.atan2(tan.x, tan.z);
  }
  
  getPosition() { return this.position; }
  getRotation() { return this.rotation; }
  getSpeed() { return this.speed; }
  getLapsCompleted() { return this.lapsCompleted; }
  getCheckpointsPassed() { return this.checkpointsPassed; }
  getProgress() { return this.progress; }
  
  /**
   * Reset to starting position
   * @param {number} startProgress - Starting t parameter on curve
   */
  reset(startProgress) {
    this.progress = startProgress;
    this.speed = 0;
    this.lapsCompleted = 0;
    this.checkpointsPassed = 0;
    this.lastCheckpoint = -1;
    
    // Initialize position
    if (this.trackCurve) {
      const pt = this.trackCurve.getPointAt(this.progress);
      this.position.copy(pt);
      this.position.y += 0.3;
      const tan = this.trackCurve.getTangentAt(this.progress);
      this.rotation = Math.atan2(tan.x, tan.z);
    }
  }
}
