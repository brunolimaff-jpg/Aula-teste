# História do loop: Um Dia de Safra

Arquivo: `/home/claude/s6f/loop/historia/data__historia.js`. Cada constante é global (`const NOME = ...;`), sem import ou export. Carregar depois de `data__safraData.js` ou antes, sem conflito de nomes. Nomes usados aqui: ABERTURA, FISCAL, REGRAS_CRACHA, CODEX, MIRANTES, DEVOLUTIVA, CONQUISTAS, NIVEIS_HISTORIA. Nenhum deles existe em data__safraData.js (ATOS, PARADAS, CONVERSAS, DIRETOR, NIVEIS, SINAIS, EVIDENCIAS, EASTER, PONTA_A_PONTA).

Validação: `node --check` passou numa cópia `.cjs` (em /tmp). Carregado junto com `data__safraData.js`, todos os ids de `ref` existem (paradas, easter eggs e evidências), e todos os ids de mirante em `codex` e `revela` existem. Não foi rodado o portão nem a tela do jogo.

Convenção de fonte: `'manual'` = dito nos manuais de loop/manual/ (SimpleFarm, GAtec, integração). `'geral'` = conhecimento geral seguro de operação sucroenergética. Quando a sigla ou o termo vem de fora do manual (ART, VHP, NR-31), a explicação é geral e o verbete fica `'manual'` se o corpo veio do manual.

## Resumo das constantes

### ABERTURA (reunião inicial com o Dr. Augusto)
- 7 falas base em `falas`, formato `[quem, fala]`. A última é a regra: "Se a minha equipe reclamar de você, a visita acaba."
- `porNivel` tem falas extras, inseridas depois da 3ª fala base (`apos: 3`):
  - trainee: 2 falas (Helena como guia, tablet com dicas).
  - executivo: 1 fala neutra.
  - especialista: 2 falas (cético, até 17h30, Valdemar acompanha de perto).

### FISCAL (Valdemar, gerente de operações)
- `nome`, `cargo`, `anosDeUsina` (28), `perfil`, `descricaoAvatar`, `avatar` (base, capacete, colete, acessório).
- `bordoes`: 5 falas. Uma delas é "Vendedor só quer vender. Eu quero moer."
- `avisos`: 3 níveis com 3 falas cada. Nível 1 traz "Tô de olho." como primeira variação.
- `expulsao`: 4 falas. Ele pede o crachá e manda a portaria acompanhar.
- `gatilhos`: 7 itens, cada um com `id`, `erro`, `efeito` (`'advertencia'` ou `'expulsao'`) e `fala`. Os erros de segurança (pista com caminhão, sair da área) são expulsão direta.
- `elogios`: 3 falas raras.
- `retorno`: `fala` ("Segunda chance. Não tem terceira.") e `cena`.

### REGRAS_CRACHA
- `advertenciasAteExpulsao`: trainee 4, executivo 3, especialista 2.
- `penalidadePontosExpulsao`: trainee -10, executivo -20, especialista -30. Sugestão de balanceamento.
- `oQueAcontece`: lista em texto. `consequencias` em campos: volta para a portaria, zera a confiança da parada atual, avança 30 min.
- `limiteExpulsoesAntesFimDeVisita`: trainee `null` (sem limite), executivo 2, especialista 1.
- `textoFimDeVisita` e `licao` (2 frases).

### CODEX (Caderno de Campo)
- 46 verbetes. Contagem: `fonte: 'manual'` 29, `fonte: 'geral'` 17.
- Campos: `id`, `categoria`, `titulo`, `texto`, `senior` (frase ou `null`), `desbloqueio` (`tipo` e `ref`), `fonte`.
- Tipos de desbloqueio:
  - `parada`: ref é id de PARADAS.
  - `conversa`: ref é id de PARADAS, liberado ao concluir a conversa.
  - `evidencia`: ref é id de EVIDENCIAS (`ev-...`). Não estava na lista do pedido, mas é o que faz sentido.
  - `egg`: ref é id de EASTER.
  - `lugar`: ref é `{x, z, r}`. Para cada lugar, x é o da parada correspondente e z fica dentro de ±6 de `lado * 10.5`.
- Itens extras além da lista: Carência de colheita e CIPA. A lista do pedido tinha 44 itens; o total ficou em 46.
- Os textos de `senior` usam só nomes do portfolio.md. Ex.: Gestão de Acesso e Segurança, Operis YMS, Commerce, Commerce Log, Gestão Industrial, Laboratório, SimpleFarm, MobAgro, Shield, Mapfy, TMS, WMS, Oneclick, HCM, MAC.

### MIRANTES (3 pontos de vista)
- Torre da caixa-d’água (sede): desbloqueia 4 verbetes, revela geo, agri, auto.
- Passarela da indústria: desbloqueia 7 verbetes, revela orig, ind, arm.
- Cais do porto: desbloqueia 8 verbetes, revela custo, erp, com.
- Cada um tem `id`, `nome`, `x`, `z`, `texto` (2 frases), `codex` e `revela`.

### DEVOLUTIVA (reunião presencial com o Dr. Augusto)
- `aberturaPorNivel`: 1 fala por nível.
- `perguntas`: 3 perguntas duras. Cada uma tem 3 respostas (`tipo`: boa, morna, ruim). Cada resposta tem `texto` e `reacao` do diretor.
- `comentarioAdvertencias`: chaves `'0'`, `'1'`, `'2+'`. Uma fala por quantidade de advertências do dia.
- `finais`: 3 itens (`contrato_diagnostico`, `manda_proposta`, `visita_encerrada`), cada um com `criterio` e `texto`.

### CONQUISTAS
- 10 medalhas com `id`, `nome`, `criterio` objetivo e `frase`.
- Dependem de dados que já existem no jogo: conversas, advertências, verbetes, mirantes, evidências, expulsão, devolutiva, PONTA_A_PONTA (6 fases) e o easter `cafe`.

### NIVEIS_HISTORIA
- Chaves `trainee`, `executivo`, `especialista`. Campos:
  - `quemAcompanha`, `relogioLimite` (18h00, 18h00, 17h30).
  - `toleranciaValdemar`, `advertenciasAteExpulsao`, `expulsoesAteFimDeVisita`.
  - `dicas` (só trainee), `doresParaAceitarDevolutiva` (6, 8, 10), `objecoesNaDevolutiva` (0, 1, 3).

## Para implementar

1. Carregar o arquivo junto com o roteiro. Não mexer em nenhum nome de data__safraData.js.
2. Abertura: mostrar as 7 falas base. Logo depois da 3ª, inserir as falas de `porNivel` do nível escolhido. Ao final, o jogador segue para o mapeamento.
3. Valdemar: ao cometer um erro do `gatilhos`, mostrar a `fala` do gatilho e aplicar o `efeito`. Advertência usa a próxima fala de `avisos` do nível correspondente, na ordem (1ª, 2ª, 3ª). Expulsão mostra uma fala de `expulsao` (sorteada) e aplica as `REGRAS_CRACHA`.
4. Contagem de advertências por nível. Ao chegar em `advertenciasAteExpulsao`, a próxima infração vira expulsão.
5. Expulsão: volta para a portaria da sede, zera a confiança da parada atual, avança 30 minutos e desconta a penalidade de pontos. Se o nível tiver limite de expulsões e ele for atingido, mostrar `textoFimDeVisita` e `licao` e encerrar a visita.
6. Retorno após expulsão: mostrar `retorno.fala` e `retorno.cena` na portaria. Vale só para quem ainda não atingiu o limite.
7. Caderno de Campo: liberar cada verbete quando o `desbloqueio` acontecer. Para `lugar`, verificar a distância até o ponto (r). Para `egg`, verificar se o easter foi encontrado. Para `evidencia`, verificar se a evidência foi registrada.
8. Mirantes: ao chegar ao ponto (x, z), liberar os verbetes de `codex` e revelar as paradas de `revela` no mapa e na bússola.
9. Devolutiva: só abre se as dores mapeadas atingirem `doresParaAceitarDevolutiva` do nível. Mostrar a abertura do nível. Fazer as 3 perguntas. A cada resposta, mostrar a `reacao`. No fim, conferir `comentarioAdvertencias` pela quantidade de advertências. Escolher o final pelo `criterio`.
10. Objeções da devolutiva: o especialista tem 3. Usar as objeções do DIRETOR já existentes no roteiro, sem texto novo.
11. Conquistas: conferir o `criterio` ao fim da visita e mostrar a `frase` quando desbloquear.
12. Os valores de penalidade de pontos e de horário são sugestão. Ajustar em teste.

## Pontos em aberto

- Os nomes e cargos novos (Valdemar, Helena como guia) foram sugeridos. O cliente pode trocar.
- A penalidade de pontos e o horário limite são sugestão de balanceamento.
- Verbetes com `fonte: 'geral'` não vieram dos manuais. Vale revisar com a equipe de operação antes do piloto.
- O mapa de locais usa coordenadas plausíveis. Ajustar quando o cenário estiver fechado.
- A tabela de penalidade, o horário e as falas de Valdemar não têm números de mercado.
