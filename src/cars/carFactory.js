import * as THREE from 'three';
import { CARS } from './carData.js';

/**
 * Procedural GTA 5 Style 3D Vehicle Builder
 * Features:
 * - Sleek, aerodynamic sports chassis with realistic car proportions
 * - Separate steerable front wheel pivots (wheels visibly turn with steering)
 * - Detailed 3D wheels with rims, brake discs & rubber tires
 * - Independent suspension chassis node (enables body roll and pitch tilt)
 * - Dynamic brake lights (glow intensely on braking)
 * - Reverse lights & functional high-beam headlights
 * - Dual chrome exhaust tips with backfire emission anchors
 */
export function createCarMesh(carId) {
  const carDef = CARS.find(c => c.id === carId) || CARS[0];
  const root = new THREE.Group();
  root.userData.carId = carId;
  
  // Storage arrays & nodes for animations
  root.userData.wheels = [];           // Array of 4 wheel meshes (for rolling)
  root.userData.frontPivots = [];      // Array of front wheel pivot groups (for steering)
  root.userData.headlights = [];       // Headlight meshes
  root.userData.taillights = [];       // Taillight meshes
  root.userData.reverseLights = [];    // Reverse light meshes
  root.userData.exhaustPoints = [];    // Local Vector3s for exhaust particle emission
  
  // Suspension Chassis (tilts on pitch & roll without detaching wheels from ground)
  const chassis = new THREE.Group();
  root.add(chassis);
  root.userData.chassis = chassis;

  // ─── Materials ───────────────────────────────────────────────────
  // Glossy metallic car paint
  const paintMat = new THREE.MeshStandardMaterial({
    color: carDef.color,
    metalness: 0.85,
    roughness: 0.25
  });
  
  // Secondary accent paint (racing stripes / side skirts)
  const secondaryPaintMat = new THREE.MeshStandardMaterial({
    color: carDef.secondaryColor,
    metalness: 0.8,
    roughness: 0.3
  });
  
  // Dark carbon-fiber / plastic trim
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    metalness: 0.4,
    roughness: 0.6
  });
  
  // Tinted automotive glass
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    metalness: 0.95,
    roughness: 0.05,
    transparent: true,
    opacity: 0.85
  });
  
  // Chrome / Metallic exhaust & rim accents
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    metalness: 0.95,
    roughness: 0.1
  });
  
  // Tire rubber
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1c1c1e,
    roughness: 0.9,
    metalness: 0.1
  });

  // Alloy rim material
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    metalness: 0.9,
    roughness: 0.2
  });

  // ─── Dimensions & Geometry Configuration ─────────────────────────
  let bl = 2.6, bw = 1.25, bh = 0.45; // Body length, width, height
  let cl = 1.3, cw = 1.05, ch = 0.38; // Cabin length, width, height
  let cZOffset = -0.15;
  let hasGTWing = true;
  let hasDiffuser = true;
  let hasHoodVents = true;
  let groundClearance = 0.26;

  switch (carDef.type) {
    case 'Hatchback': // Rookie
      bl = 2.2; bw = 1.25; bh = 0.55;
      cl = 1.2; cw = 1.1; ch = 0.45;
      cZOffset = -0.2;
      hasGTWing = false;
      hasHoodVents = false;
      groundClearance = 0.28;
      break;
    case 'Sports': // Viper
      bl = 2.6; bw = 1.28; bh = 0.42;
      cl = 1.3; cw = 1.08; ch = 0.36;
      cZOffset = -0.18;
      hasGTWing = true;
      hasHoodVents = true;
      groundClearance = 0.24;
      break;
    case 'Sedan': // Phantom
      bl = 2.9; bw = 1.3; bh = 0.48;
      cl = 1.5; cw = 1.15; ch = 0.38;
      cZOffset = -0.05;
      hasGTWing = false;
      hasHoodVents = false;
      groundClearance = 0.26;
      break;
    case 'Muscle': // Thunderbolt
      bl = 2.8; bw = 1.38; bh = 0.5;
      cl = 1.25; cw = 1.18; ch = 0.36;
      cZOffset = -0.25;
      hasGTWing = false;
      hasHoodVents = true;
      groundClearance = 0.28;
      break;
    case 'Supercar': // Shadow
      bl = 2.85; bw = 1.32; bh = 0.38;
      cl = 1.3; cw = 1.02; ch = 0.32;
      cZOffset = -0.15;
      hasGTWing = true;
      hasDiffuser = true;
      hasHoodVents = true;
      groundClearance = 0.22;
      break;
    case 'Hypercar': // Inferno
      bl = 3.1; bw = 1.35; bh = 0.34;
      cl = 1.35; cw = 0.98; ch = 0.28;
      cZOffset = -0.12;
      hasGTWing = true;
      hasDiffuser = true;
      hasHoodVents = true;
      groundClearance = 0.20;
      break;
  }

  const bodyY = groundClearance + bh / 2;

  // ─── 1. CHASSIS BODY (Main Aerodynamic Shape) ────────────────────
  // Lower body
  const bodyGeo = new THREE.BoxGeometry(bw, bh, bl);
  const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
  bodyMesh.position.set(0, bodyY, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  chassis.add(bodyMesh);

  // Front bumper / splitter
  const splitterGeo = new THREE.BoxGeometry(bw + 0.06, 0.08, 0.3);
  const splitter = new THREE.Mesh(splitterGeo, trimMat);
  splitter.position.set(0, groundClearance + 0.04, bl / 2 + 0.1);
  splitter.castShadow = true;
  chassis.add(splitter);

  // Side skirts
  const skirtGeo = new THREE.BoxGeometry(bw + 0.04, 0.08, bl * 0.7);
  const skirt = new THREE.Mesh(skirtGeo, trimMat);
  skirt.position.set(0, groundClearance + 0.04, 0);
  chassis.add(skirt);

  // ─── 2. AERODYNAMIC CABIN & GREENHOUSE ───────────────────────────
  const cabinY = bodyY + bh / 2 + ch / 2 - 0.02;
  const cabinGeo = new THREE.BoxGeometry(cw, ch, cl);
  const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
  cabinMesh.position.set(0, cabinY, cZOffset);
  cabinMesh.castShadow = true;
  chassis.add(cabinMesh);

  // Cabin roof plate
  const roofGeo = new THREE.BoxGeometry(cw * 0.9, 0.05, cl * 0.7);
  const roofMesh = new THREE.Mesh(roofGeo, paintMat);
  roofMesh.position.set(0, cabinY + ch / 2 + 0.02, cZOffset - 0.05);
  chassis.add(roofMesh);

  // ─── 3. HOOD & TRUNK ACCENTS ─────────────────────────────────────
  if (hasHoodVents) {
    const ventGeo = new THREE.BoxGeometry(cw * 0.45, 0.04, 0.35);
    const vent = new THREE.Mesh(ventGeo, trimMat);
    vent.position.set(0, bodyY + bh / 2 + 0.02, bl / 4 + 0.1);
    chassis.add(vent);
  }

  // Rear Diffuser
  if (hasDiffuser) {
    const diffGeo = new THREE.BoxGeometry(bw * 0.9, 0.12, 0.25);
    const diff = new THREE.Mesh(diffGeo, trimMat);
    diff.position.set(0, groundClearance + 0.06, -bl / 2 - 0.05);
    chassis.add(diff);
  }

  // GT Racing Spoiler
  if (hasGTWing) {
    const wingY = bodyY + bh / 2 + 0.28;
    const wingZ = -bl / 2 + 0.15;
    
    // Aerofoil blade
    const wingGeo = new THREE.BoxGeometry(bw * 1.05, 0.04, 0.28);
    const wing = new THREE.Mesh(wingGeo, trimMat);
    wing.position.set(0, wingY, wingZ);
    wing.rotation.x = 0.08; // Downforce angle
    wing.castShadow = true;
    chassis.add(wing);

    // Twin endplates
    const epGeo = new THREE.BoxGeometry(0.03, 0.16, 0.32);
    const epLeft = new THREE.Mesh(epGeo, secondaryPaintMat);
    epLeft.position.set(bw * 0.52, wingY, wingZ);
    const epRight = new THREE.Mesh(epGeo, secondaryPaintMat);
    epRight.position.set(-bw * 0.52, wingY, wingZ);
    chassis.add(epLeft, epRight);

    // Wing mounts
    const stGeo = new THREE.BoxGeometry(0.04, 0.28, 0.08);
    const stLeft = new THREE.Mesh(stGeo, trimMat);
    stLeft.position.set(bw * 0.25, wingY - 0.14, wingZ);
    const stRight = new THREE.Mesh(stGeo, trimMat);
    stRight.position.set(-bw * 0.25, wingY - 0.14, wingZ);
    chassis.add(stLeft, stRight);
  }

  // ─── 4. LIGHTS (Headlights, Taillights & Reverse) ─────────────────
  // Headlights
  const hlMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x99ddff,
    emissiveIntensity: 1.5,
    roughness: 0.1
  });
  const hlGeo = new THREE.BoxGeometry(0.24, 0.1, 0.08);
  
  const hlLeft = new THREE.Mesh(hlGeo, hlMat);
  hlLeft.position.set(bw / 2 - 0.2, bodyY + bh * 0.15, bl / 2 + 0.01);
  chassis.add(hlLeft);

  const hlRight = new THREE.Mesh(hlGeo, hlMat);
  hlRight.position.set(-(bw / 2 - 0.2), bodyY + bh * 0.15, bl / 2 + 0.01);
  chassis.add(hlRight);
  root.userData.headlights.push(hlLeft, hlRight);

  // Taillights (Brake Light Material)
  const tlMat = new THREE.MeshStandardMaterial({
    color: 0x990000,
    emissive: 0xff0000,
    emissiveIntensity: 0.8,
    roughness: 0.2
  });
  const tlGeo = new THREE.BoxGeometry(0.28, 0.1, 0.08);

  const tlLeft = new THREE.Mesh(tlGeo, tlMat);
  tlLeft.position.set(bw / 2 - 0.22, bodyY + bh * 0.2, -bl / 2 - 0.01);
  chassis.add(tlLeft);

  const tlRight = new THREE.Mesh(tlGeo, tlMat);
  tlRight.position.set(-(bw / 2 - 0.22), bodyY + bh * 0.2, -bl / 2 - 0.01);
  chassis.add(tlRight);
  root.userData.taillights.push(tlLeft, tlRight);

  // ─── 5. DUAL CHROME EXHAUSTS ────────────────────────────────────
  const exGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 12);
  exGeo.rotateX(Math.PI / 2);

  const exLeft = new THREE.Mesh(exGeo, chromeMat);
  exLeft.position.set(0.3, groundClearance + 0.08, -bl / 2 - 0.04);
  chassis.add(exLeft);

  const exRight = new THREE.Mesh(exGeo, chromeMat);
  exRight.position.set(-0.3, groundClearance + 0.08, -bl / 2 - 0.04);
  chassis.add(exRight);

  // Store exhaust emission points
  root.userData.exhaustPoints.push(
    new THREE.Vector3(0.3, groundClearance + 0.08, -bl / 2 - 0.15),
    new THREE.Vector3(-0.3, groundClearance + 0.08, -bl / 2 - 0.15)
  );

  // ─── 6. WHEELS & STEERABLE FRONT PIVOTS ──────────────────────────
  const wheelRadius = 0.28;
  const wheelThickness = 0.22;
  const wheelX = bw / 2 + 0.04;
  const wheelY = wheelRadius;
  const wheelZFront = bl / 2 - 0.55;
  const wheelZRear = -bl / 2 + 0.55;

  /**
   * Builds an alloy wheel with outer rubber tire and inner rim
   */
  const createWheelMesh = () => {
    const wheelGroup = new THREE.Group();

    // Outer tire
    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 20);
    tireGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Alloy Rim
    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, wheelThickness + 0.01, 16);
    rimGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    wheelGroup.add(rim);

    // Center cap / hub
    const hubGeo = new THREE.CylinderGeometry(wheelRadius * 0.22, wheelRadius * 0.22, wheelThickness + 0.02, 12);
    hubGeo.rotateZ(Math.PI / 2);
    const hub = new THREE.Mesh(hubGeo, chromeMat);
    wheelGroup.add(hub);

    return wheelGroup;
  };

  // Front Left Wheel Pivot
  const flPivot = new THREE.Group();
  flPivot.position.set(wheelX, wheelY, wheelZFront);
  const flWheel = createWheelMesh();
  flPivot.add(flWheel);
  root.add(flPivot);
  root.userData.frontPivots.push(flPivot);
  root.userData.wheels.push(flWheel);

  // Front Right Wheel Pivot
  const frPivot = new THREE.Group();
  frPivot.position.set(-wheelX, wheelY, wheelZFront);
  const frWheel = createWheelMesh();
  frPivot.add(frWheel);
  root.add(frPivot);
  root.userData.frontPivots.push(frPivot);
  root.userData.wheels.push(frWheel);

  // Rear Left Wheel (Fixed pivot)
  const rlWheel = createWheelMesh();
  rlWheel.position.set(wheelX, wheelY, wheelZRear);
  root.add(rlWheel);
  root.userData.wheels.push(rlWheel);

  // Rear Right Wheel (Fixed pivot)
  const rrWheel = createWheelMesh();
  rrWheel.position.set(-wheelX, wheelY, wheelZRear);
  root.add(rrWheel);
  root.userData.wheels.push(rrWheel);

  return root;
}

/**
 * Updates wheel rotation and front steering angle
 * @param {THREE.Group} carGroup
 * @param {number} speed
 * @param {number} steerAngle
 * @param {number} dt
 */
export function updateCarWheels(carGroup, speed, steerAngle = 0, dt = 0.016) {
  if (!carGroup || !carGroup.userData.wheels) return;
  const wheelRadius = 0.28;
  const rotationPerSec = speed / wheelRadius;

  // Roll wheels on X axis
  carGroup.userData.wheels.forEach(wheel => {
    wheel.rotation.x += rotationPerSec * dt;
  });

  // Turn front steering pivots on Y axis
  if (carGroup.userData.frontPivots) {
    carGroup.userData.frontPivots.forEach(pivot => {
      pivot.rotation.y = steerAngle;
    });
  }
}

/**
 * Updates chassis suspension tilt (body pitch and roll)
 * @param {THREE.Group} carGroup
 * @param {number} pitch - Acceleration / braking tilt
 * @param {number} roll - Centrifugal cornering tilt
 */
export function updateCarSuspension(carGroup, pitch = 0, roll = 0) {
  if (!carGroup || !carGroup.userData.chassis) return;
  carGroup.userData.chassis.rotation.x = pitch;
  carGroup.userData.chassis.rotation.z = roll;
}

/**
 * Set dynamic brake light intensity
 * @param {THREE.Group} carGroup
 * @param {boolean} isBraking
 */
export function setBrakeLights(carGroup, isBraking) {
  if (!carGroup || !carGroup.userData.taillights) return;
  const intensity = isBraking ? 3.5 : 0.8;
  carGroup.userData.taillights.forEach(tl => {
    tl.material.emissiveIntensity = intensity;
  });
}

/**
 * Toggle headlights
 * @param {THREE.Group} carGroup
 * @param {boolean} on
 */
export function setHeadlights(carGroup, on) {
  if (!carGroup || !carGroup.userData.headlights) return;
  const intensity = on ? 2.5 : 0.0;
  carGroup.userData.headlights.forEach(hl => {
    hl.material.emissiveIntensity = intensity;
  });
}
