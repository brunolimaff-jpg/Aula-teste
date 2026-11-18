import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAIN_AVISO_MSG,
  CHAIN_RADIO_MSG,
  EVIDENCIAS,
  FRENTES_CATALOGO,
  PARADAS,
  RADIO,
  SINAIS,
  evidenciasDaParada,
} from '../src/game/data';
import {
  buildReportCopyText,
  computeCompetencias,
  createInitialGameState,
  findNearestInteractableParada,
  maxPossiblePoints,
  resetRunState,
  scoreForAttempt,
} from '../src/game/rules';
import {
  CollisionWorld,
  groundHeightAt,
  isCaneExclusionAt,
} from '../src/game/worldMath';

describe('Um Dia de Safra — paridade de conteúdo e regras', () => {
  it('preserva exatamente as 10 paradas, 4 sinais, 8 evidências e 10 falas de rádio', () => {
    assert.equal(PARADAS.length, 10);
    assert.equal(SINAIS.length, 4);
    assert.equal(EVIDENCIAS.length, 8);
    assert.equal(RADIO.length, 10);
    assert.equal(PARADAS[0].id, 'plan');
    assert.equal(PARADAS[0].hora, '05:30');
    assert.equal(PARADAS[9].id, 'com');
    assert.equal(PARADAS[9].hora, '17:30');
    assert.equal(evidenciasDaParada('auto').length, 2);
    assert.ok(FRENTES_CATALOGO.length >= 10);
    assert.ok(CHAIN_RADIO_MSG.includes('preventiva'));
    assert.ok(CHAIN_AVISO_MSG.includes('Oficina'));
  });

  it('calcula pontuação, competências e relatório final corretamente', () => {
    assert.equal(scoreForAttempt(0), 2);
    assert.equal(scoreForAttempt(1), 1);
    assert.equal(scoreForAttempt(2), 0);
    assert.equal(maxPossiblePoints(), 28);

    const st = createInitialGameState();
    st.nome = 'Ana';
    for (const p of PARADAS) {
      st.feitas[p.id] = { g: 2 };
      if (p.pergs) st.perg[p.id] = 2;
    }
    st.pontos = 20;
    for (const ev of EVIDENCIAS.slice(0, 4)) {
      st.evid[ev.id] = 1;
      st.pontos += 1;
    }
    const comp = computeCompetencias(st);
    assert.equal(comp.con, 100);
    assert.equal(comp.perg, 100);
    assert.equal(comp.obs, 50);
    assert.equal(comp.pior, 'Observar');

    const txt = buildReportCopyText(st);
    assert.ok(txt.includes('Um Dia de Safra · Ana · 24/28 pontos'));
    assert.ok(txt.includes('Observar 50%'));

    resetRunState(st);
    assert.equal(st.i, 0);
    assert.equal(st.pontos, 0);
    assert.equal(Object.keys(st.evid).length, 0);
  });

  it('localiza parada interativa mais próxima dentro do alcance', () => {
    const p0 = PARADAS[0];
    assert.equal(findNearestInteractableParada(p0.x + 1.6, p0.nz + 3, 0)?.id, 'plan');
    assert.equal(findNearestInteractableParada(p0.x + 1.6, p0.nz + 12, 0), null);
    // Não interage com parada futura ainda não liberada
    const p2 = PARADAS[2];
    assert.equal(findNearestInteractableParada(p2.x + 1.6, p2.nz, 0), null);
  });
});

describe('Terreno determinístico e colisão', () => {
  it('mantém pátios de paradas e estrada nivelados em y=0 e desce na bacia portuária', () => {
    assert.equal(groundHeightAt(-108, 0), 0);
    for (const p of PARADAS) {
      assert.ok(Math.abs(groundHeightAt(p.x, p.nz)) < 0.05, `pátio ${p.id} nivelado`);
    }
    assert.ok(groundHeightAt(125, 0) < -2.5, 'canal do porto submerso');
    assert.equal(isCaneExclusionAt(0, 0), true);
    assert.equal(isCaneExclusionAt(-84, 24), false);
  });

  it('bloqueia movimento fora do mundo e contra caixas/círculos cadastrados', () => {
    const world = new CollisionWorld();
    world.addBox(-96, -16, 14, 9);
    world.addCircle(-60, 12, 1.5);
    assert.equal(world.isBlocked(-96, -16), true);
    assert.equal(world.isBlocked(-60, 12.8), true);
    assert.equal(world.isBlocked(-108, 0), false);
    assert.equal(world.isBlocked(-150, 0), true);
  });
});
