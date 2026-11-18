import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const rootDir = process.cwd();
const sourceHtmlPath = path.join(rootDir, 'safra-v85', 'dist', 'index.html');
const publicHtmlPath = path.join(rootDir, 'public', 'um-dia-de-safra.html');
const rootCopyPath = path.join(rootDir, 'Um Dia de Safra v8.0.html');

const rawBuf = fs.readFileSync(sourceHtmlPath);
const html = rawBuf.toString('utf8');

function extractDataBlock() {
  const g1 = fs.readFileSync(path.join(rootDir, 'safra-v85', 'src', 'data__safraData.js'), 'utf8');
  const g2 = fs.readFileSync(path.join(rootDir, 'safra-v85', 'src', 'data__historia.js'), 'utf8');
  assert.ok(html.includes(g1.slice(0, 200)) && html.includes(g2.slice(0, 200)), 'Data modules not embedded in dist/index.html');
  const snippet = `${g1}\n${g2}`;
  const ctx: Record<string, unknown> = {};
  vm.createContext(ctx);
  vm.runInContext(
    `${snippet}\nthis.__exported = { PARADAS, DIRETOR, EVIDENCIAS, NIVEIS, EASTER, SINAIS, PONTA_A_PONTA, CONVERSAS, ABERTURA, FISCAL, REGRAS_CRACHA, CODEX, MIRANTES, DEVOLUTIVA, CONQUISTAS, NIVEIS_HISTORIA, MURMURIOS, SAFRA_SCENARIO };`,
    ctx,
  );
  return ctx.__exported as {
    PARADAS: Array<Record<string, any>>;
    DIRETOR: Record<string, any>;
    EVIDENCIAS: Array<Record<string, any>>;
    NIVEIS: Record<string, any>;
    EASTER: Array<{ id: string; x: number; z: number; y: number; n: string; d: string }>;
    SINAIS: Array<Record<string, any>>;
    PONTA_A_PONTA: Array<Record<string, any>>;
    CONVERSAS: Record<string, any>;
    ABERTURA: Record<string, any>;
    FISCAL: Record<string, any>;
    REGRAS_CRACHA: Record<string, any>;
    CODEX: Array<Record<string, any>>;
    MIRANTES: Array<Record<string, any>>;
    DEVOLUTIVA: Record<string, any>;
    CONQUISTAS: Array<{ id: string; nome: string; criterio: string; frase: string }>;
    NIVEIS_HISTORIA: Record<string, { doresParaAceitarDevolutiva: number; objecoesNaDevolutiva: number }>;
    MURMURIOS: Array<{ id: string; x: number; z: number; quem: string; lugar: string; falas: Array<[string, string]> }>;
    SAFRA_SCENARIO: Record<string, any>;
  };
}

test('public/um-dia-de-safra.html and root HTML match safra-v85/dist/index.html', () => {
  const pubBuf = fs.readFileSync(publicHtmlPath);
  const rootBuf = fs.readFileSync(rootCopyPath);
  assert.ok(rawBuf.equals(pubBuf), 'public/um-dia-de-safra.html differs from safra-v85/dist/index.html');
  assert.ok(rawBuf.equals(rootBuf), 'Um Dia de Safra v8.0.html differs from safra-v85/dist/index.html');
});

test('All 10 PARADAS have complete SPIN 4-round CONVERSAS, roteiro, cartao, perda, and frentes', () => {
  const { PARADAS, CONVERSAS } = extractDataBlock();
  assert.equal(PARADAS.length, 10);

  for (const p of PARADAS) {
    assert.ok(Array.isArray(p.roteiro) && p.roteiro.length >= 2, `${p.id}: roteiro must have lines`);
    assert.ok(Array.isArray(p.conversa) && p.conversa.length === 4, `${p.id}: SPIN conversa must have 4 rounds`);
    assert.equal(CONVERSAS[p.id]?.length, 4, `${p.id}: CONVERSAS entry must have 4 rounds`);
    const etapas = p.conversa.map((r: any) => r.etapa);
    assert.deepEqual(Array.from(etapas), ['situacao', 'problema', 'implicacao', 'proposta'], `${p.id}: stages must follow SPIN`);
    for (const r of p.conversa) {
      assert.ok(Array.isArray(r.opcoes) && r.opcoes.length >= 3, `${p.id}/${r.etapa}: needs >=3 options`);
      assert.ok(r.opcoes.some((o: any) => o.q === 'boa'), `${p.id}/${r.etapa}: needs a 'boa' option`);
    }
    assert.ok(p.cartao && p.cartao.produto, `${p.id}: missing cartao.produto`);
    assert.ok(p.perda && p.perda.rotulo, `${p.id}: missing perda.rotulo`);
    assert.ok(Array.isArray(p.op) && p.op.length === 3, `${p.id}: op needs 3 options`);
    assert.ok(p.capitulo && p.enredo && p.saudacao && p.ganchoProx && p.radioDepois, `${p.id}: missing ENREDO_SAFRA narrative fields`);
  }
});

test('v8.5 + Phase C data structures: ABERTURA, FISCAL, 46 CODEX, 3 MIRANTES, DEVOLUTIVA, 10 CONQUISTAS, NIVEIS_HISTORIA', () => {
  const { ABERTURA, FISCAL, REGRAS_CRACHA, CODEX, MIRANTES, DEVOLUTIVA, CONQUISTAS, NIVEIS_HISTORIA, PONTA_A_PONTA } = extractDataBlock();

  assert.ok(ABERTURA.titulo && Array.isArray(ABERTURA.falas) && ABERTURA.falas.length >= 4, 'ABERTURA incomplete');
  assert.ok(FISCAL.nome.includes('Valdemar') && FISCAL.gatilhos.length >= 7, 'FISCAL incomplete');
  assert.deepEqual(
    { ...REGRAS_CRACHA.advertenciasAteExpulsao },
    { trainee: 4, executivo: 3, especialista: 2 },
    'REGRAS_CRACHA limits mismatch',
  );
  assert.equal(CODEX.length, 46, 'CODEX must have 46 entries');
  assert.equal(MIRANTES.length, 3, 'MIRANTES must have 3 entries');

  // Phase C: NIVEIS_HISTORIA minimum pains gate (6 / 8 / 10) and objections (0 / 1 / 3)
  assert.equal(NIVEIS_HISTORIA.trainee.doresParaAceitarDevolutiva, 6);
  assert.equal(NIVEIS_HISTORIA.executivo.doresParaAceitarDevolutiva, 8);
  assert.equal(NIVEIS_HISTORIA.especialista.doresParaAceitarDevolutiva, 10);
  assert.equal(NIVEIS_HISTORIA.trainee.objecoesNaDevolutiva, 0);
  assert.equal(NIVEIS_HISTORIA.executivo.objecoesNaDevolutiva, 1);
  assert.equal(NIVEIS_HISTORIA.especialista.objecoesNaDevolutiva, 3);

  // Phase C: DEVOLUTIVA with 3 tough questions and 3 outcomes
  assert.equal(DEVOLUTIVA.perguntas.length, 3, 'DEVOLUTIVA must have 3 tough questions');
  for (const pg of DEVOLUTIVA.perguntas) {
    assert.ok(pg.pergunta && Array.isArray(pg.respostas) && pg.respostas.length === 3, 'DEVOLUTIVA question missing options');
    assert.ok(pg.respostas.some((r: any) => r.tipo === 'boa' && r.texto && r.reacao), 'DEVOLUTIVA question missing boa option');
  }
  assert.equal(DEVOLUTIVA.finais.length, 3, 'DEVOLUTIVA must have 3 final outcomes');

  // Phase C: 10 CONQUISTAS medals
  assert.equal(CONQUISTAS.length, 10, 'CONQUISTAS must have 10 medals');
  assert.deepEqual(
    Array.from(CONQUISTAS.map((c) => c.id)),
    [
      'ouvido-de-ouro',
      'cracha-limpo',
      'rato-de-usina',
      'do-campo-ao-balanco',
      'olho-de-aguia',
      'evidencia-amarrada',
      'segunda-chance',
      'sem-pitch-no-diretor',
      'dez-de-dez',
      'cafe-da-oficina',
    ],
  );

  // End-to-end map (PONTA_A_PONTA) includes Operis YMS and Commerce
  const gatecItems = PONTA_A_PONTA.flatMap((f) => f.gatec).join(' | ');
  assert.ok(gatecItems.includes('Operis YMS'), 'PONTA_A_PONTA must include Operis YMS');
  assert.ok(gatecItems.includes('Commerce'), 'PONTA_A_PONTA must include Commerce');
});

test('Open-world MURMURIOS crew & SAFRA_SCENARIO isolation contract', () => {
  const { MURMURIOS, SAFRA_SCENARIO, PARADAS } = extractDataBlock();
  assert.equal(MURMURIOS.length, 6, 'MURMURIOS must have 6 secondary mill crew members');
  assert.deepEqual(
    Array.from(MURMURIOS.map((m) => m.id)),
    ['amb-portaria', 'amb-oficina', 'amb-balanca', 'amb-moenda', 'amb-armazem', 'amb-porto'],
  );
  for (const m of MURMURIOS) {
    assert.ok(typeof m.x === 'number' && typeof m.z === 'number', `${m.id}: missing coordinates`);
    assert.ok(m.quem && m.lugar && Array.isArray(m.falas) && m.falas.length >= 2, `${m.id}: incomplete dialogue`);
  }
  assert.equal(SAFRA_SCENARIO.id, 'usina-horizonte');
  assert.equal(SAFRA_SCENARIO.storagePrefix, 'safra_usina_horizonte_');
  assert.equal(SAFRA_SCENARIO.paradas.length, PARADAS.length);
  assert.equal(SAFRA_SCENARIO.murmurios.length, MURMURIOS.length);
  assert.ok(typeof SAFRA_SCENARIO.spawn?.x === 'number' && typeof SAFRA_SCENARIO.spawn?.z === 'number');
});

test('Adaptive environmental audio: AUDIO_BIOMES & resolveBiome acoustic occlusion and footsteps', () => {
  const g1 = fs.readFileSync(path.join(rootDir, 'safra-v85', 'src', 'data__safraData.js'), 'utf8');
  const aud = fs.readFileSync(path.join(rootDir, 'safra-v85', 'src', 'audio__soundEngine.js'), 'utf8');
  const ctx: Record<string, unknown> = {
    window: {},
    localStorage: { getItem: () => '1', setItem: () => {} },
  };
  vm.createContext(ctx);
  vm.runInContext(
    `${g1}\n${aud}\nthis.__audioExports = { AUDIO_BIOMES, resolveBiome };`,
    ctx,
  );
  const { AUDIO_BIOMES, resolveBiome } = ctx.__audioExports as {
    AUDIO_BIOMES: Record<string, any>;
    resolveBiome: (px: number, pz: number, ato?: number) => Record<string, any>;
  };

  assert.equal(Object.keys(AUDIO_BIOMES).length, 13, 'Expected 13 acoustic biomes');

  const portaria = resolveBiome(-118, 0.6, 1);
  assert.equal(portaria.id, 'portaria');
  assert.equal(portaria.interior, false);
  assert.ok(portaria.lpfHz >= 14500);
  assert.equal(portaria.piso, 'asfalto');

  const canavial = resolveBiome(-72, 12, 1);
  assert.equal(canavial.id, 'canavial');
  assert.equal(canavial.interior, false);
  assert.equal(canavial.piso, 'terra');
  assert.ok(canavial.cana > 1.0 && canavial.cigarras > 0.8);

  const milho = resolveBiome(-96, 15, 1);
  assert.equal(milho.id, 'milho');
  assert.equal(milho.interior, false);
  assert.equal(milho.piso, 'terra');

  const sede = resolveBiome(-92, -12, 1);
  assert.equal(sede.id, 'sede');
  assert.equal(sede.interior, true);
  assert.ok(sede.lpfHz <= 3500);
  assert.equal(sede.piso, 'concreto');

  const oficina = resolveBiome(-22, 14, 2);
  assert.equal(oficina.id, 'oficina');
  assert.equal(oficina.interior, true);
  assert.equal(oficina.piso, 'metal');

  const industria = resolveBiome(26, 14, 2);
  assert.equal(industria.id, 'industria');
  assert.equal(industria.interior, true);
  assert.ok(industria.lpfHz <= 1600);
  assert.equal(industria.piso, 'metal');

  const porto = resolveBiome(100, -10, 3);
  assert.equal(porto.id, 'porto');
  assert.equal(porto.interior, false);
  assert.equal(porto.piso, 'madeira');
});

test('3D Valdemar (__SAFRA_VALDEMAR__), MIT crew, Usina Horizonte portico, Adaptive Audio HUD, Subtitle-First Dialogue, Mentor Konviva, and Voice Director are wired in bundle', () => {
  const worldSlice = html.slice(html.indexOf('// === world/stopsBuilder.js ==='), html.indexOf('const HUMANOS_GLB'));
  const hudSlice = html.slice(html.indexOf('// === ui/hud.js ==='));

  assert.ok(worldSlice.includes('window.__SAFRA_VALDEMAR__ = {'), 'window.__SAFRA_VALDEMAR__ missing in world__stopsBuilder.js');
  assert.ok(worldSlice.includes('npc-valdemar'), 'npc-valdemar 3D character missing');
  assert.ok(worldSlice.includes('yawPlayer + Math.PI'), 'Valdemar irAte facing fix (yawPlayer + Math.PI) missing');
  assert.ok(worldSlice.includes('USINA HORIZONTE'), 'Portaria entrance portico missing');
  assert.ok(worldSlice.includes('AGROINDÚSTRIA FLEX · CANA & MILHO'), 'Usina Flex portico sign missing');
  assert.ok(worldSlice.includes('LINHA MILHO') && worldSlice.includes('LINHA CANA') && worldSlice.includes('FERMENTAÇÃO FLEX'), 'Usina Flex distinct bay signs missing');
  assert.ok(worldSlice.includes('DDGS'), 'Usina Flex DDGS complex missing');
  assert.ok(worldSlice.includes('moendaRols') && worldSlice.includes('secadorDdgs') && worldSlice.includes('calador'), 'Animated mill rollers, DDGS dryer, or calador missing');
  assert.ok(worldSlice.includes('[-1.9, 0.58, 0x2b506e, \'milho\']'), 'Opposing westbound corn grain truck traffic missing');
  assert.ok(!worldSlice.includes('filtro de barro'), 'Stale filtro de barro comment should be removed');
  assert.ok(html.includes('HUMANOS_AMBIENTE') && html.includes('coleteRefletivo') && html.includes('melhorarMaterialHumano'), 'MIT ambient crew / PBR upgrades missing');
  assert.ok(html.includes('frenteLocal') && html.includes('applyAxisAngle(_HM_UP, it.p.rotation.y)'), 'Live NPC world front tracking missing in world__humanos.js');
  assert.ok(html.includes('ligarHumanos(scene)'), 'ligarHumanos(scene) call missing in main.js');
  assert.ok(html.includes('falasApos') && html.includes('tgt.item.aposDe'), 'Reactive MURMURIOS falasApos logic missing in main.js');
  assert.ok(html.includes('id="somBioma"') && hudSlice.includes('updateAcousticBadge('), 'Adaptive biome badge missing');
  assert.ok(hudSlice.includes('aria-pressed="'), 'aria-pressed accessibility attributes missing in ui__hud.js');
  assert.ok(hudSlice.includes('minDoresNivel()'), 'minDoresNivel gate missing in ui__hud.js');
  assert.ok(hudSlice.includes('btPlatReuniao'), 'Pedir a reunião button missing in showPlatform');
  assert.ok(hudSlice.includes('data-dev-k='), 'DEVOLUTIVA tough questions missing in showCall');
  assert.ok(hudSlice.includes('conq-grid'), 'Conquistas grid missing in showReport');
  assert.ok(hudSlice.includes('cine-bottom') && hudSlice.includes('so-legenda') && hudSlice.includes('cine-top'), 'Subtitle-first AAA Indie dialogue stage missing in ui__hud.js');
  assert.ok(hudSlice.includes('initKonviva()') && html.includes('id="konvivaDrawer"'), 'Mentor Konviva IA drawer missing');
  assert.ok(hudSlice.includes('falarVoz(') && hudSlice.includes('/api/tts') && hudSlice.includes('btToggleVoz') && hudSlice.includes('btOuvirFala'), 'AI Voice Director missing in ui__hud.js');
  assert.ok(hudSlice.includes('unlockVoz(') && hudSlice.includes('_ttsUnavailableReason') && hudSlice.includes('__SAFRA_VOZ_STATUS__'), 'Voice gesture unlock & watchdog status missing in ui__hud.js');
  assert.ok(html.includes('falarSintetizado(') && html.includes('playWavBase64('), 'Web Audio speech synthesizer and WAV buffer playback missing in audio__soundEngine.js');
  assert.ok(html.includes('focusStop(parada)') && html.includes('Math.exp(-6.5 * dt)'), '3D NPC camera framing focusStop and smooth camera damping missing in main.js');
});

test('Open-world MURMURIOS entries include reactive falasApos', () => {
  const { MURMURIOS, PARADAS } = extractDataBlock();
  const stopIds = new Set(PARADAS.map((p) => p.id));
  for (const m of MURMURIOS as Array<Record<string, any>>) {
    assert.ok(m.aposDe && stopIds.has(m.aposDe), `${m.id}: aposDe must reference a valid PARADA id`);
    assert.ok(Array.isArray(m.falasApos) && m.falasApos.length >= 1, `${m.id}: falasApos must have at least 1 reactive line`);
  }
});

test('Role-accurate Microsoft Rocketbox roster (14 MIT GLBs) & Gemini TTS server capability', () => {
  const humData = fs.readFileSync(path.join(rootDir, 'safra-v85', 'src', 'data__humanos.js'), 'utf8');
  const humWorld = fs.readFileSync(path.join(rootDir, 'safra-v85', 'src', 'world__humanos.js'), 'utf8');
  const lista = fs.readFileSync(path.join(rootDir, 'safra-v85', 'loop', 'assets', 'lista.txt'), 'utf8');
  const meta = JSON.parse(fs.readFileSync(path.join(rootDir, 'metadata.json'), 'utf8'));

  const expected = [
    'Female_Adult_04',
    'Wood_Male_01',
    'Construction_Female_01',
    'Construction_Male_05',
    'Construction_Male_02',
    'Female_Adult_07',
    'Construction_Male_07',
    'Business_Female_01',
    'Male_Adult_08',
    'Business_Male_02',
    'Security_Male_01',
    'Construction_Male_04',
    'Construction_Male_08',
    'Male_Adult_05',
  ];

  const ctx: Record<string, unknown> = {};
  vm.runInContext(`${humData}\nthis.__H = HUMANOS_GLB;`, vm.createContext(ctx));
  const glbKeys = Object.keys(ctx.__H as Record<string, string>);
  assert.equal(glbKeys.length, 14, 'HUMANOS_GLB must contain all 14 role-accurate MIT models');

  for (const k of expected) {
    assert.ok(glbKeys.includes(k), `Missing GLB key ${k} in data__humanos.js`);
    assert.ok(humWorld.includes(`'${k}'`), `Missing mapping ${k} in world__humanos.js`);
    assert.ok(lista.includes(k), `Missing ${k} in lista.txt`);
  }

  for (const stale of ['Gardener_Male_01', 'Delivery_Male_01']) {
    assert.ok(!glbKeys.includes(stale), `Stale mismatched model ${stale} should be removed from data__humanos.js`);
    assert.ok(!humWorld.includes(stale), `Stale mismatched model ${stale} should be removed from world__humanos.js`);
  }

  assert.ok(
    Array.isArray(meta.majorCapabilities) && meta.majorCapabilities.includes('MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API'),
    'metadata.json must declare MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API',
  );
});

test('SafraSpeechEngine (Web Speech API + 3D Lip-Sync/Gesture Sync), Rocketbox 81-bone animation, CC0 PBR, and pre-saved neural voices', () => {
  const soundSrc = fs.readFileSync(path.join(process.cwd(), 'safra-v85/src/audio__soundEngine.js'), 'utf8');
  const humSrc = fs.readFileSync(path.join(process.cwd(), 'safra-v85/src/world__humanos.js'), 'utf8');
  const prefabsSrc = fs.readFileSync(path.join(process.cwd(), 'safra-v85/src/world__prefabs.js'), 'utf8');
  const matSrc = fs.readFileSync(path.join(process.cwd(), 'safra-v85/src/engine__materials.js'), 'utf8');
  const hudSrc = fs.readFileSync(path.join(process.cwd(), 'safra-v85/src/ui__hud.js'), 'utf8');
  const manifestPath = path.join(process.cwd(), 'public/assets/voices/manifest.json');

  // 1. Procedural dolls must be hidden by default in buildPerson so only Rocketbox 3D characters appear
  assert.ok(prefabsSrc.includes('ch.userData.isProceduralDoll = true'), 'buildPerson must tag procedural doll parts');
  assert.ok(prefabsSrc.includes('ch.visible = false'), 'buildPerson must hide procedural doll meshes by default');

  // 2. Rocketbox 81-bone facial & gesture bones must be driven by animarNPC + SafraSpeechEngine
  for (const bone of ['Bip01_MJaw', 'Bip01_MBottomLip', 'Bip01_MMiddleEyebrow', 'Bip01_LEyeBlinkTop', 'Bip01_L_Forearm', 'Bip01_R_Forearm']) {
    assert.ok(humSrc.includes(bone), `world__humanos.js must animate Rocketbox bone ${bone}`);
  }
  assert.ok(humSrc.includes('tier1Ready'), 'ligarHumanos must expose tier1Ready priority promise for instant protagonista loading');

  // 3. Poly Haven CC0 PBR texture blending must be wired in MaterialLibrary
  assert.ok(matSrc.includes('loadCC0Textures'), 'MaterialLibrary must include loadCC0Textures for Poly Haven CC0 assets');
  for (const cc0Dir of ['brown_mud_02', 'concrete_floor_worn_001', 'corrugated_iron_02', 'asphalt_02']) {
    assert.ok(matSrc.includes(cc0Dir), `MaterialLibrary must wire CC0 texture set ${cc0Dir}`);
  }

  // 4. Evaluate SafraSpeechEngine pure phonetic timeline & animation state synchronization
  const winMock: Record<string, any> = {};
  const ctx: Record<string, any> = {
    window: winMock,
    document: { body: { classList: { add() {}, remove() {} } } },
    performance: { now: () => 1000 },
    setTimeout,
    clearTimeout,
  };
  vm.runInContext(
    `${soundSrc}\n;this.__TEST__ = { SafraSpeechEngine, gerarTimelineFala, normalizarTextoParaFala };`,
    vm.createContext(ctx),
  );
  const { SafraSpeechEngine, gerarTimelineFala, normalizarTextoParaFala } = ctx.__TEST__;

  const norm = normalizarTextoParaFala('O ATR caiu em 85 t/ha no ERP.');
  assert.ok(norm.includes('A T R'), 'normalizarTextoParaFala must expand agro acronyms for natural pronunciation');
  assert.ok(norm.includes('toneladas por hectare'), 'normalizarTextoParaFala must expand t/ha unit notation');

  const tl = gerarTimelineFala('Cinco e meia da manhã e o caminhão já parou na balança.', 1.04);
  assert.ok(tl.durationMs > 1200, 'gerarTimelineFala must calculate realistic speech duration in ms');
  assert.ok(tl.silabas.length > 8, 'gerarTimelineFala must produce syllable/vowel frames');

  const engine = new SafraSpeechEngine();
  const sess = engine.speak('Helena', 'Cinco e meia da manhã e o caminhão já parou na balança.', { externalAudio: true });
  assert.equal(sess.speaker, 'Helena');
  assert.equal(engine.playing, true);
  assert.ok(sess.durationMs > 1200);
  engine.setDurationMs(4200);
  assert.equal(engine.durationMs, 4200, 'setDurationMs must rescale timeline to match neural WAV duration');
  const animState = engine.getAnimationState('Helena', engine.startedAt + 600);
  assert.equal(animState.speaking, true, 'getAnimationState must report active speaking state for matching NPC');
  assert.ok(animState.gestureL > 0, 'getAnimationState must provide conversational gesture weight');
  engine.stop();

  // 5. Verify HUD loads pre-saved voice manifest and manifest.json exists on disk with pre-saved WAVs
  assert.ok(hudSrc.includes('loadVoiceManifest'), 'HUD must include loadVoiceManifest()');
  assert.ok(fs.existsSync(manifestPath), 'public/assets/voices/manifest.json must exist on disk');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.ok(Object.keys(manifest).length >= 5, 'manifest.json must contain pre-saved neural base voices');
});




