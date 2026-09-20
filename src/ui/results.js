/**
 * Race results display
 */
export class Results {
  /**
   * @param {HTMLElement} overlay - The #ui-overlay element
   * @param {object} callbacks - { onNextRace: Function, onReplay: Function, onMenu: Function }
   */
  constructor(overlay, callbacks) {
    this.overlay = overlay;
    this.callbacks = callbacks;
    
    this.container = document.createElement('div');
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.alignItems = 'center';
    this.container.style.justifyContent = 'center';
    this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    this.container.style.backdropFilter = 'blur(5px)';
    this.container.style.fontFamily = 'sans-serif';
    this.container.style.color = '#fff';
    
    if (!document.getElementById('results-styles')) {
      const style = document.createElement('style');
      style.id = 'results-styles';
      style.textContent = `
        .results-card {
          background: #1a1a1a;
          border: 2px solid #333;
          border-radius: 16px;
          padding: 30px;
          width: 90%;
          max-width: 500px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.8);
          position: relative;
        }
        .pos-badge {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: bold;
          margin: 0 auto 20px auto;
          color: white;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        .pos-1 { background: linear-gradient(135deg, #f1c40f, #d35400); }
        .pos-2 { background: linear-gradient(135deg, #bdc3c7, #7f8c8d); }
        .pos-3 { background: linear-gradient(135deg, #e67e22, #d35400); }
        .pos-other { background: linear-gradient(135deg, #34495e, #2c3e50); }
        
        .stats-table {
          width: 100%;
          text-align: left;
          margin: 20px 0;
          border-collapse: collapse;
        }
        .stats-table td {
          padding: 8px 0;
          border-bottom: 1px solid #333;
        }
        .stats-table td:nth-child(2) {
          text-align: right;
          font-family: monospace;
          font-size: 1.1rem;
        }
        
        .new-unlock {
          color: #f1c40f;
          font-size: 1.2rem;
          font-weight: bold;
          margin: 20px 0;
          animation: flash 1s infinite alternate;
        }
        @keyframes flash {
          from { opacity: 1; text-shadow: 0 0 10px #f1c40f; }
          to { opacity: 0.5; text-shadow: none; }
        }
        
        .results-btns {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 20px;
        }
        .results-btn {
          padding: 12px;
          border-radius: 8px;
          border: none;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
          color: white;
          transition: transform 0.2s;
        }
        .results-btn:hover { transform: scale(1.02); }
        .btn-primary { background: #3498db; }
        .btn-secondary { background: #555; }
      `;
      document.head.appendChild(style);
    }
  }
  
  formatTime(seconds) {
    if (!seconds) return '--:--.---';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
  
  /**
   * Show results
   * @param {object} data
   */
  show(data) {
    this.container.innerHTML = '';
    
    const card = document.createElement('div');
    card.className = 'results-card';
    
    const header = document.createElement('h1');
    header.textContent = data.playerPosition === 1 ? 'YOU WIN!' : 'RACE COMPLETE';
    header.style.margin = '0 0 20px 0';
    header.style.color = data.playerPosition === 1 ? '#f1c40f' : '#fff';
    card.appendChild(header);
    
    const badge = document.createElement('div');
    badge.className = `pos-badge pos-${data.playerPosition <= 3 ? data.playerPosition : 'other'}`;
    
    let suffix = 'th';
    if (data.playerPosition === 1) suffix = 'st';
    else if (data.playerPosition === 2) suffix = 'nd';
    else if (data.playerPosition === 3) suffix = 'rd';
    badge.innerHTML = `${data.playerPosition}<span style="font-size:1rem">${suffix}</span>`;
    card.appendChild(badge);
    
    const table = document.createElement('table');
    table.className = 'stats-table';
    
    const bestLap = data.lapTimes && data.lapTimes.length > 0 ? Math.min(...data.lapTimes) : 0;
    
    table.innerHTML = `
      <tr><td>Track</td><td>${data.levelName || 'Unknown'}</td></tr>
      <tr><td>Car</td><td>${data.carName || 'Unknown'}</td></tr>
      <tr><td>Total Time</td><td>${this.formatTime(data.raceTime)}</td></tr>
      <tr><td>Best Lap</td><td style="color:#2ecc71">${this.formatTime(bestLap)}</td></tr>
    `;
    card.appendChild(table);
    
    if (data.isNewUnlock && data.unlockedCarName) {
      const unlockMsg = document.createElement('div');
      unlockMsg.className = 'new-unlock';
      unlockMsg.textContent = `⭐ NEW CAR UNLOCKED: ${data.unlockedCarName.toUpperCase()}! ⭐`;
      card.appendChild(unlockMsg);
    }
    
    const btns = document.createElement('div');
    btns.className = 'results-btns';
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'results-btn btn-primary';
    nextBtn.textContent = 'NEXT RACE';
    nextBtn.onclick = () => { if(this.callbacks.onNextRace) this.callbacks.onNextRace(); };
    
    const replayBtn = document.createElement('button');
    replayBtn.className = 'results-btn btn-secondary';
    replayBtn.textContent = 'REPLAY';
    replayBtn.onclick = () => { if(this.callbacks.onReplay) this.callbacks.onReplay(); };
    
    const menuBtn = document.createElement('button');
    menuBtn.className = 'results-btn btn-secondary';
    menuBtn.textContent = 'MAIN MENU';
    menuBtn.onclick = () => { if(this.callbacks.onMenu) this.callbacks.onMenu(); };
    
    btns.appendChild(nextBtn);
    btns.appendChild(replayBtn);
    btns.appendChild(menuBtn);
    
    card.appendChild(btns);
    this.container.appendChild(card);
    
    this.overlay.innerHTML = '';
    this.overlay.appendChild(this.container);
    this.overlay.style.display = 'block';
    
    if (data.playerPosition === 1) {
      this.spawnConfetti();
    }
  }
  
  spawnConfetti() {
    for (let i = 0; i < 50; i++) {
      const conf = document.createElement('div');
      conf.style.position = 'absolute';
      conf.style.width = '10px';
      conf.style.height = '10px';
      
      const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
      conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      
      conf.style.left = Math.random() * 100 + 'vw';
      conf.style.top = '-10px';
      
      conf.style.zIndex = '9999';
      
      this.container.appendChild(conf);
      
      const duration = Math.random() * 2 + 2;
      const delay = Math.random() * 2;
      
      conf.animate([
        { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
        { transform: `translateY(100vh) rotate(${Math.random() * 720}deg)`, opacity: 0 }
      ], {
        duration: duration * 1000,
        delay: delay * 1000,
        easing: 'linear',
        fill: 'forwards'
      });
      
      setTimeout(() => {
        if(this.container.contains(conf)) this.container.removeChild(conf);
      }, (duration + delay) * 1000);
    }
  }
  
  hide() {
    if (this.overlay.contains(this.container)) {
      this.overlay.removeChild(this.container);
    }
    this.overlay.style.display = 'none';
  }
  
  dispose() {
    this.hide();
  }
}
