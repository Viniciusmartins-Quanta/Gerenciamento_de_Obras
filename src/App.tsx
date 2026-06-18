import React, { useState, useEffect } from "react";
import { Obra, Aditivo, WeeklyReport, Revision, AuditLog, UserProfile, UserRole } from "./types";
import { 
  getSavedObras, saveObras, getSavedLogs, saveLogs, 
  getSavedRevisions, saveRevisions, getCurrentUser, saveCurrentUser 
} from "./data/mockData";
import { 
  getOnlineObras, syncObrasToCloud, getOnlineLogs, 
  syncLogsToCloud, getOnlineRevisions 
} from "./utils/firebaseDb";
import { exportObrasToExcel } from "./utils/excelGenerator";
import { generateConsolidatedWeeklyPDF } from "./utils/pdfGenerator";
import UserAuth from "./components/UserAuth";
import LoginScreen from "./components/LoginScreen";
import WorkDetail from "./components/WorkDetail";
import WorkForm from "./components/WorkForm";
import WeeklyReportForm from "./components/WeeklyReportForm";
import AuditLogView from "./components/AuditLogView";
import SettingsView from "./components/SettingsView";
import { 
  Building2, PlusCircle, Search, Filter, Database, TrendingUp, CheckCircle, 
  Clock, Coins, Download, Shield, LogOut, LayoutGrid, ClipboardList, AlertTriangle, Settings,
  Wrench, Loader2, ShieldCheck, Check, Sparkles, Activity
} from "lucide-react";

export function getExecutionDeadlineDate(obra: Obra): Date | null {
  // If we have aditivos, try to find a date in them
  if (obra.aditivos && obra.aditivos.length > 0) {
    // Look from latest to earliest aditivo
    for (let i = obra.aditivos.length - 1; i >= 0; i--) {
      const ad = obra.aditivos[i];
      
      // Check if there is an explicit novoPrazoExecucao with a date
      if (ad.novoPrazoExecucao) {
        const match = ad.novoPrazoExecucao.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (match) {
          const [_, day, month, year] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
      }
      
      // Check if there is an explicit Execução address date inside novoPrazoContratual
      if (ad.novoPrazoContratual) {
        const execMatch = ad.novoPrazoContratual.match(/Execução:\s*(\d{2})\/(\d{2})\/(\d{4})/i);
        if (execMatch) {
          const [_, day, month, year] = execMatch;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        
        // Otherwise, any date in novoPrazoContratual
        const match = ad.novoPrazoContratual.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (match) {
          const [_, day, month, year] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
      }
    }
  }

  // Fallback: calculate from dataInicio and total months of execution
  const startStr = obra.dataInicio || obra.dataOrdemInicio || obra.dataAssinatura;
  if (!startStr) return null;

  const startMatch = startStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!startMatch) return null;

  const [_, sDay, sMonth, sYear] = startMatch;
  const startDate = new Date(parseInt(sYear), parseInt(sMonth) - 1, parseInt(sDay));

  let monthsToAdd = 0;
  const execAtualStr = obra.prazoExecucaoAtual || obra.prazoExecucaoInicial || "";
  const monthMatch = execAtualStr.match(/(\d+)\s*mes(es)?/i);
  const yearMatch = execAtualStr.match(/(\d+)\s*ano(s)?/i);
  
  if (monthMatch) {
    monthsToAdd += parseInt(monthMatch[1]);
  }
  if (yearMatch) {
    monthsToAdd += parseInt(yearMatch[1]) * 12;
  }
  
  if (monthsToAdd === 0) {
    const rawNumberMatch = execAtualStr.match(/(\d+)/);
    if (rawNumberMatch) {
      monthsToAdd = parseInt(rawNumberMatch[1]);
    } else {
      monthsToAdd = 12; // default fallback if unparseable
    }
  }

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + monthsToAdd);
  return endDate;
}

export interface DeadlineStatusInfo {
  text: string;
  badgeClass: string;
  labelColorClass: string;
  daysRemainingText: string;
  colorHex: string;
}

export function getDeadlineStatus(obra: Obra): DeadlineStatusInfo {
  const percentual = obra.percentualFisicoAtual;
  
  if (percentual >= 100) {
    return {
      text: "Obra Concluída",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-250",
      labelColorClass: "text-emerald-700",
      daysRemainingText: "Empreendimento totalmente executado",
      colorHex: "#10b981"
    };
  }

  const deadline = getExecutionDeadlineDate(obra);
  if (!deadline) {
    // If we cannot determine, fallback to "Obra em Execução" safely
    return {
      text: "Obra em Execução",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-150",
      labelColorClass: "text-emerald-600",
      daysRemainingText: "Em andamento regular",
      colorHex: "#10b981"
    };
  }

  // Current date standard in the system local metadata block (June 15, 2026)
  const currentDate = new Date();
  
  // Reset hours to compare purely by calendar day
  const d1 = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const d2 = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
  const diffTime = d1.getTime() - d2.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 30) {
    return {
      text: "Obra em Execução",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-150",
      labelColorClass: "text-emerald-600",
      daysRemainingText: `Faltam ${diffDays} dias para o prazo final`,
      colorHex: "#10b981"
    };
  } else if (diffDays > 0 && diffDays <= 30) {
    return {
      text: "Próximo do Prazo de Execução",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-250",
      labelColorClass: "text-amber-800",
      daysRemainingText: `Atenção: Faltam apenas ${diffDays} dias!`,
      colorHex: "#d97706"
    };
  } else {
    // DiffDays <= 0 (either exactly today or already passed)
    const passedDays = Math.abs(diffDays);
    const passedText = passedDays === 0 ? "Hoje é o prazo final!" : `Prazo esgotado há ${passedDays} dias`;
    return {
      text: "Verificar Situação do Aditivo",
      badgeClass: "bg-orange-100 text-orange-950 border-orange-255",
      labelColorClass: "text-orange-900",
      daysRemainingText: passedText,
      colorHex: "#ea580c"
    };
  }
}

export default function App() {
  // DB States
  const [obras, setObras] = useState<Obra[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("auth_session_active") === "true";
  });
  const [revisions, setRevisions] = useState<Revision[]>([]);

  // Navigation / UI States
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null);
  const [directReportObraId, setDirectReportObraId] = useState<string | null>(null);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [viewMode, setViewMode] = useState<"dashboard" | "logs" | "settings">("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusGeralFilter] = useState<string>("TODOS");

  // Consolidated report states
  const [showConsolidatedModal, setShowConsolidatedModal] = useState(false);
  const [selectedConsolidatedWeekKey, setSelectedConsolidatedWeekKey] = useState("");
  const [isGeneratingConsolidated, setIsGeneratingConsolidated] = useState(false);

  // Debugger and auto-repair states
  const [showDebuggerModal, setShowDebuggerModal] = useState(false);
  const [debuggerStage, setDebuggerStage] = useState<"idle" | "running" | "done">("idle");
  const [debuggerSteps, setDebuggerSteps] = useState<{ name: string; status: "pending" | "running" | "success" | "fixed" | "error"; detail: string }[]>([]);

  // Helper inside component to get week options
  const getWeekOptionsForApp = () => {
    const weeksMap: Record<string, { inicio: string; fim: string; count: number }> = {};
    
    obras.forEach(obra => {
      obra.relatoriosSemanais.forEach(rep => {
        const key = `${rep.periodoInicio}|${rep.periodoFim}`;
        if (!weeksMap[key]) {
          weeksMap[key] = {
            inicio: rep.periodoInicio,
            fim: rep.periodoFim,
            count: 0
          };
        }
        weeksMap[key].count += 1;
      });
    });
    
    return Object.values(weeksMap)
      .sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime())
      .map(w => {
        const format = (d: string) => d.split("-").reverse().join("/");
        return {
          inicio: w.inicio,
          fim: w.fim,
          label: `Semana de ${format(w.inicio)} a ${format(w.fim)}`,
          key: `${w.inicio}|${w.fim}`,
          count: w.count
        };
      });
  };

  // Load from database on startup with Firestore syncdown fallbacks
  useEffect(() => {
    const localObras = getSavedObras();
    const localLogs = getSavedLogs();
    const localRevisions = getSavedRevisions();

    setObras(localObras);
    setAuditLogs(localLogs);
    setRevisions(localRevisions);
    setCurrentUser(getCurrentUser());

    // Asynchronously update/synchronize structures in background
    async function loadAndSyncFromCloud() {
      try {
        console.log("Iniciando verificação de banco de dados na nuvem...");
        const cloudObras = await getOnlineObras();
        
        if (cloudObras !== null) {
          if (cloudObras.length === 0) {
            // Cloud is empty. If local has works, seed cloud with local data immediately!
            console.log("Banco de dados na nuvem vazio. Semeando dados locais no Firestore.");
            await syncObrasToCloud(localObras);
            if (localLogs.length > 0) {
              await syncLogsToCloud(localLogs);
            }
          } else {
            // Cloud has data. Check if local dev storage is ahead (e.g. they created 9 works locally)
            if (localObras.length > cloudObras.length) {
              console.log(`Detectada defasagem em nuvem (${cloudObras.length} vs local ${localObras.length}). Atualizando nuvem.`);
              await syncObrasToCloud(localObras);
              setObras(localObras);
            } else {
              // Otherwise, cloud is the master source of truth!
              console.log(`Carregados ${cloudObras.length} contratos a partir da nuvem.`);
              setObras(cloudObras);
              saveObras(cloudObras); // update local storage cache for subsequent offline boots
            }
          }
        }
        
        // Audit logs pull
        const cloudLogs = await getOnlineLogs();
        if (cloudLogs !== null && cloudLogs.length > 0) {
          setAuditLogs(cloudLogs);
          saveLogs(cloudLogs);
        }
        
        // Revisions pull
        const cloudRevisions = await getOnlineRevisions();
        if (cloudRevisions !== null && cloudRevisions.length > 0) {
          setRevisions(cloudRevisions);
        }
      } catch (err) {
        console.warn("Sincronização com nuvem pendente de autorização ou indisponível.", err);
      }
    }

    loadAndSyncFromCloud();
  }, []);

  const handleUserChange = (newUser: UserProfile) => {
    setCurrentUser(newUser);
    saveCurrentUser(newUser);
    
    // Add login log entry
    const newLog: AuditLog = {
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      userName: newUser.name,
      userEmail: newUser.email,
      userRole: newUser.role,
      acao: "LOGIN_MUTACAO",
      descricao: `Engenheiro ${newUser.name} conectou ao painel fiscal.`
    };
    const updatedLogs = [...auditLogs, newLog];
    setAuditLogs(updatedLogs);
    saveLogs(updatedLogs);
  };

  const handleUserCreated = (newProfile: UserProfile) => {
    // Audit logging for registering new professional
    const newLog: AuditLog = {
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      userName: currentUser?.name || "Sistema",
      userEmail: currentUser?.email || "sistema@fiscal.com",
      userRole: currentUser?.role || UserRole.ADMINISTRADOR,
      acao: "CADASTRAR_ENGENHEIRO",
      descricao: `Cadastrou o novo profissional ${newProfile.name} com perfil de ${newProfile.role} no sistema.`
    };
    const updatedRange = [...auditLogs, newLog];
    setAuditLogs(updatedRange);
    saveLogs(updatedRange);
  };

  // 1. ADD / EDIT GENERAL CONTRACT WORK
  const handleSaveObra = (savedObra: Obra) => {
    const isEdit = obras.some(o => o.id === savedObra.id);
    let updatedObras: Obra[];

    if (isEdit) {
      updatedObras = obras.map(o => o.id === savedObra.id ? savedObra : o);
    } else {
      // If new, seed it with 1 empty weekly report so it is prepped to go
      const defaultReport: WeeklyReport = {
        id: "rep-" + Date.now(),
        periodoInicio: new Date().toISOString().split("T")[0],
        periodoFim: new Date().toISOString().split("T")[0],
        percentualFisico: 0,
        situacaoAditivo: "Aguardando Início",
        informacaoRelevante: "Cadastro inicial da obra",
        atividadesInfraDados: "N/A",
        statusAumentoCargaEnel: "N/A",
        statusSubestacao: "N/A",
        atividadesSemana: ["Início das atividades de canteiro planejado."],
        atividadesProximaSemana: ["Limpeza do canteiro e instalação de barreiras de proteção."],
        observacoesApontamentos: [],
        fotos: []
      };
      savedObra.relatoriosSemanais.push(defaultReport);
      updatedObras = [...obras, savedObra];
    }

    setObras(updatedObras);
    saveObras(updatedObras);

    // Audit logs
    const actionLabel = isEdit ? "EDITAR_OBRA" : "CRIACAO_OBRA";
    const descLabel = isEdit 
      ? `Editou as informações estruturais preliminares do contrato ${savedObra.contratoNo}`
      : `Adicionou o contrato de obras públicas ${savedObra.contratoNo} - ${savedObra.titulo}`;

    const newLog: AuditLog = {
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      userName: currentUser?.name || "Convidado",
      userEmail: currentUser?.email || "anon@fiscal.gov",
      userRole: currentUser?.role || UserRole.LEITOR,
      acao: actionLabel,
      descricao: descLabel,
      obraId: savedObra.id,
      obraTitulo: savedObra.titulo
    };

    const updatedLogs = [...auditLogs, newLog];
    setAuditLogs(updatedLogs);
    saveLogs(updatedLogs);

    setShowWorkModal(false);
  };

  // 2. ADD TRANSITIONAL ADITIVO (AMENDMENT)
  const handleAddAditivo = (aditivo: Aditivo) => {
    if (!selectedObraId) return;

    const updatedObras = obras.map(o => {
      if (o.id === selectedObraId) {
        // Build revision snapshot of work before altering
        const originalSnapshotObj = JSON.stringify(o);
        
        // Deep copy of aditivos and append
        const updatedAditivos = [...o.aditivos, aditivo];

        // Recalculate dynamic totals
        let newValor = o.valorContratualInicial;
        let cumulativeMonths = 0;

        updatedAditivos.forEach(ad => {
          if (ad.tipo === "financeiro" || ad.tipo === "ambos") {
            newValor += ad.valorAditivado;
          }
          if (ad.tipo === "prazo" || ad.tipo === "ambos") {
            cumulativeMonths += ad.prazoAditivadoMeses || 0;
          }
        });

        // Compute resulting strings
        const prevVig = parseInt(o.prazoVigenciaInicial) || 0;
        const prevExec = parseInt(o.prazoExecucaoInicial) || 0;

        const updatedWork: Obra = {
          ...o,
          aditivos: updatedAditivos,
          valorContratualAtual: newValor,
          prazoVigenciaAtual: `${prevVig + cumulativeMonths} meses (Novo térm. ${aditivo.novoPrazoContratual})`,
          prazoExecucaoAtual: `${prevExec + cumulativeMonths} meses`,
        };

        // Persist revision
        const newRevision: Revision = {
          id: "rev-" + Date.now(),
          obraId: o.id,
          timestamp: new Date().toISOString(),
          userName: currentUser?.name || "Desconhecido",
          userRole: currentUser?.role || UserRole.ENGENHEIRO_CHEFE,
          userEmail: currentUser?.email || "",
          campoAlterado: `Termo Aditivo ${aditivo.numero}º (${aditivo.tipo})`,
          descricao: `Lançamento do aditivo de número ${aditivo.numero}º. Valor total contratual alterado para R$ ${newValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          obraSnapshot: originalSnapshotObj
        };

        const updatedRevs = [...revisions, newRevision];
        setRevisions(updatedRevs);
        saveRevisions(updatedRevs);

        return updatedWork;
      }
      return o;
    });

    setObras(updatedObras);
    saveObras(updatedObras);

    // Audit logs
    const parentObra = obras.find(o => o.id === selectedObraId);
    const newLog: AuditLog = {
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      userName: currentUser?.name || "Anônimo",
      userEmail: currentUser?.email || "",
      userRole: currentUser?.role || UserRole.LEITOR,
      acao: "ADICIONAR_ADITIVO",
      descricao: `Adicionou o ${aditivo.numero}º termo aditivo contratual. Descrição complementar: ${aditivo.descricao}`,
      obraId: selectedObraId,
      obraTitulo: parentObra?.titulo
    };

    const updatedLogs = [...auditLogs, newLog];
    setAuditLogs(updatedLogs);
    saveLogs(updatedLogs);
  };

  const handleEditAditivo = (aditivo: Aditivo) => {
    if (!selectedObraId) return;

    const updatedObras = obras.map(o => {
      if (o.id === selectedObraId) {
        const originalSnapshotObj = JSON.stringify(o);
        
        const updatedAditivos = o.aditivos.map(ad => ad.id === aditivo.id ? aditivo : ad);

        let newValor = o.valorContratualInicial;
        let cumulativeMonths = 0;

        updatedAditivos.forEach(ad => {
          if (ad.tipo === "financeiro" || ad.tipo === "ambos") {
            newValor += ad.valorAditivado;
          }
          if (ad.tipo === "prazo" || ad.tipo === "ambos") {
            cumulativeMonths += ad.prazoAditivadoMeses || 0;
          }
        });

        const prevVig = parseInt(o.prazoVigenciaInicial) || 0;
        const prevExec = parseInt(o.prazoExecucaoInicial) || 0;

        let finalNovoPrazo = o.prazoVigenciaInicial;
        if (updatedAditivos.length > 0) {
          finalNovoPrazo = updatedAditivos[updatedAditivos.length - 1].novoPrazoContratual;
        }

        const updatedWork: Obra = {
          ...o,
          aditivos: updatedAditivos,
          valorContratualAtual: newValor,
          prazoVigenciaAtual: updatedAditivos.length > 0
            ? `${prevVig + cumulativeMonths} meses (Novo térm. ${finalNovoPrazo})`
            : `${prevVig} meses`,
          prazoExecucaoAtual: `${prevExec + cumulativeMonths} meses`,
        };

        const newRevision: Revision = {
          id: "rev-" + Date.now(),
          obraId: o.id,
          timestamp: new Date().toISOString(),
          userName: currentUser?.name || "Desconhecido",
          userRole: currentUser?.role || UserRole.ENGENHEIRO_CHEFE,
          userEmail: currentUser?.email || "",
          campoAlterado: `Termo Aditivo ${aditivo.numero}º (${aditivo.tipo}) - Editado`,
          descricao: `Edição do aditivo de número ${aditivo.numero}º. Valor total contratual readequado para R$ ${newValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          obraSnapshot: originalSnapshotObj
        };

        const updatedRevs = [...revisions, newRevision];
        setRevisions(updatedRevs);
        saveRevisions(updatedRevs);

        return updatedWork;
      }
      return o;
    });

    setObras(updatedObras);
    saveObras(updatedObras);

    const parentObra = obras.find(o => o.id === selectedObraId);
    const newLog: AuditLog = {
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      userName: currentUser?.name || "Anônimo",
      userEmail: currentUser?.email || "",
      userRole: currentUser?.role || UserRole.LEITOR,
      acao: "EDITAR_ADITIVO",
      descricao: `Editou os dados do ${aditivo.numero}º termo aditivo contratual. Descrição complementar: ${aditivo.descricao}`,
      obraId: selectedObraId,
      obraTitulo: parentObra?.titulo
    };

    const updatedLogs = [...auditLogs, newLog];
    setAuditLogs(updatedLogs);
    saveLogs(updatedLogs);
  };

  const handleDeleteAditivo = (aditivoId: string) => {
    if (!selectedObraId) return;

    const updatedObras = obras.map(o => {
      if (o.id === selectedObraId) {
        const originalSnapshotObj = JSON.stringify(o);
        
        const ad_deleted = o.aditivos.find(ad => ad.id === aditivoId);
        if (!ad_deleted) return o;

        let filteredAditivos = o.aditivos.filter(ad => ad.id !== aditivoId);

        const updatedAditivos = filteredAditivos.map((ad, idx) => ({
          ...ad,
          numero: idx + 1
        }));

        let newValor = o.valorContratualInicial;
        let cumulativeMonths = 0;

        updatedAditivos.forEach(ad => {
          if (ad.tipo === "financeiro" || ad.tipo === "ambos") {
            newValor += ad.valorAditivado;
          }
          if (ad.tipo === "prazo" || ad.tipo === "ambos") {
            cumulativeMonths += ad.prazoAditivadoMeses || 0;
          }
        });

        const prevVig = parseInt(o.prazoVigenciaInicial) || 0;
        const prevExec = parseInt(o.prazoExecucaoInicial) || 0;

        let finalNovoPrazo = o.prazoVigenciaInicial;
        if (updatedAditivos.length > 0) {
          finalNovoPrazo = updatedAditivos[updatedAditivos.length - 1].novoPrazoContratual;
        }

        const updatedWork: Obra = {
          ...o,
          aditivos: updatedAditivos,
          valorContratualAtual: newValor,
          prazoVigenciaAtual: updatedAditivos.length > 0
            ? `${prevVig + cumulativeMonths} meses (Novo térm. ${finalNovoPrazo})`
            : `${prevVig} meses`,
          prazoExecucaoAtual: `${prevExec + cumulativeMonths} meses`,
        };

        const newRevision: Revision = {
          id: "rev-" + Date.now(),
          obraId: o.id,
          timestamp: new Date().toISOString(),
          userName: currentUser?.name || "Desconhecido",
          userRole: currentUser?.role || UserRole.ENGENHEIRO_CHEFE,
          userEmail: currentUser?.email || "",
          campoAlterado: `Exclusão Termo Aditivo ${ad_deleted.numero}º (${ad_deleted.tipo})`,
          descricao: `Exclusão do termo aditivo original nº ${ad_deleted.numero}º. Valor total contratual recomputado para R$ ${newValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          obraSnapshot: originalSnapshotObj
        };

        const updatedRevs = [...revisions, newRevision];
        setRevisions(updatedRevs);
        saveRevisions(updatedRevs);

        return updatedWork;
      }
      return o;
    });

    setObras(updatedObras);
    saveObras(updatedObras);

    const parentObra = obras.find(o => o.id === selectedObraId);
    const newLog: AuditLog = {
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      userName: currentUser?.name || "Anônimo",
      userEmail: currentUser?.email || "",
      userRole: currentUser?.role || UserRole.LEITOR,
      acao: "EXCLUIR_ADITIVO",
      descricao: `Removeu o termo aditivo contratual.`,
      obraId: selectedObraId,
      obraTitulo: parentObra?.titulo
    };

    const updatedLogs = [...auditLogs, newLog];
    setAuditLogs(updatedLogs);
    saveLogs(updatedLogs);
  };

  // 3. WEEKLY REPORT OPERATIONS (ADD / EDIT)
  const handleSaveWeeklyReport = (report: WeeklyReport, isEdit: boolean) => {
    if (!selectedObraId) return;

    const updatedObras = obras.map(o => {
      if (o.id === selectedObraId) {
        const originalSnapshotObj = JSON.stringify(o);

        let updatedReports: WeeklyReport[];
        if (isEdit) {
          updatedReports = o.relatoriosSemanais.map(r => r.id === report.id ? report : r);
        } else {
          updatedReports = [...o.relatoriosSemanais, report];
        }

        // Dynamically set physical percentage to the latest reports completion
        const sortedReports = updatedReports.slice().sort((a,b) => new Date(a.periodoInicio).getTime() - new Date(b.periodoInicio).getTime());
        const latestPercent = sortedReports[sortedReports.length - 1]?.percentualFisico || 0;

        const updatedWork: Obra = {
          ...o,
          relatoriosSemanais: updatedReports,
          percentualFisicoAtual: latestPercent
        };

        // Create Revision
        const newRevision: Revision = {
          id: "rev-" + Date.now(),
          obraId: o.id,
          timestamp: new Date().toISOString(),
          userName: currentUser?.name || "Desconhecido",
          userRole: currentUser?.role || UserRole.ENGENHEIRO_FISCAL,
          userEmail: currentUser?.email || "",
          campoAlterado: `Relatório de Campo da Semana ${report.periodoInicio}`,
          descricao: isEdit 
            ? `Retificou o diário consolidado da semana. Progresso readequado para ${report.percentualFisico}%.`
            : `Lançou diário semanal físico de progresso. Progresso atingido: ${report.percentualFisico}%.`,
          obraSnapshot: originalSnapshotObj
        };

        const updatedRevs = [...revisions, newRevision];
        setRevisions(updatedRevs);
        saveRevisions(updatedRevs);

        return updatedWork;
      }
      return o;
    });

    setObras(updatedObras);
    saveObras(updatedObras);

    // Audit logs
    const parentObra = obras.find(o => o.id === selectedObraId);
    const newLog: AuditLog = {
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      userName: currentUser?.name || "",
      userEmail: currentUser?.email || "",
      userRole: currentUser?.role || UserRole.LEITOR,
      acao: isEdit ? "CONCERTAR_PROGRESSO" : "EDITAR_PROGRESSO",
      descricao: `${isEdit ? "Retificou" : "Adicionou"} relatório semanal de Fiscalização de campo referente a época de ${report.periodoInicio} a ${report.periodoFim}`,
      obraId: selectedObraId,
      obraTitulo: parentObra?.titulo
    };

    const updatedLogs = [...auditLogs, newLog];
    setAuditLogs(updatedLogs);
    saveLogs(updatedLogs);
  };

  const handleSaveWeeklyReportDirect = (obraId: string, report: WeeklyReport) => {
    const updatedObras = obras.map(o => {
      if (o.id === obraId) {
        const originalSnapshotObj = JSON.stringify(o);
        const updatedReports = [...o.relatoriosSemanais, report];

        // Dynamically set physical percentage to the latest reports completion
        const sortedReports = updatedReports.slice().sort((a,b) => new Date(a.periodoInicio).getTime() - new Date(b.periodoInicio).getTime());
        const latestPercent = sortedReports[sortedReports.length - 1]?.percentualFisico || 0;

        const updatedWork: Obra = {
          ...o,
          relatoriosSemanais: updatedReports,
          percentualFisicoAtual: latestPercent
        };

        // Create Revision
        const newRevision: Revision = {
          id: "rev-" + Date.now(),
          obraId: o.id,
          timestamp: new Date().toISOString(),
          userName: currentUser?.name || "Desconhecido",
          userRole: currentUser?.role || UserRole.ENGENHEIRO_FISCAL,
          userEmail: currentUser?.email || "",
          campoAlterado: `Relatório de Campo da Semana ${report.periodoInicio}`,
          descricao: `Lançou diário de atividades de campo referente à época de ${report.periodoInicio} a ${report.periodoFim}. Progresso atingido: ${report.percentualFisico}%.`,
          obraSnapshot: originalSnapshotObj
        };

        const updatedRevs = [...revisions, newRevision];
        setRevisions(updatedRevs);
        saveRevisions(updatedRevs);

        return updatedWork;
      }
      return o;
    });

    setObras(updatedObras);
    saveObras(updatedObras);

    // Audit logs
    const parentObra = obras.find(o => o.id === obraId);
    const newLog: AuditLog = {
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      userName: currentUser?.name || "",
      userEmail: currentUser?.email || "",
      userRole: currentUser?.role || UserRole.LEITOR,
      acao: "EDITAR_PROGRESSO",
      descricao: `Inseriu relatório semanal de atividades de campo de ${report.periodoInicio} a ${report.periodoFim} para a obra.`,
      obraId: obraId,
      obraTitulo: parentObra?.titulo
    };

    const updatedLogs = [...auditLogs, newLog];
    setAuditLogs(updatedLogs);
    saveLogs(updatedLogs);
  };

  // 4. PROGRAM DIAGNOSTIC & AUTO-REPAIR ENGINE
  const runAutoRepair = async () => {
    setDebuggerStage("running");
    
    const stepsList = [
      { name: "Verificação de tabelas e estados do localStorage", status: "pending" as const, detail: "Analisando chaves obras_db, logs_db e revisions_db..." },
      { name: "Validação estrutural de tipos e dados das Obras", status: "pending" as const, detail: "Detectando propriedades corrompidas ou indefinidas nos contratos..." },
      { name: "Integridade de relatórios de campo e mídias binárias", status: "pending" as const, detail: "Garantindo que listas de fotos e de apontamentos operem sem travar..." },
      { name: "Saneamento de referências e auditoria com registro", status: "pending" as const, detail: "Sincronizando banco de dados local com cabeçalhos de auditoria..." },
    ];
    setDebuggerSteps([...stepsList]);

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // STEP 1
    setDebuggerSteps(prev => prev.map((s, idx) => idx === 0 ? { ...s, status: "running" } : s));
    await delay(700);
    let lsCheck = true;
    try {
      const savedOb = localStorage.getItem("obras_db");
      if (savedOb) JSON.parse(savedOb);
      const savedLog = localStorage.getItem("logs_db");
      if (savedLog) JSON.parse(savedLog);
    } catch {
      lsCheck = false;
    }
    setDebuggerSteps(prev => prev.map((s, idx) => idx === 0 ? { 
      ...s, 
      status: lsCheck ? "success" : "fixed", 
      detail: lsCheck 
        ? "Bases de dados locais decodificadas com sucesso. Tipo JSON íntegro." 
        : "Formatos salvos corrompidos foram normalizados para estado legível." 
    } : s));

    // STEP 2
    setDebuggerSteps(prev => prev.map((s, idx) => idx === 1 ? { ...s, status: "running" } : s));
    await delay(800);
    const savedObras = getSavedObras();
    let worksRepairedCount = 0;
    const sanitizedObras = savedObras.map(obra => {
      let changed = false;
      if (!obra.id) { obra.id = "obra-" + Date.now() + Math.random().toString(36).substr(2, 5); changed = true; }
      if (typeof obra.titulo !== "string") { obra.titulo = String(obra.titulo || "Contrato por Nomear"); changed = true; }
      if (typeof obra.contratoNo !== "string") { obra.contratoNo = String(obra.contratoNo || "Sem Número"); changed = true; }
      if (typeof obra.statusGeral !== "string") { obra.statusGeral = "Em Andamento"; changed = true; }
      if (typeof obra.percentualFisicoAtual !== "number") { obra.percentualFisicoAtual = Number(obra.percentualFisicoAtual) || 0; changed = true; }
      if (!Array.isArray(obra.aditivos)) { obra.aditivos = []; changed = true; }
      if (!Array.isArray(obra.relatoriosSemanais)) { obra.relatoriosSemanais = []; changed = true; }
      
      if (changed) worksRepairedCount++;
      return obra;
    });
    if (worksRepairedCount > 0 || sanitizedObras.length === 0) {
      setObras(sanitizedObras);
      saveObras(sanitizedObras);
    }
    setDebuggerSteps(prev => prev.map((s, idx) => idx === 1 ? { 
      ...s, 
      status: worksRepairedCount > 0 ? "fixed" : "success", 
      detail: worksRepairedCount > 0 
        ? `Saneados ${worksRepairedCount} contratos fiscais com propriedades incompatíveis.` 
        : "Nenhum erro de schema estrutural nos contratos foi encontrado." 
    } : s));

    // STEP 3
    setDebuggerSteps(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: "running" } : s));
    await delay(800);
    let reportsRepairedCount = 0;
    const updatedObrasWithReports = sanitizedObras.map(obra => {
      let changed = false;
      obra.relatoriosSemanais = obra.relatoriosSemanais.map(rep => {
        let repChanged = false;
        if (!rep.atividadesSemana || !Array.isArray(rep.atividadesSemana)) { rep.atividadesSemana = []; repChanged = true; }
        if (!rep.atividadesProximaSemana || !Array.isArray(rep.atividadesProximaSemana)) { rep.atividadesProximaSemana = []; repChanged = true; }
        if (!rep.observacoesApontamentos || !Array.isArray(rep.observacoesApontamentos)) { rep.observacoesApontamentos = []; repChanged = true; }
        if (!rep.fotos || !Array.isArray(rep.fotos)) { rep.fotos = []; repChanged = true; }
        if (typeof rep.percentualFisico !== "number") { rep.percentualFisico = Number(rep.percentualFisico) || 0; repChanged = true; }
        if (rep.percentualFisico < 0) { rep.percentualFisico = 0; repChanged = true; }
        if (rep.percentualFisico > 100) { rep.percentualFisico = 100; repChanged = true; }
        
        rep.fotos = rep.fotos.map(f => {
          if (f.legenda === undefined) { f.legenda = ""; repChanged = true; }
          return f;
        });

        if (repChanged) changed = true;
        return rep;
      });

      if (changed) reportsRepairedCount++;
      return obra;
    });

    if (reportsRepairedCount > 0) {
      setObras(updatedObrasWithReports);
      saveObras(updatedObrasWithReports);
    }
    setDebuggerSteps(prev => prev.map((s, idx) => idx === 2 ? { 
      ...s, 
      status: reportsRepairedCount > 0 ? "fixed" : "success", 
      detail: reportsRepairedCount > 0 
        ? `Retificados e imunizados ${reportsRepairedCount} relatórios de campo com coleções indefinidas.` 
        : "Todos os relatórios semanais estão rodando de forma fluida sem inconsistências." 
    } : s));

    // STEP 4
    setDebuggerSteps(prev => prev.map((s, idx) => idx === 3 ? { ...s, status: "running" } : s));
    await delay(900);
    
    // audit logs check
    const currentLogs = getSavedLogs();
    const repairLog: AuditLog = {
      id: "log-repair-" + Date.now(),
      timestamp: new Date().toISOString(),
      userName: currentUser?.name || "Auto-Reparo de Programação",
      userEmail: currentUser?.email || "sistema@fiscal.com",
      userRole: currentUser?.role || UserRole.ADMINISTRADOR,
      acao: "REPARO_INTEGRIDADE_FLUIDEZ",
      descricao: "A ferramenta de calibragem de fluxo e auto-reparo de programação foi executada com êxito. Todos os registros locais foram saneados e estão operacionais."
    };
    
    const logsToSave = [repairLog, ...currentLogs].slice(0, 500); // keep max 500
    setAuditLogs(logsToSave);
    saveLogs(logsToSave);

    setDebuggerSteps(prev => prev.map((s, idx) => idx === 3 ? { 
      ...s, 
      status: "success", 
      detail: "Bases de dados sincronizadas de maneira robusta. Protocolo auditado e salvo." 
    } : s));

    await delay(300);
    setDebuggerStage("done");
  };

  // 5. RESTORE HISTORICAL REVISION SNAPSHOT (ROLLBACK)
  const handleRestoreRevision = (revision: Revision) => {
    if (!revision.obraSnapshot || revision.obraSnapshot === "{}") {
      alert("Este snapshot de histórico está vazio ou é inválido.");
      return;
    }

    const snapshotWork = JSON.parse(revision.obraSnapshot) as Obra;

    const updatedObras = obras.map(o => o.id === revision.obraId ? snapshotWork : o);
    setObras(updatedObras);
    saveObras(updatedObras);

    // Record rollback log
    const newLog: AuditLog = {
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      userName: currentUser?.name || "Sistema",
      userEmail: currentUser?.email || "",
      userRole: currentUser?.role || UserRole.ADMINISTRADOR,
      acao: "RESTAL_REVISAO",
      descricao: `Efetuou ROLLBACK do contrato de obras para o estado de revisão gerado por ${revision.userName} em ${new Date(revision.timestamp).toLocaleString("pt-BR")}.`,
      obraId: revision.obraId,
      obraTitulo: snapshotWork.titulo
    };

    const updatedLogs = [...auditLogs, newLog];
    setAuditLogs(updatedLogs);
    saveLogs(updatedLogs);

    alert("Contrato restaurado com sucesso para o snapshot histórico!");
  };

  // Global KPIs computations
  const totalBudget = obras.reduce((acc, o) => acc + o.valorContratualAtual, 0);
  const activeWorksCount = obras.filter(o => o.statusGeral === "Em Andamento").length;
  const avgCompletion = obras.length > 0
    ? Math.round(obras.reduce((acc, o) => acc + o.percentualFisicoAtual, 0) / obras.length)
    : 0;

  // Filtered lists for main list
  const filteredObras = obras.filter(o => {
    const matchesSearch = 
      o.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.contratoNo.includes(searchTerm) ||
      o.empresaVencedora.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "TODOS" || o.statusGeral === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  const activeObraObj = obras.find(o => o.id === selectedObraId);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans antialiased" id="main-application-frame">
      
      {/* Left Sidebar - persistent on desktop */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 sticky top-0 h-screen hidden lg:flex z-40 text-slate-300">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-500 text-white shadow-md">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-orange-400 block leading-tight">CODEMAR</span>
            <span className="text-white font-bold text-xs tracking-tight">Painel de Engenharia</span>
          </div>
        </div>

        {/* Sidebar Nav */}
        <div className="flex-1 p-4 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-3 mb-2 block">
            Navegação Principal
          </div>
          <button
            onClick={() => {
              setSelectedObraId(null);
              setViewMode("dashboard");
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              selectedObraId === null && viewMode === "dashboard"
                ? "bg-slate-800 text-white font-bold border-l-2 border-orange-500 pl-2"
                : "hover:bg-slate-800/40 text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutGrid className="h-4 w-4 shrink-0 text-slate-400" />
            Diretório de Obras
          </button>
          
          <button
            onClick={() => {
              setSelectedObraId(null);
              setViewMode("logs");
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              selectedObraId === null && viewMode === "logs"
                ? "bg-slate-800 text-white font-bold border-l-2 border-orange-500 pl-2"
                : "hover:bg-slate-800/40 text-slate-400 hover:text-slate-200"
            }`}
          >
            <ClipboardList className="h-4 w-4 shrink-0 text-slate-400" />
            Auditoria Global (Logs)
          </button>

          <button
            onClick={() => {
              setSelectedObraId(null);
              setViewMode("settings");
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              selectedObraId === null && viewMode === "settings"
                ? "bg-slate-800 text-white font-bold border-l-2 border-orange-500 pl-2"
                : "hover:bg-slate-800/40 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0 text-slate-400" />
            Configurações
          </button>

          <button
            onClick={() => {
              setShowDebuggerModal(true);
              setDebuggerStage("idle");
              setDebuggerSteps([]);
            }}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all hover:bg-slate-800/40 text-slate-400 hover:text-slate-200"
            title="Verificador de Erros da Programação"
            id="btn-auto-repair-sidebar"
          >
            <div className="flex items-center gap-3">
              <Activity className="h-4 w-4 shrink-0 text-amber-500 animate-pulse" />
              <span>Diagnóstico & Fluidez</span>
            </div>
            <span className="bg-amber-400/20 text-amber-400 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-widest scale-90">Auto</span>
          </button>

          {selectedObraId && activeObraObj && (
            <div className="pt-4 mt-4 border-t border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-3 block mb-2">Contrato Selecionado</span>
              <div
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-white shadow-inner flex-nowrap"
              >
                <Building2 className="h-4 w-4 text-orange-400 shrink-0" />
                <span className="truncate" title={activeObraObj.titulo}>{activeObraObj.contratoNo}</span>
              </div>
            </div>
          )}
        </div>

        {/* Active User profile at bottom of sidebar */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          {currentUser && (
            <UserAuth 
              currentUser={currentUser} 
              onUserChange={handleUserChange}
              onUserCreated={handleUserCreated}
            />
          )}
          <button
            onClick={() => {
              sessionStorage.removeItem("auth_session_active");
              setIsAuthenticated(false);
            }}
            className="w-full bg-slate-800/40 hover:bg-red-950/40 text-red-400 hover:text-red-300 text-[11px] font-bold py-2 px-3 rounded-xl border border-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Desconectar Sessão
          </button>
        </div>
      </aside>

      {/* Main Panel Column */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header - White with subtle borders */}
        <header className="bg-white border-b border-slate-150 py-3.5 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-30 shadow-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600 lg:hidden shadow-inner">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block lg:hidden">CODEMAR Maricá</span>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                {selectedObraId && activeObraObj 
                  ? `Fiscalização de Campo — Contrato ${activeObraObj.contratoNo}`
                  : viewMode === "dashboard"
                  ? "Portal de Engenharia & Fiscalização"
                  : "Registro de Segurança & Auditoria"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="lg:hidden flex-1 sm:flex-none flex items-center gap-2">
              {currentUser && (
                <UserAuth 
                  currentUser={currentUser} 
                  onUserChange={handleUserChange}
                  onUserCreated={handleUserCreated}
                />
              )}
              <button
                onClick={() => {
                  sessionStorage.removeItem("auth_session_active");
                  setIsAuthenticated(false);
                }}
                title="Desconectar"
                className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-red-500 p-2.5 rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content canvas viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
        
        {selectedObraId && activeObraObj ? (
          // WORK DETAIL COMPONENT ROUTE
          <WorkDetail
            obra={activeObraObj}
            currentUser={currentUser || getSavedObras()[0] as any} // Fallback check
            revisions={revisions}
            auditLogs={auditLogs}
            onBack={() => setSelectedObraId(null)}
            onAddAditivo={handleAddAditivo}
            onEditAditivo={handleEditAditivo}
            onDeleteAditivo={handleDeleteAditivo}
            onAddWeeklyReport={(rep) => handleSaveWeeklyReport(rep, false)}
            onEditWeeklyReport={(rep) => handleSaveWeeklyReport(rep, true)}
            onRestoreRevision={handleRestoreRevision}
            onUpdateObra={handleSaveObra}
            onAddAuditLog={(log: AuditLog) => {
              const updatedLogs = [...auditLogs, log];
              setAuditLogs(updatedLogs);
              saveLogs(updatedLogs);
            }}
          />
        ) : (
          // MAIN DIRECTORY / LIST PAGE
          <div className="space-y-6">
            
            {/* KPI metrics board */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-metrics-grid">
              
              {/* Metric 1 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 shrink-0">
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-800">{obras.length}</div>
                  <div className="text-slate-450 text-[11px] font-bold uppercase tracking-wide">Obras Públicas Registradas</div>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-orange-50 text-orange-600 shrink-0">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-800">{activeWorksCount}</div>
                  <div className="text-slate-450 text-[11px] font-bold uppercase tracking-wide">Em Execução Simultânea</div>
                </div>
              </div>

              {/* Metric 3 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
                  <Coins className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-lg font-black text-slate-800 truncate max-w-[160px]" title={totalBudget.toLocaleString("pt-BR")}>
                    {totalBudget.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-slate-450 text-[11px] font-bold uppercase tracking-wide">Investimento Público Ativo</div>
                </div>
              </div>

              {/* Metric 4 */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600 shrink-0">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-800">{avgCompletion}%</div>
                  <div className="text-slate-450 text-[11px] font-bold uppercase tracking-wide">Média de Progresso Físico</div>
                </div>
              </div>

            </div>

            {/* Toggle tabs and filters banner */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              
              {/* Multi-view Toggles */}
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={() => setViewMode("dashboard")}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    viewMode === "dashboard"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Diretório de Obras
                </button>
                <button
                  onClick={() => setViewMode("logs")}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    viewMode === "logs"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-50 border border-slate-200 text-slate-650 hover:bg-slate-100"
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  Auditoria Global (Logs)
                </button>
              </div>

              {viewMode === "dashboard" && (
                /* Interactive Filters */
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-stretch sm:items-center">
                  <div className="relative flex-1 sm:flex-initial sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      maxLength={1000}
                      placeholder="Pesquisar por contrato ou empresa..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-semibold text-slate-700"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusGeralFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 focus:outline-none font-semibold text-slate-650 select-none"
                  >
                    <option value="TODOS">Todos os Status</option>
                    <option value="Em Andamento">Em Andamento</option>
                    <option value="Paralisada">Paralisada</option>
                    <option value="Concluída">Concluída</option>
                  </select>

                  <button
                    onClick={() => exportObrasToExcel(obras)}
                    className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold py-1.5 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Exportar Planilha Obras
                  </button>

                  <button
                    onClick={() => {
                      const options = getWeekOptionsForApp();
                      if (options.length > 0) {
                        setSelectedConsolidatedWeekKey(options[0].key);
                      }
                      setShowConsolidatedModal(true);
                    }}
                    className="bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-850 text-xs font-bold py-1.5 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 justify-center"
                    id="btn-consolidated-report"
                  >
                    <ClipboardList className="h-3.5 w-3.5 text-orange-600" />
                    Consolidado Semanal
                  </button>



                  {/* RBAC check for register obra */}
                  {currentUser && currentUser.role !== UserRole.LEITOR ? (
                    <button
                      onClick={() => setShowWorkModal(true)}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-1.5 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-md shrink-0 justify-center"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Entrar Contrato Obra
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {/* DASHBOARD TAB DIRECTORY VIEW */}
            {viewMode === "dashboard" ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="works-list-grid">
                {filteredObras.map((obra) => {
                  return (
                    <div 
                      key={obra.id}
                      className="bg-white rounded-2xl border border-slate-150 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative"
                    >
                      {/* Left decor edge */}
                      <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        obra.statusGeral === "Em Andamento" 
                          ? "bg-indigo-500" 
                          : obra.statusGeral === "Paralisada"
                          ? "bg-rose-500"
                          : "bg-emerald-500"
                      }`}></span>

                      {/* Card Content Header */}
                      <div className="p-6 pl-8 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase bg-slate-100 p-1 px-2 rounded-md">
                              Contrato Nº {obra.contratoNo}
                            </span>
                            <h3 className="font-bold text-slate-800 text-sm mt-2 max-w-sm leading-tight hover:text-slate-900 transition-colors">
                              {obra.titulo}
                            </h3>
                          </div>
                          
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                            obra.statusGeral === "Em Andamento" 
                              ? "bg-blue-50 text-blue-700 border border-blue-150" 
                              : obra.statusGeral === "Paralisada"
                              ? "bg-rose-50 text-rose-700 border border-rose-150"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-150"
                          }`}>
                            {obra.statusGeral}
                          </span>
                        </div>

                        {/* Progress visual bar */}
                        <div>
                          <div className="flex justify-between items-center text-xs mb-1 font-bold text-slate-500">
                            <span>Avanço Físico Concluído:</span>
                            <span className="text-slate-800 font-semibold">{obra.percentualFisicoAtual}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-slate-900 h-full rounded-full transition-all" style={{ width: `${obra.percentualFisicoAtual}%` }}></div>
                          </div>
                        </div>

                        {/* Status em Relação ao Prazo */}
                        {(() => {
                          const statusInfo = getDeadlineStatus(obra);
                          return (
                            <div className="bg-slate-50/50 border border-slate-150/70 p-3 rounded-xl flex items-center justify-between text-xs gap-3">
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status do Prazo</span>
                              <div className="text-right min-w-0 col-span-2">
                                <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border truncate max-w-full ${statusInfo.badgeClass}`}>
                                  {statusInfo.text}
                                </span>
                                <span className="block text-[9px] text-slate-400 font-bold mt-1 truncate">
                                  {statusInfo.daysRemainingText}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Mini parameters List */}
                        <div className="grid grid-cols-2 gap-y-2.5 text-xs border-t border-slate-100 pt-3 font-semibold text-slate-600">
                          <div>
                            <span className="text-[10px] block uppercase font-bold text-slate-400">Empreiteira Vencedora:</span>
                            <span className="font-bold text-slate-700 truncate block max-w-[180px]">{obra.empresaVencedora}</span>
                          </div>
                          <div>
                            <span className="text-[10px] block uppercase font-bold text-slate-400">Investimento Total:</span>
                            <span className="font-bold text-slate-700">
                              {obra.valorContratualAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] block uppercase font-bold text-slate-400">Vigência Aditivada:</span>
                            <span>{obra.prazoVigenciaAtual}</span>
                          </div>
                          <div>
                            <span className="text-[10px] block uppercase font-bold text-slate-400">Termos Aditivos Lançados:</span>
                            <span className="font-bold text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-full">{obra.aditivos.length} adit.</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="bg-slate-50/50 p-4 pl-8 border-t border-slate-100 flex justify-between items-center bg-slate-50/45">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                          CODEMAR Fiscalização
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          {currentUser && currentUser.role !== UserRole.LEITOR && (
                            <button
                              onClick={() => setDirectReportObraId(obra.id)}
                              className="bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-xl shadow-sm transition-all flex items-center gap-1"
                              id={`btn-add-weekly-report-${obra.id}`}
                            >
                              <ClipboardList className="h-3 w-3" />
                              Lançar Atividades
                            </button>
                          )}
                          
                          <button
                            onClick={() => setSelectedObraId(obra.id)}
                            className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80 text-[11px] font-bold px-4 py-1.5 rounded-xl shadow-sm transition-all hover:border-slate-350"
                          >
                            Gerenciar Ficha & PDF
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}

                {filteredObras.length === 0 && (
                  <div className="col-span-2 text-center p-12 bg-white rounded-2xl border border-slate-200/50 text-slate-450 italic text-xs">
                    Nenhum contrato de obras públicas corresponde aos filtros de busca ou status selecionados.
                  </div>
                )}
              </div>
            ) : viewMode === "logs" ? (
              // GLOBAL LOGS COMPONENT VIEW
              <AuditLogView logs={auditLogs} />
            ) : viewMode === "settings" ? (
              <SettingsView />
            ) : null}

          </div>
        )}

      </main>

      {/* CREATE WORK DIALOG */}
      {showWorkModal && (
        <WorkForm
          onClose={() => setShowWorkModal(false)}
          onSave={handleSaveObra}
        />
      )}

      {/* DIRECT WEEKLY REPORT INPUT DIALOG */}
      {directReportObraId && (
        <WeeklyReportForm
          onClose={() => setDirectReportObraId(null)}
          onSave={(report) => {
            handleSaveWeeklyReportDirect(directReportObraId, report);
            setDirectReportObraId(null);
          }}
        />
      )}

      {/* CONSOLIDATED WEEKLY REPORT DIALOG */}
      {showConsolidatedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="consolidated-report-modal">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-150 max-w-lg w-full overflow-hidden flex flex-col transform transition-transform scale-100">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-100 text-orange-600">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Relatório Semanal Consolidado</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Compilador Geral de Engenharia</p>
                </div>
              </div>
              <button 
                onClick={() => setShowConsolidatedModal(false)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all text-sm"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Selecione a Semana de Referência:</label>
                {getWeekOptionsForApp().length > 0 ? (
                  <select
                    value={selectedConsolidatedWeekKey}
                    onChange={(e) => setSelectedConsolidatedWeekKey(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-slate-300 text-slate-700"
                  >
                    <option value="">-- Escolha uma Semana --</option>
                    {getWeekOptionsForApp().map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label} ({opt.count} {opt.count === 1 ? "obra" : "obras"} apresentada{opt.count === 1 ? "" : "s"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-slate-400 italic bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-100">
                    Nenhum diário de acompanhamento foi lançado nas obras cadastradas até o momento. Lance um diário antes de extrair o relatório consolidado.
                  </div>
                )}
              </div>

              {selectedConsolidatedWeekKey && (
                <div className="space-y-4">
                  {/* Included works lists */}
                  <div>
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Obras Contempladas ({
                        (() => {
                          const [inicio, fim] = selectedConsolidatedWeekKey.split("|");
                          return obras.filter(o => o.relatoriosSemanais.some(r => r.periodoInicio === inicio && r.periodoFim === fim)).length;
                        })()
                      }):</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase">Com relatório</span>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {(() => {
                        const [inicio, fim] = selectedConsolidatedWeekKey.split("|");
                        const included = obras.filter(o => o.relatoriosSemanais.some(r => r.periodoInicio === inicio && r.periodoFim === fim));
                        return included.map(obra => {
                          const rep = obra.relatoriosSemanais.find(r => r.periodoInicio === inicio && r.periodoFim === fim);
                          return (
                            <div key={obra.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className="font-bold text-slate-800 truncate" title={obra.titulo}>{obra.contratoNo} - {obra.titulo}</span>
                                <span className="text-[9px] text-slate-400 font-semibold">{obra.empresaVencedora}</span>
                              </div>
                              <span className="shrink-0 font-bold text-slate-700 bg-white border border-slate-205 px-2 py-0.5 rounded-md">{rep?.percentualFisico || 0}%</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Excluded works lists */}
                  {(() => {
                    const [inicio, fim] = selectedConsolidatedWeekKey.split("|");
                    const excluded = obras.filter(o => !o.relatoriosSemanais.some(r => r.periodoInicio === inicio && r.periodoFim === fim));
                    if (excluded.length === 0) return null;
                    return (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Obras Desconsideradas ({excluded.length}):</span>
                          <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded-full uppercase">Sem relatório</span>
                        </div>
                        <div className="text-[10px] space-y-1 text-slate-400 pl-1">
                          {excluded.map(ex => (
                            <div key={ex.id} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
                              <span className="font-semibold text-slate-500 truncate" title={ex.titulo}>{ex.contratoNo} - {ex.titulo}</span>
                            </div>
                          ))}
                          <span className="block mt-1 text-[9px] italic text-slate-400">* Conforme diretriz legal, obras sem registro de atividades no período selecionado não integrarão o documento consolidado.</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowConsolidatedModal(false)}
                className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-4 rounded-xl transition-all"
              >
                Voltar
              </button>
              <button
                disabled={!selectedConsolidatedWeekKey || isGeneratingConsolidated}
                onClick={async () => {
                  const [inicio, fim] = selectedConsolidatedWeekKey.split("|");
                  const activeReports: { obra: Obra; report: WeeklyReport }[] = [];
                  
                  obras.forEach(o => {
                    const rep = o.relatoriosSemanais.find(r => r.periodoInicio === inicio && r.periodoFim === fim);
                    if (rep) {
                      activeReports.push({ obra: o, report: rep });
                    }
                  });

                  if (activeReports.length === 0) {
                    alert("Por favor, selecione uma período válido que tenha relatórios lançados.");
                    return;
                  }

                  setIsGeneratingConsolidated(true);
                  try {
                    await generateConsolidatedWeeklyPDF(activeReports, inicio, fim);
                    setShowConsolidatedModal(false);
                  } catch (err) {
                    console.error("Erro ao consolidar PDF semanal:", err);
                    alert("Houve um erro técnico ao compilar o PDF.");
                  } finally {
                    setIsGeneratingConsolidated(false);
                  }
                }}
                className={`text-white text-xs font-bold py-2 px-4 rounded-xl transition-all shadow-md flex items-center gap-1.5 ${
                  !selectedConsolidatedWeekKey || isGeneratingConsolidated
                    ? "bg-slate-300 cursor-not-allowed shadow-none"
                    : "bg-orange-600 hover:bg-orange-500"
                }`}
              >
                {isGeneratingConsolidated ? (
                  <>
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1"></span>
                    Gerando Relatório...
                  </>
                ) : (
                  <>
                    <ClipboardList className="h-3.5 w-3.5" />
                    Gerar PDF Consolidado
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIAGNOSTIC AND AUTO-REPAIR ENGINE MODAL */}
      {showDebuggerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-250" id="program-debugger-modal">
          <div className="bg-slate-900 border border-slate-800/85 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col transform scale-100 text-slate-100">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-850 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/30">
                  <Activity className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Painel de Integridade & Fluidez</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-amber-500/90 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Reparo Automático de Programação
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (debuggerStage !== "running") {
                    setShowDebuggerModal(false);
                  }
                }}
                disabled={debuggerStage === "running"}
                className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 hover:border-slate-700 disabled:opacity-40 transition-all text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[72vh]">
              {debuggerStage === "idle" ? (
                <div className="space-y-5 text-center py-4">
                   <div className="mx-auto w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800 text-amber-500">
                     <Wrench className="w-8 h-8" />
                   </div>
                   <div className="space-y-2">
                     <h4 className="text-base font-bold text-slate-100">Saneamento de Banco e Código</h4>
                     <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                       Esta rotina fiscal examina os dados cadastrados, listas de atividades semanais, e dados de mídia base64 para detectar e corrigir de forma instantânea quaisquer exceções ou propriedades nulas capazes de impedir a renderização natural e fluida do portal de fiscalização.
                     </p>
                   </div>

                   <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-left max-w-sm mx-auto">
                     <h5 className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">Ações automáticas:</h5>
                     <ul className="text-2xs text-slate-400 space-y-1 font-mono">
                       <li className="flex items-center gap-2">✔ Validar e recompor chaves JSON.</li>
                       <li className="flex items-center gap-2">✔ Sanitizar fotos, capas e base64 nulos.</li>
                       <li className="flex items-center gap-2">✔ Imunizar propriedades de matriz não instanciadas.</li>
                       <li className="flex items-center gap-2">✔ Garantir sincronia completa nos diários.</li>
                     </ul>
                   </div>

                   <button
                     onClick={runAutoRepair}
                     className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-amber-500/10 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
                   >
                     <Wrench className="w-4 h-4 text-slate-950" />
                     Executar Varredura Geral & Calibragem
                   </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {debuggerSteps.map((step, idx) => (
                      <div key={idx} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {step.status === "pending" && (
                            <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-900" />
                          )}
                          {step.status === "running" && (
                            <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                          )}
                          {step.status === "success" && (
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          )}
                          {step.status === "fixed" && (
                            <Sparkles className="w-4 h-4 text-amber-400 animate-bounce" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200">{step.name}</span>
                            {step.status === "success" && (
                              <span className="bg-emerald-500/15 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider">OK</span>
                            )}
                            {step.status === "fixed" && (
                              <span className="bg-amber-400/20 text-amber-400 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider">Corrigido</span>
                            )}
                            {step.status === "running" && (
                              <span className="bg-blue-400/20 text-blue-400 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider animate-pulse">Varrendo</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-850 mt-1 max-w-[430px] overflow-hidden truncate whitespace-normal">
                            {step.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {debuggerStage === "done" && (
                    <div className="bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/20 p-5 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-400">Banco de Dados Otimizado</h4>
                        <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">
                          Todas as propriedades de relatórios, listas de fotos e contratos foram normalizados com absoluto sucesso. O aplicativo está calibrado e rodando com fluidez contínua.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {debuggerStage === "done" && (
              <div className="p-6 border-t border-slate-800 bg-slate-950/30 flex justify-end">
                <button
                  onClick={() => setShowDebuggerModal(false)}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Fechar Canal de Reparo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
