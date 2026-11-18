// === world/prefabs.js ===
// Modelagem procedural das máquinas, pessoas e peças de cena.
// Tudo passa por um "kit": as peças são acumuladas com cor por vértice e mescladas
// em UMA malha por material (poucas chamadas de desenho). Sem marcas reais.

function addMesh(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  m.castShadow = cast;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ---------------------------------------------------------------------------
// Materiais do kit: clones com cor por vértice dos materiais PBR assados
// ---------------------------------------------------------------------------
const PF_MATSETS = new WeakMap();
const PF_NOCAST = new Set(['glass', 'emit', 'beacon', 'grid', 'oil', 'iglass']);

// Poeira vermelha do Mato Grosso na base dos objetos (atributo pfDust controla a intensidade)
function pfDustInject(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float pfDust;\nvarying float vPfDust;\nvarying vec3 vPfWP;')
    .replace('#include <project_vertex>', `#include <project_vertex>
{ vec4 pfw = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  pfw = instanceMatrix * pfw;
#endif
  vPfWP = (modelMatrix * pfw).xyz; vPfDust = pfDust; }`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying float vPfDust;\nvarying vec3 vPfWP;')
    .replace('#include <color_fragment>', `#include <color_fragment>
{ float pfn = fract(sin(dot(floor(vPfWP.xz * 5.0) + floor(vPfWP.y * 5.0), vec2(12.9898, 78.233))) * 43758.5453);
  float pfh = vPfWP.y + 0.22 * sin(vPfWP.x * 2.3 + vPfWP.z * 1.7) + 0.12 * sin(vPfWP.x * 7.1 + vPfWP.z * 5.3);
  float pfk = smoothstep(1.25, 0.0, pfh) * vPfDust;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.115, 0.05), pfk * (0.38 + 0.22 * pfn)); }`);
}

function pfCanvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// Mapa normal a partir de um canvas de altura (Sobel simples)
function pfNormalFromHeight(hc, strength = 2.0) {
  const w = hc.width, h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const octx = out.getContext('2d');
  const img = octx.createImageData(w, h);
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x - 1, y) - H(x + 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = (dx / l * 0.5 + 0.5) * 255;
      img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255;
      img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(out);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// Telha de barro (capa e canal) em canvas: cor + relevo
function pfRoofTileMaterial() {
  const S = 256, cols = 4, rows = 2, RH = S / rows;
  const hc = document.createElement('canvas');
  hc.width = hc.height = S;
  const hx = hc.getContext('2d');
  const himg = hx.createImageData(S, S);
  const cimg = new ImageData(S, S);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tint = [];
  for (let i = 0; i < cols * rows * 2; i++) tint.push(0.8 + rnd() * 0.34);
  for (let y = 0; y < S; y++) {
    const r = Math.floor(y / RH), v = (y % RH) / RH;
    for (let x = 0; x < S; x++) {
      const u = (x / S) * cols + (r % 2) * 0.5;
      const f = u - Math.floor(u);
      const bump = Math.pow(Math.sin(f * Math.PI), 0.7);
      const val = Math.max(0, Math.min(1, bump * (0.55 + 0.45 * v) - (v < 0.05 ? 0.45 : 0)));
      const i = (y * S + x) * 4;
      himg.data[i] = himg.data[i + 1] = himg.data[i + 2] = val * 255; himg.data[i + 3] = 255;
      const t = tint[(Math.floor(u) % cols) + r * cols] * (0.5 + 0.6 * val);
      const grime = v < 0.08 ? 0.55 : 1;
      cimg.data[i] = Math.min(255, 172 * t * grime);
      cimg.data[i + 1] = Math.min(255, 80 * t * grime);
      cimg.data[i + 2] = Math.min(255, 46 * t * grime);
      cimg.data[i + 3] = 255;
    }
  }
  hx.putImageData(himg, 0, 0);
  const map = pfCanvasTex(S, S, (ctx) => ctx.putImageData(cimg, 0, 0));
  const normalMap = pfNormalFromHeight(hc, 3.2);
  return new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.82, metalness: 0, vertexColors: true });
}

function pfMaterial(matLib, key) {
  let set = PF_MATSETS.get(matLib);
  if (!set) { set = new Map(); PF_MATSETS.set(matLib, set); }
  if (set.has(key)) return set.get(key);
  const vc = (base, ns) => {
    const c = base.clone();
    c.vertexColors = true;
    c.color.set(0xffffff);
    if (ns != null && c.normalScale) c.normalScale.set(ns, ns);
    const prev = base.onBeforeCompile;
    const hasPrev = prev && prev !== THREE.Material.prototype.onBeforeCompile;
    c.onBeforeCompile = (s, r) => { if (hasPrev) prev.call(c, s, r); pfDustInject(s); };
    const prevKey = base.customProgramCacheKey ? base.customProgramCacheKey() : '';
    c.customProgramCacheKey = () => prevKey + '|pfdust';
    return c;
  };
  let m;
  switch (key) {
    case 'paint': m = vc(matLib.get('tinta', { roughness: 0.4, metalness: 0.22 }), 0.6); break;
    case 'metal': m = vc(matLib.getMetal(0xffffff, 0.36, 0.8)); break;
    case 'rough': m = vc(matLib.get('liso', { roughness: 0.74, metalness: 0.04 }), 0.5); break;
    case 'rubber': m = vc(matLib.get('borracha', { roughness: 0.92 })); break;
    case 'concrete': m = vc(matLib.get('concreto', { roughness: 0.9 })); break;
    case 'sheet': m = vc(matLib.get('chapa', { roughness: 0.5, metalness: 0.45 })); break;
    case 'wood': m = vc(matLib.get('madeira', { roughness: 0.86 })); break;
    case 'skin': m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0, vertexColors: true, envMapIntensity: 1.1 }); break;
    case 'cloth': m = vc(matLib.get('liso', { roughness: 0.92, metalness: 0.0 }), 0.25); break;
    case 'fabric': m = vc(matLib.get('lona', { roughness: 0.95, metalness: 0.0 }), 0.15); break;
    case 'tile': {
      m = pfRoofTileMaterial();
      m.onBeforeCompile = pfDustInject;
      m.customProgramCacheKey = () => 'pftile';
      break;
    }
    case 'glass':
      m = new THREE.MeshStandardMaterial({ color: 0x2a3a3f, roughness: 0.04, metalness: 0.55, transparent: true, opacity: 0.5, envMapIntensity: 2.2, depthWrite: false });
      break;
    case 'iglass': m = matLib.getInteriorGlass(); break;
    case 'emit': m = new THREE.MeshBasicMaterial({ vertexColors: true }); break;
    case 'beacon': m = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0xffffff }); break;
    case 'grid': {
      const tex = pfCanvasTex(64, 64, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(i * 16, 0, 3, h);
          ctx.fillRect(0, i * 16, w, 3);
        }
      });
      m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, roughness: 0.45, metalness: 0.6 });
      break;
    }
    case 'oil': {
      const tex = pfCanvasTex(128, 128, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(255,255,255,0.9)');
        g.addColorStop(0.55, 'rgba(255,255,255,0.55)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 14; i++) {
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.beginPath();
          ctx.arc(20 + Math.random() * 88, 20 + Math.random() * 88, 4 + Math.random() * 14, 0, 6.283);
          ctx.fill();
        }
      }, false);
      m = new THREE.MeshStandardMaterial({ color: 0x0b0908, alphaMap: tex, transparent: true, opacity: 0.75, roughness: 0.12, metalness: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      break;
    }
    default: m = vc(matLib.get('liso', { roughness: 0.6 })); break;
  }
  m.userData.pfKey = key;
  set.set(key, m);
  return m;
}

// ---------------------------------------------------------------------------
// Kit de montagem: pilha de transformações + acúmulo por material
// ---------------------------------------------------------------------------
const PF_TMP = {
  m: new THREE.Matrix4(), e: new THREE.Euler(), q: new THREE.Quaternion(),
  p: new THREE.Vector3(), s: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0),
  a: new THREE.Vector3(), b: new THREE.Vector3(), nm: new THREE.Matrix3()
};
const PF_GEO_CACHE = new Map();

function pfC(hex, k = 1) {
  const c = new THREE.Color(hex);
  if (k !== 1) c.multiplyScalar(k);
  return c;
}

class PfKit {
  constructor(matLib) {
    this.matLib = matLib;
    this.parts = [];
    this.cur = new THREE.Matrix4();
    this.stack = [];
    this.detail = false;   // peças finas (somem de longe)
    this.uvWorld = 0;      // 0 = UV da primitiva; >0 = projeção em metros
    this.dust = 1;         // poeira vermelha na base
    this.cast = true;
    this.autoDetail = 0.16; // peças menores que isto (raio em m) viram detalhe
    this.autoNoCast = 0.32; // e estas não projetam sombra
  }
  push(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
    this.stack.push(this.cur.clone());
    PF_TMP.e.set(rx, ry, rz);
    PF_TMP.q.setFromEuler(PF_TMP.e);
    PF_TMP.m.compose(PF_TMP.p.set(x, y, z), PF_TMP.q, PF_TMP.s.set(s, s, s));
    this.cur.multiply(PF_TMP.m);
    return this;
  }
  pop() { this.cur.copy(this.stack.pop()); return this; }
  _push(geo, key, color, m) {
    const col = color instanceof THREE.Color ? color.clone() : new THREE.Color(color ?? 0xffffff);
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    const size = geo.boundingSphere.radius * m.getMaxScaleOnAxis();
    const detail = this.detail || size < this.autoDetail;
    const cast = this.cast && size >= this.autoNoCast;
    this.parts.push({ geo, key, col, m, detail, uvw: this.uvWorld, dust: this.dust, cast });
    return this;
  }
  add(geo, key, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    PF_TMP.e.set(rx, ry, rz);
    PF_TMP.q.setFromEuler(PF_TMP.e);
    const m = new THREE.Matrix4().compose(PF_TMP.p.set(x, y, z), PF_TMP.q, PF_TMP.s.set(sx, sy, sz));
    m.premultiply(this.cur);
    return this._push(geo, key, color, m);
  }
  // Peça cujo eixo +Y vai do ponto A ao ponto B (geometria de altura 1 centrada)
  span(geoUnit, key, color, ax, ay, az, bx, by, bz, sx = 1, sz = sx, twist = 0) {
    const A = PF_TMP.a.set(ax, ay, az), B = PF_TMP.b.set(bx, by, bz);
    const len = A.distanceTo(B);
    if (len < 1e-5) return this;
    const dir = B.clone().sub(A).divideScalar(len);
    const q = new THREE.Quaternion().setFromUnitVectors(PF_TMP.up, dir);
    if (twist) q.multiply(new THREE.Quaternion().setFromAxisAngle(PF_TMP.up, twist));
    const mid = A.clone().add(B).multiplyScalar(0.5);
    const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(sx, len, sz));
    m.premultiply(this.cur);
    return this._push(geoUnit, key, color, m);
  }
  rod(ax, ay, az, bx, by, bz, r, key, color, seg = 6) {
    return this.span(pfCylU(seg), key, color, ax, ay, az, bx, by, bz, r, r);
  }
  bar(ax, ay, az, bx, by, bz, w, d, key, color, twist = 0) {
    return this.span(pfBoxU(), key, color, ax, ay, az, bx, by, bz, w, d, twist);
  }
  tris() {
    let t = 0;
    for (const p of this.parts) t += (p.geo.index ? p.geo.index.count : p.geo.attributes.position.count) / 3;
    return t;
  }
  // Mescla tudo: uma malha por material (e outra para os detalhes)
  build(parent, opts = {}) {
    const buckets = new Map();
    for (const p of this.parts) {
      const cast = p.cast && !p.detail && !PF_NOCAST.has(p.key);
      const k = p.key + '|' + (p.detail ? 1 : 0) + '|' + (cast ? 1 : 0);
      if (!buckets.has(k)) buckets.set(k, { key: p.key, detail: p.detail, cast, list: [] });
      buckets.get(k).list.push(p);
    }
    let detailGroup = opts.detailGroup || null;
    const meshes = [];
    for (const b of buckets.values()) {
      let nv = 0, ni = 0;
      for (const p of b.list) {
        const g = p.geo;
        nv += g.attributes.position.count;
        ni += g.index ? g.index.count : g.attributes.position.count;
      }
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3);
      const uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3), dst = new Float32Array(nv);
      const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
      let vo = 0, io = 0;
      for (const p of b.list) {
        const g = p.geo, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, C = g.attributes.color;
        const e = p.m.elements;
        PF_TMP.nm.getNormalMatrix(p.m);
        const n = PF_TMP.nm.elements;
        const cr = p.col.r, cg = p.col.g, cb = p.col.b, uvw = p.uvw;
        for (let i = 0; i < P.count; i++) {
          const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
          const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
          const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
          const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
          const o3 = (vo + i) * 3, o2 = (vo + i) * 2;
          pos[o3] = wx; pos[o3 + 1] = wy; pos[o3 + 2] = wz;
          let nx = 0, ny = 1, nz = 0;
          if (N) {
            const ax = N.getX(i), ay = N.getY(i), az = N.getZ(i);
            nx = n[0] * ax + n[3] * ay + n[6] * az;
            ny = n[1] * ax + n[4] * ay + n[7] * az;
            nz = n[2] * ax + n[5] * ay + n[8] * az;
            const l = Math.hypot(nx, ny, nz) || 1;
            nx /= l; ny /= l; nz /= l;
          }
          nor[o3] = nx; nor[o3 + 1] = ny; nor[o3 + 2] = nz;
          if (uvw > 0) {
            const anx = Math.abs(nx), any = Math.abs(ny), anz = Math.abs(nz);
            if (any >= anx && any >= anz) { uv[o2] = wx * uvw; uv[o2 + 1] = wz * uvw; }
            else if (anx >= anz) { uv[o2] = wz * uvw; uv[o2 + 1] = wy * uvw; }
            else { uv[o2] = wx * uvw; uv[o2 + 1] = wy * uvw; }
          } else if (U) {
            uv[o2] = U.getX(i); uv[o2 + 1] = U.getY(i);
          }
          if (C) {
            col[o3] = cr * C.getX(i); col[o3 + 1] = cg * C.getY(i); col[o3 + 2] = cb * C.getZ(i);
          } else {
            col[o3] = cr; col[o3 + 1] = cg; col[o3 + 2] = cb;
          }
          dst[vo + i] = p.dust;
        }
        if (g.index) {
          const I = g.index.array;
          for (let i = 0; i < I.length; i++) idx[io + i] = I[i] + vo;
          io += I.length;
        } else {
          for (let i = 0; i < P.count; i++) idx[io + i] = vo + i;
          io += P.count;
        }
        vo += P.count;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('pfDust', new THREE.BufferAttribute(dst, 1));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeBoundingSphere();
      geo.computeBoundingBox();
      const mesh = new THREE.Mesh(geo, pfMaterial(this.matLib, b.key));
      mesh.castShadow = b.cast;
      mesh.receiveShadow = !PF_NOCAST.has(b.key) || b.key === 'iglass';
      mesh.name = 'kit:' + b.key + (b.detail ? ':det' : '');
      if (b.key === 'glass' || b.key === 'oil') mesh.renderOrder = 2;
      if (b.detail) {
        if (!detailGroup) { detailGroup = new THREE.Group(); detailGroup.name = 'detalhe'; parent.add(detailGroup); }
        detailGroup.add(mesh);
      } else {
        parent.add(mesh);
      }
      meshes.push(mesh);
    }
    this.parts.length = 0;
    return { group: parent, detail: detailGroup, meshes };
  }
}

// ---------------------------------------------------------------------------
// Primitivas (em cache) com UV e normais limpas
// ---------------------------------------------------------------------------
function pfCached(key, make) {
  let g = PF_GEO_CACHE.get(key);
  if (!g) { g = make(); PF_GEO_CACHE.set(key, g); }
  return g;
}
const pfQ = v => Math.round(v * 1000);

// Caixa chanfrada (44 triângulos): faces, 12 chanfros planos e 8 cantos
function pfCBox(w, h, d, r) {
  r = Math.max(0.002, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  return pfCached(`cb${pfQ(w)},${pfQ(h)},${pfQ(d)},${pfQ(r)}`, () => {
    const hs = [w / 2, h / 2, d / 2];
    const P = (c, f) => { const p = [0, 0, 0]; for (let a = 0; a < 3; a++) p[a] = c[a] * (a === f ? hs[a] : hs[a] - r); return p; };
    const tris = [];
    const quad = (a, b, c, e) => { tris.push(a, b, c, a, c, e); };
    const S = [-1, 1];
    for (let f = 0; f < 3; f++) for (const s of S) {
      const u = (f + 1) % 3, v = (f + 2) % 3;
      const c = (su, sv) => { const k = [0, 0, 0]; k[f] = s; k[u] = su; k[v] = sv; return k; };
      quad(P(c(-1, -1), f), P(c(1, -1), f), P(c(1, 1), f), P(c(-1, 1), f));
    }
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) {
      const cax = 3 - a - b;
      for (const sa of S) for (const sb of S) {
        const c = sc => { const k = [0, 0, 0]; k[a] = sa; k[b] = sb; k[cax] = sc; return k; };
        quad(P(c(-1), a), P(c(-1), b), P(c(1), b), P(c(1), a));
      }
    }
    for (const sx of S) for (const sy of S) for (const sz of S) { const c = [sx, sy, sz]; tris.push(P(c, 0), P(c, 1), P(c, 2)); }
    const pos = [], uv = [];
    for (let i = 0; i < tris.length; i += 3) {
      let [A, B, C] = [tris[i], tris[i + 1], tris[i + 2]];
      const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
      const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const cen = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3, (A[2] + B[2] + C[2]) / 3];
      if (n[0] * cen[0] + n[1] * cen[1] + n[2] * cen[2] < 0) [B, C] = [C, B];
      const an = n.map(Math.abs);
      const ax = an[0] >= an[1] && an[0] >= an[2] ? 0 : an[1] >= an[2] ? 1 : 2;
      const uA = (ax + 1) % 3 === 1 && ax === 0 ? 2 : (ax + 1) % 3, vA = ax === 1 ? 2 : 1;
      for (const V of [A, B, C]) {
        pos.push(V[0], V[1], V[2]);
        const ua = ax === 0 ? 2 : 0, va = ax === 1 ? 2 : 1;
        uv.push(V[ua] / (2 * hs[ua]) + 0.5, V[va] / (2 * hs[va]) + 0.5);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  });
}

// Caixa com cantos arredondados (estilo RoundedBox, 1 segmento por canto)
function pfRBox(w, h, d, r = 0.04) {
  // peças muito finas ou com raio mínimo não ganham nada com o chanfro: caixa simples
  if (r <= 0.012 || Math.min(w, h, d) <= 0.045) return pfBox(w, h, d);
  // peças médias: chanfro plano (44 tri); painéis grandes: canto arredondado suave (108 tri)
  if (Math.max(w, h, d) < 1.3 || r < 0.05) return pfCBox(w, h, d, r);
  r = Math.max(0.002, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  return pfCached(`rb${pfQ(w)},${pfQ(h)},${pfQ(d)},${pfQ(r)}`, () => {
    const s = 3;
    const g = new THREE.BoxGeometry(1, 1, 1, s, s, s);
    const P = g.attributes.position, N = g.attributes.normal;
    const hs = 0.5 / s;
    const bx = w / 2 - r, by = h / 2 - r, bz = d / 2 - r;
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i);
      n.copy(v);
      n.x -= Math.sign(n.x) * hs; n.y -= Math.sign(n.y) * hs; n.z -= Math.sign(n.z) * hs;
      n.normalize();
      P.setXYZ(i, bx * Math.sign(v.x) + n.x * r, by * Math.sign(v.y) + n.y * r, bz * Math.sign(v.z) + n.z * r);
      N.setXYZ(i, n.x, n.y, n.z);
    }
    return g;
  });
}
function pfBox(w, h, d) { return pfCached(`b${pfQ(w)},${pfQ(h)},${pfQ(d)}`, () => new THREE.BoxGeometry(w, h, d)); }
function pfBoxU() { return pfCached('boxU', () => new THREE.BoxGeometry(1, 1, 1)); }
function pfCylU(seg = 6) { return pfCached('cylU' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg, 1)); }
function pfCyl(rt, rb, h, seg = 12, open = false) {
  return pfCached(`c${pfQ(rt)},${pfQ(rb)},${pfQ(h)},${seg},${open ? 1 : 0}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open));
}
function pfSphere(r, ws = 12, hs = 8, ts = 0, tl = Math.PI) {
  return pfCached(`s${pfQ(r)},${ws},${hs},${pfQ(ts)},${pfQ(tl)}`, () => new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, ts, tl));
}
function pfTorus(R, r, rs = 6, ts = 16, arc = Math.PI * 2) {
  return pfCached(`t${pfQ(R)},${pfQ(r)},${rs},${ts},${pfQ(arc)}`, () => new THREE.TorusGeometry(R, r, rs, ts, arc));
}
function pfCapsule(r, len, cs = 3, rs = 8) {
  return pfCached(`k${pfQ(r)},${pfQ(len)},${cs},${rs}`, () => new THREE.CapsuleGeometry(r, len, cs, rs));
}
function pfCone(r, h, seg = 10) { return pfCached(`o${pfQ(r)},${pfQ(h)},${seg}`, () => new THREE.ConeGeometry(r, h, seg)); }
function pfLathe(key, pts, seg = 16) {
  return pfCached('l' + key + seg, () => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg));
}
// Placa em arco (para-lama), extrudada ao longo de Z e centrada
function pfArc(rIn, rOut, a0, a1, width, seg = 14) {
  return pfCached(`a${pfQ(rIn)},${pfQ(rOut)},${pfQ(a0)},${pfQ(a1)},${pfQ(width)}`, () => {
    const s = new THREE.Shape();
    s.moveTo(Math.cos(a0) * rOut, Math.sin(a0) * rOut);
    s.absarc(0, 0, rOut, a0, a1, false);
    s.lineTo(Math.cos(a1) * rIn, Math.sin(a1) * rIn);
    s.absarc(0, 0, rIn, a1, a0, true);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false, curveSegments: seg });
    g.translate(0, 0, -width / 2);
    return g;
  });
}
// Perfil 2D extrudado (pontos [x,y]) com espessura em Z, centrado
function pfExtrude(key, pts, depth, bevel = 0) {
  return pfCached('x' + key, () => {
    const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 10 });
    g.translate(0, 0, -depth / 2);
    return g;
  });
}
// Tubo por pontos (curva suave)
function pfTube(pts, r, seg = 12, radial = 6, closed = false) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), closed, 'catmullrom', 0.1);
  return new THREE.TubeGeometry(curve, seg, r, radial, closed);
}
// Tubo com cantos em raio (tubulação industrial)
function pfPipe(pts, r, bend = 0.6, radial = 8) {
  const path = new THREE.CurvePath();
  const V = pts.map(p => new THREE.Vector3(p[0], p[1], p[2]));
  let start = V[0].clone();
  for (let i = 1; i < V.length; i++) {
    const a = V[i - 1], b = V[i];
    if (i < V.length - 1) {
      const c = V[i + 1];
      const d1 = b.clone().sub(a), d2 = c.clone().sub(b);
      const k = Math.min(bend, d1.length() * 0.45, d2.length() * 0.45);
      const p1 = b.clone().sub(d1.normalize().multiplyScalar(k));
      const p2 = b.clone().add(d2.normalize().multiplyScalar(k));
      path.add(new THREE.LineCurve3(start, p1));
      path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2));
      start = p2;
    } else {
      path.add(new THREE.LineCurve3(start, b));
    }
  }
  const segs = Math.max(8, (V.length - 1) * 6);
  return new THREE.TubeGeometry(path, segs, r, radial, false);
}

// Helper de loft anatômico entre anéis elípticos [y, rx, rz, offsetZ, ao]
function makeLoftedGeo(rings, segs = 12, color = [1, 1, 1]) {
  const pos = [];
  const cols = [];
  const uvs = [];
  const idx = [];
  for (let i = 0; i < rings.length; i++) {
    const [y, rx, rz, oz = 0, ao = 1.0] = rings[i];
    const v = i / (rings.length - 1);
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      pos.push(Math.cos(a) * rx, y, oz + Math.sin(a) * rz);
      cols.push(color[0] * ao, color[1] * ao, color[2] * ao);
      uvs.push(j / segs, v);
    }
  }
  const row = segs + 1;
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * row + j, b = i * row + j + 1;
      const c = (i + 1) * row + j, d = (i + 1) * row + j + 1;
      idx.push(a, d, b, a, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function makeBeveledBox(w, h, d, bevel = 0.06) {
  return pfRBox(w, h, d, bevel).clone();
}

// ---------------------------------------------------------------------------
// Paleta (cores fictícias, sem identidade de marca)
// ---------------------------------------------------------------------------
const PF_COL = {
  graphite: 0x2a2e31, black: 0x17191b, steel: 0x8d959b, galv: 0xa9b1b5, chrome: 0xc9cfd2,
  harvest: 0xd29a1f, roofCap: 0xe7e9e4, rail: 0xe9b923, tractor: 0x4f7d57, tractorRed: 0x93392a,
  rimSilver: 0xb3b9bd, cart: 0x1d6a5f, red: 0xb3301f, amber: 0xffa21a, lamp: 0xfff1d0,
  reflect: 0xdfe4dd, cane: 0x8f8a3e, straw: 0xc2ae66
};

// ---------------------------------------------------------------------------
// Rodas: pneu de garras (agrícola) ou rodoviário, aro e cubo. Eixo = X local.
// ---------------------------------------------------------------------------
function pfTireGeo(r, w, groove = false) {
  return pfCached(`tire${pfQ(r)},${pfQ(w)},${groove ? 1 : 0}`, () => {
    const hw = w / 2, rin = r * 0.62;
    const prof = groove
      ? [[rin, -hw * 0.8], [r * 0.82, -hw], [r * 0.95, -hw * 0.94], [r, -hw * 0.7], [r, -hw * 0.08], [r * 0.975, 0], [r, hw * 0.08], [r, hw * 0.7], [r * 0.95, hw * 0.94], [r * 0.82, hw], [rin, hw * 0.8], [rin, -hw * 0.8]]
      : [[rin, -hw * 0.82], [r * 0.8, -hw], [r * 0.93, -hw * 0.95], [r * 0.985, -hw * 0.76], [r, -hw * 0.45], [r, hw * 0.45], [r * 0.985, hw * 0.76], [r * 0.93, hw * 0.95], [r * 0.8, hw], [rin, hw * 0.82], [rin, -hw * 0.82]];
    const g = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), r > 0.6 ? 24 : 18);
    g.rotateZ(-Math.PI / 2);
    return g;
  });
}

function kitWheel(k, r, w, rimColor = PF_COL.rimSilver, opts = {}) {
  const agri = opts.agri !== false;
  const side = opts.side ?? 1; // +1: face externa em +X
  k.add(pfTireGeo(r, w, !agri), 'rubber', 0x2a2b2d);
  const hw = w / 2;
  if (agri) {
    // Garras em V (chevron) alternadas
    const N = Math.max(14, Math.round((Math.PI * 2 * r) / 0.27));
    const t = 0.035 + r * 0.05;
    const lugLen = hw * 1.05, lugTh = (Math.PI * 2 * r / N) * 0.36;
    const det = k.detail;
    k.detail = opts.lugDetail ?? true;
    for (let i = 0; i < N; i++) {
      for (const sgn of [-1, 1]) {
        const a = (i + (sgn > 0 ? 0.5 : 0)) / N * Math.PI * 2;
        const R = r + t * 0.35;
        k.add(pfBox(lugLen, t, lugTh), 'rubber', 0x262729, sgn * hw * 0.48, Math.cos(a) * R, Math.sin(a) * R, a, sgn * 0.42, 0);
      }
    }
    k.detail = det;
  }
  // Aro: disco recuado, aba, cubo e porcas
  const rr = r * 0.61;
  const sx = side;
  k.add(pfCyl(rr, rr, w * 0.74, 22), 'paint', rimColor, 0, 0, 0, 0, 0, Math.PI / 2);
  k.add(pfTorus(rr * 1.0, 0.018 + r * 0.012, 4, 22), 'paint', rimColor, sx * w * 0.37, 0, 0, 0, Math.PI / 2, 0);
  k.add(pfCyl(rr * 0.82, rr * 0.82, 0.02, 20), 'paint', pfC(rimColor, 0.82), sx * w * 0.36, 0, 0, 0, 0, Math.PI / 2);
  k.add(pfCyl(r * 0.2, r * 0.24, w * 0.22, 14), 'metal', PF_COL.graphite, sx * (w * 0.42), 0, 0, 0, 0, Math.PI / 2);
  k.add(pfCyl(r * 0.1, r * 0.13, 0.06, 10), 'metal', PF_COL.chrome, sx * (w * 0.55), 0, 0, 0, 0, Math.PI / 2);
  const det = k.detail;
  k.detail = true;
  const nb = r > 0.6 ? 10 : 8;
  for (let i = 0; i < nb; i++) {
    const a = i / nb * Math.PI * 2;
    k.add(pfCyl(0.022, 0.022, 0.05, 6), 'metal', PF_COL.chrome, sx * w * 0.5, Math.cos(a) * r * 0.29, Math.sin(a) * r * 0.29, 0, 0, Math.PI / 2);
  }
  if (agri) {
    for (let i = 0; i < 6; i++) {
      const a = (i + 0.5) / 6 * Math.PI * 2;
      k.add(pfCyl(r * 0.075, r * 0.075, 0.03, 10), 'rough', 0x101112, sx * w * 0.37, Math.cos(a) * r * 0.44, Math.sin(a) * r * 0.44, 0, 0, Math.PI / 2);
    }
  }
  k.detail = det;
}

function buildWheel(matLib, radius = 0.55, width = 0.34, rimColor = 0xd8dce0) {
  const g = new THREE.Group();
  const k = new PfKit(matLib);
  k.push(0, 0, 0, 0, Math.PI / 2, 0);
  kitWheel(k, radius, width, rimColor);
  k.pop();
  k.build(g);
  return g;
}

// ---------------------------------------------------------------------------
// TRATOR (frente em +Z, chão em y=0)
// ---------------------------------------------------------------------------
function kitTractor(k, color = PF_COL.tractor, opts = {}) {
  const P = color, D = PF_COL.graphite, M = PF_COL.steel;
  const rimC = opts.aro ?? PF_COL.rimSilver;
  // Rodas
  for (const s of [-1, 1]) {
    k.push(s * 0.95, 0.84, -0.9); kitWheel(k, 0.84, 0.5, rimC, { side: s }); k.pop();
    k.push(s * 0.8, 0.52, 1.5); kitWheel(k, 0.52, 0.3, rimC, { side: s }); k.pop();
  }
  // Chassi, transmissão e eixos
  k.add(pfRBox(0.62, 0.42, 2.6, 0.05), 'metal', D, 0, 0.78, 0.55);
  k.add(pfRBox(0.86, 0.72, 0.9, 0.1), 'metal', D, 0, 1.0, -0.9);
  k.add(pfCyl(0.11, 0.13, 1.5, 12), 'metal', D, 0, 0.84, -0.9, 0, 0, Math.PI / 2);
  k.add(pfCyl(0.07, 0.07, 1.36, 10), 'metal', D, 0, 0.52, 1.5, 0, 0, Math.PI / 2);
  k.add(pfRBox(0.3, 0.22, 0.5, 0.04), 'metal', D, 0, 0.6, 1.5);
  // Lastro dianteiro (placas)
  k.add(pfRBox(0.82, 0.12, 0.4, 0.03), 'metal', D, 0, 0.66, 2.07);
  for (let i = 0; i < 8; i++) k.add(pfRBox(0.085, 0.44, 0.5, 0.02), 'paint', 0x3b3f42, -0.35 + i * 0.1, 0.94, 2.1);
  // Bloco do motor sob o capô
  k.add(pfRBox(0.56, 0.38, 1.6, 0.05), 'metal', 0x3a3e41, 0, 1.0, 0.95);
  // Capô (fechado ou aberto)
  const hood = () => {
    k.add(pfRBox(0.86, 0.6, 1.88, 0.14), 'paint', P, 0, -0.3, 0.94);
    k.add(pfRBox(0.88, 0.05, 1.7, 0.02), 'paint', pfC(P, 0.75), 0, -0.47, 0.95);
    for (const s of [-1, 1]) {
      k.add(pfRBox(0.02, 0.26, 0.8, 0.008), 'metal', D, s * 0.433, -0.3, 1.25);
      if (!opts.lowDetail) {
        const det = k.detail; k.detail = true;
        for (let i = 0; i < 5; i++) k.add(pfBox(0.02, 0.025, 0.74), 'metal', 0x6f777c, s * 0.442, -0.4 + i * 0.05, 1.25);
        k.detail = det;
      }
    }
  };
  if (opts.capoAberto) {
    k.push(0, 1.66, -0.02, -0.95, 0, 0); hood(); k.pop();
    // Motor exposto
    k.add(pfRBox(0.44, 0.34, 0.95, 0.04), 'metal', 0x5d6367, 0, 1.3, 0.85);
    k.add(pfRBox(0.3, 0.08, 0.78, 0.03), 'paint', 0xa8432c, 0, 1.51, 0.85);
    for (let i = 0; i < 4; i++) k.add(pfCyl(0.025, 0.025, 0.08, 8), 'metal', PF_COL.chrome, 0, 1.57, 0.6 + i * 0.17);
    k.add(pfRBox(0.66, 0.52, 0.09, 0.02), 'metal', 0x202325, 0, 1.33, 1.72);
    for (let i = 0; i < 7; i++) k.add(pfBox(0.6, 0.02, 0.1), 'metal', 0x5a6064, 0, 1.12 + i * 0.07, 1.74);
    k.add(pfTorus(0.17, 0.018, 4, 14), 'rubber', 0x151515, 0.08, 1.2, 1.42);
    k.add(pfTorus(0.08, 0.016, 4, 12), 'rubber', 0x151515, -0.12, 1.36, 1.42);
    k.add(pfCyl(0.09, 0.09, 0.5, 12), 'paint', 0x24292c, 0.26, 1.45, 0.55, Math.PI / 2, 0, 0);
    k.add(pfCyl(0.06, 0.06, 0.16, 10), 'paint', 0xc8a623, -0.24, 1.32, 0.62);
    k.add(pfTube([[0.26, 1.45, 0.82], [0.2, 1.52, 1.2], [0.1, 1.42, 1.62]], 0.035, 10, 6), 'rubber', 0x1b1c1d);
    k.add(pfTube([[-0.2, 1.2, 1.6], [-0.26, 1.08, 1.2], [-0.18, 1.05, 0.7]], 0.03, 10, 6), 'rubber', 0x1b1c1d);
    k.add(pfRBox(0.24, 0.2, 0.3, 0.02), 'rough', 0x1d2022, -0.22, 1.25, 1.2);
  } else {
    k.push(0, 1.66, -0.02); hood(); k.pop();
  }
  // Grade frontal, faróis
  k.add(pfRBox(0.7, 0.52, 0.06, 0.02), 'metal', 0x191b1d, 0, 1.33, 1.86);
  for (let i = 0; i < 6; i++) k.add(pfBox(0.64, 0.022, 0.04), 'metal', 0x6d7479, 0, 1.13 + i * 0.075, 1.9);
  for (const s of [-1, 1]) {
    k.add(pfRBox(0.17, 0.09, 0.05, 0.02), 'metal', 0x111214, s * 0.25, 1.63, 1.86);
    k.add(pfRBox(0.14, 0.065, 0.02, 0.01), 'emit', pfC(PF_COL.lamp, 1.6), s * 0.25, 1.63, 1.89);
  }
  // Escapamento e pré-filtro
  k.add(pfTube([[0.3, 1.62, 0.3], [0.3, 2.6, 0.3], [0.31, 2.86, 0.24], [0.34, 2.95, 0.16]], 0.045, 12, 8), 'metal', 0x2b2d2f);
  k.add(pfCyl(0.075, 0.075, 0.55, 12), 'metal', 0x9aa0a4, 0.3, 2.2, 0.3);
  k.add(pfCyl(0.055, 0.06, 0.42, 10), 'paint', 0x1e2224, -0.3, 1.88, 0.32);
  k.add(pfCyl(0.085, 0.085, 0.1, 12), 'paint', 0x1e2224, -0.3, 2.13, 0.32);
  // Tanque e caixa de bateria
  k.add(pfRBox(0.32, 0.44, 0.62, 0.09), 'paint', P, 0.5, 1.14, 0.1);
  k.add(pfRBox(0.3, 0.3, 0.42, 0.04), 'metal', D, -0.5, 1.05, 0.12);
  // Cabine
  k.add(pfRBox(1.32, 0.28, 1.5, 0.06), 'paint', P, 0, 1.64, -0.84);
  for (const sx of [-0.63, 0.63]) {
    for (const sz of [-1.55, -0.12]) k.add(pfRBox(0.075, 1.42, 0.075, 0.02), 'metal', 0x1a1c1e, sx, 2.48, sz);
    k.add(pfRBox(0.06, 1.3, 0.05, 0.015), 'metal', 0x1a1c1e, sx, 2.44, -0.95);
  }
  k.add(pfRBox(1.5, 0.15, 1.66, 0.07), 'paint', P, 0, 3.24, -0.84);
  k.add(pfRBox(1.34, 0.07, 1.48, 0.035), 'paint', PF_COL.roofCap, 0, 3.34, -0.84);
  k.add(pfRBox(1.2, 1.32, 0.02, 0.006), 'glass', 0xffffff, 0, 2.46, -0.12);
  k.add(pfRBox(1.2, 1.32, 0.02, 0.006), 'glass', 0xffffff, 0, 2.46, -1.55);
  for (const s of [-1, 1]) k.add(pfRBox(0.02, 1.32, 1.4, 0.006), 'glass', 0xffffff, s * 0.635, 2.46, -0.84);
  // Interior
  k.add(pfRBox(0.46, 0.12, 0.44, 0.04), 'rough', 0x232628, 0, 1.98, -1.08);
  k.add(pfRBox(0.46, 0.55, 0.1, 0.04), 'rough', 0x232628, 0, 2.28, -1.3);
  k.rod(0, 1.78, -0.35, 0, 2.26, -0.6, 0.025, 'metal', D);
  k.add(pfTorus(0.17, 0.018, 4, 16), 'rough', 0x16181a, 0, 2.28, -0.62, -0.75, 0, 0);
  k.add(pfRBox(0.9, 0.22, 0.25, 0.04), 'rough', 0x1d2022, 0, 1.92, -0.25);
  // Para-lamas traseiros e dianteiros
  for (const s of [-1, 1]) {
    k.add(pfArc(0.9, 0.95, 0.25, Math.PI - 0.25, 0.6), 'paint', P, s * 0.95, 0.84, -0.9, 0, Math.PI / 2, 0);
    k.add(pfRBox(0.55, 0.05, 0.6, 0.02), 'paint', P, s * 0.95, 1.72, -0.9);
    k.add(pfArc(0.56, 0.59, 0.4, Math.PI - 0.4, 0.34), 'paint', P, s * 0.8, 0.52, 1.5, 0, Math.PI / 2, 0);
    k.add(pfRBox(0.08, 0.1, 0.05, 0.015), 'emit', pfC(0xff2a1a, 1.2), s * 1.14, 1.58, -1.62);
    k.add(pfRBox(0.06, 0.06, 0.05, 0.015), 'emit', pfC(PF_COL.amber, 1.3), s * 1.14, 1.6, -0.18);
  }
  // Degraus e corrimão (lado esquerdo)
  for (let i = 0; i < 3; i++) k.add(pfRBox(0.3, 0.035, 0.22, 0.01), 'metal', 0x50575b, -0.74, 0.55 + i * 0.36, 0.05);
  k.rod(-0.7, 1.75, -0.12, -0.7, 2.75, -0.12, 0.018, 'paint', 0x1a1c1e);
  // Engate de 3 pontos e barra de tração
  k.add(pfRBox(0.12, 0.08, 0.6, 0.02), 'metal', D, 0, 0.56, -1.72);
  k.rod(-0.3, 0.75, -1.3, -0.35, 0.55, -1.95, 0.035, 'metal', D);
  k.rod(0.3, 0.75, -1.3, 0.35, 0.55, -1.95, 0.035, 'metal', D);
  k.rod(0, 1.25, -1.35, 0, 1.05, -1.95, 0.03, 'metal', 0xc8a623);
  // Espelhos e luzes de teto
  const det = k.detail; k.detail = true;
  for (const s of [-1, 1]) {
    k.rod(s * 0.66, 2.95, -0.14, s * 0.96, 2.84, 0.04, 0.014, 'metal', 0x1a1c1e);
    k.add(pfRBox(0.04, 0.24, 0.15, 0.015), 'metal', 0x1a1c1e, s * 0.98, 2.78, 0.06);
  }
  k.detail = det;
  for (const s of [-1, 1]) {
    k.add(pfRBox(0.14, 0.07, 0.06, 0.02), 'metal', 0x111214, s * 0.42, 3.22, -0.02);
    k.add(pfRBox(0.12, 0.05, 0.015, 0.01), 'emit', pfC(PF_COL.lamp, 1.5), s * 0.42, 3.22, 0.012);
  }
  k.add(pfCyl(0.06, 0.07, 0.05, 10), 'metal', 0x111214, 0.45, 3.4, -1.3);
  k.add(pfCyl(0.055, 0.06, 0.12, 10), 'beacon', pfC(PF_COL.amber, 1.6), 0.45, 3.48, -1.3);
}

function buildTractor(matLib, color = PF_COL.tractor, opts = {}) {
  const g = new THREE.Group();
  const k = new PfKit(matLib);
  kitTractor(k, color, opts);
  k.build(g);
  return g;
}

// ---------------------------------------------------------------------------
// COLHEDORA DE CANA (frente em +Z). Elevador lateral descarrega em PF_HARV_DISCHARGE.
// ---------------------------------------------------------------------------
const PF_HARV_DISCHARGE = { x: 4.05, y: 4.25, z: -6.6 };

function kitTrack(k, s) {
  const L = 3.5, R = 0.45, W = 0.52, cz = -0.4;
  const half = L / 2 - R;
  const shape = [];
  for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI; shape.push([half + Math.cos(a) * R, R + Math.sin(a) * R]); }
  for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + (i / 10) * Math.PI; shape.push([-half + Math.cos(a) * R, R + Math.sin(a) * R]); }
  const x = s * 1.14;
  k.add(pfExtrude('trk', shape, W, 0.02), 'rubber', 0x1f2022, x, 0, cz, 0, -Math.PI / 2, 0);
  // Rodas guia, roletes e roda motriz
  k.add(pfCyl(0.4, 0.4, W + 0.04, 18), 'metal', 0x2c3033, x, R, cz - half, 0, 0, Math.PI / 2);
  k.add(pfCyl(0.38, 0.38, W + 0.04, 18), 'metal', 0x2c3033, x, R, cz + half, 0, 0, Math.PI / 2);
  k.add(pfCyl(0.16, 0.16, 0.08, 10), 'metal', PF_COL.harvest, x + s * (W / 2 + 0.04), R, cz - half, 0, 0, Math.PI / 2);
  k.add(pfCyl(0.15, 0.15, 0.08, 10), 'metal', PF_COL.harvest, x + s * (W / 2 + 0.04), R, cz + half, 0, 0, Math.PI / 2);
  for (let i = 0; i < 5; i++) k.add(pfCyl(0.13, 0.13, 0.07, 10), 'metal', 0x50575b, x + s * (W / 2 + 0.02), 0.2, cz - half + 0.45 + i * 0.5, 0, 0, Math.PI / 2);
  k.add(pfRBox(0.12, 0.34, L - 0.9, 0.03), 'metal', 0x2c3033, x + s * (W / 2 + 0.06), 0.42, cz);
  // Garras da esteira (corrida superior)
  const det = k.detail; k.detail = true;
  for (let i = 0; i < 17; i++) k.add(pfBox(W + 0.02, 0.05, 0.07), 'rubber', 0x232426, x, 2 * R + 0.02, cz - half + i * (2 * half / 16));
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    k.add(pfBox(W * 0.5, 0.06, 0.09), 'metal', 0x3a3e41, x, R + Math.cos(a) * 0.41, cz - half + Math.sin(a) * 0.41, a, 0, 0);
  }
  k.detail = det;
  // Para-lama da esteira
  k.add(pfRBox(0.66, 0.06, 3.6, 0.025), 'paint', PF_COL.harvest, x, 1.0, cz);
  k.add(pfRBox(0.06, 0.18, 3.6, 0.02), 'paint', PF_COL.harvest, x + s * 0.32, 0.94, cz);
}

function kitHarvester(k) {
  const P = PF_COL.harvest, D = PF_COL.graphite, M = PF_COL.steel, Y = PF_COL.rail;
  kitTrack(k, -1); kitTrack(k, 1);
  // Chassi e corpo
  k.add(pfRBox(1.7, 0.5, 5.0, 0.06), 'metal', D, 0, 1.05, -1.1);
  k.add(pfRBox(2.32, 1.58, 2.5, 0.14), 'paint', P, 0, 2.02, -2.4);
  k.add(pfRBox(2.22, 0.14, 2.38, 0.06), 'paint', pfC(P, 0.92), 0, 2.86, -2.4);
  k.add(pfRBox(2.1, 1.3, 0.06, 0.02), 'metal', 0x15171a, 0, 2.0, -3.66);
  for (const s of [-1, 1]) {
    k.add(pfRBox(0.04, 0.62, 1.25, 0.015), 'metal', 0x1b1d20, s * 1.165, 2.18, -2.25);
    k.add(pfRBox(0.03, 0.04, 2.3, 0.01), 'metal', 0x6b7277, s * 1.17, 1.5, -2.4);
  }
  const det0 = k.detail; k.detail = true;
  for (let i = 0; i < 9; i++) k.add(pfBox(2.0, 0.035, 0.05), 'metal', 0x50575b, 0, 1.45 + i * 0.13, -3.7);
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) k.add(pfBox(0.03, 0.03, 1.15), 'metal', 0x50575b, s * 1.19, 1.94 + i * 0.09, -2.25);
  k.detail = det0;
  k.add(pfRBox(1.95, 1.32, 2.2, 0.12), 'paint', P, 0, 1.6, -0.05);
  k.add(pfRBox(1.6, 0.92, 1.1, 0.08), 'metal', 0x33373a, 0, 1.02, 1.45);
  k.add(pfRBox(0.5, 0.7, 1.2, 0.08), 'paint', P, 0.9, 1.75, 0.2);
  // Plataforma e cabine
  k.add(pfRBox(2.2, 0.1, 2.0, 0.03), 'metal', 0x3a3e41, 0, 2.3, 1.4);
  k.add(pfRBox(1.84, 0.36, 1.72, 0.08), 'paint', P, 0, 2.52, 1.42);
  for (const s of [-1, 1]) {
    k.add(pfRBox(0.08, 1.32, 0.08, 0.025), 'metal', 0x17191b, s * 0.87, 3.33, 0.6);
    k.add(pfRBox(0.08, 1.34, 0.08, 0.025), 'metal', 0x17191b, s * 0.87, 3.33, 2.22, 0.06, 0, 0);
  }
  k.add(pfRBox(2.02, 0.2, 2.0, 0.09), 'paint', P, 0, 4.06, 1.42);
  k.add(pfRBox(1.82, 0.08, 1.78, 0.04), 'paint', PF_COL.roofCap, 0, 4.2, 1.4);
  k.add(pfRBox(2.06, 0.06, 0.32, 0.02), 'metal', 0x17191b, 0, 3.98, 2.48);
  k.add(pfRBox(1.68, 1.28, 0.02, 0.006), 'glass', 0xffffff, 0, 3.33, 2.24, 0.06, 0, 0);
  k.add(pfRBox(1.68, 1.28, 0.02, 0.006), 'glass', 0xffffff, 0, 3.33, 0.6);
  for (const s of [-1, 1]) k.add(pfRBox(0.02, 1.28, 1.56, 0.006), 'glass', 0xffffff, s * 0.875, 3.33, 1.41);
  k.add(pfRBox(0.5, 0.14, 0.5, 0.04), 'rough', 0x232628, 0, 2.86, 1.2);
  k.add(pfRBox(0.5, 0.62, 0.12, 0.04), 'rough', 0x232628, 0, 3.18, 0.96);
  k.add(pfRBox(0.22, 0.42, 0.5, 0.04), 'rough', 0x1d2022, 0.42, 2.92, 1.35);
  k.rod(0, 2.72, 1.95, 0, 3.12, 1.72, 0.03, 'metal', D);
  k.add(pfTorus(0.17, 0.018, 4, 16), 'rough', 0x16181a, 0, 3.14, 1.7, -0.8, 0, 0);
  // Luzes e giroflex
  for (const x of [-0.72, -0.28, 0.28, 0.72]) {
    k.add(pfRBox(0.18, 0.09, 0.07, 0.02), 'metal', 0x111214, x, 4.06, 2.45);
    k.add(pfRBox(0.15, 0.065, 0.02, 0.01), 'emit', pfC(PF_COL.lamp, 1.7), x, 4.06, 2.49);
  }
  for (const s of [-1, 1]) k.add(pfRBox(0.15, 0.065, 0.02, 0.01), 'emit', pfC(PF_COL.lamp, 1.4), s * 0.6, 2.9, -3.7);
  k.add(pfCyl(0.08, 0.09, 0.06, 10), 'metal', 0x111214, 0.62, 4.27, 0.85);
  k.add(pfCyl(0.07, 0.075, 0.14, 10), 'beacon', pfC(PF_COL.amber, 1.6), 0.62, 4.37, 0.85);
  // Escada de acesso e corrimãos (lado esquerdo)
  k.rod(-1.5, 0.3, 2.15, -1.25, 2.3, 1.95, 0.025, 'paint', Y);
  k.rod(-1.5, 0.3, 1.7, -1.25, 2.3, 1.5, 0.025, 'paint', Y);
  for (let i = 0; i < 5; i++) {
    const t = (i + 0.5) / 5;
    k.add(pfRBox(0.12, 0.035, 0.46, 0.01), 'metal', 0x50575b, -1.5 + 0.25 * t, 0.3 + 2.0 * t, 1.83 - 0.2 * t);
  }
  k.add(pfTube([[-1.1, 2.35, 0.55], [-1.12, 3.15, 0.55], [-1.12, 3.15, 2.38], [-1.1, 2.35, 2.42]], 0.022, 20, 6), 'paint', Y);
  k.add(pfTube([[-1.12, 2.35, 0.2], [-1.15, 3.0, 0.1], [-1.15, 3.0, -3.4], [-1.15, 2.86, -3.55]], 0.02, 20, 6), 'paint', Y);
  k.rod(-1.15, 2.86, -1.5, -1.15, 3.0, -1.5, 0.02, 'paint', Y);
  // Extrator primário (topo)
  k.add(pfCyl(0.7, 0.74, 0.62, 20), 'paint', P, 0, 2.62, -0.6);
  k.add(pfCyl(0.78, 0.78, 0.09, 20), 'metal', D, 0, 2.97, -0.6);
  k.add(pfCyl(0.62, 0.7, 0.32, 20), 'paint', P, 0, 3.17, -0.6);
  k.add(pfRBox(0.56, 0.42, 0.95, 0.12), 'paint', P, -0.52, 3.32, -0.6, 0, 0, 0.35);
  k.add(pfCyl(0.48, 0.48, 0.03, 18), 'metal', 0x1b1d20, 0, 3.34, -0.6);
  // Escapamento
  k.add(pfTube([[0.75, 2.85, -2.9], [0.75, 3.45, -2.9], [0.82, 3.6, -3.0]], 0.06, 8, 8), 'metal', 0x2b2d2f);
  // Frente: divisores de linha, rolo tombador, corte de base, despontador
  for (const s of [-1, 1]) {
    const bx = s * 0.95, by = 1.55, bz = 2.25, tx = s * 0.98, ty = 0.26, tz = 3.95;
    k.span(pfCone(1, 1, 14), 'paint', P, tx, ty, tz, bx, by, bz, 0.27, 0.27);
    k.add(pfRBox(0.22, 0.2, 1.3, 0.05), 'metal', 0x3a3e41, tx, 0.14, tz - 0.3);
    k.add(pfRBox(0.06, 1.05, 1.75, 0.02), 'paint', P, s * 1.28, 1.05, 2.85);
    const det = k.detail; k.detail = true;
    const helix = [];
    for (let i = 0; i <= 28; i++) {
      const t = i / 28, a = t * Math.PI * 9 * s;
      const rr = 0.27 * (1 - t) + 0.03;
      const cx = bx + (tx - bx) * t, cy = by + (ty - by) * t, cz = bz + (tz - bz) * t;
      helix.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.75, cz + Math.sin(a) * rr * 0.6]);
    }
    k.add(pfTube(helix, 0.022, 40, 4), 'metal', 0x9aa0a4);
    k.detail = det;
  }
  k.add(pfCyl(0.2, 0.2, 1.75, 14), 'metal', D, 0, 0.88, 3.25, 0, 0, Math.PI / 2);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; k.add(pfBox(1.7, 0.05, 0.04), 'metal', 0x6b7277, 0, 0.88 + Math.cos(a) * 0.21, 3.25 + Math.sin(a) * 0.21, a, 0, 0); }
  k.add(pfCyl(0.17, 0.17, 1.5, 12), 'metal', 0x3a3e41, 0, 0.78, 2.4, 0, 0, Math.PI / 2);
  k.add(pfCyl(0.15, 0.15, 1.5, 12), 'metal', 0x3a3e41, 0, 1.15, 2.6, 0, 0, Math.PI / 2);
  for (const s of [-1, 1]) {
    k.add(pfCyl(0.48, 0.48, 0.05, 18), 'metal', 0x6b7277, s * 0.5, 0.24, 2.95);
    k.add(pfCyl(0.12, 0.14, 0.32, 10), 'metal', D, s * 0.5, 0.42, 2.95);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + s; k.add(pfBox(0.22, 0.015, 0.09), 'metal', PF_COL.chrome, s * 0.5 + Math.cos(a) * 0.5, 0.22, 2.95 + Math.sin(a) * 0.5, 0, -a, 0); }
  }
  // Despontador: braço, cilindros e cabeça com tambores coletores
  k.bar(0, 3.1, 2.3, 0, 3.55, 4.05, 0.18, 0.22, 'paint', P);
  k.rod(0.16, 2.6, 2.2, 0.16, 3.35, 3.4, 0.045, 'metal', PF_COL.chrome);
  k.rod(-0.16, 2.6, 2.2, -0.16, 3.35, 3.4, 0.045, 'metal', PF_COL.chrome);
  k.add(pfRBox(1.5, 0.3, 0.7, 0.08), 'paint', P, 0, 3.55, 4.3);
  for (const s of [-1, 1]) {
    k.add(pfCyl(0.16, 0.2, 0.8, 14), 'paint', P, s * 0.5, 3.0, 4.45);
    k.add(pfCyl(0.3, 0.3, 0.05, 16), 'metal', 0x3a3e41, s * 0.5, 2.6, 4.45);
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + s; k.add(pfBox(0.04, 0.72, 0.1), 'metal', 0x50575b, s * 0.5 + Math.cos(a) * 0.2, 3.0, 4.45 + Math.sin(a) * 0.2, 0, -a, 0.25); }
  }
  k.add(pfCyl(0.5, 0.5, 0.06, 18), 'metal', 0x6b7277, 0, 3.36, 4.35);
  // Mangueiras hidráulicas
  k.add(pfTube([[0.6, 2.3, 1.0], [0.75, 2.0, 2.0], [0.62, 1.4, 2.6]], 0.03, 10, 5), 'rubber', 0x111111);
  k.add(pfTube([[0.5, 2.3, 1.0], [0.68, 1.95, 2.0], [0.5, 1.3, 2.7]], 0.03, 10, 5), 'rubber', 0x111111);
  // Base giratória do elevador
  k.add(pfCyl(0.5, 0.55, 0.3, 18), 'metal', D, 0, 1.25, -3.95);
  k.add(pfRBox(0.9, 0.5, 0.7, 0.06), 'paint', P, 0, 1.25, -4.1);
  // Elevador lateral com taliscas (giro para a direita, inclinado 30°)
  const yaw = Math.atan2(0.82, -0.57), pitch = -0.52;
  k.push(0, 1.42, -4.05, 0, yaw, 0);
  k.push(0, 0, 0, pitch, 0, 0);
  const L = 5.7;
  k.add(pfRBox(0.94, 0.07, L, 0.02), 'metal', 0x2c3033, 0, 0, L / 2);
  k.add(pfRBox(0.88, 0.2, L, 0.03), 'metal', 0x2c3033, 0, -0.16, L / 2);
  for (const s of [-1, 1]) {
    k.add(pfRBox(0.05, 0.58, L, 0.015), 'paint', P, s * 0.48, 0.26, L / 2);
    k.add(pfRBox(0.09, 0.06, L, 0.02), 'paint', pfC(P, 0.85), s * 0.48, 0.56, L / 2);
  }
  for (let i = 0; i < 14; i++) k.add(pfRBox(0.86, 0.05, 0.05, 0.01), 'metal', 0x8a9297, 0, 0.06, 0.35 + i * 0.39);
  const det1 = k.detail; k.detail = true;
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) k.add(pfBox(0.03, 0.52, 0.05), 'paint', pfC(P, 0.8), s * 0.51, 0.26, 0.4 + i * 0.62);
  for (let i = 0; i < 18; i++) {
    const z = 0.5 + (i * 0.29) % 5.0, x = ((i * 37) % 7) / 7 * 0.6 - 0.3;
    k.add(pfCyl(0.026, 0.026, 0.24, 6), 'rough', i % 3 ? 0x9a8f46 : 0x6c4c3c, x, 0.12, z, 0.2 * i, 1.2 + i, Math.PI / 2);
  }
  k.detail = det1;
  // Extrator secundário e aba de descarga
  k.add(pfCyl(0.5, 0.55, 0.7, 18), 'paint', P, 0, 0.62, L - 0.3);
  k.add(pfCyl(0.56, 0.56, 0.06, 18), 'metal', D, 0, 1.0, L - 0.3);
  k.add(pfRBox(0.42, 0.34, 0.7, 0.1), 'paint', P, 0, 1.12, L - 0.65, 0.6, 0, 0);
  k.add(pfRBox(0.94, 0.04, 0.7, 0.01), 'paint', P, 0, -0.18, L + 0.2, 0.75, 0, 0);
  k.add(pfTube([[0.3, -0.25, 0.3], [0.35, -0.3, 2.8], [0.3, -0.28, L - 0.3]], 0.025, 10, 5), 'rubber', 0x111111);
  k.pop(); k.pop();
  // Cilindro de sustentação do elevador
  k.rod(0.4, 0.95, -4.0, 1.2, 2.35, -4.95, 0.06, 'metal', PF_COL.chrome);
  k.rod(0.4, 0.95, -4.0, 0.85, 1.75, -4.5, 0.09, 'metal', D);
  // Jato de cana picada caindo no transbordo
  const det2 = k.detail; k.detail = true;
  const dx = PF_HARV_DISCHARGE.x, dz = PF_HARV_DISCHARGE.z;
  for (let i = 0; i < 26; i++) {
    const t = i / 26;
    const y = 4.15 - t * 0.85;
    k.add(pfCyl(0.026, 0.026, 0.22, 6), 'rough', i % 4 ? 0x9c9148 : 0x6c4c3c, dx + Math.sin(i * 2.3) * 0.22 + 0.25 * t, y, dz + Math.cos(i * 1.7) * 0.28, i * 0.7, i * 1.3, i * 0.4);
  }
  k.detail = det2;
}

function buildHarvester(matLib) {
  const g = new THREE.Group();
  const k = new PfKit(matLib);
  kitHarvester(k);
  k.build(g);
  return g;
}

// ---------------------------------------------------------------------------
// Monte de cana picada (carga) com toletes por cima
// ---------------------------------------------------------------------------
function pfHeapGeo(w, l, h, seed = 1, cols = [0xa49650, 0x7d8a3e, 0x6a4a3c, 0xcbbb80], edge = null) {
  return pfCached(`heap${pfQ(w)},${pfQ(l)},${pfQ(h)},${seed},${edge ?? 0}`, () => {
    const ec = edge != null ? new THREE.Color(edge) : null;
    const g = new THREE.PlaneGeometry(w, l, Math.max(4, Math.round(w * 5)), Math.max(6, Math.round(l * 5)));
    g.rotateX(-Math.PI / 2);
    const P = g.attributes.position;
    const C = new Float32Array(P.count * 3);
    const cc = cols.map(c => new THREE.Color(c));
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i);
      const ex = Math.min(1, Math.abs(x) / (w / 2)), ez = Math.min(1, Math.abs(z) / (l / 2));
      const env = (1 - Math.pow(ex, 3)) * (1 - Math.pow(ez, 3));
      const n = Math.sin(x * 7.1 + seed) * Math.cos(z * 5.3 + seed * 2) * 0.5 + Math.sin(x * 17.3 + z * 13.1 + seed) * 0.5;
      P.setY(i, h * env + n * 0.06 * env);
      const r = Math.abs(Math.sin(i * 12.9898 + seed * 78.233)) % 1;
      const c = r < 0.45 ? cc[0] : r < 0.7 ? cc[1] : r < 0.85 ? cc[2] : cc[3];
      const sh = 0.75 + 0.25 * env;
      let cr = c.r * sh, cg = c.g * sh, cb = c.b * sh;
      if (ec) { const t = Math.pow(1 - env, 1.5); cr += (ec.r - cr) * t; cg += (ec.g - cg) * t; cb += (ec.b - cb) * t; }
      C[i * 3] = cr; C[i * 3 + 1] = cg; C[i * 3 + 2] = cb;
    }
    g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    g.computeVertexNormals();
    return g;
  });
}

function kitCaneLoad(k, w, l, h, n = 40, seed = 3) {
  k.add(pfHeapGeo(w, l, h, seed), 'rough', 0xffffff);
  const det = k.detail; k.detail = true;
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) {
    const x = (rnd() - 0.5) * w * 0.8, z = (rnd() - 0.5) * l * 0.85;
    const ex = Math.abs(x) / (w / 2), ez = Math.abs(z) / (l / 2);
    const y = h * (1 - Math.pow(ex, 3)) * (1 - Math.pow(ez, 3));
    const c = rnd() < 0.7 ? 0xa59a52 : rnd() < 0.5 ? 0x6e4b3e : 0x8c9a48;
    k.add(pfCyl(0.026, 0.026, 0.24, 6), 'rough', c, x, y + 0.02, z, rnd() * 3, rnd() * 3, Math.PI / 2 + (rnd() - 0.5));
  }
  k.detail = det;
}

// Caçamba telada (transbordo / semirreboque). Centro em (0,0,0), comprimento L ao longo de Z.
function kitMeshBin(k, L, W, y0, H, color, opts = {}) {
  const P = color, D = PF_COL.graphite;
  k.add(pfRBox(W, 0.1, L, 0.03), 'paint', pfC(P, 0.8), 0, y0, 0);
  // paredes frontal e traseira em chapa
  for (const s of [-1, 1]) {
    k.add(pfRBox(W, H, 0.07, 0.02), 'paint', P, 0, y0 + H / 2, s * L / 2);
    for (let i = 0; i < 3; i++) k.add(pfRBox(W + 0.04, 0.08, 0.1, 0.02), 'paint', pfC(P, 0.8), 0, y0 + 0.3 + i * (H - 0.4) / 2, s * (L / 2 + 0.03));
  }
  const nPost = Math.max(3, Math.round(L / 1.0));
  for (const s of [-1, 1]) {
    const x = s * W / 2;
    // faixa inferior em chapa + tela acima
    k.add(pfRBox(0.05, 0.5, L, 0.015), 'paint', P, x, y0 + 0.3, 0);
    k.add(pfRBox(0.12, 0.12, L + 0.12, 0.03), 'paint', P, x, y0 + H, 0);
    k.add(pfRBox(0.1, 0.09, L, 0.025), 'paint', P, x, y0 + 0.55, 0);
    k.add(pfRBox(0.09, 0.08, L, 0.02), 'paint', P, x, y0 + 0.55 + (H - 0.55) * 0.5, 0);
    for (let i = 0; i <= nPost; i++) k.add(pfRBox(0.1, H + 0.02, 0.09, 0.02), 'paint', pfC(P, 0.92), x + s * 0.02, y0 + H / 2, -L / 2 + i * (L / nPost));
    const uvw = k.uvWorld; k.uvWorld = 2.1;
    k.add(pfBox(0.02, H - 0.6, L - 0.1), 'grid', 0x9aa3a6, x, y0 + 0.55 + (H - 0.6) / 2, 0);
    k.uvWorld = uvw;
  }
  // Carga
  if (opts.load !== false) {
    k.push(0, y0 + H - 0.55, 0);
    kitCaneLoad(k, W - 0.15, L - 0.15, 0.75, Math.round(L * 7), opts.seed ?? 3);
    k.pop();
  }
}

// ---------------------------------------------------------------------------
// TRANSBORDO: trator + carreta com caçamba telada (centro da caçamba na origem)
// ---------------------------------------------------------------------------
function kitTransbordo(k, opts = {}) {
  const D = PF_COL.graphite;
  const C = opts.color ?? PF_COL.cart;
  // Rodado tandem
  for (const z of [-0.7, 0.7]) for (const s of [-1, 1]) {
    k.push(s * 1.05, 0.64, z); kitWheel(k, 0.64, 0.46, PF_COL.rimSilver, { side: s }); k.pop();
  }
  for (const z of [-0.7, 0.7]) k.add(pfCyl(0.08, 0.08, 2.2, 10), 'metal', D, 0, 0.64, z, 0, 0, Math.PI / 2);
  k.add(pfRBox(0.3, 0.2, 1.9, 0.04), 'metal', D, -0.8, 0.82, 0);
  k.add(pfRBox(0.3, 0.2, 1.9, 0.04), 'metal', D, 0.8, 0.82, 0);
  // Chassi e lança
  for (const s of [-1, 1]) k.add(pfRBox(0.14, 0.22, 6.0, 0.03), 'metal', D, s * 0.55, 1.05, 0);
  for (let i = 0; i < 5; i++) k.add(pfRBox(1.24, 0.14, 0.12, 0.02), 'metal', D, 0, 1.05, -2.6 + i * 1.3);
  k.bar(-0.55, 1.0, 3.0, 0, 0.62, 4.8, 0.14, 0.18, 'metal', D);
  k.bar(0.55, 1.0, 3.0, 0, 0.62, 4.8, 0.14, 0.18, 'metal', D);
  k.add(pfRBox(0.18, 0.12, 0.4, 0.03), 'metal', D, 0, 0.6, 4.9);
  k.rod(0.2, 0.95, 3.6, 0.2, 0.15, 3.6, 0.04, 'metal', PF_COL.chrome);
  k.add(pfRBox(0.2, 0.04, 0.2, 0.01), 'metal', D, 0.2, 0.12, 3.6);
  // Braços e cilindros de basculamento (lado direito)
  for (const z of [-1.6, 1.6]) {
    k.rod(1.1, 1.1, z, 1.35, 1.6, z, 0.06, 'paint', pfC(C, 0.8));
    k.rod(0.7, 1.15, z * 0.6, 1.25, 1.55, z * 0.9, 0.05, 'metal', PF_COL.chrome);
  }
  kitMeshBin(k, 6.0, 2.55, 1.35, 2.15, C, { seed: opts.seed ?? 5 });
  // Lanternas
  for (const s of [-1, 1]) {
    k.add(pfRBox(0.14, 0.1, 0.04, 0.02), 'emit', pfC(0xff2a1a, 1.3), s * 0.95, 1.5, -3.06);
    k.add(pfRBox(0.12, 0.12, 0.02, 0.01), 'paint', 0xd8d8d0, s * 0.6, 1.5, -3.06);
  }
  // Trator puxando
  if (opts.tractor !== false) {
    k.push(0, 0, 6.6);
    kitTractor(k, opts.tractorColor ?? PF_COL.tractorRed, { aro: PF_COL.rimSilver });
    k.pop();
  }
}

function buildTransbordo(matLib, opts = {}) {
  const g = new THREE.Group();
  const k = new PfKit(matLib);
  kitTransbordo(k, opts);
  k.build(g);
  return g;
}

// ---------------------------------------------------------------------------
// CAMINHÃO: cavalo-mecânico + semirreboque (cana telada ou contêiner)
// ---------------------------------------------------------------------------
function kitContainer(k, L, color, opts = {}) {
  const W = 2.44, H = 2.59;
  k.add(pfRBox(W, H, L, 0.03), 'paint', color, 0, H / 2, 0);
  const det = k.detail; k.detail = opts.detailRibs ?? true;
  const n = Math.round(L / 0.28);
  for (let i = 1; i < n; i++) {
    const z = -L / 2 + i * (L / n);
    for (const s of [-1, 1]) k.add(pfBox(0.05, H - 0.3, 0.12), 'paint', pfC(color, 0.88), s * (W / 2 + 0.02), H / 2, z);
  }
  for (let i = 1; i < 6; i++) k.add(pfBox(W - 0.3, 0.04, 0.12), 'paint', pfC(color, 0.9), 0, H + 0.015, -L / 2 + i * L / 6);
  k.detail = det;
  // Molduras, cantoneiras e portas
  for (const s of [-1, 1]) for (const t of [-1, 1]) {
    k.add(pfBox(0.12, H, 0.12), 'paint', pfC(color, 0.7), s * (W / 2 - 0.04), H / 2, t * (L / 2 - 0.04));
    for (const u of [0, 1]) k.add(pfBox(0.18, 0.12, 0.18), 'metal', 0x3a3d40, s * (W / 2 - 0.05), u * (H - 0.1) + 0.05, t * (L / 2 - 0.05));
  }
  for (const s of [-1, 1]) {
    k.add(pfBox(0.1, 0.14, L), 'paint', pfC(color, 0.7), s * (W / 2 - 0.02), H - 0.07, 0);
    k.add(pfBox(0.1, 0.14, L), 'paint', pfC(color, 0.7), s * (W / 2 - 0.02), 0.07, 0);
  }
  for (const x of [-0.75, -0.3, 0.3, 0.75]) k.rod(x, 0.15, -L / 2 - 0.04, x, H - 0.15, -L / 2 - 0.04, 0.025, 'metal', 0x9aa0a4);
  k.add(pfBox(0.02, H - 0.2, 0.02), 'paint', pfC(color, 0.6), 0, H / 2, -L / 2 - 0.02);
}

function kitTruck(k, opts = {}) {
  const cabCol = opts.cabColor ?? 0xe4e6e2, D = PF_COL.graphite;
  // Rodas: dianteira simples, traseiras duplas (pneu largo com sulco), reboque 3 eixos
  const wheel = (x, z, w, side) => { k.push(x, 0.52, z); kitWheel(k, 0.52, w, 0xc9ced2, { agri: false, side }); k.pop(); };
  for (const s of [-1, 1]) {
    wheel(s * 1.05, 6.3, 0.3, s);
    for (const z of [3.25, 1.95]) wheel(s * 0.98, z, 0.6, s);
    for (const z of [-4.6, -5.9, -7.2]) wheel(s * 0.98, z, 0.6, s);
  }
  // Chassi do cavalo
  for (const s of [-1, 1]) k.add(pfRBox(0.12, 0.3, 6.6, 0.02), 'metal', D, s * 0.42, 0.95, 4.3);
  for (const z of [6.3, 3.25, 1.95]) k.add(pfCyl(0.09, 0.09, 1.9, 10), 'metal', D, 0, 0.52, z, 0, 0, Math.PI / 2);
  k.add(pfCyl(0.48, 0.48, 0.1, 18), 'metal', 0x1d1f21, 0, 1.18, 2.6);
  for (const s of [-1, 1]) {
    k.add(pfRBox(0.66, 0.05, 2.35, 0.02), 'metal', 0x1d1f21, s * 0.98, 1.16, 2.6);
    k.add(pfRBox(0.62, 0.42, 0.03, 0.01), 'rubber', 0x151515, s * 0.98, 0.85, 1.38);
  }
  k.add(pfCyl(0.32, 0.32, 1.3, 16), 'metal', PF_COL.chrome, 1.0, 0.98, 4.6, Math.PI / 2, 0, 0);
  k.add(pfRBox(0.5, 0.5, 0.7, 0.05), 'metal', D, -1.0, 0.98, 4.7);
  k.add(pfCyl(0.14, 0.14, 0.9, 10), 'metal', 0x9aa0a4, -0.95, 0.75, 3.9, Math.PI / 2, 0, 0);
  // Cabine avançada
  k.add(pfRBox(2.45, 2.25, 2.05, 0.16), 'paint', cabCol, 0, 2.45, 6.6);
  k.add(pfRBox(2.3, 0.5, 1.3, 0.2), 'paint', cabCol, 0, 3.78, 6.25, 0.08, 0, 0);
  k.add(pfRBox(2.2, 1.0, 0.03, 0.02), 'metal', 0x111213, 0, 2.88, 7.62);
  k.add(pfRBox(2.08, 0.9, 0.03, 0.01), 'glass', 0xffffff, 0, 2.88, 7.64);
  k.add(pfRBox(2.3, 0.07, 0.32, 0.02), 'metal', 0x111213, 0, 3.42, 7.7);
  k.add(pfRBox(1.6, 0.6, 0.05, 0.02), 'metal', 0x15171a, 0, 1.78, 7.63);
  for (let i = 0; i < 5; i++) k.add(pfBox(1.5, 0.03, 0.04), 'metal', PF_COL.chrome, 0, 1.56 + i * 0.11, 7.66);
  k.add(pfRBox(2.48, 0.36, 0.26, 0.06), 'metal', 0x3a3d40, 0, 0.98, 7.56);
  for (const s of [-1, 1]) {
    k.add(pfRBox(0.38, 0.17, 0.04, 0.03), 'metal', 0x111213, s * 0.88, 1.3, 7.64);
    k.add(pfRBox(0.32, 0.12, 0.02, 0.02), 'emit', pfC(PF_COL.lamp, 1.7), s * 0.88, 1.3, 7.665);
    k.add(pfRBox(0.03, 0.72, 0.95, 0.01), 'glass', 0xffffff, s * 1.235, 2.9, 7.0);
    k.add(pfRBox(0.36, 0.04, 0.24, 0.01), 'metal', 0x50575b, s * 1.12, 0.78, 6.95);
    k.add(pfRBox(0.36, 0.04, 0.24, 0.01), 'metal', 0x50575b, s * 1.12, 1.15, 6.95);
    k.add(pfRBox(0.06, 0.4, 0.05, 0.01), 'emit', pfC(PF_COL.amber, 1.2), s * 1.23, 1.5, 7.45);
  }
  const det = k.detail; k.detail = true;
  for (const s of [-1, 1]) {
    k.rod(s * 1.22, 3.25, 7.2, s * 1.48, 3.15, 7.3, 0.018, 'metal', 0x1a1c1e);
    k.add(pfRBox(0.05, 0.42, 0.2, 0.02), 'metal', 0x1a1c1e, s * 1.5, 2.95, 7.32);
  }
  k.detail = det;
  k.add(pfCyl(0.08, 0.08, 1.6, 10), 'metal', PF_COL.chrome, -1.08, 3.05, 5.48);
  k.add(pfCyl(0.12, 0.12, 0.5, 10), 'paint', 0x1d1f21, 1.08, 3.3, 5.5);
  k.add(pfRBox(0.3, 1.4, 0.3, 0.06), 'paint', 0x1d1f21, 1.08, 2.4, 5.5);
  // Semirreboque
  k.add(pfRBox(0.9, 0.32, 11.4, 0.03), 'metal', D, 0, 1.18, -2.3);
  for (const z of [-4.6, -5.9, -7.2]) k.add(pfCyl(0.09, 0.09, 1.9, 10), 'metal', D, 0, 0.52, z, 0, 0, Math.PI / 2);
  for (const s of [-1, 1]) {
    k.add(pfRBox(0.62, 0.06, 3.6, 0.02), 'metal', 0x1d1f21, s * 0.98, 1.15, -5.9);
    k.rod(s * 0.5, 1.05, 0.9, s * 0.5, 0.18, 0.9, 0.05, 'metal', D);
    k.add(pfRBox(0.22, 0.05, 0.3, 0.01), 'metal', D, s * 0.5, 0.15, 0.9);
    k.add(pfRBox(0.15, 0.12, 0.04, 0.02), 'emit', pfC(0xff2a1a, 1.3), s * 1.0, 1.0, -8.06);
  }
  k.add(pfRBox(2.2, 0.12, 0.12, 0.02), 'metal', 0x3a3d40, 0, 0.62, -8.0);
  if (opts.type === 'container') {
    k.add(pfRBox(2.48, 0.14, 11.4, 0.03), 'metal', 0x2b2e31, 0, 1.38, -2.3);
    k.push(0, 1.45, -2.4);
    kitContainer(k, 11.2, opts.cargoColor ?? 0x1d6a5f);
    k.pop();
  } else if (opts.type === 'milho') {
    const bc = opts.binColor ?? 0x2b506e;
    k.add(pfRBox(2.48, 0.14, 11.4, 0.03), 'metal', 0x2b2e31, 0, 1.38, -2.3);
    // caçamba graneleira fechada com costelas, faixas de segurança e carga de milho
    for (const s of [-1, 1]) {
      k.add(pfRBox(0.08, 1.85, 11.1, 0.02), 'paint', bc, s * 1.2, 2.38, -2.35);
      k.add(pfBox(0.09, 0.14, 11.0), 'paint', 0xf2c200, s * 1.21, 1.62, -2.35);
      for (let i = 0; i <= 6; i++) {
        k.add(pfBox(0.06, 1.85, 0.1), 'metal', 0x2b2e31, s * 1.24, 2.38, -7.6 + i * 1.76);
      }
    }
    for (const z of [-7.86, 3.16]) k.add(pfRBox(2.44, 1.85, 0.08, 0.02), 'paint', bc, 0, 2.38, z);
    // arcos da lona enrolados e grãos de milho dourados no topo
    for (let i = 0; i < 4; i++) k.add(pfBox(2.38, 0.06, 0.06), 'metal', 0x9aa3a6, 0, 3.35, -6.5 + i * 2.75);
    k.add(pfHeapGeo(2.22, 10.4, 0.62, 23, [0xf0b829, 0xe4a518, 0xf7cf4c, 0xc98b10]), 'rough', 0xffffff, 0, 3.18, -2.35);
  } else {
    k.push(0, 0, -2.45);
    kitMeshBin(k, 10.9, 2.5, 1.42, 2.4, opts.binColor ?? 0x2f4f45, { seed: 9 });
    k.pop();
  }
}

function buildTruck(matLib, opts = {}) {
  const g = new THREE.Group();
  const k = new PfKit(matLib);
  kitTruck(k, opts);
  k.build(g);
  return g;
}

// ---------------------------------------------------------------------------
// PICAPE
// ---------------------------------------------------------------------------
function kitPickup(k, color = 0xb33b24) {
  const P = color, D = 0x1f2224;
  for (const s of [-1, 1]) for (const z of [1.62, -1.55]) {
    k.push(s * 0.8, 0.4, z); kitWheel(k, 0.4, 0.27, 0xc3c8cc, { agri: false, side: s }); k.pop();
  }
  k.add(pfRBox(1.86, 0.6, 5.1, 0.16), 'paint', P, 0, 0.8, 0);
  k.add(pfRBox(1.8, 0.24, 1.55, 0.12), 'paint', P, 0, 1.13, 1.72, 0.05, 0, 0);
  k.add(pfRBox(1.72, 0.3, 1.9, 0.14), 'paint', P, 0, 1.22, 0.2);
  k.add(pfRBox(1.62, 0.5, 1.72, 0.14), 'glass', 0xffffff, 0, 1.6, 0.18);
  for (const s of [-1, 1]) {
    k.add(pfRBox(0.07, 0.52, 0.07, 0.02), 'paint', P, s * 0.78, 1.58, 1.0, -0.5, 0, 0);
    k.add(pfRBox(0.06, 0.5, 0.08, 0.02), 'paint', P, s * 0.8, 1.6, -0.62);
    k.add(pfRBox(0.06, 0.48, 0.07, 0.02), 'paint', P, s * 0.81, 1.6, 0.18);
  }
  k.add(pfRBox(1.62, 0.09, 1.38, 0.04), 'paint', P, 0, 1.88, 0.1);
  // Caçamba
  for (const s of [-1, 1]) k.add(pfRBox(0.07, 0.45, 1.9, 0.02), 'paint', P, s * 0.895, 1.32, -1.5);
  k.add(pfRBox(1.82, 0.45, 0.07, 0.02), 'paint', P, 0, 1.32, -2.5);
  k.add(pfRBox(1.72, 0.04, 1.9, 0.01), 'metal', D, 0, 1.12, -1.5);
  k.add(pfTube([[-0.8, 1.5, -0.68], [-0.8, 2.0, -0.7], [0.8, 2.0, -0.7], [0.8, 1.5, -0.68]], 0.03, 16, 6), 'metal', D);
  // Para-choques, grade, luzes
  k.add(pfRBox(1.9, 0.22, 0.2, 0.06), 'metal', 0x6c7378, 0, 0.62, 2.58);
  k.add(pfRBox(1.9, 0.2, 0.2, 0.06), 'metal', 0x6c7378, 0, 0.62, -2.58);
  k.add(pfRBox(1.3, 0.3, 0.05, 0.03), 'metal', 0x141618, 0, 0.98, 2.56);
  for (let i = 0; i < 3; i++) k.add(pfBox(1.2, 0.025, 0.03), 'metal', PF_COL.chrome, 0, 0.9 + i * 0.08, 2.585);
  for (const s of [-1, 1]) {
    k.add(pfRBox(0.3, 0.12, 0.04, 0.03), 'emit', pfC(PF_COL.lamp, 1.6), s * 0.72, 1.02, 2.555);
    k.add(pfRBox(0.07, 0.24, 0.04, 0.02), 'emit', pfC(0xff2a1a, 1.2), s * 0.88, 1.28, -2.54);
    k.add(pfArc(0.43, 0.49, 0.0, Math.PI, 0.32), 'rough', 0x1a1b1c, s * 0.8, 0.42, 1.62, 0, Math.PI / 2, 0);
    k.add(pfArc(0.43, 0.49, 0.0, Math.PI, 0.32), 'rough', 0x1a1b1c, s * 0.8, 0.42, -1.55, 0, Math.PI / 2, 0);
    k.add(pfRBox(0.05, 0.03, 0.18, 0.01), 'metal', PF_COL.chrome, s * 0.94, 1.18, 0.55);
    k.add(pfRBox(0.05, 0.03, 0.18, 0.01), 'metal', PF_COL.chrome, s * 0.94, 1.18, -0.3);
    k.rod(s * 0.85, 1.5, 0.95, s * 1.02, 1.5, 1.05, 0.015, 'metal', D);
    k.add(pfRBox(0.05, 0.16, 0.22, 0.02), 'metal', D, s * 1.04, 1.5, 1.08);
  }
  k.add(pfRBox(1.5, 0.22, 0.42, 0.06), 'rough', 0x2a2d30, 0, 1.38, 0.55);
  k.add(pfRBox(1.5, 0.5, 0.12, 0.05), 'rough', 0x2a2d30, 0, 1.6, 0.32);
}

function buildPickup(matLib, color = 0xb33b24) {
  const g = new THREE.Group();
  const k = new PfKit(matLib);
  kitPickup(k, color);
  k.build(g);
  return g;
}

// ---------------------------------------------------------------------------
// EMPILHADEIRA
// ---------------------------------------------------------------------------
function kitForklift(k) {
  const Yc = 0xd9920c, D = 0x232628;
  for (const s of [-1, 1]) {
    k.push(s * 0.55, 0.34, 0.65); kitWheel(k, 0.34, 0.22, 0x3a3e42, { agri: false, side: s }); k.pop();
    k.push(s * 0.5, 0.3, -0.75); kitWheel(k, 0.3, 0.2, 0x3a3e42, { agri: false, side: s }); k.pop();
  }
  k.add(pfRBox(1.1, 0.6, 2.0, 0.12), 'paint', Yc, 0, 0.62, -0.05);
  k.add(pfRBox(1.12, 0.62, 0.6, 0.2), 'paint', 0x2b2e31, 0, 0.95, -0.85);
  k.add(pfRBox(0.5, 0.12, 0.45, 0.04), 'rough', 0x1d2022, 0, 1.0, -0.25);
  k.add(pfRBox(0.5, 0.5, 0.1, 0.04), 'rough', 0x1d2022, 0, 1.25, -0.48);
  k.rod(0, 0.95, 0.35, 0, 1.35, 0.15, 0.025, 'metal', D);
  k.add(pfTorus(0.14, 0.015, 4, 14), 'rough', 0x111213, 0, 1.36, 0.14, -0.9, 0, 0);
  for (const s of [-1, 1]) {
    k.rod(s * 0.48, 0.9, 0.55, s * 0.48, 2.15, 0.45, 0.035, 'paint', D);
    k.rod(s * 0.48, 0.9, -0.65, s * 0.48, 2.15, -0.6, 0.035, 'paint', D);
  }
  k.add(pfRBox(1.02, 0.05, 1.2, 0.02), 'metal', D, 0, 2.17, -0.08);
  for (let i = 0; i < 5; i++) k.add(pfBox(0.03, 0.05, 1.15), 'metal', D, -0.4 + i * 0.2, 2.2, -0.08);
  // Mastro, carro e garfos
  for (const s of [-1, 1]) k.add(pfRBox(0.1, 2.5, 0.14, 0.02), 'metal', 0x2b2e31, s * 0.36, 1.35, 1.1);
  for (const y of [0.4, 1.4, 2.5]) k.add(pfRBox(0.82, 0.08, 0.1, 0.02), 'metal', 0x2b2e31, 0, y, 1.12);
  k.add(pfRBox(0.9, 0.5, 0.06, 0.02), 'metal', 0x3a3d40, 0, 0.5, 1.22);
  for (const s of [-1, 1]) {
    k.add(pfRBox(0.12, 0.05, 1.15, 0.01), 'metal', 0x2b2e31, s * 0.28, 0.12, 1.8);
    k.add(pfRBox(0.12, 0.5, 0.05, 0.01), 'metal', 0x2b2e31, s * 0.28, 0.36, 1.24);
  }
  k.rod(0.2, 0.3, 1.0, 0.2, 2.3, 1.0, 0.03, 'metal', PF_COL.chrome);
  k.add(pfCyl(0.05, 0.055, 0.1, 10), 'beacon', pfC(PF_COL.amber, 1.6), 0.4, 2.26, -0.55);
}

function buildForklift(matLib) {
  const g = new THREE.Group();
  const k = new PfKit(matLib);
  kitForklift(k);
  k.build(g);
  return g;
}

// ---------------------------------------------------------------------------
// NAVIO GRANELEIRO (proa em +Z)
// ---------------------------------------------------------------------------
function pfHullGeo() {
  return pfCached('hull', () => {
    const zs = [];
    for (let z = -21; z <= 26.01; z += 0.5) zs.push(z);
    const deck = 4.4, keel = -1.3;
    const prof = t => [[-1, deck], [-1, 3.0], [-1, 1.6], [-0.99, 0.2], [-0.95, -0.6], [-0.8, -1.1], [-0.45, -1.3], [0, -1.3], [0.45, -1.3], [0.8, -1.1], [0.95, -0.6], [0.99, 0.2], [1, 1.6], [1, 3.0], [1, deck]];
    const halfW = z => {
      if (z > 13) { const t = (z - 13) / 13; return 6.3 * Math.sqrt(Math.max(0, 1 - t * t)) + 0.15; }
      if (z < -16) { const t = (-16 - z) / 5; return 6.3 * (1 - 0.35 * t * t); }
      return 6.3;
    };
    const pos = [], col = [], uv = [], idx = [];
    const cBoot = new THREE.Color(0x8a2a20), cHull = new THREE.Color(0x24414f), cLine = new THREE.Color(0xe6e8e4);
    const P = prof(0);
    zs.forEach((z, i) => {
      const hw = halfW(z);
      const rise = z > 14 ? (z - 14) * 0.09 : 0;
      P.forEach(([px, py], j) => {
        const y = py < 0 ? py * (1 - Math.min(0.85, rise * 0.5)) + rise * 0.6 : py + (z > 14 ? (z - 14) * 0.05 : 0) * (py >= deck - 0.01 ? 1 : py / deck);
        pos.push(px * hw, y, z);
        const c = y < 0.1 ? cBoot : (y > deck - 0.5 && y < deck - 0.25) ? cLine : cHull;
        // chapas, emendas e escorridos de ferrugem: o casco não é uma parede lisa
        const h = Math.abs(Math.sin(Math.floor(z * 2 + (px > 0 ? 97 : 0)) * 127.1) * 43758.5) % 1;
        const seam = (i % 12 === 0) ? 0.78 : 1;
        let r = c.r * seam * (0.94 + h * 0.1), gg = c.g * seam * (0.94 + h * 0.1), bb = c.b * seam * (0.94 + h * 0.1);
        if (c === cHull && h > 0.8) { const k = Math.min(1, (y / deck) * 0.9) * (h - 0.8) * 3.2; r += (0.36 - r) * k; gg += (0.17 - gg) * k; bb += (0.09 - bb) * k; }
        if (c === cBoot) { const k = 0.25 * h; r *= 1 - k; gg *= 1 - k; bb *= 1 - k; }
        col.push(r, gg, bb);
        uv.push(j / (P.length - 1), i / (zs.length - 1));
      });
    });
    const n = P.length;
    for (let i = 0; i < zs.length - 1; i++) for (let j = 0; j < n - 1; j++) {
      const a = i * n + j, b = i * n + j + 1, c = (i + 1) * n + j, d = (i + 1) * n + j + 1;
      idx.push(a, b, d, a, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
}

function kitShip(k) {
  const W = 0xeef1ee, D = PF_COL.graphite;
  const dust = k.dust; k.dust = 0;
  k.add(pfHullGeo(), 'paint', 0xffffff);
  // Convés, popa (espelho) e castelo de proa
  k.add(pfRBox(12.4, 0.2, 34.5, 0.05), 'paint', 0x6e3a2e, 0, 4.42, -3.2);
  k.add(pfRBox(12.5, 4.0, 0.3, 0.05), 'paint', 0x24414f, 0, 2.6, -20.9);
  k.add(pfRBox(9.6, 1.5, 6.0, 0.15), 'paint', 0x24414f, 0, 5.2, 18.8);
  k.add(pfRBox(9.4, 0.12, 5.8, 0.04), 'paint', 0x6e3a2e, 0, 5.98, 18.8);
  // Escotilhas com nervuras
  for (const hz of [-6.5, 0.5, 7.5, 13.6]) {
    k.add(pfRBox(8.6, 0.6, 5.4, 0.06), 'paint', 0x4b4f52, 0, 4.82, hz);
    k.add(pfRBox(8.0, 0.55, 5.0, 0.12), 'paint', 0x2f5b4c, 0, 5.38, hz);
    for (let i = 0; i < 7; i++) k.add(pfBox(8.1, 0.08, 0.1), 'paint', 0x264c40, 0, 5.68, hz - 2.2 + i * 0.73);
  }
  // Guindastes de bordo (lança para o cais em -X)
  for (const cz of [-3.0, 4.0, 10.6]) {
    k.add(pfCyl(0.7, 0.85, 3.4, 14), 'paint', W, 0, 6.1, cz);
    k.add(pfRBox(1.8, 1.5, 2.2, 0.12), 'paint', PF_COL.amber, 0, 8.4, cz);
    k.add(pfRBox(1.0, 0.9, 0.05, 0.02), 'glass', 0xffffff, -0.6, 8.55, cz + 1.12);
    k.bar(-0.6, 8.6, cz, -9.5, 12.8, cz, 0.55, 0.6, 'paint', W);
    k.rod(0.4, 9.2, cz, -9.3, 13.3, cz, 0.03, 'metal', D);
    k.rod(-9.4, 12.7, cz, -9.4, 7.8, cz, 0.025, 'metal', D);
    k.add(pfRBox(0.5, 0.4, 0.5, 0.05), 'paint', PF_COL.amber, -9.4, 7.6, cz);
  }
  // Casario (superestrutura) em degraus com janelas
  const decks = [[11.0, 2.6, 7.4, 5.7], [10.0, 2.4, 6.8, 8.2], [9.2, 2.4, 6.2, 10.6], [8.4, 2.3, 5.8, 12.95]];
  decks.forEach(([w, h, d, y], i) => {
    k.add(pfRBox(w, h, d, 0.12), 'paint', W, 0, y, -16.6 + i * 0.25);
    k.add(pfRBox(w + 0.3, 0.12, d + 0.3, 0.04), 'paint', 0xd7dbd8, 0, y + h / 2 + 0.04, -16.6 + i * 0.25);
    const nw = Math.floor(w / 1.25);
    for (let j = 0; j < nw; j++) {
      const x = -w / 2 + 0.8 + j * ((w - 1.6) / Math.max(1, nw - 1));
      k.add(pfRBox(0.7, 0.6, 0.05, 0.08), 'glass', 0xffffff, x, y + 0.2, -16.6 + i * 0.25 + d / 2 + 0.02);
    }
    for (const s of [-1, 1]) for (let j = 0; j < 3; j++) k.add(pfRBox(0.05, 0.6, 0.7, 0.08), 'glass', 0xffffff, s * (w / 2 + 0.02), y + 0.2, -16.6 + i * 0.25 - 1.8 + j * 1.8);
  });
  // Passadiço com asas
  k.add(pfRBox(13.6, 1.6, 4.0, 0.1), 'paint', W, 0, 14.95, -15.4);
  k.add(pfRBox(13.2, 0.75, 0.06, 0.02), 'glass', 0xffffff, 0, 15.1, -13.38);
  k.add(pfRBox(14.0, 0.14, 4.4, 0.05), 'paint', 0xd7dbd8, 0, 15.8, -15.4);
  // Chaminé e mastro
  k.add(pfRBox(2.0, 3.6, 2.8, 0.4), 'paint', W, 0, 17.6, -18.2);
  k.add(pfRBox(2.06, 0.8, 2.86, 0.38), 'paint', 0x1d6a5f, 0, 18.4, -18.2);
  k.add(pfRBox(2.06, 0.5, 2.86, 0.38), 'paint', 0x1a1c1e, 0, 19.55, -18.2);
  k.rod(0, 15.9, -15.6, 0, 20.5, -15.6, 0.09, 'paint', W, 8);
  k.add(pfBox(2.4, 0.08, 0.1), 'metal', D, 0, 19.6, -15.6);
  k.add(pfRBox(1.6, 0.12, 0.3, 0.04), 'paint', 0x1a1c1e, 0, 18.7, -15.6);
  k.add(pfRBox(0.12, 0.12, 0.12, 0.03), 'emit', pfC(0xffffff, 1.6), 0, 20.6, -15.6);
  // Baleeiras laranjas nos turcos
  for (const s of [-1, 1]) {
    k.add(pfCapsule(0.75, 3.2, 3, 10), 'paint', 0xf06a10, s * 5.7, 9.4, -16.0, Math.PI / 2, 0, 0);
    k.add(pfRBox(1.3, 0.1, 3.4, 0.04), 'paint', 0xe8e8e2, s * 5.7, 10.1, -16.0);
    k.rod(s * 5.2, 8.0, -17.2, s * 5.9, 10.4, -17.2, 0.06, 'paint', W);
    k.rod(s * 5.2, 8.0, -14.8, s * 5.9, 10.4, -14.8, 0.06, 'paint', W);
  }
  // Mastro de proa, guinchos e cabeços
  k.rod(0, 6.0, 20.5, 0, 11.5, 20.5, 0.1, 'paint', W, 8);
  k.add(pfCyl(0.45, 0.45, 1.2, 12), 'paint', 0x2f5b4c, -1.5, 6.4, 17.5, 0, 0, Math.PI / 2);
  k.add(pfCyl(0.45, 0.45, 1.2, 12), 'paint', 0x2f5b4c, 1.5, 6.4, 17.5, 0, 0, Math.PI / 2);
  for (const z of [-19, -10, 0, 10]) for (const s of [-1, 1]) k.add(pfCyl(0.16, 0.18, 0.5, 8), 'metal', D, s * 5.6, 4.75, z);
  // Balaustrada (detalhe)
  const det = k.detail; k.detail = true;
  for (const s of [-1, 1]) {
    k.rod(s * 6.15, 5.4, -20.5, s * 6.15, 5.4, 15.5, 0.035, 'paint', W, 5);
    k.rod(s * 6.15, 4.95, -20.5, s * 6.15, 4.95, 15.5, 0.025, 'paint', W, 5);
    for (let z = -20; z <= 15; z += 1.6) k.rod(s * 6.15, 4.5, z, s * 6.15, 5.4, z, 0.025, 'paint', W, 4);
  }
  k.detail = det;
  k.dust = dust;
}

function buildShip(matLib) {
  const g = new THREE.Group();
  const k = new PfKit(matLib);
  kitShip(k);
  k.build(g);
  return g;
}

// ---------------------------------------------------------------------------
// GUINDASTE PORTUÁRIO de pórtico (lança apontando para +X)
// ---------------------------------------------------------------------------
function kitPortCrane(k) {
  const Yc = 0xe09612, D = 0x282d32, W = 0xeef1ee;
  const dust = k.dust; k.dust = 0.6;
  // Pórtico: 4 pernas em caixão, travessas e diagonais
  const legs = [[-3, -3], [3, -3], [-3, 3], [3, 3]];
  for (const [x, z] of legs) {
    k.bar(x, 0.9, z, x * 0.62, 8.2, z * 0.62, 0.6, 0.6, 'paint', Yc);
    k.add(pfRBox(1.2, 0.8, 1.6, 0.06), 'metal', D, x, 0.45, z);
    for (const t of [-0.45, 0.45]) k.add(pfCyl(0.3, 0.3, 0.3, 12), 'metal', 0x3a3d40, x, 0.32, z + t, 0, 0, Math.PI / 2);
  }
  for (const [a, b] of [[0, 1], [2, 3], [0, 2], [1, 3]]) {
    const [x1, z1] = legs[a], [x2, z2] = legs[b];
    k.bar(x1 * 0.66, 7.6, z1 * 0.66, x2 * 0.66, 7.6, z2 * 0.66, 0.5, 0.55, 'paint', Yc);
    k.bar(x1 * 0.9, 3.0, z1 * 0.9, x2 * 0.9, 3.0, z2 * 0.9, 0.32, 0.32, 'paint', Yc);
    k.bar(x1 * 0.9, 3.0, z1 * 0.9, x2 * 0.7, 7.0, z2 * 0.7, 0.2, 0.2, 'paint', Yc);
  }
  k.add(pfCyl(2.2, 2.4, 0.7, 24), 'metal', D, 0, 8.4, 0);
  k.dust = dust;
}

function kitPortCraneTop(k) {
  const Yc = 0xe09612, D = 0x282d32, W = 0xeef1ee;
  const dust = k.dust; k.dust = 0;
  // Casa de máquinas, contrapeso, cabine
  k.add(pfRBox(4.6, 2.6, 5.6, 0.15), 'paint', Yc, -0.6, 10.2, 0);
  k.add(pfRBox(4.7, 0.18, 5.7, 0.06), 'paint', 0xc77f0b, -0.6, 11.55, 0);
  k.add(pfRBox(2.0, 2.2, 4.4, 0.12), 'paint', 0x3a3d40, -3.6, 9.9, 0);
  for (let i = 0; i < 4; i++) k.add(pfBox(0.05, 1.1, 4.0), 'metal', D, -1.6 + i * 0.6, 10.4, 2.81);
  k.add(pfRBox(1.9, 1.8, 1.7, 0.1), 'paint', Yc, 2.1, 10.4, 2.4);
  k.add(pfRBox(0.05, 1.3, 1.4, 0.02), 'glass', 0xffffff, 3.06, 10.55, 2.4);
  k.add(pfRBox(1.5, 1.3, 0.05, 0.02), 'glass', 0xffffff, 2.1, 10.55, 3.26);
  // Mastro em A
  for (const s of [-1, 1]) {
    k.bar(-2.2, 11.5, s * 1.8, -0.6, 19.5, s * 0.5, 0.45, 0.45, 'paint', Yc);
    k.bar(1.6, 11.5, s * 1.8, -0.6, 19.5, s * 0.5, 0.4, 0.4, 'paint', Yc);
  }
  k.add(pfRBox(1.0, 0.6, 1.6, 0.08), 'paint', Yc, -0.6, 19.7, 0);
  // Lança treliçada (4 banzos + diagonais)
  const foot = [1.6, 10.8], tip = [13.8, 16.6];
  const segs = 10;
  const at = (t, sy, sz) => {
    const w = 1.0 * (1 - t) + 0.45 * t;
    return [foot[0] + (tip[0] - foot[0]) * t, foot[1] + (tip[1] - foot[1]) * t + sy * w * 0.7, sz * w];
  };
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const a = at(0, sy, sz), b = at(1, sy, sz);
    k.bar(a[0], a[1], a[2], b[0], b[1], b[2], 0.2, 0.2, 'paint', Yc);
  }
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    for (const sz of [-1, 1]) {
      const a = at(t0, -1, sz), b = at(t1, 1, sz);
      k.rod(a[0], a[1], a[2], b[0], b[1], b[2], 0.06, 'paint', Yc, 5);
    }
    for (const sy of [-1, 1]) {
      const a = at(t0, sy, -1), b = at(t1, sy, 1);
      k.rod(a[0], a[1], a[2], b[0], b[1], b[2], 0.05, 'paint', Yc, 5);
    }
    const c = at(t1, -1, -1), d = at(t1, 1, 1);
    k.rod(c[0], c[1], c[2], d[0], c[1], c[2], 0.05, 'paint', Yc, 5);
  }
  k.add(pfRBox(0.9, 0.7, 0.9, 0.08), 'paint', Yc, tip[0] + 0.2, tip[1], 0);
  // Cabos de içamento e de lança
  for (const s of [-1, 1]) k.rod(-0.6, 19.6, s * 0.3, tip[0], tip[1] + 0.3, s * 0.25, 0.035, 'metal', D, 4);
  for (const s of [-1, 1]) k.rod(tip[0] + 0.2, tip[1] - 0.3, s * 0.3, tip[0] + 0.2, 9.3, s * 0.3, 0.025, 'metal', D, 4);
  // Spreader e contêiner suspenso
  k.add(pfRBox(2.6, 0.35, 6.2, 0.04), 'metal', 0x3a3d40, tip[0] + 0.2, 9.1, 0);
  k.push(tip[0] + 0.2, 6.3, 0);
  kitContainer(k, 6.06, 0x1d6a5f, { detailRibs: true });
  k.pop();
  k.add(pfCyl(0.08, 0.1, 0.12, 8), 'beacon', pfC(0xff3020, 1.6), -0.6, 20.1, 0);
  k.dust = dust;
}

function buildPortCrane(matLib) {
  const g = new THREE.Group();
  const k = new PfKit(matLib);
  k.autoDetail = 0;
  kitPortCraneTop(k);
  k.build(g);
  return g;
}

// ---------------------------------------------------------------------------
// PESSOAS: proporção humana, membros em cápsula, EPI completo
// ---------------------------------------------------------------------------
function buildPerson(matLib, opts = {}) {
  const g = new THREE.Group();
  // Roupa dessaturada e puxada para o tom de poeira da usina
  const mute = (c, k = 0.25) => new THREE.Color(c).lerp(new THREE.Color(0x8f8676), k).getHex();
  const shirt = mute(opts.shirt ?? 0x00877c), pants = mute(opts.pants ?? 0x34495e, 0.22);
  // Pele com leve dessaturação (10% para 0x8a7a6a): evita o laranja chapado a distância
  const skin = new THREE.Color(opts.skin ?? 0xb98563).lerp(new THREE.Color(0x8a7a6a), 0.1).getHex();
  const vestCol = mute(opts.vestColor ?? 0xff8a1e, 0.2), hairCol = opts.hair ?? 0x231a14;
  const helmet = opts.helmet !== false, vest = opts.vest !== false;
  const body = new PfKit(matLib);
  body.dust = 0.25;
  body.autoDetail = 0;
  // Pernas: um loft contínuo por perna (quadril -> joelho -> tornozelo), sem emendas.
  // A perna direita fica levemente dobrada; a esquerda sustenta o peso.
  for (const s of [-1, 1]) {
    const x = s * 0.1;
    const bent = s > 0;
    const kn = bent ? 0.042 : 0.012;   // joelho à frente
    const an = bent ? 0.05 : 0.03;     // tornozelo
    const legRings = [
      [0.95, 0.09, 0.095, 0, 0.85],
      [0.85, 0.094, 0.1, 0, 1],
      [0.72, 0.084, 0.09, 0.004, 1],
      [0.6, 0.072, 0.076, 0.01, 1],
      [0.5, 0.062, 0.064, kn, 0.85],
      [0.42, 0.066, 0.07, kn - 0.028, 1],
      [0.38, 0.066, 0.072, kn - 0.034, 1],
      [0.24, 0.054, 0.058, an - 0.02, 1],
      [0.15, 0.047, 0.05, an * 0.8, 0.95],
      [0.12, 0.05, 0.054, an, 0.8]
    ];
    body.add(makeLoftedGeo(legRings, 16), 'fabric', pants, x, 0, 0);
    body.dust = 0.45;
    const bx = x + s * (bent ? 0.02 : 0.01), bz = bent ? 0.07 : 0.04;
    body.add(pfRBox(0.12, 0.13, 0.27, 0.045), 'cloth', 0x2b2118, bx, 0.075, bz);
    body.add(pfRBox(0.13, 0.03, 0.29, 0.012), 'cloth', 0x121212, bx, 0.015, bz);
    body.dust = 0.25;
  }
  // Quadril (inclinado: o lado da perna de apoio fica mais alto), tronco e cinto
  body.add(makeLoftedGeo([[0.8, 0.168, 0.11, 0, 0.8], [0.92, 0.186, 0.116, 0, 0.92], [0.99, 0.176, 0.11, 0, 1]], 26), 'fabric', pants, -0.027, 0, 0, 0, 0, -0.03);
  // Tronco com ombros largos: o topo alarga para o braço sair dele sem emenda
  body.add(makeLoftedGeo([[0.97, 0.158, 0.104, 0, 0.85], [1.12, 0.168, 0.12, 0.005, 0.95], [1.28, 0.2, 0.136, 0.01, 1.0], [1.36, 0.212, 0.126, 0.004, 1.0], [1.42, 0.2, 0.118, 0, 0.97], [1.46, 0.17, 0.104, 0, 0.9], [1.49, 0.12, 0.085, 0, 0.85], [1.515, 0.06, 0.06, 0, 0.8]], 26), 'fabric', shirt);
  body.add(makeLoftedGeo([[0.955, 0.166, 0.111, 0, 1], [0.995, 0.168, 0.112, 0, 1]], 26), 'cloth', 0x1a1612);
  body.add(pfRBox(0.06, 0.045, 0.02, 0.008), 'paint', 0xb9b9b0, 0, 0.975, 0.112);
  if (vest) {
    body.add(makeLoftedGeo([[1.0, 0.172, 0.116, 0, 0.92], [1.15, 0.181, 0.132, 0.005, 1.0], [1.3, 0.208, 0.142, 0.01, 1.0], [1.42, 0.214, 0.122, 0, 0.95]], 26), 'fabric', vestCol);
    for (const y of [1.07, 1.19]) body.add(makeLoftedGeo([[y, 0.18, 0.121, 0.005], [y + 0.035, 0.183, 0.124, 0.005]], 26), 'paint', PF_COL.reflect);
    for (const s of [-1, 1]) body.add(pfBox(0.035, 0.24, 0.012), 'paint', PF_COL.reflect, s * 0.09, 1.31, 0.131, 0, 0, s * 0.12);
    // Rádio no colete
    body.add(pfRBox(0.05, 0.1, 0.03, 0.01), 'rough', 0x16181a, -0.12, 1.3, 0.13);
    body.rod(-0.135, 1.35, 0.13, -0.135, 1.41, 0.128, 0.005, 'rough', 0x16181a, 4);
  } else {
    // Gola e botões
    body.add(makeLoftedGeo([[1.44, 0.13, 0.1, 0.005], [1.49, 0.085, 0.07, 0.01]], 26), 'fabric', pfC(shirt, 0.85));
    body.add(pfRBox(0.08, 0.085, 0.008, 0.03), 'fabric', pfC(shirt, 0.9), -0.075, 1.27, 0.122);
  }
  // Crachá com cordão
  body.add(pfRBox(0.055, 0.075, 0.008, 0.004), 'paint', 0xf2f3ef, 0.07, 1.25, vest ? 0.134 : 0.124);
  body.add(pfBox(0.04, 0.012, 0.004), 'paint', 0x00877c, 0.07, 1.275, vest ? 0.139 : 0.129);
  body.rod(0.07, 1.29, 0.125, 0.04, 1.46, 0.07, 0.004, 'cloth', 0x00877c, 3);
  body.rod(0.07, 1.29, 0.125, -0.04, 1.46, 0.07, 0.004, 'cloth', 0x00877c, 3);
  body.build(g);

  // Braços articulados (ombro -> cotovelo -> mão)
  const makeArm = side => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.212, 1.4, 0);
    const k = new PfKit(matLib);
    k.dust = 0;
    k.autoDetail = 0;
    // Braço superior: loft contínuo do ombro (topo dentro do tronco) ao cotovelo
    k.add(makeLoftedGeo([[0.075, 0.03, 0.04, 0, 0.9], [0.06, 0.062, 0.066, 0, 0.95], [0.025, 0.076, 0.072, 0, 1], [-0.02, 0.07, 0.066, 0, 1], [-0.1, 0.06, 0.058, 0.002, 1], [-0.19, 0.053, 0.052, 0.004, 0.95], [-0.27, 0.047, 0.047, 0.005, 0.8]], 16), 'fabric', shirt);
    // Antebraço: começa dentro da manga e dobra para a frente (cotovelo sai do tronco)
    k.push(0, -0.27, 0, side < 0 ? -0.34 : -0.42, 0, 0);
    k.add(makeLoftedGeo([[0.03, 0.05, 0.05, 0, 0.9], [-0.1, 0.047, 0.047, 0, 1], [-0.18, 0.04, 0.04, 0, 1], [-0.2, 0.038, 0.038, 0, 0.8]], 16), 'fabric', shirt);
    // Mão em luva levemente fechada, com dedos e polegar sugeridos
    k.add(makeLoftedGeo([[-0.19, 0.032, 0.027, 0, 1], [-0.23, 0.028, 0.024, 0, 1], [-0.27, 0.035, 0.028, 0.006, 1], [-0.31, 0.033, 0.026, 0.008, 0.95]], 14), 'skin', skin);
    k.add(pfRBox(0.068, 0.058, 0.032, 0.014), 'skin', pfC(skin, 0.97), 0, -0.34, 0.008);
    k.add(pfCapsule(0.014, 0.04, 2, 6), 'skin', skin, -side * 0.036, -0.27, 0.014, 0, 0, -side * 0.35);
    if (side > 0 && opts.tablet !== false) {
      k.add(pfRBox(0.2, 0.27, 0.014, 0.01), 'rough', 0x1d2326, 0.0, -0.33, 0.07, -1.1, 0, 0);
      k.add(pfBox(0.17, 0.22, 0.002), 'emit', pfC(0x2bb3a6, 0.9), 0.0, -0.326, 0.0785, -1.1, 0, 0);
    }
    k.pop();
    k.build(arm);
    return arm;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);
  // postura relaxada: braços quase verticais, rentes ao tronco; assimetria leve
  armL.rotation.z = -0.09; armL.rotation.x = -0.02;
  armR.rotation.z = 0.08; armR.rotation.x = -0.04;
  g.add(armL, armR);

  // Cabeça: pescoço, rosto simples, orelhas, cabelo, capacete com aba
  const head = new THREE.Group();
  head.position.set(0, 1.44, 0);
  const h = new PfKit(matLib);
  h.dust = 0;
  h.autoDetail = 0;
  h.add(pfCyl(0.05, 0.056, 0.14, 16), 'skin', skin, 0, 0.05, -0.005);
  h.add(pfSphere(0.1, 24, 18), 'skin', skin, 0, 0.19, 0.005, 0, 0, 0, 0.94, 1.16, 1.0);
  h.add(pfSphere(0.066, 12, 8), 'skin', skin, 0, 0.14, 0.018, 0, 0, 0, 0.98, 0.72, 0.95);
  h.add(pfCone(0.021, 0.05, 8), 'skin', pfC(skin, 0.95), 0, 0.178, 0.1, Math.PI / 2 - 0.35, 0, 0);
  for (const s of [-1, 1]) {
    h.add(pfSphere(0.026, 8, 6), 'skin', pfC(skin, 0.9), s * 0.094, 0.185, -0.005, 0, 0, 0, 0.5, 1, 0.8);
    h.add(pfSphere(0.011, 8, 6), 'skin', 0xd9d2c6, s * 0.035, 0.205, 0.084, 0, 0, 0, 1.25, 0.62, 0.55);
    h.add(pfSphere(0.0062, 8, 6), 'skin', 0x3b2616, s * 0.035, 0.205, 0.0905);
    h.add(pfSphere(0.03, 8, 6), 'skin', pfC(skin, 1.04), s * 0.05, 0.168, 0.07, 0, 0, 0, 1, 0.75, 0.6);
    h.add(pfRBox(0.056, 0.02, 0.014, 0.007), 'cloth', hairCol, s * 0.04, 0.232, 0.088, 0, 0, s * -0.12);
    // mandíbula e costeleta: formas de pele para o rosto ler a distância
    h.add(pfSphere(0.04, 10, 8), 'skin', skin, s * 0.058, 0.13, 0.045, 0, 0, 0, 1, 0.8, 0.9);
    h.add(pfSphere(0.03, 8, 6), 'cloth', hairCol, s * 0.092, 0.17, -0.012, 0, 0, 0, 0.8, 2.0, 0.9);
  }
  h.add(pfCapsule(0.0075, 0.028, 2, 6), 'skin', pfC(skin, 0.72), 0, 0.142, 0.089, 0, 0, Math.PI / 2);
  h.add(pfSphere(0.04, 10, 8), 'skin', skin, 0, 0.11, 0.045, 0, 0, 0, 1, 0.7, 0.8);
  h.add(pfSphere(0.11, 14, 8, 0, Math.PI * 0.55), 'cloth', hairCol, 0, 0.2, -0.01, -0.5, 0, 0, 0.99, 1.12, 1.04);
  h.add(pfSphere(0.07, 12, 8), 'cloth', hairCol, 0, 0.14, -0.072, 0, 0, 0, 1.1, 0.9, 0.7);
  h.add(pfBox(0.02, 0.05, 0.02), 'skin', pfC(skin, 0.98), 0, 0.19, 0.095);
  // Bigode e barba por fazer: rosto de gente da usina, não de manequim
  if (opts.bigode) h.add(pfCapsule(0.009, 0.045, 2, 6), 'cloth', hairCol, 0, 0.152, 0.09, 0, 0, Math.PI / 2, 1, 1, 0.8);
  if (opts.barba) h.add(pfSphere(0.085, 12, 8, Math.PI * 0.55, Math.PI * 0.45), 'cloth', pfC(hairCol, 1.25), 0, 0.17, 0.012, 0, 0, 0, 0.98, 1.05, 1.0);
  if (opts.hat === 'bone') {
    const bc = opts.hatColor ?? 0x1f4f46;
    h.add(pfSphere(0.108, 16, 8, 0, Math.PI / 2), 'cloth', bc, 0, 0.225, -0.005, 0, 0, 0, 1, 0.75, 1.06);
    h.add(pfRBox(0.15, 0.012, 0.1, 0.005), 'cloth', pfC(bc, 0.85), 0, 0.232, 0.1, -0.12, 0, 0);
  } else if (opts.hat === 'chapeu') {
    const pc = 0xcdb47a;
    h.add(pfCyl(0.07, 0.1, 0.11, 16), 'rough', pc, 0, 0.3, 0);
    h.add(pfSphere(0.07, 12, 6, 0, Math.PI / 2), 'rough', pc, 0, 0.355, 0, 0, 0, 0, 1, 0.35, 1);
    h.add(pfCyl(0.21, 0.13, 0.03, 24), 'rough', pfC(pc, 0.95), 0, 0.245, 0, -0.06, 0, 0);
    h.add(pfCyl(0.1, 0.1, 0.022, 16), 'cloth', 0x5a3a22, 0, 0.255, 0);
  }
  if (opts.lenco) h.add(pfCyl(0.065, 0.075, 0.07, 12), 'cloth', opts.lenco, 0, 0.045, 0.0);
  if (helmet && !opts.hat) {
    const hc = opts.helmetColor ?? 0xf4f6f4;
    h.add(pfSphere(0.118, 16, 8, 0, Math.PI / 2), 'paint', hc, 0, 0.245, 0.0, 0, 0, 0, 1, 1.0, 1.08);
    h.add(pfCyl(0.15, 0.15, 0.012, 20), 'paint', hc, 0, 0.245, 0.02, 0, 0, 0, 1, 1, 1.12);
    h.add(pfBox(0.02, 0.05, 0.25), 'paint', pfC(hc, 0.9), 0, 0.34, 0.0, 0, 0, 0);
  }
  h.build(head);
  head.scale.setScalar(1.0);
  head.rotation.z = 0.05;
  g.add(head);

  // Sombra de contato (aterramento)
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  g.add(shadow);

  // Esconde imediatamente o manequim procedural (mantém apenas a sombra de contato no solo até o avatar 3D GLB acoplar)
  g.children.forEach(ch => {
    if (ch !== shadow) {
      ch.visible = false;
      ch.userData.isProceduralDoll = true;
    }
  });

  g.userData.anim = { armL, armR, head, phase: Math.random() * 6.28, yaw: null };
  return g;
}

// ---------------------------------------------------------------------------
// DRONE AGRÍCOLA
// ---------------------------------------------------------------------------
function buildAgriDrone(matLib) {
  const g = new THREE.Group();
  const k = new PfKit(matLib);
  k.dust = 0;
  k.autoDetail = 0;
  const carbon = 0x1f2428, teal = 0x00877c, accent = 0xffb629;
  k.add(makeLoftedGeo([[-0.14, 0.24, 0.42, 0, 0.85], [0.0, 0.32, 0.56, 0, 1.0], [0.1, 0.28, 0.5, 0, 1.0], [0.16, 0.14, 0.32, 0, 0.95], [0.17, 0.02, 0.02, 0, 0.9]], 16), 'paint', teal);
  k.add(pfRBox(0.36, 0.24, 0.44, 0.06), 'glass', 0xffffff, 0, -0.22, -0.02);
  k.add(pfCyl(0.02, 0.02, 1.15, 8), 'metal', carbon, 0, -0.34, -0.22, 0, 0, Math.PI / 2);
  for (const nx of [-0.45, -0.15, 0.15, 0.45]) k.add(pfCyl(0.015, 0.025, 0.08, 8), 'paint', accent, nx, -0.38, -0.22);
  for (const sx of [-0.36, 0.36]) {
    k.rod(sx * 0.6, -0.1, 0, sx, -0.44, 0, 0.018, 'metal', carbon);
    k.add(pfCyl(0.022, 0.022, 0.95, 8), 'metal', carbon, sx, -0.44, 0, Math.PI / 2, 0, 0);
  }
  k.add(pfRBox(0.14, 0.12, 0.16, 0.03), 'metal', carbon, 0, -0.16, 0.42);
  k.add(pfCyl(0.045, 0.045, 0.06, 12), 'metal', 0x101418, 0, -0.16, 0.5, Math.PI / 2, 0, 0);
  for (const ax of [-0.09, 0.09]) {
    k.add(pfCyl(0.012, 0.012, 0.22, 6), 'metal', carbon, ax, 0.26, -0.15);
    k.add(pfCyl(0.055, 0.055, 0.03, 12), 'paint', accent, ax, 0.37, -0.15);
  }
  const arms = [[0.78, 0.78], [0.78, -0.78], [-0.78, 0.78], [-0.78, -0.78]];
  for (const [rx, rz] of arms) {
    k.rod(rx * 0.2, 0.05, rz * 0.2, rx, 0.12, rz, 0.032, 'metal', carbon, 8);
    k.add(pfCyl(0.075, 0.075, 0.09, 14), 'metal', carbon, rx, 0.14, rz);
    k.add(pfCyl(0.06, 0.06, 0.03, 14), 'paint', accent, rx, 0.19, rz);
  }
  k.build(g);
  const blurMat = new THREE.MeshBasicMaterial({ color: 0xc8d2d6, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const bladeMat = pfMaterial(matLib, 'metal');
  const bladeGeo = pfRBox(0.86, 0.012, 0.065, 0.004).clone();
  const cols = new Float32Array(bladeGeo.attributes.position.count * 3).fill(0.05);
  bladeGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  bladeGeo.setAttribute('pfDust', new THREE.BufferAttribute(new Float32Array(bladeGeo.attributes.position.count), 1));
  const discGeo = new THREE.RingGeometry(0.08, 0.44, 24);
  const rotors = [];
  for (const [rx, rz] of arms) {
    const prop = new THREE.Group();
    prop.position.set(rx, 0.21, rz);
    addMesh(prop, bladeGeo, bladeMat, 0, 0, 0, 0.14, 0, 0, false);
    const disc = new THREE.Mesh(discGeo, blurMat);
    disc.rotation.x = -Math.PI / 2;
    prop.add(disc);
    g.add(prop);
    rotors.push(prop);
  }
  g.userData.rotors = rotors;
  return g;
}
