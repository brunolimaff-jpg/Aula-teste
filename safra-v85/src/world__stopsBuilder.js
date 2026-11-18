let sbGlowTex = null;
// === world/stopsBuilder.js ===
// Monta as dez paradas. Cada parada vira um kit mesclado por material (uma malha por material,
// com recorte por parada) e um grupo de detalhes finos que some de longe.

function makeBevel(w, h, d, b = 0.05) {
  return pfRBox(w, h, d, b).clone();
}

function sbGround(x, z) {
  return typeof getTerrainHeight === 'function' ? getTerrainHeight(x, z) : 0;
}

// Poste de pátio com luminária (mantém a assinatura original)
function sbYardLamp(k, parent, x, z, rotY = 0, warm = true, light = true) {
  const y0 = sbGround(x, z);
  k.push(x, y0, z, 0, rotY, 0);
  k.add(pfCyl(0.32, 0.36, 0.5, 10), 'concrete', 0x9a978f, 0, 0.12, 0);
  k.add(pfCyl(0.075, 0.12, 6.4, 10), 'metal', 0x5b6468, 0, 3.4, 0);
  k.add(pfTube([[0, 6.4, 0], [0, 6.75, 0.25], [0, 6.75, 1.0]], 0.05, 10, 6), 'metal', 0x5b6468);
  k.add(pfRBox(0.36, 0.14, 0.7, 0.05), 'metal', 0x3a4246, 0, 6.72, 1.12);
  const col = warm ? 0xffcf88 : 0xdff2ff;
  k.add(pfRBox(0.3, 0.02, 0.6, 0.008), 'emit', pfC(col, 2.2), 0, 6.645, 1.12);
  k.add(pfRBox(0.24, 0.32, 0.12, 0.03), 'metal', 0x3a4246, 0, 1.2, 0.09);
  k.pop();
  if (light) {
    const pt = new THREE.PointLight(col, 14, 24, 1.5);
    const a = rotY;
    pt.position.set(x + Math.sin(a) * 1.12, y0 + 6.1, z + Math.cos(a) * 1.12);
    parent.add(pt);
  }
}

function addYardLamp(parent, matLib, x, z, rotY = 0, warm = true) {
  const k = new PfKit(matLib);
  const g = new THREE.Group();
  sbYardLamp(k, g, x, z, rotY, warm, true);
  k.build(g);
  parent.add(g);
}

function makeSign(title, sub, x, y, z, rotY = 0) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 192;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0b2225';
  ctx.fillRect(0, 0, 512, 192);
  ctx.fillStyle = '#00b3a4';
  ctx.fillRect(0, 0, 14, 192);
  ctx.fillStyle = '#ffb629';
  ctx.fillRect(14, 0, 498, 8);
  ctx.fillStyle = '#eef6f1';
  ctx.font = '800 50px Archivo, Arial Narrow, sans-serif';
  ctx.fillText(title, 34, 82, 460);
  if (sub) {
    ctx.fillStyle = 'rgba(238,246,241,0.78)';
    ctx.font = '600 28px Inter, sans-serif';
    ctx.fillText(sub, 34, 138, 460);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const g = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: 0x3a4448, roughness: 0.45, metalness: 0.75 });
  const postGeo = pfRBox(0.12, 2.6, 0.12, 0.03);
  addMesh(g, postGeo, postMat, -1.25, 1.3, -0.02);
  addMesh(g, postGeo, postMat, 1.25, 1.3, -0.02);
  addMesh(g, pfRBox(2.96, 1.2, 0.07, 0.025), postMat, 0, 2.1, -0.02);
  addMesh(g, new THREE.PlaneGeometry(2.8, 1.05), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 }), 0, 2.1, 0.02, 0, 0, 0, false);
  addMesh(g, new THREE.PlaneGeometry(2.8, 1.05), postMat, 0, 2.1, -0.06, 0, Math.PI, 0, false);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  return g;
}

function makeBoardTexture(lines, bg = '#f4f1e6') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 384;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 384);
  ctx.fillStyle = '#182828';
  ctx.font = '800 36px Archivo, Arial Narrow, sans-serif';
  ctx.fillText(lines[0], 24, 56, 464);
  ctx.fillStyle = '#b3402a';
  ctx.fillRect(24, 72, 464, 5);
  ctx.fillStyle = '#2c3b3a';
  ctx.font = '600 26px Inter, sans-serif';
  for (let i = 1; i < lines.length; i++) {
    ctx.fillText(lines[i], 24, 84 + i * 44, 464);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Papel com cabeçalho, linhas pautadas e anotações à mão
function sbPaperTexture(lines, bg = '#f4f1e6', opts = {}) {
  const c = document.createElement('canvas');
  c.width = 384; c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 384, 512);
  ctx.fillStyle = 'rgba(120,100,70,0.08)';
  for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * 384, Math.random() * 512, 30 + Math.random() * 60, 2);
  ctx.strokeStyle = 'rgba(70,110,150,0.35)';
  ctx.lineWidth = 2;
  for (let y = 130; y < 500; y += 34) { ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(366, y); ctx.stroke(); }
  ctx.fillStyle = '#182828';
  ctx.font = '800 34px Archivo, Arial Narrow, sans-serif';
  ctx.fillText(lines[0], 22, 54, 340);
  ctx.fillStyle = opts.accent || '#b3402a';
  ctx.fillRect(22, 70, 340, 5);
  ctx.font = 'italic 600 25px Georgia, serif';
  for (let i = 1; i < lines.length; i++) {
    ctx.fillStyle = i === 2 && opts.alert ? '#b3261e' : '#22365a';
    ctx.fillText(lines[i], 26, 122 + i * 34, 330);
  }
  ctx.strokeStyle = 'rgba(34,54,90,0.55)';
  ctx.lineWidth = 2;
  for (let r = 0; r < 4; r++) {
    const y = 122 + (lines.length + 1 + r) * 34;
    ctx.beginPath(); ctx.moveTo(28, y);
    for (let x = 28; x < 200 + Math.random() * 140; x += 8) ctx.lineTo(x, y - 6 + Math.sin(x * 0.3 + r) * 4);
    ctx.stroke();
  }
  if (opts.alert) {
    ctx.save(); ctx.translate(250, 420); ctx.rotate(-0.25);
    ctx.strokeStyle = '#c8281e'; ctx.lineWidth = 6; ctx.strokeRect(-90, -30, 180, 60);
    ctx.fillStyle = '#c8281e'; ctx.font = '800 34px Archivo, Arial Narrow, sans-serif'; ctx.fillText(opts.alert, -78, 12, 160);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Quadro de cortiça bagunçado: papéis sobrepostos e tortos, post-its, rabiscos e marcações de caneta
function sbCorkTexture(lines) {
  const W = 1024, H = 672;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#b07a48';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 5200; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(80,45,20,0.35)' : 'rgba(220,170,110,0.35)';
    ctx.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }
  // papel: retângulo com sombra, rotacionado; o callback desenha em coordenadas locais (origem no centro)
  const sheet = (cx, cy, w, h, rot, col, draw) => {
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 10; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 6;
    ctx.fillStyle = col; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.shadowColor = 'transparent';
    if (draw) draw(-w / 2, -h / 2, w, h);
    ctx.restore();
  };
  const txt = (s, x, y, font, col, maxW) => { ctx.font = font; ctx.fillStyle = col; ctx.fillText(s, x, y, maxW); };
  const rabisco = (x0, y, x1, col = 'rgba(34,54,90,0.6)') => {
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y);
    for (let x = x0; x < x1; x += 8) ctx.lineTo(x, y - 5 + Math.sin(x * 0.27 + y) * 4);
    ctx.stroke();
  };
  const caneta = (col, lw, fn) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; fn(); ctx.stroke(); ctx.restore(); };
  // 1. planilha impressa com células pintadas a marca-texto
  sheet(790, 430, 360, 270, 0.06, '#e8f1ea', (x, y, w, h) => {
    txt('PLANEJ. · SAFRA 26/27', x + 14, y + 34, '700 22px Archivo, Arial Narrow, sans-serif', '#1a2a2a');
    const cw = (w - 28) / 6, rh = 30;
    for (let r = 0; r < 7; r++) for (let q = 0; q < 6; q++) {
      const cx0 = x + 14 + q * cw, cy0 = y + 54 + r * rh;
      if ((r * 7 + q * 3) % 5 === 0) { ctx.fillStyle = 'rgba(255,235,59,0.65)'; ctx.fillRect(cx0, cy0, cw, rh); }
      else if ((r + q) % 4 === 1) { ctx.fillStyle = 'rgba(129,230,140,0.55)'; ctx.fillRect(cx0, cy0, cw, rh); }
      ctx.strokeStyle = 'rgba(60,90,80,0.55)'; ctx.lineWidth = 1.5; ctx.strokeRect(cx0, cy0, cw, rh);
      if (r === 0) txt(['Frente', 'Ha', 'Plant.', 'Colh.', 'Orç.', 'R$'][q], cx0 + 4, cy0 + 21, '700 16px Inter, sans-serif', '#1a2a2a');
    }
  });
  // 2. PLANO DE SAFRA (folha principal, com o texto de evidência)
  sheet(290, 300, 440, 380, -0.03, '#f7f6ef', (x, y, w, h) => {
    txt(lines[0], x + 24, y + 58, '800 46px Archivo, Arial Narrow, sans-serif', '#182828', w - 48);
    ctx.fillStyle = '#b3402a'; ctx.fillRect(x + 24, y + 74, w - 48, 5);
    for (let i = 1; i < lines.length; i++) {
      txt(lines[i], x + 24, y + 124 + i * 58, 'italic 600 30px Georgia, serif', '#22365a', w - 48);
      rabisco(x + 24, y + 140 + i * 58, x + w - 60);
    }
    for (let r = 0; r < 3; r++) rabisco(x + 24, y + 330 + r * 22, x + 300 + r * 30);
  });
  // 3. PLANO v3 riscado com X vermelho
  sheet(560, 170, 250, 190, 0.12, '#f1efe6', (x, y, w, h) => {
    txt('PLANO v3', x + 20, y + 70, '800 44px Archivo, Arial Narrow, sans-serif', '#182828');
    txt('rascunho antigo', x + 20, y + 112, 'italic 600 24px Georgia, serif', '#22365a');
    caneta('rgba(208,40,30,0.92)', 14, () => { ctx.beginPath(); ctx.moveTo(x + 12, y + 12); ctx.lineTo(x + w - 12, y + h - 12); ctx.moveTo(x + w - 12, y + 12); ctx.lineTo(x + 12, y + h - 12); });
  });
  // 4. PLANO v4 (final), meio coberto pela v5
  sheet(800, 150, 260, 180, -0.09, '#ffffff', (x, y, w, h) => {
    txt('PLANO v4', x + 18, y + 58, '800 40px Archivo, Arial Narrow, sans-serif', '#182828');
    txt('(final)', x + 18, y + 104, 'italic 700 34px Georgia, serif', '#b3261e');
    rabisco(x + 18, y + 132, x + w - 30, 'rgba(34,54,90,0.5)');
  });
  // 5. post-it amarelo "v5 AGORA VAI" por cima
  sheet(850, 215, 210, 110, 0.05, '#fff06a', (x, y, w, h) => {
    txt('v5 AGORA VAI', x + 14, y + 56, '800 32px Archivo, Arial Narrow, sans-serif', '#1a1a1a', w - 28);
    txt('(será?)', x + 14, y + 94, 'italic 600 24px Georgia, serif', '#1a1a1a');
  });
  // 6. post-its com recados
  sheet(190, 560, 200, 150, 0.14, '#ff9ec7', (x, y) => {
    txt('Plantio T12', x + 14, y + 52, '800 28px Archivo, Arial Narrow, sans-serif', '#1a1a1a', 175);
    txt('-> adiar?', x + 14, y + 98, '700 30px Inter, sans-serif', '#1a1a1a', 175);
  });
  sheet(440, 575, 200, 140, -0.1, '#fff06a', (x, y) => {
    txt('Colheita:', x + 14, y + 48, '800 28px Archivo, Arial Narrow, sans-serif', '#1a1a1a', 175);
    txt('ver com Marta', x + 14, y + 88, '700 24px Inter, sans-serif', '#1a1a1a', 175);
  });
  sheet(645, 612, 200, 120, 0.05, '#9fe38f', (x, y) => {
    txt('Orçamento:', x + 14, y + 46, '800 26px Archivo, Arial Narrow, sans-serif', '#1a1a1a', 175);
    txt('falta fechar', x + 14, y + 84, '700 24px Inter, sans-serif', '#1a1a1a', 175);
  });
  sheet(905, 600, 160, 110, -0.14, '#fff06a', (x, y) => {
    txt('Ligar p/', x + 12, y + 44, '800 28px Archivo, Arial Narrow, sans-serif', '#1a1a1a', 140);
    txt('Caio', x + 12, y + 84, '800 30px Archivo, Arial Narrow, sans-serif', '#1a1a1a', 140);
  });
  // 7. card vermelho de dúvida
  sheet(560, 470, 270, 104, 0.04, '#ffffff', (x, y) => {
    txt('QUAL É A VERSÃO', x + 14, y + 42, '800 28px Archivo, Arial Narrow, sans-serif', '#c8281e', 245);
    txt('CERTA?', x + 14, y + 82, '800 32px Archivo, Arial Narrow, sans-serif', '#c8281e', 245);
  });
  // 8. marcações de caneta: círculo azul no v4, setas vermelhas ligando papéis
  caneta('rgba(42,91,215,0.9)', 5, () => { ctx.beginPath(); ctx.ellipse(800, 150, 135, 88, -0.09, 0, 6.2832); });
  caneta('rgba(208,40,30,0.9)', 5, () => {
    ctx.moveTo(260, 555); ctx.quadraticCurveTo(230, 470, 190, 410);
    ctx.moveTo(190, 410); ctx.lineTo(205, 418); ctx.moveTo(190, 410); ctx.lineTo(195, 428);
    ctx.moveTo(470, 300); ctx.quadraticCurveTo(490, 250, 530, 215);
    ctx.moveTo(530, 215); ctx.lineTo(518, 222); ctx.moveTo(530, 215); ctx.lineTo(523, 229);
  });
  // 9. alfinetes coloridos por cima de tudo
  for (const [px, py, col] of [[70, 40, '#d23a2a'], [480, 30, '#2a6ad2'], [860, 40, '#1e9a52'], [60, 330, '#e0a020'], [270, 90, '#2a6ad2'], [690, 330, '#d23a2a'], [190, 540, '#e0a020'], [560, 448, '#2a6ad2'], [900, 592, '#d23a2a']]) {
    ctx.beginPath(); ctx.arc(px, py, 9, 0, 6.2832); ctx.fillStyle = col; ctx.fill();
    ctx.beginPath(); ctx.arc(px - 3, py - 3, 3, 0, 6.2832); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Placas de segurança genéricas (sem marcas, sem números)
const SB_SIGN_CACHE = new Map();
function sbSafetyMaterial(kind) {
  if (SB_SIGN_CACHE.has(kind)) return SB_SIGN_CACHE.get(kind);
  const c = document.createElement('canvas');
  c.width = 256; c.height = 320;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f4f4ef'; ctx.fillRect(0, 0, 256, 320);
  if (kind === 'atencao') {
    ctx.fillStyle = '#f2c200'; ctx.fillRect(0, 0, 256, 92);
    ctx.fillStyle = '#111'; ctx.font = '900 54px Archivo, Arial Narrow, sans-serif'; ctx.fillText('ATENÇÃO', 18, 66, 220);
    ctx.beginPath(); ctx.moveTo(128, 112); ctx.lineTo(228, 290); ctx.lineTo(28, 290); ctx.closePath();
    ctx.fillStyle = '#f2c200'; ctx.fill(); ctx.lineWidth = 10; ctx.strokeStyle = '#111'; ctx.stroke();
    ctx.fillStyle = '#111'; ctx.fillRect(119, 160, 18, 70); ctx.fillRect(119, 244, 18, 18);
  } else if (kind === 'epi') {
    ctx.fillStyle = '#1f5fa8'; ctx.fillRect(0, 0, 256, 92);
    ctx.fillStyle = '#fff'; ctx.font = '900 46px Archivo, Arial Narrow, sans-serif'; ctx.fillText('USE EPI', 30, 64, 200);
    ctx.fillStyle = '#1f5fa8'; ctx.beginPath(); ctx.arc(128, 206, 92, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(128, 214, 52, Math.PI, 0); ctx.fill(); ctx.fillRect(66, 210, 124, 14);
  } else if (kind === 'perigo') {
    ctx.fillStyle = '#c8281e'; ctx.fillRect(0, 0, 256, 92);
    ctx.fillStyle = '#fff'; ctx.font = '900 54px Archivo, Arial Narrow, sans-serif'; ctx.fillText('PERIGO', 28, 66, 200);
    ctx.fillStyle = '#111'; ctx.font = '800 34px Archivo, Arial Narrow, sans-serif';
    ctx.fillText('INFLAMÁVEL', 26, 170, 204); ctx.fillText('NÃO FUME', 44, 230, 170);
  } else {
    ctx.fillStyle = '#1e7a3c'; ctx.fillRect(0, 0, 256, 320);
    ctx.fillStyle = '#fff'; ctx.font = '900 40px Archivo, Arial Narrow, sans-serif';
    ctx.fillText('SAÍDA', 70, 90, 140);
    ctx.beginPath(); ctx.moveTo(60, 200); ctx.lineTo(160, 200); ctx.lineTo(160, 160); ctx.lineTo(220, 220); ctx.lineTo(160, 280); ctx.lineTo(160, 240); ctx.lineTo(60, 240); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = '#333'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 250, 314);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.1 });
  SB_SIGN_CACHE.set(kind, m);
  return m;
}

function sbSafetySign(k, parent, kind, x, y, z, rotY = 0, post = false) {
  const gy = post ? sbGround(x, z) : 0;
  if (post) {
    k.push(x, gy, z, 0, rotY, 0);
    k.add(pfRBox(0.07, y + 0.3, 0.07, 0.02), 'metal', 0x6b7277, 0, (y + 0.3) / 2, -0.05);
    k.pop();
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.625), sbSafetyMaterial(kind));
  m.position.set(x, gy + y, z);
  m.rotation.y = rotY;
  m.receiveShadow = true;
  parent.add(m);
  k.push(x, gy + y, z, 0, rotY, 0);
  k.add(pfBox(0.54, 0.665, 0.02), 'metal', 0x6b7277, 0, 0, -0.012);
  k.pop();
}

// ---------------------------------------------------------------------------
// Mobiliário de cena (todas as peças vão para o kit da parada)
// ---------------------------------------------------------------------------
function sbPallet(k, x, z, rot = 0, y = null) {
  const y0 = y ?? sbGround(x, z);
  k.push(x, y0, z, 0, rot, 0);
  const W = 0xa07a4c;
  const uvw = k.uvWorld; k.uvWorld = 1.2;
  for (const zz of [-0.5, 0, 0.5]) k.add(pfBox(1.2, 0.09, 0.14), 'wood', pfC(W, 0.85), 0, 0.05, zz);
  for (let i = 0; i < 7; i++) k.add(pfBox(0.12, 0.025, 1.2), 'wood', W, -0.54 + i * 0.18, 0.105, 0);
  for (const xx of [-0.5, 0.5]) k.add(pfBox(0.12, 0.025, 1.2), 'wood', pfC(W, 0.9), xx, 0.0125, 0);
  k.uvWorld = uvw;
  k.pop();
}

function sbBags(k, x, z, rot = 0, layers = 3, color = 0xeeeae0) {
  const y0 = sbGround(x, z);
  sbPallet(k, x, z, rot, y0);
  k.push(x, y0 + 0.12, z, 0, rot, 0);
  for (let l = 0; l < layers; l++) {
    const alt = l % 2;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const bx = alt ? (j - 0.5) * 0.58 : (i - 1) * 0.38;
      const bz = alt ? (i - 1) * 0.38 : (j - 0.5) * 0.58;
      k.add(pfRBox(alt ? 0.56 : 0.36, 0.16, alt ? 0.36 : 0.56, 0.07), 'cloth', pfC(color, 0.92 + ((i + j + l) % 3) * 0.04), bx, 0.08 + l * 0.16, bz);
    }
  }
  k.pop();
}

function sbDrum(k, x, z, color = 0x2b5f70, y = null, lying = false) {
  const y0 = y ?? sbGround(x, z);
  const prof = [[0.0, 0.0], [0.27, 0.0], [0.285, 0.02], [0.285, 0.26], [0.3, 0.28], [0.285, 0.3], [0.285, 0.58], [0.3, 0.6], [0.285, 0.62], [0.285, 0.86], [0.27, 0.88], [0.0, 0.88]];
  const geo = pfLathe('drum', prof, 16);
  if (lying) k.add(geo, 'paint', color, x, y0 + 0.3, z, 0, 0, Math.PI / 2);
  else {
    k.add(geo, 'paint', color, x, y0, z);
    k.add(pfCyl(0.03, 0.03, 0.02, 8), 'metal', 0x9aa0a4, x + 0.15, y0 + 0.89, z + 0.05);
  }
}

function sbCone(k, x, z) {
  const y0 = sbGround(x, z);
  k.add(pfRBox(0.4, 0.04, 0.4, 0.015), 'rubber', 0x1c1e20, x, y0 + 0.02, z);
  k.add(pfCyl(0.03, 0.15, 0.6, 12), 'paint', 0xe8641c, x, y0 + 0.33, z);
  k.add(pfCyl(0.075, 0.105, 0.12, 12), 'paint', 0xf4f6f4, x, y0 + 0.36, z);
  k.add(pfCyl(0.045, 0.065, 0.06, 12), 'paint', 0xf4f6f4, x, y0 + 0.52, z);
}

function sbTireStack(k, x, z, n = 4, r = 0.55, w = 0.32) {
  const y0 = sbGround(x, z);
  const prof = [[r * 0.6, -w / 2], [r * 0.9, -w / 2], [r, -w * 0.3], [r, w * 0.3], [r * 0.9, w / 2], [r * 0.6, w / 2], [r * 0.6, -w / 2]];
  const geo = pfLathe('tire' + pfQ(r) + pfQ(w), prof, 18);
  for (let i = 0; i < n; i++) k.add(geo, 'rubber', 0x232426, x + (i % 2) * 0.03, y0 + w / 2 + i * w, z, 0, i * 0.4, 0);
}

function sbTireLeaning(k, x, z, rot, r = 0.75, w = 0.4) {
  const y0 = sbGround(x, z);
  const prof = [[r * 0.6, -w / 2], [r * 0.9, -w / 2], [r, -w * 0.3], [r, w * 0.3], [r * 0.9, w / 2], [r * 0.6, w / 2], [r * 0.6, -w / 2]];
  k.add(pfLathe('tire' + pfQ(r) + pfQ(w), prof, 20), 'rubber', 0x232426, x, y0 + r * 0.98, z, Math.PI / 2 - 0.15, rot, 0);
}

function sbOil(k, x, z, s = 1, rot = 0) {
  const y0 = sbGround(x, z);
  k.add(pfCached('oilg', () => { const g = new THREE.CircleGeometry(0.6, 18); g.rotateX(-Math.PI / 2); return g; }), 'oil', 0xffffff, x, y0 + 0.035, z, 0, rot, 0, s, 1, s * 0.7);
}

function sbBench(k, x, z, rot = 0) {
  const y0 = sbGround(x, z);
  k.push(x, y0, z, 0, rot, 0);
  const uvw = k.uvWorld; k.uvWorld = 1.5;
  for (let i = 0; i < 3; i++) k.add(pfRBox(1.6, 0.04, 0.12, 0.015), 'wood', 0x8a5f38, 0, 0.45, -0.14 + i * 0.14);
  for (let i = 0; i < 2; i++) k.add(pfRBox(1.6, 0.1, 0.035, 0.015), 'wood', 0x8a5f38, 0, 0.66 + i * 0.14, -0.26, -0.15, 0, 0);
  k.uvWorld = uvw;
  for (const s of [-0.7, 0.7]) {
    k.add(pfRBox(0.06, 0.44, 0.06, 0.015), 'metal', 0x2b2e31, s, 0.22, 0.14);
    k.add(pfRBox(0.06, 0.82, 0.06, 0.015), 'metal', 0x2b2e31, s, 0.4, -0.22, -0.12, 0, 0);
    k.add(pfRBox(0.06, 0.05, 0.46, 0.015), 'metal', 0x2b2e31, s, 0.42, -0.04);
  }
  k.pop();
}

function sbPlantPot(k, x, z, s = 1, y = null) {
  const y0 = y ?? sbGround(x, z);
  k.add(pfLathe('pot', [[0.0, 0.0], [0.2, 0.0], [0.28, 0.42], [0.3, 0.45], [0.27, 0.46], [0.0, 0.42]], 14), 'rough', 0xa5532e, x, y0, z, 0, 0, 0, s);
  const leaves = [0x3f6b2a, 0x4c7d33, 0x335a24];
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * 6.283;
    k.add(pfCached('leafball', () => new THREE.IcosahedronGeometry(0.2, 1)), 'rough', leaves[i % 3], x + Math.cos(a) * 0.16 * s, y0 + (0.6 + (i % 3) * 0.12) * s, z + Math.sin(a) * 0.16 * s, i, i * 2, 0, s);
  }
  k.add(pfCached('leafball2', () => new THREE.IcosahedronGeometry(0.22, 1)), 'rough', 0x4c7d33, x, y0 + 0.85 * s, z, 0, 0, 0, s);
}

function sbShrub(k, x, z, s = 1) {
  const y0 = sbGround(x, z);
  const cols = [0x3d6a2a, 0x4f7f34, 0x2f5622];
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4;
    k.add(pfCached('shrub', () => new THREE.IcosahedronGeometry(0.45, 1)), 'rough', cols[i % 3], x + Math.cos(a) * 0.35 * s, y0 + (0.35 + (i % 2) * 0.2) * s, z + Math.sin(a) * 0.35 * s, i, i, 0, s * (0.8 + (i % 3) * 0.15));
  }
}

// Guarda-corpo industrial ao longo de um segmento
function sbRailing(k, ax, az, bx, bz, y, color = 0xe9b923, post = 1.5) {
  const L = Math.hypot(bx - ax, bz - az);
  const n = Math.max(1, Math.round(L / post));
  k.rod(ax, y + 1.05, az, bx, y + 1.05, bz, 0.025, 'paint', color, 6);
  k.rod(ax, y + 0.55, az, bx, y + 0.55, bz, 0.02, 'paint', color, 6);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    k.rod(x, y, z, x, y + 1.05, z, 0.022, 'paint', color, 6);
  }
  k.bar(ax, y + 0.06, az, bx, y + 0.06, bz, 0.12, 0.012, 'paint', color, 0);
}

// Escada metálica (degraus entre longarinas) de A (baixo) a B (alto), largura w
function sbStair(k, ax, ay, az, bx, by, bz, w = 0.9, color = 0xe9b923) {
  const dx = bx - ax, dz = bz - az;
  const L = Math.hypot(dx, dz);
  const nx = -dz / L * w / 2, nz = dx / L * w / 2;
  for (const s of [-1, 1]) {
    k.bar(ax + nx * s, ay, az + nz * s, bx + nx * s, by, bz + nz * s, 0.05, 0.2, 'paint', 0x3a3d40);
    k.rod(ax + nx * s, ay + 1.0, az + nz * s, bx + nx * s, by + 1.0, bz + nz * s, 0.022, 'paint', color, 6);
    k.rod(ax + nx * s, ay, az + nz * s, ax + nx * s, ay + 1.0, az + nz * s, 0.022, 'paint', color, 6);
    k.rod(bx + nx * s, by, bz + nz * s, bx + nx * s, by + 1.0, bz + nz * s, 0.022, 'paint', color, 6);
  }
  const n = Math.max(2, Math.round((by - ay) / 0.2));
  const ang = Math.atan2(dx, dz);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    k.add(pfBox(w, 0.035, 0.24), 'metal', 0x6b7277, ax + dx * t, ay + (by - ay) * t, az + dz * t, 0, ang, 0);
  }
}

// Escada marinheiro com gaiola (eixo vertical)
function sbCagedLadder(k, x, z, y0, y1, rotY = 0) {
  k.push(x, 0, z, 0, rotY, 0);
  for (const s of [-0.22, 0.22]) k.rod(s, y0, 0, s, y1, 0, 0.022, 'metal', 0xc9a227, 6);
  const det = k.detail; k.detail = true;
  for (let y = y0 + 0.3; y < y1; y += 0.3) k.add(pfCyl(0.015, 0.015, 0.44, 5), 'metal', 0x9aa0a4, 0, y, 0, 0, 0, Math.PI / 2);
  for (let y = y0 + 2.4; y < y1; y += 0.9) k.add(pfTorus(0.36, 0.018, 4, 12, Math.PI), 'metal', 0xc9a227, 0, y, 0.0, Math.PI / 2, 0, 0);
  k.detail = det;
  k.pop();
}

// Janela com moldura, peitoril, travessas e luz acesa (fachada voltada para +Z local)
function sbWindow(k, x, y, z, w, h, o = {}) {
  const fc = o.frame ?? 0xf1efe8;
  const t = 0.07;
  if (o.lit !== false) k.add(pfBox(w - 0.06, h - 0.06, 0.02), 'emit', o.light ?? pfC(0xffc98a, 1.3), x, y, z - 0.07);
  k.add(pfBox(w - 0.04, h - 0.04, 0.02), o.glass ?? 'glass', 0xffffff, x, y, z - 0.035);
  k.add(pfRBox(w + 0.06, t, 0.1, 0.02), 'paint', fc, x, y + h / 2, z);
  k.add(pfRBox(w + 0.06, t, 0.1, 0.02), 'paint', fc, x, y - h / 2, z);
  k.add(pfRBox(t, h, 0.1, 0.02), 'paint', fc, x - w / 2, y, z);
  k.add(pfRBox(t, h, 0.1, 0.02), 'paint', fc, x + w / 2, y, z);
  k.add(pfBox(0.035, h - 0.05, 0.05), 'paint', fc, x, y, z - 0.01);
  k.add(pfBox(w - 0.05, 0.035, 0.05), 'paint', fc, x, y + h * 0.15, z - 0.01);
  k.add(pfRBox(w + 0.22, 0.06, 0.2, 0.02), 'concrete', 0xd8d4c8, x, y - h / 2 - 0.05, z + 0.05);
  if (o.shutter) {
    for (const s of [-1, 1]) {
      k.add(pfRBox(w / 2, h, 0.04, 0.012), 'paint', o.shutter, x + s * (w * 0.75 + 0.04), y, z + 0.03);
      const det = k.detail; k.detail = true;
      for (let i = 0; i < Math.floor(h / 0.1); i++) k.add(pfBox(w / 2 - 0.06, 0.02, 0.03), 'paint', pfC(o.shutter, 0.8), x + s * (w * 0.75 + 0.04), y - h / 2 + 0.08 + i * 0.1, z + 0.055);
      k.detail = det;
    }
  }
}

// Edifício pequeno em alvenaria: frente em +Z local, origem no chão
function sbBuilding(k, w, d, h, o = {}) {
  const wall = o.wall ?? 0xe8e2d4, roof = o.roof ?? 0x5d6a6e;
  const uvw = k.uvWorld;
  k.add(pfRBox(w + 0.4, 1.4, d + 0.4, 0.04), 'concrete', 0x8f8c84, 0, -0.45, 0);
  k.uvWorld = 0.32;
  k.add(pfRBox(w, h, d, 0.05), 'concrete', wall, 0, 0.25 + h / 2, 0);
  k.add(pfRBox(w + 0.04, 0.4, d + 0.04, 0.02), 'concrete', pfC(wall, 0.72), 0, 0.45, 0);
  k.uvWorld = uvw;
  // cobertura plana com platibanda e rufo
  k.add(pfRBox(w + 0.3, 0.5, d + 0.3, 0.05), 'concrete', pfC(wall, 0.95), 0, h + 0.5, 0);
  k.add(pfRBox(w + 0.36, 0.06, d + 0.36, 0.02), 'metal', 0x9aa3a6, 0, h + 0.77, 0);
  k.add(pfRBox(w - 0.2, 0.08, d - 0.2, 0.02), 'paint', roof, 0, h + 0.62, 0);
  if (o.ac !== false) {
    k.add(pfRBox(0.9, 0.62, 0.42, 0.04), 'metal', 0xc9cdcf, w / 2 - 1.0, h + 1.0, -d / 2 + 0.8);
    k.add(pfCyl(0.22, 0.22, 0.02, 14), 'metal', 0x2b2e31, w / 2 - 1.0, h + 1.0, -d / 2 + 0.8 + 0.22, Math.PI / 2, 0, 0);
  }
  const wins = o.windows ?? [];
  for (const [face, wx, wy, ww, wh] of wins) {
    const ang = face === 'f' ? 0 : face === 'b' ? Math.PI : face === 'r' ? Math.PI / 2 : -Math.PI / 2;
    const off = face === 'f' || face === 'b' ? d / 2 : w / 2;
    k.push(0, 0, 0, 0, ang, 0);
    sbWindow(k, wx, wy, off + 0.05, ww, wh, { shutter: o.shutter, glass: o.glass, frame: o.frame, lit: o.lit });
    k.pop();
  }
  if (o.door) {
    const [dx, dw] = o.door;
    k.add(pfRBox(dw + 0.16, 2.3, 0.12, 0.02), 'paint', o.frame ?? 0xf1efe8, dx, 1.4, d / 2 + 0.03);
    k.add(pfRBox(dw, 2.15, 0.06, 0.015), 'wood', o.doorColor ?? 0x6b4428, dx, 1.35, d / 2 + 0.04);
    k.add(pfCyl(0.03, 0.03, 0.08, 8), 'metal', PF_COL.chrome, dx + dw * 0.38, 1.3, d / 2 + 0.1, Math.PI / 2, 0, 0);
    k.add(pfRBox(dw + 0.8, 0.12, 1.0, 0.03), 'concrete', 0x9a978f, dx, 0.25, d / 2 + 0.55);
    if (o.canopy !== false) k.add(pfRBox(dw + 1.0, 0.1, 1.1, 0.03), 'metal', 0x5b6468, dx, 2.75, d / 2 + 0.55);
  }
}

// Telhado de duas águas (cumeeira ao longo de X)
function sbGableRoof(k, cx, cy, cz, w, d, rise, key, color, th = 0.12, uvw = 0) {
  const half = d / 2;
  const ang = Math.atan2(rise, half);
  const slope = Math.hypot(rise, half);
  const u = k.uvWorld; k.uvWorld = uvw;
  for (const s of [-1, 1]) {
    k.add(pfBox(w, th, slope), key, color, cx, cy + rise / 2, cz + s * half / 2, s * ang, 0, 0);
  }
  k.uvWorld = u;
  return ang;
}

// Treliça (tesoura) no plano YZ local, vão de -half a +half
function sbTruss(k, x, y0, z0, half, rise, color = 0x3a4246, panels = 6) {
  const top = t => [z0 - half + 2 * half * t, y0 + rise * (1 - Math.abs(2 * t - 1))];
  const sz = 0.12;
  k.bar(x, y0, z0 - half, x, y0 + rise, z0, sz, sz, 'metal', color);
  k.bar(x, y0 + rise, z0, x, y0, z0 + half, sz, sz, 'metal', color);
  k.bar(x, y0, z0 - half, x, y0, z0 + half, sz, sz, 'metal', color);
  for (let i = 1; i < panels; i++) {
    const t = i / panels;
    const [zz, yy] = top(t);
    k.bar(x, y0, zz, x, yy, zz, 0.07, 0.07, 'metal', color);
    const [z2, y2] = top(t + (t < 0.5 ? 1 : -1) / panels);
    if (i !== panels / 2) k.bar(x, y0, zz, x, y2, z2, 0.06, 0.06, 'metal', color);
  }
}

// Pilar em perfil H
function sbHColumn(k, x, y0, z, h, color = 0x3a4246, s = 0.3) {
  k.add(pfBox(s, h, 0.03), 'metal', color, x, y0 + h / 2, z - s / 2 + 0.015);
  k.add(pfBox(s, h, 0.03), 'metal', color, x, y0 + h / 2, z + s / 2 - 0.015);
  k.add(pfBox(0.025, h, s), 'metal', color, x, y0 + h / 2, z);
  k.add(pfRBox(s + 0.2, 0.3, s + 0.2, 0.04), 'concrete', 0x9a978f, x, y0 + 0.1, z);
}

// Tanque vertical com teto cônico, anéis e guarda-corpo no topo
function sbTank(k, x, z, r, h, color = 0xe6e9e7, y0 = null, o = {}) {
  const gy = y0 ?? sbGround(x, z);
  const key = `tank${pfQ(r)},${pfQ(h)}`;
  k.add(pfLathe(key, [[0, 0], [r, 0], [r, h], [r * 0.98, h + 0.05], [r * 0.18, h + r * 0.3], [0, h + r * 0.31]], 22), 'paint', color, x, gy, z);
  k.add(pfCyl(r + 0.25, r + 0.3, 0.35, 22), 'concrete', 0xa5a29a, x, gy + 0.05, z);
  const det = k.detail; k.detail = true;
  for (let y = 1.2; y < h; y += 1.6) k.add(pfTorus(r + 0.015, 0.03, 3, 22), 'paint', pfC(color, 0.82), x, gy + y, z, Math.PI / 2, 0, 0);
  k.detail = det;
  k.add(pfTorus(r * 0.96, 0.025, 4, 24), 'paint', 0xe9b923, x, gy + h + 1.05, z, Math.PI / 2, 0, 0);
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * 6.283;
    k.rod(x + Math.cos(a) * r * 0.96, gy + h + 0.02, z + Math.sin(a) * r * 0.96, x + Math.cos(a) * r * 0.96, gy + h + 1.05, z + Math.sin(a) * r * 0.96, 0.02, 'paint', 0xe9b923, 5);
  }
  const la = o.ladderAngle ?? -Math.PI / 2;
  sbCagedLadder(k, x + Math.cos(la) * (r + 0.28), z + Math.sin(la) * (r + 0.28), gy + 0.3, gy + h + 1.0, -la + Math.PI / 2);
  if (o.nozzle !== false) {
    k.add(pfCyl(0.22, 0.22, 0.5, 10), 'metal', 0x8d959b, x + r * 0.5, gy + h + r * 0.15 + 0.2, z);
    k.add(pfCyl(0.3, 0.3, 0.6, 12), 'metal', 0x8d959b, x + Math.cos(la + 0.6) * (r + 0.25), gy + 0.7, z + Math.sin(la + 0.6) * (r + 0.25), 0, 0, Math.PI / 2);
  }
}

// Chaminé industrial com anéis, plataforma, escada e faixa de sinalização
function sbChimney(k, x, z, h, r0 = 1.35, r1 = 1.0) {
  const gy = sbGround(x, z);
  const dust = k.dust; k.dust = 0.5;
  k.add(pfCyl(r0 + 0.6, r0 + 0.8, 1.2, 12), 'concrete', 0x9a978f, x, gy + 0.3, z);
  k.add(pfCyl(r1, r0, h, 22), 'metal', 0x8b9297, x, gy + h / 2 + 0.9, z);
  k.dust = 0;
  k.add(pfCyl(r1 + 0.03, r1 + 0.05, 1.4, 22), 'paint', 0xc8321f, x, gy + h - 0.4, z);
  k.add(pfCyl(r1 + 0.04, r1 + 0.06, 1.2, 22), 'paint', 0xf0f0ea, x, gy + h - 1.7, z);
  k.add(pfCyl(r1 + 0.05, r1 + 0.07, 1.2, 22), 'paint', 0xc8321f, x, gy + h - 2.9, z);
  k.add(pfTorus(r1 + 0.02, 0.08, 4, 22), 'metal', 0x2b2e31, x, gy + h + 0.92, z, Math.PI / 2, 0, 0);
  for (const f of [0.22, 0.45]) {
    const rr = r0 + (r1 - r0) * f;
    k.add(pfTorus(rr + 0.03, 0.07, 4, 22), 'metal', 0x2b2e31, x, gy + 0.9 + h * f, z, Math.PI / 2, 0, 0);
  }
  // plataforma de inspeção
  const pf = 0.68, rr = r0 + (r1 - r0) * pf;
  k.add(pfCyl(rr + 0.9, rr + 0.9, 0.08, 22), 'metal', 0x5b6468, x, gy + 0.9 + h * pf, z);
  k.add(pfTorus(rr + 0.88, 0.03, 4, 22), 'paint', 0xe9b923, x, gy + 1.95 + h * pf, z, Math.PI / 2, 0, 0);
  const det = k.detail; k.detail = true;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * 6.283;
    k.rod(x + Math.cos(a) * (rr + 0.88), gy + 0.95 + h * pf, z + Math.sin(a) * (rr + 0.88), x + Math.cos(a) * (rr + 0.88), gy + 1.95 + h * pf, z + Math.sin(a) * (rr + 0.88), 0.02, 'paint', 0xe9b923, 4);
  }
  k.detail = det;
  sbCagedLadder(k, x, z - r0 - 0.25, gy + 1.0, gy + h + 0.4, 0);
  k.dust = dust;
}

// Esteira transportadora inclinada com treliça, cobertura e carga
function sbConveyor(k, ax, ay, az, bx, by, bz, o = {}) {
  const w = o.w ?? 1.4;
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const L = Math.hypot(dx, dy, dz);
  const yaw = Math.atan2(dx, dz);
  const pitch = -Math.asin(dy / L);
  k.push(ax, ay, az, 0, yaw, 0);
  k.push(0, 0, 0, pitch, 0, 0);
  // estrutura lateral treliçada
  const n = Math.max(2, Math.round(L / 1.6));
  for (const s of [-1, 1]) {
    k.add(pfBox(0.08, 0.1, L), 'metal', 0x3a4246, s * w / 2, 0.55, L / 2);
    k.add(pfBox(0.08, 0.1, L), 'metal', 0x3a4246, s * w / 2, -0.25, L / 2);
    for (let i = 0; i <= n; i++) {
      const z = i * L / n;
      k.add(pfBox(0.06, 0.8, 0.06), 'metal', 0x3a4246, s * w / 2, 0.15, z);
      if (i < n) k.bar(s * w / 2, -0.25, z, s * w / 2, 0.55, z + L / n, 0.05, 0.05, 'metal', 0x3a4246);
    }
  }
  k.add(pfBox(w - 0.2, 0.06, L), 'rubber', 0x1c1d1f, 0, 0.22, L / 2);
  for (let i = 0; i <= n * 2; i++) k.add(pfCyl(0.07, 0.07, w - 0.15, 8), 'metal', 0x6b7277, 0, 0.14, i * L / (n * 2), 0, 0, Math.PI / 2);
  if (o.load) {
    k.push(0, 0.25, L / 2);
    k.add(pfHeapGeo(w - 0.35, L - 0.4, 0.22, 11, o.loadCols), 'rough', 0xffffff);
    k.pop();
  }
  if (o.cover !== false) {
    const u = k.uvWorld; k.uvWorld = 0.5;
    k.add(pfCached('convCover' + pfQ(w), () => {
      const g = new THREE.CylinderGeometry(w / 2 + 0.1, w / 2 + 0.1, 1, 12, 1, true, -Math.PI / 2, Math.PI);
      g.rotateX(-Math.PI / 2);
      return g;
    }), 'sheet', 0xb9c0c2, 0, 0.6, L / 2, 0, 0, 0, 1, 1, L);
    k.uvWorld = u;
  }
  k.pop(); k.pop();
  // pés de apoio verticais até o chão
  if (o.legs !== false) {
    const nl = Math.max(1, Math.round(L / 5));
    for (let i = 1; i <= nl; i++) {
      const t = i / (nl + 0.5);
      const x = ax + dx * t, y = ay + dy * t - 0.3, z = az + dz * t;
      const g = sbGround(x, z);
      if (y - g < 0.8) continue;
      const nx = Math.cos(yaw) * w / 2, nz = -Math.sin(yaw) * w / 2;
      for (const s of [-1, 1]) k.bar(x + nx * s, g, z + nz * s, x + nx * s, y, z + nz * s, 0.16, 0.16, 'metal', 0x3a4246);
      k.add(pfBox(0.16, 0.16, w), 'metal', 0x3a4246, x, y, z, 0, yaw + Math.PI / 2, 0);
    }
  }
}

// Contêiner solto no pátio (com nervuras)
function sbContainer(k, x, y, z, rot, color, L = 6.06) {
  k.push(x, y, z, 0, rot, 0);
  kitContainer(k, L, color, { detailRibs: true });
  k.pop();
}

// Poste de madeira com cruzeta, isoladores e transformador opcional
function sbPowerPole(k, x, z, trafo = false) {
  const y0 = sbGround(x, z);
  k.push(x, y0, z);
  const u = k.uvWorld; k.uvWorld = 1.0;
  k.add(pfCyl(0.1, 0.15, 8.2, 8), 'wood', 0x6a5640, 0, 4.0, 0);
  k.uvWorld = u;
  k.add(pfRBox(0.1, 0.1, 2.0, 0.02), 'metal', 0x4a5154, 0, 7.6, 0);
  k.rod(0, 7.0, 0, 0, 7.55, 0.7, 0.025, 'metal', 0x4a5154, 5);
  k.rod(0, 7.0, 0, 0, 7.55, -0.7, 0.025, 'metal', 0x4a5154, 5);
  for (const zz of [-0.85, 0, 0.85]) {
    k.add(pfCyl(0.05, 0.07, 0.18, 8), 'paint', 0xb5c0c2, 0, 7.75, zz);
    k.add(pfCyl(0.08, 0.08, 0.025, 8), 'paint', 0xb5c0c2, 0, 7.76, zz);
  }
  if (trafo) {
    k.add(pfRBox(0.9, 0.12, 0.5, 0.02), 'metal', 0x4a5154, 0.3, 5.3, 0);
    k.add(pfCyl(0.34, 0.34, 1.0, 14), 'paint', 0x8d959b, 0.42, 5.9, 0);
    for (let i = 0; i < 6; i++) k.add(pfBox(0.06, 0.8, 0.5), 'paint', 0x7d858a, 0.42 + Math.cos(i) * 0.36, 5.9, Math.sin(i) * 0.36, 0, -i, 0);
    for (const zz of [-0.2, 0, 0.2]) k.add(pfCyl(0.03, 0.04, 0.25, 6), 'paint', 0x6a4a3a, 0.42, 6.5, zz);
  }
  k.pop();
}

function sbWire(k, ax, ay, az, bx, by, bz, sag = 0.8) {
  const mx = (ax + bx) / 2, my = (ay + by) / 2 - sag, mz = (az + bz) / 2;
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const y = (1 - t) * (1 - t) * ay + 2 * (1 - t) * t * (2 * my - (ay + by) / 2) + t * t * by;
    pts.push([ax + (bx - ax) * t, y, az + (bz - az) * t]);
  }
  k.add(pfTube(pts, 0.018, 12, 3), 'rough', 0x1a1c1e);
}

// Planta de cana caída / toletes no chão (evidência)
function sbCaneStalks(k, x, z, n = 7) {
  const y0 = sbGround(x, z);
  for (let i = 0; i < n; i++) {
    const a = 0.9 + (i - n / 2) * 0.12, L = 1.3 + (i % 3) * 0.25;
    const sx = x + (i - n / 2) * 0.08, sz = z + Math.sin(i * 2.1) * 0.25;
    for (let j = 0; j < 4; j++) {
      const t = (j + 0.5) / 4;
      k.add(pfCyl(0.026, 0.03, L / 4 - 0.015, 7), 'rough', j % 2 ? 0x9a8a4a : 0xa89a52, sx + Math.cos(a) * L * (t - 0.5), y0 + 0.04, sz + Math.sin(a) * L * (t - 0.5), 0, -a, Math.PI / 2);
      k.add(pfCyl(0.034, 0.034, 0.02, 7), 'rough', 0x6f5a3a, sx + Math.cos(a) * L * (j / 4 - 0.5), y0 + 0.04, sz + Math.sin(a) * L * (j / 4 - 0.5), 0, -a, Math.PI / 2);
    }
    k.add(pfBox(0.9, 0.006, 0.05), 'rough', 0x7a8a3a, sx + Math.cos(a) * L * 0.6, y0 + 0.03, sz + Math.sin(a) * L * 0.6, 0, -a + 0.3, 0.05);
  }
}

// Leiras de palha no talhão colhido
function sbStrawRows(k, cx, cz, rot, n, len, gap) {
  const y0 = sbGround(cx, cz);
  k.push(cx, y0, cz, 0, rot, 0);
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * gap;
    const jx = Math.sin(i * 7.3) * 0.25, jl = len * (0.8 + 0.2 * Math.sin(i * 3.1));
    k.add(pfHeapGeo(1.6, jl, 0.09, 20 + i, [0x8d7444, 0x7a6438, 0x9c8452, 0x6e5a34], 0x5a2414), 'rough', 0xffffff, x + jx, -0.02, Math.sin(i * 1.7) * 1.2);
  }
  k.pop();
}

function mergeStaticByMaterial(root, skipSet) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  root.traverse(obj => {
    if (!obj.isMesh || obj.isInstancedMesh) return;
    let cur = obj;
    while (cur && cur !== root) {
      if (skipSet.has(cur)) return;
      cur = cur.parent;
    }
    const g = obj.geometry;
    if (!g || !g.attributes.position || Array.isArray(obj.material)) return;
    const key = `${obj.material.uuid}|${obj.castShadow ? 1 : 0}|${obj.receiveShadow ? 1 : 0}`;
    if (!buckets.has(key)) buckets.set(key, { mat: obj.material, cast: obj.castShadow, recv: obj.receiveShadow, list: [] });
    buckets.get(key).list.push(obj);
  });
  for (const b of buckets.values()) {
    if (b.list.length < 2) continue;
    const posArr = [], normArr = [], uvArr = [], idxArr = [];
    let vOff = 0;
    const normMat3 = new THREE.Matrix3();
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    for (const m of b.list) {
      const g = m.geometry;
      const p = g.attributes.position, nm = g.attributes.normal, uv = g.attributes.uv;
      normMat3.getNormalMatrix(m.matrixWorld);
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
        posArr.push(v.x, v.y, v.z);
        if (nm) { n.fromBufferAttribute(nm, i).applyMatrix3(normMat3).normalize(); normArr.push(n.x, n.y, n.z); } else normArr.push(0, 1, 0);
        if (uv) uvArr.push(uv.getX(i), uv.getY(i)); else uvArr.push(0, 0);
      }
      if (g.index) { for (let i = 0; i < g.index.count; i++) idxArr.push(g.index.getX(i) + vOff); }
      else { for (let i = 0; i < p.count; i++) idxArr.push(i + vOff); }
      vOff += p.count;
      m.parent?.remove(m);
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normArr, 3));
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    merged.setIndex(idxArr);
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.recv;
    root.add(mesh);
  }
}

// Mantidos por compatibilidade (agora montam via kit)
function buildPallet(matLib, x, z, rot = 0) {
  const g = new THREE.Group(); const k = new PfKit(matLib); sbPallet(k, x, z, rot); k.build(g); return g;
}
function buildDrum(matLib, x, z, color = 0x2b5f70) {
  const g = new THREE.Group(); const k = new PfKit(matLib); sbDrum(k, x, z, color); k.build(g); return g;
}
function buildCone(matLib, x, z) {
  const g = new THREE.Group(); const k = new PfKit(matLib); sbCone(k, x, z); k.build(g); return g;
}
function buildArchitecturalFacade(matLib, w, h, d, wallColor, roofColor, glassCols = 3) {
  const g = new THREE.Group(); const k = new PfKit(matLib);
  const wins = [];
  for (let i = 0; i < glassCols; i++) wins.push(['f', -w * 0.32 + (i / Math.max(1, glassCols - 1)) * w * 0.64, h * 0.56 + 0.35, 1.5, h * 0.4]);
  sbBuilding(k, w, d, h, { wall: wallColor, roof: roofColor, windows: wins, glass: 'iglass', lit: false, door: [0, 1.4] });
  k.build(g); return g;
}

// ---------------------------------------------------------------------------
function buildAllStops(scene, matLib, particles) {
  const colliders = [];
  const animated = { wheels: [], drone: null, people: [], beacons: [], crane: null };
  const stopGroup = new THREE.Group();
  stopGroup.name = 'paradas';
  scene.add(stopGroup);
  const kits = PARADAS.map(() => new PfKit(matLib));
  const groups = PARADAS.map((p, i) => { const g = new THREE.Group(); g.name = 'parada-' + i; stopGroup.add(g); return g; });
  const kitNear = (x) => { let bi = 0, bd = 1e9; PARADAS.forEach((p, i) => { const d = Math.abs(p.x - x); if (d < bd) { bd = d; bi = i; } }); return bi; };
  const gh = sbGround;
  const place = (k, x, z, rot, fn) => { k.push(x, gh(x, z), z, 0, rot, 0); fn(); k.pop(); };
  // transforma ponto local (lx,lz) de um objeto em (x,z,rot) para o mundo
  const toWorld = (x, z, rot, lx, lz) => [x + lx * Math.cos(rot) + lz * Math.sin(rot), z - lx * Math.sin(rot) + lz * Math.cos(rot)];

  // ===================== 0. SEDE (x=-96, z=-22) =====================
  {
    const s = PARADAS[0], k = kits[0], g = groups[0];
    const X = s.x, Z = s.bz, y0 = gh(X, Z);
    const W = 12.6, D = 8.2, H = 3.2, F = 0.45;
    k.push(X, y0, Z);
    // alicerce, piso da varanda e paredes rebocadas
    k.add(pfRBox(W + 0.5, 1.6, D + 3.6, 0.04), 'concrete', 0x8e8a82, 0, F - 0.8, 1.55);
    k.add(pfRBox(W + 0.3, 0.06, 3.0, 0.02), 'concrete', 0xa04a32, 0, F + 0.01, D / 2 + 1.5);
    k.uvWorld = 0.3;
    k.add(pfRBox(W, H, D, 0.05), 'concrete', 0xefe6d2, 0, F + H / 2, 0);
    k.uvWorld = 0;
    k.add(pfRBox(W + 0.04, 0.45, D + 0.04, 0.02), 'concrete', 0xb7a88c, 0, F + 0.22, 0);
    // empena e telhado de barro (duas águas, beiral largo)
    const rise = 2.0, ov = 0.75;
    for (const s2 of [-1, 1]) k.add(pfExtrude('gable', [[-D / 2, 0], [D / 2, 0], [0, rise]], 0.2), 'concrete', 0xefe6d2, s2 * (W / 2 - 0.1), F + H, 0, 0, Math.PI / 2, 0);
    sbGableRoof(k, 0, F + H - ov * rise / (D / 2) + 0.08, 0, W + 1.4, D + 2 * ov, rise + ov * rise / (D / 2), 'tile', 0xffffff, 0.1, 1.15);
    const rlen = W + 1.4;
    k.add(pfCyl(0.13, 0.13, rlen, 10, false), 'rough', 0x9a4a2c, 0, F + H + rise + 0.06, 0, 0, 0, Math.PI / 2);
    // beirais com testeira de madeira e calhas
    for (const s2 of [-1, 1]) {
      const ez = s2 * (D / 2 + ov), ey = F + H - ov * rise / (D / 2);
      k.add(pfRBox(rlen, 0.2, 0.05, 0.01), 'wood', 0x6d4a2c, 0, ey + 0.02, ez);
      k.add(pfCyl(0.08, 0.08, rlen, 8, false), 'metal', 0xa9b1b5, 0, ey - 0.06, ez + s2 * 0.08, 0, 0, Math.PI / 2);
      for (const xx of [-W / 2 - 0.5, W / 2 + 0.5]) k.rod(xx, ey - 0.06, ez + s2 * 0.08, xx, F, ez + s2 * 0.08 - s2 * (ov - 0.2), 0.04, 'metal', 0xa9b1b5, 6);
    }
    // varanda: esteios de madeira em base de pedra, cobertura em telha, mão-francesa
    const vz = D / 2 + 2.75;
    const posts = [-5.9, -3.2, -1.1, 1.1, 3.2, 5.9];
    for (const px of posts) {
      k.add(pfRBox(0.32, 0.4, 0.32, 0.04), 'concrete', 0x8e8a82, px, F + 0.2, vz);
      k.add(pfRBox(0.17, 2.55, 0.17, 0.03), 'wood', 0x7a5232, px, F + 1.67, vz);
      k.bar(px, F + 2.6, vz, px, F + 2.95, vz - 0.4, 0.09, 0.09, 'wood', 0x7a5232);
    }
    k.add(pfRBox(W + 0.6, 0.2, 0.2, 0.03), 'wood', 0x6d4a2c, 0, F + 2.98, vz);
    const vy0 = F + H - 0.1, vy1 = F + 2.95;
    const vang = Math.atan2(vy0 - vy1, vz + 0.4 - D / 2);
    const vlen = Math.hypot(vy0 - vy1, vz + 0.4 - D / 2);
    k.uvWorld = 1.15;
    k.add(pfBox(W + 1.0, 0.08, vlen), 'tile', 0xffffff, 0, (vy0 + vy1) / 2 + 0.12, (D / 2 + vz + 0.4) / 2, vang, 0, 0);
    k.uvWorld = 0;
    for (let i = 0; i < 7; i++) k.bar(-W / 2 + i * W / 6, vy0 - 0.05, D / 2, -W / 2 + i * W / 6, vy1 + 0.02, vz + 0.4, 0.07, 0.12, 'wood', 0x6d4a2c);
    // guarda-corpo de madeira entre esteios (deixa a entrada livre)
    for (const [a, b] of [[-5.9, -3.2], [3.2, 5.9]]) {
      k.add(pfRBox(b - a, 0.08, 0.1, 0.02), 'wood', 0x7a5232, (a + b) / 2, F + 0.95, vz);
      k.add(pfRBox(b - a, 0.06, 0.08, 0.02), 'wood', 0x7a5232, (a + b) / 2, F + 0.5, vz);
      for (let x = a + 0.3; x < b - 0.1; x += 0.3) k.add(pfBox(0.05, 0.45, 0.05), 'wood', 0x7a5232, x, F + 0.72, vz);
    }
    // degraus da entrada
    for (let i = 0; i < 2; i++) k.add(pfRBox(2.0, 0.2, 0.42, 0.02), 'concrete', 0x9a958c, 0, F - 0.12 - i * 0.2, vz + 0.4 + i * 0.4);
    // janelas com luz acesa e venezianas, porta
    for (const wx of [-4.5, -2.2, 2.2, 4.5]) sbWindow(k, wx, F + 1.75, D / 2 + 0.05, 1.15, 1.3, { shutter: 0x2f5d3a });
    for (const s2 of [-1, 1]) {
      k.push(s2 * (W / 2 + 0.05), 0, 0, 0, s2 * Math.PI / 2, 0);
      sbWindow(k, -1.8, F + 1.75, 0, 1.0, 1.2, { shutter: 0x2f5d3a });
      sbWindow(k, 1.8, F + 1.75, 0, 1.0, 1.2, { shutter: 0x2f5d3a });
      k.pop();
    }
    k.add(pfRBox(1.22, 2.42, 0.14, 0.02), 'paint', 0xf1efe8, 0, F + 1.21, D / 2 + 0.04);
    k.add(pfRBox(1.0, 2.25, 0.06, 0.015), 'wood', 0x5d3a22, 0, F + 1.13, D / 2 + 0.05);
    for (let i = 0; i < 3; i++) k.add(pfBox(0.82, 0.5, 0.02), 'wood', 0x4f3019, 0, F + 0.45 + i * 0.68, D / 2 + 0.085);
    k.add(pfCyl(0.03, 0.03, 0.1, 8), 'metal', 0xc9b36a, 0.36, F + 1.1, D / 2 + 0.12, Math.PI / 2, 0, 0);
    k.add(pfRBox(0.3, 0.18, 0.12, 0.03), 'paint', 0xf4f1e6, 0, F + 2.62, D / 2 + 0.08);
    k.add(pfBox(0.2, 0.1, 0.02), 'emit', pfC(0xffd9a0, 1.6), 0, F + 2.6, D / 2 + 0.145);
    // banco, vasos e antena
    k.pop();
    sbBench(k, X - 4.3, Z + D / 2 + 1.1, 0);
    sbPlantPot(k, X - 1.6, Z + D / 2 + 2.3, 1, y0 + F);
    sbPlantPot(k, X + 1.6, Z + D / 2 + 2.3, 1, y0 + F);
    sbPlantPot(k, X + 5.2, Z + D / 2 + 1.0, 1.2, y0 + F);
    k.push(X, y0, Z);
    k.rod(3.5, F + H + 0.8, -0.8, 3.5, F + H + 4.4, -0.8, 0.035, 'metal', 0x9aa0a4, 6);
    const det0 = k.detail; k.detail = true;
    for (let i = 0; i < 5; i++) k.add(pfBox(1.3 - i * 0.18, 0.025, 0.025), 'metal', 0x9aa0a4, 3.5, F + H + 3.2 + i * 0.25, -0.8, 0, 0.6, 0);
    k.add(pfBox(0.025, 0.025, 1.5), 'metal', 0x9aa0a4, 3.5, F + H + 3.9, -0.8, 0, 0.6, 0);
    k.detail = det0;
    k.add(pfSphere(0.42, 14, 6, 0, Math.PI * 0.42), 'paint', 0xe8eae6, -W / 2 - 0.25, F + 2.9, 2.2, 0, 0, Math.PI / 2 + 0.5);
    k.rod(-W / 2 - 0.05, F + 2.9, 2.2, -W / 2 - 0.45, F + 2.75, 2.2, 0.025, 'metal', 0x6b7277, 6);
    k.pop();
    // caixa d'água em torre metálica com escada
    {
      const tx = X + 9.6, tz = Z + 1.5, ty = gh(tx, tz);
      k.push(tx, ty, tz);
      for (const [lx, lz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) {
        k.add(pfRBox(0.5, 0.4, 0.5, 0.04), 'concrete', 0x9a978f, lx, 0.1, lz);
        k.bar(lx, 0.2, lz, lx * 0.8, 4.2, lz * 0.8, 0.1, 0.1, 'metal', 0x4a5154);
      }
      for (const y of [1.6, 3.0]) for (const [a, b] of [[[-0.9, -0.9], [0.9, -0.9]], [[-0.9, 0.9], [0.9, 0.9]], [[-0.9, -0.9], [-0.9, 0.9]], [[0.9, -0.9], [0.9, 0.9]]]) {
        const f = 1 - (y / 4.2) * 0.2;
        k.bar(a[0] * f, y, a[1] * f, b[0] * f, y, b[1] * f, 0.06, 0.06, 'metal', 0x4a5154);
      }
      k.add(pfRBox(2.2, 0.12, 2.2, 0.03), 'metal', 0x4a5154, 0, 4.25, 0);
      k.add(pfLathe('wtank', [[0, 0], [1.05, 0], [1.1, 0.1], [1.1, 2.0], [1.05, 2.1], [0.25, 2.5], [0, 2.52]], 22), 'paint', 0x3f7390, 0, 4.3, 0);
      const det = k.detail; k.detail = true;
      for (const y of [4.9, 5.6]) k.add(pfTorus(1.11, 0.025, 4, 22), 'paint', 0x335f78, 0, y, 0, Math.PI / 2, 0, 0);
      k.detail = det;
      for (const zz of [-0.22, 0.22]) k.rod(1.18, 0.0, zz, 1.18, 6.3, zz, 0.02, 'metal', 0x6b7277, 5);
      for (let y = 0.3; y < 6.3; y += 0.32) k.add(pfCyl(0.012, 0.012, 0.44, 4), 'metal', 0x6b7277, 1.18, y, 0, Math.PI / 2, 0, 0);
      k.add(pfTube([[0, 4.3, 0.5], [0, 2.5, 0.6], [-0.4, 0.3, 0.9], [-2.0, 0.15, 1.3]], 0.05, 10, 6), 'metal', 0x9aa0a4);
      k.pop();
    }
    // picape da sede, cone, palete, tambores
    place(k, X - 9.2, Z + 8.6, 0.55, () => kitPickup(k, 0xb33b24));
    sbCone(k, X - 4.6, Z + 9.6);
    sbCone(k, X + 4.4, Z + 9.8);
    sbPallet(k, X + 8.2, Z + 6.2, 0.2);
    sbDrum(k, X + 7.6, Z + 4.4, 0x2b5f70);
    sbDrum(k, X + 8.3, Z + 4.1, 0xb84028);
    sbShrub(k, X - 7.6, Z + 4.2, 1.1);
    sbShrub(k, X + 7.4, Z - 3.5, 1.2);
    sbYardLamp(k, g, X - 7.8, Z + 6.5, Math.PI * 0.85, true, false);
    sbSafetySign(k, g, 'epi', X + 6.8, 1.4, Z + 8.8, 0, true);
    g.add(makeSign('SEDE', 'Planejamento', s.x + 9.5, 0, s.sz, Math.PI));
    colliders.push({ x: X, z: Z, r: 7.4 }, { x: X + 9.6, z: Z + 1.5, r: 1.6 }, { x: X - 9.2, z: Z + 8.6, r: 2.4 });
  }

  // ===================== 1. TALHÃO 12 (x=-72, z=+22) =====================
  {
    const s = PARADAS[1], k = kits[1], g = groups[1];
    const tx = s.x + 7.2, tz = s.bz, ty = gh(tx, tz);
    // Estação meteorológica: torre treliçada triangular estaiada
    k.push(tx, ty, tz);
    k.add(pfRBox(1.6, 0.3, 1.6, 0.04), 'concrete', 0x9a978f, 0, 0.1, 0);
    const legs = [0, 1, 2].map(i => { const a = i / 3 * 6.283; return [Math.cos(a) * 0.32, Math.sin(a) * 0.32]; });
    for (const [lx, lz] of legs) k.rod(lx, 0.2, lz, lx, 8.2, lz, 0.025, 'metal', 0x9aa3a8, 6);
    const det1 = k.detail; k.detail = true;
    for (let y = 0.4; y < 8; y += 0.6) for (let i = 0; i < 3; i++) {
      const [ax, az] = legs[i], [bx, bz] = legs[(i + 1) % 3];
      k.rod(ax, y, az, bx, y + 0.6, bz, 0.012, 'metal', 0x9aa3a8, 4);
      k.rod(ax, y, az, bx, y, bz, 0.012, 'metal', 0x9aa3a8, 4);
    }
    k.detail = det1;
    k.rod(0, 8.2, 0, 0, 9.0, 0, 0.03, 'metal', 0x9aa3a8, 6);
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * 6.283;
      k.rod(0, 8.95, 0, Math.cos(a) * 0.32, 8.95, Math.sin(a) * 0.32, 0.01, 'metal', 0x9aa3a8, 4);
      k.add(pfSphere(0.07, 8, 5, 0, Math.PI / 2), 'paint', 0xf0f2ee, Math.cos(a) * 0.32, 8.92, Math.sin(a) * 0.32, Math.PI / 2, -a, 0);
    }
    k.rod(-0.6, 8.4, 0, 0.6, 8.4, 0, 0.02, 'metal', 0x9aa3a8, 5);
    k.add(pfBox(0.02, 0.25, 0.35), 'paint', 0xf0f2ee, 0.62, 8.4, 0);
    k.add(pfCone(0.05, 0.16, 6), 'paint', 0xf0f2ee, -0.68, 8.4, 0, 0, 0, Math.PI / 2);
    // painel solar, gabinete do datalogger, pluviômetro
    k.add(pfRBox(1.3, 0.05, 0.85, 0.01), 'metal', 0xb0b6ba, 0, 5.2, 0.7, 0.75, 0, 0);
    k.add(pfBox(1.22, 0.02, 0.78), 'glass', 0xffffff, 0, 5.215, 0.69, 0.75, 0, 0);
    k.add(pfBox(1.2, 0.012, 0.76), 'paint', 0x15284a, 0, 5.2, 0.71, 0.75, 0, 0);
    k.add(pfRBox(0.5, 0.65, 0.28, 0.03), 'paint', 0xe9ebe7, 0, 1.6, 0.5);
    k.add(pfRBox(0.08, 0.08, 0.02, 0.01), 'emit', pfC(0x40ff80, 1.2), 0.15, 1.82, 0.645);
    k.rod(1.4, 0, -0.8, 1.4, 1.3, -0.8, 0.035, 'metal', 0x9aa3a8, 6);
    k.add(pfCyl(0.1, 0.1, 0.35, 12), 'paint', 0xe9ebe7, 1.4, 1.45, -0.8);
    // estais
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * 6.283 + 0.5;
      const ax = Math.cos(a) * 4.5, az = Math.sin(a) * 4.5;
      k.rod(0, 6.5, 0, ax, gh(tx + ax, tz + az) - ty + 0.1, az, 0.008, 'metal', 0x6b7277, 3);
      k.add(pfRBox(0.3, 0.2, 0.3, 0.04), 'concrete', 0x9a978f, ax, gh(tx + ax, tz + az) - ty + 0.05, az);
    }
    // cerca de tela em volta da base
    const fh = 1.4;
    for (const [a, b] of [[[-1.8, -1.8], [1.8, -1.8]], [[1.8, -1.8], [1.8, 1.8]], [[1.8, 1.8], [-1.8, 1.8]], [[-1.8, 1.8], [-1.8, -0.3]]]) {
      k.rod(a[0], 0, a[1], a[0], fh, a[1], 0.03, 'metal', 0x8d959b, 6);
      k.rod(a[0], fh, a[1], b[0], fh, b[1], 0.02, 'metal', 0x8d959b, 5);
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const u = k.uvWorld; k.uvWorld = 2.1;
      k.add(pfBox(L, fh - 0.1, 0.01), 'grid', 0x9aa3a6, (a[0] + b[0]) / 2, fh / 2, (a[1] + b[1]) / 2, 0, -Math.atan2(b[1] - a[1], b[0] - a[0]), 0);
      k.uvWorld = u;
    }
    k.pop();
    // Tenda de campo com mesa, maleta do drone e base de pouso
    {
      const cx = s.x - 4.2, cz = s.bz - 3.8;
      place(k, cx, cz, 0.3, () => {
        for (const [lx, lz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) k.rod(lx, 0, lz, lx, 2.25, lz, 0.03, 'metal', 0xb0b6ba, 6);
        k.add(pfExtrude('tent', [[-1.6, 0], [1.6, 0], [0, 0.55]], 3.2), 'cloth', 0x0f7f73, 0, 2.25, 0);
        for (const s2 of [-1, 1]) k.add(pfBox(3.2, 0.25, 0.02), 'cloth', 0x0f7f73, 0, 2.12, s2 * 1.6);
        k.add(pfRBox(1.8, 0.04, 0.75, 0.01), 'paint', 0xe8e8e2, 0, 0.75, -0.3);
        for (const [lx, lz] of [[-0.8, -0.6], [0.8, -0.6], [-0.8, 0.0], [0.8, 0.0]]) k.rod(lx, 0, lz, lx, 0.74, lz, 0.015, 'metal', 0x6b7277, 4);
        k.add(pfRBox(0.7, 0.3, 0.5, 0.04), 'rough', 0x1b1d1f, -0.4, 0.92, -0.35);
        k.add(pfRBox(0.36, 0.02, 0.26, 0.01), 'rough', 0x1d2326, 0.45, 0.78, -0.3, 0, 0.3, 0);
        k.add(pfBox(0.31, 0.004, 0.21), 'emit', pfC(0x2bb3a6, 0.9), 0.45, 0.792, -0.3, 0, 0.3, 0);
        k.add(pfRBox(0.38, 0.38, 0.38, 0.04), 'paint', 0x3a5e8c, 1.0, 0.19, 0.8);
        k.add(pfCyl(0.9, 0.9, 0.02, 24), 'rough', 0x1d2022, 2.8, 0.02, 1.0);
        k.add(pfTorus(0.6, 0.03, 4, 24), 'paint', 0xffb629, 2.8, 0.035, 1.0, Math.PI / 2, 0, 0);
      });
      colliders.push({ x: cx, z: cz, r: 1.8 });
    }
    // Picape do agrônomo
    place(k, s.x - 8.5, s.bz - 9.0, -0.4, () => kitPickup(k, 0xe3e5e1));
    // Estacas com fitas marcando a mancha
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * 6.283;
      const ex = -75.5 + Math.cos(a) * 2.4, ez = 15.5 + 4.5 + Math.sin(a) * 2.4;
      const ey = gh(ex, ez);
      const u = k.uvWorld; k.uvWorld = 1;
      k.add(pfRBox(0.05, 1.2, 0.05, 0.01), 'wood', 0xb08a58, ex, ey + 0.55, ez);
      k.uvWorld = u;
      k.add(pfBox(0.02, 0.18, 0.28), 'cloth', 0xff6a14, ex, ey + 1.05, ez + 0.13, 0, a, 0.1);
    }
    // Trado e baldes de amostra
    place(k, -70.0, 15.4, 0.2, () => {
      k.rod(0, 0, 0, 0.1, 1.25, 0.05, 0.02, 'metal', 0x9aa0a4, 6);
      k.add(pfRBox(0.6, 0.04, 0.04, 0.01), 'metal', 0xc8281e, 0.1, 1.25, 0.05);
      for (let i = 0; i < 3; i++) k.add(pfCyl(0.15, 0.12, 0.3, 12), 'paint', [0xffffff, 0x3a6ea5, 0xffb629][i], 0.5 + i * 0.35, 0.15, 0.3);
    });
    // Drone agrícola sobre o talhão
    const drone = buildAgriDrone(matLib);
    drone.position.set(s.x - 2.5, 3.6, s.bz + 2.5);
    drone.scale.setScalar(1.25);
    g.add(drone);
    animated.drone = drone;
    g.add(makeSign('TALHÃO 12', 'Geoespacial', s.x + 5.2, 0, s.sz, Math.PI));
    colliders.push({ x: tx, z: tz, r: 2.2 }, { x: s.x - 8.5, z: s.bz - 9.0, r: 2.4 });
  }

  // ===================== 2. FRENTE DE COLHEITA (x=-48, z=-22) =====================
  {
    const s = PARADAS[2], k = kits[2], g = groups[2];
    const hx = s.x - 2.5, hz = s.bz - 1.5, hr = 0.35, hy = gh(hx, hz);
    k.push(hx, hy, hz, 0, hr, 0);
    kitHarvester(k);
    k.push(PF_HARV_DISCHARGE.x, 0, PF_HARV_DISCHARGE.z);
    kitTransbordo(k, { seed: 4 });
    k.pop();
    k.pop();
    const [cx1, cz1] = toWorld(hx, hz, hr, PF_HARV_DISCHARGE.x, PF_HARV_DISCHARGE.z);
    const [tx1, tz1] = toWorld(hx, hz, hr, PF_HARV_DISCHARGE.x, PF_HARV_DISCHARGE.z + 6.6);
    // Segundo transbordo aguardando, voltado para a estrada
    const t2x = s.x + 9.5, t2z = s.bz - 4.5, t2r = 0.12;
    place(k, t2x, t2z, t2r, () => kitTransbordo(k, { seed: 8, tractorColor: PF_COL.tractor }));
    const [tx2, tz2] = toWorld(t2x, t2z, t2r, 0, 6.6);
    // Picape da encarregada e caminhão-oficina (comboio)
    place(k, s.x - 9.5, s.bz + 9.0, -0.55, () => kitPickup(k, 0xe3e5e1));
    // Leiras de palha e toletes no chão do talhão colhido
    for (let i = 0; i < 40; i++) {
      const px = s.x - 9 + (i * 37 % 170) / 10, pz = s.bz - 11 + (i * 53 % 150) / 10;
      k.add(pfCyl(0.026, 0.026, 0.24, 6), 'rough', i % 3 ? 0xa59a52 : 0x6e4b3e, px, gh(px, pz) + 0.03, pz, 0, i * 1.7, Math.PI / 2);
    }
    sbCone(k, s.x - 3.2, s.bz + 15.8);
    sbCone(k, s.x + 3.2, s.bz + 15.8);
    sbDrum(k, s.x - 11.5, s.bz + 6.6, 0xb84028);
    sbDrum(k, s.x - 10.8, s.bz + 6.2, 0x2b5f70);
    sbSafetySign(k, g, 'atencao', s.x + 6.0, 1.3, s.bz + 15.5, 0, true);
    particles.addEmitter({ x: hx - 1.0, y: 1.0, z: hz + 2.8, count: 12, color: 0xcfa482, opacity: 0.14, baseScale: 1.4, grow: 3.4, rise: 2.4, driftX: -2.2, speed: 0.22 });
    g.add(makeSign('FRENTE DE COLHEITA', 'Gestão agrícola', s.x - 5.2, 0, s.sz, 0));
    colliders.push({ x: hx, z: hz, r: 3.4 }, { x: cx1, z: cz1, r: 3.0 }, { x: tx1, z: tz1, r: 2.2 }, { x: t2x, z: t2z, r: 3.0 }, { x: tx2, z: tz2, r: 2.2 }, { x: s.x - 9.5, z: s.bz + 9.0, r: 2.4 });
  }

  // ===================== 3. OFICINA (x=-24, z=+22) =====================
  {
    const s = PARADAS[3], k = kits[3], g = groups[3];
    const X = s.x, Z = s.bz, y0 = gh(X, Z);
    const W = 14, D = 10, EH = 5.0, RISE = 1.5;
    k.push(X, y0, Z);
    k.uvWorld = 0.28;
    k.add(pfRBox(W + 0.6, 0.6, D + 0.6, 0.04), 'concrete', 0xb3b0a8, 0, -0.18, 0);
    k.uvWorld = 0;
    // pilares H, tesouras, terças e cobertura em chapa
    const frames = [-7, -3.5, 0, 3.5, 7];
    for (const fx of frames) {
      for (const fz of [-D / 2, D / 2]) sbHColumn(k, fx, 0.1, fz, EH - 0.1, 0x2f3a3e, 0.28);
      sbTruss(k, fx, EH, 0, D / 2, RISE, 0x2f3a3e, 8);
    }
    for (let i = 0; i <= 6; i++) {
      const t = i / 6, zz = -D / 2 + D * t, yy = EH + RISE * (1 - Math.abs(2 * t - 1)) + 0.1;
      k.add(pfBox(W + 0.4, 0.1, 0.08), 'metal', 0x3a4246, 0, yy, zz);
    }
    sbGableRoof(k, 0, EH + 0.18, 0, W + 1.2, D + 1.0, RISE + 0.15, 'sheet', 0x2f8a7f, 0.06, 0.5);
    k.add(pfBox(W + 1.2, 0.3, 0.3), 'sheet', 0x2f8a7f, 0, EH + RISE + 0.28, 0);
    // fechamentos: alvenaria baixa + chapa (fundo e lado oeste; leste meio aberto)
    k.uvWorld = 0.3;
    k.add(pfRBox(W, 1.4, 0.22, 0.02), 'concrete', 0xd8d4ca, 0, 0.7, D / 2);
    k.add(pfRBox(0.22, 1.4, D, 0.02), 'concrete', 0xd8d4ca, -W / 2, 0.7, 0);
    k.add(pfRBox(0.22, 1.4, D / 2, 0.02), 'concrete', 0xd8d4ca, W / 2, 0.7, D / 4);
    k.uvWorld = 0.5;
    k.add(pfBox(W, EH - 1.4, 0.06), 'sheet', 0xc9cfcf, 0, 1.4 + (EH - 1.4) / 2, D / 2 + 0.05);
    k.add(pfBox(0.06, EH - 1.4, D), 'sheet', 0xc9cfcf, -W / 2 - 0.05, 1.4 + (EH - 1.4) / 2, 0);
    k.add(pfBox(0.06, EH - 1.4, D / 2), 'sheet', 0xc9cfcf, W / 2 + 0.05, 1.4 + (EH - 1.4) / 2, D / 4);
    k.add(pfExtrude('ofgable', [[-D / 2, 0], [D / 2, 0], [0, RISE]], 0.06), 'sheet', 0xc9cfcf, -W / 2 - 0.05, EH, 0, 0, Math.PI / 2, 0);
    k.add(pfExtrude('ofgable', [[-D / 2, 0], [D / 2, 0], [0, RISE]], 0.06), 'sheet', 0xc9cfcf, W / 2 + 0.05, EH, 0, 0, Math.PI / 2, 0);
    k.uvWorld = 0;
    // faixa amarela/preta no piso na boca do galpão
    for (let i = 0; i < 28; i++) k.add(pfBox(0.5, 0.012, 0.18), 'paint', i % 2 ? 0x1a1a1a : 0xf2c200, -W / 2 + 0.25 + i * 0.5, 0.125, -D / 2 + 0.2);
    // luminárias pendentes acesas
    for (const [lx, lz] of [[-5.25, -1.2], [-1.75, 1.6], [1.75, -1.2], [5.25, 1.6]]) {
      const top = EH + RISE * (1 - Math.abs(2 * ((lz + D / 2) / D) - 1));
      k.rod(lx, top, lz, lx, 4.15, lz, 0.008, 'rough', 0x111111, 3);
      k.add(pfLathe('shade', [[0.04, 0.3], [0.08, 0.28], [0.36, 0.02], [0.38, 0.0], [0.35, 0.0], [0.06, 0.26], [0.0, 0.27]], 16), 'paint', 0x2f6b5a, lx, 3.86, lz);
      k.add(pfSphere(0.11, 10, 6), 'emit', pfC(0xffe2b0, 3.0), lx, 3.9, lz);
    }
    for (const lx of [-3.5, 3.5]) { const pl = new THREE.PointLight(0xffd59a, 12, 15, 1.6); pl.position.set(X + lx, y0 + 3.6, Z); g.add(pl); }
    // bancada com morsa, painel de ferramentas e gaveteiro
    {
      const bz = D / 2 - 0.55;
      k.add(pfRBox(3.6, 0.06, 0.8, 0.01), 'wood', 0x7a5232, -4.6, 0.95, bz);
      for (const lx of [-6.2, -3.0]) for (const lz of [-0.32, 0.32]) k.add(pfBox(0.06, 0.92, 0.06), 'metal', 0x3a4246, lx, 0.46, bz + lz);
      k.add(pfBox(3.4, 0.04, 0.7), 'metal', 0x3a4246, -4.6, 0.25, bz);
      k.add(pfRBox(0.2, 0.15, 0.3, 0.02), 'paint', 0x2b4f8a, -5.6, 1.05, bz - 0.15);
      k.add(pfRBox(0.24, 0.06, 0.08, 0.01), 'metal', 0x6b7277, -5.6, 1.12, bz - 0.33);
      k.add(pfRBox(2.6, 1.2, 0.04, 0.01), 'wood', 0x9c8058, -4.6, 1.95, D / 2 - 0.15);
      const det = k.detail; k.detail = true;
      for (let i = 0; i < 11; i++) {
        const tx = -5.7 + i * 0.22, len = 0.18 + (i % 4) * 0.06;
        k.add(pfRBox(0.035, len, 0.02, 0.008), 'metal', [0x9aa0a4, 0xc8281e, 0x2b4f8a, 0xe9b923][i % 4], tx, 2.25 - len / 2, D / 2 - 0.19);
      }
      for (let i = 0; i < 6; i++) k.add(pfTorus(0.06, 0.012, 4, 10), 'metal', 0x9aa0a4, -5.5 + i * 0.32, 1.65, D / 2 - 0.19);
      for (let i = 0; i < 4; i++) k.add(pfCyl(0.04, 0.04, 0.18, 8), 'paint', [0xc8281e, 0x1f5fa8, 0xe9b923, 0x2b8a3e][i], -3.6 + i * 0.14, 1.07, bz + 0.1);
      k.detail = det;
      k.add(pfRBox(0.75, 1.05, 0.5, 0.03), 'paint', 0xb3301f, -1.9, 0.55, D / 2 - 0.45);
      for (let i = 0; i < 5; i++) k.add(pfBox(0.68, 0.01, 0.02), 'metal', 0x2b2e31, -1.9, 0.25 + i * 0.18, D / 2 - 0.69);
      for (const lx of [-0.25, 0.25]) k.add(pfCyl(0.05, 0.05, 0.04, 8), 'rubber', 0x111111, -1.9 + lx, 0.03, D / 2 - 0.3, 0, 0, Math.PI / 2);
    }
    // estante de peças (porta-paletes leve) com caixas, filtros e correias
    {
      const sx = -W / 2 + 0.6;
      for (const lz of [-3.6, -1.8, 0, 1.8]) for (const lx of [-0.3, 0.3]) k.add(pfBox(0.06, 2.6, 0.06), 'paint', 0x1f5fa8, sx + lx, 1.3, lz);
      for (let l = 0; l < 4; l++) {
        const y = 0.25 + l * 0.72;
        k.add(pfBox(0.7, 0.04, 5.5), 'metal', 0x8d959b, sx, y, -0.9);
        for (const lx of [-0.3, 0.3]) k.add(pfBox(0.05, 0.08, 5.5), 'paint', 0xe36b1a, sx + lx, y + 0.02, -0.9);
        for (let i = 0; i < 9; i++) {
          const zz = -3.4 + i * 0.6;
          const kind = (i + l) % 4;
          if (kind === 0) k.add(pfRBox(0.44, 0.28, 0.42, 0.02), 'paint', [0x33466c, 0xb3402a, 0xe07b00, 0x00968c][(i + l) % 4], sx, y + 0.16, zz);
          else if (kind === 1) { for (let f = 0; f < 3; f++) k.add(pfCyl(0.07, 0.07, 0.22, 10), 'paint', [0x1f5fa8, 0xd8a01c, 0x2b2e31][f], sx - 0.15 + f * 0.15, y + 0.13, zz); }
          else if (kind === 2) k.add(pfRBox(0.5, 0.3, 0.45, 0.01), 'cloth', 0xa8865a, sx, y + 0.17, zz);
          else k.add(pfTorus(0.16, 0.02, 4, 12), 'rubber', 0x111111, sx, y + 0.2, zz, 0, Math.PI / 2, 0);
        }
      }
    }
    // compressor de ar
    {
      const cx = W / 2 - 1.6, cz = D / 2 - 1.0;
      k.add(pfCapsule(0.32, 1.0, 4, 14), 'paint', 0xc8321f, cx, 0.62, cz, 0, 0, Math.PI / 2);
      for (const lx of [-0.5, 0.5]) k.add(pfRBox(0.12, 0.3, 0.5, 0.02), 'metal', 0x2b2e31, cx + lx, 0.18, cz);
      k.add(pfRBox(0.5, 0.35, 0.4, 0.04), 'metal', 0x2b2e31, cx - 0.2, 1.08, cz);
      k.add(pfRBox(0.35, 0.3, 0.08, 0.03), 'paint', 0xc8321f, cx + 0.28, 1.08, cz + 0.12);
      k.add(pfCyl(0.06, 0.06, 0.04, 12), 'metal', PF_COL.chrome, cx + 0.5, 0.95, cz + 0.32, Math.PI / 2, 0, 0);
      k.add(pfTube([[cx + 0.6, 0.6, cz + 0.2], [cx + 1.0, 0.1, cz - 0.4], [cx + 0.3, 0.05, cz - 1.0], [cx - 0.6, 0.05, cz - 1.2]], 0.02, 14, 4), 'rubber', 0xe9b923);
    }
    // extintor numa coluna e placas
    k.add(pfCapsule(0.09, 0.35, 3, 10), 'paint', 0xc8281e, 3.5, 1.0, -D / 2 + 0.25);
    k.add(pfRBox(0.12, 0.08, 0.08, 0.02), 'metal', 0x2b2e31, 3.5, 1.32, -D / 2 + 0.25);
    k.add(pfRBox(0.4, 0.4, 0.02, 0.01), 'paint', 0xc8281e, 3.5, 1.75, -D / 2 + 0.2);
    k.pop();
    sbSafetySign(k, g, 'epi', X - 3.5, y0 + 2.0, Z + D / 2 - 0.17, Math.PI, false);
    sbSafetySign(k, g, 'atencao', X + 0.0, y0 + 2.0, Z + D / 2 - 0.17, Math.PI, false);
    // trator de capô aberto, macaco e bandeja de óleo
    const trx = X + 1.8, trz = Z - 0.5, trr = -0.65;
    place(k, trx, trz, trr, () => kitTractor(k, PF_COL.tractor, { capoAberto: true }));
    place(k, trx + 0.8, trz - 1.6, 0.3, () => {
      k.add(pfRBox(0.9, 0.12, 0.3, 0.03), 'paint', 0xb3301f, 0, 0.1, 0);
      k.add(pfRBox(0.12, 0.35, 0.12, 0.02), 'metal', 0x2b2e31, 0.3, 0.3, 0);
      k.rod(-0.4, 0.15, 0, -1.2, 0.8, 0, 0.02, 'metal', 0x2b2e31, 5);
      k.add(pfCyl(0.3, 0.26, 0.08, 16), 'metal', 0x2b2e31, -0.6, 0.05, 0.8);
    });
    for (const [ox, oz, sc] of [[1.2, -0.2, 1.6], [2.6, 0.8, 1.0], [-0.4, -1.4, 1.3], [3.2, -2.0, 0.8], [-2.5, 1.5, 1.1], [0.6, 2.2, 0.9]]) sbOil(k, X + ox, Z + oz, sc, ox);
    // tambores, pneus empilhados, palete
    sbDrum(k, X - 5.5, Z - 2.6, 0xb84028);
    sbDrum(k, X - 4.8, Z - 3.0, 0x2f687a);
    sbDrum(k, X - 5.2, Z - 3.6, 0x2f687a);
    sbDrum(k, X - 4.4, Z - 2.2, 0x3a7a3c, null, true);
    sbTireStack(k, X + 5.6, Z - 3.4, 4, 0.55, 0.3);
    sbTireStack(k, X + 6.3, Z - 2.4, 3, 0.55, 0.3);
    sbTireLeaning(k, X + 6.6, Z + 0.6, 1.4, 0.82, 0.48);
    sbPallet(k, X - 6.2, Z + 1.2, 0.4);
    sbCone(k, X + 5.5, Z - 4.2 - 1.0);
    // balcão do caderno de abastecimento (evidência ev-auto2)
    place(k, -27.5, 15.5, 0, () => {
      k.add(pfRBox(1.4, 1.0, 0.7, 0.03), 'wood', 0x7a5232, 0, 0.5, 0);
      k.add(pfRBox(1.5, 0.05, 0.8, 0.01), 'wood', 0x5d3a22, 0, 1.02, 0);
      k.add(pfRBox(0.12, 0.25, 0.12, 0.03), 'paint', 0x2b4f8a, 0.58, 1.17, 0.25);
    });
    sbYardLamp(k, g, X - 7.5, Z - 6.0, 0.4, true, true);
    g.add(makeSign('OFICINA', 'Gestão automotiva', s.x + 5.2, 0, s.sz, Math.PI));
    colliders.push({ x: trx, z: trz, r: 3.0 }, { x: X - 4.6, z: Z + 4.4, r: 1.9 }, { x: X - 1.9, z: Z + 4.5, r: 0.8 }, { x: X - 6.4, z: Z - 0.9, r: 1.5 }, { x: X - 6.4, z: Z + 2.0, r: 1.3 }, { x: X + 5.4, z: Z + 4.0, r: 1.0 }, { x: X, z: Z + 5.3, r: 1.2 }, { x: X + 3.5, z: Z + 5.3, r: 1.2 });
  }

  // ===================== 4. BALANÇA E PORTARIA (x=0, z=-22) =====================
  {
    const s = PARADAS[4], k = kits[4], g = groups[4];
    const X = s.x, PZ = s.bz + 3.2, y0 = gh(X, PZ);
    // plataforma de pesagem: fosso, tabuleiro de aço e rampas
    k.push(X, y0, PZ);
    k.add(pfRBox(16.2, 0.6, 4.8, 0.06), 'concrete', 0xa9a69e, 0, 0.0, 0);
    k.uvWorld = 1.6;
    k.add(pfRBox(15.4, 0.12, 3.6, 0.02), 'metal', 0x6f777b, 0, 0.36, 0);
    k.uvWorld = 0;
    for (let i = 0; i < 6; i++) k.add(pfBox(0.06, 0.02, 3.5), 'metal', 0x4a5154, -6.4 + i * 2.56, 0.43, 0);
    for (const sx of [-1, 1]) {
      k.add(pfExtrude('ramp', [[0, 0], [3.0, 0], [0, 0.42]], 3.6), 'concrete', 0xa9a69e, sx * 8.1, 0, 0, 0, sx > 0 ? 0 : Math.PI, 0);
      for (const sz of [-1, 1]) {
        for (let i = 0; i < 2; i++) k.add(pfCyl(0.12, 0.12, 1.0, 10), 'paint', i ? 0x1a1a1a : 0xf2c200, sx * 8.4, 0.5 + i * 0.001, sz * 2.4);
        k.add(pfCyl(0.125, 0.125, 0.25, 10), 'paint', 0x1a1a1a, sx * 8.4, 0.75, sz * 2.4);
      }
    }
    for (let i = 0; i < 31; i++) for (const sz of [-1, 1]) k.add(pfBox(0.5, 0.18, 0.18), 'paint', i % 2 ? 0x1a1a1a : 0xf2c200, -7.5 + i * 0.5, 0.45, sz * 1.9);
    k.pop();
    // cabine da balança voltada para a plataforma
    const cbx = X - 9.4, cbz = s.bz - 1.6;
    place(k, cbx, cbz, 0, () => sbBuilding(k, 4.4, 3.8, 3.0, { wall: 0xeae6dc, roof: 0x5d6a6e, windows: [['f', 0, 1.8, 2.6, 1.2], ['r', 0, 1.8, 1.6, 1.1]], frame: 0x2f3a3e, door: [-1.4, 0.9], glass: 'glass' }));
    // portaria com cancela, semáforo e painel
    const gx = X + 11.0, gz = s.bz + 8.6;
    place(k, gx, gz, -Math.PI / 2, () => sbBuilding(k, 2.8, 2.6, 2.7, { wall: 0xeae6dc, roof: 0x5d6a6e, windows: [['f', 0, 1.7, 1.8, 1.0], ['l', 0, 1.7, 1.2, 1.0], ['r', 0, 1.7, 1.2, 1.0]], frame: 0x2f3a3e, ac: false }));
    place(k, X + 9.2, s.bz + 6.2, 0, () => {
      k.add(pfRBox(0.45, 1.05, 0.4, 0.05), 'paint', 0xf2c200, 0, 0.53, 0);
      k.add(pfRBox(0.5, 0.06, 0.45, 0.02), 'metal', 0x2b2e31, 0, 1.08, 0);
      for (let i = 0; i < 9; i++) k.add(pfRBox(0.5, 0.1, 0.07, 0.02), 'paint', i % 2 ? 0xf4f4ef : 0xc8281e, 0, 0.95, -0.4 - i * 0.5);
      k.add(pfRBox(0.3, 0.12, 0.08, 0.02), 'metal', 0x2b2e31, 0, 0.95, -4.85);
    });
    place(k, X + 9.6, s.bz + 7.6, 0, () => {
      k.add(pfCyl(0.08, 0.1, 4.6, 10), 'metal', 0x3a4044, 0, 2.3, 0);
      k.add(pfRBox(0.36, 0.9, 0.28, 0.05), 'metal', 0x15181a, 0, 3.0, -0.2);
      k.add(pfCyl(0.1, 0.1, 0.03, 12), 'emit', pfC(0xff2a1a, 2.0), 0, 3.25, -0.35, Math.PI / 2, 0, 0);
      k.add(pfCyl(0.1, 0.1, 0.03, 12), 'emit', pfC(0x1a6a30, 0.4), 0, 2.85, -0.35, Math.PI / 2, 0, 0);
      k.add(pfRBox(1.9, 0.8, 0.26, 0.04), 'metal', 0x141a1c, -0.6, 4.25, -0.12);
      for (let i = 0; i < 4; i++) k.add(pfBox(0.28, 0.06, 0.02), 'emit', pfC(0x00ffaa, 1.1), -1.2 + i * 0.4, 4.25, -0.26);
      k.add(pfRBox(0.3, 0.18, 0.18, 0.03), 'paint', 0xe8eae6, 0.25, 4.85, -0.1);
      k.add(pfCyl(0.06, 0.06, 0.06, 10), 'rough', 0x111111, 0.25, 4.85, -0.22, Math.PI / 2, 0, 0);
    });
    // lombada e faixas
    place(k, X + 13.5, s.bz + 3.2, 0, () => { for (let i = 0; i < 8; i++) k.add(pfRBox(0.5, 0.08, 0.5, 0.03), 'paint', i % 2 ? 0x1a1a1a : 0xf2c200, 0, 0.03, -1.75 + i * 0.5); });
    // caminhão canavieiro sobre a balança
    place(k, X + 0.5, PZ, Math.PI / 2, () => { k.push(0, 0.42, 0); kitTruck(k, { cabColor: 0xe6e8e4, type: 'cana' }); k.pop(); });
    sbCone(k, X - 6.5, s.bz + 8.0);
    sbCone(k, X - 5.6, s.bz + 8.3);
    sbSafetySign(k, g, 'atencao', X - 6.8, 1.4, s.bz + 6.2, 0, true);
    sbYardLamp(k, g, X + 6.5, s.bz + 9.5, Math.PI, true, true);
    g.add(makeSign('BALANÇA', 'Cana & grãos de milho', s.x - 5.2, 0, s.sz, 0));
    colliders.push({ x: X, z: PZ, r: 3.4 }, { x: X - 5.5, z: PZ, r: 2.6 }, { x: X + 5.5, z: PZ, r: 2.6 }, { x: cbx, z: cbz, r: 3.0 }, { x: gx, z: gz, r: 1.9 });
  }

  // ===================== 5. INDÚSTRIA + TANQUES (x=26, z=+22) =====================
  {
    const s = PARADAS[5], k = kits[5], g = groups[5];
    const X = s.x, Z = s.bz, y0 = gh(X, Z);
    const MX0 = X - 12, MX1 = X + 8, MZ0 = Z - 5, MZ1 = Z + 6.5, MH = 9.2;
    const MW = MX1 - MX0, MD = MZ1 - MZ0, MCX = (MX0 + MX1) / 2, MCZ = (MZ0 + MZ1) / 2;
    k.push(MCX, y0, MCZ);
    k.add(pfRBox(MW + 0.6, 1.2, MD + 0.6, 0.04), 'concrete', 0x9a978f, 0, -0.3, 0);
    k.uvWorld = 0.3;
    k.add(pfRBox(MW, 2.6, MD, 0.04), 'concrete', 0xd8d4ca, 0, 1.3, 0);
    k.uvWorld = 0.5;
    k.add(pfBox(MW - 0.1, MH - 2.6, MD - 0.1), 'sheet', 0xc7cdcd, 0, 2.6 + (MH - 2.6) / 2, 0);
    k.uvWorld = 0;
    // pilares H na fachada e cobertura com lanternim
    for (let i = 0; i <= 5; i++) {
      const cx = -MW / 2 + i * MW / 5;
      for (const sz of [-1, 1]) sbHColumn(k, cx, 0.1, sz * (MD / 2 + 0.16), MH, 0x2f3a3e, 0.32);
    }
    sbGableRoof(k, 0, MH, 0, MW + 0.8, MD + 0.8, 1.6, 'sheet', 0x1f7d72, 0.08, 0.5);
    k.add(pfRBox(MW * 0.75, 1.0, 2.2, 0.04), 'sheet', 0xc7cdcd, 0, MH + 1.9, 0);
    sbGableRoof(k, 0, MH + 2.35, 0, MW * 0.75 + 0.4, 2.8, 0.45, 'sheet', 0x1f7d72, 0.06, 0.5);
    const det5 = k.detail; k.detail = true;
    for (let i = 0; i < 30; i++) for (const sz of [-1, 1]) k.add(pfBox(0.4, 0.05, 0.08), 'metal', 0x3a4246, -MW * 0.36 + i * (MW * 0.72 / 29), MH + 1.9, sz * 1.12, sz * 0.5, 0, 0);
    k.detail = det5;
    // janelas altas iluminadas e portões abertos (interior escuro com moenda)
    k.add(pfBox(MW - 1.5, 1.3, 0.05), 'emit', pfC(0xffd9a8, 0.85), 0, 7.6, -MD / 2 - 0.06);
    for (let i = 0; i < 12; i++) k.add(pfBox(0.08, 1.4, 0.08), 'metal', 0x2f3a3e, -MW / 2 + 1 + i * (MW - 2) / 11, 7.6, -MD / 2 - 0.1);
    for (const dx of [-5.5, 3.0]) {
      k.add(pfBox(4.2, 5.2, 0.05), 'rough', 0x0d0f10, dx, 2.7, -MD / 2 - 0.07);
      k.add(pfRBox(4.6, 0.3, 0.3, 0.03), 'metal', 0x2f3a3e, dx, 5.4, -MD / 2 - 0.12);
      k.add(pfRBox(4.4, 0.6, 0.2, 0.03), 'sheet', 0xb5bcbe, dx, 5.0, -MD / 2 - 0.12);
    }
    // segundo portão: painel de controle e sinaleiro industrial no vão
    k.add(pfRBox(1.8, 2.2, 0.35, 0.04), 'metal', 0x263236, 3.0, 1.2, -MD / 2 - 0.2);
    k.add(pfBox(1.4, 0.7, 0.04), 'emit', pfC(0x14b89a, 1.1), 3.0, 1.75, -MD / 2 - 0.39);
    k.pop();
    // moenda visível no vão do portão esquerdo: castelos fixos + rolos, coroas dentadas girando e guarda-corpo
    animated.moendaRols = [];
    {
      const rMat = new THREE.MeshStandardMaterial({ color: 0x6f777b, roughness: 0.45, metalness: 0.72 });
      const cMat = new THREE.MeshStandardMaterial({ color: 0xc8a623, roughness: 0.42, metalness: 0.35 });
      const roloGeo = new THREE.CylinderGeometry(0.48, 0.48, 1.35, 16);
      const coroaGeo = new THREE.CylinderGeometry(0.76, 0.76, 0.16, 10);
      k.push(MCX, y0, MCZ);
      sbRailing(k, -7.6, -MD / 2 - 1.48, -3.4, -MD / 2 - 1.48, 0.08, 0xe9b923, 1.1);
      k.pop();
      for (let i = 0; i < 3; i++) {
        const mx = -6.8 + i * 1.3;
        k.push(MCX, y0, MCZ);
        k.add(pfRBox(0.78, 2.4, 1.25, 0.06), 'paint', 0x2f6b5a, mx, 1.3, -MD / 2 - 0.55);
        k.pop();
        const rGrp = new THREE.Group();
        rGrp.position.set(MCX + mx, y0 + 1.85, MCZ - MD / 2 - 0.55);
        const rolo = new THREE.Mesh(roloGeo, rMat);
        rolo.rotation.x = Math.PI / 2;
        const coroa = new THREE.Mesh(coroaGeo, cMat);
        coroa.rotation.x = Math.PI / 2;
        coroa.position.z = -0.72;
        rGrp.add(rolo, coroa);
        g.add(rGrp);
        animated.moendaRols.push(rGrp);
      }
      k.push(MCX, y0, MCZ);
    }
    // passarela externa com guarda-corpo e escada
    const wy = 4.6, wz = -MD / 2 - 1.0;
    k.add(pfRBox(MW - 1, 0.12, 1.4, 0.02), 'metal', 0x5b6468, 0, wy, wz);
    for (let i = 0; i < 6; i++) k.bar(-MW / 2 + 1 + i * (MW - 2) / 5, wy - 0.1, -MD / 2 - 0.1, -MW / 2 + 1 + i * (MW - 2) / 5, wy - 1.0, -MD / 2 - 0.1, 0.12, 0.12, 'metal', 0x2f3a3e);
    for (let i = 0; i < 6; i++) k.bar(-MW / 2 + 1 + i * (MW - 2) / 5, wy - 0.05, wz - 0.65, -MW / 2 + 1 + i * (MW - 2) / 5, wy - 0.9, -MD / 2 - 0.1, 0.08, 0.08, 'metal', 0x2f3a3e);
    sbRailing(k, -MW / 2 + 0.5, wz - 0.68, MW / 2 - 0.5, wz - 0.68, wy + 0.06, 0xe9b923, 1.6);
    sbStair(k, -MW / 2 - 5.4, 0.1, wz, -MW / 2 + 0.2, wy, wz, 0.9);
    k.pop();
    // mesa alimentadora + esteira de cana subindo para a moenda
    sbConveyor(k, MX0 - 8, y0 + 1.0, Z - 1.0, MX0 + 0.5, y0 + 6.8, Z - 1.0, { w: 2.0, load: true, cover: true });
    place(k, MX0 - 9.5, Z - 1.0, 0, () => {
      k.add(pfRBox(3.2, 1.2, 3.6, 0.05), 'concrete', 0x9a978f, 0, 0.6, 0);
      k.add(pfRBox(3.0, 0.2, 3.4, 0.03), 'metal', 0x4a5154, 0, 1.25, 0);
      k.push(0, 1.35, 0); kitCaneLoad(k, 2.6, 3.0, 0.5, 30, 12); k.pop();
    });
    // caldeira, chaminés e galeria de bagaço
    const BX = X + 13.5, BZ = Z + 9.5;
    place(k, BX, BZ, 0, () => {
      k.add(pfRBox(8.4, 1.2, 7.4, 0.04), 'concrete', 0x9a978f, 0, -0.3, 0);
      k.uvWorld = 0.3;
      k.add(pfRBox(8, 3.0, 7, 0.04), 'concrete', 0xd8d4ca, 0, 1.5, 0);
      k.uvWorld = 0.5;
      k.add(pfBox(7.9, 10, 6.9), 'sheet', 0xbcc3c4, 0, 8.0, 0);
      k.uvWorld = 0;
      k.add(pfRBox(8.4, 0.3, 7.4, 0.04), 'metal', 0x2f3a3e, 0, 13.1, 0);
      for (const [cx, cz] of [[-4.1, -3.6], [4.1, -3.6], [-4.1, 3.6], [4.1, 3.6]]) sbHColumn(k, cx, 0.1, cz, 13, 0x2f3a3e, 0.32);
      k.add(pfCyl(0.9, 0.9, 6.5, 16), 'metal', 0x8d959b, 0, 14.2, -0.5, 0, 0, Math.PI / 2);
      k.add(pfBox(5.5, 0.9, 0.05), 'emit', pfC(0xffd9a8, 0.8), 0, 9.5, -3.48);
      sbRailing(k, -4.0, -3.6, 4.0, -3.6, 13.25, 0xe9b923, 1.6);
      sbStair(k, -3.2, 0.1, -6.5, -3.2, 3.2, -3.9, 0.9);
    });
    const chims = [[X + 9.5, Z + 15.0, 20], [X + 13.5, Z + 15.5, 24], [X + 17.5, Z + 15.0, 18]];
    chims.forEach(([cx, cz, ch], idx) => {
      sbChimney(k, cx, cz, ch);
      k.add(pfPipe([[cx, gh(cx, cz) + 3, cz - 1.2], [cx, gh(cx, cz) + 3, BZ + 3.8]], 0.5, 0.6, 10), 'metal', 0x8d959b);
      particles.addEmitter({ x: cx, y: gh(cx, cz) + ch + 1.5, z: cz, count: 10, color: 0xf4f6f8, opacity: 0.48, baseScale: 2.0, grow: 5.2, rise: 7.5, driftX: 2.2, speed: 0.22 + idx * 0.03 });
    });
    sbConveyor(k, MX1 - 3.0, y0 + MH + 0.6, MZ1 - 2.0, BX - 3.9, y0 + 12.6, BZ - 1.0, { w: 1.6, load: true, loadCols: [0xd9c88f, 0xc8b47a, 0xe4d6a4, 0xb8a46a], cover: true });
    // pátio de bagaço
    const bgx = MX0 - 4.5, bgz = Z + 10.5;
    k.add(pfHeapGeo(8, 7, 4.2, 31, [0xd9c88f, 0xc8b47a, 0xe4d6a4, 0xb8a46a]), 'rough', 0xffffff, bgx, gh(bgx, bgz) - 0.05, bgz);
    sbConveyor(k, MX0 + 1, y0 + 7.0, Z + 5.0, bgx + 1.0, y0 + 5.6, bgz - 1.0, { w: 1.2, load: true, loadCols: [0xd9c88f, 0xc8b47a, 0xe4d6a4, 0xb8a46a], cover: false });
    // dornas de fermentação e colunas de destilação
    const dornas = [[X + 15.0, Z - 6.0], [X + 19.5, Z - 6.0], [X + 17.2, Z - 0.6]];
    dornas.forEach(([dx, dz], i) => sbTank(k, dx, dz, 2.0, 7.0, 0xdfe3e1, null, { ladderAngle: i === 2 ? Math.PI / 2 : -Math.PI / 2 }));
    for (const [cx, cz, ch] of [[X + 11.5, Z - 8.0, 13], [X + 12.6, Z - 8.0, 11]]) {
      const cy = gh(cx, cz);
      k.add(pfCyl(0.55, 0.55, ch, 16), 'paint', 0xc9ced0, cx, cy + ch / 2, cz);
      k.add(pfSphere(0.55, 16, 6, 0, Math.PI / 2), 'paint', 0xc9ced0, cx, cy + ch, cz);
      for (let y = 3; y < ch; y += 3) {
        k.add(pfCyl(1.2, 1.2, 0.08, 16), 'metal', 0x5b6468, cx, cy + y, cz);
        k.add(pfTorus(1.18, 0.025, 4, 16), 'paint', 0xe9b923, cx, cy + y + 1.0, cz, Math.PI / 2, 0, 0);
      }
    }
    // rack de tubulação entre moenda, destilaria e tanques
    const rackY = y0 + 6.2;
    for (let i = 0; i < 5; i++) {
      const rx = MX1 + 1.0 + i * 2.6, rz = Z - 9.5;
      for (const sz of [-0.8, 0.8]) k.bar(rx, gh(rx, rz + sz), rz + sz, rx, rackY, rz + sz, 0.2, 0.2, 'metal', 0x2f3a3e);
      k.add(pfBox(0.2, 0.2, 1.9), 'metal', 0x2f3a3e, rx, rackY, rz);
    }
    const pipeCols = [0x8d959b, 0x3a6ea5, 0xb3402a, 0xd8a01c];
    pipeCols.forEach((pc, i) => {
      const pz = Z - 10.1 + i * 0.4, r = 0.13 + (i % 2) * 0.05;
      const end = i === 0 ? [[X + 21.3, rackY + 0.25, pz], [X + 21.3, rackY + 0.25, Z], [X + 21.3, y0 + 1.6, Z]] : [[X + 21.0 - i * 0.5, rackY + 0.25, pz], [X + 21.0 - i * 0.5, y0 + 0.6, pz]];
      k.add(pfPipe([[MX1 - 0.5, y0 + 7.4 - i * 0.3, MZ0 + 1.0], [MX1 + 0.8, rackY + 0.25, MZ0 + 1.0], [MX1 + 0.8, rackY + 0.25, pz], ...end], r, 0.8, 8), 'metal', pc);
    });
    k.add(pfPipe([[X + 12.6, y0 + 9.0, Z - 8.0], [X + 15.0, y0 + 9.0, Z - 8.0], [X + 15.0, y0 + 7.4, Z - 6.0]], 0.15, 0.6, 8), 'metal', 0x8d959b);
    // TANQUES DE ETANOL: bacia de contenção, 4 tanques, escadas, rede de incêndio
    {
      const TX = X + 29.5, TZ = Z, TW = 15, TD = 17;
      let hmax = -9, hmin = 9;
      for (let i = -1; i <= 1; i += 0.5) for (let j = -1; j <= 1; j += 0.5) { const h = gh(TX + i * TW / 2, TZ + j * TD / 2); hmax = Math.max(hmax, h); hmin = Math.min(hmin, h); }
      const fy = hmax + 0.05;
      k.uvWorld = 0.3;
      k.add(pfBox(TW, fy - hmin + 0.6, TD), 'concrete', 0xb3b0a8, TX, (fy + hmin - 0.6) / 2, TZ);
      for (const [cx, cz, w, d] of [[TX, TZ - TD / 2, TW + 0.4, 0.4], [TX, TZ + TD / 2, TW + 0.4, 0.4], [TX - TW / 2, TZ, 0.4, TD], [TX + TW / 2, TZ, 0.4, TD]]) {
        k.add(pfRBox(w, fy - hmin + 1.8, d, 0.04), 'concrete', 0xc9c6be, cx, (fy + 1.2 + hmin - 0.6) / 2, cz);
      }
      k.uvWorld = 0;
      const tanks = [[TX - 3.6, TZ - 4.2], [TX + 3.6, TZ - 4.2], [TX - 3.6, TZ + 4.2], [TX + 3.6, TZ + 4.2]];
      tanks.forEach(([tx, tz], i) => {
        sbTank(k, tx, tz, 2.9, 7.5, 0xeef0ee, fy, { ladderAngle: i < 2 ? -Math.PI / 2 : Math.PI / 2 });
        k.add(pfCyl(2.92, 2.92, 0.5, 28), 'paint', 0x1f7d72, tx, fy + 6.2, tz);
        k.add(pfPipe([[tx + 2.9, fy + 7.2, tz], [tx + 3.4, fy + 7.2, tz], [tx + 3.4, fy + 0.7, tz]], 0.07, 0.3, 6), 'paint', 0xc8281e);
      });
      // coletor (manifold) e passarela sobre a bacia
      k.add(pfPipe([[X + 21.3, y0 + 1.6, TZ], [TX - 8.0, fy + 1.6, TZ], [TX - 7.0, fy + 0.6, TZ], [TX + 6.5, fy + 0.6, TZ]], 0.2, 0.6, 8), 'metal', 0x8d959b);
      for (const [tx, tz] of tanks) k.add(pfPipe([[tx, fy + 0.6, TZ], [tx, fy + 0.6, tz + Math.sign(TZ - tz) * 2.9]], 0.14, 0.3, 8), 'metal', 0x8d959b);
      sbStair(k, TX - TW / 2 - 2.2, hmin, TZ - TD / 2 - 0.6, TX - TW / 2 + 0.2, fy + 1.4, TZ - TD / 2 - 0.6, 0.8);
      // hidrantes e placas
      for (const [hx, hz] of [[TX - TW / 2 - 1.5, TZ + 3], [TX + TW / 2 + 1.5, TZ - 3]]) {
        const hy = gh(hx, hz);
        k.add(pfCyl(0.14, 0.16, 0.8, 10), 'paint', 0xc8281e, hx, hy + 0.4, hz);
        k.add(pfSphere(0.15, 10, 6, 0, Math.PI / 2), 'paint', 0xc8281e, hx, hy + 0.8, hz);
        for (const s2 of [-1, 1]) k.add(pfCyl(0.06, 0.06, 0.18, 8), 'paint', 0xc8281e, hx + s2 * 0.18, hy + 0.55, hz, 0, 0, Math.PI / 2);
      }
      sbSafetySign(k, g, 'perigo', TX - TW / 2 - 0.25, fy + 0.6, TZ - 5, -Math.PI / 2, false);
      sbSafetySign(k, g, 'perigo', TX, fy + 0.6, TZ - TD / 2 - 0.25, Math.PI, false);
      colliders.push({ x: TX - 3.6, z: TZ - 4.2, r: 4.2 }, { x: TX + 3.6, z: TZ - 4.2, r: 4.2 }, { x: TX - 3.6, z: TZ + 4.2, r: 4.2 }, { x: TX + 3.6, z: TZ + 4.2, r: 4.2 });
    }
    // ===== COMPLEXO FLEX DE ETANOL DE MILHO (Moega/Tombador, Elevador de Canecas, 4 Silos, Moinho/Liquefação, Secador/Armazém DDGS e Óleo de Milho) =====
    {
      // 1. Tombador & Moega de recepção de milho (X-10, Z+15 -> x=16, z=37)
      const tx = X - 10.0, tz = Z + 15.0, ty = gh(tx, tz);
      place(k, tx, tz, 0, () => {
        k.add(pfRBox(5.2, 0.36, 4.4, 0.04), 'concrete', 0x9a978f, 0, 0.18, 0);
        k.add(pfRBox(3.8, 0.16, 2.8, 0.02), 'metal', 0x2b2e31, 0, 0.4, 0);
        // carga dourada de milho na moega + plataforma tombadora inclinada
        k.add(pfHeapGeo(3.2, 2.2, 0.72, 19, [0xf0b829, 0xe4a518, 0xf7cf4c, 0xc98b10]), 'rough', 0xffffff, 0, 0.44, 0);
        for (const sx of [-2.3, 2.3]) for (const sz of [-1.9, 1.9]) sbHColumn(k, sx, 0.1, sz, 4.6, 0x2f3a3e, 0.24);
        sbGableRoof(k, 0, 4.7, 0, 5.4, 4.8, 0.9, 'sheet', 0x1f7d72, 0.06, 0.5);
      });
      // 2. Elevador de Canecas (x=19.2, z=37) + dutos para os 4 silos
      const ex = X - 6.8, ez = Z + 15.0, ey = gh(ex, ez);
      place(k, ex, ez, 0, () => {
        k.add(pfRBox(1.5, 0.5, 1.5, 0.04), 'concrete', 0x9a978f, 0, 0.25, 0);
        k.add(pfRBox(1.05, 15.5, 0.85, 0.03), 'metal', 0x5b6468, 0, 8.0, 0);
        k.add(pfRBox(1.6, 1.3, 1.2, 0.04), 'paint', 0x1f7d72, 0, 16.0, 0);
        k.add(pfRBox(1.2, 0.08, 1.6, 0.02), 'metal', 0x3a4246, 0, 15.2, 0);
        sbCagedLadder(k, -0.68, 0, 0.4, 15.6, Math.PI / 2);
      });
      k.add(pfPipe([[tx + 1.8, ty + 0.5, tz], [ex - 0.4, ey + 0.7, ez]], 0.22, 0.3, 8), 'metal', 0x8d959b);
      // 3. Quatro Silos Metálicos Corrugados de Milho (x=22.5/27.5, z=36/40.5)
      const silos = [[X - 3.5, Z + 14.0], [X + 1.5, Z + 14.0], [X - 3.5, Z + 18.5], [X + 1.5, Z + 18.5]];
      silos.forEach(([sx, sz], idx) => {
        const sy = gh(sx, sz);
        sbTank(k, sx, sz, 2.15, 10.6, 0xd8dddc, sy, { ladderAngle: idx < 2 ? -Math.PI / 2 : Math.PI / 2, nozzle: false });
        // anéis de reforço extra do silo corrugado + cone de aeração
        for (let h = 2.0; h < 10.4; h += 1.4) k.add(pfTorus(2.19, 0.03, 3, 22), 'metal', 0x8d959b, sx, sy + h, sz, Math.PI / 2, 0, 0);
        k.add(pfPipe([[ex + 0.4, ey + 15.8, ez], [sx, sy + 11.4, sz]], 0.16, 0.4, 8), 'metal', 0x9aa3a6);
      });
      // passarela aérea ligando o topo dos silos
      const topSiloY = gh(X - 1.0, Z + 16.25) + 11.4;
      k.add(pfRBox(6.8, 0.12, 1.1, 0.02), 'metal', 0x4a5154, X - 1.0, topSiloY, Z + 16.25);
      sbRailing(k, X - 4.2, Z + 15.72, X + 2.2, Z + 15.72, topSiloY + 0.06, 0xe9b923, 1.5);
      // 4. Moinho, Cozimento & Liquefação de Milho + duto aéreo até as dornas compartilhadas
      const mx = X + 1.5, mz = Z + 9.8, my = gh(mx, mz);
      place(k, mx, mz, 0, () => {
        k.add(pfRBox(5.6, 0.6, 4.8, 0.04), 'concrete', 0x9a978f, 0, 0.25, 0);
        k.add(pfRBox(5.0, 6.2, 4.2, 0.04), 'sheet', 0xc9d0d0, 0, 3.4, 0);
        k.add(pfRBox(5.2, 0.18, 4.4, 0.03), 'paint', 0xf2c200, 0, 6.55, 0);
        sbGableRoof(k, 0, 6.65, 0, 5.4, 4.6, 0.85, 'sheet', 0x1f7d72, 0.06, 0.5);
        k.add(pfCyl(0.85, 0.85, 4.6, 16), 'paint', 0xdce2e0, -1.3, 4.2, -2.5);
        k.add(pfCyl(0.85, 0.85, 4.6, 16), 'paint', 0xdce2e0, 1.3, 4.2, -2.5);
      });
      // vapor leve no cozimento/liquefação de milho
      particles.addEmitter({ x: mx, y: my + 6.9, z: mz - 2.3, count: 5, color: 0xf4f7f8, opacity: 0.34, baseScale: 1.0, grow: 2.8, rise: 4.5, driftX: 1.1, speed: 0.25 });
      // tubulação de mosto de milho (amarelo-ouro) da Liquefação direto para as dornas compartilhadas
      k.add(pfPipe([
        [mx + 2.2, my + 5.8, mz - 1.5],
        [X + 8.5, my + 6.4, mz - 1.5],
        [X + 8.5, y0 + 6.4, Z - 0.6],
        [X + 17.2, y0 + 7.2, Z - 0.6]
      ], 0.16, 0.6, 8), 'paint', 0xd8a01c);
      // 5. Secador rotativo & Armazém de DDGS + 2 Tanques de Óleo de Milho (apron SE x=50..62, z=32..40)
      const dx = X + 26.5, dz = Z + 14.5, dy = gh(dx, dz);
      place(k, dx, dz, 0, () => {
        // base e ciclone de descarga (tambor rotativo animado montado separado abaixo)
        k.add(pfRBox(7.2, 0.4, 3.4, 0.04), 'concrete', 0x9a978f, -1.5, 0.2, 0);
        k.add(pfCyl(0.7, 0.22, 2.4, 14), 'metal', 0x8d959b, 2.6, 4.2, 0);
        k.add(pfCyl(0.7, 0.7, 1.8, 14), 'metal', 0x8d959b, 2.6, 6.2, 0);
      });
      {
        // tambor rotativo secador de DDGS girando em torno do próprio eixo longitudinal (X)
        const secGrp = new THREE.Group();
        secGrp.position.set(dx - 1.5, dy + 1.8, dz);
        const drumMat = new THREE.MeshStandardMaterial({ color: 0x7d858b, roughness: 0.45, metalness: 0.7 });
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xe9b923, roughness: 0.4, metalness: 0.25 });
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 5.8, 16), drumMat);
        drum.rotation.z = Math.PI / 2;
        drum.castShadow = true;
        secGrp.add(drum);
        for (const ox of [-1.7, 1.7]) {
          const band = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 0.28, 16), ringMat);
          band.rotation.z = Math.PI / 2;
          band.position.x = ox;
          secGrp.add(band);
        }
        // nervuras longitudinais visíveis na rotação
        for (let r = 0; r < 6; r++) {
          const a = (r / 6) * Math.PI * 2;
          const rib = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.08, 0.08), ringMat);
          rib.position.set(0, Math.cos(a) * 1.16, Math.sin(a) * 1.16);
          secGrp.add(rib);
        }
        g.add(secGrp);
        animated.secadorDdgs = secGrp;
        particles.addEmitter({ x: dx + 2.6, y: dy + 7.2, z: dz, count: 6, color: 0xf6f3ea, opacity: 0.38, baseScale: 1.1, grow: 3.0, rise: 5.0, driftX: 1.4, speed: 0.24 });
      }
      // galpão aberto de DDGS com monte dourado visível
      const gx2 = X + 32.5, gz2 = Z + 14.5, gy2 = gh(gx2, gz2);
      place(k, gx2, gz2, 0, () => {
        k.add(pfRBox(7.2, 0.4, 5.4, 0.04), 'concrete', 0xa5a29a, 0, 0.2, 0);
        k.add(pfRBox(6.8, 3.8, 4.8, 0.04), 'sheet', 0xd2d7d6, 0, 2.2, 0);
        k.add(pfBox(5.2, 2.8, 0.06), 'rough', 0x101314, 0, 1.7, -2.42);
        sbGableRoof(k, 0, 4.1, 0, 7.2, 5.2, 0.9, 'sheet', 0xc98b10, 0.06, 0.5);
        k.add(pfHeapGeo(4.8, 3.6, 1.8, 29, [0xdca840, 0xc9922c, 0xe8b954, 0xb88224]), 'rough', 0xffffff, 0, 0.35, -1.1);
      });
      // 2 tanques verticais de Óleo de Milho Bruto
      for (const [ox, oz] of [[X + 27.5, Z + 9.2], [X + 31.8, Z + 9.2]]) {
        sbTank(k, ox, oz, 1.55, 5.0, 0xe8b954, null, { ladderAngle: -Math.PI / 2, nozzle: true });
      }
      g.add(makeSign('LINHA MILHO', 'Silos, liquefação e DDGS', X - 6.0, 0, Z + 11.2, Math.PI));
      g.add(makeSign('LINHA CANA', 'Mesa, moenda e bagaço', MX0 - 1.5, 0, Z - 7.5, Math.PI));
      g.add(makeSign('FERMENTAÇÃO FLEX', 'Dornas e destilação', X + 16.2, 0, Z - 9.2, Math.PI));
      colliders.push(
        { x: tx, z: tz, r: 3.0 }, { x: ex, z: ez, r: 1.4 },
        ...silos.map(([sx, sz]) => ({ x: sx, z: sz, r: 2.5 })),
        { x: mx, z: mz, r: 3.2 },
        { x: dx - 1.0, z: dz, r: 3.0 }, { x: gx2, z: gz2, r: 3.8 },
        { x: X + 27.5, z: Z + 9.2, r: 2.0 }, { x: X + 31.8, z: Z + 9.2, r: 2.0 }
      );
    }

    sbDrum(k, X - 14.5, Z - 8.5, 0x2f687a);
    sbDrum(k, X - 13.8, Z - 8.9, 0x2f687a);
    sbPallet(k, X - 15.6, Z - 9.0, 0.3);
    sbSafetySign(k, g, 'epi', X - 4.5, 1.4, Z - 8.6, Math.PI, true);
    sbYardLamp(k, g, X - 10.5, Z - 8.5, 0.3, true, true);
    sbYardLamp(k, g, X + 9.5, Z - 8.5, -0.3, false, true);
    g.add(makeSign('INDÚSTRIA FLEX', 'Cana, milho e cogeração', s.x + 5.2, 0, s.sz, Math.PI));
    colliders.push({ x: MCX - 6, z: MCZ, r: 5.6 }, { x: MCX, z: MCZ, r: 5.6 }, { x: MCX + 6, z: MCZ, r: 5.6 }, { x: BX, z: BZ, r: 5.0 }, { x: bgx, z: bgz, r: 4.0 },
      { x: dornas[0][0], z: dornas[0][1], r: 2.5 }, { x: dornas[1][0], z: dornas[1][1], r: 2.5 }, { x: dornas[2][0], z: dornas[2][1], r: 2.5 }, { x: X + 12, z: Z - 8, r: 1.6 }, { x: MX0 - 9.5, z: Z - 1, r: 2.2 });
  }

  // ===================== 6. ARMAZÉM DE AÇÚCAR E PÁTIO (x=52, z=-22) =====================
  {
    const s = PARADAS[6], k = kits[6], g = groups[6];
    const X = s.x, Z = s.bz - 3.0, y0 = gh(X, Z);
    const W = 22, D = 11.5, H = 6.6;
    k.push(X, y0, Z);
    k.add(pfRBox(W + 0.6, 1.2, D + 0.6, 0.04), 'concrete', 0x9a978f, 0, -0.3, 0);
    k.uvWorld = 0.3;
    k.add(pfRBox(W, 1.8, D, 0.04), 'concrete', 0xd8d4ca, 0, 0.9, 0);
    k.uvWorld = 0.5;
    k.add(pfBox(W - 0.1, H - 1.8, D - 0.1), 'sheet', 0xd2d7d6, 0, 1.8 + (H - 1.8) / 2, 0);
    k.add(pfCached('arcRoof', () => { const gg = new THREE.CylinderGeometry(6.3, 6.3, W + 0.6, 24, 1, true, 0.42, Math.PI - 0.84); gg.rotateZ(Math.PI / 2); gg.scale(1, 0.42, 1); return gg; }), 'sheet', 0x1f7d72, 0, H - 6.3 * 0.42 * Math.sin(0.42), 0);
    for (const sx of [-1, 1]) k.add(pfExtrude('arcEnd', (() => { const p = []; for (let i = 0; i <= 16; i++) { const a = 0.42 + (i / 16) * (Math.PI - 0.84); p.push([Math.cos(a) * 6.3, Math.sin(a) * 6.3 * 0.42 - 6.3 * 0.42 * Math.sin(0.42)]); } return p; })(), 0.08), 'sheet', 0xd2d7d6, sx * (W / 2 - 0.04), H, 0, 0, Math.PI / 2, 0);
    k.uvWorld = 0;
    for (let i = 0; i <= 6; i++) for (const sz of [-1, 1]) sbHColumn(k, -W / 2 + i * W / 6, 0.1, sz * (D / 2 + 0.16), H, 0x2f3a3e, 0.3);
    // docas: portas de enrolar meio abertas, niveladoras, batentes, marquise e luz
    for (const dx of [-4.5, 4.5]) {
      k.add(pfBox(3.8, 4.0, 0.05), 'rough', 0x0d0f10, dx, 2.0, D / 2 + 0.03);
      k.add(pfBox(3.8, 1.6, 0.08), 'sheet', 0xb9c0c2, dx, 3.3, D / 2 + 0.07);
      k.add(pfRBox(3.6, 0.15, 1.6, 0.03), 'metal', 0x4a5154, dx, 1.15, D / 2 + 0.8);
      k.add(pfRBox(4.0, 1.2, 1.6, 0.03), 'concrete', 0xb3b0a8, dx, 0.6, D / 2 + 0.8);
      for (const s2 of [-1, 1]) k.add(pfRBox(0.25, 0.45, 0.2, 0.05), 'rubber', 0x151515, dx + s2 * 1.6, 1.0, D / 2 + 1.65);
      k.add(pfRBox(4.6, 0.14, 1.8, 0.03), 'metal', 0x5b6468, dx, 4.6, D / 2 + 0.9);
      k.add(pfRBox(0.3, 0.1, 0.2, 0.03), 'emit', pfC(0xfff1d0, 1.6), dx + 2.0, 4.4, D / 2 + 0.2);
      // big-bags de açúcar VHP (brancos) na doca esquerda e big-bags de DDGS (dourados) na doca direita
      const bagCol = dx < 0 ? 0xf2f0ea : 0xd4a44a;
      for (let i = 0; i < 3; i++) k.add(pfRBox(1.0, 1.1, 1.0, 0.15), 'cloth', bagCol, dx - 1.1 + i * 1.1, 1.75, D / 2 - 1.2);
    }
    k.add(pfHeapGeo(8, 5, 2.8, 41, [0xf4f2ec, 0xeae6dc, 0xfaf8f2, 0xe2ddd0]), 'rough', 0xffffff, -6.0, 0.1, -2.0);
    k.add(pfHeapGeo(6.5, 4.5, 2.2, 43, [0xdca840, 0xc9922c, 0xe8b954, 0xb88224]), 'rough', 0xffffff, 5.5, 0.1, -1.8);
    k.pop();
    // caminhão de contêiner encostado na doca
    place(k, X + 4.5, s.bz + 11.7, 0, () => kitTruck(k, { cabColor: 0x00877c, type: 'container', cargoColor: 0xd99b1e }));
    // empilhadeira com palete de sacaria
    place(k, X - 4.8, s.bz + 5.5, 0.65, () => { kitForklift(k); k.push(0, 0.15, 1.75); k.pop(); });
    sbBags(k, X - 4.8 + Math.sin(0.65) * 1.8, s.bz + 5.5 + Math.cos(0.65) * 1.8, 0.65, 2);
    for (let i = 0; i < 4; i++) sbBags(k, X - 11.8 + i * 1.45, s.bz + 6.6, 0, 3 - (i % 2));
    sbPallet(k, X - 13.4, s.bz + 3.6, 0.2);
    sbPallet(k, X - 13.4, s.bz + 3.6, 0.25, gh(X - 13.4, s.bz + 3.6) + 0.13);
    sbPallet(k, X - 13.4, s.bz + 3.6, 0.15, gh(X - 13.4, s.bz + 3.6) + 0.26);
    // pilha de contêineres com nervuras
    const contCols = [0x00877c, 0xb84426, 0x2b506e, 0xd99b1e, 0x6a6f73, 0x8a2f2a];
    for (let i = 0; i < 6; i++) {
      const cx = X + 13.2 + (i % 2) * 2.8, cz = s.bz + 3.5 - Math.floor(i / 2 % 3) * 3.4;
      const lvl = i >= 4 ? 1 : 0;
      sbContainer(k, cx, gh(cx, cz) + lvl * 2.6, cz, 0, contCols[i]);
    }
    sbContainer(k, X + 14.6, gh(X + 14.6, s.bz + 3.5) + 2.6, s.bz + 3.5 - 1.7, Math.PI / 2, 0x2b506e);
    sbCone(k, X - 2.0, s.bz + 9.5);
    sbCone(k, X - 1.2, s.bz + 9.8);
    sbSafetySign(k, g, 'atencao', X - 11.5, 1.4, s.bz + 8.8, 0, true);
    sbYardLamp(k, g, X - 10.5, s.bz + 8.5, Math.PI, false, true);
    g.add(makeSign('ARMAZÉM E PÁTIO', 'Açúcar, etanol e DDGS', s.x - 5.2, 0, s.sz, 0));
    colliders.push({ x: X - 6, z: Z, r: 6.0 }, { x: X + 6, z: Z, r: 6.0 }, { x: X + 14.6, z: s.bz + 0.5, r: 4.6 }, { x: X + 4.5, z: s.bz + 9.0, r: 2.4 }, { x: X + 4.5, z: s.bz + 15.5, r: 2.2 }, { x: X - 4.8, z: s.bz + 5.5, r: 1.6 });
  }

  // ===================== 7. CONTROLADORIA (x=76, z=+22) =====================
  {
    const s = PARADAS[7], k = kits[7], g = groups[7];
    const X = s.x, Z = s.bz, y0 = gh(X, Z);
    const W = 12.2, D = 8.2, FH = 3.1;
    k.push(X, y0, Z, 0, Math.PI, 0);
    k.add(pfRBox(W + 0.6, 1.2, D + 0.6, 0.04), 'concrete', 0x9a978f, 0, -0.35, 0);
    k.uvWorld = 0.3;
    k.add(pfRBox(W - 0.6, FH * 2, D - 0.6, 0.04), 'concrete', 0xe9e7e0, 0, 0.25 + FH, 0);
    k.uvWorld = 0;
    // laje, pilares, pele de vidro com montantes e brises
    for (let f = 0; f <= 2; f++) k.add(pfRBox(W + 0.3, 0.32, D + 0.3, 0.04), 'concrete', 0xf0eeea, 0, 0.25 + f * FH, 0);
    k.add(pfRBox(W + 0.4, 0.7, D + 0.4, 0.04), 'concrete', 0xf0eeea, 0, 0.25 + 2 * FH + 0.4, 0);
    k.add(pfRBox(W + 0.42, 0.14, D + 0.42, 0.02), 'paint', 0x00a99a, 0, 0.25 + FH + 0.2, 0);
    for (let f = 0; f < 2; f++) {
      const yc = 0.25 + f * FH + FH / 2 + 0.08;
      k.add(pfBox(W - 0.4, FH - 0.4, 0.04), 'iglass', 0xffffff, 0, yc, D / 2 - 0.1);
      k.add(pfBox(W - 0.4, FH - 0.4, 0.04), 'iglass', 0xffffff, 0, yc, -D / 2 + 0.1);
      for (const sx of [-1, 1]) k.add(pfBox(0.04, FH - 0.4, D - 0.4), 'iglass', 0xffffff, sx * (W / 2 - 0.1), yc, 0);
      for (let i = 0; i <= 10; i++) k.add(pfBox(0.06, FH - 0.36, 0.08), 'metal', 0x2b2e31, -W / 2 + 0.2 + i * (W - 0.4) / 10, yc, D / 2 - 0.06);
      k.add(pfBox(W - 0.3, 0.06, 0.08), 'metal', 0x2b2e31, 0, yc + 0.35, D / 2 - 0.06);
    }
    for (let i = 0; i < 13; i++) k.add(pfRBox(0.08, 2 * FH - 0.2, 0.55, 0.02), 'metal', 0xb9bfc2, -W / 2 + 0.3 + i * (W - 0.6) / 12, 0.25 + FH + 0.1, D / 2 + 0.45);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(pfRBox(0.4, 2 * FH, 0.4, 0.04), 'concrete', 0xf0eeea, sx * (W / 2 - 0.2), 0.25 + FH, sz * (D / 2 - 0.2));
    // entrada com marquise, porta de vidro e rampa
    k.add(pfRBox(4.2, 0.18, 2.6, 0.04), 'concrete', 0xf0eeea, -3.2, 2.85, D / 2 + 1.4);
    for (const sx of [-1, 1]) k.add(pfCyl(0.1, 0.1, 2.6, 10), 'metal', 0x2b2e31, -3.2 + sx * 1.8, 1.55, D / 2 + 2.5);
    k.add(pfRBox(3.2, 0.12, 2.2, 0.03), 'concrete', 0xb3b0a8, -3.2, 0.25, D / 2 + 1.3);
    // equipamentos no telhado
    for (let i = 0; i < 3; i++) {
      k.add(pfRBox(1.1, 0.75, 0.6, 0.05), 'metal', 0xc9cdcf, -3.5 + i * 2.5, 2 * FH + 1.05, -1.5);
      k.add(pfCyl(0.25, 0.25, 0.02, 14), 'metal', 0x2b2e31, -3.5 + i * 2.5, 2 * FH + 1.43, -1.5);
    }
    k.add(pfRBox(2.0, 1.4, 1.6, 0.05), 'metal', 0x9aa3a6, 3.0, 2 * FH + 1.35, 1.0);
    k.pop();
    // canteiros, banco e bicicletário
    for (const [px, pz] of [[X - 5.5, Z - 5.8], [X + 1.0, Z - 5.8], [X + 5.5, Z - 5.8]]) {
      k.add(pfRBox(2.2, 0.5, 0.9, 0.05), 'concrete', 0xc9c6be, px, gh(px, pz) + 0.25, pz);
      sbShrub(k, px - 0.5, pz, 0.7);
      sbShrub(k, px + 0.5, pz, 0.65);
    }
    sbBench(k, X - 1.8, Z - 7.2, Math.PI);
    place(k, X - 8.6, Z - 3.0, 0.2, () => kitPickup(k, 0x6a6f73));
    for (let i = 0; i < 5; i++) k.add(pfTorus(0.35, 0.025, 4, 14, Math.PI), 'metal', 0x9aa0a4, X + 3.0 + i * 0.5, gh(X + 3, Z - 6.6), Z - 6.6, 0, Math.PI / 2, 0);
    g.add(makeSign('CONTROLADORIA', 'Custos gerenciais', s.x + 5.2, 0, s.sz, Math.PI));
    colliders.push({ x: X, z: Z, r: 7.0 }, { x: X - 8.6, z: Z - 3.0, r: 2.4 });
  }

  // ===================== 8. CENTRO DE GESTÃO / ERP (x=88, z=+22) =====================
  {
    const s = PARADAS[8], k = kits[8], g = groups[8];
    const X = s.x, Z = s.bz, y0 = gh(X, Z);
    const W = 9.6, D = 7.4, H = 5.8;
    k.push(X, y0, Z, 0, Math.PI, 0);
    k.add(pfRBox(W + 0.6, 1.2, D + 0.6, 0.04), 'concrete', 0x9a978f, 0, -0.35, 0);
    k.uvWorld = 0.3;
    k.add(pfRBox(W, H, D, 0.05), 'concrete', 0x2f4a50, 0, 0.25 + H / 2, 0);
    k.uvWorld = 0;
    k.add(pfRBox(W + 0.4, 0.5, D + 0.4, 0.04), 'concrete', 0x1d3236, 0, H + 0.45, 0);
    for (const yy of [0.25 + H * 0.28, 0.25 + H * 0.72]) {
      k.add(pfBox(W - 1.0, H * 0.32, 0.04), 'iglass', 0xffffff, 0, yy, D / 2 + 0.02);
      for (let i = 0; i <= 6; i++) k.add(pfBox(0.07, H * 0.33, 0.1), 'metal', 0x15181a, -W / 2 + 0.5 + i * (W - 1) / 6, yy, D / 2 + 0.04);
    }
    k.add(pfRBox(W + 0.06, 0.18, D + 0.06, 0.02), 'emit', pfC(0x00d2c0, 1.1), 0, H - 0.2, 0);
    k.add(pfRBox(W + 0.06, 0.12, D + 0.06, 0.02), 'emit', pfC(0x00d2c0, 0.9), 0, 1.0, 0);
    k.add(pfRBox(1.8, 2.4, 0.12, 0.02), 'metal', 0x15181a, -2.8, 1.45, D / 2 + 0.04);
    k.add(pfBox(1.6, 2.2, 0.04), 'iglass', 0xffffff, -2.8, 1.4, D / 2 + 0.1);
    k.add(pfRBox(2.6, 0.14, 1.6, 0.03), 'metal', 0x2b2e31, -2.8, 2.8, D / 2 + 0.8);
    for (let i = 0; i < 3; i++) k.add(pfRBox(1.2, 0.8, 0.7, 0.05), 'metal', 0xc9cdcf, -2.5 + i * 2.2, H + 1.1, 1.2);
    k.pop();
    // torre de telecomunicação treliçada com parabólicas e antenas
    const mx = X + 6.0, mz = Z - 2.2, my = gh(mx, mz);
    k.push(mx, my, mz);
    k.add(pfRBox(1.8, 0.4, 1.8, 0.04), 'concrete', 0x9a978f, 0, 0.1, 0);
    const lg = [[-0.45, -0.45], [0.45, -0.45], [0.45, 0.45], [-0.45, 0.45]];
    for (const [lx, lz] of lg) k.rod(lx, 0.25, lz, lx * 0.35, 16.0, lz * 0.35, 0.04, 'metal', 0xa9b1b5, 6);
    const det8 = k.detail; k.detail = true;
    for (let y = 0.8; y < 15.5; y += 1.2) {
      const f0 = 1 - (y / 16) * 0.65, f1 = 1 - ((y + 1.2) / 16) * 0.65;
      for (let i = 0; i < 4; i++) {
        const [ax, az] = lg[i], [bx, bz] = lg[(i + 1) % 4];
        k.rod(ax * f0, y, az * f0, bx * f1, y + 1.2, bz * f1, 0.015, 'metal', 0xa9b1b5, 4);
        k.rod(ax * f0, y, az * f0, bx * f0, y, bz * f0, 0.015, 'metal', 0xa9b1b5, 4);
      }
    }
    k.detail = det8;
    for (let y = 1; y < 16; y += 2) k.add(pfBox(0.08, 0.08, 0.08), 'paint', y % 4 < 2 ? 0xc8281e : 0xf4f4ef, 0, y, 0);
    k.add(pfSphere(0.95, 18, 6, 0, Math.PI * 0.32), 'paint', 0xf0f4f2, 0.2, 12.0, 0.4, -1.4, 0.3, 0);
    k.add(pfSphere(0.6, 16, 6, 0, Math.PI * 0.32), 'paint', 0xf0f4f2, -0.3, 9.5, -0.2, -1.6, 2.6, 0);
    for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283; k.add(pfRBox(0.25, 1.4, 0.1, 0.03), 'paint', 0xe8eae6, Math.cos(a) * 0.35, 14.6, Math.sin(a) * 0.35, 0, -a, 0); }
    k.add(pfCyl(0.08, 0.1, 0.15, 8), 'beacon', pfC(0xff2a1a, 1.8), 0, 16.15, 0);
    k.pop();
    // gerador em contêiner e tanque de diesel
    place(k, X + 6.5, Z + 3.0, Math.PI / 2, () => {
      kitContainer(k, 4.2, 0x2b506e, { detailRibs: true });
      k.add(pfCyl(0.25, 0.25, 1.2, 10), 'metal', 0x2b2e31, 0.6, 3.1, 1.2);
    });
    place(k, X + 6.5, Z + 6.6, 0, () => {
      k.add(pfCapsule(0.55, 1.4, 4, 12), 'paint', 0xd8dcdc, 0, 0.75, 0, 0, 0, Math.PI / 2);
      for (const sx of [-0.6, 0.6]) k.add(pfRBox(0.12, 0.4, 0.9, 0.02), 'metal', 0x2b2e31, sx, 0.2, 0);
    });
    g.add(makeSign('CENTRO DE GESTÃO', 'Integração ERP', s.x + 4.2, 0, s.sz, Math.PI));
    colliders.push({ x: X, z: Z, r: 6.0 }, { x: mx, z: mz, r: 1.5 }, { x: X + 6.5, z: Z + 3.0, r: 2.2 });
  }

  // ===================== 9. PORTO / TERMINAL (x=98, z=-22) =====================
  {
    const s = PARADAS[9], k = kits[9], g = groups[9];
    // escritório de despacho portuário
    const ox = s.x - 1.0, oz = s.bz - 1.5;
    place(k, ox, oz, 0, () => sbBuilding(k, 8.2, 6.0, 3.6, { wall: 0xe8e4da, roof: 0x28363a, windows: [['f', -2.4, 1.9, 1.6, 1.3], ['f', 2.4, 1.9, 1.6, 1.3], ['l', 0, 1.9, 1.6, 1.3], ['r', 0, 1.9, 1.6, 1.3]], frame: 0x2f3a3e, door: [0, 1.1], glass: 'iglass', lit: false }));
    // cais: pavimento, face de concreto, defensas, cabeços, trilhos do guindaste e faixa amarela
    const QX = 109.0;
    k.uvWorld = 0.25;
    k.add(pfBox(5.0, 0.3, 58), 'concrete', 0xb9b6ae, QX - 2.5, 0.0, -2);
    k.add(pfBox(1.0, 3.2, 58), 'concrete', 0x9a978f, QX - 0.4, -1.45, -2);
    k.uvWorld = 0;
    k.add(pfBox(0.25, 0.04, 58), 'paint', 0xf2c200, QX - 1.2, 0.17, -2);
    for (const rx of [QX - 6.6, QX - 0.6]) k.add(pfBox(0.12, 0.08, 58), 'metal', 0x6f777b, rx, 0.17, -2);
    for (let z = -30; z <= 26; z += 7) {
      k.add(pfCyl(0.45, 0.45, 1.8, 14), 'rubber', 0x151515, QX + 0.35, -0.6, z, Math.PI / 2, 0, 0);
      k.add(pfLathe('bollard', [[0, 0], [0.32, 0], [0.32, 0.08], [0.18, 0.12], [0.16, 0.42], [0.28, 0.5], [0.28, 0.58], [0, 0.6]], 12), 'paint', 0x2b2e31, QX - 0.9, 0.15, z + 3.5);
    }
    // guindaste de pórtico (parte giratória é animada)
    const CX = 105.6, CZ = -6.5;
    k.push(CX, 0.15, CZ);
    kitPortCrane(k);
    k.pop();
    const crane = buildPortCrane(matLib);
    crane.position.set(CX, 0.15, CZ);
    g.add(crane);
    animated.crane = crane;
    // navio atracado + espias
    const SX = 116.4, SZ = -4.0, SY = 0.3;
    k.push(SX, SY, SZ);
    kitShip(k);
    k.pop();
    for (const z of [-19, -10, 0, 10]) sbWire(k, SX - 5.6, SY + 4.95, SZ + z, QX - 0.9, 0.7, SZ + z + (z < 0 ? -2.5 : 2.5), 0.5);
    // pátio de contêineres
    const cc = [0x00877c, 0xd99b1e, 0xb84026, 0x2c4a66, 0x6a6f73, 0x8a2f2a];
    let ci = 0;
    for (let col = 0; col < 3; col++) for (let row = 0; row < 2; row++) {
      const h = (col + row) % 3 + 1;
      for (let l = 0; l < h; l++) {
        const cx = 81 + col * 2.8, cz = -31 + row * 6.5;
        sbContainer(k, cx, gh(cx, cz) + l * 2.6, cz, 0, cc[(ci++) % cc.length]);
      }
    }
    // carreta com contêiner no pátio
    place(k, 86.5, -14.0, Math.PI / 2, () => kitTruck(k, { cabColor: 0x00877c, type: 'container', cargoColor: 0xd99b1e }));
    // torre de iluminação
    place(k, 101.5, -32.0, 0, () => {
      k.add(pfRBox(1.2, 0.5, 1.2, 0.04), 'concrete', 0x9a978f, 0, 0.1, 0);
      k.add(pfCyl(0.18, 0.32, 20, 10), 'metal', 0x8d959b, 0, 10.2, 0);
      k.add(pfTorus(1.0, 0.06, 4, 16), 'metal', 0x5b6468, 0, 20.2, 0, Math.PI / 2, 0, 0);
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; k.add(pfRBox(0.5, 0.35, 0.18, 0.03), 'metal', 0x2b2e31, Math.cos(a) * 1.0, 20.0, Math.sin(a) * 1.0, -0.6, -a + Math.PI / 2, 0); }
    });
    sbDrum(k, 94.0, -14.5, 0x2b5f70);
    sbDrum(k, 94.6, -14.9, 0x2b5f70);
    sbCone(k, 92.0, -11.5);
    sbCone(k, 103.0, -11.0);
    sbSafetySign(k, g, 'epi', 103.5, 1.4, -12.5, 0, true);
    sbYardLamp(k, g, s.x + 4.5, s.bz + 10.5, -1.2, true, true);
    sbYardLamp(k, g, 104.5, 6.0, 1.57, false, true);
    g.add(makeSign('PORTO', 'Comercialização', s.x - 5.2, 0, s.sz, 0));
    colliders.push({ x: ox, z: oz, r: 5.2 }, { x: 84, z: -28, r: 6.0 }, { x: 82, z: -14, r: 2.5 }, { x: 88.5, z: -14, r: 2.5 }, { x: 93.5, z: -14, r: 1.6 },
      { x: CX - 3, z: CZ - 3, r: 0.9 }, { x: CX + 3, z: CZ - 3, r: 0.9 }, { x: CX - 3, z: CZ + 3, r: 0.9 }, { x: CX + 3, z: CZ + 3, r: 0.9 }, { x: 101.5, z: -32, r: 0.9 });
  }

  // ===================== PERSONAGENS =====================
  const npcConfigs = [
    { shirt: 0x2e6b3a, pants: 3426667, helmet: false, vest: false, skin: 0xb07a55, hair: 0x2a1a10, hat: 'bone', hatColor: 0x1f4f46 },                 // Helena: polo, jeans e boné
    { shirt: 0x7d7f78, pants: 3426667, helmet: false, vest: true, skin: 0x9a6644, hair: 0x1a120c, hat: 'bone', hatColor: 0x3a3a36, barba: true },  // Caio
    { shirt: 0x00877c, pants: 3426667, helmetColor: 0xf4f6f4, vest: true, skin: 0x7a4e33, hair: 0x120c08 },                                       // Marta
    { shirt: 0x8a6a4a, pants: 0x4a4436, helmet: false, vest: false, skin: 0x8a5a3c, hair: 0x14100c, hat: 'chapeu', bigode: true, lenco: 0xb3402a, tablet: false }, // Tião: chapéu de palha e lenço
    { shirt: 0x2b4a6e, pants: 0x2b4a6e, helmet: false, vest: false, skin: 0xc08860, hair: 0x2a1a10, hat: 'bone', hatColor: 0x23384f, bigode: true }, // Rui: macacão da oficina
    { shirt: 0xe8ecea, pants: 3426667, helmetColor: 0x00b3a4, vest: true, skin: 0xc48b66, hair: 0x14100c },                                       // Sílvia
    { shirt: 0x00877c, pants: 3426667, helmetColor: 0xffb629, vest: true, skin: 0x5a3622, hair: 0x0e0a08, barba: true },                          // Jonas
    { shirt: 0x2a4448, pants: 0x1e2428, helmet: false, vest: false, skin: 0xd09a74, hair: 0x5a3a22 },                                         // Paula
    { shirt: 0x00665e, pants: 3426667, helmet: false, vest: false, skin: 0x8a5a3c, hair: 0x14100c, bigode: true, tablet: false },                 // Rodrigo
    { shirt: 0x223846, pants: 3426667, helmetColor: 0xf4f6f4, vest: true, skin: 0xa8714f, hair: 0x1a120c, bigode: true }                          // André
  ];
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffb629, side: THREE.DoubleSide, transparent: true, opacity: 0.72 });
  const ringGeo = new THREE.RingGeometry(0.95, 1.15, 32);
  PARADAS.forEach((s, idx) => {
    const person = buildPerson(matLib, npcConfigs[idx]);
    const py = gh(s.x, s.nz);
    person.position.set(s.x, py, s.nz);
    person.rotation.y = s.lado > 0 ? Math.PI : 0;
    person.userData.anim.yaw = person.rotation.y;
    person.userData.anim.baseY = py;
    groups[idx].add(person);
    s.person = person;
    animated.people.push(person);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(s.x, py + 0.03, s.nz);
    groups[idx].add(ring);
    s.ring = ring;
  });

  // Fiscal do trabalho (Valdemar): capacete branco, colete refletivo, prancheta na mão; fica na portaria e aparece à frente do executivo nas advertências
  {
    const vx0 = -108.5, vz0 = -6.8, vy0 = gh(vx0, vz0), vyaw0 = 0.28;
    const valdemar = buildPerson(matLib, {
      shirt: 0x1f4f46, pants: 0x1e2428, helmetColor: 0xf4f6f4, vest: true,
      skin: 0x9a6848, hair: 0x221812, bigode: true, tablet: true
    });
    valdemar.name = 'npc-valdemar';
    valdemar.position.set(vx0, vy0, vz0);
    valdemar.rotation.y = vyaw0;
    valdemar.userData.anim.yaw = vyaw0;
    valdemar.userData.anim.baseY = vy0;
    valdemar.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
    stopGroup.add(valdemar);
    animated.people.push(valdemar);
    window.__SAFRA_VALDEMAR__ = {
      person: valdemar,
      homeX: vx0,
      homeZ: vz0,
      ativo: false,
      _timer: null,
      irAte(tx, tz, yawPlayer = 0) {
        const ty = gh(tx, tz);
        const faceYaw = yawPlayer + Math.PI;
        valdemar.position.set(tx, ty, tz);
        valdemar.rotation.y = faceYaw;
        if (valdemar.userData.anim) {
          valdemar.userData.anim.yaw = faceYaw;
          valdemar.userData.anim.baseY = ty;
        }
        valdemar.visible = true;
        this.ativo = true;
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(() => this.voltar(), 6000);
      },
      voltar() {
        if (this._timer) { clearTimeout(this._timer); this._timer = null; }
        valdemar.position.set(vx0, vy0, vz0);
        valdemar.rotation.y = vyaw0;
        if (valdemar.userData.anim) {
          valdemar.userData.anim.yaw = vyaw0;
          valdemar.userData.anim.baseY = vy0;
        }
        this.ativo = false;
      }
    };
  }

  // ===================== SELO DE SOLUÇÃO: placa baixa ao lado de cada NPC; sobe quando a parada é concluída =====================
  const selos = [];
  {
    const metalSelo = new THREE.MeshStandardMaterial({ color: 0x5b6468, roughness: 0.6, metalness: 0.4 });
    PARADAS.forEach((s, idx) => {
      const sel = new THREE.Group();
      sel.name = 'selo-' + s.id;
      // fica dois metros atrás do NPC, do lado oposto à estrada (estrada no lado z = 0)
      const selX = s.x + 0.8, selZ = s.nz + s.lado * 1.8;
      sel.position.set(selX, gh(selX, selZ), selZ);
      sel.rotation.y = s.lado > 0 ? Math.PI : 0;
      sel.visible = false;
      sel.scale.setScalar(0.001);
      // texto: nome do produto (cartão), ou a operação, e a linha de resolvido
      const c = document.createElement('canvas'); c.width = 512; c.height = 300; const cg = c.getContext('2d');
      cg.fillStyle = '#0b1a1c'; cg.fillRect(0, 0, 512, 300);
      cg.fillStyle = '#3fae2a'; cg.fillRect(0, 0, 512, 16); cg.fillRect(0, 284, 512, 16);
      cg.fillStyle = '#ffffff'; cg.textBaseline = 'top';
      const nome = (s.cartao && s.cartao.produto) || (s.op && s.op[0] && s.op[0][0]) || s.lugar;
      const quebra = tam => {
        cg.font = `700 ${tam}px sans-serif`;
        const out = []; let l = '';
        for (const w of nome.split(' ')) { if (l && cg.measureText(l + w).width > 400) { out.push(l.trim()); l = ''; } l += w + ' '; }
        out.push(l.trim()); return out;
      };
      let tam = 60, linhas = quebra(tam);
      if (linhas.length > 2) { tam = 46; linhas = quebra(tam); }
      cg.font = `700 ${tam}px sans-serif`;
      linhas.slice(0, 2).forEach((l, i) => cg.fillText(l, 36, 44 + i * (tam + 12)));
      cg.fillStyle = '#3fae2a'; cg.font = '800 56px sans-serif'; cg.fillText('Resolvido', 36, 196);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const dark = new THREE.MeshStandardMaterial({ color: 0x0b1a1c, roughness: 0.7 });
      const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
      // placa 1,6x a anterior (1,0 x 0,6); topo a 1,37 m, abaixo de 1,6 m
      const placa = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6 * 300 / 512, 0.05), [dark, dark, dark, dark, face, dark]);
      placa.position.set(0, 0.9, 0); placa.castShadow = true; sel.add(placa);
      for (const px of [-0.56, 0.56]) {
        const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.46, 8), metalSelo);
        poste.position.set(px, 0.23, 0); sel.add(poste);
      }
      // na oficina, uma lâmpada verde acende por 3 s quando a parada é concluída
      let lamp = null;
      if (s.id === 'auto') {
        lamp = new THREE.MeshStandardMaterial({ color: 0x1d3b22, emissive: 0x3fae2a, emissiveIntensity: 0, roughness: 0.4 });
        const bulbo = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), lamp);
        bulbo.position.set(0.7, 1.28, 0.04); sel.add(bulbo);
      }
      groups[idx].add(sel);
      selos.push({ id: s.id, grp: sel, lamp, prog: 0, started: false, glow: 0 });
    });
  }
  animated.selos = selos;

  // ===================== SINAIS TRANSVERSAIS NA ESTRADA =====================
  const orbMat = new THREE.MeshStandardMaterial({ color: 0xffb629, emissive: 0xffa800, emissiveIntensity: 1.2, roughness: 0.2 });
  // Painéis no acostamento (antes eram totens plantados no meio da pista)
  const sinalTex = sg => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 304; const g = c.getContext('2d');
    g.fillStyle = '#0e2a2c'; g.fillRect(0, 0, 512, 304);
    g.fillStyle = '#00af9c'; g.fillRect(0, 0, 512, 12); g.fillRect(0, 0, 12, 304);
    g.fillStyle = '#9ff3e4'; g.font = '700 18px "Public Sans", Inter, sans-serif'; g.fillText('PLATAFORMA · ' + sg.p.toUpperCase(), 32, 46);
    g.fillStyle = '#ffffff'; g.font = '800 34px "Public Sans", Inter, sans-serif';
    let line = '', y = 98; for (const w of sg.n.split(' ')) { if (g.measureText(line + w).width > 448) { g.fillText(line, 32, y); y += 42; line = ''; } line += w + ' '; } g.fillText(line, 32, y);
    g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '500 18px "Public Sans", Inter, sans-serif'; g.fillText(sg.c.slice(0, 3).join(' · '), 32, 282, 448);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  };
  SINAIS.forEach(sg => {
    const k = kits[kitNear(sg.x)];
    const tot = new THREE.Group();
    const y = gh(sg.x, sg.z);
    // painel 1,6 m de largura, base a 1,8 m; postes ATRÁS do painel (lado +z), nunca na face
    const SB_Y = 2.28, SB_W = 1.6, SB_H = 0.95;
    for (const dx of [-0.6, 0.6]) {
      k.add(pfCyl(0.04, 0.045, SB_Y, 10), 'metal', 0x2f3a3e, sg.x + dx, y + SB_Y / 2, sg.z + 0.12);
      k.add(pfRBox(0.22, 0.14, 0.22, 0.03), 'concrete', 0x9a978f, sg.x + dx, y + 0.07, sg.z + 0.12);
    }
    k.add(pfRBox(SB_W + 0.1, SB_H + 0.1, 0.08, 0.02), 'paint', 0x1b2326, sg.x, y + SB_Y, sg.z + 0.05);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(SB_W, SB_H), new THREE.MeshStandardMaterial({ map: sinalTex(sg), roughness: 0.55, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0 }));
    face.position.set(0, SB_Y, -0.005); face.rotation.y = Math.PI; tot.add(face);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), orbMat);
    orb.position.set(0.66, SB_Y + SB_H / 2 + 0.12, 0);
    tot.add(orb);
    tot.position.set(sg.x, y, sg.z);
    groups[kitNear(sg.x)].add(tot);
    sg.mesh = orb;
    sg.group = tot;
    animated.beacons.push(orb);
  });

  // ===================== EASTER EGGS =====================
  {
    const k0 = kits[kitNear(EASTER[0].x)];
    // cartão sobre um arquivo de aço na controladoria
    const w = EASTER[0], yw = gh(w.x, w.z);
    k0.add(pfRBox(0.5, 0.9, 0.6, 0.02), 'metal', 0x7d8790, w.x, yw + 0.45, w.z);
    for (let d = 0; d < 3; d++) k0.add(pfRBox(0.3, 0.03, 0.02, 0.008), 'metal', 0x3a4246, w.x, yw + 0.2 + d * 0.28, w.z + 0.305);
    const cc = document.createElement('canvas'); cc.width = 256; cc.height = 160; const cg = cc.getContext('2d');
    const gr = cg.createLinearGradient(0, 0, 256, 160); gr.addColorStop(0, '#2a1446'); gr.addColorStop(1, '#5b2a86');
    cg.fillStyle = gr; cg.fillRect(0, 0, 256, 160); cg.fillStyle = '#fff'; cg.font = '800 38px "Public Sans", Inter, sans-serif'; cg.fillText('wiipo', 20, 60);
    cg.fillStyle = '#d9b44a'; cg.fillRect(20, 84, 34, 26); cg.fillStyle = 'rgba(255,255,255,.8)'; cg.font = '600 15px monospace'; cg.fillText('**** 2026', 20, 140);
    const ct = new THREE.CanvasTexture(cc); ct.colorSpace = THREE.SRGBColorSpace;
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.004, 0.108), [0, 0, new THREE.MeshStandardMaterial({ map: ct, roughness: 0.35 }), 0, 0, 0].map(m => m || new THREE.MeshStandardMaterial({ color: 0x2a1446 })));
    card.position.set(w.x, yw + 0.905, w.z); card.rotation.y = 0.5; groups[kitNear(w.x)].add(card);
    w.mesh = card;
    // pasta azul embaixo de um palete no armazém
    const p = EASTER[2], yp = gh(p.x, p.z), kp = kits[kitNear(p.x)];
    for (let r = 0; r < 3; r++) kp.add(pfRBox(1.2, 0.1, 0.12, 0.01), 'wood', 0xa98a5c, p.x, yp + 0.18, p.z - 0.45 + r * 0.45);
    for (let r = 0; r < 5; r++) kp.add(pfRBox(0.12, 0.03, 1.0, 0.005), 'wood', 0xb79a6a, p.x - 0.5 + r * 0.25, yp + 0.245, p.z);
    const pasta = new THREE.Group();
    pasta.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.25), new THREE.MeshStandardMaterial({ color: 0x1f4fa8, roughness: 0.5 })));
    const papel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.22), new THREE.MeshStandardMaterial({ color: 0xf2efe4 })); papel.position.set(0.02, 0.012, 0.01); pasta.add(papel);
    pasta.position.set(p.x + 0.15, yp + 0.03, p.z + 0.58); pasta.rotation.y = 0.35; // metade pra fora do palete
    groups[kitNear(p.x)].add(pasta);
    p.mesh = pasta;
    // capivara pastando no gramado da sede
    const c = EASTER[1], yc = gh(c.x, c.z);
    const capi = new THREE.Group(), pelo = new THREE.MeshStandardMaterial({ color: 0x7a5636, roughness: 0.95 }), escuro = new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 0.9 });
    const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), pelo); corpo.scale.set(1.45, 0.92, 0.9); corpo.position.y = 0.5; corpo.castShadow = true; capi.add(corpo);
    const cab = new THREE.Group(); cab.position.set(0.6, 0.62, 0);
    const cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.26), pelo); cabeca.geometry.translate(0.12, 0, 0); cab.add(cabeca);
    const fucinho = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), pelo); fucinho.scale.set(0.9, 1, 1.05); fucinho.position.set(0.32, -0.02, 0); cab.add(fucinho);
    for (const s of [-1, 1]) {
      const olho = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), escuro); olho.position.set(0.16, 0.08, s * 0.125); cab.add(olho);
      const orelha = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), escuro); orelha.scale.set(0.6, 1, 0.9); orelha.position.set(-0.02, 0.16, s * 0.1); cab.add(orelha);
    }
    const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), escuro); nariz.position.set(0.44, 0.02, 0); cab.add(nariz);
    capi.add(cab);
    for (const [lx, lz] of [[0.38, 0.2], [0.38, -0.2], [-0.4, 0.22], [-0.4, -0.22]]) { const perna = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.3, 8), pelo); perna.position.set(lx, 0.15, lz); capi.add(perna); }
    capi.position.set(c.x, yc, c.z); capi.rotation.y = 0.8; groups[kitNear(c.x)].add(capi);
    c.mesh = capi; c.head = cab;
    animated.capivara = c;
  }

  // ===================== PAINEL DA SAFRA: uma lâmpada por parada, na beira da estrada =====================
  {
    // painel de identificação: 1,6 m de largura, base a 2,0 m; dois postes ATRÁS da placa, nas laterais
    const PX = -109.0, PZ = -7.8, PY = sbGround(PX, PZ), BW = 1.6, BH = 0.8, BASE = 2.0, BC = PY + BASE + BH / 2;
    const pg = new THREE.Group(); pg.name = 'painel-safra'; scene.add(pg);
    const metal = new THREE.MeshStandardMaterial({ color: 0x5b6468, roughness: 0.6, metalness: 0.4 });
    for (const sx of [-0.5, 0.5]) {
      const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, BASE + BH / 2, 8), metal);
      poste.position.set(PX + sx, PY + (BASE + BH / 2) / 2, PZ - 0.07); poste.castShadow = true; pg.add(poste);
    }
    // placa escura com título; a face +z (virada para a estrada) recebe a textura
    const tc = document.createElement('canvas'); tc.width = 1024; tc.height = 512; const tg = tc.getContext('2d');
    tg.fillStyle = '#1d2b36'; tg.fillRect(0, 0, 1024, 512);
    tg.fillStyle = '#fff'; tg.font = 'bold 96px sans-serif'; tg.textAlign = 'center'; tg.textBaseline = 'middle';
    tg.fillText('PAINEL DA SAFRA', 512, 140);
    tg.fillStyle = '#3fae2a'; tg.fillRect(150, 218, 724, 8);
    tg.fillStyle = 'rgba(255,255,255,0.7)'; tg.font = '500 40px sans-serif'; tg.fillText('uma lâmpada por parada', 512, 292);
    const tTex = new THREE.CanvasTexture(tc); tTex.colorSpace = THREE.SRGBColorSpace;
    const placaMats = [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({ color: 0x1d2b36, roughness: 0.7 }));
    placaMats.push(new THREE.MeshStandardMaterial({ map: tTex, roughness: 0.6 }), new THREE.MeshStandardMaterial({ color: 0x1d2b36, roughness: 0.7 }));
    const placa = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, 0.08), placaMats);
    placa.position.set(PX, BC, PZ); placa.castShadow = true; pg.add(placa);
    // dez lâmpadas em linha, na metade de baixo da placa
    const lamps = [];
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x3b4347, emissive: 0x3fae2a, emissiveIntensity: 0, roughness: 0.4 });
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), mat);
      lamp.rotation.x = Math.PI / 2;
      lamp.position.set(PX - 0.65 + 0.065 + i * 0.13, BC - 0.2, PZ + 0.055);
      pg.add(lamp); lamps.push(lamp);
    }
    colliders.push({ x: PX - 0.5, z: PZ - 0.07, r: 0.25 }, { x: PX + 0.5, z: PZ - 0.07, r: 0.25 });
    animated.painel = { lamps };
  }

  // ===================== TRÁFEGO: bitrem de cana (+X) e graneleiro de milho (-X) em duas mãos =====================
  {
    const trafego = [];
    for (const [lane, fase, cor, type] of [[1.9, 0.08, 0xe4e6e2, 'cana'], [-1.9, 0.58, 0x2b506e, 'milho']]) {
      const tk = buildTruck(matLib, { cabColor: cor, type });
      tk.traverse(o => { if (o.isMesh) o.castShadow = true; });
      // faróis que piscam quando alguém está na frente (descobre a frente do modelo pela caixa)
      const bb = new THREE.Box3().setFromObject(tk), frenteZ = bb.max.z;
      const farolMat = new THREE.MeshBasicMaterial({ color: 0xfff1c9, transparent: true, opacity: 0.25, toneMapped: false });
      const farois = [];
      for (const s of [-0.75, 0.75]) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), farolMat); f.position.set(s, 1.05, frenteZ + 0.02); tk.add(f); farois.push(f);
      }
      const halo = new THREE.PointLight(0xfff1c9, 0, 14, 2); halo.position.set(0, 1.1, frenteZ + 1.2); tk.add(halo);
      scene.add(tk);
      trafego.push({ g: tk, lane, fase, type, farolMat, halo, vel: 1 });
    }
    animated.trafego = trafego;
    window.__SAFRA_TRAFEGO__ = trafego;
  }

  // ===================== EVIDÊNCIAS COMO OBJETOS =====================
  const evSpecs = {
    'ev-plan1': ['quadro', ['PLANO DE SAFRA', 'Plantio e reforma', 'Colheita · Orçamento', 'Recursos · à mão']],
    'ev-plan2': ['mesa', ['RECURSOS', 'Máquinas por frente', 'Equipes por turno', 'Planilha impressa'], '#f4f1e6'],
    'ev-geo1': ['estaca'],
    'ev-geo2': ['caixa'],
    'ev-agri1': ['prancheta', ['APONTAMENTO', 'Frente 3 · turno A', 'Operações do dia', 'Lançar na sede'], '#f4f1e6'],
    'ev-agri2': ['cana'],
    'ev-auto1': ['ordem', ['ORDEM DE SERVIÇO', 'Preventiva · trator', 'VENCIDA', 'Sem assinatura'], '#f6efe0'],
    'ev-auto2': ['caderno', ['ABASTECIMENTO', 'Litros por máquina', 'Anotado à mão'], '#f4f1e6']
  };
  const paperMats = [];
  EVIDENCIAS.forEach(ev => {
    const spec = evSpecs[ev.id];
    const si = PARADAS.findIndex(p => p.id === ev.st);
    const k = kits[si >= 0 ? si : kitNear(ev.x)];
    const grp = groups[si >= 0 ? si : kitNear(ev.x)];
    const y0 = gh(ev.x, ev.z);
    const g = new THREE.Group();
    g.position.set(ev.x, y0, ev.z);
    const face = Math.atan2(PARADAS[si].x - ev.x, (PARADAS[si].nz + (PARADAS[si].lado > 0 ? -4 : 4)) - ev.z);
    const paper = (tex, w, h, x, y, z, rx, ry) => {
      const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
      paperMats.push(m);
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      pm.position.set(x, y, z); pm.rotation.set(rx, ry, 0, 'YXZ');
      pm.receiveShadow = true;
      g.add(pm);
    };
    k.push(ev.x, y0, ev.z, 0, face, 0);
    if (spec[0] === 'quadro') {
      for (const sx of [-0.8, 0.8]) k.add(pfRBox(0.09, 1.95, 0.09, 0.02), 'wood', 0x6d4a2c, sx, 0.97, -0.04);
      k.add(pfRBox(1.75, 1.18, 0.06, 0.02), 'wood', 0x5d3a22, 0, 1.38, 0);
      k.add(pfRBox(1.9, 0.08, 0.2, 0.02), 'wood', 0x5d3a22, 0, 2.02, 0.04);
      paper(sbCorkTexture(spec[1]), 1.6, 1.04, 0, 1.38, 0.035, 0, 0);
      // papel pendurado por uma tachinha só (~35 graus), caído no chão e mesinha com pastas e caneca
      const hang = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.44), new THREE.MeshStandardMaterial({ map: sbPaperTexture(['PLANO v2', 'sem data', 'sem assinatura'], '#f4f1e6'), roughness: 0.85, side: THREE.DoubleSide }));
      const hA = 0.61, hD = 0.22, pinX = 0.62, pinY = 1.8;
      hang.position.set(pinX + hD * Math.sin(hA), pinY - hD * Math.cos(hA), 0.09); hang.rotation.z = hA; g.add(hang);
      const floorP = new THREE.Group(); floorP.position.set(0.4, 0.012, 0.62); floorP.rotation.y = 0.5;
      const fm = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshStandardMaterial({ map: sbPaperTexture(['Ordem de compra', 'rascunho', 'não foi'], '#f6f3ea'), roughness: 0.9 }));
      fm.rotation.x = -Math.PI / 2; floorP.add(fm); g.add(floorP);
      k.add(pfRBox(1.2, 0.05, 0.5, 0.01), 'wood', 0x8a5f38, 1.25, 0.75, 0.45);
      for (const [lx, lz] of [[0.7, 0.25], [1.8, 0.25], [0.7, 0.65], [1.8, 0.65]]) k.add(pfBox(0.05, 0.73, 0.05), 'wood', 0x6d4a2c, lx, 0.37, lz);
      k.add(pfBox(0.3, 0.04, 0.22), 'paint', 0x2b6cb0, 1.1, 0.8, 0.45, 0, 0.15, 0);
      k.add(pfBox(0.3, 0.04, 0.22), 'paint', 0xd9a441, 1.15, 0.84, 0.44, 0, -0.1, 0);
      k.add(pfBox(0.3, 0.04, 0.22), 'paint', 0x3a7d44, 1.08, 0.88, 0.47, 0, 0.3, 0);
      k.add(pfCyl(0.05, 0.045, 0.11, 10), 'paint', 0xf4f4ef, 1.6, 0.83, 0.55);
    } else if (spec[0] === 'mesa') {
      k.add(pfRBox(1.3, 0.05, 0.7, 0.01), 'wood', 0x8a5f38, 0, 0.78, 0);
      for (const [lx, lz] of [[-0.58, -0.28], [0.58, -0.28], [-0.58, 0.28], [0.58, 0.28]]) k.add(pfBox(0.05, 0.76, 0.05), 'wood', 0x6d4a2c, lx, 0.38, lz);
      k.add(pfRBox(0.25, 0.32, 0.02, 0.01), 'paint', 0x6b4a2c, 0.3, 0.815, 0.05, -Math.PI / 2, 0, 0.2);
      k.add(pfCyl(0.04, 0.035, 0.1, 10), 'paint', 0xf4f4ef, -0.45, 0.85, -0.15);
      paper(sbPaperTexture(spec[1], spec[2]), 0.42, 0.56, -0.12, 0.807, 0.02, -Math.PI / 2, -0.15);
      paper(sbPaperTexture(['', '', '', ''], '#eef2f4'), 0.42, 0.56, 0.32, 0.825, 0.06, -Math.PI / 2, 0.2);
    } else if (spec[0] === 'prancheta' || spec[0] === 'ordem') {
      k.add(pfRBox(0.08, 1.35, 0.08, 0.02), 'wood', 0x6d4a2c, 0, 0.67, -0.06);
      k.add(pfRBox(0.62, 0.8, 0.03, 0.01), spec[0] === 'ordem' ? 'wood' : 'paint', spec[0] === 'ordem' ? 0x9c8058 : 0x7a5232, 0, 1.3, 0, -0.12, 0, 0);
      k.add(pfRBox(0.22, 0.05, 0.05, 0.01), 'metal', 0xc9cfd2, 0, 1.66, 0.04, -0.12, 0, 0);
      paper(sbPaperTexture(spec[1], spec[2], spec[0] === 'ordem' ? { alert: 'VENCIDA' } : {}), 0.54, 0.7, 0, 1.28, 0.025, -0.12, 0);
    } else if (spec[0] === 'caderno') {
      k.add(pfRBox(0.36, 0.02, 0.26, 0.005), 'paint', 0x1f4f8a, -0.2, 1.06, 0.0, 0, 0.1, 0);
      k.add(pfCyl(0.006, 0.006, 0.14, 5), 'paint', 0x1f5fa8, 0.15, 1.055, 0.08, 0, 0.6, Math.PI / 2);
      paper(sbPaperTexture(spec[1], spec[2]), 0.32, 0.24, 0.12, 1.052, 0.0, -Math.PI / 2, -0.15);
    } else if (spec[0] === 'estaca') {
      const u = k.uvWorld; k.uvWorld = 1;
      k.add(pfRBox(0.07, 1.3, 0.07, 0.015), 'wood', 0xb08a58, 0, 0.62, 0);
      k.uvWorld = u;
      k.add(pfBox(0.02, 0.22, 0.36), 'cloth', 0xff6a14, 0, 1.15, 0.17, 0, 0, 0.12);
      k.add(pfRBox(0.32, 0.22, 0.02, 0.01), 'paint', 0xf4f4ef, 0, 0.85, 0.045);
      for (let i = 0; i < 5; i++) k.add(pfCyl(0.012, 0.012, 0.6 + i * 0.1, 4), 'rough', 0xd8b04a, Math.cos(i * 1.3) * 0.3, 0.3, Math.sin(i * 1.3) * 0.3, 0, 0, 0.2);
    } else if (spec[0] === 'caixa') {
      k.add(pfRBox(0.9, 0.2, 0.6, 0.03), 'concrete', 0x9a978f, 0, 0.1, 0);
      k.add(pfRBox(0.6, 0.85, 0.36, 0.04), 'paint', 0xe9ebe7, 0, 0.62, 0);
      k.add(pfRBox(0.08, 0.06, 0.02, 0.01), 'emit', pfC(0x40ff80, 1.4), 0.18, 0.92, 0.19);
      k.rod(0.2, 1.05, 0, 0.2, 1.9, 0, 0.02, 'metal', 0x889096, 6);
      k.add(pfRBox(0.62, 0.62, 0.04, 0.01), 'metal', 0xb0b6ba, -0.1, 1.45, -0.1, -0.7, 0, 0);
      k.add(pfRBox(0.58, 0.58, 0.01, 0.005), 'paint', 0x15284a, -0.1, 1.462, -0.085, -0.7, 0, 0);
      k.add(pfRBox(0.42, 0.3, 0.28, 0.04), 'rough', 0x1b1d1f, 0.6, 0.15, 0.3);
    } else if (spec[0] === 'cana') {
      k.pop();
      sbCaneStalks(k, ev.x, ev.z, 8);
      k.push(ev.x, y0, ev.z, 0, face, 0);
    }
    k.pop();
    g.rotation.y = face;
    grp.add(g);
    if (!sbGlowTex) {
      const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
      const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,236,190,1)'); gr.addColorStop(0.18, 'rgba(255,200,90,0.85)'); gr.addColorStop(0.5, 'rgba(255,170,40,0.22)'); gr.addColorStop(1, 'rgba(255,170,40,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64); sbGlowTex = new THREE.CanvasTexture(c);
    }
    const orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: sbGlowTex, color: 0xffd27a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    orb.scale.setScalar(0.55);
    orb.position.set(ev.x, y0 + ev.y + 0.18, ev.z);
    grp.add(orb);
    ev.orb = orb;
    ev.group = g;
  });

  // ===================== MOBILIÁRIO DE ESTRADA =====================
  // Barreiras Jersey (instanciadas)
  const jerseyShape = new THREE.Shape();
  jerseyShape.moveTo(-0.32, 0); jerseyShape.lineTo(0.32, 0);
  jerseyShape.lineTo(0.24, 0.25); jerseyShape.lineTo(0.11, 0.85);
  jerseyShape.lineTo(-0.11, 0.85); jerseyShape.lineTo(-0.24, 0.25); jerseyShape.closePath();
  const jerseyGeo = new THREE.ExtrudeGeometry(jerseyShape, { depth: 2.6, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
  jerseyGeo.center();
  const jerseyMat = matLib.get('concreto', { color: 0xc8c6be, roughness: 0.88 });
  const jerseySpots = [
    [14, -7.5, Math.PI / 2], [18, -7.5, Math.PI / 2], [34, -7.5, Math.PI / 2],
    [46, 7.5, Math.PI / 2], [58, 7.5, Math.PI / 2],
    [92, -7.5, Math.PI / 2], [96, -7.5, Math.PI / 2], [104, 15, 0]
  ];
  const jerseyInst = new THREE.InstancedMesh(jerseyGeo, jerseyMat, jerseySpots.length);
  jerseyInst.castShadow = true;
  jerseyInst.receiveShadow = true;
  const jDummy = new THREE.Object3D();
  jerseySpots.forEach(([jx, jz, jry], idx) => {
    jDummy.position.set(jx, gh(jx, jz) + 0.42, jz);
    jDummy.rotation.set(0, jry, 0);
    jDummy.updateMatrix();
    jerseyInst.setMatrixAt(idx, jDummy.matrix);
  });
  jerseyInst.instanceMatrix.needsUpdate = true;
  stopGroup.add(jerseyInst);

  // Postes de madeira com cruzeta, isoladores e três fios
  const poleXs = [-105, -80, -55, -30, -5, 20, 45, 70, 95];
  poleXs.forEach((px, idx) => {
    const k = kits[kitNear(px)];
    sbPowerPole(k, px, -5.8, idx === 1 || idx === 5);
    if (idx < poleXs.length - 1) {
      const nx = poleXs[idx + 1];
      const ya = gh(px, -5.8) + 7.85, yb = gh(nx, -5.8) + 7.85;
      for (const zz of [-0.85, 0, 0.85]) sbWire(k, px, ya, -5.8 + zz, nx, yb, -5.8 + zz, 0.9 + Math.abs(zz) * 0.1);
    }
  });

  // Decalques viários (faixas de parada)
  const decC = document.createElement('canvas');
  decC.width = 256; decC.height = 128;
  const dctx = decC.getContext('2d');
  dctx.clearRect(0, 0, 256, 128);
  dctx.fillStyle = 'rgba(235,215,120,0.65)';
  for (let i = 0; i < 6; i++) dctx.fillRect(14 + i * 40, 20, 24, 88);
  const decTex = new THREE.CanvasTexture(decC);
  decTex.colorSpace = THREE.SRGBColorSpace;
  const decMat = new THREE.MeshBasicMaterial({ map: decTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  [[0, -14], [26, 13], [52, -14], [98, -13]].forEach(([dx, dz]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.2), decMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(dx, gh(dx, dz) + 0.03, dz);
    groups[kitNear(dx)].add(m);
  });

  // ===================== OPERAÇÃO REAL DA AGROINDÚSTRIA (DIRECAO.md): portaria, balança, oficina, pátio, segurança =====================
  {
    const egg = id => EASTER.find(e => e.id === id);
    const brTex = (w, h, draw) => pfCanvasTex(w, h, draw);
    // placa plana em poste; a face vai para a pista (z<0 olha para +z; z>0 olha para -z)
    // verso (cor): face só para a frente, com plano liso atrás; sem verso, a face é dupla (como antes)
    const brBoard = (x, z, yc, w, h, tex, facing = null, verso = null) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, side: verso != null ? THREE.FrontSide : THREE.DoubleSide, transparent: true, alphaTest: 0.5 }));
      m.position.set(x, gh(x, z) + yc, z);
      m.rotation.y = facing ?? (z < 0 ? 0 : Math.PI);
      groups[kitNear(x)].add(m);
      // postes sempre ATRÁS do painel, nas laterais (nunca cruzam a face); base do painel = yc - h/2
      {
        const ry = m.rotation.y, rx = Math.cos(ry), rz = -Math.sin(ry), nx = Math.sin(ry), nz = Math.cos(ry);
        const kp = kits[kitNear(x)], ht = yc, gy = gh(x, z);
        for (const s of [-1, 1]) {
          const px = x + s * w * 0.3 * rx - nx * 0.07, pz = z + s * w * 0.3 * rz - nz * 0.07;
          kp.add(pfCyl(0.035, 0.035, ht, 6), 'metal', 0x6b7277, px, gy + ht / 2, pz);
        }
      }
      if (verso != null) {
        const v = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: verso, roughness: 0.6, side: THREE.FrontSide }));
        v.position.set(x, m.position.y, z - (z < 0 ? 0.004 : -0.004));
        v.rotation.y = m.rotation.y + Math.PI;
        groups[kitNear(x)].add(v);
      }
      return m;
    };
    const brPost = (k, x, z, h, r = 0.035) => k.add(pfCyl(r, r, h, 6), 'metal', 0x6b7277, x, gh(x, z) + h / 2, z);

    // ---- Ipês-amarelos (2, árvore nativa) ----
    const brCopa = pfCached('brCopa', () => new THREE.IcosahedronGeometry(1, 1));
    const brFlor = pfCached('brFlor', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 5));
    const brIpe = (x, z, s) => {
      const k = kits[kitNear(x)], y0 = gh(x, z);
      k.add(pfCyl(0.13 * s, 0.2 * s, 2.6 * s, 8), 'rough', 0x6b4a32, x, y0 + 1.3 * s, z);
      k.rod(x, y0 + 1.9 * s, z, x + 0.7 * s, y0 + 2.9 * s, z + 0.2 * s, 0.06 * s, 'rough', 0x5b3e2a, 5);
      k.rod(x, y0 + 2.2 * s, z, x - 0.6 * s, y0 + 3.1 * s, z - 0.3 * s, 0.05 * s, 'rough', 0x5b3e2a, 5);
      [[0, 3.6, 0, 1.25, 0xf2c200], [0.9, 3.2, 0.5, 0.95, 0xf7d23a], [-0.9, 3.3, -0.4, 1.0, 0xe9b400], [0.1, 4.4, -0.2, 0.9, 0xf2c200], [-0.3, 3.0, 1.0, 0.8, 0xf7d23a]]
        .forEach(([dx, dy, dz, r, c], i) => k.add(brCopa, 'rough', c, x + dx * s, y0 + dy * s, z + dz * s, i, i * 1.3, 0, r * s, r * s * 0.85, r * s));
      for (let i = 0; i < 26; i++) {
        const a = i * 2.39996, rr = (1.8 + ((i * 37) % 11) / 10) * s;
        const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
        k.add(brFlor, 'rough', i % 3 ? 0xf2c200 : 0xf7d23a, px, gh(px, pz) + 0.03, pz, 0, i, 0, 0.14 * s, 0.03, 0.14 * s);
      }
    };
    brIpe(-112, -33, 1.15);
    brIpe(-79, 12.5, 1.0);

    // ---- Portaria de entrada (x≈-108): guarita, cancela, placas de velocidade e EPI ----
    {
      const k = kits[0], PX = -114.5, PZ = -9.0;
      // guarita em alvenaria com janelas, porta e telhado; a frente (+Z) olha para a pista
      place(k, PX, PZ, 0, () => sbBuilding(k, 2.4, 2.2, 2.6, { wall: 0xeae6dc, roof: 0x5d6a6e, windows: [['f', -0.45, 1.5, 1.0, 0.9], ['l', 0, 1.5, 0.9, 0.9], ['r', 0, 1.5, 0.9, 0.9]], door: [0.55, 0.8], frame: 0x2f3a3e, ac: false }));
      // cancela aberta: pilar amarelo no acostamento e lança erguida, listrada, fora da pista
      const cx = -118.6, cz = -4.4, cy = gh(cx, cz);
      k.add(pfCyl(0.12, 0.12, 1.1, 8), 'paint', 0xf2c200, cx, cy + 0.55, cz);
      for (let i = 0; i < 4; i++) k.add(pfBox(0.1, 0.5, 0.1), 'paint', i % 2 ? 0xf4f4ef : 0xc8281e, cx, cy + 1.35 + i * 0.5, cz);
      // placa R-19 (velocidade): círculo branco, borda vermelha, "20" preto
      const vel = brTex(256, 256, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.beginPath(); g.arc(w / 2, h / 2, 114, 0, 6.2832); g.fillStyle = '#ffffff'; g.fill();
        g.lineWidth = 22; g.strokeStyle = '#d7261e'; g.stroke();
        g.fillStyle = '#111111'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '900 120px Archivo, Arial Narrow, sans-serif'; g.fillText('20', w / 2, h / 2 - 14);
        g.font = '800 34px Archivo, Arial Narrow, sans-serif'; g.fillText('km/h', w / 2, h / 2 + 62);
      });
      brBoard(-110.4, -4.9, 2.15, 0.7, 0.7, vel, null, 0xd7261e);
      // placa de EPI: fundo azul, pictograma de capacete e texto inteiro
      const epi = brTex(512, 410, (g, w, h) => {
        g.fillStyle = '#1f5fa8'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#ffffff'; g.lineWidth = 12; g.strokeRect(14, 14, w - 28, h - 28);
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(w / 2, 150, 70, Math.PI, 0); g.fill(); g.fillRect(w / 2 - 80, 150, 160, 16);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '900 48px Archivo, Arial Narrow, sans-serif';
        g.fillText('USO OBRIGATÓRIO', w / 2, 270, 460);
        g.fillText('DE EPI', w / 2, 340);
      });
      brBoard(-122.4, -4.9, 2.2, 1.0, 0.8, epi, null, 0x1f5fa8);

      // Pórtico de Entrada "USINA HORIZONTE · SAFRA BRASIL" cruzando a estrada (x=-116, pilares fora da pista em z=±5.6)
      {
        const gx = -116.0;
        for (const sz of [-5.6, 5.6]) {
          const gy = gh(gx, sz);
          k.add(pfRBox(0.95, 0.7, 0.95, 0.04), 'concrete', 0x6b6a64, gx, gy + 0.35, sz);
          k.add(pfRBox(0.68, 5.2, 0.68, 0.04), 'concrete', 0xece6d6, gx, gy + 2.95, sz);
          k.add(pfRBox(0.74, 0.36, 0.74, 0.02), 'paint', 0x00665e, gx, gy + 1.15, sz);
          k.add(pfRBox(0.74, 0.14, 0.74, 0.02), 'paint', 0xf2c200, gx, gy + 1.42, sz);
          colliders.push({ x: gx, z: sz, r: 0.7 });
        }
        const gTop = Math.max(gh(gx, -5.6), gh(gx, 5.6)) + 5.55;
        k.add(pfRBox(0.78, 1.08, 12.2, 0.04), 'metal', 0x10282a, gx, gTop, 0);
        k.add(pfRBox(0.84, 0.14, 12.3, 0.02), 'paint', 0x00b3a4, gx, gTop + 0.56, 0);
        k.add(pfRBox(0.84, 0.10, 12.3, 0.02), 'paint', 0xf2c200, gx, gTop - 0.54, 0);
        const porticoTex = brTex(1024, 192, (g, w, h) => {
          g.fillStyle = '#0b2225'; g.fillRect(0, 0, w, h);
          g.fillStyle = '#00b3a4'; g.fillRect(0, 0, w, 12);
          g.fillStyle = '#f2c200'; g.fillRect(0, h - 10, w, 10);
          g.fillStyle = '#eef6f1'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.font = '900 72px Archivo, Arial Narrow, sans-serif';
          g.fillText('USINA HORIZONTE', w / 2, 78);
          g.fillStyle = '#ffb629'; g.font = '700 30px Inter, sans-serif';
          g.fillText('AGROINDÚSTRIA FLEX · CANA & MILHO', w / 2, 142);
        });
        const pmMat = new THREE.MeshStandardMaterial({ map: porticoTex, roughness: 0.42, metalness: 0.1 });
        for (const [sx, ry] of [[-0.41, -Math.PI / 2], [0.41, Math.PI / 2]]) {
          const pl = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 0.96), pmMat);
          pl.position.set(gx + sx, gTop, 0);
          pl.rotation.y = ry;
          groups[0].add(pl);
        }
        // Placa do Talhão de Milho Safrinha ao norte da portaria
        groups[0].add(makeSign('MILHO SAFRINHA', 'Matéria-prima Flex', -96, 0, 5.8, Math.PI));
      }
    }

    // ---- Moega / pátio da indústria: monte de cana picada pronta para moagem ----
    {
      const mx = 21.8, mz = 14.2, k = kits[5], my = gh(mx, mz);
      k.add(pfRBox(3.4, 0.22, 2.2, 0.04), 'concrete', 0x7b7870, mx, my + 0.11, mz);
      for (let i = 0; i < 11; i++) {
        const ox = (i % 4 - 1.5) * 0.65, oz = (Math.floor(i / 4) - 1) * 0.48;
        k.add(pfCyl(0.11, 0.13, 1.35, 7), 'rough', i % 3 ? 0x8ea44c : 0xa3b85b, mx + ox, my + 0.34 + (i % 3) * 0.14, mz + oz, 0.25, i * 0.6, Math.PI / 2 - 0.18);
      }
    }

    // ---- Caminhões na fila do pátio: bitrem canavieiro + graneleiro de milho (z=-33, cabine para +X) ----
    place(kits[4], -4.2, -33, Math.PI / 2, () => kitTruck(kits[4], { cabColor: 0xd99b1e, type: 'cana' }));
    place(kits[4], 16.8, -33, Math.PI / 2, () => kitTruck(kits[4], { cabColor: 0x2b506e, type: 'milho', binColor: 0x264b68 }));
    colliders.push({ x: -6.2, z: -33, r: 3.0 }, { x: 0.2, z: -33, r: 2.6 }, { x: 14.8, z: -33, r: 3.0 }, { x: 20.8, z: -33, r: 2.6 });

    // ---- Balança: totem de senha, mesinha de classificação com sonda caladora motorizada ----
    {
      const k = kits[4];
      const tx = -2.6, tz = -28.4, ty = gh(tx, tz);
      k.add(pfBox(0.5, 1.4, 0.4), 'metal', 0x3a4044, tx, ty + 0.7, tz);
      k.add(pfBox(0.5, 0.12, 0.44), 'metal', 0x2b2e31, tx, ty + 1.46, tz);
      const senha = brTex(256, 160, (g, w, h) => {
        g.fillStyle = '#0b2225'; g.fillRect(0, 0, w, h);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = '#9ff3e4'; g.font = '700 28px Inter, sans-serif'; g.fillText('SENHA YMS', w / 2, 38);
        g.fillStyle = '#ffb629'; g.font = '900 84px Archivo, Arial Narrow, sans-serif'; g.fillText('042', w / 2, 94);
        g.fillStyle = '#eef6f1'; g.font = '600 22px Inter, sans-serif'; g.fillText('cana & milho flex', w / 2, 138);
      });
      brBoard(tx, tz + 0.22, 1.1, 0.44, 0.28, senha, 0, 0x0b2225);
      const cx = 6.2, cz = -28.8, cy = gh(cx, cz);
      k.add(pfBox(1.4, 0.06, 0.8), 'wood', 0x8a5f38, cx, cy + 0.9, cz);
      for (const [lx, lz] of [[-0.66, -0.34], [0.66, -0.34], [-0.66, 0.34], [0.66, 0.34]]) k.add(pfBox(0.06, 0.9, 0.06), 'wood', 0x5d3a22, cx + lx, cy + 0.45, cz + lz);
      k.add(pfBox(0.5, 0.04, 0.35), 'metal', 0xb9c0c4, cx - 0.2, cy + 0.94, cz);
      k.add(pfBox(0.6, 0.3, 0.45), 'fabric', 0xd8c79a, cx - 1.3, cy + 0.15, cz + 0.4);
      // pórtico da sonda caladora animada (gira e desce suavemente sobre a faixa de amostragem)
      const calPivot = new THREE.Group();
      calPivot.position.set(cx + 0.55, cy + 2.85, cz - 0.5);
      const calM = new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.42, metalness: 0.35 });
      const calMetal = new THREE.MeshStandardMaterial({ color: 0x3a4246, roughness: 0.45, metalness: 0.72 });
      const calPost = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 2.9, 10), calM);
      calPost.position.set(cx + 0.55, cy + 1.45, cz - 0.5);
      groups[4].add(calPost);
      const calArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 2.2), calM);
      calArm.position.set(0, 0, -1.0);
      const calProbe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 1.5, 8), calMetal);
      calProbe.position.set(0, -0.75, -1.95);
      calPivot.add(calArm, calProbe);
      groups[4].add(calPivot);
      animated.calador = { pivot: calPivot, probe: calProbe };
      const clas = brTex(256, 80, (g, w, h) => {
        g.fillStyle = '#00665e'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '900 32px Archivo, Arial Narrow, sans-serif'; g.fillText('UMIDADE · ATR', w / 2, h / 2);
      });
      brBoard(cx + 0.95, cz - 0.3, 1.25, 0.5, 0.16, clas, null, 0x00665e);
    }

    // ---- Oficina: tanque de diesel com bacia de contenção e comboio ----
    {
      const k = kits[3], tx = -11.5, tz = 27, ty = gh(tx, tz);
      k.add(pfBox(4.6, 0.04, 3.4), 'concrete', 0x8a8680, tx, ty + 0.02, tz);
      k.add(pfBox(4.8, 0.3, 0.2), 'concrete', 0xb3b0a8, tx, ty + 0.15, tz - 1.6);
      k.add(pfBox(4.8, 0.3, 0.2), 'concrete', 0xb3b0a8, tx, ty + 0.15, tz + 1.6);
      k.add(pfBox(0.2, 0.3, 3.4), 'concrete', 0xb3b0a8, tx - 2.3, ty + 0.15, tz);
      k.add(pfBox(0.2, 0.3, 3.4), 'concrete', 0xb3b0a8, tx + 2.3, ty + 0.15, tz);
      for (const lx of [-1.1, 1.1]) k.add(pfBox(0.12, 0.9, 1.0), 'metal', 0x3a4044, tx + lx, ty + 0.45, tz);
      k.add(pfCyl(0.85, 0.85, 3.2, 14), 'paint', 0xe6e9e7, tx, ty + 1.35, tz, 0, 0, Math.PI / 2);
      const px = -14.6, pz = 23.4, py = gh(px, pz);
      k.add(pfBox(0.5, 1.4, 0.4), 'paint', 0xf2c200, px, py + 0.7, pz);
      k.add(pfBox(0.4, 0.3, 0.05), 'emit', pfC(0x3fae2a, 1.0), px, py + 1.2, pz - 0.22);
      k.rod(px - 0.25, py + 0.6, pz, tx + 1.8, ty + 0.12, tz + 0.9, 0.025, 'rough', 0x111111, 5);
      const comb = brTex(256, 96, (g, w, h) => {
        g.fillStyle = '#f2c200'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#1a1a1a'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '900 56px Archivo, Arial Narrow, sans-serif'; g.fillText('COMBOIO', w / 2, h / 2);
      });
      brBoard(px, pz - 0.22, 0.85, 0.44, 0.16, comb, null, 0xf2c200);
    }

    // ---- Almoxarifado de defensivos: área gradeada, tambores e placa de risco (talhão/sede) ----
    {
      const cx = -92, cz = -33, hw = 3, hd = 2, k = kits[kitNear(cx)], y0 = gh(cx, cz);
      for (const [px, pz] of [[cx - hw, cz - hd], [cx + hw, cz - hd], [cx - hw, cz + hd], [cx + hw, cz + hd]]) brPost(k, px, pz, 2.2, 0.05);
      k.add(new THREE.PlaneGeometry(2 * hw, 2.0), 'grid', 0x9aa3a7, cx, y0 + 1.1, cz - hd);
      k.add(new THREE.PlaneGeometry(2 * hw, 2.0), 'grid', 0x9aa3a7, cx, y0 + 1.1, cz + hd);
      k.add(new THREE.PlaneGeometry(2 * hd, 2.0), 'grid', 0x9aa3a7, cx - hw, y0 + 1.1, cz, 0, Math.PI / 2, 0);
      k.add(new THREE.PlaneGeometry(2 * hd, 2.0), 'grid', 0x9aa3a7, cx + hw, y0 + 1.1, cz, 0, Math.PI / 2, 0);
      sbDrum(k, cx - 1.2, cz + 0.6, 0xb84028);
      sbDrum(k, cx - 0.4, cz + 0.6, 0x2b5f70);
      sbPallet(k, cx + 0.8, cz - 0.4, 0);
      const risco = brTex(256, 256, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.beginPath(); g.moveTo(128, 6); g.lineTo(250, 128); g.lineTo(128, 250); g.lineTo(6, 128); g.closePath();
        g.fillStyle = '#f2b000'; g.fill(); g.lineWidth = 12; g.strokeStyle = '#1a1a1a'; g.stroke();
        g.fillStyle = '#1a1a1a'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '900 30px Archivo, Arial Narrow, sans-serif'; g.fillText('DEFENSIVOS', w / 2, 112);
        g.font = '800 22px Inter, sans-serif'; g.fillText('USO RESTRITO', w / 2, 150);
      });
      brBoard(cx, cz + hd + 0.12, 1.5, 0.8, 0.8, risco, 0, 0xf2b000);
      const cage = brTex(512, 160, (g, w, h) => {
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#1a1a1a'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '900 60px Archivo, Arial Narrow, sans-serif'; g.fillText('ÁREA DE INSUMOS', w / 2, h / 2);
      });
      brBoard(cx + 1.6, cz + hd + 0.12, 0.45, 1.6, 0.5, cage, 0, 0xffffff);
    }

    // ---- Frente de colheita: relógio de ponto com crachá e quadro de DDS (safristas) ----
    {
      const kx = -41.5, kz = -8.8, k = kits[kitNear(kx)], y0 = gh(kx, kz);
      k.add(pfBox(0.34, 1.1, 0.2), 'metal', 0x3a4044, kx, y0 + 0.55, kz);
      k.add(pfBox(0.44, 0.5, 0.18), 'paint', 0x2b2e31, kx, y0 + 1.35, kz);
      k.add(pfBox(0.3, 0.12, 0.02), 'emit', pfC(0x00ffaa, 1.0), kx, y0 + 1.36, kz + 0.1);
      k.add(pfBox(0.26, 0.04, 0.2), 'metal', 0x9aa0a4, kx, y0 + 1.0, kz + 0.08);
      const card = brTex(220, 340, (g, w, h) => {
        g.fillStyle = '#f4f6f4'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#00665e'; g.fillRect(0, 0, w, 70);
        g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '800 30px Inter, sans-serif'; g.fillText('SAFRISTA', w / 2, 36);
        g.fillStyle = '#1a2a2a'; g.font = '900 44px Archivo, Arial Narrow, sans-serif'; g.fillText('Nº 0427', w / 2, 150);
        g.font = '600 22px Inter, sans-serif'; g.fillText('Frente de colheita', w / 2, 210);
      });
      const cm = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.34), new THREE.MeshStandardMaterial({ map: card, roughness: 0.4 }));
      cm.rotation.x = -Math.PI / 2; cm.position.set(kx, y0 + 1.03, kz + 0.08);
      groups[kitNear(kx)].add(cm);
      const dx = -37.8, dz = -8.8;
      const dds = brTex(512, 320, (g, w, h) => {
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#00665e'; g.fillRect(0, 0, w, 70);
        g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.font = '900 30px Archivo, Arial Narrow, sans-serif'; g.fillText('DDS · DIÁLOGO DE SEGURANÇA', 20, 36);
        g.fillStyle = '#1a2a2a'; g.font = '700 24px Inter, sans-serif'; g.textBaseline = 'alphabetic';
        g.fillText('• EPI: boné com nuca, perneira, botina', 20, 130);
        g.fillText('• Nunca cruze a frente da colhedora', 20, 185);
        g.fillText('• Pausa para água às 10h', 20, 240);
        g.fillText('• Sem atalho pelo talhão', 20, 295);
      });
      brBoard(dx, dz, 2.3, 1.6, 1.0, dds, null, 0x00665e);
    }

    // ---- Sede: placa de dias sem acidente (egg 'dias') ----
    {
      const e = egg('dias'), k = kits[kitNear(e.x)];
      const dias = brTex(640, 300, (g, w, h) => {
        g.fillStyle = '#f4f6f4'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#00665e'; g.fillRect(0, 0, w, 84);
        g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = '900 46px Archivo, Arial Narrow, sans-serif'; g.fillText('SEGURANÇA DO TRABALHO', w / 2, 44);
        g.fillStyle = '#1a2a2a'; g.font = '800 40px Inter, sans-serif'; g.fillText('Estamos há', w / 2, 130);
        g.fillStyle = '#00665e'; g.font = '900 110px Archivo, Arial Narrow, sans-serif'; g.fillText('186', w / 2, 205);
        g.fillStyle = '#1a2a2a'; g.font = '800 40px Inter, sans-serif'; g.fillText('dias sem acidentes', w / 2, 272);
      });
      brBoard(e.x, e.z, 2.22, 1.6, 0.84, dias, null, 0x00665e);
    }

    // ---- Armazém e indústria: extintores e faixa de pedestre amarela ----
    {
      const k = kits[6];
      for (const ex of [46.2, 57.8]) k.add(pfCyl(0.13, 0.13, 0.62, 10), 'paint', 0xc8281e, ex, gh(ex, -18.4) + 0.31, -18.4);
      const ki = kits[5], ix = 30.4, iz = 15.0;
      ki.add(pfCyl(0.13, 0.13, 0.62, 10), 'paint', 0xc8281e, ix, gh(ix, iz) + 0.31, iz);
      const faixaTex = pfCanvasTex(256, 256, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.fillStyle = 'rgba(242,200,0,0.9)';
        for (let i = 0; i < 6; i++) g.fillRect(14 + i * 40, 0, 24, h);
      });
      const faixa = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 7.2), new THREE.MeshBasicMaterial({ map: faixaTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      faixa.rotation.x = -Math.PI / 2;
      faixa.position.set(60, gh(60, 0) + 0.03, 0);
      groups[kitNear(60)].add(faixa);
    }

    // ---- Portaria: Caramelo, fiscal de portaria (egg 'caramelo') ----
    {
      const e = egg('caramelo'), y0 = gh(e.x, e.z);
      const pelo = new THREE.MeshStandardMaterial({ color: 0xb0743a, roughness: 0.95 });
      const claro = new THREE.MeshStandardMaterial({ color: 0xe2c39a, roughness: 0.9 });
      const escuro = new THREE.MeshStandardMaterial({ color: 0x2b1c12, roughness: 0.9 });
      const cao = new THREE.Group();
      const corpo = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), pelo);
      corpo.scale.set(1.25, 0.55, 0.85); corpo.position.set(0, 0.2, 0); cao.add(corpo);
      const cab = new THREE.Group(); cab.position.set(0.42, 0.3, 0); cao.add(cab);
      const cranio = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), pelo); cranio.scale.set(1.1, 0.95, 0.95); cab.add(cranio);
      const focinho = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), claro); focinho.scale.set(1.5, 0.8, 0.85); focinho.position.set(0.2, -0.06, 0); cab.add(focinho);
      const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), escuro); nariz.position.set(0.32, -0.02, 0); cab.add(nariz);
      const orelhas = [];
      for (const s of [-1, 1]) {
        const piv = new THREE.Group(); piv.position.set(-0.04, 0.12, s * 0.15); cab.add(piv);
        const o = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), escuro); o.scale.set(0.45, 1.3, 0.9); o.position.set(0, -0.1, 0); piv.add(o);
        orelhas.push(piv);
      }
      for (const [lx, lz] of [[0.22, 0.2], [0.22, -0.2], [-0.22, 0.22], [-0.22, -0.22]]) {
        const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 6), pelo);
        pata.rotation.z = Math.PI / 2; pata.position.set(lx, 0.06, lz); cao.add(pata);
      }
      const rabo = new THREE.Group(); rabo.position.set(-0.42, 0.26, 0); cao.add(rabo);
      const rab = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.42, 6), pelo);
      rab.rotation.z = Math.PI / 2 - 0.6; rab.position.set(-0.17, 0.12, 0); rabo.add(rab);
      cao.position.set(e.x, y0, e.z);
      cao.rotation.y = -Math.PI / 2 + 0.3;
      groups[kitNear(e.x)].add(cao);
      animated.caramelo = { rabo, orelhas };
    }

    // ---- Oficina: garrafa térmica de café e copinhos (egg 'cafe') ----
    {
      const e = egg('cafe'), k = kits[kitNear(e.x)], x = e.x, z = e.z, y0 = gh(x, z);
      k.add(pfBox(0.9, 0.05, 0.6), 'wood', 0x8a5f38, x, y0 + 0.85, z);
      for (const [lx, lz] of [[-0.38, -0.23], [0.38, -0.23], [-0.38, 0.23], [0.38, 0.23]]) k.add(pfBox(0.06, 0.82, 0.06), 'wood', 0x5d3a22, x + lx, y0 + 0.41, z + lz);
      k.add(pfLathe('brTermica', [[0, 0], [0.1, 0], [0.11, 0.05], [0.11, 0.36], [0.09, 0.42], [0, 0.44]], 12), 'metal', 0xc3cacf, x - 0.2, y0 + 0.88, z);
      k.add(pfCyl(0.095, 0.095, 0.06, 10), 'paint', 0xb3402a, x - 0.2, y0 + 1.36, z);
      for (let i = 0; i < 3; i++) k.add(pfLathe('brCopo', [[0, 0], [0.05, 0], [0.055, 0.07], [0.045, 0.07], [0, 0.05]], 8), 'rough', 0xf4f1e6, x + 0.1 + i * 0.12, y0 + 0.88, z + 0.1);
    }
  }

  // ===================== MIRANTES (historia MIRANTES): totem com placa e anel verde no chão, fora da pista =====================
  {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    const cx = cv.getContext('2d');
    cx.fillStyle = '#0b1a1c'; cx.fillRect(0, 0, 256, 128);
    cx.strokeStyle = '#12f7d1'; cx.lineWidth = 8; cx.strokeRect(8, 8, 240, 112);
    cx.fillStyle = '#eef6f1'; cx.font = '800 56px Archivo, Arial Narrow, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText('MIRANTE', 128, 68);
    const placaTex = new THREE.CanvasTexture(cv); placaTex.colorSpace = THREE.SRGBColorSpace; placaTex.anisotropy = 4;
    const placaMat = new THREE.MeshBasicMaterial({ map: placaTex, side: THREE.DoubleSide, toneMapped: false });
    const posteMat = new THREE.MeshStandardMaterial({ color: 0x8c9499, roughness: 0.6, metalness: 0.4 });
    const anelMat = new THREE.MeshBasicMaterial({ color: 0x12f7d1, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
    for (const m of MIRANTES) {
      const g = new THREE.Group();
      g.position.set(m.x, sbGround(m.x, m.z), m.z); g.name = 'mirante-' + m.id;
      // a placa olha para a pista (z=0); postes atrás da placa (z negativo no sentido da placa)
      g.rotation.y = m.z > 0 ? Math.PI : 0;
      for (const s of [-0.55, 0.55]) {
        const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 8), posteMat);
        poste.position.set(s, 1.7, -0.22); g.add(poste);
      }
      const placa = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), placaMat);
      placa.position.set(0, 3.15, 0); g.add(placa);
      const anel = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.8, 48), anelMat);
      anel.rotation.x = -Math.PI / 2; anel.position.y = 0.05; anel.renderOrder = 2; g.add(anel);
      stopGroup.add(g);
    }
  }

  // ===================== MESCLA FINAL POR PARADA =====================
  const lods = [];
  const kitTris = [];
  kits.forEach((k, i) => {
    kitTris.push(Math.round(k.tris()));
    const r = k.build(groups[i]);
    if (r.detail) lods.push({ g: r.detail, x: PARADAS[i].x, z: PARADAS[i].bz });
  });
  const beaconMat = pfMaterial(matLib, 'beacon');
  window.__SAFRA_DEBUG_STOPS__ = { scene, stopGroup, kitTris, lods: lods.length };

  const _tmpV = new THREE.Vector3();
  return {
    colliders,
    update(timeSec, dt, cameraPos) {
      animated.beacons.forEach((b, i) => {
        b.rotation.y = timeSec * 1.4 + i;
        b.position.y = 2.55 + Math.sin(timeSec * 2.2 + i) * 0.12;
      });
      // giroflex: pisca âmbar/vermelho
      const pulse = Math.max(0, Math.sin(timeSec * 9.0));
      beaconMat.color.setScalar(0.25 + pulse * pulse * 1.4);
      if (animated.drone) {
        animated.drone.position.y = 3.6 + Math.sin(timeSec * 2.1) * 0.22;
        animated.drone.rotation.y = Math.sin(timeSec * 0.5) * 0.35;
        if (animated.drone.userData.rotors) animated.drone.userData.rotors.forEach((r, idx) => r.rotation.y += dt * (idx % 2 ? 26 : -26));
      }
      if (animated.crane) {
        animated.crane.rotation.y = Math.sin(timeSec * 0.25) * 0.14;
      }
      if (animated.moendaRols) {
        animated.moendaRols.forEach((r, idx) => { r.rotation.z += dt * (idx % 2 ? -0.9 : 0.9); });
      }
      if (animated.secadorDdgs) {
        animated.secadorDdgs.rotation.x += dt * 0.45;
      }
      if (animated.calador) {
        animated.calador.pivot.rotation.y = Math.sin(timeSec * 0.45) * 0.38;
        animated.calador.probe.position.y = -0.75 - Math.max(0, Math.sin(timeSec * 0.9)) * 0.32;
      }
      // ronda discreta do Valdemar na portaria enquanto não está em advertência
      const vObj = window.__SAFRA_VALDEMAR__;
      if (vObj && !vObj.ativo && vObj.person) {
        const dPlayer = Math.hypot(cameraPos.x - vObj.person.position.x, cameraPos.z - vObj.person.position.z);
        if (dPlayer > 5.5) vObj.person.position.x = vObj.homeX + Math.sin(timeSec * 0.28) * 1.3;
      }
      // detalhes finos somem de longe
      for (const l of lods) {
        const d = Math.hypot(cameraPos.x - l.x, cameraPos.z - l.z);
        l.g.visible = d < 48;
      }
      animated.people.forEach(p => {
        const a = p.userData.anim;
        if (!a) return;
        const ph = timeSec * 1.3 + a.phase;
        const dist = Math.hypot(cameraPos.x - p.position.x, cameraPos.z - p.position.z);
        // respiração, troca de apoio, braços e cabeça
        a.head.rotation.y = Math.sin(ph * 0.45) * 0.22;
        a.head.rotation.x = Math.sin(ph * 0.3) * 0.05;
        a.armL.rotation.x = Math.sin(ph) * 0.06 - 0.04;
        a.armR.rotation.x = -Math.sin(ph) * 0.05 - (Math.sin(ph * 0.21) > 0.6 ? 0.35 : 0.05);
        a.armL.rotation.z = -0.06 - Math.sin(ph * 0.5) * 0.02;
        p.rotation.z = Math.sin(ph * 0.25) * 0.012;
        p.position.y = (a.baseY ?? 0) + Math.sin(ph * 2.0) * 0.004;
        // vira suavemente para o jogador quando próximo
        let target = a.yaw ?? p.rotation.y;
        if (dist < 10) target = Math.atan2(cameraPos.x - p.position.x, cameraPos.z - p.position.z);
        let diff = target - p.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        p.rotation.y += diff * Math.min(1, dt * 4);
        if (dist < 10) {
          _tmpV.set(cameraPos.x - p.position.x, 0, cameraPos.z - p.position.z);
          a.head.rotation.x = Math.max(-0.25, Math.min(0.15, -Math.atan2(cameraPos.y - (p.position.y + 1.65), _tmpV.length()) * 0.5));
        }
      });
      // painel da safra: uma lâmpada acesa por parada concluída; todas acesas = pisca suave
      if (animated.painel) {
        const st = window.__SAFRA_DEBUG__ && window.__SAFRA_DEBUG__.state;
        const P = window.__SAFRA_DEBUG__ && window.__SAFRA_DEBUG__.data && window.__SAFRA_DEBUG__.data.PARADAS;
        const L = animated.painel.lamps;
        const acesas = L.map((l, i) => !!(st && P && st.feitas && P[i] && st.feitas[P[i].id]));
        const todas = acesas.every(Boolean);
        const pisca = todas ? 0.85 + 0.35 * Math.sin(timeSec * 2.0) : 1;
        L.forEach((l, i) => {
          l.material.emissiveIntensity = acesas[i] ? 1.4 * pisca : 0;
          l.material.color.set(acesas[i] ? 0x3fae2a : 0x3b4347);
        });
      }
      // selos de solução: sobem em ~0,6 s quando a parada é concluída (state.feitas, como o painel)
      if (animated.selos) {
        const st = window.__SAFRA_DEBUG__ && window.__SAFRA_DEBUG__.state;
        animated.selos.forEach(a => {
          const feita = !!(st && st.feitas && st.feitas[a.id]);
          if (feita && !a.started) { a.started = true; a.glow = 3; }
          if (a.started && a.prog < 1) a.prog = Math.min(1, a.prog + dt / 0.6);
          a.grp.visible = a.started;
          if (a.started) a.grp.scale.setScalar(Math.max(0.001, 1 - Math.pow(1 - a.prog, 3)));
          if (a.glow > 0) a.glow = Math.max(0, a.glow - dt);
          if (a.lamp) a.lamp.emissiveIntensity = a.glow > 0 ? 2.2 : 0;
        });
      }
      if (animated.capivara && animated.capivara.head) animated.capivara.head.rotation.z = -0.35 + Math.sin(timeSec * 2.1) * 0.08 * (Math.sin(timeSec * 0.37) > 0 ? 1 : 0);
      if (animated.caramelo) {
        animated.caramelo.rabo.rotation.y = Math.sin(timeSec * 6.5) * 0.45;
        animated.caramelo.orelhas.forEach((o, i) => { o.rotation.x = Math.sin(timeSec * 1.7 + i) * 0.12; });
      }
      if (animated.trafego) animated.trafego.forEach(tr => {
        // vai e volta entre a sede e o porto, cada um na sua mão da estrada
        // para quando o jogador está na frente, na mesma mão (caminhoneiro educado)
        const L = 200, ida = tr.lane > 0, dir = ida ? 1 : -1;
        if (tr.t == null) tr.t = tr.fase;
        const xa = tr.x == null ? (ida ? -110 + tr.t * L : 90 - tr.t * L) : tr.x;
        const ahead = (cameraPos.x - xa) * dir, side = Math.abs(cameraPos.z - tr.lane);
        // gente na frente: freia (sem parar de vez), pisca o farol e buzina; depois retoma
        const naFrente = ahead > 0 && ahead < 22 && side < 2.8;
        const alvo = naFrente ? Math.max(0.18, Math.min(1, (ahead - 4) / 18)) : 1;
        tr.vel += (alvo - tr.vel) * Math.min(1, dt * (alvo < tr.vel ? 2.2 : 0.7));
        tr.t = (tr.t + dt * 0.022 * tr.vel) % 1;
        const pisca = naFrente && Math.sin(timeSec * 14) > 0;
        if (tr.farolMat) { tr.farolMat.opacity = pisca ? 1 : 0.25; tr.halo.intensity = pisca ? 12 : 0; }
        tr.buzina = (tr.buzina || 0) - dt;
        if (naFrente && ahead < 16 && tr.buzina <= 0) { tr.buzina = 3.2; window.dispatchEvent(new CustomEvent('safra-buzina', { detail: { dist: ahead } })); }
        const f = tr.t;
        const x = ida ? -110 + f * L : 90 - f * L;
        tr.g.position.set(x, gh(x, tr.lane), tr.lane);
        tr.g.rotation.y = ida ? Math.PI / 2 : -Math.PI / 2;
        tr.x = x; tr.z = tr.lane;
      });
      EVIDENCIAS.forEach(ev => {
        if (ev.orb) {
          ev.orb.visible = !ev.collected && window.SAFRA_BRILHO !== false;
          const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.0032 + ev.x);
          ev.orb.material.opacity = 0.45 + 0.45 * pulse;
          ev.orb.scale.setScalar(0.45 + 0.18 * pulse);
        }
      });
    }
  };
}
