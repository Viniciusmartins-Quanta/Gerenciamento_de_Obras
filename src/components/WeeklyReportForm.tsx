import React, { useState } from "react";
import { WeeklyReport } from "../types";
import { PlusCircle, Trash, Save, X } from "lucide-react";
import { compressImage } from "../utils/compressor";

function formatDateStringToBr(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

interface WeeklyReportFormProps {
  onClose: () => void;
  onSave: (report: WeeklyReport) => void;
  reportToEdit?: WeeklyReport;
}

// Some preset beautiful construction photos from Unsplash for realistic simulation!
const PRESET_MOCK_PHOTOS = [
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=500&auto=format&fit=crop"
];

const PRESET_COVER_PHOTOS = [
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop"
];

export default function WeeklyReportForm({ onClose, onSave, reportToEdit }: WeeklyReportFormProps) {
  const [periodoInicio, setPeriodoInicio] = useState(reportToEdit?.periodoInicio || "");
  const [periodoFim, setPeriodoFim] = useState(reportToEdit?.periodoFim || "");
  const [percentualFisico, setPercentualFisico] = useState<number>(reportToEdit?.percentualFisico || 0);
  const [situacaoAditivo, setSituacaoAditivo] = useState(reportToEdit?.situacaoAditivo || "Formalizado");
  const [informacaoRelevante, setInformacaoRelevante] = useState(reportToEdit?.informacaoRelevante || "N/A");
  const [atividadesInfraDados, setAtividadesInfraDados] = useState(reportToEdit?.atividadesInfraDados || "N/A");
  const [statusAumentoCargaEnel, setStatusAumentoCargaEnel] = useState(reportToEdit?.statusAumentoCargaEnel || "N/A");
  const [statusSubestacao, setStatusSubestacao] = useState(reportToEdit?.statusSubestacao || "N/A");

  // Dynamic Bullet Points
  const [atividadesSemana, setAtividadesSemana] = useState<string[]>(
    reportToEdit?.atividadesSemana || [""]
  );
  const [atividadesProximaSemana, setAtividadesProximaSemana] = useState<string[]>(
    reportToEdit?.atividadesProximaSemana || [""]
  );
  const [observacoesApontamentos, setObservacoesApontamentos] = useState<string[]>(
    reportToEdit?.observacoesApontamentos || [""]
  );

  // Cover Photo
  const [fotoCapa, setFotoCapa] = useState<string>(reportToEdit?.fotoCapa || "");

  // Photos
  const [fotos, setFotos] = useState<{ id: string; url: string; legenda: string }[]>(
    reportToEdit?.fotos || []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodoInicio || !periodoFim || percentualFisico < 0) {
      alert("Preencha as datas de início e fim da semana.");
      return;
    }

    const report: WeeklyReport = {
      id: reportToEdit?.id || "rep-" + Date.now(),
      periodoInicio,
      periodoFim,
      percentualFisico,
      situacaoAditivo,
      informacaoRelevante,
      atividadesInfraDados,
      statusAumentoCargaEnel,
      statusSubestacao,
      // Filter out empty lines
      atividadesSemana: activitiesFilter(atividadesSemana),
      atividadesProximaSemana: activitiesFilter(atividadesProximaSemana),
      observacoesApontamentos: activitiesFilter(observacoesApontamentos),
      fotoCapa,
      fotos
    };

    onSave(report);
  };

  const activitiesFilter = (arr: string[]) => {
    return arr.map(a => a.trim()).filter(a => a.length > 0);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isCover && fotos.length >= 4) {
      alert("A galeria semanal de fotos permite no máximo 4 fotos.");
      return;
    }

    try {
      const compressedStr = await compressImage(file, 800, 600, 0.7);
      if (isCover) {
        setFotoCapa(compressedStr);
      } else {
        setFotos([...fotos, { id: "f-" + Date.now(), url: compressedStr, legenda: "" }]);
      }
    } catch (err) {
      console.error("Erro ao comprimir imagem de relatório semanal:", err);
    }
  };

  const addPresetCover = () => {
    const randomUrl = PRESET_COVER_PHOTOS[Math.floor(Math.random() * PRESET_COVER_PHOTOS.length)];
    setFotoCapa(randomUrl);
  };

  const handleAddBullet = (type: "atual" | "proxima" | "avisos") => {
    if (type === "atual") setAtividadesSemana([...atividadesSemana, ""]);
    if (type === "proxima") setAtividadesProximaSemana([...atividadesProximaSemana, ""]);
    if (type === "avisos") setObservacoesApontamentos([...observacoesApontamentos, ""]);
  };

  const handleRemoveBullet = (index: number, type: "atual" | "proxima" | "avisos") => {
    if (type === "atual") {
      setAtividadesSemana(atividadesSemana.filter((_, i) => i !== index));
    }
    if (type === "proxima") {
      setAtividadesProximaSemana(atividadesProximaSemana.filter((_, i) => i !== index));
    }
    if (type === "avisos") {
      setObservacoesApontamentos(observacoesApontamentos.filter((_, i) => i !== index));
    }
  };

  const handleBulletChange = (val: string, index: number, type: "atual" | "proxima" | "avisos") => {
    if (type === "atual") {
      const copy = [...atividadesSemana];
      copy[index] = val;
      setAtividadesSemana(copy);
    }
    if (type === "proxima") {
      const copy = [...atividadesProximaSemana];
      copy[index] = val;
      setAtividadesProximaSemana(copy);
    }
    if (type === "avisos") {
      const copy = [...observacoesApontamentos];
      copy[index] = val;
      setObservacoesApontamentos(copy);
    }
  };

  const addPresetPhoto = () => {
    if (fotos.length >= 4) {
      alert("A galeria semanal de fotos permite no máximo 4 fotos.");
      return;
    }
    const randomUrl = PRESET_MOCK_PHOTOS[Math.floor(Math.random() * PRESET_MOCK_PHOTOS.length)];
    setFotos([...fotos, { id: "f-" + Date.now(), url: randomUrl, legenda: "" }]);
  };

  const removePhoto = (id: string) => {
    setFotos(fotos.filter(f => f.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200" id="weekly-report-form">
        
        {/* Header */}
        <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {reportToEdit ? "Editar Relatório Semanal de Atividades" : "Inserir Novo Relatório de Acompanhamento Semanal"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Registrar progresso físico, atividades de campo e observações técnicas</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all font-bold"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Sessão 1: Período e Progresso */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Início da Semana</label>
              <input
                type="date"
                required
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Final da Semana</label>
              <input
                type="date"
                required
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">% Físico Executado</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="105"
                  required
                  placeholder="Ex: 79"
                  value={percentualFisico || ""}
                  onChange={(e) => setPercentualFisico(parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-semibold text-right pr-6"
                />
                <span className="absolute right-2 top-1.5 text-xs text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>

          {/* Sessão 2: Statuses Técnicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Situação do Aditivo:</label>
              <input
                type="text"
                maxLength={1000}
                placeholder="Ex: Formalizado"
                value={situacaoAditivo}
                onChange={(e) => setSituacaoAditivo(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Atividades da Infraestrutura de Dados:</label>
              <input
                type="text"
                maxLength={1000}
                placeholder="Ex: N/A"
                value={atividadesInfraDados}
                onChange={(e) => setAtividadesInfraDados(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Status do Aumento de Carga (ENEL):</label>
              <input
                type="text"
                maxLength={1000}
                placeholder="Ex: Concessionária ENEL deu início às obras..."
                value={statusAumentoCargaEnel}
                onChange={(e) => setStatusAumentoCargaEnel(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Status da Substação Elétrica:</label>
              <input
                type="text"
                maxLength={1000}
                placeholder="Ex: Não houve alteração"
                value={statusSubestacao}
                onChange={(e) => setStatusSubestacao(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-650 uppercase mb-1">Informação Relevante:</label>
              <input
                type="text"
                maxLength={1000}
                placeholder="Ex: N/A"
                value={informacaoRelevante}
                onChange={(e) => setInformacaoRelevante(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          {/* Sessão 3: Atividades Bullet Points */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            {/* Atividades Desenvolvidas */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-indigo-650 uppercase">
                  Atividades da Semana ({formatDateStringToBr(periodoInicio) || "__/__/____"} a {formatDateStringToBr(periodoFim) || "__/__/____"}):
                </label>
                <button
                  type="button"
                  onClick={() => handleAddBullet("atual")}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full flex items-center gap-1"
                >
                  + Adicionar Item
                </button>
              </div>
              <div className="space-y-1.5">
                {atividadesSemana.map((bullet, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      required
                      maxLength={1000}
                      placeholder="Ex: Alocação de forma e armadura nos trechos..."
                      value={bullet}
                      onChange={(e) => handleBulletChange(e.target.value, idx, "atual")}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      disabled={atividadesSemana.length <= 1}
                      onClick={() => handleRemoveBullet(idx, "atual")}
                      className="p-1.5 rounded-lg text-slate-350 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-30"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Atividades Próxima Semana */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-emerald-650 uppercase">Atividades da próxima semana:</label>
                <button
                  type="button"
                  onClick={() => handleAddBullet("proxima")}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1"
                >
                  + Adicionar Item
                </button>
              </div>
              <div className="space-y-1.5">
                {atividadesProximaSemana.map((bullet, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      required
                      maxLength={1000}
                      placeholder="Ex: Concretagem integral dos blocos da viga de coroamento..."
                      value={bullet}
                      onChange={(e) => handleBulletChange(e.target.value, idx, "proxima")}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      disabled={atividadesProximaSemana.length <= 1}
                      onClick={() => handleRemoveBullet(idx, "proxima")}
                      className="p-1.5 rounded-lg text-slate-350 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-30"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Observações e Apontamentos importantes */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-rose-650 uppercase">Observações e Apontamentos importantes:</label>
                <button
                  type="button"
                  onClick={() => handleAddBullet("avisos")}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full flex items-center gap-1"
                >
                  + Adicionar Item
                </button>
              </div>
              <div className="space-y-1.5">
                {observacoesApontamentos.map((bullet, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      maxLength={1000}
                      placeholder="Ex: Identificadas trincas superficiais na passarela..."
                      value={bullet}
                      onChange={(e) => handleBulletChange(e.target.value, idx, "avisos")}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    <button
                      type="button"
                      disabled={observacoesApontamentos.length <= 1}
                      onClick={() => handleRemoveBullet(idx, "avisos")}
                      className="p-1.5 rounded-lg text-slate-350 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-30"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sessão 4: Foto de Capa do Relatório */}
          <div className="pt-4 border-t border-slate-100">
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-650 uppercase">Foto de Capa do Relatório</label>
              <p className="text-[10px] text-slate-450 mt-0.5">
                Esta foto será exibida no início de cada relatório (Capa do PDF), antes dos dados contratuais da obra.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl">
              {fotoCapa ? (
                <div className="relative max-w-md mx-auto">
                  <button
                    type="button"
                    onClick={() => setFotoCapa("")}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white hover:bg-rose-50 text-rose-500 hover:text-rose-600 shadow-md transition-all text-xs font-bold z-10"
                    title="Remover Foto de Capa"
                  >
                    ✕ Remover Capa
                  </button>
                  <img
                    src={fotoCapa}
                    alt="Foto de Capa do Relatório"
                    className="w-full h-48 object-cover rounded-lg border border-slate-200 shadow-sm"
                  />
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-300 rounded-lg bg-white flex flex-col items-center justify-center gap-3">
                  <span className="text-xs text-slate-500 font-medium">Nenhuma foto de capa definida</span>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <label className="cursor-pointer text-[10px] font-bold text-white bg-slate-900 hover:bg-slate-850 px-3.5 py-1.5 rounded-xl transition-all shadow-sm">
                      Upload Capa Local
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, true)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={addPresetCover}
                      className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-1.5 rounded-xl transition-all"
                    >
                      Usar Foto Demonstrativa
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sessão 5: Registro Fotográfico de Campo */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
              <div>
                <label className="block text-xs font-bold text-slate-650 uppercase flex items-center gap-2">
                  Galeria de Fotos Semanais 
                  <span className="text-[10px] bg-indigo-50 text-indigo-750 px-2 py-0.5 rounded-full font-bold">
                    {fotos.length}/4 Fotos
                  </span>
                </label>
                <p className="text-[10px] text-slate-450 mt-0.5">
                  Insira até 4 fotos para apresentação ao fim do relatório.
                </p>
              </div>
              
              <div className="flex gap-2">
                <label className={`cursor-pointer text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center justify-center ${
                  fotos.length >= 4 
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                    : "bg-slate-900 hover:bg-slate-850 text-white"
                }`}>
                  Upload Foto Local
                  <input
                    type="file"
                    accept="image/*"
                    disabled={fotos.length >= 4}
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, false)}
                  />
                </label>
                <button
                  type="button"
                  disabled={fotos.length >= 4}
                  onClick={addPresetPhoto}
                  className={`text-[10px] font-bold border px-3 py-1.5 rounded-xl transition-all ${
                    fotos.length >= 4
                      ? "border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed"
                      : "border-slate-900 text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  + Foto Demonstrativa
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fotos.map((item, idx) => (
                <div key={item.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl relative">
                  <button
                    type="button"
                    onClick={() => removePhoto(item.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white hover:bg-rose-50 text-rose-500 hover:text-rose-600 shadow-sm transition-all text-xs font-bold"
                  >
                    ✕
                  </button>
                  <img
                    src={item.url}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-slate-200/50"
                  />
                </div>
              ))}
              {fotos.length === 0 && (
                <div className="sm:col-span-2 text-center p-6 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                  Nenhuma foto incluída nesta galeria. Faça upload de uma imagem ou clique em "+ Foto Demonstrativa" para simular fotos.
                </div>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2.5 px-5 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <Save className="h-4 w-4" />
              Salvar Relatório Semanal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
