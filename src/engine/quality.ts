import type { ConcreteQuality } from '../game/rules';

export interface HardwareCapability {
  detectedQuality: ConcreteQuality;
  reason: string;
  hasWebGPU: boolean;
  isSoftwareRenderer: boolean;
  isCoarsePointer: boolean;
  glRendererString: string;
}

export interface QualityBudget {
  quality: ConcreteQuality;
  isSoftwareRenderer: boolean;
  useWebGPU: boolean;
  maxPixelRatio: number;
  shadowMapSize: number;
  shadowCascades: number;
  enableShadows: boolean;
  enableAO: boolean;
  enableSSGI: boolean;
  enableGodrays: boolean;
  enableBloom: boolean;
  enableFXAA: boolean;
  enableVolumetricClouds: boolean;
  caneLod0Radius: number;
  caneDensityScale: number;
  grassCountScale: number;
  dustParticleCount: number;
  enableSecondaryLights: boolean;
}

export async function probeHardwareCapability(): Promise<HardwareCapability> {
  const isCoarsePointer =
    typeof window !== 'undefined' && matchMedia('(pointer:coarse)').matches;

  let glRendererString = '';
  let isSoftwareRenderer = false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        glRendererString = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
      }
      if (/swiftshader|llvmpipe|software|basic render/i.test(glRendererString)) {
        isSoftwareRenderer = true;
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    // ignore WebGL probe failure
  }

  let hasWebGPU = false;
  try {
    const navGpu = (navigator as unknown as { gpu?: { requestAdapter: (opts?: unknown) => Promise<unknown> } }).gpu;
    if (navGpu && typeof navGpu.requestAdapter === 'function') {
      const adapter = await navGpu.requestAdapter({ powerPreference: 'high-performance' });
      hasWebGPU = Boolean(adapter);
    }
  } catch {
    hasWebGPU = false;
  }

  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;

  let detectedQuality: ConcreteQuality = 'media';
  let reason = 'notebook corporativo típico';

  if (isCoarsePointer) {
    detectedQuality = 'baixa';
    reason = 'celular ou tablet';
  } else if (isSoftwareRenderer) {
    detectedQuality = 'baixa';
    reason = 'renderização por software (sem GPU real)';
  } else if (/nvidia|radeon rx|geforce|rtx|gtx|apple m[1-4]/i.test(glRendererString) && cores >= 8) {
    detectedQuality = 'alta';
    reason = hasWebGPU ? 'GPU dedicada + WebGPU' : 'GPU dedicada detectada';
  } else if (cores >= 8 && mem >= 8) {
    detectedQuality = 'media';
    reason = hasWebGPU ? 'vídeo integrado + WebGPU' : 'notebook corporativo típico';
  } else {
    detectedQuality = 'baixa';
    reason = 'aparelho modesto (fallback WebGL)';
  }

  return {
    detectedQuality,
    reason,
    hasWebGPU,
    isSoftwareRenderer,
    isCoarsePointer,
    glRendererString,
  };
}

export function buildQualityBudget(
  quality: ConcreteQuality,
  cap: HardwareCapability,
): QualityBudget {
  if (quality === 'alta') {
    const cpuGuarded = cap.isSoftwareRenderer;
    return {
      quality: 'alta',
      isSoftwareRenderer: cpuGuarded,
      useWebGPU: cap.hasWebGPU && !cpuGuarded,
      maxPixelRatio: cpuGuarded ? 1.0 : 1.5,
      shadowMapSize: cpuGuarded ? 1024 : 2048,
      shadowCascades: cpuGuarded ? 2 : 3,
      enableShadows: true,
      enableAO: !cpuGuarded,
      enableSSGI: cap.hasWebGPU && !cpuGuarded,
      enableGodrays: !cpuGuarded,
      enableBloom: !cpuGuarded,
      enableFXAA: !cpuGuarded,
      enableVolumetricClouds: !cpuGuarded,
      caneLod0Radius: 26,
      caneDensityScale: 1.0,
      grassCountScale: 1.0,
      dustParticleCount: 300,
      enableSecondaryLights: true,
    };
  }

  if (quality === 'media') {
    const cpuGuarded = cap.isSoftwareRenderer;
    return {
      quality: 'media',
      isSoftwareRenderer: cpuGuarded,
      useWebGPU: cap.hasWebGPU && !cpuGuarded,
      maxPixelRatio: 1.0,
      shadowMapSize: 1024,
      shadowCascades: 2,
      enableShadows: !cpuGuarded,
      enableAO: !cpuGuarded,
      enableSSGI: false,
      enableGodrays: false,
      enableBloom: !cpuGuarded,
      enableFXAA: !cpuGuarded,
      enableVolumetricClouds: !cpuGuarded,
      caneLod0Radius: 16,
      caneDensityScale: 0.72,
      grassCountScale: 0.65,
      dustParticleCount: 180,
      enableSecondaryLights: true,
    };
  }

  return {
    quality: 'baixa',
    isSoftwareRenderer: cap.isSoftwareRenderer,
    useWebGPU: false, // Explicit WebGL fallback
    maxPixelRatio: 1.0,
    shadowMapSize: 1024,
    shadowCascades: 1,
    enableShadows: !cap.isSoftwareRenderer,
    enableAO: false,
    enableSSGI: false,
    enableGodrays: false,
    enableBloom: false,
    enableFXAA: false,
    enableVolumetricClouds: !cap.isSoftwareRenderer,
    caneLod0Radius: 0, // LOD1 + LOD2 only
    caneDensityScale: cap.isSoftwareRenderer ? 0.35 : 0.5,
    grassCountScale: cap.isSoftwareRenderer ? 0.25 : 0.35,
    dustParticleCount: 80,
    enableSecondaryLights: false,
  };
}
