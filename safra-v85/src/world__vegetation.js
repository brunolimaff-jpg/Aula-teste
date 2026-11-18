// === world/vegetation.js ===
// Canavial adulto (3 a 3,8 m) em linhas, em blocos instanciados com LOD por distância; capim de borda,
// soqueira na área colhida, árvores do cerrado, cupinzeiros e cercas.

// Gerador pseudoaleatório determinístico (mesma cena em toda carga)
function vegRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Junta geometrias (posição, normal, uv) numa só, aplicando matrizes opcionais
function vegMerge(parts) {
  const P = [], N = [], U = [], I = [];
  let off = 0;
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const part of parts) {
    const g = part.geo || part;
    const m = part.matrix || null;
    if (m) nm.getNormalMatrix(m);
    const p = g.attributes.position, no = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); if (m) v.applyMatrix4(m);
      P.push(v.x, v.y, v.z);
      if (no) { n.fromBufferAttribute(no, i); if (m) n.applyMatrix3(nm).normalize(); N.push(n.x, n.y, n.z); } else N.push(0, 1, 0);
      if (uv) U.push(uv.getX(i), uv.getY(i)); else U.push(0, 0);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) I.push(g.index.getX(i) + off);
    else for (let i = 0; i < p.count; i++) I.push(i + off);
    off += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  out.setIndex(I);
  return out;
}

// ---------------------------------------------------------------------------------------------
// Textura da touceira: dois desenhos lado a lado (512 x 1024 cada), colmo segmentado com nós e
// cera, folhas verdes arqueadas com nervura, leque do ponteiro e folha seca pendurada na base.
// ---------------------------------------------------------------------------------------------
function vegCaneTexture() {
  const W = 1024, H = 1024;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, W, H);
  const rnd = vegRng(9127);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rgb = (r, gg, b, a = 1) => `rgba(${r | 0},${gg | 0},${b | 0},${a})`;

  // folha como faixa ao longo de uma curva quadrática, larga perto da base e afinando na ponta
  const leaf = (x0, y0, cx, cy, x1, y1, wMax, cBase, cMid, cTip, rib = true, twist = 0) => {
    const steps = 18, L = [], R = [], C = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
      const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
      const dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
      const dl = Math.hypot(dx, dy) || 1;
      const w = wMax * Math.min(1, t * 6 + 0.25) * (1 - Math.pow(t, 1.6)) * (1 - twist * Math.sin(t * Math.PI) * 0.6);
      L.push([x - dy / dl * w * 0.5, y + dx / dl * w * 0.5]);
      R.push([x + dy / dl * w * 0.5, y - dx / dl * w * 0.5]);
      C.push([x, y]);
    }
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, cBase); gr.addColorStop(0.45, cMid); gr.addColorStop(1, cTip);
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < L.length; i++) g.lineTo(L[i][0], L[i][1]);
    for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
    g.closePath();
    g.fill();
    // borda escura de um lado (volume) e nervura central clara
    g.strokeStyle = 'rgba(20,40,10,0.28)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < L.length; i++) g.lineTo(L[i][0], L[i][1]);
    g.stroke();
    if (rib) {
      g.strokeStyle = 'rgba(222,230,170,0.55)';
      g.lineWidth = Math.max(1, wMax * 0.12);
      g.beginPath();
      g.moveTo(C[0][0], C[0][1]);
      for (let i = 1; i < C.length - 2; i++) g.lineTo(C[i][0], C[i][1]);
      g.stroke();
    }
  };

  for (let variant = 0; variant < 2; variant++) {
    const ox = variant * 512;
    g.save();
    g.beginPath();
    g.rect(ox + 6, 0, 500, H);
    g.clip();
    const nSt = variant === 0 ? 8 : 9;
    const stalks = [];
    for (let i = 0; i < nSt; i++) {
      const bx = ox + 70 + (i / (nSt - 1)) * 372 + (rnd() - 0.5) * 34;
      const top = 120 + rnd() * 200;
      const lean = (rnd() - 0.5) * 70 + (bx - (ox + 256)) * 0.18;
      stalks.push({ bx, top, lean, w: 9 + rnd() * 4, purple: rnd() < 0.35 });
    }
    const sx = (s, y) => s.bx + s.lean * Math.pow((H - y) / (H - s.top), 1.4);

    // 1. folhas secas penduradas na base (atrás dos colmos)
    for (const s of stalks) {
      const nDry = 4 + (rnd() * 3 | 0);
      for (let k = 0; k < nDry; k++) {
        const y0 = lerp(H - 60, s.top + (H - s.top) * 0.45, rnd());
        const x0 = sx(s, y0);
        const dir = rnd() < 0.5 ? -1 : 1;
        const len = 90 + rnd() * 170;
        const c1 = rgb(150 + rnd() * 30, 125 + rnd() * 25, 70 + rnd() * 20, 0.95);
        const c2 = rgb(185 + rnd() * 30, 160 + rnd() * 30, 100 + rnd() * 25, 0.95);
        const c3 = rgb(120 + rnd() * 20, 95 + rnd() * 20, 55, 0.9);
        leaf(x0, y0, x0 + dir * len * 0.45, y0 - len * 0.15, x0 + dir * len * 0.7, y0 + len * (0.35 + rnd() * 0.5), 9 + rnd() * 5, c1, c2, c3, false, 0.4);
      }
    }

    // 2. colmos segmentados
    for (const s of stalks) {
      let y = H;
      let seg = 0;
      while (y > s.top + 8) {
        const fracH = (H - y) / (H - s.top);
        const len = lerp(34, 58, Math.sin(Math.min(1, fracH * 1.2) * Math.PI * 0.9)) + rnd() * 10;
        const y1 = Math.max(s.top, y - len);
        const xa = sx(s, y), xb = sx(s, y1);
        const w = s.w * lerp(1.0, 0.72, fracH);
        // cor: base amarelada/arroxeada, meio verde-amarelo com cera, topo verde
        let cL, cC, cR;
        if (fracH < 0.55) {
          const p = s.purple;
          cL = p ? rgb(88, 58, 52) : rgb(118, 104, 48);
          cC = p ? rgb(168, 120, 96) : rgb(196, 182, 104);
          cR = p ? rgb(70, 46, 40) : rgb(92, 82, 36);
        } else {
          cL = rgb(70, 96, 34); cC = rgb(150, 176, 82); cR = rgb(56, 78, 26);
        }
        const gr = g.createLinearGradient(xa - w / 2, 0, xa + w / 2, 0);
        gr.addColorStop(0, cL); gr.addColorStop(0.42, cC); gr.addColorStop(1, cR);
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(xa - w / 2, y); g.lineTo(xa + w / 2, y);
        g.lineTo(xb + w / 2, y1); g.lineTo(xb - w / 2, y1);
        g.closePath(); g.fill();
        // cera branca logo abaixo do nó
        g.fillStyle = 'rgba(232,230,200,0.35)';
        g.fillRect(xb - w / 2, y1 + 3, w, 5);
        // nó escuro e anel de crescimento
        g.fillStyle = 'rgba(48,40,18,0.9)';
        g.fillRect(xb - w / 2 - 1, y1, w + 2, 2.5);
        g.fillStyle = 'rgba(210,200,140,0.5)';
        g.fillRect(xb - w / 2, y1 - 2, w, 1.5);
        // bainha seca grudada em parte dos entrenós baixos
        if (fracH < 0.45 && rnd() < 0.55) {
          g.fillStyle = rgb(160 + rnd() * 30, 135 + rnd() * 20, 80, 0.75);
          const side = rnd() < 0.5 ? -1 : 1;
          g.beginPath();
          g.moveTo(xa + side * w * 0.1, y);
          g.lineTo(xa + side * w * 0.65, y - len * 0.2);
          g.lineTo(xb + side * w * 0.55, y1 + 2);
          g.lineTo(xb + side * w * 0.05, y1 + 2);
          g.closePath(); g.fill();
        }
        y = y1;
        seg++;
      }
    }

    // 3. folhas verdes arqueadas saindo dos nós superiores
    for (const s of stalks) {
      const nL = 7 + (rnd() * 4 | 0);
      for (let k = 0; k < nL; k++) {
        const t = k / nL;
        const y0 = lerp(s.top + (H - s.top) * 0.55, s.top + 20, t) + (rnd() - 0.5) * 20;
        const x0 = sx(s, y0);
        const dir = (k % 2 === 0 ? 1 : -1) * (rnd() < 0.85 ? 1 : -1);
        const len = 230 + rnd() * 210 - t * 40;
        const rise = len * (0.35 + rnd() * 0.35);
        const reach = len * (0.55 + rnd() * 0.3);
        const droop = len * (rnd() * 0.45 - 0.05);
        const under = rnd() < 0.18;
        const gBase = under ? rgb(96, 128, 82) : rgb(52 + rnd() * 18, 92 + rnd() * 22, 26 + rnd() * 10);
        const gMid = under ? rgb(140, 172, 120) : rgb(92 + rnd() * 28, 140 + rnd() * 26, 40 + rnd() * 16);
        const gTip = rnd() < 0.3 ? rgb(176 + rnd() * 30, 168 + rnd() * 20, 90) : rgb(120 + rnd() * 30, 160 + rnd() * 20, 60);
        leaf(x0, y0, x0 + dir * reach * 0.35, y0 - rise * 1.35, x0 + dir * reach, y0 - rise * 0.55 + droop, 12 + rnd() * 6, gBase, gMid, gTip, true, rnd() * 0.5);
      }
      // leque do ponteiro e cartucho
      const tx = sx(s, s.top), ty = s.top;
      for (let k = 0; k < 5; k++) {
        const a = (k / 4 - 0.5) * 1.5 + (rnd() - 0.5) * 0.3;
        const len = 120 + rnd() * 110;
        leaf(tx, ty + 6, tx + Math.sin(a) * len * 0.3, ty - len * 0.7, tx + Math.sin(a) * len * 0.85, ty - len * (0.5 + rnd() * 0.3),
          10 + rnd() * 4, rgb(60, 104, 30), rgb(104, 152, 50), rgb(150, 176, 80), true, 0.2);
      }
      g.strokeStyle = rgb(120, 160, 60, 0.95);
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(tx, ty + 10); g.lineTo(tx + (rnd() - 0.5) * 12, ty - 70 - rnd() * 40); g.stroke();
    }
    g.restore();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.premultiplyAlpha = true;
  tex.anisotropy = 8;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// Geometria da touceira: planos cruzados, levemente curvos, com o índice do plano na parte inteira de uv.x
function vegCaneClumpGeo(nPlanes, cols, rows, width, height) {
  const P = [], N = [], U = [], I = [];
  let off = 0;
  for (let p = 0; p < nPlanes; p++) {
    const a = (p / nPlanes) * Math.PI + (p % 2 ? 0.12 : -0.08);
    const ca = Math.cos(a), sa = Math.sin(a);
    const nx = -sa, nz = ca;                 // normal do plano
    const shift = (p % 2 ? 0.1 : -0.1);      // planos fora do eixo para não cruzar todos no centro
    for (let r = 0; r <= rows; r++) {
      const v = r / rows;
      for (let c = 0; c <= cols; c++) {
        const u = c / cols;
        const s = (u - 0.5) * width;
        const cup = 0.16 * (2 * u - 1) * (2 * u - 1) * (0.3 + v);
        const arch = 0.18 * v * v * (u - 0.5) * 2;
        const x = ca * s + nx * (cup + shift) + ca * arch;
        const z = sa * s + nz * (cup + shift) + sa * arch;
        const y = v * height * (1 - 0.05 * Math.abs(2 * u - 1) * v);
        P.push(x, y, z);
        N.push(nx, 0.3, nz);
        U.push(p + 0.001 + u * 0.998, v);
      }
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i0 = off + r * (cols + 1) + c, i1 = i0 + 1, i2 = i0 + cols + 1, i3 = i2 + 1;
      I.push(i0, i1, i2, i1, i3, i2);
    }
    off += (rows + 1) * (cols + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  geo.setIndex(I);
  return geo;
}

// Mantido por compatibilidade: devolve a touceira de alto detalhe
function create3DCaneClumpGeometry() {
  return vegCaneClumpGeo(4, 1, 2, 2.4, 3.6);
}

// Shader comum da vegetação em cartões: vento por instância, alfa preservado na distância,
// normal de volume (esfera da touceira), oclusão pela altura, translucidez e poeira perto da estrada
function vegFoliagePatch(mat, U, opt) {
  const H = opt.height;
  mat.onBeforeCompile = s => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uT; uniform float uWindK; uniform float uWiden;
        attribute vec2 aInfo;
        varying float vH; varying float vEdge; varying float vSeed; varying vec3 vVolN; varying vec3 vWP;`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        #ifdef USE_MAP
        {
          float pI = floor(uv.x);
          float fu = uv.x - pI;
          ${opt.variants > 1 ? `float vr = mod(floor(aInfo.y * 7.0) + pI, ${opt.variants}.0);
          vMapUv.x = (fu + vr) / ${opt.variants}.0;` : 'vMapUv.x = uv.x;'}
        }
        #endif`)
      .replace('#include <beginnormal_vertex>', `
        vec3 objectNormal = normalize(vec3(position.x, ${(H * 0.35).toFixed(2)} + position.y * 0.25, position.z) + normal * 0.15);`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vH = clamp(position.y / ${H.toFixed(2)}, 0.0, 1.0);
          vEdge = aInfo.x; vSeed = aInfo.y;
          vec3 ip = vec3(0.0);
          mat3 im = mat3(1.0);
          #ifdef USE_INSTANCING
            ip = instanceMatrix[3].xyz; im = mat3(instanceMatrix);
          #endif
          // alarga as touceiras distantes (o bloco distante desenha menos instâncias)
          float dC = length(cameraPosition.xz - ip.xz);
          transformed.xz *= 1.0 + smoothstep(55.0, 120.0, dC) * uWiden;
          // vento: rajadas que atravessam o campo + balanço próprio + tremor das folhas
          float k = vH * vH;
          float gust = 0.5 + 0.5 * sin(dot(ip.xz, vec2(0.11, 0.05)) - uT * 1.05);
          gust = gust * gust;
          float ph = aInfo.y * 6.2831853;
          vec2 wdir = normalize(vec2(1.0, 0.35));
          vec2 wsw = wdir * (0.06 + 0.26 * gust) * (0.75 + 0.25 * sin(uT * 1.9 + ph)) + vec2(-wdir.y, wdir.x) * 0.05 * sin(uT * 1.3 + ph * 1.7);
          wsw *= k * uWindK;
          // converte o deslocamento de mundo para o espaço local da instância (rotação em y + escala)
          vec2 c0 = im[0].xz, c2 = im[2].xz;
          transformed.x += dot(c0, wsw) / max(dot(c0, c0), 1e-4);
          transformed.z += dot(c2, wsw) / max(dot(c2, c2), 1e-4);
          transformed += normal * sin(uT * 6.3 + ph * 3.0 + position.y * 2.1) * 0.03 * k * uWindK;
          transformed.y -= length(wsw) * 0.35 * k;
          vVolN = normalize(normalMatrix * (im * objectNormal));
          vWP = (modelMatrix * vec4(im * transformed + ip, 1.0)).xyz;
        }`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uSunDir; uniform vec3 uDustCol; uniform vec3 uTintA; uniform vec3 uTintB; uniform vec3 uDryCol;
        uniform vec4 uPest; uniform float uAoMin; uniform float uTransK;
        varying float vH; varying float vEdge; varying float vSeed; varying vec3 vVolN; varying vec3 vWP;`)
      .replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec4 texC = texture2D(map, vMapUv);
          // alfa pré-multiplicado: desfaz para a cor e preserva cobertura nos mips distantes
          texC.rgb /= max(texC.a, 0.03);
          vec2 dUv = vMapUv * vec2(${opt.texW}.0, ${opt.texH}.0);
          float mipL = 0.5 * log2(max(max(dot(dFdx(dUv), dFdx(dUv)), dot(dFdy(dUv), dFdy(dUv))), 1.0));
          texC.a = clamp(texC.a * (1.0 + mipL * 0.32), 0.0, 1.0);
          diffuseColor *= texC;
        #endif
        {
          // cor por touceira: verde mais escuro ou mais amarelado, mancha de praga, base mais seca
          vec3 tint = mix(uTintA, uTintB, fract(vSeed * 13.7));
          float pest = uPest.w > 0.0 ? 1.0 - smoothstep(uPest.z * 0.35, uPest.z, length(vWP.xz - uPest.xy)) : 0.0;
          tint = mix(tint, vec3(1.25, 1.05, 0.42), pest * 0.85);
          diffuseColor.rgb *= tint;
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uDryCol, (1.0 - smoothstep(0.08, 0.4, vH)) * 0.6);
          // poeira vermelha nas folhas baixas da borda
          float dust = (1.0 - smoothstep(0.2, 2.2, vEdge)) * (1.0 - smoothstep(0.25, 1.7, vWP.y));
          diffuseColor.rgb = mix(diffuseColor.rgb, uDustCol * 1.25, dust * 0.55);
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = normalize(mix(normalize(vVolN), normal, 0.32));`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        {
          // oclusão: dentro do maciço a luz não chega; a borda e o topo recebem mais
          float depthIn = smoothstep(0.0, 4.0, vEdge);
          float ao = mix(uAoMin, 1.0, smoothstep(0.0, 0.9, vH));
          ao = mix(ao, ao * mix(0.55, 1.0, smoothstep(0.35, 1.0, vH)), depthIn);
          reflectedLight.indirectDiffuse *= ao;
          reflectedLight.directDiffuse *= mix(1.0, ao, 0.6);
          reflectedLight.indirectSpecular *= ao * 0.6;
          // translucidez: o sol atravessa as folhas quando está atrás delas
          vec3 vdir = normalize(cameraPosition - vWP);
          float back = pow(clamp(dot(vdir, -normalize(uSunDir)), 0.0, 1.0), 3.0);
          float sunUp = smoothstep(-0.05, 0.25, uSunDir.y);
          reflectedLight.directDiffuse += diffuseColor.rgb * vec3(0.55, 0.75, 0.2) * back * uTransK * smoothstep(0.3, 1.0, vH) * sunUp;
        }`);
  };
  mat.customProgramCacheKey = () => 'senior-foliage-' + opt.key;
}

function vegDepthMaterial(map, U, opt) {
  const dm = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: opt.alphaTest });
  dm.onBeforeCompile = s => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uT; uniform float uWindK; uniform float uWiden;
        attribute vec2 aInfo;`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        #ifdef USE_MAP
        {
          float pI = floor(uv.x);
          float fu = uv.x - pI;
          ${opt.variants > 1 ? `float vr = mod(floor(aInfo.y * 7.0) + pI, ${opt.variants}.0);
          vMapUv.x = (fu + vr) / ${opt.variants}.0;` : 'vMapUv.x = uv.x;'}
        }
        #endif`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          float vHd = clamp(position.y / ${opt.height.toFixed(2)}, 0.0, 1.0);
          vec3 ip = vec3(0.0); mat3 im = mat3(1.0);
          #ifdef USE_INSTANCING
            ip = instanceMatrix[3].xyz; im = mat3(instanceMatrix);
          #endif
          float k = vHd * vHd;
          float gust = 0.5 + 0.5 * sin(dot(ip.xz, vec2(0.11, 0.05)) - uT * 1.05);
          gust = gust * gust;
          float ph = aInfo.y * 6.2831853;
          vec2 wdir = normalize(vec2(1.0, 0.35));
          vec2 wsw = wdir * (0.06 + 0.26 * gust) * (0.75 + 0.25 * sin(uT * 1.9 + ph)) * k * uWindK;
          vec2 c0 = im[0].xz, c2 = im[2].xz;
          transformed.x += dot(c0, wsw) / max(dot(c0, c0), 1e-4);
          transformed.z += dot(c2, wsw) / max(dot(c2, c2), 1e-4);
        }`);
  };
  dm.customProgramCacheKey = () => 'senior-foliage-depth-' + opt.key;
  return dm;
}

// ---------------------------------------------------------------------------------------------
// Texturas menores: capim/braquiária, soqueira, folhagem de árvore do cerrado
// ---------------------------------------------------------------------------------------------
function vegGrassTexture() {
  const W = 512, H = 256;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const rnd = vegRng(311);
  for (let variant = 0; variant < 2; variant++) {
    const ox = variant * 256;
    g.save();
    g.beginPath(); g.rect(ox + 4, 0, 248, H); g.clip();
    const n = variant ? 70 : 85;
    for (let i = 0; i < n; i++) {
      const bx = ox + 30 + rnd() * 196;
      const len = 70 + rnd() * 170;
      const lean = (rnd() - 0.5) * 190;
      const dry = rnd() < (variant ? 0.22 : 0.1);
      const w = 3 + rnd() * 3.5;
      const c0 = dry ? `rgb(${120 + rnd() * 30},${105 + rnd() * 25},${55 + rnd() * 15})` : `rgb(${34 + rnd() * 22},${70 + rnd() * 30},${18 + rnd() * 12})`;
      const c1 = dry ? `rgb(${185 + rnd() * 30},${165 + rnd() * 30},${100 + rnd() * 25})` : `rgb(${110 + rnd() * 50},${150 + rnd() * 35},${52 + rnd() * 22})`;
      const gr = g.createLinearGradient(bx, H, bx + lean, H - len);
      gr.addColorStop(0, c0); gr.addColorStop(1, c1);
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(bx - w / 2, H);
      g.quadraticCurveTo(bx + lean * 0.3 - w * 0.3, H - len * 0.6, bx + lean, H - len);
      g.quadraticCurveTo(bx + lean * 0.3 + w * 0.3, H - len * 0.6, bx + w / 2, H);
      g.closePath(); g.fill();
    }
    // hastes com espiguetas (braquiária em semente)
    for (let i = 0; i < (variant ? 7 : 4); i++) {
      const bx = ox + 50 + rnd() * 156, top = 10 + rnd() * 60, lean = (rnd() - 0.5) * 60;
      g.strokeStyle = 'rgba(150,140,80,0.95)';
      g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(bx, H); g.quadraticCurveTo(bx + lean * 0.2, (H + top) / 2, bx + lean, top); g.stroke();
      for (let k = 0; k < 4; k++) {
        const t = 0.05 + k * 0.08;
        const yy = top + (H - top) * t, xx = bx + lean * (1 - t);
        g.strokeStyle = 'rgba(120,110,60,0.95)';
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + (k % 2 ? 14 : -14), yy + 16); g.stroke();
      }
    }
    g.restore();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.premultiplyAlpha = true;
  tex.anisotropy = 4;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function vegStubbleTexture() {
  const W = 256, H = 128;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const rnd = vegRng(77);
  // tocos cortados e brotos novos
  for (let i = 0; i < 14; i++) {
    const x = 16 + rnd() * 224, h = 30 + rnd() * 50, w = 7 + rnd() * 4;
    const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    gr.addColorStop(0, '#6b5a2a'); gr.addColorStop(0.45, '#bfae6a'); gr.addColorStop(1, '#5a4a20');
    g.fillStyle = gr;
    g.fillRect(x - w / 2, H - h, w, h);
    g.fillStyle = '#e0d6a6';
    g.fillRect(x - w / 2, H - h, w, 3);
    g.fillStyle = 'rgba(50,40,15,0.8)';
    g.fillRect(x - w / 2 - 1, H - h * 0.45, w + 2, 2);
  }
  for (let i = 0; i < 10; i++) {
    const x = 10 + rnd() * 236, len = 30 + rnd() * 60, lean = (rnd() - 0.5) * 50;
    g.strokeStyle = `rgba(${70 + rnd() * 40},${120 + rnd() * 40},${40},0.95)`;
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(x, H); g.quadraticCurveTo(x + lean * 0.3, H - len * 0.6, x + lean, H - len); g.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.premultiplyAlpha = true;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// Textura procedural de milho safrinha (colmos firmes, folhas largas arqueadas, espigas amarelas e pendão dourado)
function vegCornTexture() {
  const W = 1024, H = 1024;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, W, H);
  const rnd = vegRng(3319);
  for (let variant = 0; variant < 2; variant++) {
    const ox = variant * 512;
    g.save();
    g.beginPath(); g.rect(ox + 6, 0, 500, H); g.clip();
    const stalks = 6;
    for (let i = 0; i < stalks; i++) {
      const bx = ox + 86 + (i / (stalks - 1)) * 340 + (rnd() - 0.5) * 26;
      const top = 160 + rnd() * 140;
      const lean = (rnd() - 0.5) * 44;
      // colmo verde-oliva do milho
      g.strokeStyle = i % 2 ? '#597a2c' : '#688a34';
      g.lineWidth = 10 + rnd() * 3;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(bx, H);
      g.quadraticCurveTo(bx + lean * 0.4, (H + top) * 0.5, bx + lean, top + 60);
      g.stroke();
      // pendão dourado no topo
      const tx = bx + lean, ty = top + 60;
      for (let t = 0; t < 5; t++) {
        const ang = -Math.PI / 2 + (t - 2) * 0.24 + (rnd() - 0.5) * 0.1;
        g.strokeStyle = '#dfbe5c';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(tx, ty);
        g.lineTo(tx + Math.cos(ang) * (54 + rnd() * 24), ty + Math.sin(ang) * (54 + rnd() * 24));
        g.stroke();
      }
      // folhas largas alternadas
      for (let lf = 0; lf < 7; lf++) {
        const frac = 0.22 + lf * 0.11;
        const y0 = H - (H - ty) * frac;
        const x0 = bx + lean * frac * frac;
        const dir = (lf + i) % 2 === 0 ? -1 : 1;
        const len = 105 + rnd() * 65;
        const gr = g.createLinearGradient(x0, y0, x0 + dir * len, y0 + 40);
        gr.addColorStop(0, '#466a22');
        gr.addColorStop(0.55, '#689132');
        gr.addColorStop(1, '#8ead42');
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(x0, y0 - 6);
        g.quadraticCurveTo(x0 + dir * len * 0.55, y0 - 42, x0 + dir * len, y0 + 28 + rnd() * 28);
        g.quadraticCurveTo(x0 + dir * len * 0.45, y0 - 10, x0, y0 + 10);
        g.closePath();
        g.fill();
      }
      // 1-2 espigas maduras aparecendo na palha
      for (let c = 0; c < 2; c++) {
        if (c === 1 && rnd() < 0.45) continue;
        const frac = 0.42 + c * 0.14;
        const cy = H - (H - ty) * frac;
        const cx = bx + lean * frac * frac;
        const side = c % 2 === 0 ? 1 : -1;
        g.save();
        g.translate(cx + side * 12, cy - 8);
        g.rotate(side * 0.34);
        g.fillStyle = '#e6b830';
        g.beginPath();
        g.ellipse(0, 0, 12, 30, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#c4a64a';
        g.beginPath();
        g.ellipse(0, 16, 13, 18, 0, 0, Math.PI);
        g.fill();
        g.restore();
      }
    }
    g.restore();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.premultiplyAlpha = true;
  tex.anisotropy = 4;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function vegLeafTexture() {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const g = cv.getContext('2d');
  const rnd = vegRng(4242);
  // ramalhete de folhas coriáceas: muitas elipses em ramos, mais denso no centro
  for (let b = 0; b < 9; b++) {
    const a0 = rnd() * Math.PI * 2;
    const r0 = 20 + rnd() * 30;
    g.strokeStyle = 'rgba(70,50,30,0.9)';
    g.lineWidth = 2;
    const bx = S / 2 + Math.cos(a0) * r0 * 0.3, by = S / 2 + Math.sin(a0) * r0 * 0.3;
    const ex = S / 2 + Math.cos(a0) * (r0 + 70), ey = S / 2 + Math.sin(a0) * (r0 + 70);
    g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
  }
  for (let i = 0; i < 260; i++) {
    const rr = Math.pow(rnd(), 0.65) * 112;
    const a = rnd() * Math.PI * 2;
    const x = S / 2 + Math.cos(a) * rr, y = S / 2 + Math.sin(a) * rr * 0.92;
    const L = 12 + rnd() * 12, Wd = 5 + rnd() * 4;
    const tone = rnd();
    const yellow = rnd() < 0.12;
    const r = yellow ? 150 + tone * 40 : 38 + tone * 40, gg = yellow ? 140 + tone * 30 : 70 + tone * 50, bb = yellow ? 50 : 22 + tone * 18;
    g.fillStyle = `rgb(${r | 0},${gg | 0},${bb | 0})`;
    g.save();
    g.translate(x, y);
    g.rotate(a + (rnd() - 0.5) * 1.2);
    g.beginPath();
    g.ellipse(0, 0, L / 2, Wd / 2, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,220,0.18)';
    g.beginPath();
    g.ellipse(-L * 0.08, -Wd * 0.15, L * 0.35, Wd * 0.18, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.premultiplyAlpha = true;
  tex.anisotropy = 4;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// ---------------------------------------------------------------------------------------------
// Árvores do cerrado: tronco tortuoso com galhos (tubos) e copa de cartões de folhagem
// ---------------------------------------------------------------------------------------------
function vegTreeVariant(seed) {
  const rnd = vegRng(seed);
  const woodParts = [];
  const canopyParts = [];
  const trunkH = 2.2 + rnd() * 1.6;
  const lean = new THREE.Vector3((rnd() - 0.5) * 0.9, 0, (rnd() - 0.5) * 0.9);
  const trunkPts = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean.x * 0.3 + (rnd() - 0.5) * 0.3, trunkH * 0.4, lean.z * 0.3 + (rnd() - 0.5) * 0.3),
    new THREE.Vector3(lean.x * 0.7, trunkH * 0.75, lean.z * 0.7),
    new THREE.Vector3(lean.x, trunkH, lean.z)
  ];
  const trunkR = 0.16 + rnd() * 0.08;
  const trunk = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trunkPts), 8, trunkR, 6, false);
  // afina o tronco para cima
  {
    const p = trunk.attributes.position;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      tmp.fromBufferAttribute(p, i);
      const t = Math.min(1, Math.max(0, tmp.y / trunkH));
      const c = trunkPts[0].clone().lerp(trunkPts[3], t);
      const k = 1 - t * 0.45;
      p.setXYZ(i, c.x + (tmp.x - c.x) * k, tmp.y, c.z + (tmp.z - c.z) * k);
    }
  }
  woodParts.push(trunk);
  const top = trunkPts[3];
  const nB = 4 + (rnd() * 3 | 0);
  const crownR = 2.4 + rnd() * 1.4;
  const tips = [];
  for (let b = 0; b < nB; b++) {
    const a = (b / nB) * Math.PI * 2 + rnd() * 0.6;
    const out = crownR * (0.6 + rnd() * 0.4);
    const up = 1.0 + rnd() * 1.6;
    const p1 = top.clone().add(new THREE.Vector3(Math.cos(a) * out * 0.35, up * 0.45, Math.sin(a) * out * 0.35));
    const p2 = top.clone().add(new THREE.Vector3(Math.cos(a) * out, up, Math.sin(a) * out));
    const br = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([top.clone().add(new THREE.Vector3(0, -0.2, 0)), p1, p2]), 4, trunkR * 0.55, 5, false);
    woodParts.push(br);
    tips.push(p2);
  }
  // copa: cartões em volta das pontas dos galhos e no centro, normais esféricas a partir do centro
  const crownC = top.clone().add(new THREE.Vector3(0, 1.4, 0));
  const card = new THREE.PlaneGeometry(1, 1);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
  const clusterAt = (c, n, r) => {
    for (let i = 0; i < n; i++) {
      const pos = c.clone().add(new THREE.Vector3((rnd() - 0.5) * r, (rnd() - 0.3) * r * 0.55, (rnd() - 0.5) * r));
      e.set((rnd() - 0.5) * 1.2 - 0.6, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.6);
      q.setFromEuler(e);
      const s = 1.5 + rnd() * 1.1;
      sc.set(s, s, s);
      m4.compose(pos, q, sc);
      const g = card.clone().applyMatrix4(m4);
      // normais esféricas: copa iluminada como volume
      const p = g.attributes.position, nn = g.attributes.normal;
      for (let k = 0; k < p.count; k++) {
        const dx = p.getX(k) - crownC.x, dy = (p.getY(k) - crownC.y) * 1.6 + 0.6, dz = p.getZ(k) - crownC.z;
        const l = Math.hypot(dx, dy, dz) || 1;
        nn.setXYZ(k, dx / l, dy / l, dz / l);
      }
      canopyParts.push(g);
    }
  };
  tips.forEach(t => clusterAt(t, 7, 1.8));
  clusterAt(crownC, 6, crownR * 0.9);
  const wood = vegMerge(woodParts);
  const canopy = vegMerge(canopyParts);
  return { wood, canopy, height: crownC.y + 1.5 };
}

// ---------------------------------------------------------------------------------------------
function buildVegetation(scene, matLib, sunDirRef) {
  const L = FIELD_LAYOUT;
  const rnd = vegRng(20251113);
  const sunUniform = { value: (sunDirRef || new THREE.Vector3(0.4, 0.6, 0.5)).clone() };
  const timeUniform = { value: 0 };
  const dustCol = matLib.dustColor || { value: new THREE.Color(0.34, 0.14, 0.062) };
  const group = new THREE.Group();
  group.name = 'vegetacao';
  scene.add(group);

  // ======================= CANAVIAL =======================
  const caneTex = vegCaneTexture();
  const CANE_H = 3.6;
  const caneU = {
    uT: timeUniform, uWindK: { value: 1.0 }, uWiden: { value: 0.55 },
    uSunDir: sunUniform, uDustCol: dustCol,
    uTintA: { value: new THREE.Color(0.86, 0.96, 0.8) }, uTintB: { value: new THREE.Color(1.08, 1.04, 0.82) },
    uDryCol: { value: new THREE.Color(1.25, 1.05, 0.7) },
    uPest: { value: new THREE.Vector4(L.pest.x, L.pest.z, L.pest.r, 1) },
    uAoMin: { value: 0.22 }, uTransK: { value: 0.55 }
  };
  const caneMat = new THREE.MeshLambertMaterial({ map: caneTex, alphaTest: 0.5, side: THREE.DoubleSide });
  vegFoliagePatch(caneMat, caneU, { key: 'cane', height: CANE_H, variants: 2, texW: 1024, texH: 1024 });
  const caneDepth = vegDepthMaterial(caneTex, caneU, { key: 'cane', height: CANE_H, variants: 2, alphaTest: 0.5 });

  const geoHi = vegCaneClumpGeo(4, 1, 3, 2.4, CANE_H);
  const geoLo = vegCaneClumpGeo(3, 1, 1, 2.5, CANE_H);

  // Distribui o canavial em linhas paralelas à estrada, em blocos de 20 m por lado da estrada.
  // Bordas (estrada, clareiras, divisa): touceiras em planos cruzados, densas.
  // Miolo (só aparece entre as touceiras da borda): faixas de cartões ao longo de cada linha, bem mais baratas.
  const geoStrip = vegCaneClumpGeo(1, 2, 2, 2.6, CANE_H);
  const chunks = [];
  const CHX = 20;
  const EDGE_CLUMP = 3.4;
  let caneCount = 0;
  const xEnd = Math.max(L.xEndPos, L.xEndNeg);
  const d0 = new THREE.Object3D();
  const mkInst = (geo, items, visible) => {
    const g = geo.clone();
    const info = new Float32Array(items.length * 2);
    items.forEach((it, i) => { info[i * 2] = it.edge; info[i * 2 + 1] = it.seed; });
    g.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 2));
    const im = new THREE.InstancedMesh(g, caneMat, items.length);
    items.forEach((it, i) => {
      d0.position.set(it.x, it.y, it.z);
      d0.rotation.set(0, it.r, 0);
      d0.scale.set(it.sc, it.sy, it.sc);
      d0.updateMatrix();
      im.setMatrixAt(i, d0.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.customDepthMaterial = caneDepth;
    im.castShadow = true;
    im.receiveShadow = true;
    im.computeBoundingSphere();
    im.visible = visible;
    group.add(im);
    return im;
  };
  const heightOf = (x, z, edge) => {
    const dP = Math.hypot(x - L.pest.x, z - L.pest.z);
    const pestK = Math.max(0, 1 - dP / L.pest.r);
    const r = rnd();
    return (0.86 + r * r * 0.24) * (0.93 + 0.07 * Math.min(1, edge / 2)) * (1 - pestK * 0.12);
  };
  for (let cx = L.xMin; cx < xEnd; cx += CHX) {
    for (const side of [1, -1]) {
      for (let band = 0; band < 1; band++) {
        const zA = L.zMin;
        const zB = L.zMax + 0.5;
        const keep = [], rest = [], strips = [];
        let rowI = 0;
        for (let az = L.rowZ0; az <= L.zMax; az += L.rowStep, rowI++) {
          if (az < zA || az >= zB) continue;
          // touceiras da borda
          let colI = 0;
          for (let x = cx + rnd() * 0.5; x < cx + CHX; x += 0.8 + rnd() * 0.16, colI++) {
            const jx = x + (rnd() - 0.5) * 0.3;
            const jz = side * (az + (rnd() - 0.5) * 0.24);
            if (!fieldIsCane(jx, jz)) continue;
            const edge = fieldEdgeDist(jx, jz);
            if (edge >= EDGE_CLUMP) continue;
            const item = { x: jx, z: jz, y: getTerrainHeight(jx, jz) - 0.05, r: rnd() * Math.PI * 2, sc: 0.92 + rnd() * 0.16, sy: heightOf(jx, jz, edge), edge, seed: rnd() };
            if (edge < 1.7 || (rowI + colI) % 2 === 0) keep.push(item); else rest.push(item);
          }
          // faixas do miolo
          for (let x = cx + rnd() * 0.6; x < cx + CHX; x += 1.75 + rnd() * 0.4) {
            const jz = side * (az + (rnd() - 0.5) * 0.2);
            if (!fieldIsCane(x, jz)) continue;
            const edge = fieldEdgeDist(x, jz);
            if (edge < EDGE_CLUMP - 0.6) continue;
            strips.push({ x, z: jz, y: getTerrainHeight(x, jz) - 0.05, r: (rnd() < 0.5 ? 0 : Math.PI) + (rnd() - 0.5) * 0.35,
              sc: 0.9 + rnd() * 0.25, sy: heightOf(x, jz, edge), edge: Math.min(edge, 8), seed: rnd() });
          }
        }
        const items = keep.concat(rest);
        if (!items.length && !strips.length) continue;
        const c = { x0: cx, x1: cx + CHX, z0: side > 0 ? zA : -zB, z1: side > 0 ? zB : -zA, full: items.length, thin: keep.length, hi: null, lo: null, st: null };
        if (items.length) {
          c.hi = mkInst(geoHi, items, false);
          c.lo = mkInst(geoLo, items, true);
        }
        if (strips.length) c.st = mkInst(geoStrip, strips, true);
        chunks.push(c);
        caneCount += items.length + strips.length;
      }
    }
  }

  // ======================= SOQUEIRA (área colhida) =======================
  const stubTex = vegStubbleTexture();
  const stubU = {
    uT: timeUniform, uWindK: { value: 0.0 }, uWiden: { value: 0.0 }, uSunDir: sunUniform, uDustCol: dustCol,
    uTintA: { value: new THREE.Color(0.95, 0.95, 0.9) }, uTintB: { value: new THREE.Color(1.05, 1.0, 0.85) },
    uDryCol: { value: new THREE.Color(1, 1, 1) }, uPest: { value: new THREE.Vector4(0, 0, 1, 0) },
    uAoMin: { value: 0.6 }, uTransK: { value: 0.0 }
  };
  const stubMat = new THREE.MeshLambertMaterial({ map: stubTex, alphaTest: 0.5, side: THREE.DoubleSide });
  vegFoliagePatch(stubMat, stubU, { key: 'stub', height: 0.4, variants: 1, texW: 256, texH: 128 });
  const stubGeo = vegMerge([
    { geo: new THREE.PlaneGeometry(0.7, 0.24).translate(0, 0.12, 0) },
    { geo: new THREE.PlaneGeometry(0.7, 0.24).translate(0, 0.12, 0).rotateY(Math.PI / 2) }
  ]);
  {
    const items = [];
    const harv = L.clear.find(r => r.kind === 'colhida');
    for (let az = L.rowZ0; az < 36; az += L.rowStep) {
      for (let x = harv.x0 + 0.4; x < harv.x1 - 0.4; x += 1.1 + rnd() * 1.2) {
        const z = -az + (rnd() - 0.5) * 0.15;
        if (z < harv.z0 + 0.3 || z > harv.z1 - 0.5) continue;
        if (Math.abs(x - PARADAS[2].x) < 3.0 && z > -12) continue; // trilha até a Marta
        if (rnd() < 0.3) continue;
        items.push({ x, z, r: (rnd() - 0.5) * 0.5, s: 0.6 + rnd() * 0.6, seed: rnd() });
      }
    }
    const g = stubGeo.clone();
    const info = new Float32Array(items.length * 2);
    items.forEach((it, i) => { info[i * 2] = 0.0; info[i * 2 + 1] = it.seed; });
    g.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 2));
    const im = new THREE.InstancedMesh(g, stubMat, items.length);
    const d = new THREE.Object3D();
    items.forEach((it, i) => {
      d.position.set(it.x, getTerrainHeight(it.x, it.z) - 0.02, it.z);
      d.rotation.set(0, it.r, 0);
      d.scale.set(it.s, it.s * (0.8 + it.seed * 0.5), it.s);
      d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
    });
    im.receiveShadow = true;
    im.computeBoundingSphere();
    group.add(im);
  }

  // ======================= TALHÃO DE MILHO SAFRINHA (USINA FLEX) =======================
  {
    const cornPlot = L.clear.find(r => r.kind === 'milho');
    if (cornPlot) {
      const cornTex = vegCornTexture();
      const CORN_H = 2.35;
      const cornU = {
        uT: timeUniform, uWindK: { value: 0.72 }, uWiden: { value: 0.3 },
        uSunDir: sunUniform, uDustCol: dustCol,
        uTintA: { value: new THREE.Color(0.92, 0.98, 0.78) }, uTintB: { value: new THREE.Color(1.06, 1.0, 0.72) },
        uDryCol: { value: new THREE.Color(1.15, 0.98, 0.65) }, uPest: { value: new THREE.Vector4(0, 0, 1, 0) },
        uAoMin: { value: 0.34 }, uTransK: { value: 0.52 }
      };
      const cornMat = new THREE.MeshLambertMaterial({ map: cornTex, alphaTest: 0.48, side: THREE.DoubleSide });
      vegFoliagePatch(cornMat, cornU, { key: 'corn', height: CORN_H, variants: 2, texW: 1024, texH: 1024 });
      const cornDepth = vegDepthMaterial(cornTex, cornU, { key: 'corn', height: CORN_H, variants: 2, alphaTest: 0.48 });
      const cornGeo = vegCaneClumpGeo(2, 1, 1, 1.55, CORN_H);
      const cItems = [];
      for (let z = cornPlot.z0 + 0.8; z <= cornPlot.z1 - 0.6; z += 1.05) {
        for (let x = cornPlot.x0 + 0.7; x <= cornPlot.x1 - 0.7; x += 0.85) {
          const jx = x + (rnd() - 0.5) * 0.22;
          const jz = z + (rnd() - 0.5) * 0.16;
          cItems.push({ x: jx, z: jz, y: getTerrainHeight(jx, jz) - 0.04, r: rnd() * Math.PI * 2, sc: 0.85 + rnd() * 0.22, sy: 0.86 + rnd() * 0.26, seed: rnd() });
        }
      }
      const cg = cornGeo.clone();
      const cInfo = new Float32Array(cItems.length * 2);
      cItems.forEach((it, i) => { cInfo[i * 2] = 0.2; cInfo[i * 2 + 1] = it.seed; });
      cg.setAttribute('aInfo', new THREE.InstancedBufferAttribute(cInfo, 2));
      const cornIm = new THREE.InstancedMesh(cg, cornMat, cItems.length);
      const cd = new THREE.Object3D();
      cItems.forEach((it, i) => {
        cd.position.set(it.x, it.y, it.z);
        cd.rotation.set(0, it.r, 0);
        cd.scale.set(it.sc, it.sy, it.sc);
        cd.updateMatrix();
        cornIm.setMatrixAt(i, cd.matrix);
      });
      cornIm.instanceMatrix.needsUpdate = true;
      cornIm.customDepthMaterial = cornDepth;
      cornIm.castShadow = true;
      cornIm.receiveShadow = true;
      cornIm.computeBoundingSphere();
      group.add(cornIm);
    }
  }

  // ======================= CAPIM DE BORDA / BRAQUIÁRIA =======================
  const grassTex = vegGrassTexture();
  const GRASS_H = 0.7;
  const grassU = {
    uT: timeUniform, uWindK: { value: 0.55 }, uWiden: { value: 0.0 }, uSunDir: sunUniform, uDustCol: dustCol,
    uTintA: { value: new THREE.Color(0.9, 0.95, 0.82) }, uTintB: { value: new THREE.Color(1.1, 1.02, 0.78) },
    uDryCol: { value: new THREE.Color(1.1, 1.0, 0.8) }, uPest: { value: new THREE.Vector4(0, 0, 1, 0) },
    uAoMin: { value: 0.45 }, uTransK: { value: 0.35 }
  };
  const grassMat = new THREE.MeshLambertMaterial({ map: grassTex, alphaTest: 0.45, side: THREE.DoubleSide });
  vegFoliagePatch(grassMat, grassU, { key: 'grass', height: GRASS_H, variants: 2, texW: 512, texH: 256 });
  const grassGeo = (() => {
    const parts = [];
    for (let p = 0; p < 3; p++) {
      const pg = new THREE.PlaneGeometry(1.35, GRASS_H, 1, 1).translate(0, GRASS_H / 2, 0);
      const uv = pg.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, p + 0.001 + uv.getX(i) * 0.998);
      pg.rotateY((p / 3) * Math.PI + 0.2);
      parts.push(pg);
    }
    return vegMerge(parts);
  })();
  const onPadOrPath = (x, z) => {
    for (let i = 0; i < PARADAS.length; i++) {
      const p = PARADAS[i];
      const zMin = Math.min(0, p.bz), zMax = Math.max(0, p.bz);
      if (Math.abs(x - p.x) < 3.4 && z > zMin - 0.5 && z < zMax + 0.5) return true;
      const padW = i === 5 ? 48 : i === 6 ? 36 : i === 9 ? 42 : 22;
      const padD = i === 5 ? 38 : i === 6 ? 24 : i === 9 ? 28 : 18;
      if (i !== 2 && Math.abs(x - p.x) < padW / 2 + 0.8 && Math.abs(z - p.bz) < padD / 2 + 0.8) return true;
    }
    if (x > 46 && x < 65 && z > 26 && z < 43) return true;
    if (x > -108.5 && x < -83.5 && z > 6.2 && z < 30.5) return true;
    if (x > -13.5 && x < 19 && z > -36.5 && z < -24) return true;
    for (const sg of SINAIS) if (Math.hypot(x - sg.x, z - sg.z) < 1.6) return true;
    if (x > 103) return true;
    return false;
  };
  const grassItems = [];
  // acostamentos
  for (let x = -148; x < 108; x += 0.22 + rnd() * 0.26) {
    for (const side of [1, -1]) {
      const az = 3.7 + Math.pow(rnd(), 0.8) * 3.0;
      const z = side * az;
      if (onPadOrPath(x, z)) continue;
      if (rnd() < 0.1) continue;
      grassItems.push({ x, z, s: 0.5 + rnd() * 0.55 * Math.min(1, (az - 3.5) / 1.2), seed: rnd(), edge: az - 3.6 });
    }
  }
  // bordas das clareiras e do fim do talhão; pastos da zona industrial; faixa do cerrado
  for (let i = 0; i < 9000; i++) {
    const x = -148 + rnd() * 256, z = (rnd() - 0.5) * 2 * 104;
    if (Math.abs(z) < 7) continue;
    if (onPadOrPath(x, z)) continue;
    const cane = fieldIsCane(x, z);
    if (cane) continue;
    const ed = fieldEdgeDist(x, z);
    const harv = L.clear.find(r => r.kind === 'colhida');
    const inHarv = x > harv.x0 && x < harv.x1 && z > harv.z0 && z < harv.z1;
    if (inHarv) continue;
    const inYard = (x > -84 && x < -60 && z > 6 && z < 27) || (x > -107 && x < -85 && z > -31 && z < -12);
    if (inYard) continue;
    const nearEdge = Math.abs(z) > 71 && Math.abs(z) < 74;
    const p = nearEdge ? 0.9 : (Math.abs(z) > 71 ? 0.2 : 0.16);
    if (rnd() > p) continue;
    grassItems.push({ x, z, s: 0.45 + rnd() * 0.45, seed: rnd(), edge: ed });
  }
  {
    // agrupa em células de 64 m para recorte por frustum
    const cells = new Map();
    for (const it of grassItems) {
      const key = Math.floor(it.x / 64) + ',' + Math.floor(it.z / 64);
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(it);
    }
    const d = new THREE.Object3D();
    for (const list of cells.values()) {
      const g = grassGeo.clone();
      const info = new Float32Array(list.length * 2);
      list.forEach((it, i) => { info[i * 2] = Math.min(it.edge, 3); info[i * 2 + 1] = it.seed; });
      g.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 2));
      const im = new THREE.InstancedMesh(g, grassMat, list.length);
      list.forEach((it, i) => {
        d.position.set(it.x, getTerrainHeight(it.x, it.z) - 0.03, it.z);
        d.rotation.set(0, it.seed * 6.283, 0);
        d.scale.set(it.s, it.s * (0.75 + it.seed * 0.5), it.s);
        d.updateMatrix();
        im.setMatrixAt(i, d.matrix);
      });
      im.receiveShadow = true;
      im.computeBoundingSphere();
      group.add(im);
    }
  }

  // ======================= ÁRVORES DO CERRADO =======================
  const leafTex = vegLeafTexture();
  const leafU = {
    uT: timeUniform, uWindK: { value: 0.12 }, uWiden: { value: 0.0 }, uSunDir: sunUniform, uDustCol: dustCol,
    uTintA: { value: new THREE.Color(0.85, 0.92, 0.8) }, uTintB: { value: new THREE.Color(1.05, 1.0, 0.75) },
    uDryCol: { value: new THREE.Color(1, 1, 1) }, uPest: { value: new THREE.Vector4(0, 0, 1, 0) },
    uAoMin: { value: 0.55 }, uTransK: { value: 0.3 }
  };
  const leafMat = new THREE.MeshLambertMaterial({ map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide });
  // a copa usa as normais esféricas da geometria (sem a normal de volume da touceira)
  vegFoliagePatch(leafMat, leafU, { key: 'leaf', height: 8.0, variants: 1, texW: 256, texH: 256 });
  const leafOnBefore = leafMat.onBeforeCompile;
  leafMat.onBeforeCompile = s => {
    leafOnBefore(s);
    s.vertexShader = s.vertexShader.replace(/vec3 objectNormal = normalize\(vec3\(position\.x[^;]*;/, 'vec3 objectNormal = normal;');
  };
  const leafDepth = vegDepthMaterial(leafTex, leafU, { key: 'leaf', height: 8.0, variants: 1, alphaTest: 0.5 });
  const barkMat = matLib.get(matLib.baked.casca ? 'casca' : 'madeira', { color: 0xd8ccc0, roughness: 1.0 });

  const variants = [vegTreeVariant(11), vegTreeVariant(23), vegTreeVariant(37)];
  const treeSpots = [];
  // faixas de cerrado além das cercas do canavial
  for (let i = 0; i < 520 && treeSpots.length < 120; i++) {
    const x = -150 + rnd() * 270;
    const side = rnd() < 0.5 ? 1 : -1;
    const z = side * (75 + rnd() * 32);
    if (treeSpots.some(t => Math.hypot(t.x - x, t.z - z) < 6.5)) continue;
    treeSpots.push({ x, z, s: 0.8 + rnd() * 0.6, v: (rnd() * 3) | 0, r: rnd() * 6.28 });
  }
  // árvores isoladas: sombra no gramado da sede, perto da oficina e nos pastos da indústria
  [[-118, -28, 1.25], [-112, -14, 1.0], [-122, -18, 0.9], [-34, 32, 1.1], [-12, 30, 0.95],
   [8, 40, 1.15], [18, -44, 1.0], [40, 46, 1.2], [62, -48, 1.05], [-6, -48, 1.1], [86, 46, 0.95], [70, 44, 1.0]]
    .forEach(([x, z, s], i) => treeSpots.push({ x, z, s, v: i % 3, r: i * 1.7 }));
  variants.forEach((vr, vi) => {
    const list = treeSpots.filter(t => t.v === vi);
    if (!list.length) return;
    const info = new Float32Array(list.length * 2);
    list.forEach((t, i) => { info[i * 2] = 3.0; info[i * 2 + 1] = (i * 0.618) % 1; });
    const wg = vr.wood.clone(), cg = vr.canopy.clone();
    cg.setAttribute('aInfo', new THREE.InstancedBufferAttribute(info, 2));
    const wood = new THREE.InstancedMesh(wg, barkMat, list.length);
    const canopy = new THREE.InstancedMesh(cg, leafMat, list.length);
    const d = new THREE.Object3D();
    list.forEach((t, i) => {
      d.position.set(t.x, getTerrainHeight(t.x, t.z) - 0.05, t.z);
      d.rotation.set(0, t.r, 0);
      d.scale.setScalar(t.s);
      d.updateMatrix();
      wood.setMatrixAt(i, d.matrix);
      canopy.setMatrixAt(i, d.matrix);
    });
    wood.castShadow = true; wood.receiveShadow = true;
    canopy.castShadow = true; canopy.receiveShadow = true;
    canopy.customDepthMaterial = leafDepth;
    wood.computeBoundingSphere(); canopy.computeBoundingSphere();
    group.add(wood, canopy);
  });

  // ======================= CUPINZEIROS NOS PASTOS =======================
  {
    const pts = [];
    for (let i = 0; i < 0.5 * 120; i++) {
      const x = -6 + rnd() * 110, z = (rnd() < 0.5 ? 1 : -1) * (30 + rnd() * 70);
      if (onPadOrPath(x, z)) continue;
      pts.push({ x, z, s: 0.6 + rnd() * 0.7, r: rnd() * 6.28 });
    }
    for (let i = 0; i < 30; i++) {
      const x = -148 + rnd() * 140, z = (rnd() < 0.5 ? 1 : -1) * (74 + rnd() * 30);
      pts.push({ x, z, s: 0.5 + rnd() * 0.6, r: rnd() * 6.28 });
    }
    const prof = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      prof.push(new THREE.Vector2(0.55 * Math.pow(1 - t, 0.7) * (1 + 0.12 * Math.sin(t * 9)) + 0.02, t * 1.1));
    }
    const mound = new THREE.LatheGeometry(prof, 9);
    {
      const p = mound.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const n = 1 + 0.18 * Math.sin(x * 7 + y * 5) * Math.cos(z * 6);
        p.setXYZ(i, x * n, y, z * n);
      }
      mound.computeVertexNormals();
    }
    const moundMat = matLib.get('estrada', { color: 0xf2dccc, roughness: 1.0, dust: 0.0, scale: 1.4 });
    const im = new THREE.InstancedMesh(mound, moundMat, pts.length);
    const d = new THREE.Object3D();
    pts.forEach((p, i) => {
      d.position.set(p.x, getTerrainHeight(p.x, p.z) - 0.08, p.z);
      d.rotation.set(0, p.r, 0);
      d.scale.set(p.s, p.s * (0.8 + (i % 5) * 0.12), p.s);
      d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
    });
    im.castShadow = true; im.receiveShadow = true;
    im.computeBoundingSphere();
    group.add(im);
  }

  // ======================= CERCAS =======================
  {
    const posts = [];
    const lines = [];
    const fenceLine = (x0, z0, x1, z1, step) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.max(1, Math.round(len / step));
      let prev = null;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = x0 + (x1 - x0) * t + (rnd() - 0.5) * 0.15, z = z0 + (z1 - z0) * t + (rnd() - 0.5) * 0.15;
        const y = getTerrainHeight(x, z);
        const tilt = (rnd() - 0.5) * 0.08;
        posts.push({ x, y, z, tilt, h: 1.35 + rnd() * 0.15 });
        if (prev) {
          for (const wh of [0.45, 0.8, 1.15]) {
            const sag = 0.04;
            lines.push(prev.x, prev.y + wh, prev.z, (prev.x + x) / 2, (prev.y + y) / 2 + wh - sag, (prev.z + z) / 2);
            lines.push((prev.x + x) / 2, (prev.y + y) / 2 + wh - sag, (prev.z + z) / 2, x, y + wh, z);
          }
        }
        prev = { x, y, z };
      }
    };
    // divisa do canavial com o cerrado, dos dois lados
    fenceLine(-148, 72.5, 4, 72.5, 3.2);
    fenceLine(-148, -72.5, 4, -72.5, 3.2);
    // cerca dos pastos da indústria, atrás dos pátios
    fenceLine(-6, 44, 102, 44, 3.4);
    fenceLine(-12, -44, 102, -44, 3.4);
    fenceLine(-6, 44, -6, 72.5, 3.4);
    fenceLine(-12, -44, -12, -72.5, 3.4);
    // gramado da sede
    fenceLine(-124.5, -36.5, -84, -36.5, 2.8);
    fenceLine(-124.5, -36.5, -124.5, -7.2, 2.8);
    const postGeo = new THREE.CylinderGeometry(0.06, 0.075, 1, 6).translate(0, 0.5, 0);
    const postMat = matLib.get('madeira', { color: 0x9a8a74, roughness: 1.0, scale: 0.8 });
    const im = new THREE.InstancedMesh(postGeo, postMat, posts.length);
    const d = new THREE.Object3D();
    posts.forEach((p, i) => {
      d.position.set(p.x, p.y - 0.15, p.z);
      d.rotation.set(p.tilt, (i * 1.3) % 6.28, p.tilt * 0.6);
      d.scale.set(1, p.h + 0.15, 1);
      d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
    });
    im.castShadow = true; im.receiveShadow = true;
    im.computeBoundingSphere();
    group.add(im);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    const wire = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x4a4744, transparent: true, opacity: 0.75 }));
    group.add(wire);
  }

  // ======================= LOD DO CANAVIAL =======================
  const LOD_HI = 24, LOD_THIN = 72, LOD_SHADOW = 34;
  const applyLod = (cam) => {
    for (const c of chunks) {
      const dx = Math.max(c.x0 - cam.x, 0, cam.x - c.x1);
      const dz = Math.max(c.z0 - cam.z, 0, cam.z - c.z1);
      const d = Math.hypot(dx, dz);
      const hiOn = d < LOD_HI;
      const shadow = d < LOD_SHADOW;
      if (c.hi) {
        c.hi.visible = hiOn;
        c.lo.visible = !hiOn;
        c.lo.count = !hiOn && d > LOD_THIN ? c.thin : c.full;
        c.lo.castShadow = shadow;
        c.hi.castShadow = shadow;
      }
      if (c.st) c.st.castShadow = false;
    }
  };
  applyLod(WORLD_SHARED.cam);

  if (typeof window !== 'undefined') window.__VEGDBG__ = { group, chunks, caneMat, grassMat, leafMat };
  return {
    caneCount,
    chunks: chunks.length,
    update(timeSec, sunDir) {
      timeUniform.value = timeSec;
      if (sunDir) sunUniform.value.copy(sunDir);
      applyLod(WORLD_SHARED.cam);
    }
  };
}
