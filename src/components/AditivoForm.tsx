import React, { useState } from "react";
import { Aditivo, Obra } from "../types";
import { Calendar, Coins, Plus, X, Edit3 } from "lucide-react";

interface AditivoFormProps {
  obra: Obra;
  onClose: () => void;
  onSave: (aditivo: Aditivo) => void;
  aditivoToEdit?: Aditivo;
}

export default function AditivoForm({ obra, onClose, onSave, aditivoToEdit }: AditivoFormProps) {
  const nextNumber = aditivoToEdit ? aditivoToEdit.numero : obra.aditivos.length + 1;
  const [tipo, setTipo] = useState<"prazo" | "financeiro" | "ambos">(aditivoToEdit ? aditivoToEdit.tipo : "prazo");
  const [dataAssinatura, setDataAssinatura] = useState(aditivoToEdit ? aditivoToEdit.dataAssinatura : "");
  const [dataPublicacaoJOM, setDataPublicacaoJOM] = useState(aditivoToEdit ? aditivoToEdit.dataPublicacaoJOM : "");
  const [prazoAditivadoMeses, setPrazoAditivadoMeses] = useState<number>(aditivoToEdit ? aditivoToEdit.prazoAditivadoMeses || 0 : 0);
  const [valorAditivado, setValorAditivado] = useState<number>(aditivoToEdit ? aditivoToEdit.valorAditivado || 0 : 0);
  const [novoPrazoContratual, setNovoPrazoContratual] = useState(aditivoToEdit ? aditivoToEdit.novoPrazoContratual : "");
  const [descricao, setDescricao] = useState(aditivoToEdit ? aditivoToEdit.descricao || "" : "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataAssinatura) {
      alert("Preencha a data de assinatura.");
      return;
    }

    let baselineValor = obra.valorContratualInicial;
    obra.aditivos.forEach(ad => {
      if (ad.numero < nextNumber) {
        if (ad.tipo === "financeiro" || ad.tipo === "ambos") {
          baselineValor += ad.valorAditivado;
        }
      }
    });

    const calculatedNewValor = tipo === "prazo"
      ? baselineValor
      : baselineValor + valorAditivado;

    const newAditivo: Aditivo = {
      id: aditivoToEdit ? aditivoToEdit.id : "ad-" + Date.now(),
      numero: nextNumber,
      tipo,
      dataAssinatura,
      dataPublicacaoJOM,
      prazoAditivadoMeses: tipo !== "financeiro" ? prazoAditivadoMeses : undefined,
      valorAditivado: tipo !== "prazo" ? valorAditivado : 0,
      novoPrazoContratual,
      novoPrazoExecucao: tipo !== "financeiro" ? novoPrazoContratual : undefined,
      novoValorContratual: `R$ ${calculatedNewValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      descricao: descricao || `Termo aditivo contratual nº ${nextNumber}.`
    };

    onSave(newAditivo);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200" id="aditivo-form">
        
        {/* Header */}
        <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              {aditivoToEdit ? (
                <Edit3 className="h-5 w-5 text-indigo-500" />
              ) : (
                <Plus className="h-5 w-5 text-indigo-500" />
              )}
              {aditivoToEdit ? `Editar ${nextNumber}º Aditivo Contratual` : `Lançar ${nextNumber}º Aditivo Contratual`}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {aditivoToEdit ? "Alterar dados de readequação física ou financeira do contrato" : "Registrar readequação física ou financeira do contrato"}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition-all font-bold"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo de Aditivo</label>
            <div className="grid grid-cols-3 gap-2">
              {(["prazo", "financeiro", "ambos"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`text-xs font-bold py-2 rounded-xl border text-center transition-all ${
                    tipo === t 
                      ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t === "prazo" ? "Aditivo de Prazo" : t === "financeiro" ? "Financeiro" : "Misto (Ambos)"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Assinatura do Aditivo</label>
              <input
                type="text"
                required
                maxLength={1000}
                placeholder="Ex: 20/02/2026"
                value={dataAssinatura}
                onChange={(e) => setDataAssinatura(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Publicação JOM</label>
              <input
                type="text"
                maxLength={1000}
                placeholder="Ex: 21/05/2026"
                value={dataPublicacaoJOM}
                onChange={(e) => setDataPublicacaoJOM(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-mono"
              />
            </div>
          </div>

          {tipo !== "financeiro" && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Prazo Adicionado (Meses)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="Ex: 6"
                  value={prazoAditivadoMeses || ""}
                  onChange={(e) => setPrazoAditivadoMeses(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-semibold"
                />
                <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Meses</span>
              </div>
            </div>
          )}

          {tipo !== "prazo" && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Valor Adicionado Financeiro (Supressão / Acréscimo)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
                <input
                  type="number"
                  required
                  placeholder="Ex: 9912977.77"
                  value={valorAditivado || ""}
                  onChange={(e) => setValorAditivado(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-semibold"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Novo Prazo Resultante Contratual</label>
            <input
              type="text"
              required
              maxLength={1000}
              placeholder="Ex: 21/08/2026 ou 24 meses"
              value={novoPrazoContratual}
              onChange={(e) => setNovoPrazoContratual(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Descrição / Justificativa Legal</label>
            <textarea
              placeholder="Ex: Prorrogação de prazo de mais 6 meses para readequação física dos acabamentos e adensamento elétrico."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              maxLength={1000}
              rows={2}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold py-2 px-4 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 px-5 rounded-xl transition-all shadow-sm"
            >
              Salvar Aditivo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
