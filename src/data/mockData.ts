import { UserProfile, UserRole, Obra, AuditLog, Revision } from "../types";
import { pruneObraForSnapshot, pruneObrasProgressively } from "../utils/compressor";
import { supabaseSaveObras, supabaseSaveAuditLogs, supabaseSaveRevisions } from "../utils/supabaseDb";

// @ts-ignore
import timeline_32_2025 from "../assets/images/timeline_32_2025.svg";
// @ts-ignore
import timeline_07_2024 from "../assets/images/timeline_07_2024.svg";
// @ts-ignore
import timeline_30_2024 from "../assets/images/timeline_30_2024.svg";
// @ts-ignore
import timeline_62_2023 from "../assets/images/timeline_62_2023.svg";
// @ts-ignore
import timeline_28_2024_aditivos from "../assets/images/timeline_28_2024_aditivos.svg";
// @ts-ignore
import timeline_28_2024_apostilamento from "../assets/images/timeline_28_2024_apostilamento.svg";
// @ts-ignore
import timeline_60_2023_monobloco from "../assets/images/timeline_60_2023_monobloco.svg";
// @ts-ignore
import timeline_37_2024 from "../assets/images/timeline_37_2024.svg";
// @ts-ignore
import quanta_capa_marica from "../assets/images/quanta_capa_marica.svg";
// @ts-ignore
import quanta_papel_timbrado from "../assets/images/quanta_papel_timbrado.svg";

export { quanta_capa_marica, quanta_papel_timbrado, timeline_28_2024_apostilamento };

export const INITIAL_USERS: UserProfile[] = [
  {
    id: "user-vinicius",
    name: "Vinicius Cardozo Martins",
    email: "vinicius.martins@quantaconsultoria.com",
    role: UserRole.ADMINISTRADOR
  },
  {
    id: "user-flavio",
    name: "Flávio da Cruz Cabral",
    email: "flavio.cabral@quantaconsultoria.com",
    role: UserRole.ENGENHEIRO_CHEFE
  },
  {
    id: "user-andreia",
    name: "Andreia Ferreira Paula",
    email: "andreia.paula@quantaconsultoria.com",
    role: UserRole.ENGENHEIRO_CHEFE
  },
  {
    id: "user-maria",
    name: "Maria Carolina Madacon",
    email: "maria.madacon@quantaconsultoria.com",
    role: UserRole.ENGENHEIRO_CHEFE
  },
  {
    id: "user-kellen",
    name: "Kellen Cristyan Teixeira",
    email: "kellen.teixeira@quantaconsultoria.com",
    role: UserRole.ENGENHEIRO_CHEFE
  },
  {
    id: "user-luiz-eduardo",
    name: "Luiz Eduardo da Silva Dias",
    email: "luiz.dias@quantaconsultoria.com",
    role: UserRole.ENGENHEIRO_CHEFE
  },
  {
    id: "user-luiz-felipe",
    name: "Luiz Felipe de Medeiros Paiva",
    email: "luiz.paiva@quantaconsultoria.com",
    role: UserRole.ENGENHEIRO_CHEFE
  },
  {
    id: "user-lucia",
    name: "Lúcia Costa",
    email: "lucia.costa@quantaconsultoria.com",
    role: UserRole.ENGENHEIRO_CHEFE
  }
];

export const INITIAL_OBRAS: Obra[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log-1",
    timestamp: "2026-06-12T09:15:30Z",
    userName: "Vinicius Cardozo Martins",
    userEmail: "vinicius.martins@quantaconsultoria.com",
    userRole: UserRole.ADMINISTRADOR,
    acao: "CRIACAO_OBRA",
    descricao: "Cadastrou a obra pioneira TC 60/2022 - Museu Darcy Ribeiro no sistema.",
    obraId: "obra-1",
    obraTitulo: "TC 60/2022 - PENÍNSULA DO SAMBA – MUSEU DARCY RIBEIRO"
  },
  {
    id: "log-2",
    timestamp: "2026-06-13T10:45:00Z",
    userName: "Maria Carolina Madacon",
    userEmail: "maria.madacon@quantaconsultoria.com",
    userRole: UserRole.ENGENHEIRO_CHEFE,
    acao: "ADICIONAR_ADITIVO",
    descricao: "Inseriu o 3º aditivo de prazo (6 meses adicional) na obra TC 60/2022.",
    obraId: "obra-1",
    obraTitulo: "TC 60/2022 - PENÍNSULA DO SAMBA – MUSEU DARCY RIBEIRO"
  },
  {
    id: "log-3",
    timestamp: "2026-06-14T14:22:15Z",
    userName: "Vinicius Cardozo Martins",
    userEmail: "vinicius.martins@quantaconsultoria.com",
    userRole: UserRole.ENGENHEIRO_CHEFE,
    acao: "EDITAR_PROGRESSO",
    descricao: "Atualizou o relatório semanal de 25/05 a 29/05 da obra do Parque Tecnológico.",
    obraId: "obra-2",
    obraTitulo: "TC 62/2023 – PARQUE TECNOLÓGICO"
  }
];

export const INITIAL_REVISIONS: Revision[] = [
  {
    id: "rev-1",
    obraId: "obra-1",
    timestamp: "2026-06-13T10:45:00Z",
    userName: "Maria Carolina Madacon",
    userRole: UserRole.ENGENHEIRO_CHEFE,
    userEmail: "maria.madacon@quantaconsultoria.com",
    campoAlterado: "Aditivos / Prazo Vigência",
    descricao: "Adicionado 3º aditivo de 6 meses. O prazo de vigência contratual atualizado passou para 28 meses.",
    obraSnapshot: "{}"
  }
];

// Helper to initialize and retrieve database from localStorage
export function getSavedObras(): Obra[] {
  try {
    const obras = localStorage.getItem("obras_db");
    if (!obras) {
      localStorage.setItem("obras_db", JSON.stringify(INITIAL_OBRAS));
      return INITIAL_OBRAS;
    }
    const parsed = JSON.parse(obras);
    if (!Array.isArray(parsed)) {
      localStorage.setItem("obras_db", JSON.stringify(INITIAL_OBRAS));
      return INITIAL_OBRAS;
    }
    // No minimum length requirement check as the user explicitly cleared ALL works!
    return parsed;
  } catch (e) {
    console.error("Erro ao carregar obras_db:", e);
    try {
      localStorage.setItem("obras_db", JSON.stringify(INITIAL_OBRAS));
    } catch {}
    return INITIAL_OBRAS;
  }
}

export function saveObras(obras: Obra[]) {
  // Sync to Supabase
  try {
    supabaseSaveObras("ct-026-supervisao", obras).catch((err) => console.warn("Erro Supabase:", err));
  } catch (e) {
    console.warn("Erro ao sincronizar obras com Supabase:", e);
  }

  try {
    localStorage.setItem("obras_db", JSON.stringify(obras));
  } catch (e: any) {
    console.warn("Erro ao salvar obras_db, iniciando tentativas de mitigação de quota do localStorage...", e);
    try {
      // 1. Clear auxiliary databases to recover instant storage space
      localStorage.setItem("revisions_db", "[]");
      const savedLogs = getSavedLogs();
      localStorage.setItem("logs_db", JSON.stringify(savedLogs.slice(0, 5)));
    } catch (clearErr) {
      console.error("Erro ao limpar dados auxiliares:", clearErr);
    }
    
    // 2. Progressive pruning levels
    let success = false;
    for (let level = 1; level <= 4; level++) {
      try {
        console.warn(`Tentando salvar obras com nível de poda ${level} para poupar quota...`);
        const pruned = pruneObrasProgressively(obras, level);
        localStorage.setItem("obras_db", JSON.stringify(pruned));
        success = true;
        console.log(`obras_db salva com sucesso após aplicar redução de nível ${level}!`);
        break;
      } catch (retryError) {
        console.error(`Falha ao salvar obras até o nível ${level} de poda:`, retryError);
      }
    }
    
    if (!success) {
      console.error("Erro fatal e definitivo: Impossível gravar obras_db em localStorage mesmo com poda máxima.");
    }
  }
}

export function getSavedLogs(): AuditLog[] {
  try {
    const logs = localStorage.getItem("logs_db");
    if (!logs) {
      localStorage.setItem("logs_db", JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    const parsed = JSON.parse(logs);
    if (!Array.isArray(parsed)) {
      localStorage.setItem("logs_db", JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    return parsed;
  } catch (e) {
    console.error("Erro ao carregar logs_db:", e);
    try {
      localStorage.setItem("logs_db", JSON.stringify(INITIAL_AUDIT_LOGS));
    } catch {}
    return INITIAL_AUDIT_LOGS;
  }
}

export function saveLogs(logs: AuditLog[]) {
  try {
    supabaseSaveAuditLogs("ct-026-supervisao", logs).catch((err) => console.warn("Erro Supabase logs:", err));
  } catch (e) {
    console.warn("Erro ao sincronizar logs com Supabase:", e);
  }
  try {
    // Keep at most last 50 entries to conserve storage quota
    const cappedLogs = logs.slice(0, 50);
    localStorage.setItem("logs_db", JSON.stringify(cappedLogs));
  } catch (e) {
    console.error("Erro ao salvar logs_db:", e);
    try {
      localStorage.setItem("logs_db", JSON.stringify(logs.slice(0, 10)));
    } catch {}
  }
}

export function getSavedRevisions(): Revision[] {
  try {
    const revisions = localStorage.getItem("revisions_db");
    if (!revisions) {
      localStorage.setItem("revisions_db", JSON.stringify(INITIAL_REVISIONS));
      return INITIAL_REVISIONS;
    }
    const parsed = JSON.parse(revisions);
    if (!Array.isArray(parsed)) {
      localStorage.setItem("revisions_db", JSON.stringify(INITIAL_REVISIONS));
      return INITIAL_REVISIONS;
    }
    
    // Automatically prune and thin down the revisions list on load
    // to instantly reclaim space from previous bloated states
    if (parsed.length > 8 || revisions.length > 300 * 1024) {
      setTimeout(() => {
        try {
          saveRevisions(parsed);
        } catch {}
      }, 100);
    }
    
    return parsed;
  } catch (e) {
    console.error("Erro ao carregar revisions_db:", e);
    try {
      localStorage.setItem("revisions_db", JSON.stringify(INITIAL_REVISIONS));
    } catch {}
    return INITIAL_REVISIONS;
  }
}

export function saveRevisions(revisions: Revision[]) {
  try {
    supabaseSaveRevisions("ct-026-supervisao", revisions).catch((err) => console.warn("Erro Supabase revisions:", err));
  } catch (e) {
    console.warn("Erro ao sincronizar revisões com Supabase:", e);
  }
  try {
    // Keep at most 8 audit history revisions across the platform.
    // Also, sanitize its obraSnapshots (omit raw heavyweight base64 photo lists)
    const capped = revisions.slice(-8).map(rev => {
      if (rev.obraSnapshot && rev.obraSnapshot.length > 5000) {
        try {
          const parsed = JSON.parse(rev.obraSnapshot);
          if (parsed && typeof parsed === "object") {
            const pruned = pruneObraForSnapshot(parsed);
            return {
              ...rev,
              obraSnapshot: JSON.stringify(pruned)
            };
          }
        } catch {
          // fallback to simple string or empty if completely broken
        }
      }
      return rev;
    });

    localStorage.setItem("revisions_db", JSON.stringify(capped));
  } catch (e) {
    console.error("Erro ao salvar revisions_db:", e);
    try {
      // Emergency recovery: clear revisions database
      localStorage.setItem("revisions_db", "[]");
    } catch {}
  }
}

export function getCurrentUser(): UserProfile {
  try {
    const user = localStorage.getItem("current_user");
    if (!user) {
      return INITIAL_USERS[0];
    }
    const parsed = JSON.parse(user);
    if (!parsed || typeof parsed !== "object") {
      return INITIAL_USERS[0];
    }
    
    // If cached current user is Andreia, migrate automatically to Vinicius
    if (parsed.id === "user-andreia" || parsed.email === "andreia.paula@quantaconsultoria.com") {
      return INITIAL_USERS[0];
    }

    return parsed;
  } catch (e) {
    console.error("Erro ao recuperar o usuário atual:", e);
    return INITIAL_USERS[0];
  }
}

export function saveCurrentUser(user: UserProfile) {
  localStorage.setItem("current_user", JSON.stringify(user));
}
