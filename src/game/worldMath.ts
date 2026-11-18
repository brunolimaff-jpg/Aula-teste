import { PARADAS } from './data';

export interface AABB2D {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export interface Circle2D {
  x: number;
  z: number;
  r: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Computes the deterministic world ground elevation (in meters) at (x, z).
 * - Graded flat yards & main roadway (z near 0 and every stop yard) stay near y=0
 *   so buildings, vehicles, workers, and dock decks remain level with zero floating.
 * - Beyond the graded corridor and yards, Mato Grosso red-earth hills & cerrado
 *   undulate gently up to ~5m, while dropping smoothly at the port channel (x > 107).
 */
export function groundHeightAt(x: number, z: number): number {
  // Harbour basin drops below sea level past the quay wall at x = 108.
  if (x >= 108) {
    const t = smoothstep(108, 122, x);
    return -3.2 * t;
  }
  // Gentle approach to quay wall
  if (x > 103) {
    return 0;
  }

  // Rolling Mato Grosso macro relief outside the corridor
  const macro =
    Math.sin(x * 0.022 + 0.7) * Math.cos(z * 0.026 - 0.3) * 2.4 +
    Math.sin(x * 0.055 - z * 0.04) * 0.65 +
    Math.max(0, (Math.abs(z) - 42) * 0.085);

  // Flatten mask along main road (z in [-5.5, 5.5])
  let flatWeight = 1 - smoothstep(4.5, 16.0, Math.abs(z));

  // Flatten around all 10 stop corridors & yards
  for (const p of PARADAS) {
    const dx = Math.abs(x - p.x);
    const dz = Math.abs(z - p.nz);
    const inYard = (1 - smoothstep(10, 22, dx)) * (1 - smoothstep(10, 20, dz));
    const inBranch = (1 - smoothstep(3.5, 9, dx)) * (1 - smoothstep(0, Math.abs(p.nz) + 6, Math.abs(z)));
    flatWeight = Math.max(flatWeight, inYard, inBranch * 0.9);
  }

  // Flatten harvester active track (z ~ -27, x in [-72, -24])
  const inHarv = (1 - smoothstep(26, 38, Math.abs(x + 48))) * (1 - smoothstep(5, 14, Math.abs(z + 27)));
  flatWeight = Math.max(flatWeight, inHarv);

  // Flatten industrial complex footprint (x in [-4, 102], z in [-28, 30])
  const inIndZone = (1 - smoothstep(50, 58, Math.abs(x - 49))) * (1 - smoothstep(22, 34, Math.abs(z)));
  flatWeight = Math.max(flatWeight, inIndZone * 0.95);

  const h = macro * (1 - Math.min(1, flatWeight));
  return Math.abs(h) < 1e-6 ? 0 : h;
}

export type SurfaceType = 'terra' | 'estrada' | 'capim' | 'concreto' | 'asfalto';

/**
 * Classifies ground surface weights at (x, z) for both terrain splat synthesis
 * and footstep sound selection.
 */
export function roadDistanceAt(x: number, z: number): number {
  let d = x <= 106 ? Math.abs(z) : 999;
  for (const p of PARADAS) {
    const minZ = Math.min(0, p.nz);
    const maxZ = Math.max(0, p.nz);
    const cz = Math.max(minZ, Math.min(maxZ, z));
    const bd = Math.hypot(x - p.x, z - cz);
    if (bd < d) d = bd;
  }
  return d;
}

export function isHarvesterTrackAt(x: number, z: number): boolean {
  return x >= -68 && x <= -28 && Math.abs(z + 27) < 2.2;
}

export function isCaneExclusionAt(x: number, z: number): boolean {
  if (Math.abs(z) < 6.6) return true;
  if (x > 6 && x < 112) return true;
  if (x > 106) return true;
  if (isHarvesterTrackAt(x, z)) return true;
  for (const p of PARADAS) {
    if (p.id === 'geo' || p.id === 'agri') continue;
    if (Math.hypot(x - p.x, z - p.nz) < 15.5) return true;
  }
  return false;
}

export class CollisionWorld {
  public readonly boxes: AABB2D[] = [];
  public readonly circles: Circle2D[] = [];

  public addBox(cx: number, cz: number, w: number, d: number, pad = 0.5): void {
    this.boxes.push({
      x0: cx - w * 0.5 - pad,
      x1: cx + w * 0.5 + pad,
      z0: cz - d * 0.5 - pad,
      z1: cz + d * 0.5 + pad,
    });
  }

  public addCircle(x: number, z: number, r: number): void {
    this.circles.push({ x, z, r });
  }

  public isBlocked(x: number, z: number, dynamicCircles: Circle2D[] = []): boolean {
    if (x < -140 || x > 106 || z < -62 || z > 62) return true;
    for (const c of this.circles) {
      if (Math.hypot(x - c.x, z - c.z) < c.r) return true;
    }
    for (const b of this.boxes) {
      if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return true;
    }
    for (const dc of dynamicCircles) {
      if (Math.hypot(x - dc.x, z - dc.z) < dc.r) return true;
    }
    return false;
  }

  public clear(): void {
    this.boxes.length = 0;
    this.circles.length = 0;
  }
}
