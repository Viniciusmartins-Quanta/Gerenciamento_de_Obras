import React from "react";
import { Obra, Aditivo } from "../types";
import { Calendar, TrendingUp, Clock, CheckCircle } from "lucide-react";

interface WorkTimelineProps {
  obra: Obra;
}

export default function WorkTimeline({ obra }: WorkTimelineProps) {
  // Combine contract start and subsequent aditivos
  const points = [
    {
      tipo: "CONTRATO",
      data: obra.dataAssinatura,
      dataInicio: obra.dataAssinatura,
      dataFinal: obra.prazoVigenciaInicial,
      isDuration: true,
      titulo: "Assinatura do Contrato de Início",
      descricao: `Início do cronograma original com execução em ${obra.prazoExecucaoInicial} e vigência em ${obra.prazoVigenciaInicial}`,
      valor: obra.valorContratualInicial,
      bg: "bg-slate-900 border-slate-900 text-white",
      badge: "Início"
    },
    ...obra.aditivos.map((ad, idx) => ({
      tipo: "ADITIVO",
      data: ad.dataAssinatura,
      dataInicio: ad.dataAssinatura,
      dataFinal: ad.novoPrazoContratual,
      isDuration: false,
      titulo: `${ad.numero}º Aditivo`,
      descricao: ad.descricao || `Aditivo focado em ${ad.tipo === "prazo" ? "prazo de prazo" : "ajustes financeiros"}`,
      valor: ad.valorAditivado,
      bg: ad.tipo === "financeiro" 
        ? "bg-emerald-500 border-emerald-500 text-white" 
        : ad.tipo === "prazo"
        ? "bg-amber-500 border-amber-500 text-white"
        : "bg-blue-500 border-blue-500 text-white",
      badge: ad.tipo.toUpperCase()
    }))
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="timeline-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-base">Linha do Tempo de Termos Aditivos</h3>
          <p className="text-slate-500 text-xs mt-0.5">Marcos temporais escalonados desde a assinatura de início</p>
        </div>
        <div className="flex gap-2 text-[10px] font-bold font-sans">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span> Início</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Aditivo Prazo</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Aditivo Financ.</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Ambos</span>
        </div>
      </div>

      <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-100 space-y-8 py-2 ml-4">
        {points.map((pt, index) => {
          const isInitial = pt.tipo === "CONTRATO";
          return (
            <div key={index} className="relative group">
              {/* Central Marker Circle */}
              <span className={`absolute -left-[35px] sm:-left-[43px] top-1.5 flex h-7 w-7 items-center justify-center rounded-full border-4 border-white ${pt.bg} transition-all shadow-md group-hover:scale-110`}>
                {isInitial ? (
                  <Calendar className="h-3 w-3" />
                ) : pt.badge === "FINANCEIRO" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
              </span>

              {/* Box container */}
              <div className="bg-slate-50/50 hover:bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-all shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Março / Data de Assinatura: {pt.data}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {pt.badge}
                  </span>
                </div>

                <h4 className="font-bold text-slate-800 text-sm group-hover:text-slate-900 transition-colors">
                  {pt.titulo}
                </h4>

                <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                  {pt.descricao}
                </p>

                {/* Date interval representation requested by the user */}
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1.5 bg-white border border-slate-200/50 p-2.5 rounded-xl shadow-sm text-xs text-slate-650">
                  <div className="flex items-center gap-1.5 min-w-[130px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="font-semibold text-slate-500 text-[11px]">Início (Assinatura):</span>
                    <span className="font-bold text-slate-800 font-mono text-[11px]">{pt.dataInicio}</span>
                  </div>
                  <span className="hidden sm:inline text-slate-350">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span className="font-semibold text-slate-500 text-[11px]">
                      {pt.isDuration ? "Vigência Original:" : "Prazo Final Aditivado:"}
                    </span>
                    <span className="font-bold text-blue-900 font-mono text-[11px]" id={`pt-final-${index}`}>{pt.dataFinal}</span>
                  </div>
                </div>

                {pt.valor !== 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Modificação Contratual:</span>
                    <span className={`font-semibold text-xs ${pt.valor > 0 ? "text-emerald-600" : "text-slate-600"}`}>
                      {pt.valor > 0 ? "+" : ""}
                      {pt.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
