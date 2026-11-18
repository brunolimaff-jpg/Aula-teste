import type {
  ColliderBox,
  InteractableDef,
  MissionState,
  MissionStepId,
  QualityProfile,
  QualitySetting,
  QualityTier,
  SurfaceKind,
} from './types';

export const YARD_HALF = 31.5;
export const PLAYER_EYE_HEIGHT = 1.68;
export const PLAYER_RADIUS = 0.46;

export const SPAWN_POSE = {
  x: -1.5,
  y: PLAYER_EYE_HEIGHT,
  z: 24.5,
  yaw: 0.14,
  pitch: -0.02,
} as const;

export const SUN_DIRECTION: [number, number, number] = [0.82, 0.27, -0.36];

// Substation covered bay ("Casa de Força") footprint: x in [-15.5, -3.5], z in [-21.5, -5.5]
export const SUBSTATION_BOUNDS = {
  minX: -15.5,
  maxX: -3.5,
  minZ: -21.5,
  maxZ: -5.5,
  roofY: 5.4,
};

export const INTERACTABLES: InteractableDef[] = [
  {
    id: 'valve_v07',
    title: 'Válvula V-07',
    subtitle: 'Purgar condensado da linha de vapor',
    position: [7.6, 1.32, -8.8],
    radius: 3.1,
    holdSeconds: 0.95,
    requiredStep: 'purge_valve',
  },
  {
    id: 'switch_s02',
    title: 'Seccionadora S-02',
    subtitle: 'Isolar ramal antes de rearmar o QGBT',
    position: [-3.3, 1.48, -8.0],
    radius: 3.1,
    holdSeconds: 1.05,
    requiredStep: 'isolate_switch',
  },
  {
    id: 'panel_qgbt04',
    title: 'Quadro Geral QGBT-04',
    subtitle: 'Fechar disjuntor principal da usina',
    position: [-12.6, 1.42, -14.2],
    radius: 3.2,
    holdSeconds: 1.25,
    requiredStep: 'restore_breaker',
  },
  {
    id: 'truck_frota18',
    title: 'Canavieiro Frota 18',
    subtitle: 'Painel em espera · sem energia do pátio',
    position: [4.8, 1.55, 6.2],
    radius: 3.8,
    holdSeconds: 0.35,
  },
];

// Static AABB colliders (world-space X/Z) keeping pathways open and realistic
export const YARD_COLLIDERS: ColliderBox[] = [
  // Cane haulage truck main cab + chassis + trailer (angled slight in yard, bounded cleanly)
  { id: 'truck_cab_body', minX: 1.4, maxX: 7.4, minZ: 1.2, maxZ: 10.6 },
  // Trailer cane rear extension
  { id: 'truck_trailer', minX: 4.5, maxX: 9.8, minZ: -2.2, maxZ: 4.2 },
  // Service welding cart / drum cluster near center-left
  { id: 'service_cart', minX: -10.8, maxX: -7.2, minZ: 9.6, maxZ: 12.6 },
  // Pallet & drum stack near gate right
  { id: 'gate_drums', minX: 8.8, maxX: 11.8, minZ: 18.0, maxZ: 21.0 },
  // Boiler horizontal condensate tank & cradle
  { id: 'condensate_tank', minX: 6.8, maxX: 13.8, minZ: -16.8, maxZ: -10.8 },
  // Twin exhaust chimney plinth
  { id: 'boiler_chimney_base', minX: 15.2, maxX: 21.8, minZ: -21.2, maxZ: -14.4 },
  // Substation west wall (solid back wall)
  { id: 'substation_west_wall', minX: -16.0, maxX: -15.1, minZ: -21.8, maxZ: -5.2 },
  // Substation north back wall
  { id: 'substation_north_wall', minX: -15.6, maxX: -3.2, minZ: -22.0, maxZ: -21.1 },
  // Substation east wall with 4.2m wide doorway around z in [-14.2, -9.8]
  { id: 'substation_east_wall_n', minX: -3.9, maxX: -3.1, minZ: -21.6, maxZ: -14.4 },
  { id: 'substation_east_wall_s', minX: -3.9, maxX: -3.1, minZ: -9.6, maxZ: -5.4 },
  // Substation south wall with 4.4m entry arch around x in [-11.5, -7.1]
  { id: 'substation_south_wall_w', minX: -15.6, maxX: -11.8, minZ: -5.9, maxZ: -5.1 },
  { id: 'substation_south_wall_e', minX: -6.9, maxX: -3.2, minZ: -5.9, maxZ: -5.1 },
  // Interior QGBT-04 cabinet + transformer skids
  { id: 'qgbt_cabinet', minX: -14.8, maxX: -13.1, minZ: -16.6, maxZ: -12.0 },
  { id: 'transformer_skid', minX: -14.7, maxX: -11.4, minZ: -20.5, maxZ: -17.6 },
  // Yard light towers
  { id: 'tower_ne', minX: 18.8, maxX: 20.6, minZ: -3.8, maxZ: -2.0 },
  { id: 'tower_sw', minX: -18.6, maxX: -16.8, minZ: 15.2, maxZ: 17.0 },
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Smooth deterministic 2D value noise for mud ruts & puddles
function hash2(ix: number, iz: number): number {
  const n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

export function noise2D(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

export function fbm2D(x: number, z: number): number {
  let v = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    v += amp * noise2D(x * freq, z * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return v;
}

/**
 * Concrete slab footprint mask [0..1] around the Casa de Força and Boiler Pad.
 */
export function concreteApronMask(x: number, z: number): number {
  const subX = smoothstep(-16.6, -15.8, x) * (1 - smoothstep(-2.8, -1.9, x));
  const subZ = smoothstep(-22.8, -21.9, z) * (1 - smoothstep(-4.2, -3.2, z));
  const subApron = subX * subZ;

  const boilerX = smoothstep(5.2, 6.1, x) * (1 - smoothstep(22.4, 23.4, x));
  const boilerZ = smoothstep(-22.4, -21.4, z) * (1 - smoothstep(-8.2, -7.2, z));
  const boilerApron = boilerX * boilerZ;

  return Math.max(subApron, boilerApron);
}

/**
 * Dual curving wheel-rut depression [0..1] entering from gate (x~-2, z~28) toward truck & yard.
 */
export function tireRutMask(x: number, z: number): number {
  const concrete = concreteApronMask(x, z);
  if (concrete > 0.75) return 0;

  // Main truck path curve center X(z)
  const center = -1.2 + Math.sin(z * 0.085) * 1.6 + smoothstep(14, -4, z) * 4.4;
  const distToLeftTrack = Math.abs(x - (center - 1.18));
  const distToRightTrack = Math.abs(x - (center + 1.18));
  const track = Math.max(
    Math.exp(-(distToLeftTrack * distToLeftTrack) / 0.24),
    Math.exp(-(distToRightTrack * distToRightTrack) / 0.24)
  );
  const fadeEnds = smoothstep(29.5, 24.0, z) * smoothstep(-8.5, -2.0, z);
  return track * fadeEnds * (1 - concrete);
}

/**
 * Continuous ground elevation in meters at world (x, z).
 * Baseline red-earth yard sits around +0.08..+0.22m while sculpted puddle basins
 * dip cleanly below y = 0.015 so mirror puddles sit organically amid wet red clay & mud ruts.
 */
export function groundHeightAt(x: number, z: number): number {
  const concrete = concreteApronMask(x, z);
  const r = Math.max(Math.abs(x), Math.abs(z));
  const berm = smoothstep(27.5, 44.0, r) * 1.45;
  const rollingHills = smoothstep(32.0, 95.0, r) * (noise2D(x * 0.035, z * 0.035) * 6.5 + 1.5);

  const macro = (fbm2D(x * 0.11 + 11.3, z * 0.11 - 4.7) - 0.36) * 0.26;
  const rut = tireRutMask(x, z) * 0.095;

  // Bounded organic rainwater puddle basins along driveway & low yard spots
  const p1 = Math.exp(-((x + 0.9) ** 2 / 6.2 + (z - 17.6) ** 2 / 4.2)) * 0.19;
  const p2 = Math.exp(-((x - 1.4) ** 2 / 7.8 + (z - 11.4) ** 2 / 5.4)) * 0.21;
  const p3 = Math.exp(-((x + 5.8) ** 2 / 5.6 + (z - 3.0) ** 2 / 4.4)) * 0.18;
  const p4 = Math.exp(-((x - 11.4) ** 2 / 6.0 + (z + 2.4) ** 2 / 4.8)) * 0.18;
  const p5 = Math.exp(-((x + 1.2) ** 2 / 5.0 + (z + 5.5) ** 2 / 3.8)) * 0.16;
  const puddleDip = Math.max(p1, p2, p3, p4, p5);

  const dirtY = 0.11 + macro - rut - puddleDip + berm + rollingHills;
  const slabY = 0.135;
  return dirtY * (1 - concrete) + slabY * concrete;
}

/**
 * Returns standing puddle water depth [0..1] at (x, z) for physics/audio/material blend.
 */
export function puddleMaskAt(x: number, z: number): number {
  const concrete = concreteApronMask(x, z);
  if (concrete > 0.6) return 0;
  const h = groundHeightAt(x, z);
  return smoothstep(0.015, -0.04, h);
}

export function surfaceAt(x: number, z: number): SurfaceKind {
  if (concreteApronMask(x, z) > 0.55) return 'concrete';
  if (puddleMaskAt(x, z) > 0.25) return 'puddle';
  return 'mud';
}

/**
 * Resolves circle-vs-AABB collisions and clamps within yard bounds.
 */
export function resolvePlayerMove(
  fromX: number,
  fromZ: number,
  targetX: number,
  targetZ: number,
  radius = PLAYER_RADIUS,
  colliders: ColliderBox[] = YARD_COLLIDERS
): { x: number; z: number } {
  let x = Math.max(-YARD_HALF + radius, Math.min(YARD_HALF - radius, targetX));
  let z = Math.max(-YARD_HALF + radius, Math.min(YARD_HALF - radius, targetZ));

  // Two relaxation passes prevent corner clipping
  for (let pass = 0; pass < 2; pass++) {
    for (const box of colliders) {
      const closestX = Math.max(box.minX, Math.min(x, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(z, box.maxZ));
      const dx = x - closestX;
      const dz = z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          x += (dx / dist) * push;
          z += (dz / dist) * push;
        } else {
          // Inside box fallback: push out toward previous position axis
          const penLeft = Math.abs(x - box.minX);
          const penRight = Math.abs(box.maxX - x);
          const penTop = Math.abs(z - box.minZ);
          const penBottom = Math.abs(box.maxZ - z);
          const m = Math.min(penLeft, penRight, penTop, penBottom);
          if (m === penLeft) x = box.minX - radius;
          else if (m === penRight) x = box.maxX + radius;
          else if (m === penTop) z = box.minZ - radius;
          else z = box.maxZ + radius;
        }
      }
    }
  }

  // Fallback safety if somehow unresolved
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    return { x: fromX, z: fromZ };
  }
  return { x, z };
}

export function createMissionState(): MissionState {
  return {
    step: 'purge_valve',
    valvePurged: false,
    switchIsolated: false,
    breakerRestored: false,
    truckInspected: false,
    activeTargetId: null,
    holdProgress: 0,
    elapsedSeconds: 0,
    climaxProgress: 0,
    radioText: 'RÁDIO OPERAÇÃO: Temporal derrubou o barramento da Casa de Força. Verifique a linha de vapor antes de rearmar.',
    radioTimer: 7.5,
  };
}

export function isInteractableAvailable(def: InteractableDef, state: MissionState): boolean {
  if (state.step === 'restored') return false;
  if (def.id === 'truck_frota18') return !state.truckInspected;
  return def.requiredStep === state.step;
}

export function findFocusedInteractable(
  playerX: number,
  playerY: number,
  playerZ: number,
  lookDirX: number,
  lookDirY: number,
  lookDirZ: number,
  state: MissionState
): InteractableDef | null {
  let best: InteractableDef | null = null;
  let bestScore = -1;

  for (const def of INTERACTABLES) {
    if (!isInteractableAvailable(def, state)) continue;
    const dx = def.position[0] - playerX;
    const dy = def.position[1] - playerY;
    const dz = def.position[2] - playerZ;
    const dist = Math.hypot(dx, dy, dz);
    if (dist > def.radius || dist < 0.1) continue;

    const dot = (dx * lookDirX + dy * lookDirY + dz * lookDirZ) / dist;
    if (dot < 0.62) continue;

    const score = dot * 2 - dist / def.radius;
    if (score > bestScore) {
      bestScore = score;
      best = def;
    }
  }
  return best;
}

export function triggerInteractable(
  state: MissionState,
  id: InteractableDef['id']
): { next: MissionState; event: 'valve' | 'switch' | 'breaker' | 'truck' | null } {
  const next: MissionState = { ...state, holdProgress: 0 };

  if (id === 'truck_frota18' && !state.truckInspected) {
    next.truckInspected = true;
    next.radioText = 'FROTA 18: Caminhão carregado em espera. Sem luz no pátio, a balança e a moenda não liberam descarga.';
    next.radioTimer = 6.5;
    return { next, event: 'truck' };
  }

  if (id === 'valve_v07' && state.step === 'purge_valve') {
    next.valvePurged = true;
    next.step = 'isolate_switch';
    next.radioText = 'PRESSÃO ESTABILIZADA: Condensado drenado. Agora isole o ramal na Seccionadora S-02 fora da galeria.';
    next.radioTimer = 7.0;
    return { next, event: 'valve' };
  }

  if (id === 'switch_s02' && state.step === 'isolate_switch') {
    next.switchIsolated = true;
    next.step = 'restore_breaker';
    next.radioText = 'RAMAL ISOLADO: Arco elétrico contido. Entre na galeria coberta e rearme o Quadro Geral QGBT-04.';
    next.radioTimer = 7.0;
    return { next, event: 'switch' };
  }

  if (id === 'panel_qgbt04' && state.step === 'restore_breaker') {
    next.breakerRestored = true;
    next.step = 'restored';
    next.climaxProgress = 0.01;
    next.radioText = 'BARRAMENTO ENERGIZADO: Turbinas entrando em rotação. Usina Horizonte operando novamente.';
    next.radioTimer = 8.0;
    return { next, event: 'breaker' };
  }

  return { next: state, event: null };
}

export function getObjectiveSummary(step: MissionStepId): { label: string; detail: string } {
  switch (step) {
    case 'purge_valve':
      return {
        label: '1 / 3 · Purgar condensado',
        detail: 'Válvula V-07 junto ao tanque de vapor (setor leste)',
      };
    case 'isolate_switch':
      return {
        label: '2 / 3 · Isolar seccionadora',
        detail: 'Chave S-02 na parede externa da Casa de Força',
      };
    case 'restore_breaker':
      return {
        label: '3 / 3 · Rearmar QGBT-04',
        detail: 'Entrar na passagem coberta e fechar o disjuntor geral',
      };
    case 'restored':
      return {
        label: 'Alimentação restabelecida',
        detail: 'Pátio e moenda energizados para o turno da safra',
      };
  }
}

export function detectSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext | null): boolean {
  if (!gl) return true;
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      const r = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
      if (/swiftshader|llvmpipe|software|mesa offscreen|angle.*swiftshader/i.test(r)) {
        return true;
      }
    }
    const rendererStr = String(gl.getParameter(gl.RENDERER) || '');
    return /swiftshader|llvmpipe|software/i.test(rendererStr);
  } catch {
    return false;
  }
}

export function resolveQualityProfile(
  setting: QualitySetting,
  isSoftwareGl: boolean,
  hardwareConcurrency = 8
): QualityProfile {
  let tier: QualityTier;
  if (setting === 'auto') {
    if (isSoftwareGl) tier = 'baixa';
    else if (hardwareConcurrency <= 4) tier = 'media';
    else tier = 'alta';
  } else {
    tier = setting;
  }

  if (tier === 'alta') {
    return {
      tier: 'alta',
      pixelRatioCap: isSoftwareGl ? 1.0 : 2.0,
      shadowMapSize: isSoftwareGl ? 1024 : 2048,
      shadowsEnabled: true,
      planarReflectionScale: 0.5,
      postEnabled: true,
      aoEnabled: true,
      volumetricsEnabled: true,
      bloomEnabled: true,
      caneCount: 2200,
      envMapSize: 256,
    };
  }

  if (tier === 'media') {
    return {
      tier: 'media',
      pixelRatioCap: isSoftwareGl ? 1.0 : 1.35,
      shadowMapSize: 1024,
      shadowsEnabled: true,
      planarReflectionScale: 0.35,
      postEnabled: true,
      aoEnabled: false,
      volumetricsEnabled: true,
      bloomEnabled: true,
      caneCount: 1350,
      envMapSize: 128,
    };
  }

  return {
    tier: 'baixa',
    pixelRatioCap: 1.0,
    shadowMapSize: 512,
    shadowsEnabled: false,
    planarReflectionScale: 0,
    postEnabled: false,
    aoEnabled: false,
    volumetricsEnabled: false,
    bloomEnabled: false,
    caneCount: 850,
    envMapSize: 64,
  };
}
