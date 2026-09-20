/**
 * Universal Input Manager for PC and Mobile
 * Features:
 * - Robust keyboard input (WASD, Arrow keys, Space, Shift) with blur auto-reset
 * - Multi-touch pointer events with capture (no stuck buttons when dragging off)
 * - Simultaneous two-thumb controls (Gas/Brake on right, Steer Left/Right on left)
 * - Click and touch support for all on-screen control pads
 */
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
    
    // Bindings
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    
    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp, { passive: false });
    window.addEventListener('blur', this.handleBlur);
    
    // Setup touch / pointer controls
    this.setupTouch();
    
    // Always show touch controls on mobile or touch devices
    if (this.mobile) {
      this.showTouchControls();
    }
  }

  handleBlur() {
    // Reset all inputs when tab/window loses focus to prevent runaway car
    this.state.forward = false;
    this.state.backward = false;
    this.state.left = false;
    this.state.right = false;
    this.state.brake = false;
  }

  handleKeyDown(e) {
    // Prevent default scroll on arrow keys and spacebar
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    const key = e.key ? e.key.toLowerCase() : '';
    
    if (e.code === 'KeyW' || e.code === 'ArrowUp' || key === 'w') {
      this.state.forward = true;
    }
    if (e.code === 'KeyS' || e.code === 'ArrowDown' || key === 's') {
      this.state.backward = true;
    }
    if (e.code === 'KeyA' || e.code === 'ArrowLeft' || key === 'a') {
      this.state.left = true;
    }
    if (e.code === 'KeyD' || e.code === 'ArrowRight' || key === 'd') {
      this.state.right = true;
    }
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || key === ' ') {
      this.state.brake = true;
    }
  }

  handleKeyUp(e) {
    const key = e.key ? e.key.toLowerCase() : '';

    if (e.code === 'KeyW' || e.code === 'ArrowUp' || key === 'w') {
      this.state.forward = false;
    }
    if (e.code === 'KeyS' || e.code === 'ArrowDown' || key === 's') {
      this.state.backward = false;
    }
    if (e.code === 'KeyA' || e.code === 'ArrowLeft' || key === 'a') {
      this.state.left = false;
    }
    if (e.code === 'KeyD' || e.code === 'ArrowRight' || key === 'd') {
      this.state.right = false;
    }
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || key === ' ') {
      this.state.brake = false;
    }
  }

  setupTouch() {
    const bindControl = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;

      const setActive = (active) => {
        this.state[key] = active;
        if (active) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      };

      // Pointer Events (supports Touch, Stylus & Mouse with setPointerCapture)
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { el.setPointerCapture(e.pointerId); } catch(err) {}
        setActive(true);
      }, { passive: false });

      el.addEventListener('pointerup', (e) => {
        e.preventDefault();
        try { el.releasePointerCapture(e.pointerId); } catch(err) {}
        setActive(false);
      }, { passive: false });

      el.addEventListener('pointercancel', (e) => {
        setActive(false);
      }, { passive: false });

      el.addEventListener('pointerleave', (e) => {
        // Fallback if not captured
        setActive(false);
      }, { passive: false });

      // Native touch events for older webview compatibility
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        setActive(true);
      }, { passive: false });

      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        setActive(false);
      }, { passive: false });

      el.addEventListener('touchcancel', (e) => {
        setActive(false);
      }, { passive: false });

      // Disable context menu on long press
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    };

    bindControl('touch-left', 'left');
    bindControl('touch-right', 'right');
    bindControl('touch-gas', 'forward');
    bindControl('touch-brake', 'backward');
    bindControl('touch-drift', 'brake');
  }

  /**
   * Returns current input state
   * @returns {{ forward: boolean, backward: boolean, left: boolean, right: boolean, brake: boolean }}
   */
  getState() {
    return { ...this.state };
  }

  /** Show mobile touch controls */
  showTouchControls() {
    const controls = document.getElementById('touch-controls');
    if (controls) {
      controls.style.display = 'flex';
    }
  }
  
  /** Hide mobile touch controls */
  hideTouchControls() {
    const controls = document.getElementById('touch-controls');
    if (controls) {
      controls.style.display = 'none';
    }
  }

  /** Check if on mobile or touch device */
  isMobile() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 1024);
  }

  /** Cleanup */
  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }
}
