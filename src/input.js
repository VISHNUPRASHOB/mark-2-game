export class InputManager {
  /**
   * @param {HTMLElement} container - The game container element
   */
  constructor(container) {
    this.container = container;
    this.state = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      brake: false
    };

    this.mobile = this.isMobile();
    
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    
    if (this.mobile) {
      this.showTouchControls();
      this.setupTouch();
    }
  }

  handleKeyDown(e) {
    switch(e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.state.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.state.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.state.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.state.right = true;
        break;
      case 'Space':
        this.state.brake = true;
        break;
    }
  }

  handleKeyUp(e) {
    switch(e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.state.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.state.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.state.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.state.right = false;
        break;
      case 'Space':
        this.state.brake = false;
        break;
    }
  }

  setupTouch() {
    const bindTouch = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.state[key] = true;
      }, { passive: false });
      
      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.state[key] = false;
      }, { passive: false });
    };

    bindTouch('touch-left', 'left');
    bindTouch('touch-right', 'right');
    bindTouch('touch-gas', 'forward');
    bindTouch('touch-brake', 'brake');
  }

  /**
   * Returns current input state
   * @returns {{ forward: boolean, backward: boolean, left: boolean, right: boolean, brake: boolean }}
   */
  getState() {
    return { ...this.state };
  }

  /** Show/hide mobile touch controls */
  showTouchControls() {
    const controls = document.getElementById('touch-controls');
    if (controls) {
      controls.style.display = 'flex';
    }
  }
  
  hideTouchControls() {
    const controls = document.getElementById('touch-controls');
    if (controls) {
      controls.style.display = 'none';
    }
  }

  /** Check if on mobile device */
  isMobile() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }

  /** Cleanup */
  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
