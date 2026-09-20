import { CARS, getUnlockedCars } from '../cars/carData.js';
import { LEVELS } from '../tracks/trackData.js';

/**
 * Car & level selection UI (Garage)
 * Features:
 * - Auto-selects first unlocked car and first level by default for quick play
 * - Responsive cards with stat bars and theme glow
 * - Touch & Click responsive buttons
 */
export class Garage {
  /**
   * @param {HTMLElement} overlay - The #ui-overlay element
   * @param {object} callbacks - { onStartRace: Function(carId, levelId) , onBack: Function }
   */
  constructor(overlay, callbacks) {
    this.overlay = overlay;
    this.callbacks = callbacks;
    this.selectedCarId = null;
    this.selectedLevelId = null;
    this.completedLevels = [];
    
    this.container = document.createElement('div');
    this.container.style.cssText = 'width:100%;height:100%;background:rgba(8,12,22,0.96);color:white;display:flex;flex-direction:column;padding:20px;box-sizing:border-box;overflow-y:auto;font-family:"Segoe UI",system-ui,sans-serif;';
    
    if (!document.getElementById('garage-styles')) {
      const style = document.createElement('style');
      style.id = 'garage-styles';
      style.textContent = `
        .garage-grid {
          display: grid;
          gap: 16px;
          margin-bottom: 20px;
          width: 100%;
          max-width: 960px;
          margin-left: auto;
          margin-right: auto;
        }
        @media (min-width: 900px) { .garage-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 550px) and (max-width: 899px) { .garage-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 549px) { .garage-grid { grid-template-columns: 1fr; } }
        
        .garage-card {
          background: rgba(15, 23, 42, 0.8);
          border: 2px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          padding: 16px;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
          position: relative;
          overflow: hidden;
          touch-action: manipulation;
        }
        .garage-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255, 255, 255, 0.35);
        }
        .garage-card.selected {
          border-color: var(--car-color, #00f0ff) !important;
          box-shadow: 0 0 20px var(--car-color, #00f0ff) !important;
          background: rgba(15, 23, 42, 0.95);
        }
        .garage-card.locked {
          opacity: 0.45;
          filter: grayscale(80%);
          cursor: not-allowed;
        }
        .garage-card.locked:hover {
          transform: none;
        }
        .stat-bar-container {
          background: rgba(255, 255, 255, 0.1);
          height: 7px;
          border-radius: 4px;
          margin-top: 3px;
          margin-bottom: 7px;
          overflow: hidden;
        }
        .stat-bar-fill {
          height: 100%;
          border-radius: 4px;
        }
        
        .level-card {
          background: rgba(15, 23, 42, 0.8);
          border: 2px solid rgba(255, 255, 255, 0.12);
          border-left-width: 8px;
          border-radius: 14px;
          padding: 18px;
          margin-bottom: 14px;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
          touch-action: manipulation;
        }
        .level-card:hover {
          transform: translateY(-3px);
          background: rgba(30, 41, 59, 0.9);
        }
        .level-card.selected {
          border-color: #ffffff !important;
          border-left-color: var(--theme-color, #00f0ff) !important;
          box-shadow: 0 0 25px rgba(0, 240, 255, 0.35) !important;
        }
        
        .garage-footer {
          display: flex;
          justify-content: space-between;
          margin-top: auto;
          padding: 15px 0;
          max-width: 960px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
        }
        .garage-btn {
          padding: 14px 28px;
          border-radius: 12px;
          border: none;
          font-size: 1.15rem;
          font-weight: 800;
          cursor: pointer;
          color: white;
          letter-spacing: 0.5px;
          transition: transform 0.1s ease, filter 0.1s ease;
          touch-action: manipulation;
        }
        .garage-btn:active {
          transform: scale(0.96);
        }
        .garage-btn:disabled {
          background: #334155 !important;
          color: #64748b !important;
          cursor: not-allowed;
          box-shadow: none !important;
        }
        .garage-btn-primary {
          background: linear-gradient(135deg, #0077ff, #00f0ff);
          box-shadow: 0 4px 18px rgba(0, 240, 255, 0.4);
        }
        .garage-btn-back {
          background: linear-gradient(135deg, #475569, #334155);
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  hexToCSS(hex) {
    return '#' + hex.toString(16).padStart(6, '0');
  }
  
  getMaxCompleted() {
    if (!this.completedLevels || this.completedLevels.length === 0) return -1;
    return Math.max(...this.completedLevels);
  }
  
  show(completedLevels = []) {
    this.completedLevels = completedLevels;
    this.selectedCarId = CARS[0].id; // Auto-select first car
    this.selectedLevelId = LEVELS[0].id; // Auto-select first level
    
    this.overlay.innerHTML = '';
    this.overlay.appendChild(this.container);
    this.overlay.style.display = 'flex';
    
    this.showCarSelection();
  }
  
  showCarSelection() {
    this.container.innerHTML = '';
    
    const title = document.createElement('h2');
    title.textContent = 'CHOOSE YOUR VEHICLE';
    title.style.cssText = 'text-align:center;margin-bottom:20px;font-size:clamp(1.5rem,4vw,2.2rem);letter-spacing:2px;font-weight:900;color:#fff;text-shadow:0 0 20px rgba(0,240,255,0.4);';
    this.container.appendChild(title);
    
    const grid = document.createElement('div');
    grid.className = 'garage-grid';
    
    const maxCompleted = this.getMaxCompleted();
    const maxStats = { topSpeed: 200, acceleration: 100, handling: 1.0, drift: 0.8 };
    
    let nextBtn;
    
    CARS.forEach((car, index) => {
      const isLocked = car.unlockLevel > (maxCompleted + 1);
      const isSelected = this.selectedCarId === car.id || (!this.selectedCarId && index === 0);
      if (isSelected && !isLocked) this.selectedCarId = car.id;

      const colorCSS = this.hexToCSS(car.color);
      
      const card = document.createElement('div');
      card.className = `garage-card ${isLocked ? 'locked' : ''} ${isSelected && !isLocked ? 'selected' : ''}`;
      card.style.setProperty('--car-color', colorCSS);
      
      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
      
      const nameEl = document.createElement('h3');
      nameEl.textContent = car.name;
      nameEl.style.cssText = 'margin:0;font-size:1.3rem;font-weight:800;';
      
      const swatch = document.createElement('div');
      swatch.style.cssText = `width:26px;height:26px;border-radius:50%;background:${colorCSS};border:2px solid rgba(255,255,255,0.4);box-shadow:0 0 10px ${colorCSS};`;
      
      header.appendChild(nameEl);
      header.appendChild(swatch);
      card.appendChild(header);
      
      const typeEl = document.createElement('p');
      typeEl.textContent = `${car.type} • ${car.description}`;
      typeEl.style.cssText = 'color:#94a3b8;font-size:0.8rem;margin:0 0 10px 0;line-height:1.3;';
      card.appendChild(typeEl);
      
      const statsData = [
        { label: 'Top Speed', val: car.stats.topSpeed, max: maxStats.topSpeed },
        { label: 'Acceleration', val: car.stats.acceleration, max: maxStats.acceleration },
        { label: 'Handling', val: car.stats.handling, max: maxStats.handling },
        { label: 'Drift Tendency', val: car.stats.drift, max: maxStats.drift }
      ];
      
      statsData.forEach(s => {
        const pct = Math.min(100, (s.val / s.max) * 100);
        let barColor = '#ef4444';
        if (pct > 75) barColor = '#10b981';
        else if (pct > 40) barColor = '#f59e0b';
        
        const label = document.createElement('div');
        label.style.cssText = 'display:flex;justify-content:space-between;font-size:0.7rem;color:#cbd5e1;font-weight:600;text-transform:uppercase;';
        label.innerHTML = `<span>${s.label}</span><span>${Math.round(pct)}%</span>`;
        card.appendChild(label);
        
        const barOuter = document.createElement('div');
        barOuter.className = 'stat-bar-container';
        const barFill = document.createElement('div');
        barFill.className = 'stat-bar-fill';
        barFill.style.width = pct + '%';
        barFill.style.background = barColor;
        barOuter.appendChild(barFill);
        card.appendChild(barOuter);
      });
      
      if (isLocked) {
        const lockOverlay = document.createElement('div');
        lockOverlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;background:rgba(3,7,18,0.75);border-radius:12px;';
        lockOverlay.innerHTML = `<div style="font-size:2.2rem;margin-bottom:6px;">🔒</div><div style="font-weight:800;font-size:0.85rem;color:#f8fafc;text-align:center;">Win Level ${car.unlockLevel} to unlock</div>`;
        card.appendChild(lockOverlay);
      } else {
        const selectCar = () => {
          grid.querySelectorAll('.garage-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this.selectedCarId = car.id;
          if (nextBtn) nextBtn.disabled = false;
        };
        card.addEventListener('click', selectCar);
        card.addEventListener('pointerdown', selectCar);
      }
      
      grid.appendChild(card);
    });
    
    this.container.appendChild(grid);
    
    // Footer
    const footer = document.createElement('div');
    footer.className = 'garage-footer';
    
    const backBtn = document.createElement('button');
    backBtn.className = 'garage-btn garage-btn-back';
    backBtn.textContent = '◀ MENU';
    backBtn.onclick = () => { if (this.callbacks.onBack) this.callbacks.onBack(); };
    
    nextBtn = document.createElement('button');
    nextBtn.className = 'garage-btn garage-btn-primary';
    nextBtn.textContent = 'SELECT TRACK ▶';
    nextBtn.disabled = !this.selectedCarId;
    nextBtn.onclick = () => { this.showLevelSelection(); };
    
    footer.appendChild(backBtn);
    footer.appendChild(nextBtn);
    this.container.appendChild(footer);
  }
  
  showLevelSelection() {
    this.container.innerHTML = '';
    
    const title = document.createElement('h2');
    title.textContent = 'SELECT RACE TRACK';
    title.style.cssText = 'text-align:center;margin-bottom:20px;font-size:clamp(1.5rem,4vw,2.2rem);letter-spacing:2px;font-weight:900;color:#fff;text-shadow:0 0 20px rgba(0,240,255,0.4);';
    this.container.appendChild(title);
    
    const list = document.createElement('div');
    list.style.cssText = 'max-width:680px;margin:0 auto;width:100%;';
    
    const themeColors = {
      city: '#0284c7',
      desert: '#f97316',
      neon: '#a855f7'
    };
    
    const difficultyStars = {
      1: '★☆☆  EASY',
      2: '★★☆  MEDIUM',
      3: '★★★  HARD'
    };
    
    let raceBtn;
    
    LEVELS.forEach((level, index) => {
      const themeColor = themeColors[level.id] || '#00f0ff';
      const isSelected = this.selectedLevelId === level.id || (!this.selectedLevelId && index === 0);
      if (isSelected) this.selectedLevelId = level.id;
      
      const card = document.createElement('div');
      card.className = `level-card ${isSelected ? 'selected' : ''}`;
      card.style.setProperty('--theme-color', themeColor);
      card.style.borderLeftColor = themeColor;
      
      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';
      
      const nameEl = document.createElement('h3');
      nameEl.textContent = level.name;
      nameEl.style.cssText = 'margin:0;font-size:1.45rem;font-weight:800;';
      
      const stars = document.createElement('div');
      stars.textContent = difficultyStars[level.difficulty] || '★';
      stars.style.cssText = 'color:#facc15;font-size:0.9rem;font-weight:800;letter-spacing:1px;';
      
      header.appendChild(nameEl);
      header.appendChild(stars);
      card.appendChild(header);
      
      const desc = document.createElement('p');
      desc.textContent = `${level.description} • Track Width: ${level.trackWidth}m`;
      desc.style.cssText = 'color:#94a3b8;font-size:0.9rem;margin:0 0 8px 0;';
      card.appendChild(desc);
      
      const lapsEl = document.createElement('div');
      lapsEl.textContent = `Laps: ${level.laps} Laps Circuit`;
      lapsEl.style.cssText = 'font-weight:700;font-size:0.85rem;color:#38bdf8;';
      card.appendChild(lapsEl);
      
      const selectLevel = () => {
        list.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedLevelId = level.id;
        if (raceBtn) raceBtn.disabled = false;
      };
      card.addEventListener('click', selectLevel);
      card.addEventListener('pointerdown', selectLevel);
      
      list.appendChild(card);
    });
    
    this.container.appendChild(list);
    
    // Footer
    const footer = document.createElement('div');
    footer.className = 'garage-footer';
    
    const backBtn = document.createElement('button');
    backBtn.className = 'garage-btn garage-btn-back';
    backBtn.textContent = '◀ CARS';
    backBtn.onclick = () => { this.showCarSelection(); };
    
    raceBtn = document.createElement('button');
    raceBtn.className = 'garage-btn garage-btn-primary';
    raceBtn.textContent = '🏁 START RACE!';
    raceBtn.disabled = !this.selectedLevelId;
    raceBtn.onclick = () => {
      if (this.callbacks.onStartRace) {
        this.callbacks.onStartRace(this.selectedCarId, this.selectedLevelId);
      }
    };
    
    footer.appendChild(backBtn);
    footer.appendChild(raceBtn);
    this.container.appendChild(footer);
  }
  
  hide() {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.overlay.style.display = 'none';
  }
  
  dispose() {
    this.hide();
  }
}
