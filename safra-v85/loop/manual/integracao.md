# Integração Senior ERP x GAtec (transcrição do fluxo enviado pelo cliente: "Gestão de Campo - Integração Senior x GATEC")

Visão do cliente: a Senior no agro tem 3 camadas. GAtec faz a OPERAÇÃO (campo, balança, contratos, custos agrícolas).
Senior ERP faz a GESTÃO (compras, estoque, fiscal, financeiro, contabilidade). As soluções agnósticas da Senior
(HCM, logística WMS/TMS/YMS, acesso e segurança, CRM, XPlatform) atendem qualquer segmento e completam o conjunto.
O jogo deve UNIFICAR isso: no fim, na Controladoria, o executivo vê as conexões.

Raias: GATEC (em cima) e SENIOR ERP (embaixo). Fases, da esquerda para a direita:

1. Processos iniciais
   - GAtec: Planejamento / Orçamento Safra; Parametrizações.
   - ERP: Parametrizações; Cadastros.
2. Compra / Entradas / Estoque
   - GAtec: Contratos de Compra / Embarques; Requisitar Serviços Frete / Despesas Portuárias; Requisitar Insumos /
     Materiais; Pesagem / Balança; Apontar Peso Previsto / Real; Baixar / Consumir / Estornar Insumos e Materiais;
     Mudar de Categoria / Transferir de local.
   - ERP: Requisição de Compra -> (Possui estoque?) -> Atender Requisição -> Movimentação de Estoque -> Saldo Estoque /
     Saldo Série/Lote; Solicitação de Compra -> Cotação de Preços -> Ordem de Compra -> Documento / Nota Fiscal de
     Entrada (Recebimento); Requisição de Serviços -> Solicitação de Serviços de Frete -> Cotação de Preços -> Ordem de
     Compra -> CT-e / Nota Fiscal de Serviço; Lançamento de Serviços Contratados e Adicionais; Transferência de Produtos.
   - Conexões: Requisitar Insumos (GAtec) -> Requisição de Compra (ERP). Requisitar Serviços (GAtec) -> Requisição de
     Serviços / Lançamento de Serviços (ERP). Apontar Peso e Baixar/Consumir Insumos (GAtec) -> Movimentação de Estoque
     (ERP). Mudar de Categoria / Transferir (GAtec) -> Transferência de Produtos (ERP).
3. Venda / Saída
   - GAtec: Contratos de Venda / Embarques -> Pedido de Venda -> Pesagem / Balança.
   - ERP: Pedido de Venda -> Nota Fiscal de Saída -> Expedição, eDocs, CT-e.
   - Conexões: Pedido de Venda (GAtec) -> Pedido de Venda (ERP). Pesagem (GAtec) -> Nota Fiscal de Saída (ERP).
4. Financeiro
   - GAtec: Lançar Despesas / Taxas; Adiantamentos Fornecedores Despachantes; Cessão de Crédito / Caução;
     Adiantamento / Antecipação.
   - ERP: Títulos do Contas a Pagar; Baixa de Títulos; Pagamentos; Tesouraria; Título do Contas a Receber.
   - Conexões: Despesas/Taxas e Adiantamentos (GAtec) -> Contas a Pagar (ERP). NF de Entrada e CT-e -> Contas a Pagar.
     Cessão de Crédito e Antecipação (GAtec) -> Contas a Receber (ERP). NF de Saída -> Contas a Receber.
5. Custos / Contabilidade
   - GAtec: Lançar Custos Diretos e Indiretos; Distribuição de Custos Agrícolas.
   - ERP: Rateios e Lançamentos Contábeis; Contabilidade; Alocação de Custos / Gastos e Realocação de Saldos entre
     Grupos de Contas; Saldo Contábil das Contas.
   - Conexões: Tesouraria -> Rateios e Lançamentos Contábeis. Saldo Contábil das Contas (ERP) -> Distribuição de Custos
     Agrícolas (GAtec): o custo contábil volta para o campo e vira custo por talhão/cultura.
6. Processos finais
   - GAtec: Consultar APIs para realizar o retorno dos dados gerados.
   - ERP: Exportar dados nas APIs; Relatórios Gerenciais.
