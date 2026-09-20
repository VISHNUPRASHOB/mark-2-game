/**
 * In-Game HUD & Radar Minimap System
 * Features:
 * - High-DPI Radar Minimap with thick neon track outline, player heading arrow & AI dots
 * - Dynamic Speedometer with Gear display (GEAR 1..5 / REVERSE) & RPM warning arc
 * - Lap counter, position indicator badge (1st, 2nd, 3rd, 4th), and race lap timer
 * - High-contrast responsive HUD overlays
 */
export class HUD {
  /**
   * @param {HTMLElement} hudContainer - The #hud element
   */
  constructor(hudContainer) {
    this.container = hudContainer;
    this.container.innerHTML = '';
    
    // Inject HUD CSS styles
    if (!document.getElementById('hud-styles')) {
      const style = document.createElement('style');
      style.id = 'hud-styles';
      style.textContent = `
        .hud-card {
          background: rgba(11, 17, 32, 0.75);
          border: 1.5px solid rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 16px;
          color: #ffffff;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
          pointer-events: none;
        }
        .hud-pos-text {
          font-size: clamp(2rem, 5vw, 2.75rem);
          font-weight: 900;
          line-height: 1;
        }
        .hud-lap-text {
          font-size: clamp(1rem, 2.5vw, 1.35rem);
          font-weight: 800;
          letter-spacing: 1px;
        }
        .hud-timer-text {
          font-family: 'Courier New', monospace;
          font-size: clamp(1.1rem, 3vw, 1.5rem);
          font-weight: 800;
          letter-spacing: 1.5px;
        }
      `;
      document.head.appendChild(style);
    }

    // ─── 1. Position Badge (Top-Left) ──────────────────────────────
    this.posContainer = document.createElement('div');
    this.posContainer.className = 'hud-card';
    this.posContainer.style.cssText = 'position:absolute;top:1rem;left:1rem;padding:0.75rem 1.25rem;display:flex;flex-direction:column;align-items:center;min-width:90px;';
    
    const posLabel = document.createElement('div');
    posLabel.style.cssText = 'font-size:0.7rem;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;';
    posLabel.textContent = 'POSITION';
    
    this.posValue = document.createElement('div');
    this.posValue.className = 'hud-pos-text';
    this.posValue.innerHTML = '1<span style="font-size:1.1rem;color:#cbd5e1;">ST</span>';
    
    this.posContainer.appendChild(posLabel);
    this.posContainer.appendChild(this.posValue);

    // ─── 2. Timer & Lap Counter (Top-Center) ───────────────────────
    this.topCenterContainer = document.createElement('div');
    this.topCenterContainer.className = 'hud-card';
    this.topCenterContainer.style.cssText = 'position:absolute;top:1rem;left:50%;transform:translateX(-50%);padding:0.6rem 1.5rem;display:flex;gap:1.5rem;align-items:center;';
    
    // Lap box
    const lapBox = document.createElement('div');
    lapBox.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
    const lapLabel = document.createElement('div');
    lapLabel.style.cssText = 'font-size:0.65rem;font-weight:700;color:#94a3b8;letter-spacing:1px;';
    lapLabel.textContent = 'LAP';
    this.lapValue = document.createElement('div');
    this.lapValue.className = 'hud-lap-text';
    this.lapValue.textContent = '1 / 3';
    lapBox.appendChild(lapLabel);
    lapBox.appendChild(this.lapValue);

    // Separator line
    const sep = document.createElement('div');
    sep.style.cssText = 'width:1px;height:28px;background:rgba(255,255,255,0.2);';

    // Timer box
    const timerBox = document.createElement('div');
    timerBox.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
    const timeLabel = document.createElement('div');
    timeLabel.style.cssText = 'font-size:0.65rem;font-weight:700;color:#94a3b8;letter-spacing:1px;';
    timeLabel.textContent = 'TIME';
    this.timerValue = document.createElement('div');
    this.timerValue.className = 'hud-timer-text';
    this.timerValue.style.color = '#00f0ff';
    this.timerValue.textContent = '00:00.00';
    timerBox.appendChild(timeLabel);
    timerBox.appendChild(this.timerValue);

    this.topCenterContainer.appendChild(lapBox);
    this.topCenterContainer.appendChild(sep);
    this.topCenterContainer.appendChild(timerBox);

    // ─── 3. High-Contrast Radar Minimap (Top-Right) ────────────────
    this.minimapContainer = document.createElement('div');
    this.minimapContainer.className = 'hud-card';
    this.minimapContainer.style.cssText = 'position:absolute;top:1rem;right:1rem;padding:6px;width:140px;height:140px;display:flex;align-items:center;justify-content:center;';
    
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.width = 280; // High-DPI internal buffer
    this.minimapCanvas.height = 280;
    this.minimapCanvas.style.cssText = 'width:100%;height:100%;border-radius:10px;display:block;';
    this.minimapContainer.appendChild(this.minimapCanvas);
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    // ─── 4. Speedometer Gauge (Bottom-Left) ────────────────────────
    this.speedContainer = document.createElement('div');
    this.speedContainer.className = 'hud-card';
    this.speedContainer.style.cssText = 'position:absolute;bottom:1.5rem;left:1.5rem;width:115px;height:115px;border-radius:50%;display:flex;flex-direction:column;justify-content:center;align-items:center;overflow:hidden;';
    
    this.speedGauge = document.createElement('div');
    this.speedGauge.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border-radius:50%;background:conic-gradient(#00f0ff 0%, transparent 0%);z-index:1;transform:rotate(-135deg);';
    
    const gaugeMask = document.createElement('div');
    gaugeMask.style.cssText = 'position:absolute;top:7px;left:7px;width:calc(100% - 14px);height:calc(100% - 14px);background:#0b1120;border-radius:50%;z-index:2;';
    
    this.speedText = document.createElement('div');
    this.speedText.style.cssText = 'color:#ffffff;font-size:28px;font-weight:900;z-index:3;font-family:sans-serif;line-height:1;';
    this.speedText.textContent = '0';
    
    const speedUnit = document.createElement('div');
    speedUnit.style.cssText = 'color:#94a3b8;font-size:10px;font-weight:700;z-index:3;letter-spacing:1px;margin-top:2px;';
    speedUnit.textContent = 'KM/H';

    this.gearText = document.createElement('div');
    this.gearText.style.cssText = 'color:#00f0ff;font-size:11px;font-weight:800;z-index:3;letter-spacing:1px;margin-top:2px;';
    this.gearText.textContent = 'GEAR 1';

    this.speedContainer.appendChild(this.speedGauge);
    this.speedContainer.appendChild(gaugeMask);
    this.speedContainer.appendChild(this.speedText);
    this.speedContainer.appendChild(speedUnit);
    this.speedContainer.appendChild(this.gearText);

    // ─── 5. Countdown Banner (Center) ──────────────────────────────
    this.countdownContainer = document.createElement('div');
    this.countdownContainer.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);color:#ffffff;font-size:clamp(4rem, 12vw, 8rem);font-weight:900;text-shadow:0 0 35px #00f0ff, 0 0 70px rgba(0, 240, 255, 0.6);text-align:center;display:none;z-index:200;pointer-events:none;';

    // Append everything to HUD
    this.container.appendChild(this.posContainer);
    this.container.appendChild(this.topCenterContainer);
    this.container.appendChild(this.minimapContainer);
    this.container.appendChild(this.speedContainer);
    this.container.appendChild(this.countdownContainer);
  }

  /**
   * Update speedometer with speed, gear and RPM
   */
  updateSpeed(speed, maxSpeed, gear = 1, rpm = 0.3, isReversing = false) {
    const displaySpeed = Math.max(0, Math.round(speed));
    this.speedText.textContent = displaySpeed.toString();
    
    if (this.gearText) {
      if (isReversing) {
        this.gearText.textContent = 'REVERSE';
        this.gearText.style.color = '#f59e0b';
      } else {
        this.gearText.textContent = `GEAR ${gear}`;
        this.gearText.style.color = gear === 5 ? '#f43f5e' : '#00f0ff';
      }
    }
    
    // 270 degrees arc
    const fraction = Math.min(Math.max(speed / (maxSpeed || 150), 0), 1);
    const degrees = fraction * 270;
    
    let color = '#00f0ff';
    if (rpm > 0.85 || fraction > 0.8) color = '#f43f5e';
    else if (rpm > 0.6 || fraction > 0.5) color = '#facc15';
    
    this.speedGauge.style.background = `conic-gradient(${color} ${degrees}deg, transparent ${degrees}deg)`;
  }

  /**
   * Update lap counter
   */
  updateLap(current, total) {
    this.lapValue.textContent = `${current} / ${total}`;
  }

  /**
   * Update race position (1st, 2nd, 3rd, 4th)
   */
  updatePosition(position) {
    const suffixes = ['ST', 'ND', 'RD', 'TH'];
    const suffix = suffixes[Math.min(position - 1, 3)] || 'TH';
    
    let color = '#ffffff';
    if (position === 1) color = '#fbbf24'; // Gold
    else if (position === 2) color = '#cbd5e1'; // Silver
    else if (position === 3) color = '#f97316'; // Bronze
    
    this.posValue.style.color = color;
    this.posValue.innerHTML = `${position}<span style="font-size:1.1rem;color:#94a3b8;margin-left:2px;">${suffix}</span>`;
  }

  /**
   * Draw high-contrast Radar Minimap
   * @param {Array<{x: number, z: number, isPlayer: boolean}>} carPositions
   * @param {Array<{x: number, z: number}>} trackPoints
   */
  updateMinimap(carPositions, trackPoints) {
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    // Dark radar backdrop
    ctx.fillStyle = '#060d1b';
    ctx.fillRect(0, 0, w, h);
    
    // Radar grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.42, 0, Math.PI * 2);
    ctx.arc(w / 2, h / 2, w * 0.22, 0, Math.PI * 2);
    ctx.moveTo(w / 2, 10); ctx.lineTo(w / 2, h - 10);
    ctx.moveTo(10, h / 2); ctx.lineTo(w - 10, h / 2);
    ctx.stroke();

    if (!trackPoints || trackPoints.length === 0) return;

    // Calculate bounding box
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    trackPoints.forEach(p => {
      minX = Math.min(minX, p.x);
      minZ = Math.min(minZ, p.z);
      maxX = Math.max(maxX, p.x);
      maxZ = Math.max(maxZ, p.z);
    });

    const padding = 35;
    const sizeX = (maxX - minX) || 1;
    const sizeZ = (maxZ - minZ) || 1;
    const scale = Math.min((w - padding * 2) / sizeX, (h - padding * 2) / sizeZ);
    
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    
    const toMap = (x, z) => ({
      x: w / 2 + (x - cx) * scale,
      y: h / 2 + (z - cz) * scale
    });

    // 1. Thick Outer Track Border
    ctx.beginPath();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < trackPoints.length; i++) {
      const p = toMap(trackPoints[i].x, trackPoints[i].z);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();

    // 2. Inner Glowing Track Line
    ctx.beginPath();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 6;
    for (let i = 0; i < trackPoints.length; i++) {
      const p = toMap(trackPoints[i].x, trackPoints[i].z);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();

    // 3. Start / Finish Line Marker
    const startPoint = toMap(trackPoints[0].x, trackPoints[0].z);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(startPoint.x, startPoint.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Opponent Cars (Red / Orange dots)
    if (carPositions) {
      carPositions.forEach(car => {
        if (!car.isPlayer) {
          const p = toMap(car.x, car.z);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // 5. Player Car (Bright Green Glowing Arrow / Dot)
      const player = carPositions.find(c => c.isPlayer);
      if (player) {
        const p = toMap(player.x, player.z);
        
        // Outer glow
        ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
        ctx.fill();

        // Player Core
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }
  }

  /**
   * Update race timer
   */
  updateTimer(elapsed) {
    const mins = Math.floor(elapsed / 60);
    const secs = Math.floor(elapsed % 60);
    const ms = Math.floor((elapsed % 1) * 100);
    
    const sMins = mins.toString().padStart(2, '0');
    const sSecs = secs.toString().padStart(2, '0');
    const sMs = ms.toString().padStart(2, '0');
    
    this.timerValue.textContent = `${sMins}:${sSecs}.${sMs}`;
  }

  /**
   * Show animated countdown (3-2-1-GO!)
   * @param {function} onTick - callback on each number (3, 2, 1, GO!)
   * @param {function} onComplete - callback when countdown finishes
   */
  showCountdown(onTick, onComplete) {
    this.countdownContainer.style.display = 'block';
    
    const steps = ['3', '2', '1', 'GO!'];
    let stepIndex = 0;
    
    const nextStep = () => {
      if (stepIndex >= steps.length) {
        this.countdownContainer.style.display = 'none';
        if (onComplete) onComplete();
        return;
      }
      
      const currentText = steps[stepIndex];
      this.countdownContainer.textContent = currentText;
      this.countdownContainer.style.color = currentText === 'GO!' ? '#10b981' : '#ffffff';
      
      this.countdownContainer.style.transform = 'translate(-50%, -50%) scale(1.4)';
      this.countdownContainer.style.opacity = '1';
      
      if (onTick) onTick(currentText);

      setTimeout(() => {
        this.countdownContainer.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
        this.countdownContainer.style.transform = 'translate(-50%, -50%) scale(1.0)';
      }, 50);
      
      stepIndex++;
      setTimeout(nextStep, currentText === 'GO!' ? 600 : 900);
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

  dispose() {
    this.container.innerHTML = '';
  }
}
