// === audio/soundEngine.js ===
// Motor de áudio sintetizado com Web Audio API. Nenhum arquivo de áudio: tudo sai de osciladores,
// ruído filtrado, envelopes e amostras geradas em JS (Karplus-Strong para as cordas da viola).
// Camadas: trilha caipira (Lá maior, 16 compassos), ambiente por zona (panorama e distância),
// base de campo (vento, pássaros, grilos), sons de interação e toque de ligação.
const CHAVE_MUSICA = 'safra_musica';

// Progressão de 16 compassos em Lá maior. r = raiz em MIDI; m = acorde menor.
const ACORDES = {
  A: { r: 57, m: false }, D: { r: 50, m: false }, E: { r: 52, m: false },
  Fm: { r: 54, m: true }, Bm: { r: 59, m: true }
};
const PROGRESSAO = ['A', 'D', 'E', 'A', 'Fm', 'D', 'E', 'A', 'D', 'A', 'Bm', 'E', 'A', 'D', 'E', 'A'];
// Padrão de arpejo da viola por colcheia (índices em T, ver musicaPasso)
const PADRAO_VIOLA = [0, 2, 4, 2, 1, 3, 4, 2];
// Andamento por ato: amanhecer e dia cheio em 84; fim de tarde mais lento
const BPM_ATO = { 1: 84, 2: 84, 3: 76 };
// Ganho geral do mestre: volume (0-1) x GANHO_MESTRE. Calibrado para RMS ~0,04-0,06 e pico < 0,7.
const GANHO_MESTRE = 1.6;
const DIST_MAX = 55;      // m: além disso a zona fica muda
const FONTES_MAX = 6;     // zonas de áudio ao mesmo tempo

// Construtores de cada zona (ids de PARADAS). Recebem o motor e o barramento da zona.
// Cada um devolve { ev(zona, horizonte) } para os eventos rítmicos ou {} para sons contínuos.
const CONSTRUTORES = {
  // Sede: rádio de pilha com a trilha, chiado e ventilador
  plan(E, dest) {
    E.radio(dest, 1.1, 1100, 0.8);
    E.ruido('highpass', 4000, 0.5, dest, 0.004);
    const v = E.ruido('lowpass', 420, 0.7, dest, 0.02);
    E.lfo(v.gain, 2.1, 0.005, 'sine');
    E.osc('sine', 118, dest, 0.006);
    return {};
  },
  // Talhão 12: farfalhar de canavial, zumbido distante, folha que estala de vez em quando
  geo(E, dest) {
    const cana = E.ruido('bandpass', 2600, 0.45, dest, 0.03);
    E.lfo(cana.gain, 0.35, 0.012, 'sine');
    E.ruido('highpass', 1200, 0.3, dest, 0.006);
    E.osc('sine', 110, dest, 0.012);
    E.osc('sine', 111.7, dest, 0.01);
    return {
      ev: (z, h) => E.cad(z, 'f', h, 3.5, 9, t => E.clique(dest, t, 2400 + Math.random() * 1500, 0.5 + Math.random() * 0.4, 0.02, 'bandpass', 0.7))
    };
  },
  // Frente de colheita: colhedora (diesel pulsante e corte ritmado) e transbordo
  agri(E, dest) {
    E.motor(38, 9, 0.05, dest, 170);
    E.ruido('bandpass', 1800, 0.5, dest, 0.012);
    E.motor(29, 3, 0.02, dest, 220);
    return {
      ev: (z, h) => {
        E.cad(z, 'corte', h, 0.24, 0.27, t => E.clique(dest, t, 3200, 0.05, 0.03, 'bandpass', 1.5));
        E.cad(z, 'tomba', h, 1.6, 3.8, t => E.impacto(dest, t, 900, 0.14, 0.05));
      }
    };
  },
  // Oficina: compressor de ar ciclando, marteladas, chave de impacto e rádio AM
  auto(E, dest) {
    const comp = E.ruido('bandpass', 1200, 1.2, dest, 0);
    E.radio(dest, 0.35, 800, 1.5);
    return {
      ev: (z, h) => {
        E.cad(z, 'comp', h, 9, 12, t => {
          comp.gain.setTargetAtTime(0.03, t, 0.3);
          comp.gain.setTargetAtTime(0.0, t + 4, 0.3);
        });
        E.cad(z, 'martelo', h, 1.2, 3.5, t => E.sino(dest, t, 1800, 0.14, 0.03));
        E.cad(z, 'chave', h, 11, 22, t => {
          for (let i = 0; i < 8; i++) E.clique(dest, t + i * 0.07, 900, 0.05, 0.03, 'bandpass', 0.6);
        });
      }
    };
  },
  // Balança: caminhão em marcha lenta, bips, impressora de ticket, cancela e campainha de senha
  orig(E, dest) {
    E.motor(30, 7, 0.035, dest, 150);
    E.ruido('lowpass', 300, 0.5, dest, 0.02);
    return {
      ev: (z, h) => {
        E.cad(z, 'bip', h, 3.2, 6, t => { E.bip(dest, t, 2200, 0.07, 0.035); E.bip(dest, t + 0.14, 2200, 0.07, 0.035); });
        E.cad(z, 'ticket', h, 9, 14, t => { for (let i = 0; i < 14; i++) E.clique(dest, t + i * 0.04, 3500, 0.02, 0.02, 'bandpass', 2); });
        E.cad(z, 'cancela', h, 18, 30, t => { E.bip(dest, t, 700, 0.5, 0.012, 'sawtooth'); E.impacto(dest, t + 0.5, 260, 0.12, 0.04); });
        E.cad(z, 'senha', h, 14, 25, t => E.sino(dest, t, 1320, 1.0, 0.025));
      }
    };
  },
  // Indústria Flex (Moenda, silos de milho e secador DDGS): ronco grave, vapor e fluxo de grãos
  ind(E, dest) {
    E.motor(52, 2.4, 0.06, dest, 260);
    E.motor(26, 2.4, 0.04, dest, 120);
    E.osc('sine', 165, dest, 0.007);
    E.ruido('bandpass', 900, 1.2, dest, 0.01);
    return {
      ev: (z, h) => {
        E.cad(z, 'vapor', h, 4, 8, t => E.clique(dest, t, 4500, 1.2, 0.012, 'highpass', 0.4));
        E.cad(z, 'graos', h, 5.5, 11, t => E.clique(dest, t, 3100, 0.25, 0.008, 'bandpass', 0.9));
      }
    };
  },
  // Armazém: empilhadeira com bip de ré e pancada de palete
  arm(E, dest) {
    E.motor(70, 11, 0.02, dest, 220);
    return {
      ev: (z, h) => {
        E.cad(z, 're', h, 1.1, 1.3, t => E.bip(dest, t, 1000, 0.05, 0.012, 'square'));
        E.cad(z, 'palete', h, 7, 14, t => { E.impacto(dest, t, 70, 0.18, 0.08); E.clique(dest, t, 3000, 0.02, 0.04); });
      }
    };
  },
  // Controladoria: ar-condicionado, teclado, impressora e o "plim" de erro de planilha
  custo(E, dest) {
    E.ruido('lowpass', 500, 0.5, dest, 0.02);
    E.osc('sine', 97, dest, 0.006);
    return {
      ev: (z, h) => {
        E.cad(z, 'teclado', h, 2.5, 5, t => { for (let i = 0; i < 12; i++) E.clique(dest, t + i * 0.065 + Math.random() * 0.02, 3000, 0.03, 0.015, 'bandpass', 2); });
        E.cad(z, 'impressora', h, 14, 20, t => { for (let i = 0; i < 18; i++) E.clique(dest, t + i * 0.05, 2200, 0.03, 0.02, 'bandpass', 1.5); });
        E.cad(z, 'plim', h, 16, 30, t => { E.bip(dest, t, 1200, 0.22, 0.02); E.bip(dest, t + 0.1, 660, 0.14, 0.018, 'triangle'); });
      }
    };
  },
  // Centro de gestão: telefones tocando, toque de celular e zumbido de servidor
  erp(E, dest) {
    E.osc('sine', 120, dest, 0.006);
    E.osc('sine', 240, dest, 0.003);
    E.ruido('lowpass', 300, 0.5, dest, 0.012);
    return {
      ev: (z, h) => {
        E.cad(z, 'telefone', h, 22, 38, t => E.toque(dest, t, 0.03));
        E.cad(z, 'celular', h, 12, 20, t => { E.bip(dest, t, 1980, 0.09, 0.02, 'triangle'); E.bip(dest, t + 0.12, 2640, 0.09, 0.018, 'triangle'); });
      }
    };
  },
  // Porto: água batendo, guindaste, buzina grave de navio ao longe e gaivota
  com(E, dest) {
    const agua = E.ruido('bandpass', 600, 0.4, dest, 0.04);
    E.lfo(agua.gain, 0.12, 0.02, 'sine');
    E.motor(60, 0, 0.012, dest, 200);
    return {
      ev: (z, h) => {
        E.cad(z, 'buzina', h, 45, 75, t => E.buzina(dest, t));
        E.cad(z, 'gaivota', h, 15, 30, t => { if (Math.random() < 0.6) E.varre(dest, t, 1900, 2700, 0.5, 0.02, 'sine'); });
        E.cad(z, 'guindaste', h, 20, 35, t => E.varre(dest, t, 300, 900, 0.6, 0.012, 'sawtooth'));
      }
    };
  }
};

// Biomas acústicos contínuos da Usina Horizonte (interior/exterior, oclusão LPF, vento, fauna e piso).
const AUDIO_BIOMES = {
  portaria: {
    id: 'portaria', nome: 'Portaria · Entrada da Usina', interior: false,
    lpfHz: 18000, vento: 0.95, cana: 0.35, passaros: 0.78, cigarras: 0.30,
    reverb: 0.14, musicaPeso: 0.85, piso: 'asfalto'
  },
  sede: {
    id: 'sede', nome: 'Sede · Varanda do Planejamento', interior: true,
    lpfHz: 3100, vento: 0.34, cana: 0.18, passaros: 0.45, cigarras: 0.24,
    reverb: 0.28, musicaPeso: 0.95, piso: 'concreto'
  },
  milho: {
    id: 'milho', nome: 'Talhão de Milho · Safra Flex', interior: false,
    lpfHz: 18000, vento: 1.18, cana: 0.96, passaros: 0.95, cigarras: 0.85,
    reverb: 0.09, musicaPeso: 0.98, piso: 'terra'
  },
  canavial: {
    id: 'canavial', nome: 'Canavial · Talhão 12', interior: false,
    lpfHz: 18000, vento: 1.28, cana: 1.15, passaros: 1.0, cigarras: 0.92,
    reverb: 0.08, musicaPeso: 1.0, piso: 'terra'
  },
  colheita: {
    id: 'colheita', nome: 'Frente de Colheita Mecanizada', interior: false,
    lpfHz: 15500, vento: 1.02, cana: 0.82, passaros: 0.32, cigarras: 0.50,
    reverb: 0.10, musicaPeso: 0.90, piso: 'terra'
  },
  oficina: {
    id: 'oficina', nome: 'Oficina Mecânica · Galpão', interior: true,
    lpfHz: 2350, vento: 0.20, cana: 0.05, passaros: 0.10, cigarras: 0.12,
    reverb: 0.46, musicaPeso: 0.72, piso: 'metal'
  },
  balanca: {
    id: 'balanca', nome: 'Balança Rodoviária · Pátio', interior: false,
    lpfHz: 14500, vento: 0.78, cana: 0.16, passaros: 0.28, cigarras: 0.32,
    reverb: 0.22, musicaPeso: 0.84, piso: 'asfalto'
  },
  industria: {
    id: 'industria', nome: 'Indústria · Moenda e Vapor', interior: true,
    lpfHz: 1420, vento: 0.12, cana: 0.02, passaros: 0.04, cigarras: 0.05,
    reverb: 0.58, musicaPeso: 0.62, piso: 'metal'
  },
  armazem: {
    id: 'armazem', nome: 'Armazém e Pátio Logístico', interior: true,
    lpfHz: 2150, vento: 0.18, cana: 0.04, passaros: 0.08, cigarras: 0.08,
    reverb: 0.52, musicaPeso: 0.74, piso: 'concreto'
  },
  controladoria: {
    id: 'controladoria', nome: 'Controladoria · Escritório', interior: true,
    lpfHz: 1180, vento: 0.05, cana: 0.01, passaros: 0.02, cigarras: 0.02,
    reverb: 0.24, musicaPeso: 0.64, piso: 'concreto'
  },
  erp: {
    id: 'erp', nome: 'Centro de Gestão · ERP Senior', interior: true,
    lpfHz: 1060, vento: 0.04, cana: 0.01, passaros: 0.01, cigarras: 0.01,
    reverb: 0.20, musicaPeso: 0.58, piso: 'concreto'
  },
  porto: {
    id: 'porto', nome: 'Terminal Portuário · Cais', interior: false,
    lpfHz: 16800, vento: 1.35, cana: 0.05, passaros: 0.20, cigarras: 0.12,
    reverb: 0.18, musicaPeso: 0.92, piso: 'madeira'
  },
  estrada: {
    id: 'estrada', nome: 'Estrada Interna · Usina Horizonte', interior: false,
    lpfHz: 18000, vento: 1.0, cana: 0.55, passaros: 0.72, cigarras: 0.65,
    reverb: 0.10, musicaPeso: 1.0, piso: 'asfalto'
  }
};

function resolveBiome(px, pz, ato = 1) {
  let id = 'estrada';
  if (px <= -107) id = 'portaria';
  else if (px > 93) id = 'porto';
  else if (px <= -84 && pz < -5.5) id = 'sede';
  else if (px > -107 && px <= -84 && pz > 5.5) id = 'milho';
  else if (px > -84 && px <= -60 && (pz > 4.5 || Math.abs(pz) > 12)) id = 'canavial';
  else if (px > -60 && px <= -36 && pz < -4.5) id = 'colheita';
  else if (px > -36 && px <= -12 && pz > 4.5) id = 'oficina';
  else if (px > -12 && px <= 12 && pz < -4.5) id = 'balanca';
  else if (px > 12 && px <= 40 && pz > 4.5) id = 'industria';
  else if (px > 40 && px <= 66 && pz < -4.5) id = 'armazem';
  else if (px > 66 && px <= 82 && pz > 4.5) id = 'controladoria';
  else if (px > 82 && px <= 93 && pz > 4.5) id = 'erp';
  else if (Math.abs(pz) > 14 && px > -84 && px < 12) id = 'canavial';

  const base = AUDIO_BIOMES[id] || AUDIO_BIOMES.estrada;
  const piso = id === 'estrada' ? (px < -10 ? 'terra' : 'asfalto') : base.piso;
  return { ...base, piso, ato: ato || 1 };
}

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.volume = 0.9;
    this.stepTimer = 0;
    this.musica = true;
    try { this.musica = localStorage.getItem(CHAVE_MUSICA) !== '0'; } catch {}
    this.iniciado = false;
    this.ato = 1;
    this.fimAnterior = false;
    this.ksCache = new Map();
    this.nosAvulsos = 0;
    this._coleta = null;
    this._pe = false;
    this._buf = null;
    this.zonas = PARADAS.map(p => ({
      id: p.id, nome: p.lugar, x: p.x, z: p.nz, nodes: [], montada: false,
      bus: null, pan: null, ev: null, ganhoAlvo: 0, construtor: CONSTRUTORES[p.id]
    }));
    this.ativas = [];
    this.campo = null;
    this.musicaProx = 0;
    this.musicaPasso = 0;
    this.variacao = 0;
    this.bioma = resolveBiome(-119, 0.6, 1);
    this._candBiomaId = this.bioma.id;
    this._candBiomaMs = 0;
    this.transicoes = [];
    this._onBiomeChange = null;
    window.__SAFRA_AUDIO__ = {
      estado: () => this.estado(),
      fontesAtivas: () => this.fontesAtivas(),
      setMusica: on => this.setMusica(on),
      biomaAtual: () => ({ ...this.bioma }),
      perfilAcustico: () => this.perfilAcustico(),
      resolveBiome: (px, pz, ato) => resolveBiome(px, pz, ato),
      historicoTransicoes: () => this.transicoes.slice(),
      nivel: () => this.medir('rms'),
      pico: () => this.medir('pico')
    };
    window.__SAFRA_SOUND_ENGINE__ = this;
  }

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = (this.ctx = new AC());
      // Cadeia: master -> limitador -> analisador -> saída
      this.master = c.createGain();
      this.master.gain.value = this.enabled ? this.volume * GANHO_MESTRE : 0;
      const limitador = c.createDynamicsCompressor();
      limitador.threshold.value = -12;
      limitador.knee.value = 6;
      limitador.ratio.value = 12;
      limitador.attack.value = 0.003;
      limitador.release.value = 0.25;
      this.analisador = c.createAnalyser();
      this.analisador.fftSize = 2048;
      this.master.connect(limitador).connect(this.analisador).connect(c.destination);

      // Barramentos: ambiente com filtro de oclusão adaptativo (interior/exterior), música (voz -> ducking -> liga) e efeitos
      this.busAmbiente = c.createGain();
      this.envFilter = c.createBiquadFilter();
      this.envFilter.type = 'lowpass';
      this.envFilter.frequency.value = this.bioma ? this.bioma.lpfHz : 18000;
      this.envFilter.Q.value = 0.55;
      this.busAmbiente.connect(this.envFilter).connect(this.master);

      this.busVozes = c.createGain();
      this.busVozes.gain.value = 0.5;
      this.busDuck = c.createGain();
      this.busLiga = c.createGain();
      this.busLiga.gain.value = this.musica ? 1 : 0;
      this.busVozes.connect(this.busDuck).connect(this.busLiga).connect(this.master);
      this.busSfx = c.createGain();
      this.busSfx.gain.value = 0.6;
      this.busSfx.connect(this.master);

      // Ruído branco de 2 s reutilizado por todas as fontes de ruído
      this.ruidoBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = this.ruidoBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

      this.campoMontar();
      this.timer = setInterval(() => this.agenda(), 50);
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend().catch(() => {});
        else if (this.iniciado && this.enabled) this.ctx.resume().catch(() => {});
      });
    } catch (e) {
      console.warn('audio: init falhou', e);
      this.ctx = null;
    }
  }

  resume() {
    if (!this.ctx) this.init();
    this.iniciado = true;
    if (this.ctx && this.ctx.state === 'suspended' && !document.hidden) {
      this.ctx.resume().catch(() => {});
    }
  }

  setConfig(enabled, volume) {
    this.enabled = enabled;
    this.volume = volume;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(enabled ? volume * GANHO_MESTRE : 0, this.ctx.currentTime, 0.06);
    }
  }

  setMusica(on) {
    this.musica = !!on;
    if (this.ctx) this.busLiga.gain.setTargetAtTime(this.musica ? 1 : 0, this.ctx.currentTime, 0.08);
    try { localStorage.setItem(CHAVE_MUSICA, this.musica ? '1' : '0'); } catch {}
    return this.musica;
  }

  toggleMusica() {
    return this.setMusica(!this.musica);
  }

  onBiomeChange(cb) {
    this._onBiomeChange = typeof cb === 'function' ? cb : null;
  }

  atualizarBioma(px, pz, ato, dt = 0.016) {
    const resolvido = resolveBiome(px, pz, ato);
    if (resolvido.id !== this.bioma.id) {
      if (this._candBiomaId === resolvido.id) {
        this._candBiomaMs += dt * 1000;
      } else {
        this._candBiomaId = resolvido.id;
        this._candBiomaMs = dt * 1000;
      }
      // Histerese curta (~220 ms) ou troca imediata quando dt alto (teleporte)
      if (this._candBiomaMs >= 220 || dt > 0.08) {
        const anterior = this.bioma.id;
        this.bioma = resolvido;
        this.transicoes.push({ de: anterior, para: resolvido.id, nome: resolvido.nome, interior: resolvido.interior, ato });
        if (this.transicoes.length > 24) this.transicoes.shift();
        if (this._onBiomeChange) {
          try { this._onBiomeChange(this.bioma); } catch {}
        }
      }
    } else {
      this._candBiomaId = resolvido.id;
      this._candBiomaMs = 0;
      this.bioma.piso = resolvido.piso;
      this.bioma.ato = resolvido.ato;
    }
    return this.bioma;
  }

  // ---------- Ponto de ligação por frame (main.js) ----------
  // cena: { yaw, ato, on, duck, fim } vindos do jogo
  updateSpatial(playerX, playerZ, moving, running, dt, cena) {
    const c = cena || {};
    this.ato = c.ato || 1;
    this.atualizarBioma(playerX, playerZ, this.ato, dt || 0.016);

    if (this.ctx && this.enabled) this.espacial(playerX, playerZ, c);

    // Passos adaptados ao tipo de piso do bioma atual (terra, asfalto, concreto, metal, madeira)
    if (moving) {
      this.stepTimer -= dt * (running ? 1.55 : 1.0);
      if (this.stepTimer <= 0) {
        this.stepTimer = 0.44;
        this.playStep(this.bioma.piso);
      }
    } else {
      this.stepTimer = 0.08;
    }
  }

  espacial(px, pz, cena) {
    const c = this.ctx, t = c.currentTime;
    const yaw = cena.yaw || 0;
    this.ato = cena.ato || 1;
    const ligado = cena.on !== false;
    const bio = this.bioma || resolveBiome(px, pz, this.ato);

    // Oclusão acústica suave entre zonas abertas (18 kHz), galpões semiabertos (~2,3 kHz) e escritórios/moenda (~1,1-1,4 kHz)
    if (this.envFilter) {
      const lpfAlvo = bio.lpfHz || 18000;
      this.envFilter.frequency.setTargetAtTime(lpfAlvo, t, 0.45);
    }

    // Ducking: música abaixa em diálogo e mais ainda na ligação final; peso do bioma suaviza a trilha dentro de escritórios/moenda
    const pesoBio = bio.musicaPeso != null ? bio.musicaPeso : 1;
    const duck = (cena.fim && cena.duck ? 0.2 : cena.duck ? 0.35 : 1) * pesoBio;
    this.busDuck.gain.setTargetAtTime(duck, t, 0.35);
    if (cena.fim && !this.fimAnterior) this.toqueLigacao();
    this.fimAnterior = !!cena.fim;

    // Camadas contínuas do campo moduladas pelo bioma atual
    if (this.campo) {
      this.campo.out.gain.setTargetAtTime(ligado ? 1 : 0, t, 0.55);
      if (this.campo.ventoGain) this.campo.ventoGain.gain.setTargetAtTime(ligado ? 0.048 * bio.vento : 0, t, 0.5);
      if (this.campo.canaGain) this.campo.canaGain.gain.setTargetAtTime(ligado ? 0.022 * bio.cana : 0, t, 0.5);
    }

    // As FONTES_MAX zonas mais próximas, dentro de DIST_MAX
    const ord = [];
    if (ligado) {
      for (const z of this.zonas) {
        const ox = z.x - px, oz = z.z - pz, d = Math.hypot(ox, oz);
        if (d < DIST_MAX) ord.push({ z, d, ox, oz });
      }
      ord.sort((a, b) => a.d - b.d);
      ord.length = Math.min(ord.length, FONTES_MAX);
    }
    const escolhidas = new Set(ord.map(o => o.z));
    for (const z of this.zonas) if (z.montada && !escolhidas.has(z)) this.desmontar(z);
    for (const o of ord) if (!o.z.montada) this.montar(o.z);
    this.ativas = ord;

    // Panorama e ganho: eixo direito e frontal da câmera (WASD usa o mesmo yaw)
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    for (const o of ord) {
      const d = o.d || 1e-3;
      const ganho = Math.pow(Math.max(0, 1 - o.d / DIST_MAX), 1.5);
      const frente = (o.ox * fx + o.oz * fz) / d;             // -1 atrás, +1 na frente
      const costas = 0.6 + 0.4 * (frente + 1) / 2;            // atrás da câmera soa mais baixo
      const lado = (o.ox * rx + o.oz * rz) / d;                // -1 esquerda, +1 direita
      o.z.ganhoAlvo = ganho * costas;
      o.z.bus.gain.setTargetAtTime(o.z.ganhoAlvo, t, 0.2);
      o.z.pan.pan.setTargetAtTime(Math.max(-0.9, Math.min(0.9, lado * 0.9)), t, 0.2);
    }
  }

  montar(z) {
    const c = this.ctx;
    z.montada = true;
    z.nodes = [];
    this._coleta = z.nodes;
    z.bus = this.reg(c.createGain());
    z.bus.gain.value = 0;
    z.pan = this.reg(c.createStereoPanner());
    z.bus.connect(z.pan).connect(this.busAmbiente);
    const b = z.construtor ? z.construtor(this, z.bus) : null;
    this._coleta = null;
    z.ev = b && b.ev ? b.ev : null;
  }

  desmontar(z) {
    if (!z.montada) return;
    z.montada = false;
    z.ev = null;
    z.ganhoAlvo = 0;
    z.bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    const velhos = z.nodes;
    z.nodes = [];
    setTimeout(() => {
      for (const n of velhos) {
        try { if (n._de) n._de.disconnect(n); } catch {}
        try { if (n.stop && !n._parado) n.stop(); } catch {}
        try { n.disconnect(); } catch {}
      }
    }, 700);
  }

  // Agendador: roda a cada 50 ms e preenche os eventos até 0,3 s à frente
  agenda() {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    try {
      const h = c.currentTime + 0.3;
      for (const z of this.zonas) if (z.montada && z.ev) z.ev(z, h);
      if (this.campo) this.campoEv(h);
      this.musicaAgenda(h);
    } catch (e) {
      if (!this._errou) { this._errou = true; console.warn('audio:', e); }
    }
  }

  // ---------- Construtores de nós (registram para descarte) ----------
  reg(n) {
    if (this._coleta) this._coleta.push(n);
    return n;
  }

  conta(src) {
    this.nosAvulsos++;
    src.onended = () => { this.nosAvulsos--; };
  }

  cad(obj, k, h, min, max, fn) {
    const t = this.ctx.currentTime;
    if (obj[k] === undefined || obj[k] < t) obj[k] = t + 0.05;
    while (obj[k] < h) {
      fn(obj[k]);
      obj[k] += min + Math.random() * (max - min);
    }
  }

  ruido(tipo, freq, q, dest, ganho = 1) {
    const c = this.ctx;
    const s = this.reg(c.createBufferSource());
    s.buffer = this.ruidoBuf;
    s.loop = true;
    const f = this.reg(c.createBiquadFilter());
    f.type = tipo; f.frequency.value = freq; f.Q.value = q;
    const g = this.reg(c.createGain());
    g.gain.value = ganho;
    s.connect(f).connect(g).connect(dest);
    s.start(0, Math.random() * 1.5);
    return g;
  }

  osc(tipo, freq, dest, ganho = 1) {
    const c = this.ctx;
    const o = this.reg(c.createOscillator());
    o.type = tipo; o.frequency.value = freq;
    const g = this.reg(c.createGain());
    g.gain.value = ganho;
    o.connect(g).connect(dest);
    o.start();
    return g;
  }

  // LFO ligado a um parâmetro (AM ou vibrato lento)
  lfo(param, freq, amp, tipo = 'sine') {
    const c = this.ctx;
    const o = this.reg(c.createOscillator());
    o.type = tipo; o.frequency.value = freq;
    const g = this.reg(c.createGain());
    g.gain.value = amp;
    o.connect(g).connect(param);
    o.start();
  }

  // Motor: dente de serra grave filtrado, com pulsação de cilindros
  motor(freq, pulso, ganho, dest, corte = 170) {
    const c = this.ctx;
    const o = this.reg(c.createOscillator());
    o.type = 'sawtooth'; o.frequency.value = freq;
    const f = this.reg(c.createBiquadFilter());
    f.type = 'lowpass'; f.frequency.value = corte;
    const g = this.reg(c.createGain());
    g.gain.value = ganho;
    o.connect(f).connect(g).connect(dest);
    o.start();
    if (pulso) this.lfo(g.gain, pulso, ganho * 0.5, 'triangle');
    return g;
  }

  // Rádio: a trilha passa por um passa-banda estreito ("rádio de pilha" ou AM)
  radio(dest, ganho, freq, q) {
    const c = this.ctx;
    const f = this.reg(c.createBiquadFilter());
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    f._de = this.busDuck;
    this.busDuck.connect(f);
    const g = this.reg(c.createGain());
    g.gain.value = ganho;
    f.connect(g).connect(dest);
    return g;
  }

  // ---------- Sons curtos (disparos, sem nó persistente) ----------
  clique(dest, t, freq, dur, ganho, tipo = 'bandpass', q = 1) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.ruidoBuf;
    const f = c.createBiquadFilter();
    f.type = tipo; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(ganho, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, Math.random() * 1.4, dur + 0.02);
    this.conta(s);
  }

  impacto(dest, t, freq, dur, ganho) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * 0.45), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(ganho, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
    this.conta(o);
  }

  bip(dest, t, freq, dur, ganho, tipo = 'sine') {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = tipo; o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(ganho, t + 0.005);
    g.gain.setValueAtTime(ganho, t + Math.max(0.01, dur - 0.02));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
    this.conta(o);
  }

  // Varredura de frequência (gaivota, rangido de guindaste)
  varre(dest, t, f0, f1, dur, ganho, tipo) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = tipo;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f1, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(ganho, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
    this.conta(o);
  }

  // Sino com parciais inarmônicas (martelo em metal, campainha de senha, plim)
  sino(dest, t, freq, dur, ganho) {
    [[1, 1], [2.76, 0.35], [5.4, 0.18]].forEach(([r, a]) => {
      this.impacto(dest, t, freq * r, dur, ganho * a);
    });
  }

  // Toque de telefone: dois pares de trinados de 0,35 s
  toque(dest, t, ganho) {
    for (const dt of [0, 0.5]) {
      for (const fr of [440, 480]) {
        const c = this.ctx, o = c.createOscillator(), g = c.createGain();
        o.frequency.value = fr;
        g.gain.setValueAtTime(0.0001, t + dt);
        g.gain.linearRampToValueAtTime(ganho, t + dt + 0.02);
        g.gain.setValueAtTime(ganho, t + dt + 0.33);
        g.gain.linearRampToValueAtTime(0.0001, t + dt + 0.35);
        o.connect(g).connect(dest);
        o.start(t + dt); o.stop(t + dt + 0.37);
        this.conta(o);
      }
    }
  }

  // Buzina grave de navio ao longe
  buzina(dest, t) {
    const c = this.ctx;
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.5);
    g.gain.setValueAtTime(0.05, t + 2.0);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    f.connect(g).connect(dest);
    for (const fr of [58, 87.5]) {
      const o = c.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = fr;
      o.connect(f);
      o.start(t); o.stop(t + 2.7);
      this.conta(o);
    }
  }

  // ---------- Base de campo: vento contínuo, farfalhar de canavial, pássaros de manhã, cigarras e grilos ----------
  campoMontar() {
    const c = this.ctx;
    this._coleta = [];
    const out = this.reg(c.createGain());
    out.gain.value = 1;
    out.connect(this.busAmbiente);

    // Vento aberto filtrado + farfalhar de palha de cana (modulados pelo bioma)
    const ventoGain = this.ruido('bandpass', 380, 0.5, out, 0.048);
    this.lfo(ventoGain.gain, 0.09, 0.024, 'sine');
    const canaGain = this.ruido('bandpass', 2400, 0.7, out, 0.018);
    this.lfo(canaGain.gain, 0.22, 0.009, 'sine');

    // Grilos ao entardecer (Ato 2/3)
    const grilo = this.reg(c.createGain());
    grilo.gain.value = 0;
    grilo.connect(out);
    const tom = this.reg(c.createOscillator());
    tom.type = 'sine'; tom.frequency.value = 4300;
    const gAM = this.reg(c.createGain());
    gAM.gain.value = 0.25;
    tom.connect(gAM).connect(grilo);
    tom.start();
    this.lfo(gAM.gain, 16, 0.25, 'triangle');

    // Cigarras tropicais (Ato 2 e 3 ao ar livre)
    const cigarra = this.reg(c.createGain());
    cigarra.gain.value = 0;
    cigarra.connect(out);
    const tomCig = this.reg(c.createOscillator());
    tomCig.type = 'triangle'; tomCig.frequency.value = 5780;
    const cigAM = this.reg(c.createGain());
    cigAM.gain.value = 0.22;
    tomCig.connect(cigAM).connect(cigarra);
    tomCig.start();
    this.lfo(cigAM.gain, 0.18, 0.16, 'sine');

    this.campo = { out, ventoGain, canaGain, grilo, cigarra, nodes: this._coleta, nx: undefined };
    this._coleta = null;
  }

  campoEv(h) {
    const c = this.ctx, t = c.currentTime;
    const camp = this.campo;
    const bio = this.bioma || AUDIO_BIOMES.estrada;
    const griloBase = this.ato === 3 ? 0.035 : this.ato === 2 ? 0.01 : 0;
    camp.grilo.gain.setTargetAtTime(griloBase * (bio.interior ? 0.25 : 1), t, 0.8);
    if (camp.cigarra) {
      const cigBase = this.ato >= 2 ? 0.018 : 0.004;
      camp.cigarra.gain.setTargetAtTime(cigBase * (bio.cigarras || 0.2), t, 0.9);
    }
    const taxaBase = this.ato === 1 ? 0.72 : this.ato === 2 ? 0.24 : 0.06;
    const taxa = taxaBase * (bio.passaros != null ? bio.passaros : 1);
    this.cad(camp, 'passaro', h, 0.6, 2.6, t0 => {
      if (Math.random() < taxa) this.passaro(t0);
    });
  }

  passaro(t0) {
    const c = this.ctx;
    const pan = this.reg(c.createStereoPanner());
    pan.pan.value = Math.random() * 1.6 - 0.8;
    pan.connect(this.campo.out);
    const n = 2 + Math.floor(Math.random() * 3);
    const base = 2600 + Math.random() * 2000;
    let t = t0;
    for (let i = 0; i < n; i++) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      const f0 = base * (0.85 + Math.random() * 0.3), f1 = f0 * (1.15 + Math.random() * 0.5);
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + 0.05);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.035, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(g).connect(pan);
      o.start(t); o.stop(t + 0.09);
      this.conta(o);
      t += 0.09 + Math.random() * 0.08;
    }
    setTimeout(() => { try { pan.disconnect(); } catch {} }, (t - t0 + 0.3) * 1000);
  }

  // ---------- Trilha: viola caipira (Karplus-Strong), baixo e chocalho ----------
  // Amostra de corda gerada uma vez por nota e guardada em cache
  ksBuffer(midi) {
    let b = this.ksCache.get(midi);
    if (b) return b;
    const c = this.ctx, sr = c.sampleRate;
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const N = Math.max(2, Math.round(sr / f)), L = Math.floor(sr * 1.5);
    b = c.createBuffer(1, L, sr);
    const d = b.getChannelData(0);
    for (let i = 0; i < N; i++) d[i] = Math.random() * 2 - 1;
    for (let i = 1; i < N; i++) d[i] = 0.5 * (d[i] + d[i - 1]); // ataque macio, sem chiado
    const g = 0.99992; // queda por amostra: a corda soa uns 1,5 s
    for (let i = N; i < L; i++) {
      const atras = i - N - 1 >= 0 ? d[i - N - 1] : 0;
      d[i] = g * 0.5 * (d[i - N] + atras);
    }
    let p = 0;
    for (let i = 0; i < L; i++) p = Math.max(p, Math.abs(d[i]));
    if (p > 0) for (let i = 0; i < L; i++) d[i] *= 0.9 / p;
    this.ksCache.set(midi, b);
    return b;
  }

  pluck(midi, ganho, t, dest) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.ksBuffer(midi);
    const g = c.createGain();
    g.gain.value = ganho;
    s.connect(g).connect(dest || this.busSfx);
    s.start(t);
    this.conta(s);
  }

  baixo(midi, t, ganho) {
    const c = this.ctx, f = 440 * Math.pow(2, (midi - 69) / 12);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(ganho, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    g.connect(this.busVozes);
    for (const [tipo, a] of [['sine', 1], ['triangle', 0.25]]) {
      const o = c.createOscillator(), ga = c.createGain();
      o.type = tipo; o.frequency.value = f;
      ga.gain.value = a;
      o.connect(ga).connect(g);
      o.start(t); o.stop(t + 0.95);
      this.conta(o);
    }
  }

  musicaAgenda(h) {
    const c = this.ctx, t = c.currentTime;
    if (this.musicaProx < t - 0.3) this.musicaProx = t + 0.05;
    while (this.musicaProx < h) {
      if (this.musica) this.musicaNota(this.musicaProx, this.musicaPasso);
      this.musicaProx += 60 / (BPM_ATO[this.ato] || 84) / 4;
      this.musicaPasso++;
    }
  }

  // Uma semicolcheia da trilha. Compasso = 16 passos; laço de 16 compassos.
  musicaNota(t, s) {
    const pos = s % 16, bar = Math.floor(s / 16) % 16;
    if (bar === 0 && pos === 0) this.variacao = Math.random(); // nova volta do laço: pequena variação
    const ac = ACORDES[PROGRESSAO[bar]];
    const r = ac.r, th = ac.m ? 3 : 4;
    const T = [r, r + th, r + 7, r + 12, r + 12 + th, r + 19];
    const ato = this.ato, bus = this.busVozes;
    const bio = this.bioma || AUDIO_BIOMES.estrada;
    const percPeso = bio.interior ? 0.55 : 1.0;

    // Viola: rasgueado no tempo 1 e arpejo nas colcheias (dia cheio) ou só nos tempos 1 e 3 (amanhecer)
    if (pos === 0 && (ato !== 1 || Math.random() < 0.8)) {
      [0, 1, 2, 3].forEach((k, i) => this.pluck(T[k] + (this.variacao > 0.85 ? 12 : 0), 0.2, t + i * 0.018, bus));
    } else if (pos % 2 === 0 && ato !== 1) {
      if (Math.random() > 0.12) this.pluck(T[PADRAO_VIOLA[pos / 2]], pos % 4 === 0 ? 0.18 : 0.13, t, bus);
    } else if (ato === 1 && pos === 8 && Math.random() < 0.7) {
      this.pluck(T[PADRAO_VIOLA[4]], 0.16, t, bus);
    }

    // Baixo: raiz nos tempos 1 e 3, quinta ou passagem de vez em quando
    const b = r - 12;
    if (pos === 0 && Math.random() < (ato === 1 ? 0.7 : 0.95)) this.baixo(b, t, 0.15);
    if (pos === 8 && ato !== 1) this.baixo(Math.random() < 0.5 ? b + 7 : b, t, 0.1);
    if (pos === 12 && ato === 2 && Math.random() < 0.25) this.baixo(b + (Math.random() < 0.5 ? 2 : 4), t, 0.07);

    // Chocalho e pandeiro suave: atenuados em escritórios/galpões fechados
    if (ato !== 1 && pos % 2 === 0 && Math.random() > 0.15) {
      this.clique(bus, t, 7000, 0.035, (pos % 4 === 2 ? 0.03 : 0.016) * percPeso, 'bandpass', 0.8);
    }
    if (ato !== 1 && (pos === 4 || pos === 12) && Math.random() < (ato === 2 ? 0.6 : 0.4) * percPeso) {
      this.clique(bus, t, 1200, 0.07, 0.035 * percPeso, 'bandpass', 3);
      this.impacto(bus, t, 230, 0.06, 0.018 * percPeso);
    }
  }

  // ---------- Medição e estado (teste) ----------
  medir(tipo) {
    if (!this.analisador) return 0;
    if (!this._buf) this._buf = new Float32Array(this.analisador.fftSize);
    this.analisador.getFloatTimeDomainData(this._buf);
    let soma = 0, pico = 0;
    for (const v of this._buf) {
      soma += v * v;
      const a = Math.abs(v);
      if (a > pico) pico = a;
    }
    return tipo === 'pico' ? pico : Math.sqrt(soma / this._buf.length);
  }

  contarNos() {
    let n = this.nosAvulsos;
    for (const z of this.zonas) if (z.montada) n += z.nodes.length;
    if (this.campo) n += this.campo.nodes.length;
    return n;
  }

  fontesAtivas() {
    return this.ativas.map(o => ({ zona: o.z.nome, dist: Math.round(o.d), ganho: +o.z.ganhoAlvo.toFixed(3) }));
  }

  perfilAcustico() {
    const bio = this.bioma || AUDIO_BIOMES.estrada;
    return {
      ...bio,
      lpfAtual: this.envFilter ? Math.round(this.envFilter.frequency.value) : bio.lpfHz,
      zonasAtivas: this.fontesAtivas(),
      transicoes: this.transicoes.length
    };
  }

  estado() {
    return {
      contexto: this.ctx ? this.ctx.state : 'sem contexto',
      musica: this.musica,
      ato: this.ato,
      bpm: BPM_ATO[this.ato] || 84,
      bioma: this.bioma ? this.bioma.id : 'estrada',
      biomaNome: this.bioma ? this.bioma.nome : 'Estrada',
      interior: !!(this.bioma && this.bioma.interior),
      piso: this.bioma ? this.bioma.piso : 'terra',
      ducking: this.busDuck ? +this.busDuck.gain.value.toFixed(2) : null,
      ligacao: this.fimAnterior,
      fontes: this.ativas.length,
      nos: this.contarNos()
    };
  }

  // ---------- Sons de interação (chamados pelo jogo) ----------
  playStep(piso = 'terra') {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this._pe = !this._pe; // pé direito e esquerdo com timbres ligeiramente diferentes
    const s = piso === true ? 'concreto' : piso === false ? 'terra' : piso;
    if (s === 'metal') {
      this.clique(this.busSfx, t, this._pe ? 2100 : 1850, 0.055, 0.028, 'bandpass', 2.4);
      this.impacto(this.busSfx, t, this._pe ? 185 : 162, 0.075, 0.022);
    } else if (s === 'madeira') {
      this.clique(this.busSfx, t, this._pe ? 780 : 690, 0.07, 0.032, 'bandpass', 1.4);
      this.impacto(this.busSfx, t, this._pe ? 132 : 114, 0.09, 0.03);
    } else if (s === 'concreto' || s === 'asfalto') {
      this.clique(this.busSfx, t, this._pe ? 1520 : 1320, 0.055, s === 'asfalto' ? 0.026 : 0.03, 'bandpass', 1.5);
    } else {
      // terra / cascalho do canavial
      this.clique(this.busSfx, t, this._pe ? 640 : 560, 0.09, 0.05, 'bandpass', 1.1);
      this.impacto(this.busSfx, t, this._pe ? 110 : 92, 0.08, 0.02);
    }
  }

  playTone(freq = 540, dur = 0.12, type = 'sine', gain = 0.08) {
    if (!this.ctx || !this.enabled) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g).connect(this.busSfx);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch {}
  }

  // Acerto: acorde maior curto (Lá, Dó sustenido, Mi) em cordas pinçadas
  playOk() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    [69, 73, 76].forEach((m, i) => this.pluck(m, 0.22, t + i * 0.035, this.busSfx));
  }

  // Erro: nota abafada, grave e curta
  playErr() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime, c = this.ctx;
    const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = 196;
    f.type = 'lowpass'; f.frequency.value = 380;
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(f).connect(g).connect(this.busSfx);
    o.start(t); o.stop(t + 0.32);
    this.conta(o);
  }

  // Evidência coletada: duas notas de viola
  playEvidencia() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.pluck(69, 0.26, t, this.busSfx);
    this.pluck(76, 0.26, t + 0.09, this.busSfx);
  }

  // Segredo encontrado: arpejo rápido
  playSegredo() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    [69, 73, 76, 81].forEach((m, i) => this.pluck(m, 0.2, t + i * 0.06, this.busSfx));
  }

  // Modal abrindo (sobe) ou fechando (desce)
  playModal(abrir = true) {
    if (!this.ctx || !this.enabled) return;
    this.varre(this.busSfx, this.ctx.currentTime, abrir ? 520 : 780, abrir ? 780 : 390, 0.09, 0.05, 'sine');
  }

  // Toque de telefone da ligação final: três sequências de toques
  toqueLigacao() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + 0.05;
    for (let k = 0; k < 3; k++) this.toque(this.busSfx, t + k * 2.0, 0.05);
  }

  pararVozSintetizada() {
    if (this._vozTimers) {
      for (const id of this._vozTimers) clearTimeout(id);
      this._vozTimers = [];
    }
    if (this._vozNodes) {
      for (const n of this._vozNodes) {
        try { if (n.stop) n.stop(); } catch {}
        try { n.disconnect(); } catch {}
      }
      this._vozNodes = [];
    }
    if (this._vozGain && this.ctx) {
      try {
        this._vozGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this._vozGain.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch {}
    }
  }

  getVoiceEnergy() {
    if (!this._vozAnalyser || !this._vozFreqBuf) return 0;
    try {
      this._vozAnalyser.getByteTimeDomainData(this._vozFreqBuf);
      let sum = 0;
      const buf = this._vozFreqBuf;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      return Math.max(0, Math.min(1, rms * 4.2));
    } catch {
      return 0;
    }
  }

  async _playAudioBufferWithAnalyser(ab, vol = 0.9, onEnd) {
    this.resume();
    if (!this.ctx || !this.enabled) return false;
    const audioBuf = await this.ctx.decodeAudioData(ab);
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    const src = this.ctx.createBufferSource();
    src.buffer = audioBuf;
    const g = this.ctx.createGain();
    g.gain.value = Math.max(0.15, Math.min(1.2, vol));
    let analyser = null;
    try {
      analyser = this.ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.55;
      this._vozAnalyser = analyser;
      this._vozFreqBuf = new Uint8Array(analyser.fftSize);
      src.connect(analyser);
      analyser.connect(g);
    } catch {
      src.connect(g);
    }
    g.connect(this.master || this.ctx.destination);
    this._vozNodes = analyser ? [src, analyser, g] : [src, g];
    this._vozGain = g;
    const durationMs = Math.max(250, Math.round(audioBuf.duration * 1000));
    src.onended = () => {
      this._vozNodes = [];
      this._vozAnalyser = null;
      if (onEnd) onEnd();
    };
    src.start();
    return { ok: true, durationMs };
  }

  async playWavBase64(base64, vol = 0.9, onEnd) {
    this.resume();
    if (!this.ctx || !this.enabled) return false;
    try {
      this.pararVozSintetizada();
      const bin = atob(base64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return await this._playAudioBufferWithAnalyser(u8.buffer.slice(0), vol, onEnd);
    } catch {
      return false;
    }
  }

  async playWavUrl(url, vol = 0.9, onEnd) {
    this.resume();
    if (!this.ctx || !this.enabled || !url) return false;
    try {
      this.pararVozSintetizada();
      const resp = await fetch(url);
      if (!resp.ok) return false;
      const ab = await resp.arrayBuffer();
      return await this._playAudioBufferWithAnalyser(ab, vol, onEnd);
    } catch {
      return false;
    }
  }

  // Sintetizador vocal glotal suave sincronizado com a linha do tempo fonética (último fallback offline)
  falarSintetizado(quem, texto, vol = 0.85, onEnd) {
    this.resume();
    this.pararVozSintetizada();
    if (!this.ctx || !this.enabled) {
      if (onEnd) onEnd();
      return false;
    }
    const c = this.ctx;
    if (c.state === 'suspended') c.resume().catch(() => {});
    const nome = String(quem || '').split(',')[0].trim();
    const PERFIS_F0 = {
      'Dr. Augusto': { f0: 102, rate: 0.95 },
      'Valdemar': { f0: 94, rate: 0.98 },
      'Helena': { f0: 218, rate: 1.04 },
      'Caio': { f0: 138, rate: 1.06 },
      'Marta': { f0: 205, rate: 1.05 },
      'Seu Tião': { f0: 104, rate: 0.92 },
      'Rui': { f0: 146, rate: 1.08 },
      'Sílvia': { f0: 228, rate: 1.02 },
      'Jonas': { f0: 116, rate: 1.0 },
      'Paula': { f0: 212, rate: 1.04 },
      'Rodrigo': { f0: 134, rate: 1.05 },
      'André': { f0: 122, rate: 1.01 },
      'Você': { f0: 128, rate: 1.04 }
    };
    const pf = PERFIS_F0[nome] || { f0: 135, rate: 1.02 };
    const FORMANTS = {
      a: [730, 1180], e: [480, 1950], i: [310, 2350], o: [460, 880], u: [330, 760]
    };
    const norm = String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const tokens = norm.match(/[aeiou]+|[,.!?;:—–-]/g) || ['a', 'e', 'o'];
    // Cobre todo o diálogo (até 140 núcleos silábicos) para manter o tempo de fala 100% fiel ao texto
    const seq = tokens.slice(0, 140);

    const bus = c.createGain();
    bus.gain.value = Math.max(0.18, Math.min(1.0, vol)) * 0.42;
    bus.connect(this.master || c.destination);

    const osc = c.createOscillator();
    if (c.createPeriodicWave) {
      const real = new Float32Array(16);
      const imag = new Float32Array(16);
      for (let n = 1; n < 16; n++) imag[n] = 1 / Math.pow(n, 1.85);
      osc.setPeriodicWave(c.createPeriodicWave(real, imag));
    } else {
      osc.type = 'triangle';
    }
    const sub = c.createOscillator();
    sub.type = 'sine';
    const subG = c.createGain();
    subG.gain.value = 0.55;

    const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 4.2;
    const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 5.5;
    const f1G = c.createGain(); f1G.gain.value = 0.78;
    const f2G = c.createGain(); f2G.gain.value = 0.28;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2100;
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, c.currentTime);

    osc.connect(f1).connect(f1G).connect(lp);
    osc.connect(f2).connect(f2G).connect(lp);
    sub.connect(subG).connect(f1);
    lp.connect(env).connect(bus);

    let t = c.currentTime + 0.02;
    const baseDur = 0.112 / pf.rate;
    const totalSil = seq.filter(x => /[aeiou]/.test(x)).length || 1;
    let idx = 0;

    for (const tok of seq) {
      if (/^[,.!?;:—–-]$/.test(tok)) {
        t += tok === ',' ? 0.10 : 0.17;
        continue;
      }
      const v = tok[0];
      const [ff1, ff2] = FORMANTS[v] || FORMANTS.a;
      const frac = idx / totalSil;
      const ehPerg = norm.includes('?') && frac > 0.75;
      const contour = ehPerg ? (1 + (frac - 0.75) * 0.65) : (1.06 - frac * 0.16 + 0.05 * Math.sin(idx * 1.4));
      const f0 = pf.f0 * contour;
      const dur = baseDur * (0.85 + Math.min(2, tok.length) * 0.18);

      osc.frequency.setTargetAtTime(f0, t, 0.014);
      sub.frequency.setTargetAtTime(f0 * 0.5, t, 0.014);
      f1.frequency.setTargetAtTime(ff1, t, 0.016);
      f2.frequency.setTargetAtTime(ff2, t, 0.016);

      env.gain.setValueAtTime(0.0001, t);
      env.gain.linearRampToValueAtTime(0.95, t + 0.018);
      env.gain.setValueAtTime(0.8, t + dur * 0.68);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      t += dur + 0.028;
      idx++;
    }

    const totalMs = Math.max(320, Math.round((t - c.currentTime) * 1000) + 60);
    osc.start(c.currentTime);
    sub.start(c.currentTime);
    osc.stop(t + 0.04);
    sub.stop(t + 0.04);
    this._vozNodes = [osc, sub, subG, f1, f2, f1G, f2G, lp, env, bus];
    this._vozGain = env;
    this._vozTimers = [setTimeout(() => {
      this._vozNodes = [];
      if (onEnd) onEnd();
    }, totalMs)];
    return totalMs;
  }
}

// ============================================================================
// Biblioteca 3D de Conversão Texto-em-Fala (Web Speech API) e Sincronia Facial/Corporal
// ============================================================================
const SAFRA_SPEECH_PERFIS = {
  'Helena':      { genero: 'f', pitch: 1.08, rate: 1.03, f0: 218, gesto: 1.05, papel: 'Gerente Agrícola' },
  'Caio':        { genero: 'm', pitch: 0.98, rate: 1.05, f0: 138, gesto: 1.00, papel: 'Agrônomo de Precisão' },
  'Marta':       { genero: 'f', pitch: 1.04, rate: 1.06, f0: 205, gesto: 1.12, papel: 'Encarregada de Frente' },
  'Seu Tião':    { genero: 'm', pitch: 0.82, rate: 0.93, f0: 104, gesto: 0.88, papel: 'Encarregado da Oficina' },
  'Rui':         { genero: 'm', pitch: 1.00, rate: 1.08, f0: 146, gesto: 1.10, papel: 'Chefe da Balança' },
  'Sílvia':      { genero: 'f', pitch: 1.12, rate: 1.02, f0: 228, gesto: 0.96, papel: 'Supervisora Industrial' },
  'Jonas':       { genero: 'm', pitch: 0.88, rate: 1.00, f0: 116, gesto: 1.02, papel: 'Encarregado de Armazém' },
  'Paula':       { genero: 'f', pitch: 1.06, rate: 1.04, f0: 212, gesto: 0.98, papel: 'Controller' },
  'Rodrigo':     { genero: 'm', pitch: 0.94, rate: 1.05, f0: 134, gesto: 1.00, papel: 'Gerente de Operações/ERP' },
  'André':       { genero: 'm', pitch: 0.90, rate: 1.01, f0: 122, gesto: 0.95, papel: 'Diretor de Comercialização' },
  'Valdemar':    { genero: 'm', pitch: 0.80, rate: 0.96, f0: 94,  gesto: 1.15, papel: 'Gerente Operacional / Fiscal' },
  'Dr. Augusto': { genero: 'm', pitch: 0.82, rate: 0.94, f0: 102, gesto: 0.92, papel: 'Diretor de Operações' },
  'Você':        { genero: 'm', pitch: 0.98, rate: 1.04, f0: 128, gesto: 0.90, papel: 'Executivo Senior' }
};

function normalizarTextoParaFala(texto) {
  return String(texto || '')
    .replace(/^[“"'\s]+|[”"'\s]+$/g, '')
    .replace(/[“”"]/g, '')
    .replace(/\bR\$\s*(\d+)\s*\/?\s*ha\b/gi, '$1 reais por hectare')
    .replace(/\b(\d+)\s*t\/ha\b/gi, '$1 toneladas por hectare')
    .replace(/\bt\/ha\b/gi, 'toneladas por hectare')
    .replace(/\bR\$\/ha\b/gi, 'reais por hectare')
    .replace(/\bATR\b/g, 'A T R')
    .replace(/\bTCH\b/g, 'T C H')
    .replace(/\bCTT\b/g, 'C T T')
    .replace(/\bDDGS\b/g, 'D D G S')
    .replace(/\bOS\b/g, 'ordem de serviço')
    .replace(/\bERP\b/g, 'E R P')
    .trim();
}

// Gera linha do tempo fonética/silábica e de palavras para sincronizar mandíbula, lábios, cabeça, braços e legendas
function gerarTimelineFala(textoOriginal, rate = 1.0) {
  const limpo = String(textoOriginal || '').replace(/^[“"'\s]+|[”"'\s]+$/g, '').trim();
  const vel = Math.max(0.75, Math.min(1.45, Number(rate) || 1.0));
  const palavras = [];
  const silabas = [];
  if (!limpo) return { texto: '', durationMs: 0, palavras, silabas };

  const ABERTURA_VOGAL = { a: 0.96, e: 0.66, i: 0.34, o: 0.76, u: 0.40 };
  const SORRISO_VOGAL = { a: 0.08, e: 0.38, i: 0.52, o: -0.32, u: -0.44 };

  let tMs = 35;
  const baseSilMs = 132 / vel;
  const rePalavra = /\S+/g;
  let m;
  while ((m = rePalavra.exec(limpo)) !== null) {
    const raw = m[0];
    const charIndex = m.index;
    const norm = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const nucleos = norm.match(/[aeiou]+/g) || ['a'];
    const temAcento = /[áéíóúâêôãõ!]/i.test(raw);
    const ehPergunta = /\?/.test(raw);
    const enfasePalavra = (temAcento ? 0.85 : 0.45) + (ehPergunta ? 0.25 : 0);
    const tInicioPalavra = tMs;

    for (let k = 0; k < nucleos.length; k++) {
      const nuc = nucleos[k];
      const v = nuc[0] || 'a';
      const ehTonica = (nucleos.length === 1) || (k === Math.max(0, nucleos.length - 2));
      const dur = Math.round(baseSilMs * (ehTonica ? 1.12 : 0.88) * (nuc.length > 1 ? 1.14 : 1.0));
      const abertura = Math.min(1, (ABERTURA_VOGAL[v] ?? 0.65) * (ehTonica ? 1.06 : 0.88));
      const sorriso = SORRISO_VOGAL[v] ?? 0;
      silabas.push({
        t0: tMs,
        t1: tMs + dur,
        dur,
        vogal: v,
        abertura,
        sorriso,
        enfase: Math.min(1, enfasePalavra * (ehTonica ? 1.0 : 0.65)),
        charIndex,
        wordIndex: palavras.length
      });
      tMs += dur + 18;
    }

    // Pausa prosódica natural após pontuação
    let pausa = 24;
    if (/[,;:]/.test(raw)) pausa = Math.round(145 / vel);
    else if (/[.!?…—–]/.test(raw)) pausa = Math.round(240 / vel);

    palavras.push({
      palavra: raw,
      charIndex,
      charEnd: charIndex + raw.length,
      t0: tInicioPalavra,
      t1: tMs,
      enfase: Math.min(1, enfasePalavra)
    });
    tMs += pausa;
  }

  const durationMs = Math.max(420, Math.round(tMs + 60));
  return { texto: limpo, durationMs, palavras, silabas };
}

class SafraSpeechEngine {
  constructor() {
    this.active = false;
    this.speaker = '';
    this.text = '';
    this.seq = 0;
    this.startedAt = 0;
    this.durationMs = 0;
    this.timeline = null;
    this.charIndex = 0;
    this.wordPulse = 0;
    this.wordPulseAt = 0;
    this.timeOffsetMs = 0;
    this.mode = 'idle';
    this._vozesCache = [];
    this._watchdog = 0;
    this._endTimer = 0;
    this._utterance = null;
    this._onEndCallbacks = [];
    this._listeners = new Set();

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        const carregar = () => {
          const v = window.speechSynthesis.getVoices?.() || [];
          if (v.length) this._vozesCache = v;
        };
        carregar();
        if ('onvoiceschanged' in window.speechSynthesis) {
          window.speechSynthesis.onvoiceschanged = carregar;
        }
      } catch {}
    }
  }

  get playing() {
    return this.active;
  }

  getProfile(quem) {
    const nome = String(quem || 'Narrador').split(',')[0].trim();
    return {
      nome,
      ...(SAFRA_SPEECH_PERFIS[nome] || { genero: 'm', pitch: 1.0, rate: 1.03, f0: 135, gesto: 1.0, papel: 'Equipe Usina' })
    };
  }

  getVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return this._vozesCache;
    try {
      const v = window.speechSynthesis.getVoices?.() || [];
      if (v.length) this._vozesCache = v;
    } catch {}
    return this._vozesCache;
  }

  selectVoice(genero = 'm') {
    const vozes = this.getVoices();
    if (!vozes || !vozes.length) return { voice: null, ptCount: 0, totalCount: 0 };
    const ptVozes = vozes.filter(v => /pt[-_]?BR/i.test(v.lang) || /^pt\b/i.test(v.lang) || /portugu|brasil|brazil|francisca|antonio|thalita|luciana|daniel|maria/i.test(v.name));
    const pool = ptVozes.length ? ptVozes : vozes;
    const fem = genero === 'f';
    const regexPref = fem
      ? /francisca|thalita|maria|luciana|vit[oó]ria|fernanda|camila|female|femin|woman|girl|google portugu/i
      : /antonio|daniel|felipe|carlos|ricardo|male|masc|man/i;
    const escolhida = pool.find(v => regexPref.test(v.name)) || pool[0] || null;
    return { voice: escolhida, ptCount: ptVozes.length, totalCount: vozes.length };
  }

  onChange(fn) {
    if (typeof fn === 'function') this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _emit(evt) {
    this._listeners.forEach(fn => {
      try { fn(evt, this); } catch {}
    });
  }

  stop() {
    this.seq++;
    clearTimeout(this._watchdog);
    clearTimeout(this._endTimer);
    this._watchdog = 0;
    this._endTimer = 0;
    this.active = false;
    this.wordPulse = 0;
    this._utterance = null;

    if (typeof window !== 'undefined') {
      if (window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
      if (window.__SAFRA_SOUND_ENGINE__) {
        try { window.__SAFRA_SOUND_ENGINE__.pararVozSintetizada(); } catch {}
      }
      if (window.__SAFRA_VOZ_STATUS__) {
        window.__SAFRA_VOZ_STATUS__.playing = false;
      }
    }
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('voz-tocando');
    }
    const cbs = this._onEndCallbacks.splice(0);
    cbs.forEach(cb => { try { cb({ cancelled: true }); } catch {} });
    this._emit({ type: 'stop', speaker: this.speaker });
  }

  _finish(seq, source = 'timeline') {
    if (seq !== this.seq) return;
    clearTimeout(this._watchdog);
    clearTimeout(this._endTimer);
    this._watchdog = 0;
    this._endTimer = 0;
    this.active = false;
    this.charIndex = this.text.length;
    this.wordPulse = 0;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('voz-tocando');
    }
    if (typeof window !== 'undefined' && window.__SAFRA_VOZ_STATUS__) {
      window.__SAFRA_VOZ_STATUS__.playing = false;
      window.__SAFRA_VOZ_STATUS__.finishedBy = source;
    }
    const cbs = this._onEndCallbacks.splice(0);
    cbs.forEach(cb => { try { cb({ cancelled: false, source }); } catch {} });
    this._emit({ type: 'end', speaker: this.speaker, source });
  }

  // Inicia fala dinâmica via Web Speech API sincronizada com a linha do tempo 3D
  speak(quem, texto, opts = {}) {
    this.stop();
    const meuSeq = this.seq;
    const pf = this.getProfile(quem);
    const limpo = String(texto || '').replace(/^[“"'\s]+|[”"'\s]+$/g, '').trim();
    const textoPronuncia = normalizarTextoParaFala(limpo);

    if (!limpo) {
      return {
        seq: meuSeq,
        speaker: pf.nome,
        durationMs: 0,
        promise: Promise.resolve({ cancelled: false }),
        getProgress: () => 1,
        getCharIndex: () => 0
      };
    }

    const timeline = gerarTimelineFala(limpo, pf.rate);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.active = true;
    this.speaker = pf.nome;
    this.text = limpo;
    this.startedAt = now;
    this.durationMs = opts.durationOverrideMs || timeline.durationMs;
    this.timeline = timeline;
    this.charIndex = 0;
    this.wordPulse = 1.0;
    this.wordPulseAt = now;
    this.timeOffsetMs = 0;
    this.mode = opts.externalAudio ? 'external-audio' : 'webspeech';

    const promise = new Promise(resolve => {
      this._onEndCallbacks.push(resolve);
    });

    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.add('voz-tocando');
    }

    const vol = Math.max(0.2, Math.min(1, Number(opts.volume ?? 0.85)));
    const se = typeof window !== 'undefined' ? window.__SAFRA_SOUND_ENGINE__ : null;

    // Timer mestre de segurança sincronizado com a duração fonética
    const agendarFimTimeline = (durMs, tag = 'timeline') => {
      clearTimeout(this._endTimer);
      this._endTimer = setTimeout(() => {
        this._finish(meuSeq, tag);
      }, Math.max(260, durMs));
    };

    agendarFimTimeline(this.durationMs + 90, 'timeline');

    // Quando o áudio externo (ex.: buffer WAV pré-gerado) é usado, mantém a timeline 3D ativa
    if (opts.externalAudio) {
      this._emit({ type: 'start', speaker: pf.nome, durationMs: this.durationMs, mode: 'external-audio' });
      return {
        seq: meuSeq,
        speaker: pf.nome,
        durationMs: this.durationMs,
        timeline,
        promise,
        finish: () => this._finish(meuSeq, 'external-audio'),
        getProgress: () => this.getProgress(),
        getCharIndex: () => this.getActiveCharIndex()
      };
    }

    const acionarFormanteSincronizado = (motivo = 'webspeech-fallback') => {
      if (meuSeq !== this.seq) return;
      clearTimeout(this._watchdog);
      this.mode = 'webaudio-formant';
      let durFormante = this.durationMs;
      if (se && se.falarSintetizado) {
        const res = se.falarSintetizado(pf.nome, limpo, vol, () => {
          this._finish(meuSeq, 'webaudio-formant');
        });
        if (typeof res === 'number' && res > 200) {
          durFormante = res;
          this.durationMs = res;
        }
      }
      agendarFimTimeline(durFormante + 80, 'webaudio-formant');
      if (typeof window !== 'undefined') {
        window.__SAFRA_VOZ_STATUS__ = {
          mode: 'webaudio-formant',
          speaker: pf.nome,
          seq: meuSeq,
          textLen: limpo.length,
          durationMs: this.durationMs,
          startedAt: Date.now(),
          ok: true,
          playing: true,
          ttsFallbackReason: motivo
        };
      }
      this._emit({ type: 'start', speaker: pf.nome, durationMs: this.durationMs, mode: 'webaudio-formant' });
    };

    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      acionarFormanteSincronizado('webspeech-missing');
      return {
        seq: meuSeq,
        speaker: pf.nome,
        durationMs: this.durationMs,
        timeline,
        promise,
        finish: () => this._finish(meuSeq, 'manual'),
        getProgress: () => this.getProgress(),
        getCharIndex: () => this.getActiveCharIndex()
      };
    }

    try {
      if (synth.paused) {
        try { synth.resume(); } catch {}
      }
      const { voice, ptCount, totalCount } = this.selectVoice(pf.genero);
      const u = new SpeechSynthesisUtterance(textoPronuncia || limpo);
      u.lang = (voice && voice.lang) ? voice.lang : 'pt-BR';
      u.pitch = pf.pitch;
      u.rate = pf.rate;
      u.volume = vol;
      if (voice) u.voice = voice;
      this._utterance = u;

      let iniciou = false;
      let startRealMs = 0;

      if (typeof window !== 'undefined') {
        window.__SAFRA_VOZ_STATUS__ = {
          mode: 'webspeech-pending',
          speaker: pf.nome,
          seq: meuSeq,
          textLen: limpo.length,
          durationMs: this.durationMs,
          startedAt: Date.now(),
          ptVoicesCount: ptCount,
          totalVoicesCount: totalCount,
          voiceName: voice ? voice.name : 'default-pt-BR',
          ok: true,
          playing: true
        };
      }

      // Se a engine nativa do SO não disparar onstart em até 220ms, ativa síntese formante mantendo a mesma animação
      this._watchdog = setTimeout(() => {
        if (!iniciou && meuSeq === this.seq) {
          acionarFormanteSincronizado('watchdog-timeout');
        }
      }, 220);

      u.onstart = () => {
        if (meuSeq !== this.seq) return;
        iniciou = true;
        startRealMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
        this.startedAt = startRealMs;
        clearTimeout(this._watchdog);
        this.mode = 'webspeech';
        if (typeof document !== 'undefined' && document.body) {
          document.body.classList.add('voz-tocando');
        }
        if (typeof window !== 'undefined' && window.__SAFRA_VOZ_STATUS__) {
          window.__SAFRA_VOZ_STATUS__.mode = 'webspeech';
          window.__SAFRA_VOZ_STATUS__.ok = true;
          window.__SAFRA_VOZ_STATUS__.playing = true;
        }
        this._emit({ type: 'start', speaker: pf.nome, durationMs: this.durationMs, mode: 'webspeech' });
      };

      u.onboundary = ev => {
        if (meuSeq !== this.seq) return;
        iniciou = true;
        clearTimeout(this._watchdog);
        const tAgora = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const cIdx = typeof ev.charIndex === 'number' ? ev.charIndex : this.charIndex;
        this.charIndex = Math.max(0, Math.min(limpo.length, cIdx));
        this.wordPulse = 1.0;
        this.wordPulseAt = tAgora;

        // Ressincroniza o relógio fonético com a palavra exata que o sintetizador Web Speech está pronunciando
        if (this.timeline && this.timeline.palavras.length) {
          const pal = this.timeline.palavras.find(p => cIdx >= p.charIndex && cIdx <= p.charEnd) ||
                      this.timeline.palavras.find(p => p.charIndex >= cIdx);
          if (pal) {
            const decorrido = tAgora - this.startedAt;
            this.timeOffsetMs = pal.t0 - decorrido;
            const restante = Math.max(320, this.timeline.durationMs - pal.t0);
            agendarFimTimeline(restante + 180, 'webspeech-boundary');
          }
        }
        this._emit({ type: 'boundary', speaker: pf.nome, charIndex: this.charIndex });
      };

      u.onend = () => {
        clearTimeout(this._watchdog);
        if (meuSeq !== this.seq) return;
        const tAgora = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const decorrido = startRealMs ? (tAgora - startRealMs) : 0;
        // Se o navegador encerrou instantaneamente (< 28% da duração fonética, comum em áudio headless sem placa de som),
        // aciona o sintetizador Web Audio pelo tempo restante para não cortar a animação do personagem 3D
        if (decorrido < Math.min(350, this.timeline.durationMs * 0.28)) {
          acionarFormanteSincronizado('webspeech-instant-end');
          return;
        }
        this._finish(meuSeq, 'webspeech-onend');
      };

      u.onerror = () => {
        clearTimeout(this._watchdog);
        if (meuSeq === this.seq && !iniciou) {
          acionarFormanteSincronizado('webspeech-error');
        }
      };

      synth.speak(u);
    } catch {
      acionarFormanteSincronizado('webspeech-exception');
    }

    return {
      seq: meuSeq,
      speaker: pf.nome,
      durationMs: this.durationMs,
      timeline,
      promise,
      finish: () => this._finish(meuSeq, 'manual'),
      getProgress: () => this.getProgress(),
      getCharIndex: () => this.getActiveCharIndex()
    };
  }

  getElapsedMs(nowMs) {
    if (!this.active) return this.durationMs;
    const t = nowMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    return Math.max(0, (t - this.startedAt) + this.timeOffsetMs);
  }

  getProgress(nowMs) {
    if (!this.active || !this.durationMs) return 1;
    return Math.max(0, Math.min(1, this.getElapsedMs(nowMs) / this.durationMs));
  }

  getActiveCharIndex(nowMs) {
    if (!this.active || !this.timeline) return this.text.length;
    const el = this.getElapsedMs(nowMs);
    const pals = this.timeline.palavras;
    for (let i = pals.length - 1; i >= 0; i--) {
      if (el >= pals[i].t0) {
        const frac = Math.max(0, Math.min(1, (el - pals[i].t0) / Math.max(1, pals[i].t1 - pals[i].t0)));
        return Math.min(this.text.length, Math.max(this.charIndex, Math.round(pals[i].charIndex + (pals[i].charEnd - pals[i].charIndex) * frac)));
      }
    }
    return this.charIndex;
  }

  // Estado quadro a quadro (60 FPS) para animar mandíbula, lábios, sobrancelhas, cabeça, tronco e gestos de mãos do avatar 3D
  getAnimationState(quem, nowMs) {
    const t = nowMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const nome = String(quem || '').split(',')[0].trim();
    const isSpeaker = this.active && (!nome || !this.speaker || this.speaker === nome || (this.speaker === 'Você' && false));

    if (!this.active || !this.timeline || !isSpeaker) {
      return {
        speaking: false,
        jawOpen: 0,
        lipSpread: 0,
        emphasis: 0,
        wordPulse: 0,
        headNod: 0,
        headTilt: 0,
        gestureL: 0,
        gestureR: 0,
        progress: 1
      };
    }

    const elapsed = this.getElapsedMs(t);
    const sils = this.timeline.silabas;
    let jawOpen = 0;
    let lipSpread = 0;
    let emphasis = 0.25;

    // Localiza a sílaba ativa na linha do tempo fonética
    for (let i = 0; i < sils.length; i++) {
      const s = sils[i];
      if (elapsed >= s.t0 && elapsed <= s.t1) {
        const u = (elapsed - s.t0) / Math.max(1, s.dur);
        // Curva de articulação labial suave: abre rápido no ataque vocálico e fecha na transição consonantal
        const env = Math.sin(Math.PI * Math.pow(u, 0.78));
        jawOpen = s.abertura * env;
        lipSpread = s.sorriso * env;
        emphasis = s.enfase;
        break;
      } else if (i < sils.length - 1 && elapsed > s.t1 && elapsed < sils[i + 1].t0) {
        // Coarticulação entre sílabas vizinhas (evita fechar 100% em vogais seguidas na mesma palavra)
        const next = sils[i + 1];
        const gap = next.t0 - s.t1;
        if (gap < 35) {
          jawOpen = Math.min(s.abertura, next.abertura) * 0.28;
          lipSpread = (s.sorriso + next.sorriso) * 0.2;
        }
        emphasis = (s.enfase + next.enfase) * 0.4;
        break;
      }
    }

    // Se um buffer WAV neural está tocando no Web Audio, combina a energia RMS real da voz com a abertura vocálica
    const se = typeof window !== 'undefined' ? window.__SAFRA_SOUND_ENGINE__ : null;
    const realEnergy = (se && se.getVoiceEnergy) ? se.getVoiceEnergy() : 0;
    if (realEnergy > 0.02) {
      jawOpen = jawOpen * 0.42 + realEnergy * 0.78;
      emphasis = Math.max(emphasis, realEnergy * 0.85);
    }

    const pf = this.getProfile(nome);
    const pulseAge = Math.max(0, (t - this.wordPulseAt) * 0.001);
    const wordPulse = Math.max(realEnergy * 0.9, Math.exp(-pulseAge * 4.5)) * (pf.gesto || 1.0);
    const sec = elapsed * 0.001;
    const headNod = (jawOpen * 0.55 + emphasis * 0.45) * Math.sin(sec * 7.2) + wordPulse * 0.35;
    const headTilt = Math.sin(sec * 2.4) * (0.35 + emphasis * 0.45);
    const gestureL = (0.45 + 0.55 * Math.sin(sec * 3.6 + 0.4)) * (0.5 + 0.5 * wordPulse) * (pf.gesto || 1.0);
    const gestureR = (0.45 + 0.55 * Math.sin(sec * 3.1 + 1.9)) * (0.5 + 0.5 * wordPulse) * (pf.gesto || 1.0);

    return {
      speaking: true,
      jawOpen: Math.max(0, Math.min(1, jawOpen)),
      lipSpread: Math.max(-0.6, Math.min(0.6, lipSpread)),
      emphasis: Math.max(0, Math.min(1, emphasis)),
      wordPulse: Math.max(0, Math.min(1.2, wordPulse)),
      headNod,
      headTilt,
      gestureL,
      gestureR,
      progress: this.getProgress(t)
    };
  }

  setDurationMs(durMs) {
    if (!this.active || !durMs || durMs < 200) return;
    const ratio = durMs / Math.max(1, this.durationMs);
    this.durationMs = durMs;
    if (this.timeline && Math.abs(ratio - 1) > 0.05) {
      this.timeline.durationMs = durMs;
      this.timeline.silabas.forEach(s => { s.t0 *= ratio; s.t1 *= ratio; s.dur *= ratio; });
      this.timeline.palavras.forEach(p => { p.t0 *= ratio; p.t1 *= ratio; });
    }
    clearTimeout(this._endTimer);
    const seq = this.seq;
    const rest = Math.max(250, durMs - this.getElapsedMs());
    this._endTimer = setTimeout(() => this._finish(seq, 'audio-duration'), rest + 80);
  }
}

if (typeof window !== 'undefined') {
  window.__SAFRA_SPEECH__ = window.__SAFRA_SPEECH__ || new SafraSpeechEngine();
}

