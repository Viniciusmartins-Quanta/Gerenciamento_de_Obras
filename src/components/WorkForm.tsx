import React, { useState } from "react";
import { Obra } from "../types";
import { PlusCircle, Building2, BarChart3, Coins, Calendar, X } from "lucide-react";

interface WorkFormProps {
  onClose: () => void;
  onSave: (obra: Obra) => void;
  obraToEdit?: Obra; // If editing
}

export default function WorkForm({ onClose, onSave, obraToEdit }: WorkFormProps) {
  const [titulo, setTitulo] = useState(obraToEdit?.titulo || "");
  const [contratoNo, setContratoNo] = useState(obraToEdit?.contratoNo || "");
  const [concorrenciaPublicaNo, setConcorrenciaPublicaNo] = useState(obraToEdit?.concorrenciaPublicaNo || "");
  const [processoAdministrativoNo, setProcessoAdministrativoNo] = useState(obraToEdit?.processoAdministrativoNo || "");
  const [dataAssinatura, setDataAssinatura] = useState(obraToEdit?.dataAssinatura || "");
  const [dataPublicacaoJOM, setDataPublicacaoJOM] = useState(obraToEdit?.dataPublicacaoJOM || "");
  const [dataOrdemInicio, setDataOrdemInicio] = useState(obraToEdit?.dataOrdemInicio || "");
  const [empresaVencedora, setEmpresaVencedora] = useState(obraToEdit?.empresaVencedora || "");
  const [prazoVigenciaInicial, setPrazoVigenciaInicial] = useState(obraToEdit?.prazoVigenciaInicial || "12 meses");
  const [prazoExecucaoInicial, setPrazoExecucaoInicial] = useState(obraToEdit?.prazoExecucaoInicial || "12 meses");
  const [dataInicio, setDataInicio] = useState(obraToEdit?.dataInicio || "");
  const [valorContratualInicial, setValorContratualInicial] = useState<number>(obraToEdit?.valorContratualInicial || 0);
  const [statusGeral, setStatusGeral] = useState<Obra["statusGeral"]>(obraToEdit?.statusGeral || "Em Andamento");
  const [imagemCronologia, setImagemCronologia] = useState(obraToEdit?.imagemCronologia || "");



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !contratoNo || !empresaVencedora || valorContratualInicial <= 0) {
      alert("Preencha todos os campos obrigatórios (*).");
      return;
    }

    const savedObra: Obra = {
      id: obraToEdit?.id || "obra-" + Date.now(),
      titulo,
      contratoNo,
      concorrenciaPublicaNo,
      processoAdministrativoNo,
      dataAssinatura,
      dataPublicacaoJOM,
      dataOrdemInicio,
      empresaVencedora,
      prazoVigenciaInicial,
      prazoExecucaoInicial,
      dataInicio,
      valorContratualInicial,
      // Default dynamic parameters as initial parameters
      valorContratualAtual: obraToEdit ? obraToEdit.valorContratualAtual : valorContratualInicial,
      prazoVigenciaAtual: obraToEdit ? obraToEdit.prazoVigenciaAtual : prazoVigenciaInicial,
      prazoExecucaoAtual: obraToEdit ? obraToEdit.prazoExecucaoAtual : prazoExecucaoInicial,
      aditivos: obraToEdit ? obraToEdit.aditivos : [],
      relatoriosSemanais: obraToEdit ? obraToEdit.relatoriosSemanais : [],
      percentualFisicoAtual: obraToEdit ? obraToEdit.percentualFisicoAtual : 0,
      statusGeral,
      imagemCronologia
    };

    onSave(savedObra);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200" id="obra-form-container">
        
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {obraToEdit ? "Editar Cadastro da Obra" : "Cadastrar Nova Obra Executiva"}
              </h2>
              <p className="text-slate-500 text-xs">Insira os termos de início do contrato público</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Sessão 1: Informações Gerais */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">1. Detalhamento & Empresa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Título da Ficha de Obra *</label>
                <input
                  type="text"
                  required
                  maxLength={1000}
                  placeholder="Ex: TC 60/2022 - Península do Samba – Museu Darcy Ribeiro e Praça das Utopias"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Contrato Nº *</label>
                <input
                  type="text"
                  required
                  maxLength={1000}
                  placeholder="Ex: 60/2023"
                  value={contratoNo}
                  onChange={(e) => setContratoNo(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Empresa Vencedora (Empreiteira) *</label>
                <input
                  type="text"
                  required
                  maxLength={1000}
                  placeholder="Ex: Monobloco Construção Ltda"
                  value={empresaVencedora}
                  onChange={(e) => setEmpresaVencedora(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Concorrência Pública Nº</label>
                <input
                  type="text"
                  maxLength={1000}
                  placeholder="Ex: 39/2022"
                  value={concorrenciaPublicaNo}
                  onChange={(e) => setConcorrenciaPublicaNo(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Processo Administrativo Nº</label>
                <input
                  type="text"
                  maxLength={1000}
                  placeholder="Ex: 4200/2022"
                  value={processoAdministrativoNo}
                  onChange={(e) => setProcessoAdministrativoNo(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Sessão 2: Cronograma, Prazos & Valores */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">2. Prazos, Datas & Valores Municipais</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Valor Contratual Inicial *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 4386697.66"
                    value={valorContratualInicial || ""}
                    onChange={(e) => setValorContratualInicial(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Prazo Vigência Inicial</label>
                <input
                  type="text"
                  maxLength={1000}
                  placeholder="Ex: 8 meses"
                  value={prazoVigenciaInicial}
                  onChange={(e) => setPrazoVigenciaInicial(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Prazo Execução Inicial</label>
                <input
                  type="text"
                  maxLength={1000}
                  placeholder="Ex: 8 meses"
                  value={prazoExecucaoInicial}
                  onChange={(e) => setPrazoExecucaoInicial(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Data Assinatura</label>
                <input
                  type="text"
                  maxLength={1000}
                  placeholder="Ex: 20/10/2023"
                  value={dataAssinatura}
                  onChange={(e) => setDataAssinatura(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Data Publicação JOM</label>
                <input
                  type="text"
                  maxLength={1000}
                  placeholder="Ex: 23/10/2023"
                  value={dataPublicacaoJOM}
                  onChange={(e) => setDataPublicacaoJOM(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Data de Início Física</label>
                <input
                  type="text"
                  maxLength={1000}
                  placeholder="Ex: 23/10/2023"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Data Ordem Início</label>
                <input
                  type="text"
                  maxLength={1000}
                  placeholder="Ex: 23/10/2023"
                  value={dataOrdemInicio}
                  onChange={(e) => setDataOrdemInicio(e.target.value)}
                  className="w-full sm:col-span-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Status de Início Inicial</label>
                <select
                  value={statusGeral}
                  onChange={(e) => setStatusGeral(e.target.value as Obra["statusGeral"])}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                >
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Aguardando Início">Aguardando Início</option>
                  <option value="Paralisada">Paralisada</option>
                  <option value="Concluída">Concluída</option>
                </select>
              </div>
            </div>
          </div>



          {/* Footer Controls */}
          <div className="flex gap-2.5 justify-end pt-5 border-t border-slate-100 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2.5 px-5 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm"
            >
              {obraToEdit ? "Salvar Alterações" : "Cadastrar Obra"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
