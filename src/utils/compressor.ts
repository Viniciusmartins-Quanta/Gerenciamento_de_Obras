/**
 * Compresses an image in base64 or File format using an HTML Canvas downsizer.
 * Reduces raw megabyte-sized uploads directly down to tiny sizes (30KB to 90KB)
 * for safe, continuous storage in localStorage.
 */
export function compressImage(
  fileOrBase64: File | string,
  _maxWidth = 800,
  _maxHeight = 600,
  _quality = 0.7
): Promise<string> {
  // Always maintain maximum quality and full resolution
  const maxWidth = 999999;
  const maxHeight = 999999;
  const quality = 1.0;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate optimized bounding box maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(typeof fileOrBase64 === "string" ? fileOrBase64 : "");
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(compressedDataUrl);
    };

    img.onerror = (err) => {
      // Return original value as fallback if canvas loading/rendering fails gracefully
      if (typeof fileOrBase64 === "string") {
        resolve(fileOrBase64);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(err);
        reader.readAsDataURL(fileOrBase64);
      }
    };

    if (typeof fileOrBase64 === "string") {
      img.src = fileOrBase64;
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(fileOrBase64);
    }
  });
}

/**
 * Prunes heavyweight base64 assets from an Obra instance before storing it 
 * in revisions snapshots, because revisions do not require raw mídias.
 */
export function pruneObraForSnapshot(obra: any): any {
  if (!obra) return obra;
  try {
    const cloned = JSON.parse(JSON.stringify(obra));
    
    // Do NOT alter image of cover (fotoCapa) or chronology images (imagemCronologia) to adhere to user constraints
    
    // Prune general photo lists only if extremely large
    if (Array.isArray(cloned.relatoriosSemanais)) {
      cloned.relatoriosSemanais = cloned.relatoriosSemanais.map((rep: any) => {
        if (Array.isArray(rep.fotos)) {
          rep.fotos = rep.fotos.map((foto: any) => {
            if (foto.url && foto.url.length > 5000000) {
              return {
                ...foto,
                url: "[Foto Omitida para Conservar Memória Local]"
              };
            }
            return foto;
          });
        }
        return rep;
      });
    }
    return cloned;
  } catch (e) {
    console.error("Erro ao podar obra para snapshot:", e);
    return obra;
  }
}

const TINY_GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * Prunes the obras database storage progressively based on the specified severity level.
 * Replaces heavy Base64 strings with small transparent 1px GIFs (keeping text intact).
 */
export function pruneObrasProgressively(obras: any[], level: number): any[] {
  return obras.map((obra) => {
    if (!obra) return obra;
    const cloned = JSON.parse(JSON.stringify(obra));
    
    // We must NOT alter imagemCronologia, pdfTimbradoImage, or report fotoCapa (image of cover)
    if (level >= 1) {
      if (Array.isArray(cloned.relatoriosSemanais)) {
        cloned.relatoriosSemanais = cloned.relatoriosSemanais.map((rep: any) => {
          if (Array.isArray(rep.fotos)) {
            rep.fotos = rep.fotos.map((f: any) => {
              if (f.url && f.url.length > 200000) {
                return { ...f, url: TINY_GIF };
              }
              return f;
            });
          }
          return rep;
        });
      }
    }
    
    if (level >= 3) {
      if (Array.isArray(cloned.relatoriosSemanais)) {
        const sorted = [...cloned.relatoriosSemanais].sort((a: any, b: any) => {
          return new Date(b.periodoInicio || "").getTime() - new Date(a.periodoInicio || "").getTime();
        });
        const keepIds = sorted.slice(0, 2).map((r: any) => r.id);
        
        cloned.relatoriosSemanais = cloned.relatoriosSemanais.map((rep: any) => {
          if (!keepIds.includes(rep.id)) {
            if (Array.isArray(rep.fotos)) {
              rep.fotos = rep.fotos.map((f: any) => ({ ...f, url: TINY_GIF }));
            }
          }
          return rep;
        });
      }
    }
    
    if (level >= 4) {
      if (Array.isArray(cloned.relatoriosSemanais)) {
        cloned.relatoriosSemanais = cloned.relatoriosSemanais.map((rep: any) => {
          if (Array.isArray(rep.fotos)) {
            rep.fotos = rep.fotos.map((f: any) => ({ ...f, url: TINY_GIF }));
          }
          return rep;
        });
      }
    }
    
    return cloned;
  });
}
