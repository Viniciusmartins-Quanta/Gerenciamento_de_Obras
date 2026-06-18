import React, { useState, useEffect } from "react";
import { Obra, Aditivo, WeeklyReport, Revision, AuditLog, UserProfile, UserRole } from "../types";
import { getDeadlineStatus } from "../App";
import { generateWeeklyPDF } from "../utils/pdfGenerator";
import { exportSingleObraToExcel } from "../utils/excelGenerator";
import WorkTimeline from "./WorkTimeline";
import AditivoForm from "./AditivoForm";
import WeeklyReportForm from "./WeeklyReportForm";
import WorkForm from "./WorkForm";
import { 
  Building2, Calendar, TrendingUp, AlertTriangle, FileText, CheckCircle, 
  MapPin, Coins, Timer, History, ShieldAlert, Download, Edit3, PlusCircle, ArrowLeft, ArrowUpRight,
  Trash2, Cloud, FolderOpen, UploadCloud, Loader2, ExternalLink, RefreshCw, Link2
} from "lucide-react";
import { getGmailToken, getGmailUser, googleSignIn } from "../utils/firebaseAuth";
import { searchFolder, createFolder, listFiles, uploadFileToFolder, deleteFile, DriveFile } from "../utils/driveApi";

interface WorkDetailProps {
  obra: Obra;
  currentUser: UserProfile;
  revisions: Revision[];
  auditLogs: AuditLog[];
  onBack: () => void;
  onAddAditivo: (ad: Aditivo) => void;
  onEditAditivo?: (ad: Aditivo) => void;
  onDeleteAditivo?: (aditivoId: string) => void;
  onAddWeeklyReport: (rep: WeeklyReport) => void;
  onEditWeeklyReport: (rep: WeeklyReport) => void;
  onRestoreRevision: (rev: Revision) => void;
  onUpdateObra: (updatedObra: Obra) => void;
  onAddAuditLog?: (log: AuditLog) => void;
}

function formatCurrency(val: number): string {
  return "R$ " + val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function WorkDetail({
  obra,
  currentUser,
  revisions,
  auditLogs,
  onBack,
  onAddAditivo,
  onEditAditivo,
  onDeleteAditivo,
  onAddWeeklyReport,
  onEditWeeklyReport,
  onRestoreRevision,
  onUpdateObra,
  onAddAuditLog
}: WorkDetailProps) {
  const [activeTab, setActiveTab] = useState<"ficha" | "aditivos" | "relatorios" | "drive" | "revisoes" | "logs">("ficha");
  const [selectedReportId, setSelectedReportId] = useState<string>(
    obra.relatoriosSemanais[obra.relatoriosSemanais.length - 1]?.id || ""
  );

  // Edit Work contract state
  const [showEditWorkModal, setShowEditWorkModal] = useState(false);

  // Google Drive state
  const [driveFolder, setDriveFolder] = useState<{ id: string; name: string; webViewLink: string } | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [isCheckingDrive, setIsCheckingDrive] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [deletingDriveFileId, setDeletingDriveFileId] = useState<string | null>(null);
  const [driveError, setDriveError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const googleUser = getGmailUser();
  const googleToken = getGmailToken();

  const loadDriveData = async (token: string) => {
    setIsCheckingDrive(true);
    setDriveError("");
    try {
      const cleanContract = (obra.contratoNo || "").replace(/[^a-zA-Z0-9-_\s]/g, "").trim() || obra.id;
      const folderName = `CODEMAR - TC ${cleanContract}`;
      const folder = await searchFolder(token, folderName);
      if (folder) {
        setDriveFolder(folder);
        const files = await listFiles(token, folder.id);
        setDriveFiles(files);
      } else {
        setDriveFolder(null);
        setDriveFiles([]);
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados do Drive:", err);
      setDriveError("Erro ao recuperar informações do Google Drive. Verifique a sua conexão.");
    } finally {
      setIsCheckingDrive(false);
    }
  };

  useEffect(() => {
    const token = getGmailToken();
    if (activeTab === "drive" && token) {
      loadDriveData(token);
    }
  }, [activeTab, obra.id]);

  const handleDriveSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        await loadDriveData(res.accessToken);
      }
    } catch (err: any) {
      console.error("Erro ao conectar Google:", err);
      setDriveError("Não foi possível autenticar sua conta Google.");
    }
  };

  const handleCreateFolder = async () => {
    const token = getGmailToken();
    if (!token) return;
    setIsCreatingFolder(true);
    setDriveError("");
    try {
      const cleanContract = (obra.contratoNo || "").replace(/[^a-zA-Z0-9-_\s]/g, "").trim() || obra.id;
      const folderName = `CODEMAR - TC ${cleanContract}`;
      const folder = await createFolder(token, folderName);
      setDriveFolder(folder as any);
      
      if (onAddAuditLog) {
        onAddAuditLog({
          id: "log-" + Date.now(),
          timestamp: new Date().toISOString(),
          userName: currentUser.name,
          userEmail: currentUser.email,
          userRole: currentUser.role,
          acao: "CRIAR_PASTA_DRIVE",
          descricao: `Criou pasta do empreendimento no Google Drive: "${folderName}"`,
          obraId: obra.id,
          obraTitulo: obra.titulo
        });
      }
    } catch (err: any) {
      console.error("Erro ao criar pasta no Drive:", err);
      setDriveError("Não foi possível inicializar a pasta do contrato no seu Google Drive.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    const token = getGmailToken();
    if (!token || !driveFolder) return;
    
    if (file.size > 25 * 1024 * 1024) {
      alert("O tamanho do arquivo excede o limite recomendado de 25MB.");
      return;
    }

    setIsUploadingDrive(true);
    setDriveError("");
    try {
      await uploadFileToFolder(token, driveFolder.id, file);
      const files = await listFiles(token, driveFolder.id);
      setDriveFiles(files);

      if (onAddAuditLog) {
        onAddAuditLog({
          id: "log-" + Date.now(),
          timestamp: new Date().toISOString(),
          userName: currentUser.name,
          userEmail: currentUser.email,
          userRole: currentUser.role,
          acao: "REG_DRIVE_UPLOAD",
          descricao: `Adicionou arquivo "${file.name}" à pasta da obra no Google Drive`,
          obraId: obra.id,
          obraTitulo: obra.titulo
        });
      }
    } catch (err: any) {
      console.error("Erro ao enviar arquivo para o Drive:", err);
      setDriveError("Erro ao enviar arquivo. Certifique-se de que possui permissão de edição.");
    } finally {
      setIsUploadingDrive(false);
    }
  };

  const handleDeleteDriveFile = async (fileId: string, fileName: string) => {
    const confirmed = window.confirm(
      `Deseja realmente excluir permanentemente o arquivo "${fileName}" do Google Drive? Esta ação não poderá ser desfeita.`
    );
    if (!confirmed) return;

    const token = getGmailToken();
    if (!token || !driveFolder) return;

    setDeletingDriveFileId(fileId);
    setDriveError("");
    try {
      await deleteFile(token, fileId);
      const files = await listFiles(token, driveFolder.id);
      setDriveFiles(files);

      if (onAddAuditLog) {
        onAddAuditLog({
          id: "log-" + Date.now(),
          timestamp: new Date().toISOString(),
          userName: currentUser.name,
          userEmail: currentUser.email,
          userRole: currentUser.role,
          acao: "REG_DRIVE_DELETE",
          descricao: `Removeu o arquivo "${fileName}" do Google Drive`,
          obraId: obra.id,
          obraTitulo: obra.titulo
        });
      }
    } catch (err: any) {
      console.error("Erro ao excluir arquivo no Drive:", err);
      setDriveError("Não foi possível excluir o arquivo. Verifique se possui permissões de edição.");
    } finally {
      setDeletingDriveFileId(null);
    }
  };

  const [showAditivoModal, setShowAditivoModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportToEdit, setReportToEdit] = useState<WeeklyReport | undefined>(undefined);
  const [aditivoToEdit, setAditivoToEdit] = useState<Aditivo | undefined>(undefined);

  // New state for cronologia URL insertion
  const [showCronologiaUrlInput, setShowCronologiaUrlInput] = useState(false);
  const [cronologiaUrl, setCronologiaUrl] = useState(obra.imagemCronologia?.startsWith("http") || obra.imagemCronologia?.startsWith("/") ? obra.imagemCronologia : "");
  
  // New state for cronologia Drive insertion
  const [showCronologiaDriveInput, setShowCronologiaDriveInput] = useState(false);
  const [cronologiaDriveUrl, setCronologiaDriveUrl] = useState("");

  useEffect(() => {
    setCronologiaUrl(obra.imagemCronologia?.startsWith("http") || obra.imagemCronologia?.startsWith("/") ? obra.imagemCronologia : "");
    setShowCronologiaUrlInput(false);
    setShowCronologiaDriveInput(false);
    setCronologiaDriveUrl("");
  }, [obra.id, obra.imagemCronologia]);

  const parseDriveUrl = (url: string): string => {
    if (!url) return "";
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith("data:") || cleanUrl.includes("drive.google.com/uc") || cleanUrl.includes("lh3.googleusercontent.com")) {
      return cleanUrl;
    }
    const fileDMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch && fileDMatch[1]) {
      return `https://docs.google.com/uc?export=download&id=${fileDMatch[1]}`;
    }
    const idMatch = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return `https://docs.google.com/uc?export=download&id=${idMatch[1]}`;
    }
    return cleanUrl;
  };

  // Active Report reference
  const activeReport = obra.relatoriosSemanais.find(r => r.id === selectedReportId) || 
                       obra.relatoriosSemanais[obra.relatoriosSemanais.length - 1];

  const handleExportPDF = () => {
    if (!activeReport) {
      alert("Nenhum relatório semanal de acompanhamento disponível para exportação.");
      return;
    }
    generateWeeklyPDF(obra, activeReport);
  };

  const handleExportExcel = () => {
    exportSingleObraToExcel(obra);
  };

  const handleCronologiaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Str = event.target?.result as string;
      if (base64Str) {
        onUpdateObra({
          ...obra,
          imagemCronologia: base64Str
        });
        setCronologiaUrl("");
        setShowCronologiaUrlInput(false);
      }
    };
    reader.onerror = (err) => {
      console.error("Erro ao ler imagem de cronologia:", err);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCronologia = () => {
    onUpdateObra({
      ...obra,
      imagemCronologia: undefined
    });
    setCronologiaUrl("");
  };

  // Helper check for roles
  const canManageAditivos = currentUser.role === UserRole.ADMINISTRADOR || currentUser.role === UserRole.ENGENHEIRO_CHEFE;
  const canManageReports = currentUser.role !== UserRole.LEITOR;

  const filteredLogs = auditLogs.filter(log => log.obraId === obra.id);
  const filteredRevisions = revisions.filter(rev => rev.obraId === obra.id);

  return (
    <div className="space-y-6" id="work-detail-view">
      
      {/* Title block with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-start gap-4">
          <button 
            onClick={onBack}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all shadow-sm"
            title="Voltar ao Painel Geral"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Contrato {obra.contratoNo}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                obra.statusGeral === "Em Andamento" 
                  ? "bg-blue-50 text-blue-700 border border-blue-200" 
                  : obra.statusGeral === "Paralisada"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}>
                {obra.statusGeral}
              </span>
              {(() => {
                const statusInfo = getDeadlineStatus(obra);
                return (
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border flex items-center gap-1.5 ${statusInfo.badgeClass}`} title={statusInfo.daysRemainingText}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusInfo.colorHex }} />
                    Prazo: {statusInfo.text} ({statusInfo.daysRemainingText})
                  </span>
                );
              })()}
            </div>
            <h1 className="text-lg font-bold text-slate-800 mt-1 max-w-xl leading-tight">
              {obra.titulo}
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Empresa Executora: <span className="font-semibold text-slate-700">{obra.empresaVencedora}</span>
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-350 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
          >
            <Download className="h-4 w-4 text-emerald-500" />
            Excel Ficha
          </button>
          
          {activeReport && (
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              Download PDF Pronto
            </button>
          )}

          {activeReport && googleToken && driveFolder && (
            <button
              onClick={async () => {
                const confirmed = window.confirm(`Deseja gerar o PDF consolidado e enviá-lo diretamente à pasta do contrato no Google Drive?`);
                if (!confirmed) return;
                try {
                  alert("Gerando o PDF consolidado e enviando para o Google Drive. Aguarde...");
                  const jsPdfInstance = await generateWeeklyPDF(obra, activeReport);
                  const pdfBlob = jsPdfInstance.output("blob");
                  const file = new File([pdfBlob], `Relatorio_Semanal_Semana_${activeReport.periodoInicio}.pdf`, { type: "application/pdf" });
                  
                  await uploadFileToFolder(googleToken, driveFolder.id, file);
                  alert("Relatório PDF enviado com sucesso ao seu Google Drive e sincronizado na plataforma!");
                  
                  if (activeTab === "drive") {
                    const files = await listFiles(googleToken, driveFolder.id);
                    setDriveFiles(files);
                  }

                  if (onAddAuditLog) {
                    onAddAuditLog({
                      id: "log-" + Date.now(),
                      timestamp: new Date().toISOString(),
                      userName: currentUser.name,
                      userEmail: currentUser.email,
                      userRole: currentUser.role,
                      acao: "REG_DRIVE_UPLOAD",
                      descricao: `Exportou e salvou PDF do relatório semanal consolidado "Relatorio_Semanal_Semana_${activeReport.periodoInicio}.pdf" no Google Drive`,
                      obraId: obra.id,
                      obraTitulo: obra.titulo
                    });
                  }
                } catch (err: any) {
                  console.error("Erro ao salvar PDF no Drive:", err);
                  alert("Não foi possível salvar o relatório no Google Drive: " + err.message);
                }
              }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
            >
              <Cloud className="h-4 w-4" />
              Salvar PDF no Drive
            </button>
          )}
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex bg-slate-100/90 p-1 rounded-xl gap-1 max-w-max overflow-x-auto scrollbar-none shadow-inner border border-slate-200/40">
        {(["ficha", "aditivos", "relatorios", "drive", "revisoes", "logs"] as const).map((tab) => {
          const labels = {
            ficha: "Ficha Técnica Geral",
            aditivos: `Termos Aditivos & Timeline (${obra.aditivos.length})`,
            relatorios: `Lançamentos Semanais (${obra.relatoriosSemanais.length})`,
            drive: "Google Drive Nuvem",
            revisoes: `Histórico de Revisões (${filteredRevisions.length})`,
            logs: `Logs de Alterações (${filteredLogs.length})`
          };
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs font-semibold py-2 px-4 rounded-lg whitespace-nowrap transition-all ${
                isActive 
                  ? "bg-white text-slate-900 shadow-sm font-bold" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/45"
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* TAB 1: FICHA TECNICA GERAL */}
      {activeTab === "ficha" && (
        <div className="space-y-6">
          
          {/* Cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 1: Progresso Físico */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="text-2xl font-black text-slate-800">{obra.percentualFisicoAtual}%</div>
                <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-500">
                  <Timer className="h-5 w-5" />
                </div>
              </div>
              <div className="text-slate-500 text-xs mt-1">Progresso Físico Atual</div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${obra.percentualFisicoAtual}%` }}></div>
              </div>
            </div>

            {/* Card 2: Valor Contratual */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="text-lg font-black text-slate-800 leading-normal font-mono">
                  {obra.valorContratualAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
                <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-500">
                  <Coins className="h-5 w-5" />
                </div>
              </div>
              <div className="text-slate-500 text-xs mt-1">Valor Contratual Atualizado</div>
              <div className="text-[10px] text-slate-400 mt-1 font-semibold">
                Original: {obra.valorContratualInicial.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
            </div>

            {/* Card 3: Prazos */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="text-sm font-black text-slate-800 leading-normal">{obra.prazoVigenciaAtual}</div>
                <div className="p-1.5 rounded-xl bg-amber-50 text-amber-500">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
              <div className="text-slate-500 text-xs mt-1">Vigência Aditivada</div>
              <div className="text-[10px] text-slate-400 mt-1 font-semibold">
                Original: {obra.prazoVigenciaInicial}
              </div>
            </div>
          </div>

          {/* Comprehensive Detail list card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                Dados do Expediente de Engenharia
              </h3>
              {currentUser.role !== UserRole.LEITOR && (
                <button
                  onClick={() => setShowEditWorkModal(true)}
                  className="flex items-center gap-1.5 bg-slate-50 hover:bg-orange-50 text-slate-500 hover:text-orange-600 border border-slate-200 hover:border-orange-200 text-[10px] font-bold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs border-0"
                  title="Editar dados do contrato"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Editar Contrato
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Processo Administrativo:</span>
                <span className="font-bold text-slate-700">{obra.processoAdministrativoNo || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Concorrência Pública:</span>
                <span className="font-bold text-slate-700">{obra.concorrenciaPublicaNo || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Ordem de Início de Obras:</span>
                <span className="font-bold text-slate-700">{obra.dataOrdemInicio || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Data da Publicação no JOM:</span>
                <span className="font-bold text-slate-700">{obra.dataPublicacaoJOM || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Início Físico Efetivo em Campo:</span>
                <span className="font-bold text-slate-700">{obra.dataInicio || "N/A"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Prazo de Execução Atualizado:</span>
                <span className="font-bold text-slate-700">{obra.prazoExecucaoAtual || "N/A"} (Original: {obra.prazoExecucaoInicial})</span>
              </div>
            </div>
          </div>


        </div>
      )}

      {/* TAB 2: ADITIVOS & TIMELINE */}
      {activeTab === "aditivos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <WorkTimeline obra={obra} />
            
            {/* Cronologia da Obra Card Moved Here */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-500" />
                  Cronologia da Obra
                </h3>
                
                {currentUser.role !== UserRole.LEITOR && (
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCronologiaUrlInput(!showCronologiaUrlInput);
                        setShowCronologiaDriveInput(false);
                      }}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-1.5 px-3 rounded-xl cursor-pointer transition-all border border-slate-200 flex items-center gap-1.5 shadow-2xs"
                    >
                      <Link2 className="w-3.5 h-3.5 text-slate-500" />
                      Inserir por Link
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCronologiaDriveInput(!showCronologiaDriveInput);
                        setShowCronologiaUrlInput(false);
                      }}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold py-1.5 px-3 rounded-xl cursor-pointer transition-all border border-slate-200 flex items-center gap-1.5 shadow-2xs"
                    >
                      <Cloud className="w-3.5 h-3.5 text-indigo-505" />
                      Link do Drive
                    </button>
                    <label className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold py-1.5 px-3 rounded-xl cursor-pointer transition-all border border-indigo-150 flex items-center gap-1.5 shadow-2xs">
                      <PlusCircle className="w-3.5 h-3.5" />
                      Inserir Imagem
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCronologiaUpload}
                        className="hidden"
                      />
                    </label>
                    {obra.imagemCronologia && (
                      <button
                        type="button"
                        onClick={handleRemoveCronologia}
                        className="text-red-650 hover:text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-all border border-red-100"
                      >
                        Remover Imagem
                      </button>
                    )}
                  </div>
                )}
              </div>

              {currentUser.role !== UserRole.LEITOR && showCronologiaUrlInput && (
                <div className="space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl shadow-inner animate-fade-in">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Link (URL) da imagem de cronologia</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://exemplo.com/cronologia.jpg"
                      value={cronologiaUrl}
                      onChange={(e) => setCronologiaUrl(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-sans text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (cronologiaUrl.trim()) {
                          onUpdateObra({
                            ...obra,
                            imagemCronologia: cronologiaUrl.trim()
                          });
                          setShowCronologiaUrlInput(false);
                        }
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap"
                    >
                      Definir Link
                    </button>
                  </div>
                </div>
              )}

              {currentUser.role !== UserRole.LEITOR && showCronologiaDriveInput && (
                <div className="space-y-3 p-3.5 bg-indigo-50/50 border border-indigo-150 rounded-xl shadow-inner animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-indigo-700 uppercase">Link da imagem no Google Drive</label>
                    <span className="text-[10px] text-indigo-600 bg-indigo-100/60 px-1.5 py-0.5 rounded font-semibold italic">Suporta links de compartilhamento ou visualização</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://drive.google.com/file/d/.../view"
                      value={cronologiaDriveUrl}
                      onChange={(e) => setCronologiaDriveUrl(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-indigo-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-sans text-slate-700 placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (cronologiaDriveUrl.trim()) {
                          const parsed = parseDriveUrl(cronologiaDriveUrl);
                          onUpdateObra({
                            ...obra,
                            imagemCronologia: parsed
                          });
                          setShowCronologiaDriveInput(false);
                        }
                      }}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                    >
                      Definir Link do Drive
                    </button>
                  </div>

                  {driveFiles.filter(f => f.mimeType && f.mimeType.startsWith("image/")).length > 0 && (
                    <div className="pt-2 border-t border-indigo-100/60">
                      <span className="block text-[9px] font-bold text-indigo-600 uppercase mb-2">Imagens disponíveis na pasta do Drive desta obra:</span>
                      <div className="flex flex-wrap gap-2">
                        {driveFiles
                          .filter(f => f.mimeType && f.mimeType.startsWith("image/"))
                          .map((file) => (
                            <button
                              key={file.id}
                              type="button"
                              onClick={() => {
                                const directUrl = `https://docs.google.com/uc?export=download&id=${file.id}`;
                                onUpdateObra({
                                  ...obra,
                                  imagemCronologia: directUrl
                                });
                                setShowCronologiaDriveInput(false);
                              }}
                              className="text-[10px] bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200/80 hover:border-indigo-300 rounded px-2 py-1 transition-all flex items-center gap-1 cursor-pointer max-w-xs truncate"
                              title={file.name}
                            >
                              <span className="truncate max-w-[150px]">{file.name}</span>
                              <span className="text-[8px] text-slate-400 shrink-0">({file.size || "S/T"})</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {obra.imagemCronologia ? (
                <div className="space-y-3">
                  <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                    Imagem da cronologia inserida manualmente na Ficha Técnica Geral. Esta imagem substituirá os marcos padrão gerados nos PDFs e permanecerá até que seja atualizada.
                  </p>
                  <div className="border border-slate-150 rounded-xl p-2 bg-slate-50/50 flex justify-center">
                    <img 
                      src={obra.imagemCronologia} 
                      alt="Cronologia da Obra" 
                      className="max-h-96 object-contain rounded-lg shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 font-semibold text-xs border border-dashed border-slate-205 rounded-xl bg-slate-50/30">
                  Nenhuma imagem personalizada de cronologia foi inserida. Os PDFs utilizarão o histórico de marcos padrão calculado automaticamente.
                </div>
              )}
            </div>
          </div>
          
          {/* Aditivos controls and lists */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm">Aditivos de Termo Contratual</h3>
                
                {/* RBAC check button */}
                {canManageAditivos ? (
                  <button
                    onClick={() => setShowAditivoModal(true)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-xl transition-all"
                  >
                    + Novo Aditivo
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded">
                    Perfil Restrito
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {obra.aditivos.map((ad, idx) => (
                  <div key={ad.id} className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center font-bold text-slate-800">
                      <span>{ad.numero}º Aditivo</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-indigo-600">{ad.tipo.toUpperCase()}</span>
                        {canManageAditivos && (
                          <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
                            <button
                              onClick={() => {
                                setAditivoToEdit(ad);
                                setShowAditivoModal(true);
                              }}
                              title="Editar aditivo"
                              className="p-1 rounded bg-white hover:bg-slate-200 text-indigo-650 transition-all cursor-pointer h-5 w-5 flex items-center justify-center shrink-0 border border-slate-200"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Deseja realmente excluir o ${ad.numero}º termo aditivo? Esta ação irá recalcular todos os prazos e totais vigentes.`)) {
                                  onDeleteAditivo?.(ad.id);
                                }
                              }}
                              title="Excluir aditivo"
                              className="p-1 rounded bg-white hover:bg-red-50 text-red-650 transition-all cursor-pointer h-5 w-5 flex items-center justify-center shrink-0 border border-slate-200"
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-slate-500 text-[10px]">
                      Assinatura: {ad.dataAssinatura} | JOM: {ad.dataPublicacaoJOM || "N/A"}
                    </div>
                    {ad.prazoAditivadoMeses && (
                      <div className="text-slate-650 font-semibold mt-1">
                        Prazo estendido em {ad.prazoAditivadoMeses} meses
                      </div>
                    )}
                    {ad.valorAditivado !== 0 && (
                      <div className="text-slate-650 font-semibold mt-1">
                        Impacto financeiro: {formatCurrency(ad.valorAditivado)}
                      </div>
                    )}
                    {ad.descricao && (
                      <p className="text-[10px] text-slate-400 mt-1.5 border-t border-slate-100 pt-1.5 italic">
                        "{ad.descricao}"
                      </p>
                    )}
                  </div>
                ))}
                {obra.aditivos.length === 0 && (
                  <div className="text-center p-6 text-slate-450 italic text-xs">
                    Nenhum aditivo contratual registrado para esta obra executiva.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RELATORIOS SEMANAIS (ACOMPANHAMENTO) */}
      {activeTab === "relatorios" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Week Selector sidebar */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm">Relatórios Semanais</h3>
                
                {/* RBAC check */}
                {canManageReports ? (
                  <button
                    onClick={() => {
                      setReportToEdit(undefined);
                      setShowReportModal(true);
                    }}
                    className="text-xs font-bold text-slate-900 border border-slate-900 hover:bg-slate-50 px-3 py-1 rounded-xl transition-all"
                  >
                    + Novo Relatório
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded">
                    Perfil Restrito
                  </span>
                )}
              </div>

              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {obra.relatoriosSemanais.slice().reverse().map((rep) => {
                  const isActive = activeReport?.id === rep.id;
                  return (
                    <div
                      key={rep.id}
                      onClick={() => setSelectedReportId(rep.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isActive 
                          ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs">Acompanhamento Semanal</span>
                        <span className={`text-[10px] font-bold ${isActive ? "text-indigo-300" : "text-indigo-600"}`}>
                          {rep.percentualFisico}%
                        </span>
                      </div>
                      <div className="text-[10px] font-mono mt-1 opacity-80">
                        {rep.periodoInicio.split("-").reverse().join("/")} a {rep.periodoFim.split("-").reverse().join("/")}
                      </div>
                    </div>
                  );
                })}
                {obra.relatoriosSemanais.length === 0 && (
                  <div className="text-center p-6 text-slate-450 italic text-xs">
                    Nenhum diário ou relatório semanal publicado ainda.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Selected report information sheet */}
          <div className="lg:col-span-2 space-y-6">
            {activeReport ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                
                {/* Header detail report */}
                <div className="flex justify-between items-start pb-4 border-b border-slate-150">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">
                      Relatório Semanal de Campo
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Período de Medição: {activeReport.periodoInicio.split("-").reverse().join("/")} a {activeReport.periodoFim.split("-").reverse().join("/")}
                    </p>
                  </div>
                  
                  <div className="flex gap-1.5">
                    {canManageReports && (
                      <button
                        onClick={() => {
                          setReportToEdit(activeReport);
                          setShowReportModal(true);
                        }}
                        className="p-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1"
                      >
                        <Edit3 className="h-3 w-3" />
                        Editar Report
                      </button>
                    )}
                    <button
                      onClick={handleExportPDF}
                      className="p-1 px-3 bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="h-3 w-3" />
                      Exportar PDF da Semana
                    </button>

                    {activeReport && googleToken && driveFolder && (
                      <button
                        onClick={async () => {
                          const confirmed = window.confirm(`Deseja exportar e salvar este relatório semanal consolidado PDF diretamente na sua pasta do Google Drive?`);
                          if (!confirmed) return;
                          try {
                            alert("Gerando o PDF consolidado e efetuando upload para o Google Drive...");
                            const jsPdfInstance = await generateWeeklyPDF(obra, activeReport);
                            const pdfBlob = jsPdfInstance.output("blob");
                            const file = new File([pdfBlob], `Relatorio_Semanal_Semana_${activeReport.periodoInicio}.pdf`, { type: "application/pdf" });
                            
                            await uploadFileToFolder(googleToken, driveFolder.id, file);
                            alert("Relatório PDF enviado e arquivado no Google Drive com sucesso!");
                            
                            if (activeTab === "drive") {
                              const files = await listFiles(googleToken, driveFolder.id);
                              setDriveFiles(files);
                            }

                            if (onAddAuditLog) {
                              onAddAuditLog({
                                id: "log-" + Date.now(),
                                timestamp: new Date().toISOString(),
                                userName: currentUser.name,
                                userEmail: currentUser.email,
                                userRole: currentUser.role,
                                acao: "REG_DRIVE_UPLOAD",
                                descricao: `Exportou e salvou PDF do relatório semanal consolidado "Relatorio_Semanal_Semana_${activeReport.periodoInicio}.pdf" no Google Drive`,
                                obraId: obra.id,
                                obraTitulo: obra.titulo
                              });
                            }
                          } catch (err: any) {
                            console.error("Erro ao salvar PDF no Drive:", err);
                            alert("Não foi possível salvar o relatório no Google Drive: " + err.message);
                          }
                        }}
                        className="p-1 px-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Cloud className="h-3.5 w-3.5 text-indigo-650" />
                        Salvar PDF no Drive
                      </button>
                    )}
                  </div>
                </div>

                {/* Cover Photo - Foto de Capa do Relatório */}
                {activeReport.fotoCapa && (
                  <div className="space-y-1.5">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Foto de Capa do Relatório
                    </span>
                    <div className="rounded-xl overflow-hidden border border-slate-200/60 shadow-sm bg-slate-50">
                      <img
                        src={activeReport.fotoCapa}
                        alt="Foto de Capa do Relatório"
                        referrerPolicy="no-referrer"
                        className="w-full max-h-64 object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Sub status row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200/50 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold">Avanço Físico Real:</span>
                    <span className="font-bold text-slate-755 text-sm">{activeReport.percentualFisico}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Situação do Aditivo:</span>
                    <span className="font-semibold text-slate-755">{activeReport.situacaoAditivo || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Rede ENEL (Média T.:)</span>
                    <span className="font-semibold text-slate-755 truncate block max-w-[140px]" title={activeReport.statusAumentoCargaEnel}>
                      {activeReport.statusAumentoCargaEnel || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Subestação Elétrica:</span>
                    <span className="font-semibold text-slate-755">{activeReport.statusSubestacao || "N/A"}</span>
                  </div>
                </div>

                {/* Bullet Activities */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 text-indigo-700">
                      • Atividades Desenvolvidas na Semana:
                    </h4>
                    <ul className="space-y-2.5 text-xs text-slate-650 pl-2">
                      {activeReport.atividadesSemana.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 text-emerald-700">
                      • Atividades Programadas para Próxima Semana:
                    </h4>
                    <ul className="space-y-2.5 text-xs text-slate-650 pl-2">
                      {activeReport.atividadesProximaSemana.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <ArrowUpRight className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {activeReport.observacoesApontamentos && activeReport.observacoesApontamentos.length > 0 && (
                    <div className="pt-2">
                      <h4 className="font-bold text-rose-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-rose-500" />
                        Observações, Não Conformidades & Alertas de Fiscalização:
                      </h4>
                      <ul className="space-y-2.5 text-xs text-slate-650 pl-2">
                        {activeReport.observacoesApontamentos.map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-2 bg-rose-50/50 p-2 rounded-lg border border-rose-105">
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Photos Register */}
                {activeReport.fotos && activeReport.fotos.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Galeria de Fotos da Semana
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activeReport.fotos.map((foto) => (
                        <div key={foto.id} className="border border-slate-150 rounded-xl overflow-hidden shadow-sm bg-slate-50">
                          <img
                            src={foto.url}
                            alt="Semana campo"
                            referrerPolicy="no-referrer"
                            className="w-full h-44 object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="bg-white p-12 text-center border border-dashed border-slate-205 rounded-2xl text-slate-450 italic text-xs">
                Nenhum relatório semanal registrado ainda. Use o painel lateral para publicar acompanhamentos.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: GOOGLE DRIVE CLOUD SYNC */}
      {activeTab === "drive" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Cloud className="h-5 w-5 text-indigo-550" />
                Sincronização de Arquivos em Nuvem
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Repositório de documentos de engenharia seguro, automatizado e hospedado no seu Google Drive
              </p>
            </div>
            
            {googleToken && (
              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  onClick={() => loadDriveData(googleToken)}
                  disabled={isCheckingDrive}
                  title="Atualizar lista de arquivos"
                  className="p-2 text-slate-600 hover:text-indigo-650 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center shrink-0"
                >
                  <RefreshCw className={`h-4 w-4 ${isCheckingDrive ? "animate-spin" : ""}`} />
                </button>
                {driveFolder && (
                  <a
                    href={driveFolder.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-indigo-50 text-indigo-700 hover:text-indigo-850 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200/60 transition-all shadow-sm"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Abrir no Drive ↗
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Drive auth checking and feedback */}
          {driveError && (
            <div className="p-3 bg-red-50 border border-red-200/60 text-red-705 text-xs rounded-xl flex items-start gap-2 animate-fade-in">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{driveError}</span>
            </div>
          )}

          {!googleToken ? (
            <div className="border border-dashed border-slate-200 bg-slate-50/50 p-8 rounded-2xl text-center space-y-4 max-w-lg mx-auto">
              <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Cloud className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">Vincular Conta do Google Workspace</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Para sincronizar arquivos corporativos e compartilhar relatórios diretamente na nuvem com permissão explícita, conecte sua conta do Google.
                </p>
              </div>
              <button
                onClick={handleDriveSignIn}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all rounded-xl shadow-sm cursor-pointer mx-auto font-semibold text-xs text-slate-700"
              >
                <img
                  src="https://developers.google.com/static/identity/images/g-logo.png"
                  alt="Google logo"
                  className="h-4.5 w-4.5"
                />
                Conectar com Google Drive
              </button>
            </div>
          ) : isCheckingDrive ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-3 bg-slate-50 border border-slate-100 rounded-2xl">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
              <p className="text-slate-500 text-xs font-semibold">Procurando repositório de arquivos do contrato no Google Drive...</p>
            </div>
          ) : !driveFolder ? (
            <div className="border border-dashed border-indigo-150 bg-indigo-50/15 p-8 rounded-2xl text-center space-y-4 max-w-lg mx-auto">
              <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500">
                <FolderOpen className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">Criar Pasta do Contrato</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Não localizamos uma pasta dedicada para esta obra. Inicialize uma pasta segura estruturada como 
                  <strong className="text-slate-600"> CODEMAR - TC {(obra.contratoNo || "").trim() || obra.id}</strong> para uploads e revisões técnicas.
                </p>
              </div>
              <button
                onClick={handleCreateFolder}
                disabled={isCreatingFolder}
                className="inline-flex bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isCreatingFolder ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Criando Pasta...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    Criar Pasta no Drive
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left col: Upload files Area */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-1">
                    Upload de Documentos
                  </h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Envie projetos executivos, PDFs, termos, cronogramas ou imagens consolidadas. Máximo 25MB por arquivo.
                  </p>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const file = e.dataTransfer.files[0];
                      if (file) handleUploadFile(file);
                    }}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                      isDragOver
                        ? "border-indigo-500 bg-indigo-50/50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) handleUploadFile(file);
                      };
                      input.click();
                    }}
                  >
                    {isUploadingDrive ? (
                      <div className="space-y-2">
                        <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mx-auto" />
                        <span className="text-[11px] font-bold text-indigo-600 animate-pulse block">Processando Upload...</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <UploadCloud className="h-8 w-8 text-slate-400 mx-auto" />
                        <span className="text-[11px] font-semibold text-slate-600 block">
                          Solte o arquivo ou toque para selecionar
                        </span>
                        <span className="text-[9px] text-slate-400 block font-mono">
                          Formatos suportados: PDF, XLS, JPG, PNG
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-2.5">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">Metadados da Pasta</span>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-mono">Nome:</span>
                      <span className="font-bold text-slate-700 truncate max-w-[170px]" title={driveFolder.name}>{driveFolder.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-mono">ID:</span>
                      <span className="font-mono text-[10px] text-slate-700">{driveFolder.id.substring(0, 10)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-mono">Status Sync:</span>
                      <span className="font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Conectado S/A
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right col: Files in folders list */}
              <div className="lg:col-span-8 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Termos & Arquivos ({driveFiles.length})
                  </span>
                </div>

                <div className="space-y-2 max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
                  {driveFiles.map((file) => {
                    const isImg = file.mimeType.startsWith("image/");
                    const isPdf = file.mimeType === "application/pdf";
                    const isSheet = file.mimeType.includes("spreadsheet") || file.mimeType.includes("excel") || file.mimeType.includes("sheet");
                    
                    return (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/55 border border-slate-200/60 rounded-xl transition-all gap-4 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            isPdf ? "bg-red-50 text-red-600" :
                            isSheet ? "bg-emerald-50 text-emerald-600" :
                            isImg ? "bg-sky-50 text-sky-600" : "bg-indigo-50 text-indigo-600"
                          }`}>
                            <FileText className="h-4 w-4" />
                          </div>
                          
                          <div className="min-w-0">
                            <h5 className="font-bold text-slate-700 truncate max-w-[340px] block" title={file.name}>
                              {file.name}
                            </h5>
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                              Enviado: {new Date(file.createdTime).toLocaleDateString("pt-BR")} | Size: {
                                file.size ? `${(parseInt(file.size) / (1024 * 1024)).toFixed(2)} MB` : "N/A"
                              }
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Visualizar no Drive"
                            className="p-1 px-2.5 rounded-lg bg-white hover:bg-slate-200 text-indigo-650 transition-all cursor-pointer h-7 flex items-center justify-center font-bold text-[10px] border border-slate-200 gap-1"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Visualizar
                          </a>

                          <button
                            onClick={() => handleDeleteDriveFile(file.id, file.name)}
                            disabled={deletingDriveFileId === file.id}
                            title="Excluir arquivo do Drive"
                            className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-red-550 transition-all cursor-pointer h-7 w-7 flex items-center justify-center border border-slate-200"
                          >
                            {deletingDriveFileId === file.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {driveFiles.length === 0 && (
                    <div className="text-center p-16 text-slate-400 italic text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      Nenhum arquivo ou documento anexado a esta pasta no Google Drive. Use a área de upload ao lado para centralizar projetos de engenharia.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: HISTORICO DE REVISOES */}
      {activeTab === "revisoes" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Revisões Estruturais & Rollbacks</h3>
            <p className="text-slate-500 text-xs mt-0.5">Histórico integral de alterações e restauração de snapshots estritamente controlado</p>
          </div>

          <div className="space-y-3">
            {filteredRevisions.map((rev) => (
              <div 
                key={rev.id} 
                className="flex items-start justify-between p-4 bg-slate-50 border border-slate-150 rounded-xl text-xs gap-4 relative overflow-hidden"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded leading-normal">
                      {new Date(rev.timestamp).toLocaleString("pt-BR")}
                    </span>
                    <span className="font-bold text-slate-700">{rev.userName} ({rev.userRole})</span>
                  </div>
                  
                  <div className="font-semibold text-slate-800">
                    Modificações: <span className="font-bold text-indigo-700">{rev.campoAlterado}</span>
                  </div>

                  <p className="text-slate-600">{rev.descricao}</p>
                  <div className="text-[10px] text-slate-400">Email: {rev.userEmail}</div>
                </div>

                {/* Restore option - Only Admin or chief engineer can perform rollbacks */}
                {currentUser.role === UserRole.ADMINISTRADOR || currentUser.role === UserRole.ENGENHEIRO_CHEFE ? (
                  <button
                    onClick={() => {
                      if (confirm("Confirmar restauração deste Snapshot? O estado atual do contrato será substituído pelo estado desta revisão.")) {
                        onRestoreRevision(rev);
                      }
                    }}
                    className="shrink-0 bg-white hover:bg-slate-100 text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-200 transition-all font-semibold flex items-center gap-1.5 shadow-sm text-slate-700"
                  >
                    <History className="h-3.5 w-3.5 text-slate-500" />
                    Restaurar
                  </button>
                ) : (
                  <span className="text-[9px] font-bold text-slate-350 shrink-0 select-none uppercase tracking-wider">
                    Restrito
                  </span>
                )}
              </div>
            ))}
            
            {filteredRevisions.length === 0 && (
              <div className="text-center p-12 text-slate-400 italic text-xs">
                Nenhuma alteração registrada ainda para gerar histórico de rolagem de revisões.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOG VIEW */}
      {activeTab === "logs" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Registro de Auditoria</h3>
            <p className="text-slate-500 text-xs mt-0.5">Logs perpétuos e intacháveis de mutações gerados pelo sistema para esta obra</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black">
                  <th className="py-2.5 px-2">Timestamp</th>
                  <th className="py-2.5 px-2">Profissional</th>
                  <th className="py-2.5 px-2">Perfil</th>
                  <th className="py-2.5 px-2">Ação</th>
                  <th className="py-2.5 px-2">Eventos de Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-2 font-mono text-slate-400">
                      {new Date(log.timestamp).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 px-2 text-slate-800 font-bold">{log.userName}</td>
                    <td className="py-3 px-2 font-mono text-[10px] text-slate-500">{log.userRole}</td>
                    <td className="py-3 px-2">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                        {log.acao}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-slate-600 text-xs">{log.descricao}</td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center p-12 text-slate-400 italic">
                      Nenhum log persistido para esta obra executiva.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showAditivoModal && (
        <AditivoForm
          obra={obra}
          aditivoToEdit={aditivoToEdit}
          onClose={() => {
            setShowAditivoModal(false);
            setAditivoToEdit(undefined);
          }}
          onSave={(ad) => {
            if (aditivoToEdit) {
              onEditAditivo?.(ad);
            } else {
              onAddAditivo(ad);
            }
            setShowAditivoModal(false);
            setAditivoToEdit(undefined);
          }}
        />
      )}

      {showReportModal && (
        <WeeklyReportForm
          reportToEdit={reportToEdit}
          onClose={() => {
            setShowReportModal(false);
            setReportToEdit(undefined);
          }}
          onSave={(rep) => {
            if (reportToEdit) {
              onEditWeeklyReport(rep);
            } else {
              onAddWeeklyReport(rep);
            }
            setShowReportModal(false);
            setReportToEdit(undefined);
            setSelectedReportId(rep.id);
          }}
        />
      )}

      {showEditWorkModal && (
        <WorkForm
          obraToEdit={obra}
          onClose={() => setShowEditWorkModal(false)}
          onSave={(updatedObra) => {
            onUpdateObra(updatedObra);
            setShowEditWorkModal(false);
          }}
        />
      )}



    </div>
  );
}
