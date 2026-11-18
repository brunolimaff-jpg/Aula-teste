export type QualityTier = 'alta' | 'media' | 'baixa';
export type QualitySetting = 'auto' | QualityTier;

export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type MissionStepId =
  | 'purge_valve'
  | 'isolate_switch'
  | 'restore_breaker'
  | 'restored';

export type SurfaceKind = 'concrete' | 'puddle' | 'mud';

export interface InteractableDef {
  id: 'valve_v07' | 'switch_s02' | 'panel_qgbt04' | 'truck_frota18';
  title: string;
  subtitle: string;
  position: [number, number, number];
  radius: number;
  holdSeconds: number;
  requiredStep?: MissionStepId;
}

export interface ColliderBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface MissionState {
  step: MissionStepId;
  valvePurged: boolean;
  switchIsolated: boolean;
  breakerRestored: boolean;
  truckInspected: boolean;
  activeTargetId: InteractableDef['id'] | null;
  holdProgress: number;
  elapsedSeconds: number;
  climaxProgress: number;
  radioText: string | null;
  radioTimer: number;
}

export interface QualityProfile {
  tier: QualityTier;
  pixelRatioCap: number;
  shadowMapSize: number;
  shadowsEnabled: boolean;
  planarReflectionScale: number;
  postEnabled: boolean;
  aoEnabled: boolean;
  volumetricsEnabled: boolean;
  bloomEnabled: boolean;
  caneCount: number;
  envMapSize: number;
}

export interface PerfSnapshot {
  fps: number;
  frameMsAvg: number;
  frameMsMax: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  quality: QualityTier;
  isSoftwareGl: boolean;
  state: GameState;
  step: MissionStepId;
}

export interface RedDustBridge {
  getState: () => GameState;
  getMission: () => MissionState;
  getPlayerPos: () => { x: number; y: number; z: number; yaw: number; pitch: number };
  teleport: (x: number, y: number, z: number, yaw?: number, pitch?: number) => void;
  setRenderPaused: (paused: boolean) => void;
  setQuality: (q: QualitySetting) => void;
  completeCurrentStep: () => void;
  startGame: () => void;
  restartGame: () => void;
  getPerf: () => PerfSnapshot;
}
