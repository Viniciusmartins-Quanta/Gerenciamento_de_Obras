import React, { useState, useMemo } from "react";
import { Obra, WeeklyReport, UserProfile } from "../types";
import { 
  Image as ImageIcon, 
  Search, 
  Download, 
  Plus, 
  X, 
  Filter, 
  Calendar, 
  User, 
  Folder, 
  ExternalLink, 
  Eye, 
  Trash2,
  Building2,
  FileCheck
} from "lucide-react";
import { compressImage } from "../utils/compressor";

interface ImageRepositoryViewProps {
  obras: Obra[];
  currentUser: UserProfile;
  onUpdateObras: (updatedObras: Obra[]) => void;
}

interface RepositoryImage {
  id: string;
  url: string;
  legenda: string;
  sourceType: "capa" | "acompanhamento" | "geral" | "sistema";
  obraId: string;
  obraContrato: string;
  obraTitulo: string;
  dataUpload: string; // DD/MM/AAAA or similar
  usuario: string;
}

export default function ImageRepositoryView({ 
  obras, 
  currentUser, 
  onUpdateObras 
}: ImageRepositoryViewProps) {
  // Filter states
  const [selectedObraId, setSelectedObraId] = useState<string>("TODAS");
  const [sourceFilter, setSourceFilter] = useState<"TODAS" | "capa" | "acompanhamento" | "geral" | "sistema">("TODAS");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState<"recent" | "oldest">("recent");

  // Upload/add states
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadObraId, setUploadObraId] = useState<string>("");
  const [uploadLegenda, setUploadLegenda] = useState<string>("");
  const [uploadedBase64, setUploadedBase64] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  // Lightbox modal state
  const [lightboxImage, setLightboxImage] = useState<RepositoryImage | null>(null);

  // Parse and consolidate all images from the works dataset
  const allImages = useMemo(() => {
    const list: RepositoryImage[] = [];

    // Standard institutional images (Capa & Timbrado)
    const capaSvg = localStorage.getItem("pdfCapaImage");
    if (capaSvg) {
      list.push({
        id: "sys-capa-institucional",
        url: capaSvg,
        legenda: "Imagem de Capa do Relatório (Layout de Medição Oficial)",
        sourceType: "sistema",
        obraId: "SISTEMA",
        obraContrato: "PADRÃO",
        obraTitulo: "Capa do Relatório de Campo",
        dataUpload: new Date().toLocaleDateString("pt-BR"),
        usuario: "Sistema CODEMAR"
      });
    }

    const timbradoSvg = localStorage.getItem("pdfTimbradoImage");
    if (timbradoSvg) {
      list.push({
        id: "sys-timbrado-executivo",
        url: timbradoSvg,
        legenda: "Imagem de Timbrado (Papel de Carta / Plano de Fundo Oficial)",
        sourceType: "sistema",
        obraId: "SISTEMA",
        obraContrato: "PADRÃO",
        obraTitulo: "Papel de Carta Timbrado (PDF)",
        dataUpload: new Date().toLocaleDateString("pt-BR"),
        usuario: "Sistema CODEMAR"
      });
    }

    obras.forEach((obra) => {
      // Timeline/Cronologia from each obra
      if (obra.imagemCronologia) {
        list.push({
          id: `sys-cronologia-${obra.id}`,
          url: obra.imagemCronologia,
          legenda: `Imagem da Cronologia / Cronograma Físico-Financeiro - Contrato ${obra.contratoNo}`,
          sourceType: "sistema",
          obraId: obra.id,
          obraContrato: obra.contratoNo,
          obraTitulo: obra.titulo,
          dataUpload: new Date().toLocaleDateString("pt-BR"),
          usuario: "Engenharia CODEMAR"
        });
      }

      // 1. Cover photos of weekly reports
      obra.relatoriosSemanais.forEach((report) => {
        if (report.fotoCapa) {
          list.push({
            id: `capa-${obra.id}-${report.id}`,
            url: report.fotoCapa,
            legenda: `Foto de Capa - Relatório Semanal (${report.periodoInicio} a ${report.periodoFim})`,
            sourceType: "capa",
            obraId: obra.id,
            obraContrato: obra.contratoNo,
            obraTitulo: obra.titulo,
            dataUpload: report.periodoInicio,
            usuario: "Fiscalização CODEMAR"
          });
        }

        // 2. Monitoring photos in reports
        if (report.fotos && Array.isArray(report.fotos)) {
          report.fotos.forEach((foto, index) => {
            if (foto.url) {
              list.push({
                id: `rep-${obra.id}-${report.id}-${foto.id || index}`,
                url: foto.url,
                legenda: foto.legenda || `Foto de Acompanhamento (${report.periodoInicio} a ${report.periodoFim})`,
                sourceType: "acompanhamento",
                obraId: obra.id,
                obraContrato: obra.contratoNo,
                obraTitulo: obra.titulo,
                dataUpload: report.periodoInicio,
                usuario: "Fiscalização CODEMAR"
              });
            }
          });
        }
      });

      // 3. General repository upload list in this work
      if (obra.fotosGerais && Array.isArray(obra.fotosGerais)) {
        obra.fotosGerais.forEach((foto) => {
          list.push({
            id: foto.id,
            url: foto.url,
            legenda: foto.legenda || "Imagem carregada",
            sourceType: "geral",
            obraId: obra.id,
            obraContrato: obra.contratoNo,
            obraTitulo: obra.titulo,
            dataUpload: foto.dataUpload,
            usuario: foto.usuario || "Usuário"
          });
        });
      }
    });

    // Also include "Outros" images from localStorage
    const outreImagesStr = localStorage.getItem("repository_outro_images");
    if (outreImagesStr) {
      try {
        const outreImages = JSON.parse(outreImagesStr);
        if (Array.isArray(outreImages)) {
          outreImages.forEach((img) => {
            list.push({
              id: img.id,
              url: img.url,
              legenda: img.legenda || "Imagem carregada (Diversas)",
              sourceType: "geral",
              obraId: "OUTROS",
              obraContrato: "Diversos / Outros",
              obraTitulo: "Sem Obra Específica",
              dataUpload: img.dataUpload,
              usuario: img.usuario || "Usuário"
            });
          });
        }
      } catch (e) {
        console.error("Error parsing repository_outro_images", e);
      }
    }

    return list;
  }, [obras]);

  // Apply search/filters
  const filteredImages = useMemo(() => {
    let result = [...allImages];

    // Filter by work
    if (selectedObraId !== "TODAS") {
      result = result.filter(img => img.obraId === selectedObraId || img.obraId === "SISTEMA");
    }

    // Filter by source
    if (sourceFilter !== "TODAS") {
      result = result.filter(img => img.sourceType === sourceFilter);
    }

    // Filter by search text
    if (searchTerm.trim() !== "") {
      const q = searchTerm.toLowerCase();
      result = result.filter(img => 
        img.legenda.toLowerCase().includes(q) || 
        img.obraContrato.toLowerCase().includes(q) ||
        img.obraTitulo.toLowerCase().includes(q) ||
        img.usuario.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      // Basic split conversion or standard date sorting comparison-fallback
      const dateA = convertToDateScore(a.dataUpload);
      const dateB = convertToDateScore(b.dataUpload);
      return sortBy === "recent" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [allImages, selectedObraId, sourceFilter, searchTerm, sortBy]);

  // Simple date scoring helper
  function convertToDateScore(dateStr: string): number {
    if (!dateStr) return 0;
    // Format "DD/MM/AAAA"
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day).getTime();
    }
    // Try formats like AAAA-MM-DD
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.getTime();
    return 0;
  }

  // Handle uploaded field photo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setUploadError("");

    try {
      // Compress and convert to Base64
      const compressed = await compressImage(file, 1024, 768, 0.7);
      setUploadedBase64(compressed);
    } catch (err: any) {
      console.error(err);
      setUploadError("Erro ao processar e comprimir arquivo de imagem.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSaveUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadObraId) {
      setUploadError("Selecione um contrato para associar a imagem.");
      return;
    }
    if (!uploadedBase64) {
      setUploadError("Por favor, selecione ou arraste uma imagem primeiro.");
      return;
    }

    const todayStr = new Date().toLocaleDateString("pt-BR");
    const newImage = {
      id: `geral-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      url: uploadedBase64,
      legenda: uploadLegenda.trim() || `Foto de Campo - Extra`,
      dataUpload: todayStr,
      usuario: currentUser.name || "Técnico Fiscalizador"
    };

    if (uploadObraId === "OUTROS") {
      let existingOutros: any[] = [];
      const outreStr = localStorage.getItem("repository_outro_images");
      if (outreStr) {
        try {
          existingOutros = JSON.parse(outreStr);
          if (!Array.isArray(existingOutros)) existingOutros = [];
        } catch (e) {
          existingOutros = [];
        }
      }
      existingOutros.unshift(newImage);
      localStorage.setItem("repository_outro_images", JSON.stringify(existingOutros));
      
      onUpdateObras([...obras]);
    } else {
      const updatedObras = obras.map((obra) => {
        if (obra.id === uploadObraId) {
          const existing = obra.fotosGerais || [];
          return {
            ...obra,
            fotosGerais: [newImage, ...existing]
          };
        }
        return obra;
      });
      onUpdateObras(updatedObras);
    }

    // Reset fields
    setUploadLegenda("");
    setUploadedBase64("");
    setUploadObraId("");
    setIsUploading(false);
  };

  const handleDeleteImage = (img: RepositoryImage) => {
    if (img.sourceType !== "geral") {
      alert("Imagens de modelos oficiais (capa, timbrado), cronogramas ou fotos importadas de vistorias técnicas não podem ser excluídos diretamente do repositório de evidências.");
      return;
    }

    if (window.confirm("Deseja realmente excluir esta imagem do repositório?")) {
      if (img.obraId === "OUTROS") {
        const outreStr = localStorage.getItem("repository_outro_images");
        if (outreStr) {
          try {
            const outreImages = JSON.parse(outreStr);
            if (Array.isArray(outreImages)) {
              const updated = outreImages.filter(f => f.id !== img.id);
              localStorage.setItem("repository_outro_images", JSON.stringify(updated));
              onUpdateObras([...obras]);
            }
          } catch (e) {
            console.error("Error deleting outro image", e);
          }
        }
      } else {
        const updatedObras = obras.map((obra) => {
          if (obra.id === img.obraId && obra.fotosGerais) {
            return {
              ...obra,
              fotosGerais: obra.fotosGerais.filter(f => f.id !== img.id)
            };
          }
          return obra;
        });
        onUpdateObras(updatedObras);
      }

      if (lightboxImage?.id === img.id) {
        setLightboxImage(null);
      }
    }
  };

  const triggerDownload = (img: RepositoryImage) => {
    const link = document.createElement("a");
    link.href = img.url;
    link.download = `IMOB_${img.obraContrato.replace(/\//g, "-")}_${img.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="image-repository-section">
      {/* Intro Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-orange-600">
            <ImageIcon className="h-5 w-5" />
            <span className="text-xs uppercase font-extrabold tracking-widest">Painel Integrador</span>
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Repositório de Imagens e Evidências</h2>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Portal consolidado de registros fotográficos de campo. Indexa automaticamente capas de medição, catalogação de vistorias técnicas semanais e fotos complementares anexadas com georreferenciamento e dados do fiscal administrativo.
          </p>
        </div>

        <button
          onClick={() => setIsUploading(!isUploading)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all ${
            isUploading 
              ? "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
              : "bg-orange-600 text-white hover:bg-orange-700 hover:-translate-y-0.5 active:translate-y-0"
          }`}
        >
          {isUploading ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isUploading ? "Fechar Painel" : "Anexar Nova Foto"}
        </button>
      </div>

      {/* Upload Panel */}
      {isUploading && (
        <form 
          onSubmit={handleSaveUpload} 
          className="bg-orange-50/40 p-6 rounded-2xl border border-orange-100/60 shadow-inner grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn"
          id="form-upload-repository-img"
        >
          <div className="space-y-4">
            <h3 className="text-xs uppercase font-black tracking-widest text-orange-700 flex items-center gap-2">
              <FileCheck className="h-4 w-4" /> Anexar evidência de campo adicional
            </h3>
            
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-slate-600 block">Associação a Obra/Contrato *</label>
              <select
                required
                value={uploadObraId}
                onChange={(e) => setUploadObraId(e.target.value)}
                className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="">-- Selecione uma Obra do Contrato --</option>
                <option value="OUTROS">Diversos / Outros (Sem Obra Selecionada)</option>
                {obras.map(o => (
                  <option key={o.id} value={o.id}>{o.contratoNo} — {o.titulo.substring(0, 50)}...</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-slate-600 block">Legenda ou Descrição Detalhada (Opcional)</label>
              <textarea
                maxLength={400}
                placeholder="Exemplo: Vista panorâmica do asfalto da pista de pouso e decolagem ou progresso de montagem estrutural no hangar..."
                value={uploadLegenda}
                onChange={(e) => setUploadLegenda(e.target.value)}
                className="w-full h-24 text-xs font-semibold text-slate-700 placeholder-slate-400 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
              />
            </div>
          </div>

          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-1 my-auto">
              <label className="text-[11px] font-extrabold text-slate-600 block text-center md:text-left">Arquivo de Imagem *</label>
              
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-orange-400 rounded-2xl p-6 bg-white transition-all cursor-pointer relative min-h-[140px]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                
                {uploadedBase64 ? (
                  <div className="w-full flex flex-col items-center gap-2">
                    <img 
                      src={uploadedBase64} 
                      alt="Preview" 
                      className="h-20 max-w-full rounded-lg object-cover shadow-sm border border-slate-150" 
                    />
                    <span className="text-[10px] text-green-600 font-bold flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-md">
                      ✓ Imagem carregada e compactada com sucesso!
                    </span>
                  </div>
                ) : isCompressing ? (
                  <div className="flex flex-col items-center gap-1.5 justify-center py-4">
                    <div className="w-6 h-6 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
                    <span className="text-[11px] font-bold text-slate-500">Comprimindo imagem...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center gap-1.5">
                    <ImageIcon className="h-8 w-8 text-slate-350" />
                    <span className="text-xs font-bold text-slate-600">Arraste a foto ou clique para escolher</span>
                    <span className="text-[10px] text-slate-400 font-medium">PNG, JPG, BMP. Compactada em tempo real para otimização de nuvem</span>
                  </div>
                )}
              </div>
            </div>

            {uploadError && (
              <p className="text-[11px] font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-150 text-center">
                {uploadError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setUploadedBase64("");
                  setUploadLegenda("");
                  setUploadObraId("");
                  setUploadError("");
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-650 transition-all cursor-pointer"
              >
                Limpar Dados
              </button>
              <button
                type="submit"
                disabled={isCompressing || !uploadedBase64 || !uploadObraId}
                className="flex-grow py-2.5 rounded-xl bg-orange-600 text-white font-extrabold text-xs transition-all hover:bg-orange-700 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                Salvar no Repositório
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter Menu Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Source Categories Toggles */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "TODAS", label: "Todas as Evidências", icon: ImageIcon },
            { id: "capa", label: "Capa de Relatórios", icon: FileCheck },
            { id: "acompanhamento", label: "Fotos de Acompanhamento", icon: Building2 },
            { id: "geral", label: "Suplementares / Campo", icon: Plus },
            { id: "sistema", label: "Modelos Oficiais (Capa, Timbrado, Cronologia)", icon: Folder }
          ].map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSourceFilter(type.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                  sourceFilter === type.id
                    ? "bg-slate-900 border-slate-900 text-white shadow-sm font-black text-orange-400"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic Interactive Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 xl:w-[55%]">
          {/* Obra Select filter */}
          <div className="relative">
            <Building2 className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedObraId}
              onChange={(e) => setSelectedObraId(e.target.value)}
              className="w-full text-[11px] font-bold text-slate-650 pl-8 pr-2 py-1.5 focus:outline-none bg-slate-50 border border-slate-200 rounded-lg select-none"
            >
              <option value="TODAS">Todos os Contratos</option>
              <option value="OUTROS">Diversos / Outros</option>
              {obras.map(obra => (
                <option key={obra.id} value={obra.id}>{obra.contratoNo}</option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              maxLength={200}
              placeholder="Pesquisar legenda..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-[11px] font-bold text-slate-650 pl-8 pr-3 py-1.5 focus:outline-none bg-slate-50 border border-slate-200 rounded-lg placeholder-slate-400"
            />
          </div>

          {/* Sorting */}
          <div className="relative">
            <Filter className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full text-[11px] font-bold text-slate-650 pl-8 pr-2 py-1.5 focus:outline-none bg-slate-50 border border-slate-200 rounded-lg select-none"
            >
              <option value="recent">Mais Recentes</option>
              <option value="oldest">Mais Antigos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Dashboard */}
      {filteredImages.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-200 space-y-3">
          <ImageIcon className="h-10 w-10 text-slate-350 mx-auto" />
          <h3 className="text-xs uppercase font-extrabold tracking-widest text-slate-700">Nenhuma evidência fotográfica encontrada</h3>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
            Não há imagens correspondentes para estes parâmetros nesta conta. Modifique os filtros ou anexe uma nova foto de campo utilizando o formulário acima.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5" id="image-gallery-grid-canvas">
          {filteredImages.map((img) => (
            <div 
              key={img.id}
              className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col group hover:-translate-y-1 transition-all duration-300 relative hover:ring-2 hover:ring-orange-500/20"
            >
              {/* Cover badge display */}
              <div className="absolute top-2.5 left-2.5 z-10">
                <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold tracking-wider uppercase text-white shadow-sm ${
                  img.sourceType === "capa" 
                    ? "bg-indigo-600" 
                    : img.sourceType === "acompanhamento" 
                    ? "bg-slate-800"
                    : img.sourceType === "sistema"
                    ? "bg-teal-600"
                    : "bg-orange-600"
                }`}>
                  {img.sourceType === "capa" 
                    ? "Capa" 
                    : img.sourceType === "acompanhamento" 
                    ? "Relatório" 
                    : img.sourceType === "sistema"
                    ? "Padrão"
                    : "Diverso"}
                </span>
              </div>

              {/* Photo representation viewport */}
              <div 
                className="relative bg-slate-900 aspect-[4/3] w-full overflow-hidden cursor-pointer"
                onClick={() => setLightboxImage(img)}
              >
                <img 
                  referrerPolicy="no-referrer"
                  src={img.url} 
                  alt={img.legenda} 
                  className="w-full h-full object-cover group-hover:scale-105 duration-500 transition-all opacity-90 group-hover:opacity-100"
                />
                
                {/* Overlay hover effect icons */}
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <div className="bg-white/90 text-slate-800 p-2 rounded-xl shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    <Eye className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Description context body */}
              <div className="p-3.5 flex-1 flex flex-col justify-between gap-3 text-left">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block truncate">
                    Contrato {img.obraContrato}
                  </span>
                  <p className="text-[11px] font-bold text-slate-700 leading-snug line-clamp-2 min-h-[32px]">
                    {img.legenda}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Calendar className="h-3 w-3 shrink-0" /> {img.dataUpload}
                  </span>
                  
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => triggerDownload(img)}
                      title="Baixar imagem de alta resolução"
                      className="text-slate-400 hover:text-orange-600 transition-colors p-1"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {img.sourceType === "geral" && (
                      <button
                        onClick={() => handleDeleteImage(img)}
                        title="Excluir imagem do repositório"
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Immersive Preview Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 md:p-10 animate-fadeIn"
          id="lightbox-repository-modal"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-slate-150 flex flex-col md:flex-row h-full max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left - Imagem viewport */}
            <div className="bg-slate-950 flex-1 flex items-center justify-center relative border-r border-slate-100 min-h-[40vh] md:min-h-0">
              <img 
                referrerPolicy="no-referrer"
                src={lightboxImage.url} 
                alt={lightboxImage.legenda} 
                className="max-h-full max-w-full object-contain"
              />
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 left-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-700 text-white p-2 rounded-xl transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Right - Metadata Side Panel */}
            <div className="w-full md:w-80 bg-white p-6 flex flex-col justify-between text-left shrink-0">
              <div className="space-y-5 overflow-y-auto">
                <div className="pb-3.5 border-b border-slate-100 flex items-center justify-between">
                  <span className={`text-[9px] px-2.5 py-0.5 rounded-md font-extrabold tracking-wider uppercase text-white ${
                    lightboxImage.sourceType === "capa" 
                      ? "bg-indigo-600" 
                      : lightboxImage.sourceType === "acompanhamento" 
                      ? "bg-slate-800"
                      : lightboxImage.sourceType === "sistema"
                      ? "bg-teal-600"
                      : "bg-orange-600"
                  }`}>
                    {lightboxImage.sourceType === "capa" 
                      ? "Capa de Relatório" 
                      : lightboxImage.sourceType === "acompanhamento" 
                      ? "Acompanhamento Semanal" 
                      : lightboxImage.sourceType === "sistema"
                      ? "Modelo Oficial / Cronologia"
                      : "Suplementar de Campo"}
                  </span>
                  
                  <button
                    onClick={() => setLightboxImage(null)}
                    className="text-slate-400 hover:text-slate-600 transition-colors hidden md:block"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1.5 font-sans">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Contrato Associado</span>
                  <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-150">
                    <Building2 className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-black text-slate-800 leading-none">{lightboxImage.obraContrato}</p>
                      <p className="text-[10px] font-bold text-slate-500 leading-tight mt-1 line-clamp-3">{lightboxImage.obraTitulo}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Legenda Fotográfica</span>
                  <p className="text-xs font-bold text-slate-740 leading-relaxed bg-orange-50/20 border border-orange-100/50 p-3.5 rounded-xl">
                    {lightboxImage.legenda}
                  </p>
                </div>

                {/* Properties */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2.5 text-[11px] text-slate-600 font-bold">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Período/Data: {lightboxImage.dataUpload}</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-[11px] text-slate-600 font-bold">
                    <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">Carregado por: {lightboxImage.usuario}</span>
                  </div>
                </div>
              </div>

              {/* Lower Actions */}
              <div className="pt-6 border-t border-slate-100 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => triggerDownload(lightboxImage)}
                  className="flex-1 bg-slate-900 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download className="h-4 w-4" /> Baixar PNG
                </button>
                {lightboxImage.sourceType === "geral" && (
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(lightboxImage)}
                    className="p-2.5 text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 rounded-xl transition-all cursor-pointer hover:border-red-300"
                    title="Excluir imagem"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
