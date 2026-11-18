import * as THREE from 'three';
import type { TextureBank } from './textures';

export interface WearOptions {
  wearStrength?: number;
  mudHeight?: number;
  rustStrength?: number;
  wetStrength?: number;
  detailScale?: number;
}

export interface MaterialBank {
  clipUniform: { value: number };
  timeUniform: { value: number };
  paintTeal: THREE.MeshStandardMaterial;
  paintOchreTruck: THREE.MeshStandardMaterial;
  paintSafetyAmber: THREE.MeshStandardMaterial;
  paintPanelGrey: THREE.MeshStandardMaterial;
  rustIron: THREE.MeshStandardMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  bareSteel: THREE.MeshStandardMaterial;
  corrugatedZinc: THREE.MeshStandardMaterial;
  concreteWall: THREE.MeshStandardMaterial;
  rubberTire: THREE.MeshStandardMaterial;
  hazardStripe: THREE.MeshStandardMaterial;
  cabGlass: THREE.MeshPhysicalMaterial;
  caneStalk: THREE.MeshStandardMaterial;
  woodCrate: THREE.MeshStandardMaterial;
  copperCoil: THREE.MeshStandardMaterial;
  ledRed: THREE.MeshStandardMaterial;
  ledGreen: THREE.MeshStandardMaterial;
  sodiumLamp: THREE.MeshStandardMaterial;
  headlightLamp: THREE.MeshStandardMaterial;
  amberBeacon: THREE.MeshStandardMaterial;
  dispose: () => void;
}

const WEAR_VERT_PARS = /* glsl */ `
varying vec3 vRdWorldPos;
varying vec3 vRdWorldNorm;
`;

const WEAR_VERT_BODY = /* glsl */ `
vec4 rdWp = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  rdWp = batchingMatrix * rdWp;
#endif
#ifdef USE_INSTANCING
  rdWp = instanceMatrix * rdWp;
#endif
rdWp = modelMatrix * rdWp;
vRdWorldPos = rdWp.xyz;
vec3 rdWn = objectNormal;
#ifdef USE_INSTANCING
  rdWn = mat3( instanceMatrix ) * rdWn;
#endif
vRdWorldNorm = normalize( mat3( modelMatrix ) * rdWn );
`;

const WEAR_FRAG_PARS = /* glsl */ `
varying vec3 vRdWorldPos;
varying vec3 vRdWorldNorm;
uniform float uClipBelowY;
uniform float uWearStrength;
uniform float uMudHeight;
uniform float uRustStrength;
uniform float uWetStrength;

float rdHash3( vec3 p ) {
  p = fract( p * vec3( 0.1031, 0.1030, 0.0973 ) );
  p += dot( p, p.yxz + 33.33 );
  return fract( ( p.x + p.y ) * p.z );
}

float rdNoise3( vec3 p ) {
  vec3 i = floor( p );
  vec3 f = fract( p );
  vec3 u = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix(
      mix( rdHash3( i + vec3(0,0,0) ), rdHash3( i + vec3(1,0,0) ), u.x ),
      mix( rdHash3( i + vec3(0,1,0) ), rdHash3( i + vec3(1,1,0) ), u.x ),
      u.y
    ),
    mix(
      mix( rdHash3( i + vec3(0,0,1) ), rdHash3( i + vec3(1,0,1) ), u.x ),
      mix( rdHash3( i + vec3(0,1,1) ), rdHash3( i + vec3(1,1,1) ), u.x ),
      u.y
    ),
    u.z
  );
}
`;

export function applyRedDustWear(
  mat: THREE.MeshStandardMaterial,
  clipUniform: { value: number },
  opts: WearOptions = {}
): THREE.MeshStandardMaterial {
  const wearStrength = opts.wearStrength ?? 0.55;
  const mudHeight = opts.mudHeight ?? 0.72;
  const rustStrength = opts.rustStrength ?? 0.5;
  const wetStrength = opts.wetStrength ?? 0.65;

  const key = `rd-wear-${wearStrength.toFixed(2)}-${mudHeight.toFixed(2)}-${rustStrength.toFixed(2)}-${wetStrength.toFixed(2)}`;
  mat.customProgramCacheKey = () => key;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uClipBelowY = clipUniform;
    shader.uniforms.uWearStrength = { value: wearStrength };
    shader.uniforms.uMudHeight = { value: mudHeight };
    shader.uniforms.uRustStrength = { value: rustStrength };
    shader.uniforms.uWetStrength = { value: wetStrength };

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${WEAR_VERT_PARS}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\n${WEAR_VERT_BODY}`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${WEAR_FRAG_PARS}`)
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        if ( uClipBelowY > 0.5 && vRdWorldPos.y < 0.012 ) discard;`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float rdMacro = rdNoise3( vRdWorldPos * 1.35 );
        float rdMicro = rdNoise3( vRdWorldPos * 11.5 );
        // Vertical downward rust & rain streaks (-Y elongation)
        float rdStreak = rdNoise3( vec3( vRdWorldPos.x * 5.2, vRdWorldPos.y * 0.75, vRdWorldPos.z * 5.2 ) );
        float rdRustMask = smoothstep( 0.58, 0.84, rdMacro * 0.62 + rdStreak * 0.52 ) * uRustStrength;
        float rdChipMask = smoothstep( 0.70, 0.86, rdMacro * 0.55 + rdMicro * 0.55 ) * uWearStrength;

        // Paint chip -> grey primer -> deep oxidized rust core
        vec3 rdPrimer = vec3( 0.27, 0.29, 0.31 );
        vec3 rdRust = mix( vec3( 0.24, 0.088, 0.036 ), vec3( 0.14, 0.052, 0.025 ), rdMicro );
        diffuseColor.rgb = mix( diffuseColor.rgb, rdPrimer, rdChipMask * 0.75 );
        diffuseColor.rgb = mix( diffuseColor.rgb, rdRust, clamp( rdRustMask + rdChipMask * 0.65, 0.0, 0.92 ) );

        // Red laterite mud splatter near ground level
        float rdMudSplash = smoothstep( uMudHeight, 0.04, vRdWorldPos.y + ( rdMacro - 0.5 ) * 0.34 )
          * smoothstep( 0.28, 0.75, rdMicro * 0.65 + rdMacro * 0.45 );
        vec3 rdLateriteMud = mix( vec3( 0.145, 0.048, 0.024 ), vec3( 0.23, 0.075, 0.036 ), rdMicro );
        diffuseColor.rgb = mix( diffuseColor.rgb, rdLateriteMud, clamp( rdMudSplash * 0.9, 0.0, 0.92 ) );

        // Subtle post-storm darkening on upward wet faces
        float rdTopWet = smoothstep( 0.15, 0.82, vRdWorldNorm.y ) * uWetStrength;
        diffuseColor.rgb *= mix( 1.0, 0.78, rdTopWet * ( 0.4 + 0.6 * rdMacro ) );`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        float rdGrainR = rdNoise3( vRdWorldPos * 8.0 );
        float rdTopWetR = smoothstep( 0.15, 0.85, vRdWorldNorm.y ) * uWetStrength;
        roughnessFactor = clamp( roughnessFactor + ( rdGrainR - 0.5 ) * 0.14, 0.06, 0.98 );
        roughnessFactor = mix( roughnessFactor, max( 0.12, roughnessFactor * 0.45 ), rdTopWetR );`
      );
  };

  return mat;
}

export function createMaterialBank(tex: TextureBank): MaterialBank {
  const clipUniform = { value: 0 };
  const timeUniform = { value: 0 };

  const detailScale = new THREE.Vector2(0.45, 0.45);

  const paintTeal = applyRedDustWear(
    new THREE.MeshStandardMaterial({
      color: 0x0f5a51,
      roughness: 0.46,
      metalness: 0.28,
      normalMap: tex.detailNormal,
      normalScale: detailScale,
    }),
    clipUniform,
    { wearStrength: 0.6, rustStrength: 0.55, mudHeight: 0.8 }
  );

  const paintOchreTruck = applyRedDustWear(
    new THREE.MeshStandardMaterial({
      color: 0xa6461f,
      roughness: 0.42,
      metalness: 0.34,
      normalMap: tex.detailNormal,
      normalScale: detailScale,
    }),
    clipUniform,
    { wearStrength: 0.62, rustStrength: 0.48, mudHeight: 1.05 }
  );

  const paintSafetyAmber = applyRedDustWear(
    new THREE.MeshStandardMaterial({
      color: 0xc98319,
      roughness: 0.48,
      metalness: 0.22,
      normalMap: tex.detailNormal,
      normalScale: detailScale,
    }),
    clipUniform,
    { wearStrength: 0.52, rustStrength: 0.45, mudHeight: 0.65 }
  );

  const paintPanelGrey = applyRedDustWear(
    new THREE.MeshStandardMaterial({
      color: 0x525b5e,
      roughness: 0.52,
      metalness: 0.35,
      normalMap: tex.detailNormal,
      normalScale: detailScale,
    }),
    clipUniform,
    { wearStrength: 0.45, rustStrength: 0.42, mudHeight: 0.55 }
  );

  const rustIron = applyRedDustWear(
    new THREE.MeshStandardMaterial({
      color: 0x4b362b,
      roughness: 0.72,
      metalness: 0.62,
      normalMap: tex.detailNormal,
      normalScale: new THREE.Vector2(0.65, 0.65),
    }),
    clipUniform,
    { wearStrength: 0.4, rustStrength: 0.85, mudHeight: 0.7 }
  );

  const darkSteel = applyRedDustWear(
    new THREE.MeshStandardMaterial({
      color: 0x222629,
      roughness: 0.5,
      metalness: 0.78,
      normalMap: tex.detailNormal,
      normalScale: detailScale,
    }),
    clipUniform,
    { wearStrength: 0.35, rustStrength: 0.4, mudHeight: 0.85 }
  );

  const bareSteel = applyRedDustWear(
    new THREE.MeshStandardMaterial({
      color: 0x8d959b,
      roughness: 0.32,
      metalness: 0.9,
      normalMap: tex.detailNormal,
      normalScale: new THREE.Vector2(0.3, 0.3),
    }),
    clipUniform,
    { wearStrength: 0.15, rustStrength: 0.2, mudHeight: 0.45 }
  );

  const corrugatedZinc = applyRedDustWear(
    new THREE.MeshStandardMaterial({
      map: tex.corrugatedAlbedo,
      normalMap: tex.corrugatedNormal,
      normalScale: new THREE.Vector2(1.15, 1.15),
      roughness: 0.54,
      metalness: 0.72,
      side: THREE.DoubleSide,
    }),
    clipUniform,
    { wearStrength: 0.42, rustStrength: 0.75, mudHeight: 0.5 }
  );

  const concreteWall = applyRedDustWear(
    new THREE.MeshStandardMaterial({
      color: 0x6c6861,
      map: tex.detail,
      normalMap: tex.detailNormal,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughness: 0.88,
      metalness: 0.02,
    }),
    clipUniform,
    { wearStrength: 0.15, rustStrength: 0.25, mudHeight: 0.95, wetStrength: 0.5 }
  );

  const rubberTire = applyRedDustWear(
    new THREE.MeshStandardMaterial({
      color: 0x181819,
      roughness: 0.84,
      metalness: 0.04,
      bumpMap: tex.tireTread,
      bumpScale: 0.06,
    }),
    clipUniform,
    { wearStrength: 0.05, rustStrength: 0.0, mudHeight: 0.92, wetStrength: 0.75 }
  );

  const hazardStripe = applyRedDustWear(
    new THREE.MeshStandardMaterial({
      map: tex.hazard,
      roughness: 0.56,
      metalness: 0.18,
    }),
    clipUniform,
    { wearStrength: 0.4, rustStrength: 0.35, mudHeight: 0.6 }
  );

  const cabGlass = new THREE.MeshPhysicalMaterial({
    color: 0x8fb0b8,
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.46,
    ior: 1.5,
    reflectivity: 0.9,
  });

  const caneStalk = new THREE.MeshStandardMaterial({
    color: 0x627c3a,
    roughness: 0.62,
    metalness: 0.04,
    normalMap: tex.detailNormal,
    normalScale: new THREE.Vector2(0.3, 0.3),
  });

  const woodCrate = applyRedDustWear(
    new THREE.MeshStandardMaterial({
      color: 0x6e4f34,
      map: tex.detail,
      normalMap: tex.detailNormal,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.86,
      metalness: 0.02,
    }),
    clipUniform,
    { wearStrength: 0.1, rustStrength: 0.12, mudHeight: 0.45 }
  );

  const copperCoil = new THREE.MeshStandardMaterial({
    color: 0xb66b3c,
    roughness: 0.28,
    metalness: 0.88,
  });

  const ledRed = new THREE.MeshStandardMaterial({
    color: 0x3b0b08,
    emissive: 0xff3b1f,
    emissiveIntensity: 3.2,
    roughness: 0.3,
  });

  const ledGreen = new THREE.MeshStandardMaterial({
    color: 0x0a382c,
    emissive: 0x00e0b8,
    emissiveIntensity: 0.15,
    roughness: 0.3,
  });

  const sodiumLamp = new THREE.MeshStandardMaterial({
    color: 0xd9cbb0,
    emissive: 0xffb347,
    emissiveIntensity: 0.12,
    roughness: 0.25,
  });

  const headlightLamp = new THREE.MeshStandardMaterial({
    color: 0xdfe8ec,
    emissive: 0xfff0d4,
    emissiveIntensity: 0.05,
    roughness: 0.15,
  });

  const amberBeacon = new THREE.MeshStandardMaterial({
    color: 0xc96f10,
    emissive: 0xff8c1a,
    emissiveIntensity: 0.15,
    roughness: 0.18,
  });

  const all: THREE.Material[] = [
    paintTeal,
    paintOchreTruck,
    paintSafetyAmber,
    paintPanelGrey,
    rustIron,
    darkSteel,
    bareSteel,
    corrugatedZinc,
    concreteWall,
    rubberTire,
    hazardStripe,
    cabGlass,
    caneStalk,
    woodCrate,
    copperCoil,
    ledRed,
    ledGreen,
    sodiumLamp,
    headlightLamp,
    amberBeacon,
  ];

  return {
    clipUniform,
    timeUniform,
    paintTeal,
    paintOchreTruck,
    paintSafetyAmber,
    paintPanelGrey,
    rustIron,
    darkSteel,
    bareSteel,
    corrugatedZinc,
    concreteWall,
    rubberTire,
    hazardStripe,
    cabGlass,
    caneStalk,
    woodCrate,
    copperCoil,
    ledRed,
    ledGreen,
    sodiumLamp,
    headlightLamp,
    amberBeacon,
    dispose: () => {
      for (const m of all) m.dispose();
    },
  };
}
