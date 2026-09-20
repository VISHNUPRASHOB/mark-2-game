import { CARS, getUnlockedCars } from '../cars/carData.js';
import { LEVELS } from '../tracks/trackData.js';

/**
 * Car & level selection UI (Garage)
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
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.backgroundColor = 'rgba(10, 10, 15, 0.95)';
    this.container.style.color = 'white';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.padding = '20px';
    this.container.style.boxSizing = 'border-box';
    this.container.style.overflowY = 'auto';
    this.container.style.fontFamily = "'Segoe UI', system-ui, sans-serif";
    
    if (!document.getElementById('garage-styles')) {
      const style = document.createElement('style');
      style.id = 'garage-styles';
      style.textContent = `
        .garage-grid {
          display: grid;
          gap: 20px;
          margin-bottom: 20px;
        }
        @media (min-width: 1024px) { .garage-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 600px) and (max-width: 1023px) { .garage-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 599px) { .garage-grid { grid-template-columns: 1fr; } }
        
        .garage-card {
          background: rgba(0,0,0,0.7);
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .garage-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.5);
        }
        .garage-card.selected {
          border-color: var(--car-color, #fff);
          box-shadow: 0 0 15px var(--car-color, #fff);
        }
        .garage-card.locked {
          opacity: 0.5;
          filter: grayscale(100%);
          cursor: not-allowed;
        }
        .garage-card.locked:hover {
          transform: none;
          box-shadow: none;
        }
        .stat-bar-container {
          background: #333;
          height: 8px;
          border-radius: 4px;
          margin-top: 4px;
          margin-bottom: 8px;
          overflow: hidden;
        }
        .stat-bar-fill {
          height: 100%;
          border-radius: 4px;
        }
        
        .level-card {
          background: rgba(0,0,0,0.7);
          border: 2px solid rgba(255,255,255,0.1);
          border-left-width: 6px;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .level-card:hover {
          background: rgba(20,20,20,0.9);
          transform: translateY(-3px);
        }
        .level-card.selected {
          border-color: #fff;
          border-left-color: var(--theme-color, #fff);
          box-shadow: 0 0 15px rgba(255,255,255,0.3);
        }
        
        .garage-footer {
          display: flex;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 20px;
        }
        .garage-btn {
          padding: 15px 30px;
          border-radius: 8px;
          border: none;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: pointer;
          color: white;
          transition: all 0.2s;
        }
        .garage-btn:disabled {
          background: #555 !important;
          color: #888;
          cursor: not-allowed;
        }
        .garage-btn-primary { background: linear-gradient(135deg, #00c3ff, #0055ff); }
        .garage-btn-primary:not(:disabled):hover { filter: brightness(1.2); transform: scale(1.05); }
        .garage-btn-back { background: linear-gradient(135deg, #e74c3c, #c0392b); }
        .garage-btn-back:not(:disabled):hover { filter: brightness(1.2); transform: scale(1.05); }
      `;
      document.head.appendChild(style);
    }
  }
  
  /**
   * Convert hex number to CSS color string
   */
  hexToCSS(hex) {
    return '#' + hex.toString(16).padStart(6, '0');
  }
  
  /**
   * Get the max completed level index
   */
  getMaxCompleted() {
    if (!this.completedLevels || this.completedLevels.length === 0) return -1;
    return Math.max(...this.completedLevels);
  }
  
  /**
   * Show garage with car selection
   * @param {number[]} completedLevels - array of completed level indices
   */
  show(completedLevels = []) {
    this.completedLevels = completedLevels;
    this.selectedCarId = null;
    this.selectedLevelId = null;
    
    this.overlay.innerHTML = '';
    this.overlay.appendChild(this.container);
    this.overlay.style.display = 'flex';
    
    this.showCarSelection();
  }
  
  showCarSelection() {
    this.container.innerHTML = '';
    
    const title = document.createElement('h2');
    title.textContent = 'SELECT YOUR CAR';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    title.style.fontSize = 'clamp(1.5rem, 4vw, 2.5rem)';
    title.style.letterSpacing = '2px';
    this.container.appendChild(title);
    
    const grid = document.createElement('div');
    grid.className = 'garage-grid';
    
    // Determine which cars are unlocked
    // getUnlockedCars expects a number (highest completed level index)
    const maxCompleted = this.getMaxCompleted();
    
    // Max stats for percentage calculation
    const maxStats = { topSpeed: 200, acceleration: 100, handling: 1.0, drift: 0.8 };
    
    // Store ref to nextBtn for enabling in click handler
    let nextBtn;
    
    CARS.forEach(car => {
      const isLocked = car.unlockLevel > (maxCompleted + 1);
      const colorCSS = this.hexToCSS(car.color);
      
      const card = document.createElement('div');
      card.className = 'garage-card' + (isLocked ? ' locked' : '');
      card.style.setProperty('--car-color', colorCSS);
      
      // Header with name and color swatch
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.marginBottom = '10px';
      
      const nameEl = document.createElement('h3');
      nameEl.textContent = car.name;
      nameEl.style.margin = '0';
      nameEl.style.fontSize = '1.3rem';
      
      const swatch = document.createElement('div');
      swatch.style.width = '30px';
      swatch.style.height = '30px';
      swatch.style.borderRadius = '50%';
      swatch.style.background = colorCSS;
      swatch.style.border = '2px solid rgba(255,255,255,0.3)';
      swatch.style.boxShadow = '0 0 8px ' + colorCSS;
      
      header.appendChild(nameEl);
      header.appendChild(swatch);
      card.appendChild(header);
      
      // Type label
      const typeEl = document.createElement('p');
      typeEl.textContent = car.type;
      typeEl.style.color = '#aaa';
      typeEl.style.fontSize = '0.9rem';
      typeEl.style.margin = '0 0 10px 0';
      card.appendChild(typeEl);
      
      // Stats
      const statsData = [
        { label: 'Speed', val: car.stats.topSpeed, max: maxStats.topSpeed },
        { label: 'Accel', val: car.stats.acceleration, max: maxStats.acceleration },
        { label: 'Handling', val: car.stats.handling, max: maxStats.handling },
        { label: 'Drift', val: car.stats.drift, max: maxStats.drift }
      ];
      
      statsData.forEach(s => {
        const pct = Math.min(100, (s.val / s.max) * 100);
        let barColor = '#e74c3c'; // red
        if (pct > 75) barColor = '#2ecc71'; // green
        else if (pct > 40) barColor = '#f1c40f'; // yellow
        
        const label = document.createElement('div');
        label.textContent = s.label;
        label.style.fontSize = '0.75rem';
        label.style.color = '#ccc';
        label.style.textTransform = 'uppercase';
        label.style.letterSpacing = '1px';
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
      
      // Lock overlay
      if (isLocked) {
        const lockOverlay = document.createElement('div');
        lockOverlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;background:rgba(0,0,0,0.6);border-radius:12px;';
        lockOverlay.innerHTML = '<div style="font-size:2rem;margin-bottom:10px;">🔒</div><div style="font-weight:bold;text-align:center;padding:0 10px;">Win Level ' + car.unlockLevel + ' to unlock</div>';
        card.appendChild(lockOverlay);
      }
      
      // Click handler
      if (!isLocked) {
        card.addEventListener('click', () => {
          grid.querySelectorAll('.garage-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          this.selectedCarId = car.id;
          if (nextBtn) nextBtn.disabled = false;
        });
      }
      
      grid.appendChild(card);
    });
    
    this.container.appendChild(grid);
    
    // Footer buttons
    const footer = document.createElement('div');
    footer.className = 'garage-footer';
    
    const backBtn = document.createElement('button');
    backBtn.className = 'garage-btn garage-btn-back';
    backBtn.textContent = '← BACK';
    backBtn.addEventListener('click', () => {
      if (this.callbacks.onBack) this.callbacks.onBack();
    });
    
    nextBtn = document.createElement('button');
    nextBtn.className = 'garage-btn garage-btn-primary';
    nextBtn.textContent = 'NEXT →';
    nextBtn.disabled = true;
    nextBtn.addEventListener('click', () => {
      this.showLevelSelection();
    });
    
    footer.appendChild(backBtn);
    footer.appendChild(nextBtn);
    this.container.appendChild(footer);
  }
  
  showLevelSelection() {
    this.container.innerHTML = '';
    
    const title = document.createElement('h2');
    title.textContent = 'SELECT TRACK';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    title.style.fontSize = 'clamp(1.5rem, 4vw, 2.5rem)';
    title.style.letterSpacing = '2px';
    this.container.appendChild(title);
    
    const list = document.createElement('div');
    list.style.maxWidth = '600px';
    list.style.margin = '0 auto';
    list.style.width = '100%';
    
    // Theme colors for each level
    const themeColors = {
      city: '#3498db',
      desert: '#e67e22',
      neon: '#00ffcc'
    };
    
    const difficultyStars = {
      1: '★☆☆',
      2: '★★☆',
      3: '★★★'
    };
    
    let raceBtn;
    
    LEVELS.forEach(level => {
      const themeColor = themeColors[level.id] || '#ffffff';
      
      const card = document.createElement('div');
      card.className = 'level-card';
      card.style.setProperty('--theme-color', themeColor);
      card.style.borderLeftColor = themeColor;
      
      // Header
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      
      const nameEl = document.createElement('h3');
      nameEl.textContent = level.name;
      nameEl.style.margin = '0';
      nameEl.style.fontSize = '1.5rem';
      
      const stars = document.createElement('div');
      stars.textContent = difficultyStars[level.difficulty] || '★';
      stars.style.color = '#f1c40f';
      stars.style.fontSize = '1.2rem';
      
      header.appendChild(nameEl);
      header.appendChild(stars);
      card.appendChild(header);
      
      // Description
      const desc = document.createElement('p');
      desc.textContent = level.description;
      desc.style.color = '#aaa';
      desc.style.margin = '5px 0 10px 0';
      card.appendChild(desc);
      
      // Laps info
      const lapsEl = document.createElement('div');
      lapsEl.textContent = 'Laps: ' + level.laps;
      lapsEl.style.fontWeight = 'bold';
      card.appendChild(lapsEl);
      
      // Click handler
      card.addEventListener('click', () => {
        list.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedLevelId = level.id;
        if (raceBtn) raceBtn.disabled = false;
      });
      
      list.appendChild(card);
    });
    
    this.container.appendChild(list);
    
    // Footer
    const footer = document.createElement('div');
    footer.className = 'garage-footer';
    
    const backBtn = document.createElement('button');
    backBtn.className = 'garage-btn garage-btn-back';
    backBtn.textContent = '← BACK';
    backBtn.addEventListener('click', () => {
      this.showCarSelection();
    });
    
    raceBtn = document.createElement('button');
    raceBtn.className = 'garage-btn garage-btn-primary';
    raceBtn.textContent = '🏁 RACE!';
    raceBtn.disabled = true;
    raceBtn.addEventListener('click', () => {
      if (this.callbacks.onStartRace) {
        this.callbacks.onStartRace(this.selectedCarId, this.selectedLevelId);
      }
    });
    
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
