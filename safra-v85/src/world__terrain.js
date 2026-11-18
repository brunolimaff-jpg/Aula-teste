// === world/terrain.js ===
// Chão da Usina Horizonte: uma malha com shader que mistura latossolo, estrada de terra batida com trilhas
// de pneu, capim, concreto de pátio e área colhida com palha em leiras. Uma saia de terreno leva o chão até o
// horizonte, onde camadas de mata e serras fecham a vista.

// Estado compartilhado entre terreno e vegetação (câmera principal, umidade da madrugada, hora do dia)
const WORLD_SHARED = {
  cam: new THREE.Vector3(-104, 1.72, -2.5),
  camValid: false,
  wet: { value: 1.0 },
  day: { value: 0.0 }
};

// Layout do canavial: retângulos sem cana (clareiras, área colhida, pátios), em metros de mundo
const FIELD_LAYOUT = {
  xMin: -148, zMin: 6.6, zMax: 71,
  xEndPos: -8,     // lado +z: cana até a oficina
  xEndNeg: -14,    // lado -z: cana até a balança
  rowZ0: 7.2, rowStep: 1.5,
  clear: [
    { x0: -124, x1: -84, z0: -36, z1: -6.6, kind: 'sede' },
    { x0: -108, x1: -84, z0: 6.6, z1: 30, kind: 'milho' },
    { x0: -74.8, x1: -69.2, z0: 6.6, z1: 13, kind: 'trilha' },
    { x0: -81, x1: -61, z0: 6.6, z1: 18, kind: 'talhao' },
    { x0: -69.5, x1: -60, z0: 18, z1: 26.5, kind: 'torre' },
    { x0: -66, x1: -29, z0: -36, z1: -6.6, kind: 'colhida' },
    { x0: -38, x1: -8, z0: 6.6, z1: 36, kind: 'oficina' }
  ],
  pest: { x: -76, z: 22, r: 7.5 }
};

function fieldIsCane(x, z) {
  const L = FIELD_LAYOUT;
  const az = Math.abs(z);
  if (az < L.zMin || az > L.zMax || x < L.xMin) return false;
  if (z > 0 && x > L.xEndPos) return false;
  if (z < 0 && x > L.xEndNeg) return false;
  for (const r of L.clear) {
    if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return false;
  }
  return true;
}

// Distância (m) até a borda aberta mais próxima: estrada, clareira ou fim do talhão
function fieldEdgeDist(x, z) {
  const L = FIELD_LAYOUT;
  const az = Math.abs(z);
  let d = Math.min(az - L.zMin, L.zMax - az, x - L.xMin, (z > 0 ? L.xEndPos : L.xEndNeg) - x);
  for (const r of L.clear) {
    const dx = Math.max(r.x0 - x, 0, x - r.x1);
    const dz = Math.max(r.z0 - z, 0, z - r.z1);
    d = Math.min(d, Math.hypot(dx, dz));
  }
  return Math.max(0, d);
}

function buildTerrain(scene, matLib, planarReflector) {
  const W = 380;
  const D = 220;
  const offX = -150;
  const offZ = -110;
  const PX = 4; // pixels por metro na máscara

  // ---------- máscara: R = terra batida, G = capim, B = concreto, A = área colhida ----------
  const MW = W * PX, MH = D * PX;
  const toX = x => (x - offX) * PX;
  const toZ = z => (z - offZ) * PX;
  const mkLayer = () => {
    const c = document.createElement('canvas');
    c.width = MW; c.height = MH;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, MW, MH);
    g.fillStyle = '#fff';
    return { c, g };
  };
  const Ldirt = mkLayer(), Lgrass = mkLayer(), Lconc = mkLayer(), Lharv = mkLayer();
  const rect = (L, x0, z0, x1, z1) => L.g.fillRect(toX(x0), toZ(z0), (x1 - x0) * PX, (z1 - z0) * PX);
  const erase = (L, x0, z0, x1, z1) => { L.g.save(); L.g.fillStyle = '#000'; rect(L, x0, z0, x1, z1); L.g.restore(); };

  // Estrada principal (toda a extensão) e acostamento de capim
  rect(Ldirt, offX, -3.6, offX + W, 3.6);
  rect(Lgrass, offX, -6.8, offX + W, -3.5);
  rect(Lgrass, offX, 3.5, offX + W, 6.8);

  // Zona industrial e pastos: capim fora da lavoura
  rect(Lgrass, -8, 6.8, offX + W, offZ + D);
  rect(Lgrass, -14, offZ, offX + W, -6.8);
  // Além do canavial (cerrado)
  rect(Lgrass, offX, 71.5, offX + W, offZ + D);
  rect(Lgrass, offX, offZ, offX + W, -71.5);

  // Clareiras do canavial
  for (const r of FIELD_LAYOUT.clear) {
    if (r.kind === 'colhida') rect(Lharv, r.x0, r.z0, r.x1, r.z1);
    else if (r.kind === 'sede' || r.kind === 'oficina') rect(Lgrass, r.x0, r.z0, r.x1, r.z1);
    else rect(Ldirt, r.x0, r.z0, r.x1, r.z1);
  }
  // Gramado da sede
  rect(Lgrass, -125, -34, -99, -10);

  // Paradas: trilha da estrada até o pátio, e o pátio
  PARADAS.forEach((p, idx) => {
    // a trilha começa na borda da estrada (não cobre a pista)
    const zMin = p.bz < 0 ? p.bz : 3.2;
    const zMax = p.bz < 0 ? -3.2 : p.bz;
    const padW = idx === 5 ? 48 : idx === 6 ? 36 : idx === 9 ? 42 : 22;
    const padD = idx === 5 ? 38 : idx === 6 ? 24 : idx === 9 ? 28 : 18;
    const concPath = idx >= 3;
    const concPad = idx >= 3;
    if (concPath) {
      rect(Lconc, p.x - 2.8, zMin, p.x + 2.8, zMax);
      erase(Lgrass, p.x - 2.8, zMin, p.x + 2.8, zMax);
    } else {
      rect(Ldirt, p.x - 2.8, zMin, p.x + 2.8, zMax);
      erase(Lgrass, p.x - 2.8, zMin, p.x + 2.8, zMax);
      erase(Lharv, p.x - 2.8, zMin, p.x + 2.8, zMax);
    }
    if (idx === 2) return; // a frente de colheita fica na palha, sem pátio
    const x0 = p.x - padW / 2, z0 = p.bz - padD / 2;
    if (concPad) {
      rect(Lconc, x0, z0, x0 + padW, z0 + padD);
      erase(Lgrass, x0, z0, x0 + padW, z0 + padD);
    } else if (idx === 0) {
      rect(Ldirt, x0, z0, x0 + padW, z0 + padD);
      erase(Lgrass, x0, z0, x0 + padW, z0 + padD);
    }
  });
  // Pátio estendido para Complexo Flex Milho (DDGS + Óleo de Milho) e fila de caminhões da Balança
  rect(Lconc, 46, 26, 65, 43);
  erase(Lgrass, 46, 26, 65, 43);
  rect(Lconc, -13.5, -36.5, 19, -24);
  erase(Lgrass, -13.5, -36.5, 19, -24);
  // Cais e pátio do porto
  rect(Lconc, 104, -60, 110, 60);
  erase(Lgrass, 104, -60, 110, 60);

  // Mistura as quatro camadas num DataTexture RGBA (alfa exato, sem pré-multiplicação)
  const blurOf = (L, px) => {
    const c = document.createElement('canvas');
    c.width = MW; c.height = MH;
    const g = c.getContext('2d');
    g.filter = `blur(${px}px)`;
    g.drawImage(L.c, 0, 0);
    return g.getImageData(0, 0, MW, MH).data;
  };
  const dR = blurOf(Ldirt, 5), dG = blurOf(Lgrass, 6), dB = blurOf(Lconc, 3), dA = blurOf(Lharv, 6);
  const maskData = new Uint8Array(MW * MH * 4);
  for (let row = 0; row < MH; row++) {
    // linha 0 da imagem = z mínimo; a textura amostra v = (z - offZ)/D
    const src = row * MW * 4;
    const dst = row * MW * 4;
    for (let i = 0; i < MW; i++) {
      const k = src + i * 4, o = dst + i * 4;
      maskData[o] = dR[k];
      maskData[o + 1] = dG[k];
      maskData[o + 2] = dB[k];
      maskData[o + 3] = dA[k];
    }
  }
  const maskTex = new THREE.DataTexture(maskData, MW, MH, THREE.RGBAFormat);
  maskTex.minFilter = THREE.LinearFilter;
  maskTex.magFilter = THREE.LinearFilter;
  maskTex.wrapS = maskTex.wrapT = THREE.ClampToEdgeWrapping;
  maskTex.generateMipmaps = false;
  maskTex.needsUpdate = true;

  const B = matLib.baked;
  const terra = B.terra, estrada = B.estrada, concreto = B.concreto;
  const capim = B.capim || B.terra, palha = B.palha || B.terra, asfalto = B.asfalto || B.estrada;

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1.0,
    metalness: 0.0,
    envMapIntensity: 1.0
  });

  const timeUniform = { value: 0 };

  mat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, {
      tMask: { value: maskTex },
      tTerra: { value: terra.map }, tTerraN: { value: terra.normalMap },
      tEstrada: { value: estrada.map }, tEstradaN: { value: estrada.normalMap },
      tConc: { value: concreto.map }, tConcN: { value: concreto.normalMap },
      tCapim: { value: capim.map },
      tPalha: { value: palha.map }, tPalhaN: { value: palha.normalMap },
      tAsf: { value: asfalto.map },
      tPlanar: { value: planarReflector ? planarReflector.rt.texture : null },
      uPlanarMatrix: { value: planarReflector ? planarReflector.textureMatrix : new THREE.Matrix4() },
      uPlanarOn: { value: planarReflector ? 1.0 : 0.0 },
      uTime: timeUniform,
      uWet: WORLD_SHARED.wet,
      uDustCol: matLib.dustColor || { value: new THREE.Color(0.34, 0.14, 0.062) }
    });

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uPlanarMatrix;\nvarying vec3 vWPos;\nvarying vec3 vWNrm;\nvarying vec4 vPlanarUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 wp4 = modelMatrix * vec4(transformed, 1.0);\nvWPos = wp4.xyz;\nvWNrm = normalize(mat3(modelMatrix) * objectNormal);\nvPlanarUv = uPlanarMatrix * wp4;');

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos;
        varying vec3 vWNrm;
        varying vec4 vPlanarUv;
        uniform sampler2D tMask, tTerra, tTerraN, tEstrada, tEstradaN, tConc, tConcN, tCapim, tPalha, tPalhaN, tAsf, tPlanar;
        uniform float uTime, uPlanarOn, uWet;
        uniform vec3 uDustCol;
        float gh(vec2 p){ p=fract(p*vec2(127.1,311.7)); p+=dot(p,p+34.2); return fract(p.x*p.y); }
        float gvn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(gh(i),gh(i+vec2(1,0)),f.x),mix(gh(i+vec2(0,1)),gh(i+vec2(1,1)),f.x),f.y); }
        float gfbm(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*gvn(p); p=mat2(.8,.6,-.6,.8)*p*2.07+3.1; a*=0.5; } return s/0.9375; }
        const mat2 ROT2 = mat2(0.8, -0.6, 0.6, 0.8);
        // amostra anti-repetição: duas escalas, a segunda girada, misturadas por ruído grande
        vec3 atS(sampler2D t, vec2 uv, float k){
          vec3 a = texture2D(t, uv).rgb;
          vec3 b = texture2D(t, ROT2 * uv * 0.43 + vec2(0.31, 0.57)).rgb;
          return mix(a, b, k);
        }
        float rutAt(float az, float c){ return smoothstep(0.40, 0.10, abs(az - c)); }
        vec3 gN; float gRough; float gWetS; float gWetStand;
      `)
      .replace('#include <map_fragment>', `
        vec2 wxz = vWPos.xz;
        float camD = length(vWPos - cameraPosition);
        vec2 mUv = vec2((wxz.x - (${offX}.0)) / ${W}.0, (wxz.y - (${offZ}.0)) / ${D}.0);
        float inside = step(0.0, mUv.x) * step(mUv.x, 1.0) * step(0.0, mUv.y) * step(mUv.y, 1.0);
        vec4 mk = texture2D(tMask, clamp(mUv, 0.001, 0.999));

        float nzA = gvn(wxz * 0.35) * 0.6 + gvn(wxz * 1.3) * 0.4;
        float big = gfbm(wxz * 0.045);
        float kAT = smoothstep(0.3, 0.7, gvn(wxz * 0.07 + 7.0));

        float wDirt = smoothstep(0.30, 0.70, mk.r + (nzA - 0.5) * 0.5);
        float wGrass = smoothstep(0.32, 0.72, mk.g + (nzA - 0.5) * 0.7);
        float wConc = smoothstep(0.44, 0.56, mk.b + (nzA - 0.5) * 0.1);
        float wHarv = smoothstep(0.32, 0.68, mk.a + (nzA - 0.5) * 0.45);

        vec2 uT = wxz / 3.0, uE = wxz / 6.0, uC = wxz / 4.0, uG = wxz / 4.0, uP = wxz / 3.0;
        float az = abs(wxz.y);

        // ---- latossolo do talhão: sulcos das linhas de cana e folha seca no chão ----
        vec3 colT = atS(tTerra, uT, kAT);
        vec3 nT = texture2D(tTerraN, uT).xyz * 2.0 - 1.0;
        float rowPh = (az - 7.2) / 1.5 * 6.2831853;
        float furrow = (0.5 + 0.5 * cos(rowPh)) * smoothstep(6.4, 7.4, az) * (1.0 - wDirt) * (1.0 - wGrass);
        vec3 colP = atS(tPalha, uP, 1.0 - kAT);
        float litter = smoothstep(0.35, 0.75, gvn(wxz * vec2(0.9, 2.2)) * 0.6 + furrow * 0.5) * smoothstep(6.6, 8.5, az);
        colT = mix(colT, colP, litter * 0.55);
        colT *= mix(0.86, 1.06, furrow);
        nT.y += sin(rowPh) * 0.35 * smoothstep(6.4, 7.4, az);

        // ---- área colhida: palha em leiras, soqueira em linhas, trilha do transbordo ----
        vec3 colH = colP;
        vec3 nH = texture2D(tPalhaN, uP).xyz * 2.0 - 1.0;
        if (wHarv > 0.01) {
          float leira = smoothstep(0.45, 0.95, 0.5 + 0.5 * sin(wxz.y * 6.2831853 / 4.5 + gvn(wxz * vec2(0.08, 0.3)) * 2.2));
          float soil = (1.0 - leira) * smoothstep(0.5, 0.8, gvn(wxz * 0.9 + 3.0));
          colH = mix(colH, colT * 0.95, soil * 0.45);
          colH = mix(colH, colH * vec3(1.12, 1.08, 0.98) + vec3(0.03, 0.025, 0.012), leira * 0.5);
          colH *= mix(0.9, 1.1, leira);
          float trk = 0.0;
          for (int i = 0; i < 3; i++) {
            float tz = -12.0 - float(i) * 8.5 + sin(wxz.x * 0.05 + float(i)) * 0.8;
            trk = max(trk, smoothstep(0.42, 0.18, abs(abs(wxz.y - tz) - 0.95)));
          }
          float tread = 0.5 + 0.5 * sin(wxz.x * 9.0 + abs(fract(wxz.y * 2.0) - 0.5) * 6.0);
          colH = mix(colH, colT * (0.78 + 0.12 * tread), trk * 0.75);
          nH.y += sin(wxz.y * 6.2831853 / 4.5) * 0.25 * (1.0 - trk);
          nH.x += (tread - 0.5) * 0.5 * trk;
        }

        // ---- capim ----
        vec3 colG = atS(tCapim, uG, kAT);
        colG *= mix(vec3(0.78, 0.84, 0.52), vec3(1.08, 0.98, 0.56), gvn(wxz * 0.06 + 2.0));
        colG = mix(colG, colG * vec3(1.15, 1.0, 0.7), smoothstep(0.55, 0.85, gfbm(wxz * 0.05 + 4.0)) * 0.6); // manchas de capim seco
        float bare = smoothstep(0.62, 0.8, gfbm(wxz * 0.18 + 9.0));
        colG = mix(colG, colT * 1.1, bare * 0.55);
        vec3 nG = texture2D(tTerraN, uG * 1.7).xyz * 2.0 - 1.0;

        // ---- terra batida (estrada e pátios de terra) ----
        vec3 colE = atS(tEstrada, uE, kAT);
        vec3 nE = texture2D(tEstradaN, uE).xyz * 2.0 - 1.0;
        float onRoad = wDirt * (1.0 - smoothstep(3.3, 3.9, az));
        float asphalt = onRoad * smoothstep(10.0, 16.0, wxz.x) * (1.0 - smoothstep(104.0, 108.0, wxz.x));
        float rut = 0.0, damp = 0.0, standing = 0.0;
        if (onRoad > 0.01) {
          float wob = sin(wxz.x * 0.045) * 0.12 + sin(wxz.x * 0.13 + 1.7) * 0.05;
          float azw = abs(wxz.y + wob);
          rut = max(rutAt(azw, 0.95), rutAt(azw, 2.65)) * onRoad * (1.0 - asphalt);
          float rutE = max(rutAt(azw + 0.03, 0.95), rutAt(azw + 0.03, 2.65)) * onRoad * (1.0 - asphalt);
          float crown = smoothstep(0.55, 0.0, azw) * onRoad;
          float berm = smoothstep(2.95, 3.35, azw) * onRoad;
          float tread = 0.5 + 0.5 * sin(wxz.x * 11.0 + abs(fract(azw * 3.1) - 0.5) * 7.0);
          colE *= 1.0 - rut * 0.18;
          float chev = smoothstep(0.35, 0.65, fract(wxz.x * 3.3 + abs(fract((azw - 0.95) * 2.4) - 0.5) * 1.6));
          colE = mix(colE, colE * (0.8 + 0.16 * tread), rut * 0.6);
          colE *= 1.0 - rut * chev * 0.05 * (1.0 - smoothstep(6.0, 20.0, camD));
          // faixa central: cascalho solto mais claro e capim ralo
          vec3 loose = colE * vec3(1.12, 1.08, 1.02);
          float tuft = smoothstep(0.62, 0.8, gvn(wxz * vec2(1.4, 3.0))) * crown;
          colE = mix(colE, loose, crown * 0.6);
          colE = mix(colE, colG, tuft * 0.75);
          // leiva de terra solta na borda
          colE = mix(colE, colE * vec3(1.1, 1.05, 1.0), berm * 0.5);
          // umidade da madrugada nos sulcos, secando ao longo do dia
          float dField = gfbm(wxz * vec2(0.18, 0.5) + 3.0);
          damp = clamp(rut * smoothstep(0.3, 0.62, dField) * uWet + onRoad * smoothstep(0.7, 0.82, gvn(wxz * 0.23 + 9.0)) * uWet * 0.6, 0.0, 1.0);
          standing = rut * smoothstep(0.74, 0.84, dField * gfbm(wxz * 0.11 + vec2(4.2, 9.1)) * 1.55) * smoothstep(0.15, 0.6, uWet);
          colE *= 1.0 - damp * 0.42;
          nE.y += (rutE - rut) / 0.03 * 0.06 * sign(wxz.y + wob);
          nE.x += (tread - 0.5) * 0.25 * rut;
          nE.xy *= mix(1.0, 0.5, rut);
        }
        // asfalto gasto com poeira vermelha do campo
        if (asphalt > 0.01) {
          vec3 colA = atS(tAsf, wxz / 4.0, kAT);
          float edgeDust = smoothstep(2.0, 3.6, az) + smoothstep(26.0, 10.0, wxz.x) + smoothstep(0.45, 0.8, gvn(wxz * vec2(0.08, 0.6) + 2.0)) * 0.6;
          colA = mix(colA, uDustCol * (0.8 + 0.4 * nzA), 0.18 + clamp(edgeDust, 0.0, 1.0) * 0.5);
          colA = mix(colA, vec3(0.5, 0.46, 0.3), smoothstep(0.09, 0.05, az) * step(0.55, fract(wxz.x / 7.0)) * 0.45 * smoothstep(0.3, 0.6, gvn(wxz * 0.8)));
          colE = mix(colE, colA, asphalt);
        }

        // ---- concreto de pátio ----
        vec3 colC = texture2D(tConc, uC).rgb * mix(0.9, 1.08, big);
        vec3 nC = texture2D(tConcN, uC).xyz * 2.0 - 1.0;
        if (wConc > 0.01) {
          float stripe = smoothstep(0.06, 0.02, abs(fract(wxz.y * 0.125) - 0.5)) * step(0.4, gvn(wxz * 1.4)) * step(abs(wxz.x - 50.0), 60.0);
          colC = mix(colC, vec3(0.62, 0.52, 0.18), stripe * 0.35);
          // poeira vermelha: perto da estrada, do campo e em trilhas de pneu
          float nearRoad = smoothstep(14.0, 4.0, az);
          float nearField = smoothstep(40.0, -10.0, wxz.x);
          float streak = smoothstep(0.55, 0.9, gvn(vec2(wxz.x * 1.6, wxz.y * 0.07)));
          float patchD = smoothstep(0.5, 0.85, gvn(wxz * 0.12 + 5.0));
          float tyre = smoothstep(0.5, 0.85, gvn(vec2(wxz.x * 0.9, wxz.y * 0.05) + 11.0)) * smoothstep(30.0, 6.0, az);
          float dustC = clamp(0.12 + nearRoad * 0.55 + nearField * 0.35 + patchD * 0.35 + streak * nearRoad * 0.4 + tyre * 0.3, 0.0, 0.9);
          colC = mix(colC, uDustCol * (0.85 + 0.35 * nzA), dustC * 0.62);
          // borda do pátio suja de terra
          colC = mix(colC, colE, (1.0 - smoothstep(0.55, 0.9, mk.b)) * 0.5);
        }

        // ---- composição ----
        vec3 al = colT; vec3 nn = nT; float ro = 0.95;
        al = mix(al, colH, wHarv); nn = mix(nn, nH, wHarv);
        al = mix(al, colG, wGrass); nn = mix(nn, nG, wGrass); ro = mix(ro, 0.9, wGrass);
        al = mix(al, colE, wDirt); nn = mix(nn, nE, wDirt); ro = mix(ro, mix(0.92, 0.78, asphalt), wDirt);
        // capim invadindo a borda da terra batida
        float edgeG = wDirt * (1.0 - wDirt) * 4.0;
        al = mix(al, colG * 0.92, edgeG * 0.55 * smoothstep(0.45, 0.65, nzA));
        al = mix(al, colC, wConc); nn = mix(nn, nC, wConc); ro = mix(ro, 0.84, wConc);

        // ---- fora da área do mapa: colcha de lavouras e pastos até o horizonte ----
        if (inside < 0.5) {
          vec2 q = ROT2 * wxz;
          vec2 cell = floor(q / vec2(170.0, 120.0));
          float ty = gh(cell + 0.5);
          vec2 fq = fract(q / vec2(170.0, 120.0));
          float lane = smoothstep(0.012, 0.0, min(min(fq.x, 1.0 - fq.x), min(fq.y, 1.0 - fq.y)));
          vec3 cane = vec3(0.07, 0.13, 0.03) * (0.8 + 0.4 * gvn(wxz * 0.05));
          vec3 soy = vec3(0.36, 0.27, 0.14);
          vec3 pasto = colG * vec3(1.0, 1.05, 0.9);
          vec3 solo = colT * 1.1;
          vec3 far = ty < 0.35 ? cane : ty < 0.55 ? pasto : ty < 0.75 ? soy : solo;
          far = mix(far, colE, lane * 0.8);
          float edgeK = smoothstep(0.0, 0.03, min(min(mUv.x, 1.0 - mUv.x), min(mUv.y, 1.0 - mUv.y)) * -1.0);
          al = mix(al, far, clamp(edgeK, 0.0, 1.0));
        }

        // detalhe de perto: torrões e grãos finos para o chão não borrar aos pés do jogador
        float nearK = 1.0 - smoothstep(3.0, 16.0, camD);
        if (nearK > 0.01) {
          vec2 dUv = wxz / 0.7;
          vec3 dA = texture2D(tTerra, dUv).rgb;
          vec3 dM = texture2D(tTerra, dUv, 9.0).rgb;
          float ratio = dot(dA, vec3(0.3, 0.59, 0.11)) / max(dot(dM, vec3(0.3, 0.59, 0.11)), 0.01);
          float kD = nearK * mix(0.55, 0.2, wConc) * (1.0 - wGrass * 0.5);
          al *= mix(1.0, clamp(ratio, 0.4, 1.8), kD);
          vec2 dN = texture2D(tTerraN, dUv).xy * 2.0 - 1.0;
          nn.xy += dN * nearK * mix(0.9, 0.25, wConc);
          float peb = smoothstep(0.82, 0.9, gh(floor(wxz * 9.0))) * smoothstep(0.42, 0.2, length(fract(wxz * 9.0) - 0.5));
          al = mix(al, al * 0.72 + vec3(0.03, 0.02, 0.015), peb * nearK * wDirt * (1.0 - rut) * 0.6);
        }
        // variação macro de cor e leve dessaturação na distância
        al *= mix(0.88, 1.1, big);
        float farK = smoothstep(60.0, 260.0, camD);
        al = mix(al, al * vec3(1.03, 0.98, 0.93), farK);

        float wet = clamp(max(damp, standing), 0.0, 1.0);
        gWetS = smoothstep(0.15, 0.6, wet);
        gWetStand = smoothstep(0.5, 0.9, standing);
        al *= mix(1.0, 0.62, gWetS);
        al = mix(al, al * 0.45 + vec3(0.03, 0.04, 0.05), gWetStand);

        diffuseColor.rgb *= al;

        gRough = mix(ro, 0.62, gWetS);
        gRough = mix(gRough, 0.05, gWetStand);

        float lodFade = 1.0 - smoothstep(0.03, 0.25, length(fwidth(wxz)));
        nn.xy *= (1.0 - gWetStand * 0.9) * mix(0.25, 1.0, lodFade);
        gN = nn;
      `)
      .replace('#include <normal_fragment_maps>', `
        {
          vec3 wN = normalize(normalize(vWNrm) + vec3(gN.x, 0.0, gN.y) * 0.9);
          normal = normalize(mat3(viewMatrix) * wN);
        }
      `)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gRough;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        if (uPlanarOn > 0.5 && gWetS > 0.02 && vPlanarUv.w > 0.001) {
          vec2 pUv = vPlanarUv.xy / vPlanarUv.w;
          pUv += gN.xy * 0.012 * (1.0 - gWetStand * 0.7);
          if (pUv.x > 0.0 && pUv.x < 1.0 && pUv.y > 0.0 && pUv.y < 1.0) {
            float mipBias = mix(3.5, 0.4, gWetStand);
            vec3 refl = texture2D(tPlanar, pUv, mipBias).rgb;
            vec3 viewDirW = normalize(cameraPosition - vWPos);
            float fresnel = 0.04 + 0.96 * pow(1.0 - clamp(viewDirW.y, 0.0, 1.0), 4.0);
            float reflWeight = mix(gWetS * 0.04, 0.7, gWetStand) * clamp(fresnel * 1.4 + 0.2, 0.0, 1.0);
            reflectedLight.indirectSpecular = mix(reflectedLight.indirectSpecular, refl, reflWeight);
          }
        }
      `);
  };
  mat.customProgramCacheKey = () => 'senior-terrain-v6';

  // ---------- malha principal ----------
  const SX = 190, SZ = 110;
  const geo = new THREE.PlaneGeometry(W, D, SX, SZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + (offX + W / 2);
    const z = pos.getZ(i) + (offZ + D / 2);
    pos.setX(i, x);
    pos.setZ(i, z);
    pos.setY(i, getTerrainHeight(x, z));
  }
  geo.computeVertexNormals();

  const terrainMesh = new THREE.Mesh(geo, mat);
  terrainMesh.receiveShadow = true;
  // A câmera principal é a única que desenha o terreno fora da sombra e do reflexo: guarda sua posição
  terrainMesh.onBeforeRender = (r, s, cam) => {
    if (cam && cam.isPerspectiveCamera && cam.position.y > 0) {
      WORLD_SHARED.cam.copy(cam.position);
      WORLD_SHARED.camValid = true;
    }
  };
  scene.add(terrainMesh);

  // ---------- saia: leva o chão do limite do mapa até ~1300 m, casando a borda ----------
  const skirt = terrBuildSkirt(W, D, offX, offZ, SX, SZ, mat);
  scene.add(skirt);

  // ---------- horizonte em camadas: linha de mata e serras ----------
  const horizon = terrBuildHorizon(scene);

  // ---------- canal/rio no porto ----------
  const waterGeo = new THREE.PlaneGeometry(58, 190, 32, 64);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x17444a,
    roughness: 0.08,
    metalness: 0.22,
    reflectivity: 0.95,
    envMapIntensity: 1.85,
    transparent: true,
    opacity: 0.94
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.set(136, -0.52, 0);
  water.receiveShadow = true;
  scene.add(water);

  const quayMat = matLib.get('concreto', { color: 0xb9b6ae, roughness: 0.85 });
  const quay = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 160), quayMat);
  quay.position.set(109.2, -0.85, 0);
  quay.receiveShadow = true;
  quay.castShadow = true;
  scene.add(quay);

  const bollardMat = matLib.getMetal(0x2d3236, 0.5, 0.8);
  const bollardGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.75, 10);
  const bollards = new THREE.InstancedMesh(bollardGeo, bollardMat, 6);
  const bDummy = new THREE.Object3D();
  let bi = 0;
  for (let bz = -30; bz <= 30; bz += 12) {
    bDummy.position.set(108.6, 0.4, bz);
    bDummy.updateMatrix();
    bollards.setMatrixAt(bi++, bDummy.matrix);
  }
  bollards.castShadow = true;
  bollards.receiveShadow = true;
  scene.add(bollards);

  if (planarReflector) {
    planarReflector.setHiddenObjects([terrainMesh, skirt, water]);
  }

  if (typeof window !== 'undefined') window.__TERDBG__ = { terrainMesh, skirt, horizon, mat, scene };
  return {
    terrainMesh,
    skirt,
    water,
    horizon,
    maskTexture: maskTex,
    // dayProgress é opcional (0 = amanhecer, 1 = fim do dia); sem ele, lê a parada atual
    update(timeSec, dayProgress) {
      timeUniform.value = timeSec;
      water.position.y = -0.52 + Math.sin(timeSec * 1.1) * 0.03;
      let p = dayProgress;
      if (typeof p !== 'number') {
        const dbg = typeof window !== 'undefined' ? window.__SAFRA_DEBUG__ : null;
        p = dbg && dbg.state ? Math.min(1, dbg.state.i / PARADAS.length) : WORLD_SHARED.day.value;
      }
      WORLD_SHARED.day.value = p;
      // orvalho nos sulcos de manhã cedo; seca até perto do meio-dia
      const dry = Math.min(1, Math.max(0, (p - 0.05) / 0.45));
      WORLD_SHARED.wet.value = 1 - dry * dry * (3 - 2 * dry);
      if (horizon) horizon.update(WORLD_SHARED.cam);
    }
  };
}

// Saia de terreno: anéis que partem do perímetro da malha principal e vão até o horizonte
function terrBuildSkirt(W, D, offX, offZ, SX, SZ, mat) {
  const perim = [];
  for (let i = 0; i <= SX; i++) perim.push([offX + (i / SX) * W, offZ]);
  for (let j = 1; j <= SZ; j++) perim.push([offX + W, offZ + (j / SZ) * D]);
  for (let i = SX - 1; i >= 0; i--) perim.push([offX + (i / SX) * W, offZ + D]);
  for (let j = SZ - 1; j >= 1; j--) perim.push([offX, offZ + (j / SZ) * D]);
  const cx = offX + W / 2, cz = offZ + D / 2;
  const rings = [0, 6, 16, 32, 60, 110, 190, 320, 520, 800, 1250];
  const N = perim.length;
  const posArr = [], idx = [];
  for (let r = 0; r < rings.length; r++) {
    const ext = rings[r];
    for (let k = 0; k < N; k++) {
      const [px, pz] = perim[k];
      // direção para fora: mistura da normal do retângulo com a radial (cantos arredondados ao longe)
      let nx = 0, nz = 0;
      if (Math.abs(px - offX) < 1e-3) nx = -1; else if (Math.abs(px - (offX + W)) < 1e-3) nx = 1;
      if (Math.abs(pz - offZ) < 1e-3) nz = -1; else if (Math.abs(pz - (offZ + D)) < 1e-3) nz = 1;
      const rl = Math.hypot(px - cx, pz - cz);
      const rx = (px - cx) / rl, rz = (pz - cz) / rl;
      const blend = Math.min(1, ext / 300);
      let dx = nx * (1 - blend) + rx * blend, dz = nz * (1 - blend) + rz * blend;
      const dl = Math.hypot(dx, dz) || 1;
      dx /= dl; dz /= dl;
      const x = px + dx * ext, z = pz + dz * ext;
      const h0 = getTerrainHeight(px, pz);
      const far = Math.min(1, ext / 400);
      const hill = (Math.sin(x * 0.006 + 1.3) * Math.cos(z * 0.0045 + 0.4) * 9 + Math.sin(x * 0.017 + z * 0.011) * 3) * far;
      const y = r === 0 ? h0 : h0 * (1 - Math.min(1, ext / 60)) + hill - Math.min(1, ext / 80) * 0.2;
      posArr.push(x, y, z);
    }
  }
  for (let r = 0; r < rings.length - 1; r++) {
    for (let k = 0; k < N; k++) {
      const k2 = (k + 1) % N;
      const a = r * N + k, b = r * N + k2, c = (r + 1) * N + k, d = (r + 1) * N + k2;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // orienta as normais para cima
  const nA = g.attributes.normal;
  let flip = 0;
  for (let i = 0; i < nA.count; i++) flip += nA.getY(i);
  if (flip < 0) { g.setIndex(idx.map((v, i) => idx[i - (i % 3) + [0, 2, 1][i % 3]])); g.computeVertexNormals(); }
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  m.frustumCulled = false;
  return m;
}

// Horizonte: linha de mata do cerrado (com copas recortadas) e duas camadas de serra com perspectiva aérea
function terrBuildHorizon(scene) {
  const group = new THREE.Group();
  group.name = 'horizonte';
  const layers = [];
  const mkRing = (r, hMin, hMax, seed, col, haze, bumps, segs, yBase) => {
    const pos = [], idx = [], shade = [];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      let n = Math.sin(a * 3 + seed) * 0.5 + Math.sin(a * 7.3 + seed * 2) * 0.3 + Math.sin(a * 17.1 + seed * 3) * 0.2;
      n = n * 0.5 + 0.5;
      let h = hMin + (hMax - hMin) * n;
      if (bumps) {
        // copas: lóbulos de 3 a 9 m com variação de altura
        const t = a * r / 6.5;
        const lobe = Math.abs(Math.sin(t * Math.PI)) ** 0.6;
        const hv = Math.sin(t * 0.37 + seed) * 0.5 + Math.sin(t * 1.13) * 0.3;
        h = h * (0.72 + 0.28 * lobe) + hv * 2.0;
      } else {
        // serra: topos achatados de chapada com escarpas
        h = hMin + (hMax - hMin) * Math.min(1, Math.max(0, (n - 0.3) * 1.8));
        h += Math.sin(a * 41 + seed) * 0.8;
      }
      pos.push(x, yBase, z, x, yBase + h + 8, z);
      shade.push(0.0, 1.0);
      if (i < segs) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aShade', new THREE.Float32BufferAttribute(shade, 1));
    g.setIndex(idx);
    const m = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, fog: true });
    const U = { uHaze: { value: haze } };
    m.onBeforeCompile = s => {
      s.uniforms.uHaze = U.uHaze;
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aShade;\nvarying float vShade;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvShade = aShade;');
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vShade;\nuniform float uHaze;')
        .replace('#include <fog_fragment>', `
          #ifdef USE_FOG
            vec3 hz = mix(gl_FragColor.rgb * mix(0.55, 1.08, vShade), fogColor, uHaze);
            gl_FragColor.rgb = mix(hz, fogColor, uHaze * 0.25 * (1.0 - vShade));
          #endif`);
    };
    m.customProgramCacheKey = () => 'senior-horizon';
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    mesh.renderOrder = -10;
    group.add(mesh);
    layers.push(mesh);
    return mesh;
  };
  // mata ciliar / cerrado denso a ~340 m, serras a ~820 m e ~1150 m
  mkRing(340, 7, 15, 1.7, 0x22361c, 0.32, true, 900, -1.5);
  mkRing(820, 18, 62, 4.1, 0x3a4d4a, 0.62, false, 220, -2);
  mkRing(1150, 30, 95, 7.7, 0x50646e, 0.78, false, 180, -2);
  scene.add(group);
  return {
    group,
    update(cam) {
      // acompanha o jogador na horizontal para a linha de horizonte não "chegar perto"
      group.position.set(cam.x * 0.85, 0, cam.z * 0.85);
    }
  };
}

function getTerrainHeight(x, z) {
  const nearRoad = Math.max(0, 1 - Math.abs(z) / 8);
  let nearPad = 0;
  for (let i = 0; i < PARADAS.length; i++) {
    const d = Math.hypot(x - PARADAS[i].x, z - PARADAS[i].bz);
    if (d < 24) nearPad = Math.max(nearPad, 1 - d / 24);
  }
  const flat = Math.min(1, nearRoad + nearPad);
  if (x > 110) return -Math.min(1.6, (x - 110) * 0.38);
  const hill = (Math.sin(x * 0.032) * Math.cos(z * 0.041) * 1.45 + Math.sin(x * 0.075 + 1.2) * 0.45) * (1 - flat);
  return Math.max(-0.2, hill);
}
