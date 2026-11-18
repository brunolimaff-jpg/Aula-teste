import { EVIDENCIAS, FRENTES_CATALOGO, PARADAS, SINAIS, type FrenteCatalogo, type ParadaSpec } from './data';

export type QualityPreset = 'auto' | 'alta' | 'media' | 'baixa';
export type ConcreteQuality = 'alta' | 'media' | 'baixa';

export interface GameConfig {
  qual: ConcreteQuality;
  qualAuto: boolean;
  detN: ConcreteQuality;
  det: string;
  sens: number;
  fov: number;
  vol: number;
  invY: boolean;
  reduz: boolean;
  medir: boolean;
  som: boolean;
}

export interface ChainState {
  armado: boolean;
  visto: boolean;
}

export interface GameState {
  i: number;
  pontos: number;
  tent: number;
  feitas: Record<string, { g: number | null }>;
  sinais: Record<string, number>;
  perg: Record<string, number>;
  evid: Record<string, number>;
  nome: string;
  on: boolean;
  fim: boolean;
  demo: boolean;
  cfg: GameConfig;
}

export function createInitialGameState(): GameState {
  return {
    i: 0,
    pontos: 0,
    tent: 0,
    feitas: {},
    sinais: {},
    perg: {},
    evid: {},
    nome: 'Consultor',
    on: false,
    fim: false,
    demo: false,
    cfg: {
      qual: 'alta',
      qualAuto: true,
      detN: 'media',
      det: '—',
      sens: 1,
      fov: 68,
      vol: 0.9,
      invY: false,
      reduz: false,
      medir: false,
      som: true,
    },
  };
}

export function resetRunState(state: GameState): void {
  state.i = 0;
  state.pontos = 0;
  state.tent = 0;
  state.feitas = {};
  state.sinais = {};
  state.perg = {};
  state.evid = {};
  state.fim = false;
}

export function scoreForAttempt(tentativasErradas: number): number {
  return tentativasErradas === 0 ? 2 : tentativasErradas === 1 ? 1 : 0;
}

export function isFrenteDiscovered(cat: FrenteCatalogo, state: GameState): boolean {
  return cat.sources.some((src) =>
    src.type === 'parada' ? Boolean(state.feitas[src.id]) : Boolean(state.sinais[src.id]),
  );
}

export function computeCompetencias(state: GameState): {
  obs: number;
  perg: number;
  con: number;
  pior: string;
} {
  const obs = Math.round((Object.keys(state.evid).length / EVIDENCIAS.length) * 100);
  const paradasComPerg = PARADAS.filter((p) => p.pergs && p.pergs.length > 0);
  const pergRaw = paradasComPerg.reduce(
    (acc, p) => acc + (state.perg[p.id] == null ? 0 : state.perg[p.id]),
    0,
  );
  const perg = Math.round((pergRaw / (paradasComPerg.length * 2)) * 100);

  const conRaw = PARADAS.reduce((acc, p) => acc + (state.feitas[p.id]?.g ?? 0), 0);
  const con = Math.round((conRaw / (PARADAS.length * 2)) * 100);

  const ranked = [
    ['Observar', obs],
    ['Perguntar', perg],
    ['Conectar', con],
  ] as const;
  const pior = [...ranked].sort((a, b) => a[1] - b[1])[0][0];

  return { obs, perg, con, pior };
}

export function maxPossiblePoints(): number {
  return PARADAS.length * 2 + EVIDENCIAS.length;
}

export function buildReportCopyText(state: GameState): string {
  if (state.demo) {
    const frentesDescobertas = FRENTES_CATALOGO.filter((c) => isFrenteDiscovered(c, state));
    return (
      `Um Dia de Safra · demonstração · ${state.nome}\n` +
      PARADAS.map(
        (p) =>
          `${p.hora} ${p.lugar}: ${p.feito} — ${p.frentes
            .map((f) => `${f.n} (${f.p})`)
            .join(' + ')}`,
      ).join('\n') +
      '\nFrentes em operação: ' +
      frentesDescobertas.map((c) => `${c.f.n} (${c.f.p})`).join(', ')
    );
  }

  const maxPts = maxPossiblePoints();
  const sinaisCount = Object.keys(state.sinais).length;
  const evidCount = Object.keys(state.evid).length;
  const comp = computeCompetencias(state);

  return (
    `Um Dia de Safra · ${state.nome} · ${state.pontos}/${maxPts} pontos · ${sinaisCount}/${SINAIS.length} sinais · ${evidCount}/${EVIDENCIAS.length} evidências\n` +
    `Competências: Observar ${comp.obs}% · Perguntar ${comp.perg}% · Conectar ${comp.con}%\n` +
    PARADAS.map(
      (p) =>
        `${p.hora} ${p.lugar}: ${p.frentes
          .map((f) => `${f.n} (${f.p})`)
          .join(' + ')} · ${state.feitas[p.id]?.g ?? 0}/2 — ${p.feito}`,
    ).join('\n')
  );
}

export function findNearestInteractableParada(
  playerX: number,
  playerZ: number,
  currentStopIndex: number,
): ParadaSpec | null {
  let best: ParadaSpec | null = null;
  let bestDist = 8;
  for (let idx = 0; idx <= Math.min(currentStopIndex, PARADAS.length - 1); idx++) {
    const p = PARADAS[idx];
    const dist = Math.hypot(p.x + 1.6 - playerX, p.nz - playerZ);
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  return best;
}

export function effectiveQuality(cfg: GameConfig): ConcreteQuality {
  return cfg.qualAuto ? cfg.detN || 'media' : cfg.qual;
}
