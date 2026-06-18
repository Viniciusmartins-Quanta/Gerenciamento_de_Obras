import { UserProfile, UserRole } from "../types";
import { INITIAL_USERS } from "../data/mockData";

/**
 * Retrieves the unified list of registered engineers.
 * Handles migration from legacy custom_engineers to active_engineers_list.
 */
export function getSavedEngineers(): UserProfile[] {
  try {
    const listStr = localStorage.getItem("active_engineers_list");
    if (listStr) {
      return JSON.parse(listStr);
    }
    
    // Legacy compatibility check
    const customStr = localStorage.getItem("custom_engineers");
    const initialList = customStr 
      ? [...INITIAL_USERS, ...JSON.parse(customStr)]
      : INITIAL_USERS;
    
    localStorage.setItem("active_engineers_list", JSON.stringify(initialList));
    return initialList;
  } catch (err) {
    console.error("Erro ao carregar lista de engenheiros:", err);
    return INITIAL_USERS;
  }
}

/**
 * Saves the list of registered engineers.
 */
export function saveSavedEngineers(engineers: UserProfile[]) {
  try {
    localStorage.setItem("active_engineers_list", JSON.stringify(engineers));
    
    // Also mirror to custom_engineers excluding INITIAL_USERS for backwards compatibility
    const initialIds = new Set(INITIAL_USERS.map(u => u.id));
    const customOnly = engineers.filter(u => !initialIds.has(u.id));
    localStorage.setItem("custom_engineers", JSON.stringify(customOnly));
  } catch (err) {
    console.error("Erro ao salvar engenheiros:", err);
  }
}

/**
 * Returns a dictionary of user passwords indexed by lowercased email.
 */
export function getUserPasswords(): Record<string, string> {
  try {
    const data = localStorage.getItem("user_passwords_db");
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Checks if a user email has any configured password.
 */
export function userHasPassword(email: string): boolean {
  const pswds = getUserPasswords();
  const key = email.toLowerCase().trim();
  return !!pswds[key];
}

/**
 * Validates a password against the stored password for an email.
 */
export function validateUserPassword(email: string, password: string): boolean {
  const pswds = getUserPasswords();
  const key = email.toLowerCase().trim();
  const stored = pswds[key];
  if (!stored) return false;
  return stored === password;
}

/**
 * Saves or updates a password for a user.
 */
export function saveUserPassword(email: string, password: string) {
  try {
    const pswds = getUserPasswords();
    const key = email.toLowerCase().trim();
    pswds[key] = password;
    localStorage.setItem("user_passwords_db", JSON.stringify(pswds));
  } catch (err) {
    console.error("Erro ao salvar senha:", err);
  }
}

/**
 * Deletes a user by ID from the active engineers list and triggers updates.
 */
export function deleteUserFromDB(userId: string): UserProfile[] {
  const currentList = getSavedEngineers();
  const updated = currentList.filter(u => u.id !== userId);
  saveSavedEngineers(updated);
  return updated;
}
