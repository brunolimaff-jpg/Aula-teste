import * as THREE from 'three';
import { SUN_DIRECTION } from './logic';

const SKY_VERT = /* glsl */ `
varying vec3 vWorldDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldDir = position;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform float uTime;
uniform float uLightning;
uniform float uRestoreGlow;
varying vec3 vWorldDir;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.82, 0.57, -0.57, 0.82);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.04 + vec2(11.3, 4.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 dir = normalize(vWorldDir);
  float y = dir.y;
  float sunDot = max(dot(dir, uSunDir), 0.0);

  // Post-storm Cerrado dawn sky gradient: bruised indigo zenith clearing to warm amber-copper east
  vec3 zenithCol = vec3(0.055, 0.082, 0.145);
  vec3 midCol = vec3(0.16, 0.21, 0.29);
  vec3 horizonCool = vec3(0.32, 0.34, 0.40);
  vec3 horizonWarm = vec3(1.18, 0.54, 0.23) * (1.0 + uRestoreGlow * 0.22);

  float hT = pow(max(1e-4, clamp(1.0 - max(y, 0.0), 0.0, 1.0)), 2.4);
  float eastDirDot = max(dot(normalize(vec3(dir.x, 0.0, dir.z) + vec3(1e-4, 0.0, 0.0)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0);
  float eastGlow = pow(max(1e-4, eastDirDot), 2.2);

  vec3 sky = mix(zenithCol, midCol, smoothstep(0.65, 0.12, y));
  sky = mix(sky, horizonCool, hT * 0.82);
  sky += horizonWarm * pow(max(1e-4, hT), 1.25) * (0.28 + 0.92 * eastGlow);

  // Solar aureole and soft crisp sun disc peeking above horizon break
  float mie = pow(max(1e-4, sunDot), 7.0) * 0.42 + pow(max(1e-4, sunDot), 42.0) * 1.05;
  float disc = smoothstep(0.9986, 0.9996, sunDot) * 3.8;
  sky += vec3(1.0, 0.68, 0.34) * mie * (1.0 + uRestoreGlow * 0.2);
  sky += vec3(1.35, 1.02, 0.72) * disc;

  // Storm clouds parting near the eastern horizon
  if (y > 0.008) {
    vec2 cloudUv = dir.xz / (y + 0.19);
    vec2 drift = vec2(uTime * 0.011, -uTime * 0.006);
    float rolls = fbm(cloudUv * vec2(0.55, 1.25) + drift);
    float detail = fbm(cloudUv * 1.9 - drift * 1.4);
    float cover = smoothstep(0.34, 0.74, rolls * 0.72 + detail * 0.38);

    // Part clouds cleanly in the eastern dawn window
    float clearGap = smoothstep(0.65, 0.98, sunDot) * smoothstep(0.38, 0.02, y);
    cover *= (1.0 - clearGap * 0.82);

    // Self-shadowed underside & warm sunlit rim
    float rim = smoothstep(0.25, 0.75, detail) * (0.35 + 0.65 * pow(max(1e-4, sunDot), 2.0));
    vec3 cloudDark = mix(vec3(0.065, 0.082, 0.12), vec3(0.14, 0.14, 0.18), 1.0 - cover);
    vec3 cloudRim = mix(vec3(0.45, 0.33, 0.32), vec3(1.15, 0.56, 0.26), eastGlow);
    vec3 cloudCol = mix(cloudDark, cloudRim, rim * (0.35 + 0.65 * hT));

    // Distant residual sheet lightning inside high storm anvil
    float boltMask = smoothstep(0.48, 0.72, rolls) * smoothstep(0.08, 0.35, y) * (1.0 - eastGlow);
    cloudCol += vec3(0.42, 0.58, 0.95) * boltMask * uLightning;

    float horizonFade = smoothstep(0.008, 0.13, y);
    sky = mix(sky, cloudCol, cover * horizonFade * 0.92);
  }

  // Below horizon dark earth bounce for clean IBL lower hemisphere
  if (y < 0.0) {
    vec3 earthBounce = vec3(0.12, 0.055, 0.038);
    sky = mix(sky, earthBounce, smoothstep(0.0, -0.22, y));
  }

  gl_FragColor = vec4(sky, 1.0);
}
`;

export interface SkySystem {
  mesh: THREE.Mesh;
  sunDir: THREE.Vector3;
  sunLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  envMap: THREE.Texture | null;
  update: (time: number, restoreGlow: number) => void;
  bakeEnvMap: (renderer: THREE.WebGLRenderer, size?: number) => THREE.Texture;
  dispose: () => void;
}

export function createSkySystem(scene: THREE.Scene): SkySystem {
  const sunDir = new THREE.Vector3(...SUN_DIRECTION).normalize();

  const uniforms = {
    uSunDir: { value: sunDir.clone() },
    uTime: { value: 0 },
    uLightning: { value: 0 },
    uRestoreGlow: { value: 0 },
  };

  const geo = new THREE.SphereGeometry(420, 48, 28);
  const mat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  scene.add(mesh);

  // Warm golden-copper dawn directional sun light
  const sunLight = new THREE.DirectionalLight(0xffb878, 3.6);
  sunLight.position.copy(sunDir).multiplyScalar(68);
  sunLight.castShadow = true;
  sunLight.shadow.bias = -0.00035;
  sunLight.shadow.normalBias = 0.025;
  sunLight.shadow.radius = 2.6;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Cool sky-bounce directional fill from west-south storm sky so shadowed metal/tires read crisply
  const skyFillLight = new THREE.DirectionalLight(0x88a8d8, 0.78);
  skyFillLight.position.set(-28, 22, 34);
  scene.add(skyFillLight);

  // Cool storm-sky zenith vs dark red-earth bounce hemisphere
  const hemiLight = new THREE.HemisphereLight(0x86a6d4, 0x5c2b1a, 1.22);
  scene.add(hemiLight);

  let envMap: THREE.Texture | null = null;
  let envRT: THREE.WebGLRenderTarget | null = null;

  const bakeEnvMap = (renderer: THREE.WebGLRenderer): THREE.Texture => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envScene = new THREE.Scene();
    const envDome = new THREE.Mesh(geo, mat);
    envScene.add(envDome);
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(envScene, 0.025);
    envMap = envRT.texture;
    scene.environment = envMap;
    scene.environmentIntensity = 1.15;
    pmrem.dispose();
    return envMap;
  };

  const update = (time: number, restoreGlow: number) => {
    uniforms.uTime.value = time;
    uniforms.uRestoreGlow.value = restoreGlow;
    // Subtle occasional distant sheet lightning before power is restored
    const pulse = Math.sin(time * 1.7) * Math.sin(time * 4.3) * Math.sin(time * 9.1);
    const stormFade = Math.max(0, 1 - restoreGlow * 0.85);
    uniforms.uLightning.value = pulse > 0.72 ? (pulse - 0.72) * 3.6 * stormFade : 0;

    sunLight.intensity = 3.4 + restoreGlow * 0.85;
  };

  return {
    mesh,
    sunDir,
    sunLight,
    hemiLight,
    get envMap() {
      return envMap;
    },
    update,
    bakeEnvMap,
    dispose: () => {
      geo.dispose();
      mat.dispose();
      if (envRT) envRT.dispose();
    },
  };
}
