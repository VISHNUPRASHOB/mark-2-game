/**
 * GTA 5 Style Procedural Audio Engine
 * Features:
 * - Dynamic 5-speed engine simulation with realistic RPM curves and throttle rumble
 * - Continuous tire screech audio modulated by dynamic slip angle & drift
 * - Exhaust backfire pops on gear upshifts and throttle releases
 * - Heavy metal collision impact synthesis
 * - Procedural electronic synth music
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    
    // Engine synthesis nodes
    this.engineOsc = null;
    this.engineSubOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    
    // Tire screech nodes
    this.skidGain = null;
    this.skidFilter = null;
    this.skidSource = null;
    
    this.musicTimer = null;
    this.isMusicPlaying = false;
    this.muted = false;
    this.volume = 0.5;
  }

  /**
   * Initializes Web Audio context
   */
  initContext() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
      
      this._setupEngineNodes();
      this._setupSkidNodes();
    }
  }

  /**
   * Resumes AudioContext
   */
  resume() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Set up dual-oscillator engine synthesis with low-pass filtering
   */
  _setupEngineNodes() {
    if (!this.ctx || this.engineOsc) return;

    // Main engine tone (sawtooth)
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 65;

    // Sub-bass engine rumble (triangle)
    this.engineSubOsc = this.ctx.createOscillator();
    this.engineSubOsc.type = 'triangle';
    this.engineSubOsc.frequency.value = 32.5;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 850;
    this.engineFilter.Q.value = 2.0;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;

    this.engineOsc.connect(this.engineFilter);
    this.engineSubOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc.start();
    this.engineSubOsc.start();
  }

  /**
   * Set up continuous tire screech noise generator
   */
  _setupSkidNodes() {
    if (!this.ctx || this.skidGain) return;

    const bufferSize = this.ctx.sampleRate * 2; // 2s loop
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.skidSource = this.ctx.createBufferSource();
    this.skidSource.buffer = noiseBuffer;
    this.skidSource.loop = true;

    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.value = 1100;
    this.skidFilter.Q.value = 3.5;

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.value = 0.0;

    this.skidSource.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.masterGain);

    this.skidSource.start();
  }

  /**
   * Updates GTA 5 engine audio with gear RPM simulation
   * @param {number} speed - Current speed
   * @param {number} maxSpeed - Top speed
   * @param {number} rpm - RPM value (0.2 to 1.0)
   * @param {number} gear - Current gear (1 to 5)
   */
  playEngine(speed, maxSpeed, rpm = 0.3, gear = 1) {
    if (!this.ctx || this.muted || !this.engineOsc) return;

    const speedFraction = Math.max(0, Math.min(speed / (maxSpeed || 150), 1));
    
    // Base frequency mapped to gear + RPM
    const baseFreq = 50 + (gear * 8);
    const targetFreq = baseFreq + (rpm * 160);
    
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.04);
    this.engineSubOsc.frequency.setTargetAtTime(targetFreq * 0.5, this.ctx.currentTime, 0.04);
    
    // Dynamic filter opens up with higher RPM
    const filterFreq = 600 + (rpm * 1800);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.05);

    // Volume level
    const vol = 0.08 + (speedFraction * 0.12) + (rpm * 0.08);
    this.engineGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
  }

  /**
   * Continuous dynamic tire slip sound (GTA 5 drift audio)
   * @param {number} tireSlip - Slip amount (0 to 1)
   */
  updateTireScreech(tireSlip) {
    if (!this.ctx || this.muted || !this.skidGain) return;

    if (tireSlip > 0.05) {
      const vol = Math.min(0.28, tireSlip * 0.28);
      const targetFreq = 800 + (tireSlip * 600);
      
      this.skidGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.03);
      this.skidFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
    } else {
      this.skidGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.06);
    }
  }

  /**
   * Plays a single tire screech sound
   */
  playDrift() {
    this.updateTireScreech(0.8);
  }

  /**
   * Plays GTA 5 style exhaust pop/backfire on upshifts or rev cuts
   */
  playExhaustPop() {
    if (!this.ctx || this.muted) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.08);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  /**
   * Plays heavy metal collision impact sound
   */
  playCollision() {
    if (!this.ctx || this.muted) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.25, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.25);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.65, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    osc.connect(gainNode);
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.15);

    osc.start();
    noise.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  /**
   * Plays countdown beeps
   */
  playCountdownBeep() {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 440;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playCountdownGo() {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 880;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  /**
   * Starts procedural background synth music
   */
  startMusic() {
    if (!this.ctx || this.muted || this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    
    let step = 0;
    const notes = [220, 261.63, 329.63, 392.00, 440, 392.00, 329.63, 261.63];

    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = notes[step % notes.length] * 0.5;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 750;

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);

      step++;
    }, 220);
  }

  stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  setMasterVolume(v) {
    this.volume = Math.max(0, Math.min(v, 1));
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
    }
  }

  setMute(muted) {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.1);
    }
  }

  isMuted() { return this.muted; }

  dispose() {
    this.stopMusic();
    if (this.engineOsc) {
      this.engineOsc.stop();
      this.engineOsc.disconnect();
    }
    if (this.skidSource) {
      this.skidSource.stop();
      this.skidSource.disconnect();
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
