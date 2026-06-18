/**
 * Compresses an image in base64 or File format using an HTML Canvas downsizer.
 * Reduces raw megabyte-sized uploads directly down to tiny sizes (30KB to 90KB)
 * for safe, continuous storage in localStorage.
 */
export function compressImage(
  fileOrBase64: File | string,
  maxWidth = 800,
  maxHeight = 600,
  quality = 0.7
): Promise<string> {
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
    
    // Check and remove large chronology base64 string
    if (cloned.imagemCronologia && cloned.imagemCronologia.length > 2000) {
      cloned.imagemCronologia = "[Imagem Omitida para Conservar Memória Local]";
    }
    
    // Prune report covers and photo lists
    if (Array.isArray(cloned.relatoriosSemanais)) {
      cloned.relatoriosSemanais = cloned.relatoriosSemanais.map((rep: any) => {
        if (rep.fotoCapa && rep.fotoCapa.length > 2000) {
          rep.fotoCapa = "[Capa Omitida]";
        }
        if (Array.isArray(rep.fotos)) {
          rep.fotos = rep.fotos.map((foto: any) => {
            if (foto.url && foto.url.length > 2000) {
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
    
    if (level >= 1) {
      // Level 1: Replace chronology image with tiny GIF if it is larger than 100KB,
      // and do same for extremely large (>100KB) weekly report images
      if (cloned.imagemCronologia && cloned.imagemCronologia.length > 100000) {
        cloned.imagemCronologia = TINY_GIF;
      }
      if (Array.isArray(cloned.relatoriosSemanais)) {
        cloned.relatoriosSemanais = cloned.relatoriosSemanais.map((rep: any) => {
          if (rep.fotoCapa && rep.fotoCapa.length > 100000) {
            rep.fotoCapa = TINY_GIF;
          }
          if (Array.isArray(rep.fotos)) {
            rep.fotos = rep.fotos.map((f: any) => {
              if (f.url && f.url.length > 100000) {
                return { ...f, url: TINY_GIF };
              }
              return f;
            });
          }
          return rep;
        });
      }
    }
    
    if (level >= 2) {
      // Level 2: Completely replace all chronology images and report covers with tiny GIF or undefined
      cloned.imagemCronologia = undefined;
      if (Array.isArray(cloned.relatoriosSemanais)) {
        cloned.relatoriosSemanais = cloned.relatoriosSemanais.map((rep: any) => {
          rep.fotoCapa = undefined;
          return rep;
        });
      }
    }
    
    if (level >= 3) {
      // Level 3: Keep photos only for the 2 most recent weekly reports, replace older ones with tiny transparent GIF
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
      // Level 4: Strip ALL photos and covers from ALL weekly reports, keeping only text lists (which are tiny)
      if (Array.isArray(cloned.relatoriosSemanais)) {
        cloned.relatoriosSemanais = cloned.relatoriosSemanais.map((rep: any) => {
          rep.fotoCapa = undefined;
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
