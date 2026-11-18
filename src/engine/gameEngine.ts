import * as THREE from 'three/webgpu';
import {
  CHAIN_AVISO_MSG,
  CHAIN_RADIO_MSG,
  EVIDENCIAS,
  FRENTES_CATALOGO,
  PARADAS,
  RADIO,
  SINAIS,
  evidenciasDaParada,
  type EvidenciaSpec,
  type ParadaSpec,
  type SinalSpec,
} from '../game/data';
import {
  buildReportCopyText,
  computeCompetencias,
  createInitialGameState,
  effectiveQuality,
  findNearestInteractableParada,
  maxPossiblePoints,
  resetRunState,
  scoreForAttempt,
  type ChainState,
  type ConcreteQuality,
  type GameState,
  type QualityPreset,
} from '../game/rules';
import { CollisionWorld, groundHeightAt } from '../game/worldMath';
import { SoundEngine } from '../audio/soundEngine';
import {
  buildQualityBudget,
  probeHardwareCapability,
  type HardwareCapability,
  type QualityBudget,
} from './quality';
import { TextureLibrary } from './textures';
import { MaterialBank } from './materials';
import { SkyAndLighting } from './skyAndLighting';
import { TerrainSystem } from './terrain';
import { VegetationSystem } from './vegetation';
import {
  buildCampoStopsAndProps,
  type CampoWorldHandles,
  type EvidenciaRuntime,
} from './worldStops1to4';
import { buildIndustryAndPortStops5to10, type IndustryPortHandles } from './worldStops5to10';
import { PostPipelineManager } from './pipeline';

export interface PerfSnapshot {
  fps: number;
  avgFrameMs: number;
  worstFrameMs: number;
  draws: number;
  triangles: number;
  pixelRatio: number;
  backend: string;
  quality: ConcreteQuality;
  memoryMB: number | null;
}

export interface UIBridge {
  setLoading: (status: string, pct: number, done?: boolean) => void;
  syncHud: (state: GameState, evidCounts: { done: number; total: number }) => void;
  showNotice: (msg: string) => void;
  showRadio: (msg: string) => void;
  showLocalCard: (parada: ParadaSpec) => void;
  setInteractionPrompt: (
    visible: boolean,
    title: string,
    sub: string,
    btnText: string,
    ringProgress: number,
  ) => void;
  setModalHtml: (html: string | null, centered?: boolean, isTitle?: boolean) => void;
  setPauseOpen: (open: boolean, html?: string) => void;
  updatePerfOverlay: (perf: PerfSnapshot, visible: boolean) => void;
  flashScreen: (opacity: number) => void;
}

interface PlayerPose {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
  rota: [number, number][] | null;
  viraPara: [number, number] | null;
}

export class UmDiaEngine {
  public readonly state: GameState = createInitialGameState();
  public readonly chain: ChainState = { armado: false, visto: false };
  public readonly player: PlayerPose = {
    x: -108,
    z: 0,
    yaw: -Math.PI / 2,
    pitch: -0.03,
    rota: null,
    viraPara: null,
  };
  public perf: PerfSnapshot = {
    fps: 60,
    avgFrameMs: 16.6,
    worstFrameMs: 16.6,
    draws: 0,
    triangles: 0,
    pixelRatio: 1,
    backend: 'WebGPU',
    quality: 'media',
    memoryMB: null,
  };

  private readonly canvas: HTMLCanvasElement;
  private readonly compassCanvas: HTMLCanvasElement;
  private readonly ui: UIBridge;
  private readonly sound = new SoundEngine();
  private readonly collisions = new CollisionWorld();

  private renderer!: THREE.WebGPURenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private cap!: HardwareCapability;
  private budget!: QualityBudget;
  private skyLight!: SkyAndLighting;
  private materials!: MaterialBank;
  private vegetation!: VegetationSystem;
  private campo!: CampoWorldHandles;
  private indPorto!: IndustryPortHandles;
  private pipeline!: PostPipelineManager;

  // Waypoint beacon + 3D handheld tablet
  private beaconBeam!: THREE.Mesh;
  private beaconRing!: THREE.Mesh;
  private beaconPin!: THREE.Mesh;
  private beaconSprite!: THREE.Sprite;
  private beaconCanvas!: HTMLCanvasElement;
  private beaconDistCache = -1;
  private tabletGroup!: THREE.Group;
  private tabletCanvas!: HTMLCanvasElement;
  private tabletTex!: THREE.CanvasTexture;

  private keys: Record<string, boolean> = {};
  private joyVec = { x: 0, y: 0 };
  private holdingE = false;
  private holdProgress = 0;
  private lookTarget: [number, number, number] | null = null;
  private lastLocalStop: ParadaSpec | null = null;
  private pointerLocked = false;
  private dragLook: { id: number; x: number; y: number } | null = null;

  private rafId = 0;
  private lastTime = performance.now();
  private elapsed = 0;
  private dayT = 0;
  private harvesterX = -48;
  private frameCounter = 0;
  private walkBob = 0;
  private walkBlend = 0;
  private stepTimer = 0;
  private frameTimesMs: number[] = [];
  private disposed = false;
  private paceTimer = 0;
  private renderPaused = false;

  constructor(
    canvas: HTMLCanvasElement,
    compassCanvas: HTMLCanvasElement,
    ui: UIBridge,
  ) {
    this.canvas = canvas;
    this.compassCanvas = compassCanvas;
    this.ui = ui;
  }

  public async init(initialQualityOverride?: ConcreteQuality): Promise<void> {
    this.ui.setLoading('Detectando capacidade gráfica…', 15);
    this.cap = await probeHardwareCapability();
    if (this.disposed) return;

    if (initialQualityOverride) {
      this.state.cfg.qualAuto = false;
      this.state.cfg.qual = initialQualityOverride;
    } else {
      this.state.cfg.qualAuto = true;
      this.state.cfg.qual = this.cap.detectedQuality;
    }
    this.state.cfg.detN = this.cap.detectedQuality;
    this.state.cfg.det = this.cap.reason;

    this.budget = buildQualityBudget(effectiveQuality(this.state.cfg), this.cap);

    this.ui.setLoading('Iniciando motor 3D…', 28);
    await this.initRenderer(this.budget);
    if (this.disposed) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      this.state.cfg.fov,
      Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight),
      0.1,
      2200,
    );
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    this.ui.setLoading('Carregando texturas PBR CC0…', 45);
    const texLib = await TextureLibrary.loadAll();
    if (this.disposed) return;
    this.materials = new MaterialBank(texLib);

    this.ui.setLoading('Construindo céu e relevo do Mato Grosso…', 62);
    this.skyLight = new SkyAndLighting(this.scene);
    this.skyLight.initRendererHooks(this.renderer, this.budget);
    new TerrainSystem(this.scene, this.materials);

    this.ui.setLoading('Plantando canavial e cerrado…', 76);
    this.vegetation = new VegetationSystem(this.scene, texLib, this.materials, this.collisions);

    this.ui.setLoading('Ergendo usina, frota e porto…', 88);
    this.campo = buildCampoStopsAndProps(this.scene, texLib, this.materials, this.collisions);
    this.indPorto = buildIndustryAndPortStops5to10(
      this.scene,
      texLib,
      this.materials,
      this.collisions,
    );

    this.buildWaypointBeacon();
    this.buildHandheldTablet();

    this.pipeline = new PostPipelineManager(
      this.renderer,
      this.scene,
      this.camera,
      this.skyLight.sunLight,
    );
    this.pipeline.configure(this.budget);

    this.bindInputListeners();
    this.handleResize(false);
    this.applyQuality(false);
    this.skyLight.updateTimeOfDay(0, this.player.x, this.player.z, this.scene);
    this.vegetation.updateLOD(this.player.x, this.player.z, this.budget);
    this.camera.position.set(-62 + Math.cos(0.6) * 30, 5.8, -4 + Math.sin(0.6) * 13);
    this.camera.lookAt(-48, 2.8, -26);
    this.pipeline.render();
    this.skyLight.updateFrustums();
    const infoRender = this.renderer.info.render as unknown as {
      drawCalls?: number;
      calls: number;
      triangles: number;
    };
    this.perf.draws = infoRender.drawCalls ?? infoRender.calls;
    this.perf.triangles = Math.round(infoRender.triangles);
    this.exposeDebugGlobal();
    this.showTitleModal();

    this.ui.setLoading('Primeira luz…', 100, true);
    this.lastTime = performance.now();
    this.scheduleNextFrame();
  }

  private async initRenderer(budget: QualityBudget): Promise<void> {
    const tryCreate = async (forceWebGL: boolean) => {
      const r = new THREE.WebGPURenderer({
        canvas: this.canvas,
        antialias: true,
        forceWebGL,
      });
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 0.68;
      r.shadowMap.enabled = budget.enableShadows;
      await r.init();
      return r;
    };

    if (budget.useWebGPU) {
      try {
        this.renderer = await tryCreate(false);
      } catch {
        this.renderer = await tryCreate(true);
      }
    } else {
      this.renderer = await tryCreate(true);
    }

    if (this.disposed) {
      this.renderer.dispose();
      return;
    }

    const isWebGPU = Boolean(
      (this.renderer as unknown as { backend?: { isWebGPUBackend?: boolean } }).backend
        ?.isWebGPUBackend,
    );
    this.perf.backend = isWebGPU ? 'WebGPU' : 'WebGL2';
  }

  private buildWaypointBeacon(): void {
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffc93c,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.beaconBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 1.35, 60, 12, 1, true), beamMat);
    this.beaconBeam.visible = false;
    this.scene.add(this.beaconBeam);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffc93c,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    this.beaconRing = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.32, 28), ringMat);
    this.beaconRing.rotation.x = -Math.PI / 2;
    this.beaconRing.visible = false;
    this.scene.add(this.beaconRing);

    this.beaconPin = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.45, 0),
      new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.92, depthTest: false }),
    );
    this.beaconPin.visible = false;
    this.scene.add(this.beaconPin);

    this.beaconCanvas = document.createElement('canvas');
    this.beaconCanvas.width = 256;
    this.beaconCanvas.height = 64;
    const tex = new THREE.CanvasTexture(this.beaconCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.beaconSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
    );
    this.beaconSprite.scale.set(2.8, 0.72, 1);
    this.beaconSprite.visible = false;
    this.scene.add(this.beaconSprite);
  }

  private buildHandheldTablet(): void {
    this.tabletGroup = new THREE.Group();
    const caseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.19, 0.014),
      this.materials.get('aco', { color: 0x101c1e, dust: 0 }),
    );
    this.tabletGroup.add(caseMesh);

    this.tabletCanvas = document.createElement('canvas');
    this.tabletCanvas.width = 256;
    this.tabletCanvas.height = 176;
    this.tabletTex = new THREE.CanvasTexture(this.tabletCanvas);
    this.tabletTex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.255, 0.17),
      new THREE.MeshBasicMaterial({ map: this.tabletTex }),
    );
    screen.position.z = 0.008;
    this.tabletGroup.add(screen);

    this.tabletGroup.position.set(0.36, -0.27, -0.5);
    this.tabletGroup.rotation.set(-0.22, -0.36, 0.03);
    this.tabletGroup.visible = false;
    this.camera.add(this.tabletGroup);
  }

  private refreshTabletCanvas(): void {
    const ctx = this.tabletCanvas.getContext('2d')!;
    ctx.fillStyle = '#0e2a2e';
    ctx.fillRect(0, 0, 256, 176);
    ctx.fillStyle = '#00968c';
    ctx.fillRect(0, 0, 256, 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 12px Archivo, Arial Narrow, sans-serif';
    ctx.fillText('MOBILIDADE DE CAMPO', 10, 16);

    const stop = PARADAS[this.state.i];
    ctx.fillStyle = '#ffc93c';
    ctx.font = '700 10px Inter, sans-serif';
    ctx.fillText(this.state.fim ? 'DIA COMPLETO' : 'PRÓXIMA PARADA', 10, 40);

    ctx.fillStyle = '#f3f6ee';
    ctx.font = '800 15px Archivo, Arial Narrow, sans-serif';
    ctx.fillText(stop ? stop.lugar : 'Porto — fim do dia', 10, 58, 236);

    const dist = stop ? Math.round(Math.hypot(stop.x - this.player.x, stop.nz - this.player.z)) : 0;
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(243,246,238,0.78)';
    ctx.fillText(stop ? `${dist} m · ${stop.quem}` : 'entrega do relatório', 10, 74, 236);

    const doneCount = Object.keys(this.state.feitas).length;
    ctx.fillStyle = '#00b3a4';
    ctx.font = '700 10px Inter, sans-serif';
    ctx.fillText(`RASTRO DA CARGA 41 (${doneCount}/10)`, 10, 93);

    const labels = [
      '05:30 Sede · Plano',
      '07:00 Talhão 12 · Drone',
      '08:30 Frente · Colheita',
      '10:00 Oficina · Frota',
      '11:30 Balança · Contrato',
      '13:00 Indústria · Moenda',
      '14:30 Armazém · Pátio',
      '16:00 Controladoria',
      '16:45 Gestão ERP',
      '17:30 Porto · Navio',
    ];
    const startIdx = Math.max(0, Math.min(labels.length - 5, this.state.i - 1));
    ctx.font = '500 10.5px Inter, sans-serif';
    for (let row = 0; row < 5; row++) {
      const idx = startIdx + row;
      const done = Boolean(this.state.feitas[PARADAS[idx].id]);
      const isNow = idx === this.state.i && !this.state.fim;
      ctx.fillStyle = done ? '#7ee0d2' : isNow ? '#ffc93c' : 'rgba(243,246,238,0.62)';
      ctx.fillText((done ? '✓ ' : isNow ? '▸ ' : '· ') + labels[idx], 12, 110 + row * 13, 234);
    }
    this.tabletTex.needsUpdate = true;
  }

  public showTitleModal(): void {
    const q = this.state.cfg.qualAuto ? 'auto' : this.state.cfg.qual;
    const som = this.state.cfg.som ? '1' : '0';
    const esc = escapeHtml;
    const html = `<div class="t-eyebrow">Senior Sistemas · Enablement comercial · Agro</div>
<h1 class="t-word">Um Dia<br>de Safra</h1>
<p class="t-prem">Passe um dia na operação da Usina Horizonte, do planejamento à exportação. São dez paradas. Em cada uma você observa a cena, faz a pergunta certa e conecta a dor à frente da plataforma GAtec.</p>
<div class="t-form">
 <label class="campo" for="nome">Seu nome<input id="nome" value="${esc(this.state.nome)}" maxlength="40" autocomplete="off"></label>
 <label class="campo">Qualidade gráfica<div class="seg" id="segQual"><button data-q="auto"${q === 'auto' ? ' class="on"' : ''}>Auto</button><button data-q="alta"${q === 'alta' ? ' class="on"' : ''}>Alta</button><button data-q="media"${q === 'media' ? ' class="on"' : ''}>Média</button><button data-q="baixa"${q === 'baixa' ? ' class="on"' : ''}>Baixa</button></div></label>
 <label class="campo">Som<div class="seg" id="segSom"><button data-s="1"${som === '1' ? ' class="on"' : ''}>Ligado</button><button data-s="0"${som === '0' ? ' class="on"' : ''}>Mudo</button></div></label>
</div>
<div class="linha-b"><button class="bt bt-a" id="entrar">Jogar o dia</button><button class="bt bt-s" id="demo">Apresentar o dia</button></div>
<p class="nota" style="margin-top:18px">Clique na cena para olhar com o mouse. WASD anda, Shift corre, E interage, G leva até a parada, M abre a plataforma, P pausa. No celular, use o joystick e arraste para olhar.</p>
<p class="nota">A Usina Horizonte e as pessoas são fictícias. As dez paradas do campo ao porto rodam com motor WebGPU/TSL e texturas PBR CC0.</p>`;

    this.ui.setModalHtml(html, false, true);

    requestAnimationFrame(() => {
      document.querySelectorAll('#segQual button').forEach((btn) => {
        (btn as HTMLButtonElement).onclick = () => {
          const val = (btn as HTMLElement).dataset.q as QualityPreset;
          this.setQualityPreset(val);
          document.querySelectorAll('#segQual button').forEach((b) =>
            b.classList.toggle('on', b === btn),
          );
        };
      });
      document.querySelectorAll('#segSom button').forEach((btn) => {
        (btn as HTMLButtonElement).onclick = () => {
          this.state.cfg.som = (btn as HTMLElement).dataset.s === '1';
          this.sound.setConfig(this.state.cfg.som, this.state.cfg.vol);
          document.querySelectorAll('#segSom button').forEach((b) =>
            b.classList.toggle('on', b === btn),
          );
        };
      });
      const ent = document.getElementById('entrar');
      const dem = document.getElementById('demo');
      if (ent) ent.onclick = () => this.startGame(false);
      if (dem) dem.onclick = () => this.startGame(true);
    });
  }

  public startGame(demo: boolean): void {
    const input = document.getElementById('nome') as HTMLInputElement | null;
    if (input) {
      this.state.nome = input.value.trim() || 'Consultor';
    }
    this.state.on = true;
    this.state.demo = demo;
    document.body.classList.add('jogo');
    this.sound.init();
    this.sound.setConfig(this.state.cfg.som, this.state.cfg.vol);
    this.applyQuality(true);
    this.closeModal();
    this.syncStateUI();
    this.refreshTabletCanvas();
    this.ui.showRadio(RADIO[0]);
    this.sound.playRadioSquelch();

    if (demo) {
      this.ui.showNotice(`Modo demonstração · bom dia, ${this.state.nome}. O dia anda sozinho.`);
      setTimeout(() => this.goToCurrentStop(), 650);
    } else {
      this.ui.showNotice(`Bom dia, ${this.state.nome}. A Helena espera você na Sede.`);
      this.canvas.focus();
    }
  }

  public setQualityPreset(preset: QualityPreset): void {
    if (preset === 'auto') {
      this.state.cfg.qualAuto = true;
    } else {
      this.state.cfg.qualAuto = false;
      this.state.cfg.qual = preset;
    }
    this.applyQuality(true);
  }

  public applyQuality(reconfigurePipeline: boolean): void {
    const q = effectiveQuality(this.state.cfg);
    this.budget = buildQualityBudget(q, this.cap);
    this.perf.quality = q;

    const dpr = Math.min(window.devicePixelRatio || 1, this.budget.maxPixelRatio);
    this.renderer.setPixelRatio(dpr);
    this.perf.pixelRatio = dpr;
    this.handleResize(false);

    this.skyLight.applyQuality(this.budget);
    this.campo.dustMotes.mesh.count = this.budget.dustParticleCount;
    this.campo.lamps.forEach((l) => {
      if (l.pointLight) l.pointLight.visible = this.budget.enableSecondaryLights;
    });

    if (reconfigurePipeline && this.pipeline) {
      this.pipeline.configure(this.budget);
    }
  }

  public goToCurrentStop(): void {
    const stop = PARADAS[this.state.i];
    if (!stop || this.state.fim) return;
    this.player.rota = [
      [this.player.x, 0],
      [stop.x, 0],
      [stop.x, stop.sz],
    ];
    this.player.viraPara = [stop.x + 1.6, stop.nz];
  }

  public openCurrentConversation(): void {
    if (!this.state.on || this.isModalOpen() || this.player.rota) return;
    const stop = findNearestInteractableParada(this.player.x, this.player.z, this.state.i);
    if (!stop) return;
    if (this.state.demo) this.openDemoSheet(stop);
    else this.openPlaySheet(stop);
    this.updateWaypoint();
    if (this.renderPaused) this.pipeline?.render();
  }

  public openPlatformModal(): void {
    if (!this.state.on) return;
    if (this.isModalOpen()) {
      this.closeModal();
      return;
    }
    const discovered = FRENTES_CATALOGO.filter((c) =>
      c.sources.some((src) =>
        src.type === 'parada' ? Boolean(this.state.feitas[src.id]) : Boolean(this.state.sinais[src.id]),
      ),
    ).length;

    const html =
      `<div class="olho">Plataforma integrada de gestão agroindustrial</div>` +
      `<h2>O que você já viu funcionando</h2>` +
      `<p class="nota">Cada parada e cada sinal dourado abre uma frente. ${discovered} de ${FRENTES_CATALOGO.length} descobertas.</p>` +
      `<div class="grade">` +
      FRENTES_CATALOGO.map((c) => {
        const unlocked = c.sources.some((src) =>
          src.type === 'parada' ? Boolean(this.state.feitas[src.id]) : Boolean(this.state.sinais[src.id]),
        );
        return renderFrenteCard(c.f, !unlocked);
      }).join('') +
      `</div><div class="linha-b"><button class="bt bt-a" id="seguir">Voltar à operação</button></div>`;

    this.ui.setModalHtml(html, true, false);
    this.bindSingleButton('seguir', () => this.closeModal());
  }

  public togglePauseModal(): void {
    if (!this.state.on) return;
    const pauseEl = document.getElementById('pausaVeu');
    if (pauseEl && !pauseEl.hidden) {
      this.ui.setPauseOpen(false);
      this.canvas.focus();
      return;
    }
    const q = this.state.cfg.qualAuto ? 'auto' : this.state.cfg.qual;
    const html = `<div class="olho">Pausa · ajustes</div><h2>Um Dia de Safra</h2>
<div class="ajuste"><span>Sensibilidade do olhar</span><input id="rSens" type="range" min="0.4" max="2" step="0.1" value="${this.state.cfg.sens}"></div>
<div class="ajuste"><span id="lblFov">Campo de visão (${this.state.cfg.fov}°)</span><input id="rFov" type="range" min="60" max="80" step="1" value="${this.state.cfg.fov}"></div>
<div class="ajuste"><span>Volume</span><input id="rVol" type="range" min="0" max="100" step="5" value="${Math.round(this.state.cfg.vol * 100)}"></div>
<div class="ajuste"><span>Inverter eixo Y</span><input id="cInv" type="checkbox" ${this.state.cfg.invY ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--verde)"></div>
<div class="ajuste"><span>Reduzir movimento</span><input id="cRed" type="checkbox" ${this.state.cfg.reduz ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--verde)"></div>
<label class="campo" style="margin-top:12px">Qualidade gráfica<div class="seg" id="segQualP"><button data-q="auto"${q === 'auto' ? ' class="on"' : ''}>Automática</button><button data-q="alta"${q === 'alta' ? ' class="on"' : ''}>Alta</button><button data-q="media"${q === 'media' ? ' class="on"' : ''}>Média</button><button data-q="baixa"${q === 'baixa' ? ' class="on"' : ''}>Baixa</button></div></label>
<div class="linha-b" style="margin-top:14px"><button class="bt bt-a" id="btVoltar">Continuar (Esc)</button><button class="bt bt-s" id="btMedir">Medição de desempenho</button><button class="bt bt-c" id="btRecomecar">Recomeçar o dia</button></div>
<p class="nota" style="margin-top:8px">Qualidade automática detectou: <b>${escapeHtml(this.state.cfg.det)}</b> (${this.perf.backend}). Bússola, marcador e legendas de rádio ficam sempre ligados, e “Ir até lá” continua disponível para quem não quer andar.</p>`;

    this.ui.setPauseOpen(true, html);
    requestAnimationFrame(() => {
      document.querySelectorAll('#segQualP button').forEach((btn) => {
        (btn as HTMLButtonElement).onclick = () => {
          this.setQualityPreset((btn as HTMLElement).dataset.q as QualityPreset);
          document.querySelectorAll('#segQualP button').forEach((b) =>
            b.classList.toggle('on', b === btn),
          );
        };
      });
      const rSens = document.getElementById('rSens') as HTMLInputElement | null;
      if (rSens) rSens.oninput = () => (this.state.cfg.sens = Number(rSens.value));
      const rFov = document.getElementById('rFov') as HTMLInputElement | null;
      if (rFov) {
        rFov.oninput = () => {
          this.state.cfg.fov = Number(rFov.value);
          const lbl = document.getElementById('lblFov');
          if (lbl) lbl.textContent = `Campo de visão (${this.state.cfg.fov}°)`;
        };
      }
      const rVol = document.getElementById('rVol') as HTMLInputElement | null;
      if (rVol) {
        rVol.oninput = () => {
          this.state.cfg.vol = Number(rVol.value) / 100;
          this.sound.setConfig(this.state.cfg.som, this.state.cfg.vol);
        };
      }
      const cInv = document.getElementById('cInv') as HTMLInputElement | null;
      if (cInv) cInv.onchange = () => (this.state.cfg.invY = cInv.checked);
      const cRed = document.getElementById('cRed') as HTMLInputElement | null;
      if (cRed) cRed.onchange = () => (this.state.cfg.reduz = cRed.checked);

      this.bindSingleButton('btVoltar', () => {
        this.ui.setPauseOpen(false);
        this.canvas.focus();
      });
      this.bindSingleButton('btMedir', () => {
        this.state.cfg.medir = !this.state.cfg.medir;
        this.ui.updatePerfOverlay(this.perf, this.state.cfg.medir);
      });
      this.bindSingleButton('btRecomecar', () => {
        this.ui.setPauseOpen(false);
        this.restartDay();
      });
    });
  }

  public restartDay(): void {
    resetRunState(this.state);
    this.campo.sinais.forEach((s) => {
      s.diamond.visible = true;
      s.ring.visible = true;
    });
    this.campo.evidencias.forEach((ev) => {
      (ev.marker.material as THREE.MeshBasicMaterial).color.setHex(0xffc93c);
      (ev.ring.material as THREE.MeshBasicMaterial).color.setHex(0xffc93c);
    });
    this.chain.armado = false;
    this.chain.visto = false;
    this.harvesterX = -48;
    this.beaconDistCache = -1;
    this.player.x = -108;
    this.player.z = 0;
    this.player.yaw = -Math.PI / 2;
    this.player.rota = null;
    this.closeModal();
    this.syncStateUI();
    this.refreshTabletCanvas();
    this.ui.showNotice('05:30 · Novo dia de safra');
    if (this.state.demo) {
      setTimeout(() => this.goToCurrentStop(), 600);
    }
  }

  public findObservedEvidence(): EvidenciaRuntime | null {
    const sinY = Math.sin(this.player.yaw);
    const cosY = Math.cos(this.player.yaw);
    const cosP = Math.cos(this.player.pitch);
    const sinP = Math.sin(this.player.pitch);
    const dirX = -sinY * cosP;
    const dirY = sinP;
    const dirZ = -cosY * cosP;

    let best: EvidenciaRuntime | null = null;
    let bestDot = 0.9;
    for (const ev of this.campo.evidencias) {
      if (this.state.evid[ev.spec.id]) continue;
      const dx = ev.spec.x - this.player.x;
      const dy = ev.spec.y - 1.75;
      const dz = ev.spec.z - this.player.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 5.5 || dist < 0.01) continue;
      const dot = (dx * dirX + dy * dirY + dz * dirZ) / dist;
      if (dot > bestDot) {
        bestDot = dot;
        best = ev;
      }
    }
    return best;
  }

  public markEvidence(spec: EvidenciaSpec): void {
    if (this.state.evid[spec.id]) return;
    this.state.evid[spec.id] = 1;
    this.state.pontos += 1;
    if (spec.id === 'ev-auto1') {
      this.chain.armado = false;
    }
    const rt = this.campo.evidencias.find((e) => e.spec.id === spec.id);
    if (rt) {
      (rt.marker.material as THREE.MeshBasicMaterial).color.setHex(0x00968c);
      (rt.ring.material as THREE.MeshBasicMaterial).color.setHex(0x00968c);
    }
    this.sound.playTone(1100);
    setTimeout(() => this.sound.playTone(1460, 0.3), 120);
    this.ui.flashScreen(0.4);
    setTimeout(() => this.ui.flashScreen(0), 220);
    this.ui.showNotice(`Evidência registrada: ${spec.n}`);
    this.refreshTabletCanvas();
    this.syncStateUI();
  }

  private openPlaySheet(stop: ParadaSpec): void {
    this.lookTarget = [stop.x + 1.6, 1.6, stop.nz];
    const alreadyDone = Boolean(this.state.feitas[stop.id]);
    const header = `<div class="olho">${escapeHtml(stop.hora)} · ${escapeHtml(stop.lugar)} · ${escapeHtml(stop.quem)}</div>`;

    // Step 1 (Perguntar) if applicable
    if (!alreadyDone && stop.pergs && this.state.perg[stop.id] == null) {
      const html =
        header +
        `<h2>${escapeHtml(stop.quem.split(',')[0])} espera a sua pergunta</h2>` +
        `<div class="cena">“${escapeHtml(stop.cena)}”</div>` +
        `<p class="nota">Gesto 1 — perguntar. A pergunta certa abre a conversa; a promessa sem base toma rebatida.</p>` +
        stop.pergs
          .map((q, i) => `<button class="op" data-q="${i}"><b>${escapeHtml(q[0])}</b><span></span></button>`)
          .join('') +
        `<div id="resp"></div>`;

      this.ui.setModalHtml(html, false, false);
      requestAnimationFrame(() => {
        document.querySelectorAll('#folha .op').forEach((btn) => {
          (btn as HTMLButtonElement).onclick = () => {
            const idx = Number((btn as HTMLElement).dataset.q);
            const item = stop.pergs![idx];
            if (item[1]) {
              const pts = scoreForAttempt(this.state.tent);
              this.state.perg[stop.id] = pts;
              this.state.tent = 0;
              this.sound.playTone(820);
              btn.classList.add('sim');
              document
                .querySelectorAll('#folha .op')
                .forEach((b) => ((b as HTMLButtonElement).disabled = true));
              const resp = document.getElementById('resp');
              if (resp) {
                resp.innerHTML = `<div class="cena"><b>Fato descoberto:</b> ${escapeHtml(item[2])}</div><div class="linha-b"><button class="bt bt-a" id="btCon">Agora, conectar a dor à frente</button></div>`;
              }
              this.bindSingleButton('btCon', () => this.openPlaySheet(stop));
              this.refreshTabletCanvas();
            } else {
              this.state.tent++;
              btn.classList.add('nao');
              (btn as HTMLButtonElement).disabled = true;
              const sp = btn.querySelector('span');
              if (sp) sp.textContent = item[2];
              this.sound.playTone(240);
            }
          };
        });
      });
      return;
    }

    // Step 2 (Conectar)
    let html =
      header +
      `<h2>${alreadyDone ? 'Você já passou por aqui' : `O que resolve o problema de ${escapeHtml(stop.quem.split(',')[0])}?`}</h2>` +
      `<div class="cena">“${escapeHtml(stop.cena)}”</div>`;

    if (alreadyDone) {
      html += this.renderClosureBlock(stop);
    } else {
      if (this.state.perg[stop.id] != null && stop.pergs) {
        const rightPerg = stop.pergs.find((q) => q[1] === 1);
        if (rightPerg) {
          html += `<p class="nota">Fato que a sua pergunta revelou: ${escapeHtml(rightPerg[2])}</p>`;
        }
      }
      html += `<p class="nota">Gesto 2 — conectar. Escolha a frente da plataforma que responde a essa situação.</p>`;
      html += stop.op
        .map((opt, i) => `<button class="op" data-i="${i}"><b>${escapeHtml(opt[0])}</b><span></span></button>`)
        .join('');
      html += `<div id="resp"></div>`;
    }

    this.ui.setModalHtml(html, false, false);
    if (alreadyDone) {
      this.bindSingleButton('seguir', () => this.closeModal());
      return;
    }

    requestAnimationFrame(() => {
      document.querySelectorAll('#folha .op').forEach((btn) => {
        (btn as HTMLButtonElement).onclick = () => {
          const idx = Number((btn as HTMLElement).dataset.i);
          const opt = stop.op[idx];
          if (opt[1]) {
            const pts = scoreForAttempt(this.state.tent);
            this.state.pontos += pts;
            this.state.feitas[stop.id] = { g: pts };
            this.state.tent = 0;
            if (stop.id === 'auto') {
              this.chain.armado = !this.state.evid['ev-auto1'];
            }
            const ptsEl = document.getElementById('pontos');
            if (ptsEl) {
              ptsEl.classList.remove('pulso');
              void ptsEl.offsetWidth;
              ptsEl.classList.add('pulso');
            }
            btn.classList.add('sim');
            document
              .querySelectorAll('#folha .op')
              .forEach((b) => ((b as HTMLButtonElement).disabled = true));
            this.sound.playTone(820);

            const resp = document.getElementById('resp');
            if (resp) {
              const label =
                pts === 2 ? 'Isso, de primeira. +2 pontos.' : pts === 1 ? 'Isso. +1 ponto.' : 'Isso.';
              resp.innerHTML = `<p style="margin-top:12px"><b>${label}</b></p>${this.renderClosureBlock(stop)}`;
            }
            this.bindSingleButton('seguir', () => {
              this.closeModal();
              this.advanceStop();
            });
            this.syncStateUI();
            this.refreshTabletCanvas();
          } else {
            this.state.tent++;
            btn.classList.add('nao');
            (btn as HTMLButtonElement).disabled = true;
            const sp = btn.querySelector('span');
            if (sp) sp.textContent = opt[2];
            this.sound.playTone(240);
          }
        };
      });
    });
  }

  private openDemoSheet(stop: ParadaSpec): void {
    this.lookTarget = [stop.x + 1.6, 1.6, stop.nz];
    const isNew = !this.state.feitas[stop.id];
    const html =
      `<div class="olho">${escapeHtml(stop.hora)} · ${escapeHtml(stop.lugar)} · ${escapeHtml(stop.quem)}</div>` +
      `<h2>${isNew ? 'Como a plataforma resolve isso' : 'Você já passou por aqui'}</h2>` +
      `<div class="cena">“${escapeHtml(stop.cena)}”</div>` +
      stop.frentes.map((f) => renderFrenteCard(f, false)).join('') +
      `<div class="levar"><small>Pergunta para levar ao cliente</small>${escapeHtml(stop.levar)}</div>` +
      `<div class="linha-b"><button class="bt bt-a" id="seguir">${isNew ? 'Seguir o dia' : 'Voltar a explorar'}</button></div>`;

    if (isNew) {
      this.state.feitas[stop.id] = { g: null };
      this.syncStateUI();
      this.refreshTabletCanvas();
    }
    this.ui.setModalHtml(html, false, false);
    this.bindSingleButton('seguir', () => {
      this.closeModal();
      if (isNew) this.advanceStop();
    });
  }

  private renderClosureBlock(stop: ParadaSpec): string {
    const btnLabel =
      this.state.feitas[stop.id] && PARADAS[this.state.i]?.id === stop.id
        ? 'Seguir o dia'
        : 'Voltar a explorar';
    return (
      stop.frentes.map((f) => renderFrenteCard(f, false)).join('') +
      `<div class="levar"><small>Pergunta para levar ao cliente</small>${escapeHtml(stop.levar)}</div>` +
      `<div class="linha-b"><button class="bt bt-a" id="seguir">${btnLabel}</button></div>`
    );
  }

  private advanceStop(): void {
    this.state.i++;
    if (this.state.i >= PARADAS.length) {
      this.state.fim = true;
      this.syncStateUI();
      this.refreshTabletCanvas();
      setTimeout(() => this.openFinalReport(), 650);
      return;
    }
    this.syncStateUI();
    this.refreshTabletCanvas();
    if (this.state.demo) {
      setTimeout(() => this.goToCurrentStop(), 650);
    }
    const next = PARADAS[this.state.i];
    this.ui.showNotice(`${next.hora} · Próxima parada: ${next.lugar}`);
    this.ui.showRadio(RADIO[this.state.i] || '');
    this.sound.playRadioSquelch();
  }

  public openFinalReport(): void {
    if (this.state.demo) {
      const frentesOn = FRENTES_CATALOGO.filter((c) =>
        c.sources.some((src) =>
          src.type === 'parada' ? Boolean(this.state.feitas[src.id]) : Boolean(this.state.sinais[src.id]),
        ),
      ).length;
      const html =
        `<div class="olho">18:30 · Fim do dia · ${escapeHtml(this.state.nome)}</div>` +
        `<h2>Dia completo apresentado</h2>` +
        `<p>Dez paradas do planejamento à exportação, com ${frentesOn} de ${FRENTES_CATALOGO.length} frentes da plataforma em operação.</p>` +
        `<h3>O dia, hora a hora</h3><table class="dia">` +
        PARADAS.map(
          (p) => `<tr><td>${p.hora}</td><td><b>${escapeHtml(p.lugar)}</b><br>${escapeHtml(p.feito)}</td></tr>`,
        ).join('') +
        `</table><h3>Perguntas para levar ao cliente</h3>` +
        PARADAS.map((p) => `<p class="nota"><b>${escapeHtml(p.lugar)}:</b> ${escapeHtml(p.levar)}</p>`).join('') +
        `<div class="linha-b"><button class="bt bt-a" id="cp">Copiar resumo</button><button class="bt bt-c" id="de">Apresentar de novo</button><button class="bt bt-c" id="ex">Continuar explorando</button></div><textarea id="copia" hidden readonly></textarea>`;

      this.ui.setModalHtml(html, true, false);
      this.sound.playCompletionChord();
      this.bindReportButtons();
      return;
    }

    const maxPts = maxPossiblePoints();
    const sinaisDone = Object.keys(this.state.sinais).length;
    const evidDone = Object.keys(this.state.evid).length;
    const comp = computeCompetencias(this.state);
    const verdict =
      this.state.pontos >= maxPts - 2
        ? 'Você liga cada dor à frente certa. Dá para conduzir a conversa de ponta a ponta.'
        : this.state.pontos >= maxPts / 2
          ? 'Boa base. Reveja as paradas em que a resposta não veio de primeira.'
          : 'Vale refazer o dia. O mapa da plataforma mostra onde cada frente entra.';

    const html =
      `<div class="olho">18:30 · Fim do dia · ${escapeHtml(this.state.nome)}</div>` +
      `<h2>${this.state.pontos} de ${maxPts} pontos · ${sinaisDone} de ${SINAIS.length} sinais · ${evidDone} de ${EVIDENCIAS.length} evidências</h2>` +
      `<p>${verdict}</p><h3>O dia, do planejamento à exportação</h3><table class="dia">` +
      PARADAS.map(
        (p) =>
          `<tr><td>${p.hora}</td><td><b>${escapeHtml(p.lugar)}</b><br><span class="nota">${escapeHtml(p.feito)}</span><br>${p.frentes.map((f) => `${escapeHtml(f.n)} (${escapeHtml(f.p)})`).join(' · ')}</td><td>${this.state.feitas[p.id]?.g ?? 0}/2</td></tr>`,
      ).join('') +
      `</table><h3>Notas por competência</h3>` +
      (
        [
          ['Observar', comp.obs],
          ['Perguntar', comp.perg],
          ['Conectar', comp.con],
        ] as const
      )
        .map(
          ([lbl, val]) =>
            `<div class="barra"><div class="lbl"><span>${lbl}</span><span>${val}%</span></div><div class="faixa"><i style="width:${Math.max(3, val)}%"></i></div></div>`,
        )
        .join('') +
      `<p class="nota" style="margin-top:8px">O relatório diz qual competência treinar: <b>${comp.pior}</b>.</p>` +
      (this.chain.armado || this.chain.visto
        ? `<p class="nota">Efeito em cadeia: a preventiva ignorada na Oficina parou a colhedora na Frente de colheita${this.chain.visto ? ' — você viu ao voltar lá' : ''}. Quem cuida da frota no dia, colhe no dia.</p>`
        : '') +
      `<h3>Perguntas para levar ao cliente</h3>` +
      PARADAS.map((p) => `<p class="nota"><b>${escapeHtml(p.lugar)}:</b> ${escapeHtml(p.levar)}</p>`).join('') +
      `<div class="linha-b"><button class="bt bt-a" id="cp">Copiar resumo</button><button class="bt bt-c" id="de">Refazer o dia</button><button class="bt bt-c" id="ex">Continuar explorando</button></div><textarea id="copia" hidden readonly></textarea>`;

    this.ui.setModalHtml(html, true, false);
    this.sound.playCompletionChord();
    this.bindReportButtons();
  }

  private bindReportButtons(): void {
    this.bindSingleButton('cp', () => {
      const txt = buildReportCopyText(this.state);
      const area = document.getElementById('copia') as HTMLTextAreaElement | null;
      const fallback = () => {
        if (area) {
          area.hidden = false;
          area.value = txt;
          area.select();
        }
        this.ui.showNotice('Selecione e copie o texto abaixo');
      };
      try {
        navigator.clipboard?.writeText(txt).then(() => this.ui.showNotice('Resumo copiado'), fallback);
      } catch {
        fallback();
      }
    });
    this.bindSingleButton('de', () => this.restartDay());
    this.bindSingleButton('ex', () => this.closeModal());
  }

  private bindSingleButton(id: string, fn: () => void): void {
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.onclick = fn;
    });
  }

  public closeModal(): void {
    if (!this.state.on) return;
    this.ui.setModalHtml(null);
    this.lookTarget = null;
    document.body.classList.remove('falando');
    this.canvas.focus();
  }

  public isModalOpen(): boolean {
    const el = document.getElementById('veu');
    return Boolean(el && !el.hidden);
  }

  private syncStateUI(): void {
    const stop = PARADAS[this.state.i];
    const evidList = stop ? evidenciasDaParada(stop.id) : [];
    const evidDone = evidList.filter((e) => Boolean(this.state.evid[e.id])).length;
    this.ui.syncHud(this.state, { done: evidDone, total: evidList.length });
  }

  private updateCompass(): void {
    const ctx = this.compassCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 340, 30);
    ctx.fillStyle = 'rgba(9,28,31,0.78)';
    ctx.fillRect(0, 0, 340, 30);
    ctx.strokeStyle = 'rgba(214,236,228,0.35)';
    ctx.strokeRect(0.5, 0.5, 339, 29);

    const half = 170;
    const fovRad = 0.9;
    const dirs: [string, number][] = [
      ['N', 0],
      ['L', Math.PI / 2],
      ['S', Math.PI],
      ['O', -Math.PI / 2],
    ];
    for (const [lbl, ang] of dirs) {
      let diff = ang - this.player.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (Math.abs(diff) > fovRad) continue;
      const px = half + (diff / fovRad) * half;
      ctx.fillStyle = '#f3f6ee';
      ctx.font = '800 13px Archivo, Arial Narrow, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(lbl, px, 13);
      ctx.fillRect(px - 0.5, 16, 1, 8);
    }

    PARADAS.forEach((p, idx) => {
      let diff = Math.atan2(-(p.x + 1.6 - this.player.x), -(p.nz - this.player.z)) - this.player.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (Math.abs(diff) > fovRad) return;
      const px = half + (diff / fovRad) * half;
      ctx.fillStyle =
        idx === this.state.i
          ? '#ffc93c'
          : this.state.feitas[p.id]
            ? '#00968c'
            : 'rgba(238,246,241,0.75)';
      ctx.beginPath();
      ctx.arc(px, 22, 4, 0, Math.PI * 2);
      ctx.fill();
      if (idx === this.state.i) {
        const dist = Math.round(Math.hypot(p.x + 1.6 - this.player.x, p.nz - this.player.z));
        ctx.font = '700 9px Inter, sans-serif';
        ctx.fillText(`${dist} m`, px, 9);
      }
    });
  }

  private updateWaypoint(): void {
    const stop = PARADAS[this.state.i];
    if (!stop || this.state.fim || !this.state.on || this.isModalOpen()) {
      this.beaconBeam.visible = false;
      this.beaconRing.visible = false;
      this.beaconPin.visible = false;
      this.beaconSprite.visible = false;
      return;
    }
    const tx = stop.x + 1.6;
    const tz = stop.nz;
    const ty = groundHeightAt(tx, tz);
    const bobY = ty + 2.7 + Math.sin(this.elapsed * 2.2) * 0.15;

    this.beaconBeam.visible = true;
    this.beaconBeam.position.set(tx, ty + 30, tz);
    (this.beaconBeam.material as THREE.MeshBasicMaterial).opacity =
      0.045 + Math.sin(this.elapsed * 3) * 0.02;

    this.beaconRing.visible = true;
    this.beaconRing.position.set(tx, ty + 0.08, tz);
    this.beaconRing.scale.setScalar(1 + Math.sin(this.elapsed * 3) * 0.12);

    this.beaconPin.visible = true;
    this.beaconPin.position.set(tx, bobY, tz);
    this.beaconPin.rotation.y = this.elapsed * 1.4;

    this.beaconSprite.visible = true;
    this.beaconSprite.position.set(tx, bobY + 1.05, tz);

    const dist = Math.round(Math.hypot(tx - this.player.x, tz - this.player.z));
    if (Math.abs(dist - this.beaconDistCache) >= 1) {
      this.beaconDistCache = dist;
      const ctx = this.beaconCanvas.getContext('2d')!;
      ctx.clearRect(0, 0, 256, 64);
      ctx.fillStyle = 'rgba(9,28,31,0.84)';
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#ffc93c';
      ctx.font = '800 30px Archivo, Arial Narrow, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${dist} m`, 128, 33);
      (this.beaconSprite.material as THREE.SpriteMaterial).map!.needsUpdate = true;
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = (this.renderer as unknown as { backend?: { gl?: WebGL2RenderingContext } }).backend
      ?.gl;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.paceTimer = window.setTimeout(cb, 160);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    let tries = 0;
    const poll = () => {
      if (this.disposed || this.renderPaused) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      tries++;
      const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (status === gl.UNSIGNALED && tries < 200) {
        this.paceTimer = window.setTimeout(poll, 20);
      } else {
        if (sync) gl.deleteSync(sync);
        this.paceTimer = window.setTimeout(cb, 140);
      }
    };
    this.paceTimer = window.setTimeout(poll, 20);
  }

  private scheduleNextFrame(): void {
    if (this.disposed || this.renderPaused) return;
    if (this.cap?.isSoftwareRenderer) {
      this.afterDraw(() => {
        if (!this.disposed && !this.renderPaused) this.rafId = requestAnimationFrame(this.loop);
      });
    } else {
      this.rafId = requestAnimationFrame(this.loop);
    }
  }

  private loop = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDtSec = Math.max(0.0001, (now - this.lastTime) / 1000);
    const dt = Math.min(0.05, rawDtSec);
    this.lastTime = now;
    this.elapsed += dt;
    this.frameCounter++;

    // Performance ring buffer (keep timing; draws/tris captured right after render below)
    const rawMs = rawDtSec * 1000;
    this.frameTimesMs.push(rawMs);
    if (this.frameTimesMs.length > 90) this.frameTimesMs.shift();

    // Time of day smooth transition (05:30 -> 18:30)
    const targetDayT = this.state.fim ? 1 : (this.state.i / PARADAS.length) * 0.9;
    this.dayT += (targetDayT - this.dayT) * Math.min(1, dt * 0.85);
    this.skyLight.updateTimeOfDay(this.dayT, this.player.x, this.player.z, this.scene);
    this.materials.groundWetness.value = Math.max(0, 1 - this.dayT / 0.32);

    // Animate drone
    const talhao = PARADAS[1];
    this.campo.drone.position.set(
      talhao.x - 3 + Math.cos(this.elapsed * 0.6) * 7,
      groundHeightAt(talhao.x, talhao.bz) + 7 + Math.sin(this.elapsed * 1.3) * 0.4,
      talhao.bz + 2 + Math.sin(this.elapsed * 0.6) * 5,
    );
    this.campo.drone.rotation.y = -this.elapsed * 0.6;

    // Animate harvester + transbordos
    const harvStopped = this.chain.armado;
    if (!harvStopped) {
      this.harvesterX = -48 + Math.sin(this.elapsed * 0.12) * 12;
      this.campo.harvester.cutter.rotation.y += dt * 9;
    }
    this.campo.harvester.group.position.set(
      this.harvesterX,
      groundHeightAt(this.harvesterX, -27),
      -27,
    );
    this.campo.transbordoA.group.position.set(
      this.harvesterX + 1.5,
      groundHeightAt(this.harvesterX + 1.5, -23.6),
      -23.6,
    );
    this.campo.transbordoB.group.position.set(
      this.harvesterX - 2.6,
      groundHeightAt(this.harvesterX - 2.6, -24.2),
      -24.2,
    );

    const morningGlow = Math.max(0, 1 - this.dayT / 0.18);
    this.campo.harvester.headlights.forEach((hl) => {
      (hl.material as THREE.MeshStandardNodeMaterial).emissiveIntensity = harvStopped
        ? Math.sin(this.elapsed * 6) > 0
          ? 2.4
          : 0.1
        : 2 * morningGlow;
    });
    this.campo.harvester.dustMotes.forEach((sp, idx) => {
      if (harvStopped) {
        sp.visible = false;
        return;
      }
      sp.visible = true;
      const p = (this.elapsed * 0.85 + idx * 0.125) % 1;
      sp.position.set(2.5 + p * 3.5, 0.4 + p * 2.2, Math.sin(idx * 2.1 + p * 6) * 1.4);
      sp.scale.setScalar(0.7 + p * 1.7);
      (sp.material as THREE.SpriteMaterial).opacity = 0.34 * (1 - p);
    });

    // Animate road cane truck (Carga 41) & industrial steam plumes & ship gentle bob
    const truckProg = (this.elapsed * 0.03) % 1;
    const rx = -20 + truckProg * 112;
    this.indPorto.roadTruck.position.set(rx, groundHeightAt(rx, 1.6), 1.6);

    for (const pl of this.indPorto.steamPlumes) {
      const t = (this.elapsed * 0.14 + pl.phase) % 1;
      pl.mesh.position.set(pl.x + t * 6.5, pl.y + t * 11.5, pl.z);
      pl.mesh.scale.setScalar(1.4 + t * 4.5);
      (pl.mesh.material as THREE.SpriteMaterial).opacity = 0.65 * (1 - t);
    }
    this.indPorto.ship.position.y = -0.45 + Math.sin(this.elapsed * 0.7) * 0.12;

    // Signals & Evidences float
    this.campo.sinais.forEach((s, i) => {
      if (!s.diamond.visible) return;
      const base = groundHeightAt(s.spec.x, s.spec.z);
      s.diamond.position.y = base + 1.5 + Math.sin(this.elapsed * 2 + i) * 0.2;
      s.diamond.rotation.y += dt * 2;
      s.ring.rotation.x += dt;
      s.ring.rotation.y += dt * 0.7;
    });
    this.campo.evidencias.forEach((ev, i) => {
      if (this.state.evid[ev.spec.id]) return;
      const base = groundHeightAt(ev.spec.x, ev.spec.z);
      ev.marker.position.y = base + ev.spec.y + 0.35 + Math.sin(this.elapsed * 2.4 + i) * 0.08;
      ev.ring.position.y = ev.marker.position.y;
      ev.ring.rotation.x += dt;
      ev.ring.rotation.y += dt * 0.7;
    });

    // Street lamps & birds & dust motes
    const night = this.skyLight.nightFactor;
    this.campo.lamps.forEach((l, i) => {
      l.headMat.emissiveIntensity = 1.6 * night;
      (l.halo.material as THREE.SpriteMaterial).opacity =
        (0.45 + 0.08 * Math.sin(this.elapsed * 11 + i * 1.7)) * night;
      if (l.pointLight) l.pointLight.intensity = 1.4 * night;
    });
    this.campo.birds.children.forEach((b, i) => {
      const u = b.userData as { a: number; r: number; h: number; vel: number };
      u.a += dt * u.vel;
      b.position.set(
        -40 + Math.cos(u.a) * u.r,
        u.h + Math.sin(this.elapsed * 0.9 + i) * 1.2,
        8 + Math.sin(u.a) * u.r * 0.7,
      );
      b.rotation.y = -u.a;
    });
    const dustDummy = new THREE.Object3D();
    for (let i = 0; i < this.campo.dustMotes.mesh.count; i++) {
      const p = this.campo.dustMotes.pos[i];
      p[0] += dt * 3;
      if (p[0] > 150) p[0] = -150;
      dustDummy.position.set(p[0], p[1] + Math.sin(this.elapsed + i) * 0.45, p[2]);
      dustDummy.updateMatrix();
      this.campo.dustMotes.mesh.setMatrixAt(i, dustDummy.matrix);
    }
    this.campo.dustMotes.mesh.instanceMatrix.needsUpdate = true;

    // Player movement & auto-walk & triggers
    const isMoving =
      this.state.on &&
      !this.isModalOpen() &&
      (Boolean(this.player.rota) ||
        Boolean(this.keys.KeyW || this.keys.ArrowUp) ||
        Boolean(this.keys.KeyS || this.keys.ArrowDown) ||
        Boolean(this.keys.KeyA || this.keys.ArrowLeft) ||
        Boolean(this.keys.KeyD || this.keys.ArrowRight) ||
        Math.abs(this.joyVec.x) + Math.abs(this.joyVec.y) > 0.3);

    this.walkBlend += ((isMoving ? 1 : 0) - this.walkBlend) * Math.min(1, dt * 8);
    const sprinting = isMoving && Boolean(this.keys.ShiftLeft || this.keys.ShiftRight) && !this.player.rota;
    if (isMoving) {
      this.walkBob += dt * (sprinting ? 10.5 : 6.5);
      this.stepTimer += dt * (sprinting ? 2.9 : 2.1);
      if (this.stepTimer > 1) {
        this.stepTimer = 0;
        this.sound.playFootstep();
      }
    }

    // Dynamic FOV
    const targetFov =
      (this.state.cfg.fov || 68) + (sprinting ? 6 : 0) - (this.lookTarget && this.isModalOpen() ? 13 : 0);
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 4);
      this.camera.updateProjectionMatrix();
      this.skyLight.updateFrustums();
    }

    this.sound.updateSpatial(
      dt,
      this.player.x,
      this.player.z,
      this.player.yaw,
      this.harvesterX,
      -27,
      harvStopped,
      this.elapsed,
    );

    if (this.state.on && !this.isModalOpen()) {
      if (this.player.rota) {
        const nextPt = this.player.rota[0];
        const dx = nextPt[0] - this.player.x;
        const dz = nextPt[1] - this.player.z;
        const dist = Math.hypot(dx, dz);
        const step = 30 * dt;
        if (dist <= step) {
          this.player.x = nextPt[0];
          this.player.z = nextPt[1];
          this.player.rota.shift();
          if (this.player.rota.length === 0) {
            this.player.rota = null;
            if (this.state.demo && !this.state.fim) {
              const targetStop = PARADAS[this.state.i];
              setTimeout(() => {
                if (!this.isModalOpen() && targetStop && !this.state.feitas[targetStop.id]) {
                  this.openDemoSheet(targetStop);
                }
              }, 500);
            }
          }
        } else {
          this.player.x += (dx / dist) * step;
          this.player.z += (dz / dist) * step;
        }
        const facePt = this.player.rota ? this.player.rota[0] : this.player.viraPara;
        if (facePt) {
          let dYaw = Math.atan2(-(facePt[0] - this.player.x), -(facePt[1] - this.player.z)) - this.player.yaw;
          dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
          this.player.yaw += this.player.rota ? dYaw * Math.min(1, dt * 5) : dYaw;
          if (!this.player.rota) this.player.pitch = -0.03;
        }
        if (
          this.keys.KeyW ||
          this.keys.KeyS ||
          this.keys.KeyA ||
          this.keys.KeyD ||
          Math.abs(this.joyVec.x) + Math.abs(this.joyVec.y) > 0.3
        ) {
          this.player.rota = null;
        }
      } else {
        const fwd =
          (this.keys.KeyW || this.keys.ArrowUp ? 1 : 0) -
          (this.keys.KeyS || this.keys.ArrowDown ? 1 : 0) -
          this.joyVec.y;
        const strafe =
          (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0) -
          (this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0) +
          this.joyVec.x;
        const speed = 9 * dt * (sprinting ? 2 : 1);
        const sY = Math.sin(this.player.yaw);
        const cY = Math.cos(this.player.yaw);
        const nx = Math.max(-140, Math.min(106, this.player.x + (-sY * fwd + cY * strafe) * speed));
        const nz = Math.max(-62, Math.min(62, this.player.z + (-cY * fwd - sY * strafe) * speed));
        const harvCol = [{ x: this.harvesterX, z: -27, r: 3.8 }];
        if (!this.collisions.isBlocked(nx, this.player.z, harvCol)) this.player.x = nx;
        if (!this.collisions.isBlocked(this.player.x, nz, harvCol)) this.player.z = nz;
      }

      // Collect signals on proximity
      for (const s of this.campo.sinais) {
        if (!s.diamond.visible) continue;
        if (Math.hypot(this.player.x - s.spec.x, this.player.z - s.spec.z) < 2.6) {
          s.diamond.visible = false;
          s.ring.visible = false;
          this.state.sinais[s.spec.id] = 1;
          this.sound.playTone(980);
          setTimeout(() => this.sound.playTone(1320, 0.35), 130);
          this.ui.flashScreen(0.65);
          setTimeout(() => this.ui.flashScreen(0), 200);
          const html =
            `<div class="olho">Sinal encontrado</div><h2>${escapeHtml(s.spec.n)}</h2>` +
            `<p>${escapeHtml(s.spec.t)}</p>` +
            renderFrenteCard({ n: s.spec.n, p: s.spec.p, c: s.spec.c }, false) +
            `<div class="linha-b"><button class="bt bt-a" id="seguir">Seguir</button></div>`;
          this.ui.setModalHtml(html, false, false);
          this.bindSingleButton('seguir', () => {
            this.closeModal();
            if (this.state.demo) {
              const near = findNearestInteractableParada(this.player.x, this.player.z, this.state.i);
              if (near && !this.state.feitas[near.id]) this.openDemoSheet(near);
            }
          });
        }
      }
    }

    // Chain effect trigger when returning near Frente de colheita with unresolved preventive order
    if (
      this.chain.armado &&
      !this.chain.visto &&
      !this.isModalOpen() &&
      Math.abs(this.player.x + 48) < 13 &&
      Math.abs(this.player.z + 22) < 14
    ) {
      this.chain.visto = true;
      this.ui.showRadio(CHAIN_RADIO_MSG);
      this.sound.playRadioSquelch();
      this.ui.showNotice(CHAIN_AVISO_MSG);
    }

    // Proximity prompts & hold-to-observe E ring
    const nearStop =
      this.state.on && !this.isModalOpen() && !this.player.rota
        ? findNearestInteractableParada(this.player.x, this.player.z, this.state.i)
        : null;
    const obsEv =
      this.state.on && !this.isModalOpen() && !this.player.rota
        ? this.findObservedEvidence()
        : null;

    if (obsEv) {
      this.holdProgress = this.holdingE ? this.holdProgress + dt / 0.75 : 0;
      if (this.holdProgress >= 1) {
        this.holdProgress = 0;
        this.holdingE = false;
        this.markEvidence(obsEv.spec);
      }
      this.ui.setInteractionPrompt(
        true,
        obsEv.spec.n,
        this.holdingE ? 'Registrando no tablet…' : 'Segure para registrar a evidência',
        'Segurar',
        this.holdProgress,
      );
    } else if (nearStop) {
      this.holdProgress = 0;
      this.ui.setInteractionPrompt(
        true,
        nearStop.quem,
        `Conversar · ${nearStop.lugar}`,
        'Conversar',
        0,
      );
    } else {
      this.holdProgress = 0;
      this.ui.setInteractionPrompt(false, '', '', '', 0);
    }

    if (nearStop && nearStop !== this.lastLocalStop) {
      this.lastLocalStop = nearStop;
      this.ui.showLocalCard(nearStop);
    }

    // People turn smoothly to player & wave on active stop
    this.campo.people.forEach((p, idx) => {
      p.group.rotation.y = Math.atan2(this.player.x - p.group.position.x, this.player.z - p.group.position.z);
      const wave =
        idx === this.state.i &&
        nearStop &&
        PARADAS[this.state.i] === nearStop &&
        Math.hypot(nearStop.x + 1.6 - this.player.x, nearStop.nz - this.player.z) < 7;
      p.rightArm.rotation.z = wave ? 2.3 + Math.sin(this.elapsed * 3.2) * 0.22 : 0.1;
      if (!this.state.cfg.reduz) {
        p.group.position.y = p.baseY + Math.sin(this.elapsed * 2 + idx * 1.3) * 0.015;
      }
    });

    if (this.lookTarget && this.isModalOpen()) {
      let dYaw =
        Math.atan2(-(this.lookTarget[0] - this.player.x), -(this.lookTarget[2] - this.player.z)) -
        this.player.yaw;
      dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
      this.player.yaw += dYaw * Math.min(1, dt * 4);
      this.player.pitch += (-0.03 - this.player.pitch) * Math.min(1, dt * 4);
    }

    // Camera pose (grounded cleanly over terrain heightfield)
    const bobAmp = this.state.cfg.reduz ? 0 : this.walkBlend;
    this.tabletGroup.visible = this.state.on;
    if (this.state.on) {
      const groundY = groundHeightAt(this.player.x, this.player.z);
      this.camera.position.set(
        this.player.x,
        groundY + 1.75 + Math.sin(this.walkBob) * 0.045 * bobAmp,
        this.player.z,
      );
      this.camera.rotation.set(this.player.pitch, this.player.yaw, Math.sin(this.walkBob) * 0.01 * bobAmp);
    } else {
      const orbitA = this.elapsed * 0.035 + 0.6;
      this.camera.position.set(
        -62 + Math.cos(orbitA) * 30,
        5.8 + Math.sin(this.elapsed * 0.11) * 1.1,
        -4 + Math.sin(orbitA) * 13,
      );
      this.camera.lookAt(-48, 2.8, -26);
    }

    // Periodic HUD & LOD & culling updates
    if (this.state.on && this.frameCounter % 3 === 0) this.updateCompass();
    if (this.frameCounter % 2 === 0) this.updateWaypoint();
    if (this.state.on && this.frameCounter % 30 === 0) this.refreshTabletCanvas();
    if (this.frameCounter % 4 === 0) {
      this.vegetation.updateLOD(this.player.x, this.player.z, this.budget);
    }

    this.pipeline.render();

    if ((this.frameCounter === 1 || this.frameCounter % 5 === 0) && this.frameTimesMs.length > 0) {
      const sum = this.frameTimesMs.reduce((a, b) => a + b, 0);
      const avg = sum / this.frameTimesMs.length;
      const worst = Math.max(...this.frameTimesMs);
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      const infoRender = this.renderer.info.render as unknown as {
        drawCalls?: number;
        calls: number;
        triangles: number;
      };
      this.perf = {
        fps: Math.round(1000 / Math.max(1, avg)),
        avgFrameMs: Number(avg.toFixed(1)),
        worstFrameMs: Number(worst.toFixed(1)),
        draws: infoRender.drawCalls ?? infoRender.calls,
        triangles: Math.round(infoRender.triangles),
        pixelRatio: this.renderer.getPixelRatio(),
        backend: this.perf.backend,
        quality: effectiveQuality(this.state.cfg),
        memoryMB: mem ? Math.round(mem.usedJSHeapSize / (1024 * 1024)) : null,
      };
      this.ui.updatePerfOverlay(this.perf, this.state.cfg.medir);
    }

    this.scheduleNextFrame();
  };

  private onWindowResize = (): void => {
    this.handleResize(true);
  };

  private handleResize(renderAfter = true): void {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    this.renderer?.setSize(w, h, false);
    this.skyLight?.updateFrustums();
    if (renderAfter) {
      this.pipeline?.render();
    }
  }

  private bindInputListeners(): void {
    window.addEventListener('resize', this.onWindowResize);

    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      this.keys[e.code] = true;
      if (e.code === 'KeyE' && !e.repeat) {
        this.holdingE = true;
        if (!this.findObservedEvidence()) {
          this.openCurrentConversation();
        }
      } else if (e.code === 'KeyG') {
        this.goToCurrentStop();
      } else if (e.code === 'KeyM') {
        this.openPlatformModal();
      } else if (e.code === 'KeyP') {
        this.togglePauseModal();
      } else if (e.code === 'F3') {
        e.preventDefault();
        this.state.cfg.medir = !this.state.cfg.medir;
        this.ui.updatePerfOverlay(this.perf, this.state.cfg.medir);
      } else if (e.code === 'Escape') {
        const pauseEl = document.getElementById('pausaVeu');
        if (pauseEl && !pauseEl.hidden) {
          this.ui.setPauseOpen(false);
          this.canvas.focus();
        } else {
          this.closeModal();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'KeyE') this.holdingE = false;
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });

    this.canvas.addEventListener('click', () => {
      const pauseEl = document.getElementById('pausaVeu');
      if (
        document.body.classList.contains('toque') ||
        !this.state.on ||
        this.isModalOpen() ||
        (pauseEl && !pauseEl.hidden)
      ) {
        return;
      }
      try {
        this.canvas.requestPointerLock?.();
      } catch {
        // ignore pointerlock errors in headless
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      const s = this.state.cfg.sens || 1;
      this.player.yaw -= e.movementX * 0.0022 * s;
      this.player.pitch = Math.max(
        -1.25,
        Math.min(1.15, this.player.pitch - e.movementY * 0.0022 * s * (this.state.cfg.invY ? -1 : 1)),
      );
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      this.dragLook = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (this.pointerLocked || !this.dragLook || e.pointerId !== this.dragLook.id) return;
      const s = this.state.cfg.sens || 1;
      this.player.yaw -= (e.clientX - this.dragLook.x) * 0.0045 * s;
      this.player.pitch = Math.max(
        -1.1,
        Math.min(1.0, this.player.pitch - (e.clientY - this.dragLook.y) * 0.003 * s * (this.state.cfg.invY ? -1 : 1)),
      );
      this.dragLook.x = e.clientX;
      this.dragLook.y = e.clientY;
    });
    const endDrag = (e: PointerEvent) => {
      if (this.dragLook && e.pointerId === this.dragLook.id) this.dragLook = null;
    };
    this.canvas.addEventListener('pointerup', endDrag);
    this.canvas.addEventListener('pointercancel', endDrag);
  }

  public setJoystick(x: number, y: number): void {
    this.joyVec.x = x;
    this.joyVec.y = y;
  }

  public setTouchHold(holding: boolean): void {
    this.holdingE = holding;
  }

  public teleportForInspection(x: number, z: number, yaw: number, pitch = -0.05, dayT?: number): void {
    this.player.rota = null;
    this.player.x = x;
    this.player.z = z;
    this.player.yaw = yaw;
    this.player.pitch = pitch;
    if (dayT !== undefined) {
      this.dayT = dayT;
      this.skyLight.updateTimeOfDay(dayT, x, z, this.scene);
    }
    this.vegetation.updateLOD(x, z, this.budget);
    const groundY = groundHeightAt(x, z);
    this.camera.position.set(x, groundY + 1.75, z);
    this.camera.rotation.set(pitch, yaw, 0);
    this.refreshTabletCanvas();
    this.updateCompass();
    this.updateWaypoint();
    this.pipeline?.render();
    const infoRender = this.renderer.info.render as unknown as {
      drawCalls?: number;
      calls: number;
      triangles: number;
    };
    this.perf.draws = infoRender.drawCalls ?? infoRender.calls;
    this.perf.triangles = Math.round(infoRender.triangles);
  }

  private exposeDebugGlobal(): void {
    (window as unknown as { __dia: unknown }).__dia = {
      E: this.state,
      J: this.player,
      PARADAS,
      EVID: EVIDENCIAS,
      SINAIS,
      RADIO,
      CHAIN: this.chain,
      perf: () => this.perf,
      irAte: () => this.goToCurrentStop(),
      conversar: () => this.openCurrentConversation(),
      interagir: () => {
        if (!this.findObservedEvidence()) this.openCurrentConversation();
      },
      marcarEvid: (ev: EvidenciaSpec) => this.markEvidence(ev),
      evPerto: () => this.findObservedEvidence(),
      aplicarQualidade: (p?: QualityPreset) => {
        if (p) this.setQualityPreset(p);
        else this.applyQuality(true);
      },
      teleporte: (x: number, z: number, yaw: number, pitch?: number, dayT?: number) =>
        this.teleportForInspection(x, z, yaw, pitch, dayT),
      pausarRender: (paused: boolean) => {
        this.renderPaused = paused;
        if (paused) {
          window.clearTimeout(this.paceTimer);
          cancelAnimationFrame(this.rafId);
        } else if (!this.disposed) {
          this.scheduleNextFrame();
        }
      },
      radio: (txt: string) => this.ui.showRadio(txt),
      abrePausa: () => this.togglePauseModal(),
      aberto: () => this.isModalOpen(),
      versao: 'v6-webgpu',
      R: this.renderer,
      S: this.scene,
    };
  }

  public dispose(): void {
    this.disposed = true;
    window.clearTimeout(this.paceTimer);
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onWindowResize);
    this.sound.dispose();
    this.skyLight?.dispose();
    this.pipeline?.dispose();
    this.renderer?.dispose();
  }
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] || ch);
}

function renderFrenteCard(f: { n: string; p: string; c: string[] }, locked: boolean): string {
  const chips = f.c
    .map((item) => (item.startsWith('@') ? `<em>${escapeHtml(item.slice(1))}</em>` : `<span>${escapeHtml(item)}</span>`))
    .join('');
  return `<div class="frente${locked ? ' fechada' : ''}"><div class="cab"><b>${escapeHtml(f.n)}</b><span class="selo${locked ? ' off' : ''}">${escapeHtml(locked ? 'a descobrir' : f.p)}</span></div><div class="chips">${chips}</div></div>`;
}
