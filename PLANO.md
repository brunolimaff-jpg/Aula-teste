# PLANO.md — Arquitetura, Pesquisa Técnica e Plano de Ciclos ("Um Dia de Safra")

## 1. Inventário Completo dos Sistemas da v5 (`Um Dia de Safra · v5.html`)

A leitura integral do código fonte da v5 (5.120 linhas após formatação) mapeou os seguintes sistemas existentes que devem ter **100% de paridade funcional e de conteúdo**:

1. **Conteúdo e Regras de Negócio**:
   - **10 paradas lineares** ao longo do eixo X (`-96` a `+98`):
     1. `plan` (05:30, Sede — Planejamento) `x=-96, z=-10`
     2. `geo` (07:00, Talhão 12 — Geomapeamento) `x=-72, z=10`
     3. `agri` (08:30, Frente de colheita — Agrícola) `x=-48, z=-10`
     4. `auto` (10:00, Oficina — Automotiva) `x=-24, z=10`
     5. `orig` (11:30, Balança — Originação) `x=0, z=-10`
     6. `ind` (13:00, Indústria — Moenda e laboratório) `x=26, z=10`
     7. `arm` (14:30, Armazém e pátio — Logística) `x=52, z=-10`
     8. `custo` (16:00, Controladoria — Custo e finanças) `x=76, z=10`
     9. `erp` (16:45, Centro de gestão — Operação completa) `x=88, z=-10`
     10. `com` (17:30, Porto — Exportação) `x=98, z=10`
   - **6 Frentes da plataforma GAtec** (`SimpleFarm`, `Mapfy`, `Shield`, `Operis`, `Senior`, `CTRMagro`).
   - **4 Sinais de campo** (`mob`, `iot`, `vin`, `erp`) e **8 Evidências observáveis** (`ev-plan1..ev-auto2`) com raio `5.5m`, `dot > 0.9`, tempo de retenção `0.75s` (anel SVG no retículo).
   - **Efeito em cadeia (`CHAIN`)**: se o jogador não registrar `ev-auto1` na Oficina, a colhedora do Talhão 12 para com alerta operacional e impacto no diálogo/relatório.
   - **Rádio (`RADIO`)**: 8 transmissões contextuais ligadas ao progresso e evidências.
   - **Pontuação e Competências**: `0..2` pts por pergunta + `0..2` pts por conexão + `1` pt por evidência observada, agrupados em **Observar**, **Perguntar**, **Conectar**, com relatório final detalhado e texto copiável.
   - **Modo Demonstração (`Apresentar o dia`)**: percorre automaticamente as paradas com caminhada/teleporte suave e falas demonstrativas.

2. **Motor 3D da v5 (Baseline a ser superado)**:
   - Three.js r180 com `WebGLRenderer` clássico e `EffectComposer` + `UnrealBloomPass` + shader pass de ACES/grão/vinheta.
   - **Materiais procedurais (`Gg`/`Vg`)**: compilava 13 shaders fragment no boot em `WebGLRenderTarget` (512/1024px) e injetava `onBeforeCompile` com poeira vermelha (`uDust`) por altura mundial. *Limitação*: incompatível diretamente com WGSL/`WebGPURenderer`; texturas repetitivas em áreas grandes.
   - **Solo (`makeGround`)**: plano perfeitamente liso `2400x2400` (`y=0`) com máscara de canvas 1760×880 misturando 4 texturas e trilhos. *Limitação*: sem relevo topográfico do Mato Grosso, sem micro-normal/displacement nem água realista.
   - **Céu (`Ai`)**: domo simples com gradientes interpolados + 3 anéis planos de montanha (`MeshLambertMaterial`). *Limitação*: sem nuvens volumétricas nem dispersão atmosférica física.
   - **Vegetação (`L`)**: `InstancedMesh` em chunks de 40m usando 3 planos cruzados fixos (`alphaTest: 0.45`). *Limitação*: apenas 1 nível de detalhe, silhueta plana de perto.
   - **Paradas 1–4 vs Paradas 5–10 (`Xg` e cena)**: paradas 1–4 têm edifícios, picape, trator, colhedora, transbordos, drone e oficina razoáveis; **paradas 5–10 são caixas e cilindros primitivos grosseiros** sem janelas, estruturas, detalhes industriais ou navais realistas.
   - **UI e Áudio**: HUD completo + tablet 3D preso à câmera (`ne`) + áudio procedural Web Audio. *Ponto de atenção*: `.veu.meio` e `.folha` usavam `backdrop-filter: blur(...)` sobre o canvas 3D (penaliza GPU/SwiftShader).

---

## 2. Pesquisa Técnica Confirmada (`three@0.187.0`)

APIs verificadas diretamente em `node_modules/three` (versão `0.187.0`) e `@types/three`:

1. **`WebGPURenderer` (`three/webgpu`)**:
   - Aceita `{ antialias: boolean, forceWebGL: boolean }` e inicializa com `await renderer.init()`.
   - Fallback automático para `WebGL2` embutido (`WebGLBackend`) caso `navigator.gpu` ou adaptador WebGPU não estejam disponíveis — além de podermos forçar `forceWebGL: true` explicitamente no perfil **Baixa** ou quando detectado driver sem WebGPU.
2. **`RenderPipeline` (`three/webgpu`) e nós TSL (`three/tsl`, `three/examples/jsm/tsl/display/*`)**:
   - Substitui `EffectComposer` da era r180: `new RenderPipeline(renderer)`, `pass(scene, camera)` com `mrt({ output, normal: normalView })` quando necessário.
   - `ao(depth, normal, camera)` (`GTAONode`) + `builtinAOContext(...)` aplicam oclusão de ambiente em tempo real.
   - `ssgi(beauty, depth, normal, camera)` (`SSGINode`) provê iluminação global em tela para o perfil **Alta** (em hardware WebGPU/GPU dedicada).
   - `godrays(depth, camera, sunLight)` (`GodraysNode`) + `bloom(sceneColor)` (`BloomNode`) + `fxaa(...)` (`FXAANode`) compõem o pós-processamento TSL compatível com ambos os backends (WebGPU WGSL e WebGL2 GLSL).
3. **`SkyMesh` (`three/examples/jsm/objects/SkyMesh.js`) + `PMREMGenerator` (`three/webgpu`)**:
   - Implementa o modelo físico Preetham + nuvens fBm animadas em TSL (`turbidity`, `rayleigh`, `mieCoefficient`, `mieDirectionalG`, `sunPosition`, `cloudCoverage`, `cloudDensity`, `cloudElevation`, `showSunDisc`).
   - `PMREMGenerator.fromScene(skyScene)` atualiza `scene.environment` em baixa frequência conforme a hora do dia (`05:30` -> `18:30`) sem usar luz ambiente chapada.
4. **Sombras em Cascata (`CSMShadowNode`)**:
   - `three/examples/jsm/csm/CSMShadowNode.js` acopla-se diretamente via `sunLight.shadow.shadowNode = new CSMShadowNode(sunLight, { cascades: 3, maxFar: 160, mode: 'practical' })` e exige atualização por quadro do frustum/light matrix.
5. **Materiais PBR + TSL (`MeshStandardNodeMaterial`)**:
   - Carregamento das 10 famílias de texturas CC0 locais (`diff.jpg`, `nor.jpg`, `arm.jpg` com AO=R, Roughness=G, Metalness=B).
   - `colorNode` / `roughnessNode` / `positionNode` em TSL permitem:
     - **Splatting triplanar/UV no terreno** misturando terra vermelha (`brown_mud_02` tingido), estrada cascalhada com trilhos úmidos (`gravel_ground_01`), capim (`sparse_grass`), concreto desgastado (`concrete_floor_worn_001`) e asfalto (`asphalt_02`);
     - **Desgaste e poeira em espaço do mundo**: acúmulo de terra vermelha na parte inferior (`smoothstep(0.0, 1.8, positionWorld.y)`) e respingo de lama/óleo sem depender de `onBeforeCompile`.
6. **Física e Streaming de Mundo**:
   - **Física / Colisão**: adotamos detector espacial determinístico em TypeScript puro (grid espacial + AABBs rotacionados/alinhados + cilindros + amostragem contínua do terreno `groundHeightAt(x, z)`), testado via `node:test`. *Justificativa*: WASM (`rapier3d`) adicionaria ~2 MB e inicialização assíncrona sem ganho prático para caminhada em primeira pessoa sobre terreno contínuo e colisão estática, além de que nossa matemática pura garante trajetória determinística para o `Ir até lá` (`G`) e Modo Demonstração.
   - **Streaming e LOD**: mundo particionado em setores ao longo do corredor `x ∈ [-150, +190]`; vegetação (cana-de-açúcar e capim) em **3 níveis de LOD** (`LOD0` colmos 3D curvos e folhas arqueadas até `24m`, `LOD1` touceiras cruzadas multi-plano de `24m` a `75m`, `LOD2` faixas volumétricas distantes acima de `75m`); ativação/desativação de emissões secundárias e animações finas por distância à câmera.

---

## 3. Arquitetura Alvo

```
app/
  layout.tsx              # Fontes Archivo + Inter, lang="pt-BR", metadata sincronizada
  globals.css             # Tokens visuais v5 (--verde, --ambar, --bg) + layout HUD (sem backdrop-filter)
  page.tsx                # Montagem client-only do jogo + HUD completo
src/
  game/                   # 100% puro TS (testado com node:test)
    data.ts               # PARADAS, SINAIS, EVIDENCIAS, RADIO, FRENTES, texto exato da v5
    rules.ts              # Estado do jogo, pontuação, efeito em cadeia, cálculo de competências, relatório
    worldMath.ts          # groundHeightAt(x,z), roadMaskAt(x,z), colisões determinísticas e pathfinding
  audio/
    soundEngine.ts        # Síntese procedural Web Audio (ambiente por zona, colhedora, passos, pássaros, UI)
  engine/
    quality.ts            # Perfis alta/media/baixa + detecção de GPU / WebGPU / software WebGL
    textures.ts           # Loader cacheado dos 10 sets PBR CC0 + texturas procedurais de cana/poeira
    materials.ts          # Fábrica MeshStandardNodeMaterial com TSL (poeira vermelha, umidade, desgaste, água)
    skyAndLighting.ts     # SkyMesh, Sol/CSMShadowNode, PMREM, ciclo 05:30->18:30, névoa atmosférica
    terrain.ts            # Terreno com relevo suave do Mato Grosso + splatting TSL terra/estrada/capim/concreto/asfalto
    vegetation.ts         # Cana-de-açúcar 3 LODs + vento TSL + reboleira do Talhão 12 + árvores do cerrado + capim
    fleetAndPeople.ts     # Veículos e pessoas articulados sem caixas nuas (picape, trator, colhedora, transbordo, caminhão, empilhadeira, trabalhador animado)
    worldStops1to4.ts     # Campo: Sede, Talhão 12, Frente de colheita, Oficina (alta densidade e detalhe)
    worldStops5to10.ts    # Usina & Porto: Balança, Indústria, Armazém, Controladoria, Centro de gestão, Porto & navio
    pipeline.ts           # RenderPipeline (SSGI/GTAO/Bloom/Godrays/FXAA conforme perfil) + fallback direto
    gameEngine.ts         # Orquestrador do loop, câmera, mira/E, G auto-walk, tablet 3D, telemetria F3 e window.__dia
  ui/
    GameShell.tsx         # Tela título, HUD, retículo com anel SVG, diálogos, mapa plataforma, pausa, relatório
tests/
  gameRules.test.ts       # Testes unitários de conteúdo, pontuação, cadeia, terreno e colisão
```

---

## 4. Orçamento de Desempenho por Perfil

| Parâmetro | **Alta** (Alvo 60 FPS @ 1080p GPU dedicada) | **Média** (Alvo 30 FPS notebook GPU integrada) | **Baixa** (Fallback WebGL2 garantido) |
|---|---|---|---|
| Backend | WebGPU (fallback WebGL2 se indisponível) | WebGPU ou WebGL2 | WebGL2 (`forceWebGL: true`) |
| DPR máximo | `min(devicePixelRatio, 1.5)` | `1.0` | `0.85`–`1.0` |
| Sombras Sol | `CSMShadowNode` 3 cascatas, `2048px` | `CSMShadowNode` 2 cascatas, `1024px` | `DirectionalLight` 1 mapa PCF, `1024px` |
| Pós-processamento (`RenderPipeline`) | `GTAO` + `SSGI` (meia res.) + `Godrays` + `Bloom` + `FXAA` | `GTAO` (meia res.) + `Bloom` + `FXAA` | Direto sem multi-pass pesado (apenas tone mapping ACES) |
| Vegetação (Cana LOD0/LOD1/LOD2) | LOD0 ≤ 26m, densidade 100%, capim denso | LOD0 ≤ 16m, densidade 70%, capim médio | LOD0 desativado (LOD1/LOD2), densidade 45% |
| Chamadas de desenho alvo | `< 350` | `< 260` | `< 180` |
| Triângulos visíveis alvo | `~900k–1.6M` | `~450k–800k` | `< 350k` |

*Proteção para rendering em CPU (SwiftShader em testes headless)*: detecção automática via `WEBGL_debug_renderer_info` / ausência de GPU hardware reduz apenas DPR (`1.0`), cascatas/resolução de pós-processamento e passo estável sem alterar nenhum objeto de cena, texto ou layout.

---

## 5. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| `WebGPURenderer` falhar em navegadores sem WebGPU ou em TSL complexa no backend WebGL2 | Usar exclusivamente nós TSL portáveis validados nos 2 backends + modo Baixa com `forceWebGL: true` e fallback automático se `renderer.init()` ou o pipeline acusar erro. |
| `SSGINode` / `GodraysNode` pesarem demais em GPU integrada | Ativar `SSGI` e `Godrays` apenas no perfil `alta` (e desativar se a taxa de quadros média cair abaixo de 38 FPS no auto-ajuste). |
| `CSMShadowNode` ou `SkyMesh` com problemas de tipo no TS Strict | Verificar todas as declarações com `npm run build` / `tsc` e wrappers tipados em `src/engine/`. |
| Objetos flutuando ou afundando ao introduzir relevo no terreno | Toda árvore, prédio, veículo, pessoa, evidência e jogador lê exatamente a função determinística `groundHeightAt(x, z)` (mantendo platôs planos suaves nos pátios de cada parada). |
| Desvio ou perda de conteúdo da v5 | Extrair os arrays e strings literais da v5 para `src/game/data.ts` e cobrir contagem de paradas, falas, opções, evidências, efeito em cadeia e pontuações em `tests/gameRules.test.ts`. |

---

## 6. Ordem dos Ciclos da Fase 2

- **Ciclo 1 — Fundação Motor WebGPU/TSL, Terreno PBR CC0, Céu & Cana LOD**:
  - `src/game/*` + `tests/gameRules.test.ts` + UI completa da v5 sem `backdrop-filter` + motor base com `WebGPURenderer`, `SkyMesh`, `PMREM`, `CSMShadowNode`, terreno com relevo e splatting CC0, vegetação com 3 LODs e vento TSL, e placeholders estruturados para todas as 10 paradas.
  - Rodar no navegador, capturar as 7 telas fixas, medir FPS/draws/tris/memória e criticar contra a rubrica.
- **Ciclo 2 — Alta Fidelidade Campo (Paradas 1–4), Frota Agrícola e Trabalhadores Animados**:
  - Elevar Sede, Talhão 12 (drone, sensores, reboleira com praga), Frente de colheita (colhedora articulada com cabine envidraçada, esteiras/pneus texturizados, plataforma de corte giratória, descarga de cana picada, poeira vermelha volumétrica e 2 transbordos) e Oficina (galpão aberto com treliças, ponte rolante, bancadas, compressores, tanques de diesel, quadro de OS legível, pneus e peças).
  - Trabalhadores articulados com capacete, colete refletivo, prancheta/tablet, respiração e animação natural.
  - Capturar, medir, corrigir defeitos.
- **Ciclo 3 — Alta Fidelidade Indústria & Porto (Paradas 5–10)**:
  - Elevar todas as 6 paradas hoje rudimentares para o mesmo patamar visual do Campo:
    - **5. Balança**: plataforma metálica rodoviária, guarita com vidros e interior, caminhão canavieiro articulado com gaiola carregada, painel digital de peso e cancela.
    - **6. Indústria**: estrutura de moenda com passarelas, escadas externas, esteira alimentadora de cana, tubulações com flanges, dornas de aço inox, 3 chaminés altas com pluma de vapor, laboratório.
    - **7. Armazém**: galpão em arco treliçado, portas de hangar, empilhadeira articulada, paletes de big-bags de açúcar com textura tecida, pilhas de contêineres detalhados e doca.
    - **8. Controladoria**: pavilhão corporativo com brises, pele de vidro refletiva, pilares de concreto e caminhonete estacionada.
    - **9. Centro de gestão (ERP)**: prédio operacional com sala de controle envidraçada e painel luminoso de telemetria visível, torre de rádio/antena parabólica.
    - **10. Porto**: cais de concreto texturizado com cabeços e defensas, guindaste portuário treliçado sobre trilhos com lança e cabos, mar animado com TSL (ondas + Fresnel), e navio graneleiro/porta-contêineres *Horizonte Star* detalhado.
  - Capturar, medir, corrigir defeitos.
- **Ciclo 4 — Iluminação Avançada, Pós-processamento, Áudio, Fluidez e Auditoria Final**:
  - Ajuste fino de `RenderPipeline` (`GTAO`, `SSGI` em Alta, `Bloom`, `FXAA`), micro-detalhes de poeira/pássaros/tablet 3D, validação dos 3 perfis (`alta`, `media`, `baixa`), partida completa do início ao relatório final + Modo Demonstração completo sem erros de console, `DIARIO.md` fechado e build final estático/produtivo verificado.
