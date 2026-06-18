import { Obra } from "../types";

// Adds BOM for UTF-8 so Excel correctly renders accents like ã, ó, í in Portuguese
const UTF8_BOM = "\uFEFF";

export function exportObrasToExcel(obras: Obra[]) {
  const headers = [
    "Contrato",
    "Título da Obra",
    "Empresa Vencedora",
    "Concorrência",
    "Processo ADM",
    "Data Assinatura",
    "Data Início",
    "Prazo Vigência Inicial",
    "Prazo Execução Inicial",
    "Valor Inicial (R$)",
    "Valor Atual (R$)",
    "Prazo Vigência Atual",
    "Prazo Execução Atual",
    "Progresso Físico (%)",
    "Qtd Aditivos",
    "Status Geral"
  ];

  const rows = obras.map(o => [
    `"${o.contratoNo}"`,
    `"${o.titulo.replace(/"/g, '""')}"`,
    `"${o.empresaVencedora}"`,
    `"${o.concorrenciaPublicaNo}"`,
    `"${o.processoAdministrativoNo}"`,
    `"${o.dataAssinatura}"`,
    `"${o.dataInicio}"`,
    `"${o.prazoVigenciaInicial}"`,
    `"${o.prazoExecucaoInicial}"`,
    o.valorContratualInicial.toFixed(2),
    o.valorContratualAtual.toFixed(2),
    `"${o.prazoVigenciaAtual}"`,
    `"${o.prazoExecucaoAtual}"`,
    o.percentualFisicoAtual,
    o.aditivos.length,
    `"${o.statusGeral}"`
  ]);

  const csvContent = 
    UTF8_BOM +
    [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Painel_Obras_Geral_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportSingleObraToExcel(obra: Obra) {
  const metaHeaders = ["Campo", "Valor"];
  const metaRows = [
    ["Título", obra.titulo],
    ["Contrato", obra.contratoNo],
    ["Concorrência", obra.concorrenciaPublicaNo],
    ["Processo Administrativo", obra.processoAdministrativoNo],
    ["Empresa Vencedora", obra.empresaVencedora],
    ["Data Assinatura", obra.dataAssinatura],
    ["Data Início", obra.dataInicio],
    ["Valor Inicial Contractual", `R$ ${obra.valorContratualInicial.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
    ["Valor Atualizado", `R$ ${obra.valorContratualAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
    ["Progresso Físico Atual", `${obra.percentualFisicoAtual}%`],
    ["Status Geral", obra.statusGeral]
  ];

  const aditivosHeaders = ["Nº Aditivo", "Tipo", "Assinatura", "JOM", "Prazo Aditivado (Meses)", "Valor Aditivado (R$)", "Prazo Contratual Resultante"];
  const aditivosRows = obra.aditivos.map(a => [
    `${a.numero}º`,
    a.tipo.toUpperCase(),
    a.dataAssinatura,
    a.dataPublicacaoJOM,
    a.prazoAditivadoMeses || 0,
    a.valorAditivado.toFixed(2),
    a.novoPrazoContratual
  ]);

  const reportHeaders = ["Período", "Físico (%)", "Situação Aditivo", "Enel", "Atividades Realizadas", "Observações"];
  const reportRows = obra.relatoriosSemanais.map(r => [
    `"${r.periodoInicio} a ${r.periodoFim}"`,
    r.percentualFisico,
    `"${r.situacaoAditivo}"`,
    `"${r.statusAumentoCargaEnel.replace(/"/g, '""')}"`,
    `"${r.atividadesSemana.join(' | ').replace(/"/g, '""')}"`,
    `"${r.observacoesApontamentos.join(' | ').replace(/"/g, '""')}"`
  ]);

  const csvParts = [
    metaHeaders.join(";"),
    ...metaRows.map(r => r.map(v => `"${v}"`).join(";")),
    "",
    "HISTÓRICO DE ADITIVOS DE PRAZO / FINANCEIROS",
    aditivosHeaders.join(";"),
    ...aditivosRows.map(r => r.join(";")),
    "",
    "HISTÓRICO DE RELATÓRIOS SEMANAIS (ACOMPANHAMENTO)",
    reportHeaders.join(";"),
    ...reportRows.map(r => r.join(";"))
  ];

  const csvContent = UTF8_BOM + csvParts.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Relatorio_Detalhado_Obra_${obra.contratoNo.replace('/', '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
