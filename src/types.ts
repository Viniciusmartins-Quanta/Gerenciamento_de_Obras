export enum UserRole {
  ADMINISTRADOR = "Administrador",
  ENGENHEIRO_CHEFE = "Engenheiro Chefe",
  ENGENHEIRO_FISCAL = "Engenheiro Fiscal",
  LEITOR = "Leitor / Auditor"
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Aditivo {
  id: string;
  numero: number; // 1代表1º, 2代表2º, etc.
  tipo: "prazo" | "financeiro" | "ambos";
  dataAssinatura: string;
  dataPublicacaoJOM: string;
  prazoAditivadoMeses?: number;
  prazoAditivadoDias?: number;
  valorAditivado: number; // positive or negative, 0 if only plazo
  novoPrazoContratual: string;
  novoPrazoExecucao?: string;
  novoValorContratual: string;
  descricao?: string;
}

export interface WeeklyReport {
  id: string; // usually week dates as ID like "2026-05-25"
  periodoInicio: string; // Date (e.g. 2026-05-25)
  periodoFim: string; // Date (e.g. 2026-05-29)
  percentualFisico: number; // e.g. 79
  situacaoAditivo: string; // e.g. "Formalizado", "Aguardando"
  informacaoRelevante: string;
  atividadesInfraDados: string;
  statusAumentoCargaEnel: string;
  statusSubestacao: string;
  atividadesSemana: string[]; // Bullet points
  atividadesProximaSemana: string[]; // Bullet points
  observacoesApontamentos: string[]; // List of warnings/non-conformities
  fotoCapa?: string; // Cover photo URL or Base64
  fotos: {
    id: string;
    url: string;
    legenda: string;
  }[];
}

export interface Obra {
  id: string;
  titulo: string; // e.g. "TC 60/2022 - PENÍNSULA DO SAMBA – MUSEU DARCY... "
  contratoNo: string;
  concorrenciaPublicaNo: string;
  processoAdministrativoNo: string;
  dataAssinatura: string;
  dataPublicacaoJOM: string;
  dataOrdemInicio: string;
  empresaVencedora: string;
  prazoVigenciaInicial: string; // e.g. "8 meses"
  prazoExecucaoInicial: string; // e.g. "8 meses"
  dataInicio: string;
  valorContratualInicial: number; // raw number
  
  // Dynamic totals that account for aditivos
  valorContratualAtual: number;
  prazoVigenciaAtual: string; // e.g. "24 meses"
  prazoExecucaoAtual: string;
  
  aditivos: Aditivo[];
  relatoriosSemanais: WeeklyReport[];
  
  // General status
  percentualFisicoAtual: number;
  statusGeral: "Em Andamento" | "Aguardando Início" | "Paralisada" | "Concluída";
  imagemCronologia?: string; // Base64 of cronologia image
}

export interface Revision {
  id: string;
  obraId: string;
  timestamp: string;
  userName: string;
  userRole: UserRole;
  userEmail: string;
  campoAlterado: string;
  descricao: string;
  obraSnapshot: string; // JSON string of Obra state before/after this change
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  acao: string; // e.g. "CRIACAO_OBRA", "EDITAR_PROGRESSO", "ADICIONAR_ADITIVO"
  descricao: string;
  obraId?: string;
  obraTitulo?: string;
}
