// === engine/sky.js ===

// Estado compartilhado entre os módulos de luz (céu, sombras, pós, partículas). Só leitura fora deles.
const LUZ_SHARED = { camera: null, sky: null, sun: null, hemi: null, renderer: null, engine: null };

// Uniforms globais da névoa de altura (Float32Array é compartilhado por referência entre todos os materiais)
const LUZ_FOG = {
  a: new Float32Array([0.3, 0.2, 0.9, 0.09]),   // xyz: direção do sol, w: queda com a altura (1/m)
  b: new Float32Array([1.0, 0.7, 0.5, 0.010]),  // rgb: horizonte do lado do sol, w: densidade junto ao chão
  c: new Float32Array([1.0, 0.8, 0.6, 10.0]),   // rgb: brilho Mie do sol na névoa, w: expoente do lóbulo
  d: new Float32Array([0.0, 0.92, 1.0, 0.0])    // x: altura base, y: opacidade máxima, z: ligado, w: livre
};

// Névoa de altura + distância com dispersão do sol: substitui os chunks de névoa do three para todos os materiais
(function luzPatchFogChunks() {
  const SC = THREE.ShaderChunk;
  SC.fog_pars_vertex = `#ifdef USE_FOG
  varying float vFogDepth;
  varying vec3 vLuzFogWP;
#endif`;
  SC.fog_vertex = `#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vLuzFogWP = transpose( mat3( viewMatrix ) ) * ( mvPosition.xyz - viewMatrix[ 3 ].xyz );
#endif`;
  SC.fog_pars_fragment = `#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vLuzFogWP;
  uniform vec4 luzFogA;
  uniform vec4 luzFogB;
  uniform vec4 luzFogC;
  uniform vec4 luzFogD;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`;
  SC.fog_fragment = `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  vec3 luzFogCol = fogColor;
  if ( luzFogD.z > 0.5 ) {
    vec3 luzRd = vLuzFogWP - cameraPosition;
    float luzDist = length( luzRd );
    vec3 luzV = luzRd / max( luzDist, 1e-3 );
    float luzK = luzFogA.w * luzRd.y;
    float luzInteg = abs( luzK ) > 1e-4 ? ( 1.0 - exp( - luzK ) ) / luzK : 1.0;
    float luzOdH = luzFogB.w * exp( - luzFogA.w * ( cameraPosition.y - luzFogD.x ) ) * luzDist * luzInteg;
    #ifdef FOG_EXP2
      float luzOdD = fogDensity * luzDist;
      luzOdD *= luzOdD;
    #else
      float luzOdD = 0.0;
    #endif
    float luzOdF = max( luzDist - luzFogD.w, 0.0 ) * 0.0105;
    fogFactor = min( 1.0 - exp( - ( luzOdH + luzOdD + luzOdF * luzOdF ) ), luzFogD.y );
    float luzAz = dot( normalize( luzV.xz + vec2( 1e-5 ) ), normalize( luzFogA.xz + vec2( 1e-5 ) ) );
    luzFogCol = mix( fogColor, luzFogB.rgb, pow( clamp( 0.5 + 0.5 * luzAz, 0.0, 1.0 ), 3.0 ) );
    luzFogCol += luzFogC.rgb * pow( max( dot( luzV, luzFogA.xyz ), 0.0 ), luzFogC.w );
  }
  gl_FragColor.rgb = mix( gl_FragColor.rgb, luzFogCol, fogFactor );
#endif`;
  const extra = {
    luzFogA: { value: LUZ_FOG.a }, luzFogB: { value: LUZ_FOG.b },
    luzFogC: { value: LUZ_FOG.c }, luzFogD: { value: LUZ_FOG.d }
  };
  Object.assign(THREE.UniformsLib.fog, extra);
  for (const k of Object.keys(THREE.ShaderLib)) {
    const u = THREE.ShaderLib[k].uniforms;
    if (u && u.fogColor) Object.assign(u, extra);
  }
})();

// Ruído tileável (valor + Worley) para nuvens: RGBA = base, detalhe, células, deformação
function luzMakeCloudNoiseTexture(size = 256) {
  let seed = 1337;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const lattice = n => { const a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = rnd(); return a; };
  const vnoise = (lat, n, x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const x0 = ((xi % n) + n) % n, x1 = (x0 + 1) % n, y0 = ((yi % n) + n) % n, y1 = (y0 + 1) % n;
    const a = lat[y0 * n + x0], b = lat[y0 * n + x1], c = lat[y1 * n + x0], d = lat[y1 * n + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const fbmSet = (freqs) => freqs.map(f => ({ f, lat: lattice(f) }));
  const fA = fbmSet([4, 8, 16, 32, 64]);
  const fB = fbmSet([16, 32, 64, 128]);
  const fD = fbmSet([4, 8, 16]);
  const fbm = (set, u, v) => { let s = 0, a = 0.5, w = 0; for (const o of set) { s += a * vnoise(o.lat, o.f, u * o.f, v * o.f); w += a; a *= 0.5; } return s / w; };
  const worleySet = g => { const p = new Float32Array(g * g * 2); for (let i = 0; i < p.length; i++) p[i] = rnd(); return { g, p }; };
  const W1 = worleySet(6), W2 = worleySet(13);
  const worley = (W, u, v) => {
    const g = W.g, x = u * g, y = v * g, xi = Math.floor(x), yi = Math.floor(y);
    let md = 9;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const cx = xi + ox, cy = yi + oy;
      const wx = ((cx % g) + g) % g, wy = ((cy % g) + g) % g;
      const px = cx + W.p[(wy * g + wx) * 2], py = cy + W.p[(wy * g + wx) * 2 + 1];
      const d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d < md) md = d;
    }
    return Math.min(1, Math.sqrt(md));
  };
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const u = i / size, v = j / size;
      const k = (j * size + i) * 4;
      const base = fbm(fA, u, v);
      const cells = 1 - (worley(W1, u, v) * 0.65 + worley(W2, u, v) * 0.35);
      data[k] = Math.max(0, Math.min(255, base * 255));
      data[k + 1] = Math.max(0, Math.min(255, fbm(fB, u + 0.37, v + 0.71) * 255));
      data[k + 2] = Math.max(0, Math.min(255, cells * 255));
      data[k + 3] = Math.max(0, Math.min(255, fbm(fD, u + 0.13, v + 0.29) * 255));
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// "05:30" -> 5.5
function luzParseHora(h) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(h || ''));
  return m ? Number(m[1]) + Number(m[2]) / 60 : null;
}

// Converte o progresso do dia (state.i / nº de paradas) na hora do relógio da parada
function luzHourFromProgress(progress) {
  const list = (typeof PARADAS !== 'undefined' && Array.isArray(PARADAS)) ? PARADAS : null;
  if (!list || !list.length) return 5.5 + progress * 12.5;
  const f = Math.max(0, progress) * list.length;
  const i0 = Math.min(list.length - 1, Math.floor(f));
  const h0 = luzParseHora(list[i0].hora) ?? (5.5 + i0 * 1.3);
  const h1 = i0 + 1 < list.length ? (luzParseHora(list[i0 + 1].hora) ?? h0 + 1) : 18.0;
  return h0 + (h1 - h0) * Math.min(1, f - i0);
}

const LUZ_SKY_VERT = `
  varying vec3 vWorldDir;
  void main() {
    vWorldDir = position;
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
    gl_Position.z = gl_Position.w * 0.99999;
  }
`;

const LUZ_SKY_FRAG = `
  precision highp float;
  varying vec3 vWorldDir;
  uniform vec3 uSunDir;
  uniform float uTime;
  uniform float uTurbidity;
  uniform float uMie;
  uniform float uMieG;
  uniform float uCloudCov;
  uniform vec3 uZenithColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uHorizonSun;
  uniform vec3 uSunColor;
  uniform vec3 uSunGlow;
  uniform vec3 uGroundColor;
  uniform float uSunLum;
  uniform float uDisc;
  uniform float uEnvMode;
  uniform float uGlowPow;
  uniform sampler2D tCloud;

  float luzHG(float mu, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (12.566 * pow(max(1.0 + g2 - 2.0 * g * mu, 1e-4), 1.5));
  }

  // Cor do horizonte por azimute (igual à névoa dos materiais, para o terreno fundir no céu)
  vec3 luzHorizon(vec3 dir) {
    float az = dot(normalize(dir.xz + vec2(1e-5)), normalize(uSunDir.xz + vec2(1e-5)));
    vec3 h = mix(uHorizonColor, uHorizonSun, pow(clamp(0.5 + 0.5 * az, 0.0, 1.0), 3.0));
    return h + uSunGlow * pow(max(dot(dir, uSunDir), 0.0), uGlowPow);
  }

  float luzCloudDensity(vec2 p) {
    vec2 w = vec2(uTime * 0.0021, uTime * 0.0008);
    vec4 n1 = texture2D(tCloud, p * 0.017 + w);
    vec4 n2 = texture2D(tCloud, p * 0.071 + w * 2.3 + (n1.a - 0.5) * 0.08);
    float base = n1.r * 0.6 + n1.b * 0.4;
    float bs = clamp((base - 0.5) * 2.6 + 0.5, 0.0, 1.0);
    float d = smoothstep(1.0 - uCloudCov, 1.0 - uCloudCov + 0.38, bs);
    d = d - (1.0 - n2.g) * 0.5 * (1.0 - d) - (1.0 - n2.b) * 0.1;
    return clamp(d * 1.25, 0.0, 1.0);
  }

  void main() {
    vec3 dir = normalize(vWorldDir);
    float y = dir.y;
    float yp = max(y, 0.0);
    float mu = dot(dir, uSunDir);

    vec3 hor = luzHorizon(dir);
    // Gradiente: zênite azul -> horizonte quente; faixa de névoa espessa junto à linha do horizonte
    float t = pow(1.0 - yp, 5.0);
    vec3 sky = mix(uZenithColor, hor, t);
    sky = mix(sky, hor * 1.04, pow(1.0 - yp, 18.0) * 0.6);

    // Halo de Mie (aureola larga + núcleo justo)
    float sunUp = smoothstep(-0.08, 0.04, uSunDir.y);
    sky += uSunColor * uSunLum * (luzHG(mu, uMieG) * uMie + luzHG(mu, 0.985) * uMie * 0.05 * uDisc) * sunUp;

    // Disco solar com escurecimento de borda
    float discR = 0.99991;
    float disc = smoothstep(discR, discR + 0.00003, mu);
    float limb = sqrt(max(0.0, 1.0 - (1.0 - mu) / (1.0 - discR)));
    sky += uSunColor * uSunLum * disc * (0.55 + 0.45 * limb) * uDisc * 5.0 * sunUp;

    // Nuvens: camada projetada com auto-sombreamento na direção do sol e luz de borda
    float planeT = 1.0 / (yp + 0.065);
    vec2 cp = dir.xz * planeT * 5.5;
    float dens = luzCloudDensity(cp);
    vec2 sDir = normalize(uSunDir.xz + vec2(1e-4)) * (1.6 - uSunDir.y * 1.1);
    float ds = luzCloudDensity(cp + sDir) * 0.6 + luzCloudDensity(cp + sDir * 2.4) * 0.4;
    float trans = exp(-ds * 3.2);
    float powder = 1.0 - exp(-dens * 3.0);
    float phase = 0.55 + luzHG(mu, 0.55) * 5.0 + luzHG(mu, -0.25) * 2.0;
    vec3 amb = mix(uZenithColor * 1.15, hor, 0.55) * (1.08 - 0.22 * dens) + vec3(0.05, 0.05, 0.055);
    vec3 lit = uSunColor * uSunLum * 0.3 * (exp(-ds * 2.6) * phase * (0.45 + 0.55 * powder));
    vec3 cloudCol = amb + lit;
    // Borda prateada: nuvem fina perto do sol
    cloudCol += uSunColor * uSunLum * pow(max(mu, 0.0), 12.0) * (1.0 - dens) * dens * 1.4;
    float far = clamp((planeT - 1.0) / 14.0, 0.0, 1.0);
    cloudCol = mix(cloudCol, hor, far * 0.72);
    float alpha = smoothstep(0.0, 0.62, dens) * smoothstep(0.0, 0.07, y) * 0.92;
    sky = mix(sky, cloudCol, alpha);

    if (y < 0.0) {
      // Abaixo do horizonte: no céu visível, névoa; no reflexo de ambiente, chão iluminado
      vec3 below = uEnvMode > 0.5 ? uGroundColor : hor * 0.82;
      sky = mix(hor, below, smoothstep(0.0, uEnvMode > 0.5 ? 0.12 : 0.05, -y));
    }

    gl_FragColor = vec4(sky, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

class PhysicalSky {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.sunDir = new THREE.Vector3(0.4, 0.45, 0.5).normalize();
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
    this.envRT = null;
    this.lastBakeBucket = -1;
    this.hour = 5.5;
    this.elevation = 0.1;
    this.exposure = 1.0;
    this.sunLum = 5;
    this.fogTint = new THREE.Color();
    this._p = null;
    this._lastT = null;
    this._lastBakeP = -9;
    this._lastBakeT = -9;
    this._tmpA = new THREE.Color();
    this._tmpB = new THREE.Color();
    LUZ_SHARED.sky = this;
    LUZ_SHARED.renderer = renderer;

    this.cloudTex = luzMakeCloudNoiseTexture(256);

    this.uniforms = {
      uSunDir: { value: this.sunDir.clone() },
      uTime: { value: 0 },
      uTurbidity: { value: 2.8 },
      uMie: { value: 0.02 },
      uMieG: { value: 0.78 },
      uCloudCov: { value: 0.46 },
      uZenithColor: { value: new THREE.Color(0x21588f) },
      uHorizonColor: { value: new THREE.Color(0xdba878) },
      uHorizonSun: { value: new THREE.Color(0xe8a070) },
      uSunColor: { value: new THREE.Color(0xffe4b8) },
      uSunGlow: { value: new THREE.Color(0x000000) },
      uGroundColor: { value: new THREE.Color(0x40241a) },
      uSunLum: { value: 5.0 },
      uDisc: { value: 1.0 },
      uEnvMode: { value: 0.0 },
      uGlowPow: { value: 10.0 },
      tCloud: { value: this.cloudTex }
    };

    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: this.uniforms,
      vertexShader: LUZ_SKY_VERT,
      fragmentShader: LUZ_SKY_FRAG
    });

    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1200, 48, 24), skyMat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -20;
    this.scene.add(this.mesh);

    // Cena do reflexo de ambiente: mesmo shader, sem disco e com chão iluminado no hemisfério de baixo
    this.envUniforms = Object.assign({}, this.uniforms, {
      uDisc: { value: 0.0 },
      uEnvMode: { value: 1.0 }
    });
    const envMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: this.envUniforms, vertexShader: LUZ_SKY_VERT, fragmentShader: LUZ_SKY_FRAG
    });
    this.envScene = new THREE.Scene();
    this.envMesh = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), envMat);
    this.envMesh.frustumCulled = false;
    this.envScene.add(this.envMesh);
  }

  // Calcula sol, céu, luzes, névoa e exposição para a hora; transição suave entre paradas
  updateTimeOfDay(progress, timeSec, playerPos, sunLight, hemiLight) {
    this.uniforms.uTime.value = timeSec;
    this.mesh.position.set(playerPos.x, playerPos.y, playerPos.z);

    const dt = this._lastT == null ? 0 : Math.max(0, Math.min(1, timeSec - this._lastT));
    this._lastT = timeSec;
    if (this._p == null) this._p = progress;
    else this._p += (progress - this._p) * (1 - Math.exp(-dt / 0.9));
    if (Math.abs(progress - this._p) < 1e-4) this._p = progress;
    const p = this._p;

    const hour = luzHourFromProgress(p);
    this.hour = hour;

    // Elevação: nascer ~05:00, pôr ~18:05, pico 64°; azimute de leste (-x) para oeste (+x) passando pelo norte (+z)
    const elDeg = Math.max(4.0, 64 * Math.sin(Math.PI * Math.max(0, Math.min(1, (hour - 5.0) / 13.1))));
    const el = elDeg * Math.PI / 180;
    const az = (hour - 11.7) / 6.4 * 1.32;
    const ce = Math.cos(el);
    this.sunDir.set(Math.sin(az) * ce, Math.sin(el), Math.cos(az) * ce * 0.9 + 0.12 * ce).normalize();
    this.elevation = el;
    this.uniforms.uSunDir.value.copy(this.sunDir);
    // Direção do sol exposta só para leitura (captura automatizada aponta a câmera para o sol)
    if (!this._sunArr) { this._sunArr = [0, 0, 0]; window.__SAFRA_SKY_SUN__ = this._sunArr; }
    this._sunArr[0] = this.sunDir.x; this._sunArr[1] = this.sunDir.y; this._sunArr[2] = this.sunDir.z;

    const s = Math.max(0.02, this.sunDir.y);
    const day = THREE.MathUtils.smoothstep(s, 0.12, 0.75);        // 0 sol baixo, 1 meio do dia
    const afternoon = THREE.MathUtils.smoothstep(hour, 12.5, 16.5); // tarde mais empoeirada e dourada

    // Transmitância da atmosfera (massa de ar de Kasten-Young) -> cor e força do sol
    const m = 1 / (s + 0.50572 * Math.pow(elDeg + 6.07995, -1.6364));
    const aer = 1 + afternoon * 0.35;
    const tr = Math.exp(-m * 0.034 * aer), tg = Math.exp(-m * 0.074 * aer), tb = Math.exp(-m * 0.165 * aer);
    const tMax = Math.max(tr, tg, tb);
    const sunCol = new THREE.Color().setRGB(tr / tMax, tg / tMax, tb / tMax);
    const trLum = 0.2126 * tr + 0.7152 * tg + 0.0722 * tb;
    const sunLum = 6.2 * trLum;
    this.sunLum = sunLum;

    // Paleta do céu (linear)
    const L = (a, b, f) => new THREE.Color().setRGB(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f);
    const skyK = 0.62 + 0.55 * day;
    const zenith = L([0.06, 0.16, 0.46], [0.12, 0.31, 0.86], day).multiplyScalar(skyK);
    const horizonSun = L([1.05, 0.62, 0.34], [0.74, 0.84, 0.97], day);
    const horizonAway = L([0.56, 0.56, 0.70], [0.70, 0.80, 0.94], day);
    if (afternoon > 0) {
      horizonSun.lerp(new THREE.Color().setRGB(1.1, 0.66, 0.34), afternoon * (1 - day * 0.8));
      horizonAway.lerp(new THREE.Color().setRGB(0.62, 0.58, 0.64), afternoon * (1 - day * 0.8));
    }
    horizonSun.multiplyScalar(skyK);
    horizonAway.multiplyScalar(skyK);
    const glow = sunCol.clone().multiplyScalar((0.3 - day * 0.2) * skyK);

    const U = this.uniforms;
    U.uZenithColor.value.copy(zenith);
    U.uHorizonColor.value.copy(horizonAway);
    U.uHorizonSun.value.copy(horizonSun);
    U.uSunColor.value.copy(sunCol);
    U.uSunGlow.value.copy(glow);
    U.uSunLum.value = sunLum;
    U.uGlowPow.value = 9.0 + day * 10.0;
    U.uMie.value = 0.016 + (1 - day) * 0.014 + afternoon * 0.006;
    U.uMieG.value = 0.76;
    U.uTurbidity.value = 2.4 + (1 - day) * 2.0;
    U.uCloudCov.value = 0.54 + afternoon * 0.06;

    // Chão visto pelo reflexo de ambiente: terra vermelha iluminada por sol + céu
    const irr = sunLum * s + (zenith.r + zenith.g + zenith.b) * 0.5;
    U.uGroundColor.value.setRGB(0.30 * irr * 0.30 * (sunCol.r * 0.7 + 0.3), 0.15 * irr * 0.30 * (sunCol.g * 0.7 + 0.3), 0.09 * irr * 0.30 * (sunCol.b * 0.7 + 0.3));

    // Exposição de câmera por hora (o sol baixo pede mais abertura)
    this.exposure = 1.0 / (0.34 + 0.66 * THREE.MathUtils.smoothstep(s, 0.06, 0.8)) * 0.62;

    if (sunLight) {
      sunLight.color.copy(sunCol);
      sunLight.intensity = sunLum;
    }
    if (hemiLight) {
      hemiLight.color.copy(zenith).lerp(horizonAway, 0.5);
      hemiLight.groundColor.copy(U.uGroundColor.value).multiplyScalar(2.2);
      hemiLight.intensity = 0.35;
    }

    // Névoa: cor do horizonte oposto ao sol na base, horizonte do sol e brilho Mie na direção do sol
    if (this.scene.fog) {
      this.scene.fog.color.copy(horizonAway);
      if (this.scene.fog.isFogExp2) this.scene.fog.density = 0.0008 + (1 - day) * 0.0005 + afternoon * 0.0003;
    }
    LUZ_FOG.a[0] = this.sunDir.x; LUZ_FOG.a[1] = this.sunDir.y; LUZ_FOG.a[2] = this.sunDir.z;
    LUZ_FOG.a[3] = 0.11;
    LUZ_FOG.b[0] = horizonSun.r; LUZ_FOG.b[1] = horizonSun.g; LUZ_FOG.b[2] = horizonSun.b;
    LUZ_FOG.b[3] = 0.0009 + (1 - day) * 0.0016 + afternoon * 0.0008;
    LUZ_FOG.c[0] = glow.r; LUZ_FOG.c[1] = glow.g; LUZ_FOG.c[2] = glow.b;
    LUZ_FOG.c[3] = U.uGlowPow.value;
    LUZ_FOG.d[0] = 0.0; LUZ_FOG.d[1] = 0.97; LUZ_FOG.d[2] = 1.0; LUZ_FOG.d[3] = 75.0;
    this.fogTint.copy(horizonAway);

    // Reflexo de ambiente (PMREM) acompanha a hora: limitado no tempo durante a transição
    const changed = Math.abs(p - this._lastBakeP);
    const settled = p === progress;
    if (this.envRT == null || (changed > 0.012 && timeSec - this._lastBakeT > 0.6) || (settled && changed > 1e-5)) {
      this._lastBakeP = p;
      this._lastBakeT = timeSec;
      this.lastBakeBucket = Math.floor(p * 5);
      this.bakeEnvironment();
    }
  }

  bakeEnvironment() {
    const old = this.envRT;
    this.envRT = this.pmrem.fromScene(this.envScene, 0.0, 0.1, 400, { size: 128 });
    this.scene.environment = this.envRT.texture;
    if (old) old.dispose();
  }
}
