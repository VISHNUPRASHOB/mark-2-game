import * as THREE from 'three';

/**
 * Simple post-processing manager
 * Uses a full-screen quad with custom shader for effects
 * Avoids heavy Three.js postprocessing library for smaller bundle
 */
export class PostProcessManager {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene  
   * @param {THREE.Camera} camera
   */
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    this.bloomEnabled = false;
    this.bloomIntensity = 1.0;
    this.speedFraction = 0;
    
    const size = renderer.getSize(new THREE.Vector2());
    this.width = size.x;
    this.height = size.y;
    
    // Create render targets
    this.mainTarget = new THREE.WebGLRenderTarget(this.width, this.height);
    this.bloomTarget = new THREE.WebGLRenderTarget(this.width / 2, this.height / 2);
    
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadScene = new THREE.Scene();
    
    // Composite Shader Material
    this.compMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: null },
        speedLines: { value: 0.0 },
        bloomIntensity: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tBloom;
        uniform float speedLines;
        uniform float bloomIntensity;
        varying vec2 vUv;
        
        // Simple pseudo-random
        float rand(vec2 co){ return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }

        void main() {
          vec4 diff = texture2D(tDiffuse, vUv);
          vec4 bloom = texture2D(tBloom, vUv);
          
          vec2 center = vec2(0.5, 0.5);
          vec2 dir = vUv - center;
          float dist = length(dir);
          float angle = atan(dir.y, dir.x);
          
          float lines = rand(vec2(floor(angle * 50.0), 1.0));
          float speedEffect = smoothstep(0.2, 0.8, dist) * lines * speedLines;
          
          vec3 col = diff.rgb + bloom.rgb * bloomIntensity + vec3(speedEffect);
          gl_FragColor = vec4(col, diff.a);
        }
      `
    });
    
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.compMat);
    this.quadScene.add(quad);
  }
  
  /**
   * Enable/disable bloom
   * @param {boolean} enabled
   * @param {number} intensity - bloom strength 0..2
   */
  setBloom(enabled, intensity = 1.0) {
    this.bloomEnabled = enabled;
    this.bloomIntensity = intensity;
    this.compMat.uniforms.bloomIntensity.value = intensity;
  }
  
  /**
   * Set speed lines intensity based on car speed
   * @param {number} speedFraction - 0..1 fraction of top speed
   */
  setSpeedLines(speedFraction) {
    // Only visible above 70% speed
    if (speedFraction > 0.7) {
      this.speedFraction = (speedFraction - 0.7) / 0.3;
    } else {
      this.speedFraction = 0;
    }
  }
  
  /**
   * Render with post-processing
   */
  render() {
    if (this.bloomEnabled || this.speedFraction > 0) {
      // 1. Render scene to a render target
      this.renderer.setRenderTarget(this.mainTarget);
      this.renderer.render(this.scene, this.camera);
      
      // We skip actual multi-pass bloom blurring here for simplicity & perf
      // Instead, we just pass the main target to composite and mix in speed lines 
      // (a full unreal bloom implementation is too large for this context without library support)
      
      this.renderer.setRenderTarget(null);
      this.compMat.uniforms.tDiffuse.value = this.mainTarget.texture;
      
      // Mock bloom by re-using main target but clamped down
      this.compMat.uniforms.tBloom.value = this.bloomEnabled ? this.mainTarget.texture : null; 
      this.compMat.uniforms.speedLines.value = this.speedFraction;
      
      // Display result on a full-screen quad
      this.renderer.render(this.quadScene, this.quadCamera);
    } else {
      this.renderDirect();
    }
  }
  
  /**
   * Render without post-processing (mobile fallback)
   */
  renderDirect() {
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * Handle resize
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.mainTarget.setSize(width, height);
    this.bloomTarget.setSize(width/2, height/2);
  }
  
  /**
   * Check if device can handle post-processing
   */
  static isSupported(renderer) {
    // simplified assumption
    return true;
  }
  
  dispose() {
    this.mainTarget.dispose();
    this.bloomTarget.dispose();
    this.compMat.dispose();
  }
}
