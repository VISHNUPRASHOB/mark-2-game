/**
 * Main menu UI
 */
export class MainMenu {
  /**
   * @param {HTMLElement} overlay - The #ui-overlay element
   * @param {object} callbacks - { onPlay: Function, onSettings: Function }
   */
  constructor(overlay, callbacks) {
    this.overlay = overlay;
    this.callbacks = callbacks;
    
    this.container = document.createElement('div');
    this.container.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:radial-gradient(circle at center, rgba(14,23,38,0.7) 0%, rgba(3,7,18,0.95) 100%);font-family:"Segoe UI",system-ui,sans-serif;';
    
    // Title
    const titleContainer = document.createElement('div');
    titleContainer.style.textAlign = 'center';
    titleContainer.style.marginBottom = '25px';
    
    const title = document.createElement('h1');
    title.textContent = 'MARK-II';
    title.style.cssText = 'color:#ffffff;font-size:clamp(3.8rem,10vw,7rem);margin:0;font-weight:900;letter-spacing:3px;text-shadow:0 0 20px #00f0ff, 0 0 40px rgba(0,119,255,0.7);';
    
    const subtitle = document.createElement('div');
    subtitle.textContent = 'VPS GAME CREATOR';
    subtitle.style.cssText = 'color:#38bdf8;font-size:1.1rem;letter-spacing:0.35em;font-weight:700;margin-top:6px;';
    
    if (!document.getElementById('menu-styles')) {
      const style = document.createElement('style');
      style.id = 'menu-styles';
      style.textContent = `
        .menu-btn {
          min-width: 220px;
          height: 54px;
          border-radius: 14px;
          border: none;
          color: white;
          font-weight: 800;
          font-size: 1.25rem;
          cursor: pointer;
          letter-spacing: 1px;
          transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
          touch-action: manipulation;
        }
        .menu-btn:hover {
          transform: translateY(-2px) scale(1.03);
        }
        .menu-btn:active {
          transform: scale(0.97);
        }
        .menu-btn-primary {
          background: linear-gradient(135deg, #0077ff, #00f0ff);
          box-shadow: 0 4px 20px rgba(0, 240, 255, 0.45);
        }
        .menu-btn-primary:hover {
          box-shadow: 0 6px 25px rgba(0, 240, 255, 0.65);
        }
        .menu-btn-secondary {
          background: rgba(30, 41, 59, 0.85);
          border: 1.5px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
        }
        .menu-btn-secondary:hover {
          background: rgba(51, 65, 85, 0.95);
          border-color: rgba(255, 255, 255, 0.4);
        }
      `;
      document.head.appendChild(style);
    }
    
    titleContainer.appendChild(title);
    titleContainer.appendChild(subtitle);
    
    // Buttons
    const playBtn = document.createElement('button');
    playBtn.textContent = 'PLAY RACE';
    playBtn.className = 'menu-btn menu-btn-primary';
    const triggerPlay = () => { if (this.callbacks.onPlay) this.callbacks.onPlay(); };
    playBtn.onclick = triggerPlay;
    
    const audioBtn = document.createElement('button');
    audioBtn.textContent = 'MUTE / UNMUTE';
    audioBtn.className = 'menu-btn menu-btn-secondary';
    audioBtn.onclick = () => { if (this.callbacks.onSettings) this.callbacks.onSettings(); };
    
    // Controls Info
    const info = document.createElement('div');
    info.style.cssText = 'color:#94a3b8;font-size:0.85rem;margin-top:15px;text-align:center;max-width:320px;line-height:1.4;';
    info.innerHTML = '<b>PC</b>: WASD / Arrows + Space to Drift<br><b>Mobile</b>: On-screen steering & pedals';
    
    this.container.appendChild(titleContainer);
    this.container.appendChild(playBtn);
    this.container.appendChild(audioBtn);
    this.container.appendChild(info);
  }
  
  /** Show menu */
  show() {
    this.overlay.innerHTML = '';
    this.overlay.appendChild(this.container);
    this.overlay.style.display = 'flex';
  }
  
  /** Hide menu */
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
