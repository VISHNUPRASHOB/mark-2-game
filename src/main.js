/**
 * Mark-II Game — VPS Game Creator
 * Main entry point and game state machine
 */

import * as THREE from 'three';
import { GameRenderer } from './renderer.js';
import { InputManager } from './input.js';
import { CarPhysics } from './physics.js';
import { AIDriver } from './ai/aiDriver.js';
import { CARS, getUnlockedCars } from './cars/carData.js';
import { createCarMesh, updateCarWheels, updateCarSuspension, setBrakeLights, setHeadlights } from './cars/carFactory.js';
import { LEVELS } from './tracks/trackData.js';
import { buildTrack, getTrackInfo } from './tracks/trackBuilder.js';
import { buildEnvironment, createSkyDome } from './tracks/environment.js';
import { ParticleSystem } from './effects/particles.js';
import { PostProcessManager } from './effects/postprocess.js';
import { HUD } from './hud.js';
import { MainMenu } from './ui/menu.js';
import { Garage } from './ui/garage.js';
import { Results } from './ui/results.js';
import { AudioManager } from './utils/audio.js';

// ─── Game States ───────────────────────────────────────────────────
const STATE = {
  LOADING: 'LOADING',
  MENU: 'MENU',
  GARAGE: 'GARAGE',
  RACING: 'RACING',
  COUNTDOWN: 'COUNTDOWN',
  RESULTS: 'RESULTS'
};

// ─── Game Class ────────────────────────────────────────────────────
class Game {
  constructor() {
    this.state = STATE.LOADING;
    this.clock = new THREE.Clock();
    this.animFrameId = null;

    // Save data
    this.completedLevels = this.loadProgress();

    // DOM references
    this.loadingScreen = document.getElementById('loading-screen');
    this.container = document.getElementById('game-container');
    this.hudElement = document.getElementById('hud');
    this.uiOverlay = document.getElementById('ui-overlay');

    // Core systems
    this.gameRenderer = new GameRenderer(this.container);
    this.input = new InputManager(this.container);
    this.audio = new AudioManager();

    // Race state
    this.playerPhysics = null;
    this.playerCarMesh = null;
    this.aiDrivers = [];
    this.aiCarMeshes = [];
    this.trackData = null;
    this.currentLevel = null;
    this.currentCarId = null;
    this.raceTime = 0;
    this.lapTimes = [];
    this.currentLapStart = 0;
    this.playerLap = 0;
    this.playerCheckpoint = -1;
    this.totalLaps = 3;
    this.raceStarted = false;
    this.raceFinished = false;

    // Effects
    this.particles = null;
    this.postProcess = null;

    // UI
    this.hud = null;
    this.menu = null;
    this.garage = null;
    this.results = null;

    // Menu scene objects
    this.menuCarMesh = null;
    this.menuTime = 0;

    // Initialize
    this.init();
  }

  init() {
    // Show loading then transition to menu
    this.simulateLoading().then(() => {
      this.setupUI();
      this.setState(STATE.MENU);
      this.loop();
    });
  }

  async simulateLoading() {
    const progressBar = document.getElementById('loading-bar');

    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      if (progressBar) {
        progressBar.style.width = `${(i / steps) * 100}%`;
      }
      await this.delay(50);
    }
    await this.delay(300);

    // Fade out loading screen
    if (this.loadingScreen) {
      this.loadingScreen.style.transition = 'opacity 0.5s ease';
      this.loadingScreen.style.opacity = '0';
      await this.delay(500);
      this.loadingScreen.style.display = 'none';
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ─── UI Setup ──────────────────────────────────────────────────
  setupUI() {
    // Main Menu
    this.menu = new MainMenu(this.uiOverlay, {
      onPlay: () => {
        this.audio.resume();
        this.setState(STATE.GARAGE);
      },
      onSettings: () => {
        // Toggle mute as simple settings
        this.audio.setMute(!this.audio.isMuted());
      }
    });

    // Garage
    this.garage = new Garage(this.uiOverlay, {
      onStartRace: (carId, levelId) => {
        this.currentCarId = carId;
        this.currentLevel = LEVELS.find(l => l.id === levelId) || LEVELS[0];
        this.startRace();
      },
      onBack: () => {
        this.setState(STATE.MENU);
      }
    });

    // Results
    this.results = new Results(this.uiOverlay, {
      onNextRace: () => {
        this.setState(STATE.GARAGE);
      },
      onReplay: () => {
        this.startRace();
      },
      onMenu: () => {
        this.setState(STATE.MENU);
      }
    });

    // HUD
    this.hud = new HUD(this.hudElement);
  }

  // ─── State Management ──────────────────────────────────────────
  setState(newState) {
    // Exit current state
    this.exitState(this.state);
    this.state = newState;
    // Enter new state
    this.enterState(newState);
  }

  exitState(state) {
    switch (state) {
      case STATE.MENU:
        if (this.menu) this.menu.hide();
        this.clearMenuScene();
        break;
      case STATE.GARAGE:
        if (this.garage) this.garage.hide();
        break;
      case STATE.RACING:
      case STATE.COUNTDOWN:
        break;
      case STATE.RESULTS:
        if (this.results) this.results.hide();
        break;
    }
  }

  enterState(state) {
    switch (state) {
      case STATE.MENU:
        this.uiOverlay.style.display = 'flex';
        if (this.menu) this.menu.show();
        this.setupMenuScene();
        this.input.hideTouchControls();
        if (this.hud) this.hud.hide();
        break;
      case STATE.GARAGE:
        this.uiOverlay.style.display = 'flex';
        if (this.garage) this.garage.show(this.completedLevels);
        this.input.hideTouchControls();
        if (this.hud) this.hud.hide();
        break;
      case STATE.COUNTDOWN:
        this.uiOverlay.style.display = 'none';
        if (this.hud) this.hud.show();
        if (this.input.isMobile()) this.input.showTouchControls();
        this.hud.showCountdown(() => {
          this.audio.resume();
          this.setState(STATE.RACING);
        });
        break;
      case STATE.RACING:
        this.raceStarted = true;
        this.currentLapStart = this.raceTime;
        break;
      case STATE.RESULTS:
        this.uiOverlay.style.display = 'flex';
        this.input.hideTouchControls();
        break;
    }
  }

  // ─── Menu Scene ────────────────────────────────────────────────
  setupMenuScene() {
    const scene = this.gameRenderer.getScene();

    // Clear scene
    this.clearScene();

    // Add lights for menu
    const ambientLight = new THREE.AmbientLight(0x404060, 0.8);
    ambientLight.userData.isMenu = true;
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x8888ff, 1.2);
    dirLight.position.set(5, 10, 5);
    dirLight.userData.isMenu = true;
    scene.add(dirLight);

    // Rotating car in menu
    try {
      this.menuCarMesh = createCarMesh('viper');
      this.menuCarMesh.position.set(0, 0, 0);
      this.menuCarMesh.userData.isMenu = true;
      scene.add(this.menuCarMesh);
    } catch (e) {
      // Fallback simple mesh
      const geo = new THREE.BoxGeometry(3, 1, 1.5);
      const mat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, metalness: 0.7, roughness: 0.3 });
      this.menuCarMesh = new THREE.Mesh(geo, mat);
      this.menuCarMesh.userData.isMenu = true;
      scene.add(this.menuCarMesh);
    }

    // Add a ground for reflection
    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x111122,
      metalness: 0.9,
      roughness: 0.3
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.7;
    ground.userData.isMenu = true;
    scene.add(ground);

    // Set dark background
    scene.background = new THREE.Color(0x0a0a1a);
    this.menuTime = 0;
  }

  clearMenuScene() {
    const scene = this.gameRenderer.getScene();
    const toRemove = [];
    scene.traverse(child => {
      if (child.userData && child.userData.isMenu) {
        toRemove.push(child);
      }
    });
    toRemove.forEach(obj => {
      if (obj.parent) obj.parent.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
    this.menuCarMesh = null;
  }

  // ─── Race Setup ────────────────────────────────────────────────
  startRace() {
    const scene = this.gameRenderer.getScene();
    this.clearScene();

    const level = this.currentLevel;
    const carDef = CARS.find(c => c.id === this.currentCarId) || CARS[0];

    // Reset race state
    this.raceTime = 0;
    this.lapTimes = [];
    this.currentLapStart = 0;
    this.playerLap = 0;
    this.playerCheckpoint = -1;
    this.raceStarted = false;
    this.raceFinished = false;
    this.aiDrivers = [];
    this.aiCarMeshes = [];

    // Build track
    this.trackData = buildTrack(level);
    scene.add(this.trackData.trackGroup);

    // Build environment
    const envGroup = buildEnvironment(level, scene, this.trackData.curve);
    scene.add(envGroup);

    // Sky dome
    const skyDome = createSkyDome(level.theme.sky.topColor, level.theme.sky.bottomColor);
    scene.add(skyDome);

    // Lighting
    const ambientLight = new THREE.AmbientLight(
      level.theme.ambient,
      level.theme.ambientIntensity
    );
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(
      level.theme.sun,
      level.theme.sunIntensity
    );
    sunLight.position.set(
      level.theme.sunPosition.x,
      level.theme.sunPosition.y,
      level.theme.sunPosition.z
    );
    if (!this.gameRenderer.isMobile()) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 1;
      sunLight.shadow.camera.far = 500;
      sunLight.shadow.camera.left = -150;
      sunLight.shadow.camera.right = 150;
      sunLight.shadow.camera.top = 150;
      sunLight.shadow.camera.bottom = -150;
    }
    scene.add(sunLight);

    // Fog
    if (level.theme.fog) {
      scene.fog = new THREE.Fog(
        level.theme.fog.color,
        level.theme.fog.near,
        level.theme.fog.far
      );
    }

    // Player car
    this.playerCarMesh = createCarMesh(this.currentCarId);
    const startPos = this.trackData.startPosition.clone();
    const startDir = this.trackData.startDirection.clone();
    const playerRotation = Math.atan2(startDir.x, startDir.z);

    this.playerCarMesh.position.copy(startPos);
    this.playerCarMesh.rotation.y = playerRotation;
    scene.add(this.playerCarMesh);

    // Player physics
    this.playerPhysics = new CarPhysics(
      carDef.stats,
      this.trackData.curve,
      level.trackWidth
    );
    this.playerPhysics.reset(startPos, playerRotation);

    // Enable headlights for neon level
    if (level.id === 'neon') {
      setHeadlights(this.playerCarMesh, true);
    }

    // AI opponents (3 AI cars)
    this.totalLaps = level.laps;
    const aiCarIds = this.selectAICars(this.currentCarId);
    const laneOffsets = [-0.3, 0.0, 0.3];
    const difficulties = [
      0.6 + level.difficulty * 0.1,
      0.7 + level.difficulty * 0.08,
      0.75 + level.difficulty * 0.07
    ];

    for (let i = 0; i < 3; i++) {
      const aiCarDef = CARS.find(c => c.id === aiCarIds[i]) || CARS[0];

      // AI mesh
      const aiMesh = createCarMesh(aiCarIds[i]);
      // Stagger starting positions behind the player
      const aiStartT = 0.98 - (i * 0.015);
      const aiStartPos = this.trackData.curve.getPointAt(aiStartT);
      const aiStartTangent = this.trackData.curve.getTangentAt(aiStartT);
      aiStartPos.y += 0.5;
      aiMesh.position.copy(aiStartPos);
      const aiRotation = Math.atan2(aiStartTangent.x, aiStartTangent.z);
      aiMesh.rotation.y = aiRotation;

      if (level.id === 'neon') {
        setHeadlights(aiMesh, true);
      }
      scene.add(aiMesh);
      this.aiCarMeshes.push(aiMesh);

      // AI driver
      const aiDriver = new AIDriver(
        aiCarDef.stats,
        this.trackData.curve,
        level.trackWidth,
        difficulties[i],
        laneOffsets[i]
      );
      aiDriver.reset(aiStartT);
      this.aiDrivers.push(aiDriver);
    }

    // Particles
    this.particles = new ParticleSystem(scene);

    // Post-processing (desktop + neon level)
    if (!this.gameRenderer.isMobile() && PostProcessManager.isSupported(this.gameRenderer.getRenderer())) {
      this.postProcess = new PostProcessManager(
        this.gameRenderer.getRenderer(),
        scene,
        this.gameRenderer.getCamera()
      );
      if (level.id === 'neon') {
        this.postProcess.setBloom(true, 1.2);
      }
    } else {
      this.postProcess = null;
    }

    // Precompute track outline for minimap
    this.trackOutline = [];
    for (let i = 0; i <= 100; i++) {
      const pt = this.trackData.curve.getPointAt(i / 100);
      this.trackOutline.push({ x: pt.x, z: pt.z });
    }

    // Start countdown
    this.setState(STATE.COUNTDOWN);
  }

  selectAICars(playerCarId) {
    // Pick 3 AI cars that are different from the player
    const available = CARS.filter(c => c.id !== playerCarId).map(c => c.id);
    const selected = [];
    for (let i = 0; i < 3; i++) {
      selected.push(available[i % available.length]);
    }
    return selected;
  }

  clearScene() {
    const scene = this.gameRenderer.getScene();
    // Remove all objects except camera
    while (scene.children.length > 0) {
      const child = scene.children[0];
      scene.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else if (child.material.dispose) child.material.dispose();
      }
    }
    scene.fog = null;
    scene.background = null;

    // Dispose particles
    if (this.particles) {
      this.particles.dispose();
      this.particles = null;
    }

    // Dispose post-process
    if (this.postProcess) {
      this.postProcess.dispose();
      this.postProcess = null;
    }
  }

  // ─── Game Loop ─────────────────────────────────────────────────
  loop() {
    this.animFrameId = requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.05); // Cap delta to avoid spiral

    switch (this.state) {
      case STATE.MENU:
        this.updateMenu(dt);
        break;
      case STATE.GARAGE:
        this.updateMenu(dt); // Keep rotating car visible
        break;
      case STATE.COUNTDOWN:
        this.updateRaceVisuals(dt);
        break;
      case STATE.RACING:
        this.updateRacing(dt);
        break;
      case STATE.RESULTS:
        // Idle — maybe slow rotate camera
        this.updateRaceVisuals(dt);
        break;
    }

    this.render();
  }

  updateMenu(dt) {
    this.menuTime += dt;
    // Rotate the menu car
    if (this.menuCarMesh) {
      this.menuCarMesh.rotation.y = this.menuTime * 0.5;
    }
    // Orbit camera
    this.gameRenderer.updateMenuCamera(
      new THREE.Vector3(0, 0, 0),
      this.menuTime
    );
  }

  updateRacing(dt) {
    if (this.raceFinished) return;

    // Update race timer
    this.raceTime += dt;

    // Get input
    const inputState = this.input.getState();
    const carDef = CARS.find(c => c.id === this.currentCarId) || CARS[0];
    const topSpeed = carDef.stats.topSpeed;

    // Update player physics
    this.playerPhysics.update(dt, inputState);

    // Sync player mesh with physics
    const playerPos = this.playerPhysics.getPosition();
    const playerVisRot = this.playerPhysics.getVisualRotation();
    this.playerCarMesh.position.copy(playerPos);
    this.playerCarMesh.rotation.y = playerVisRot;

    // GTA 5 Visual dynamics: steerable front wheels, suspension pitch & roll, brake lights
    updateCarWheels(this.playerCarMesh, this.playerPhysics.getSpeed(), this.playerPhysics.getSteerAngle(), dt);
    updateCarSuspension(this.playerCarMesh, this.playerPhysics.getPitch(), this.playerPhysics.getRoll());
    setBrakeLights(this.playerCarMesh, this.playerPhysics.isBraking() || this.playerPhysics.isReversing());

    // Player checkpoint & lap tracking
    this.updateCheckpointsAndLaps();

    // Update AI drivers
    for (let i = 0; i < this.aiDrivers.length; i++) {
      const ai = this.aiDrivers[i];
      ai.update(dt);

      // Sync AI mesh
      const aiPos = ai.getPosition();
      const aiRot = ai.getRotation();
      this.aiCarMeshes[i].position.copy(aiPos);
      this.aiCarMeshes[i].rotation.y = aiRot;

      updateCarWheels(this.aiCarMeshes[i], ai.getSpeed(), 0, dt);
      updateCarSuspension(this.aiCarMeshes[i], 0, 0);
    }

    // GTA 5 Dynamic Chase Camera with speed FOV and drift sway
    this.gameRenderer.updateChaseCamera(
      playerPos,
      this.playerPhysics.getRotation(),
      this.playerPhysics.getSpeed(),
      topSpeed,
      this.playerPhysics.driftAngle,
      dt
    );

    // GTA 5 Audio: Multi-gear RPM engine, continuous tire screech, gear shift pops
    this.audio.playEngine(
      this.playerPhysics.getSpeed(),
      topSpeed,
      this.playerPhysics.getRPM(),
      this.playerPhysics.getCurrentGear()
    );
    this.audio.updateTireScreech(this.playerPhysics.getTireSlip());

    // Gear shift backfire pop & flame
    if (this.playerPhysics.hasGearShifted()) {
      this.audio.playExhaustPop();
      if (this.particles) {
        const angle = this.playerPhysics.getRotation();
        const exhaustPos = playerPos.clone();
        exhaustPos.x -= Math.sin(angle) * 1.5;
        exhaustPos.z -= Math.cos(angle) * 1.5;
        exhaustPos.y += 0.3;
        this.particles.emitFlame(exhaustPos, angle);
      }
    }

    // Wall collision impact sound, sparks and camera shake
    if (this.playerPhysics.sparkTrigger) {
      this.audio.playCollision();
      this.gameRenderer.triggerShake(0.5);
      if (this.particles) {
        this.particles.emitSparks(this.playerPhysics.sparkPosition, this.playerPhysics.sparkNormal);
      }
    }

    // GTA 5 Particles: Tire smoke on drifts/burnouts & exhaust smoke
    if (this.particles) {
      const speed = this.playerPhysics.getSpeed();
      const angle = this.playerPhysics.getRotation();

      if (speed > 3) {
        const exhaustPos = playerPos.clone();
        exhaustPos.x -= Math.sin(angle) * 1.4;
        exhaustPos.z -= Math.cos(angle) * 1.4;
        exhaustPos.y += 0.28;
        this.particles.emitExhaust(exhaustPos, angle, speed);
      }

      // Tire smoke during drifts, burnouts, and hard braking
      const tireSlip = this.playerPhysics.getTireSlip();
      if (tireSlip > 0.15) {
        const rearWheelPos = playerPos.clone();
        rearWheelPos.x -= Math.sin(angle) * 1.1;
        rearWheelPos.z -= Math.cos(angle) * 1.1;
        this.particles.emitTireSmoke(rearWheelPos, tireSlip);
      }

      this.particles.update(dt);
    }

    // Post-process speed lines
    if (this.postProcess) {
      this.postProcess.setSpeedLines(this.playerPhysics.getSpeedFraction());
    }

    // HUD updates
    this.updateHUD();
  }

  updateRaceVisuals(dt) {
    if (this.playerCarMesh && this.playerPhysics) {
      const carDef = CARS.find(c => c.id === this.currentCarId) || CARS[0];
      this.gameRenderer.updateChaseCamera(
        this.playerPhysics.getPosition(),
        this.playerPhysics.getRotation(),
        0,
        carDef.stats.topSpeed,
        0,
        dt
      );
    }
    if (this.particles) {
      this.particles.update(dt);
    }
  }

  updateCheckpointsAndLaps() {
    if (!this.trackData || !this.trackData.checkpoints) return;

    const progress = this.playerPhysics.getTrackProgress();
    const numCheckpoints = this.trackData.checkpoints.length;
    const currentCheckpointIndex = Math.floor(progress * numCheckpoints) % numCheckpoints;

    // Check if player advanced to next checkpoint
    if (currentCheckpointIndex !== this.playerCheckpoint) {
      const expected = (this.playerCheckpoint + 1) % numCheckpoints;
      if (currentCheckpointIndex === expected) {
        this.playerCheckpoint = currentCheckpointIndex;

        // Lap completion — when wrapping from last checkpoint back to 0
        if (this.playerCheckpoint === 0 && this.playerLap >= 0) {
          if (this.raceTime > 2) { // Prevent false trigger at start
            this.playerLap++;

            // Record lap time
            const lapTime = this.raceTime - this.currentLapStart;
            this.lapTimes.push(lapTime);
            this.currentLapStart = this.raceTime;

            // Check if race is finished
            if (this.playerLap >= this.totalLaps) {
              this.finishRace();
              return;
            }
          }
        }
      }
    }
  }

  finishRace() {
    this.raceFinished = true;
    this.raceStarted = false;

    // Calculate player position
    const playerPosition = this.calculatePlayerPosition();

    // Check if this is a win (1st place) and level should be unlocked
    const levelIndex = LEVELS.findIndex(l => l.id === this.currentLevel.id);
    let isNewUnlock = false;
    let unlockedCarName = null;

    if (playerPosition === 1 && !this.completedLevels.includes(levelIndex)) {
      this.completedLevels.push(levelIndex);
      this.saveProgress();

      // Check for newly unlocked cars
      const maxCompleted = Math.max(...this.completedLevels, 0);
      const newlyUnlocked = CARS.filter(c =>
        c.unlockLevel === maxCompleted &&
        c.unlockLevel > 0
      );
      if (newlyUnlocked.length > 0) {
        isNewUnlock = true;
        unlockedCarName = newlyUnlocked.map(c => c.name).join(' & ');
      }
    }

    // Show results
    const carDef = CARS.find(c => c.id === this.currentCarId) || CARS[0];
    this.results.show({
      playerPosition,
      totalRacers: 4,
      raceTime: this.raceTime,
      lapTimes: this.lapTimes,
      carName: carDef.name,
      levelName: this.currentLevel.name,
      isNewUnlock,
      unlockedCarName
    });
    this.setState(STATE.RESULTS);
  }

  calculatePlayerPosition() {
    // Compare player progress (laps + track progress) vs AI
    const playerTotal = this.playerLap + this.playerPhysics.getTrackProgress();
    let position = 1;

    for (const ai of this.aiDrivers) {
      const aiTotal = ai.getLapsCompleted() + ai.getProgress();
      if (aiTotal > playerTotal) {
        position++;
      }
    }

    return Math.min(position, 4);
  }

  updateHUD() {
    if (!this.hud) return;

    const carDef = CARS.find(c => c.id === this.currentCarId) || CARS[0];
    const speed = this.playerPhysics.getSpeed();

    // Speed, gear & RPM (GTA 5 gauge)
    this.hud.updateSpeed(
      speed,
      carDef.stats.topSpeed,
      this.playerPhysics.getCurrentGear(),
      this.playerPhysics.getRPM(),
      this.playerPhysics.isReversing()
    );

    // Lap
    this.hud.updateLap(Math.min(this.playerLap + 1, this.totalLaps), this.totalLaps);

    // Position
    const position = this.calculatePlayerPosition();
    this.hud.updatePosition(position, 4);

    // Timer
    this.hud.updateTimer(this.raceTime);

    // Minimap
    const carPositions = [
      { x: this.playerCarMesh.position.x, z: this.playerCarMesh.position.z, isPlayer: true }
    ];
    for (const aiMesh of this.aiCarMeshes) {
      carPositions.push({ x: aiMesh.position.x, z: aiMesh.position.z, isPlayer: false });
    }
    this.hud.updateMinimap(carPositions, this.trackOutline);
  }

  // ─── Rendering ─────────────────────────────────────────────────
  render() {
    if (this.postProcess && (this.state === STATE.RACING || this.state === STATE.COUNTDOWN || this.state === STATE.RESULTS)) {
      this.postProcess.render();
    } else {
      this.gameRenderer.getRenderer().render(
        this.gameRenderer.getScene(),
        this.gameRenderer.getCamera()
      );
    }
  }

  // ─── Save/Load ─────────────────────────────────────────────────
  loadProgress() {
    try {
      const data = localStorage.getItem('markii-progress');
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.completedLevels || [];
      }
    } catch (e) {
      // Ignore errors
    }
    return [];
  }

  saveProgress() {
    try {
      localStorage.setItem('markii-progress', JSON.stringify({
        completedLevels: this.completedLevels
      }));
    } catch (e) {
      // Ignore errors
    }
  }

  // ─── Cleanup ───────────────────────────────────────────────────
  dispose() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.clearScene();
    this.gameRenderer.dispose();
    this.input.dispose();
    this.audio.dispose();
    if (this.hud) this.hud.dispose();
    if (this.menu) this.menu.dispose();
    if (this.garage) this.garage.dispose();
    if (this.results) this.results.dispose();
  }
}

// ─── Bootstrap ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});

// Handle visibility changes (pause when tab hidden)
document.addEventListener('visibilitychange', () => {
  if (window.game && window.game.clock) {
    if (document.hidden) {
      window.game.clock.stop();
    } else {
      window.game.clock.start();
    }
  }
});
