import * as THREE from 'three/webgpu';
import { SkyMesh } from 'three/examples/jsm/objects/SkyMesh.js';
import { CSMShadowNode } from 'three/examples/jsm/csm/CSMShadowNode.js';
import type { QualityBudget } from './quality';

interface ColorStop {
  t: number;
  c: THREE.Color;
}

const FOG_STOPS: ColorStop[] = [
  { t: 0.0, c: new THREE.Color(0xd9996e) }, // 05:30 dawn amber mist
  { t: 0.14, c: new THREE.Color(0xb4cde0) }, // 07:00 cool morning
  { t: 0.45, c: new THREE.Color(0xa6cbe3) }, // 11:30 midday crisp sky
  { t: 0.72, c: new THREE.Color(0xcde0ea) }, // 15:00 warm afternoon
  { t: 0.88, c: new THREE.Color(0xe89c68) }, // 17:30 golden hour
  { t: 1.0, c: new THREE.Color(0x9a645a) }, // 18:30 dusk
];

const SUN_COLOR_STOPS: ColorStop[] = [
  { t: 0.0, c: new THREE.Color(0xffb478) },
  { t: 0.18, c: new THREE.Color(0xffe5bd) },
  { t: 0.5, c: new THREE.Color(0xfff6e6) },
  { t: 0.82, c: new THREE.Color(0xffc985) },
  { t: 1.0, c: new THREE.Color(0xff7d47) },
];

function sampleColorStops(stops: ColorStop[], t: number, out: THREE.Color): void {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    if (clamped <= stops[i].t) {
      const prev = stops[i - 1];
      const next = stops[i];
      const alpha = (clamped - prev.t) / Math.max(1e-5, next.t - prev.t);
      out.copy(prev.c).lerp(next.c, alpha);
      return;
    }
  }
  out.copy(stops[stops.length - 1].c);
}

export class SkyAndLighting {
  public readonly sky: SkyMesh;
  public readonly sunLight: THREE.DirectionalLight;
  public readonly hemiLight: THREE.HemisphereLight;
  public readonly sunDir = new THREE.Vector3(0.4, 0.5, 0.3).normalize();
  public readonly fog: THREE.FogExp2;
  public nightFactor = 0;

  private readonly bakeScene: THREE.Scene;
  private readonly bakeSky: SkyMesh;
  private pmrem: THREE.PMREMGenerator | null = null;
  private pmremTarget: THREE.RenderTarget | null = null;
  private csmNode: CSMShadowNode | null = null;
  private lastEnvDayT = -10;
  private softwareMode = false;
  private readonly horizonRings: THREE.Mesh[] = [];
  private readonly tmpSunCol = new THREE.Color();
  private readonly tmpFogCol = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.sky = new SkyMesh();
    this.sky.scale.setScalar(8000);
    this.sky.turbidity.value = 4.2;
    this.sky.rayleigh.value = 1.65;
    this.sky.mieCoefficient.value = 0.0055;
    this.sky.mieDirectionalG.value = 0.82;
    this.sky.cloudScale.value = 0.00018;
    this.sky.cloudSpeed.value = 0.000014;
    this.sky.cloudCoverage.value = 0.38;
    this.sky.cloudDensity.value = 0.45;
    this.sky.cloudElevation.value = 0.52;
    scene.add(this.sky);

    // Isolated scene for fast IBL environment map generation
    this.bakeScene = new THREE.Scene();
    this.bakeScene.background = new THREE.Color(0x9ac0d8);
    this.bakeSky = new SkyMesh();
    this.bakeSky.scale.setScalar(4000);
    this.bakeSky.showSunDisc.value = 0;
    this.bakeSky.cloudCoverage.value = 0;
    this.bakeScene.add(this.bakeSky);

    this.hemiLight = new THREE.HemisphereLight(0xd9ecff, 0x6a3c28, 0.72);
    scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffe9cc, 2.6);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 300;
    this.sunLight.shadow.camera.left = -65;
    this.sunLight.shadow.camera.right = 65;
    this.sunLight.shadow.camera.top = 65;
    this.sunLight.shadow.camera.bottom = -65;
    this.sunLight.shadow.bias = -0.00035;
    this.sunLight.shadow.normalBias = 0.04;
    scene.add(this.sunLight);
    scene.add(this.sunLight.target);

    this.fog = new THREE.FogExp2(0xc4d9e6, 0.0024);
    scene.fog = this.fog;

    this.buildHorizonRidges(scene);
  }

  public initRendererHooks(renderer: THREE.WebGPURenderer, budget: QualityBudget): void {
    try {
      this.pmrem = new THREE.PMREMGenerator(renderer);
    } catch {
      this.pmrem = null;
    }
    this.applyQuality(budget);
  }

  public applyQuality(budget: QualityBudget): void {
    this.sunLight.castShadow = budget.enableShadows;
    const sz = budget.shadowMapSize;
    if (this.sunLight.shadow.mapSize.x !== sz) {
      this.sunLight.shadow.mapSize.set(sz, sz);
      if (this.sunLight.shadow.map) {
        this.sunLight.shadow.map.dispose();
        this.sunLight.shadow.map = null;
      }
    }

    // Use CSMShadowNode for multi-cascade crisp shadows on Alta / Media
    if (budget.enableShadows && budget.shadowCascades >= 2) {
      if (!this.csmNode || this.csmNode.cascades !== budget.shadowCascades) {
        if (this.csmNode) {
          this.csmNode.dispose();
        }
        this.csmNode = new CSMShadowNode(this.sunLight, {
          cascades: budget.shadowCascades,
          maxFar: 165,
          mode: 'practical',
        });
        this.csmNode.fade = true;
        this.sunLight.shadow.shadowNode = this.csmNode;
      }
    } else {
      if (this.csmNode) {
        this.csmNode.dispose();
        this.csmNode = null;
      }
      this.sunLight.shadow.shadowNode = undefined;
    }

    this.sky.cloudCoverage.value = budget.enableVolumetricClouds ? 0.38 : 0.0;
    this.sky.cloudDensity.value = budget.quality === 'baixa' ? 0.28 : 0.46;
    this.softwareMode = budget.isSoftwareRenderer;
  }

  public updateTimeOfDay(
    dayT: number,
    focusX: number,
    focusZ: number,
    scene: THREE.Scene,
  ): void {
    // 05:30 (low east sun) -> 12:30 (high sun) -> 18:30 (low west sun)
    const arc = (0.045 + dayT * 0.91) * Math.PI;
    this.sunDir.set(-Math.cos(arc) * 1.15, Math.sin(arc) * 0.92 + 0.06, 0.38).normalize();

    this.sky.sunPosition.value.copy(this.sunDir).multiplyScalar(10000);
    this.bakeSky.sunPosition.value.copy(this.sky.sunPosition.value);

    this.nightFactor =
      dayT <= 0.14
        ? 1 - dayT / 0.14
        : dayT >= 0.78
          ? Math.min(1, (dayT - 0.78) / 0.18)
          : 0;

    // Turbidity rises gently at golden hour & dawn for warm atmospheric glow
    const turb = 3.1 + this.nightFactor * 4.4;
    this.sky.turbidity.value = turb;
    this.sky.rayleigh.value = 1.45 + this.nightFactor * 1.35;
    this.sky.mieCoefficient.value = 0.0045 + this.nightFactor * 0.008;

    this.bakeSky.turbidity.value = turb;
    this.bakeSky.rayleigh.value = this.sky.rayleigh.value;

    sampleColorStops(SUN_COLOR_STOPS, dayT, this.tmpSunCol);
    this.sunLight.color.copy(this.tmpSunCol);
    const sunElev = Math.max(0.08, this.sunDir.y);
    this.sunLight.intensity = 1.05 + sunElev * 1.15 - this.nightFactor * 0.2;

    this.sunLight.position.set(focusX, 0, focusZ).addScaledVector(this.sunDir, 150);
    this.sunLight.target.position.set(focusX, 0, focusZ);

    sampleColorStops(FOG_STOPS, dayT, this.tmpFogCol);
    this.fog.color.copy(this.tmpFogCol);
    this.fog.density = 0.00175 + this.nightFactor * 0.00135;

    this.hemiLight.color.copy(this.tmpFogCol).lerp(new THREE.Color(0xffffff), 0.28);
    this.hemiLight.groundColor.set(0x6e3722).lerp(new THREE.Color(0x3a261c), this.nightFactor * 0.5);
    this.hemiLight.intensity = 0.36 + (1 - this.nightFactor) * 0.16;

    // Update distant serras color gently with fog
    for (let i = 0; i < this.horizonRings.length; i++) {
      const m = this.horizonRings[i].material as THREE.MeshStandardNodeMaterial;
      const base = i === 0 ? 0x3b4d37 : i === 1 ? 0x4b5c50 : 0x5c6b6b;
      m.color.setHex(base).lerp(this.tmpFogCol, 0.45 + i * 0.18);
    }

    // Throttled PMREM environment refresh as sun moves across the sky
    const envStep = this.softwareMode ? 0.35 : 0.06;
    if (this.pmrem && Math.abs(dayT - this.lastEnvDayT) > envStep) {
      this.lastEnvDayT = dayT;
      try {
        this.pmremTarget = this.pmrem.fromScene(this.bakeScene, 0.03, 0.1, 8000, {
          size: this.softwareMode ? 128 : 256,
          renderTarget: this.pmremTarget as unknown as THREE.CubeRenderTarget | undefined,
        });
        scene.environment = this.pmremTarget.texture;
        scene.environmentIntensity = 0.38 + (1 - this.nightFactor) * 0.14;
      } catch {
        // Ignore if backend rejects sync PMREM pass
      }
    }
  }

  public updateFrustums(): void {
    const csm = this.csmNode as (CSMShadowNode & { camera?: THREE.Camera | null }) | null;
    if (!csm || !csm.camera) return;
    try {
      csm.updateFrustums();
    } catch {
      // Wait until first render pass initializes CSM cascades
    }
  }

  private buildHorizonRidges(scene: THREE.Scene): void {
    const configs = [
      { radius: 520, amp: 16, base: 11, color: 0x3b4d37 },
      { radius: 740, amp: 26, base: 17, color: 0x4b5c50 },
      { radius: 980, amp: 34, base: 23, color: 0x5c6b6b },
    ];
    configs.forEach((cfg, idx) => {
      const segs = 128;
      const geo = new THREE.CylinderGeometry(cfg.radius, cfg.radius, 1, segs, 1, true);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const angle = Math.atan2(pos.getZ(i), pos.getX(i));
        if (y > 0) {
          // Leave eastern ocean side open past Porto
          const oceanOpen = angle > -0.7 && angle < 0.7 ? 0.08 : 1.0;
          // Flat-topped Cerrado chapadão silhouette
          const plateau = Math.tanh(Math.sin(angle * 4 + idx * 1.4) * 1.9);
          const ridge =
            Math.cos(angle * 11 - idx) * 0.25 +
            Math.sin(angle * 23 + idx * 3) * 0.12;
          const h = (cfg.base + (plateau * 0.55 + ridge) * cfg.amp) * oceanOpen;
          pos.setY(i, Math.max(0.5, h));
        } else {
          pos.setY(i, -6);
        }
      }
      geo.computeVertexNormals();
      const mat = new THREE.MeshStandardNodeMaterial({
        color: cfg.color,
        roughness: 0.96,
        metalness: 0,
        side: THREE.BackSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
      this.horizonRings.push(mesh);
    });
  }

  public dispose(): void {
    this.csmNode?.dispose();
    this.pmremTarget?.dispose();
  }
}
