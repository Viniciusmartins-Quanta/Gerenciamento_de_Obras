import React, { useState, useEffect } from "react";
import { Upload, CheckCircle, Image as ImageIcon, Trash2, FileImage, Link2, Folder } from "lucide-react";

export interface SettingsViewProps {
  onSelectImageFromRepo?: (targetType: "capa" | "timbrado", onSelected: (url: string) => void) => void;
}

export default function SettingsView({ onSelectImageFromRepo }: SettingsViewProps) {
  const [timbradoImage, setTimbradoImage] = useState<string | null>(null);
  const [capaImage, setCapaImage] = useState<string | null>(null);

  // URL inputs state
  const [showCapaUrlInput, setShowCapaUrlInput] = useState(false);
  const [capaUrl, setCapaUrl] = useState("");
  const [showTimbradoUrlInput, setShowTimbradoUrlInput] = useState(false);
  const [timbradoUrl, setTimbradoUrl] = useState("");

  useEffect(() => {
    const savedTimbrado = localStorage.getItem("pdfTimbradoImage");
    if (savedTimbrado && (savedTimbrado.startsWith("data:image") || savedTimbrado.startsWith("http") || savedTimbrado.startsWith("/"))) {
      setTimbradoImage(savedTimbrado);
      if (savedTimbrado.startsWith("http") || savedTimbrado.startsWith("/")) {
        setTimbradoUrl(savedTimbrado);
      }
    }
    
    const savedCapa = localStorage.getItem("pdfCapaImage");
    if (savedCapa && (savedCapa.startsWith("data:image") || savedCapa.startsWith("http") || savedCapa.startsWith("/"))) {
      setCapaImage(savedCapa);
      if (savedCapa.startsWith("http") || savedCapa.startsWith("/")) {
        setCapaUrl(savedCapa);
      }
    }
  }, []);

  const handleTimbradoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Str = event.target?.result as string;
      if (base64Str) {
        setTimbradoImage(base64Str);
        localStorage.setItem("pdfTimbradoImage", base64Str);
        setShowTimbradoUrlInput(false);
      }
    };
    reader.onerror = (err) => {
      console.error("Erro ao ler imagem de timbrado:", err);
    };
    reader.readAsDataURL(file);
  };

  const handleCapaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Str = event.target?.result as string;
      if (base64Str) {
        setCapaImage(base64Str);
        localStorage.setItem("pdfCapaImage", base64Str);
        setShowCapaUrlInput(false);
      }
    };
    reader.onerror = (err) => {
      console.error("Erro ao ler imagem de capa:", err);
    };
    reader.readAsDataURL(file);
  };

  const handleClearTimbrado = () => {
    setTimbradoImage(null);
    setTimbradoUrl("");
    localStorage.removeItem("pdfTimbradoImage");
  };

  const handleClearCapa = () => {
    setCapaImage(null);
    setCapaUrl("");
    localStorage.removeItem("pdfCapaImage");
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-150 p-6 md:p-8">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-2">
            Configurações de Exportação
          </h2>
          <p className="text-sm text-slate-500">
            Personalize os parâmetros globais utilizados na geração de documentos PDF (Fichas e Relatórios).
          </p>
        </div>

        <div className="space-y-8">
          
          {/* Capa / Cover Image Section */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <FileImage className="w-5 h-5 text-indigo-500" />
              Imagem de Capa Opcional
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed max-w-2xl">
              Esta imagem criará uma nova página inicial (capa) em todos os relatórios PDF, usando a imagem e sobrepondo automaticamente os títulos da obra e data de referência se especificado.
            </p>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 w-full space-y-3">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-slate-50 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                     <Upload className="w-8 h-8 text-slate-400 mb-2" />
                     <p className="text-sm font-semibold text-slate-600">Clique para selecionar</p>
                     <p className="text-xs text-slate-500 mt-1">PNG ou JPG (Máx 5MB)</p>
                  </div>
                  <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleCapaUpload} />
                </label>

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCapaUrlInput(!showCapaUrlInput)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    {showCapaUrlInput ? "Ocultar inserção por link" : "Inserir imagem por link (URL)"}
                  </button>

                  {onSelectImageFromRepo && (
                    <button
                      type="button"
                      onClick={() => onSelectImageFromRepo("capa", (url) => {
                        setCapaImage(url);
                        localStorage.setItem("pdfCapaImage", url);
                        
                        const event = new CustomEvent("auditLogRequest", {
                          detail: {
                            acao: "MUDAR_CAPA_REPOSITORIO",
                            descricao: "Atualizou a imagem de capa institucional a partir do repositório de evidências."
                          }
                        });
                        window.dispatchEvent(event);
                      })}
                      className="flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-850 transition-colors cursor-pointer bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-150 shadow-3xs"
                    >
                      <Folder className="w-3.5 h-3.5 text-teal-500 font-bold" />
                      Definir pelo Repositório do Aplicativo 📂
                    </button>
                  )}
                </div>

                {showCapaUrlInput && (
                  <div className="space-y-2 p-3 bg-white border border-slate-200 rounded-xl shadow-inner">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Link da imagem da capa</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://exemplo.com/imagem-capa.jpg"
                        value={capaUrl}
                        onChange={(e) => setCapaUrl(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (capaUrl.trim()) {
                            setCapaImage(capaUrl.trim());
                            localStorage.setItem("pdfCapaImage", capaUrl.trim());
                            setShowCapaUrlInput(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap"
                      >
                        Definir Link
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full md:w-48 shrink-0 flex flex-col items-center justify-center border border-slate-200 rounded-xl bg-white p-2 min-h-[8rem]">
                {capaImage ? (
                  <div className="relative w-full h-full group flex items-center justify-center">
                    <img 
                      src={capaImage} 
                      alt="Preview Capa" 
                      className="max-h-24 max-w-full object-contain rounded-md"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-md transition-opacity">
                      <button 
                        onClick={handleClearCapa}
                        className="p-1.5 bg-rose-500 text-white rounded-md hover:bg-rose-600 shadow-sm"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 flex flex-col items-center gap-1">
                    <FileImage className="w-6 h-6 opacity-50" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-center mt-1">Sem Capa<br/>(Desativada)</span>
                  </div>
                )}
              </div>
            </div>
            
            {capaImage && (
              <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 w-fit px-3 py-1.5 rounded-lg border border-emerald-100">
                <CheckCircle className="w-4 h-4" />
                Capa personalizada ativada nos relatórios
              </div>
            )}
          </div>

          {/* Timbrado / Background Image Section */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-orange-500" />
              Timbrado (Papel de Carta) / Fundo Padrão
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed max-w-2xl">
              Esta imagem será inserida no plano de fundo de todas as páginas de conteúdo nos arquivos PDF, englobando o cabeçalho e o rodapé da folha original (Formato A4). Se definida, substitui o timbrado padrão.
            </p>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 w-full space-y-3">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-slate-50 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                     <Upload className="w-8 h-8 text-slate-400 mb-2" />
                     <p className="text-sm font-semibold text-slate-600">Clique para selecionar</p>
                     <p className="text-xs text-slate-500 mt-1">PNG ou JPG (Máx 5MB)</p>
                  </div>
                  <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleTimbradoUpload} />
                </label>

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTimbradoUrlInput(!showTimbradoUrlInput)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    {showTimbradoUrlInput ? "Ocultar inserção por link" : "Inserir imagem por link (URL)"}
                  </button>

                  {onSelectImageFromRepo && (
                    <button
                      type="button"
                      onClick={() => onSelectImageFromRepo("timbrado", (url) => {
                        setTimbradoImage(url);
                        localStorage.setItem("pdfTimbradoImage", url);
                        
                        const event = new CustomEvent("auditLogRequest", {
                          detail: {
                            acao: "MUDAR_TIMBRADO_REPOSITORIO",
                            descricao: "Atualizou o papel de carta (timbrado) a partir do repositório de evidências."
                          }
                        });
                        window.dispatchEvent(event);
                      })}
                      className="flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-850 transition-colors cursor-pointer bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-150 shadow-3xs"
                    >
                      <Folder className="w-3.5 h-3.5 text-teal-500 font-bold" />
                      Definir pelo Repositório do Aplicativo 📂
                    </button>
                  )}
                </div>

                {showTimbradoUrlInput && (
                  <div className="space-y-2 p-3 bg-white border border-slate-200 rounded-xl shadow-inner">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Link do papel de carta timbrado</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://exemplo.com/timbrado.jpg"
                        value={timbradoUrl}
                        onChange={(e) => setTimbradoUrl(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (timbradoUrl.trim()) {
                            setTimbradoImage(timbradoUrl.trim());
                            localStorage.setItem("pdfTimbradoImage", timbradoUrl.trim());
                            setShowTimbradoUrlInput(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap"
                      >
                        Definir Link
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full md:w-48 shrink-0 flex flex-col items-center justify-center border border-slate-200 rounded-xl bg-white p-2 min-h-[8rem]">
                {timbradoImage ? (
                  <div className="relative w-full h-full group flex items-center justify-center">
                    <img 
                      src={timbradoImage} 
                      alt="Preview Timbrado" 
                      className="max-h-24 max-w-full object-contain rounded-md"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-md transition-opacity">
                      <button 
                        onClick={handleClearTimbrado}
                        className="p-1.5 bg-rose-500 text-white rounded-md hover:bg-rose-600 shadow-sm"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-400 flex flex-col items-center gap-1">
                    <ImageIcon className="w-6 h-6 opacity-50" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-center mt-1">Padrão do<br/>Sistema</span>
                  </div>
                )}
              </div>
            </div>
            
            {timbradoImage && (
              <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 w-fit px-3 py-1.5 rounded-lg border border-emerald-100">
                <CheckCircle className="w-4 h-4" />
                Imagem de fundo personalizada (timbrado) aplicada
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
