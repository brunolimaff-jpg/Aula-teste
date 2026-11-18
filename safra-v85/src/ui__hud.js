// === ui/hud.js ===

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// soma minutos a um horário "HH:MM" (relógio do dia depois de expulsão)
const addMin = (hhmm, m) => { const [h, mi] = hhmm.split(':').map(Number); const t = h * 60 + mi + m; return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
// Caderno de Campo: artigo, nome curto, "de/do" e "em/no" de cada parada, para montar as pistas ("Conclua a Oficina", "Converse na Balança")
const CAD_LUGAR = {
  plan: ['a', 'Sede', 'da', 'na'], geo: ['o', 'Talhão 12', 'do', 'no'], agri: ['a', 'Frente de colheita', 'da', 'na'],
  auto: ['a', 'Oficina', 'da', 'na'], orig: ['a', 'Balança', 'da', 'na'], ind: ['a', 'Indústria', 'da', 'na'],
  arm: ['o', 'Armazém e pátio', 'do', 'no'], custo: ['a', 'Controladoria', 'da', 'na'], erp: ['o', 'Centro de gestão', 'do', 'no'], com: ['o', 'Porto', 'do', 'no']
};
const CAD_CATS = ['Todos', 'Lugar', 'Equipamento', 'Processo', 'Termo', 'Pessoa', 'Sistema'];
// pista de um verbete travado: diz o que fazer, sem revelar o conteúdo
function cadPista(c) {
  const d = c.desbloqueio;
  if (d.tipo === 'parada') { const L = CAD_LUGAR[d.ref]; return `Conclua ${L[0]} ${L[1]}`; }
  if (d.tipo === 'conversa') { const L = CAD_LUGAR[d.ref]; return `Converse ${L[3]} ${L[1]}`; }
  if (d.tipo === 'evidencia') { const ev = EVIDENCIAS.find(e => e.id === d.ref); const L = CAD_LUGAR[ev.st]; return `Colete a evidência ${L[2]} ${L[1]}`; }
  if (d.tipo === 'egg') return 'Ache um segredo';
  if (d.tipo === 'lugar') {
    // parada mais próxima do ponto do verbete
    let best = PARADAS[0], bd = 1e9;
    for (const p of PARADAS) { const dd = Math.hypot(p.x - d.ref.x, p.nz - d.ref.z); if (dd < bd) { bd = dd; best = p; } }
    const L = CAD_LUGAR[best.id]; return `Explore perto ${L[2]} ${L[1]}`;
  }
  return '';
}

class HUD {
  constructor(state, callbacks) {
    this.state = state;
    this.cb = callbacks;
    this.el = id => document.getElementById(id);

    // Build frentes aggregation
    const map = {};
    PARADAS.forEach(p => p.frentes.forEach(f => {
      if (!map[f.n]) map[f.n] = { f, list: [] };
      map[f.n].list.push(() => !!this.state.feitas[p.id]);
    }));
    SINAIS.forEach(sg => {
      if (!map[sg.n]) map[sg.n] = { f: { n: sg.n, p: sg.p, c: sg.c }, list: [] };
      map[sg.n].list.push(() => !!this.state.sinais[sg.id]);
    });
    this.frentesAgg = Object.values(map);

    this.buildTrilha();
    this.bindTopButtons();
    this.crachaInit();
    this.initKonviva();
    this._ttsUnavailableReason = null;
    this._vozDesbloqueada = false;
    this._vozesCache = [];
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const carregaVozes = () => {
        try { this._vozesCache = window.speechSynthesis.getVoices() || []; } catch {}
      };
      carregaVozes();
      if (typeof window.speechSynthesis.addEventListener === 'function') {
        window.speechSynthesis.addEventListener('voiceschanged', carregaVozes);
      }
    }
  }

  buildTrilha() {
    const tr = this.el('trilha');
    tr.innerHTML = PARADAS.map((_, i) => `<i data-i="${i}"></i>`).join('');
  }

  bindTopButtons() {
    this.el('btIr').onclick = () => this.cb.goToStop();
    this.el('btPlat').onclick = () => this.showPlatform();
    this.el('btMenu').onclick = () => this.showPause();
    // celular: botão do Caderno ao lado da Pausa (o CSS mostra só em body.toque e no jogo)
    const btCad = document.createElement('button');
    btCad.type = 'button'; btCad.id = 'btCadTop'; btCad.textContent = 'Caderno';
    btCad.setAttribute('aria-label', 'Abrir o Caderno de Campo');
    this.el('btMenu').insertAdjacentElement('afterend', btCad);
    btCad.onclick = () => { if (!this.state.modalOpen) this.showCaderno(); };
    this.el('btFala').onclick = () => this.cb.triggerInteract();
    if (this.el('btReuniaoAlvo')) this.el('btReuniaoAlvo').onclick = () => this.showCall(false);
    this.el('btMedCop').onclick = () => {
      navigator.clipboard?.writeText(this.el('medTxt').textContent).catch(() => {});
      this.notify('Medição copiada');
    };
  }

  minDoresNivel() {
    const nh = (typeof NIVEIS_HISTORIA !== 'undefined' && NIVEIS_HISTORIA[this.state.nivel]) || { doresParaAceitarDevolutiva: 8 };
    return nh.doresParaAceitarDevolutiva || 8;
  }

  // ===== Abertura: reunião inicial na sala da diretoria. Pulável; as falas vão no balão existente (playCena). =====
  abertura(nivel) {
    const base = ABERTURA.falas, ext = ABERTURA.porNivel[nivel];
    const falas = ext ? [...base.slice(0, ext.apos), ...ext.falas, ...base.slice(ext.apos)] : base;
    return new Promise(resolve => {
      const v = document.createElement('div');
      v.id = 'aberturaVeu'; v.className = 'abertura-veu';
      v.innerHTML = `<div class="abertura-card"><small>Sala da diretoria · 05:15</small><h2>${esc(ABERTURA.titulo)}</h2><p>${esc(ABERTURA.cenario)}</p><button class="bt bt-s" id="aberturaPular">Pular</button></div>`;
      document.body.appendChild(v);
      const fim = () => { v.remove(); resolve(); };
      v.querySelector('#aberturaPular').onclick = () => (this._cenaFim ? this._cenaFim() : fim());
      this.playCena({ quem: ABERTURA.quem, roteiro: falas }).then(fim);
    });
  }

  // Crachá de visitante no HUD: uma marca por advertência permitida no nível; a última fica vermelha
  crachaInit() {
    const p = this.el('pontos'), bloco = p && p.closest('.dado');
    const b = document.createElement('div');
    b.id = 'crachaHud'; b.className = 'cracha-hud'; b.hidden = true;
    if (bloco) bloco.insertAdjacentElement('afterend', b); else document.body.appendChild(b);
    this._cracha = b;
  }

  atualizaCracha() {
    const b = this._cracha, st = this.state;
    if (!b) return;
    const cr = st.cracha, lim = REGRAS_CRACHA.advertenciasAteExpulsao[st.nivel] || 3;
    b.hidden = !st.on || st.demo;
    b.innerHTML = `<b>VISITANTE</b><span class="marcas" aria-label="${cr.adv} de ${lim} advertências">${Array.from({ length: lim }, (_, k) => `<i class="${k < cr.adv ? (k === lim - 1 ? 'vermelho' : 'on') : ''}"></i>`).join('')}</span>`;
  }

  pulsaCracha() {
    const b = this._cracha; if (!b) return;
    b.classList.remove('pisca'); void b.offsetWidth; b.classList.add('pisca');
  }

  // Tela cheia (veu meio) para expulsão e fim de visita. botoes: [{rotulo, cls, acao}]
  mostraTela(olho, titulo, corpo, botoes) {
    if (this._cenaFim) this._cenaFim();
    const veu = this.el('veu'), folha = this.el('folha');
    veu.className = 'veu meio'; veu.hidden = false; this.state.modalOpen = true;
    if (document.pointerLockElement) document.exitPointerLock?.();
    folha.innerHTML = `<div class="olho">${esc(olho)}</div><h2>${esc(titulo)}</h2>${corpo.map(t => `<p class="nota">${esc(t)}</p>`).join('')}<div class="linha-b" style="margin-top:14px">${botoes.map((b, k) => `<button class="bt ${b.cls}" data-tela="${k}">${esc(b.rotulo)}</button>`).join('')}</div>`;
    botoes.forEach((b, k) => { folha.querySelector(`[data-tela="${k}"]`).onclick = () => b.acao(); });
  }

  // Legenda de cena: faixa fixa embaixo, sem modal e sem mexer em state.
  cenaEl() {
    if (this._cena) return this._cena;
    const el = document.createElement('div');
    el.id = 'cena';
    document.body.appendChild(el);
    this._cena = el;
    return el;
  }

  // Diretor de Voz IA (Gemini TTS via /api/tts + Web Speech PT-BR síncrono + síntese Web Audio garantida)
  unlockVoz() {
    const se = typeof window !== 'undefined' ? window.__SAFRA_SOUND_ENGINE__ : null;
    if (se && se.resume) se.resume();
    if (typeof window !== 'undefined' && window.speechSynthesis && !this._vozDesbloqueada) {
      this._vozDesbloqueada = true;
      try {
        this._vozesCache = (window.speechSynthesis.getVoices && window.speechSynthesis.getVoices()) || this._vozesCache || [];
        const u = new SpeechSynthesisUtterance(' ');
        u.lang = 'pt-BR';
        u.volume = 0;
        u.rate = 2;
        window.speechSynthesis.speak(u);
      } catch {}
    }
  }

  // Carrega o manifesto de falas pré-salvas em disco (/assets/voices/manifest.json ou /api/tts)
  _initDefaultVoiceManifest() {
    if (this._vozManifest && Object.keys(this._vozManifest).length) return;
    this._vozManifest = {
      "Dr. Augusto::Senta aí. A Horizonte virou usina flex para rodar cana e milho safrinha o ano inteiro, mas o caixa fechou sangrando e ninguém na minha mesa sabe apontar onde a margem vazou.": { file: "/assets/voices/6b485c9a3f834c0e.wav", durationMs: 16040, speaker: "Dr. Augusto" },
      "Dr. Augusto::Bom começo. Você tem até o fim da tarde para conversar com as dez pontas da Horizonte — do talhão da Helena aos silos de milho da Sílvia e o fechamento do André no porto.": { file: "/assets/voices/3eed037abf53b996.wav", durationMs: 13160, speaker: "Dr. Augusto" },
      "Dr. Augusto::Regra da casa: EPI certo em cada área. Chapéu, perneira e botina no campo; capacete e protetor na indústria; colete refletivo no pátio e na balança.": { file: "/assets/voices/635080d0be914c63.wav", durationMs: 14760, speaker: "Dr. Augusto" },
      "Dr. Augusto::Este mês já sentaram três consultores nessa cadeira. Todos abriram slide bonito nos primeiros cinco minutos e saíram sem pisar no barro.": { file: "/assets/voices/2947ec52f0835ed9.wav", durationMs: 12370, speaker: "Dr. Augusto" },
      "Dr. Augusto::O Valdemar, meu gerente de operações há 28 anos, odeia vendedor apressado. Se você tentar empurrar software antes de entender a dor, ele toma seu crachá.": { file: "/assets/voices/0a9df414204a6441.wav", durationMs: 13130, speaker: "Dr. Augusto" },
      "Dr. Augusto::Às 18h você volta para esta mesa com fatos, números e evidências do dia. Aí eu decido se assino o diagnóstico com a Senior e a GAtec.": { file: "/assets/voices/c3ef47f41cc80939.wav", durationMs: 14410, speaker: "Dr. Augusto" },
      "Helena::O plano está no quadro. A versão certa é a de caneta azul.": { file: "/assets/voices/34b48c6e3c1ce711.wav", durationMs: 4290, speaker: "Helena" },
      "Caio::O satélite aponta. Quem decide é o meu olho e um e-mail com três aprovações.": { file: "/assets/voices/83d564aaf6c69093.wav", durationMs: 5680, speaker: "Caio" },
      "Marta::Se a digitadora pegar gripe, a colheita de terça só existe na quinta.": { file: "/assets/voices/d9ea68465dca9be8.wav", durationMs: 5240, speaker: "Marta" },
      "Seu Tião::Caderno não trava, moço.": { file: "/assets/voices/d2f8dc46d1408bf2.wav", durationMs: 2520, speaker: "Seu Tião" },
      "Rui::Está tudo na pasta azul. A pasta azul sumiu.": { file: "/assets/voices/49dd7e338800b8c6.wav", durationMs: 3240, speaker: "Rui" },
      "Sílvia::A parada programada a gente programa quando quebra.": { file: "/assets/voices/8a6f1ac7646aa319.wav", durationMs: 4450, speaker: "Sílvia" },
      "Jonas::Carrega primeiro o caminhão que buzinar mais alto.": { file: "/assets/voices/63b0b54e05796377.wav", durationMs: 3120, speaker: "Jonas" },
      "Paula::Está na CUSTO_FINAL_v7_AGORA_VAI.xlsx. Não fecha a planilha!": { file: "/assets/voices/e576aed4adc4ae62.wav", durationMs: 7530, speaker: "Paula" },
      "Rodrigo::A integração sou eu. Por telefone.": { file: "/assets/voices/7eda1a820af8e2e6.wav", durationMs: 2320, speaker: "Rodrigo" },
      "André::O contrato está no e-mail. Em algum dos 4.312 não lidos.": { file: "/assets/voices/1113e4f75d8bc318.wav", durationMs: 4650, speaker: "André" },
      "Você::Bom dia, Helena. O Dr. Augusto pediu para eu começar o diagnóstico da usina flex por aqui.": { file: "/assets/voices/9068818f4481108e.wav", durationMs: 5930, speaker: "Você" }
    };
    this._vozBasePorPersonagem = {
      "Helena": { file: "/assets/voices/34b48c6e3c1ce711.wav", durationMs: 4290, speaker: "Helena" },
      "Caio": { file: "/assets/voices/83d564aaf6c69093.wav", durationMs: 5680, speaker: "Caio" },
      "Marta": { file: "/assets/voices/d9ea68465dca9be8.wav", durationMs: 5240, speaker: "Marta" },
      "Seu Tião": { file: "/assets/voices/d2f8dc46d1408bf2.wav", durationMs: 2520, speaker: "Seu Tião" },
      "Rui": { file: "/assets/voices/49dd7e338800b8c6.wav", durationMs: 3240, speaker: "Rui" },
      "Sílvia": { file: "/assets/voices/8a6f1ac7646aa319.wav", durationMs: 4450, speaker: "Sílvia" },
      "Jonas": { file: "/assets/voices/63b0b54e05796377.wav", durationMs: 3120, speaker: "Jonas" },
      "Paula": { file: "/assets/voices/e576aed4adc4ae62.wav", durationMs: 7530, speaker: "Paula" },
      "Rodrigo": { file: "/assets/voices/7eda1a820af8e2e6.wav", durationMs: 2320, speaker: "Rodrigo" },
      "André": { file: "/assets/voices/1113e4f75d8bc318.wav", durationMs: 4650, speaker: "André" }
    };
    if (typeof window !== 'undefined') {
      window.__SAFRA_VOICE_MANIFEST__ = this._vozManifest;
    }
  }

  async loadVoiceManifest() {
    this._initDefaultVoiceManifest();
    if (this._vozManifestLoaded || typeof window === 'undefined') return this._vozManifest;
    this._vozManifestLoaded = true;
    try {
      const r = await fetch('/assets/voices/manifest.json', { cache: 'no-cache' });
      if (r.ok) {
        const data = await r.json();
        if (data && typeof data === 'object') Object.assign(this._vozManifest, data);
      }
    } catch {}
    window.__SAFRA_VOICE_MANIFEST__ = this._vozManifest;
    return this._vozManifest;
  }

  pararVoz() {
    this._vozSeq = (this._vozSeq || 0) + 1;
    clearTimeout(this._vozWatchdog);
    this._vozWatchdog = 0;
    const se = typeof window !== 'undefined' ? window.__SAFRA_SOUND_ENGINE__ : null;
    if (se && se.pararVozSintetizada) se.pararVozSintetizada();
    const sp = typeof window !== 'undefined' ? window.__SAFRA_SPEECH__ : null;
    if (sp && sp.stop) sp.stop();
    if (this._vozAudio) {
      try { this._vozAudio.pause(); this._vozAudio.src = ''; } catch {}
      this._vozAudio = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    document.body.classList.remove('voz-tocando');
    if (typeof window !== 'undefined' && window.__SAFRA_VOZ_STATUS__) {
      window.__SAFRA_VOZ_STATUS__.playing = false;
    }
    if (this._vozDoneResolve) {
      const fn = this._vozDoneResolve;
      this._vozDoneResolve = null;
      try { fn(); } catch {}
    }
  }

  falarVozNat(quem, texto, meuSeq, doneCb) {
    const limpo = String(texto || '').replace(/^[“"']+|[”"']+$/g, '').trim();
    if (!limpo || meuSeq !== this._vozSeq) { if (doneCb) doneCb(); return; }
    const nome = String(quem || '').split(',')[0].trim();
    const vol = Math.max(0.2, Math.min(1, (this.state.cfg && this.state.cfg.vol) ?? 0.85));
    const sp = typeof window !== 'undefined' ? window.__SAFRA_SPEECH__ : null;

    if (sp && sp.speak) {
      document.body.classList.add('voz-tocando');
      const sess = sp.speak(nome, limpo, { externalAudio: false, volume: vol });
      window.__SAFRA_VOZ_STATUS__ = {
        mode: 'safra-speech-engine',
        speaker: nome,
        seq: meuSeq,
        textLen: limpo.length,
        durationMs: sess.durationMs,
        startedAt: Date.now(),
        ok: true,
        playing: true
      };
      sess.promise.then(() => {
        if (meuSeq === this._vozSeq) {
          document.body.classList.remove('voz-tocando');
          if (window.__SAFRA_VOZ_STATUS__) window.__SAFRA_VOZ_STATUS__.playing = false;
        }
        if (doneCb) doneCb();
      });
      return;
    }
    if (doneCb) doneCb();
  }

  async falarVoz(quem, texto, forcar = false, usarBasePersonagem = false) {
    if (this.state.vozAtiva === false && !forcar) return Promise.resolve();
    if (this.state.cfg && this.state.cfg.som === false && !forcar) return Promise.resolve();
    if (!forcar && this.state.demo) return Promise.resolve();
    const limpo = String(texto || '').replace(/^[“"']+|[”"']+$/g, '').trim();
    if (!limpo) return Promise.resolve();
    this._initDefaultVoiceManifest();
    this.unlockVoz();
    this.pararVoz();
    const meuSeq = this._vozSeq;
    const nome = String(quem || 'Narrador').split(',')[0].trim();
    this._ultimaFala = { quem: nome, texto: limpo };
    this._vozCache = this._vozCache || new Map();
    const chave = `${nome}::${limpo.slice(0, 260)}`;
    const vol = Math.max(0.2, Math.min(1, (this.state.cfg && this.state.cfg.vol) ?? 0.85));
    const se = typeof window !== 'undefined' ? window.__SAFRA_SOUND_ENGINE__ : null;
    const sp = typeof window !== 'undefined' ? window.__SAFRA_SPEECH__ : null;

    let resolveDone;
    const donePromise = new Promise(r => { resolveDone = r; });
    this._vozDoneResolve = resolveDone;
    this._vozPromessa = donePromise;
    const finishOnce = () => {
      if (this._vozDoneResolve === resolveDone) this._vozDoneResolve = null;
      resolveDone();
    };

    const finalizarAudio = () => {
      if (meuSeq === this._vozSeq) {
        document.body.classList.remove('voz-tocando');
        if (window.__SAFRA_VOZ_STATUS__) window.__SAFRA_VOZ_STATUS__.playing = false;
        if (sp && sp.stop) sp.stop();
      }
      finishOnce();
    };

    const tocarUrlPreSalva = async (entry) => {
      if (meuSeq !== this._vozSeq) { finishOnce(); return false; }
      if (sp && sp.speak) {
        sp.speak(nome, limpo, { externalAudio: true, volume: vol, durationOverrideMs: entry.durationMs });
      }
      document.body.classList.add('voz-tocando');
      window.__SAFRA_VOZ_STATUS__ = {
        mode: 'presaved-neural-wav',
        speaker: nome,
        seq: meuSeq,
        file: entry.file,
        durationMs: entry.durationMs || 0,
        textLen: limpo.length,
        startedAt: Date.now(),
        ok: true,
        playing: true
      };
      if (se && se.playWavUrl) {
        const res = await se.playWavUrl(entry.file, vol, finalizarAudio);
        if (res && (res === true || res.ok)) {
          if (res.durationMs && sp && sp.setDurationMs) sp.setDurationMs(res.durationMs);
          if (window.__SAFRA_VOZ_STATUS__ && window.__SAFRA_VOZ_STATUS__.seq === meuSeq) {
            window.__SAFRA_VOZ_STATUS__.durationMs = res.durationMs || entry.durationMs || 0;
          }
          return true;
        }
      }
      if (meuSeq !== this._vozSeq) { finishOnce(); return false; }
      try {
        const audio = new Audio(entry.file);
        audio.volume = vol;
        this._vozAudio = audio;
        window.__SAFRA_VOZ_STATUS__ = {
          mode: 'presaved-neural-audio',
          speaker: nome,
          seq: meuSeq,
          file: entry.file,
          durationMs: entry.durationMs || 0,
          textLen: limpo.length,
          startedAt: Date.now(),
          ok: true,
          playing: true
        };
        audio.onended = finalizarAudio;
        audio.onerror = () => { if (meuSeq === this._vozSeq) this.falarVozNat(nome, limpo, meuSeq, finishOnce); else finishOnce(); };
        await audio.play();
        return true;
      } catch {
        return false;
      }
    };

    // 1. Verifica se a fala exata (ou a fala base do personagem na abertura/saudação) já está pré-salva em /assets/voices/
    const preSaved = (this._vozManifest && this._vozManifest[chave]) ||
      (usarBasePersonagem && this._vozBasePorPersonagem && this._vozBasePorPersonagem[nome]);
    if (preSaved && preSaved.file) {
      const okPre = await tocarUrlPreSalva(preSaved);
      if (okPre) return donePromise;
    }

    // 2. Verifica cache em memória da sessão
    if (this._vozCache.has(chave)) {
      const cached = this._vozCache.get(chave);
      if (cached && cached.file) {
        const okC = await tocarUrlPreSalva(cached);
        if (okC) return donePromise;
      }
    }

    // 3. Reproduz imediatamente via SafraSpeechEngine (Web Speech API + síntese formante sincronizada, 0ms de espera)
    this.falarVozNat(nome, limpo, meuSeq, finishOnce);
    return donePromise;
  }

  isCenaPlaying() {
    return !!(this._cena && this._cena.classList.contains('on'));
  }

  // Balão de fala: sincronizado ao tempo real da fala (Web Speech API / WAV neural) e à animação 3D
  playCena(parada) {
    const falas = (parada && parada.roteiro) || [];
    if (!falas.length) return Promise.resolve();
    const el = this.cenaEl();
    if (this._cenaFim) this._cenaFim();
    this._cenaParadaId = (parada && parada.id) || null;
    const reduz = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const [nomeP, ...cargoP] = String(parada.quem || '').split(', ');
    const cargo = cargoP.join(', ');
    let usouBaseNpc = false;
    return new Promise(resolve => {
      let i = -1, seq = 0, timer = 0, digit = 0, texto = '';
      const parar = () => { clearInterval(digit); digit = 0; };
      const fim = () => {
        clearTimeout(timer); parar(); seq++;
        this.pararVoz();
        el.classList.remove('on', 'entra'); el.onclick = null;
        window.removeEventListener('keydown', tecla, true);
        if (this._cenaFim === fim) {
          this._cenaFim = null;
          this._cenaParadaId = null;
        }
        resolve();
      };
      const agendarProximaSincronizada = (meu) => {
        clearTimeout(timer);
        const sp = typeof window !== 'undefined' ? window.__SAFRA_SPEECH__ : null;
        const checarFimFala = () => {
          if (meu !== seq) return;
          const aindaFalando = (sp && sp.playing) || (window.__SAFRA_VOZ_STATUS__ && window.__SAFRA_VOZ_STATUS__.playing);
          if (aindaFalando) {
            timer = setTimeout(checarFimFala, 180);
          } else {
            timer = setTimeout(() => { if (meu === seq) proxima(); }, 550);
          }
        };
        // Tempo mínimo de leitura confortável (1.6s) + aguarda término real da fala
        timer = setTimeout(checarFimFala, 1600);
      };
      const pronto = () => { // texto inteiro na tela; aguarda sincronia de voz ou avanço manual
        parar();
        const t = el.querySelector('.txt'); if (t) t.textContent = texto;
        agendarProximaSincronizada(seq);
      };
      const proxima = () => {
        clearTimeout(timer); parar(); i++;
        if (i >= falas.length) return fim();
        const [quem, fala] = falas[i];
        const eu = quem === 'Você';
        const meu = ++seq;
        texto = fala;
        const usarBase = !eu && !usouBaseNpc;
        if (usarBase) usouBaseNpc = true;
        this.falarVoz(quem, fala, false, usarBase);
        const sp = typeof window !== 'undefined' ? window.__SAFRA_SPEECH__ : null;
        const durEst = (sp && sp.durationMs) ? sp.durationMs : Math.max(1800, texto.length * 52);
        const passoMs = Math.max(18, Math.min(44, Math.round((durEst * 0.80) / Math.max(1, texto.length))));
        const mostraCargo = !eu && quem === nomeP && cargo;
        const inic = (eu ? 'VC' : String(quem).split(/\s+/).map(s => s[0]).join('').slice(0, 2)).toUpperCase();
        el.className = (eu ? 'voce' : 'pers') + ' on';
        el.innerHTML = `<i></i><div class="who"><span class="mono">${esc(inic)}</span><b>${esc(eu ? 'Você' : quem)}<span class="voz-eq" aria-hidden="true"><s></s><s></s><s></s><s></s></span></b>${mostraCargo ? `<small>${esc(cargo)}</small>` : ''}</div>` +
          `<p class="txt"></p><div class="cena-foot"><div class="pts"><span>${i + 1} de ${falas.length}</span>${falas.map((_, k) => `<s class="${k <= i ? 'on' : ''}"></s>`).join('')}</div>` +
          `<div class="dica">${document.body.classList.contains('toque') ? 'Toque para avançar' : 'Espaço ou clique para avançar'}</div></div>`;
        void el.offsetWidth; el.classList.add('entra');
        if (reduz) return pronto();
        const txt = el.querySelector('.txt'); let k = 0;
        digit = setInterval(() => {
          if (meu !== seq) return parar();
          const charFromSpeech = (sp && sp.playing && sp.getActiveCharIndex) ? sp.getActiveCharIndex() : 0;
          k = Math.max(k + 1, charFromSpeech);
          txt.textContent = texto.slice(0, k);
          if (k >= texto.length) pronto();
        }, passoMs);
      };
      const avanca = () => { if (digit) pronto(); else proxima(); };
      const tecla = e => {
        if (e.code === 'Space' && !e.repeat) { e.preventDefault(); avanca(); }
      };
      window.addEventListener('keydown', tecla, true);
      el.onclick = avanca;
      this._cenaFim = fim;
      proxima();
    });
  }

  setLoading(msg, pct) {
    this.el('cargaStatus').textContent = msg;
    this.el('cargaFill').style.width = `${pct}%`;
  }

  hideLoading() {
    const c = this.el('carga');
    c.style.opacity = '0';
    setTimeout(() => { c.hidden = true; }, 450);
  }

  // Avisos e rádio: uma pílula por vez no topo central; a nova substitui a anterior
  notify(msg) {
    const box = this.el('avisos');
    box.innerHTML = '';
    this.el('radio').style.opacity = '0';
    const div = document.createElement('div');
    div.className = 'aviso';
    div.textContent = msg;
    box.appendChild(div);
    setTimeout(() => div.remove(), 3100);
  }

  showRadio(txt) {
    const r = this.el('radio');
    this.el('avisos').innerHTML = '';
    this.el('radioTxt').textContent = txt;
    r.style.opacity = '1';
    clearTimeout(this._radioT);
    this._radioT = setTimeout(() => { r.style.opacity = '0'; }, 4800);
  }

  showLocalCard(nome, sub) {
    const loc = this.el('local');
    this.el('localNome').textContent = nome;
    this.el('localSub').textContent = sub;
    loc.classList.remove('on');
    void loc.offsetWidth;
    loc.classList.add('on');
    clearTimeout(this._locT);
    this._locT = setTimeout(() => loc.classList.remove('on'), 3200);
  }

  updateTopHUD() {
    const st = this.state;
    const cur = PARADAS[st.i];
    this.el('relogio').textContent = cur ? addMin(cur.hora, st.atraso || 0) : '18:00';
    this.atualizaCracha();
    this.el('pontos').textContent = String(st.pontos);

    const bars = this.el('trilha').querySelectorAll('i');
    bars.forEach((b, idx) => {
      b.className = st.feitas[PARADAS[idx].id] ? 'ok' : (idx === st.i ? 'now' : '');
    });

    const feitasN = Object.keys(st.feitas).length;
    const minD = this.minDoresNivel();
    const btR = this.el('btReuniaoAlvo');
    if (btR) {
      btR.hidden = feitasN < minD || !!(st.ligacao && st.ligacao.venceu != null);
      btR.textContent = `Pedir a reunião (${feitasN}/${PARADAS.length})`;
    }

    if (cur && !st.fim) {
      this.el('alvo').hidden = false;
      this.el('alvoHora').textContent = `${cur.hora} · Parada ${st.i + 1} de ${PARADAS.length} · ${feitasN}/${minD} mín.`;
      this.el('alvoNome').textContent = cur.lugar;
      this.el('alvoDica').textContent = `Fale com ${cur.quem.split(',')[0]}`;
    } else if (feitasN >= minD && !(st.ligacao && st.ligacao.venceu != null)) {
      this.el('alvo').hidden = false;
      this.el('alvoHora').textContent = `18:00 · Sala da diretoria (${feitasN}/${PARADAS.length} dores)`;
      this.el('alvoNome').textContent = 'Devolutiva com Dr. Augusto';
      this.el('alvoDica').textContent = 'Apresente o diagnóstico na sala da diretoria';
    } else {
      this.el('alvo').hidden = true;
    }
  }

  updateAcousticBadge(bio) {
    const el = this.el('somBioma'), txt = this.el('somBiomaTxt');
    if (!el || !txt || !bio) return;
    if (this._ultBiomaId === bio.id && !el.hidden) return;
    this._ultBiomaId = bio.id;
    el.hidden = !this.state.on || !!this.state.demo;
    el.classList.toggle('interno', !!bio.interior);
    txt.innerHTML = `${bio.interior ? 'Interno' : 'Ar livre'} · <b>${esc(bio.nome)}</b>`;
  }

  updateInteractPrompt(target, holdProgress) {
    const el = this.el('fala');
    if (!target || this.state.modalOpen || !this.state.on || (this.isCenaPlaying() && (!holdProgress || holdProgress <= 0.01))) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    // personagem (parada ou equipe de campo): nome em destaque, cargo embaixo; demais alvos mantêm o texto original
    const [nomeP, ...cargoP] = String(target.title).split(', ');
    const personagem = target.type === 'parada' || target.type === 'murmurio';
    this.el('falaTxt').textContent = personagem ? nomeP : target.title;
    this.el('falaCargo').textContent = personagem ? cargoP.join(', ') : '';
    this.el('falaSub').textContent = target.type === 'parada'
      ? 'Segure E para conversar'
      : (target.type === 'murmurio' ? 'Segure E para puxar assunto' : target.sub);
    const offset = 125.7 * (1 - Math.min(1, Math.max(0, holdProgress)));
    this.el('falaAnel').style.strokeDashoffset = String(offset);
  }

  drawCompass(playerX, playerZ, playerYaw) {
    const cvs = this.el('bussola');
    if (!this.state.on || cvs.hidden) return;
    const ctx = cvs.getContext('2d');
    const w = cvs.width, h = cvs.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(7,20,22,0.72)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(226,240,234,0.2)';
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    const cur = PARADAS[this.state.i];
    if (cur) {
      const dx = cur.x - playerX;
      const dz = cur.nz - playerZ;
      const targetAngle = Math.atan2(-dx, -dz);
      let diff = targetAngle - playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const px = w / 2 - (diff / (Math.PI / 2)) * (w * 0.42);
      const clamped = Math.max(16, Math.min(w - 16, px));
      ctx.fillStyle = '#ffb629';
      ctx.beginPath();
      ctx.moveTo(clamped, 6);
      ctx.lineTo(clamped + 6, 16);
      ctx.lineTo(clamped - 6, 16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#eef6f1';
      ctx.font = '700 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(Math.hypot(dx, dz))} m`, clamped, 26);
    }
  }

  showTitle(autoDet) {
    const veu = this.el('veu');
    const folha = this.el('folha');
    veu.className = 'veu titulo';
    veu.hidden = false;
    this.state.modalOpen = true;
    document.body.classList.remove('jogo');

    folha.innerHTML = `
      <div class="hm">
        <header class="hm-top">
          <div class="hm-marca"><i></i><span>Senior · Agro</span></div>
          <span class="hm-assina">GAtec <em>by</em> Senior</span>
        </header>
        <div class="hm-texto">
          <h1 class="hm-titulo">Um Dia de Safra</h1>
          <p class="hm-sub">Um dia numa usina flex de cana e milho para ver, de ponta a ponta, onde Senior e GAtec fazem diferença.</p>
          <p class="hm-missao">A Usina Horizonte opera cana e milho safrinha, mas perdeu margem. Você tem um dia para descobrir onde.</p>
          <h2 class="hm-h">O que você vai fazer</h2>
          <ul class="hm-cards">
            <li class="hm-card">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5z"/></svg>
              <b>Ouvir</b><span>10 conversas em que o argumento conta.</span>
            </li>
            <li class="hm-card">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="6" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M7.3 10.8l9.4-3.6M7.3 13.2l9.4 3.6"/></svg>
              <b>Conectar</b><span>Cada dor à solução certa.</span>
            </li>
            <li class="hm-card">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/><path d="M4 20h16"/></svg>
              <b>Fechar</b><span>A devolutiva com o diretor e o mapa de ponta a ponta.</span>
            </li>
          </ul>
        </div>
        <div class="hm-form">
          <label class="campo hm-campo" for="nome">Seu nome<input id="nome" value="${esc(this.state.nome)}" maxlength="40" autocomplete="off"></label>
          <div class="hm-bloco">
            <span class="hm-rot">Nível</span>
            <div class="hm-niveis" id="segNivel">
              ${Object.entries(NIVEIS).map(([k, v]) => `<button data-n="${k}" class="${this.state.nivel === k ? 'on' : ''}" aria-pressed="${this.state.nivel === k}"><b>${esc(v.n)}</b><small>${esc(v.d)}</small></button>`).join('')}
            </div>
            <span class="hm-sr" id="nivelDesc" aria-live="polite">${esc(NIVEIS[this.state.nivel].d)}</span>
          </div>
          <div class="hm-ajustes">
            <div class="hm-bloco">
              <span class="hm-rot">Qualidade gráfica</span>
              <div class="seg" id="segQual">
                <button data-q="auto" class="${this.state.cfg.qualAuto ? 'on' : ''}" aria-pressed="${this.state.cfg.qualAuto}">Auto</button>
                <button data-q="alta" class="${!this.state.cfg.qualAuto && this.state.cfg.qual === 'alta' ? 'on' : ''}" aria-pressed="${!this.state.cfg.qualAuto && this.state.cfg.qual === 'alta'}">Alta</button>
                <button data-q="media" class="${!this.state.cfg.qualAuto && this.state.cfg.qual === 'media' ? 'on' : ''}" aria-pressed="${!this.state.cfg.qualAuto && this.state.cfg.qual === 'media'}">Média</button>
                <button data-q="baixa" class="${!this.state.cfg.qualAuto && this.state.cfg.qual === 'baixa' ? 'on' : ''}" aria-pressed="${!this.state.cfg.qualAuto && this.state.cfg.qual === 'baixa'}">Baixa</button>
              </div>
            </div>
            <div class="hm-bloco">
              <span class="hm-rot">Som</span>
              <div class="seg" id="segSom">
                <button data-s="1" class="${this.state.cfg.som ? 'on' : ''}" aria-pressed="${this.state.cfg.som}">Ligado</button>
                <button data-s="0" class="${!this.state.cfg.som ? 'on' : ''}" aria-pressed="${!this.state.cfg.som}">Mudo</button>
              </div>
            </div>
          </div>
          <p class="hm-duracao">Duração estimada: cerca de 20 minutos.</p>
        </div>
        <div class="hm-acoes">
          <button class="bt hm-primario" id="entrar" data-start="true">Começar o dia</button>
          <button class="bt hm-secundario" id="demo">Ver a demonstração</button>
        </div>
        <div class="hm-ctrl">
          <p class="hm-ctrl-tecla nota-tecla">Mouse: clique na cena para olhar. WASD anda, Shift corre, E interage, G leva à parada, M abre a plataforma, P pausa.</p>
          <p class="hm-ctrl-toque nota-toque">Celular: o polegar esquerdo anda e o direito olha. Segure o botão de fala para conversar e registrar evidências.</p>
          <p class="hm-som">Com som: tecla N liga e desliga a música.</p>
        </div>
        <footer class="hm-rodape">
          <p>A Usina Horizonte e as pessoas são fictícias. <span class="hm-qual">Qualidade detectada: <b>${esc(autoDet)}</b>.</span></p>
          <p>Personagens 3D: Microsoft Rocketbox Avatar Library (MIT).</p>
        </footer>
      </div>
    `;

    folha.querySelectorAll('#segQual button').forEach(b => {
      b.onclick = () => {
        const q = b.dataset.q;
        this.cb.setQuality(q);
        folha.querySelectorAll('#segQual button').forEach(x => {
          x.classList.toggle('on', x === b);
          x.setAttribute('aria-pressed', String(x === b));
        });
      };
    });
    folha.querySelectorAll('#segNivel button').forEach(b => {
      b.onclick = () => {
        this.state.nivel = b.dataset.n;
        window.SAFRA_BRILHO = NIVEIS[this.state.nivel].brilho;
        this.el('nivelDesc').textContent = NIVEIS[this.state.nivel].d;
        folha.querySelectorAll('#segNivel button').forEach(x => {
          x.classList.toggle('on', x === b);
          x.setAttribute('aria-pressed', String(x === b));
        });
      };
    });
    folha.querySelectorAll('#segSom button').forEach(b => {
      b.onclick = () => {
        const on = b.dataset.s === '1';
        this.state.cfg.som = on;
        this.cb.updateAudio();
        folha.querySelectorAll('#segSom button').forEach(x => {
          x.classList.toggle('on', x === b);
          x.setAttribute('aria-pressed', String(x === b));
        });
      };
    });
    this.el('entrar').onclick = () => {
      this.unlockVoz();
      this.state.nome = (this.el('nome').value || 'Consultor').trim();
      this.closeModal();
      this.cb.startGame(false);
    };
    this.el('demo').onclick = () => {
      this.unlockVoz();
      this.state.nome = (this.el('nome').value || 'Consultor').trim();
      this.closeModal();
      this.cb.startGame(true);
    };
  }

  closeModal() {
    clearInterval(this._digit); this._digit = 0; // fala em digitação para ao fechar
    this.pararVoz();
    // fechar o Caderno marca os recém-destravados como vistos (sem o selo "novo" nas próximas vezes)
    if (this._cad) { this._cad = null; this.state.codexNovos = {}; }
    // durante a ligação o veu não fecha: o relógio continua e a ligação termina sozinha
    if (this._ligacaAtiva) { this.el('pausaVeu').hidden = true; return; }
    this.el('veu').hidden = true;
    this.el('pausaVeu').hidden = true;
    this._paradaAberta = null;
    if (this.cb.focusStop) this.cb.focusStop(null);
    const fechou = this.state.modalOpen;
    this.state.modalOpen = false;
    document.body.classList.remove('falando');
    if (fechou && this.cb.playModal) this.cb.playModal(false);
  }

  // ===== Mentor Konviva · Copiloto de Campo IA (Rádio Walkie-Talkie / Codec multi-turn) =====
  initKonviva() {
    const bt = this.el('btKonviva');
    const drawer = this.el('konvivaDrawer');
    const fechar = this.el('kvFechar');
    const form = this.el('konvivaForm');
    const inp = this.el('konvivaInput') || this.el('konvivaInp');
    const log = this.el('konvivaLog');
    if (!bt || !drawer || !form || !inp || !log) return;

    this.state.kvHist = this.state.kvHist || [
      {
        role: 'model',
        text: 'Na escuta, Executivo! Sou seu Mentor Konviva (Academia Corporativa Senior + GAtec). Em qualquer parada da Usina Horizonte, me chame no rádio (tecla K) para calibrar sua pergunta SPIN, entender o glossário da usina ou conectar SimpleFarm, Operis, Commerce e ERP Senior.'
      }
    ];

    const renderLog = (typing = false) => {
      log.innerHTML = this.state.kvHist.map(m => `
        <div class="kv-msg ${m.role === 'user' ? 'user' : 'bot'}">
          <small>${m.role === 'user' ? 'Você · Executivo de Contas' : 'Mentor Konviva · Rádio IA'}</small>
          <div>${esc(m.text)}</div>
        </div>
      `).join('') + (typing ? `<div class="kv-msg bot typing"><small>Mentor Konviva · Rádio IA</small><div>Sintonizando contexto da Usina Horizonte…</div></div>` : '');
      log.scrollTop = log.scrollHeight;
    };
    this._renderKvLog = renderLog;
    renderLog(false);

    bt.onclick = () => this.toggleKonviva();
    if (fechar) fechar.onclick = () => this.toggleKonviva(false);

    drawer.querySelectorAll('.kv-chip').forEach(chip => {
      chip.onclick = () => {
        const q = chip.getAttribute('data-kv-q') || chip.getAttribute('data-q');
        if (q) this.askKonviva(q);
      };
    });

    form.onsubmit = e => {
      e.preventDefault();
      const txt = inp.value.trim();
      if (!txt) return;
      inp.value = '';
      this.askKonviva(txt);
    };
  }

  toggleKonviva(force) {
    const drawer = this.el('konvivaDrawer');
    const bt = this.el('btKonviva');
    if (!drawer) return;
    const abrir = force != null ? !!force : drawer.hidden;
    drawer.hidden = !abrir;
    if (bt) bt.classList.toggle('ativo', abrir);
    if (abrir) {
      if (this._renderKvLog) this._renderKvLog(false);
      const inp = this.el('konvivaInput') || this.el('konvivaInp');
      if (inp && !document.body.classList.contains('toque')) setTimeout(() => inp.focus(), 60);
    }
  }

  async askKonviva(pergunta) {
    if (!pergunta || this._kvBusy) return;
    this._kvBusy = true;
    const st = this.state;
    st.kvHist = st.kvHist || [];
    st.kvHist.push({ role: 'user', text: pergunta });
    if (this._renderKvLog) this._renderKvLog(true);

    const p = this._paradaAberta || PARADAS[Math.min(st.i, PARADAS.length - 1)] || PARADAS[0];
    const c = p && st.conv && st.conv[p.id];
    const etapas = ['Situação', 'Problema', 'Implicação', 'Proposta'];
    const evsParada = p ? EVIDENCIAS.filter(e => e.st === p.id) : [];

    const context = {
      paradaAtual: p ? `${p.lugar} (${p.hora})` : 'Usina Horizonte',
      personagem: p ? p.quem : '',
      capitulo: p ? (p.capitulo || '') : '',
      enredo: p ? (p.enredo || p.cena) : '',
      comoFunciona: p ? p.aprende : '',
      etapaSpin: c ? (c.fim === 'ok' ? 'Conexão de Solução' : etapas[Math.min(c.r, 3)]) : 'Situação',
      confianca: c ? c.conf : 35,
      evidenciasColetadas: evsParada.filter(e => st.evid[e.id]).map(e => e.n),
      evidenciasPendentes: evsParada.filter(e => !st.evid[e.id]).map(e => e.n),
      paradasConcluidas: Object.keys(st.feitas || {}).length,
      pontos: st.pontos
    };

    try {
      const resp = await fetch('/api/konviva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: st.kvHist.slice(-8),
          context
        })
      });
      const data = await resp.json();
      st.kvHist.push({
        role: 'model',
        text: (data && data.reply) || 'Câmbio! Na escuta: investigue primeiro a rotina e o impacto no caixa antes de conectar o portfólio Senior + GAtec.'
      });
    } catch {
      st.kvHist.push({
        role: 'model',
        text: `Câmbio! Aqui em ${p ? p.lugar : 'campo'}, lembre-se do método SPIN: sonde como ${p ? p.quem.split(',')[0] : 'o gestor'} opera hoje, aprofunde onde a perda deságua no caixa e só então conecte SimpleFarm, Operis, Commerce ou ERP Senior.`
      });
    } finally {
      this._kvBusy = false;
      if (this._renderKvLog) this._renderKvLog(false);
    }
  }

  openStopModal(parada) {
    if (this._cenaFim) this._cenaFim();
    const veu = this.el('veu');
    const folha = this.el('folha');
    const st = this.state;
    if (st.vozAtiva === undefined) st.vozAtiva = true;
    const mudouParada = this._paradaAberta !== parada;
    this._paradaAberta = parada;
    if (this.cb.focusStop) this.cb.focusStop(parada);
    if (st.demo && !st.feitas[parada.id]) this.convAutoDemo(parada);
    clearInterval(this._digit); this._digit = 0; this._digitTok = Math.random();
    veu.className = 'veu convers';
    veu.hidden = false;
    const abriu = !st.modalOpen;
    st.modalOpen = true;
    document.body.classList.add('falando');
    if (abriu && this.cb.playModal) this.cb.playModal(true);
    if (document.pointerLockElement) document.exitPointerLock?.();

    const feita = st.feitas[parada.id];
    const nv = NIVEIS[st.nivel] || NIVEIS.executivo;
    const ato = ATOS.find(a => a.n === parada.ato);
    if (parada.desculpa && !st.desculpas[parada.id]) st.desculpas[parada.id] = parada.desculpa;
    const evs = EVIDENCIAS.filter(e => e.st === parada.id);
    const evsCol = evs.filter(e => st.evid[e.id]).length;
    const ops = this.opsConexao(parada);
    const [nome, ...cargoArr] = parada.quem.split(', ');
    const cargo = cargoArr.join(', ');
    const c = this.convDe(parada);

    if ((abriu || mudouParada) && !feita && c.log && c.log.length === 1) {
      this.falarVoz(nome, c.log[0].t, false, true);
    }

    let dossieHtml = `
      <div class="olho">${ato ? `Ato ${ato.n} · ${esc(ato.t)} · ` : ''}${esc(parada.hora)} · ${esc(parada.lugar)}</div>
      ${parada.aprende ? `<p class="nota"><b>Como funciona aqui:</b> ${esc(parada.aprende)}</p>` : ''}
      <div class="cena">${esc(parada.cena)}</div>
    `;
    if (evs.length) {
      dossieHtml += `<h3>Evidências de campo nesta parada</h3><div class="chips">${evs.map(ev => `<span>${st.evid[ev.id] ? '✓ ' : '· '}${esc(ev.n)}</span>`).join('')}</div>`;
    }
    if (c && c.log && (feita || c.log.length > 1)) {
      dossieHtml += `<details class="conv-hist" style="margin-top:10px" ${feita ? '' : 'open'}><summary>Histórico da conversa (${c.log.length} falas)</summary><div class="log">${this.convBolhas(c, nome, true)}</div></details>`;
    }

    let lista = [];
    if (!feita) {
      lista = c.fim ? [] : this.convOpcoes(parada);
    }

    const html = `
      <div class="cine-top">
        <div class="cine-cap">
          <span>${esc(parada.capitulo || (ato ? `Ato ${ato.n} · ${ato.t}` : 'Jornada Safra'))} · ${esc(parada.hora)}</span>
          <b>${esc(parada.lugar)} · ${esc(parada.quem)}</b>
        </div>
        <div class="cine-enredo">${esc(parada.enredo || parada.cena)}</div>
        <div class="cine-tools">
          <button class="cine-pill${st.vozAtiva !== false ? ' on' : ''}" id="btToggleVoz" type="button" aria-pressed="${st.vozAtiva !== false}">Voz IA: ${st.vozAtiva !== false ? 'ON' : 'OFF'}</button>
          <button class="cine-pill${this._dossieAberto ? ' on' : ''}" id="btToggleDossie" type="button">Dossiê (${evsCol}/${evs.length} evid.)</button>
          ${parada.roteiro ? `<button class="cine-pill" id="btCenaRoteiro" type="button">Encenar chegada</button>` : ''}
          <button class="cine-pill" id="btKonvivaConv" type="button">Mentor IA <kbd>K</kbd></button>
          <button class="cine-pill" id="btFecharConv" type="button">Voltar à cena <kbd>Esc</kbd></button>
        </div>
      </div>
      <div class="cine-drawer" id="cineDrawer" ${this._dossieAberto ? '' : 'hidden'}>
        ${dossieHtml}
      </div>
      ${this.convHTML(parada, nv, ops, lista, nome, cargo, feita)}
    `;

    folha.innerHTML = html;
    this.convBind(parada, ops, lista, feita);
  }

  // Mantido por compatibilidade; o layout cine-bottom já é 2 colunas nativamente
  layoutConversa() {}

  // ===== Conversa em rodadas (SPIN): confiança 0 a 100, escuta ativa, pontos e gafes =====
  convDe(parada) {
    const st = this.state;
    st.conv = st.conv || {};
    if (!st.conv[parada.id]) {
      const ini = { trainee: 45, executivo: 35, especialista: 25 }[st.nivel] || 35;
      st.conv[parada.id] = {
        r: 0,
        conf: ini,
        log: [{ q: 'pers', t: parada.saudacao || parada.cena, anim: false }],
        fim: null,
        usados: [],
        bonus: false
      };
    }
    return st.conv[parada.id];
  }

  ordemEstavel(n, key) {
    this._ordens = this._ordens || {};
    if (this._ordens[key] && this._ordens[key].length === n) return this._ordens[key];
    const a = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return (this._ordens[key] = a);
  }

  convRotulo(v) { return v < 35 ? 'Desconfiado' : v < 60 ? 'Ouvindo' : v < 80 ? 'Aberto' : 'Confia em você'; }

  // opções da rodada atual: isca só no especialista; evidência como 4ª opção na implicação
  convOpcoes(parada) {
    const st = this.state, c = this.convDe(parada), nv = NIVEIS[st.nivel] || NIVEIS.executivo;
    const rod = parada.conversa[c.r];
    let lista = rod.opcoes.map((o, i) => ({ ...o, i }));
    if (rod.etapa === 'proposta') lista = lista.filter(o => !c.usados.includes(o.i));
    else if (!nv.isca) lista = lista.filter(o => o.q !== 'isca');
    if (rod.etapa === 'implicacao') {
      const ev = EVIDENCIAS.find(e => e.st === parada.id && st.evid[e.id] && rod.evR && rod.evR[e.id]);
      if (ev) lista.push({ t: `Mostrar o que você viu: ${ev.n}`, q: 'evid', r: rod.evR[ev.id], i: 'ev' });
    }
    return lista;
  }

  convBolhas(c, nome, instantaneo) {
    const itens = instantaneo ? (c.log || []) : (() => {
      if (!c.log || !c.log.length) return [];
      // No palco cinematográfico, exibe apenas a legenda da fala atual (o histórico completo fica no Dossiê).
      return [c.log[c.log.length - 1]];
    })();
    return itens.map(m => {
      const quem = m.q === 'voce' ? 'Você' : nome;
      const escrevendo = m.anim && !instantaneo;
      const cls = `bal ${m.q}${escrevendo && m.tremer ? ' tremer' : ''}`;
      return `<div class="${cls}"><small>${esc(quem)}</small><p class="txt">${esc(escrevendo ? '' : m.t)}</p></div>`;
    }).join('');
  }

  convHTML(parada, nv, ops, lista, nome, cargo = '', feita = false) {
    const st = this.state;
    const c = this.convDe(parada);
    const rod = parada.conversa[Math.min(c.r, parada.conversa.length - 1)];
    const etapas = ['Situação', 'Problema', 'Implicação', 'Proposta'];
    const pend = !feita && !!(c.log.length && c.log[c.log.length - 1].anim);
    const cls = c.conf < 35 ? 'baixa' : c.conf >= 70 ? 'alta' : '';
    const pen = Math.round(20 * nv.pesoErro);
    const inic = String(nome || 'NP').split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase();
    const feitasCount = Object.keys(st.feitas).length;
    const minDores = this.minDoresNivel();

    const tagEtapa = {
      situacao: 'SONDAR ROTINA',
      problema: 'INVESTIGAR DOR',
      implicacao: 'MEDIR IMPACTO',
      proposta: 'ABRIR PROPOSTA'
    }[rod ? rod.etapa : 'situacao'] || 'DIÁLOGO';

    let esqHtml = `
      <div class="cine-esq">
        <div class="cine-head">
          <div class="cine-who">
            <div class="cine-avatar">${esc(inic)}</div>
            <div class="cine-id">
              <b>${esc(nome)}<span class="voz-eq" title="Voz do personagem"><s></s><s></s><s></s><s></s></span></b>
              <span>${esc(cargo || parada.lugar)}</span>
            </div>
            <button class="bt-voz" id="btOuvirFala" type="button" title="Ouvir fala com voz IA">Ouvir voz</button>
          </div>
          <div class="conf ${cls}">
            <div class="rot"><span>Confiança ${c.conf}%</span><b>${this.convRotulo(c.conf)}</b></div>
            <div class="faixa"><i style="width:${c.conf}%"></i></div>
          </div>
          <div class="etapas">${etapas.map((e, i) => `<span class="${feita || c.fim === 'ok' || i < c.r ? 'ok' : (i === c.r && !c.fim ? 'on' : '')}">${e}</span>`).join('')}</div>
        </div>
    `;

    if (feita) {
      esqHtml += `
        <div class="log" id="convLog">
          <div class="bal pers">
            <small>${esc(nome)} · Diagnóstico Conectado</small>
            <p class="txt">${esc(parada.feito)}</p>
          </div>
        </div>
        ${parada.ganchoProx ? `<div class="cine-gancho"><b>Próximo passo da jornada · Encadeamento</b>${esc(parada.ganchoProx)}</div>` : ''}
      </div>`;
    } else {
      esqHtml += `
        <div class="log" id="convLog">${this.convBolhas(c, nome, false)}</div>
        ${pend ? `<div class="cine-legenda-dica">Clique na legenda para avançar</div>` : (nv.dica && !c.fim ? `<p class="nota conv-dica" style="margin:6px 0 0">${esc(rod.dica)}</p>` : '')}
      </div>`;
    }

    let dirHtml = `<div class="cine-dir${pend ? ' pend' : ''}"${pend ? ' hidden' : ''}><div id="convOpc">`;
    if (feita) {
      const ord = this.ordemEstavel(ops.length, parada.id + 'o');
      dirHtml += `<div class="cine-dir-head"><span>Frente Conectada</span><span>Portfólio Senior + GAtec</span></div>`;
      dirHtml += ord.map((idx, pos) => {
        const op = ops[idx];
        return `<button class="op ${op[1] === 1 ? 'sim' : ''}" disabled><span class="op-key">${pos + 1}</span><span class="op-body"><span class="op-tag">${op[1] === 1 ? 'SOLUÇÃO CONECTADA ✓' : 'ALTERNATIVA'}</span><b>${esc(op[0])}</b></span></button>`;
      }).join('');
      dirHtml += this.renderFrentesSolved(parada) + this.renderCartao(parada);
      dirHtml += `<div class="linha-b" style="margin-top:8px">
        ${parada.id === 'custo' ? `<button class="bt bt-a" id="btMapa">Ver operação de ponta a ponta</button>` : ''}
        ${feitasCount >= minDores ? `<button class="bt bt-a" id="btVerRel">Reunião com Dr. Augusto (${feitasCount}/${PARADAS.length})</button>` : ''}
      </div>`;
    } else if (pend) {
      dirHtml += ``;
    } else if (c.fim === 'ok') {
      dirHtml += `<div class="cine-dir-head"><span>Conectar Solução</span><span>Teclas 1–${ops.length} ou clique</span></div>`;
      dirHtml += `<p class="nota" style="margin:0 0 4px">${esc(nome)} abriu espaço. Conecte a dor à frente certa da Senior + GAtec${c.conf >= 70 ? ' (+20 pts de bônus por confiança alta)' : ''}:</p>`;
      dirHtml += this.ordemEstavel(ops.length, parada.id + 'o').map((idx, pos) => `
        <button class="op" data-op="${idx}" data-num="${pos + 1}">
          <span class="op-key">${pos + 1}</span>
          <span class="op-body">
            <span class="op-tag">CONECTAR FRENTE SENIOR + GATEC</span>
            <b>${esc(ops[idx][0])}</b>
            <span id="opMsg-${idx}" hidden></span>
          </span>
        </button>
      `).join('');
    } else if (c.fim) {
      dirHtml += `<div class="fim">${c.fim === 'cortou' ? 'A conversa travou — pitch prematuro antes de ouvir a dor.' : `${esc(nome)} encerrou a conversa por falta de confiança.`}</div>
        <div class="linha-b"><button class="bt bt-a" id="convTentar">Retomar abordagem (-${pen} pts)</button></div>`;
    } else {
      const ord = this.ordemEstavel(lista.length, parada.id + 'r' + c.r + '_' + lista.length + '_' + c.usados.join('.'));
      dirHtml += `<div class="cine-dir-head"><span>Escolha sua abordagem (${etapas[c.r]})</span><span>Teclas 1–${ord.length}</span></div>`;
      dirHtml += ord.map((k, pos) => {
        const item = lista[k];
        const tag = item.q === 'evid' ? 'USAR EVIDÊNCIA DE CAMPO ★' : tagEtapa;
        return `<button class="op conv-op" data-k="${k}" data-num="${pos + 1}">
          <span class="op-key">${pos + 1}</span>
          <span class="op-body">
            <span class="op-tag">${esc(tag)}</span>
            <b>${esc(item.t)}</b>
          </span>
        </button>`;
      }).join('');
    }
    dirHtml += `</div></div>`;

    return `<div class="conv cine-bottom${pend ? ' so-legenda' : ''}">${esqHtml}${dirHtml}</div>`;
  }

  convBind(parada, ops, lista, feita) {
    const st = this.state, folha = this.el('folha');
    const [nome] = parada.quem.split(', ');
    const c = this.convDe(parada);
    if (this.el('btFecharConv')) this.el('btFecharConv').onclick = () => this.closeModal();
    if (this.el('btToggleVoz')) {
      this.el('btToggleVoz').onclick = () => {
        this.unlockVoz();
        st.vozAtiva = st.vozAtiva === false;
        if (!st.vozAtiva) this.pararVoz();
        else {
          const ultPers = [...(c.log || [])].reverse().find(m => m.q === 'pers');
          const ehSaudacao = !feita && (!c.log || c.log.length <= 1);
          this.falarVoz(nome, feita ? parada.feito : (ultPers ? ultPers.t : parada.saudacao), true, ehSaudacao);
        }
        this.el('btToggleVoz').classList.toggle('on', st.vozAtiva !== false);
        this.el('btToggleVoz').setAttribute('aria-pressed', String(st.vozAtiva !== false));
        this.el('btToggleVoz').textContent = `Voz IA: ${st.vozAtiva !== false ? 'ON' : 'OFF'}`;
      };
    }
    if (this.el('btOuvirFala')) {
      this.el('btOuvirFala').onclick = () => {
        this.unlockVoz();
        const ultPers = [...(c.log || [])].reverse().find(m => m.q === 'pers');
        const ehSaudacao = !feita && (!c.log || c.log.length <= 1);
        this.falarVoz(nome, feita ? parada.feito : (ultPers ? ultPers.t : parada.saudacao), true, ehSaudacao);
      };
    }
    if (this.el('btToggleDossie')) {
      this.el('btToggleDossie').onclick = () => {
        this._dossieAberto = !this._dossieAberto;
        const dr = this.el('cineDrawer');
        if (dr) dr.hidden = !this._dossieAberto;
        this.el('btToggleDossie').classList.toggle('on', !!this._dossieAberto);
      };
    }
    if (this.el('btCenaRoteiro')) {
      this.el('btCenaRoteiro').onclick = () => {
        this.closeModal();
        this.playCena(parada);
      };
    }
    if (this.el('btKonvivaConv')) {
      this.el('btKonvivaConv').onclick = () => this.toggleKonviva();
    }
    if (this.el('btVerRel')) this.el('btVerRel').onclick = () => this.showCall();
    if (this.el('btMapa')) this.el('btMapa').onclick = () => this.showMapa(() => this.openStopModal(parada));
    if (feita) return;
    const nv = NIVEIS[st.nivel] || NIVEIS.executivo;
    folha.querySelectorAll('[data-k]').forEach(b => {
      b.onclick = () => { this.convEscolher(parada, lista[Number(b.dataset.k)], false); this.openStopModal(parada); };
    });
    folha.querySelectorAll('[data-op]').forEach(btn => {
      btn.onclick = () => {
        if (btn.classList.contains('nao')) return; // errada já contada: duplo clique não penaliza de novo
        const idx = Number(btn.dataset.op), op = ops[idx];
        st.tent++;
        if (op[1] === 1) {
          if (c.conf >= 70 && !c.bonus) { c.bonus = true; st.pontos += 20; }
          this.cb.completeStop(parada);
          this.falarVoz(nome, parada.feito);
          this.openStopModal(parada);
        } else {
          btn.classList.add('nao', 'tremer');
          st.pontos = Math.max(0, st.pontos - Math.round(6 * nv.pesoErro));
          this.updateTopHUD();
          const msg = this.el(`opMsg-${idx}`);
          msg.textContent = op[2];
          msg.hidden = false;
          this.cb.playErr();
          // errar a conexão duas vezes na mesma parada vira advertência (uma só vez)
          st.conexErr = st.conexErr || {};
          st.conexErr[parada.id] = (st.conexErr[parada.id] || 0) + 1;
          if (st.conexErr[parada.id] === 2) this.cb.advertir('conexao_errada_duas_vezes');
        }
      };
    });
    const tent = this.el('convTentar');
    if (tent) tent.onclick = () => {
      st.pontos = Math.max(0, st.pontos - Math.round(20 * nv.pesoErro));
      delete st.conv[parada.id];
      this.updateTopHUD();
      this.openStopModal(parada);
    };
    const log = this.el('convLog');
    if (log) log.scrollTop = log.scrollHeight;
    if (c.log.length && c.log[c.log.length - 1].anim) { this.convTipar(parada); return; }
  }

  // Fala do personagem letra a letra sincronizada com o tempo de fala do SafraSpeechEngine; clique na conversa pula.
  convTipar(parada) {
    const c = this.convDe(parada);
    const m = c.log[c.log.length - 1];
    const log = this.el('convLog');
    const bolha = log && log.lastElementChild;
    if (!bolha) return;
    const p = bolha.querySelector('.txt');
    const tok = this._digitTok;
    const reduz = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const cur = document.createElement('span');
    cur.className = 'cur';
    bolha.appendChild(cur);
    const t0 = performance.now();
    const sp = typeof window !== 'undefined' ? window.__SAFRA_SPEECH__ : null;
    const fim = () => { clearInterval(this._digit); this._digit = 0; m.anim = false; this.openStopModal(parada); };
    if (reduz) { p.textContent = m.t; fim(); return; }
    log.onclick = () => { if (this._digit) { p.textContent = m.t; fim(); } };
    // Sincronizado ao relógio da fala ativa (ou 22 ms/letra como base)
    this._digit = setInterval(() => {
      if (tok !== this._digitTok || !this.el('convLog')) { clearInterval(this._digit); this._digit = 0; return; }
      const durAtiva = (sp && sp.playing && sp.durationMs) ? sp.durationMs * 0.78 : m.t.length * 22;
      const msPorLetra = Math.max(15, Math.min(38, durAtiva / Math.max(1, m.t.length)));
      const kClock = Math.floor((performance.now() - t0) / msPorLetra);
      const kSpeech = (sp && sp.playing && sp.getActiveCharIndex) ? sp.getActiveCharIndex() : 0;
      const k = Math.min(m.t.length, Math.max(kClock, kSpeech));
      p.textContent = m.t.slice(0, k);
      if (k >= m.t.length) fim();
    }, 18);
  }

  // Aplica uma fala do jogador: confiança, pontos, gafes, avanço de rodada, fim (ok, cortou, caiu)
  convEscolher(parada, o, instantaneo) {
    const st = this.state, c = this.convDe(parada), nv = NIVEIS[st.nivel] || NIVEIS.executivo;
    const [nome] = parada.quem.split(', ');
    const rod = parada.conversa[c.r];
    const porPerg = { situacao: 1, problema: 0, implicacao: 2 }[rod.etapa];
    let dt = 0, pts = 0, gafe = false, cortou = false, ok = false;
    if (o.q === 'boa') {
      if (rod.etapa === 'proposta') { dt = 10; pts = 15; ok = true; }
      else {
        dt = rod.etapa === 'implicacao' ? 16 : 12; pts = 15;
        st.perg[parada.id] = st.perg[parada.id] || {};
        st.perg[parada.id][porPerg] = true;
      }
    } else if (o.q === 'morna') { dt = 2; pts = 5; }
    else if (o.q === 'ruim') { gafe = true; cortou = !!o.corta; dt = o.corta ? -30 : -15; pts = -Math.round(10 * nv.pesoErro); }
    else if (o.q === 'erro') { dt = -12; pts = -Math.round(6 * nv.pesoErro); }
    else if (o.q === 'isca') { dt = -8; pts = -Math.round(5 * nv.pesoErro); }
    else if (o.q === 'evid') { dt = 18; pts = 10; }
    c.conf = Math.max(0, Math.min(100, c.conf + dt));
    st.pontos = Math.max(0, st.pontos + pts);
    if (gafe) st.gafes++;
    if (gafe || o.q === 'erro' || o.q === 'isca') this.cb.playErr();
    else this.cb.playOk();

    const caiu = !cortou && c.conf <= 0;
    c.log.push({ q: 'voce', t: o.t });
    c.log.push({ q: 'pers', t: o.r, anim: !instantaneo && !cortou && !caiu, tremer: gafe });
    let falaVoz = o.r;
    if (cortou) {
      const txtCorta = parada.corta.replace(/^[^:]*:\s*/, '');
      c.log.push({ q: 'pers', t: txtCorta, anim: !instantaneo });
      falaVoz = txtCorta;
      c.fim = 'cortou';
    } else if (caiu) {
      c.log.push({ q: 'pers', t: '“Volta depois, tô ocupado.”', anim: !instantaneo });
      falaVoz = 'Volta depois, tô ocupado.';
      c.fim = 'caiu';
    } else if (ok) c.fim = 'ok';
    else if (o.q === 'erro') c.usados.push(o.i);
    else c.r++;
    if (!instantaneo) this.falarVoz(nome, falaVoz);
    // pitch antes de ouvir (corte) e confiança zerada viram advertência do Valdemar
    if (cortou) this.cb.advertir('pitch_antes_de_ouvir');
    else if (caiu) this.cb.advertir('confianca_zerada');
    this.updateTopHUD();
  }

  // Modo demonstração: a conversa inteira pelo caminho bom, sem digitação
  convAutoDemo(parada) {
    const c = this.convDe(parada);
    let guarda = 0;
    while (!c.fim && guarda++ < 10) {
      const rod = parada.conversa[c.r];
      const i = rod.opcoes.findIndex(o => o.q === 'boa');
      this.convEscolher(parada, { ...rod.opcoes[i], i }, true);
    }
  }

  // Conexão com a frente certa: ops da parada; isca extra só no especialista
  opsConexao(parada) {
    const nv = NIVEIS[this.state.nivel] || NIVEIS.executivo;
    const ops = parada.op.slice();
    if (nv.isca) {
      const outra = PARADAS[(PARADAS.indexOf(parada) + 5) % PARADAS.length];
      const iscaN = outra.op.find(o => o[1] === 1)[0];
      if (!ops.some(o => o[0] === iscaN)) ops.push([iscaN, 0, `Essa frente existe e é boa, mas resolve a dor de ${outra.quem.split(',')[0]} (${outra.lugar}), não esta.`]);
    }
    parada._ops = ops;
    return ops;
  }

  // Frase de quem conecta sem perguntar: quatro variações, uma por parada e sorteada uma vez por sessão
  chuteFrase(parada) {
    const v = [
      'Conectar sem perguntar nada é chute. Funciona às vezes, igual na vida real.',
      'Sem pergunta, a conexão é palpite. Às vezes acerta, como em loteria.',
      'Ligar a frente sem ouvir a pessoa é aposta. Pode dar certo, mas não é método.',
      'Conectar sem perguntar nada é sorte. A usina não paga por sorte.'
    ];
    this._chutes = this._chutes || {};
    if (!this._chutes[parada.id]) this._chutes[parada.id] = v[Math.floor(Math.random() * v.length)];
    return this._chutes[parada.id];
  }

  renderFrentesSolved(parada) {
    let html = '';
    if (parada.perda) html += `<div class="levar"><small>Perda que isso evita</small>${esc(parada.perda.rotulo)}</div>`;
    parada.frentes.forEach(f => {
      html += `<div class="frente">
        <div class="cab"><b>${esc(f.n)}</b><span class="selo">${esc(f.p)}</span></div>
        <div class="chips">${f.c.map(c => `<span>${esc(c)}</span>`).join('')}</div>
      </div>`;
    });
    html += `<div class="levar"><small>Pergunta para levar ao cliente</small>${esc(parada.levar)}</div>`;
    return html;
  }

  renderCartao(parada) {
    const c = parada.cartao;
    if (!c) return '';
    return `<h3>Cartão do produto · ${esc(c.produto)}</h3>
      <p class="nota"><b>O que é:</b> ${esc(c.oque)}</p>
      <p class="nota"><b>Para quem:</b> ${esc(c.quem)}</p>
      <p class="nota"><b>Pergunta que abre a conversa:</b> ${esc(c.pergunta)}</p>
      <p class="nota"><b>Objeção típica:</b> ${esc(c.objecao)}</p>
      <p class="nota"><b>Resposta:</b> ${esc(c.resposta)}</p>`;
  }

  showPlatform() {
    if (this._cenaFim) this._cenaFim();
    const veu = this.el('veu');
    const folha = this.el('folha');
    veu.className = 'veu meio';
    veu.hidden = false;
    this.state.modalOpen = true;
    if (document.pointerLockElement) document.exitPointerLock?.();

    const ativas = this.frentesAgg.filter(x => x.list.some(fn => fn())).length;
    let html = `
      <div class="olho">Plataforma GAtec · Senior</div>
      <h2>Frentes em operação (${ativas}/${this.frentesAgg.length})</h2>
      <div class="grade">
    `;
    this.frentesAgg.forEach(item => {
      const on = item.list.some(fn => fn());
      html += `<div class="frente ${on ? '' : 'fechada'}">
        <div class="cab"><b>${esc(item.f.n)}</b><span class="selo ${on ? '' : 'off'}">${esc(item.f.p)}</span></div>
        <div class="chips">${item.f.c.slice(0, 6).map(c => `<span>${esc(c)}</span>`).join('')}</div>
      </div>`;
    });
    const feitasCount = Object.keys(this.state.feitas).length;
    const minDores = this.minDoresNivel();
    html += `</div><div class="linha-b" style="margin-top:16px"><button class="bt bt-a" id="btPlatReuniao">Pedir a reunião (${feitasCount}/${minDores} dores mín.)</button><button class="bt bt-s" id="btPlatMapa">Mapa ponta a ponta</button><button class="bt bt-s" id="btPlatCad">Caderno de campo</button><button class="bt bt-s" id="btPlatFechar">Fechar</button></div>`;
    folha.innerHTML = html;
    this.el('btPlatReuniao').onclick = () => this.showCall(false);
    this.el('btPlatFechar').onclick = () => this.closeModal();
    this.el('btPlatMapa').onclick = () => this.showMapa(() => this.showPlatform());
    this.el('btPlatCad').onclick = () => this.showCaderno(() => this.showPlatform());
  }

  showPause() {
    if (this._cenaFim) this._cenaFim();
    const pv = this.el('pausaVeu');
    const pf = this.el('pausaFolha');
    pv.hidden = false;
    this.state.modalOpen = true;
    if (document.pointerLockElement) document.exitPointerLock?.();

    const cfg = this.state.cfg;
    pf.innerHTML = `
      <div class="olho">Pausa · ajustes</div>
      <h2>Um Dia de Safra</h2>
      <div class="ajuste"><span>Sensibilidade do olhar</span><input id="rSens" type="range" min="0.4" max="2" step="0.1" value="${cfg.sens}"></div>
      <div class="ajuste"><span id="lblFov">Campo de visão (${cfg.fov}°)</span><input id="rFov" type="range" min="60" max="90" step="2" value="${cfg.fov}"></div>
      <div class="ajuste"><span>Volume</span><input id="rVol" type="range" min="0" max="100" step="5" value="${Math.round(cfg.vol * 100)}"></div>
      <div class="ajuste"><span>Inverter eixo Y</span><input id="cInv" type="checkbox" ${cfg.invY ? 'checked' : ''}></div>
      <div class="ajuste"><span>Reduzir movimento</span><input id="cRed" type="checkbox" ${cfg.reduz ? 'checked' : ''}></div>
      <div class="ajuste"><span>Mostrar medição de desempenho</span><input id="cMed" type="checkbox" ${cfg.medir ? 'checked' : ''}></div>
      <label class="campo" style="margin-top:12px">Qualidade gráfica
        <div class="seg" id="segQualP">
          <button data-q="auto" class="${cfg.qualAuto ? 'on' : ''}" aria-pressed="${cfg.qualAuto}">Auto</button>
          <button data-q="alta" class="${!cfg.qualAuto && cfg.qual === 'alta' ? 'on' : ''}" aria-pressed="${!cfg.qualAuto && cfg.qual === 'alta'}">Alta</button>
          <button data-q="media" class="${!cfg.qualAuto && cfg.qual === 'media' ? 'on' : ''}" aria-pressed="${!cfg.qualAuto && cfg.qual === 'media'}">Média</button>
          <button data-q="baixa" class="${!cfg.qualAuto && cfg.qual === 'baixa' ? 'on' : ''}" aria-pressed="${!cfg.qualAuto && cfg.qual === 'baixa'}">Baixa</button>
        </div>
      </label>
      <p class="nota" style="margin-top:10px">Qualidade automática detectou: <b>${esc(cfg.det || '—')}</b>.</p>
      <div class="linha-b" style="margin-top:14px">
        <button class="bt bt-a" id="btVoltar">Continuar (Esc)</button>
        <button class="bt bt-s" id="btRelP">Relatório parcial</button>
      </div>
    `;

    this.el('rSens').oninput = e => { cfg.sens = Number(e.target.value); };
    this.el('rFov').oninput = e => {
      cfg.fov = Number(e.target.value);
      this.el('lblFov').textContent = `Campo de visão (${cfg.fov}°)`;
      this.cb.applyFov(cfg.fov);
    };
    this.el('rVol').oninput = e => { cfg.vol = Number(e.target.value) / 100; this.cb.updateAudio(); };
    this.el('cInv').onchange = e => { cfg.invY = e.target.checked; };
    this.el('cRed').onchange = e => { cfg.reduz = e.target.checked; };
    this.el('cMed').onchange = e => {
      cfg.medir = e.target.checked;
      this.el('medicao').hidden = !cfg.medir;
    };
    pf.querySelectorAll('#segQualP button').forEach(b => {
      b.onclick = () => {
        this.cb.setQuality(b.dataset.q);
        pf.querySelectorAll('#segQualP button').forEach(x => {
          x.classList.toggle('on', x === b);
          x.setAttribute('aria-pressed', String(x === b));
        });
      };
    });
    this.el('btVoltar').onclick = () => this.closeModal();
    this.el('btRelP').onclick = () => { this.closeModal(); this.showReport(); };
  }

  // ===== Final: Devolutiva presencial na sala da diretoria com Dr. Augusto e Valdemar =====
  showCall(auto) {
    if (this._cenaFim) this._cenaFim();
    const veu = this.el('veu'), folha = this.el('folha');
    veu.className = 'veu meio'; veu.hidden = false; this.state.modalOpen = true;
    document.body.classList.remove('falando');
    if (document.pointerLockElement) document.exitPointerLock?.();
    const st = this.state, nv = NIVEIS[st.nivel] || NIVEIS.executivo;
    const nh = (typeof NIVEIS_HISTORIA !== 'undefined' && NIVEIS_HISTORIA[st.nivel]) || { doresParaAceitarDevolutiva: 8, objecoesNaDevolutiva: nv.objecoes };
    const minDores = nh.doresParaAceitarDevolutiva || 8;
    const numObj = nh.objecoesNaDevolutiva != null ? nh.objecoesNaDevolutiva : nv.objecoes;
    const feitasList = PARADAS.filter(p => st.feitas[p.id]);

    // Trava de mínimo de dores por nível (Trainee 6, Executivo 8, Especialista 10)
    if (!auto && feitasList.length < minDores) {
      this._ligacaAtiva = false;
      const faltam = PARADAS.filter(p => !st.feitas[p.id]);
      const faltamN = minDores - feitasList.length;
      folha.innerHTML = `
        <div class="olho">Sala da diretoria · Usina Horizonte · Nível ${esc(nv.n)}</div>
        <h2>Dr. Augusto ainda não aceita a reunião (${feitasList.length} de ${minDores} dores mínimas)</h2>
        <div class="cena">“Você mapeou ${feitasList.length} de ${PARADAS.length} frentes da usina. No nível ${esc(nv.n)}, só paro a diretoria quando você trouxer pelo menos ${minDores} dores confirmadas no campo e na indústria. Faltam ${faltamN} para a gente sentar.”</div>
        <h3>Áreas que ainda faltam visitar (${faltam.length})</h3>
        <div class="chips">${faltam.map(p => `<span>${esc(p.hora)} · ${esc(p.lugar)} (${esc(p.quem.split(',')[0])})</span>`).join('')}</div>
        <div class="linha-b" style="margin-top:16px">
          <button class="bt bt-a" id="btIrPend">Ir para ${esc(faltam[0] ? faltam[0].lugar : 'o campo')}</button>
          <button class="bt bt-s" id="btFecharPend">Voltar ao campo</button>
        </div>`;
      this.el('btIrPend').onclick = () => {
        if (faltam[0]) {
          st.i = PARADAS.indexOf(faltam[0]);
          this.updateTopHUD();
          this.closeModal();
          this.cb.goToStop();
        } else {
          this.closeModal();
        }
      };
      this.el('btFecharPend').onclick = () => this.closeModal();
      return;
    }

    this._ligacaAtiva = true;
    const call = st.ligacao = { escolhas: [], resp: [], obj: [], boas: 0, teveRuim: false, pontos: 0, caiu: false };
    const tempoTotal = st.nivel === 'trainee' ? 0 : st.nivel === 'executivo' ? 95 : 75;
    let t0 = performance.now(), timer = null;
    const barras = () => { if (!tempoTotal) return 4; const f = 1 - (performance.now() - t0) / 1000 / tempoTotal; return Math.max(0, Math.ceil(f * 4)); };
    const cr = st.cracha || { adv: 0, expulsoes: 0 };
    const advKey = (cr.adv === 0 && !cr.expulsoes) ? '0' : (cr.adv === 1 && !cr.expulsoes) ? '1' : '2+';
    const falaValdemar = (typeof DEVOLUTIVA !== 'undefined' && DEVOLUTIVA.comentarioAdvertencias && DEVOLUTIVA.comentarioAdvertencias[advKey]) || '';
    const falaAbertura = (typeof DEVOLUTIVA !== 'undefined' && DEVOLUTIVA.aberturaPorNivel && DEVOLUTIVA.aberturaPorNivel[st.nivel]) || DIRETOR.abre;

    const cab = (etapaLbl = 'Sala da diretoria · Devolutiva presencial') => `<div class="viva"><div class="sinal">${[1, 2, 3, 4].map(k => `<i class="${k <= barras() ? 'on' : ''}"></i>`).join('')}</div>
      <div><div class="olho">${esc(etapaLbl)} · Nível ${esc(nv.n)}</div><h2 style="margin:4px 0 0">${esc(typeof DEVOLUTIVA !== 'undefined' && DEVOLUTIVA.titulo ? DEVOLUTIVA.titulo : 'Devolutiva na sala da diretoria')} — ${esc(DIRETOR.quem)}</h2></div>
      ${tempoTotal ? `<b class="crono" id="crono"></b>` : ''}</div>`;
    const tick = () => {
      if (!tempoTotal) return;
      const rest = Math.max(0, tempoTotal - (performance.now() - t0) / 1000);
      const c = this.el('crono'); if (c) c.textContent = `${Math.ceil(rest)}s`;
      folha.querySelectorAll('.sinal i').forEach((el, k) => el.classList.toggle('on', k < barras()));
      if (rest <= 0) { clearInterval(timer); call.caiu = true; this.cb.playErr(); fim('O tempo da reunião estourou porque o conselho chamou o Dr. Augusto.', 'Reunião interrompida'); }
    };
    const fim = (msg, tituloFinal = 'Decisão da diretoria') => {
      clearInterval(timer);
      this._ligacaAtiva = false;
      st.pontos += call.pontos; this.updateTopHUD();
      folha.innerHTML = cab('Decisão da diretoria · Usina Horizonte') + `
        <h3>${esc(tituloFinal)}</h3>
        <div class="cena">${esc(msg)}</div>
        <p>${call.caiu ? 'Você somou' : 'A devolutiva rendeu'} <b>${call.pontos} pontos</b> (${call.boas}/3 perguntas-chave da diretoria${numObj ? ` · ${call.obj.filter(Boolean).length}/${numObj} objeções` : ''}).</p>
        <div class="linha-b"><button class="bt bt-a" id="btRel">Ver o relatório do dia</button></div>`;
      this.el('btRel').onclick = () => this.showReport();
    };

    // Passo 1: abertura presencial + parecer do Valdemar + escolha das 3 dores principais
    const resolvidas = feitasList.length >= 3 ? feitasList : PARADAS.filter(p => st.feitas[p.id] || ['plan', 'auto', 'custo'].includes(p.id));
    const passo1 = () => {
      folha.innerHTML = cab() + `
        <div class="dev-mesa">
          <div class="dev-part"><small>Dr. Augusto · Diretor de Operações</small><p>${esc(falaAbertura)}</p></div>
          <div class="dev-part fiscal"><small>Valdemar · Gerente de Operações (${cr.adv} adv.)</small><p>${esc(falaValdemar)}</p></div>
        </div>
        <h3>Escolha as 3 dores mais fortes para colocar na mesa</h3>
        <p class="nota">As mais fortes são as que você confirmou fazendo a pergunta de descoberta e registrando evidência no local.</p>
        ${resolvidas.map(p => `<button class="op" data-p="${p.id}"><b>${esc(p.lugar)} · ${esc(p.frentes.map(f => f.n).join(' + '))}</b><span>${esc(p.levar)}</span></button>`).join('')}
        <div class="linha-b"><button class="bt bt-a" id="btPitch" disabled>Colocar na mesa (0/3)</button></div>`;
      folha.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
        const id = b.dataset.p, k = call.escolhas.indexOf(id);
        if (k >= 0) call.escolhas.splice(k, 1); else if (call.escolhas.length < 3) call.escolhas.push(id);
        folha.querySelectorAll('[data-p]').forEach(x => x.classList.toggle('sim', call.escolhas.includes(x.dataset.p)));
        const bt = this.el('btPitch'); bt.disabled = call.escolhas.length !== 3; bt.textContent = `Colocar na mesa (${call.escolhas.length}/3)`;
      });
      this.el('btPitch').onclick = () => {
        let fortes = 0;
        call.escolhas.forEach(id => {
          const p = PARADAS.find(x => x.id === id), pd = st.perg[id] || {};
          const descobriu = p && p.pergs && Object.keys(pd).some(ix => p.pergs[ix] && p.pergs[ix][1] === 1);
          const evid = EVIDENCIAS.some(e => e.st === id && st.evid[e.id]);
          const v = 10 + (descobriu ? 15 : 0) + (evid ? 10 : 0);
          call.pontos += v; if (descobriu) fortes++;
        });
        call.fortes = fortes;
        this.cb.playOk();
        perguntaDevolutiva(0, fortes, reacao(fortes));
      };
    };

    const reacao = f => f === 3 ? '“Hum. Isso eu reconheço. A Paula reclama disso toda semana.”' : f === 2 ? '“Faz sentido. Uma delas eu nem sabia.”' : '“Isso é bonito, mas vamos ver se você sustenta na pergunta.”';
    const pergsDev = (typeof DEVOLUTIVA !== 'undefined' && DEVOLUTIVA.perguntas) || [];

    // Passo 2: as 3 perguntas duras do Dr. Augusto (DEVOLUTIVA.perguntas)
    const perguntaDevolutiva = (idx, fortes, reacaoAnt) => {
      if (idx >= pergsDev.length) {
        return objecao(0, fortes, reacaoAnt);
      }
      const pg = pergsDev[idx];
      const ord = [0, 1, 2].sort((a, b) => ((idx * 5 + a * 3) % 5) - ((idx * 5 + b * 3) % 5));
      folha.innerHTML = cab(`Devolutiva · Pergunta ${idx + 1} de ${pergsDev.length}`) + `
        <div class="cena">${reacaoAnt ? `${esc(reacaoAnt)}<br><br>` : ''}<b>Dr. Augusto:</b> ${esc(pg.pergunta)}</div>
        <h3>Sua resposta</h3>
        ${ord.map(i => `<button class="op" data-dev-k="${esc(pg.respostas[i].tipo)}" data-dev-i="${i}"><b>${esc(pg.respostas[i].texto)}</b></button>`).join('')}`;
      folha.querySelectorAll('[data-dev-i]').forEach(b => b.onclick = e => {
        if (e.detail > 1) return;
        const op = pg.respostas[Number(b.dataset.devI)];
        const tp = op.tipo;
        call.resp.push({ idx, tipo: tp });
        if (tp === 'boa') { call.boas++; call.pontos += 20; this.cb.playOk(); }
        else if (tp === 'morna') { call.pontos += 5; this.cb.playOk(); }
        else { call.teveRuim = true; call.pontos = Math.max(0, call.pontos - 10); this.cb.playErr(); }
        perguntaDevolutiva(idx + 1, fortes, op.reacao);
      });
    };

    // Passo 3: objeções de diretor conforme o nível (0 Trainee, 1 Executivo, 3 Especialista)
    const objecao = (k, fortes, reacaoAnt) => {
      if (k >= numObj) {
        const ok = call.obj.filter(Boolean).length;
        const venceu = call.boas >= 2 && fortes >= 1 && (numObj === 0 || ok >= Math.ceil(numObj / 2));
        call.venceu = venceu;
        if (venceu) call.pontos += 40;
        if (!call.teveRuim && call.obj.every(Boolean)) st.semPitchDiretor = true;
        const finais = (typeof DEVOLUTIVA !== 'undefined' && Array.isArray(DEVOLUTIVA.finais)) ? DEVOLUTIVA.finais : [];
        const idFinal = venceu ? 'contrato_diagnostico' : 'manda_proposta';
        const finalDef = finais.find(f => f.id === idFinal) || {
          id: idFinal,
          titulo: venceu ? 'Contrato de diagnóstico aprovado' : 'Manda uma proposta',
          texto: venceu ? 'Dr. Augusto: Manda o contrato de diagnóstico. Meia hora na semana que vem, com o Valdemar presente.' : 'Dr. Augusto: Manda a proposta. Eu leio, mas não prometo nada.'
        };
        call.finalId = finalDef.id;
        call.finalTitulo = finalDef.titulo;
        fim((reacaoAnt ? `${reacaoAnt} ` : '') + finalDef.texto, finalDef.titulo);
        return;
      }
      const o = DIRETOR.objecoes[k];
      const ord = [0, 1, 2].sort((a, b) => ((k * 7 + a * 3) % 5) - ((k * 7 + b * 3) % 5));
      folha.innerHTML = cab(`Devolutiva · Objeção ${k + 1} de ${numObj}`) + `
        <div class="cena">${reacaoAnt ? `${esc(reacaoAnt)}<br><br>` : ''}<b>Dr. Augusto:</b> ${esc(o.q)}</div>
        <h3>Sua resposta</h3>${ord.map(ix => `<button class="op" data-r="${ix}"><b>${esc(o.r[ix][0])}</b></button>`).join('')}`;
      folha.querySelectorAll('[data-r]').forEach(b => b.onclick = e => {
        if (e.detail > 1) return;
        const ok = o.r[Number(b.dataset.r)][1] === 1;
        call.obj.push(ok); if (ok) { call.pontos += 25; this.cb.playOk(); } else this.cb.playErr();
        objecao(k + 1, fortes, '');
      });
    };

    passo1();
    if (tempoTotal && !auto) timer = setInterval(tick, 250);
    if (auto) {
      // modo apresentação/demo: escolhe as 3 dores, responde as 3 perguntas duras e vence as objeções do nível
      const passo = (fn, ms) => new Promise(r => setTimeout(() => { fn(); r(); }, ms));
      (async () => {
        for (const id of ['plan', 'auto', 'custo']) await passo(() => folha.querySelector(`[data-p="${id}"]`)?.click(), 450);
        await passo(() => this.el('btPitch')?.click(), 600);
        for (let i = 0; i < pergsDev.length; i++) {
          await passo(() => folha.querySelector('[data-dev-k="boa"]')?.click(), 700);
        }
        for (let k = 0; k < numObj; k++) {
          const certa = DIRETOR.objecoes[k].r.find(r => r[1] === 1)[0];
          await passo(() => [...folha.querySelectorAll('[data-r]')].find(x => x.textContent === certa)?.click(), 800);
        }
      })();
    }
  }

  // Mapa ponta a ponta: fases Senior + GAtec no fluxo oficial; cada fase acende com a parada concluída.
  // voltar (opcional): reabre a tela de onde o mapa foi aberto; sem ela, o botão só fecha o modal.
  showMapa(voltar) {
    if (this._cenaFim) this._cenaFim();
    const veu = this.el('veu');
    const folha = this.el('folha');
    veu.className = 'veu meio mapa';
    veu.hidden = false;
    this.state.modalOpen = true;
    if (document.pointerLockElement) document.exitPointerLock?.();

    const feitas = this.state.feitas;
    const fases = PONTA_A_PONTA.map(f => {
      const pars = f.paradas.map(id => PARADAS.find(p => p.id === id)).filter(Boolean);
      const acesa = pars.some(p => feitas[p.id]);
      const falta = pars.find(p => !feitas[p.id]);
      return { f, acesa, dica: falta ? falta.lugar : (pars[0] ? pars[0].lugar : '') };
    });
    const conectadas = fases.filter(x => x.acesa).length;
    const agn = [...new Set(PONTA_A_PONTA.flatMap(f => f.agnosticas || []))];

    // cada célula cai numa linha (1 fase, 2 GAtec, 3 conexão, 4 ERP) e numa coluna (2 a 7); order mantém a leitura por fase no celular
    const cel = (cls, col, row, ord, html) => `<div class="${cls}" style="grid-column:${col};grid-row:${row};order:${ord}">${html}</div>`;
    let grade = cel('raia g', 1, 2, 0, esc('GAtec · operação')) + cel('raia e', 1, 4, 0, esc('Senior ERP · gestão'));
    fases.forEach(({ f, acesa, dica }, i) => {
      const col = i + 2, o = i * 4, off = acesa ? '' : ' off';
      grade += cel('fase-h', col, 1, o,
        `<b>${esc(f.nome)}</b><span class="st ${acesa ? 'ok' : ''}">${acesa ? 'Conectada' : `Visite ${esc(dica)} para acender`}</span>`);
      grade += cel(`ativ g${off}`, col, 2, o + 1,
        `<small class="tag">GAtec · operação</small>${f.gatec.map(a => `<span>${esc(a)}</span>`).join('')}`);
      grade += cel(`conn${off}`, col, 3, o + 2, `<span>${esc(f.conexao)}</span>`);
      grade += cel(`ativ e${off}`, col, 4, o + 3,
        `<small class="tag">Senior ERP · gestão</small>${f.erp.map(a => `<span>${esc(a)}</span>`).join('')}`);
    });

    folha.innerHTML = `
      <div class="olho">Visão de ponta a ponta · Senior + GAtec</div>
      <div class="mapa-top"><h2>Do campo ao balanço: Senior + GAtec de ponta a ponta</h2><p class="mapa-cont"><b>${conectadas} de ${fases.length} fases conectadas</b></p><button class="bt bt-a" id="btMapaFechar">Fechar</button></div>
      <div class="mapa">${grade}</div>
      <div class="mapa-agn"><small>Soluções Senior para qualquer segmento</small>${agn.map(a => `<span>${esc(a)}</span>`).join('')}</div>
    `;
    this.el('btMapaFechar').onclick = () => (voltar ? voltar() : this.closeModal());
  }

  // ===== Caderno de Campo: verbetes destravados (com "Onde a Senior entra") e pistas dos travados =====
  // voltar (opcional): reabre a tela de onde o Caderno foi aberto (Plataforma). Esc e Fechar voltam para lá.
  cadernoAberto() { return !!this._cad; }
  fechaCaderno() {
    const v = this._cad && this._cad.voltar;
    this.closeModal();
    if (v) v();
  }
  showCaderno(voltar) {
    if (this._cenaFim) this._cenaFim();
    const veu = this.el('veu');
    const folha = this.el('folha');
    const st = this.state;
    veu.className = 'veu meio cad';
    veu.hidden = false;
    st.modalOpen = true;
    if (document.pointerLockElement) document.exitPointerLock?.();
    this._cad = { voltar, cat: 'Todos', busca: '' };
    const n = Object.keys(st.codex || {}).length;
    folha.innerHTML = `
      <div class="cad-cab">
        <div><div class="olho">Usina Horizonte · o que se aprende andando</div><h2>Caderno de Campo</h2></div>
        <div class="cad-prog"><b id="cadCont">${n} de ${CODEX.length}</b><div class="faixa"><i id="cadBarra" style="width:${Math.round((n / CODEX.length) * 100)}%"></i></div></div>
        <button class="bt bt-a" id="cadFechar">Fechar</button>
      </div>
      <div class="cad-filtros" id="cadChips" role="group" aria-label="Filtrar por categoria">${CAD_CATS.map(c => `<button type="button" class="cad-chip${c === 'Todos' ? ' on' : ''}" data-cat="${c}" aria-pressed="${c === 'Todos'}">${c}</button>`).join('')}</div>
      <input type="search" id="cadBusca" class="cad-busca" placeholder="Buscar nos verbetes destravados" aria-label="Buscar no Caderno de Campo" autocomplete="off">
      <div class="cad-lista" id="cadLista"></div>`;
    this.el('cadFechar').onclick = () => this.fechaCaderno();
    this.el('cadChips').onclick = e => {
      const b = e.target.closest('.cad-chip'); if (!b || !this._cad) return;
      this._cad.cat = b.dataset.cat;
      this.el('cadChips').querySelectorAll('.cad-chip').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
      this._cadLista();
    };
    this.el('cadBusca').oninput = e => { if (this._cad) { this._cad.busca = e.target.value; this._cadLista(); } };
    this._cadLista();
  }
  // lista: destravados primeiro (os "novo" no topo); travados depois, só com "???" e a pista. Busca não revela travados.
  _cadLista() {
    const st = this.state, cad = this._cad, box = this.el('cadLista');
    if (!cad || !box) return;
    const n = Object.keys(st.codex || {}).length;
    this.el('cadCont').textContent = `${n} de ${CODEX.length}`;
    this.el('cadBarra').style.width = `${Math.round((n / CODEX.length) * 100)}%`;
    const sem = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const q = sem(cad.busca.trim());
    const pool = CODEX.filter(c => cad.cat === 'Todos' || c.categoria === cad.cat);
    const ok = pool.filter(c => st.codex[c.id] && (!q || sem(`${c.titulo} ${c.texto} ${c.senior || ''}`).includes(q)));
    ok.sort((a, b) => (!!st.codexNovos[b.id] - !!st.codexNovos[a.id]));
    const travados = q ? [] : pool.filter(c => !st.codex[c.id]);
    const cardOk = c => {
      const novo = !!st.codexNovos[c.id];
      return `<article class="cad-card${novo ? ' novo' : ''}">
        <div class="cad-meta"><small>${esc(c.categoria)}</small>${novo ? '<span class="cad-selo">novo</span>' : ''}</div>
        <h3>${esc(c.titulo)}</h3>
        <p>${esc(c.texto)}</p>
        ${c.senior ? `<p class="cad-senior"><b>Onde a Senior entra:</b> ${esc(c.senior)}</p>` : ''}
      </article>`;
    };
    const cardTr = c => `<article class="cad-card travado">
        <div class="cad-meta"><small>${esc(c.categoria)}</small></div>
        <h3>???</h3>
        <p class="cad-pista"><b>Como destravar:</b> ${esc(cadPista(c))}.</p>
      </article>`;
    const html = [...ok.map(cardOk), ...travados.map(cardTr)].join('');
    box.innerHTML = html || '<p class="nota">Nenhum verbete destravado com esse termo. Tente outra palavra ou outra categoria.</p>';
    box.scrollTop = 0;
  }

  showReport() {
    if (this._cenaFim) this._cenaFim();
    const veu = this.el('veu');
    const folha = this.el('folha');
    veu.className = 'veu meio';
    veu.hidden = false;
    this.state.modalOpen = true;
    if (document.pointerLockElement) document.exitPointerLock?.();

    const st = this.state;
    const obsPct = Math.round((Object.keys(st.evid).length / EVIDENCIAS.length) * 100);
    const totalPerg = PARADAS.reduce((acc, p) => acc + (p.pergs ? p.pergs.length : 0), 0);
    const pergCount = Object.values(st.perg).reduce((acc, m) => acc + Object.keys(m).length, 0);
    const pergPct = totalPerg ? Math.round((pergCount / totalPerg) * 100) : 100;
    const conCount = Object.keys(st.feitas).length;
    const conPct = Math.round((conCount / PARADAS.length) * 100);
    const lowest = [['Observar', obsPct], ['Perguntar', pergPct], ['Conectar', conPct]].sort((a, b) => a[1] - b[1])[0][0];
    const kit = PARADAS.filter(p => st.feitas[p.id] && p.cartao);
    const perdas = PARADAS.filter(p => st.feitas[p.id] && p.perda);

    // diagnóstico e pitch: dores levadas na ligação; sem ligação, as 3 primeiras paradas concluídas
    const lista = a => a.length <= 1 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} e ${a[a.length - 1]}`;
    const idsDiag = st.ligacao && st.ligacao.escolhas && st.ligacao.escolhas.length
      ? st.ligacao.escolhas
      : PARADAS.filter(p => st.feitas[p.id]).slice(0, 3).map(p => p.id);
    const diagParadas = idsDiag.map(id => PARADAS.find(p => p.id === id)).filter(p => p && p.cartao).slice(0, 3);
    const diagTxt = diagParadas.length
      ? `A margem da Horizonte escapa em ${lista(diagParadas.map(p => p.lugar))}. O caminho: ${lista(diagParadas.map(p => p.cartao.produto))}, com o ERP no centro.`
      : 'Ainda não há paradas concluídas para montar o diagnóstico.';
    // uma frase por parada: dor (primeira frase da desculpa) -> produto -> resultado (primeira oração do feito)
    const dorFrase = p => { const d = p.desculpa.replace(/[“”"]/g, '').trim(); const m = d.match(/^.*?[.!?](?=\s|$)/); const s = (m ? m[0] : d).trim(); return /[.!?]$/.test(s) ? s : `${s}.`; };
    const resultado = p => { const r = p.feito.split(';')[0].replace(/[.!?]+$/, '').trim(); return r.charAt(0).toLowerCase() + r.slice(1); };
    const pitchFrases = diagParadas.map(p => `Na ${p.lugar.toLowerCase()}, a margem escapa sem ninguém ver. Com ${p.cartao.produto}: ${resultado(p)}.`);
    const pitchTxt = pitchFrases.length ? pitchFrases.join(' ') : 'Ainda não há paradas concluídas para montar o pitch.';

    const rows = PARADAS.map(p => {
      const ok = st.feitas[p.id];
      return `<tr>
        <td>${esc(p.hora)}</td>
        <td><b>${esc(p.lugar)}</b><br><span class="nota">${esc(p.quem)}</span></td>
        <td>${ok ? esc(p.frentes.map(f => `${f.n} (${f.p})`).join(' + ')) : '<span class="nota">Pendente</span>'}</td>
      </tr>`;
    }).join('');

    // Avaliação das 10 Conquistas (CONQUISTAS em data__historia.js)
    const conqMap = {
      'ouvido-de-ouro': conCount >= PARADAS.length && st.gafes === 0 && PARADAS.every(p => !st.conv || !st.conv[p.id] || st.conv[p.id].conf >= 70),
      'cracha-limpo': (st.cracha ? st.cracha.adv : 0) === 0 && (st.cracha ? st.cracha.expulsoes : 0) === 0 && conCount > 0,
      'rato-de-usina': Object.keys(st.codex || {}).length >= CODEX.length,
      'do-campo-ao-balanco': PONTA_A_PONTA.every(f => f.paradas.some(id => st.feitas[id])),
      'olho-de-aguia': MIRANTES.every(m => st.mirantes && st.mirantes[m.id]),
      'evidencia-amarrada': Object.keys(st.evid || {}).length >= EVIDENCIAS.length,
      'segunda-chance': !!(st.voltouExpulso && st.ligacao && st.ligacao.venceu),
      'sem-pitch-no-diretor': !!(st.ligacao && st.semPitchDiretor),
      'dez-de-dez': conCount >= PARADAS.length,
      'cafe-da-oficina': !!st.cafeAntesAuto
    };
    st.conquistas = conqMap;
    const conqLista = typeof CONQUISTAS !== 'undefined' ? CONQUISTAS : [];
    const conqAtivas = conqLista.filter(c => conqMap[c.id]).length;
    const conqHtml = conqLista.length ? `
      <h3>Conquistas da visita (${conqAtivas} de ${conqLista.length})</h3>
      <div class="conq-grid">
        ${conqLista.map(c => {
          const ok = !!conqMap[c.id];
          return `<div class="conq-card ${ok ? 'ok ganha' : 'off'}" data-conq="${esc(c.id)}">
            <div class="conq-ico" aria-hidden="true">${ok ? '✓' : '·'}</div>
            <div class="conq-txt">
              <b>${esc(c.nome)}</b>
              <span>${esc(c.criterio)}</span>
              ${ok ? `<em>“${esc(c.frase)}”</em>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>` : '';

    // Caderno de Campo: quantos verbetes e as 3 primeiras pistas do que ficou para trás
    const cadN = Object.keys(st.codex || {}).length;
    const cadFaltam = CODEX.filter(c => !st.codex[c.id]).slice(0, 3).map(cadPista).join('; ');
    const resumoTxt = `Um Dia de Safra · ${st.nome} · ${st.pontos} pts · nível ${(NIVEIS[st.nivel] || NIVEIS.executivo).n}\n` +
      `Competências: Observar ${obsPct}% · Perguntar ${pergPct}% · Conectar ${conPct}% · Conquistas: ${conqAtivas}/${conqLista.length}\n` +
      PARADAS.map(p => `${p.hora} ${p.lugar}: ${st.feitas[p.id] ? p.feito : 'Pendente'} — ${p.frentes.map(f => `${f.n} (${f.p})`).join(' + ')}`).join('\n');

    folha.innerHTML = `
      <div class="olho">Relatório do dia · Usina Horizonte</div>
      <h2>${esc(st.nome)} — ${st.pontos} pontos</h2>
      <h3>Seu diagnóstico da Horizonte</h3>
      <p>${esc(diagTxt)}</p>
      <div class="linha-b" style="margin:4px 0 6px"><button class="bt bt-a" id="btMapaRel">Ver a operação de ponta a ponta</button>${!(st.ligacao && st.ligacao.venceu != null) ? `<button class="bt bt-s" id="btReuniaoRel">Pedir a reunião com Dr. Augusto</button>` : ''}</div>
      <h3>Onde a margem escapou</h3>
      ${perdas.map(p => `<p class="nota"><b>${esc(p.perda.rotulo)}</b> (${esc(p.lugar)}): ${esc(p.perda.frase)}</p>`).join('') || '<p class="nota">Nenhuma parada concluída ainda.</p>'}
      <h3>Seu pitch de 30 segundos</h3>
      <p class="nota" id="pitchTxt" style="color:var(--claro)">${esc(pitchTxt)}</p>
      <div class="linha-b" style="margin-top:8px"><button class="bt bt-c" id="cpPitch">Copiar pitch</button></div>
      <table class="dia">${rows}</table>
      <h3>Notas por competência</h3>
      ${[['Observar', obsPct], ['Perguntar', pergPct], ['Conectar', conPct]].map(([lbl, pct]) => `
        <div class="barra"><div class="lbl"><span>${lbl}</span><span>${pct}%</span></div><div class="faixa"><i style="width:${Math.max(4, pct)}%"></i></div></div>
      `).join('')}
      <p class="nota" style="margin-top:8px">O relatório diz qual competência treinar: <b>${lowest}</b>. Nível: <b>${esc((NIVEIS[st.nivel] || NIVEIS.executivo).n)}</b>.</p>
      ${st.ligacao ? `<h3>Devolutiva na sala da diretoria</h3><p class="nota"><b>${esc(st.ligacao.finalTitulo || (st.ligacao.caiu ? 'Reunião interrompida' : st.ligacao.venceu ? 'Contrato de diagnóstico assinado' : '“Manda uma proposta”'))}:</b> ${st.ligacao.caiu ? 'O tempo da reunião estourou antes da conclusão.' : st.ligacao.venceu ? 'Diagnóstico aprovado: segunda-feira às 7h com a Paula, o Rodrigo e o Seu Tião.' : 'Ele pediu para mandar uma proposta por e-mail. Ninguém volta de um “manda por e-mail”.'} ${st.ligacao.fortes != null ? `Dores fortes na mesa: ${st.ligacao.fortes} de 3.` : ''} ${st.ligacao.boas != null ? `Perguntas do diretor respondidas na mosca: ${st.ligacao.boas} de 3.` : ''}</p>` : ''}
      ${conqHtml}
      <h3>Top 5 desculpas da safra</h3>
      ${Object.values(st.desculpas).slice(-5).map((d, k) => `<p class="nota"><b>${k + 1}.</b> ${esc(d)}</p>`).join('') || '<p class="nota">Você não conversou com ninguém. A usina agradece o silêncio.</p>'}
      <p class="nota">Na próxima visita real, quando ouvir uma dessas, você já sabe qual pergunta fazer.</p>
      <p class="nota">Segredos da usina: <b>${Object.keys(st.eggs || {}).length} de ${EASTER.length}</b>${Object.keys(st.eggs || {}).length === EASTER.length ? '. Você achou tudo, até a capivara.' : '. Tem coisa escondida por aí (dica: alguém perdeu um cartão, alguém perdeu uma pasta e alguém nunca sai do gramado da sede).'}</p>
      <p class="nota">Caderno de Campo: <b>${cadN} de ${CODEX.length}</b>${cadN < CODEX.length ? `. Faltou explorar: ${esc(cadFaltam)}.` : '. Nenhum verbete ficou para trás.'}</p>
      <p class="nota">Gafes de executivo apressado: <b>${st.gafes}</b>${st.gafes ? ' (cada uma espantou alguém da conversa)' : ' (nenhuma, parabéns pela paciência)'}.</p>
      ${st.cadeia.armado || st.cadeia.visto ? `<p class="nota">Efeito em cadeia: a preventiva ignorada na Oficina parou a colhedora na Frente de colheita${st.cadeia.visto ? ' — você viu ao voltar lá' : ''}. Quem cuida da frota no dia, colhe no dia.</p>` : ''}
      ${kit.length ? `<h3>Seu kit de visita</h3>${kit.map(p => `<p class="nota"><b>${esc(p.cartao.produto)}:</b> ${esc(p.cartao.pergunta)}</p>`).join('')}` : ''}
      <h3>Perguntas para levar ao cliente</h3>
      ${PARADAS.map(p => `<p class="nota"><b>${esc(p.lugar)}:</b> ${esc(p.levar)}</p>`).join('')}
      <div class="linha-b" style="margin-top:14px">
        <button class="bt bt-a" id="cp">Copiar resumo</button>
        <button class="bt bt-c" id="de">Refazer o dia</button>
        <button class="bt bt-c" id="ex">Continuar explorando</button>
      </div>
      <p class="nota" style="font-size:11px;margin-top:14px">Personagens 3D: Microsoft Rocketbox Avatar Library (MIT).</p>
      <textarea id="copia" hidden readonly>${esc(resumoTxt)}</textarea>
    `;

    this.el('btMapaRel').onclick = () => this.showMapa(() => this.showReport());
    if (this.el('btReuniaoRel')) this.el('btReuniaoRel').onclick = () => this.showCall(false);
    this.el('cpPitch').onclick = async () => {
      const b = this.el('cpPitch');
      try {
        await navigator.clipboard.writeText(pitchTxt);
        b.textContent = 'Copiado';
      } catch (e) {
        this.notify('Não consegui copiar. Selecione o texto do pitch.');
      }
    };
    this.el('cp').onclick = () => {
      const ta = this.el('copia');
      ta.hidden = false;
      ta.select();
      navigator.clipboard?.writeText(resumoTxt).catch(() => {});
      this.notify('Resumo copiado');
    };
    this.el('de').onclick = () => location.reload();
    this.el('ex').onclick = () => this.closeModal();
  }
}


