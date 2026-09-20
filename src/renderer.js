import * as THREE from 'three';
import { clamp, lerp } from './utils/math.js';

/**
 * GameRenderer & GTA 5 Dynamic Chase Camera System
 * Features:
 * - GTA 5 dynamic third-person chase camera with elastic spring-damper tracking
 * - Speed-sensitive Dynamic Field of View (FOV zooms out at high speeds for speed rush)
 * - Lateral drift sway (camera pans dynamically during power-slides)
 * - Procedural impact & speed screen shake
 */
export class GameRenderer {
  /**
   * @param {HTMLElement} container - The #game-container element
   */
  constructor(container) {
    this.container = container;
    
    // Detect mobile device
    this.mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Create WebGLRenderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.mobile,
      powerPreference: "high-performance"
    });
    
    // Set pixel ratio
    const pixelRatio = window.devicePixelRatio ? Math.min(window.devicePixelRatio, 2) : 1;
    this.renderer.setPixelRatio(this.mobile ? Math.min(pixelRatio, 1.5) : pixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    
    // Enable soft shadows on desktop
    if (!this.mobile) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    // Tone mapping and color space
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    container.appendChild(this.renderer.domElement);
    
    // Create Scene
    this.scene = new THREE.Scene();
    
    // Create Camera (Default base FOV: 62)
    this.baseFOV = 62;
    this.currentFOV = 62;
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(this.baseFOV, aspect, 0.1, 1000);
    
    // Resize handler
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    
    // GTA 5 Chase Camera State
    this.cameraPosition = new THREE.Vector3();
    this.lookTarget = new THREE.Vector3();
    this.shakeIntensity = 0;
  }
  
  /**
   * Trigger screen shake
   * @param {number} intensity - Shake strength
   */
  triggerShake(intensity = 0.5) {
    this.shakeIntensity = Math.min(1.5, this.shakeIntensity + intensity);
  }
  
  /**
   * Updates GTA 5 style chase camera
   * @param {THREE.Vector3} targetPos - Car position
   * @param {number} carHeading - Car Y rotation
   * @param {number} speed - Current speed
   * @param {number} topSpeed - Car top speed
   * @param {number} driftAngle - Current drift angle
   * @param {number} dt - Delta time
   */
  updateChaseCamera(targetPos, carHeading, speed, topSpeed = 150, driftAngle = 0, dt = 0.016) {
    const speedFraction = clamp(speed / (topSpeed || 150), 0, 1.2);
    
    // 1. Dynamic FOV (GTA 5 warp effect at high speeds: 62 -> 78 degrees)
    const targetFOV = this.baseFOV + (speedFraction * 16);
    this.currentFOV = lerp(this.currentFOV, targetFOV, 1 - Math.exp(-6.0 * dt));
    if (Math.abs(this.camera.fov - this.currentFOV) > 0.1) {
      this.camera.fov = this.currentFOV;
      this.camera.updateProjectionMatrix();
    }
    
    // 2. Camera Placement Dimensions
    // Sits ~7.2m behind, ~3.0m above, pulls back slightly at max speed
    const baseDist = 7.0 + (speedFraction * 2.0);
    const baseHeight = 3.0 + (speedFraction * 0.8);
    
    // Camera angle blends with drift angle (sways outward during power-slides)
    const cameraHeading = carHeading + (driftAngle * 0.45);
    
    const idealX = targetPos.x - Math.sin(cameraHeading) * baseDist;
    const idealY = targetPos.y + baseHeight;
    const idealZ = targetPos.z - Math.cos(cameraHeading) * baseDist;
    const idealPos = new THREE.Vector3(idealX, idealY, idealZ);
    
    // 3. Elastic Spring-Damper Follow
    if (this.cameraPosition.lengthSq() === 0) {
      this.cameraPosition.copy(idealPos);
    } else {
      const followSpeed = 6.5; // Fast responsive lag
      this.cameraPosition.lerp(idealPos, 1 - Math.exp(-followSpeed * dt));
    }
    
    // 4. Look-At Target (ahead of vehicle)
    const lookAheadDist = 6.0 + (speedFraction * 4.0);
    const targetLookX = targetPos.x + Math.sin(carHeading) * lookAheadDist;
    const targetLookY = targetPos.y + 0.8;
    const targetLookZ = targetPos.z + Math.cos(carHeading) * lookAheadDist;
    const idealLook = new THREE.Vector3(targetLookX, targetLookY, targetLookZ);
    
    if (this.lookTarget.lengthSq() === 0) {
      this.lookTarget.copy(idealLook);
    } else {
      this.lookTarget.lerp(idealLook, 1 - Math.exp(-8.0 * dt));
    }
    
    // 5. Screen Shake / High-Speed Rumble
    let shakeX = 0, shakeY = 0, shakeZ = 0;
    if (this.shakeIntensity > 0.01) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
      shakeZ = (Math.random() - 0.5) * this.shakeIntensity * 0.4;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.5);
    } else if (speedFraction > 0.85) {
      // Subtle high-speed rumble
      const rumble = (speedFraction - 0.85) * 0.04;
      shakeX = (Math.random() - 0.5) * rumble;
      shakeY = (Math.random() - 0.5) * rumble;
    }
    
    this.camera.position.set(
      this.cameraPosition.x + shakeX,
      this.cameraPosition.y + shakeY,
      this.cameraPosition.z + shakeZ
    );
    
    this.camera.lookAt(
      this.lookTarget.x + shakeX * 0.5,
      this.lookTarget.y + shakeY * 0.5,
      this.lookTarget.z + shakeZ * 0.5
    );
  }
  
  /**
   * Set up camera for menu view (orbit around a point)
   * @param {THREE.Vector3} center
   * @param {number} time - Orbiting animation time
   */
  updateMenuCamera(center, time) {
    const radius = 14;
    const height = 6;
    
    this.camera.position.x = center.x + Math.cos(time * 0.25) * radius;
    this.camera.position.y = center.y + height;
    this.camera.position.z = center.z + Math.sin(time * 0.25) * radius;
    
    this.camera.lookAt(center.x, center.y + 0.5, center.z);
  }
  
  /** @returns {THREE.WebGLRenderer} */
  getRenderer() { return this.renderer; }
  
  /** @returns {THREE.PerspectiveCamera} */
  getCamera() { return this.camera; }
  
  /** @returns {THREE.Scene} */
  getScene() { return this.scene; }
  
  /** @returns {HTMLCanvasElement} */
  getCanvas() { return this.renderer.domElement; }
  
  /** @returns {boolean} */
  isMobile() { return this.mobile; }
  
  /** Force resize update */
  resize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  /** Dispose all resources */
  dispose() {
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
