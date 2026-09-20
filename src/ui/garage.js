import { CARS, getUnlockedCars } from '../cars/carData.js';
import { LEVELS } from '../tracks/trackData.js';

/**
 * Car & level selection UI (Garage)
 * Features:
 * - Bulletproof click and touch event handlers for PC and Mobile
 * - Instant defaults ('rookie' car & 'city' track) so START RACE always works immediately
 * - Clear visual selection indicators
 */
export class Garage {
  /**
   * @param {HTMLElement} overlay - The #ui-overlay element
   * @param {object} callbacks - { onStartRace: Function(carId, levelId) , onBack: Function }
   */
  constructor(overlay, callbacks) {
    this.overlay = overlay;
    this.callbacks = callbacks;
    this.selectedCarId = CARS[0].id;
    this.selectedLevelId = LEVELS[0].id;
    this.completedLevels = [];
    
    this.container = document.createElement('div');
    this.container.style.cssText = 'width:100%;height:100%;background:rgba(8,12,22,0.96);color:white;display:flex;flex-direction:column;padding:20px;box-sizing:border-box;overflow-y:auto;font-family:"Segoe UI",system-ui,sans-serif;pointer-events:auto;';
    
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
          background: rgba(15, 23, 42, 0.85);
          border: 2px solid rgba(255, 255, 255, 0.15);
          border-radius: 14px;
          padding: 16px;
          cursor: pointer;
          transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
          position: relative;
          overflow: hidden;
          touch-action: manipulation;
          user-select: none;
        }
        .garage-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255, 255, 255, 0.4);
        }
        .garage-card.selected {
          border-color: #00f0ff !important;
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.5) !important;
          background: rgba(15, 23, 42, 0.98);
        }
        .garage-card.locked {
          opacity: 0.45;
          filter: grayscale(80%);
          cursor: not-allowed;
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
          background: rgba(15, 23, 42, 0.85);
          border: 2px solid rgba(255, 255, 255, 0.15);
          border-left-width: 8px;
          border-radius: 14px;
          padding: 18px;
          margin-bottom: 14px;
          cursor: pointer;
          transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
          touch-action: manipulation;
          user-select: none;
        }
        .level-card:hover {
          transform: translateY(-2px);
          background: rgba(30, 41, 59, 0.95);
        }
        .level-card.selected {
          border-color: #ffffff !important;
          border-left-color: #00f0ff !important;
          box-shadow: 0 0 25px rgba(0, 240, 255, 0.4) !important;
          background: rgba(30, 41, 59, 1.0);
        }
        
        .garage-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          padding: 15px 0;
          max-width: 960px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          gap: 15px;
        }
        .garage-btn {
          padding: 15px 32px;
          border-radius: 14px;
          border: none;
          font-size: 1.2rem;
          font-weight: 800;
          cursor: pointer;
          color: white;
          letter-spacing: 0.5px;
          transition: transform 0.1s ease, filter 0.1s ease, box-shadow 0.1s ease;
          touch-action: manipulation;
          user-select: none;
        }
        .garage-btn:hover {
          filter: brightness(1.15);
          transform: translateY(-2px);
        }
        .garage-btn:active {
          transform: scale(0.96);
        }
        .garage-btn-primary {
          background: linear-gradient(135deg, #0077ff, #00f0ff);
          box-shadow: 0 4px 20px rgba(0, 240, 255, 0.45);
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
    this.selectedCarId = this.selectedCarId || CARS[0].id;
    this.selectedLevelId = this.selectedLevelId || LEVELS[0].id;
    
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
    
    CARS.forEach((car, index) => {
      const isLocked = car.unlockLevel > (maxCompleted + 1);
      const isSelected = this.selectedCarId === car.id;

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
        lockOverlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;background:rgba(3,7,18,0.85);border-radius:12px;';
        lockOverlay.innerHTML = `<div style="font-size:2.2rem;margin-bottom:6px;">🔒</div><div style="font-weight:800;font-size:0.85rem;color:#f8fafc;text-align:center;">Win Level ${car.unlockLevel} to unlock</div>`;
        card.appendChild(lockOverlay);
      } else {
        const selectThisCar = (e) => {
          if (e) e.preventDefault();
          grid.querySelectorAll('.garage-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this.selectedCarId = car.id;
        };
        card.addEventListener('click', selectThisCar);
        card.addEventListener('pointerup', selectThisCar);
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
    const onBackClick = (e) => {
      if (e) e.preventDefault();
      if (this.callbacks.onBack) this.callbacks.onBack();
    };
    backBtn.addEventListener('click', onBackClick);
    backBtn.addEventListener('pointerup', onBackClick);
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'garage-btn garage-btn-primary';
    nextBtn.textContent = 'SELECT TRACK ▶';
    const onNextClick = (e) => {
      if (e) e.preventDefault();
      this.selectedCarId = this.selectedCarId || CARS[0].id;
      this.showLevelSelection();
    };
    nextBtn.addEventListener('click', onNextClick);
    nextBtn.addEventListener('pointerup', onNextClick);
    
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
    
    this.selectedLevelId = this.selectedLevelId || LEVELS[0].id;
    
    LEVELS.forEach((level) => {
      const themeColor = themeColors[level.id] || '#00f0ff';
      const isSelected = this.selectedLevelId === level.id;
      
      const card = document.createElement('div');
      card.className = `level-card ${isSelected ? 'selected' : ''}`;
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
      desc.textContent = `${level.description} • 20m Wide Circuit`;
      desc.style.cssText = 'color:#94a3b8;font-size:0.9rem;margin:0 0 8px 0;';
      card.appendChild(desc);
      
      const lapsEl = document.createElement('div');
      lapsEl.textContent = `Laps: ${level.laps} Laps Circuit`;
      lapsEl.style.cssText = 'font-weight:700;font-size:0.85rem;color:#38bdf8;';
      card.appendChild(lapsEl);
      
      const selectThisLevel = (e) => {
        if (e) e.preventDefault();
        list.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedLevelId = level.id;
      };
      card.addEventListener('click', selectThisLevel);
      card.addEventListener('pointerup', selectThisLevel);
      
      list.appendChild(card);
    });
    
    this.container.appendChild(list);
    
    // Footer
    const footer = document.createElement('div');
    footer.className = 'garage-footer';
    
    const backBtn = document.createElement('button');
    backBtn.className = 'garage-btn garage-btn-back';
    backBtn.textContent = '◀ CARS';
    const onCarsBack = (e) => {
      if (e) e.preventDefault();
      this.showCarSelection();
    };
    backBtn.addEventListener('click', onCarsBack);
    backBtn.addEventListener('pointerup', onCarsBack);
    
    const raceBtn = document.createElement('button');
    raceBtn.className = 'garage-btn garage-btn-primary';
    raceBtn.textContent = '🏁 START RACE!';
    
    const triggerStartRace = (e) => {
      if (e) e.preventDefault();
      const carId = this.selectedCarId || 'rookie';
      const levelId = this.selectedLevelId || 'city';
      console.log('Starting race with car:', carId, 'level:', levelId);
      if (this.callbacks.onStartRace) {
        this.callbacks.onStartRace(carId, levelId);
      }
    };
    
    raceBtn.addEventListener('click', triggerStartRace);
    raceBtn.addEventListener('pointerup', triggerStartRace);
    
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
