import * as THREE from 'three';
import { SUBSTATION_BOUNDS } from './logic';
import type { QualityProfile } from './types';

const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Half-res SSAO + 2-lobe Henyey-Greenstein volumetric dawn shafts & interior dust boost
const AO_VOL_FRAG = /* glsl */ `
uniform sampler2D uDepth;
uniform mat4 uInvProj;
uniform mat4 uInvViewProj;
uniform vec3 uCamPos;
uniform vec3 uSunDir;
uniform vec2 uResolution;
uniform float uTime;
uniform float uAoEnabled;
uniform float uVolEnabled;
uniform float uRestoreBoost;
uniform vec3 uSubMin;
uniform vec3 uSubMax;
varying vec2 vUv;

float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

vec3 reconstructViewPos(vec2 uv, float depth) {
  vec4 ndc = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 vp = uInvProj * ndc;
  return vp.xyz / vp.w;
}

vec3 reconstructWorldPos(vec2 uv, float depth) {
  vec4 ndc = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 wp = uInvViewProj * ndc;
  return wp.xyz / wp.w;
}

float hgPhase(float cosTheta, float g) {
  float g2 = g * g;
  return (1.0 - g2) / (4.0 * 3.1415926 * pow(max(0.001, 1.0 + g2 - 2.0 * g * cosTheta), 1.5));
}

void main() {
  float d = texture2D(uDepth, vUv).r;
  float ao = 1.0;
  float fogShaft = 0.0;

  if (uAoEnabled > 0.5 && d < 0.9994) {
    vec3 vp = reconstructViewPos(vUv, d);
    float radius = clamp(0.65 / max(1.0, -vp.z), 0.008, 0.045);
    float rot = ign(gl_FragCoord.xy) * 6.283185;
    float occ = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = rot + float(i) * 0.785398;
      float r = (float(i % 2) * 0.45 + 0.55) * radius;
      vec2 suv = clamp(vUv + vec2(cos(a), sin(a)) * r, vec2(0.002), vec2(0.998));
      float sd = texture2D(uDepth, suv).r;
      if (sd < 0.9994) {
        vec3 svp = reconstructViewPos(suv, sd);
        vec3 diff = svp - vp;
        float dist = length(diff);
        if (dist > 0.02 && dist < 1.35) {
          float dz = svp.z - vp.z;
          occ += smoothstep(0.03, 0.55, dz) * (1.0 - dist / 1.35);
        }
      }
    }
    ao = clamp(1.0 - occ * 0.24, 0.42, 1.0);
  }

  if (uVolEnabled > 0.5) {
    vec3 wpEnd = d < 0.9995
      ? reconstructWorldPos(vUv, d)
      : uCamPos + normalize(reconstructWorldPos(vUv, 0.95) - uCamPos) * 58.0;

    vec3 ray = wpEnd - uCamPos;
    float rayLen = min(length(ray), 52.0);
    vec3 rayDir = ray / max(0.001, length(ray));

    float cosTheta = dot(rayDir, uSunDir);
    float phase = 0.72 * hgPhase(cosTheta, 0.62) + 0.28 * hgPhase(cosTheta, -0.25);

    float jitter = ign(gl_FragCoord.xy + fract(uTime) * 37.0);
    float acc = 0.0;
    const int STEPS = 12;
    for (int i = 0; i < STEPS; i++) {
      float t = (float(i) + jitter) / float(STEPS);
      vec3 p = uCamPos + rayDir * (t * rayLen);
      float heightFog = exp(-max(0.0, p.y) * 0.16);
      // Skylight dust shaft boost inside covered Casa de Força
      float inSub = step(uSubMin.x, p.x) * step(p.x, uSubMax.x)
                  * step(uSubMin.z, p.z) * step(p.z, uSubMax.z)
                  * step(p.y, uSubMax.y);
      float slotBeam = smoothstep(1.2, 0.0, abs(p.x + 8.3 - (5.4 - p.y) * 0.45));
      float interiorBoost = inSub * (0.4 + 2.4 * slotBeam);
      acc += (heightFog + interiorBoost) * (rayLen / float(STEPS));
    }
    fogShaft = clamp(acc * phase * 0.018 * (1.0 + uRestoreBoost * 0.35), 0.0, 0.65);
  }

  gl_FragColor = vec4(ao, fogShaft, d, 1.0);
}
`;

const BLOOM_PREFILTER_FRAG = /* glsl */ `
uniform sampler2D uHdr;
uniform float uThreshold;
varying vec2 vUv;

vec3 safeHdr(vec3 v) {
  return vec3(
    (v.x >= 0.0 && v.x < 64.0) ? v.x : 0.0,
    (v.y >= 0.0 && v.y < 64.0) ? v.y : 0.0,
    (v.z >= 0.0 && v.z < 64.0) ? v.z : 0.0
  );
}

void main() {
  vec3 c = safeHdr(texture2D(uHdr, vUv).rgb);
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float soft = clamp((luma - (uThreshold - 0.25)) / 0.5, 0.0, 1.0);
  float contrib = max(max(luma - uThreshold, 0.0), soft * soft * 0.25) / max(0.001, luma);
  gl_FragColor = vec4(c * contrib, 1.0);
}
`;

const BLUR_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform vec2 uDir;
varying vec2 vUv;

vec3 safeTex(vec2 uv) {
  vec3 v = texture2D(uTex, uv).rgb;
  return vec3(
    (v.x >= 0.0 && v.x < 64.0) ? v.x : 0.0,
    (v.y >= 0.0 && v.y < 64.0) ? v.y : 0.0,
    (v.z >= 0.0 && v.z < 64.0) ? v.z : 0.0
  );
}

void main() {
  vec3 sum = safeTex(vUv) * 0.227027;
  sum += safeTex(vUv + uDir * 1.384615) * 0.316216;
  sum += safeTex(vUv - uDir * 1.384615) * 0.316216;
  sum += safeTex(vUv + uDir * 3.230769) * 0.070270;
  sum += safeTex(vUv - uDir * 3.230769) * 0.070270;
  gl_FragColor = vec4(sum, 1.0);
}
`;

const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D uHdr;
uniform sampler2D uAoVol;
uniform sampler2D uBloom;
uniform vec2 uTexel;
uniform float uExposure;
uniform float uBloomStrength;
uniform float uTime;
varying vec2 vUv;

vec3 acesHill(vec3 x) {
  const mat3 m1 = mat3(
    0.59719, 0.07600, 0.02840,
    0.35458, 0.90834, 0.13383,
    0.04823, 0.01566, 0.83777
  );
  const mat3 m2 = mat3(
     1.60475, -0.10208, -0.00327,
    -0.53108,  1.10813, -0.07276,
    -0.07367, -0.00605,  1.07602
  );
  vec3 v = m1 * x;
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return clamp(m2 * (a / b), 0.0, 1.0);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 safeComp(vec3 v) {
  return vec3(
    (v.x >= 0.0 && v.x < 64.0) ? v.x : 0.0,
    (v.y >= 0.0 && v.y < 64.0) ? v.y : 0.0,
    (v.z >= 0.0 && v.z < 64.0) ? v.z : 0.0
  );
}

void main() {
  vec3 hdr = safeComp(texture2D(uHdr, vUv).rgb);
  vec4 av = texture2D(uAoVol, vUv);
  float ao = clamp(av.r, 0.35, 1.0);
  float shaft = clamp(av.g, 0.0, 0.65);

  // Apply SSAO cleanly to diffuse/mid-range without crushing lights
  float luma = dot(hdr, vec3(0.2126, 0.7152, 0.0722));
  hdr *= mix(ao, 1.0, smoothstep(0.65, 2.2, luma));

  // Warm volumetric golden dawn scatter
  hdr += vec3(1.12, 0.62, 0.30) * shaft;

  // Subtle unsharp micro-detail boost
  vec3 blurN = (
    safeComp(texture2D(uHdr, vUv + vec2(uTexel.x, 0.0)).rgb) +
    safeComp(texture2D(uHdr, vUv - vec2(uTexel.x, 0.0)).rgb) +
    safeComp(texture2D(uHdr, vUv + vec2(0.0, uTexel.y)).rgb) +
    safeComp(texture2D(uHdr, vUv - vec2(0.0, uTexel.y)).rgb)
  ) * 0.25;
  hdr = max(vec3(0.0), hdr + (hdr - blurN) * 0.16);

  // Subtle bloom
  if (uBloomStrength > 0.001) {
    hdr += safeComp(texture2D(uBloom, vUv).rgb) * uBloomStrength;
  }

  vec3 mapped = acesHill(hdr * uExposure);

  // Subtle cool-shadow / warm-highlight split tone grading
  float ml = dot(mapped, vec3(0.2126, 0.7152, 0.0722));
  vec3 coolShadow = vec3(0.95, 0.99, 1.05);
  vec3 warmHi = vec3(1.04, 1.00, 0.94);
  mapped *= mix(coolShadow, warmHi, smoothstep(0.15, 0.85, ml));

  // Very subtle vignette + clean film grain & dither
  vec2 centered = vUv - 0.5;
  float vig = 1.0 - dot(centered, centered) * 0.24;
  mapped *= vig;

  float grain = (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.014;
  mapped = clamp(pow(max(mapped, vec3(1e-5)), vec3(1.0 / 2.2)) + grain, 0.0, 1.0);

  gl_FragColor = vec4(mapped, 1.0);
}
`;

export interface PostPipeline {
  resize: (width: number, height: number, dpr: number) => void;
  render: (
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    profile: QualityProfile,
    time: number,
    restoreBoost: number
  ) => void;
  dispose: () => void;
}

export function createPostPipeline(sunDir: THREE.Vector3): PostPipeline {
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const aoVolMat = new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: AO_VOL_FRAG,
    uniforms: {
      uDepth: { value: null },
      uInvProj: { value: new THREE.Matrix4() },
      uInvViewProj: { value: new THREE.Matrix4() },
      uCamPos: { value: new THREE.Vector3() },
      uSunDir: { value: sunDir.clone() },
      uResolution: { value: new THREE.Vector2(1280, 720) },
      uTime: { value: 0 },
      uAoEnabled: { value: 1 },
      uVolEnabled: { value: 1 },
      uRestoreBoost: { value: 0 },
      uSubMin: { value: new THREE.Vector3(SUBSTATION_BOUNDS.minX, 0, SUBSTATION_BOUNDS.minZ) },
      uSubMax: { value: new THREE.Vector3(SUBSTATION_BOUNDS.maxX, SUBSTATION_BOUNDS.roofY, SUBSTATION_BOUNDS.maxZ) },
    },
    depthTest: false,
    depthWrite: false,
  });

  const bloomPreMat = new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: BLOOM_PREFILTER_FRAG,
    uniforms: {
      uHdr: { value: null },
      uThreshold: { value: 1.06 },
    },
    depthTest: false,
    depthWrite: false,
  });

  const blurMat = new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: BLUR_FRAG,
    uniforms: {
      uTex: { value: null },
      uDir: { value: new THREE.Vector2(0.002, 0) },
    },
    depthTest: false,
    depthWrite: false,
  });

  const compMat = new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: COMPOSITE_FRAG,
    uniforms: {
      uHdr: { value: null },
      uAoVol: { value: null },
      uBloom: { value: null },
      uTexel: { value: new THREE.Vector2(1 / 1280, 1 / 720) },
      uExposure: { value: 1.08 },
      uBloomStrength: { value: 0.24 },
      uTime: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
  });

  const quadMesh = new THREE.Mesh(quadGeo, compMat);
  quadMesh.frustumCulled = false;
  quadScene.add(quadMesh);

  let hdrTarget: THREE.WebGLRenderTarget | null = null;
  let aoTarget: THREE.WebGLRenderTarget | null = null;
  let bloomA: THREE.WebGLRenderTarget | null = null;
  let bloomB: THREE.WebGLRenderTarget | null = null;
  let curW = 0;
  let curH = 0;

  const invViewProj = new THREE.Matrix4();

  const ensureTargets = (w: number, h: number) => {
    if (hdrTarget && curW === w && curH === h) return;
    curW = w;
    curH = h;
    hdrTarget?.dispose();
    aoTarget?.dispose();
    bloomA?.dispose();
    bloomB?.dispose();

    const depthTex = new THREE.DepthTexture(w, h);
    depthTex.type = THREE.UnsignedIntType;
    hdrTarget = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthTexture: depthTex,
    });

    const hw = Math.max(64, Math.floor(w * 0.5));
    const hh = Math.max(36, Math.floor(h * 0.5));
    aoTarget = new THREE.WebGLRenderTarget(hw, hh, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });

    const qw = Math.max(32, Math.floor(w * 0.25));
    const qh = Math.max(18, Math.floor(h * 0.25));
    bloomA = new THREE.WebGLRenderTarget(qw, qh, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });
    bloomB = new THREE.WebGLRenderTarget(qw, qh, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });
  };

  return {
    resize: (width: number, height: number, dpr: number) => {
      const rw = Math.max(160, Math.round(width * dpr));
      const rh = Math.max(90, Math.round(height * dpr));
      ensureTargets(rw, rh);
    },
    render: (renderer, scene, camera, profile, time, restoreBoost) => {
      if (!profile.postEnabled) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08 + restoreBoost * 0.08;
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
        return;
      }

      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      ensureTargets(Math.max(160, size.x), Math.max(90, size.y));
      if (!hdrTarget || !aoTarget || !bloomA || !bloomB) return;

      // Disable renderer toneMapping for raw linear HDR render, handled in composite pass
      const prevTM = renderer.toneMapping;
      renderer.toneMapping = THREE.NoToneMapping;

      // 1. Main HDR scene + depth
      renderer.setRenderTarget(hdrTarget);
      renderer.clear();
      renderer.render(scene, camera);

      // 2. Half-res AO + Volumetric Dawn Shafts
      invViewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
      aoVolMat.uniforms.uDepth.value = hdrTarget.depthTexture;
      aoVolMat.uniforms.uInvProj.value.copy(camera.projectionMatrixInverse);
      aoVolMat.uniforms.uInvViewProj.value.copy(invViewProj);
      aoVolMat.uniforms.uCamPos.value.copy(camera.position);
      aoVolMat.uniforms.uResolution.value.set(aoTarget.width, aoTarget.height);
      aoVolMat.uniforms.uTime.value = time;
      aoVolMat.uniforms.uAoEnabled.value = profile.aoEnabled ? 1 : 0;
      aoVolMat.uniforms.uVolEnabled.value = profile.volumetricsEnabled ? 1 : 0;
      aoVolMat.uniforms.uRestoreBoost.value = restoreBoost;

      quadMesh.material = aoVolMat;
      renderer.setRenderTarget(aoTarget);
      renderer.render(quadScene, quadCam);

      // 3. Subtle quarter-res bloom
      if (profile.bloomEnabled) {
        bloomPreMat.uniforms.uHdr.value = hdrTarget.texture;
        quadMesh.material = bloomPreMat;
        renderer.setRenderTarget(bloomA);
        renderer.render(quadScene, quadCam);

        blurMat.uniforms.uTex.value = bloomA.texture;
        blurMat.uniforms.uDir.value.set(1.6 / bloomA.width, 0);
        quadMesh.material = blurMat;
        renderer.setRenderTarget(bloomB);
        renderer.render(quadScene, quadCam);

        blurMat.uniforms.uTex.value = bloomB.texture;
        blurMat.uniforms.uDir.value.set(0, 1.6 / bloomA.height);
        renderer.setRenderTarget(bloomA);
        renderer.render(quadScene, quadCam);
      }

      // 4. Filmic ACES composite to screen
      compMat.uniforms.uHdr.value = hdrTarget.texture;
      compMat.uniforms.uAoVol.value = aoTarget.texture;
      compMat.uniforms.uBloom.value = bloomA.texture;
      compMat.uniforms.uTexel.value.set(1 / curW, 1 / curH);
      compMat.uniforms.uExposure.value = 1.06 + restoreBoost * 0.1;
      compMat.uniforms.uBloomStrength.value = profile.bloomEnabled ? 0.22 + restoreBoost * 0.06 : 0;
      compMat.uniforms.uTime.value = time;

      quadMesh.material = compMat;
      renderer.setRenderTarget(null);
      renderer.render(quadScene, quadCam);

      renderer.toneMapping = prevTM;
    },
    dispose: () => {
      quadGeo.dispose();
      aoVolMat.dispose();
      bloomPreMat.dispose();
      blurMat.dispose();
      compMat.dispose();
      hdrTarget?.dispose();
      aoTarget?.dispose();
      bloomA?.dispose();
      bloomB?.dispose();
    },
  };
}
