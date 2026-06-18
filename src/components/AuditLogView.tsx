import React, { useState } from "react";
import { AuditLog } from "../types";
import { Eye, Search, Filter, ShieldCheck, Download } from "lucide-react";

interface AuditLogViewProps {
  logs: AuditLog[];
}

export default function AuditLogView({ logs }: AuditLogViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("TODOS");

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.obraTitulo && log.obraTitulo.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = selectedRole === "TODOS" || log.userRole === selectedRole;
    return matchesSearch && matchesRole;
  });

  const exportLogsToCSV = () => {
    const BOM = "\uFEFF";
    const headers = ["Timestamp", "Usuário", "Email", "Perfil", "Ação", "Log Descritivo", "ID Obra"];
    const rows = filteredLogs.map(l => [
      `"${new Date(l.timestamp).toLocaleString("pt-BR")}"`,
      `"${l.userName}"`,
      `"${l.userEmail}"`,
      `"${l.userRole}"`,
      `"${l.acao}"`,
      `"${l.descricao.replace(/"/g, '""')}"`,
      `"${l.obraId || ""}"`
    ]);

    const csvContent = BOM + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Global_Logs_Auditoria_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="global-audit-log">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            Painel Global de Auditoria de Engenharia
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">Mutações de relatórios e aditivos registrados perpetuamente com autorias certificadas</p>
        </div>
        <button
          onClick={exportLogsToCSV}
          className="self-end sm:self-center bg-slate-50 border border-slate-205 text-slate-700 hover:bg-slate-100 text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all"
        >
          <Download className="h-4 w-4 text-slate-500" />
          Exportar Logs (CSV)
        </button>
      </div>

      {/* Filter inputs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-2.5 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            maxLength={1000}
            placeholder="Pesquisar por engenheiro, obra ou palavra-chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 font-semibold"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none font-semibold text-slate-700"
          >
            <option value="TODOS">Todos os Perfis</option>
            <option value="Administrador">Administrador</option>
            <option value="Engenheiro Chefe">Engenheiro Chefe</option>
            <option value="Engenheiro Fiscal">Engenheiro Fiscal</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-xs text-left text-slate-650 border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 uppercase text-[9px] font-black">
              <th className="py-2.5 px-2">Data/Hora</th>
              <th className="py-2.5 px-2">Profissional Responsável</th>
              <th className="py-2.5 px-2">Função / Perfil (RBAC)</th>
              <th className="py-2.5 px-2">Código Ação</th>
              <th className="py-2.5 px-2">Histórico Resumido do Evento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredLogs.slice().reverse().map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/50">
                <td className="py-3 px-2 font-mono text-slate-400">
                  {new Date(log.timestamp).toLocaleString("pt-BR")}
                </td>
                <td className="py-3 px-2">
                  <div className="font-bold text-slate-800">{log.userName}</div>
                  <div className="text-[10px] text-slate-400">{log.userEmail}</div>
                </td>
                <td className="py-3 px-2">
                  <span className="bg-slate-100/80 text-slate-600 px-2 py-0.5 rounded font-mono text-[9px] font-bold">
                    {log.userRole}
                  </span>
                </td>
                <td className="py-3 px-2 font-mono text-[10px] text-indigo-600 font-bold">{log.acao}</td>
                <td className="py-3 px-2">
                  <p className="text-slate-800 font-semibold">{log.descricao}</p>
                  {log.obraTitulo && (
                    <div className="text-[10px] text-slate-400 mt-0.5 font-bold">Obra: {log.obraTitulo}</div>
                  )}
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400 italic">
                  Nenhum registro de auditoria corresponde aos filtros ativos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
