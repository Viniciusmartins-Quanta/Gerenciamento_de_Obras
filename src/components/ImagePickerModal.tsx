import React, { useState, useMemo } from "react";
import { X, Search, Image as ImageIcon, Calendar, User, Check, Building2, Folder } from "lucide-react";
import { Obra } from "../types";

export interface RepositoryImage {
  id: string;
  url: string;
  legenda: string;
  sourceType: "capa" | "acompanhamento" | "geral" | "sistema";
  obraId: string;
  obraContrato: string;
  obraTitulo: string;
  dataUpload: string;
  usuario: string;
}

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  obras: Obra[];
  onSelect: (url: string) => void;
  title: string;
}

export default function ImagePickerModal({
  isOpen,
  onClose,
  obras,
  onSelect,
  title
}: ImagePickerModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<"TODAS" | "capa" | "acompanhamento" | "geral" | "sistema">("TODAS");

  const allImages = useMemo(() => {
    const list: RepositoryImage[] = [];

    // System templates if present in localStorage
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
      // Timeline/Cronologia image
      if (obra.imagemCronologia) {
        list.push({
          id: `sys-cronologia-${obra.id}`,
          url: obra.imagemCronologia,
          legenda: `Imagem da Cronologia de Campo - Contrato ${obra.contratoNo}`,
          sourceType: "sistema",
          obraId: obra.id,
          obraContrato: obra.contratoNo,
          obraTitulo: obra.titulo,
          dataUpload: new Date().toLocaleDateString("pt-BR"),
          usuario: "Engenharia CODEMAR"
        });
      }

      // Reports Cover photos
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

        // Monitoring photos
        if (report.fotos && Array.isArray(report.fotos)) {
          report.fotos.forEach((foto, idx) => {
            if (foto.url) {
              list.push({
                id: `rep-${obra.id}-${report.id}-${foto.id || idx}`,
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

      // Supplementary photos (from general repository uploads)
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

    return list;
  }, [obras]);

  // Filters calculation
  const filtered = useMemo(() => {
    return allImages.filter((img) => {
      const matchSearch = 
        img.legenda.toLowerCase().includes(searchTerm.toLowerCase()) ||
        img.obraTitulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        img.obraContrato.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchType = selectedType === "TODAS" || img.sourceType === selectedType;
      
      return matchSearch && matchType;
    });
  }, [allImages, searchTerm, selectedType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-150 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-600" />
              {title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Selecione uma imagem do repositório de evidências registradas no sistema.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters bar */}
        <div className="p-4 border-b border-slate-150 flex flex-col sm:flex-row gap-3 bg-white">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por legenda, contrato ou obra..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            {[
              { id: "TODAS", label: "Tudo", icon: ImageIcon },
              { id: "capa", label: "Capas", icon: ImageIcon },
              { id: "acompanhamento", label: "Relatórios", icon: Building2 },
              { id: "geral", label: "Suplementares", icon: ImageIcon },
              { id: "sistema", label: "Padrões / Modelos", icon: Folder }
            ].map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id as any)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                    selectedType === type.id
                      ? "bg-slate-950 border-slate-950 text-white shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Images Grid */}
        <div className="p-6 overflow-y-auto flex-1 min-h-[300px] bg-slate-50">
          {filtered.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {filtered.map((img) => (
                <div
                  key={img.id}
                  onClick={() => {
                    onSelect(img.url);
                    onClose();
                  }}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-500 hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
                    <img
                      src={img.url}
                      alt={img.legenda}
                      className="object-contain w-full h-full max-h-40 group-hover:scale-102 transition-transform duration-350"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-indigo-600 text-white text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg shadow flex items-center gap-1">
                        <Check className="w-3 w-3" />
                        Escolher esta
                      </span>
                    </div>

                    <span className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${
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

                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between bg-white border-t border-slate-100">
                    <p className="text-xs text-slate-700 font-bold line-clamp-2 leading-snug" title={img.legenda}>
                      {img.legenda}
                    </p>
                    
                    <div className="space-y-1 pt-1.5 border-t border-slate-100 text-[10px] font-medium text-slate-400">
                      <div className="flex items-center gap-1 truncate" title={img.obraTitulo}>
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{img.obraContrato} - {img.obraTitulo}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{img.dataUpload}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-450 italic text-xs">
              Nenhuma imagem encontrada no repositório de evidências com as palavras informadas.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-150 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-650 font-bold text-xs border border-slate-200 rounded-xl transition-all"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
}
