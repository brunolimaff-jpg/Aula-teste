// === world/humanos: personagens realistas (Microsoft Rocketbox, MIT) + equipe operacional da usina ===
// Cada parada recebe um avatar com esqueleto, materiais PBR calibrados, gesto de fala e respiração (idle).
// Além dos 10 líderes de parada + Valdemar, 6 trabalhadores secundários dão vida à usina brasileira.
const HUMANOS_CFG = [
  { m: 'Female_Adult_04', h: 1.66 },                                     // Helena, gerente (sede: sem EPI)
  { m: 'Wood_Male_01', h: 1.76, acc: 'chapeu', dy: -0.015 },             // Caio, agrônomo (chapéu bem encaixado)
  { m: 'Construction_Female_01', h: 1.63, acc: 'chapeu', dy: -0.008 },   // Marta, encarregada de frente (colete já no modelo)
  { m: 'Construction_Male_05', h: 1.71, acc: 'capacete', cor: 0x2a6fb0 },// Seu Tião, oficina (macacão azul + botina + capacete azul)
  { m: 'Construction_Male_02', h: 1.79, acc: 'capacete', cor: 0x2a6fb0 },// Rui, balança (jaqueta + capacete azul)
  { m: 'Female_Adult_07', h: 1.68, acc: 'capacete', cor: 0xf2c230, dy: -0.014 }, // Sílvia, indústria (capacete amarelo justo)
  { m: 'Construction_Male_07', h: 1.74, acc: 'capacete', cor: 0xf2c230 },// Jonas, armazém (colete laranja já no modelo)
  { m: 'Business_Female_01', h: 1.65 },                                  // Paula, controladoria (social)
  { m: 'Male_Adult_08', h: 1.78 },                                       // Rodrigo, centro de gestão/ERP (camisa social azul + calça escura)
  { m: 'Business_Male_02', h: 1.76 }                                     // André, porto (terno e gravata para mesa de negociação)
];

// Equipe operacional secundária da usina (modelos MIT autênticos, sem custo de sobreposição)
const HUMANOS_AMBIENTE = [
  { id: 'amb-portaria', nome: 'Vigilante da Portaria', m: 'Security_Male_01', h: 1.78, x: -112.4, z: -6.8, yaw: 0.4 },
  { id: 'amb-oficina', nome: 'Mecânico Auxiliar', m: 'Construction_Male_04', h: 1.74, x: -20.8, z: 18.8, dyGround: 0.275, yaw: -2.4, acc: 'capacete', cor: 0x2a6fb0 },
  { id: 'amb-balanca', nome: 'Classificador de Cana', m: 'Wood_Male_01', h: 1.71, x: 5.0, z: -28.0, yaw: 0.25, acc: 'chapeu', dy: -0.015, prancheta: true },
  { id: 'amb-moenda', nome: 'Operador de Moenda', m: 'Construction_Male_02', h: 1.77, x: 22.8, z: 16.5, yaw: -2.85, acc: 'capacete', cor: 0xf2c230 },
  { id: 'amb-armazem', nome: 'Conferente de Expedição', m: 'Construction_Female_01', h: 1.64, x: 49.4, z: -16.8, yaw: 0.45, acc: 'capacete', cor: 0xf2c230, prancheta: true },
  { id: 'amb-porto', nome: 'Estivador do Cais', m: 'Construction_Male_08', h: 1.75, x: 103.5, z: -14.2, yaw: -0.6, acc: 'capacete', cor: 0xf2c230 }
];

const HUMANOS_IDLE = { m: 'Wood_Male_01', f: 'Female_Adult_04' };
// roupa de campo: apenas trajes casuais/campo recebem leve tom terroso (nunca camisa social, terno ou uniforme)
const HUMANOS_URBANOS = /^(Female_Adult_04|Wood_Male_01)$/;

// Vetores e quatérnions temporários pré-alocados (zero alocação por frame em animarNPC)
const _HM_UP = new THREE.Vector3(0, 1, 0);
const _HM_FRONT_BASE = new THREE.Vector3(0, 0, 1);
const _hmCab = new THREE.Vector3();
const _hmPara = new THREE.Vector3();
const _hmHz = new THREE.Vector3();
const _hmFy = new THREE.Vector3();
const _hmEixo = new THREE.Vector3();
const _hmFrente = new THREE.Vector3();
const _hmDY = new THREE.Quaternion();
const _hmDP = new THREE.Quaternion();
const _hmDTr = new THREE.Quaternion();
const _hmPq = new THREE.Quaternion();
const _hmLoc = new THREE.Quaternion();
const _hmAtual = new THREE.Quaternion();

// Acessório preso ao osso Bip01_Head. Medidas em metros do mundo do grupo; o grupo é
// desenhado na escala do osso (1/escala do osso), então as medidas valem em metros reais.
// Frente da cabeça = direção até o osso do nariz (Bip01_MNose), no plano horizontal.
function acessorioCabeca(modelo, acc, cor, dy = 0, folga = 1) {
  const cabeca = modelo.getObjectByName('Bip01_Head');
  if (!cabeca) { console.warn('humanos: osso Bip01_Head nao encontrado'); return; }
  modelo.updateMatrixWorld(true);
  const pCab = cabeca.getWorldPosition(new THREE.Vector3());
  const bWS = cabeca.getWorldScale(new THREE.Vector3());
  const bWQ = cabeca.getWorldQuaternion(new THREE.Quaternion());
  const mWQ = modelo.getWorldQuaternion(new THREE.Quaternion());
  // boné substitui o capacete de obra do modelo (material *helmet*): esconde e mede o topo sem ele
  const ehCapacete = o => (Array.isArray(o.material) ? o.material : [o.material]).some(m => /helmet/i.test(m.name));
  // capacete: usa o que já vem no modelo e aplica a cor do setor ao casco nativo
  let temCapNativo = false;
  modelo.traverse(o => {
    if (!o.isMesh || !ehCapacete(o)) return;
    temCapNativo = true;
    if (acc === 'capacete' && cor) {
      const tingirCap = m => {
        if (!/helmet/i.test(m.name)) return m;
        const c = m.clone();
        c.color.setHex(cor).lerp(new THREE.Color(0xffffff), 0.14);
        return c;
      };
      o.material = Array.isArray(o.material) ? o.material.map(tingirCap) : tingirCap(o.material);
    }
  });
  if (acc === 'capacete' && temCapNativo) return;
  // chapéu ou boné substituem o capacete do modelo
  if (acc !== 'capacete') modelo.traverse(o => { if (o.isMesh && ehCapacete(o)) o.visible = false; });
  let topo = -Infinity; const caixa = new THREE.Box3();
  modelo.traverse(o => { if (o.isMesh && o.visible) { caixa.setFromObject(o, true); topo = Math.max(topo, caixa.max.y); } });
  let fr = new THREE.Vector3(0, 0, 1).applyQuaternion(mWQ);
  const nariz = modelo.getObjectByName('Bip01_MNose');
  if (nariz) { const d = nariz.getWorldPosition(new THREE.Vector3()).sub(pCab); d.y = 0; if (d.lengthSq() > 1e-10) fr = d.normalize(); }
  const fLoc = fr.clone().applyQuaternion(mWQ.clone().invert()); fLoc.y = 0; fLoc.normalize();
  const qAlinha = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), fLoc);
  const g = new THREE.Group();
  const bone = acc === 'bone';
  // base do acessório na linha da testa: um pouco acima do meio das sobrancelhas
  const sobr = modelo.getObjectByName('Bip01_MMiddleEyebrow');
  const yTesta = sobr ? sobr.getWorldPosition(new THREE.Vector3()).y + 0.02 : pCab.y + 0.1;
  const ancora = new THREE.Vector3(pCab.x, yTesta + dy, pCab.z);
  g.position.copy(cabeca.worldToLocal(ancora));
  g.quaternion.copy(bWQ.clone().invert().multiply(mWQ).multiply(qAlinha));
  g.scale.setScalar(1 / ((bWS.x + bWS.y + bWS.z) / 3));
  if (bone) {
    // boné de tecido: copa de 6 gomos achatada sobre o crânio, viseira curta na linha da testa
    const c = new THREE.Color(cor).lerp(new THREE.Color(0x9a927f), 0.28);
    const tec = new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0, flatShading: true });
    const cupula = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6, 0, Math.PI * 2, 0, Math.PI / 2), tec);
    cupula.scale.set(1, 0.85, 1.06);
    const viseira = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.005, 28, 1, false, -Math.PI / 2, Math.PI), tec);
    viseira.scale.set(0.95, 1, 0.85); viseira.position.set(0, 0.003, 0.08); viseira.rotation.x = 0.12;
    const botao = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 6), tec); botao.position.y = 0.08;
    g.add(cupula, viseira, botao);
  } else if (acc === 'capacete') {
    // capacete de segurança procedural: casco arredondado, aba frontal curta e nervura central
    const R0 = 0.102;
    const plastico = new THREE.MeshStandardMaterial({ color: cor || 0xf2c230, roughness: 0.38, metalness: 0.04, side: THREE.DoubleSide });
    const perfil = [new THREE.Vector2(R0, 0)];
    const a = R0 * 0.97, y0 = 0.03, b = 0.075;
    for (let i = 0; i <= 20; i++) { const ph = (i / 20) * Math.PI / 2; perfil.push(new THREE.Vector2(a * Math.cos(ph), y0 + b * Math.sin(ph))); }
    const casco = new THREE.Mesh(new THREE.LatheGeometry(perfil, 56), plastico);
    casco.scale.set(0.92, 1, 1.14);
    // aba frontal: anel de meia-volta na frente, curta (3,5 cm)
    const aba = new THREE.Mesh(new THREE.RingGeometry(R0 - 0.012, R0 + 0.05, 40, 1, Math.PI * 1.12, Math.PI * 0.76), plastico);
    aba.rotation.x = -Math.PI / 2 + 0.16; aba.position.y = 0.004; aba.scale.set(0.92, 1.14, 1);
    const borda = new THREE.Mesh(new THREE.TorusGeometry(R0, 0.007, 8, 48), plastico); borda.rotation.x = Math.PI / 2; borda.scale.set(0.92, 1.14, 1); borda.position.y = 0.004;
    // nervura: fita curva do topo de trás até a frente, colada no casco
    const pts = [];
    for (let i = 0; i <= 24; i++) { const ph = Math.PI - (i / 24) * Math.PI; pts.push(new THREE.Vector3(0, y0 + b * Math.sin(ph) + 0.002, a * 1.14 * Math.cos(ph))); }
    const nervura = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0055, 8), plastico);
    g.add(casco, aba, borda, nervura);
    // se o cabelo passar da altura padrão, o casco cresce um pouco para envolver o topo
    g.scale.x *= folga;
    g.scale.z *= folga;
    g.scale.y *= Math.max(0.95, Math.min(1.28, (topo - ancora.y + 0.008) / (b + y0)));
  } else {
    // chapeu de palha de vaqueiro: peça única (LatheGeometry) com copa abaulada, aba que sobe nas laterais e faixa escura
    const R0 = 0.092, BORDA = 0.065, ALT = 0.095; // raio no encaixe, largura da aba e altura da copa (m)
    const palha = new THREE.MeshStandardMaterial({ color: 0xc9ab72, roughness: 0.95, metalness: 0, side: THREE.DoubleSide });
    const fita = new THREE.MeshStandardMaterial({ color: 0x3b2716, roughness: 0.9, metalness: 0 });
    // perfil de cima para baixo: topo abaulado (quarto de elipse), lateral da copa, depois a aba por baixo e por cima
    const perfil = [];
    const a = R0 * 0.985, y0 = 0.052, b = 0.053;
    for (let i = 0; i <= 24; i++) { const ph = Math.PI / 2 - (i / 24) * Math.PI / 2; perfil.push(new THREE.Vector2(a * Math.cos(ph), y0 + b * Math.sin(ph))); }
    perfil.push(new THREE.Vector2(R0, 0));
    for (let i = 1; i <= 8; i++) { const s = i / 8; perfil.push(new THREE.Vector2(R0 + BORDA * s, -0.002 * s)); }
    perfil.push(new THREE.Vector2(R0 + BORDA + 0.0012, -0.001), new THREE.Vector2(R0 + BORDA + 0.0012, 0.0015));
    for (let i = 8; i >= 0; i--) { const s = i / 8; perfil.push(new THREE.Vector2(R0 + BORDA * s, 0.0015 + 0.0045 * (1 - s))); }
    const geo = new THREE.LatheGeometry(perfil, 72);
    const pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), z = pos.getZ(k); let y = pos.getY(k);
      const r = Math.hypot(x, z);
      if (y > 0.03) y -= 0.01 * Math.exp(-Math.pow(r / 0.045, 2)); // vinco: afunda o topo ~1 cm no centro
      if (r > R0 + 0.001 && y < 0.02) { // aba: sobe nas laterais e cai um pouco na frente e atrás
        const f = Math.min(1, (r - R0) / BORDA), th = Math.atan2(x, z);
        y += Math.pow(f, 1.2) * (0.035 * Math.pow(Math.sin(th), 2) - 0.012 * Math.pow(Math.cos(th), 2));
      }
      pos.setY(k, y);
    }
    geo.computeVertexNormals();
    const hg = new THREE.Group(); hg.rotation.x = -0.105; hg.scale.set(0.95, 1, 1.12); // copa levemente oval, inclinada ~6° para trás
    const faixaM = new THREE.Mesh(new THREE.CylinderGeometry(R0 + 0.0012, R0 + 0.0012, 0.013, 48, 1, true), fita); faixaM.position.y = 0.0065;
    hg.add(new THREE.Mesh(geo, palha), faixaM);
    // se o cabelo passar da altura padrão, a copa cresce um pouco para envolver o topo do crânio
    hg.scale.y = Math.max(0.95, Math.min(1.2, (topo - ancora.y + 0.004) / ALT));
    g.add(hg);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  cabeca.add(g);
}

// Mantido por compatibilidade de assinatura; coletes reais vêm modelados direto nas malhas Rocketbox (evita anel atravessando o torso)
function coleteRefletivo(modelo, cor = 0xd9ea1e) {
  if (!modelo || cor == null) return;
}

// Calibragem PBR de alta fidelidade separando pele humana natural, olhos, tecido e EPIs (Microsoft Rocketbox 81-bone)
function melhorarMaterialHumano(m) {
  if (!m) return;
  const nome = String(m.name || '').toLowerCase();
  for (const tex of [m.map, m.normalMap, m.roughnessMap, m.metalnessMap]) {
    if (tex) tex.anisotropy = 8;
  }
  if (/eye|cornea|pupil/.test(nome)) {
    m.roughness = 0.14;
    m.metalness = 0.02;
    m.envMapIntensity = 1.25;
  } else if (/head|skin|face|hand/.test(nome)) {
    m.roughness = 0.54;
    m.metalness = 0.0;
    m.envMapIntensity = 0.78;
    if (m.normalMap && m.normalScale) m.normalScale.set(0.82, 0.82);
  } else if (/helmet|glass|buckle|metal/.test(nome)) {
    m.roughness = 0.34;
    m.metalness = 0.12;
    m.envMapIntensity = 0.92;
  } else {
    m.roughness = Math.max(m.roughness ?? 0.82, 0.80);
    m.metalness = 0.0;
    m.envMapIntensity = 0.50;
  }
}

// Roupa de campo: multiplica a cor do material do corpo por um tom terroso (clone, sem tocar na cabeça)
function tingirRoupa(modelo) {
  const TOM = new THREE.Color(0xd8ccb8);
  const tom = m => {
    if (!/body/i.test(m.name) || /head/i.test(m.name)) return m;
    const c = m.clone(); c.color.multiply(TOM); return c;
  };
  modelo.traverse(o => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map(tom) : tom(o.material);
  });
}

// Osso animado: lê a pose base (do mixer) e evita acumular a correção de um quadro para o outro
function baseOsso(it, osso, chave) {
  _hmAtual.copy(osso.quaternion);
  const ult = it[chave + 'Ult'], bas = it[chave + 'Base'];
  if (ult && bas && _hmAtual.equals(ult)) return bas;
  if (!bas) it[chave + 'Base'] = _hmAtual.clone();
  else bas.copy(_hmAtual);
  return it[chave + 'Base'];
}
// Aplica uma rotação feita no espaço do mundo sobre a pose base do osso
function aplicarOsso(it, osso, chave, delta, base) {
  osso.parent.getWorldQuaternion(_hmPq);
  _hmLoc.copy(_hmPq).invert().multiply(delta).multiply(_hmPq);
  osso.quaternion.copy(_hmLoc).multiply(base);
  if (!it[chave + 'Ult']) it[chave + 'Ult'] = osso.quaternion.clone();
  else it[chave + 'Ult'].copy(osso.quaternion);
}

const _hmDJaw = new THREE.Quaternion();
const _hmDBrow = new THREE.Quaternion();
const _hmDBlink = new THREE.Quaternion();
const _hmDArm = new THREE.Quaternion();
const _hmDArm2 = new THREE.Quaternion();

// NPC: animação esquelética completa de 81 ossos (lip-sync mandibular, lábios, sobrancelhas, piscar, olhar, tronco e gestos de mãos sincronizados com a fala)
function animarNPC(it, dt, cam) {
  if (!it.cabeca) return;
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  it.t += dt;
  const frente = it.frenteLocal
    ? _hmFrente.copy(it.frenteLocal).applyAxisAngle(_HM_UP, it.p.rotation.y)
    : it.frente;
  const dCam = it.p.position.distanceTo(cam);

  // Consulta o motor de fala 3D (SafraSpeechEngine) para sincronia fonética/acústica em tempo real
  const speechEng = typeof window !== 'undefined' ? window.__SAFRA_SPEECH__ : null;
  const sp = (speechEng && dCam < 14) ? speechEng.getAnimationState(it.nome) : null;
  const falando = !!(sp && sp.speaking) ||
    (dCam < 8 && (document.body.classList.contains('falando') || document.body.classList.contains('voz-tocando')) &&
     (!speechEng || !speechEng.speaker || speechEng.speaker === it.nome));

  const kFala = 1 - Math.exp(-8 * dt);
  const kJaw = 1 - Math.exp(-22 * dt);
  it.falaPeso = (it.falaPeso || 0) + ((falando ? 1 : 0) - (it.falaPeso || 0)) * kFala;

  const jawAlvo = falando
    ? (sp && sp.speaking ? sp.jawOpen : 0.42 + 0.38 * Math.max(0, Math.sin(it.t * 11.5 + it.fase)))
    : 0;
  const enfaseAlvo = falando
    ? (sp && sp.speaking ? sp.emphasis : 0.45 + 0.25 * Math.sin(it.t * 3.8))
    : 0;
  it.jaw = (it.jaw || 0) + (jawAlvo - (it.jaw || 0)) * kJaw;
  it.enfase = (it.enfase || 0) + (enfaseAlvo - (it.enfase || 0)) * kFala;

  // 1. Tronco: respiração + inclinação engajada e cadência prosódica durante a fala
  if (it.tronco) {
    const base = baseOsso(it, it.tronco, 'tr');
    const balanco = 0.032 * Math.sin(it.t * 0.9 + it.fase) +
      it.falaPeso * (0.028 * Math.sin(it.t * 3.1 + it.fase) + 0.018 * it.enfase);
    _hmDTr.setFromAxisAngle(frente, balanco);
    aplicarOsso(it, it.tronco, 'tr', _hmDTr, base);
  }

  it.raiz.updateMatrixWorld(true);
  const cab = it.cabeca;
  cab.getWorldPosition(_hmCab);
  _hmPara.subVectors(cam, _hmCab);
  _hmHz.set(_hmPara.x, 0, _hmPara.z);
  let yawAlvo = 0, pitchAlvo = 0;
  if (dCam < 12 && _hmHz.lengthSq() > 1e-6) {
    const cruz = frente.z * _hmHz.x - frente.x * _hmHz.z, dot = frente.x * _hmHz.x + frente.z * _hmHz.z;
    yawAlvo = cl(Math.atan2(cruz, dot), -0.87, 0.87);
    pitchAlvo = cl(Math.atan2(_hmPara.y, _hmHz.length()), -0.26, 0.26);
    if (it.falaPeso > 0.01) {
      const nod = (sp && sp.speaking) ? sp.headNod * 0.055 : 0.045 * Math.sin(it.t * 4.4);
      const tilt = (sp && sp.speaking) ? sp.headTilt * 0.04 : 0.035 * Math.sin(it.t * 2.1);
      pitchAlvo = cl(pitchAlvo + nod * it.falaPeso, -0.28, 0.28);
      yawAlvo = cl(yawAlvo + tilt * it.falaPeso, -0.9, 0.9);
    }
  }
  const k = 1 - Math.exp(-4.5 * dt);
  it.yaw += (yawAlvo - it.yaw) * k;
  it.pitch += (pitchAlvo - it.pitch) * k;

  // 2. Cabeça: olhar + acenos prosódicos
  const baseCab = baseOsso(it, cab, 'cab');
  _hmDY.setFromAxisAngle(_HM_UP, it.yaw);
  _hmFy.copy(frente).applyAxisAngle(_HM_UP, it.yaw);
  _hmEixo.crossVectors(_HM_UP, _hmFy).normalize();
  _hmDP.setFromAxisAngle(_hmEixo, -it.pitch);
  aplicarOsso(it, cab, 'cab', _hmDP.multiply(_hmDY), baseCab);

  // 3. Lip-Sync Facial (Bip01_MJaw, Bip01_MBottomLip e Bip01_MMiddleEyebrow)
  if (it.mandibula && (it.jaw > 0.002 || it.jawUlt)) {
    const baseJaw = baseOsso(it, it.mandibula, 'jaw');
    // Rotação positiva em torno do eixo transversal (_hmEixo) abre a mandíbula inferior no espaço do mundo
    _hmDJaw.setFromAxisAngle(_hmEixo, it.jaw * 0.22);
    aplicarOsso(it, it.mandibula, 'jaw', _hmDJaw, baseJaw);
  }
  if (it.labioInf && (it.jaw > 0.002 || it.lipUlt)) {
    const baseLip = baseOsso(it, it.labioInf, 'lip');
    _hmDJaw.setFromAxisAngle(_hmEixo, it.jaw * 0.09);
    aplicarOsso(it, it.labioInf, 'lip', _hmDJaw, baseLip);
  }
  if (it.sobrancelha && (it.enfase > 0.01 || it.browUlt)) {
    const baseBrow = baseOsso(it, it.sobrancelha, 'brow');
    _hmDBrow.setFromAxisAngle(_hmEixo, -it.enfase * 0.11 * it.falaPeso);
    aplicarOsso(it, it.sobrancelha, 'brow', _hmDBrow, baseBrow);
  }

  // 4. Piscar natural dos olhos (a cada ~3.8s + micro-piscada em transições de frase)
  if (dCam < 9 && (it.palpebraE || it.palpebraD)) {
    const cicloPiscar = (it.t + it.fase * 0.7) % 3.85;
    const blink = cicloPiscar < 0.13 ? Math.sin((cicloPiscar / 0.13) * Math.PI) : 0;
    if (blink > 0.01 || it.blkEUlt) {
      _hmDBlink.setFromAxisAngle(_hmEixo, blink * 0.32);
      if (it.palpebraE) aplicarOsso(it, it.palpebraE, 'blkE', _hmDBlink, baseOsso(it, it.palpebraE, 'blkE'));
      if (it.palpebraD) aplicarOsso(it, it.palpebraD, 'blkD', _hmDBlink, baseOsso(it, it.palpebraD, 'blkD'));
    }
  }

  // 5. Gestos conversacionais de antebraços e mãos sincronizados com os pulsos silábicos/palavras da fala
  if (it.falaPeso > 0.003 || it.fArmLUlt || it.fArmRUlt) {
    const peso = it.falaPeso;
    const gL = (sp && sp.speaking) ? sp.gestureL : (0.5 + 0.5 * Math.sin(it.t * 3.4 + it.fase));
    const gR = (sp && sp.speaking) ? sp.gestureR : (0.5 + 0.5 * Math.sin(it.t * 2.9 + it.fase + 1.5));

    if (it.antebracoE) {
      const bFE = baseOsso(it, it.antebracoE, 'fArmL');
      _hmDArm.setFromAxisAngle(_hmEixo, -peso * (0.18 + 0.22 * gL));
      _hmDArm2.setFromAxisAngle(_HM_UP, peso * 0.08 * Math.sin(it.t * 2.7 + it.fase));
      aplicarOsso(it, it.antebracoE, 'fArmL', _hmDArm.multiply(_hmDArm2), bFE);
    }
    if (it.antebracoD) {
      const escD = it.temPrancheta ? 0.35 : 0.85;
      const bFD = baseOsso(it, it.antebracoD, 'fArmR');
      _hmDArm.setFromAxisAngle(_hmEixo, -peso * escD * (0.14 + 0.20 * gR));
      _hmDArm2.setFromAxisAngle(_HM_UP, -peso * escD * 0.07 * Math.cos(it.t * 2.4 + it.fase));
      aplicarOsso(it, it.antebracoD, 'fArmR', _hmDArm.multiply(_hmDArm2), bFD);
    }
  }
}

function ligarHumanos(scene) {
  let _resolveTier1, _resolveAll;
  const tier1Ready = new Promise(r => { _resolveTier1 = r; });
  const ready = new Promise(r => { _resolveAll = r; });

  const api = {
    pronto: false, erro: null, mixers: [], ambientCount: 0, totalCount: 0,
    tier1Ready, ready,
    update(dt, cam) {
      // economia: só anima quem está a menos de 45 m da câmera
      for (const it of this.mixers) {
        if (!cam || it.p.position.distanceToSquared(cam) < 2025) { it.m.update(dt); if (cam) animarNPC(it, dt, cam); }
        // sombra só até ~40 m (histerese 38-42 m)
        const d2 = cam ? it.p.position.distanceToSquared(cam) : 0;
        const sombra = it.sombra ? d2 < 1764 : d2 < 1444;
        if (it.sombra !== sombra) { it.sombra = sombra; it.raiz.traverse(o => { if (o.isMesh) o.castShadow = sombra; }); }
      }
    }
  };
  window.__SAFRA_HUMANOS__ = api;

  // Garantia extra: oculta imediatamente qualquer malha procedural ("bonequinho") em todas as paradas e no Valdemar
  if (typeof PARADAS !== 'undefined') {
    PARADAS.forEach(s => {
      if (s && s.person) {
        s.person.children.forEach(ch => {
          if (!(ch.geometry && ch.geometry.type === 'CircleGeometry')) ch.visible = false;
        });
      }
    });
  }
  if (typeof window !== 'undefined' && window.__SAFRA_VALDEMAR__ && window.__SAFRA_VALDEMAR__.person) {
    window.__SAFRA_VALDEMAR__.person.children.forEach(ch => {
      if (!(ch.geometry && ch.geometry.type === 'CircleGeometry')) ch.visible = false;
    });
  }

  const lib = globalThis.__SAFRA_GLTF__;
  if (typeof HUMANOS_GLB !== 'undefined' && typeof window !== 'undefined') {
    window.HUMANOS_GLB = HUMANOS_GLB;
  }
  if (!lib || typeof HUMANOS_GLB === 'undefined') {
    api.erro = 'sem loader';
    _resolveTier1(api);
    _resolveAll(api);
    return api;
  }

  // Decodificador base64 de alta velocidade (usa data-URI nativo em C++ do navegador quando disponível, com fallback instantâneo para atob)
  const b64ToBufSync = s => {
    const bin = atob(s);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  };
  const b64ToBufAsync = async s => {
    if (typeof fetch === 'function' && typeof window !== 'undefined' && window.location && /^https?:/i.test(window.location.protocol)) {
      try {
        const r = await fetch('data:application/octet-stream;base64,' + s);
        return await r.arrayBuffer();
      } catch {}
    }
    return b64ToBufSync(s);
  };

  const loader = new lib.GLTFLoader();
  const gltfCache = {};
  const parse = async key => {
    if (gltfCache[key]) return gltfCache[key];
    const b64 = HUMANOS_GLB[key];
    if (!b64) throw new Error('GLB ausente: ' + key);
    const buf = await b64ToBufAsync(b64);
    const parsed = await new Promise((ok, falha) => loader.parse(buf, '', ok, falha));
    // Remove tracks órfãs de Bip01_Footsteps para eliminar warnings do THREE.PropertyBinding
    if (parsed && Array.isArray(parsed.animations)) {
      parsed.animations.forEach(anim => {
        if (Array.isArray(anim.tracks)) {
          anim.tracks = anim.tracks.filter(tr => !/^Bip01_Footsteps\./.test(tr.name));
        }
      });
    }
    gltfCache[key] = parsed;
    return parsed;
  };

  const clip = { m: null, f: null };

  const aplicarHumano = (s, cfg, permitirTroca = false) => {
    const P = s && s.person;
    if (!cfg || !P) return;
    const temExato = !!gltfCache[cfg.m];
    if (P.userData._humanoAplicado) {
      if (!permitirTroca || !P.userData._humanoProvisorio || !temExato) return;
      if (s.humano) {
        try { P.remove(s.humano); } catch {}
        s.humano = null;
      }
      const idxAnt = api.mixers.findIndex(it => it.p === P);
      if (idxAnt !== -1) api.mixers.splice(idxAnt, 1);
    }
    const gltf = gltfCache[cfg.m] || gltfCache[HUMANOS_IDLE[/Female/.test(cfg.m) ? 'f' : 'm']];
    if (!gltf) return;
    P.userData._humanoAplicado = true;
    P.userData._humanoProvisorio = !temExato;

    const modelo = lib.SkeletonUtils.clone(gltf.scene);
    modelo.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        melhorarMaterialHumano(m);
      }
    });
    const mixer = new THREE.AnimationMixer(modelo);
    const c = clip[/Female/.test(cfg.m) ? 'f' : 'm'] || (gltf.animations && gltf.animations[0]);
    if (c) { const act = mixer.clipAction(c); act.play(); act.time = Math.random() * c.duration; act.timeScale = 0.85 + Math.random() * 0.3; }
    mixer.update(0.001);
    // escala pela altura real, já na pose de respiração (sem braços em T)
    modelo.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(modelo, true);
    const alt = Math.max(0.01, box.max.y - box.min.y);
    modelo.scale.multiplyScalar(cfg.h / alt);
    modelo.updateMatrixWorld(true);
    // assenta no chão e centraliza no grupo da parada (coordenadas locais do grupo)
    const box2 = new THREE.Box3().setFromObject(modelo, true);
    modelo.position.y -= box2.min.y;
    modelo.position.x -= (box2.min.x + box2.max.x) / 2;
    modelo.position.z -= (box2.min.z + box2.max.z) / 2;
    if (HUMANOS_URBANOS.test(cfg.m)) tingirRoupa(modelo);
    if (cfg.acc) acessorioCabeca(modelo, cfg.acc, cfg.cor, cfg.dy || 0, cfg.folga || 1);
    if (cfg.colete) coleteRefletivo(modelo, cfg.colete);
    if (cfg.prancheta) {
      const mao = modelo.getObjectByName('Bip01_R_Hand') || modelo.getObjectByName('RightHand');
      if (mao) {
        const pr = new THREE.Group();
        const tab = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.30, 0.016), new THREE.MeshStandardMaterial({ color: 0x6d4a2c, roughness: 0.75 }));
        const pap = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.26, 0.006), new THREE.MeshStandardMaterial({ color: 0xf4f1e6, roughness: 0.85 }));
        pap.position.set(0, -0.01, 0.012);
        const clp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.022), new THREE.MeshStandardMaterial({ color: 0xc9cfd2, metalness: 0.6, roughness: 0.35 }));
        clp.position.set(0, 0.13, 0.012);
        pr.add(tab, pap, clp);
        pr.position.set(0.04, 0.06, 0.05);
        pr.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
        mao.add(pr);
      }
    }
    // esconde o boneco procedural (mantém a sombra de contato)
    P.children.forEach(ch => { if (!(ch.geometry && ch.geometry.type === 'CircleGeometry')) ch.visible = false; });
    P.add(modelo);
    // direção para onde o personagem olha (horizontal, do osso da cabeça para o nariz), e dados do olhar, face e gestos
    modelo.updateMatrixWorld(true);
    const cabOsso = modelo.getObjectByName('Bip01_Head'), narizOsso = modelo.getObjectByName('Bip01_MNose');
    const frente = _HM_FRONT_BASE.clone();
    if (cabOsso && narizOsso) {
      frente.subVectors(narizOsso.getWorldPosition(new THREE.Vector3()), cabOsso.getWorldPosition(new THREE.Vector3())); frente.y = 0;
      if (frente.lengthSq() > 1e-10) frente.normalize(); else frente.set(0, 0, 1);
    }
    const frenteLocal = frente.clone().applyAxisAngle(_HM_UP, -(P.rotation.y || 0));
    const nomeNPC = s.quem ? String(s.quem).split(',')[0].trim() : (cfg.nome ? String(cfg.nome).split(' ')[0].trim() : 'Valdemar');
    api.mixers.push({
      nome: nomeNPC,
      m: mixer,
      p: P,
      raiz: modelo,
      cabeca: cabOsso,
      pescoco: modelo.getObjectByName('Bip01_Neck'),
      tronco: modelo.getObjectByName('Bip01_Spine1'),
      mandibula: modelo.getObjectByName('Bip01_MJaw'),
      labioInf: modelo.getObjectByName('Bip01_MBottomLip'),
      sobrancelha: modelo.getObjectByName('Bip01_MMiddleEyebrow'),
      palpebraE: modelo.getObjectByName('Bip01_LEyeBlinkTop'),
      palpebraD: modelo.getObjectByName('Bip01_REyeBlinkTop'),
      antebracoE: modelo.getObjectByName('Bip01_L_Forearm'),
      antebracoD: modelo.getObjectByName('Bip01_R_Forearm'),
      temPrancheta: !!cfg.prancheta,
      frente,
      frenteLocal,
      fase: Math.random() * Math.PI * 2,
      t: 0,
      yaw: 0,
      pitch: 0,
      jaw: 0,
      enfase: 0,
      falaPeso: 0
    });
    s.humano = modelo;
    api.totalCount = api.mixers.length;
  };

  const chaves = [...new Set([...HUMANOS_CFG.map(c => c.m), ...HUMANOS_AMBIENTE.map(c => c.m), 'Male_Adult_05'])];
  const tier1Keys = [...new Set([HUMANOS_IDLE.f, HUMANOS_IDLE.m, 'Male_Adult_05', HUMANOS_CFG[0].m, HUMANOS_CFG[1].m])];
  const tier2Keys = chaves.filter(k => !tier1Keys.includes(k));
  const yieldFrame = (ms = 12) => new Promise(r => setTimeout(r, ms));
  const ambTargets = [];

  (async () => {
    try {
      // Tier 1: carrega Helena (Sede), Caio (Talhão 12), Valdemar (Portaria) e as bases humanas M/F
      for (const k of tier1Keys) {
        await parse(k);
        await yieldFrame(4);
      }
      clip.m = gltfCache[HUMANOS_IDLE.m] && gltfCache[HUMANOS_IDLE.m].animations[0];
      clip.f = gltfCache[HUMANOS_IDLE.f] && gltfCache[HUMANOS_IDLE.f].animations[0];

      // Garante que TODAS as 10 paradas, o Valdemar e os 6 personagens de ambiente tenham humano 3D Rocketbox visível no Frame 0
      PARADAS.forEach((s, i) => {
        aplicarHumano(s, HUMANOS_CFG[i], false);
      });
      if (window.__SAFRA_VALDEMAR__ && window.__SAFRA_VALDEMAR__.person) {
        aplicarHumano(window.__SAFRA_VALDEMAR__, { nome: 'Valdemar', m: 'Male_Adult_05', h: 1.78, acc: 'capacete', cor: 0xf4f6f4, dy: 0.006, folga: 1.07, prancheta: true }, false);
      }
      if (scene) {
        const gh = typeof getTerrainHeight === 'function' ? getTerrainHeight : () => 0;
        const sombraGeo = new THREE.CircleGeometry(0.42, 14);
        const sombraMat = new THREE.MeshBasicMaterial({ color: 0x050809, transparent: true, opacity: 0.34, depthWrite: false });
        for (const a of HUMANOS_AMBIENTE) {
          const g = new THREE.Group();
          g.name = a.id;
          g.position.set(a.x, gh(a.x, a.z) + (a.dyGround || 0), a.z);
          g.rotation.y = a.yaw || 0;
          const sh = new THREE.Mesh(sombraGeo, sombraMat);
          sh.rotation.x = -Math.PI / 2;
          sh.position.y = 0.025;
          g.add(sh);
          scene.add(g);
          const ref = { person: g, quem: a.nome, cfg: a };
          ambTargets.push(ref);
          aplicarHumano(ref, a, false);
          api.ambientCount++;
        }
      }

      api.totalCount = api.mixers.length;
      api.tier1Pronto = true;
      _resolveTier1(api);

      // Tier 2: carrega os trajes especializados de cada setor e atualiza o modelo 3D em segundo plano
      for (const k of tier2Keys) {
        await yieldFrame(18);
        try {
          await parse(k);
          PARADAS.forEach((s, i) => {
            if (HUMANOS_CFG[i].m === k) aplicarHumano(s, HUMANOS_CFG[i], true);
          });
          ambTargets.forEach(ref => {
            if (ref.cfg.m === k) aplicarHumano(ref, ref.cfg, true);
          });
        } catch {}
      }

      api.totalCount = api.mixers.length;
      api.pronto = true;
      _resolveAll(api);
    } catch (e) {
      api.erro = String(e && e.message || e);
      console.warn('humanos: ' + api.erro);
      _resolveTier1(api);
      _resolveAll(api);
    }
  })();

  return api;
}

