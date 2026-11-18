# Direção do cliente (16/11) — vale acima de qualquer tarefa anterior

O jogo retrata uma AGROINDÚSTRIA real (posicionamento Senior: "Software especializado para a gestão da agroindústria",
https://site.senior.com.br/agronegocio/agroindustria/). Público: executivo de contas que talvez NUNCA pisou numa
operação agro. O jogo precisa ensinar COMO É a operação e ONDE a solução Senior se aplica.

Regras
- Nada de clichê caipira nem item que uma agroindústria não tem: sem orelhão, barraca de caldo de cana, rede de
  descanso, bandeira decorativa, filtro de barro, placa pintada à mão.
- Tudo que aparece deve existir numa operação real e, de preferência, ensinar algo: balança rodoviária e cabine,
  tombador/hilo, pátio de caminhões com fila e senha, moega, silos e armazém, laboratório de classificação/amostragem
  (calador), tanque de combustível e comboio de abastecimento, lavador de máquinas, almoxarifado de insumos
  (defensivos por princípio ativo, com área isolada), portaria com cancela e controle de acesso, refeitório/alojamento
  de safristas, relógio de ponto, placas de segurança (EPI obrigatório, velocidade máxima 20 km/h, DDS, dias sem
  acidente), brigada/extintores, cone e faixa de pedestre, CIPA.
- EPI correto: capacete onde a norma exige (indústria, balança, pátio, armazém, oficina, porto); no campo, chapéu de
  aba ou boné árabe/touca com proteção de nuca, perneira e botina; colete refletivo em pátio. Escritório: sem EPI.
- Soluções citadas na página de agroindústria: AgroCheck, App da Balança, App do Produtor, Gestão de Acesso e
  Segurança, Gestão Empresarial | ERP, Gestão Industrial, Gestão de Pessoas | HCM, CRM, Gestão de Royalties, Multi
  Moedas, Originação de Grãos, Suprimentos por Princípio Ativo, XPlatform, WMS, Gestão de Frotas, Gestão de pátio |
  YMS, TMS. Mais GAtec (ver loop/portfolio.md). Não invente funcionalidade.
- Easter eggs: humor leve com coisas que existem numa agroindústria (capivara no pátio, cachorro da portaria, garrafa
  de café da oficina, placa "dias sem acidente", crachá perdido), nunca item de cidade ou de roça de novela.

## Unificação (16/11, 10:33)
Mensagem central do jogo: Senior + GAtec atendem a operação de PONTA A PONTA. GAtec faz a operação; o Senior ERP faz a
gestão; as soluções agnósticas da Senior (HCM, logística, acesso, CRM, XPlatform) completam. O fecho acontece na
Controladoria: é lá que o executivo vê as conexões (fonte: loop/manual/integracao.md, fluxo oficial enviado pelo cliente).

## Decisões do cliente (16/11, 10:51)
- Gestão de pátio na agroindústria: usar Operis YMS (GAtec).
- Comercialização: o nome do produto é Commerce.
- Manutenção automotiva (GAtec) e ERP integram estoque, lançamentos e demais itens da oficina. Exemplo do cliente: "preciso de um motor novo e provavelmente não tenho na fazenda": abre-se a OS de manutenção; se for manutenção interna, a peça sai do estoque (se houver) ou gera solicitação de compra no ERP; senão o equipamento vai para manutenção externa (serviço de terceiro). Tudo integrado no ERP.
- A partir de agora todo o trabalho é delegado a Haiku; o orquestrador só despacha e publica.

### Aplicado pelo executor em loop/r13 (16/11, 11:02)
- Oficina (auto): aprende, feito, levar e cartao reescritos no fluxo do motor (OS -> estoque ou compra no ERP -> serviço de terceiro); menção curta ao motor na cena; "Caderno não trava, moço" e a lista do churrasco mantidos.
- Balança (orig): cargo "Rui, analista de balança"; op "Balança e recebimento"; frentes Balança (SimpleFarm) e Fila de pátio (Operis YMS); cartao sobre pesagem de entrada e saída, análise da cana e fila de pátio. Fonte: manual SimpleFarm (Balança, Análise da Cana, Central de Processamento, Monitor de Integração).
- Armazém (arm): fila e agendamento em Operis YMS; armazém e expedição continuam em Operis.
- Porto (com): "Gestão de Comercialização" trocado por Commerce (frentes e cartao).
- SINAIS: nenhuma menção a pátio ou originação; sem alteração.
- Cenário: guarita da portaria refeita com sbBuilding (janelas, porta, telhado) voltada para a pista; as duas carretas da fila passam a usar kitTruck (mesma função da balança); placa da balança "Originação" trocada por "Pesagem de cana".
- Pendência: o caminhão em fila está em duas faixas paralelas (z=-33 e z=-41), como antes; não há ordem de fila ao longo da pista.
