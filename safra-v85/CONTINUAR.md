# Um Dia de Safra — v8.5+ (Fase C Completa) — Guia de Continuidade

## Estado
- Versão estável: v8.5 com Fase C integrada (`DEVOLUTIVA`, `CONQUISTAS`, `NIVEIS_HISTORIA` e Valdemar 3D).
- Entrada: `src/` (módulos na ordem de `src/_order.txt`) -> `dist/index.html` (HTML único, ~6,58 MB), espelhado em `public/um-dia-de-safra.html` e `Um Dia de Safra v8.0.html`.
- Testes automatizados de lógica e estrutura: `npx tsx --test tests/safra.test.ts` (4 suítes completas).
- Portão de qualidade Playwright + Chromium: `node loop/gate.mjs .` -> `"ok": true`.

## Leia primeiro
- `loop/DIRECAO.md`: direção do cliente (agroindústria real, Senior + GAtec de ponta a ponta, EPI, Operis YMS, Commerce, caso do motor).
- `loop/PROTOCOLO.md`: como os executores trabalham em cópia isolada + portão.
- `loop/diario.md`: histórico de rodadas.
- `loop/portfolio.md`, `loop/manual/*.md`: fonte única de produto e operação (não inventar além disso).
- `loop/manual/integracao.md`: fluxo oficial Senior ERP x GAtec (base do mapa ponta a ponta).
- `loop/design-system.md`: tokens do Senior Design System usados na home.
- `loop/historia/LEIA.md`: abertura, Valdemar (fiscal), Caderno de Campo, mirantes, devolutiva, conquistas.

## O que está no jogo (v8.5 + Fase C)
1. **Home Senior Design System (`v8.2`) + Abertura (`ABERTURA`)**:
   - Escolha de nível (`Trainee`, `Executivo`, `Especialista`) com regras explícitas de mínimo de dores e objeções na devolutiva.
   - Cena inicial na sala da diretoria com Dr. Augusto e entrega do crachá de visitante pelo técnico de segurança Valdemar.
2. **Valdemar em 3D (`window.__SAFRA_VALDEMAR__`) + Regras de Crachá (`FISCAL`, `REGRAS_CRACHA`)**:
   - 11º personagem 3D (`npc-valdemar`, avatar Rocketbox `Construction_Male_02.glb` com capacete branco, faixa refletiva e prancheta 3D na mão direita), adicionado ao `stopGroup` com `frustumCulled = false`.
   - Ao emitir advertência ou elogio raro, posiciona-se a ~3 m à frente do jogador olhando para ele por 6 segundos antes de retornar à ronda na portaria.
3. **10 Paradas Encadeadas + Conversa SPIN em 4 Rodadas (`CONVERSAS`)**:
   - Situação, Problema, Implicação e Proposta com barra de confiança (0–100), reação imediata em balão de diálogo, cartão do produto e selo 3D "Resolvido".
   - Caso real do motor na Oficina (OS -> estoque ou solicitação de compra no ERP -> serviço interno ou terceiro), Balança SimpleFarm + Operis YMS, Armazém Operis + Operis YMS, e Commerce no Porto.
4. **Trava de Mínimo de Dores (`NIVEIS_HISTORIA`) + Botão "Pedir a reunião"**:
   - Botão "Pedir a reunião" acessível na Plataforma (`#btPlatReuniao`), no cartão de objetivo do topo (`#btReuniaoAlvo`), no modal de parada e no relatório parcial.
   - Se o jogador pedir a reunião antes do mínimo do nível (**Trainee: 6**, **Executivo: 8**, **Especialista: 10**), Dr. Augusto recusa a reunião e lista as paradas pendentes com atalho direto para ir ao campo.
5. **Devolutiva Presencial na Sala da Diretoria (`DEVOLUTIVA`)**:
   - Mesa presencial com abertura do Dr. Augusto conforme o nível (`DEVOLUTIVA.aberturaPorNivel`) e parecer do Valdemar conforme o histórico do crachá (`DEVOLUTIVA.comentarioAdvertencias`).
   - Escolha das 3 dores prioritárias, 3 perguntas duras da diretoria (`DEVOLUTIVA.perguntas`), objeções conforme o nível (`0 / 1 / 3`) e 3 desfechos possíveis (`Contrato de diagnóstico aprovado`, `Manda uma proposta`, `Visita encerrada`).
6. **10 Conquistas (`CONQUISTAS`) no Relatório do Dia**:
   - Grade visual de conquistas (`.conq-grid`) avaliando todas as 10 medalhas da jornada (`Safra inteira`, `Capacete branco`, `Zero gafe`, `Faro de campo`, `Café com o Tião`, `A ponte humana`, `Olho de gavião`, `Caderno cheio`, `Voltei porque esqueci o crachá`, `Sem discurso`).
7. **Mapa Ponta a Ponta (`PONTA_A_PONTA`), Caderno de Campo (tecla `C`, 46 verbetes `CODEX`), 3 Mirantes (`MIRANTES`), 7 Easter Eggs (`EASTER`) e Áudio por Zona (tecla `N`)**.
8. **Placas de Cenário com Verso Sólido**:
   - Placas de velocidade, EPI, classificação, comboio, defensivos, gaiola de gás, DDS e dias sem acidente possuem verso sólido sem texto espelhado.
