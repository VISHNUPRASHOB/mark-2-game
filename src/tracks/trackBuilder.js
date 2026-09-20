import * as THREE from 'three';

/**
 * Builds the complete track mesh from level data
 * @param {object} levelData - Level definition from trackData.js
 * @returns {object} Track data and meshes
 */
export function buildTrack(levelData) {
  const trackGroup = new THREE.Group();
  
  // Create Curve
  const points = levelData.controlPoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  
  const trackWidth = levelData.trackWidth;
  const wallHeight = levelData.wallHeight;
  const segments = 500;
  
  // Materials
  const roadMat = new THREE.MeshStandardMaterial({
    color: levelData.theme.road,
    roughness: 0.8,
    metalness: 0.1
  });
  
  const curbMat = new THREE.MeshStandardMaterial({
    color: levelData.theme.curb,
    roughness: 0.6,
    metalness: 0.1
  });

  // Generate track geometry
  const roadGeo = new THREE.BufferGeometry();
  const leftWallGeo = new THREE.BufferGeometry();
  const rightWallGeo = new THREE.BufferGeometry();
  
  const roadVertices = [];
  const roadUvs = [];
  const roadIndices = [];
  
  const leftWallVertices = [];
  const leftWallIndices = [];
  const rightWallVertices = [];
  const rightWallIndices = [];

  const frenetFrames = curve.computeFrenetFrames(segments, true);
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = curve.getPointAt(t);
    // Use binormal for 'right' vector
    const right = frenetFrames.binormals[i % segments].clone().multiplyScalar(trackWidth / 2);
    
    const pLeft = pt.clone().sub(right);
    const pRight = pt.clone().add(right);
    
    roadVertices.push(pLeft.x, pLeft.y, pLeft.z);
    roadVertices.push(pRight.x, pRight.y, pRight.z);
    
    roadUvs.push(0, t * 20); // Scale V so texture repeats
    roadUvs.push(1, t * 20);
    
    // Wall points
    const wallThick = 0.5;
    const pLeftOut = pLeft.clone().sub(frenetFrames.binormals[i % segments].clone().multiplyScalar(wallThick));
    const pRightOut = pRight.clone().add(frenetFrames.binormals[i % segments].clone().multiplyScalar(wallThick));
    
    leftWallVertices.push(pLeft.x, pLeft.y, pLeft.z);
    leftWallVertices.push(pLeftOut.x, pLeftOut.y, pLeftOut.z);
    leftWallVertices.push(pLeft.x, pLeft.y + wallHeight, pLeft.z);
    leftWallVertices.push(pLeftOut.x, pLeftOut.y + wallHeight, pLeftOut.z);
    
    rightWallVertices.push(pRight.x, pRight.y, pRight.z);
    rightWallVertices.push(pRightOut.x, pRightOut.y, pRightOut.z);
    rightWallVertices.push(pRight.x, pRight.y + wallHeight, pRight.z);
    rightWallVertices.push(pRightOut.x, pRightOut.y + wallHeight, pRightOut.z);
    
    if (i < segments) {
      const row1 = i * 2;
      const row2 = (i + 1) * 2;
      
      // Road indices
      roadIndices.push(row1, row1 + 1, row2);
      roadIndices.push(row2, row1 + 1, row2 + 1);
      
      const wRow1 = i * 4;
      const wRow2 = (i + 1) * 4;
      
      // Left Wall indices
      leftWallIndices.push(wRow1, wRow2, wRow1 + 2); // inner side
      leftWallIndices.push(wRow2, wRow2 + 2, wRow1 + 2);
      leftWallIndices.push(wRow1 + 2, wRow2 + 2, wRow1 + 3); // top side
      leftWallIndices.push(wRow2 + 2, wRow2 + 3, wRow1 + 3);
      leftWallIndices.push(wRow1 + 3, wRow2 + 3, wRow1 + 1); // outer side
      leftWallIndices.push(wRow2 + 3, wRow2 + 1, wRow1 + 1);
      
      // Right Wall indices
      rightWallIndices.push(wRow1, wRow1 + 2, wRow2); // inner side (flipped normal)
      rightWallIndices.push(wRow2, wRow1 + 2, wRow2 + 2);
      rightWallIndices.push(wRow1 + 2, wRow1 + 3, wRow2 + 2); // top side
      rightWallIndices.push(wRow2 + 2, wRow1 + 3, wRow2 + 3);
      rightWallIndices.push(wRow1 + 3, wRow1 + 1, wRow2 + 3); // outer side
      rightWallIndices.push(wRow2 + 3, wRow1 + 1, wRow2 + 1);
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
  leftWallGeo.setIndex(leftWallIndices);
  leftWallGeo.computeVertexNormals();
  const leftWallMesh = new THREE.Mesh(leftWallGeo, curbMat);
  leftWallMesh.castShadow = true;
  leftWallMesh.receiveShadow = true;
  trackGroup.add(leftWallMesh);

  rightWallGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightWallVertices, 3));
  rightWallGeo.setIndex(rightWallIndices);
  rightWallGeo.computeVertexNormals();
  const rightWallMesh = new THREE.Mesh(rightWallGeo, curbMat);
  rightWallMesh.castShadow = true;
  rightWallMesh.receiveShadow = true;
  trackGroup.add(rightWallMesh);

  // Start Line
  const startLineGeo = new THREE.PlaneGeometry(trackWidth, 2);
  const startLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const startLineMesh = new THREE.Mesh(startLineGeo, startLineMat);
  
  const startPos = curve.getPointAt(0);
  const startTangent = curve.getTangentAt(0);
  startLineMesh.position.copy(startPos);
  startLineMesh.position.y += 0.05; // Slightly above road
  
  // Align start line with track tangent
  const upVec = new THREE.Vector3(0, 1, 0);
  startLineMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), startTangent);
  startLineMesh.rotateX(-Math.PI / 2);
  trackGroup.add(startLineMesh);

  // Checkpoints
  const checkpoints = [];
  const numCheckpoints = 10;
  for (let i = 0; i < numCheckpoints; i++) {
    const t = i / numCheckpoints;
    checkpoints.push({
      position: curve.getPointAt(t),
      tangent: curve.getTangentAt(t),
      index: i
    });
  }

  // Calculate track length (approx)
  const trackLength = curve.getLength();

  // Start position and direction
  // Offset start position to the right lane
  const startBinormal = frenetFrames.binormals[0];
  const offsetPos = startPos.clone().add(startBinormal.clone().multiplyScalar(trackWidth / 4));
  offsetPos.y += 0.5; // Drop-in height

  return {
    trackGroup,
    curve,
    roadMesh,
    wallsLeft: leftWallMesh,
    wallsRight: rightWallMesh,
    checkpoints,
    startPosition: offsetPos,
    startDirection: startTangent,
    trackLength
  };
}

/**
 * Gets the nearest point on track and distance from center
 * @param {THREE.Vector3} position 
 * @param {THREE.CatmullRomCurve3} curve
 * @param {number} trackWidth
 * @returns {object} Info about track position
 */
export function getTrackInfo(position, curve, trackWidth) {
  // Rough search for closest point
  let closestT = 0;
  let minDist = Infinity;
  let closestPoint = null;
  
  const samples = 100;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const pt = curve.getPointAt(t);
    const dist = position.distanceToSquared(pt);
    if (dist < minDist) {
      minDist = dist;
      closestT = t;
      closestPoint = pt;
    }
  }

  // Refine search locally
  let refinedMinDist = minDist;
  let refinedClosestT = closestT;
  let refinedClosestPoint = closestPoint;
  
  const step = 1 / (samples * 10);
  for (let t = Math.max(0, closestT - 0.05); t <= Math.min(1, closestT + 0.05); t += step) {
    const pt = curve.getPointAt(t);
    const dist = position.distanceToSquared(pt);
    if (dist < refinedMinDist) {
      refinedMinDist = dist;
      refinedClosestT = t;
      refinedClosestPoint = pt;
    }
  }

  const distFromCenter = Math.sqrt(refinedMinDist);
  const tangent = curve.getTangentAt(refinedClosestT);
  const isOnTrack = distFromCenter <= (trackWidth / 2) + 2; // +2 tolerance for walls

  return {
    t: refinedClosestT,
    centerPoint: refinedClosestPoint,
    distFromCenter,
    tangent,
    isOnTrack
  };
}
