/**
 * Manages the in-game HUD display
 */
export class HUD {
  /**
   * @param {HTMLElement} hudContainer - The #hud element
   */
  constructor(hudContainer) {
    this.container = hudContainer;
    
    // Clear any existing content
    this.container.innerHTML = '';
    
    // 1. Speed display (bottom-left)
    this.speedContainer = document.createElement('div');
    this.speedContainer.style.position = 'absolute';
    this.speedContainer.style.bottom = '20px';
    this.speedContainer.style.left = '20px';
    this.speedContainer.style.width = '100px';
    this.speedContainer.style.height = '100px';
    this.speedContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    this.speedContainer.style.borderRadius = '50%';
    this.speedContainer.style.display = 'flex';
    this.speedContainer.style.flexDirection = 'column';
    this.speedContainer.style.justifyContent = 'center';
    this.speedContainer.style.alignItems = 'center';
    this.speedContainer.style.border = '2px solid rgba(255, 255, 255, 0.2)';
    this.speedContainer.style.overflow = 'hidden';
    
    this.speedGauge = document.createElement('div');
    this.speedGauge.style.position = 'absolute';
    this.speedGauge.style.top = '0';
    this.speedGauge.style.left = '0';
    this.speedGauge.style.width = '100%';
    this.speedGauge.style.height = '100%';
    this.speedGauge.style.borderRadius = '50%';
    this.speedGauge.style.background = 'conic-gradient(#00ffaa 0%, transparent 0%)';
    this.speedGauge.style.zIndex = '1';
    
    const gaugeMask = document.createElement('div');
    gaugeMask.style.position = 'absolute';
    gaugeMask.style.top = '5px';
    gaugeMask.style.left = '5px';
    gaugeMask.style.width = 'calc(100% - 10px)';
    gaugeMask.style.height = 'calc(100% - 10px)';
    gaugeMask.style.backgroundColor = '#1a1a1a';
    gaugeMask.style.borderRadius = '50%';
    gaugeMask.style.zIndex = '2';
    
    this.speedText = document.createElement('div');
    this.speedText.style.color = '#ffffff';
    this.speedText.style.fontSize = '24px';
    this.speedText.style.fontWeight = 'bold';
    this.speedText.style.zIndex = '3';
    this.speedText.style.fontFamily = 'monospace';
    this.speedText.textContent = '0';
    
    const speedUnit = document.createElement('div');
    speedUnit.style.color = '#aaaaaa';
    speedUnit.style.fontSize = '12px';
    speedUnit.style.zIndex = '3';
    this.gearText = document.createElement('div');
    this.gearText.style.color = '#00c3ff';
    this.gearText.style.fontSize = '11px';
    this.gearText.style.fontWeight = 'bold';
    this.gearText.style.zIndex = '3';
    this.gearText.style.letterSpacing = '1px';
    this.gearText.textContent = 'GEAR 1';

    this.speedContainer.appendChild(this.speedGauge);
    this.speedContainer.appendChild(gaugeMask);
    this.speedContainer.appendChild(this.speedText);
    this.speedContainer.appendChild(speedUnit);
    this.speedContainer.appendChild(this.gearText);
    
    // 2. Lap counter (top-right)
    this.lapContainer = document.createElement('div');
    this.lapContainer.style.position = 'absolute';
    this.lapContainer.style.top = '20px';
    this.lapContainer.style.right = '20px';
    this.lapContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.lapContainer.style.color = '#ffffff';
    this.lapContainer.style.padding = '8px 16px';
    this.lapContainer.style.borderRadius = '20px';
    this.lapContainer.style.fontFamily = 'monospace';
    this.lapContainer.style.fontSize = '18px';
    this.lapContainer.style.fontWeight = 'bold';
    
    // 3. Position display (top-left)
    this.posContainer = document.createElement('div');
    this.posContainer.style.position = 'absolute';
    this.posContainer.style.top = '20px';
    this.posContainer.style.left = '20px';
    this.posContainer.style.fontSize = '36px';
    this.posContainer.style.fontWeight = '900';
    this.posContainer.style.fontFamily = 'sans-serif';
    this.posContainer.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    
    // 4. Minimap canvas (below lap counter)
    this.minimapContainer = document.createElement('div');
    this.minimapContainer.style.position = 'absolute';
    this.minimapContainer.style.top = '70px';
    this.minimapContainer.style.right = '20px';
    this.minimapContainer.style.width = '120px';
    this.minimapContainer.style.height = '120px';
    this.minimapContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.minimapContainer.style.border = '2px solid rgba(255,255,255,0.2)';
    this.minimapContainer.style.borderRadius = '8px';
    
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.width = 120;
    this.minimapCanvas.height = 120;
    this.minimapCanvas.style.width = '100%';
    this.minimapCanvas.style.height = '100%';
    this.minimapContainer.appendChild(this.minimapCanvas);
    this.minimapCtx = this.minimapCanvas.getContext('2d');
    
    // 5. Timer display (top-center)
    this.timerContainer = document.createElement('div');
    this.timerContainer.style.position = 'absolute';
    this.timerContainer.style.top = '20px';
    this.timerContainer.style.left = '50%';
    this.timerContainer.style.transform = 'translateX(-50%)';
    this.timerContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.timerContainer.style.color = '#ffffff';
    this.timerContainer.style.padding = '8px 16px';
    this.timerContainer.style.borderRadius = '20px';
    this.timerContainer.style.fontFamily = 'monospace';
    this.timerContainer.style.fontSize = '24px';
    this.timerContainer.style.fontWeight = 'bold';
    this.timerContainer.textContent = '00:00.000';
    
    // 6. Countdown overlay (center)
    this.countdownContainer = document.createElement('div');
    this.countdownContainer.style.position = 'absolute';
    this.countdownContainer.style.top = '50%';
    this.countdownContainer.style.left = '50%';
    this.countdownContainer.style.transform = 'translate(-50%, -50%)';
    this.countdownContainer.style.color = '#ffffff';
    this.countdownContainer.style.fontSize = 'clamp(3rem, 8vw, 6rem)';
    this.countdownContainer.style.fontWeight = '900';
    this.countdownContainer.style.fontFamily = 'sans-serif';
    this.countdownContainer.style.textShadow = '0 0 20px rgba(0,0,0,0.8)';
    this.countdownContainer.style.textAlign = 'center';
    this.countdownContainer.style.display = 'none';
    this.countdownContainer.style.transition = 'transform 0.1s ease-out';
    
    // Append all
    this.container.appendChild(this.speedContainer);
    this.container.appendChild(this.lapContainer);
    this.container.appendChild(this.posContainer);
    this.container.appendChild(this.minimapContainer);
    this.container.appendChild(this.timerContainer);
    this.container.appendChild(this.countdownContainer);
  }
  
  /**
   * Update speedometer with speed, maxSpeed, gear and RPM
   * @param {number} speed - current speed
   * @param {number} maxSpeed - car's top speed
   * @param {number} gear - current gear
   * @param {number} rpm - current RPM (0 to 1)
   * @param {boolean} isReversing - whether car is reversing
   */
  updateSpeed(speed, maxSpeed, gear = 1, rpm = 0.3, isReversing = false) {
    const displaySpeed = Math.max(0, Math.round(speed));
    this.speedText.textContent = displaySpeed.toString();
    
    if (this.gearText) {
      if (isReversing) {
        this.gearText.textContent = 'REVERSE';
        this.gearText.style.color = '#ffaa00';
      } else {
        this.gearText.textContent = `GEAR ${gear}`;
        this.gearText.style.color = gear === 5 ? '#ff3366' : '#00c3ff';
      }
    }
    
    // 270 degrees arc max
    const fraction = Math.min(Math.max(speed / maxSpeed, 0), 1);
    const degrees = fraction * 270;
    
    let color = '#00ffaa';
    if (rpm > 0.85 || fraction > 0.8) color = '#ff3300';
    else if (rpm > 0.6 || fraction > 0.5) color = '#ffcc00';
    
    this.speedGauge.style.background = `conic-gradient(${color} ${degrees}deg, transparent ${degrees}deg)`;
    this.speedGauge.style.transform = 'rotate(-135deg)';
  }
  
  /**
   * Update lap counter
   * @param {number} current - current lap (1-based)
   * @param {number} total - total laps
   */
  updateLap(current, total) {
    this.lapContainer.textContent = `LAP ${current}/${total}`;
  }
  
  /**
   * Update race position
   * @param {number} position - 1-4
   * @param {number} total - total racers
   */
  updatePosition(position, total) {
    let suffix = 'th';
    if (position === 1) suffix = 'st';
    if (position === 2) suffix = 'nd';
    if (position === 3) suffix = 'rd';
    
    let color = '#ffffff';
    if (position === 1) color = '#ffd700'; // Gold
    if (position === 2) color = '#c0c0c0'; // Silver
    if (position === 3) color = '#cd7f32'; // Bronze
    
    this.posContainer.style.color = color;
    this.posContainer.innerHTML = `${position}<span style="font-size: 16px; vertical-align: super;">${suffix}</span>`;
  }
  
  /**
   * Update the minimap display
   * @param {Array<{x: number, z: number, isPlayer: boolean}>} carPositions
   * @param {Array<{x: number, z: number}>} trackPoints - simplified track outline
   */
  updateMinimap(carPositions, trackPoints) {
    const ctx = this.minimapCtx;
    const width = this.minimapCanvas.width;
    const height = this.minimapCanvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Calculate bounds
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    if (trackPoints && trackPoints.length > 0) {
      trackPoints.forEach(p => {
        minX = Math.min(minX, p.x);
        minZ = Math.min(minZ, p.z);
        maxX = Math.max(maxX, p.x);
        maxZ = Math.max(maxZ, p.z);
      });
    } else {
      return;
    }
    
    const padding = 10;
    const sizeX = maxX - minX;
    const sizeZ = maxZ - minZ;
    const scale = Math.min((width - padding * 2) / sizeX, (height - padding * 2) / sizeZ);
    
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    
    const toMap = (x, z) => {
      return {
        x: width / 2 + (x - cx) * scale,
        y: height / 2 + (z - cz) * scale
      };
    };
    
    // Draw track
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let i = 0; i < trackPoints.length; i++) {
      const p = toMap(trackPoints[i].x, trackPoints[i].z);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();
    
    // Draw cars
    if (carPositions) {
      carPositions.forEach(car => {
        const p = toMap(car.x, car.z);
        ctx.beginPath();
        ctx.arc(p.x, p.y, car.isPlayer ? 4 : 3, 0, Math.PI * 2);
        ctx.fillStyle = car.isPlayer ? '#00ffaa' : '#ff3333';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }
  }
  
  /**
   * Update race timer
   * @param {number} elapsed - time in seconds
   */
  updateTimer(elapsed) {
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    const ms = Math.floor((elapsed % 1) * 1000);
    
    const sMins = mins.toString().padStart(2, '0');
    const sSecs = secs.toString().padStart(2, '0');
    const sMs = ms.toString().padStart(3, '0');
    
    this.timerContainer.textContent = `${sMins}:${sSecs}.${sMs}`;
  }
  
  /**
   * Show countdown animation (3-2-1-GO!)
   * @param {function} onComplete - called when countdown finishes
   */
  showCountdown(onComplete) {
    this.countdownContainer.style.display = 'block';
    
    const steps = ['3', '2', '1', 'GO!'];
    let stepIndex = 0;
    
    const nextStep = () => {
      if (stepIndex >= steps.length) {
        this.countdownContainer.style.display = 'none';
        if (onComplete) onComplete();
        return;
      }
      
      this.countdownContainer.textContent = steps[stepIndex];
      this.countdownContainer.style.transform = 'translate(-50%, -50%) scale(0.5)';
      this.countdownContainer.style.opacity = '0';
      
      // Force reflow
      void this.countdownContainer.offsetWidth;
      
      this.countdownContainer.style.transform = 'translate(-50%, -50%) scale(1)';
      this.countdownContainer.style.opacity = '1';
      
      stepIndex++;
      setTimeout(nextStep, stepIndex === steps.length ? 500 : 1000);
    };
    
    nextStep();
  }
  
  /** Show HUD */
  show() {
    this.container.style.display = 'block';
  }
  
  /** Hide HUD */
  hide() {
    this.container.style.display = 'none';
  }
  
  /** Cleanup */
  dispose() {
    this.container.innerHTML = '';
  }
}
