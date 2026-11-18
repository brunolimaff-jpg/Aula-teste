import * as THREE from 'three/webgpu';
import {
  abs,
  clamp,
  color as tslColor,
  cos,
  dot,
  float,
  mix,
  normalMap,
  normalWorld,
  positionWorld,
  sin,
  smoothstep,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl';
import type { CC0TextureId, TextureLibrary } from './textures';

export type MaterialKind =
  | 'terra'
  | 'estrada'
  | 'capim'
  | 'concreto'
  | 'asfalto'
  | 'chapa'
  | 'ferrugem'
  | 'tinta'
  | 'reboco'
  | 'madeira'
  | 'liso'
  | 'borracha'
  | 'aco'
  | 'lona';

export interface MaterialFactoryOptions {
  color?: number | string;
  repeat?: [number, number];
  roughness?: number;
  metalness?: number;
  dust?: number;
  side?: THREE.Side;
}

const KIND_TO_CC0: Record<MaterialKind, CC0TextureId | null> = {
  terra: 'brown_mud_02',
  estrada: 'gravel_ground_01',
  capim: 'sparse_grass',
  concreto: 'concrete_floor_worn_001',
  asfalto: 'asphalt_02',
  chapa: 'corrugated_iron_02',
  ferrugem: 'rust_coarse_01',
  tinta: 'blue_metal_plate',
  reboco: 'blue_plaster_wall',
  madeira: 'rough_wood',
  liso: null,
  borracha: null,
  aco: 'blue_metal_plate',
  lona: 'blue_plaster_wall',
};

export class MaterialBank {
  public readonly dustIntensity = uniform(0.45);
  public readonly groundWetness = uniform(0.8);
  private readonly texLib: TextureLibrary;
  private readonly cache = new Map<string, THREE.MeshStandardNodeMaterial>();

  public readonly glass: THREE.MeshStandardNodeMaterial;
  public readonly water: THREE.MeshStandardNodeMaterial;

  constructor(texLib: TextureLibrary) {
    this.texLib = texLib;

    this.glass = new THREE.MeshStandardNodeMaterial({
      color: 0x1b2e33,
      roughness: 0.06,
      metalness: 0.35,
      transparent: true,
      opacity: 0.74,
    });

    this.water = this.createWaterMaterial();
  }

  public get(kind: MaterialKind, opts: MaterialFactoryOptions = {}): THREE.MeshStandardNodeMaterial {
    const colHex = opts.color !== undefined ? new THREE.Color(opts.color).getHexString() : 'def';
    const rx = opts.repeat?.[0] ?? 1;
    const ry = opts.repeat?.[1] ?? 1;
    const dust = opts.dust ?? (kind === 'aco' || kind === 'reboco' ? 0.25 : 0.75);
    const key = `${kind}:${colHex}:${rx}x${ry}:${opts.roughness ?? ''}:${opts.metalness ?? ''}:${dust}:${opts.side ?? 0}`;

    const cached = this.cache.get(key);
    if (cached) return cached;

    const cc0Id = KIND_TO_CC0[kind];
    const tint =
      opts.color !== undefined
        ? new THREE.Color(opts.color)
        : kind === 'terra'
          ? new THREE.Color('#8f3820') // Mato Grosso rich red earth
          : kind === 'reboco'
            ? new THREE.Color('#f0ebe0')
            : kind === 'tinta'
              ? new THREE.Color('#e0d8c8')
              : kind === 'aco'
                ? new THREE.Color('#aab4b8')
                : kind === 'lona'
                  ? new THREE.Color('#ede4cf')
                  : kind === 'borracha'
                    ? new THREE.Color('#0f1112')
                    : new THREE.Color('#ffffff');

    const mat = new THREE.MeshStandardNodeMaterial({
      color: 0xffffff,
      roughness:
        opts.roughness ??
        (kind === 'aco'
          ? 0.34
          : kind === 'tinta'
            ? 0.48
            : kind === 'borracha'
              ? 0.94
              : kind === 'liso'
                ? 0.58
                : 0.84),
      metalness:
        opts.metalness ??
        (kind === 'aco'
          ? 0.82
          : kind === 'chapa'
            ? 0.52
            : kind === 'ferrugem'
              ? 0.38
              : kind === 'tinta'
                ? 0.22
                : kind === 'borracha'
                  ? 0.0
                  : 0.04),
      side: opts.side ?? THREE.FrontSide,
    });

    if (cc0Id) {
      const set = this.texLib.sets[cc0Id];
      const uvNode = uv().mul(vec2(rx, ry));
      const diffSample = texture(set.diff, uvNode).rgb;
      const armSample = texture(set.arm, uvNode);

      // Base tinted color (extract luminance variation on painted/metallic/plaster materials so blue CC0 textures never darken/shift paint hue)
      let colNode: any;
      if (kind === 'tinta' || kind === 'aco' || kind === 'lona' || kind === 'reboco') {
        const lum = dot(diffSample, vec3(0.3, 0.59, 0.11)).mul(0.42).add(0.76);
        colNode = vec3(tint.r, tint.g, tint.b).mul(lum);
      } else {
        colNode = diffSample.mul(tslColor(tint));
      }

      // World-space red-earth dust & wear near the ground
      if (dust > 0) {
        const dustHeight = smoothstep(1.9, 0.0, positionWorld.y);
        const upward = clamp(normalWorld.y.mul(0.5).add(0.5), 0.2, 1.0);
        const dustMask = dustHeight.mul(upward).mul(this.dustIntensity).mul(float(dust)).clamp(0, 0.65);
        colNode = mix(colNode, vec3(0.36, 0.14, 0.07), dustMask);
      }

      mat.colorNode = colNode;
      mat.normalMap = set.nor;
      const nScale = kind === 'concreto' || kind === 'asfalto' ? 0.42 : 0.72;
      mat.normalScale = new THREE.Vector2(nScale, nScale);
      mat.aoNode = armSample.r;
      mat.roughnessNode = clamp(
        armSample.g.mul(opts.roughness ?? 1.0),
        kind === 'concreto' ? 0.45 : 0.14,
        0.98,
      );
      if (kind === 'aco' || kind === 'chapa' || kind === 'ferrugem' || kind === 'tinta') {
        mat.metalnessNode = clamp(armSample.b.max(float(mat.metalness)), 0.0, 0.92);
      }
    } else {
      const baseCol = vec3(tint.r, tint.g, tint.b);
      if (dust > 0 && kind !== 'borracha') {
        const dustMask = smoothstep(1.5, 0.0, positionWorld.y)
          .mul(this.dustIntensity)
          .mul(float(dust * 0.5))
          .clamp(0, 0.45);
        mat.colorNode = mix(baseCol, vec3(0.36, 0.14, 0.07), dustMask);
      } else {
        mat.colorNode = baseCol;
      }
    }

    this.cache.set(key, mat);
    return mat;
  }

  public createTerrainMaterial(): THREE.MeshStandardNodeMaterial {
    const terra = this.texLib.sets.brown_mud_02;
    const estrada = this.texLib.sets.gravel_ground_01;
    const capim = this.texLib.sets.sparse_grass;
    const concreto = this.texLib.sets.concrete_floor_worn_001;
    const asfalto = this.texLib.sets.asphalt_02;

    // Mask UV covers x in [-220, 220], z in [-110, 110]
    const maskUV = vec2(
      positionWorld.x.add(220).div(440),
      positionWorld.z.add(110).div(220),
    ).clamp(0.001, 0.999);
    const mask = texture(this.texLib.groundMaskTex, maskUV);

    const worldUV = positionWorld.xz.mul(0.22);
    const roadUV = positionWorld.xz.mul(0.34);

    const terraCol = texture(terra.diff, worldUV).rgb.mul(vec3(0.72, 0.31, 0.18));
    const estradaCol = texture(estrada.diff, roadUV).rgb.mul(vec3(0.86, 0.58, 0.42));
    const capimCol = texture(capim.diff, worldUV.mul(1.1)).rgb.mul(vec3(0.68, 0.84, 0.52));
    const concretoCol = texture(concreto.diff, worldUV.mul(0.85)).rgb.mul(vec3(0.62, 0.61, 0.58));
    const asfaltoCol = texture(asfalto.diff, roadUV).rgb.mul(vec3(0.38, 0.4, 0.44));

    // Asphalt is encoded where both R > 0.6 and B > 0.6
    const wAsphalt = smoothstep(0.65, 0.85, mask.r.min(mask.b));
    const wGravel = mask.r.sub(wAsphalt).clamp(0, 1);
    const wConcrete = mask.b.sub(wAsphalt).clamp(0, 1);
    const wGrass = mask.g.mul(float(1).sub(wGravel.max(wConcrete).max(wAsphalt)).clamp(0, 1));

    let col = terraCol;
    col = mix(col, capimCol, wGrass);
    col = mix(col, estradaCol, wGravel);
    col = mix(col, concretoCol, wConcrete);
    col = mix(col, asfaltoCol, wAsphalt);

    // Subtle macro tonal variation across hectares so terrain never looks tiled
    const macroNoise = sin(positionWorld.x.mul(0.06)).mul(sin(positionWorld.z.mul(0.07))).mul(0.08).add(0.96);
    col = col.mul(macroNoise);

    // Morning damp darkening on dirt/gravel roads
    const damp = this.groundWetness.mul(wGravel.add(float(0.35)).clamp(0, 1)).mul(0.28);
    col = col.mul(float(1).sub(damp));

    const roughBase = float(0.9)
      .sub(wAsphalt.mul(0.14))
      .sub(damp.mul(0.32))
      .clamp(0.42, 0.96);

    const wFlat = wConcrete.max(wAsphalt).clamp(0, 1);
    const terraNor = texture(terra.nor, worldUV).rgb;
    const flatNor = texture(concreto.nor, worldUV.mul(0.85)).rgb;
    const nScale = mix(float(0.48), float(0.16), wFlat);

    const mat = new THREE.MeshStandardNodeMaterial({
      metalness: 0.02,
    });
    mat.colorNode = col;
    mat.roughnessNode = roughBase;
    mat.normalNode = normalMap(mix(terraNor, flatNor, wFlat), vec2(nScale, nScale));
    return mat;
  }

  private createWaterMaterial(): THREE.MeshStandardNodeMaterial {
    const mat = new THREE.MeshStandardNodeMaterial({
      roughness: 0.11,
      metalness: 0.25,
    });

    const p = positionWorld.xz;
    const wave1 = sin(p.x.mul(0.45).add(time.mul(1.4))).mul(cos(p.y.mul(0.35).sub(time.mul(1.1))));
    const wave2 = sin(p.x.mul(1.1).sub(p.y.mul(0.8)).add(time.mul(2.1)));
    const crest = wave1.mul(0.5).add(wave2.mul(0.5));

    // Shoreline foam near quay wall x ~ 108..112
    const shore = smoothstep(113.5, 108.2, positionWorld.x);
    const foamNoise = smoothstep(0.2, 0.75, abs(wave2).mul(0.65).add(shore.mul(0.45)));
    const foam = shore.mul(foamNoise).mul(0.55);

    const deepColor = vec3(0.05, 0.21, 0.28);
    const shallowColor = vec3(0.11, 0.38, 0.44);
    const waterCol = mix(deepColor, shallowColor, crest.mul(0.3).add(0.4).add(shore.mul(0.35)));
    mat.colorNode = mix(waterCol, vec3(0.84, 0.9, 0.92), foam);
    mat.roughnessNode = mix(float(0.08), float(0.42), foam);
    return mat;
  }
}
