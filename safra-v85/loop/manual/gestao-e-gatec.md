# Gestão e GAtec: resumo de leitura (manual SimpleFarm + site gatec.com.br)

Data da leitura: 2026-11-16. Método: WebFetch página a página, com pergunta fixa de extração. Só o que as páginas dizem; onde faltou, está "não informado".

Limites da leitura:
- Várias páginas do manual trazem o aviso "Este manual encontra-se em construção". Nelas o conteúdo é pouco ou nada.
- Orçamento de 35 chamadas. Ficaram sem leitura direta: subpáginas "Manutenção de cálculo" (Pagamentos), "Valores dos segmentos", "Configurações da tabela de regras", "Valorização manual de item", subpágina "CPG - Manutenção de cálculo", a página SimpleViewer e a landing de Automação do site gatec.com.br, e /solucoes/ do site.
- OneClick não tem página própria listada no site gatec.com.br. A descrição vem da página "gatec-home" do manual.
- Uma página (segmentos-contabeis) falhou por limite de taxa na primeira tentativa e foi lida na segunda.

---

## Parte A: Manual do usuário SimpleFarm

Base: https://documentacao.senior.com.br/simplefarm/manual-do-usuario

### A1. Manutenção Automotiva
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/manutencao-automotiva
- **Na operação real:** controla a manutenção da frota de tratores, colhedoras, pulverizadores e caminhões. Registra abastecimentos e reparos, planeja paradas e acompanha custo e disponibilidade das máquinas. Também indica quando vale renovar a frota.
- **Quem usa:** não informado.
- **Fluxo passo a passo:** não informado nesta página. O cadastro aparece nas subpáginas de Equipamentos (A1.1 a A1.4).
- **Termos:** preventiva é a manutenção programada; a página cita manutenção "primária, preventiva, corretiva e reformas", sem definir os tipos.
- **Integração com ERP:** não informado nesta página.

#### A1.1 Equipamentos (estrutura de cadastro da frota)
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/manutencao-automotiva/equipamentos
- **Na operação real:** é a base de cadastro da frota, organizada em níveis: classe, subclasse, modelo, versão e equipamento.
- **Quem usa:** não informado.
- **Termos:** número de frota é o código diário da máquina; vida estimada é o limite de uso previsto; tolerância é a variação aceitável de consumo; criticidade define a prioridade na oficina.
- **Integração com ERP:** não informado nesta página.

#### A1.2 Classe Operacional (AUT0210)
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/manutencao-automotiva/equipamentos/classe-operacional
- **Na operação real:** primeiro nível da árvore. Agrupa os equipamentos em categorias amplas, como caminhão, trator de pneus ou veículo leve.
- **Quem usa:** não informado.
- **Passo a passo:** em Adicionar, preencher descrição, abreviação, tipo (Implemento ou Motorizado) e marcador de irrigação. Se a irrigação estiver marcada, escolher a identificação (conjunto motobomba, sistema de injeção para quimigação ou aspersão mecanizada). Salvar. Depois, na guia Subclasse Operacional, informar descrição, abreviação, velocidade média (km/h) e marcador ativo.
- **Termos:** implemento é equipamento sem motor que depende de outro para tração; motorizado habilita o abastecimento no nível seguinte; velocidade média serve para estimar o máximo de km por dia.
- **Integração com ERP:** não informado.

#### A1.3 Modelo (AUT0220)
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/manutencao-automotiva/equipamentos/modelo
- **Na operação real:** terceiro nível. Dá o nome comercial ao equipamento (a página usa "Mercedes 6x4" como exemplo) e define regras de manutenção que as versões e os equipamentos herdam.
- **Quem usa:** não informado.
- **Passo a passo:** em Adicionar, preencher código, abreviação, descrição, classe operacional, fabricante e marcador ativo. Salvar, e então cadastrar versões (básico, consumo e rendimento) e planos de manutenção.
- **Termos:** versão é uma variação técnica do mesmo modelo; medidor primário ou secundário é o hodômetro (km) ou horímetro (horas); preventiva conta a próxima execução a partir da última baixa; preventiva fixa segue múltiplos fixos, mesmo com atraso; garantia é executada uma única vez dentro da vigência.
- **Integração com ERP:** não informado. A classe operacional, depois de salva, não pode mais ser editada.

#### A1.4 Equipamento (AUT0230)
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/manutencao-automotiva/equipamentos/equipamento
- **Na operação real:** último nível, onde cada máquina real é cadastrada. Garante que cada movimentação fique ligada a uma máquina específica, e guarda chassi, placa e dados de vida.
- **Quem usa:** não informado de forma explícita. A página cita operador, motorista e funcionário vinculado.
- **Passo a passo:** em Adicionar, preencher código (número de frota), modelo, classe, placa, filiais, responsável, proprietário, centro de custo e patrimônio. Definir o tipo de controle (quais movimentações são permitidas). Preencher a depreciação padrão (residual, vida útil em anos, valor de aquisição). Salvar. Alocações ficam na guia Alocação, por vigência.
- **Termos:** horímetro mede horas de funcionamento; hodômetro mede quilômetros rodados; quebra de medidor é período em que o medidor falhou; vida inicial são os valores já acumulados quando a máquina entra no sistema; alocação por vigência define filial, proprietário, centro de custo e responsável em cada período.
- **Integração com ERP:** não informado. A página cita apenas integração interna com abastecimentos, ordens de manutenção e cálculos de rendimento. Equipamento com movimentação não pode ser excluído, só inativado.

### A2. Planejamento
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/planejamento
- **Na operação real:** ajuda a decidir a colheita antes de ela acontecer: o que colher primeiro, quando e em que ordem, considerando dados da lavoura e limites operacionais. Permite criar Ordens de Serviço e comparar cenários.
- **Quem usa:** não informado.
- **Fluxo passo a passo:** não informado. A página só lista objetivos.
- **Termos:** maturadores são produtos aplicados para maturar a cultura (a página cita, sem definir); cronograma e sequenciamento são resultados do módulo, sem definição.
- **Integração com ERP:** não informado. Página em construção.

### A3. Pagamentos
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/pagamentos
- **Na operação real:** cuida do dinheiro devido a quem trabalha ou fornece para a fazenda. Os valores a pagar saem das movimentações já registradas no sistema. Controla contratos, remunerações e obrigações fiscais.
- **Quem usa:** não informado.
- **Modelos contratuais citados:** parceria agrícola, fornecimento de matéria-prima, arrendamento de terra e prestação de serviços.
- **Termos:** remuneração variável é pagamento que depende de resultado ou produção (não definido na página); centro de custo aparece só no menu; rateio não é citado.
- **Integração com ERP:** sim. A página diz que o módulo gera movimentações financeiras e emite notas fiscais em sistemas ERP.

#### A3.1 Fechamento
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/pagamentos/fechamento
- **Conteúdo lido:** não informado. A página só traz o link para "Manutenção de Cálculos" (não lida). Termo "fechamento" não é definido.

#### A3.2 Serviços de Terceiro
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/pagamentos/servicos-de-terceiro
- **Conteúdo lido:** não informado. Página só com o nome do módulo. Link para "Manutenção de Cálculo" (não lida).

#### A3.3 Remuneração Variável
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/pagamentos/remuneracao-variavel
- **Conteúdo lido:** não informado. Página só com o título. Link para "Manutenção de Cálculo" (não lida).

#### A3.4 Cálculos Programados
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/pagamentos/calculos-programados
- **Conteúdo lido:** não informado. A sigla "CPG" aparece só no nome de uma subpágina (CPG - Manutenção de Cálculo, não lida).

### A4. Controladoria
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/controladoria
- **Na operação real:** reúne informações financeiras, operacionais e estratégicas para o gestor enxergar o negócio. Liga planejamento, execução e análise.
- **Quem usa:** não informado.
- **Funções citadas:** planejamento e controle orçamentário; indicadores de desempenho; custo e rentabilidade por cultura ou atividade; apoio à decisão.
- **Termos:** centro de custo, rateio, custo por talhão e fechamento não são explicados nesta página.
- **Integração com ERP:** não informado.

#### A4.1 Apoio à Contabilidade (MAC)
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/controladoria/apoio-a-contabilidade
- **Na operação real:** é o módulo de contabilidade de custos. Pega os apontamentos feitos no campo e nas oficinas e distribui custos diretos e indiretos aos centros de custo certos. Cada custo é associado a quatro informações: quem executou (operador ou máquina), o que foi feito, quando e onde.
- **Quem usa:** não informado de forma explícita. A página cita áreas administrativas, escritórios agrícolas e controladoria.
- **Passo a passo:** não informado.
- **Termos:** rastreabilidade é saber quando, onde e por quem um registro foi feito; acuracidade é o grau de precisão dos dados contábeis; fechamento contábil é o encerramento periódico dos lançamentos; abordagem de causa e efeito aloca cada custo à atividade que o gerou.
- **Integração com ERP:** sim, em parte. A informação "quem" (operador e máquina) vem do ERP. Os demais detalhes não são informados.
- **Subpáginas listadas:** segmentos contábeis (lido, A4.1.1), valores dos segmentos (não lida), configurações da tabela de regras (não lida), combinações (A4.1.3), tabela de regras (A4.1.2).

#### A4.1.1 Segmentos Contábeis (CST0251)
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/controladoria/apoio-a-contabilidade/segmentos-contabeis
- **Na operação real:** define o objeto de custo, que é a combinação de segmentos (exemplo citado: ordem de produção). Os segmentos são as dimensões que o ERP usa para entender onde o custo nasceu.
- **Quem usa:** não informado.
- **Passo a passo:** em Adicionar, preencher código, abreviação, descrição, situação (ativo ou inativo) e tipo. O tipo comum usa valores informados no cadastro de valores; o tipo adicional calcula o valor por expressão ou fórmula.
- **Termos:** segmento contábil é um elemento como local ou centro de custo; objeto de custo é a unidade à qual o custo é atribuído.
- **Integração com ERP:** sim. O objeto de custo é destinado ao ERP. O mecanismo técnico (formato, frequência, envio) não é informado.

#### A4.1.2 Tabela de Regras (CST0260)
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/controladoria/apoio-a-contabilidade/tabela-de-regras
- **Na operação real:** mostra como as dimensões da GAtec são mapeadas aos centros de custo, nas colunas definidas pelos segmentos.
- **Quem usa:** não informado.
- **Passo a passo:** selecionar a tabela de regras cadastrada (CST0265); aplicar filtros pelo seletor de dimensões; confirmar; visualizar o resultado publicado conforme as combinações escolhidas. Permite exportar para Excel, buscar itens e associar documentos.
- **Termos:** dimensões GAtec são as dimensões de negócio do campo (não definidas na página).
- **Integração com ERP:** a página menciona "particularidades do nosso cenário no ERP", sem detalhes.

#### A4.1.3 Combinações (CST0257)
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/controladoria/apoio-a-contabilidade/combinacoes
- **Na operação real:** associa dimensões de entrada da GAtec aos segmentos de saída do ERP. Define, por exemplo, que um local do campo corresponde a um segmento contábil e a um valor.
- **Quem usa:** analistas de custos ou equipe de contabilidade. Inativar e excluir depende de permissão do usuário.
- **Passo a passo:** selecionar a tabela de regras (CST0265); abrir a ferramenta de configuração; escolher as dimensões de entrada com o botão +; configurar a saída com segmentos, valores e centro de custo do processo; Salvar (isso é só uma prévia); usar "Atualizar a tabela de regras" para efetivar.
- **Termos:** reconstruir tabelas apaga e recria a estrutura, sem volta; importar aceita CSV ou Excel, com a opção de substituir os dados anteriores; o centro de custo é obrigatório na saída.
- **Integração com ERP:** ao atualizar, os dados vão para o repositório oficial que a integração e outros sistemas usam. Se houver outro serviço em andamento, o processo entra em fila. Protocolo e frequência não são informados.

### A5. Central Mobile
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/central-mobile
- **Na operação real:** permite registrar apontamentos e movimentações direto no campo, pelo dispositivo móvel, em vez de depender só do escritório. A página diz que isso melhora a agilidade e a troca de informações entre escritório e campo.
- **Quem usa:** não informado.
- **Fluxo passo a passo:** não informado. A lista de "principais aspectos" está numa imagem não lida.
- **Termos:** apontamento e movimentação não definidos.
- **Integração com ERP:** não informado. Sem subpáginas.

### A6. Estoque (Administração)
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/administracao/estoque
- **Na operação real:** controla o que entra, o que sai e o que muda de local em insumos e materiais. A página diz que centraliza a informação que antes ficava em planilhas separadas.
- **Quem usa:** não informado.
- **Telas:** Entrada de Produto (A6.1), Valorização Manual de Item (não lida), Transferência de Item Entre Locais (A6.2).
- **Objetivos citados:** centralizar produtos e insumos; controlar entradas, saídas e transferências; reduzir perdas; dar dados para decisão.
- **Integração com ERP:** a página diz que o módulo pode "integrar com sistemas ERP ou operar de forma independente".

#### A6.1 Entrada de Produto (ADM0092)
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/administracao/estoque/entrada-de-produto
- **Na operação real:** registra a entrada de produtos quando a empresa não usa integração com ERP. A página diz que os dados são os que viriam do ERP. A baixa do estoque, na tela Retirada de Produto (AGR0093), depende dessas entradas.
- **Quem usa:** não informado.
- **Passo a passo:** em Adicionar, preencher filial, data de entrada, moeda, número da NF ou controle, data da nota e valor. Salvar. Depois, na guia de itens, informar local de estoque, item, derivação, lote (se usado), unidade, quantidade e valor unitário; o total é calculado. Alternativa: importar planilha (quando o parâmetro EntryStockBySimpleFarm está ativo). Nesse caso, cada variação de filial, data, número ou local gera uma nova entrada.
- **Termos:** derivação é uma variação do item (sem ela, vale a derivação padrão); lote é o controle por lote; local de estoque é onde o item fica; polo e unidade produtora definem a moeda padrão da importação.
- **Integração com ERP:** a tela é para casos sem ERP. Não há passo para configurar a integração.

#### A6.2 Transferência de Item Entre Locais (ADM0222)
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/administracao/estoque/transferencia-de-item-entre-locais
- **Na operação real:** formaliza a retirada de produtos de um local de estoque para outro, para atender a quantidade pedida por uma Ordem de Serviço. Só serve para produtos ligados a O.S.
- **Quem usa:** perfil não informado.
- **Pré-requisitos:** cadastro conforme a parametrização da Unidade Produtora (ADM0012); parâmetro de vínculo De/Para ativo.
- **Passo a passo:** no cabeçalho, informar unidade produtora, projeto, período, grupo de operação e O.S. (o número do documento é automático). No detalhe, informar data de solicitação, funcionário, item, local de origem e quantidade (destino, saldo e preço são automáticos). Adicionar à grade e salvar. Atalho: na tela de O.S. (AGR0090), após incluir um recurso, usar "Vincular Estoques de Origem/Destino".
- **Termos:** grupo de operação agrupa as operações (PSG0) que podem ser ligadas às O.S.; recursos da O.S. são os itens previstos; De/Para são origem e destino usados para conferir a transferência; saldo é a quantidade disponível na hora do pedido.
- **Integração com ERP:** ao salvar com dados consistentes, a requisição é enviada ao ERP. Detalhes técnicos não informados.

### A7. Centro de Custo (Estruturas Administrativas)
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/administracao/estruturas-administrativas/centro-de-custo
- **Na operação real:** é a divisão usada para juntar os gastos de uma área ou atividade. Liga as operações do campo à gestão financeira e permite ver custos por atividade, recurso e processo.
- **Onde é usado:** AGR0090 (painel da O.S.), CST0257 (combinações), CST0260 (tabela de regras) e AUT0230 (equipamentos).
- **Quem usa:** não informado.
- **Passo a passo:** Adicionar Centro de Custo; preencher código, código resumido, código pai (se for filho), descrição; Salvar.
- **Termos:** código pai indica o centro superior; código resumido não é explicado; rateio não é citado.
- **Integração com ERP:** o cadastro vem da integração com o plano de centro de custo do ERP. Sem ERP, o cadastro é manual.

### A8. Princípio Ativo (Recursos)
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/administracao/recursos/principio-ativo
- **Na operação real:** cadastro opcional que informa o efeito principal de um produto (defensivo, por exemplo). Aparece no cadastro do item (ADM0034), na aba de instruções de uso. Pode indicar o princípio ativo do produto e princípios que não devem ser combinados.
- **Quem usa:** não informado.
- **Passo a passo:** em Adicionar, informar descrição e abreviação; Salvar.
- **Termos:** princípio ativo é a substância que dá a ação esperada; princípio ativo incompatível é o que não deve ser misturado com outro.
- **Integração com ERP:** não informado.

### A9. Viewer (SimpleViewer)
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/utilitarios/viewer
- **Na operação real:** mostra dados do agronegócio em gráficos e relatórios no navegador. Reúne dados de várias fontes em uma visão só, com visualizações interativas e atualização em tempo real.
- **Quem usa:** não informado.
- **Passo a passo:** não informado. A página está em construção.
- **Termos:** não há termos definidos.
- **Integração com ERP:** não informado. A página fala só em "múltiplas fontes".

### A10. FAQ
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/faq
- **Conteúdo relevante:**
  - Por que o SimpleFarm: unifica a estrutura da empresa, pode ser acessado de qualquer lugar e substitui sistemas antigos.
  - Culturas: anuais (soja, milho, algodão), semi-perenes (cana-de-açúcar) e perenes (citros e florestas). A página diz "qualquer tipo de cultura".
  - Dores citadas: falta de integração entre dados e sistemas, processos manuais, pouca rastreabilidade, decisão lenta.
  - Benefícios citados: rastreabilidade "desde a semente até o produto final", governança, padronização, menos erros de lançamento.
- **Integração com ERP:** não informado. O FAQ cita falta de integração como problema, sem mencionar ERP.

### A11. Página "gatec-home" do manual
- **URL:** https://documentacao.senior.com.br/simplefarm/manual-do-usuario/gatec-home
- **Conteúdo:** é a fonte mais completa do posicionamento GAtec dentro do manual. Está resumida na Parte B.

---

## Parte B: Site gatec.com.br

### B1. Posicionamento
- **Home:** https://gatec.com.br/ . A página se apresenta como "Sistemas especializados para o Agronegócio" e tem a frase de destaque "O Software de gestão que entende o agronegócio", com portfólio "do plantio à comercialização".
- **Manual (gatec-home):** a GAtec se descreve como "unidade de negócios da Senior Sistemas especializada no mercado Agro". Cobre planejamento, orçamento, contratos, controle agrícola, planta industrial, comercialização de commodities e custos agroindustriais. Cita investimento em P&D, com machine learning, IoT, assistentes virtuais e cloud.
- **Números declarados (não verificados):** 72 das 100 maiores empresas do Agro; 3 das 10 maiores cooperativas do mundo; 5 dos 10 maiores grupos sucroenergéticos; 7 dos 10 maiores produtores em área plantada; 7 das 10 maiores cooperativas do Brasil.

### B2. Produtos (nome exato, o que faz, URL)

1. **SimpleFarm**
   - **URL:** https://gatec.com.br/simplefarm-agronegocio/
   - **O que faz:** software web para gerenciar propriedades agrícolas e pecuárias, reunindo planejamento, operações no campo, custos, contratos e fornecedores. Roda em nuvem ou na infraestrutura do cliente, e coleta dados no campo com ou sem internet.
   - **Módulos citados:** rede social interna, middleware, flex fields, rotinas de intervenção, cubo, integrador, rastreabilidade, receituário agronômico, irrigação, integração com certificado digital de cana, gestão de contratos e terceiros.
   - **Segmentos:** agronegócio em geral, usinas bioenergéticas, pecuária.
   - **Culturas:** soja, milho e algodão (anuais); cana-de-açúcar (semi-perene); citros e florestas (perenes).
   - **Relação com Senior/ERP:** "GAtec by Senior" no site. Integração com ERP: não informado para o SimpleFarm; a página cita SAP e Oracle como fontes do SimpleViewer e fala em integrador e middleware.

2. **SimpleViewer**
   - **URL:** https://gatec.com.br/simpleviewer-agronegocio/ (não lida)
   - **O que faz (pela home e pelo manual):** a home diz que transforma dados em informações. O manual descreve dashboards e relatórios no navegador, reunindo várias fontes.
   - **Segmentos e culturas:** não informado.

3. **Operis**
   - **URL:** https://gatec.com.br/operis-agronegocio/
   - **O que faz:** sistema de armazém (WMS) para produto acabado do agronegócio. Acompanha o que entra, é guardado, é processado e sai, do início da produção até o carregamento. Registra qualidade. Permite uso do celular, com ou sem internet.
   - **Módulos citados:** produção, packing house, beneficiamento, estoque, qualidade, expedição, recebimento, controle de embalagens e checklists. Também o **Operis YMS** (pátio): agendamento de veículos, gestão de pátio, checklist do motorista, painel de chamada e check-in.
   - **Segmentos:** agronegócio, com menção a empresas que levam insumos ao campo. Culturas: não informado.
   - **Relação com Senior/ERP:** "GAtec by Senior". Integração: cita "integração entre ERPs" na expedição e uso de cadastros padrão do ERP complementados por cadastros próprios. ERP compatível: não informado.

4. **Commerce SF** (na página, título "Commerce Agrícolas")
   - **URL:** https://gatec.com.br/commerce-agricolas/
   - **O que faz:** organiza o comercial de empresas agrícolas, com negociações de compra e venda de grãos, algodão e outros produtos do campo. Cobre contratos (inclusive intercompany e "fixo a fixar"), fixação de preço, NDF, Incoterms, pedidos, notas de exportação, romaneio, balança e rastreio de fardos e lotes.
   - **Segmentos e culturas:** cana-de-açúcar, grãos, algodão, café, citros e pecuária. Público: produtores e tradings. A página diz que um dos maiores grupos de algodão usa o produto.
   - **Relação com Senior/ERP:** marca "GAtec by Senior". Integração: lista "integração com o ERP da empresa", sem detalhes.

5. **Commerce Log**
   - **URL:** https://gatec.com.br/commercelog/
   - **O que faz:** organiza o transporte de mercadorias agrícolas em grande volume. Pede cotações de frete, combina com transportadoras, confirma contratos de transporte e acompanha o que já foi embarcado e o que falta.
   - **Módulos citados:** demandas e cotações, contratos e cargas, controle de embarque (saldo a embarcar), operação e documentos (wash-out, instrução de embarque, romaneio, balança), rastreabilidade e análise.
   - **Segmentos:** algodão, grãos, sementes e pecuária ("entre outras"). Público: produtores rurais e tradings. Culturas específicas: não informado.
   - **Relação com Senior/ERP:** marca "GAtec by Senior" e links para a Senior. Integração: "integração com o ERP da empresa", sem detalhes.

6. **OneClick**
   - **URL:** não há página própria lida no site. Descrição na página gatec-home do manual: https://documentacao.senior.com.br/simplefarm/manual-do-usuario/gatec-home
   - **O que faz (pelo manual):** controle de posições e exposições, marcação a mercado, fluxo de caixa e gestão de riscos do portfólio.
   - **Segmentos, culturas e ERP:** não informado.

7. **Mapfy**
   - **URL:** https://gatec.com.br/mapfy-dados/
   - **O que faz:** transforma dados com localização em mapas. É um serviço na nuvem, acessado pelo navegador e por apps Android e iOS, com uso offline.
   - **Recursos citados:** importação de SHP, KML, GeoJSON e raster; mapas temáticos e de calor; registro offline de incidentes com foto; Mapfy Form (formulários offline); Mapfy Connector (transferência de dados); Mapfy Analytics (data lake e painéis com Power BI Embedded); envio por WhatsApp.
   - **Números publicados (não verificados):** 1.053 mapas, 2.059.027 apontamentos, 3.689 usuários.
   - **Segmentos, culturas e ERP:** não informado. Cita integração com bases externas.

8. **Shield** (na página, "Mapfy Shield")
   - **URL:** https://gatec.com.br/shield-lavoura/
   - **O que faz:** organiza o monitoramento da lavoura contra pragas, doenças e plantas daninhas. A equipe registra o que encontra pelo celular. O sistema calcula o nível de infestação e, quando fica crítico, sugere controle químico, biológico ou cultural.
   - **Funções citadas:** configuração de áreas e regras; backlog de atividades com levantamento populacional ou armadilhas; sprints semanais; app para execução com pontos no mapa; módulo de análise.
   - **IA e satélite:** não informado (a página fala em "análise avançada", sem citar IA).
   - **Segmentos e culturas:** não informado.
   - **Relação com Senior/ERP:** marca "GAtec by Senior". ERP: não informado.
   - **Alegação na home:** "economia de 12 milhões por ano", sem moeda definida.

9. **Automação**
   - **URL:** https://gatec.com.br/landing/automacao-produtividade/ (não lida)
   - **Descrição pela home:** dar mais precisão à gestão da produção. Não é apresentada como produto com nome próprio. O manual lista integração com equipamentos de automação dentro do SimpleFarm.

### B3. Segmentos e culturas (resumo)
- Segmentos (home e manual): agronegócio em geral, cooperativas, grupos sucroenergéticos, produtores rurais, indústrias químicas e de fertilizantes, revendas e distribuidores de insumos, tradings, grupos agropecuários, pecuaristas.
- Culturas: soja, milho, algodão, cana-de-açúcar, citros, florestas, café, grãos em geral. A home não cita culturas; elas aparecem nas páginas de produto e no manual.

### B4. Relação com a Senior e com ERP
- A marca é "GAtec by Senior" no logo e no rodapé de várias páginas. O menu "A Senior" aponta para senior.com.br.
- O manual diz que a GAtec é unidade de negócios da Senior Sistemas.
- A palavra "ERP" não aparece na home. Nas páginas de produto, a integração com ERP é citada em Operis, Commerce e Commerce Log, sem indicar quais ERPs são compatíveis.
- Detalhes societários ou comerciais entre GAtec e Senior: não informado.

---

## Quem faz o quê

Base: leitura desta sessão (Parte A e Parte B), /home/claude/s6f/loop/portfolio.md e /home/claude/s6f/loop/manual/integracao.md.

| GAtec (operação) | Senior ERP (gestão) | Senior agnósticas (HCM, logística, acesso, CRM, XPlatform) |
|---|---|---|
| Planejamento e orçamento de safra; parametrizações. Contratos de compra e de venda, com embarques. Requisição de insumos, materiais e serviços (frete, despesas portuárias). Pesagem e apontamento de peso previsto e real. Baixa, consumo e estorno de insumos. Mudança de categoria e transferência de local. Lançamento de despesas, taxas e adiantamentos. Cessão de crédito e antecipação. Custos diretos e indiretos. Distribuição de custos agrícolas por talhão e cultura. Apoio à contabilidade (MAC): traduz apontamentos em centros de custo e envia ao ERP. Manutenção de frota, mão de obra, Central Mobile. Operis (armazém, pátio, expedição). Mapfy e Shield (mapas e pragas). Commerce SF, Commerce Log e OneClick (comercial, frete, riscos). APIs para devolver dados. | Compras: requisição, cotação, ordem de compra, nota fiscal de entrada, nota de serviço e CT-e. Estoque: movimentação, saldo por série e lote. Vendas: pedido, nota fiscal de saída, expedição e eDocs. Financeiro: contas a pagar e a receber, baixa de títulos, tesouraria e pagamentos. Contabilidade: rateios, lançamentos contábeis, alocação de custos e saldos. Gestão empresarial para agroindústria, revendas e cooperativas, com multimoedas. Cadastro de centro de custo vindo do plano do ERP. Relatórios gerenciais e exportação por APIs. | HCM: gestão de pessoas, recrutamento de safristas e folha (quando integrada ao ERP). Logística: WMS, YMS, gestão de frotas e TMS (armazém, agenda de cargas, filas, cancelas e balanças). Acesso e segurança: entrada e saída de pessoas e ronda de vigilantes. CRM: gestão de relacionamento (sem detalhe lido). XPlatform: citada como agnóstica, sem detalhe lido. |

---

## Pendências e achados

1. Fronteira de integração: a tela de Entrada de Produto diz que serve para casos sem ERP, mas a Transferência de Item manda a requisição ao ERP ao salvar. Não está claro quem é dono de cada dado de estoque.
2. YMS aparece em dois lugares: como Senior agnóstica (logística, portfolio.md) e como Operis YMS no site da GAtec. Confirmar quem vende e quem integra.
3. Ato Cooperado: o portfolio o lista entre as soluções de cooperativa, com o ERP apoiando a administração. Não ficou claro se é módulo do ERP ou da GAtec; não foi lido no manual.
4. Commerce: o site usa "Commerce SF" na home e "Commerce Agrícolas" na página. O portfolio fala em "Commerce". Padronizar o nome.
5. Shield: na página aparece como "Mapfy Shield". O portfolio trata como produto próprio.
6. Mecanismo técnico da integração do MAC com o ERP (formato, frequência, método) não informado nas páginas lidas.
7. Páginas em construção: Fechamento, Serviços de Terceiro, Remuneração Variável, Cálculos Programados, Planejamento, Central Mobile (lista de aspectos em imagem), Viewer.
8. Não lidas por limite de orçamento: subpáginas de manutenção de cálculo, valores dos segmentos, configurações da tabela de regras, valorização manual de item, SimpleViewer e automação no site, /solucoes/ e OneClick no site.
9. Números de mercado e de uso (72 de 100, 1.053 mapas, 12 milhões por ano etc.) são declarações da própria GAtec ou Senior e não foram verificados.
10. Quem usa (perfil de usuário) não é informado na maioria das páginas do manual.
