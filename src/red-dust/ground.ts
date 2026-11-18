import * as THREE from 'three';
import {
  concreteApronMask,
  groundHeightAt,
  puddleMaskAt,
  tireRutMask,
} from './logic';
import type { TextureBank } from './textures';

export interface GroundSystem {
  yardMesh: THREE.Mesh;
  skirtMesh: THREE.Mesh;
  renderPlanarReflection: (
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    mainCam: THREE.PerspectiveCamera,
    clipUniform: { value: number }
  ) => void;
  setReflectionScale: (scale: number, width: number, height: number) => void;
  update: (time: number) => void;
  dispose: () => void;
}

const GROUND_VERT_PARS = /* glsl */ `
varying vec3 vGdWorldPos;
varying vec4 vReflCoord;
attribute float aConcrete;
attribute float aRut;
varying float vConcrete;
varying float vRut;
uniform mat4 uReflMatrix;
`;

const GROUND_VERT_BODY = /* glsl */ `
vec4 gdWp = modelMatrix * vec4( transformed, 1.0 );
vGdWorldPos = gdWp.xyz;
vReflCoord = uReflMatrix * gdWp;
vConcrete = aConcrete;
vRut = aRut;
`;

const GROUND_FRAG_PARS = /* glsl */ `
varying vec3 vGdWorldPos;
varying vec4 vReflCoord;
varying float vConcrete;
varying float vRut;
uniform float uTime;
uniform float uHasRefl;
uniform sampler2D uReflMap;
uniform vec3 uSunDir;

float gdHash( vec2 p ) {
  return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453123 );
}

float gdNoise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix( gdHash( i ), gdHash( i + vec2( 1.0, 0.0 ) ), u.x ),
    mix( gdHash( i + vec2( 0.0, 1.0 ) ), gdHash( i + vec2( 1.0, 1.0 ) ), u.x ),
    u.y
  );
}

float gdFbm( vec2 p ) {
  float v = 0.0;
  float a = 0.5;
  for ( int i = 0; i < 4; i++ ) {
    v += a * gdNoise( p );
    p *= 2.04;
    a *= 0.5;
  }
  return v;
}

// Raindrop expanding concentric ripple rings
vec2 gdRipples( vec2 xz, float t ) {
  vec2 slope = vec2( 0.0 );
  for ( int i = 0; i < 3; i++ ) {
    float fi = float( i );
    vec2 cell = floor( xz * ( 0.85 + fi * 0.45 ) + fi * 13.7 );
    vec2 local = fract( xz * ( 0.85 + fi * 0.45 ) + fi * 13.7 ) - 0.5;
    float h = gdHash( cell + fi * 7.1 );
    float phase = fract( t * ( 0.65 + h * 0.45 ) + h );
    vec2 center = ( vec2( gdHash( cell + 1.3 ), gdHash( cell + 9.2 ) ) - 0.5 ) * 0.48;
    vec2 d = local - center;
    float r = length( d );
    float ring = sin( ( r - phase * 0.48 ) * 42.0 ) * exp( -r * 8.5 ) * ( 1.0 - phase );
    float gate = smoothstep( 0.0, 0.12, phase ) * smoothstep( 0.48, 0.12, r );
    if ( r > 0.002 ) {
      slope += ( d / r ) * ring * gate * 0.032;
    }
  }
  return slope;
}
`;

export function createGroundSystem(scene: THREE.Scene, tex: TextureBank): GroundSystem {
  const segs = 136;
  const size = 68;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const concreteAttr = new Float32Array(pos.count);
  const rutAttr = new Float32Array(pos.count);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, groundHeightAt(x, z));
    concreteAttr[i] = concreteApronMask(x, z);
    rutAttr[i] = tireRutMask(x, z);
  }
  geo.setAttribute('aConcrete', new THREE.BufferAttribute(concreteAttr, 1));
  geo.setAttribute('aRut', new THREE.BufferAttribute(rutAttr, 1));
  geo.computeVertexNormals();

  // Outer Cerrado hill skirt seamlessly blending to horizon
  const skirtGeo = new THREE.RingGeometry(33.5, 165, 72, 16);
  skirtGeo.rotateX(-Math.PI / 2);
  const sPos = skirtGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sPos.count; i++) {
    const x = sPos.getX(i);
    const z = sPos.getZ(i);
    sPos.setY(i, groundHeightAt(x, z) - 0.08);
  }
  skirtGeo.computeVertexNormals();

  const uReflMatrix = { value: new THREE.Matrix4() };
  const uTime = { value: 0 };
  const uHasRefl = { value: 0 };
  const uReflMap = { value: tex.detail as THREE.Texture };
  const uSunDir = { value: new THREE.Vector3(0.76, 0.22, -0.61).normalize() };

  const yardMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.04,
    normalMap: tex.detailNormal,
    normalScale: new THREE.Vector2(0.55, 0.55),
  });
  yardMat.customProgramCacheKey = () => 'red-dust-yard-ground-v1';

  yardMat.onBeforeCompile = (shader) => {
    shader.uniforms.uReflMatrix = uReflMatrix;
    shader.uniforms.uTime = uTime;
    shader.uniforms.uHasRefl = uHasRefl;
    shader.uniforms.uReflMap = uReflMap;
    shader.uniforms.uSunDir = uSunDir;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${GROUND_VERT_PARS}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\n${GROUND_VERT_BODY}`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GROUND_FRAG_PARS}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float gdMacro = gdFbm( vGdWorldPos.xz * 0.19 + 3.1 );
        float gdGrain = gdFbm( vGdWorldPos.xz * 2.4 );
        float gdPebble = gdNoise( vGdWorldPos.xz * 9.8 );

        // Red laterite earth ("terra vermelha" Mato Grosso): rich crimson-ochre dry -> soaked dark mud
        vec3 redDry = vec3( 0.38, 0.122, 0.055 );
        vec3 redDamp = vec3( 0.22, 0.068, 0.031 );
        vec3 redSoaked = vec3( 0.085, 0.029, 0.016 );
        vec3 gravelMix = vec3( 0.25, 0.17, 0.13 );

        float puddle = smoothstep( 0.016, -0.038, vGdWorldPos.y ) * ( 1.0 - smoothstep( 0.45, 0.85, vConcrete ) );
        float dampHalo = smoothstep( 0.11, 0.0, vGdWorldPos.y );

        vec3 dirtCol = mix( redDry, redDamp, clamp( gdMacro * 0.65 + dampHalo * 0.65, 0.0, 1.0 ) );
        dirtCol = mix( dirtCol, gravelMix, smoothstep( 0.60, 0.86, gdMacro ) * 0.35 * ( 1.0 - puddle ) );
        dirtCol = mix( dirtCol, redSoaked, clamp( vRut * 0.82 + puddle * 0.95, 0.0, 1.0 ) );
        dirtCol *= 0.86 + 0.28 * gdGrain + 0.12 * ( gdPebble - 0.5 );

        // Concrete apron slabs (6m grid + tar expansion seams + oil drips)
        vec2 slabGrid = abs( fract( vGdWorldPos.xz / 6.0 ) - 0.5 );
        float tarJoint = smoothstep( 0.486, 0.497, max( slabGrid.x, slabGrid.y ) );
        float concCrack = smoothstep( 0.77, 0.83, abs( gdFbm( vGdWorldPos.xz * 0.85 ) - 0.5 ) * 2.0 );
        vec3 concCol = mix( vec3( 0.26, 0.255, 0.245 ), vec3( 0.17, 0.165, 0.158 ), gdGrain );
        // Red mud tracked onto concrete edges
        concCol = mix( concCol, redDamp, smoothstep( 0.92, 0.45, vConcrete ) * 0.68 * gdMacro );
        concCol = mix( concCol, vec3( 0.045, 0.045, 0.05 ), max( tarJoint, concCrack * 0.45 ) );

        diffuseColor.rgb = mix( dirtCol, concCol, vConcrete );
        // Water absorbs light & tints murky red-brown beneath reflection
        diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.034, 0.019, 0.014 ), puddle * 0.84 );`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        float gdRNoise = gdFbm( vGdWorldPos.xz * 1.4 );
        float gdPuddleR = smoothstep( 0.016, -0.038, vGdWorldPos.y ) * ( 1.0 - smoothstep( 0.45, 0.85, vConcrete ) );
        float gdDampR = smoothstep( 0.11, 0.0, vGdWorldPos.y );
        float dirtRough = mix( 0.88, 0.34, clamp( gdDampR * 0.65 + vRut * 0.6 + gdRNoise * 0.25, 0.0, 1.0 ) );
        float concRough = mix( 0.82, 0.36, smoothstep( 0.55, 0.85, gdRNoise ) );
        roughnessFactor = mix( dirtRough, concRough, vConcrete );
        roughnessFactor = mix( roughnessFactor, 0.035, gdPuddleR );`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        float gdPuddleN = smoothstep( 0.016, -0.038, vGdWorldPos.y ) * ( 1.0 - smoothstep( 0.45, 0.85, vConcrete ) );
        if ( gdPuddleN > 0.02 ) {
          vec2 rip = gdRipples( vGdWorldPos.xz, uTime );
          vec3 waterN = normalize( vec3( rip.x, 1.0, rip.y ) );
          vec3 waterViewN = normalize( ( viewMatrix * vec4( waterN, 0.0 ) ).xyz );
          normal = normalize( mix( normal, waterViewN, gdPuddleN ) );
        }`
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        float gdPuddleRefl = smoothstep( 0.016, -0.038, vGdWorldPos.y ) * ( 1.0 - smoothstep( 0.45, 0.85, vConcrete ) );
        if ( gdPuddleRefl > 0.02 ) {
          vec3 gdViewDirW = normalize( cameraPosition - vGdWorldPos );
          float fresnel = pow( max( 1e-4, clamp( 1.0 - max( gdViewDirW.y, 0.0 ), 0.0, 1.0 ) ), 4.2 );
          float reflWeight = gdPuddleRefl * mix( 0.32, 0.94, fresnel );
          vec2 ripUv = gdRipples( vGdWorldPos.xz, uTime ) * 0.42;
          vec3 reflSample = vec3( 0.16, 0.12, 0.14 );
          if ( uHasRefl > 0.5 && vReflCoord.w > 0.01 ) {
            vec2 ruv = clamp( vReflCoord.xy / vReflCoord.w + ripUv, vec2( 0.002 ), vec2( 0.998 ) );
            reflSample = texture2D( uReflMap, ruv ).rgb;
          } else {
            // Clean sky/dawn fallback reflection on software WebGL2
            vec3 rDir = reflect( -gdViewDirW, normalize( vec3( ripUv.x, 1.0, ripUv.y ) ) );
            float eDot = max( dot( normalize( vec3( rDir.x, 0.0, rDir.z ) + vec3( 1e-4, 0.0, 0.0 ) ), normalize( vec3( uSunDir.x, 0.0, uSunDir.z ) ) ), 0.0 );
            float eGlow = pow( max( 1e-4, eDot ), 2.5 );
            reflSample = mix( vec3( 0.12, 0.16, 0.24 ), vec3( 0.85, 0.42, 0.22 ), eGlow * ( 1.0 - rDir.y ) );
          }
          reflectedLight.indirectSpecular = mix( reflectedLight.indirectSpecular, reflSample, reflWeight );
        }`
      );
  };

  const yardMesh = new THREE.Mesh(geo, yardMat);
  yardMesh.receiveShadow = true;
  scene.add(yardMesh);

  const skirtMat = new THREE.MeshStandardMaterial({
    color: 0x1b2416,
    roughness: 0.92,
    metalness: 0.02,
    normalMap: tex.detailNormal,
    normalScale: new THREE.Vector2(0.4, 0.4),
  });
  const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
  skirtMesh.receiveShadow = true;
  scene.add(skirtMesh);

  let reflTarget: THREE.WebGLRenderTarget | null = null;
  const mirrorCam = new THREE.PerspectiveCamera(62, 16 / 9, 0.15, 480);
  const biasMatrix = new THREE.Matrix4().set(
    0.5, 0, 0, 0.5,
    0, 0.5, 0, 0.5,
    0, 0, 0.5, 0.5,
    0, 0, 0, 1
  );
  const mirrorTarget = new THREE.Vector3();
  const forwardVec = new THREE.Vector3();

  const setReflectionScale = (scale: number, width: number, height: number) => {
    if (scale <= 0) {
      if (reflTarget) {
        reflTarget.dispose();
        reflTarget = null;
      }
      uHasRefl.value = 0;
      uReflMap.value = tex.detail;
      return;
    }
    const w = Math.max(128, Math.round(width * scale));
    const h = Math.max(72, Math.round(height * scale));
    if (!reflTarget || reflTarget.width !== w || reflTarget.height !== h) {
      if (reflTarget) reflTarget.dispose();
      reflTarget = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        type: THREE.HalfFloatType,
        depthBuffer: true,
      });
    }
    uHasRefl.value = 1;
    uReflMap.value = reflTarget.texture;
  };

  const renderPlanarReflection = (
    renderer: THREE.WebGLRenderer,
    targetScene: THREE.Scene,
    mainCam: THREE.PerspectiveCamera,
    clipUniform: { value: number }
  ) => {
    if (!reflTarget || uHasRefl.value < 0.5) return;

    mirrorCam.fov = mainCam.fov;
    mirrorCam.aspect = mainCam.aspect;
    mirrorCam.near = mainCam.near;
    mirrorCam.far = mainCam.far;
    mirrorCam.updateProjectionMatrix();

    mainCam.getWorldDirection(forwardVec);
    mirrorCam.position.set(mainCam.position.x, -mainCam.position.y, mainCam.position.z);
    mirrorTarget.set(
      mainCam.position.x + forwardVec.x * 12,
      -(mainCam.position.y + forwardVec.y * 12),
      mainCam.position.z + forwardVec.z * 12
    );
    mirrorCam.up.set(0, 1, 0);
    mirrorCam.lookAt(mirrorTarget);
    mirrorCam.updateMatrixWorld();

    uReflMatrix.value
      .copy(biasMatrix)
      .multiply(mirrorCam.projectionMatrix)
      .multiply(mirrorCam.matrixWorldInverse);

    const prevTarget = renderer.getRenderTarget();
    const prevShadow = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    yardMesh.visible = false;
    skirtMesh.visible = false;
    clipUniform.value = 1;

    renderer.setRenderTarget(reflTarget);
    renderer.clear();
    renderer.render(targetScene, mirrorCam);

    clipUniform.value = 0;
    yardMesh.visible = true;
    skirtMesh.visible = true;
    renderer.shadowMap.autoUpdate = prevShadow;
    renderer.setRenderTarget(prevTarget);
  };

  return {
    yardMesh,
    skirtMesh,
    renderPlanarReflection,
    setReflectionScale,
    update: (time: number) => {
      uTime.value = time;
    },
    dispose: () => {
      geo.dispose();
      yardMat.dispose();
      skirtGeo.dispose();
      skirtMat.dispose();
      if (reflTarget) reflTarget.dispose();
    },
  };
}
