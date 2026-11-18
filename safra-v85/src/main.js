// === main.js ===













const runtimeErrors = [];
window.addEventListener('error', e => runtimeErrors.push(e.message || String(e)));
window.addEventListener('unhandledrejection', e => runtimeErrors.push(String(e.reason || e)));

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function boot() {
  const canvas = document.getElementById('view');
  const engine = new EngineRenderer(canvas);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xd99b66, 0.0028);

  const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.15, 1600);
  camera.rotation.order = 'YXZ';

  const state = {
    i: 0,
    pontos: 0,
    tent: 0,
    feitas: {},
    cenas: {},
    sinais: {},
    perg: {},
    evid: {},
    murmurios: {},
    cadeia: { armado: false, visto: false },
    nivel: 'executivo',
    desculpas: {},
    eggs: {},
    // Caderno de Campo: verbetes destravados (id -> true), os recém-destravados ainda sem visto, e mirantes observados
    codex: {},
    codexNovos: {},
    mirantes: {},
    observando: false,
    gafes: 0,
    ligacao: null,
    cracha: { adv: 0, expulsoes: 0, log: [], seguidas: 0, elogiosUsados: [] },
    abertura: false,
    atraso: 0,
    nome: 'Consultor',
    on: false,
    fim: false,
    demo: false,
    modalOpen: true,
    cfg: {
      qual: engine.autoInfo.tier,
      qualAuto: true,
      det: engine.autoInfo.det,
      sens: 1.0,
      fov: 68,
      vol: 0.9,
      invY: false,
      reduz: false,
      medir: false,
      som: true
    }
  };

  const player = { x: -104, y: 1.72, z: -2.5, yaw: -1.15, pitch: -0.04 };
  // contadores do crachá (advertir/expulsar): buzina seguida, correria, saída da área, tecla E sem conversa
  let buzinaN = 0, buzinaT = 0, correT = 0, foraT = 0, advT = -1e9, zoeira = [];
  // Caderno de Campo: fila de pílulas (uma por vez) e verificação a cada 0,5 s; mirante em observação (null quando livre)
  let codexT = 0, codexFila = [], codexOcupado = false, obs = null;
  const OBS_SOBE = 1.9, OBS_TOTAL = 7; // segundos: subida da câmera e volta completa do giro
  // ===== Tablet na mão: o caderno de descoberta do executivo =====
  const tabCv = document.createElement('canvas'); tabCv.width = 768; tabCv.height = 540;
  const tabCtx = tabCv.getContext('2d');
  const tabTex = new THREE.CanvasTexture(tabCv); tabTex.colorSpace = THREE.SRGBColorSpace; tabTex.anisotropy = 4;
  const tablet = new THREE.Group();
  {
    const onTop = m => { m.depthTest = false; m.depthWrite = false; m.fog = false; return m; };
    const shape = new THREE.Shape(); const W = 0.3, Hh = 0.21, r = 0.018;
    shape.moveTo(-W / 2 + r, -Hh / 2); shape.lineTo(W / 2 - r, -Hh / 2); shape.quadraticCurveTo(W / 2, -Hh / 2, W / 2, -Hh / 2 + r);
    shape.lineTo(W / 2, Hh / 2 - r); shape.quadraticCurveTo(W / 2, Hh / 2, W / 2 - r, Hh / 2); shape.lineTo(-W / 2 + r, Hh / 2);
    shape.quadraticCurveTo(-W / 2, Hh / 2, -W / 2, Hh / 2 - r); shape.lineTo(-W / 2, -Hh / 2 + r); shape.quadraticCurveTo(-W / 2, -Hh / 2, -W / 2 + r, -Hh / 2);
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2, curveSegments: 6 }),
      onTop(new THREE.MeshStandardMaterial({ color: 0x1a1f22, roughness: 0.45, metalness: 0.3 })));
    body.position.z = -0.012; body.renderOrder = 998; tablet.add(body);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.276, 0.194), onTop(new THREE.MeshBasicMaterial({ map: tabTex, toneMapped: false })));
    scr.position.z = 0.0035; scr.renderOrder = 999; tablet.add(scr);
    // mão segurando a borda de baixo
    const pele = onTop(new THREE.MeshStandardMaterial({ color: 0xb98563, roughness: 0.7 }));
    const mao = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.09, 4, 10), pele); mao.rotation.z = Math.PI / 2; mao.position.set(0.05, -0.112, -0.004); mao.renderOrder = 997; tablet.add(mao);
    const dedo = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.03, 3, 8), pele); dedo.position.set(0.01, -0.09, 0.006); dedo.rotation.z = 0.3; dedo.renderOrder = 1000; tablet.add(dedo);
  }
  scene.add(tablet);
  const _tabM = new THREE.Matrix4(), _tabL = new THREE.Matrix4();
  const tabBase = () => document.body.classList.contains('toque')
    ? { p: [0.23, -0.2, -0.5], s: 0.72 } : { p: [0.25, -0.22, -0.52], s: 1.12 };
  function drawTablet() {
    const g = tabCtx, W = 512, Hh = 360; g.setTransform(1.5, 0, 0, 1.5, 0, 0);
    g.fillStyle = '#0b1a1c'; g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#00b3a4'; g.fillRect(0, 0, W, 46);
    g.fillStyle = '#04201d'; g.font = '800 22px Archivo, Arial Narrow, sans-serif'; g.fillText('CADERNO DO EXECUTIVO', 18, 31);
    const cur = PARADAS[Math.min(state.i, PARADAS.length - 1)];
    g.textAlign = 'right'; g.fillText(state.fim ? 'FIM DO DIA' : addMin(cur.hora, state.atraso || 0), W - 18, 31); g.textAlign = 'left';
    const ato = ATOS.find(a => a.n === cur.ato);
    g.fillStyle = 'rgba(238,246,241,.6)'; g.font = '600 18px Inter, sans-serif';
    g.fillText(state.fim ? 'Devolutiva na diretoria pendente' : (ato ? `Ato ${ato.n} · ${ato.t}` : ''), 18, 76);
    g.fillStyle = '#eef6f1'; g.font = '800 30px Archivo, Arial Narrow, sans-serif';
    g.fillText(state.fim ? 'Reunião com Dr. Augusto' : `${cur.lugar}`, 18, 112);
    g.fillStyle = 'rgba(238,246,241,.75)'; g.font = '500 19px Inter, sans-serif';
    if (!state.fim) g.fillText(cur.quem, 18, 138);
    // seta para a próxima parada
    if (!state.fim) {
      const ang = Math.atan2(-(cur.x - player.x), -(cur.nz - player.z)) - player.yaw;
      const dist = Math.round(Math.hypot(cur.x - player.x, cur.nz - player.z));
      g.save(); g.translate(W - 62, 112); g.rotate(-ang); g.fillStyle = '#ffb629';
      g.beginPath(); g.moveTo(0, -26); g.lineTo(16, 14); g.lineTo(0, 6); g.lineTo(-16, 14); g.closePath(); g.fill(); g.restore();
      g.fillStyle = '#ffb629'; g.font = '700 15px Inter, sans-serif'; g.textAlign = 'center'; g.fillText(`${dist} m`, W - 62, 154); g.textAlign = 'left';
    }
    const card = (x, lbl, val, cor) => { g.fillStyle = 'rgba(238,246,241,.07)'; g.fillRect(x, 176, 150, 76); g.fillStyle = cor || '#eef6f1'; g.font = '800 34px Archivo, Arial Narrow, sans-serif'; g.fillText(val, x + 12, 220); g.fillStyle = 'rgba(238,246,241,.6)'; g.font = '700 14px Inter, sans-serif'; g.fillText(lbl, x + 12, 242); };
    card(18, 'EVIDÊNCIAS', `${Object.keys(state.evid).length}/${EVIDENCIAS.length}`);
    card(181, 'DESCULPAS OUVIDAS', `${Object.keys(state.desculpas).length}`, '#ffb629');
    card(344, 'GAFES', `${state.gafes}`, state.gafes ? '#ff7a5c' : '#5fe0c8');
    const feitas = state.fim ? PARADAS.length : Object.keys(state.feitas || {}).length;
    g.fillStyle = 'rgba(238,246,241,.12)'; g.fillRect(18, 264, W - 36, 6);
    g.fillStyle = '#5fe0c8'; g.fillRect(18, 264, (W - 36) * Math.min(1, feitas / PARADAS.length), 6);
    const ult = Object.values(state.desculpas).slice(-1)[0];
    g.fillStyle = 'rgba(238,246,241,.85)'; g.font = 'italic 500 18px Inter, sans-serif';
    const txt = ult ? `Última desculpa: ${ult}` : 'Converse com a operação. Anote as desculpas.';
    let line = '', y = 288; for (const w of txt.split(' ')) { if (g.measureText(line + w).width > W - 36) { g.fillText(line, 18, y); y += 22; line = ''; } line += w + ' '; } g.fillText(line, 18, y);
    g.fillStyle = 'rgba(238,246,241,.4)'; g.font = '600 14px Inter, sans-serif'; g.fillText(`${state.pontos} pts · nível ${(NIVEIS[state.nivel] || NIVEIS.executivo).n}${Object.keys(state.eggs).length ? ` · segredos ${Object.keys(state.eggs).length}/${EASTER.length}` : ''} · Caderno ${Object.keys(state.codex).length}/${CODEX.length}`, 18, Hh - 14);
    tabTex.needsUpdate = true;
  }

  const sound = new SoundEngine();
  // Controle de música: tecla N e botão ao lado da Pausa (preferência guardada no navegador)
  const btSom = document.createElement('button');
  btSom.type = 'button';
  btSom.id = 'btSom';
  btSom.hidden = true;
  btSom.style.cssText = 'pointer-events:auto;background:var(--vidro);border:1px solid var(--linha);color:var(--claro);font:700 10px/1 var(--f-texto);padding:9px 12px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;';
  const rotuloSom = () => { btSom.textContent = sound.musica ? 'Música: ligada' : 'Música: desligada'; btSom.setAttribute('aria-pressed', String(sound.musica)); };
  rotuloSom();
  btSom.addEventListener('click', () => { sound.resume(); sound.toggleMusica(); rotuloSom(); });
  document.getElementById('btMenu').insertAdjacentElement('afterend', btSom);
  window.addEventListener('keydown', e => {
    if (e.code !== 'KeyN' || e.repeat || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    sound.toggleMusica(); rotuloSom();
  });
  // buzina do caminhão: duas notas graves, volume pela distância
  window.addEventListener('safra-buzina', e => {
    const g = Math.max(0.03, 0.16 * (1 - (e.detail.dist || 10) / 18));
    sound.playTone(311, 0.32, 'square', g); sound.playTone(392, 0.32, 'square', g * 0.8);
    setTimeout(() => { sound.playTone(311, 0.45, 'square', g); sound.playTone(392, 0.45, 'square', g * 0.8); }, 420);
    if (state.on && !state.modalOpen && (e.detail.dist || 99) < 9) hud.notify('Bi-biii! Sai da pista que a cana não espera.');
    // buzinadas seguidas com o jogador na frente do caminhão: na terceira, expulsão
    const agora = performance.now(), perto = (e.detail.dist || 99) < 9;
    if (perto && agora - buzinaT < 4500) buzinaN++; else buzinaN = perto ? 1 : 0;
    buzinaT = agora;
    if (buzinaN >= 3) { buzinaN = 0; advertir('pista_com_caminhao'); }
  });

  const hud = new HUD(state, {
    setQuality(q) {
      if (q === 'auto') {
        state.cfg.qualAuto = true;
        state.cfg.qual = engine.autoInfo.tier;
      } else {
        state.cfg.qualAuto = false;
        state.cfg.qual = q;
      }
      engine.applyQuality(state.cfg.qual);
      shadowRig.applyQuality(state.cfg.qual);
      planar.resize(window.innerWidth, window.innerHeight, state.cfg.qual === 'alta' ? 0.65 : state.cfg.qual === 'media' ? 0.45 : 0);
      engine.resetWorst();
    },
    updateAudio() {
      sound.setConfig(state.cfg.som, state.cfg.vol);
    },
    applyFov(fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    },
    playOk() { sound.playOk(); },
    playErr() { sound.playErr(); },
    playModal(abrir) { if (sound && sound.playModal) sound.playModal(abrir); },
    focusStop(parada) {
      if (!parada) {
        state.camConversa = null;
        return;
      }
      const P = parada.person;
      if (P && P.position) {
        const r = (P.userData && P.userData.anim && P.userData.anim.yaw != null) ? P.userData.anim.yaw : P.rotation.y;
        const dist = 2.25;
        const cx = P.position.x + Math.sin(r) * dist + Math.cos(r) * 0.28;
        const cz = P.position.z + Math.cos(r) * dist - Math.sin(r) * 0.28;
        const cy = getTerrainHeight(cx, cz) + 1.54;
        const alvoX = P.position.x + Math.cos(r) * 0.42;
        const alvoZ = P.position.z - Math.sin(r) * 0.42;
        const cyaw = Math.atan2(-(alvoX - cx), -(alvoZ - cz));
        P.rotation.y = Math.atan2(cx - P.position.x, cz - P.position.z);
        state.camConversa = { x: cx, y: cy, z: cz, yaw: cyaw, pitch: -0.02 };
        camera.position.set(cx, cy, cz);
        camera.rotation.y = cyaw;
        camera.rotation.x = -0.02;
      } else {
        const cx = parada.x + (parada.lado > 0 ? 0.35 : -0.35);
        const cz = parada.nz + (parada.lado > 0 ? -2.35 : 2.35);
        const cy = getTerrainHeight(cx, cz) + 1.56;
        const cyaw = Math.atan2(-(parada.x - cx), -(parada.nz - cz));
        state.camConversa = { x: cx, y: cy, z: cz, yaw: cyaw, pitch: -0.02 };
      }
    },
    goToStop() {
      const cur = PARADAS[state.i];
      if (!cur) return;
      if (hud._cenaFim) hud._cenaFim();
      player.x = cur.x;
      player.z = cur.nz + (cur.lado > 0 ? -3.1 : 3.1);
      player.yaw = Math.atan2(-(cur.x - player.x), -(cur.nz - player.z));
      player.pitch = -0.02;
      hud.showLocalCard(cur.lugar, cur.quem);
    },
    triggerInteract() {
      const tgt = findInteractTarget();
      if (tgt) executeInteract(tgt);
    },
    advertir: id => advertir(id),
    completeStop(parada) {
      if (state.feitas[parada.id]) return;
      state.feitas[parada.id] = parada.feito;
      state.pontos += 40;
      sound.playOk();
      checarCodex();
      // elogio raro: três paradas seguidas com confiança final 70+ e sem advertência; cada elogio uma vez por jogo
      const cc = state.conv && state.conv[parada.id];
      state.cracha.seguidas = cc && cc.conf >= 70 ? state.cracha.seguidas + 1 : 0;
      if (state.cracha.seguidas >= 3 && state.cracha.elogiosUsados.length < FISCAL.elogios.length) {
        const k = state.cracha.elogiosUsados.length;
        state.cracha.elogiosUsados.push(k); state.cracha.seguidas = 0;
        setTimeout(() => valdemarFala([['Valdemar', FISCAL.elogios[k]]]), 1800);
      }
      if (parada.id === 'auto' && !state.evid['ev-auto1']) {
        state.cadeia.armado = true;
      }
      // Avança para próxima parada pendente
      const nextIdx = PARADAS.findIndex(p => !state.feitas[p.id]);
      if (nextIdx === -1) {
        state.i = PARADAS.length;
        state.fim = true;
        hud.notify('Dia completo! Hora da devolutiva na sala da diretoria com o Dr. Augusto.');
        if (parada.radioDepois) hud.showRadio(parada.radioDepois);
      } else {
        const atoAntes = PARADAS[state.i] && PARADAS[state.i].ato;
        state.i = nextIdx;
        const prox = PARADAS[nextIdx], novoAto = ATOS.find(x => x.n === prox.ato);
        if (novoAto && prox.ato !== atoAntes) {
          setTimeout(() => hud.showLocalCard(`Ato ${novoAto.n} · ${novoAto.t.split(' · ')[1]}`, novoAto.s), 900);
        }
        if (parada.radioDepois) {
          hud.showRadio(parada.radioDepois);
        } else if (novoAto && prox.ato !== atoAntes) {
          hud.showRadio(`Ato ${novoAto.n}: ${novoAto.s} Próxima parada: ${prox.lugar} (${prox.hora}).`);
        } else {
          hud.showRadio(`Próxima parada: ${prox.lugar} (${prox.hora})`);
        }
      }
      hud.updateTopHUD();
    },
    startGame(isDemo) {
      sound.resume();
      hud.unlockVoz();
      sound.setConfig(state.cfg.som, state.cfg.vol);
      state.on = true;
      state.demo = isDemo;
      document.body.classList.add('jogo');
      document.body.dataset.state = 'playing';
      document.getElementById('btMenu').hidden = false;
      if (document.getElementById('btKonviva')) document.getElementById('btKonviva').hidden = false;
      document.getElementById('mira').hidden = false;
      document.getElementById('ajuda').hidden = false;
      document.getElementById('bussola').hidden = false;
      window.SAFRA_BRILHO = (NIVEIS[state.nivel] || NIVEIS.executivo).brilho;
      document.getElementById('manche').hidden = false;
      if (window.__SAFRA_TOUCH__) setTimeout(window.__SAFRA_TOUCH__.avisoGiro, 1500);
      hud.updateTopHUD();
      if (hud.updateAcousticBadge) hud.updateAcousticBadge(sound.bioma);

      if (isDemo) {
        runDemoMode();
      } else {
        const cur = PARADAS[0];
        const sp = (typeof SAFRA_SCENARIO !== 'undefined' && SAFRA_SCENARIO.spawn) || { x: -119, z: 0.6, yaw: -1.0, pitch: -0.03 };
        // Início fixo na pista, perto da portaria; olha para +x com leve giro para a sede
        player.x = sp.x;
        player.z = sp.z;
        player.yaw = sp.yaw;
        player.pitch = sp.pitch;
        // abertura na sala da diretoria antes de liberar o controle (pulável)
        state.abertura = true; state.modalOpen = true;
        hud.abertura(state.nivel).then(() => {
          state.abertura = false; state.modalOpen = false;
          hud.notify('Crachá de visitante liberado');
          hud.showLocalCard(cur.lugar, cur.quem);
          hud.updateTopHUD();
        });
      }
    }
  });

  hud.setLoading('Assando materiais PBR…', 20);
  await sleep(10);

  const texSize = state.cfg.qual === 'baixa' ? 256 : 512;
  const matLib = new MaterialLibrary(engine.renderer, texSize);
  matLib.bakeAll();

  hud.setLoading('Construindo céu físico e sombras…', 42);
  await sleep(10);

  const shadowRig = new ShadowRig(scene);
  const sky = new PhysicalSky(scene, engine.renderer);
  const planar = new PlanarReflector(engine.renderer, scene, camera);
  engine.initPost(scene, camera);
  engine.applyQuality(state.cfg.qual);
  shadowRig.applyQuality(state.cfg.qual);
  planar.resize(window.innerWidth, window.innerHeight, state.cfg.qual === 'alta' ? 0.65 : state.cfg.qual === 'media' ? 0.45 : 0);

  hud.setLoading('Gerando terreno e canavial…', 65);
  await sleep(10);

  const terrain = buildTerrain(scene, matLib, planar);
  const veg = buildVegetation(scene, matLib);
  const particles = new ParticleManager(scene);

  hud.setLoading('Montando as dez paradas…', 86);
  await sleep(10);

  sound.onBiomeChange(bio => { if (hud && hud.updateAcousticBadge) hud.updateAcousticBadge(bio); });

  const stopsWorld = buildAllStops(scene, matLib, particles);
  const humanos = ligarHumanos(scene);
  if (hud && hud.loadVoiceManifest) hud.loadVoiceManifest();

  hud.setLoading('Ativando personagens 3D da Usina Horizonte…', 94);
  if (humanos && humanos.tier1Ready) {
    await Promise.race([humanos.tier1Ready, sleep(6000)]);
  }

  hud.setLoading('Pronto.', 100);
  await sleep(60);
  hud.hideLoading();
  hud.showTitle(`${state.cfg.qual.toUpperCase()} (${state.cfg.det || 'GPU'})`);
  document.body.dataset.state = 'title';
  drawTablet();
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('autostart') === '1') {
    window.__SAFRA_DEBUG__ && window.__SAFRA_DEBUG__.startPlaying();
  }

  // Controles de teclado e mouse
  const keys = {};
  let dragLook = false;
  let holdTimer = 0;
  let wasTabVis = false;
  const limpaTeclas = () => { for (const k in keys) keys[k] = false; holdTimer = 0; dragLook = false; };
  window.addEventListener('blur', limpaTeclas);
  document.addEventListener('visibilitychange', () => { if (document.hidden) limpaTeclas(); });

  window.addEventListener('resize', () => {
    engine.resize(window.innerWidth, window.innerHeight);
    planar.resize(window.innerWidth, window.innerHeight, state.cfg.qual === 'alta' ? 0.65 : state.cfg.qual === 'media' ? 0.45 : 0);
  });

  window.addEventListener('keydown', e => {
    if (!state.on && !state.abertura) {
      if ((e.code === 'Enter' || (e.code === 'Space' && e.target.tagName !== 'INPUT')) && !e.repeat) {
        const btEntrar = document.getElementById('entrar');
        if (btEntrar && !document.getElementById('veu').hidden) { e.preventDefault(); btEntrar.click(); return; }
      }
      return;
    }
    keys[e.code] = true;
    if (!state.on || state.abertura) return;
    if (e.code === 'KeyE' && !e.repeat && !state.modalOpen && !obs) {
      hud.unlockVoz();
      // apertar E repetidamente sem abrir conversa: 5 vezes em 10 s vira advertência
      const agora = performance.now();
      zoeira = zoeira.filter(t => agora - t < 10000); zoeira.push(agora);
      if (zoeira.length >= 5) { zoeira = []; advertir('zoeira_repetida'); }
    }
    // digitando na busca do Caderno ou no Mentor Konviva: só Esc passa (teclas de letra/número não viram atalho)
    if (/INPUT|TEXTAREA/.test(e.target.tagName) && e.code !== 'Escape') return;
    if (e.code === 'KeyK' && !e.repeat && !obs) {
      hud.toggleKonviva();
      return;
    }
    if (state.modalOpen && /^Digit[1-4]$|^Numpad[1-4]$/.test(e.code) && !e.repeat) {
      hud.unlockVoz();
      const n = e.code.slice(-1);
      const btn = document.querySelector(`#convOpc button[data-num="${n}"]:not([disabled])`);
      if (btn) { e.preventDefault(); btn.click(); return; }
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (obs) return;
      if (state.modalOpen) { if (hud.cadernoAberto()) hud.fechaCaderno(); else hud.closeModal(); }
      else hud.showPause();
    } else if (e.code === 'KeyG' && !state.modalOpen && !obs) {
      hud.cb.goToStop();
    } else if (e.code === 'KeyM' && !obs) {
      if (state.modalOpen) hud.closeModal();
      else hud.showPlatform();
    } else if (e.code === 'KeyC' && !state.modalOpen && !obs) {
      hud.showCaderno();
    }
  });

  window.addEventListener('keyup', e => {
    keys[e.code] = false;
    if (e.code === 'KeyE') holdTimer = 0;
  });

  canvas.addEventListener('mousedown', e => {
    if (!state.on || state.modalOpen || obs) return;
    sound.resume();
    hud.unlockVoz();
    dragLook = true;
    if (canvas.requestPointerLock && !navigator.webdriver) {
      try { canvas.requestPointerLock(); } catch {}
    }
  });
  window.addEventListener('mouseup', () => { dragLook = false; });
  window.addEventListener('mousemove', e => {
    if (!state.on || state.modalOpen || obs) return;
    if (document.pointerLockElement === canvas || dragLook) {
      const sens = 0.0022 * state.cfg.sens;
      player.yaw -= e.movementX * sens;
      player.pitch -= e.movementY * sens * (state.cfg.invY ? -1 : 1);
      player.pitch = Math.max(-1.25, Math.min(1.25, player.pitch));
    }
  });

  // Controles de toque (celular e tablet): joystick que aparece onde o polegar encosta,
  // metade direita da tela para olhar, botão de ação que se segura como a tecla E.
  const isTouch = (window.matchMedia && matchMedia('(pointer:coarse)').matches) || 'ontouchstart' in window;
  const touchMove = { x: 0, z: 0, mag: 0, run: false };
  if (isTouch) {
    document.body.classList.add('toque');
    const manche = document.getElementById('manche'), knob = manche.querySelector('i');
    const RAIO = 52;
    let stickId = null, sx = 0, sy = 0, lookId = null, lx = 0, ly = 0;
    const soltaManche = () => {
      stickId = null; touchMove.x = touchMove.z = touchMove.mag = 0; touchMove.run = false;
      knob.style.transform = ''; manche.classList.remove('on'); manche.style.left = ''; manche.style.top = '';
    };
    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' || !state.on || state.modalOpen || obs) return;
      e.preventDefault();
      sound.resume();
      hud.unlockVoz();
      if (e.clientX < window.innerWidth * 0.45 && stickId === null) {
        stickId = e.pointerId; sx = e.clientX; sy = e.clientY;
        manche.style.left = (sx - 56) + 'px'; manche.style.top = (sy - 56) + 'px'; manche.classList.add('on');
      } else if (lookId === null) {
        lookId = e.pointerId; lx = e.clientX; ly = e.clientY;
      }
      try { canvas.setPointerCapture(e.pointerId); } catch {}
    }, { passive: false });
    canvas.addEventListener('pointermove', e => {
      if (e.pointerId === stickId) {
        let dx = e.clientX - sx, dy = e.clientY - sy;
        const d = Math.hypot(dx, dy);
        touchMove.run = d > RAIO * 1.45; // empurrar o polegar além da borda corre
        if (d > RAIO) { dx *= RAIO / d; dy *= RAIO / d; }
        knob.style.transform = `translate(${dx}px,${dy}px)`;
        const dead = 0.12, m = Math.min(1, d / RAIO);
        touchMove.mag = m < dead ? 0 : (m - dead) / (1 - dead);
        touchMove.x = dx / RAIO; touchMove.z = dy / RAIO;
      } else if (e.pointerId === lookId) {
        const sens = 0.0052 * state.cfg.sens;
        player.yaw -= (e.clientX - lx) * sens;
        player.pitch -= (e.clientY - ly) * sens * (state.cfg.invY ? -1 : 1);
        player.pitch = Math.max(-1.25, Math.min(1.25, player.pitch));
        lx = e.clientX; ly = e.clientY;
      }
    });
    const fimToque = e => {
      if (e.pointerId === stickId) soltaManche();
      if (e.pointerId === lookId) lookId = null;
    };
    canvas.addEventListener('pointerup', fimToque);
    canvas.addEventListener('pointercancel', fimToque);
    // modal aberto no meio do gesto: solta tudo
    const solta = () => { soltaManche(); lookId = null; keys.KeyE = false; holdTimer = 0; };
    window.addEventListener('blur', solta);
    document.addEventListener('visibilitychange', () => { if (document.hidden) solta(); });
    // botão de ação: segurar = tecla E (conversa e registro de evidência)
    const bt = document.getElementById('btFala');
    bt.onclick = null;
    bt.addEventListener('pointerdown', e => { e.preventDefault(); sound.resume(); hud.unlockVoz(); keys.KeyE = true; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => bt.addEventListener(n, () => { keys.KeyE = false; holdTimer = 0; }));
    bt.addEventListener('contextmenu', e => e.preventDefault());
    // retrato funciona, mas paisagem mostra mais da usina
    const avisoGiro = () => { if (state.on && window.innerHeight > window.innerWidth) hud.notify('Gire o celular para ver mais da usina'); };
    window.addEventListener('orientationchange', () => setTimeout(avisoGiro, 400));
    window.__SAFRA_TOUCH__ = { avisoGiro, touchMove };
  }

  // ===== Crachá de visitante (historia/data__historia.js): advertências do Valdemar e expulsão =====
  // Balão do Valdemar: não trava o jogo (é a faixa de cena existente). Nunca roda na demo nem na abertura.
  function valdemarFala(falas) {
    if (!state.on || state.demo) return;
    hud.playCena({ quem: 'Valdemar, gerente de operações', roteiro: falas });
  }
  // Ponto central: advertência com cooldown de 20 s; ao chegar no limite do nível, a próxima infração vira expulsão
  function advertir(id) {
    if (!state.on || state.demo || state.abertura || state.fim || obs) return;
    const g = FISCAL.gatilhos.find(x => x.id === id);
    if (!g) return;
    const cr = state.cracha, lim = REGRAS_CRACHA.advertenciasAteExpulsao[state.nivel] || 3;
    if (g.efeito === 'expulsao' || cr.adv >= lim) return expulsar(g);
    const agora = performance.now();
    if (agora - advT < 20000) return;
    advT = agora;
    cr.adv++; cr.seguidas = 0;
    const av = FISCAL.avisos[Math.min(cr.adv, 3) - 1];
    const fala = av.falas[cr.log.length % av.falas.length];
    cr.log.push({ id, nivel: cr.adv });
    sound.playErr();
    hud.atualizaCracha(); hud.pulsaCracha();
    hud.notify(`Advertência ${cr.adv} de ${lim}: ${g.erro}`);
    valdemarFala([['Valdemar', fala], ['Valdemar', g.fala]]);
    // Valdemar aparece a ~3 m à frente do jogador, virado para ele, por 6 s
    const v = window.__SAFRA_VALDEMAR__;
    if (v) v.irAte(player.x - Math.sin(player.yaw) * 3, player.z - Math.cos(player.yaw) * 3, player.yaw);
  }
  // Expulsão: crachá pedido, volta para a portaria, confiança da parada zera, relógio +30 min, penalidade de pontos
  function expulsar(g) {
    const cr = state.cracha, nv = state.nivel;
    cr.expulsoes++; cr.adv = 0; cr.seguidas = 0;
    state.pontos = Math.max(0, state.pontos + (REGRAS_CRACHA.penalidadePontosExpulsao[nv] || 0));
    const cur = PARADAS[Math.min(state.i, PARADAS.length - 1)];
    const c = cur && state.conv && state.conv[cur.id];
    if (c && !state.feitas[cur.id]) c.conf = 0;
    state.atraso = (state.atraso || 0) + REGRAS_CRACHA.consequencias.avancaMinutos;
    cr.log.push({ id: g.id, expulsao: true });
    if (window.__SAFRA_VALDEMAR__) window.__SAFRA_VALDEMAR__.voltar();
    const sp = (typeof SAFRA_SCENARIO !== 'undefined' && SAFRA_SCENARIO.spawn) || { x: -119, z: 0.6, yaw: -1.0, pitch: -0.03 };
    player.x = sp.x; player.z = sp.z; player.yaw = sp.yaw; player.pitch = sp.pitch;
    hud.closeModal();
    sound.playErr();
    hud.atualizaCracha(); hud.updateTopHUD();
    const lim = REGRAS_CRACHA.limiteExpulsoesAntesFimDeVisita[nv];
    const motivo = `Motivo: ${g.erro}.`;
    if (lim != null && cr.expulsoes > lim) {
      hud.mostraTela('Fim de visita', 'Visita encerrada', [REGRAS_CRACHA.textoFimDeVisita, REGRAS_CRACHA.licao], [
        { rotulo: 'Tentar de novo', cls: 'bt-a', acao: () => location.reload() },
        { rotulo: 'Ver relatório', cls: 'bt-s', acao: () => hud.showReport() }
      ]);
      return;
    }
    const fala = FISCAL.expulsao[(cr.expulsoes - 1) % FISCAL.expulsao.length];
    hud.mostraTela('Visita interrompida', 'O Valdemar pediu o crachá', [fala, motivo, REGRAS_CRACHA.licao], [
      { rotulo: 'Voltar à portaria', cls: 'bt-a', acao: () => {
        state.voltouExpulso = true;
        hud.closeModal();
        valdemarFala([['Valdemar', FISCAL.retorno.fala]]);
        hud.showLocalCard('Portaria', FISCAL.retorno.cena);
      } }
    ]);
  }

  // ===== Caderno de Campo (historia CODEX): verbete destravado pelo que o jogador faz; uma pílula por vez =====
  // Chamada a cada 0,5 s no loop e logo após concluir parada, coletar evidência, achar segredo ou observar mirante.
  function checarCodex() {
    if (!state.on) return;
    for (const c of CODEX) {
      if (state.codex[c.id]) continue;
      const d = c.desbloqueio;
      let feito = false;
      if (d.tipo === 'parada') feito = !!state.feitas[d.ref];
      else if (d.tipo === 'conversa') feito = !!(state.conv && state.conv[d.ref] && state.conv[d.ref].fim === 'ok');
      else if (d.tipo === 'evidencia') feito = !!state.evid[d.ref];
      else if (d.tipo === 'egg') feito = !!state.eggs[d.ref];
      else if (d.tipo === 'lugar') feito = Math.hypot(player.x - d.ref.x, player.z - d.ref.z) <= d.ref.r;
      if (!feito) feito = MIRANTES.some(m => state.mirantes[m.id] && m.codex.includes(c.id));
      if (!feito) continue;
      state.codex[c.id] = true; state.codexNovos[c.id] = true; codexFila.push(c.id);
    }
    drenaCodex();
  }
  // Fila simples: uma pílula por vez. Na demo destrava em silêncio (sem pílula nem som).
  function drenaCodex() {
    if (codexOcupado || !codexFila.length) return;
    const c = CODEX.find(x => x.id === codexFila.shift());
    codexOcupado = true;
    if (!state.demo && c) {
      hud.notify(`Caderno de Campo: ${c.titulo}`);
      if (sound.playSegredo) sound.playSegredo();
    }
    setTimeout(() => { codexOcupado = false; drenaCodex(); }, state.demo ? 0 : 3300);
  }

  // ===== Mirantes (historia MIRANTES): segurar E observa a usina de cima; a câmera volta ao jogador sem mexer nele =====
  const easeMir = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  function iniciaMirante(m) {
    if (state.demo || obs) return;
    keys.KeyE = false; holdTimer = 0;
    state.observando = true;
    obs = { m, t0: performance.now(), x0: player.x, y0: player.y, z0: player.z, yaw0: player.yaw, pitch0: player.pitch,
      topo: getTerrainHeight(m.x, m.z) + 1.72 + 14, balao: false };
  }
  function aplicaMirante(agora) {
    const t = (agora - obs.t0) / 1000, m = obs.m;
    const s = easeMir(Math.min(1, t / OBS_SOBE)), g = easeMir(Math.min(1, t / OBS_TOTAL));
    camera.position.set(obs.x0 + (m.x - obs.x0) * s, obs.y0 + (obs.topo - obs.y0) * s, obs.z0 + (m.z - obs.z0) * s);
    camera.rotation.y = obs.yaw0 + Math.PI * 2 * g;
    camera.rotation.x = obs.pitch0 + (-0.3 - obs.pitch0) * s;
    if (!obs.balao && t > 0.6) { obs.balao = true; hud.playCena({ quem: m.nome, roteiro: [[m.nome, m.texto]] }); }
  }
  // fim da observação (completa ou pulada): devolve o controle; posição, yaw e pitch do jogador nunca mudaram
  function terminaMirante() {
    if (!obs) return;
    const m = obs.m;
    obs = null; state.observando = false; keys.KeyE = false; holdTimer = 0;
    if (hud._cenaFim) hud._cenaFim();
    if (!state.mirantes[m.id]) { state.mirantes[m.id] = true; state.pontos += 15; }
    hud.notify(`Mirante: ${m.nome}`);
    checarCodex();
    hud.updateTopHUD();
  }
  // pular: E, Espaço ou qualquer toque
  window.addEventListener('keydown', e => { if (obs && !e.repeat && (e.code === 'KeyE' || e.code === 'Space')) terminaMirante(); });
  window.addEventListener('pointerdown', () => { if (obs) terminaMirante(); });

  function findInteractTarget() {
    const lookX = -Math.sin(player.yaw);
    const lookZ = -Math.cos(player.yaw);
    const candidatos = [];

    const avaliar = (tx, tz, maxDist, minCos = 0.38, bonus = 0) => {
      const dx = tx - player.x;
      const dz = tz - player.z;
      const dist = Math.hypot(dx, dz);
      if (dist > maxDist) return null;
      const cos = dist < 0.25 ? 1.0 : (dx * lookX + dz * lookZ) / dist;
      // Exige que o alvo esteja no cone de visão da mira (ou colado ao jogador sem outro alvo na mira)
      if (cos < minCos && !(dist < 1.35 && cos > -0.05)) return null;
      const score = (1 - cos) * 5.2 + dist * 0.45 - bonus;
      return { dist, cos, score };
    };

    // 1. Paradas (personagens)
    for (let i = 0; i < PARADAS.length; i++) {
      const p = PARADAS[i];
      const av = avaliar(p.x, p.nz, 4.5, 0.38, 0.08);
      if (av) {
        candidatos.push({
          score: av.score,
          target: { type: 'parada', item: p, title: p.quem, sub: `Segure E para conversar (${p.lugar})`, instant: true }
        });
      }
    }
    // 2. Evidências
    for (const ev of EVIDENCIAS) {
      if (ev.collected) continue;
      const av = avaliar(ev.x, ev.z, 4.2, 0.38, 0.12);
      if (av) {
        candidatos.push({
          score: av.score,
          target: { type: 'evid', item: ev, title: ev.n, sub: 'Segure E para observar evidência', instant: false }
        });
      }
    }
    // 3. Easter eggs (perto: 2,6 m; precisa achar)
    for (const eg of EASTER) {
      if (state.eggs[eg.id]) continue;
      const av = avaliar(eg.x, eg.z, 2.6, 0.35, 0.10);
      if (av) {
        candidatos.push({
          score: av.score,
          target: { type: 'egg', item: eg, title: eg.n, sub: 'Segure E: você achou algo', instant: true }
        });
      }
    }
    // 3b. Mirantes: a menos de 3 m, segurar E para observar (a demo não tem)
    if (!state.demo && !obs) {
      for (const m of MIRANTES) {
        const av = avaliar(m.x, m.z, 3.0, 0.32, 0.05);
        if (av) {
          candidatos.push({
            score: av.score,
            target: { type: 'mirante', item: m, title: m.nome, sub: 'Segure E para observar', instant: false }
          });
        }
      }
    }
    // 4. Sinais transversais
    for (const sg of SINAIS) {
      if (state.sinais[sg.id]) continue;
      const av = avaliar(sg.x, sg.z, 4.5, 0.36, 0.06);
      if (av) {
        candidatos.push({
          score: av.score,
          target: { type: 'sinal', item: sg, title: sg.n, sub: 'Segure E para registrar sinal transversal', instant: false }
        });
      }
    }
    // 5. Equipe operacional secundária (conversas espontâneas de mundo aberto)
    if (typeof MURMURIOS !== 'undefined') {
      for (const m of MURMURIOS) {
        const av = avaliar(m.x, m.z, 3.6, 0.38, 0.04);
        if (av) {
          candidatos.push({
            score: av.score,
            target: { type: 'murmurio', item: m, title: m.quem, sub: `${m.lugar} · Segure E para ouvir`, instant: true }
          });
        }
      }
    }

    if (!candidatos.length) return null;
    candidatos.sort((a, b) => a.score - b.score);
    return candidatos[0].target;
  }

  function executeInteract(tgt) {
    if (tgt.type === 'parada') {
      if (tgt.item.id === 'agri' && state.cadeia.armado && !state.cadeia.visto) {
        state.cadeia.visto = true;
        hud.showRadio('Efeito em cadeia: a preventiva vencida na Oficina parou a colhedora aqui no talhão!');
      }
      zoeira = [];
      hud.openStopModal(tgt.item);
    } else if (tgt.type === 'evid') {
      tgt.item.collected = true;
      state.evid[tgt.item.id] = true;
      state.pontos += 20;
      if (sound && sound.playEvidencia) sound.playEvidencia();
      hud.notify(`Evidência registrada: ${tgt.item.n}`);
      hud.updateTopHUD();
      checarCodex();
    } else if (tgt.type === 'egg') {
      if (tgt.item.id === 'cafe' && !state.feitas.auto) state.cafeAntesAuto = true;
      state.eggs[tgt.item.id] = true;
      state.pontos += 10;
      if (sound && sound.playSegredo) sound.playSegredo();
      if (tgt.item.mesh && tgt.item.id !== 'capivara') tgt.item.mesh.visible = false;
      hud.showRadio(`Easter egg ${Object.keys(state.eggs).length}/${EASTER.length} · ${tgt.item.n}. ${tgt.item.d}`);
      hud.updateTopHUD();
      checarCodex();
    } else if (tgt.type === 'mirante') {
      iniciaMirante(tgt.item);
    } else if (tgt.type === 'sinal') {
      state.sinais[tgt.item.id] = true;
      state.pontos += 25;
      sound.playOk();
      hud.notify(`Sinal conectado: ${tgt.item.n}`);
      hud.updateTopHUD();
    } else if (tgt.type === 'murmurio') {
      zoeira = [];
      state.murmurios = state.murmurios || {};
      if (!state.murmurios[tgt.item.id]) {
        state.murmurios[tgt.item.id] = true;
        state.pontos += 5;
        hud.notify(`Conversa de campo: ${tgt.item.quem.split(',')[0]} (+5 pts)`);
        hud.updateTopHUD();
      }
      const resolvida = tgt.item.aposDe && state.feitas && state.feitas[tgt.item.aposDe];
      const roteiro = (resolvida && tgt.item.falasApos) ? tgt.item.falasApos : tgt.item.falas;
      hud.playCena({ quem: tgt.item.quem, roteiro });
    }
  }

  async function runDemoMode() {
    for (let idx = 0; idx < PARADAS.length; idx++) {
      if (!state.demo) return;
      const p = PARADAS[idx];
      state.i = idx;
      player.x = p.x;
      player.z = p.nz + (p.lado > 0 ? -4.5 : 4.5);
      player.yaw = Math.atan2(-(p.x - player.x), -(p.nz - player.z));
      player.pitch = -0.02;
      hud.showLocalCard(p.lugar, p.quem);
      hud.updateTopHUD();
      await sleep(900);
      if (!state.demo) return;
      hud.openStopModal(p);
      await sleep(600);
      if (!state.demo) return;
      if (p.pergs && p.pergs.length) {
        if (!state.perg[p.id]) state.perg[p.id] = {};
        state.perg[p.id][0] = true;
        state.pontos += 15;
      }
      state.feitas[p.id] = p.feito;
      state.pontos += 40;
      hud.openStopModal(p);
      await sleep(700);
      hud.closeModal();
    }
    state.i = PARADAS.length;
    state.fim = true;
    state.demo = false;
    hud.updateTopHUD();
    hud.showCall(true);
  }

  // API de debug/medição automatizada para o harness Chromium
  window.__SAFRA_DEBUG__ = {
    state,
    getMetrics: () => ({
      ...engine.getMetrics(),
      caneCount: veg.caneCount,
      errors: runtimeErrors.slice()
    }),
    setQuality: q => {
      state.cfg.qualAuto = false;
      state.cfg.qual = q;
      engine.applyQuality(q);
      shadowRig.applyQuality(q);
      planar.resize(window.innerWidth, window.innerHeight, q === 'alta' ? 0.65 : q === 'media' ? 0.45 : 0);
      engine.resetWorst();
    },
    startPlaying: () => {
      hud.closeModal();
      if (!state.on) {
        const sp = (typeof SAFRA_SCENARIO !== 'undefined' && SAFRA_SCENARIO.spawn) || { x: -119, z: 0.6, yaw: -1.0, pitch: -0.03 };
        state.on = true;
        player.x = sp.x;
        player.z = sp.z;
        player.yaw = sp.yaw;
        player.pitch = sp.pitch;
        document.body.classList.add('jogo');
        document.body.dataset.state = 'playing';
        document.getElementById('btMenu').hidden = false;
        if (document.getElementById('btKonviva')) document.getElementById('btKonviva').hidden = false;
        document.getElementById('mira').hidden = false;
        document.getElementById('ajuda').hidden = false;
        document.getElementById('bussola').hidden = false;
        document.getElementById('manche').hidden = false;
        hud.updateTopHUD();
        if (hud.updateAcousticBadge) hud.updateAcousticBadge(sound.bioma);
      }
    },
    getPlayer: () => ({ ...player }),
    data: {
      PARADAS, DIRETOR, EVIDENCIAS, NIVEIS, EASTER, SINAIS, DEVOLUTIVA, CONQUISTAS,
      NIVEIS_HISTORIA, ABERTURA, FISCAL, REGRAS_CRACHA, CODEX, MIRANTES, PONTA_A_PONTA,
      MURMURIOS: typeof MURMURIOS !== 'undefined' ? MURMURIOS : [],
      SAFRA_SCENARIO: typeof SAFRA_SCENARIO !== 'undefined' ? SAFRA_SCENARIO : null
    },
    engine,
    setPaused: v => {
      const was = !!window.__SAFRA_PAUSED__;
      window.__SAFRA_PAUSED__ = !!v;
      if (was && !v) { lastT = performance.now(); requestAnimationFrame(loop); }
    },
    renderNow: () => {
      if (state.camConversa && state.modalOpen) {
        camera.position.set(state.camConversa.x, state.camConversa.y, state.camConversa.z);
        camera.rotation.y = state.camConversa.yaw;
        camera.rotation.x = state.camConversa.pitch;
      } else {
        camera.position.set(player.x, player.y, player.z);
        camera.rotation.y = player.yaw;
        camera.rotation.x = player.pitch;
      }
      engine.render(performance.now() * 0.001, sky.sunDir, shadowRig.sun.color);
    },
    pedirReuniao: () => hud.showCall(false),
    teleport: (x, z, yaw = 0, pitch = -0.05) => {
      player.x = x;
      player.z = z;
      player.yaw = yaw;
      player.pitch = pitch;
    },
    openStop: idx => {
      const p = PARADAS[idx];
      if (p) hud.openStopModal(p);
    },
    closeModal: () => hud.closeModal(),
    advertir: id => advertir(id),
    iniciarDia: () => { hud.closeModal(); hud.cb.startGame(false); },
    showReport: () => hud.showReport(),
    checarCodex: () => checarCodex(),
    observar: idx => iniciaMirante(MIRANTES[idx]),
    obsAtivo: () => !!obs,
    colisores: () => stopsWorld.colliders,
    startDemo: () => {
      hud.closeModal();
      if (!state.on) {
        state.on = true;
        document.body.classList.add('jogo');
        hud.updateTopHUD();
      }
      state.demo = true;
      runDemoMode();
    }
  };

  let lastT = performance.now();
  let uiTick = 0;

  function loop(now) {
    if (window.__SAFRA_PAUSED__) { lastT = now; return; }
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - lastT) / 1000);
    const realDt = Math.min(0.25, (now - lastT) / 1000); // segurar usa o tempo real, mesmo em aparelho lento
    lastT = now;
    const timeSec = now * 0.001;
    // Caderno: checagem a cada 0,5 s (não a cada frame). Mirante: termina sozinho ao fim do giro e esconde o prompt
    if (state.on) { codexT += realDt; if (codexT >= 0.5) { codexT = 0; checarCodex(); } }
    if (obs) { if (performance.now() - obs.t0 >= OBS_TOTAL * 1000) terminaMirante(); else hud.updateInteractPrompt(null, 0); }

    let moving = false;
    let running = false;
    if (state.on) {
      const pauseVis = document.getElementById('pausaVeu') && !document.getElementById('pausaVeu').hidden;
      document.body.dataset.state = state.fim ? 'gameover' : (pauseVis ? 'paused' : 'playing');
    }
    if (state.modalOpen || obs) {
      if (keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD || keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight) limpaTeclas();
    }

    if (state.on && !state.modalOpen && !state.demo && !obs) {
      let mx = 0, mz = 0;
      if (keys.KeyW || keys.ArrowUp) mz -= 1;
      if (keys.KeyS || keys.ArrowDown) mz += 1;
      if (keys.KeyA || keys.ArrowLeft) mx -= 1;
      if (keys.KeyD || keys.ArrowRight) mx += 1;
      running = !!(keys.ShiftLeft || keys.ShiftRight);
      let analog = 1;
      if (!mx && !mz && touchMove.mag > 0) {
        mx = touchMove.x; mz = touchMove.z; analog = touchMove.mag; running = touchMove.run;
      }
      if (mx || mz) {
        moving = true;
        const len = Math.hypot(mx, mz);
        mx /= len; mz /= len;
        const speed = (running ? 11.5 : 6.2) * analog * Math.min(0.1, realDt); // tempo real: aparelho lento não anda em câmera lenta
        const sinY = Math.sin(player.yaw);
        const cosY = Math.cos(player.yaw);
        const nx = player.x + (mx * cosY + mz * sinY) * speed;
        const nz = player.z + (-mx * sinY + mz * cosY) * speed;

        // Limites do mundo + colisão com deslize: encostou num obstáculo, escorrega ao longo dele em vez de travar.
        // Quem já está sobreposto a um obstáculo (nasceu ou foi teleportado ali) sempre pode se afastar.
        const livre = (x, z) => {
          for (const col of stopsWorld.colliders) {
            const dn = Math.hypot(x - col.x, z - col.z);
            if (dn < col.r && dn < Math.hypot(player.x - col.x, player.z - col.z) + 1e-4) return false;
          }
          return true;
        };
        let mvX = nx, mvZ = nz;
        if (!livre(mvX, mvZ)) {
          if (livre(nx, player.z)) mvZ = player.z;
          else if (livre(player.x, nz)) mvX = player.x;
          else { mvX = player.x; mvZ = player.z; }
        }
        // limite do mapa: insistir na borda por 1,5 s é sair da usina; correr na indústria ou no armazém por 4 s é advertência
        if (mvX < -124 || mvX > 108 || mvZ < -54 || mvZ > 54) { foraT += realDt; if (foraT > 1.5) { foraT = 0; advertir('saida_da_usina'); } } else foraT = 0;
        if (running && player.x > 20 && player.x < 60) { correT += realDt; if (correT > 4) { correT = 0; advertir('correr_area_industrial'); } } else correT = 0;
        player.x = Math.max(-124, Math.min(108, mvX));
        player.z = Math.max(-54, Math.min(54, mvZ));
      }

      if (window.__SAFRA_TRAFEGO__) for (const tr of window.__SAFRA_TRAFEGO__) {
        if (tr.x == null) continue;
        const dx = player.x - tr.x, dz = player.z - tr.lane;
        if (Math.abs(dx) < 6.5 && Math.abs(dz) < 1.9) player.z = tr.lane + Math.sign(dz || 1) * 1.9;
      }
      // Se uma cena curta está tocando mas o jogador se afastou daquela parada (> 11.5 m), encerra imediatamente para manter coerência
      if (hud.isCenaPlaying && hud.isCenaPlaying() && hud._cenaParadaId) {
        const cp = PARADAS.find(x => x.id === hud._cenaParadaId);
        if (cp && Math.hypot(player.x - cp.x, player.z - cp.nz) > 11.5) {
          if (hud._cenaFim) hud._cenaFim();
        }
      }

      // Cena curta e sincronia de parada ativa: ao chegar perto (< 8 m) olhando na direção do personagem
      const lookX = -Math.sin(player.yaw);
      const lookZ = -Math.cos(player.yaw);
      for (let idxP = 0; idxP < PARADAS.length; idxP++) {
        const p = PARADAS[idxP];
        const dx = p.x - player.x;
        const dz = p.nz - player.z;
        const dist = Math.hypot(dx, dz);
        if (dist >= 8.2) continue;
        const cos = dist < 0.3 ? 1.0 : (dx * lookX + dz * lookZ) / dist;
        if (cos < 0.35) continue;
        if (!state.feitas[p.id] && state.i !== idxP) {
          state.i = idxP;
          hud.updateTopHUD();
        }
        if (!state.cenas[p.id] && p.roteiro) {
          state.cenas[p.id] = true;
          hud.playCena(p);
          break;
        }
      }
      const tgt = findInteractTarget();
      if (tgt && keys.KeyE) {
        holdTimer += realDt * (tgt.instant ? 1.8 : 1.15);
        if (holdTimer >= 1) {
          holdTimer = 0;
          executeInteract(tgt);
        }
      } else {
        holdTimer = Math.max(0, holdTimer - dt * 2.5);
      }
      hud.updateInteractPrompt(tgt, holdTimer);
    } else if (!state.on) {
      // Câmera panorâmica na tela de título sobrevoando o campo e a usina
      const a = timeSec * 0.08;
      player.x = -56 + Math.cos(a) * 26;
      player.z = -4 + Math.sin(a) * 14;
      camera.position.set(player.x, 6.2 + Math.sin(timeSec * 0.25) * 0.8, player.z);
      camera.lookAt(-38, 2.4, -22);
    }

    if (state.on) {
      const gh = getTerrainHeight(player.x, player.z);
      player.y = gh + 1.72;
      if (obs) aplicaMirante(performance.now());
      else if (state.camConversa && state.modalOpen) {
        const kCam = 1 - Math.exp(-6.5 * dt);
        const swayX = Math.sin(timeSec * 1.15) * 0.014;
        const swayY = Math.cos(timeSec * 1.65) * 0.010;
        const tx = state.camConversa.x + swayX;
        const ty = state.camConversa.y + swayY;
        const tz = state.camConversa.z;
        camera.position.x += (tx - camera.position.x) * kCam;
        camera.position.y += (ty - camera.position.y) * kCam;
        camera.position.z += (tz - camera.position.z) * kCam;
        let dYaw = state.camConversa.yaw - camera.rotation.y;
        while (dYaw > Math.PI) dYaw -= Math.PI * 2;
        while (dYaw < -Math.PI) dYaw += Math.PI * 2;
        camera.rotation.y += dYaw * kCam;
        camera.rotation.x += (state.camConversa.pitch - camera.rotation.x) * kCam;
      } else {
        camera.position.set(player.x, player.y, player.z);
        camera.rotation.y = player.yaw;
        camera.rotation.x = player.pitch;
      }
    }

    // Progresso solar baseado na parada atual (05:30 amanhecer -> 17:30 pôr do sol)
    const dayProgress = Math.min(1, state.i / PARADAS.length);
    sky.updateTimeOfDay(dayProgress, timeSec, camera.position, shadowRig.sun, shadowRig.hemi);
    shadowRig.update(camera.position, sky.sunDir);
    veg.update(timeSec, sky.sunDir);
    particles.update(dt, state.cfg.qual);
    stopsWorld.update(timeSec, dt, camera.position);
    humanos.update(dt, camera.position);
    btSom.hidden = !state.on;
    sound.updateSpatial(player.x, player.z, moving, running, dt, {
      on: state.on, yaw: player.yaw, fim: state.fim,
      ato: (PARADAS[Math.min(state.i, PARADAS.length - 1)] || {}).ato || 1,
      duck: state.modalOpen || !!document.querySelector('#cena.on'),
      conversaId: hud._paradaAberta ? hud._paradaAberta.id : null
    });

    tablet.visible = state.on && !state.demo && !state.modalOpen && !obs && !window.__NO_TAB && !document.querySelector('#cena.on');
    if (tablet.visible) {
      const b = tabBase(), bob = moving ? Math.sin(timeSec * (running ? 13 : 9)) * 0.006 : Math.sin(timeSec * 1.4) * 0.002;
      // o tablet segue a câmera sem virar filho dela (filho da câmera quebrava os passes de pós)
      camera.updateMatrixWorld();
      _tabL.compose(new THREE.Vector3(b.p[0], b.p[1] + bob, b.p[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.42, -0.32, 0.04)), new THREE.Vector3(b.s, b.s, b.s));
      _tabM.multiplyMatrices(camera.matrixWorld, _tabL);
      tablet.matrixAutoUpdate = false; tablet.matrix.copy(_tabM); tablet.matrixWorldNeedsUpdate = true;
      if (!wasTabVis || uiTick % 10 === 0) drawTablet();
    }
    wasTabVis = tablet.visible;
    terrain.update(timeSec);
    planar.update();
    engine.render(timeSec, sky.sunDir, shadowRig.sun.color);

    uiTick++;
    if (uiTick % 6 === 0) {
      hud.drawCompass(player.x, player.z, player.yaw);
      if (state.cfg.medir) {
        const m = engine.getMetrics();
        document.getElementById('medTxt').textContent =
          `FPS ${m.fps} · ${m.avgMs} ms (pior ${m.worstMs} ms)\n` +
          `${m.calls} draws · ${Math.round(m.triangles / 1000)}k tris\n` +
          `qualidade: ${m.quality} · ${m.backend}` +
          (m.memMB ? ` · ${m.memMB} MB` : '');
      }
    }
  }

  requestAnimationFrame(loop);
}

boot();


