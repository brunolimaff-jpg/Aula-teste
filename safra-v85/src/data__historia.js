// === data/historia.js ===
// História do loop "Um Dia de Safra": executivo de contas, mapeamento com o diretor, fiscal que expulsa, Caderno de Campo, mirantes e devolutiva.
// Tom Senior: frases curtas, voz ativa, sem emoji, humor leve e corporativo. Sem números de mercado.
// fonte: 'manual' = loop/manual/*.md (SimpleFarm, GAtec, integração); 'geral' = conhecimento geral seguro de operação sucroenergética.
// Nomes das constantes não coincidem com as de data__safraData.js (ATOS, PARADAS, CONVERSAS, DIRETOR, NIVEIS, SINAIS, EVIDENCIAS, EASTER, PONTA_A_PONTA).

// 1. Reunião inicial. Falas: [quem, fala]. porNivel: falas inseridas depois da fala número "apos" (contada a partir de 1).
const ABERTURA = {
  titulo: 'Briefing na Sala da Diretoria · 05:15',
  quem: 'Dr. Augusto, diretor da Usina Horizonte',
  cenario: 'Sala da diretoria da Usina Horizonte, 05h15 da manhã. Lá fora o dia ainda está azul-escuro e bitrens de cana e graneleiros de milho já roncam rumo à balança. Café amargo na garrafa térmica e o DRE da usina flex aberto no projetor.',
  falas: [
    ['Dr. Augusto', 'Senta aí. A Horizonte virou usina flex para rodar cana e milho safrinha o ano inteiro, mas o caixa fechou sangrando e ninguém na minha mesa sabe apontar onde a margem vazou.'],
    ['Dr. Augusto', 'Este mês já sentaram três consultores nessa cadeira. Todos abriram slide bonito nos primeiros cinco minutos e saíram sem pisar no barro.'],
    ['Você', 'Não vim abrir slide, Dr. Augusto. Vim rodar a operação das cinco da manhã às seis da tarde e ouvir quem toca cana, milho e indústria no braço.'],
    ['Dr. Augusto', 'Bom começo. Você tem até o fim da tarde para conversar com as dez pontas da Horizonte — do talhão da Helena aos silos de milho da Sílvia e o fechamento do André no porto.'],
    ['Dr. Augusto', 'Regra da casa: EPI certo em cada área. Chapéu, perneira e botina no campo; capacete e protetor na indústria; colete refletivo no pátio e na balança.'],
    ['Dr. Augusto', 'O Valdemar, meu gerente de operações há 28 anos, odeia vendedor apressado. Se você tentar empurrar software antes de entender a dor, ele toma seu crachá.'],
    ['Dr. Augusto', 'Às 18h você volta para esta mesa com fatos, números e evidências do dia. Aí eu decido se assino o diagnóstico com a Senior e a GAtec.']
  ],
  porNivel: {
    trainee: {
      apos: 4,
      falas: [
        ['Dr. Augusto', 'Comece pela agrônoma Helena na sede. Ela conhece cada talhão pelo nome e vai te dar o fio da meada.'],
        ['Dr. Augusto', 'E se precisar calibrar a abordagem antes de falar com meu time, use o Rádio Mentor Konviva no seu tablet.']
      ]
    },
    executivo: {
      apos: 4,
      falas: [
        ['Dr. Augusto', 'Não vou te dar roteiro mastigado. Olhe os quadros, leia as evidências em cima das mesas e faça a minha equipe confiar em você.']
      ]
    },
    especialista: {
      apos: 4,
      falas: [
        ['Dr. Augusto', 'No seu nível eu cobro as dez pontas mapeadas sem tropeço. O Valdemar já está no pátio te esperando de prancheta na mão.'],
        ['Dr. Augusto', 'Se ele cortar sua visita, não venha chorar na minha porta.']
      ]
    }
  }
};

// 2. Fiscal. Personagem bravo, sugerido. Falas curtas, sem palavrão.
const FISCAL = {
  nome: 'Valdemar',
  cargo: 'Gerente de operações',
  anosDeUsina: 28,
  perfil: 'Não gosta de vendedor. Acha que quem vende nunca viu a moenda parar.',
  descricaoAvatar: 'Homem de meia-idade, capacete branco, colete refletivo sobre camisa de manga comprida, prancheta na mão.',
  avatar: { base: 'homem de meia-idade', capacete: 'branco', colete: 'refletivo', acessorio: 'prancheta' },
  bordoes: [
    'Vendedor só quer vender. Eu quero moer.',
    'Slide não mói cana.',
    'Crachá na frente, boca fechada e orelha aberta.',
    'Eu tenho 28 anos de usina. Você tem quantos de cliente?',
    'Aqui quem fala é a moenda.'
  ],
  avisos: [
    {
      nivel: 1,
      rotulo: 'Primeira advertência',
      falas: [
        'Tô de olho.',
        'Olha onde pisa. Tô de olho.',
        'Aqui não é corredor. Tô de olho.'
      ]
    },
    {
      nivel: 2,
      rotulo: 'Segunda advertência (cartão amarelo)',
      falas: [
        'Cartão amarelo. Mais um desses e você sai.',
        'Segunda vez, moço. Isso é cartão amarelo.',
        'Cartão amarelo no seu nome. Não me faça pegar o vermelho.'
      ]
    },
    {
      nivel: 3,
      rotulo: 'Terceira advertência (última chance)',
      falas: [
        'Última chance. Não tem próxima.',
        'Essa é a última chance. Escuta a equipe agora.',
        'Última chance. Da próxima vez, a portaria te acompanha.'
      ]
    }
  ],
  expulsao: [
    'Crachá. Agora. A portaria te acompanha até o carro.',
    'Acabou a visita para você. Me devolve o crachá e vai pela portaria.',
    'Não vou discutir pátio com quem não ouve. Crachá na mesa, portaria acompanha.',
    'Você passou do limite. Crachá, e a portaria leva você até a saída.'
  ],
  gatilhos: [
    {
      id: 'pitch_antes_de_ouvir',
      erro: 'Pitch antes de ouvir',
      efeito: 'advertencia',
      fala: 'Você nem perguntou o que dói e já está vendendo. Vendedor só quer vender.'
    },
    {
      id: 'confianca_zerada',
      erro: 'Confiança zerada numa conversa',
      efeito: 'advertencia',
      fala: 'Acabou a conversa. Ninguém aqui responde para quem não escuta.'
    },
    {
      id: 'correr_area_industrial',
      erro: 'Correr dentro da área industrial ou do armazém',
      efeito: 'advertencia',
      fala: 'Corre não. Dentro da indústria e do armazém, anda devagar. Tem máquina ligada.'
    },
    {
      id: 'pista_com_caminhao',
      erro: 'Ficar na pista com caminhão buzinando',
      efeito: 'expulsao',
      fala: 'Sai da pista! Caminhão não para por causa de vendedor.'
    },
    {
      id: 'zoeira_repetida',
      erro: 'Apertar ou segurar a mesma opção sem conversar',
      efeito: 'advertencia',
      fala: 'Para de apertar isso. Conversa não é botão.'
    },
    {
      id: 'conexao_errada_duas_vezes',
      erro: 'Errar a conexão duas vezes na mesma parada',
      efeito: 'advertencia',
      fala: 'Duas vezes a mesma ligação errada. Revisa o que a equipe disse antes de propor.'
    },
    {
      id: 'saida_da_usina',
      erro: 'Sair da área da usina',
      efeito: 'expulsao',
      fala: 'Você saiu da área sem avisar. Crachá na mesa. A visita acabou por hoje.'
    }
  ],
  elogios: [
    'Hmm. Isso aí eu não sabia. Você ouviu antes de falar.',
    'Pergunta de quem já pisou em usina. Não sai muito disso aqui.',
    'Pode seguir. Eu não falo isso duas vezes.'
  ],
  retorno: {
    fala: 'Segunda chance. Não tem terceira.',
    cena: 'Valdemar encontra você na portaria, com o crachá reserva na mão.'
  }
};

// Regras do crachá. Valores de penalidade são sugestão de balanceamento, para ajustar em teste.
const REGRAS_CRACHA = {
  advertenciasAteExpulsao: { trainee: 4, executivo: 3, especialista: 2 },
  penalidadePontosExpulsao: { trainee: -10, executivo: -20, especialista: -30 },
  oQueAcontece: [
    'Valdemar pede o crachá e a portaria acompanha o jogador até a saída.',
    'O jogador volta para a portaria da sede.',
    'A confiança acumulada na parada atual zera.',
    'O relógio avança 30 minutos.'
  ],
  consequencias: { voltaPara: 'portaria', zeraConfiancaDaParada: true, avancaMinutos: 30 },
  limiteExpulsoesAntesFimDeVisita: { trainee: null, executivo: 2, especialista: 1 },
  textoFimDeVisita: 'Visita encerrada. O Valdemar pediu o crachá pela última vez. O Dr. Augusto não vai ouvir o resto do seu diagnóstico.',
  licao: 'Vendedor que chega com a solução pronta perde a operação. Pergunte o que dói e só depois proponha.'
};

// 3. Caderno de Campo. 46 verbetes. desbloqueio.ref: id de PARADAS (parada/conversa), de EASTER (egg), de EVIDENCIAS (evidencia) ou {x,z,r} (lugar).
const CODEX = [
  { id: 'cdc-portaria', categoria: 'Lugar', titulo: 'Portaria e controle de acesso',
    texto: 'Ninguém entra na usina sem credencial. A cancela libera só quem tem permissão para a área, e o visitante recebe crachá próprio. A portaria guarda a hora de entrada e de saída de pessoas e veículos.',
    senior: 'Gestão de Acesso e Segurança controla a entrada e a saída de pessoas por credencial e permissão.',
    desbloqueio: { tipo: 'lugar', ref: { x: -96, z: -13.5, r: 6 } }, fonte: 'geral' },
  { id: 'cdc-cracha-epi', categoria: 'Termo', titulo: 'Crachá e EPI',
    texto: 'Crachá é a identidade de quem está na área. EPI é o equipamento que protege quem trabalha ali: capacete onde a norma exige, como na indústria, na balança, no pátio e no armazém. No campo, o padrão é chapéu de aba ou touca com proteção de nuca, perneira e botina. A NR-31 trata da segurança no trabalho rural.',
    senior: null,
    desbloqueio: { tipo: 'egg', ref: 'cracha' }, fonte: 'geral' },
  { id: 'cdc-dds', categoria: 'Processo', titulo: 'DDS (Diálogo Diário de Segurança)',
    texto: 'Antes do turno, a equipe para uns minutos para falar dos riscos do dia. Quem participa assina a lista de presença, e o tema tratado fica registrado. Na usina, o DDS vem antes da primeira máquina ligar.',
    senior: null,
    desbloqueio: { tipo: 'parada', ref: 'agri' }, fonte: 'geral' },
  { id: 'cdc-safrista', categoria: 'Pessoa', titulo: 'Safrista',
    texto: 'Safrista é o trabalhador contratado só para a safra, em geral na colheita e no plantio. Ele entra e sai com o calendário da cana, por isso a contratação precisa ser rápida e o ponto precisa ser registrado. Quem recruta e cuida da folha é o RH.',
    senior: 'HCM cuida de gestão de pessoas, incluindo o recrutamento de safristas.',
    desbloqueio: { tipo: 'conversa', ref: 'agri' }, fonte: 'geral' },
  { id: 'cdc-talhao', categoria: 'Lugar', titulo: 'Talhão',
    texto: 'Talhão é a menor parte da lavoura onde se planta e se registra movimento. Dentro dele, a área líquida é a que se cultiva, e o carreador e a área inútil ficam de fora. A área inútil pode ser rocha ou mata de preservação.',
    senior: 'O SimpleFarm guarda a estrutura de locais até o talhão, com responsável e propriedade rural.',
    desbloqueio: { tipo: 'lugar', ref: { x: -72, z: 13, r: 6 } }, fonte: 'manual' },
  { id: 'cdc-safra', categoria: 'Termo', titulo: 'Safra e ano agrícola',
    texto: 'Safra é o período de produção de uma cultura, do plantio à colheita. O ano agrícola é o período de 12 meses que limita as safras, e não precisa coincidir com o ano do calendário. Um projeto pode ter várias safras, e os períodos podem se sobrepor.',
    senior: 'O SimpleFarm cadastra a safra com período de plantio e de colheita, por projeto.',
    desbloqueio: { tipo: 'parada', ref: 'plan' }, fonte: 'manual' },
  { id: 'cdc-os', categoria: 'Processo', titulo: 'Ordem de serviço (OS)',
    texto: 'Ordem de serviço é o documento que diz o que será feito no campo, onde, quando e por quem. Ela nasce de uma árvore de processo da cultura, que define a ordem e a época de cada atividade. Sem estimativa, o talhão nem entra numa OS de colheita.',
    senior: 'O SimpleFarm abre a OS e garante a integração das informações com o ERP.',
    desbloqueio: { tipo: 'evidencia', ref: 'ev-auto1' }, fonte: 'manual' },
  { id: 'cdc-apontamento', categoria: 'Processo', titulo: 'Apontamento',
    texto: 'Apontamento é o registro do que aconteceu no campo: horas, produção, talhão e equipe. Pode ser feito em papel, em planilha ou em aplicativo no celular. O que importa é o tempo que ele leva até chegar ao controle.',
    senior: 'O MobAgro faz apontamentos agrícolas no Android e sincroniza depois de registrados.',
    desbloqueio: { tipo: 'evidencia', ref: 'ev-agri1' }, fonte: 'manual' },
  { id: 'cdc-timesheet', categoria: 'Sistema', titulo: 'Timesheet',
    texto: 'Timesheet é o registro de horas: quem trabalhou, em qual OS, de que hora a que hora. Quando há máquina, entram também o uso do equipamento e o horímetro. Antes de ir ao custo, o registro passa pela aprovação do gerente.',
    senior: 'O timesheet do SimpleFarm pode ir ao ERP depois de lançado e aprovado.',
    desbloqueio: { tipo: 'parada', ref: 'auto' }, fonte: 'manual' },
  { id: 'cdc-receituario-art', categoria: 'Processo', titulo: 'Receituário agronômico e ART',
    texto: 'Receituário agronômico é o documento que prescreve o uso de defensivo. Para produto controlado ele é obrigatório, e nasce de uma OS. A ART, Anotação de Responsabilidade Técnica, liga o agrônomo responsável ao documento.',
    senior: 'O SimpleFarm emite o receituário a partir da OS, com aprovação do agrônomo responsável.',
    desbloqueio: { tipo: 'parada', ref: 'geo' }, fonte: 'manual' },
  { id: 'cdc-principio-ativo', categoria: 'Termo', titulo: 'Princípio ativo',
    texto: 'Princípio ativo é a substância que dá o efeito esperado no produto, como o combate a uma praga. Dois produtos de marcas diferentes podem ter o mesmo princípio ativo. Alguns princípios não devem ser misturados, e o cadastro registra essa incompatibilidade.',
    senior: 'Suprimentos por Princípio Ativo controla a origem dos insumos pela equivalência de princípios ativos.',
    desbloqueio: { tipo: 'conversa', ref: 'geo' }, fonte: 'manual' },
  { id: 'cdc-monitoramento-pragas', categoria: 'Processo', titulo: 'Monitoramento de pragas',
    texto: 'Monitoramento é a ronda na lavoura para contar pragas, doenças e plantas daninhas antes de decidir aplicar. A equipe registra em ficha o que viu, onde e em que quantidade. A decisão de aplicar sai desse número, e não do calendário.',
    senior: 'Shield e Mapfy ligam o monitoramento ao mapa dos talhões.',
    desbloqueio: { tipo: 'evidencia', ref: 'ev-geo1' }, fonte: 'manual' },
  { id: 'cdc-colhedora', categoria: 'Equipamento', titulo: 'Colhedora',
    texto: 'A colhedora corta a cana no talhão e a passa para o transbordo que anda ao lado. Ela consome combustível e precisa de manutenção como qualquer máquina de frota. Quando deixa cana inteira para trás, a perda acontece sem aparecer em lugar nenhum.',
    senior: 'A Manutenção automotiva (GAtec) acompanha a frota de colhedoras, com preventiva e custo.',
    desbloqueio: { tipo: 'parada', ref: 'agri' }, fonte: 'geral' },
  { id: 'cdc-transbordo', categoria: 'Equipamento', titulo: 'Transbordo',
    texto: 'O transbordo recebe a cana da colhedora e leva até o caminhão ou o trem de carga. Ele roda na frente de colheita, e é comum ter mais de um por frente. Se o transbordo para, a colhedora para junto.',
    senior: 'O timesheet do SimpleFarm registra horas de máquina junto com a OS.',
    desbloqueio: { tipo: 'evidencia', ref: 'ev-agri2' }, fonte: 'geral' },
  { id: 'cdc-treminhao', categoria: 'Equipamento', titulo: 'Treminhão e rodotrem',
    texto: 'Treminhão e rodotrem são conjuntos de caminhão com mais de uma carreta, usados para levar muita cana ou açúcar de uma vez. Eles pesam mais na balança e precisam de pátio com espaço para manobra. Na balança, a composição inteira entra no mesmo ticket.',
    senior: 'O SimpleFarm registra a composição de veículos e a força motriz na balança.',
    desbloqueio: { tipo: 'parada', ref: 'orig' }, fonte: 'manual' },
  { id: 'cdc-cct', categoria: 'Processo', titulo: 'CCT (corte, carregamento e transporte)',
    texto: 'CCT é o conjunto de corte, carregamento e transporte da cana, do talhão até a usina. São três etapas com equipe e máquina próprias, que precisam andar juntas. Por usar muita máquina e muita gente, ela pesa no custo da safra.',
    senior: 'O TMS monitora a frota e os carregamentos em tempo real.',
    desbloqueio: { tipo: 'lugar', ref: { x: -48, z: -12, r: 6 } }, fonte: 'geral' },
  { id: 'cdc-fila-patio', categoria: 'Lugar', titulo: 'Pátio de caminhões e fila',
    texto: 'O pátio é a área onde o caminhão espera a vez para pesar, descarregar ou carregar. A fila tem senha ou agendamento, e quem a organiza decide o que entra primeiro. Fila mal organizada gera caminhão parado e motorista irritado.',
    senior: 'O Operis YMS agenda cargas, prioriza filas e integra cancelas e balanças.',
    desbloqueio: { tipo: 'lugar', ref: { x: 0, z: -9, r: 7 } }, fonte: 'geral' },
  { id: 'cdc-balanca', categoria: 'Equipamento', titulo: 'Balança rodoviária',
    texto: 'A balança rodoviária pesa o caminhão de cana ou o graneleiro de milho inteiro na entrada e na saída. O sistema registra bruto, tara, classificação de qualidade e libera o ticket para o acerto com o fornecedor.',
    senior: 'O App da Balança e o Originação de Grãos integram pesagem, classificação (AgroVerus/AgroCheck) e cancelas.',
    desbloqueio: { tipo: 'parada', ref: 'orig' }, fonte: 'manual' },
  { id: 'cdc-tara-bruto-liquido', categoria: 'Termo', titulo: 'Tara, bruto e líquido',
    texto: 'Tara é o peso do caminhão vazio. Bruto é o peso da carga somado ao veículo. Líquido é a diferença entre os dois, ou seja, só a carga. A pesagem de entrada traz o bruto, a de saída traz a tara, e o sistema calcula o líquido.',
    senior: 'A Central de Processamento de Pesagens do SimpleFarm mostra cada ticket com bruto, tara e líquido.',
    desbloqueio: { tipo: 'conversa', ref: 'orig' }, fonte: 'manual' },
  { id: 'cdc-amostragem-sonda', categoria: 'Processo', titulo: 'Amostragem e sonda',
    texto: 'Em algumas cargas de cana ou milho, o sistema sorteia o caminhão para amostragem. Uma sonda retira material de vários pontos da carga para o laboratório medir ATR na cana ou umidade, impureza e avariados nos grãos.',
    senior: 'O Monitor de Amostragem do SimpleFarm acompanha as amostras, com aprovação ou cancelamento e Boletim Analítico.',
    desbloqueio: { tipo: 'parada', ref: 'ind' }, fonte: 'manual' },
  { id: 'cdc-analise-cana-atr', categoria: 'Termo', titulo: 'Análise de cana (ATR) e milho',
    texto: 'Na cana, BRIX, POL e fibra geram o ATR, base do pagamento no Brasil. No milho safrinha da usina flex, a análise mede umidade, impureza, grãos avariados e amido para ajustar o rendimento de etanol, DDGS e óleo de milho.',
    senior: 'O módulo de Laboratório gerencia análises de cargas, e o Gestão Industrial leva o rendimento à gerência.',
    desbloqueio: { tipo: 'conversa', ref: 'ind' }, fonte: 'manual' },
  { id: 'cdc-moenda', categoria: 'Equipamento', titulo: 'Moenda',
    texto: 'A moenda esmaga a cana para extrair o caldo, que segue para o processo de açúcar ou de etanol. A cana que espera a vez fica na moega, um reservatório que alimenta a moenda. Moenda parada quase sempre significa a usina inteira parada.',
    senior: 'O Gestão Industrial registra insumos, paradas e produção da planta.',
    desbloqueio: { tipo: 'parada', ref: 'ind' }, fonte: 'geral' },
  { id: 'cdc-bagaco-cogeracao', categoria: 'Processo', titulo: 'Bagaço e cogeração',
    texto: 'Bagaço é o que sobra da cana depois da moagem. Em muitas usinas ele queima nas caldeiras, gera vapor e energia para a própria usina, e o excedente pode ser vendido. É esse ciclo que faz da usina também uma geradora de energia.',
    senior: null,
    desbloqueio: { tipo: 'lugar', ref: { x: 26, z: 14, r: 7 } }, fonte: 'geral' },
  { id: 'cdc-vinhaca', categoria: 'Termo', titulo: 'Vinhaça',
    texto: 'Vinhaça é o resíduo líquido da destilação do etanol, rico em nutrientes e produzido em grande volume. Muitas usinas devolvem a vinhaça ao campo por irrigação, como fertilizante. Por isso o transporte de vinhaça aparece como operação própria no planejamento.',
    senior: 'A Ordem de Serviço de Irrigação do SimpleFarm registra operações secundárias, como o transporte de vinhaça.',
    desbloqueio: { tipo: 'parada', ref: 'plan' }, fonte: 'manual' },
  { id: 'cdc-acucar-etanol', categoria: 'Termo', titulo: 'Açúcar VHP e etanol',
    texto: 'VHP quer dizer Very High Polarization, um açúcar bruto de alta pureza que vai para exportação e refino. O etanol sai da fermentação e da destilação do caldo ou do mel. A usina decide quanto da cana vira açúcar e quanto vira etanol, conforme o mercado.',
    senior: 'O Commerce organiza contratos físicos e fretes da venda, e o Commerce Log acompanha o embarque.',
    desbloqueio: { tipo: 'parada', ref: 'com' }, fonte: 'geral' },
  { id: 'cdc-laboratorio', categoria: 'Lugar', titulo: 'Laboratório industrial',
    texto: 'O laboratório mede a qualidade do caldo, do açúcar e do resíduo, e avisa quando o processo sai do ponto. Quando o laudo demora, a decisão também demora. Cada amostra tem código, data e responsável.',
    senior: 'O módulo de Laboratório gerencia análises de cargas, pré-colheita e impurezas.',
    desbloqueio: { tipo: 'lugar', ref: { x: 26, z: 9, r: 6 } }, fonte: 'geral' },
  { id: 'cdc-parada-programada', categoria: 'Processo', titulo: 'Parada programada',
    texto: 'Parada programada é a interrupção marcada da moenda ou de uma área, para manutenção e limpeza, com data e equipe definidas antes. A alternativa é a quebra no meio da safra. Boa parte delas acontece na entressafra, quando a moenda descansa.',
    senior: 'O Gestão Industrial registra paradas e produção da planta, com visibilidade de rendimento.',
    desbloqueio: { tipo: 'parada', ref: 'auto' }, fonte: 'geral' },
  { id: 'cdc-preventiva-corretiva', categoria: 'Termo', titulo: 'Preventiva x corretiva',
    texto: 'Preventiva é a manutenção programada, feita antes de quebrar, pelo contador de horas ou de quilômetros. Corretiva é o conserto depois da quebra. A preventiva costuma custar menos, e a corretiva costuma parar a máquina no pior momento.',
    senior: 'A Manutenção automotiva (GAtec) controla preventiva, corretiva e custos da frota.',
    desbloqueio: { tipo: 'conversa', ref: 'auto' }, fonte: 'manual' },
  { id: 'cdc-horimetro', categoria: 'Equipamento', titulo: 'Horímetro',
    texto: 'Horímetro é o contador de horas de uso de um equipamento. Ele diz quantas horas a máquina trabalhou e é a base da preventiva de trator, colhedora e pulverizador. Quando o medidor falha, o sistema registra a quebra de medidor, e o período fica sem leitura.',
    senior: 'O cadastro de equipamento no SimpleFarm guarda horímetro ou hodômetro, com alocação por vigência.',
    desbloqueio: { tipo: 'lugar', ref: { x: -24, z: 12, r: 5 } }, fonte: 'manual' },
  { id: 'cdc-comboio', categoria: 'Equipamento', titulo: 'Comboio de abastecimento',
    texto: 'O comboio é o caminhão-tanque que abastece as máquinas no campo, sem precisar levá-las até o posto. Ele registra quanto saiu, para qual máquina e em que hora. Sem esse registro, o diesel some no caderno e ninguém sabe quem consumiu.',
    senior: 'A Manutenção automotiva do SimpleFarm registra abastecimentos e reparos da frota.',
    desbloqueio: { tipo: 'evidencia', ref: 'ev-auto2' }, fonte: 'manual' },
  { id: 'cdc-almoxarifado', categoria: 'Lugar', titulo: 'Almoxarifado',
    texto: 'Almoxarifado é o depósito de peças, insumos e materiais de consumo da usina. Cada item tem local de estoque, e a retirada é registrada antes da aplicação ou do conserto. Peça sem registro vira estoque fantasma: existe, mas o sistema não sabe.',
    senior: 'O estoque do Senior ERP movimenta entradas e saídas e mostra o saldo por série e lote.',
    desbloqueio: { tipo: 'lugar', ref: { x: -22, z: 8, r: 5 } }, fonte: 'manual' },
  { id: 'cdc-requisicao-compra', categoria: 'Processo', titulo: 'Requisição e solicitação de compra',
    texto: 'Requisição é o pedido interno de material: quem precisa pede ao estoque. Se o estoque não tem, vira solicitação de compra, que passa por cotação e ordem de compra até a nota de entrada.',
    senior: 'A requisição de compra fica no Senior ERP, ligada ao pedido feito pela GAtec na oficina.',
    desbloqueio: { tipo: 'parada', ref: 'erp' }, fonte: 'manual' },
  { id: 'cdc-nota-entrada', categoria: 'Termo', titulo: 'Nota fiscal de entrada',
    texto: 'Nota fiscal de entrada é o documento que registra a compra ou o recebimento de um produto na empresa. Sem ela, o item entra no estoque, mas a conta a pagar fica sem origem. Na integração, ela liga o recebimento ao contas a pagar.',
    senior: 'O Senior ERP recebe a nota de entrada e gera o contas a pagar.',
    desbloqueio: { tipo: 'parada', ref: 'erp' }, fonte: 'manual' },
  { id: 'cdc-armazem-inventario', categoria: 'Lugar', titulo: 'Armazém e inventário',
    texto: 'Armazém guarda o produto pronto, como açúcar VHP ensacado e farelo DDGS do milho em big bags ou a granel, até o embarque. Inventário confere se o físico do galpão bate com o sistema.',
    senior: 'O Operis gerencia armazéns, expedição e certificados de qualidade.',
    desbloqueio: { tipo: 'lugar', ref: { x: 52, z: -12, r: 6 } }, fonte: 'geral' },
  { id: 'cdc-contrato-preco', categoria: 'Processo', titulo: 'Contrato de venda e fixação de preço',
    texto: 'Contrato de venda diz o que é vendido, em que quantidade, em que prazo e a que preço. Quando o preço é “a fixar”, ele é definido depois, conforme cotações de bolsa, prêmio e câmbio. Fixar é travar esse preço numa data, e quem trava tarde carrega o risco até o embarque.',
    senior: 'O Commerce registra contratos e fixações, e o Oneclick calcula exposição e P&L.',
    desbloqueio: { tipo: 'conversa', ref: 'com' }, fonte: 'manual' },
  { id: 'cdc-incoterm', categoria: 'Termo', titulo: 'Incoterm',
    texto: 'Incoterm é a regra internacional que define quem paga cada custo da entrega e até que ponto da viagem o risco fica com o vendedor. Exemplos comuns são FOB e CIF. Ele muda a conta do frete, da despesa portuária e da certificação de peso.',
    senior: 'O Commerce usa o incoterm para prever as despesas do contrato, na origem ou no destino.',
    desbloqueio: { tipo: 'parada', ref: 'com' }, fonte: 'manual' },
  { id: 'cdc-embarque-porto', categoria: 'Processo', titulo: 'Embarque no porto',
    texto: 'Embarque é a carga do produto no navio. Antes, o armazém é nomeado, a embarcação é indicada e a instrução de embarque organiza a carga. Quando o navio atrasa, a despesa do porto continua correndo.',
    senior: 'O Commerce Log acompanha o que já foi embarcado e o que ainda falta embarcar.',
    desbloqueio: { tipo: 'lugar', ref: { x: 98, z: -14, r: 6 } }, fonte: 'manual' },
  { id: 'cdc-centro-custo', categoria: 'Termo', titulo: 'Centro de custo',
    texto: 'Centro de custo é a divisão onde os gastos de uma área são somados: uma frente, uma oficina, uma fazenda. Ele liga a operação de campo à gestão financeira. Sem centro de custo, a despesa existe, mas não tem dono.',
    senior: 'O cadastro de centro de custo do SimpleFarm vem do plano de centro de custo do ERP.',
    desbloqueio: { tipo: 'egg', ref: 'wiipo' }, fonte: 'manual' },
  { id: 'cdc-rateio', categoria: 'Termo', titulo: 'Rateio',
    texto: 'Rateio é a divisão de um custo entre mais de um destino. Um trator que trabalha em três talhões tem o custo dividido pela área ou pelas horas de cada um. Rateio mal feito muda o custo por talhão e a conta que chega ao diretor.',
    senior: 'O Apoio à Contabilidade (MAC) distribui custos diretos e indiretos aos centros de custo certos.',
    desbloqueio: { tipo: 'evidencia', ref: 'ev-plan2' }, fonte: 'manual' },
  { id: 'cdc-custo-talhao', categoria: 'Termo', titulo: 'Custo por talhão',
    texto: 'Custo por talhão é o gasto da safra distribuído por talhão e, depois, por cultura. Ele responde quanto custou produzir cada área, e não só quanto a fazenda gastou no total. Quando o custo volta do ERP ao campo, o gestor enxerga a diferença entre um talhão e outro.',
    senior: 'A Distribuição de Custos Agrícolas do GAtec recebe o saldo contábil do ERP e distribui o custo por talhão e cultura.',
    desbloqueio: { tipo: 'parada', ref: 'custo' }, fonte: 'manual' },
  { id: 'cdc-fechamento', categoria: 'Processo', titulo: 'Fechamento',
    texto: 'Fechamento é o encerramento do período contábil, quando os lançamentos param e os números são travados. Depois de fechado, uma mudança exige estorno ou reabertura. Fechamento tarde é o que faz a decisão de hoje virar retrovisor.',
    senior: 'Os relatórios gerenciais do ERP e a exportação por APIs mostram o resultado depois do fechamento.',
    desbloqueio: { tipo: 'lugar', ref: { x: 76, z: 12, r: 6 } }, fonte: 'manual' },
  { id: 'cdc-erp', categoria: 'Sistema', titulo: 'ERP',
    texto: 'ERP é o sistema que guarda a gestão da empresa: compras, estoque, financeiro, contabilidade e folha. Ele não enxerga o campo sozinho. A operação chega até ele pela integração, e não por telefone. Quando a ponte é uma pessoa, cada número passa por ela.',
    senior: 'O Gestão Empresarial (ERP) cuida da gestão, e a GAtec cuida da operação, com integração entre as duas.',
    desbloqueio: { tipo: 'lugar', ref: { x: 88, z: 14, r: 5 } }, fonte: 'geral' },
  { id: 'cdc-api', categoria: 'Sistema', titulo: 'Integração por API',
    texto: 'API é a porta de comunicação entre dois sistemas: um pede um dado e o outro responde, sem digitação. Com API, o que foi pesado na balança chega ao ERP sem alguém copiar número. A integração pode ir num sentido só ou nos dois.',
    senior: 'Na integração GAtec com o ERP, o ERP exporta dados por APIs e a GAtec consulta APIs para devolver dados.',
    desbloqueio: { tipo: 'conversa', ref: 'erp' }, fonte: 'manual' },
  { id: 'cdc-entressafra', categoria: 'Termo', titulo: 'Entressafra e usina flex',
    texto: 'Entressafra é o intervalo entre safras de cana, usado para manutenção e reforma. Numa usina flex cana + milho, o milho safrinha estocado em silos alimenta a destilaria durante a entressafra, evitando ociosidade industrial e gerando etanol, DDGS e óleo de milho.',
    senior: 'O cadastro de safra e projeto no SimpleFarm dá a base para planejar cana e milho.',
    desbloqueio: { tipo: 'parada', ref: 'plan' }, fonte: 'geral' },
  { id: 'cdc-carencia', categoria: 'Termo', titulo: 'Carência de colheita',
    texto: 'Carência é o prazo depois da aplicação de um produto em que a área não pode ser colhida. O prazo muda conforme o produto e a cultura. Colher antes do prazo é uma não conformidade, e o sistema pode barrar a OS nesse caso.',
    senior: 'A Fila de OS para aprovação do SimpleFarm reprova a colheita em área em carência.',
    desbloqueio: { tipo: 'parada', ref: 'agri' }, fonte: 'manual' },
  { id: 'cdc-cipa', categoria: 'Termo', titulo: 'CIPA',
    texto: 'CIPA é a Comissão Interna de Prevenção de Acidentes, formada por representantes dos funcionários e da empresa. Quando há acidente, ela investiga o que aconteceu e propõe o que mudar para o próximo turno.',
    senior: null,
    desbloqueio: { tipo: 'egg', ref: 'dias' }, fonte: 'geral' }
];

// 4. Mirantes: pontos de sincronização. codex: verbetes desbloqueados. revela: paradas que aparecem no mapa e na bússola.
const MIRANTES = [
  {
    id: 'mir-sede',
    nome: 'Torre da caixa-d’água (sede)',
    x: -107.5,
    z: -19,
    texto: 'Da torre se veem a sede, o talhão de milho safrinha logo à frente e as faixas de cana até o horizonte. Dali sai o plano duplo que mantém a usina flex moendo o ano inteiro.',
    codex: ['cdc-portaria', 'cdc-talhao', 'cdc-safra', 'cdc-entressafra'],
    revela: ['geo', 'agri', 'auto']
  },
  {
    id: 'mir-industria',
    nome: 'Passarela da indústria',
    x: 34,
    z: 10.5,
    texto: 'Da passarela aparecem a moenda de cana, os quatro silos de milho, o moinho de liquefação, a caldeira e o secador de DDGS. Cana e grãos dividem dornas e vapor para virar açúcar, etanol, DDGS e óleo.',
    codex: ['cdc-moenda', 'cdc-bagaco-cogeracao', 'cdc-vinhaca', 'cdc-laboratorio', 'cdc-parada-programada', 'cdc-analise-cana-atr', 'cdc-amostragem-sonda'],
    revela: ['orig', 'ind', 'arm']
  },
  {
    id: 'mir-porto',
    nome: 'Cais do porto',
    x: 103,
    z: -17,
    texto: 'Do cais, o guindaste levanta a carga até o navio, e a fila de caminhões desce pela estrada. Tudo que a usina vendeu aparece aqui como carga a embarcar ou como contrato que ainda não foi achado.',
    codex: ['cdc-embarque-porto', 'cdc-incoterm', 'cdc-contrato-preco', 'cdc-acucar-etanol', 'cdc-custo-talhao', 'cdc-fechamento', 'cdc-erp', 'cdc-api'],
    revela: ['custo', 'erp', 'com']
  }
];

// 5. Devolutiva presencial: sala da diretoria, fim da tarde. Substitui a ligação.
const DEVOLUTIVA = {
  titulo: 'Devolutiva presencial na sala da diretoria',
  condicaoDeEntrada: 'Dores mapeadas no mínimo do nível: trainee 6, executivo 8, especialista 10.',
  aberturaPorNivel: {
    trainee: 'Dr. Augusto: Senta. Me conta o que você viu, na ordem em que viu.',
    executivo: 'Dr. Augusto: Me diz onde a Horizonte perde margem. Em três frases.',
    especialista: 'Dr. Augusto: Tenho dez minutos. Começa pelo que você não conseguiu provar.'
  },
  perguntas: [
    {
      pergunta: '“Onde eu perco mais?”',
      respostas: [
        {
          tipo: 'boa',
          texto: 'Na colheita que chega na quinta e foi na terça. A Marta anota no papel, e a cana inteira fica no talhão. Eu vi isso com meus olhos.',
          reacao: 'Dr. Augusto: Cana no chão e ninguém soma. Isso eu não tinha visto.'
        },
        {
          tipo: 'morna',
          texto: 'Em vários lugares. Eu anotei tudo e ainda estou organizando.',
          reacao: 'Dr. Augusto: Organizando é o que eu pago para não fazer. Escolhe um.'
        },
        {
          tipo: 'ruim',
          texto: 'Com a plataforma integrada, a usina perde menos. É o que eu faço.',
          reacao: 'Dr. Augusto: Isso é produto. Eu perguntei onde.'
        }
      ]
    },
    {
      pergunta: '“Por que eu trocaria no meio da safra?”',
      respostas: [
        {
          tipo: 'boa',
          texto: 'Não precisa trocar nada no meio da safra. Começa pela oficina, com a preventiva que venceu, e o Seu Tião mostra a primeira ordem.',
          reacao: 'Dr. Augusto: Ele vai resistir. Mas o trator vai parar menos.'
        },
        {
          tipo: 'morna',
          texto: 'Porque a safra acaba. Depois a gente vê.',
          reacao: 'Dr. Augusto: Depois a safra já passou. Não me empurra o depois.'
        },
        {
          tipo: 'ruim',
          texto: 'Porque o nosso sistema é o melhor do mercado.',
          reacao: 'Dr. Augusto: Eu não perguntei o melhor. Perguntei o momento.'
        }
      ]
    },
    {
      pergunta: '“Quanto do que você viu é sistema e quanto é gente?”',
      respostas: [
        {
          tipo: 'boa',
          texto: 'Mais gente que sistema. A Marta, o Caio e o Rui sabem onde dói. O sistema entra depois que eles confirmam.',
          reacao: 'Dr. Augusto: Então o sistema é a última peça, e não a primeira.'
        },
        {
          tipo: 'morna',
          texto: 'Meio a meio. Depende da área.',
          reacao: 'Dr. Augusto: Meio a meio é resposta de quem não foi ao talhão.'
        },
        {
          tipo: 'ruim',
          texto: 'Quase tudo é sistema. Sem o sistema, nada funciona.',
          reacao: 'Dr. Augusto: Então por que o Seu Tião ainda tem caderno?'
        }
      ]
    }
  ],
  comentarioAdvertencias: {
    '0': 'Dr. Augusto: O Valdemar não reclamou de você. Isso já é mais que os outros três.',
    '1': 'Dr. Augusto: O Valdemar anotou uma vez e me contou. Não se repita.',
    '2+': 'Dr. Augusto: O Valdemar reclamou duas vezes. Ele é duro, mas não erra de propósito. Você deu motivo.'
  },
  finais: [
    {
      id: 'contrato_diagnostico',
      titulo: 'Contrato de diagnóstico aprovado',
      criterio: 'Dores no mínimo do nível e pelo menos duas respostas boas.',
      texto: 'Dr. Augusto: Manda o contrato de diagnóstico. Meia hora na semana que vem, com o Valdemar presente.'
    },
    {
      id: 'manda_proposta',
      titulo: 'Manda uma proposta',
      criterio: 'Dores no mínimo do nível, mas menos de duas respostas boas.',
      texto: 'Dr. Augusto: Manda a proposta. Eu leio, mas não prometo nada. Sem a equipe de acordo, a conversa acaba aí.'
    },
    {
      id: 'visita_encerrada',
      titulo: 'Visita encerrada',
      criterio: 'Dores abaixo do mínimo do nível, ou fim de visita por expulsões.',
      texto: 'Dr. Augusto: Você não mapeou o que eu pedi. Obrigado pelo café. A porta é a da portaria.'
    }
  ]
};

// 6. Conquistas (medalhas). Critérios objetivos.
const CONQUISTAS = [
  { id: 'ouvido-de-ouro', nome: 'Ouvido de ouro', criterio: '10 conversas sem pitch precoce: nenhuma escolha ruim ou de produto nas rodadas de situação e problema.', frase: 'Ela contou mais do que você perguntou. Você soube ouvir.' },
  { id: 'cracha-limpo', nome: 'Crachá limpo', criterio: 'Zero advertências no dia.', frase: 'O Valdemar não achou nada para anotar. Ele ainda está procurando.' },
  { id: 'rato-de-usina', nome: 'Rato de usina', criterio: '100% dos verbetes do Caderno de Campo lidos.', frase: 'Você sabe o que é um transbordo. Agora sabe também o que é um rodotrem.' },
  { id: 'do-campo-ao-balanco', nome: 'Do campo ao balanço', criterio: 'Mapa ponta a ponta completo: as seis fases de PONTA_A_PONTA com pelo menos uma parada visitada em cada uma.', frase: 'A cana entrou pelo talhão e saiu no balanço. Você viu o caminho inteiro.' },
  { id: 'olho-de-aguia', nome: 'Olho de águia', criterio: 'Os três mirantes visitados.', frase: 'De cima, a usina parece simples. Não é.' },
  { id: 'evidencia-amarrada', nome: 'Evidência amarrada', criterio: 'As oito evidências da visita registradas.', frase: 'Cada dor tem prova no mapa. O diretor gosta de ver o que você viu.' },
  { id: 'segunda-chance', nome: 'Segunda chance', criterio: 'Voltou da portaria depois de expulso e fechou a devolutiva com contrato de diagnóstico aprovado.', frase: 'Ele deu a segunda chance. Você não precisou da terceira.' },
  { id: 'sem-pitch-no-diretor', nome: 'Sem pitch no diretor', criterio: 'Devolutiva sem nenhuma resposta ruim.', frase: 'O Dr. Augusto perguntou o que dói. Você respondeu com o que viu.' },
  { id: 'dez-de-dez', nome: 'Dez de dez', criterio: 'As dez dores mapeadas, uma para cada área.', frase: 'Dez áreas, dez dores. Nenhuma ficou para a próxima visita.' },
  { id: 'cafe-da-oficina', nome: 'Café da oficina', criterio: 'Encontrou a garrafa térmica da oficina antes de falar com o Seu Tião.', frase: 'Passado às cinco da manhã. Forte o bastante para ligar o trator.' }
];

// 7. O que muda em cada nível na narrativa.
const NIVEIS_HISTORIA = {
  trainee: {
    nome: 'Trainee',
    quemAcompanha: 'Helena, guia da sede, indicada pelo Dr. Augusto na abertura.',
    relogioLimite: '18h00',
    toleranciaValdemar: 'alta',
    advertenciasAteExpulsao: 4,
    expulsoesAteFimDeVisita: null,
    dicas: true,
    doresParaAceitarDevolutiva: 6,
    objecoesNaDevolutiva: 0,
    texto: 'A visita é uma chance de aprender a operação. A Helena explica o que o Valdemar não explica, e o tablet dá dica quando a conversa trava.'
  },
  executivo: {
    nome: 'Executivo',
    quemAcompanha: 'Ninguém. O jogador anda sozinho, e o Valdemar aparece nos gatilhos.',
    relogioLimite: '18h00',
    toleranciaValdemar: 'média',
    advertenciasAteExpulsao: 3,
    expulsoesAteFimDeVisita: 2,
    dicas: false,
    doresParaAceitarDevolutiva: 8,
    objecoesNaDevolutiva: 1,
    texto: 'Sem brilho nas evidências e sem dica. O jogador precisa olhar a cena para achar a dor.'
  },
  especialista: {
    nome: 'Especialista',
    quemAcompanha: 'Valdemar acompanha de perto, em cada área, e pode mandar o jogador embora ao primeiro erro grave.',
    relogioLimite: '17h30',
    toleranciaValdemar: 'baixa',
    advertenciasAteExpulsao: 2,
    expulsoesAteFimDeVisita: 1,
    dicas: false,
    doresParaAceitarDevolutiva: 10,
    objecoesNaDevolutiva: 3,
    texto: 'Dr. Augusto cobra as dez dores e faz três objeções na devolutiva. Cada conversa tem uma frente-isca a mais, e o relógio termina às 17h30.'
  }
};

// 8. Conversas espontâneas da equipe operacional secundária (exploração livre estilo mundo aberto, reativas ao progresso da visita).
const MURMURIOS = [
  {
    id: 'amb-portaria',
    x: -112.4,
    z: -6.8,
    quem: 'Cláudio, vigilante da portaria',
    lugar: 'Portaria · Entrada da Usina',
    aposDe: 'plan',
    falas: [
      ['Cláudio', 'Crachá visível, capacete na área industrial e pé leve nos 20 km/h. O último consultor que tentou passar sem botina deu meia-volta antes do café.'],
      ['Cláudio', 'Se o Valdemar aparecer de prancheta, escuta primeiro. Ele sabe de cor quem veio ajudar e quem só veio ler slide.']
    ],
    falasApos: [
      ['Cláudio', 'A Helena já passou pelo rádio que o plano de safra destravou. Até a troca de turno na cancela já tá com cara de safra organizada.']
    ]
  },
  {
    id: 'amb-oficina',
    x: -20.8,
    z: 18.8,
    quem: 'Beto, mecânico auxiliar',
    lugar: 'Oficina Mecânica',
    aposDe: 'auto',
    falas: [
      ['Beto', 'Esse trator chegou rebocado às quatro da manhã. A ficha sumiu entre o bloco de papel e o pedido de compra que nunca subiu pro ERP.'],
      ['Beto', 'O Seu Tião segura tudo na cabeça, mas tem três colhedoras na frente da Marta esperando peça até agora.']
    ],
    falasApos: [
      ['Beto', 'Agora sim! A preventiva do trator entrou na fila certa com o pedido amarrado no estoque. O Seu Tião até parou de procurar papel na bancada.']
    ]
  },
  {
    id: 'amb-balanca',
    x: 5.0,
    z: -28.0,
    quem: 'Tonho, classificador de cana e grãos',
    lugar: 'Classificação · Balança',
    aposDe: 'orig',
    falas: [
      ['Tonho', 'Aqui entram bitrens de cana pro ATR e graneleiros de milho safrinha pra medir umidade e impureza. Quando a fila trava lá atrás, a cana esquenta e o milho espera no pátio.'],
      ['Tonho', 'O Rui tá procurando a pasta azul desde cedo, mas acho que ela ficou embaixo de algum canhoto de ontem.']
    ],
    falasApos: [
      ['Tonho', 'Com o agendamento do Operis YMS e a pesagem integrada, a fila de cana e os graneleiros de milho estão girando no tempo certo sem ficar no sol.']
    ]
  },
  {
    id: 'amb-moenda',
    x: 22.8,
    z: 16.5,
    quem: 'Davi, operador de planta flex',
    lugar: 'Indústria · Moenda e Milho',
    aposDe: 'ind',
    falas: [
      ['Davi', 'Hoje a moenda de cana e o moinho de milho alimentam as mesmas dornas de fermentação. O problema é quando o laboratório manda o laudo no papel e ninguém ajusta a tempo.'],
      ['Davi', 'Quando cai o rendimento do etanol ou do DDGS fora de hora, o custo estoura lá na mesa da Paula semanas depois.']
    ],
    falasApos: [
      ['Davi', 'Agora o laudo do laboratório já cai no painel da sala de controle. A gente acompanha cana, milho e secador de DDGS no mesmo turno sem perder rendimento.']
    ]
  },
  {
    id: 'amb-armazem',
    x: 49.4,
    z: -16.8,
    quem: 'Lúcia, conferente de expedição',
    lugar: 'Armazém e Pátio',
    aposDe: 'arm',
    falas: [
      ['Lúcia', 'Motorista de açúcar VHP e carreta de DDGS mandam áudio no grupo perguntando da doca, e o Jonas tem que conferir big bag no olho.'],
      ['Lúcia', 'No fim do mês falta lote num bloco e sobra em outro. Ninguém fecha o inventário antes da diretoria cobrar.']
    ],
    falasApos: [
      ['Lúcia', 'Com o Operis apontando o bloco certo para VHP e DDGS, a carreta já encosta direto na doca e o inventário fecha redondo.']
    ]
  },
  {
    id: 'amb-porto',
    x: 103.5,
    z: -14.2,
    quem: 'Marcos, estivador do cais',
    lugar: 'Terminal Portuário',
    aposDe: 'com',
    falas: [
      ['Marcos', 'Navio não espera planilha fechar. Se a carga atrasa na saída do armazém, a multa do porto come a margem da semana inteira.'],
      ['Marcos', 'O André tá tentando cruzar três telas e um e-mail antigo antes que o diretor ligue.']
    ],
    falasApos: [
      ['Marcos', 'O despacho do lote já chegou casado com o contrato no Commerce Log. Hoje o guindaste sobe sem ninguém ligar desesperado do cais.']
    ]
  }
];

// 9. Contrato de cenário isolado (permite evoluir o motor/HUD compartilhado entre múltiplos cenários Konviva).
const SAFRA_SCENARIO = {
  id: 'usina-horizonte',
  titulo: 'Um Dia de Safra',
  subtitulo: 'Usina Horizonte · Konviva Experiências',
  storagePrefix: 'safra_usina_horizonte_',
  spawn: { x: -119, z: 0.6, yaw: -1.0, pitch: -0.03 },
  atos: ATOS,
  paradas: PARADAS,
  diretor: DIRETOR,
  niveis: NIVEIS,
  niveisHistoria: NIVEIS_HISTORIA,
  sinais: SINAIS,
  evidencias: EVIDENCIAS,
  easter: EASTER,
  abertura: ABERTURA,
  fiscal: FISCAL,
  regrasCracha: REGRAS_CRACHA,
  codex: CODEX,
  mirantes: MIRANTES,
  devolutiva: DEVOLUTIVA,
  conquistas: CONQUISTAS,
  pontaAPonta: PONTA_A_PONTA,
  murmurios: MURMURIOS
};

