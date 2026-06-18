import { UserProfile, UserRole, Obra, AuditLog, Revision } from "../types";
import { pruneObraForSnapshot, pruneObrasProgressively } from "../utils/compressor";

export const INITIAL_USERS: UserProfile[] = [
  {
    id: "user-vinicius",
    name: "Vinicius Cardozo Martins",
    email: "vinicius.martins@quantaconsultoria.com",
    role: UserRole.ADMINISTRADOR
  },
  {
    id: "user-flavio",
    name: "Flávio da Cruz Cabral",
    email: "flavio.cabral@quantaconsultoria.com",
    role: UserRole.ENGENHEIRO_CHEFE
  },
  {
    id: "user-andreia",
    name: "Andreia Ferreira Paula",
    email: "andreia.paula@quantaconsultoria.com",
    role: UserRole.ENGENHEIRO_CHEFE
  },
  {
    id: "user-maria",
    name: "Maria Carolina Madacon",
    email: "maria.madacon@quantaconsultoria.com",
    role: UserRole.ENGENHEIRO_CHEFE
  },
  {
    id: "user-kellen",
    name: "Kellen Cristyan Teixeira",
    email: "kellen.teixeira@quantaconsultoria.com",
    role: UserRole.ENGENHEIRO_CHEFE
  },
  {
    id: "user-luiz-eduardo",
    name: "Luiz Eduardo da Silva Dias",
    email: "luiz.dias@quantaconsultoria.com",
    role: UserRole.ENGENHEIRO_CHEFE
  },
  {
    id: "user-luiz-felipe",
    name: "Luiz Felipe de Medeiros Paiva",
    email: "luiz.paiva@quantaconsultoria.com",
    role: UserRole.ENGENHEIRO_CHEFE
  },
  {
    id: "user-lucia",
    name: "Lúcia Costa",
    email: "lucia.costa@quantaconsultoria.com",
    role: UserRole.ENGENHEIRO_CHEFE
  }
];

export const INITIAL_OBRAS: Obra[] = [
  {
    id: "obra-1",
    titulo: "TC 60/2022 - PENÍNSULA DO SAMBA – MUSEU DARCY RIBEIRO, ANEXO BERTA E PRAÇA DAS UTOPIAS",
    contratoNo: "60/2023",
    concorrenciaPublicaNo: "39/2022",
    processoAdministrativoNo: "4200/2022",
    dataAssinatura: "20/10/2023",
    dataPublicacaoJOM: "23/10/2023",
    dataOrdemInicio: "23/10/2023",
    empresaVencedora: "Monobloco Construção Ltda",
    prazoVigenciaInicial: "8 meses",
    prazoExecucaoInicial: "8 meses",
    dataInicio: "23/10/2023",
    valorContratualInicial: 4386697.66,
    
    valorContratualAtual: 4386697.66,
    prazoVigenciaAtual: "34 meses",
    prazoExecucaoAtual: "34 meses",
    percentualFisicoAtual: 79,
    statusGeral: "Em Andamento",
    
    aditivos: [
      {
        id: "ad-1-1",
        numero: 1,
        tipo: "prazo",
        dataAssinatura: "20/06/2024",
        dataPublicacaoJOM: "03/07/2024",
        prazoAditivadoMeses: 10,
        valorAditivado: 0,
        novoPrazoContratual: "20/04/2025",
        novoPrazoExecucao: "20/04/2025",
        novoValorContratual: "R$ 4.386.697,66",
        descricao: "Prorrogação de prazo por 10 meses devido a atrasos de readequações de projeto."
      },
      {
        id: "ad-1-2",
        numero: 2,
        tipo: "prazo",
        dataAssinatura: "21/04/2025",
        dataPublicacaoJOM: "02/07/2025",
        prazoAditivadoMeses: 10,
        valorAditivado: 0,
        novoPrazoContratual: "20/02/2026",
        novoPrazoExecucao: "20/02/2026",
        novoValorContratual: "R$ 4.386.697,66",
        descricao: "Prorrogação de prazo com o objetivo de concluir a passarela técnica externa."
      },
      {
        id: "ad-1-3",
        numero: 3,
        tipo: "prazo",
        dataAssinatura: "20/02/2026",
        dataPublicacaoJOM: "21/05/2026",
        prazoAditivadoMeses: 6,
        valorAditivado: 0,
        novoPrazoContratual: "21/08/2026",
        novoPrazoExecucao: "21/08/2026",
        novoValorContratual: "R$ 4.386.697,66",
        descricao: "Aditivo de prazo de mais 6 meses para conclusão total dos itens de acabamento."
      }
    ],
    
    relatoriosSemanais: [
      {
        id: "rep-1-1",
        periodoInicio: "2026-05-18",
        periodoFim: "2026-05-22",
        percentualFisico: 79,
        situacaoAditivo: "Aguardando homologação do 3º Aditivo",
        informacaoRelevante: "Sem pendências orçamentárias no momento.",
        atividadesInfraDados: "N/A",
        statusAumentoCargaEnel: "A concessionária de energia (ENEL) deu início à infraestrutura de Média Tensão para atendimento da unidade da Praça da Utopia.",
        statusSubestacao: "N/A",
        atividadesSemana: [
          "Recorte dos encaixes das réguas em material polimérico para instalação do deck del pergolado;",
          "Aplicação de contrapiso para nivelamento de superfície localizada abaixo do pergolado;",
          "Continuação dos serviços de regularização da superfície de concreto da calçada;",
          "Continuidade dos serviços executados pela Enel da infraestrutura elétrica."
        ],
        atividadesProximaSemana: [
          "Continuidade da instalação do deck em réguas poliméricas;",
          "Aplicação de adesivos de contato e colas para fixação do deck polimérico;",
          "Continuação dos serviços de regularização e acabamento de superfícies."
        ],
        observacoesApontamentos: [
          "A atualização do cronograma de finalização depende do recebimento do aditivo assinado pela CODEMAR.",
          "Identificação de não conformidade referente à presença de fissuras na superfície de concreto da laje do piso, sendo necessária avaliação técnica."
        ],
        fotos: [
          { id: "f-1-1", url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&auto=format&fit=crop", legenda: "Instalação do deck na Praça das Utopias" },
          { id: "f-1-2", url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&auto=format&fit=crop", legenda: "Nivelamento de solo e regularização de concreto" }
        ]
      },
      {
        id: "rep-1-2",
        periodoInicio: "2026-05-25",
        periodoFim: "2026-05-29",
        percentualFisico: 79,
        situacaoAditivo: "Formalizado",
        informacaoRelevante: "N/A",
        atividadesInfraDados: "N/A",
        statusAumentoCargaEnel: "A concessionária de energia (ENEL) deu início a infraestrutura de Média Tensão onde irá atender as demandas da unidade da Praça da Utopia.",
        statusSubestacao: "N/A",
        atividadesSemana: [
          "Limpeza do canteiro de obras e remoção de plantas infestantes;",
          "Corte e adequação dos acessos às caixas de visita;",
          "Recebimento dos ripados em material polimérico destinados à execução do deck;",
          "Posicionamento dos ripados para posterior fixação do deck;",
          "INSTALAÇÕES ELÉTRICAS: Execução da conexão do ramal alimentador referente ao aumento de carga para 200 A;",
          "INSTALAÇÕES ELÉTRICAS: Preparação da caixa de passagem elétrica para posterior instalação e interligação da infraestrutura elétrica."
        ],
        atividadesProximaSemana: [
          "Retomada da fixação das ripas do deck em material polimérico com utilização de cola de contato;",
          "Execução dos recortes e encaixes necessários para a montagem e acabamento do deck."
        ],
        observacoesApontamentos: [
          "A Contratada está realizando testes para aferir se as fissuras são profundas. Até o momento na área analisada foi observado que eram fissuras superficiais não impactando a resistência do concreto."
        ],
        fotos: [
          { id: "f-1-3", url: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=500&auto=format&fit=crop", legenda: "Estoque de madeira polimérica" },
          { id: "f-1-4", url: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=500&auto=format&fit=crop", legenda: "Ligações de infraestrutura elétrica" }
        ]
      }
    ]
  },
  {
    id: "obra-2",
    titulo: "TC 62/2023 – PARQUE TECNOLÓGICO",
    contratoNo: "62/2023",
    concorrenciaPublicaNo: "06/2023",
    processoAdministrativoNo: "4249/2023",
    dataAssinatura: "27/10/2023",
    dataPublicacaoJOM: "01/11/2023",
    dataOrdemInicio: "01/11/2023",
    empresaVencedora: "W COSTA CONSTRUTORA LTDA",
    prazoVigenciaInicial: "1 ano e 6 meses (18 meses)",
    prazoExecucaoInicial: "1 ano e 3 meses (15 meses)",
    dataInicio: "01/11/2023",
    valorContratualInicial: 39760239.33,
    
    valorContratualAtual: 49673217.10,
    prazoVigenciaAtual: "36 meses",
    prazoExecucaoAtual: "33 meses",
    percentualFisicoAtual: 92,
    statusGeral: "Em Andamento",
    
    aditivos: [
      {
        id: "ad-2-1",
        numero: 1,
        tipo: "prazo",
        dataAssinatura: "16/04/2025",
        dataPublicacaoJOM: "30/04/2025",
        prazoAditivadoMeses: 6,
        valorAditivado: 0,
        novoPrazoContratual: "24 meses",
        novoValorContratual: "R$ 39.760.239,33",
        descricao: "Prorrogação de prazo contratual em 6 meses."
      },
      {
        id: "ad-2-2",
        numero: 2,
        tipo: "prazo",
        dataAssinatura: "28/10/2025",
        dataPublicacaoJOM: "17/11/2025",
        prazoAditivadoMeses: 6,
        valorAditivado: 0,
        novoPrazoContratual: "30 meses (Até 26/04/2026)",
        novoValorContratual: "R$ 39.760.239,33",
        descricao: "Prorrogação de prazo contratual para finalização dos pavimentos superiores."
      },
      {
        id: "ad-2-3",
        numero: 3,
        tipo: "financeiro",
        dataAssinatura: "28/11/2025",
        dataPublicacaoJOM: "05/12/2025",
        valorAditivado: 9912977.77,
        novoPrazoContratual: "30 meses",
        novoValorContratual: "R$ 49.673.217,10",
        descricao: "Acréscimo financeiro referente à inclusão do sistema de ar condicionado central e CFTv."
      },
      {
        id: "ad-2-4",
        numero: 4,
        tipo: "prazo",
        dataAssinatura: "11/02/2026",
        dataPublicacaoJOM: "12/02/2026",
        prazoAditivadoMeses: 6,
        valorAditivado: 0,
        novoPrazoContratual: "Vigência: 23/10/2026 | Execução: 28/07/2026",
        novoValorContratual: "R$ 49.673.217,10",
        descricao: "Adequação de cronograma físico-financeiro repactuado."
      }
    ],
    relatoriosSemanais: [
      {
        id: "rep-2-1",
        periodoInicio: "2026-05-11",
        periodoFim: "2026-05-15",
        percentualFisico: 92,
        situacaoAditivo: "Aguardando a publicação do 4º aditivo.",
        informacaoRelevante: "N/A",
        atividadesInfraDados: "A análise de viabilidade de rede da Leste Telecom aponta duas alternativas de conexão: link dedicado ou banda larga residencial padrão.",
        statusAumentoCargaEnel: "N/A",
        statusSubestacao: "Não houve atualização em relação à montagem e comissionamento da subestação que atenderá ao Parque Tecnológico.",
        atividadesSemana: [
          "ASA NORTE: Limpeza geral no terceiro pavimento e instalação de splitters primários de AC.",
          "ASA SUL: Lixamento e aplicação de massa corrida seladora nas paredes externas térreas.",
          "BLOCO CENTRAL: Armazenamento e isolamento de dutos térmicos galvanizados.",
          "ÁREA EXTERNA: Nivelamento do talude com retroescavadeira."
        ],
        atividadesProximaSemana: [
          "Execução da montagem de grelhas e difusores de insuflação no forro geral;",
          "Execução da pintura látex interna nas salas administrativas;",
          "Lixamento do gesso liso de acabamento nos tetos."
        ],
        observacoesApontamentos: [
          "Guarda-corpos apresentam alturas entre 0,87m e 1,02m, infringindo a NBR 14718 (mínimo de 1,10m). Apenas o 1º pavimento está correto.",
          "Identificado gotejamento crônico no hall de escadas devido à falha de estanqueidade na cobertura transparente lateral."
        ],
        fotos: [
          { id: "f-2-1", url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&auto=format&fit=crop", legenda: "Instalação de climatizadores" },
          { id: "f-2-2", url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&auto=format&fit=crop", legenda: "Pintura externa" }
        ]
      },
      {
        id: "rep-2-2",
        periodoInicio: "2026-05-25",
        periodoFim: "2026-05-29",
        percentualFisico: 92,
        situacaoAditivo: "Formalizado",
        informacaoRelevante: "N/A",
        atividadesInfraDados: "Após a análise de viabilidade realizada pela Leste Telecom, foram propostas duas formas de conexão. A primeira trata-se de um link dedicado, que assegura a entrega total da banda contratada diretamente no Rack, além de oferecer atendimento técnico prioritário. A alternativa é a banda larga convencional, voltada ao uso comercial ou residencial, que segue os prazos habituais de ativação e possui oscilações de desempenho condizentes com conexões comuns. A região do Parque Tecnológico conta com dois provedores de serviço: a Leste Telecom e a FibraMar.",
        statusAumentoCargaEnel: "N/A",
        statusSubestacao: "Não houve atualização em relação a montagem e comissionamento da subestação que irá atender ao Parque Tecnológico.",
        atividadesSemana: [
          "ASA NORTE: Não houve atividades nesse período.",
          "ASA SUL: Lixamento de massa corrida no térreo.",
          "BLOCO CENTRAL: Não houve atividades nesse período.",
          "ÁREA EXTERNA: Recuo executado para viabilizar a instalação do poste de energia;",
          "ÁREA EXTERNA: Execução de seis pontos de sondagem SPT;",
          "ÁREA EXTERNA: Corte, nivelamento e movimentação de solo com escavadeira e caminhão basculante.",
          "ELÉTRICA: Não houve atividades nesse período."
        ],
        atividadesProximaSemana: [
          "Execução de pintura interna;",
          "Lixamento de massa corrida;",
          "Realização de cortes no talude, com transporte e destinação final do material excedente."
        ],
        observacoesApontamentos: [
          "Não conformidades identificadas:",
          "Guarda-corpos fora dos padrões normativos: Nos pavimentos superiores, os guarda-corpos não atendem à ABNT NBR 14718:2019, apresentando altura inferior ao mínimo de 1,10 m. Apenas o primeiro pavimento está em conformidade, o que representa risco à segurança dos usuários.",
          "Entrada de água da chuva e acúmulo nos pisos: A falta de cobertura expõe os pavimentos à chuva, causando retenção de água em áreas abertas e cobertas. O nivelamento inadequado compromete o escoamento, favorece fissuras no epóxi e infiltrações em níveis inferiores.",
          "Auditório: Detectou-se infiltração no palco, proveniente do jardim superior.",
          "Área externa: Em chuvas intensas, ocorreram alagamentos na casa de bombas do sistema de incêndio, acúmulo de água em estacionamento e caixas elétricas.",
          "Sistema elétrico: Foi constatada água em caixas de passagem e na sala do Quadro Geral de Baixa Tensão (QGBT), condição que representa risco de curto-circuito e falhas operacionais. Também foram identificadas luminárias danificadas por ventos fortes."
        ],
        fotos: [
          { id: "f-2-3", url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&auto=format&fit=crop", legenda: "Equipe trabalhando na área externa" },
          { id: "f-2-4", url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&auto=format&fit=crop", legenda: "Massa corrida e gesso" }
        ]
      }
    ]
  },
  {
    id: "obra-3",
    titulo: "TC 30/2024 – HOTEL EXECUTIVO",
    contratoNo: "30/2024",
    concorrenciaPublicaNo: "03/2024",
    processoAdministrativoNo: "8819/2022",
    dataAssinatura: "30/08/2024",
    dataPublicacaoJOM: "04/09/2024",
    dataOrdemInicio: "30/08/2024",
    empresaVencedora: "W COSTA CONSTRUTORA LTDA",
    prazoVigenciaInicial: "1 ano e 6 meses (18 meses)",
    prazoExecucaoInicial: "1 ano e 3 meses (15 meses)",
    dataInicio: "30/08/2024",
    valorContratualInicial: 36262093.15,
    
    valorContratualAtual: 36262093.15,
    prazoVigenciaAtual: "24 meses",
    prazoExecucaoAtual: "21 meses",
    percentualFisicoAtual: 59,
    statusGeral: "Em Andamento",
    
    aditivos: [
      {
        id: "ad-3-1",
        numero: 1,
        tipo: "prazo",
        dataAssinatura: "27/02/2026",
        dataPublicacaoJOM: "15/04/2026",
        prazoAditivadoMeses: 6,
        valorAditivado: 0,
        novoPrazoContratual: "27/08/2026",
        novoPrazoExecucao: "29/05/2026",
        novoValorContratual: "R$ 36.262.093,15",
        descricao: "Prorrogação de prazo em 6 meses por atrasos em fornecimento de ligas de aço estrutural."
      }
    ],
    relatoriosSemanais: [
      {
        id: "rep-3-1",
        periodoInicio: "2026-05-11",
        periodoFim: "2026-05-15",
        percentualFisico: 59,
        situacaoAditivo: "Formalizado",
        informacaoRelevante: "Pendente licença municipal ambiental de rebaixo residual de águas.",
        atividadesInfraDados: "Nivelamento de leito para instalação da infra de dados.",
        statusAumentoCargaEnel: "N/A",
        statusSubestacao: "Necessidade de início imediato da montagem da cabine de MT.",
        atividadesSemana: [
          "Execução de prumada hidráulica em shafts dos pavimentos 4º, 5º e 6º;",
          "Fechamento de furos de montagem e regularização dos shafts técnicos de encubação."
        ],
        atividadesProximaSemana: [
          "Continuidade em shafts nos 4º, 5º e 6º pavimentos;",
          "Montagem dos registros principais de água nas prumadas de escoamento."
        ],
        observacoesApontamentos: [
          "Obra sofre com desmobilização paulatina do efetivo da construtora, apresentando avanço físico estagnado em 59%.",
          "O projeto elétrico executivo da subestação ainda não foi apresentado de forma adequada."
        ],
        fotos: [
          { id: "f-3-1", url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&auto=format&fit=crop", legenda: "Prumadas de tubulação PVC" }
        ]
      },
      {
        id: "rep-3-2",
        periodoInicio: "2026-05-25",
        periodoFim: "2026-05-29",
        percentualFisico: 59,
        situacaoAditivo: "N/A",
        informacaoRelevante: "N/A",
        atividadesInfraDados: "Nivelamento de leito para instalação da estrutura de rebaixamento.",
        statusAumentoCargaEnel: "N/A",
        statusSubestacao: "Ressalta-se a necessidade de início da montagem da Subestação Elétrica do hotel, tendo em vista que a mobilização dessa frente é fundamental para evitar dependência dos prazos da concessionária de energia. Eventuais atrasos nessa etapa poderão impactar diretamente a realização da vistoria técnica e, consequentemente, o fornecimento de energia ao empreendimento. Destaca-se, contudo, que até o presente momento não foi disponibilizado à equipe de supervisão o projeto executivo da subestação elétrica, condição que limita a análise técnica detalhada quanto ao layout, dimensionamento e compatibilização com as demais disciplinas do empreendimento. Adicionalmente, não foi apresentada à equipe de supervisão a reprogramação formal do cronograma das frentes relativas à subestação e à eletromecânica, tampouco houve comunicação formal complementar acerca das providências adotadas.",
        atividadesSemana: [
          "Instalação de registros de água quente e fria nos shafts do 4º, 5º e 6º pavimentos;",
          "Execução do fechamento da prumada de esgoto na fachada lateral."
        ],
        atividadesProximaSemana: [
          "Continuidade da execução de hidráulica nos shafts nos 4º, 5º e 6º pavimentos."
        ],
        observacoesApontamentos: [
          "A obra segue com redução significativa do efetivo operacional, o que tem impactado diretamente o ritmo de produção. Em razão desse cenário, o avanço físico permanece estagnado em 59%, sem evolução no período de referência. Essa condição indica a necessidade de revisão do planejamento, reforço de recursos e adoção de medidas gerenciais para mitigar atrasos e evitar comprometimento dos prazos contratuais."
        ],
        fotos: [
          { id: "f-3-2", url: "https://images.unsplash.com/photo-1541854615901-93c354197834?w=500&auto=format&fit=crop", legenda: "Instalações hidráulicas nos shafts e fechamento de prumadas" }
        ]
      }
    ]
  },
  {
    id: "obra-4",
    titulo: "TC 07/2024 – ENTREPOSTO DE PESCADORES",
    contratoNo: "07/2025",
    concorrenciaPublicaNo: "07/2024",
    processoAdministrativoNo: "17309/2024",
    dataAssinatura: "20/02/2025",
    dataPublicacaoJOM: "12/03/2025",
    dataOrdemInicio: "26/02/2025",
    empresaVencedora: "Concretiza Engenharia LTDA",
    prazoVigenciaInicial: "10 meses",
    prazoExecucaoInicial: "6 meses",
    dataInicio: "03/07/2025",
    valorContratualInicial: 4063116.23,
    
    valorContratualAtual: 4063116.23,
    prazoVigenciaAtual: "16 meses",
    prazoExecucaoAtual: "12 meses",
    percentualFisicoAtual: 48,
    statusGeral: "Em Andamento",
    
    aditivos: [
      {
        id: "ad-4-1",
        numero: 1,
        tipo: "prazo",
        dataAssinatura: "04/12/2025",
        dataPublicacaoJOM: "08/12/2025",
        prazoAditivadoMeses: 6,
        valorAditivado: 0,
        novoPrazoContratual: "26/06/2026",
        novoPrazoExecucao: "26/02/2026 e formalização de novo prazo em andamento",
        novoValorContratual: "R$ 4.063.116,23",
        descricao: "Prorrogação de vigência contratual por mais 6 meses por aditivo de prazo formalizado."
      }
    ],
    relatoriosSemanais: [
      {
        id: "rep-4-1",
        periodoInicio: "2026-05-18",
        periodoFim: "2026-05-22",
        percentualFisico: 48,
        situacaoAditivo: "Aguardando novo prazo executivo.",
        informacaoRelevante: "N/A",
        atividadesInfraDados: "N/A",
        statusAumentoCargaEnel: "Pendente vistoria conjunta para dimensionamento da rede primária.",
        statusSubestacao: "N/A",
        atividadesSemana: [
          "Entreposto de Pescadores Espraiado: Concretagem de Radier principal de sustentação.",
          "Base de apoio: Reposição da pedra de cantaria que reveste o muro da fachada."
        ],
        atividadesProximaSemana: [
          "Entreposto: Cura úmida do radier e desmonte de formas de borda;",
          "Base de apoio: Início do fechamento estrutural do portão de ferro principal."
        ],
        observacoesApontamentos: [
          "Indispensável a verificação do andamento do pedido de carga elétrica junto à concessionária de energia ENEL, sob risco de sobrecarga."
        ],
        fotos: [
          { id: "f-4-1", url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&auto=format&fit=crop", legenda: "Lançamento concreto do Radier" }
        ]
      },
      {
        id: "rep-4-2",
        periodoInicio: "2026-05-25",
        periodoFim: "2026-05-29",
        percentualFisico: 48,
        situacaoAditivo: "N/A",
        informacaoRelevante: "N/A",
        atividadesInfraDados: "N/A",
        statusAumentoCargaEnel: "É indispensável a verificação do andamento da solicitação de aumento de carga junto à concessionária ENEL, a fim de garantir o atendimento à demanda elétrica do empreendimento e assegurar o adequado funcionamento dos equipamentos previstos em projeto, evitando sobrecargas no sistema existente.",
        statusSubestacao: "N/A",
        atividadesSemana: [
          "Entreposto de Pescadores Espraiado: Concretagem de Radier;",
          "Base de apoio: Reposição da pedra que reveste o muro a fachada."
        ],
        atividadesProximaSemana: [
          "Entreposto de Pescadores Espraiado: Concretagem em processo de cura; Retirada da fôrma; Início das instalações das caixas de esgoto externas;",
          "Base de apoio: Início da instalação do portão de acesso veicular; Finalização da calha da cobertura termoacústica."
        ],
        observacoesApontamentos: [],
        fotos: [
          { id: "f-4-2", url: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=500&auto=format&fit=crop", legenda: "Concretagem de Radier e revestimento de muros" }
        ]
      }
    ]
  },
  {
    id: "obra-5",
    titulo: "TC 37/2024 – RECUPERAÇÃO DA PISTA DE POUSO E DECOLAGEM DO AEROPORTO LAÉLIO BATISTA",
    contratoNo: "37/2024",
    concorrenciaPublicaNo: "05/2024",
    processoAdministrativoNo: "20413/2023",
    dataAssinatura: "19/09/2024",
    dataPublicacaoJOM: "23/09/2024",
    dataOrdemInicio: "01/10/2024",
    empresaVencedora: "MCDR EDIFICAÇÕES LTDA",
    prazoVigenciaInicial: "9 meses",
    prazoExecucaoInicial: "6 meses",
    dataInicio: "01/10/2024",
    valorContratualInicial: 38893104.07,
    
    valorContratualAtual: 56446080.80,
    prazoVigenciaAtual: "21 meses",
    prazoExecucaoAtual: "18 meses",
    percentualFisicoAtual: 100,
    statusGeral: "Em Andamento",
    
    aditivos: [
      {
        id: "ad-5-1",
        numero: 1,
        tipo: "prazo",
        dataAssinatura: "01/07/2025",
        dataPublicacaoJOM: "11/07/2025",
        prazoAditivadoDias: 180,
        valorAditivado: 0,
        novoPrazoContratual: "28/12/2025",
        novoValorContratual: "R$ 38.893.104,07",
        descricao: "Prorrogação de prazo em 180 dias."
      },
      {
        id: "ad-5-2",
        numero: 2,
        tipo: "financeiro",
        dataAssinatura: "12/09/2025",
        dataPublicacaoJOM: "17/09/2025",
        valorAditivado: 17552976.73,
        novoPrazoContratual: "31/12/2025",
        novoValorContratual: "R$ 56.446.080,80",
        descricao: "Acréscimo financeiro sobre o contrato original."
      },
      {
        id: "ad-5-3",
        numero: 3,
        tipo: "prazo",
        dataAssinatura: "16/12/2025",
        dataPublicacaoJOM: "19/12/2025",
        prazoAditivadoDias: 180,
        valorAditivado: 0,
        novoPrazoExecucao: "27/03/2026",
        novoPrazoContratual: "26/06/2026",
        novoValorContratual: "R$ 56.446.080,80",
        descricao: "Prorrogação de prazo em 180 dias de execução e vigência."
      }
    ],
    relatoriosSemanais: [
      {
        id: "rep-5-1",
        periodoInicio: "2026-05-25",
        periodoFim: "2026-05-29",
        percentualFisico: 100,
        situacaoAditivo: "N/A",
        informacaoRelevante: "O projeto de reforma da Pista de Táxi Alfa contemplava a execução da estrutura em concreto armado (pavimento rígido). Contudo, a estrutura do pavimento foi executada em concreto asfáltico (pavimento flexível). A equipe de supervisão aguarda a formalização documental da troca do tipo de pavimento no referido trecho da Pista de Táxi Alfa por meio da Contratante.",
        atividadesInfraDados: "N/A",
        statusAumentoCargaEnel: "N/A",
        statusSubestacao: "N/A",
        atividadesSemana: [
          "Registra-se que a executora principal procedeu à desmobilização de suas equipes e recursos do canteiro de obras;",
          "No que se refere aos serviços executados por empresa terceirizada da Contratante, destinados à realização de atividades não contempladas no escopo da executora principal, a Equipe de Supervisão não identificou evolução nas pendências existentes. As frentes de serviço permanecem inalteradas desde o último período de acompanhamento."
        ],
        atividadesProximaSemana: [
          "Não informado pela empresa terceirizada da Contratante."
        ],
        observacoesApontamentos: [
          "Verificou-se a ausência de selagem nas caixas de passagem, sendo necessária vedação para evitar infiltrações e umidade;",
          "Identificou-se a necessidade de formalização documental da alteração do pavimento na Pista de Táxi Alfa, garantindo o correto registro técnico da execução conforme o as-built;",
          "Reforçada a necessidade de instalação de relés térmicos corretamente dimensionados para proteção dos motores;",
          "Constatou-se a ausência de caixas de passagem na rede, sendo necessária sua implantação conforme critérios normativos para garantir integridade e manutenção adequada;",
          "Pendências do sistema de drenagem são de responsabilidade da Contratante, sem frentes de serviço ativas pela Contratada no local;",
          "Quanto aos serviços elétricos pendentes, a Equipe de Supervisão não identificou avanço nas atividades previstas."
        ],
        fotos: [
          { id: "f-5-1", url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&auto=format&fit=crop", legenda: "Readequação da Pista de Pouso e Decolagem - 100% concluída" }
        ]
      }
    ]
  },
  {
    id: "obra-6",
    titulo: "TC 32/2025 – BARREIRA ACÚSTICA NO AEROPORTO LAÉLIO BATISTA",
    contratoNo: "32/2025",
    concorrenciaPublicaNo: "03/2025",
    processoAdministrativoNo: "18875/2024",
    dataAssinatura: "13/08/2025",
    dataPublicacaoJOM: "22/08/2025",
    dataOrdemInicio: "13/08/2025",
    empresaVencedora: "Construtora Affonseca Internacional LTDA",
    prazoVigenciaInicial: "13 meses",
    prazoExecucaoInicial: "10 meses",
    dataInicio: "13/08/2025",
    valorContratualInicial: 24285579.96,
    
    valorContratualAtual: 24285579.96,
    prazoVigenciaAtual: "13 meses",
    prazoExecucaoAtual: "10 meses",
    percentualFisicoAtual: 44,
    statusGeral: "Em Andamento",
    
    aditivos: [],
    relatoriosSemanais: [
      {
        id: "rep-6-1",
        periodoInicio: "2026-05-25",
        periodoFim: "2026-05-29",
        percentualFisico: 44,
        situacaoAditivo: "N/A",
        informacaoRelevante: "N/A",
        atividadesInfraDados: "N/A",
        statusAumentoCargaEnel: "N/A",
        statusSubestacao: "N/A",
        atividadesSemana: [
          "Escavação manual para alocação de forma e armadura nas cavas do bloco de coroamento e viga baldrame do trecho VB-11 e VB-10;",
          "Alocação e montagem de armadura e fôrma nos trechos VIGA VB-12;",
          "Acompanhamento Topográfico;",
          "Execução de armadura dos blocos de coroamento e vigas baldrame."
        ],
        atividadesProximaSemana: [
          "Alocação e montagem de armadura e fôrma nos trechos VIGA VB-11 e VB-10;",
          "Concretagem integral dos blocos no treco nos trechos VIGA VB-11 e VB-12;",
          "Acompanhamento Topográfico;",
          "Escavação manual para alocação de forma e armadura nas cavas do bloco de coroamento e viga baldrame do trecho VIGA VB-09."
        ],
        observacoesApontamentos: [],
        fotos: [
          { id: "f-6-1", url: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=500&auto=format&fit=crop", legenda: "Fundação da Barreira Acústica e Topografia" }
        ]
      }
    ]
  },
  {
    id: "obra-7",
    titulo: "TC 28/2024 - 02 HANGARES 04 E 05 / TC 29/2024 - 02 HANGARES 06 E 08",
    contratoNo: "28/2024 e 29/2024",
    concorrenciaPublicaNo: "04/2024",
    processoAdministrativoNo: "20563/2023",
    dataAssinatura: "30/08/2024",
    dataPublicacaoJOM: "04/09/2024",
    dataOrdemInicio: "30/08/2024",
    empresaVencedora: "W COSTA CONSTRUTORA LTDA",
    prazoVigenciaInicial: "12 meses",
    prazoExecucaoInicial: "8 meses",
    dataInicio: "30/08/2024",
    valorContratualInicial: 61736575.00,
    
    valorContratualAtual: 61736575.00,
    prazoVigenciaAtual: "24 meses",
    prazoExecucaoAtual: "20 meses",
    percentualFisicoAtual: 73,
    statusGeral: "Paralisada",
    
    aditivos: [
      {
        id: "ad-7-1",
        numero: 1,
        tipo: "prazo",
        dataAssinatura: "09/05/2025",
        dataPublicacaoJOM: "30/05/2025",
        prazoAditivadoMeses: 6,
        valorAditivado: 0,
        novoPrazoContratual: "18 meses",
        novoValorContratual: "R$ 61.736.575,00",
        descricao: "Prorrogação de vigência e execução por mais 6 meses."
      },
      {
        id: "ad-7-2",
        numero: 2,
        tipo: "prazo",
        dataAssinatura: "26/02/2026",
        dataPublicacaoJOM: "04/03/2026",
        prazoAditivadoMeses: 6,
        valorAditivado: 0,
        novoPrazoContratual: "26/08/2026",
        novoPrazoExecucao: "25/04/2026",
        novoValorContratual: "R$ 61.736.575,00",
        descricao: "Prorrogação de prazo contratual por mais 6 meses."
      }
    ],
    relatoriosSemanais: [
      {
        id: "rep-7-1",
        periodoInicio: "2026-05-25",
        periodoFim: "2026-05-29",
        percentualFisico: 73,
        situacaoAditivo: "N/A",
        informacaoRelevante: "Não é possível definir uma previsão de conclusão da obra, uma vez que as atividades se encontram paralisadas, aguardando a adoção das providências necessárias para a retomada dos serviços.",
        atividadesInfraDados: "N/A",
        statusAumentoCargaEnel: "N/A",
        statusSubestacao: "N/A",
        atividadesSemana: [
          "N/A"
        ],
        atividadesProximaSemana: [
          "A Empreiteira está aguardando definições da Contratante para retorno das atividades."
        ],
        observacoesApontamentos: [
          "Em razão da paralisação prolongada da obra e da permanência da estrutura metálica exposta às intempéries, foram identificados pontos de corrosão em diferentes regiões do sistema estrutural dos Hangares. Inicialmente, as manifestações de oxidação estavam concentradas nas emendas, chapas de ligação, juntas soldadas e pontos de aparafusamento, contudo, nas vistorias mais recentes, verificou-se que o processo corrosivo passou a ocorrer também nos próprios perfis metálicos da estrutura, não se restringindo apenas às áreas de ligação.",
          "As imagens evidenciam a presença de oxidação superficial em vigas, pilares, bordas inferiores dos perfis, interfaces entre elementos metálicos e regiões com possível descontinuidade da pintura de proteção. Também se observa escorrimento de óxido em alguns pontos, indicando ação contínua da umidade sobre os elementos expostos. Tal condição é agravada pela ausência de cobertura definitiva, pela incidência direta de chuva, insolação e umidade, bem como pela falta de tratamento anticorrosivo.",
          "Embora a análise visual das imagens não indique, neste momento, deformações, flambagem aparente ou perda expressiva de seção dos elementos metálicos, a permanência da estrutura exposta às intempéries tende a intensificar o processo corrosivo e ampliar progressivamente o risco de degradação dos componentes estruturais, sobretudo em ambiente externo e potencialmente agressivo como o Aeroporto de Maricá. Diante desse cenário, recomenda-se a limpeza mecânica das áreas afetadas, a avaliação da integridade dos perfis, chapas de ligação, soldas e parafusos, bem como a aplicação de tratamento anticorrosivo compatível com as condições de exposição da estrutura. Tais medidas devem anteceder a retomada plena das etapas subsequentes da obra, especialmente a instalação da cobertura."
        ],
        fotos: [
          { id: "f-7-1", url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&auto=format&fit=crop", legenda: "Instalação da estrutura metálica dos hangares - Paralisada" }
        ]
      }
    ]
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log-1",
    timestamp: "2026-06-12T09:15:30Z",
    userName: "Vinicius Cardozo Martins",
    userEmail: "vinicius.martins@quantaconsultoria.com",
    userRole: UserRole.ADMINISTRADOR,
    acao: "CRIACAO_OBRA",
    descricao: "Cadastrou a obra pioneira TC 60/2022 - Museu Darcy Ribeiro no sistema.",
    obraId: "obra-1",
    obraTitulo: "TC 60/2022 - PENÍNSULA DO SAMBA – MUSEU DARCY RIBEIRO"
  },
  {
    id: "log-2",
    timestamp: "2026-06-13T10:45:00Z",
    userName: "Maria Carolina Madacon",
    userEmail: "maria.madacon@quantaconsultoria.com",
    userRole: UserRole.ENGENHEIRO_CHEFE,
    acao: "ADICIONAR_ADITIVO",
    descricao: "Inseriu o 3º aditivo de prazo (6 meses adicional) na obra TC 60/2022.",
    obraId: "obra-1",
    obraTitulo: "TC 60/2022 - PENÍNSULA DO SAMBA – MUSEU DARCY RIBEIRO"
  },
  {
    id: "log-3",
    timestamp: "2026-06-14T14:22:15Z",
    userName: "Vinicius Cardozo Martins",
    userEmail: "vinicius.martins@quantaconsultoria.com",
    userRole: UserRole.ENGENHEIRO_CHEFE,
    acao: "EDITAR_PROGRESSO",
    descricao: "Atualizou o relatório semanal de 25/05 a 29/05 da obra do Parque Tecnológico.",
    obraId: "obra-2",
    obraTitulo: "TC 62/2023 – PARQUE TECNOLÓGICO"
  }
];

export const INITIAL_REVISIONS: Revision[] = [
  {
    id: "rev-1",
    obraId: "obra-1",
    timestamp: "2026-06-13T10:45:00Z",
    userName: "Maria Carolina Madacon",
    userRole: UserRole.ENGENHEIRO_CHEFE,
    userEmail: "maria.madacon@quantaconsultoria.com",
    campoAlterado: "Aditivos / Prazo Vigência",
    descricao: "Adicionado 3º aditivo de 6 meses. O prazo de vigência contratual atualizado passou para 28 meses.",
    obraSnapshot: "{}"
  }
];

// Helper to initialize and retrieve database from localStorage
export function getSavedObras(): Obra[] {
  try {
    const obras = localStorage.getItem("obras_db");
    if (!obras) {
      localStorage.setItem("obras_db", JSON.stringify(INITIAL_OBRAS));
      return INITIAL_OBRAS;
    }
    const parsed = JSON.parse(obras);
    if (!Array.isArray(parsed)) {
      localStorage.setItem("obras_db", JSON.stringify(INITIAL_OBRAS));
      return INITIAL_OBRAS;
    }
    // Ensure we load all 7 works if the saved localStorage array has fewer elements than INITIAL_OBRAS!
    if (parsed.length < INITIAL_OBRAS.length) {
      localStorage.setItem("obras_db", JSON.stringify(INITIAL_OBRAS));
      return INITIAL_OBRAS;
    }
    return parsed;
  } catch (e) {
    console.error("Erro ao carregar obras_db:", e);
    try {
      localStorage.setItem("obras_db", JSON.stringify(INITIAL_OBRAS));
    } catch {}
    return INITIAL_OBRAS;
  }
}

export function saveObras(obras: Obra[]) {
  try {
    localStorage.setItem("obras_db", JSON.stringify(obras));
  } catch (e: any) {
    console.warn("Erro ao salvar obras_db, iniciando tentativas de mitigação de quota do localStorage...", e);
    try {
      // 1. Clear auxiliary databases to recover instant storage space
      localStorage.setItem("revisions_db", "[]");
      const savedLogs = getSavedLogs();
      localStorage.setItem("logs_db", JSON.stringify(savedLogs.slice(0, 5)));
    } catch (clearErr) {
      console.error("Erro ao limpar dados auxiliares:", clearErr);
    }
    
    // 2. Progressive pruning levels
    let success = false;
    for (let level = 1; level <= 4; level++) {
      try {
        console.warn(`Tentando salvar obras com nível de poda ${level} para poupar quota...`);
        const pruned = pruneObrasProgressively(obras, level);
        localStorage.setItem("obras_db", JSON.stringify(pruned));
        success = true;
        console.log(`obras_db salva com sucesso após aplicar redução de nível ${level}!`);
        break;
      } catch (retryError) {
        console.error(`Falha ao salvar obras até o nível ${level} de poda:`, retryError);
      }
    }
    
    if (!success) {
      console.error("Erro fatal e definitivo: Impossível gravar obras_db em localStorage mesmo com poda máxima.");
    }
  }
}

export function getSavedLogs(): AuditLog[] {
  try {
    const logs = localStorage.getItem("logs_db");
    if (!logs) {
      localStorage.setItem("logs_db", JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    const parsed = JSON.parse(logs);
    if (!Array.isArray(parsed)) {
      localStorage.setItem("logs_db", JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    return parsed;
  } catch (e) {
    console.error("Erro ao carregar logs_db:", e);
    try {
      localStorage.setItem("logs_db", JSON.stringify(INITIAL_AUDIT_LOGS));
    } catch {}
    return INITIAL_AUDIT_LOGS;
  }
}

export function saveLogs(logs: AuditLog[]) {
  try {
    // Keep at most last 50 entries to conserve storage quota
    const cappedLogs = logs.slice(0, 50);
    localStorage.setItem("logs_db", JSON.stringify(cappedLogs));
  } catch (e) {
    console.error("Erro ao salvar logs_db:", e);
    try {
      localStorage.setItem("logs_db", JSON.stringify(logs.slice(0, 10)));
    } catch {}
  }
}

export function getSavedRevisions(): Revision[] {
  try {
    const revisions = localStorage.getItem("revisions_db");
    if (!revisions) {
      localStorage.setItem("revisions_db", JSON.stringify(INITIAL_REVISIONS));
      return INITIAL_REVISIONS;
    }
    const parsed = JSON.parse(revisions);
    if (!Array.isArray(parsed)) {
      localStorage.setItem("revisions_db", JSON.stringify(INITIAL_REVISIONS));
      return INITIAL_REVISIONS;
    }
    
    // Automatically prune and thin down the revisions list on load
    // to instantly reclaim space from previous bloated states
    if (parsed.length > 8 || revisions.length > 300 * 1024) {
      setTimeout(() => {
        try {
          saveRevisions(parsed);
        } catch {}
      }, 100);
    }
    
    return parsed;
  } catch (e) {
    console.error("Erro ao carregar revisions_db:", e);
    try {
      localStorage.setItem("revisions_db", JSON.stringify(INITIAL_REVISIONS));
    } catch {}
    return INITIAL_REVISIONS;
  }
}

export function saveRevisions(revisions: Revision[]) {
  try {
    // Keep at most 8 audit history revisions across the platform.
    // Also, sanitize its obraSnapshots (omit raw heavyweight base64 photo lists)
    const capped = revisions.slice(-8).map(rev => {
      if (rev.obraSnapshot && rev.obraSnapshot.length > 5000) {
        try {
          const parsed = JSON.parse(rev.obraSnapshot);
          if (parsed && typeof parsed === "object") {
            const pruned = pruneObraForSnapshot(parsed);
            return {
              ...rev,
              obraSnapshot: JSON.stringify(pruned)
                };
              }
        } catch {
          // fallback to simple string or empty if completely broken
        }
      }
      return rev;
    });

    localStorage.setItem("revisions_db", JSON.stringify(capped));
  } catch (e) {
    console.error("Erro ao salvar revisions_db:", e);
    try {
      // Emergency recovery: clear revisions database
      localStorage.setItem("revisions_db", "[]");
    } catch {}
  }
}

export function getCurrentUser(): UserProfile {
  try {
    const user = localStorage.getItem("current_user");
    if (!user) {
      localStorage.setItem("current_user", JSON.stringify(INITIAL_USERS[0]));
      return INITIAL_USERS[0];
    }
    const parsed = JSON.parse(user);
    if (!parsed || typeof parsed !== "object") {
      localStorage.setItem("current_user", JSON.stringify(INITIAL_USERS[0]));
      return INITIAL_USERS[0];
    }
    
    // Ifcached current user is Andreia, migrate automatically to Vinicius
    if (parsed.id === "user-andreia" || parsed.email === "andreia.paula@quantaconsultoria.com") {
      localStorage.setItem("current_user", JSON.stringify(INITIAL_USERS[0]));
      return INITIAL_USERS[0];
    }

    const exists = INITIAL_USERS.some(u => u.id === parsed.id) || (typeof parsed.id === "string" && parsed.id.startsWith("eng-"));
    if (!exists) {
      localStorage.setItem("current_user", JSON.stringify(INITIAL_USERS[0]));
      return INITIAL_USERS[0];
    }
    return parsed;
  } catch (e) {
    console.error("Erro ao recuperar o usuário atual:", e);
    try {
      localStorage.setItem("current_user", JSON.stringify(INITIAL_USERS[0]));
    } catch {}
    return INITIAL_USERS[0];
  }
}

export function saveCurrentUser(user: UserProfile) {
  localStorage.setItem("current_user", JSON.stringify(user));
}
