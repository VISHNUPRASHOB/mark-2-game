import * as THREE from 'three';

/**
 * Creates a gradient sky dome
 * @param {number} topColor - Hex color for zenith
 * @param {number} bottomColor - Hex color for horizon
 * @returns {THREE.Mesh}
 */
export function createSkyDome(topColor, bottomColor) {
  const skyGeo = new THREE.SphereGeometry(1200, 32, 16);
  
  const vertexShader = `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const fragmentShader = `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition).y;
      gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), 0.55), 0.0)), 1.0);
    }
  `;
  
  const uniforms = {
    topColor: { value: new THREE.Color(topColor) },
    bottomColor: { value: new THREE.Color(bottomColor) }
  };
  
  const skyMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    side: THREE.BackSide,
    depthWrite: false
  });
  
  return new THREE.Mesh(skyGeo, skyMat);
}

/**
 * Creates the complete environment for a level
 * @param {object} levelData - from trackData.js
 * @param {THREE.Scene} scene - the scene to add lights and fog to
 * @param {THREE.CatmullRomCurve3} curve - track curve for placing decorations
 * @returns {THREE.Group}
 */
export function buildEnvironment(levelData, scene, curve) {
  const envGroup = new THREE.Group();
  const theme = levelData.theme;

  // 1. Lighting Setup
  const ambientLight = new THREE.AmbientLight(theme.ambient, theme.ambientIntensity);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(theme.sun, theme.sunIntensity);
  sunLight.position.set(theme.sunPosition.x, theme.sunPosition.y, theme.sunPosition.z);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 1000;
  const frustumSize = 250;
  sunLight.shadow.camera.left = -frustumSize;
  sunLight.shadow.camera.right = frustumSize;
  sunLight.shadow.camera.top = frustumSize;
  sunLight.shadow.camera.bottom = -frustumSize;
  scene.add(sunLight);

  // 2. Sky & Fog
  scene.background = new THREE.Color(theme.sky.bottomColor);
  if (theme.fog) {
    scene.fog = new THREE.Fog(theme.fog.color, theme.fog.near, theme.fog.far);
  }

  // Sky Dome
  const skyDome = createSkyDome(theme.sky.topColor, theme.sky.bottomColor);
  envGroup.add(skyDome);

  // 3. Ground Plane
  const groundGeo = new THREE.PlaneGeometry(3000, 3000, 32, 32);
  const groundMat = new THREE.MeshStandardMaterial({ 
    color: theme.ground,
    roughness: 0.9,
    metalness: 0.1
  });
  
  if (theme.decorations === 'desert') {
    const posAttribute = groundGeo.attributes.position;
    for (let i = 0; i < posAttribute.count; i++) {
      const z = posAttribute.getZ(i);
      posAttribute.setZ(i, z + (Math.random() - 0.5) * 6);
    }
    groundGeo.computeVertexNormals();
  }
  
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.2;
  groundMesh.receiveShadow = true;
  envGroup.add(groundMesh);

  // 4. Surroundings & Landmark Decorations
  const itemCount = 180;
  const dummy = new THREE.Object3D();

  if (theme.decorations === 'city') {
    // Buildings
    const bldGeo = new THREE.BoxGeometry(14, 1, 14);
    bldGeo.translate(0, 0.5, 0);
    const bldMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6, metalness: 0.2 });
    const bldMesh = new THREE.InstancedMesh(bldGeo, bldMat, itemCount);
    
    // Trees
    const treeGeo = new THREE.ConeGeometry(3, 8, 8);
    treeGeo.translate(0, 4, 0);
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    const treeMesh = new THREE.InstancedMesh(treeGeo, treeMat, itemCount);

    const bldColors = [0x334155, 0x475569, 0x1e293b, 0x64748b, 0x0f172a];
    const colorObj = new THREE.Color();

    for (let i = 0; i < itemCount; i++) {
      const t = i / itemCount;
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = (levelData.trackWidth / 2) + 16 + Math.random() * 50;
      
      dummy.position.copy(pt).add(binormal.multiplyScalar(side * dist));
      dummy.position.y = 0;
      
      if (i % 2 === 0) {
        const height = 15 + Math.random() * 65;
        dummy.scale.set(1 + Math.random() * 0.8, height, 1 + Math.random() * 0.8);
        dummy.rotation.y = Math.random() * Math.PI;
        dummy.updateMatrix();
        bldMesh.setMatrixAt(i, dummy.matrix);
        colorObj.setHex(bldColors[Math.floor(Math.random() * bldColors.length)]);
        bldMesh.setColorAt(i, colorObj);
      } else {
        dummy.scale.set(1 + Math.random(), 1 + Math.random() * 0.6, 1 + Math.random());
        dummy.rotation.y = Math.random() * Math.PI;
        dummy.updateMatrix();
        treeMesh.setMatrixAt(i, dummy.matrix);
      }
    }
    bldMesh.instanceMatrix.needsUpdate = true;
    bldMesh.instanceColor.needsUpdate = true;
    bldMesh.castShadow = true;
    bldMesh.receiveShadow = true;
    envGroup.add(bldMesh);
    
    treeMesh.instanceMatrix.needsUpdate = true;
    treeMesh.castShadow = true;
    envGroup.add(treeMesh);

  } else if (theme.decorations === 'desert') {
    // Canyon Rock Formations
    const rockGeo = new THREE.DodecahedronGeometry(6, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.95 });
    const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, itemCount * 2);
    
    const rockColors = [0x7c2d12, 0x9a3412, 0xc2410c, 0xb45309];
    const colorObj = new THREE.Color();

    for (let i = 0; i < itemCount * 2; i++) {
      const t = (i / (itemCount * 2));
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = (levelData.trackWidth / 2) + 14 + Math.random() * 70;
      
      dummy.position.copy(pt).add(binormal.multiplyScalar(side * dist));
      dummy.position.y = (Math.random() - 0.5) * 8;
      
      const scale = 2.5 + Math.random() * 9;
      dummy.scale.set(scale, scale * (1 + Math.random() * 2.2), scale);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.updateMatrix();
      
      rockMesh.setMatrixAt(i, dummy.matrix);
      colorObj.setHex(rockColors[Math.floor(Math.random() * rockColors.length)]);
      rockMesh.setColorAt(i, colorObj);
    }
    rockMesh.instanceMatrix.needsUpdate = true;
    rockMesh.instanceColor.needsUpdate = true;
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;
    envGroup.add(rockMesh);

  } else if (theme.decorations === 'neon') {
    // Holographic Cyberpunk Wireframes
    const shapeCount = 90;
    const shapeGeo = new THREE.OctahedronGeometry(5, 0);
    const edgesGeo = new THREE.EdgesGeometry(shapeGeo);
    
    const mat1 = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 });
    const mat2 = new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 2 });
    
    for (let i = 0; i < shapeCount; i++) {
      const t = i / shapeCount;
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = (levelData.trackWidth / 2) + 10 + Math.random() * 40;
      
      const mesh = new THREE.LineSegments(edgesGeo, i % 2 === 0 ? mat1 : mat2);
      mesh.position.copy(pt).add(binormal.multiplyScalar(side * dist));
      mesh.position.y = pt.y + 16 + Math.random() * 25;
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      
      envGroup.add(mesh);
      
      if (i % 6 === 0) {
        const pLight = new THREE.PointLight(i % 2 === 0 ? 0x00ffff : 0xff00ff, 2, 70);
        pLight.position.copy(mesh.position);
        envGroup.add(pLight);
      }
    }
  }

  return envGroup;
}
