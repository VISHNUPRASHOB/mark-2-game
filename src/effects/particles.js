import * as THREE from 'three';

/**
 * GTA 5 Style Particle System
 * Features:
 * - Thick white/grey tire smoke during high-slip drifts and burnouts
 * - Blue/orange nitrous/backfire flame bursts from exhaust tips
 * - Shower of glowing sparks on guardrail contact
 * - Standard exhaust dissipation particles
 */
export class ParticleSystem {
  /**
   * @param {THREE.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    
    // Particle pools
    this.pools = {
      exhaust: { size: 150, life: 0.45, color: new THREE.Color(0x999999), sizeVal: 0.45, additive: true },
      tireSmoke: { size: 250, life: 0.85, color: new THREE.Color(0xdddddd), sizeVal: 1.2, additive: false },
      flame: { size: 60, life: 0.2, color: new THREE.Color(0x00ccff), sizeVal: 0.65, additive: true },
      sparks: { size: 100, life: 0.35, color: new THREE.Color(0xffaa22), sizeVal: 0.25, additive: true }
    };

    for (let key in this.pools) {
      let pool = this.pools[key];
      let geom = new THREE.BufferGeometry();
      let pos = new Float32Array(pool.size * 3);
      let vel = new Float32Array(pool.size * 3);
      let age = new Float32Array(pool.size);
      
      // Initialize offscreen
      for (let i = 0; i < pool.size * 3; i++) pos[i] = 99999;
      
      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      
      let mat = new THREE.PointsMaterial({
        size: pool.sizeVal,
        color: pool.color,
        transparent: true,
        opacity: pool.additive ? 0.9 : 0.4,
        depthWrite: false,
        blending: pool.additive ? THREE.AdditiveBlending : THREE.NormalBlending
      });
      
      let points = new THREE.Points(geom, mat);
      this.scene.add(points);
      
      pool.geom = geom;
      pool.pos = pos;
      pool.vel = vel;
      pool.age = age;
      pool.points = points;
      pool.nextIndex = 0;
    }
  }
  
  /**
   * Emits steady exhaust smoke
   */
  emitExhaust(pos, heading, speed) {
    if (speed < 3) return;
    this._emit('exhaust', pos, new THREE.Vector3(
      -Math.sin(heading) * 1.5 + (Math.random() - 0.5) * 0.4,
      0.3 + Math.random() * 0.3,
      -Math.cos(heading) * 1.5 + (Math.random() - 0.5) * 0.4
    ));
  }
  
  /**
   * Emits thick tire smoke during drifts, burnouts, and hard braking
   * @param {THREE.Vector3} pos - Wheel contact position
   * @param {number} slip - Tire slip amount (0 to 1)
   */
  emitTireSmoke(pos, slip = 0.8) {
    if (slip <= 0.1) return;
    const count = Math.ceil(slip * 3);
    for (let i = 0; i < count; i++) {
      this._emit('tireSmoke', pos, new THREE.Vector3(
        (Math.random() - 0.5) * 2.5 * slip,
        0.4 + Math.random() * 0.6 * slip,
        (Math.random() - 0.5) * 2.5 * slip
      ));
    }
  }
  
  /**
   * Emits backfire flame burst from exhaust
   * @param {THREE.Vector3} pos - Exhaust tip position
   * @param {number} heading - Car heading
   */
  emitFlame(pos, heading) {
    for (let i = 0; i < 3; i++) {
      this._emit('flame', pos, new THREE.Vector3(
        -Math.sin(heading) * (4 + Math.random() * 3),
        (Math.random() - 0.5) * 0.5,
        -Math.cos(heading) * (4 + Math.random() * 3)
      ));
    }
  }
  
  /**
   * Emits wall scrape spark shower
   */
  emitSparks(pos, normal) {
    for (let i = 0; i < 8; i++) {
      this._emit('sparks', pos, new THREE.Vector3(
        normal.x * 6 + (Math.random() - 0.5) * 4,
        normal.y * 3 + Math.random() * 4,
        normal.z * 6 + (Math.random() - 0.5) * 4
      ));
    }
  }

  _emit(type, pos, vel) {
    let pool = this.pools[type];
    let i = pool.nextIndex;
    pool.pos[i * 3] = pos.x;
    pool.pos[i * 3 + 1] = pos.y;
    pool.pos[i * 3 + 2] = pos.z;
    pool.vel[i * 3] = vel.x;
    pool.vel[i * 3 + 1] = vel.y;
    pool.vel[i * 3 + 2] = vel.z;
    pool.age[i] = pool.life;
    pool.nextIndex = (pool.nextIndex + 1) % pool.size;
  }
  
  /**
   * Update particle positions and lifecycles
   */
  update(dt) {
    for (let key in this.pools) {
      let pool = this.pools[key];
      let needsUpdate = false;
      for (let i = 0; i < pool.size; i++) {
        if (pool.age[i] > 0) {
          pool.age[i] -= dt;
          if (pool.age[i] <= 0) {
            pool.pos[i * 3] = 99999;
          } else {
            // Apply physics
            if (key === 'sparks') {
              pool.vel[i * 3 + 1] -= 9.8 * dt; // Gravity
            } else if (key === 'tireSmoke') {
              pool.vel[i * 3 + 1] += 0.5 * dt; // Smoke rises and slows down
              pool.vel[i * 3] *= (1 - dt * 2.0);
              pool.vel[i * 3 + 2] *= (1 - dt * 2.0);
            }
            
            pool.pos[i * 3] += pool.vel[i * 3] * dt;
            pool.pos[i * 3 + 1] += pool.vel[i * 3 + 1] * dt;
            pool.pos[i * 3 + 2] += pool.vel[i * 3 + 2] * dt;
          }
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        pool.geom.attributes.position.needsUpdate = true;
      }
    }
  }
  
  dispose() {
    for (let key in this.pools) {
      this.pools[key].geom.dispose();
      this.pools[key].points.material.dispose();
      this.scene.remove(this.pools[key].points);
    }
  }
}
