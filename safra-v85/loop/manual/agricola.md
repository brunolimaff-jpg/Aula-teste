# SimpleFarm: módulo Agrícola (resumo do manual)

Fonte base: https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola
Data da leitura: 2026-11-16. O próprio manual avisa que está "em construção", então parte das subpáginas pode estar incompleta.

Convenção: "não informado" = a página lida não diz. Termos sem definição na página aparecem como "não definido nas páginas lidas".

Falhas e limites da leitura:
- https://documentacao.senior.com.br/simplefarm (página raiz) retornou erro de cliente e não foi lida.
- https://documentacao.senior.com.br/simplefarm/manual-do-usuario/publico-alvo descreve segmentos de mercado (produtores de grãos de médio e grande porte, cooperativas, empresas de insumos e sementes, usinas sucroenergéticas e grupos produtores de cana), não perfis de usuário ou cargos.
- Cargos de quem executa cada tarefa quase nunca aparecem. Quando aparecem, estão marcados abaixo.

---

## Visão geral do módulo

**O que é na operação:** a página do módulo diz que ele é "indispensável para a gestão eficiente e integrada" das atividades de produção agrícola. Cobre planejamento e controle das atividades por meio de Ordens de Serviço, até a colheita dos resultados de produção de uma cultura. A página resume a lógica em três perguntas: Onde (estrutura de locais: unidade produtora e árvore de locais), Quando (estrutura de tempo: projeto e safra) e Quem (executor: mão de obra e maquinário).

**Quem usa (cargo):** não informado.

**Fluxo geral:** abre-se uma Ordem de Serviço (OS), que formaliza um processo que consome recursos produtivos. Antes disso, os cadastros do módulo precisam estar feitos.

**Integração com ERP:** a página diz que a OS garante "a integração das informações com o sistema ERP", sem detalhar estoque, compras, custos ou folha.

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola

---

## 1. Monitoramento

URL: https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/monitoramento

**O que é na operação:** registros feitos no campo por meio de "fichas dinâmicas", sobre qualidade das operações, pragas, plantas daninhas e perdas. Servem para decidir o que fazer em campo e no planejamento.

**Quem usa (cargo):** não informado para o módulo. Para o apontamento dinâmico, a página cita "usuários de campo".

**Fluxo (cadastros do submenu, na ordem em que aparecem):**
1. Cadastro de Motivos
2. Grupo de Classificação
3. Cadastro de Situação
4. Cadastro de Espécie e Item de Espécie
5. Tipo de Monitoramento
6. Fórmulas
7. Ficha de Monitoramento
8. Apontamento Dinâmico
9. Aprovação de Apontamento

A página não confirma que essa ordem é obrigatória.

**Subpágina 1: Apontamento Dinâmico** (https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/monitoramento/apontamento-dinamico)
- Tela onde se registram observações feitas no campo. O formato depende da ficha:
  - Dinâmico único: um conjunto de informações.
  - Dinâmico com pontos: botão (+) e uma grade com um lançamento por ponto.
  - Boletim de Análise de Cana: usado em usinas, em paralelo com balança e indústria.
- Pré-requisito: ficha cadastrada e parametrizada. Pode ser feito pelo SimpleFarm ou pela mobilidade Scouting.
- Cancelar um lançamento o torna inativo. O motivo é obrigatório.
- Passo a passo de preenchimento: não informado.

**Subpágina 2: Aprovação de Apontamento** (https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/monitoramento/aprovacao-de-apontamento)
- Controla quem pode voltar a alterar um apontamento já lançado.
- Fluxo: na Ficha de Monitoramento, marcar "Habilitar Controle de Liberação" e escolher os aprovadores. No apontamento, clicar em "Solicitar acesso". Os aprovadores recebem notificação e decidem.
- Após aprovação, o registro fica editável pelo prazo informado em "Data Final". "Bloquear Quando Editado" define se a permissão vale para uma única edição ou para várias dentro do período.
- Usado principalmente em boletins de pré e pós-colheita, para manter a integridade das informações.

**Termos:**
- Ficha de monitoramento: modelo que define os campos do apontamento.
- Apontamento dinâmico: registro de observação de campo.
- Espécie: alvo observado (a página não define o termo).
- Liberação: autorização para editar um registro já lançado.
- Scouting: mobilidade que também faz apontamentos.

**Integração com ERP:** não informado. A página cita apenas SimpleFarm e Scouting. Diz que o motivo de cancelamento vem preenchido quando chega por integração, sem nomear o sistema.

---

## 2. Culturas

URL: https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/culturas

**O que é na operação:** modela o ciclo de vida da cultura, do plantio até a colheita. Cada cultura cadastrada vira referência usada por outras telas.

**Quem usa (cargo):** não informado.

**Fluxo:** a página lista as telas do submenu (ciclo cultural, cultura, grupo de variedade, ciclo de maturação, variedade, espaçamento, categoria de semente, item x variedade, alteração automática de status). A ordem de uso não é descrita.

**Subpágina: Cultura (AGR0035)** (https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/culturas/cultura)
1. Aba Informações Básicas: código, descrição, abreviação e unidade de medida (obrigatórios). Salvar.
2. Só para perenes ou semi-perenes: aba Estágios da Cultura (adicionar e salvar).
3. Ainda nesses casos: aba Transição de Estágio (adicionar e salvar).
- Característica: anual precisa ser replantada após cada colheita; perene não precisa de novo plantio; semi-perene volta a crescer após a colheita.
- Cultura padrão: Cana-de-Açúcar, Algodão ou Arroz. Cada uma só pode estar ligada a uma cultura.
- Integrações citadas: Árvore de Processo, Transição de Cultura, Local, Manutenção de Cultura, Painel Gráfico de OS, Variedade, Lançamento de Estimativa, Unidade de Medida, Item e Unidade Produtora (para categoria de semente).

**Termos:**
- Cultura: planta cultivada que o sistema acompanha.
- Estágio da cultura: fase do desenvolvimento, com número de colheita e ciclo cultural (conceito não detalhado).
- Transição de estágio: mudança de um estágio para outro, com ou sem colheita.
- Fator de conversão: converte a unidade do item produzido para a unidade da cultura.
- Ciclo cultural (Ano, Ano e Meio, Formação, Soca): significado não informado.

**Integração com ERP:** não informado. A página cita apenas "integração com outros processos do sistema".

---

## 3. Estrutura de Tempo

URL: https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/estrutura-de-tempo

**O que é na operação:** organiza, planeja e analisa as atividades agrícolas no tempo. Define os ciclos produtivos e indica em que momento cada atividade ocorre, o que permite relatórios finais corretos e a divisão de trabalho e produção no tempo.

**Quem usa (cargo):** não informado.

**Fluxo:** não informado. A página diz que as estruturas são criadas conforme a rotina da propriedade.

**Regra para uso híbrido:** as safras devem caber em um período de 12 meses, entre o início e o fim do ano agrícola.

**Subpágina: Safra (AGR0014)** (https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/estrutura-de-tempo/safra)
1. Acessar Agrícola > Estrutura de Tempo > Safra.
2. Informações básicas: descrição, projeto, período da safra (início e fim) e período da colheita (início e fim).
3. Escolher o tipo padrão: Principal, Segunda Safra, Safra 5 a Safra 10, Cobertura ou Pecuária.
4. Em "Safra Vinculada", indicar se ela se relaciona com outra safra já cadastrada.
- Um projeto pode ter várias safras, e os períodos podem se sobrepor. Em monocultura costuma haver uma só safra, com o mesmo período do projeto.
- Cadastro de Safra é usado por todas as telas onde se fazem apontamentos.

**Subpágina: Ano Agrícola, Projeto** (não lidas em detalhe; links em https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/estrutura-de-tempo/ano-agricola e .../projeto).

**Termos:**
- Safra: período de produção de uma cultura, do plantio à colheita.
- Projeto: vinculado a uma área (a página de locais diz que é "período de planejamento").
- Ano agrícola: não definido nas páginas lidas (a página só o liga ao limite de 12 meses das safras).

**Integração com ERP:** a página diz que a estrutura "atende aos conceitos do sistema ERP", sem detalhar integração.

---

## 4. Estrutura de Locais

URL: https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/estrutura-de-locais

**O que é na operação:** a área física onde a cultura será implantada. Responde à pergunta "Onde?" para as operações produtivas. Pode ser dividida e parametrizada conforme a propriedade.

**Quem cadastra (cargo):** não informado.

**Fluxo (subpágina Local, AGR0023)** (https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/estrutura-de-locais/local):
1. Antes: parametrizar a estrutura na tela Gerais (ADM0001), e ter Projetos, Safras e Culturas cadastrados.
2. Preencher código, abreviação e descrição de cada nível acima do último.
3. No último nível (talhão): responsável, filial, propriedade rural. O campo "Ativo" vem desmarcado e precisa ser marcado.
4. Áreas: projeto, área líquida, carreador, área inútil, espaçamento e % mecanizável. Pelo menos um solo, marcado como predominante.
5. Distâncias (opcional, usadas em rotinas de Pagamentos), atributos (opcionais).
6. Culturas: projeto, safra e cultura, com área e dados de plantio. Obrigatório para começar a registrar movimentações do talhão por OS.
- Alternativa: importação por planilha (botão Importar Local). Se houver erro, nada é gravado até a correção.

**Tipos de local:** Agrícola (onde a produção acontece) e Outros (carreadores, lagos, áreas de preservação, cemitério de árvores).

**Árvore de locais:** Unidade Produtora > Tipo de Local > DIV1 > DIV2 > DIV3 > DIV4. O último nível, geralmente o talhão, é onde as movimentações são registradas. O número de níveis é definido em ADM0001.

**Subpáginas de apoio:** modalidade e propriedade rural, consulta analítica de talhão, distância, ambiente de produção, textura e solo, grupo de atributo, consulta e manutenção de locais, manutenção de cultura, transição da cultura.

**Termos:**
- Talhão: último nível da árvore, onde as movimentações agrícolas são registradas (a página diz que "comumente" tem esse nome).
- Unidade produtora: unidade que abriga a estrutura de locais (definição completa não informada).
- Propriedade rural: fazenda à qual o talhão pertence.
- Área líquida: parte efetivamente cultivável do talhão.
- Carreador: área de estradas e caminhos dentro do talhão.
- Área inútil: área não cultivável, como rochas ou preservação.
- Espaçamento: distância entre plantas, usada em perenes e semi-perenes.
- Ambiente de produção: não definido nas páginas lidas.

**Integração com ERP:** a página cita MAPFY (chave e coordenadas para mapas), Receituário Agronômico (coordenadas), Pagamentos (PAG0199: contratos e distâncias para valorizar serviços), Balança (categoria de semente nas pesagens) e Planejamento (data prevista de colheita). Integração com estoque, compras, custos e folha: não informado nesta página.

---

## 5. Meteorologia

URL: https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/meteorologia

**O que é na operação:** registro de dados do tempo coletados na fazenda (medições climáticas). A página diz que servem para planejar plantio e colheita, gerir a água e reduzir riscos de eventos extremos.

**Quem lança (cargo):** não informado.

**Fluxo (Dados Meteorológicos, AGR0119)** (https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/meteorologia/dados-meteorologicos):
- Digitação manual: unidade produtora, data, posto, aparelho, elemento, unidade e valor (aceita decimais com vírgula ou ponto, até duas casas). Salvar.
- Importação: guia de importação, escolher o elemento, enviar o arquivo. Formato do arquivo: não informado.
- Pode haver importação automática por estação meteorológica automática (sistema não nomeado).

**Subpáginas:** elementos meteorológicos, aparelhos meteorológicos, postos meteorológicos, dados meteorológicos, replicação de lançamentos, evapotranspiração tabular e balanço hídrico (URLs em https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/meteorologia/).

**Termos:**
- Posto meteorológico, aparelho meteorológico e elemento: definidos em subpáginas próprias, não nesta página.
- Balanço hídrico: tela onde a análise dos dados é feita, junto com painéis e relatórios.

**Integração com ERP:** não informado.

---

## 6. Estimativas

URL: https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/estimativas

**O que é na operação:** previsão de quanto cada área vai produzir na safra. Pode ser feita várias vezes durante a colheita, corrigindo a previsão conforme as análises. As previsões se baseiam em observação visual da lavoura, amostragens e previsões meteorológicas.

**Quem lança (cargo):** não informado.

**Fluxo (Lançamento de Estimativa, AGR0058)** (https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/estimativas/lancamento-de-estimativa):
1. Só é possível para talhões com status "Cultura em Crescimento", ou seja, com OS de plantio realizada e finalizada.
2. Adicionar; preencher unidade produtora, projeto, safra, grupo de estimativa, cultura, data (pode ser retroativa, não futura), finalidade (a mesma da OS de colheita do local), local, estágio (perenes), variedade e produtividade.
3. Salvar. A data prevista de colheita é calculada a partir do fim do plantio e dos dias de maturação da variedade.
- Regra: pelo menos uma estimativa precisa existir para o talhão entrar em uma OS de colheita. Sem ela não há colheita nem pesagem.
- Também aceita importação por planilha (layout não informado).

**Subpáginas:** grupo de estimativa, lançamento de estimativa, configurações de relatório.

**Termos:**
- Estimativa: previsão da produção do talhão na safra.
- Produtividade: quantidade por área (unidade de medida não informada).
- Safra: período agrícola ao qual o lançamento pertence (não definido formalmente).

**Integração com ERP:** não informado. Liga-se às OS de plantio (libera o talhão) e de colheita (exige estimativa).

---

## 7. Ordem de Serviço (OS)

URL: https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/ordem-de-servico

**O que é na operação:** a OS formaliza e documenta uma operação agrícola, ou seja, registra o que é feito no campo. Indica onde, quando, quem e quais ações. Exemplos citados: plantio, manejo de pragas, irrigação e aplicação de insumos, do preparo do solo até a pesagem.

**Como se organiza:** as atividades vêm de uma Árvore de Processo (ADM0043), que define a ordem de execução e a época de cada atividade por cultura. A OS detalha essas atividades em três dimensões: TEMPO, LOCAL e ATIVIDADE. Painel Gráfico da OS (AGR0090) é a tela central.

**Quem usa (cargo):** não informado.

**Fluxo (o que a página permite, sem sequência explícita):**
- Planejar: tipos, configurações e validações nas telas do submenu.
- Aprovar abertura: alçada de aprovação (configuração de quem aprova) e fila de OS para aprovação (ver subpágina).
- Executar e apontar: timesheet (horas de pessoas e máquinas) e retirada de produto (insumos do estoque).
- Cancelar: exige motivo de cancelamento; há log de alterações.
- Pré-requisito: cadastros anteriores do módulo agrícola precisam estar prontos.

**Subpáginas com fluxo detalhado:**

*Fila de O.S. para aprovação (AGR0660)* (https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/ordem-de-servico/fila-os-aprovacao)
1. Acessar Agrícola > Ordem de Serviço > Fila de O.S. para aprovação.
2. Filtrar por data inicial, data final, unidade produtora e tipo de aprovação.
3. Tipos: "Valida Carência de Colheita" (OS de colheita em área em carência) ou "Valida Abertura de Ordem de Serviço" (aprovação geral).
4. Aprovar, reprovar ou cancelar. O sistema verifica se o usuário tem permissão para a operação da árvore de processo.
5. Resultados: aprovada vira "aberta". Reprovada por carência vira "cancelada" (só histórico). Reprovada na abertura geral volta para "Cadastro em Andamento", para correção e novo envio.
6. Decisões vão para a guia "Aprovações Realizadas".
- Carência de colheita: período em que a área não pode ser colhida após a aplicação de um item (prazos não informados).
- Quem aprova (cargo): não informado. A página diz que é um usuário configurado para isso.

*Timesheet (AGR0095)* (https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/ordem-de-servico/timesheet)
- Registra horas de trabalho e de uso de máquinas numa fazenda.
- Passo a passo: Agrícola > Ordem de Serviço > Timesheet > Adicionar. Preencher unidade produtora, divisão, região e data, e salvar. Na grade, Adicionar cada registro: OS, equipe, funcionário, hora início e hora fim (cargo e status vêm automaticamente, horas são calculadas). Se houver equipamento: início e fim de uso e horímetro. Enviar para aprovação.
- Status de aprovação: Em preparação > Pendente de aprovação do gerente > Aprovação pendente > Aprovado, ou Desaprovado (volta para edição).
- Termos: horímetro (contador de horas de uso do equipamento); taxa de diferença (horas extras além do acordado, informadas à mão); rubrica salarial (tipo de pagamento, ADM0130); tipo e centro de custo (a quem o custo é atribuído).
- Integração com ERP: sim. Após lançamento e aprovação, os dados podem ir ao ERP. Sistema, frequência e campos: não informado.
- Quem usa (cargo): não informado. Certas ações exigem acesso configurado em "Permissão Timesheet" (ADM0055).

*Retirada de produto (AGR0093)* (https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/ordem-de-servico/retirada-de-produto)
- Registra a retirada de produtos do estoque para uma OS, e a devolução do que sobrou.
- Obrigatória quando o item tem "Utiliza Lote" marcado no cadastro (ADM0034). Opcional nos demais casos.
- Deve acontecer antes do lançamento da OS. Sem retirada, nenhuma quantidade entra no lançamento.
- Fluxo: verificar "Utiliza Lote" no item; abrir a OS no Painel Gráfico (AGR0090); associar o item na guia Recursos; fazer a entrada do produto (ADM0092); fazer a retirada (AGR0093); lançar a OS.
- Guia Informações básicas: data e funcionário (obrigatórios), observação.
- Guia Itens: OS (só as que previram recursos), item, local de estoque (só o já associado à OS), lote, quantidade solicitada (preenchida pela OS), quantidade retirada (menor ou igual à solicitada). Para devolução: quantidade devolvida (maior que zero, não pode passar da retirada) e data.
- Quem retira (cargo): não informado. Só se exige um funcionário cadastrado.
- Integração: a página não cita ERP. Se o estoque não é controlado pelo ERP (controle manual), é preciso fazer retirada e entrada (ADM0092). O estoque é consultado na retirada, mas a validação além da quantidade não é detalhada.

*Ordem de Serviço de Irrigação*: ver seção 11.

**Termos:**
- OS: documento que detalha e registra uma atividade agrícola a ser feita.
- Árvore de processo: lista ordenada de atividades de uma cultura, com época de execução.
- Alçada de aprovação: regra de quem aprova a abertura da OS (detalhes não informados).
- Recursos: produtos previstos para a OS (definição não informada).
- Lote: grupo de um mesmo produto que deu entrada no estoque, controlado separadamente.
- Local de estoque: onde o produto fica armazenado (ADM0050).

**Integração com ERP:** a página diz que a OS garante a integração com o ERP. Estoque, compras, custos e folha: não informado nesta página. Retirada e timesheet trazem integração específica, descrita acima.

---

## 8. Receituário Agronômico

URL: https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/receituario-agronomico

**O que é na operação:** documento gerencial que prescreve o uso de defensivos agrícolas (produtos de proteção da lavoura). A página diz que a emissão é obrigatória para produtos controlados. A receita é gerada a partir de uma OS.

**Quem usa (cargo):** o agrônomo responsável (cadastrado em AGR0265) aparece como responsável pelo receituário e pela ART. Para aprovar, o usuário precisa estar ligado a um funcionário (ADM0052). Quem emite de fato: não informado.

**Fluxo (subpágina Receituário Agronômico, AGR0267)** (https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/receituario-agronomico/receituario-agronomico):
1. Geração: não é possível criar manualmente. Nasce de uma OS, pelo atalho de emissão no Painel Gráfico (AGR0090), que depende do parâmetro ADM0088. Campos vêm da OS (unidade produtora, propriedade rural, projeto, área e cultura).
2. Cabeçalho: código e data (automáticos), agrônomo, ART e local de emissão (vêm do cadastro do agrônomo), representante (obrigatório, o que representa não é explicado).
3. Status: Incompleto (não salvo), Aberto (salvo, não emitido), Emitido (enviado ao CREA).
4. Itens: produto (ADM0034), número e quantidade de aplicações, dosagem recomendada, sistema de aplicação (ADM0049), época de aplicação (AGR0264) e diagnóstico (AGR0262, opcional).
5. Aprovação (se o parâmetro estiver ativo): receitas automáticas ficam Pendentes. Só o agrônomo logado aprova as linhas em que é responsável. Aprovação em lote ou linha a linha. Sem aprovação, o botão Emitir fica indisponível.
6. Mapa (opcional): botão Gerar Mapa cria a imagem da área a partir do Mapfy. Não se aplica a Emitidos ou Cancelados.
7. Emissão: só receitas Aprovadas são emitidas. Ao emitir, "Enviado CREA" é marcado automaticamente.
8. Visualização: gera PDF por bloco ou por produto, podendo incluir geolocalização do primeiro talhão e as páginas da OS.

**Termos:**
- Defensivo agrícola: produto usado para proteger a lavoura.
- Produto controlado: produto para o qual a receita é obrigatória (não definido).
- ART: documento técnico cadastrado em AGR0266 (significado da sigla não informado).
- CREA: conselho para o qual o receituário é enviado (não explicado).
- Dosagem: quantidade recomendada por área.
- Época de aplicação: momento indicado para aplicar.
- Diagnóstico: problema que o produto trata (AGR0262).
- Bloco: terceiro nível do local, usado para separar PDFs.
- Princípio ativo: aparece só no menu, sem definição nas páginas lidas.

**Integração com ERP:** não informado para o ERP. Integrações citadas: Mapfy (mapa), e cadastros de agrônomo, ART, propriedade rural, projeto, item, sistema de aplicação, diagnóstico, época e usuário.

---

## 9. Mão de Obra

URL: https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/mao-de-obra

**O que é na operação:** controla serviços feitos por trabalhadores rurícolas (trabalhadores do campo). Registra os serviços, valoriza a produção de cada trabalhador e controla eventos como faltas, folgas e DSR.

**Quem usa (cargo):** não informado. Quem aponta produção: não informado (a página sobre o apontamento não cita cargo).

**Fluxo:** a página lista funcionalidades, sem sequência. Três funções centrais: consolidar apontamentos de produção no período de competência; controlar faltas, folgas, DSR e complemento de diárias; registrar o que foi feito, quando, onde e em qual OS.

**Subpágina: Apontamento de Produção (AGR0087)** (https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/mao-de-obra/apontamento-de-producao)
- Pré-requisitos: OS criada (AGR0090); operação e unidade de medida vinculadas (ADM0041); parâmetros da operação (AGR0228); tabela de valorização (AGR0085) e formação de preço (AGR0227); equipe (ADM0048); funcionário com equipe e tipo definidos.
- Quem é apontado: funcionários Tarefeiros (T) ou Mensalistas (M), classificação no cadastro do funcionário (ADM0025).
- Passo a passo: Agrícola > Mão de Obra > Apontamento de Produção > Adicionar. Preencher unidade produtora, projeto, período, serviço, data, OS, local, processo (com subprocesso, grupo de operação e operação), unidade de medida, tabela, faixa e preço, equipe, funcionário, quantidade e horas. Clicar em "+" para incluir na grade (coluna Total = quantidade x preço). Repetir e salvar.
- Pode ser feito também pelo app Mobile SimpleFarm.
- Termos: rateio (divisão de quantidade e horas entre locais conforme a área); lote de processamento e consolidado (depois de consolidado, só se edita excluindo o lote).

**Subpágina: Ponto Eletrônico (AGR0229)** (https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/mao-de-obra/ponto-eletronico)
- Guarda entrada e saída dos funcionários. A página diz que o registro é feito pelo funcionário e que os dados chegam do ERP por uma rotina de integração.
- Campos: unidade produtora, funcionário, entrada, saída e data de referência (obrigatórios). Horas trabalhadas são calculadas.
- Parâmetro ADM0088 (PayGenerateAbscenceBase) define a base da Rotina de Faltas: apontamento de produção (AGR0087), ponto eletrônico (AGR0229) ou os dois.
- Faltas e presenças podem ser consultadas no relatório "Apontamento de Ponto do Colaborador".

**Outras subpáginas:** competência, parâmetros de mão de obra e de operações, tabela de valorização, formação de preços, escala de trabalho, afastamentos, eventos, cálculos, executar rotinas, manutenção de cálculos, painel de mão de obra rurícola.

**Termos:**
- DSR: Descanso Semanal Remunerado (sigla citada pela página, sem definição).
- Competência: período de referência da folha (não detalhado).
- Falta: ausência que pode gerar desconto no pagamento.
- Tarefeiro (T) e mensalista (M): tipos de pagamento do funcionário.
- Tabela de valorização: tabela de preços pagos pelo serviço.
- Rubrica salarial: ver Timesheet.

**Integração com ERP e folha:** a página diz que os dados são integrados ao ERP e usados na folha de pagamento, sem detalhar sistema ou campos. Para custos, os apontamentos compõem o custo das atividades e culturas por rateio de horas, sem detalhe contábil. Módulo de Custos: integração para controlar valor por hora das atividades.

---

## 10. Mapas (Mapfy)

URL: https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/mapas/mapfy

**O que é na operação:** o Mapfy transforma dados complexos em mapas para apoiar decisões. A página não descreve o uso no dia a dia da fazenda.

**Quem usa (cargo):** não informado.

**Recursos citados:** mapas temáticos; acesso pela web e pelo app mobile; importação de bancos, planilhas e arquivos; mapas de calor, de pontos e de caminhamento; alertas por e-mail e WhatsApp quando variáveis atingem valores definidos; gestão e análise de ocorrências; formulários dinâmicos para coleta de dados.

**Configuração (subpágina)** (https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/mapas/configuracoes-mapa-de-local):
1. Pré-requisito: parâmetros do MAPFY na tela ADM0088.
2. Acessar Agrícola > Mapas > Configuração Mapa de Local - MAPFY (AGR0670).
3. Informações básicas: tipo de local (agrícola ou outros), nível do MAPFY usado como mapa, níveis da árvore de locais que formam a chave, máscara de dígitos por nível e separador. Salvar.
4. Aba Projeto: associar cada projeto a um nível do MAPFY. Projeto novo aparece automaticamente.
5. Atualizar o mapa do projeto pelo ícone de mapa, com confirmação. Alterações no MAPFY são sincronizadas com o SimpleFarm.
- Atenção: a máscara deve ter pelo menos o tamanho máximo do campo em Local, para evitar chaves duplicadas. Mapa importado sem o mesmo campo não pode ser usado no SimpleFarm.

**Termos:**
- Chave MAPFY: identificador formado pelos níveis escolhidos, para enriquecer camadas.
- Máscara: quantidade de dígitos reservada por nível da chave.
- Mapa de calor: concentração ou intensidade por cores.
- Caminhamento: mapa de um trajeto percorrido.
- Camadas enriquecidas: camadas geográficas combinadas com dados de outros sistemas.
- SHP, KML, GeoJSON, GPX: formatos de arquivo com dados geográficos.
- Raster: imagem georreferenciada, como foto de satélite.

**Integração com ERP:** não informado. A página diz que as camadas podem ser enriquecidas com "diversos sistemas de informação", sem nomear. Integra com Scouting, Local (aba Mapas) e OS (aba Local).

---

## 11. Irrigação

URL: https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/irrigacao

**O que é na operação:** irrigação é a aplicação artificial de água no solo em intervalos e quantidades definidos. O módulo controla equipamentos e fontes de água, registra as irrigações, mede consumo e avalia a eficiência do uso da água. A página informa que a irrigação responde por cerca de 20% da área agricultável, 40% da produção agrícola e 70% da captação global de água doce.

**Quem usa (cargo):** não informado.

**Fluxo (ordem do menu, não confirmada como obrigatória):** conceitos básicos; cadastros básicos; cadastro de equipamentos; cadastro de recursos hídricos; fluxo geral de movimentação; ordens de serviço de irrigação; árvores de projetos de irrigação; informes diários (captação, irrigação fixa e móvel); relatórios.

**Subpágina: Ordem de Serviço de Irrigação (OSI)** (https://documentacao.senior.com.br/simplefarm/manual-do-usuario/agricola/irrigacao/ordem-de-servico-irrigacao)
- Registra formalmente um comando que antes era verbal. Define fonte de água, equipe, operação, item e lâminas, e depois recebe o registro da área realizada.
- Dois tipos: sem projeto (locais no fluxo padrão, informes não consideram alocação de equipamentos) e com projeto (usa a Árvore de Projetos de Irrigação, com irrigação móvel ou fixa).
- Passo a passo: abrir a OSI na AGR0090; preencher a aba Irrigação (fonte, número de homens, operação, item, lâminas); preencher em massa pelo ícone de varinha; adicionar operações secundárias (ex.: transporte de vinhaça); no caso com projeto, selecionar setores na árvore (vazão e homens para móveis; fonte, operação e item para fixos); lançar a área realizada (não se aplica a fixos), que rateia os volumes dos informes; ajustar áreas por talhão pela coluna "saldo de área".
- Execução parcial: não permitida em sistemas fixos, permitida em móveis.

**Termos:**
- Consuntivo: água usada que não retorna à bacia de captação.
- Lâmina de irrigação: medida de consumo por linha (definição não informada).
- Informe diário: registro diário que gera volumes (conteúdo não detalhado).
- AP (Árvore de Projetos de Irrigação): reúne infraestrutura, recursos hídricos e áreas de um projeto.
- Área de comando: área atendida por um nó da AP.
- Vazão: valor de sistemas móveis, usado para estimar horas produtivas (unidade não definida).
- Saldo de área: soma das áreas de lançamentos anteriores e da área atual.

**Integração com ERP:** não informado. Só módulos internos (AP e informes).

---

## Glossário de campo

1. **Talhão:** menor pedaço da fazenda onde se planta e se registra movimento; é o último nível da árvore de locais.
2. **Unidade produtora:** unidade operacional que abriga a estrutura de locais.
3. **Propriedade rural:** a fazenda à qual o talhão pertence.
4. **Árvore de locais:** hierarquia da fazenda, do mais amplo ao mais específico.
5. **Área líquida:** parte do talhão que realmente pode ser cultivada.
6. **Carreador:** faixa de estrada ou caminho dentro do talhão.
7. **Área inútil:** trecho que não se cultiva, como rocha ou área de preservação.
8. **Projeto:** período de planejamento ligado à área do talhão.
9. **Safra:** período de produção de uma cultura, do plantio à colheita.
10. **Ano agrícola:** período de 12 meses que limita as safras (definição não informada).
11. **Cultura:** planta cultivada, por exemplo cana, algodão ou arroz.
12. **Variedade:** tipo específico (cultivar) dentro de uma cultura.
13. **Perene / semi-perene / anual:** conforme a planta precisa ou não de novo plantio após a colheita.
14. **Estimativa:** previsão de quanto o talhão vai produzir na safra.
15. **Produtividade:** quantidade produzida por área.
16. **Ordem de Serviço (OS):** documento que registra o que será feito no campo, onde, quando e por quem.
17. **Árvore de processo:** sequência padrão de atividades de uma cultura, com a época de cada uma.
18. **Carência de colheita:** tempo após a aplicação de um produto em que a área não pode ser colhida.
19. **Timesheet:** registro de horas de pessoas e máquinas numa OS.
20. **Horímetro:** contador de horas de uso de um equipamento.
21. **Apontamento de produção:** lançamento do trabalho feito por um trabalhador, para pagamento ou custo.
22. **Tarefeiro / mensalista:** trabalhador pago por tarefa ou por mês.
23. **DSR:** Descanso Semanal Remunerado.
24. **Falta:** ausência do trabalhador, que pode gerar desconto.
25. **Retirada de produto:** saída de insumo do estoque para uma OS.
26. **Lote:** grupo de um mesmo produto que entrou no estoque junto, controlado separadamente.
27. **Defensivo agrícola:** produto usado para proteger a lavoura de pragas e doenças.
28. **Receituário agronômico:** documento que prescreve defensivo, obrigatório para produto controlado.
29. **ART:** documento técnico do responsável pela receita (sigla não explicada na página).
30. **Lâmina de irrigação:** quantidade de água aplicada por irrigação.

---

## Ideias de cena para o jogo

1. **O tratorista sem insumo no sistema.** Um aplicador vai pulverizar um talhão, mas a OS não aceita a quantidade porque a retirada do produto não foi feita antes do lançamento. Dor: a OS trava. Solução: fazer a retirada (com lote, se o item exige) e só depois lançar a OS.

2. **A colheita que não pode sair.** Uma OS de colheita é aberta num talhão que recebeu aplicação há pouco tempo. A fila de aprovação mostra a carência. Dor: a colheita parada e a dúvida se a OS foi cancelada. Solução: a fila reprova a OS por carência, que vira "cancelada" e fica só como histórico.

3. **Horas que não batem com a máquina.** O gerente recebe timesheets de trator e de operadores, mas o horímetro não confere com o uso. Dor: a aprovação atrasa e o custo sai errado. Solução: o registro passa por Em preparação, Pendente de aprovação do gerente, Aprovação pendente e Aprovado, e quem reprova devolve para edição.

4. **Receita de produto controlado sem agrônomo.** Um produto controlado vai ser aplicado, mas o receituário ainda está pendente. Dor: o botão Emitir fica bloqueado e a aplicação espera. Solução: o agrônomo responsável aprova só as linhas em que é o responsável, e só então a receita é emitida e marcada como enviada ao CREA.

5. **Folha que depende de qual registro vale.** O fechamento de faltas dá resultado diferente conforme a base configurada: apontamento de produção, ponto eletrônico ou os dois. Dor: dois registros de horas não batem e o funcionário questiona o desconto. Solução: a base do cálculo de faltas é um parâmetro, e o relatório de apontamento de ponto mostra presenças e faltas.

---

Páginas lidas: 29 chamadas de WebFetch (1 falhou: /simplefarm; 1 de público-alvo; 1 de agrícola; 11 seções; 15 subpáginas, incluindo timesheet, fila de aprovação, retirada de produto, apontamento dinâmico, aprovação de apontamento, local, safra, apontamento de produção, ponto eletrônico, receituário, OSI, cultura, dados meteorológicos, lançamento de estimativa e configuração do mapa Mapfy).
