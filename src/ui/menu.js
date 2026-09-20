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
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.alignItems = 'center';
    this.container.style.justifyContent = 'center';
    this.container.style.gap = '20px';
    this.container.style.background = 'radial-gradient(circle at center, rgba(10,30,60,0.8) 0%, rgba(0,0,0,0.95) 100%)';
    
    // Title
    const titleContainer = document.createElement('div');
    titleContainer.style.textAlign = 'center';
    titleContainer.style.marginBottom = '40px';
    
    const title = document.createElement('h1');
    title.textContent = 'MARK-II';
    title.style.color = '#ffffff';
    title.style.fontSize = 'clamp(4rem, 10vw, 8rem)';
    title.style.margin = '0';
    title.style.fontWeight = '900';
    title.style.fontFamily = 'sans-serif';
    title.style.textShadow = '0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 40px #0088ff, 0 0 80px #0000ff';
    title.style.animation = 'pulse 2s infinite alternate';
    
    const subtitle = document.createElement('div');
    subtitle.textContent = 'VPS GAME CREATOR';
    subtitle.style.color = '#aaaaaa';
    subtitle.style.fontSize = '1.2rem';
    subtitle.style.letterSpacing = '0.3em';
    subtitle.style.fontWeight = '300';
    subtitle.style.marginTop = '10px';
    
    // Add keyframes to document if not present
    if (!document.getElementById('menu-styles')) {
      const style = document.createElement('style');
      style.id = 'menu-styles';
      style.textContent = `
        @keyframes pulse {
          0% { text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, 0 0 40px #0088ff, 0 0 80px #0000ff; }
          100% { text-shadow: 0 0 15px #00ffff, 0 0 30px #00ffff, 0 0 50px #0088ff, 0 0 100px #0000ff; }
        }
        .menu-btn {
          min-width: 200px;
          height: 50px;
          border-radius: 12px;
          border: none;
          color: white;
          font-weight: bold;
          font-size: 1.2rem;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .menu-btn:hover {
          transform: scale(1.05);
        }
        .btn-primary {
          background: linear-gradient(90deg, #3498db, #2ecc71);
          box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);
        }
        .btn-primary:hover {
          box-shadow: 0 6px 20px rgba(46, 204, 113, 0.6);
        }
        .btn-secondary {
          background: linear-gradient(90deg, #555, #777);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
        }
        .btn-secondary:hover {
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
        }
      `;
      document.head.appendChild(style);
    }
    
    titleContainer.appendChild(title);
    titleContainer.appendChild(subtitle);
    
    // Buttons
    const playBtn = document.createElement('button');
    playBtn.textContent = 'PLAY';
    playBtn.className = 'menu-btn btn-primary';
    playBtn.onclick = () => { if(this.callbacks.onPlay) this.callbacks.onPlay(); };
    
    const settingsBtn = document.createElement('button');
    settingsBtn.textContent = 'SETTINGS';
    settingsBtn.className = 'menu-btn btn-secondary';
    settingsBtn.onclick = () => { if(this.callbacks.onSettings) this.callbacks.onSettings(); };
    
    const creditsBtn = document.createElement('button');
    creditsBtn.textContent = 'CREDITS';
    creditsBtn.className = 'menu-btn btn-secondary';
    creditsBtn.onclick = () => { console.log('Credits clicked'); }; // placeholder
    
    // Version
    const version = document.createElement('div');
    version.textContent = 'v1.0 | Built with Three.js';
    version.style.position = 'absolute';
    version.style.bottom = '20px';
    version.style.color = '#777777';
    version.style.fontSize = '0.9rem';
    
    this.container.appendChild(titleContainer);
    this.container.appendChild(playBtn);
    this.container.appendChild(settingsBtn);
    this.container.appendChild(creditsBtn);
    this.container.appendChild(version);
  }
  
  /** Show menu, add to overlay */
  show() {
    this.overlay.innerHTML = '';
    this.overlay.appendChild(this.container);
    this.overlay.style.display = 'block';
  }
  
  /** Hide menu */
  hide() {
    if (this.overlay.contains(this.container)) {
      this.overlay.removeChild(this.container);
    }
    this.overlay.style.display = 'none';
  }
  
  /** Dispose */
  dispose() {
    this.hide();
  }
}
