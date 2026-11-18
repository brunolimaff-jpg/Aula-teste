import * as THREE from 'three';
import {
  INTERACTABLES,
  PLAYER_EYE_HEIGHT,
  SPAWN_POSE,
  createMissionState,
  detectSoftwareRenderer,
  findFocusedInteractable,
  groundHeightAt,
  resolvePlayerMove,
  resolveQualityProfile,
  surfaceAt,
  triggerInteractable,
} from './logic';
import { patchShadowsR187, fitSunShadowFrustum } from './shadows';
import { createTextureBank, type TextureBank } from './textures';
import { createSkySystem, type SkySystem } from './sky';
import { createMaterialBank, type MaterialBank } from './materials';
import { createGroundSystem, type GroundSystem } from './ground';
import { createMachinerySystem, type MachinerySystem } from './machinery';
import { createStructuresSystem, type StructuresSystem } from './structures';
import { createFoliageAndAtmosphere, type FoliageAndAtmosphere } from './foliage';
import { createPostPipeline, type PostPipeline } from './post';
import { RedDustAudio } from './audio';
import type {
  GameState,
  InteractableDef,
  MissionState,
  PerfSnapshot,
  QualityProfile,
  QualitySetting,
  RedDustBridge,
} from './types';

export interface EngineCallbacks {
  onUiSync: (snap: {
    state: GameState;
    mission: MissionState;
    focused: InteractableDef | null;
    qualitySetting: QualitySetting;
    profile: QualityProfile;
    muted: boolean;
    perf: PerfSnapshot;
  }) => void;
  onError: (msg: string) => void;
}

export class RedDustEngine {
  private canvas: HTMLCanvasElement;
  private cb: EngineCallbacks;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private textures!: TextureBank;
  private sky!: SkySystem;
  private mats!: MaterialBank;
  private ground!: GroundSystem;
  private machinery!: MachinerySystem;
  private structures!: StructuresSystem;
  private foliage!: FoliageAndAtmosphere;
  private post!: PostPipeline;
  private audio = new RedDustAudio();

  private beaconRing!: THREE.Mesh;
  private beaconGeo!: THREE.RingGeometry;
  private beaconMat!: THREE.MeshBasicMaterial;

  private isSoftwareGl = false;
  private qualitySetting: QualitySetting = 'auto';
  private profile: QualityProfile;

  private state: GameState = 'title';
  private mission: MissionState = createMissionState();
  private focused: InteractableDef | null = null;

  private px: number = SPAWN_POSE.x;
  private py: number = SPAWN_POSE.y;
  private pz: number = SPAWN_POSE.z;
  private yaw: number = SPAWN_POSE.yaw;
  private pitch: number = SPAWN_POSE.pitch;
  private walkBob = 0;
  private lastStepPhase = 0;
  private sensitivity = 1.0;

  private keys = new Set<string>();
  private dragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private touchMove = { x: 0, y: 0 };

  private simTime = 0;
  private lastRafMs = 0;
  private rafId = 0;
  private timerBreatherId = 0;
  private renderPaused = false;
  private disposed = false;

  private frameTimes: number[] = [];
  private fps = 60;
  private frameMsAvg = 16.7;
  private frameMsMax = 16.7;
  private sceneDrawCalls = 0;
  private sceneTriangles = 0;
  private lastUiSyncMs = 0;

  private lookVec = new THREE.Vector3();
  private forwardXZ = new THREE.Vector3();
  private rightXZ = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.canvas = canvas;
    this.cb = cb;
    this.profile = resolveQualityProfile('auto', false, navigator.hardwareConcurrency || 8);
  }

  public init(): void {
    try {
      patchShadowsR187();

      const params = new URLSearchParams(window.location.search);
      const qParam = params.get('qual');
      if (qParam === 'alta' || qParam === 'media' || qParam === 'baixa' || qParam === 'auto') {
        this.qualitySetting = qParam;
      }

      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;

      const gl = this.renderer.getContext();
      this.isSoftwareGl = detectSoftwareRenderer(gl);
      this.profile = resolveQualityProfile(
        this.qualitySetting,
        this.isSoftwareGl,
        navigator.hardwareConcurrency || 8
      );

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x2a2730, 0.0088);

      this.camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.14, 480);
      this.camera.rotation.order = 'YXZ';

      this.textures = createTextureBank();
      this.sky = createSkySystem(this.scene);
      this.mats = createMaterialBank(this.textures);
      this.ground = createGroundSystem(this.scene, this.textures);
      this.machinery = createMachinerySystem(this.scene, this.mats, this.textures);
      this.structures = createStructuresSystem(this.scene, this.mats, this.textures);
      this.foliage = createFoliageAndAtmosphere(
        this.scene,
        this.textures,
        this.sky.sunDir,
        2200
      );
      this.post = createPostPipeline(this.sky.sunDir);

      // Subtle diegetic ground/target beacon ring pointing out active mission interactable
      this.beaconGeo = new THREE.RingGeometry(0.42, 0.5, 28);
      this.beaconGeo.rotateX(-Math.PI / 2);
      this.beaconMat = new THREE.MeshBasicMaterial({
        color: 0xffb629,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      this.beaconRing = new THREE.Mesh(this.beaconGeo, this.beaconMat);
      this.scene.add(this.beaconRing);

      this.applyQualityProfile();
      this.sky.bakeEnvMap(this.renderer, this.profile.envMapSize);
      this.resetPlayerToSpawn();
      this.handleResize();
      this.bindEvents();
      this.installBridge();

      if (params.get('autostart') === '1') {
        this.startGame();
      } else {
        this.setBodyState('title');
      }

      this.syncUi(true);
      this.lastRafMs = performance.now();
      this.loop(this.lastRafMs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.cb.onError(`Erro ao iniciar RED DUST: ${msg}`);
    }
  }

  private applyQualityProfile(): void {
    const p = this.profile;
    const dpr = Math.min(window.devicePixelRatio || 1, p.pixelRatioCap);
    this.renderer.setPixelRatio(dpr);
    this.renderer.shadowMap.enabled = p.shadowsEnabled;

    const sun = this.sky.sunLight;
    sun.castShadow = p.shadowsEnabled;
    if (sun.shadow.mapSize.width !== p.shadowMapSize) {
      sun.shadow.mapSize.set(p.shadowMapSize, p.shadowMapSize);
      if (sun.shadow.map) {
        sun.shadow.map.dispose();
        sun.shadow.map = null;
      }
    }
    fitSunShadowFrustum(sun, 0, -4, 34);

    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.ground.setReflectionScale(p.planarReflectionScale, w, h);
    this.foliage.setCaneCount(p.caneCount);
    this.post.resize(w, h, dpr);
  }

  public setQuality(setting: QualitySetting): void {
    this.qualitySetting = setting;
    this.profile = resolveQualityProfile(
      setting,
      this.isSoftwareGl,
      navigator.hardwareConcurrency || 8
    );
    this.applyQualityProfile();
    this.syncUi(true);
  }

  public setSensitivity(s: number): void {
    this.sensitivity = Math.max(0.3, Math.min(2.5, s));
  }

  public setTouchMove(x: number, y: number): void {
    this.touchMove.x = x;
    this.touchMove.y = y;
  }

  public toggleMute(): void {
    this.audio.setMuted(!this.audio.isMuted());
    this.syncUi(true);
  }

  public setInteractHeld(held: boolean): void {
    if (held) this.keys.add('KeyE');
    else this.keys.delete('KeyE');
  }

  private setBodyState(s: GameState): void {
    this.state = s;
    document.body.dataset.state = s;
  }

  public startGame(): void {
    this.audio.unlock();
    this.setBodyState('playing');
    this.syncUi(true);
  }

  public pauseGame(): void {
    if (this.state !== 'playing') return;
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
    this.keys.clear();
    this.setBodyState('paused');
    this.syncUi(true);
  }

  public resumeGame(): void {
    if (this.state !== 'paused') return;
    this.audio.unlock();
    this.setBodyState('playing');
    this.syncUi(true);
  }

  public restartGame(): void {
    this.audio.unlock();
    this.mission = createMissionState();
    this.focused = null;
    this.resetPlayerToSpawn();
    this.setBodyState('playing');
    this.syncUi(true);
  }

  private resetPlayerToSpawn(): void {
    this.px = SPAWN_POSE.x;
    this.pz = SPAWN_POSE.z;
    this.py = groundHeightAt(this.px, this.pz) + PLAYER_EYE_HEIGHT;
    this.yaw = SPAWN_POSE.yaw;
    this.pitch = SPAWN_POSE.pitch;
    this.walkBob = 0;
  }

  public requestPointerLock(): void {
    if (this.state !== 'playing') return;
    try {
      this.canvas.requestPointerLock?.();
    } catch {
      // Pointer lock optional; drag look still works
    }
  }

  private handleResize = (): void => {
    if (!this.renderer || !this.camera) return;
    const w = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    const dpr = Math.min(window.devicePixelRatio || 1, this.profile.pixelRatioCap);
    this.ground.setReflectionScale(this.profile.planarReflectionScale, w, h);
    this.post.resize(w, h, dpr);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.audio.unlock();
    this.keys.add(e.code);

    if (e.code === 'Enter' || e.code === 'Space') {
      if (this.state === 'title') {
        e.preventDefault();
        this.startGame();
        return;
      }
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (this.state === 'playing') {
        e.preventDefault();
        this.pauseGame();
      } else if (this.state === 'paused') {
        e.preventDefault();
        this.resumeGame();
      }
      return;
    }
    if (e.code === 'KeyR' && (this.state === 'playing' || this.state === 'paused' || this.state === 'gameover')) {
      e.preventDefault();
      this.restartGame();
      return;
    }
    if (e.code === 'KeyM') {
      this.toggleMute();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (this.state !== 'playing') return;
    this.audio.unlock();
    if (document.pointerLockElement !== this.canvas) {
      this.dragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  };

  private onMouseUp = (): void => {
    this.dragging = false;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.state !== 'playing') return;
    let dx = 0;
    let dy = 0;
    if (document.pointerLockElement === this.canvas) {
      dx = e.movementX || 0;
      dy = e.movementY || 0;
    } else if (this.dragging) {
      dx = e.clientX - this.lastMouseX;
      dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else {
      return;
    }

    const scale = 0.0022 * this.sensitivity;
    this.yaw -= dx * scale;
    this.pitch = Math.max(-1.25, Math.min(1.25, this.pitch - dy * scale));
  };

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('dblclick', () => this.requestPointerLock());
  }

  private unbindEvents(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
  }

  private installBridge(): void {
    const bridge: RedDustBridge = {
      getState: () => this.state,
      getMission: () => ({ ...this.mission }),
      getPlayerPos: () => ({
        x: this.px,
        y: this.py,
        z: this.pz,
        yaw: this.yaw,
        pitch: this.pitch,
      }),
      teleport: (x, y, z, yaw, pitch) => {
        this.px = x;
        this.py = y > 0.2 ? y : groundHeightAt(x, z) + PLAYER_EYE_HEIGHT;
        this.pz = z;
        if (typeof yaw === 'number') this.yaw = yaw;
        if (typeof pitch === 'number') this.pitch = pitch;
        this.updateCameraPose();
      },
      setRenderPaused: (paused) => {
        this.renderPaused = paused;
        if (paused) {
          cancelAnimationFrame(this.rafId);
          clearTimeout(this.timerBreatherId);
        } else if (!this.disposed) {
          this.lastRafMs = performance.now();
          this.rafId = requestAnimationFrame(this.loop);
        }
      },
      setQuality: (q) => this.setQuality(q),
      completeCurrentStep: () => {
        if (this.mission.step === 'purge_valve') {
          this.applyInteractionResult('valve_v07');
        } else if (this.mission.step === 'isolate_switch') {
          this.applyInteractionResult('switch_s02');
        } else if (this.mission.step === 'restore_breaker') {
          this.applyInteractionResult('panel_qgbt04');
        }
      },
      startGame: () => this.startGame(),
      restartGame: () => this.restartGame(),
      getPerf: () => this.buildPerfSnapshot(),
    };
    (window as unknown as { __redDust?: RedDustBridge }).__redDust = bridge;
  }

  private applyInteractionResult(id: InteractableDef['id']): void {
    const res = triggerInteractable(this.mission, id);
    this.mission = res.next;
    if (res.event) {
      this.audio.playAction(res.event);
    }
    this.syncUi(true);
  }

  private stepSimulation(dt: number): void {
    this.simTime += dt;

    if (this.mission.radioTimer > 0) {
      this.mission.radioTimer = Math.max(0, this.mission.radioTimer - dt);
      if (this.mission.radioTimer === 0) {
        this.mission.radioText = null;
      }
    }

    if (this.state === 'title') {
      // Gentle living opening shot looking across puddles toward truck & steaming boiler
      const sway = Math.sin(this.simTime * 0.22) * 0.65;
      this.camera.position.set(-2.4 + sway, groundHeightAt(-2.4, 24.0) + 1.75, 24.0);
      this.camera.lookAt(1.8, 1.9, -2.5);
    } else if (this.state === 'playing' || this.state === 'gameover') {
      if (this.state === 'playing' && this.mission.step !== 'restored') {
        this.mission.elapsedSeconds += dt;
      }

      if (this.mission.breakerRestored && this.mission.climaxProgress < 1) {
        this.mission.climaxProgress = Math.min(1, this.mission.climaxProgress + dt * 0.28);
        if (this.mission.climaxProgress >= 1 && this.state === 'playing') {
          this.setBodyState('gameover');
          if (document.pointerLockElement === this.canvas) {
            document.exitPointerLock();
          }
          this.syncUi(true);
        }
      }

      if (this.state === 'playing') {
        this.stepPlayerMovement(dt);
        this.stepInteractions(dt);
      }
      this.updateCameraPose();
    }

    // Update animated world systems
    const climax = this.mission.climaxProgress;
    this.sky.update(this.simTime, climax);
    this.ground.update(this.simTime);
    this.machinery.update(this.simTime, climax);
    this.structures.update(
      this.simTime,
      this.mission.valvePurged,
      this.mission.switchIsolated,
      this.mission.breakerRestored,
      climax
    );
    this.foliage.update(
      this.simTime,
      this.mission.valvePurged,
      this.mission.switchIsolated,
      this.mission.breakerRestored,
      climax
    );

    // Beacon ring on current active mission objective
    const activeObj = INTERACTABLES.find((i) => i.requiredStep === this.mission.step);
    if (activeObj && this.state === 'playing') {
      this.beaconRing.visible = true;
      const gx = activeObj.position[0];
      const gz = activeObj.position[2];
      this.beaconRing.position.set(gx, groundHeightAt(gx, gz) + 0.04, gz);
      const pulse = 1 + Math.sin(this.simTime * 3.8) * 0.14;
      this.beaconRing.scale.setScalar(pulse);
      this.beaconMat.opacity = 0.42 + Math.sin(this.simTime * 3.8) * 0.18;
    } else {
      this.beaconRing.visible = false;
    }

    this.audio.update({
      px: this.px,
      pz: this.pz,
      yaw: this.yaw,
      valvePurged: this.mission.valvePurged,
      switchIsolated: this.mission.switchIsolated,
      breakerRestored: this.mission.breakerRestored,
      climax,
    });
  }

  private stepPlayerMovement(dt: number): void {
    let forward = 0;
    let strafe = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) forward += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) forward -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) strafe += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) strafe -= 1;

    forward += this.touchMove.y;
    strafe += this.touchMove.x;

    // Arrow key look support as fallback convenience
    if (this.keys.has('KeyQ')) this.yaw += 1.7 * dt;

    const len = Math.hypot(forward, strafe);
    if (len > 0.01) {
      const fNorm = forward / Math.max(1, len);
      const sNorm = strafe / Math.max(1, len);
      const sprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      const speed = sprinting ? 6.1 : 3.9;

      this.forwardXZ.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      this.rightXZ.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

      const nextX = this.px + (this.forwardXZ.x * fNorm + this.rightXZ.x * sNorm) * speed * dt;
      const nextZ = this.pz + (this.forwardXZ.z * fNorm + this.rightXZ.z * sNorm) * speed * dt;
      const resolved = resolvePlayerMove(this.px, this.pz, nextX, nextZ);
      this.px = resolved.x;
      this.pz = resolved.z;

      this.walkBob += dt * (sprinting ? 11.5 : 8.2);
      const stepPhase = Math.floor(this.walkBob / Math.PI);
      if (stepPhase !== this.lastStepPhase) {
        this.lastStepPhase = stepPhase;
        this.audio.playFootstep(surfaceAt(this.px, this.pz));
      }
    } else {
      this.walkBob *= 0.85;
    }

    const targetY = groundHeightAt(this.px, this.pz) + PLAYER_EYE_HEIGHT;
    this.py += (targetY - this.py) * Math.min(1, dt * 12);
  }

  private stepInteractions(dt: number): void {
    this.camera.getWorldDirection(this.lookVec);
    const focus = findFocusedInteractable(
      this.px,
      this.py,
      this.pz,
      this.lookVec.x,
      this.lookVec.y,
      this.lookVec.z,
      this.mission
    );

    if (!focus) {
      this.focused = null;
      this.mission.activeTargetId = null;
      this.mission.holdProgress = 0;
      return;
    }

    if (this.focused?.id !== focus.id) {
      this.focused = focus;
      this.mission.activeTargetId = focus.id;
      this.mission.holdProgress = 0;
    }

    if (this.keys.has('KeyE')) {
      this.mission.holdProgress = Math.min(1, this.mission.holdProgress + dt / focus.holdSeconds);
      if (this.mission.holdProgress >= 1) {
        this.applyInteractionResult(focus.id);
      }
    } else {
      this.mission.holdProgress = Math.max(0, this.mission.holdProgress - dt * 2.5);
    }
  }

  private updateCameraPose(): void {
    const bobOffset = Math.sin(this.walkBob * 2) * 0.032;
    this.camera.position.set(this.px, this.py + bobOffset, this.pz);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  private renderFrame(): void {
    if (this.profile.planarReflectionScale > 0) {
      this.ground.renderPlanarReflection(
        this.renderer,
        this.scene,
        this.camera,
        this.mats.clipUniform
      );
    }

    const prevAutoReset = this.renderer.info.autoReset;
    this.renderer.info.autoReset = false;
    this.renderer.info.reset();
    this.post.render(
      this.renderer,
      this.scene,
      this.camera,
      this.profile,
      this.simTime,
      this.mission.climaxProgress
    );
    this.sceneDrawCalls = this.renderer.info.render.calls;
    this.sceneTriangles = this.renderer.info.render.triangles;
    this.renderer.info.autoReset = prevAutoReset;
  }

  private loop = (nowMs: number): void => {
    if (this.disposed || this.renderPaused) return;

    const dt = Math.min(0.05, Math.max(0.001, (nowMs - this.lastRafMs) / 1000));
    this.lastRafMs = nowMs;

    const t0 = performance.now();
    this.stepSimulation(dt);
    this.renderFrame();
    const frameMs = performance.now() - t0;

    this.frameTimes.push(frameMs);
    if (this.frameTimes.length > 40) this.frameTimes.shift();
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    this.frameMsAvg = sum / this.frameTimes.length;
    this.frameMsMax = Math.max(...this.frameTimes);
    this.fps = Math.round(1000 / Math.max(1, dt * 1000));

    if (nowMs - this.lastUiSyncMs > 75) {
      this.lastUiSyncMs = nowMs;
      this.syncUi(false);
    }

    if (this.renderPaused || this.disposed) return;

    if (this.isSoftwareGl) {
      this.timerBreatherId = window.setTimeout(() => {
        if (!this.disposed && !this.renderPaused) {
          this.rafId = requestAnimationFrame(this.loop);
        }
      }, 65);
    } else {
      this.rafId = requestAnimationFrame(this.loop);
    }
  };

  private buildPerfSnapshot(): PerfSnapshot {
    const info = this.renderer?.info;
    return {
      fps: this.fps,
      frameMsAvg: Number(this.frameMsAvg.toFixed(2)),
      frameMsMax: Number(this.frameMsMax.toFixed(2)),
      drawCalls: this.sceneDrawCalls || (info?.render.calls ?? 0),
      triangles: this.sceneTriangles || (info?.render.triangles ?? 0),
      geometries: info?.memory.geometries ?? 0,
      textures: info?.memory.textures ?? 0,
      quality: this.profile.tier,
      isSoftwareGl: this.isSoftwareGl,
      state: this.state,
      step: this.mission.step,
    };
  }

  private syncUi(_force: boolean): void {
    this.cb.onUiSync({
      state: this.state,
      mission: { ...this.mission },
      focused: this.focused,
      qualitySetting: this.qualitySetting,
      profile: this.profile,
      muted: this.audio.isMuted(),
      perf: this.buildPerfSnapshot(),
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    clearTimeout(this.timerBreatherId);
    this.unbindEvents();
    this.beaconGeo?.dispose();
    this.beaconMat?.dispose();
    this.foliage?.dispose();
    this.structures?.dispose();
    this.machinery?.dispose();
    this.ground?.dispose();
    this.materialsDisposeSafe();
    this.sky?.dispose();
    this.textures?.dispose();
    this.post?.dispose();
    this.audio.dispose();
    this.renderer?.dispose();
  }

  private materialsDisposeSafe(): void {
    try {
      this.mats?.dispose();
    } catch {
      // ignore cleanup error
    }
  }
}
