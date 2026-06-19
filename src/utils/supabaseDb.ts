import { supabase } from "./supabaseClient";
import { Obra, AuditLog, Revision, UserProfile, UserRole } from "../types";

/**
 * Resiliently inserts or updates the User Profile in Supabase.
 */
export async function supabaseSaveUserProfile(profile: UserProfile): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_profiles")
      .upsert({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });

    if (error) {
      console.warn("Aviso ao salvar perfil no Supabase (verifique se a tabela 'user_profiles' existe):", error.message);
      // Attempt alternative generic insertion if standard fails
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Erro ao comunicar perfil com o Supabase:", err);
    return false;
  }
}

/**
 * Retrieves a user profile by email from Supabase.
 */
export async function supabaseGetUserProfile(email: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.warn("Erro ao buscar perfil no Supabase:", error.message);
      return null;
    }
    return data as UserProfile | null;
  } catch (err) {
    console.warn("Falha de conexão ao buscar perfil no Supabase:", err);
    return null;
  }
}

/**
 * Saves all user Obras (contratos) to Supabase.
 * Uses a upsert operation. To be resilient to custom/simple tables, it attempts
 * to save both columns and a fallback generic column or separate rows.
 */
export async function supabaseSaveObras(userId: string, obras: Obra[]): Promise<boolean> {
  if (!userId) return false;
  try {
    // We clean up and prepare records. To prevent RLS or schema issues from crashing,
    // we save each item as a resilient record.
    const records = obras.map(obra => ({
      id: obra.id,
      user_id: userId,
      titulo: obra.titulo,
      contrato_no: obra.contratoNo,
      empresa_vencedora: obra.empresaVencedora,
      status_geral: obra.statusGeral,
      percentual_fisico_atual: obra.percentualFisicoAtual,
      valor_contratual_atual: obra.valorContratualAtual,
      full_data: obra, // fallback JSONB field containing entire nested structure
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from("obras")
      .upsert(records, { onConflict: "id" });

    if (error) {
      console.warn("Tabela 'obras' no Supabase pode não estar totalmente estruturada. Sincronizando como backup de payload...", error.message);
      // Fallback: save in a simple dynamic key-value table if standard insert fails
      const { error: fallbackError } = await supabase
        .from("user_sync_backup")
        .upsert({
          user_id: userId,
          key: "obras_db",
          payload: obras,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id,key" });

      if (fallbackError) {
        console.warn("Erro no fallback de sincronização do Supabase:", fallbackError.message);
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn("Falha de rede ou de tabela ao salvar obras no Supabase:", err);
    return false;
  }
}

/**
 * Loads all Obras synchronized for this user from Supabase.
 */
export async function supabaseLoadObras(userId: string): Promise<Obra[] | null> {
  if (!userId) return null;
  try {
    // 1. Try reading from main 'obras' table
    const { data: tblData, error } = await supabase
      .from("obras")
      .select("*")
      .eq("user_id", userId);

    if (!error && tblData && tblData.length > 0) {
      // Reconstruct original structure from full_data JSONB if present, else use columns
      return tblData.map(row => (row.full_data || {
        id: row.id,
        titulo: row.titulo,
        contratoNo: row.contrato_no || "",
        concorrenciaPublicaNo: "",
        processoAdministrativoNo: "",
        dataAssinatura: "",
        dataPublicacaoJOM: "",
        dataOrdemInicio: "",
        empresaVencedora: row.empresa_vencedora || "",
        prazoVigenciaInicial: "",
        prazoExecucaoInicial: "",
        dataInicio: "",
        valorContratualInicial: row.valor_contratual_atual || 0,
        valorContratualAtual: row.valor_contratual_atual || 0,
        prazoVigenciaAtual: "",
        prazoExecucaoAtual: "",
        aditivos: [],
        relatoriosSemanais: [],
        percentualFisicoAtual: row.percentual_fisico_atual || 0,
        statusGeral: row.status_geral || "Em Andamento"
      }) as Obra);
    }

    // 2. Try simple fallback sync backup table
    const { data: backupData, error: backupError } = await supabase
      .from("user_sync_backup")
      .select("payload")
      .eq("user_id", userId)
      .eq("key", "obras_db")
      .maybeSingle();

    if (!backupError && backupData && Array.isArray(backupData.payload)) {
      return backupData.payload as Obra[];
    }
    return null;
  } catch (err) {
    console.warn("Falha de rede ou de tabela ao obter obras do Supabase:", err);
    return null;
  }
}

/**
 * Synchronizes audit logs.
 */
export async function supabaseSaveAuditLogs(userId: string, logs: AuditLog[]): Promise<boolean> {
  if (!userId || logs.length === 0) return false;
  try {
    const records = logs.slice(0, 50).map(log => ({
      id: log.id,
      user_id: userId,
      timestamp: log.timestamp,
      user_name: log.userName,
      user_email: log.userEmail,
      acao: log.acao,
      descricao: log.descricao,
      obra_id: log.obraId,
      full_log: log
    }));

    const { error } = await supabase
      .from("audit_logs")
      .upsert(records, { onConflict: "id" });

    if (error) {
      // Fallback
      await supabase
        .from("user_sync_backup")
        .upsert({
          user_id: userId,
          key: "logs_db",
          payload: logs.slice(0, 50),
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id,key" });
    }
    return true;
  } catch (err) {
    console.warn("Erro ao salvar logs no Supabase:", err);
    return false;
  }
}

/**
 * Loads audit logs.
 */
export async function supabaseLoadAuditLogs(userId: string): Promise<AuditLog[] | null> {
  if (!userId) return null;
  try {
    const { data: tblData, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false });

    if (!error && tblData && tblData.length > 0) {
      return tblData.map(row => row.full_log || {
        id: row.id,
        timestamp: row.timestamp,
        userName: row.user_name,
        userEmail: row.user_email,
        userRole: UserRole.ENGENHEIRO_CHEFE,
        acao: row.acao,
        descricao: row.descricao,
        obraId: row.obra_id
      } as AuditLog);
    }

    const { data: backupData, error: backupError } = await supabase
      .from("user_sync_backup")
      .select("payload")
      .eq("user_id", userId)
      .eq("key", "logs_db")
      .maybeSingle();

    if (!backupError && backupData && Array.isArray(backupData.payload)) {
      return backupData.payload as AuditLog[];
    }
    return null;
  } catch (err) {
    console.warn("Erro ao obter logs do Supabase:", err);
    return null;
  }
}

/**
 * Synchronizes revisions.
 */
export async function supabaseSaveRevisions(userId: string, revisions: Revision[]): Promise<boolean> {
  if (!userId || revisions.length === 0) return false;
  try {
    const records = revisions.slice(0, 8).map(rev => ({
      id: rev.id,
      user_id: userId,
      obra_id: rev.obraId,
      timestamp: rev.timestamp,
      user_name: rev.userName,
      user_email: rev.userEmail,
      campo_alterado: rev.campoAlterado,
      descricao: rev.descricao,
      full_revision: rev
    }));

    const { error } = await supabase
      .from("revisions")
      .upsert(records, { onConflict: "id" });

    if (error) {
      // Fallback
      await supabase
        .from("user_sync_backup")
        .upsert({
          user_id: userId,
          key: "revisions_db",
          payload: revisions.slice(0, 8),
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id,key" });
    }
    return true;
  } catch (err) {
    console.warn("Erro ao salvar revisões no Supabase:", err);
    return false;
  }
}

/**
 * Loads revisions.
 */
export async function supabaseLoadRevisions(userId: string): Promise<Revision[] | null> {
  if (!userId) return null;
  try {
    const { data: tblData, error } = await supabase
      .from("revisions")
      .select("*")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false });

    if (!error && tblData && tblData.length > 0) {
      return tblData.map(row => row.full_revision || {
        id: row.id,
        obraId: row.obra_id,
        timestamp: row.timestamp,
        userName: row.user_name,
        userRole: UserRole.ENGENHEIRO_CHEFE,
        userEmail: row.user_email,
        campoAlterado: row.campo_alterado,
        descricao: row.descricao,
        obraSnapshot: "{}"
      } as Revision);
    }

    const { data: backupData, error: backupError } = await supabase
      .from("user_sync_backup")
      .select("payload")
      .eq("user_id", userId)
      .eq("key", "revisions_db")
      .maybeSingle();

    if (!backupError && backupData && Array.isArray(backupData.payload)) {
      return backupData.payload as Revision[];
    }
    return null;
  } catch (err) {
    console.warn("Erro ao carregar revisões do Supabase:", err);
    return null;
  }
}
