import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERACTABLES,
  PLAYER_RADIUS,
  SPAWN_POSE,
  YARD_COLLIDERS,
  YARD_HALF,
  concreteApronMask,
  createMissionState,
  findFocusedInteractable,
  getObjectiveSummary,
  groundHeightAt,
  puddleMaskAt,
  resolvePlayerMove,
  resolveQualityProfile,
  surfaceAt,
  triggerInteractable,
} from '../src/red-dust/logic';

test('spawn position is outside all colliders and inside yard bounds', () => {
  assert.ok(Math.abs(SPAWN_POSE.x) < YARD_HALF);
  assert.ok(Math.abs(SPAWN_POSE.z) < YARD_HALF);
  const resolved = resolvePlayerMove(
    SPAWN_POSE.x,
    SPAWN_POSE.z,
    SPAWN_POSE.x,
    SPAWN_POSE.z,
    PLAYER_RADIUS,
    YARD_COLLIDERS
  );
  assert.ok(Math.abs(resolved.x - SPAWN_POSE.x) < 1e-4);
  assert.ok(Math.abs(resolved.z - SPAWN_POSE.z) < 1e-4);
});

test('mission steps progress strictly from valve -> switch -> breaker -> restored', () => {
  let state = createMissionState();
  assert.equal(state.step, 'purge_valve');

  // Cannot trigger breaker out of order
  const bad = triggerInteractable(state, 'panel_qgbt04');
  assert.equal(bad.event, null);
  assert.equal(bad.next.step, 'purge_valve');

  // Step 1: Valve V-07
  const r1 = triggerInteractable(state, 'valve_v07');
  assert.equal(r1.event, 'valve');
  state = r1.next;
  assert.equal(state.valvePurged, true);
  assert.equal(state.step, 'isolate_switch');

  // Step 2: Seccionadora S-02
  const r2 = triggerInteractable(state, 'switch_s02');
  assert.equal(r2.event, 'switch');
  state = r2.next;
  assert.equal(state.switchIsolated, true);
  assert.equal(state.step, 'restore_breaker');

  // Step 3: QGBT-04
  const r3 = triggerInteractable(state, 'panel_qgbt04');
  assert.equal(r3.event, 'breaker');
  state = r3.next;
  assert.equal(state.breakerRestored, true);
  assert.equal(state.step, 'restored');
  assert.equal(getObjectiveSummary(state.step).label, 'Alimentação restabelecida');
});

test('all three mission interactables are reachable from nearby valid standing coordinates', () => {
  const standOffsets: Record<string, [number, number]> = {
    valve_v07: [5.6, -8.8],
    switch_s02: [-1.8, -8.0],
    panel_qgbt04: [-10.8, -14.2],
  };

  let state = createMissionState();
  for (const id of ['valve_v07', 'switch_s02', 'panel_qgbt04'] as const) {
    const def = INTERACTABLES.find((i) => i.id === id)!;
    const [px, pz] = standOffsets[id];
    const resolved = resolvePlayerMove(px, pz, px, pz);
    assert.ok(Math.hypot(resolved.x - px, resolved.z - pz) < 0.05, `${id} standing spot blocked`);

    const py = groundHeightAt(px, pz) + 1.68;
    const dx = def.position[0] - px;
    const dy = def.position[1] - py;
    const dz = def.position[2] - pz;
    const len = Math.hypot(dx, dy, dz);
    const focused = findFocusedInteractable(px, py, pz, dx / len, dy / len, dz / len, state);
    assert.equal(focused?.id, id, `Expected ${id} to be focusable`);
    state = triggerInteractable(state, id).next;
  }
});

test('puddles and concrete apron masks behave consistently across yard regions', () => {
  // Foreground puddle near (1.5, 11.5)
  assert.ok(puddleMaskAt(1.5, 11.5) > 0.35);
  assert.equal(surfaceAt(1.5, 11.5), 'puddle');

  // Concrete apron inside Casa de Força (-9.5, -13.5)
  assert.ok(concreteApronMask(-9.5, -13.5) > 0.9);
  assert.equal(puddleMaskAt(-9.5, -13.5), 0);
  assert.equal(surfaceAt(-9.5, -13.5), 'concrete');
});

test('quality profile safely scales down for software WebGL2 without crashing', () => {
  const sw = resolveQualityProfile('auto', true, 16);
  assert.equal(sw.tier, 'baixa');
  assert.equal(sw.postEnabled, false);
  assert.equal(sw.planarReflectionScale, 0);

  const gpu = resolveQualityProfile('auto', false, 8);
  assert.equal(gpu.tier, 'alta');
  assert.equal(gpu.postEnabled, true);
  assert.ok(gpu.planarReflectionScale > 0);
});
