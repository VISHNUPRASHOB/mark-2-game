import * as THREE from 'three';
import { clamp, lerp } from './utils/math.js';

/**
 * GameRenderer & Steady GTA 5 Third-Person Camera System
 * Features:
 * - Rock-solid third-person chase camera positioned firmly behind vehicle
 * - Clear, un-distorted view over the car roof showing 200+ meters of road ahead
 * - Instant camera reset on race start (no transition snapping or disorienting angles)
 * - Fixed, comfortable FOV with crisp rendering
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
    
    const pixelRatio = window.devicePixelRatio ? Math.min(window.devicePixelRatio, 2) : 1;
    this.renderer.setPixelRatio(this.mobile ? Math.min(pixelRatio, 1.5) : pixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    
    // Enable shadows on desktop
    if (!this.mobile) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    container.appendChild(this.renderer.domElement);
    
    // Create Scene
    this.scene = new THREE.Scene();
    
    // Fixed Comfortable FOV (65 degrees for clear natural perspective)
    this.baseFOV = 65;
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(this.baseFOV, aspect, 0.1, 1500);
    
    // Resize handler
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    
    // Camera State
    this.cameraPosition = new THREE.Vector3();
    this.lookTarget = new THREE.Vector3();
    this.cameraInitialized = false;
  }
  
  /**
   * Instantly snap camera behind the car (called when race starts or resets)
   * @param {THREE.Vector3} targetPos
   * @param {number} carHeading
   */
  resetChaseCamera(targetPos, carHeading) {
    const dist = 8.5;
    const height = 3.6;
    
    const posX = targetPos.x - Math.sin(carHeading) * dist;
    const posY = targetPos.y + height;
    const posZ = targetPos.z - Math.cos(carHeading) * dist;
    
    this.cameraPosition.set(posX, posY, posZ);
    this.camera.position.copy(this.cameraPosition);
    
    const lookX = targetPos.x + Math.sin(carHeading) * 12.0;
    const lookY = targetPos.y + 1.2;
    const lookZ = targetPos.z + Math.cos(carHeading) * 12.0;
    
    this.lookTarget.set(lookX, lookY, lookZ);
    this.camera.lookAt(this.lookTarget);
    this.cameraInitialized = true;
  }
  
  /**
   * Updates steady GTA 5 style third-person chase camera
   * @param {THREE.Vector3} targetPos - Car position
   * @param {number} carHeading - Car Y rotation
   * @param {number} speed - Current speed
   * @param {number} dt - Delta time
   */
  updateChaseCamera(targetPos, carHeading, speed = 0, dt = 0.016) {
    // Standard GTA 5 chase camera dimensions
    const dist = 8.5;
    const height = 3.6;
    
    // Calculate ideal camera position directly behind vehicle
    const idealX = targetPos.x - Math.sin(carHeading) * dist;
    const idealY = targetPos.y + height;
    const idealZ = targetPos.z - Math.cos(carHeading) * dist;
    const idealPos = new THREE.Vector3(idealX, idealY, idealZ);
    
    // Calculate target look-at point ahead on the road
    const lookAheadDist = 12.0;
    const targetLookX = targetPos.x + Math.sin(carHeading) * lookAheadDist;
    const targetLookY = targetPos.y + 1.2;
    const targetLookZ = targetPos.z + Math.cos(carHeading) * lookAheadDist;
    const idealLook = new THREE.Vector3(targetLookX, targetLookY, targetLookZ);
    
    if (!this.cameraInitialized || this.cameraPosition.lengthSq() === 0) {
      this.resetChaseCamera(targetPos, carHeading);
      return;
    }
    
    // Smooth, firm follow tracking (stable and never disorienting)
    const followFactor = 1 - Math.exp(-9.0 * dt);
    this.cameraPosition.lerp(idealPos, followFactor);
    this.lookTarget.lerp(idealLook, 1 - Math.exp(-12.0 * dt));
    
    this.camera.position.copy(this.cameraPosition);
    this.camera.lookAt(this.lookTarget);
  }
  
  /**
   * Set up camera for menu view (orbit around vehicle)
   * @param {THREE.Vector3} center
   * @param {number} time
   */
  updateMenuCamera(center, time) {
    const radius = 13;
    const height = 5.5;
    
    this.camera.position.x = center.x + Math.cos(time * 0.25) * radius;
    this.camera.position.y = center.y + height;
    this.camera.position.z = center.z + Math.sin(time * 0.25) * radius;
    
    this.camera.lookAt(center.x, center.y + 0.6, center.z);
    this.cameraInitialized = false; // Flag to reset chase cam when entering race
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
