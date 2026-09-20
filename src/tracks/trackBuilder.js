import * as THREE from 'three';

/**
 * Creates procedural high-visibility road texture with center dashed lines and edge boundaries
 * @param {string} themeId - 'city', 'desert', 'neon'
 * @returns {THREE.CanvasTexture}
 */
function createRoadTexture(themeId) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // 1. Dark asphalt background
  if (themeId === 'neon') {
    ctx.fillStyle = '#0a0d18';
  } else if (themeId === 'desert') {
    ctx.fillStyle = '#2d2822';
  } else {
    ctx.fillStyle = '#1c1f26';
  }
  ctx.fillRect(0, 0, 512, 1024);

  // Subtle asphalt grain
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let i = 0; i < 2000; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 1024;
    ctx.fillRect(rx, ry, 2, 2);
  }

  // 2. Solid White/Yellow Road Outer Edge Boundaries
  const edgeColor = themeId === 'neon' ? '#00ffff' : '#ffffff';
  ctx.fillStyle = edgeColor;
  ctx.shadowColor = edgeColor;
  ctx.shadowBlur = themeId === 'neon' ? 8 : 0;
  
  // Left solid line
  ctx.fillRect(20, 0, 14, 1024);
  // Right solid line
  ctx.fillRect(512 - 34, 0, 14, 1024);

  // 3. Bright Dashed Center Line
  const centerColor = themeId === 'neon' ? '#ff00ff' : (themeId === 'desert' ? '#ffdd00' : '#ffffff');
  ctx.fillStyle = centerColor;
  ctx.shadowColor = centerColor;
  ctx.shadowBlur = themeId === 'neon' ? 10 : 0;

  const dashHeight = 120;
  const gapHeight = 100;
  for (let y = 0; y < 1024; y += dashHeight + gapHeight) {
    ctx.fillRect(248, y, 16, dashHeight);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

/**
 * Creates striped racing curb texture (Red/White or Neon)
 * @param {string} themeId
 * @returns {THREE.CanvasTexture}
 */
function createCurbTexture(themeId) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const stripeH = 64;
  for (let y = 0; y < 512; y += stripeH * 2) {
    // Primary Stripe
    ctx.fillStyle = themeId === 'neon' ? '#ff007f' : '#dc2626';
    ctx.fillRect(0, y, 128, stripeH);

    // Secondary Stripe
    ctx.fillStyle = themeId === 'neon' ? '#00ffff' : '#f8fafc';
    ctx.fillRect(0, y + stripeH, 128, stripeH);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Builds high-visibility 3D track geometry with markings, barriers, start gantry and turn arrows
 * @param {object} levelData - Level definition from trackData.js
 */
export function buildTrack(levelData) {
  const trackGroup = new THREE.Group();
  
  // 1. Create Smooth Spline Curve
  const points = levelData.controlPoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  
  const trackWidth = levelData.trackWidth || 15;
  const wallHeight = levelData.wallHeight || 1.8;
  const segments = 600;
  const trackLength = curve.getLength();

  // 2. Textures & Materials
  const roadTex = createRoadTexture(levelData.id);
  const vRepeat = Math.round(trackLength / 18);
  roadTex.repeat.set(1, vRepeat);

  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.6,
    metalness: 0.1
  });

  const curbTex = createCurbTexture(levelData.id);
  curbTex.repeat.set(1, Math.round(trackLength / 12));

  const barrierMat = new THREE.MeshStandardMaterial({
    map: curbTex,
    roughness: 0.4,
    metalness: 0.2,
    emissive: levelData.id === 'neon' ? 0x220033 : 0x000000
  });

  // 3. Track Ribbon & Barrier Mesh Construction
  const roadGeo = new THREE.BufferGeometry();
  const leftWallGeo = new THREE.BufferGeometry();
  const rightWallGeo = new THREE.BufferGeometry();
  
  const roadVertices = [];
  const roadUvs = [];
  const roadIndices = [];
  
  const leftWallVertices = [];
  const leftWallUvs = [];
  const leftWallIndices = [];
  
  const rightWallVertices = [];
  const rightWallUvs = [];
  const rightWallIndices = [];

  const frenetFrames = curve.computeFrenetFrames(segments, true);
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = curve.getPointAt(t);
    const right = frenetFrames.binormals[i % segments].clone().multiplyScalar(trackWidth / 2);
    
    const pLeft = pt.clone().sub(right);
    const pRight = pt.clone().add(right);
    
    // Road surface
    roadVertices.push(pLeft.x, pLeft.y + 0.05, pLeft.z);
    roadVertices.push(pRight.x, pRight.y + 0.05, pRight.z);
    
    roadUvs.push(0, t);
    roadUvs.push(1, t);
    
    // Barrier walls
    const wallThick = 0.45;
    const pLeftOuter = pLeft.clone().sub(frenetFrames.binormals[i % segments].clone().multiplyScalar(wallThick));
    const pRightOuter = pRight.clone().add(frenetFrames.binormals[i % segments].clone().multiplyScalar(wallThick));
    
    leftWallVertices.push(pLeft.x, pLeft.y, pLeft.z);
    leftWallVertices.push(pLeftOuter.x, pLeftOuter.y, pLeftOuter.z);
    leftWallVertices.push(pLeft.x, pLeft.y + wallHeight, pLeft.z);
    leftWallVertices.push(pLeftOuter.x, pLeftOuter.y + wallHeight, pLeftOuter.z);
    
    leftWallUvs.push(0, t, 1, t, 0, t, 1, t);

    rightWallVertices.push(pRight.x, pRight.y, pRight.z);
    rightWallVertices.push(pRightOuter.x, pRightOuter.y, pRightOuter.z);
    rightWallVertices.push(pRight.x, pRight.y + wallHeight, pRight.z);
    rightWallVertices.push(pRightOuter.x, pRightOuter.y + wallHeight, pRightOuter.z);

    rightWallUvs.push(0, t, 1, t, 0, t, 1, t);
    
    if (i < segments) {
      const row1 = i * 2;
      const row2 = (i + 1) * 2;
      roadIndices.push(row1, row1 + 1, row2);
      roadIndices.push(row2, row1 + 1, row2 + 1);
      
      const wRow1 = i * 4;
      const wRow2 = (i + 1) * 4;
      
      // Left Wall indices
      leftWallIndices.push(wRow1, wRow2, wRow1 + 2);
      leftWallIndices.push(wRow2, wRow2 + 2, wRow1 + 2);
      leftWallIndices.push(wRow1 + 2, wRow2 + 2, wRow1 + 3);
      leftWallIndices.push(wRow2 + 2, wRow2 + 3, wRow1 + 3);
      
      // Right Wall indices
      rightWallIndices.push(wRow1, wRow1 + 2, wRow2);
      rightWallIndices.push(wRow2, wRow1 + 2, wRow2 + 2);
      rightWallIndices.push(wRow1 + 2, wRow1 + 3, wRow2 + 2);
      rightWallIndices.push(wRow2 + 2, wRow1 + 3, wRow2 + 3);
    }
  }

  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  roadGeo.setIndex(roadIndices);
  roadGeo.computeVertexNormals();
  
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  trackGroup.add(roadMesh);

  leftWallGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftWallVertices, 3));
  leftWallGeo.setAttribute('uv', new THREE.Float32BufferAttribute(leftWallUvs, 2));
  leftWallGeo.setIndex(leftWallIndices);
  leftWallGeo.computeVertexNormals();
  const leftWallMesh = new THREE.Mesh(leftWallGeo, barrierMat);
  leftWallMesh.castShadow = true;
  leftWallMesh.receiveShadow = true;
  trackGroup.add(leftWallMesh);

  rightWallGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightWallVertices, 3));
  rightWallGeo.setAttribute('uv', new THREE.Float32BufferAttribute(rightWallUvs, 2));
  rightWallGeo.setIndex(rightWallIndices);
  rightWallGeo.computeVertexNormals();
  const rightWallMesh = new THREE.Mesh(rightWallGeo, barrierMat);
  rightWallMesh.castShadow = true;
  rightWallMesh.receiveShadow = true;
  trackGroup.add(rightWallMesh);

  // 4. Overhead Start / Finish Gantry Banner
  const startPos = curve.getPointAt(0);
  const startTangent = curve.getTangentAt(0);
  const startBinormal = frenetFrames.binormals[0];

  const gantryGroup = new THREE.Group();
  gantryGroup.position.copy(startPos);
  
  // Gantry Arch Pillars
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
  const pGeo = new THREE.BoxGeometry(0.8, 6.5, 0.8);
  
  const pLeft = new THREE.Mesh(pGeo, pillarMat);
  pLeft.position.copy(startBinormal.clone().multiplyScalar(-trackWidth / 2 - 0.5));
  pLeft.position.y = 3.25;
  
  const pRight = new THREE.Mesh(pGeo, pillarMat);
  pRight.position.copy(startBinormal.clone().multiplyScalar(trackWidth / 2 + 0.5));
  pRight.position.y = 3.25;
  
  // Overhead Crossbeam
  const beamGeo = new THREE.BoxGeometry(trackWidth + 2.5, 1.2, 0.8);
  const beamMat = new THREE.MeshStandardMaterial({
    color: levelData.id === 'neon' ? 0x00f0ff : 0x0284c7,
    emissive: levelData.id === 'neon' ? 0x00aaff : 0x002244,
    metalness: 0.7,
    roughness: 0.3
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = 6.0;
  
  // Orient gantry along track tangent
  gantryGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), startTangent);
  gantryGroup.add(pLeft, pRight, beam);
  trackGroup.add(gantryGroup);

  // 5. Turn Direction Chevron Arrow Boards on Bends
  for (let i = 0; i < segments; i += 40) {
    const t = i / segments;
    const tNext = (i + 15) / segments;
    const tan1 = curve.getTangentAt(t);
    const tan2 = curve.getTangentAt(tNext);
    const angleDiff = tan1.angleTo(tan2);

    // If curvature is significant, place a chevron indicator on outer barrier
    if (angleDiff > 0.15) {
      const pt = curve.getPointAt(t);
      const binorm = frenetFrames.binormals[i % segments];
      
      const arrowGeo = new THREE.BoxGeometry(2.5, 1.2, 0.2);
      const arrowMat = new THREE.MeshBasicMaterial({
        color: levelData.id === 'neon' ? 0x00ffff : 0xfacc15
      });
      const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
      
      // Position on outer wall
      arrowMesh.position.copy(pt).add(binorm.clone().multiplyScalar(trackWidth / 2 + 0.2));
      arrowMesh.position.y += wallHeight * 0.75;
      arrowMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan1);
      trackGroup.add(arrowMesh);
    }
  }

  // 6. Checkpoint Gates
  const checkpoints = [];
  const numCheckpoints = 12;
  for (let i = 0; i < numCheckpoints; i++) {
    const t = i / numCheckpoints;
    checkpoints.push({
      position: curve.getPointAt(t),
      tangent: curve.getTangentAt(t),
      index: i
    });
  }

  // Starting position in right-hand lane
  const offsetStartPos = startPos.clone().add(startBinormal.clone().multiplyScalar(trackWidth * 0.22));
  offsetStartPos.y += 0.4;

  return {
    trackGroup,
    curve,
    roadMesh,
    wallsLeft: leftWallMesh,
    wallsRight: rightWallMesh,
    checkpoints,
    startPosition: offsetStartPos,
    startDirection: startTangent,
    trackLength
  };
}

/**
 * Gets nearest point on track
 */
export function getTrackInfo(position, curve, trackWidth) {
  let closestT = 0;
  let minDist = Infinity;
  let closestPoint = null;
  
  const samples = 120;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const pt = curve.getPointAt(t);
    const dx = position.x - pt.x;
    const dz = position.z - pt.z;
    const dist = dx * dx + dz * dz;
    if (dist < minDist) {
      minDist = dist;
      closestT = t;
      closestPoint = pt;
    }
  }

  const distFromCenter = Math.sqrt(minDist);
  const tangent = curve.getTangentAt(closestT);
  const isOnTrack = distFromCenter <= (trackWidth / 2) + 2;

  return {
    t: closestT,
    centerPoint: closestPoint,
    distFromCenter,
    tangent,
    isOnTrack
  };
}
