export interface FrenteSpec {
  n: string;
  p: string;
  c: string[];
}

export interface ParadaSpec {
  id: string;
  hora: string;
  lugar: string;
  x: number;
  lado: -1 | 1;
  quem: string;
  cena: string;
  pergs?: [string, 0 | 1, string][];
  op: [string, 0 | 1, string][];
  frentes: FrenteSpec[];
  levar: string;
  feito: string;
  sz: number;
  nz: number;
  bz: number;
  val: string;
}

export interface SinalSpec {
  id: string;
  x: number;
  z: number;
  n: string;
  p: string;
  t: string;
  c: string[];
}

export interface EvidenciaSpec {
  id: string;
  st: string;
  x: number;
  z: number;
  y: number;
  n: string;
  d: string;
  val: string;
  cadeia?: boolean;
  prop: 'quadro' | 'papel' | 'caderno' | 'estaca' | 'caixa' | 'cana';
}

export interface FrenteCatalogo {
  f: FrenteSpec;
  sources: { type: 'parada' | 'sinal'; id: string }[];
}

const RAW_PARADAS: Omit<ParadaSpec, 'sz' | 'nz' | 'bz' | 'val'>[] = [
  {
    id: 'plan',
    hora: '05:30',
    lugar: 'Sede',
    x: -96,
    lado: -1,
    quem: 'Helena, gerente agrícola',
    cena: 'A safra começa no papel. Antes de a primeira máquina sair, preciso fechar o plano de plantio e reforma, a colheita, o orçamento e os recursos.',
    pergs: [
      [
        'Onde mora o plano da safra de vocês hoje, e quem atualiza quando o campo muda?',
        1,
        'Helena abre o caderno: “Plantio, reforma, orçamento e recursos, tudo num lugar só — e o campo atualiza pelo tablet.”',
      ],
      [
        'Quanto custa plantar um hectare dessa área?',
        0,
        'Helena: “Depende de quanto custou o último. Eu fecho o custo no fim do mês, no Excel.”',
      ],
      [
        'Esse planejamento alimenta o orçamento da indústria também?',
        0,
        'Helena: “O orçamento agrícola é meu. O da indústria é outra planilha, de outra pessoa.”',
      ],
    ],
    op: [
      ['Planejamento', 1, ''],
      [
        'Custos gerenciais',
        0,
        'Custos apura o que já aconteceu. Aqui a Helena ainda está decidindo o que vai acontecer.',
      ],
      [
        'Comercialização',
        0,
        'Comercialização cuida da venda. O dia ainda nem saiu da sede.',
      ],
    ],
    frentes: [
      {
        n: 'Planejamento',
        p: 'SimpleFarm',
        c: ['Plantio e reforma', 'Colheita', 'Orçamento', 'Recursos'],
      },
    ],
    levar:
      'Onde vive o plano da safra hoje? Quem atualiza quando o campo muda?',
    feito:
      'Plano de plantio, reforma, colheita, orçamento e recursos fechados antes da primeira máquina sair.',
  },
  {
    id: 'geo',
    hora: '07:00',
    lugar: 'Talhão 12',
    x: -72,
    lado: 1,
    quem: 'Caio, agrônomo',
    cena: 'A imagem de satélite mostrou uma mancha no talhão. Preciso ver no mapa, confirmar se é praga e decidir rápido quanto insumo aplicar.',
    pergs: [
      [
        'Quanto tempo passa entre ver o problema no mapa e agir no talhão?',
        1,
        'Caio: “Um dia bom. Dois, se a decisão de aplicação precisar subir a hierarquia.”',
      ],
      [
        'Essa imagem é de quando?',
        0,
        'Caio: “De ontem, do fornecedor da imagem. Atualizar por aqui custa caro.”',
      ],
      [
        'Você confia no diagnóstico do satélite?',
        0,
        'Caio: “Confio na minha lupa. O satélite aponta, eu que decido no olho.”',
      ],
    ],
    op: [
      ['Geoespacial e Controle de pragas', 1, ''],
      [
        'Gestão automotiva',
        0,
        'Gestão automotiva cuida da frota. O problema do Caio está na lavoura.',
      ],
      [
        'Armazéns e pátios',
        0,
        'Armazéns e pátios entram depois da indústria. Ainda estamos no campo.',
      ],
    ],
    frentes: [
      { n: 'Geoespacial', p: 'Mapfy', c: ['Shield', 'Sat', 'Soil', 'Way'] },
      {
        n: 'Controle de pragas',
        p: 'Shield',
        c: [
          'Menos infestação',
          'Uso racional de insumos',
          'Inimigos naturais preservados',
          'Manejo sustentável',
          'Decisão mais rápida',
        ],
      },
    ],
    levar:
      'Quanto tempo passa entre ver o problema no talhão e agir? Como vocês decidem onde aplicar?',
    feito:
      'Mancha identificada no mapa, praga confirmada e aplicação dirigida no talhão.',
  },
  {
    id: 'agri',
    hora: '08:30',
    lugar: 'Frente de colheita',
    x: -48,
    lado: -1,
    quem: 'Marta, encarregada de frente',
    cena: 'Colhedora no talhão, transbordo rodando. Cada operação precisa virar apontamento, e a cana pesada e classificada precisa bater com o que saiu daqui.',
    pergs: [
      [
        'Como o apontamento da frente chega ao controle da safra hoje?',
        1,
        'Marta: “No papel, e a digitadora da sede lança à noite. Às vezes, na terça eu ainda estou lançando o que colhi no domingo.”',
      ],
      [
        'Quantos transbordos você tem rodando agora?',
        0,
        'Marta: “Três. Quantos deveria? Depende da pergunta de vocês, não da minha.”',
      ],
      [
        'A cana pesada bate com o que saiu da frente?',
        0,
        'Marta: “Quase sempre. Quando não bate, sou eu que procuro onde perdeu.”',
      ],
    ],
    op: [
      ['Gestão agrícola', 1, ''],
      [
        'Processo industrial',
        0,
        'Processo industrial começa quando a cana chega à moenda. A Marta está no talhão.',
      ],
      [
        'Originação',
        0,
        'Originação trata dos contratos com fornecedores e parceiros. A Marta fala da operação no campo.',
      ],
    ],
    frentes: [
      {
        n: 'Gestão agrícola',
        p: 'SimpleFarm',
        c: [
          'Pesagem e classificação de matéria-prima',
          'Plantio',
          'Tratos',
          'Colheita',
          'Pragas e doenças',
          'Fornecedores',
          'Terceiros',
          'Irrigação',
          'Custos',
          'Mapas',
          'Rurícolas',
          'Máquinas e equipamentos',
          'Fertirrigação',
        ],
      },
    ],
    levar:
      'Como o que acontece no campo chega ao controle da safra? No mesmo dia?',
    feito:
      'Frente apontando no mesmo dia; cana pesada e classificada batendo com a origem.',
  },
  {
    id: 'auto',
    hora: '10:00',
    lugar: 'Oficina',
    x: -24,
    lado: 1,
    quem: 'Tião, líder de manutenção',
    cena: 'Trator parado é safra parada. Preciso da preventiva em dia, do abastecimento registrado e do custo de cada máquina.',
    pergs: [
      [
        'Quando foi a última preventiva desse trator?',
        1,
        'Tião aponta a ordem pregada na parede: “Venceu semana passada. Está aqui há dez dias.”',
      ],
      [
        'Quanto custa a hora parada dessa máquina?',
        0,
        'Tião: “Sei que é caro. O número exato... isso é com o Nivaldo, na controladoria.”',
      ],
      [
        'Esse abastecimento é registrado no sistema?',
        0,
        'Tião: “No caderno. O sistema é bom, mas aqui na bancada o caderno é mais rápido.”',
      ],
    ],
    op: [
      ['Gestão automotiva', 1, ''],
      [
        'Manutenção industrial',
        0,
        'Quase. Manutenção industrial cuida da planta. Trator, colhedora e caminhão são frota.',
      ],
      [
        'Automação',
        0,
        'Automação envia os dados das máquinas. Quem planeja preventiva, pneus e abastecimento é outra frente.',
      ],
    ],
    frentes: [
      {
        n: 'Gestão automotiva',
        p: 'SimpleFarm',
        c: [
          'Planejamento',
          'Preventiva',
          'Corretiva',
          'Mecânicos',
          'Agregados',
          'Serviços externos',
          'Documentos',
          'Pneus',
          'Custos',
          'Abastecimento',
          'Oficina',
          'Operador mantenedor',
        ],
      },
    ],
    levar:
      'Quanto custa uma hora de máquina parada na safra? Quem enxerga isso hoje?',
    feito:
      'Preventiva em dia, abastecimento registrado e custo de cada máquina.',
  },
  {
    id: 'orig',
    hora: '11:30',
    lugar: 'Balança',
    x: 0,
    lado: -1,
    quem: 'Rui, analista de originação',
    cena: 'Parte da cana vem de fornecedores e parceiros. Cada carga que passa aqui tem contrato, serviço e pagamento por trás.',
    op: [
      ['Originação', 1, ''],
      [
        'Comercialização',
        0,
        'Comercialização é a venda do produto pronto. O Rui cuida da matéria-prima que entra.',
      ],
      [
        'Armazéns e pátios',
        0,
        'Armazéns e pátios guardam e expedem produto. O assunto do Rui é contrato com quem fornece.',
      ],
    ],
    frentes: [
      {
        n: 'Originação',
        p: 'SimpleFarm',
        c: [
          'Contrato',
          'Serviços',
          'Documentos',
          'Pagamentos',
          'Agrícola',
          'Workflow',
        ],
      },
    ],
    levar:
      'Como vocês controlam contrato, entrega e pagamento de fornecedores e parceiros?',
    feito:
      'Contrato, serviço e pagamento de fornecedores e parceiros amarrados a cada carga.',
  },
  {
    id: 'ind',
    hora: '13:00',
    lugar: 'Indústria',
    x: 26,
    lado: 1,
    quem: 'Sílvia, gerente industrial',
    cena: 'A moenda não pode parar. Acompanho rendimento e eficiência pelo laboratório e programo as paradas para não quebrar no meio da safra.',
    op: [
      ['Processo industrial e Manutenção industrial', 1, ''],
      [
        'Gestão automotiva',
        0,
        'Gestão automotiva cuida da frota. A Sílvia fala da planta.',
      ],
      [
        'Gestão agrícola',
        0,
        'Gestão agrícola fica no campo. Aqui a cana já virou processo.',
      ],
    ],
    frentes: [
      {
        n: 'Processo industrial',
        p: 'Operis',
        c: [
          'Planejamento industrial',
          'Laboratório',
          'Insumos industriais',
          'Rendimentos e eficiências',
          'Certificado de qualidade individualizado',
          'Vidrarias e reagentes',
        ],
      },
      {
        n: 'Manutenção industrial',
        p: 'SimpleFarm',
        c: [
          'Preventiva',
          'Corretiva',
          'Eficiência',
          'Planejamento',
          'Paradas programadas',
          'Serviços externos',
          'Nivelamento',
          'Custos',
        ],
      },
    ],
    levar:
      'Como vocês ligam o resultado do laboratório ao rendimento da indústria? Como planejam as paradas?',
    feito:
      'Moenda acompanhada pelo laboratório; paradas programadas sem quebrar a safra.',
  },
  {
    id: 'arm',
    hora: '14:30',
    lugar: 'Armazém e pátio',
    x: 52,
    lado: -1,
    quem: 'Jonas, coordenador de expedição',
    cena: 'Produto pronto ocupa espaço e tem hora para sair. Preciso saber o que tem, onde está e qual caminhão carrega agora.',
    op: [
      ['Armazéns e pátios', 1, ''],
      [
        'Logística de vinhaça e plantio',
        0,
        'Essa logística abastece as operações do campo. O Jonas cuida do produto acabado.',
      ],
      [
        'Custos gerenciais',
        0,
        'Custos mostra quanto custou. O Jonas precisa saber onde está e quando sai.',
      ],
    ],
    frentes: [
      {
        n: 'Armazéns e pátios',
        p: 'Operis',
        c: [
          'Armazenamento',
          'Agendamento',
          'Picking',
          'Expedição',
          'Inventário',
          'Mobilidade',
        ],
      },
    ],
    levar:
      'Como vocês agendam as cargas e conferem o inventário? Onde o pátio trava?',
    feito: 'Produto localizado, carga agendada e inventário conferido.',
  },
  {
    id: 'custo',
    hora: '16:00',
    lugar: 'Controladoria',
    x: 76,
    lado: 1,
    quem: 'Paula, controller',
    cena: 'A diretoria quer saber quanto custou cada tonelada. Preciso do custo por processo, por recurso, por fazenda e por produto.',
    op: [
      ['Custos gerenciais', 1, ''],
      [
        'Planejamento',
        0,
        'Planejamento monta o orçamento. A Paula quer o custo do que foi realizado.',
      ],
      [
        'Integração com o ERP',
        0,
        'A integração leva os dados ao ERP. A visão gerencial que a Paula pede é outra frente.',
      ],
    ],
    frentes: [
      {
        n: 'Custos gerenciais',
        p: 'SimpleFarm',
        c: ['Por processo', 'Por recurso', 'Por fazenda', 'Por produto'],
      },
    ],
    levar:
      'Quanto tempo depois da operação vocês fecham o custo? Por fazenda e por produto?',
    feito: 'Custo por processo, recurso, fazenda e produto no mesmo dia.',
  },
  {
    id: 'erp',
    hora: '16:45',
    lugar: 'Centro de gestão',
    x: 88,
    lado: 1,
    quem: 'Rodrigo, analista de integração',
    cena: 'Tudo o que acontece na safra precisa terminar no ERP: requisição, pesagem, movimentação de estoque, pagamento. E preço médio e cadastros precisam voltar para a operação. Quando a integração falha, o dia inteiro vira redigitação.',
    op: [
      ['Integração com o ERP', 1, ''],
      [
        'Automação',
        0,
        'Automação leva o dado da máquina e do sensor para a plataforma. O Rodrigo fala do fluxo entre a plataforma e o ERP da empresa.',
      ],
      [
        'Custos gerenciais',
        0,
        'Custos apura e mostra o valor. Quem leva o dado da operação até o ERP é a integração.',
      ],
    ],
    frentes: [
      {
        n: 'Integração com o ERP',
        p: 'Senior',
        c: [
          'Pagamentos',
          'Estoque',
          'Contabilidade',
          'Custo',
          'Compras',
          'Folha de pagamento',
        ],
      },
    ],
    levar:
      'O que hoje ainda é redigitado entre a operação e o ERP? O que precisa voltar do ERP para o campo?',
    feito:
      'Requisições, pesagem e estoque chegando ao ERP; preço médio e cadastros voltando ao campo.',
  },
  {
    id: 'com',
    hora: '17:30',
    lugar: 'Porto',
    x: 98,
    lado: -1,
    quem: 'André, trader',
    cena: 'O navio tem data para sair. Preciso fechar preço, controlar o risco, cumprir os contratos e embarcar.',
    op: [
      ['Comercialização', 1, ''],
      [
        'Originação',
        0,
        'Originação compra a matéria-prima. O André vende e embarca o produto.',
      ],
      [
        'Armazéns e pátios',
        0,
        'O armazém expede. Preço, risco, contrato e embarque são da comercialização.',
      ],
    ],
    frentes: [
      {
        n: 'Comercialização',
        p: 'CTRMagro',
        c: [
          '@ONEclick',
          'Trading',
          'Front office e pricing',
          'Gestão de contratos',
          'MtM e P&L',
          'Gestão de riscos',
          'Compliance',
          'Rastreabilidade',
          'Integrado com a execução',
          '@Commerce',
          'Produtores e tradings',
          'Commodities',
          'Contratos de compra e venda',
          'Controle de ponta a ponta',
          'Execução do embarque',
          'Otimização operacional',
          'Multimoedas',
          '@CommerceLog',
          'Gestão de carregamentos',
          'Fretes de compra, venda e transferência',
          'Planejamento dos embarques',
          'Planejado × executado',
          'Contato com a transportadora',
          'E-mails automáticos',
        ],
      },
    ],
    levar:
      'Vocês enxergam posição física, contratos e risco na mesma foto?',
    feito:
      'Preço fechado, risco controlado e navio embarcado dentro do contrato.',
  },
];

export const PARADAS: ParadaSpec[] = RAW_PARADAS.map((p) => ({
  ...p,
  sz: p.lado * 4.5,
  nz: p.lado * 10.5,
  bz: p.lado * 22,
  val: 'pendente — revisão agro antes do piloto',
}));

export const SINAIS: SinalSpec[] = [
  {
    id: 'mob',
    x: -60,
    z: 0,
    n: 'Mobilidade de campo',
    p: 'Celular e tablet',
    t: 'Toda entrada de dados tem versão para celular ou tablet, nas áreas agrícola e industrial. Funciona on-line e off-line e sincroniza ao conectar.',
    c: ['Agrícola e industrial', 'On-line e off-line', 'Sincroniza ao conectar'],
  },
  {
    id: 'iot',
    x: -36,
    z: 0,
    n: 'Automação',
    p: 'IoT',
    t: 'As máquinas e os sensores mandam os dados sem digitação.',
    c: [
      'Envio de apontamentos',
      'Dados operacionais das máquinas',
      'Dados meteorológicos',
      'Análises laboratoriais',
      'Consumo das máquinas',
    ],
  },
  {
    id: 'vin',
    x: -12,
    z: 0,
    n: 'Logística de vinhaça e plantio',
    p: 'SimpleFarm',
    t: 'Dimensiona e controla o abastecimento das operações de campo.',
    c: [
      'Otimização',
      'Redução',
      'Gestão e controle',
      'Abastecimento linear (CTT, plantio, preparo e tratos)',
      'Dimensionamento',
      'Previsões e tendências',
      'Custos',
    ],
  },
  {
    id: 'erp',
    x: 64,
    z: 0,
    n: 'Integração com o ERP',
    p: 'Senior',
    t: 'O que acontece na operação chega à gestão da empresa.',
    c: [
      'Pagamentos',
      'Estoque',
      'Contabilidade',
      'Custo',
      'Compras',
      'Folha de pagamento',
    ],
  },
];

export const EVIDENCIAS: EvidenciaSpec[] = [
  {
    id: 'ev-plan1',
    st: 'plan',
    x: -100.5,
    z: -11.5,
    y: 1.35,
    n: 'Quadro do plano de safra',
    d: 'Plantio e reforma, colheita, orçamento e recursos escritos na parede da sede — o plano vive no papel.',
    val: 'pendente',
    prop: 'quadro',
  },
  {
    id: 'ev-plan2',
    st: 'plan',
    x: -92.5,
    z: -11,
    y: 1.28,
    n: 'Recursos na planilha',
    d: 'Máquinas e equipes alocadas à mão, sem vínculo com o plano impresso.',
    val: 'pendente',
    prop: 'papel',
  },
  {
    id: 'ev-geo1',
    st: 'geo',
    x: -75.5,
    z: 15.5,
    y: 0.25,
    n: 'A mancha no talhão',
    d: 'A área amarelada que a imagem de satélite apontou — visível da estrada.',
    val: 'pendente',
    prop: 'cana',
  },
  {
    id: 'ev-geo2',
    st: 'geo',
    x: -64.5,
    z: 15.2,
    y: 1.4,
    n: 'Torre e drone prontos',
    d: 'A operação já tem dado de cima; falta ligar o que se vê ao que se decide.',
    val: 'pendente',
    prop: 'estaca',
  },
  {
    id: 'ev-agri1',
    st: 'agri',
    x: -52.5,
    z: -11,
    y: 1.28,
    n: 'Apontamento em papel',
    d: 'O apontamento da frente vira planilha depois — quando sobra tempo.',
    val: 'pendente',
    prop: 'papel',
  },
  {
    id: 'ev-agri2',
    st: 'agri',
    x: -43.5,
    z: -12,
    y: 0.25,
    n: 'Palha e cana inteira',
    d: 'A colhedora deixa cana inteira no campo: perda que ninguém soma no dia.',
    val: 'pendente',
    prop: 'cana',
  },
  {
    id: 'ev-auto1',
    st: 'auto',
    x: -20.5,
    z: 15,
    y: 1.35,
    n: 'Ordem de preventiva atrasada',
    d: 'A preventiva do trator venceu na semana passada e o capô continua aberto.',
    val: 'pendente',
    cadeia: true,
    prop: 'quadro',
  },
  {
    id: 'ev-auto2',
    st: 'auto',
    x: -27.5,
    z: 15.5,
    y: 0.95,
    n: 'Abastecimento no caderno',
    d: 'Litros anotados à mão no balcão da oficina — custo de máquina sem dono.',
    val: 'pendente',
    prop: 'caderno',
  },
];

export const RADIO: string[] = [
  'Bom dia, equipe. Carga 41 sai do Talhão 12 às 05:45. O dia de safra começa agora.',
  'Talhão 12: mancha confirmada pela frente do Caio. Aplicação dirigida autorizada.',
  'Frente 3 cortando a linha 8. Carga 41 no transbordo, caminho da balança.',
  'Frota: preventiva do trator 22 venceu. Responsável procurar a oficina hoje.',
  'Carga 41 na balança, 28,4 toneladas. Contrato conferido.',
  'Indústria recebeu a carga 41. Moenda estável, rendimento no alvo.',
  'Carga 41 processada. Açúcar no armazém 3, aguardando expedição.',
  'Custo do dia fechando por fazenda. Diretoria às 16h.',
  'Carga 41 no ERP: pesagem e estoque sem redigitação.',
  'Navio Horizonte Star atracado. Carga 41 a bordo até as 17h30.',
];

export const CHAIN_RADIO_MSG =
  'Centro de operações para frente 3: colhedora parada de novo. A preventiva venceu na oficina e ninguém assinou a ordem.';
export const CHAIN_AVISO_MSG =
  'Efeito em cadeia: a preventiva ignorada na Oficina parou a colhedora';

export function buildFrentesCatalogo(): FrenteCatalogo[] {
  const map: Record<string, FrenteCatalogo> = {};
  for (const p of PARADAS) {
    for (const f of p.frentes) {
      if (!map[f.n]) {
        map[f.n] = { f, sources: [] };
      }
      map[f.n].sources.push({ type: 'parada', id: p.id });
    }
  }
  for (const s of SINAIS) {
    if (!map[s.n]) {
      map[s.n] = { f: { n: s.n, p: s.p, c: s.c }, sources: [] };
    }
    map[s.n].sources.push({ type: 'sinal', id: s.id });
  }
  return Object.values(map);
}

export const FRENTES_CATALOGO: FrenteCatalogo[] = buildFrentesCatalogo();

export function evidenciasDaParada(paradaId: string): EvidenciaSpec[] {
  return EVIDENCIAS.filter((ev) => ev.st === paradaId);
}
