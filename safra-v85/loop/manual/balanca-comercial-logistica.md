# SimpleFarm (GAtec/Senior): resumo da balança, comercialização e logística

Base: https://documentacao.senior.com.br/simplefarm/manual-do-usuario (versão 1.23 do manual, marcada como "Este manual encontra-se em construção").

Aviso de leitura: a maior parte das páginas de Balança e Comercialização traz só o menu e a nota de construção. Onde a página não diz algo, está escrito "não informado". Páginas que não puderam ser lidas (limite de requisições do site) estão marcadas como "não lido".

---

## 1. Balança (/balanca)

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/balanca

**O que acontece na operação real (para leigo):** a balança registra o peso das cargas que entram e saem da unidade (fazenda, usina, armazém ou porto). A página diz que o módulo centraliza as pesagens para que os dados sejam confiáveis e rastreáveis, ou seja, dá para saber de onde veio cada registro. Ele pode ser ligado a balanças, sistemas corporativos e outros módulos.

**Processos citados:** apontamentos de produção, recebimento, armazenagem, transferências, comercialização, consumo interno e expedição de materiais.

**Objetivos citados:** registrar pesagens com confiança, integrar dados entre equipamentos e sistemas, reduzir intervenções manuais e manter a rastreabilidade de cargas, veículos e ordens de serviço.

**Por que o caminhão pesa na entrada e na saída; tara, bruto e líquido:** a página principal não explica. Na subpágina Central de Processamento (ver item 1.3.e), a página diz: o bruto é o peso da carga com o veículo, a tara é o peso do veículo vazio, e o líquido é a diferença entre os dois (só a carga).

**Quem usa:** não informado.

**Fluxo passo a passo:** não informado na página principal.

**Integração com ERP (nota fiscal, contas a pagar/receber, estoque):** a página diz apenas que o módulo se integra a "sistemas ERP", sem detalhes. Nota fiscal, contas a pagar/receber e estoque: não informado.

### 1.1 Parametrizações (/balanca/parametrizacoes)

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/balanca/parametrizacoes

**O que acontece:** a página é só um índice de configurações iniciais que definem como a balança funciona. Não descreve operação. Itens do menu: Tela de Pesagem, Operações de Pesagem, Tipo de Equipamento, Tipo de Operador e Função, Módulo de Pesagem, Método de Pesagem, Integração, Operações de Colheita e Equipamento x Item de Análise.

**Quem usa:** não informado. **Passo a passo:** não informado. **ERP:** não informado.

#### 1.1.a Operações de Pesagem (/balanca/parametrizacoes/operacoes-de-pesagem), código BAL0101

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/balanca/parametrizacoes/operacoes-de-pesagem

**O que acontece:** tela de configuração onde a empresa escolhe como cada tipo de pesagem aparece para os usuários. O sistema já traz as operações prontas. Dá para trocar o nome exibido, mas não criar novas operações nem mudar o código interno.

**Operações listadas (agrupadas pelo tipo de movimento, que é uma leitura do nome, não uma classificação da página):**
- Entradas: Entrada por Compra; Apontamento de Produção; Apontamento de Produção Rateável (peso do caminhão dividido entre os itens); Armazenamento de Terceiro.
- Saídas: Saída por Venda; Saída para Consumo; Saída de Insumos; Baixa Extraordinária; Outras Saídas.
- Não classificadas pela página: Entrada e Saída; Retorno de Material; Transferência de Estoque.

**Integração com ERP:** a página cita o módulo Commerce, não um ERP. Três operações (Entrada por Compra, Armazenagem de Terceiro e Entrada por Industrialização) podem ser ligadas ao Commerce, e isso só sinaliza que a pesagem deve buscar dados lá.

**Quem usa:** não informado (fica no menu de parametrizações, o que sugere configuração).

**Passo a passo para ajustar um nome:** Balança > Parametrizações > Operações de Pesagem; localizar a operação; alterar o campo Descrição (código e nome padrão não mudam); Salvar.

**Passo a passo da pesagem em si:** não informado (fica na tela BAL0105, que não é descrita aqui).

#### 1.1.b Integração (/balanca/parametrizacoes/integracao), código BAL0122

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/balanca/parametrizacoes/integracao

**O que acontece:** configura como a balança recebe dados de sistemas externos, sobretudo o Solinftec, para que a pesagem aconteça com pouca digitação. Quando o veículo é identificado pelas estruturas de automação, o sistema consulta as integrações habilitadas e recupera caminhão, carretas, operadores, equipamentos e local de carregamento. Se algum dado não chegar, a tela define o que fazer para a operação não parar.

**Termos:** pesagem automática (sem digitação); escala de operador e equipamento (quem estava em cada equipamento em certo momento); contingência (plano alternativo quando a fonte principal falha); dados genéricos (cadastros padrão usados quando falta informação); integração auxiliar (fonte reserva).

**Quem configura:** não informado.

**Passo a passo resumido:**
1. Abrir Balança > Parametrizações > Integração.
2. Habilitar as integrações que receberão dados de campo.
3. Configurar rastreabilidade, validação e controle dos dados recebidos.
4. Definir o comportamento para falha de comunicação ou dado ausente.
5. Configurar a contingência (preenchimento automático de operadores pela escala, integrações auxiliares, permitir ou não dados genéricos, validações que bloqueiam ou liberam a pesagem).
6. Configurar a origem da carga (estrutura de locais, código de setor, fazenda, bloco e quadra, critério para achar a OS).
7. Configurar validações (mínimo de equipamentos na composição, regras de carregamento e transbordo).
8. Salvar em cada etapa.

Depois disso, o sistema pode concluir a pesagem sozinho, pedir intervenção manual ou impedir a conclusão até corrigir os dados.

**ERP (nota fiscal, contas a pagar/receber, estoque):** não informado. Solinftec é citado como fonte externa de dados de campo.

#### 1.1.c Demais itens de parametrização (Tela de Pesagem, Tipo de Equipamento, Tipo de Operador e Função, Módulo de Pesagem, Método de Pesagem, Operações de Colheita, Equipamento x Item de Análise)

**Situação:** links listados na página, conteúdo não lido nesta rodada. Não informado nesta versão do resumo.

### 1.2 Cadastro (/balanca/cadastro)

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/balanca/cadastro

**O que acontece:** a página principal só lista os cadastros: Análises, Tabela de Análises, Associação Tabela x Análise x Item, Análise por Item/Tipo/Tabela, Tolerância, Análise por Itens/Grupos/Tabelas, Grupo de Análise, Tipos da Composição de Pesagem, Escalas de Operadores e Equipamentos, Configuração do Tipo de Equipamento, Layout de Importação, TAG de Pesagem.

**Quem usa / fluxo / ERP:** não informado na página principal.

#### 1.2.a Análises (texto lido na página de Cadastro; a subpágina /balanca/cadastro/analises não foi lida)

**URL do texto lido:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/balanca/cadastro

**O que acontece:** quando um caminhão carregado chega à balança rodoviária para entregar soja ou milho, o sistema registra o peso e pode checar a qualidade. Se a qualidade ficar abaixo do esperado, o peso pago ao produtor é reduzido. Esses cadastros dizem ao sistema quais testes fazer e quanto descontar para cada produto em cada unidade.

**Termos:** ticket de pesagem (registro da pesagem); análise de balança (teste de qualidade, como umidade, impureza ou grãos avariados); peso líquido final (após descontos); Unidade de Produção (UP, local de recebimento ou expedição); tabela de análise (regras que ligam item, UP e análises); grupo de análise (análises com mesmas regras de obrigatoriedade, tolerância e impressão); tolerância (margem antes do desconto); faixas de notas ou graus (níveis de qualidade, cada um com percentual de desconto ou bonificação); desconto em cascata (descontos em sequência sobre o peso).

**Quem usa:** quem configura não informado. Quem pesa é o operador, que recebe a grade de qualidade carregada pelo sistema.

**Fluxo sem grupos:** cadastrar análises (ex.: umidade, impureza) > criar tabela de análise e associar às UPs (pode marcar uma como "Padrão") > vincular tabela, item e análises > definir faixas de qualidade e descontos (ou valores fixos) > confirmar a tabela na janela de operação.

**Fluxo com grupos:** cadastrar análises > criar grupos (dependências e impressão) > criar tabela por UP > associar tabela, item e análises > configurar itens de análise (item, grupo, tabela, faixas e percentuais) > definir tolerâncias > vincular a tabela na janela de configuração.

**Durante a pesagem:** o sistema captura o peso, identifica UP e item, busca a tabela, carrega a grade para o operador, consolida resultados (se houver grupos), aplica tolerâncias e descontos e atualiza o peso líquido do ticket.

**ERP:** não informado.

#### 1.2.b Tabela de Análises (/balanca/cadastro/tabela-de-analise), código BAL0095

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/balanca/cadastro/tabela-de-analise

**O que acontece:** a tabela é um conjunto de regras de qualidade. Define quais características da carga serão verificadas e como os resultados afetam o peso pago. Uma tabela pode representar uma cultura (soja, milho) ou os critérios de um comprador, que tem padrões próprios.

**Termos:** análise de qualidade (verificação feita na pesagem); tabela de análises (o roteiro de quais análises valem para um produto ou comprador); peso líquido (o peso que conta após os ajustes); Unidade Produtora (dona da tabela; só ela pode usá-la); marcador Tabela Padrão (tabela usada por padrão).

**Quem usa:** não informado de forma explícita. Pelo menu (Balança > Cadastro), o cadastro é feito por quem configura a balança.

**Passo a passo do cadastro:** Balança > Cadastro > Tabela de Análises > Adicionar > preencher Código (único), Descrição, marcadores Ativo e Tabela Padrão e Unidade Produtora > Salvar.

**Passo a passo da operação (como descrito):** a carga chega; o sistema identifica a tabela; a tabela indica os parâmetros a avaliar; os resultados afetam o peso líquido por descontos.

**Descontos e faixas:** a página diz que a tabela vincula análises, tolerâncias e percentuais, mas não explica o cálculo nem menciona faixas de qualidade (ficam em outras páginas).

**Exportar / Imprimir:** Exportar gera planilha Excel; Imprimir abre a impressão.

**ERP:** não informado.

#### 1.2.c Tag de Pesagem (/balanca/cadastro/tag-de-pesagem)

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/balanca/cadastro/tag-de-pesagem

**Situação:** não lido nesta rodada (limite de requisições). Na Central de Processamento, a página diz que a TAG de pesagem (RFID) é uma etiqueta que permite reconhecer o veículo automaticamente na balança.

#### 1.2.d Demais cadastros (Associação Tabela x Análise x Item; Análise por Item, Tipo e Tabela; Tolerância por Tabela, Item e Grupo; Análise por Itens, Grupos e Tabelas; Grupo de Análise; Tipos da Composição de Pesagem; Escalas de Operadores e Equipamentos; Configuração do Tipo de Equipamento; Layout de Importação)

**Situação:** links listados, conteúdo não lido nesta rodada, exceto o que aparece nos itens 1.2.a e 1.2.b.

### 1.3 Pesagem (/balanca/pesagem)

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/balanca/pesagem

**O que acontece:** a página é o índice da tela de pesagem. Descreve que a pesagem registra o peso de um item que entra ou sai. Menciona Monitor de Integração de Entrada e de Saída com a Solinftec, sem explicar.

**Subseções listadas:** Análise da Cana-de-Açúcar; Monitor de Integração de Entrada; Monitor de Integração de Saída; Exemplo; Pesagem; Transferência de OS; Monitor de Amostragem; Impressão de Etiqueta; Importação de Pesagem; Central de Processamento de Pesagens.

**Quem usa / fluxo / ERP:** não informado. A ordem sugerida pelo menu (parametrizar, cadastrar, pesar) é uma inferência, não está escrita na página.

#### 1.3.a Pesagem (/balanca/pesagem/pesagem), código BAL0105

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/balanca/pesagem/pesagem

**Situação:** a página traz só o título e a nota de construção. Não informado.

#### 1.3.b Análise da Cana-de-Açúcar (/balanca/pesagem/analise-da-cana-de-acucar)

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/balanca/pesagem/analise-da-cana-de-acucar

**O que acontece na operação real:** verifica a qualidade da cana que chega à usina. Os resultados ajudam a acompanhar a matéria-prima e a planejar a produção.

**Passo a passo:**
1. Sorteio: o sistema sorteia algumas cargas de caminhão para amostragem. As regras (quantidade mínima, percentuais) são definidas pela própria unidade. As demais cargas seguem o recebimento normal.
2. Coleta: em cada carga sorteada, uma sonda (haste metálica) retira material de vários pontos para a amostra representar a carga.
3. Envio: o material é separado e levado ao laboratório.
4. Análise: no laboratório extrai-se o caldo, usado nas análises; o resíduo sólido pode gerar informações complementares.
5. Indicadores: os resultados geram números de qualidade.
6. Uso: os números alimentam processos posteriores, como controle operacional e industrial.

**Indicadores:** BRIX (sólidos dissolvidos no caldo); LS (sacarose aparente); POL (sacarose na amostra); PBU (estimativa do teor de fibra); fibra (parte sólida, usada no cálculo); pureza (calculada a partir dos outros); ATR (Açúcar Total Recuperável, o principal indicador final: açúcar aproveitável na indústria, calculado a partir das análises e de outros cálculos).

**Quem usa:** não informado (cita só a unidade produtora). **Classificação da cana:** não informado. **Descontos ou pagamentos por qualidade:** não informado. **ERP:** não informado.

#### 1.3.c Monitor de Amostragem (/balanca/pesagem/monitor-de-amostragem), código BAL0106

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/balanca/pesagem/monitor-de-amostragem

**O que acontece:** tela para acompanhar as amostras de cargas que chegam à balança. Amostra é uma pequena porção separada para análise de qualidade da matéria-prima.

**Termos:** carga sorteada (escolhida pelo sistema para amostragem); Boletim Analítico (BA, documento que acompanha a amostra e registra o resultado do laboratório); ordem de serviço (OS, operação de transporte ou entrega ligada à carga); ficha de monitoramento (define a nova situação da amostra quando ela é cancelada).

**Quem usa:** "usuários", sem perfis detalhados. O BA registra o operador responsável.

**Passo a passo (como descrito):**
1. Na pesagem, o sistema sorteia cargas para amostragem.
2. As cargas sorteadas aparecem na tela com sua situação.
3. Aprovar (a amostra segue para laboratório) ou cancelar (quando há impedimento operacional; a situação muda pela ficha de monitoramento e o motivo é obrigatório).
4. Emitir ou reimprimir o BA (unidade produtora, código da viagem, carga sorteada, OS, veículo, operador, data, código de barras; campos para resultados e observações).
5. Registrar os resultados do laboratório no BA, associados à amostra certa.
6. Consultar a guia Avaliações, que resume por período a pesagem, o código do BA, a situação e o resultado.

**Condição:** a tela só aparece se o parâmetro "Ativar tela do monitor de amostragem" estiver habilitado.

**Classificação e descontos:** não informado (a página cita resultados laboratoriais, mas não diz como viram classificação ou desconto). **ERP:** não informado.

#### 1.3.d Exemplo (/balanca/pesagem/exemplo)

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/balanca/pesagem/exemplo

**Situação:** não lido nesta rodada (limite de requisições). Não informado.

#### 1.3.e Central de Processamento de Pesagens (/balanca/pesagem/central-processamento-pesagens), código BAL0179

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/balanca/pesagem/central-processamento-pesagens

**O que acontece:** tela que acompanha os tickets gerados quando um veículo passa pela balança. Cada ticket guarda os dados da pesagem e segue um fluxo até ser concluído ou dar problema.

**Termos:** ticket (número que identifica a pesagem); TAG de pesagem (RFID, reconhece o veículo sozinho); composição (conjunto de veículos; a Força Motriz é o veículo que puxa, como cavalo mecânico ou trator); bruto, tara e líquido (ver item 1).

**Quem usa:** não informado (fica em Balança > Pesagem).

**Passo a passo:**
1. Entrada: o veículo chega com a carga; a pesagem de entrada registra bruto, data e hora.
2. Descarga: a carga é descarregada usando o equipamento indicado no registro.
3. Saída: o veículo vazio é pesado de novo; registra tara, data e hora; o sistema calcula o líquido.
4. Ticket: o sistema gera o ticket com carga, motorista e composição; a identificação pode ser automática pela TAG.
5. Processamento, com status: Em processamento; Pendente (aguarda validação ou intervenção manual); Integrado (concluído); Erro (falha); Cancelado e Excluído.
6. Acompanhamento: filtrar por período e status, atualização automática opcional, Salvar.

**ERP:** a página cita um "Código" recebido de uma integração externa, sem nomear o sistema. Nota fiscal, contas a pagar/receber e estoque: não informado.

#### 1.3.f Demais subpáginas de Pesagem

Transferência de OS; Impressão de Etiqueta; Importação de Pesagem; Monitor de Integração de Entrada e de Saída (Solinftec): links listados, não lidos nesta rodada.

---

## 2. Comercialização (/comercializacao)

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/comercializacao

**O que é (para leigo):** o Commerce SF ajuda a vender a produção agrícola e gerir negócios de compra e venda de grãos, sementes e algodão. Organiza os negócios em contratos, define preços e volumes, registra detalhes de cada lote ou fardo e acompanha a entrega até o fechamento.

**Para quem é:** produtores e empresas de trading (compram e vendem commodities em grande volume).

**Recursos citados:** contratos com preço, volume e ágio ou deságio (ajuste de preço conforme qualidade); detalhamento por fardo ou lote (ex.: tipos visuais de algodão); contratos de compra, venda e intercompany (entre empresas do mesmo grupo); rastreamento logístico por instruções de embarque; relatórios, Recap de lotes e dashboards.

**Passo a passo:** não informado (visão geral).

**ERP:** notas fiscais são sincronizadas com o ERP. Contratos "A Fixar" (preço ainda não definido) dependem de integração com outros sistemas, sem nome. Contas a pagar/receber e estoque: não informado.

Subseções: Cadastros Básicos; Contratos; Embarque; Precificação; Logística.

### 2.1 Contratos (/comercializacao/contratos)

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/comercializacao/contratos

**O que acontece:** registra e acompanha acordos comerciais com produtores, clientes e parceiros. Guarda condições, volumes, prazos e preços e serve de base para acompanhar a execução.

**Termos citados:** antecipação (pagamento antes do prazo); pré-reserva de fardos (reserva antes da venda ou embarque); intercompany (entre empresas do mesmo grupo); NDF (contrato financeiro de diferença de câmbio, sem entrega física); preço a mercado (preço da cotação do momento); take-up (aparece só como "Layout Importação de Take-up").

**Quem usa:** não informado. **Passo a passo:** não informado na página principal. **ERP:** não informado.

Subseções: Associação de Notas de Entrada; Antecipação; Pré-Reserva de Fardos; Intercompany; NDF; Preço a Mercado; Painéis de Previsão de Despesas (portuárias, administrativas, de transporte); Termo de Contrato; Contratos.

#### 2.1.a Contratos (/comercializacao/contratos/contratos), código COM0206

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/comercializacao/contratos/contratos

**O que acontece (contrato físico de commodities):** acordo para comprar ou vender produto agrícola (no exemplo, principalmente algodão e outras commodities a granel) com entrega real. O módulo é o ponto de partida; a partir dele o sistema organiza entrega e pagamento.

**Quem usa:** produtores, tradings e cooperativas; um "responsável pelo contrato"; quem aprova as negociações (não detalhado).

**Passo a passo:**
1. Cadastro: código, cliente, datas de criação e vigência, tipo de contrato, status (Aberto ou Bloqueado), mercado (interno ou externo).
2. Preço e condições: preço fixo (já negociado) ou "a fixar" (depois, pelas cotações); campos de referência (bolsa, prêmio, câmbio); forma de pagamento; peso considerado (origem ou destino); qualidade; Incoterm (obrigatório); marcadores (ex.: transgênico, algodão certificado BCI).
3. Parâmetros financeiros: moedas (ex.: dólar para precificar e real para faturar) e prazos em dias úteis.
4. Itens: produto, quantidade, unidade e valor total, base para pedido, instrução de embarque, romaneio e notas fiscais.
5. Fixação de preço (se "a fixar"): cada componente (bolsa, prêmio) passa por fixações com status "a fixar", "trabalhando" ou "fixo"; podem ser agrupadas para preço médio; câmbio também pode ser fixado.
6. Pedido: criado só com o contrato completo; o contrato executa-se pelo pedido. "É pelo pedido que geralmente ocorrem as integrações com os ERPs do fluxo padrão." O ERP específico não é informado.
7. Logística: datas de entrega (quantidade em kg); parceiros (quem compra, recebe e é faturado); rota (base para frete); previsão de despesas (frete, administrativas, portuárias, corretagem), calculada por rota, Incoterm e despesas cadastradas, ou lançada manualmente.
8. Complementares: ocorrências (histórico, inclusive respostas de e-mails); termo de contrato (cláusulas); data fixa de pagamento (independente da nota fiscal, comum em soja e milho).
9. Antecipação e cessão de crédito (opcional): o SimpleFarm não movimenta dinheiro; disponibiliza as informações ao ERP, que gera títulos financeiros e abatimentos ligados às notas.
10. Vínculos: compra com venda (em granel, identifica a origem da carga); intercompany (precisa estar vinculado ao contrato de compra para gerar pedido a partir da instrução de embarque).
11. Take-up e fardos (algodão): take-up é o momento em que comprador e vendedor definem os lotes; pode haver ágio ou deságio pela classificação visual; obrigatório na compra, opcional na venda. Fardos e lotes podem ser adicionados individualmente (produtor) ou por lote (trading), ou importados em compras.

**ERP:** integração pelo pedido e pelo registro financeiro (ERP gera títulos e abatimentos de notas). Nota fiscal: sincronizada com o ERP (ver item 2). Estoque: não informado.

#### 2.1.b Antecipação (/comercializacao/contratos/antecipacao), código COM0403

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/comercializacao/contratos/antecipacao

**O que acontece:** adiantamento de valores ligado a contrato de comercialização. A tela registra, consulta e acompanha essas operações, que impactam o contrato.

**Termos:** tipo de antecipação (modelo cadastrado com regra financeira e dados de integração); cessão (transferência do direito de receber; não explicada em detalhe); favorecido (quem recebe o valor); interveniente/anuente (terceiro que participa sem receber); volume (KG) e valor total (calculado); cotação e valor convertido; marcador Cancelado.

**Quem usa:** não informado.

**Passo a passo:** Comercialização > Cadastros Básicos > Antecipação (a trilha da página também indica Contratos > Antecipação). Adicionar; preencher contrato, cliente, empresa, filial, datas de lançamento e vencimento, tipo de operação, moeda, cotação, volume e valor; na seção Cessão, informar favorecido e interveniente, se houver; Exportar (Excel) ou Imprimir.

**ERP:** possível integração "para controle financeiro", com campos Referência ERP (id devolvido pelo ERP) e Status ERP. Como é feita e quais ERPs: não informado.

**Não informado:** quem paga, quando e com que garantias; taxas, juros ou critérios além do valor total; perfis que cadastram ou aprovam.

#### 2.1.c NDF (/comercializacao/contratos/ndf)

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/comercializacao/contratos/ndf

**Situação:** não lido nesta rodada (limite de requisições). Conceito geral da página principal: NDF é contrato financeiro de diferença de câmbio, sem entrega física.

#### 2.1.d Preço a Mercado (/comercializacao/contratos/preco-a-mercado), código COM0987

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/comercializacao/contratos/preco-a-mercado

**O que acontece:** é o preço de referência para calcular negócios com preço ainda não definido (preço futuro e preço a fixar). A tela centraliza a visualização, conferência e manutenção desses preços usados na precificação do Commerce, evitando ajuste um a um.

**Termos:** base de preço (preço principal de referência); componente de precificação (base, diferencial ou prêmio); contrato (vincula o preço a um contrato, se necessário); projeto (agrupa preços); atribuir (liga o preço ao contexto operacional).

**Quem usa:** não informado.

**Passo a passo:** Comercialização > Contratos > Preço a Mercado; preencher filtros (tipo de contrato, base, componente, contrato opcional, projeto, período de/até); Buscar; ajustar o Valor; Atribuir ou Excluir (se as regras permitirem); para muitos valores, colar contratos e valores de outra fonte (importação); Salvar.

**ERP:** não informado.

#### 2.1.e Painéis de previsão de despesas e Termo de Contrato

Painel de Despesas Portuárias, Administrativas e de Transporte; Termo de Contrato; Intercompany; Pré-Reserva de Fardos; Associação de Notas de Entrada: links listados, não lidos nesta rodada.

### 2.2 Embarque (/comercializacao/embarque)

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/comercializacao/embarque

**Situação:** não lido nesta rodada (limite de requisições). Não informado.

#### 2.2.a Certificação de Peso (/comercializacao/embarque/certificacao-de-peso)

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/comercializacao/embarque/certificacao-de-peso

**Situação:** não lido nesta rodada. Não informado. (Nos Incoterms, a página cita "certificação de peso" como exemplo de despesa portuária.)

### 2.3 Precificação (/comercializacao/precificacao)

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/comercializacao/precificacao

**Situação:** não lido nesta rodada. Não informado. (O conceito de preço de referência aparece em Preço a Mercado, item 2.1.d.)

### 2.4 Logística (/comercializacao/logistica)

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/comercializacao/logistica

**O que acontece:** reúne dados de transporte e movimentação: percursos, portos, navios, referências a contratos de transporte, despesas previstas e condições comerciais internacionais.

**Termos:** incoterms (regras internacionais que definem quem paga cada custo e assume cada risco até certo ponto da viagem); porto (embarque e desembarque); navio; percurso; despesas de transporte (frete); despesas portuárias (movimentação e armazenagem no porto); despesas administrativas (gestão e documentação); tipo de despesa.

**Quem usa:** não informado. **Passo a passo:** não informado. **ERP:** não informado.

Subseções: Percurso; Previsão das Despesas Administrativas; Previsão das Despesas de Transporte; Previsão das Despesas Portuárias; Porto; Tipo de Despesa; Incoterms; Navio.

#### 2.4.a Incoterms (/comercializacao/logistica/incoterms), código COM0017

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/comercializacao/logistica/incoterms

**O que acontece:** cada Incoterm define quem paga o frete e outras despesas, em que ponto (origem ou destino) elas ocorrem e quais entram automaticamente no contrato.

**Termos:** marcador Frete (despesas de frete rodoviário); marcador Ativo (aparece nos fluxos); marcador Qualidade Destino (reavaliação no destino, que pode gerar penalização); despesas rodoviárias (frete, peso morto, pernoite); despesas portuárias (certificação de peso, despachante, estufagem); embarque e descarga (onde a despesa incide); despesas administrativas (comissão, corretagem).

**Quem usa:** não informado.

**Passo a passo:** Comercialização > Cadastros > Incoterms; Adicionar; Código, Descrição e Abreviação (pode usar padrões como FOB, CIF ou EXW, sem explicação na página); ativar marcadores; vincular despesas (portuárias: Embarque, Descarga ou ambos); Salvar.

**Como afeta a operação:** o marcador Frete muda a rota da instrução de embarque e cria demandas de frete (com o módulo de logística). Despesas só em Embarque são calculadas no porto de origem; só em Descarga, no de destino; em ambos, nos dois. As despesas previstas são enviadas ao contrato. Qualidade no destino, se ativa, pode gerar penalizações no contrato.

**ERP:** não informado (cita Commerce e logística).

#### 2.4.b Porto (/comercializacao/logistica/porto)

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/comercializacao/logistica/porto

**Situação:** não lido nesta rodada. Não informado.

#### 2.4.c Navio (/comercializacao/logistica/navio), código COM0023

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/comercializacao/logistica/navio

**O que acontece:** cadastro de apoio ao Commerce que guarda a identificação das embarcações usadas na exportação. Não faz cálculo nem aplica regra de negócio; é referência.

**Termos:** Instrução de Embarque (COM0301, documento que organiza o embarque no navio); nomeação de armazém e embarcação (indicação do armazém e do navio que vão receber a carga).

**Uso:** instrução de embarque externa; envio de informações do embarque por e-mail; nomeação de armazém e embarcação.

**Quem usa:** não informado.

**Passo a passo:** Comercialização > Logística > Navio; Adicionar; Código (único) e Descrição (nome ou identificação); Salvar. Exportar (Excel) e Imprimir.

**ERP:** não informado.

#### 2.4.d Demais subpáginas de Logística

Percurso; Previsão das Despesas Administrativas, de Transporte e Portuárias; Tipo de Despesa: links listados, não lidos nesta rodada.

### 2.5 Cadastros Básicos (/comercializacao/cadastros-basicos)

**Situação:** link listado, não lido nesta rodada.

---

## 3. Logística de Saída (/logistica-de-saida)

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/logistica-de-saida

**O que acontece:** organiza a movimentação dos produtos da fazenda ou unidade industrial até o cliente, armazém ou centro de distribuição.

**Termos:** logística de saída (atividades que levam o produto a quem vai recebê-lo); estoque (quantidade guardada e disponível); rastreabilidade (saber a origem e o caminho do produto).

**Fluxo (etapas citadas em geral, sem detalhe):** recebimento de pedidos; armazenamento; gestão de estoque; transporte; entrega final.

**Objetivos declarados:** acompanhar a movimentação até a entrega; controlar pedidos, estoques e transporte de forma integrada; garantir rastreabilidade e qualidade; reduzir tempo e custo logístico.

**Quem usa:** não informado. **Expedição, carregamento e nota fiscal:** não informado. **ERP (nota fiscal, contas a pagar/receber, estoque):** não informado. **Subseções:** não informado (sem itens filhos no menu).

---

## 4. Beneficiamento de Algodão (/beneficiamento-de-algodao)

**URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/beneficiamento-de-algodao

**O que acontece:** o beneficiamento é a etapa antes da industrialização do algodão. Serve para elevar a qualidade do produto final e, por consequência, o valor de venda.

**Objetivos citados:** ligar o beneficiamento à cadeia produtiva; melhorar a qualidade com processos padronizados; rastrear e controlar cada etapa; aumentar o valor de mercado; ganhar eficiência antes da industrialização.

**Fardo, pluma e caroço:** não informado na página (em termos gerais: pluma é a fibra, caroço é a semente, fardo é o pacote prensado da fibra). **Descontos:** não informado. **Passo a passo:** não informado. **Quem usa:** não informado. **ERP:** não informado. **Subseções:** nenhuma listada.

---

## Glossário

1. **Balança**: equipamento que mede o peso de caminhões e cargas.
2. **Pesagem**: registro do peso de uma carga que entra ou sai.
3. **Tara**: peso do veículo vazio.
4. **Peso bruto**: peso da carga somado ao veículo.
5. **Peso líquido**: peso só da carga, bruto menos tara.
6. **Ticket**: número ou registro que identifica uma pesagem.
7. **TAG de pesagem (RFID)**: etiqueta que identifica o veículo sozinha na balança.
8. **Amostragem**: retirada de uma pequena porção da carga para análise.
9. **Carga sorteada**: carga que o sistema escolhe para amostragem.
10. **Boletim Analítico (BA)**: documento que acompanha a amostra e registra o resultado do laboratório.
11. **Análise de qualidade**: teste de uma característica do produto (ex.: umidade, impureza).
12. **Tabela de análise**: conjunto de regras de quais análises valem para um produto ou comprador.
13. **Tolerância**: margem aceita antes de aplicar desconto.
14. **Faixas de notas (graus)**: níveis de qualidade, cada um com percentual de desconto ou bonificação.
15. **Desconto em cascata**: descontos aplicados em sequência sobre o peso.
16. **ATR (Açúcar Total Recuperável)**: indicador final da cana que mostra o açúcar aproveitável.
17. **Unidade de Produção (UP)**: local onde o produto é recebido ou expedido.
18. **Composição**: conjunto de veículos de um transporte; a Força Motriz é o veículo que puxa.
19. **Contrato físico**: acordo de compra ou venda com entrega real da mercadoria.
20. **Fixação de preço ("a fixar")**: definição posterior do preço, conforme cotações.
21. **Take-up**: momento em que comprador e vendedor definem os lotes da negociação.
22. **Fardo**: pacote prensado de algodão, usado para controlar venda.
23. **Ágio / deságio**: acréscimo ou desconto no preço conforme qualidade.
24. **Antecipação**: adiantamento de valores antes do prazo combinado.
25. **Cessão**: transferência do direito de receber valores.
26. **NDF (Non-Deliverable Forward)**: contrato financeiro de diferença de câmbio, sem entrega física.
27. **Preço a mercado**: preço de referência da cotação do momento.
28. **Incoterm**: regra internacional que define quem paga frete e assume risco até certo ponto.
29. **Instrução de Embarque**: documento que organiza o embarque da carga no navio.
30. **Intercompany**: negócio entre empresas do mesmo grupo.

---

## Ideias de cena para o jogo

1. **Caminhão sorteado para amostragem**: o motorista chega à balança com soja, o sistema sorteia a carga. Dor: a carga fica parada e o operador não sabe se pode liberar. Solução: a tela de monitor de amostragem mostra a carga sorteada e o operador aprova para laboratório, ou cancela com motivo registrado pela ficha de monitoramento.
2. **Umidade acima da tolerância no recebimento**: o caminhão de milho chega, a análise de umidade sai fora da faixa. Dor: o produtor discute o preço no pátio. Solução: a tabela de análise aplica a faixa de desconto cadastrada e o peso líquido do ticket já sai calculado.
3. **Caminhão que pesou só na entrada**: a balança perde o registro de saída e o ticket fica pendente. Dor: a carga não fecha e o veículo trava a fila. Solução: a Central de Processamento mostra o ticket com status Pendente para correção manual antes de integrar.
4. **Cana com ATR baixo na usina**: amostras de várias cargas dão indicador de açúcar abaixo do esperado. Dor: o planejamento de moagem fica no escuro. Solução: os resultados de BRIX, POL e ATR alimentam o controle operacional da unidade.
5. **Navio com incoterm que muda o custo do porto**: a despesa de certificação de peso está marcada só em Embarque, mas o comprador espera pagá-la no destino. Dor: divergência de custo entre contrato e embarque. Solução: o incoterm define se a despesa é calculada no porto de origem, no de destino ou em ambos, e as despesas previstas vão para o contrato.

---

## Páginas não lidas nesta rodada (limite de requisições do site)

- Balança > Pesagem > Exemplo (/balanca/pesagem/exemplo)
- Balança > Cadastro > Análises (/balanca/cadastro/analises): o texto do item 1.2.a veio da página de Cadastro, não desta subpágina
- Balança > Cadastro > Tag de Pesagem (/balanca/cadastro/tag-de-pesagem)
- Comercialização > Embarque (/comercializacao/embarque)
- Comercialização > Embarque > Certificação de Peso (/comercializacao/embarque/certificacao-de-peso)
- Comercialização > Precificação (/comercializacao/precificacao)
- Comercialização > Contratos > NDF (/comercializacao/contratos/ndf)
- Comercialização > Logística > Porto (/comercializacao/logistica/porto)

Nota: a página de Comercialização > Contratos (item 2.1) foi lida numa segunda tentativa, depois do limite; as demais páginas acima ficaram fora desta rodada.
