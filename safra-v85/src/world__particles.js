// === world/particles.js ===

function createSoftParticleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
  g.addColorStop(0, 'rgba(255,255,255,0.65)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.22)');
  g.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// Fumaça/poeira dos emissores: todos os sprites num único desenho instanciado, iluminados pelo sol (contraluz brilha)
const LUZ_SMOKE_VERT = `
  attribute vec4 iPosScale;   // xyz centro, w escala
  attribute vec4 iColAlpha;   // rgb cor, a opacidade
  attribute float iSeed;
  varying vec2 vUv;
  varying vec4 vCol;
  varying float vSeed;
  varying vec3 vViewDirW;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv;
    vCol = iColAlpha;
    vSeed = iSeed;
    vec4 mvPosition = viewMatrix * vec4(iPosScale.xyz, 1.0);
    float a = iSeed * 6.2831;
    vec2 cr = vec2(cos(a), sin(a));
    vec2 p = position.xy * iPosScale.w;
    mvPosition.xy += vec2(p.x * cr.x - p.y * cr.y, p.x * cr.y + p.y * cr.x);
    vViewDirW = normalize(iPosScale.xyz - cameraPosition);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const LUZ_SMOKE_FRAG = `
  uniform vec3 uSunDir;
  uniform vec3 uSunCol;
  uniform vec3 uAmb;
  varying vec2 vUv;
  varying vec4 vCol;
  varying float vSeed;
  varying vec3 vViewDirW;
  #include <fog_pars_fragment>
  float lzH(vec2 p){ p = fract(p * vec2(127.1, 311.7)); p += dot(p, p + 34.5); return fract(p.x * p.y); }
  float lzN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(lzH(i), lzH(i + vec2(1, 0)), f.x), mix(lzH(i + vec2(0, 1)), lzH(i + vec2(1, 1)), f.x), f.y); }
  void main() {
    vec2 q = vUv * 2.0 - 1.0;
    float r = length(q);
    float n = lzN(q * 2.3 + vSeed * 17.0) * 0.6 + lzN(q * 5.1 - vSeed * 9.0) * 0.4;
    float a = smoothstep(1.0, 0.15, r + (n - 0.5) * 0.55) * vCol.a;
    if (a < 0.004) discard;
    float mu = dot(vViewDirW, uSunDir);
    float g = 0.6;
    float phase = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5) * 0.25;
    vec3 lit = vCol.rgb * (uAmb + uSunCol * (0.18 + phase * 0.55) * (0.75 + 0.5 * n));
    gl_FragColor = vec4(lit, a);
    #include <fog_fragment>
  }
`;

// Poeira em suspensão ao redor da câmera: pontos minúsculos que acendem na contraluz do sol
const LUZ_MOTE_VERT = `
  uniform float uTime;
  uniform float uBox;
  uniform float uPx;
  attribute vec4 aSeed;
  varying float vA;
  varying float vMu;
  uniform vec3 uSunDir;
  void main() {
    vec3 drift = vec3(sin(uTime * 0.11 + aSeed.w * 6.28) * 0.9 + uTime * 0.35, sin(uTime * 0.07 + aSeed.x * 9.0) * 0.6, cos(uTime * 0.09 + aSeed.y * 7.0) * 0.9 + uTime * 0.12);
    vec3 rel = mod(position + drift - cameraPosition + uBox * 0.5, uBox) - uBox * 0.5;
    rel.y = mod(position.y + drift.y - cameraPosition.y + 3.0, 7.0) - 3.0;
    vec3 wp = cameraPosition + rel;
    vec4 mv = viewMatrix * vec4(wp, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;
    gl_PointSize = clamp(uPx * (0.6 + aSeed.z) / max(dist, 0.5), 1.0, 6.0);
    vA = smoothstep(0.6, 2.5, dist) * (1.0 - smoothstep(uBox * 0.3, uBox * 0.5, length(rel.xz)));
    vA *= 0.55 + 0.45 * sin(uTime * (0.8 + aSeed.w) + aSeed.x * 30.0);
    vMu = dot(normalize(rel), uSunDir);
  }
`;

const LUZ_MOTE_FRAG = `
  uniform vec3 uSunCol;
  uniform float uStrength;
  varying float vA;
  varying float vMu;
  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float d = dot(c, c);
    if (d > 1.0) discard;
    float g = 0.82;
    float phase = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * vMu, 1.5);
    float a = (1.0 - d) * vA * uStrength * max(phase * 0.14 - 0.05, 0.0);
    gl_FragColor = vec4(uSunCol * a, 1.0);
  }
`;

class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.tex = createSoftParticleTexture();
    this.emitters = [];
    this._dirty = false;
    this._mesh = null;
    this._geo = null;
    this._cap = 0;
    this._time = 0;

    this.smokeMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunCol: { value: new THREE.Color(1, 1, 1) },
        uAmb: { value: new THREE.Color(0.4, 0.45, 0.5) }
      }]),
      vertexShader: LUZ_SMOKE_VERT,
      fragmentShader: LUZ_SMOKE_FRAG,
      transparent: true,
      depthWrite: false,
      fog: true
    });

    // Poeira em suspensão
    const moteCount = 1400;
    const mg = new THREE.BufferGeometry();
    const pos = new Float32Array(moteCount * 3);
    const seed = new Float32Array(moteCount * 4);
    for (let i = 0; i < moteCount; i++) {
      pos[i * 3] = Math.random() * 40;
      pos[i * 3 + 1] = Math.random() * 7;
      pos[i * 3 + 2] = Math.random() * 40;
      for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random();
    }
    mg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    mg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    this.moteMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBox: { value: 40 },
        uPx: { value: 6 },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunCol: { value: new THREE.Color(1, 1, 1) },
        uStrength: { value: 1 }
      },
      vertexShader: LUZ_MOTE_VERT,
      fragmentShader: LUZ_MOTE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.motes = new THREE.Points(mg, this.moteMat);
    this.motes.frustumCulled = false;
    this.motes.renderOrder = 5;
    this.moteCount = moteCount;
    this.scene.add(this.motes);
  }

  addEmitter(opts) {
    const count = opts.count || 16;
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push({
        phase: i / count,
        seed: Math.random(),
        jitterX: (Math.random() - 0.5) * (opts.spread || 1.8),
        jitterZ: (Math.random() - 0.5) * (opts.spread || 1.8)
      });
    }
    this.emitters.push({ opts, items, color: new THREE.Color(opts.color || 0xc89a78) });
    this._dirty = true;
  }

  _rebuild() {
    this._dirty = false;
    let total = 0;
    for (const em of this.emitters) total += em.items.length;
    if (this._mesh) {
      this.scene.remove(this._mesh);
      this._geo.dispose();
    }
    this._cap = total;
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.getAttribute('position'));
    geo.setAttribute('uv', base.getAttribute('uv'));
    this._ps = new THREE.InstancedBufferAttribute(new Float32Array(total * 4), 4);
    this._ca = new THREE.InstancedBufferAttribute(new Float32Array(total * 4), 4);
    this._sd = new THREE.InstancedBufferAttribute(new Float32Array(total), 1);
    this._ps.setUsage(THREE.DynamicDrawUsage);
    this._ca.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iPosScale', this._ps);
    geo.setAttribute('iColAlpha', this._ca);
    geo.setAttribute('iSeed', this._sd);
    let k = 0;
    for (const em of this.emitters) for (const it of em.items) this._sd.array[k++] = it.seed;
    geo.instanceCount = 0;
    this._geo = geo;
    this._mesh = new THREE.Mesh(geo, this.smokeMat);
    this._mesh.frustumCulled = false;
    this._mesh.renderOrder = 4;
    this.scene.add(this._mesh);
  }

  _syncLight() {
    const sky = typeof LUZ_SHARED !== 'undefined' ? LUZ_SHARED.sky : null;
    if (!sky) return;
    const U = this.smokeMat.uniforms;
    U.uSunDir.value.copy(sky.sunDir);
    U.uSunCol.value.copy(sky.uniforms.uSunColor.value).multiplyScalar(sky.sunLum);
    const z = sky.uniforms.uZenithColor.value, h = sky.uniforms.uHorizonColor.value;
    U.uAmb.value.setRGB((z.r + h.r) * 0.5, (z.g + h.g) * 0.5, (z.b + h.b) * 0.5);
    const M = this.moteMat.uniforms;
    M.uSunDir.value.copy(sky.sunDir);
    M.uSunCol.value.copy(sky.uniforms.uSunColor.value).multiplyScalar(sky.sunLum);
    // Mais poeira visível com o sol baixo e à tarde (colheita levantando terra)
    const low = 1 - THREE.MathUtils.smoothstep(sky.sunDir.y, 0.15, 0.8);
    M.uStrength.value = 0.5 + 0.9 * low;
  }

  update(dt, quality) {
    if (this._dirty) this._rebuild();
    this._time += dt;
    const activeFactor = quality === 'alta' ? 1 : quality === 'media' ? 0.65 : 0.3;
    this._syncLight();
    this.moteMat.uniforms.uTime.value = this._time;
    const renderer = typeof LUZ_SHARED !== 'undefined' ? LUZ_SHARED.renderer : null;
    const pr = renderer ? renderer.getPixelRatio() : 1;
    this.moteMat.uniforms.uPx.value = 7 * pr;
    this.motes.visible = quality !== 'baixa';
    this.motes.geometry.setDrawRange(0, Math.floor(this.moteCount * (quality === 'alta' ? 1 : 0.55)));

    if (!this._geo) return;
    const ps = this._ps.array, ca = this._ca.array, sd = this._sd.array;
    let n = 0;
    for (const em of this.emitters) {
      const { opts, items, color } = em;
      const maxVisible = Math.max(2, Math.floor(items.length * activeFactor));
      const op = opts.opacity ?? 0.18;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (i >= maxVisible) continue;
        it.phase = (it.phase + dt * (opts.speed || 0.25)) % 1;
        const p = it.phase;
        const s = (opts.baseScale || 1.4) + p * (opts.grow || 3.0);
        ps[n * 4] = opts.x + it.jitterX + (opts.driftX || 1.8) * p;
        ps[n * 4 + 1] = opts.y + (opts.rise || 3.2) * p;
        ps[n * 4 + 2] = opts.z + it.jitterZ + (opts.driftZ || 0.5) * p;
        ps[n * 4 + 3] = s;
        const fade = THREE.MathUtils.smoothstep(p, 0.0, 0.12) * (1 - THREE.MathUtils.smoothstep(p, 0.55, 1.0));
        ca[n * 4] = color.r;
        ca[n * 4 + 1] = color.g;
        ca[n * 4 + 2] = color.b;
        ca[n * 4 + 3] = op * fade * 1.6;
        sd[n] = it.seed;
        n++;
      }
    }
    this._geo.instanceCount = n;
    this._ps.needsUpdate = true;
    this._ca.needsUpdate = true;
    this._sd.needsUpdate = true;
  }
}
