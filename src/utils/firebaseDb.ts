import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  getDoc,
  deleteDoc,
  writeBatch,
  onSnapshot
} from "firebase/firestore";
import { db, auth } from "./firebaseAuth";
import { Obra, AuditLog, Revision } from "../types";
import { INITIAL_OBRAS } from "../data/mockData";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('[Firestore Error Details]: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Fetch all works from Firestore with automatic schema validation.
 */
export async function getOnlineObras(): Promise<Obra[] | null> {
  const path = "obras";
  try {
    const qSnapshot = await getDocs(collection(db, path));
    if (qSnapshot.empty) {
      return [];
    }
    const list: Obra[] = [];
    qSnapshot.forEach((doc) => {
      list.push(doc.data() as Obra);
    });
    return list;
  } catch (error) {
    console.warn("Firestore inacessível ou sem permissão de leitura de obras; utilizando cache local.", error);
    // Silent fail for fallback
    return null;
  }
}

/**
 * Synchronize and upload works database to Firestore in a single batch.
 */
export async function syncObrasToCloud(obras: Obra[]): Promise<boolean> {
  if (obras.length === 0) return true;
  const path = "obras";
  try {
    const batch = writeBatch(db);
    obras.forEach((obra) => {
      const docRef = doc(db, path, obra.id);
      batch.set(docRef, obra, { merge: true });
    });
    await batch.commit();
    console.log(`[Firestore Database] Sincronização em nuvem bem-sucedida! ${obras.length} obras atualizadas.`);
    return true;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch (formattedError) {
      console.error(formattedError);
    }
    return false;
  }
}

/**
 * Saves or updates an individual work in Firestore.
 */
export async function saveIndividualObraOnline(obra: Obra): Promise<boolean> {
  const path = `obras/${obra.id}`;
  try {
    await setDoc(doc(db, "obras", obra.id), obra, { merge: true });
    return true;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch (formattedError) {
      console.error(formattedError);
    }
    return false;
  }
}

/**
 * Deletes an individual work from Firestore.
 */
export async function deleteIndividualObraOnline(obraId: string): Promise<boolean> {
  const path = `obras/${obraId}`;
  try {
    await deleteDoc(doc(db, "obras", obraId));
    console.log(`[Firestore Database] Obra ${obraId} removida com sucesso da nuvem.`);
    return true;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.DELETE, path);
    } catch (formattedError) {
      console.error(formattedError);
    }
    return false;
  }
}

/**
 * Fetch all audit logs from Firestore.
 */
export async function getOnlineLogs(): Promise<AuditLog[] | null> {
  const path = "auditLogs";
  try {
    const qSnapshot = await getDocs(collection(db, path));
    if (qSnapshot.empty) return [];
    const list: AuditLog[] = [];
    qSnapshot.forEach((doc) => {
      list.push(doc.data() as AuditLog);
    });
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.warn("Firestore offline ou sem permissão para logs de auditoria; usando local.", error);
    return null;
  }
}

/**
 * Saves a single audit log to Firestore.
 */
export async function saveIndividualLogOnline(log: AuditLog): Promise<boolean> {
  const path = `auditLogs/${log.id}`;
  try {
    await setDoc(doc(db, "auditLogs", log.id), log);
    return true;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.CREATE, path);
    } catch (formattedError) {
      console.error(formattedError);
    }
    return false;
  }
}

/**
 * Sync audit logs in batch to Firestore cloud.
 */
export async function syncLogsToCloud(logs: AuditLog[]): Promise<boolean> {
  if (logs.length === 0) return true;
  const path = "auditLogs";
  try {
    const batch = writeBatch(db);
    logs.forEach((log) => {
      const docRef = doc(db, path, log.id);
      batch.set(docRef, log);
    });
    await batch.commit();
    return true;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, path);
    } catch (formattedError) {
      console.error(formattedError);
    }
    return false;
  }
}

/**
 * Fetch all rollback revisions from Firestore.
 */
export async function getOnlineRevisions(): Promise<Revision[] | null> {
  const path = "revisions";
  try {
    const qSnapshot = await getDocs(collection(db, path));
    if (qSnapshot.empty) return [];
    const list: Revision[] = [];
    qSnapshot.forEach((doc) => {
      list.push(doc.data() as Revision);
    });
    return list;
  } catch (error) {
    console.warn("Firestore offline ou sem permissão para revisões históricas.", error);
    return null;
  }
}

/**
 * Saves a single revision snapshot to Firestore.
 */
export async function saveIndividualRevisionOnline(revision: Revision): Promise<boolean> {
  const path = `revisions/${revision.id}`;
  try {
    await setDoc(doc(db, "revisions", revision.id), revision);
    return true;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.CREATE, path);
    } catch (formattedError) {
      console.error(formattedError);
    }
    return false;
  }
}

/**
 * Sets up a continuous live listener on the obras collection.
 */
export function listenToCloudObras(onUpdate: (obras: Obra[]) => void) {
  const path = "obras";
  return onSnapshot(collection(db, path), (qSnapshot) => {
    if (qSnapshot.empty) return;
    const list: Obra[] = [];
    qSnapshot.forEach((doc) => {
      list.push(doc.data() as Obra);
    });
    onUpdate(list);
  }, (error) => {
    console.warn("Erro no listener de obras do Firestore (modo offline ou sem acesso):", error);
  });
}

/**
 * Sets up a continuous live listener on the auditLogs collection.
 */
export function listenToCloudLogs(onUpdate: (logs: AuditLog[]) => void) {
  const path = "auditLogs";
  return onSnapshot(collection(db, path), (qSnapshot) => {
    if (qSnapshot.empty) return;
    const list: AuditLog[] = [];
    qSnapshot.forEach((doc) => {
      list.push(doc.data() as AuditLog);
    });
    onUpdate(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  }, (error) => {
    console.warn("Erro no listener de logs do Firestore:", error);
  });
}

/**
 * Sets up a continuous live listener on the revisions collection.
 */
export function listenToCloudRevisions(onUpdate: (revisions: Revision[]) => void) {
  const path = "revisions";
  return onSnapshot(collection(db, path), (qSnapshot) => {
    if (qSnapshot.empty) return;
    const list: Revision[] = [];
    qSnapshot.forEach((doc) => {
      list.push(doc.data() as Revision);
    });
    onUpdate(list);
  }, (error) => {
    console.warn("Erro no listener de revisões do Firestore:", error);
  });
}
