import * as THREE from 'three';

/**
 * Creates a gradient sky dome
 * @param {number} topColor - Hex color for zenith
 * @param {number} bottomColor - Hex color for horizon
 * @returns {THREE.Mesh}
 */
export function createSkyDome(topColor, bottomColor) {
  const skyGeo = new THREE.SphereGeometry(1000, 32, 15);
  
  // Custom shader for gradient
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
      gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), 0.6), 0.0)), 1.0);
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
 * @param {THREE.Scene} scene - the scene to add lights to
 * @param {THREE.CatmullRomCurve3} curve - track curve for placing decorations
 * @returns {THREE.Group}
 */
export function buildEnvironment(levelData, scene, curve) {
  const envGroup = new THREE.Group();
  const theme = levelData.theme;

  // Add lights to scene
  const ambientLight = new THREE.AmbientLight(theme.ambient, theme.ambientIntensity);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(theme.sun, theme.sunIntensity);
  dirLight.position.set(theme.sunPosition.x, theme.sunPosition.y, theme.sunPosition.z);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 10;
  dirLight.shadow.camera.far = 1000;
  const frustumSize = 300;
  dirLight.shadow.camera.left = -frustumSize;
  dirLight.shadow.camera.right = frustumSize;
  dirLight.shadow.camera.top = frustumSize;
  dirLight.shadow.camera.bottom = -frustumSize;
  scene.add(dirLight);

  // Add fog and background
  scene.background = new THREE.Color(theme.sky.bottomColor);
  scene.fog = new THREE.Fog(theme.fog.color, theme.fog.near, theme.fog.far);

  // Add sky dome
  const skyDome = createSkyDome(theme.sky.topColor, theme.sky.bottomColor);
  envGroup.add(skyDome);

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(2000, 2000, 32, 32);
  const groundMat = new THREE.MeshStandardMaterial({ 
    color: theme.ground,
    roughness: 0.9,
    metalness: 0.1
  });
  
  // Add noise displacement for desert ground
  if (theme.decorations === 'desert') {
    const posAttribute = groundGeo.attributes.position;
    for (let i = 0; i < posAttribute.count; i++) {
      const z = posAttribute.getZ(i);
      // Rough displacement based on x, y (which becomes x, z)
      posAttribute.setZ(i, z + (Math.random() - 0.5) * 5);
    }
    groundGeo.computeVertexNormals();
  }
  
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.5; // Slightly below track
  groundMesh.receiveShadow = true;
  envGroup.add(groundMesh);

  // Decorations
  const itemCount = 200;
  const dummy = new THREE.Object3D();

  if (theme.decorations === 'city') {
    // Buildings InstancedMesh
    const bldGeo = new THREE.BoxGeometry(10, 1, 10);
    // Translate geometry so scaling scales from bottom
    bldGeo.translate(0, 0.5, 0);
    const bldMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
    const bldMesh = new THREE.InstancedMesh(bldGeo, bldMat, itemCount);
    
    // Trees InstancedMesh
    const treeGeo = new THREE.ConeGeometry(2, 6, 8);
    treeGeo.translate(0, 3, 0);
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d4c1e });
    const treeMesh = new THREE.InstancedMesh(treeGeo, treeMat, itemCount);

    const bldColors = [0x555555, 0x8899aa, 0xaa9988, 0x334455];
    const colorObj = new THREE.Color();

    for (let i = 0; i < itemCount; i++) {
      const t = i / itemCount;
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0,1,0)).normalize();
      
      // Place randomly left or right of track
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = (levelData.trackWidth / 2) + 15 + Math.random() * 40;
      
      dummy.position.copy(pt).add(binormal.multiplyScalar(side * dist));
      dummy.position.y = 0;
      
      if (i % 2 === 0) { // Building
        const height = 10 + Math.random() * 40;
        dummy.scale.set(1 + Math.random(), height, 1 + Math.random());
        dummy.rotation.y = Math.random() * Math.PI;
        dummy.updateMatrix();
        bldMesh.setMatrixAt(i, dummy.matrix);
        colorObj.setHex(bldColors[Math.floor(Math.random() * bldColors.length)]);
        bldMesh.setColorAt(i, colorObj);
      } else { // Tree
        dummy.scale.set(1 + Math.random(), 1 + Math.random()*0.5, 1 + Math.random());
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
    treeMesh.receiveShadow = true;
    envGroup.add(treeMesh);

  } else if (theme.decorations === 'desert') {
    // Canyon Rocks
    const rockGeo = new THREE.DodecahedronGeometry(5, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 1.0 });
    const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, itemCount * 2);
    
    const rockColors = [0x8b4513, 0xa0522d, 0xcd853f, 0xd2691e];
    const colorObj = new THREE.Color();

    for (let i = 0; i < itemCount * 2; i++) {
      const t = (i / (itemCount * 2));
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0,1,0)).normalize();
      
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = (levelData.trackWidth / 2) + 10 + Math.random() * 60;
      
      dummy.position.copy(pt).add(binormal.multiplyScalar(side * dist));
      dummy.position.y = (Math.random() - 0.5) * 10;
      
      const scale = 2 + Math.random() * 8;
      dummy.scale.set(scale, scale * (1 + Math.random() * 2), scale);
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
    // Floating Neon Shapes
    const shapeCount = 100;
    const shapeGeo = new THREE.OctahedronGeometry(4, 0);
    const edgesGeo = new THREE.EdgesGeometry(shapeGeo);
    
    const mat1 = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 });
    const mat2 = new THREE.LineBasicMaterial({ color: 0xff00ff, linewidth: 2 });
    
    for (let i = 0; i < shapeCount; i++) {
      const t = i / shapeCount;
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0,1,0)).normalize();
      
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = (levelData.trackWidth / 2) + 5 + Math.random() * 30;
      
      const mesh = new THREE.LineSegments(edgesGeo, i % 2 === 0 ? mat1 : mat2);
      mesh.position.copy(pt).add(binormal.multiplyScalar(side * dist));
      mesh.position.y = pt.y + 15 + Math.random() * 20;
      
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      
      // Basic rotation animation via userData
      mesh.userData = { 
        rx: (Math.random() - 0.5) * 0.02,
        ry: (Math.random() - 0.5) * 0.02
      };
      
      envGroup.add(mesh);
      
      // Occasional Point lights matching neon colors
      if (i % 5 === 0) {
        const pLight = new THREE.PointLight(i % 2 === 0 ? 0x00ffff : 0xff00ff, 1, 50);
        pLight.position.copy(mesh.position);
        envGroup.add(pLight);
      }
    }
  }

  return envGroup;
}
