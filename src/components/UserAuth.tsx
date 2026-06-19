import React, { useState, useEffect } from "react";
import { UserProfile, UserRole } from "../types";
import { 
  getSavedEngineers, 
  saveSavedEngineers, 
  userHasPassword, 
  saveUserPassword, 
  validateUserPassword, 
  deleteUserFromDB 
} from "../utils/auth";
import { 
  Shield, Sparkles, User, RefreshCw, UserPlus, Trash2, 
  KeyRound, AlertCircle, Eye, EyeOff, Send, CheckCircle2, Building2,
  Mail
} from "lucide-react";
import {
  googleSignIn,
  googleLogout,
  getGmailToken,
  getGmailUser,
  sendGmailConfirmation
} from "../utils/firebaseAuth";

interface UserAuthProps {
  currentUser: UserProfile;
  onUserChange: (user: UserProfile) => void;
  onUserCreated: (user: UserProfile) => void;
}

export default function UserAuth({ currentUser, onUserChange, onUserCreated }: UserAuthProps) {
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.ENGENHEIRO_FISCAL);

  const [savedEngineers, setSavedEngineers] = useState<UserProfile[]>([]);

  // State for Switch Profile Password Verification
  const [selectedUserToSwitch, setSelectedUserToSwitch] = useState<UserProfile | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [switchPassword, setSwitchPassword] = useState("");
  const [switchConfirmPassword, setSwitchConfirmPassword] = useState("");
  const [switchError, setSwitchError] = useState("");
  const [showSwitchPasswordFields, setShowSwitchPasswordFields] = useState(false);
  const [isNewUserSetup, setIsNewUserSetup] = useState(false);
  const [showSwitchPassword, setShowSwitchPassword] = useState(false);
  const [showSwitchConfirmPassword, setShowSwitchConfirmPassword] = useState(false);

  // Email simulation states
  const [isDispatchingEmail, setIsDispatchingEmail] = useState(false);
  const [showEmailReceipt, setShowEmailReceipt] = useState(false);
  const [showSwitchedReceiptPassword, setShowSwitchedReceiptPassword] = useState(false);

  // Gmail integration states
  const [gmailUser, setGmailUser] = useState<any>(getGmailUser());
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [wasRealGmailSent, setWasRealGmailSent] = useState(false);

  useEffect(() => {
    setSavedEngineers(getSavedEngineers());
  }, [showSwitchModal]);

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setGmailUser(res.user);
      }
    } catch (err: any) {
      alert("Falha ao integrar com Google: " + err.message);
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    await googleLogout();
    setGmailUser(null);
  };

  const handleCreateEngineer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    const newEng: UserProfile = {
      id: "eng-" + Date.now(),
      name: newUserName,
      email: newUserEmail,
      role: newUserRole
    };

    const updatedList = [...savedEngineers, newEng];
    saveSavedEngineers(updatedList);
    setSavedEngineers(updatedList);
    
    onUserCreated(newEng);

    // Reset Form
    setNewUserName("");
    setNewUserEmail("");
    setNewUserRole(UserRole.ENGENHEIRO_FISCAL);
    setShowCreateModal(false);
    setShowSwitchModal(true);
  };

  const handleDeleteUser = (e: React.MouseEvent, userToDelete: UserProfile) => {
    e.stopPropagation(); // Avoid triggering switch profile onClick
    const confirmed = window.confirm(
      `Tem certeza absoluta de que deseja excluir o usuário "${userToDelete.name}"?\nEsta ação removerá permanentemente as permissões do e-mail ${userToDelete.email}.`
    );
    if (confirmed) {
      const updated = deleteUserFromDB(userToDelete.id);
      setSavedEngineers(updated);
      
      // If the admin deleted themselves (highly unlikely/avoided), trigger fallback
      if (currentUser.id === userToDelete.id) {
        if (updated.length > 0) {
          onUserChange(updated[0]);
        }
      }
    }
  };

  const handleSelectUser = (user: UserProfile) => {
    // If selecting current active profile, just close
    if (user.id === currentUser.id) {
      setShowSwitchModal(false);
      return;
    }

    // Switch profile immediately without password verification
    onUserChange(user);
    setShowSwitchModal(false);
  };

  const handleConfirmSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    setSwitchError("");

    if (!selectedUserToSwitch) return;

    if (isNewUserSetup) {
      // First access configuration
      if (switchPassword.length < 6) {
        setSwitchError("A senha deve ter no mínimo 6 dígitos.");
        return;
      }
      if (switchPassword !== switchConfirmPassword) {
        setSwitchError("As senhas informadas não coincidem.");
        return;
      }

      // Save password
      saveUserPassword(selectedUserToSwitch.email, switchPassword);

      setIsDispatchingEmail(true);

      const token = getGmailToken();
      if (token) {
        // Send actual Gmail via the authorized account Google API
        sendGmailConfirmation(
          token,
          selectedUserToSwitch.email,
          selectedUserToSwitch.name,
          selectedUserToSwitch.role,
          switchPassword
        ).then((success) => {
          setIsDispatchingEmail(false);
          setWasRealGmailSent(success);
          setShowEmailReceipt(true);
        }).catch((err) => {
          console.error("Erro no envio do Gmail real:", err);
          setIsDispatchingEmail(false);
          setWasRealGmailSent(false);
          setShowEmailReceipt(true);
        });
      } else {
        // Simulated fallback notification
        setTimeout(() => {
          setIsDispatchingEmail(false);
          setWasRealGmailSent(false);
          setShowEmailReceipt(true);
        }, 1550);
      }

    } else {
      // Normal validation
      const isValid = validateUserPassword(selectedUserToSwitch.email, switchPassword);
      if (!isValid) {
        setSwitchError("Senha incorreta. Verifique os dados e tente novamente.");
        return;
      }

      // Switch success
      onUserChange(selectedUserToSwitch);
      setShowPasswordPrompt(false);
      setShowSwitchModal(false);
    }
  };

  const handleConfirmReceipt = () => {
    setShowEmailReceipt(false);
    setShowPasswordPrompt(false);
    setShowSwitchModal(false);
    setShowSwitchedReceiptPassword(false);
    if (selectedUserToSwitch) {
      onUserChange(selectedUserToSwitch);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMINISTRADOR:
        return "bg-rose-100 text-rose-800 border-rose-300";
      case UserRole.ENGENHEIRO_CHEFE:
        return "bg-amber-100 text-amber-800 border-amber-300";
      case UserRole.ENGENHEIRO_FISCAL:
        return "bg-blue-100 text-blue-800 border-blue-300";
      case UserRole.LEITOR:
        return "bg-slate-100 text-slate-800 border-slate-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="relative w-full shadow-xs" id="user-auth-panel">
      {/* Active User Badge Bar */}
      <div className="flex items-center gap-3 w-full">
        <div 
          onClick={() => setShowSwitchModal(true)}
          className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/60 p-3 rounded-xl cursor-pointer hover:bg-slate-800 hover:border-slate-600 shadow-sm transition-all text-left w-full"
        >
          <div className="p-2 rounded-lg bg-slate-700/60 text-slate-300 shrink-0">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 w-full">
            <div className="text-[9px] uppercase font-bold tracking-wider text-slate-500 leading-none mb-1">Engenheiro Ativo</div>
            <div className="font-semibold text-xs text-slate-100 truncate">{currentUser.name}</div>
            <div className="text-[9px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="truncate">{currentUser.role}</span>
            </div>
          </div>
          <RefreshCw className="h-3.5 w-3.5 text-slate-400 hover:text-slate-350 shrink-0 self-center" />
        </div>
      </div>

      {/* SWITCH PROFILE MODAL */}
      {showSwitchModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200" id="switch-user-modal">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-indigo-500" />
                  Controle de Acesso / Perfis
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Selecione um engenheiro registrado. Troque de perfil instantaneamente com um clique.
                </p>
              </div>
              <button 
                onClick={() => setShowSwitchModal(false)}
                className="text-slate-450 hover:text-slate-650 text-sm font-semibold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* GOOGLE WORKSPACE GMAIL STATUS MODULE */}
            <div className="mb-4 p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs transition-all">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-1.5 rounded-lg shrink-0 ${gmailUser ? "bg-emerald-100 text-emerald-700" : "bg-indigo-50 text-indigo-650"}`}>
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5">
                    Notificações Gmail real
                    {gmailUser && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {gmailUser 
                      ? `${gmailUser.email}` 
                      : "Mensagens enviadas apenas de simulador."}
                  </div>
                </div>
              </div>
              <div className="shrink-0 pl-2">
                {gmailUser ? (
                  <button
                    type="button"
                    onClick={handleDisconnectGoogle}
                    className="bg-white hover:bg-red-50 border border-slate-200 text-red-650 font-bold px-2.5 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs shrink-0"
                  >
                    Desconectar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    disabled={isConnectingGoogle}
                    className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-xs shrink-0"
                  >
                    {isConnectingGoogle ? (
                      <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0"></span>
                    ) : null}
                    Ativar Gmail Real
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2 my-4 max-h-[300px] overflow-y-auto pr-1">
              {savedEngineers.map((user) => {
                const isSelected = user.id === currentUser.id;
                const userHasPw = userHasPassword(user.email);
                const isAdminPrivilege = currentUser.role === UserRole.ADMINISTRADOR;
                
                return (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected 
                        ? "bg-slate-50 border-slate-900 ring-2 ring-slate-900/5 shadow-sm" 
                        : "bg-white border-slate-200 hover:bg-slate-50/50 hover:border-slate-300"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-800 truncate">{user.name}</span>
                      </div>
                      <div className="text-slate-450 text-[10px] truncate font-mono mt-0.5">{user.email}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold border ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                      
                      {/* Delete user button - restricted strictly to Administrator role */}
                      {isAdminPrivilege && !isSelected && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteUser(e, user)}
                          title="Excluir Usuário"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setShowSwitchModal(false);
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                Cadastrar Novo Engenheiro
              </button>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-650 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD PROMPT MODAL OVERLAY */}
      {showPasswordPrompt && selectedUserToSwitch && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <form 
            onSubmit={handleConfirmSwitch}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-150 animate-in fade-in zoom-in duration-200 text-left"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-150 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  {isNewUserSetup ? "Primeiro Acesso" : "Troca de Perfil Orgânica"}
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-2">
                  Confirmar Identidade
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Insira as credenciais para trocar o perfil ativo para <strong className="text-slate-700">{selectedUserToSwitch.name}</strong>.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setShowPasswordPrompt(false)}
                className="text-slate-405 hover:text-slate-655 text-sm font-semibold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {switchError && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 text-xs font-medium text-red-600 rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{switchError}</span>
              </div>
            )}

            <div className="space-y-4 my-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                  E-mail do Usuário
                </label>
                <input 
                  type="text" 
                  disabled 
                  value={selectedUserToSwitch.email}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-mono text-slate-450"
                />
              </div>

              {isNewUserSetup ? (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-150 rounded-xl text-amber-800 text-xs leading-relaxed">
                    🌟 <strong>Aviso de Ativação:</strong> Este engenheiro ainda não possui senha configurada. Defina uma senha de segurança (mínimo de 6 dígitos) para este e-mail.
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">Definir Nova Senha *</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type={showSwitchPassword ? "text" : "password"}
                        required
                        minLength={6}
                        maxLength={50}
                        placeholder="Mínimo 6 caracteres"
                        value={switchPassword}
                        onChange={(e) => setSwitchPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-650 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSwitchPassword(!showSwitchPassword)}
                        className="absolute right-3 top-2 text-slate-450 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        {showSwitchPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">Repetir Senha *</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type={showSwitchConfirmPassword ? "text" : "password"}
                        required
                        minLength={6}
                        maxLength={50}
                        placeholder="Confirme a nova senha"
                        value={switchConfirmPassword}
                        onChange={(e) => setSwitchConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-650 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSwitchConfirmPassword(!showSwitchConfirmPassword)}
                        className="absolute right-3 top-2 text-slate-450 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        {showSwitchConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">Digite sua senha existente</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showSwitchPassword ? "text" : "password"}
                      required
                      placeholder="••••••"
                      value={switchPassword}
                      onChange={(e) => setSwitchPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-650 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSwitchPassword(!showSwitchPassword)}
                      className="absolute right-3 top-2 text-slate-450 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showSwitchPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                type="button"
                onClick={() => setShowPasswordPrompt(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold py-2 px-4 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`text-white text-xs font-bold py-2 px-5 rounded-xl transition-all shadow-sm cursor-pointer ${
                  isNewUserSetup ? "bg-emerald-600 hover:bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-500"
                }`}
              >
                {isNewUserSetup ? "Registrar & Trocar Perfil" : "Trocar Perfil"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SIMULATED EMAIL CONFIRMATION DISPATCH WRAP */}
      {isDispatchingEmail && (
        <div className="fixed inset-0 bg-slate-950/80 z-55 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h4 className="text-lg font-black text-white uppercase tracking-wider">Vinculando Senha Segura...</h4>
            <p className="text-xs text-slate-450 mt-1 max-w-xs leading-relaxed font-sans">
              Segurança ativada. Enviando as credenciais para o e-mail de confirmação funcional...
            </p>
          </div>
        </div>
      )}

      {/* SIMULATED INBOX RECEIPT MODAL AT PROFILE SWITCH */}
      {showEmailReceipt && selectedUserToSwitch && (
        <div className="fixed inset-0 bg-slate-950/80 z-55 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-150 overflow-hidden text-left flex flex-col max-h-[90vh]">
            
            <div className={`px-6 py-4 text-white flex items-center justify-between shrink-0 ${wasRealGmailSent ? "bg-emerald-600" : "bg-orange-500"}`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-widest font-sans">
                  {wasRealGmailSent ? "Confirmação de Senha Enviada via Gmail" : "Confirmação de Senha Enviada"}
                </span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${wasRealGmailSent ? "bg-emerald-700" : "bg-orange-600"}`}>
                {wasRealGmailSent ? "Gmail Real" : "Simulador"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-55 space-y-4">
              <div className="border border-slate-200 rounded-2xl bg-white p-4 space-y-1.5 text-xs text-slate-600">
                <div><strong>Para:</strong> <span className="font-mono text-indigo-700 font-bold">{selectedUserToSwitch.email}</span></div>
                <div><strong>De:</strong> <span className="font-mono">{wasRealGmailSent && gmailUser ? gmailUser.email : "eng-security@quantaconsultoria.com"}</span></div>
                <div><strong>Assunto:</strong> <span className="font-semibold text-slate-800">Ativação de Acesso & Credenciais de Engenharia - CODEMAR</span></div>
                {wasRealGmailSent && (
                  <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0"></span>
                    E-mail disparado via API do Google Gmail com sucesso!
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-2xl bg-white p-5">
                <p className="text-xs text-slate-600">Prezado(a) <strong>{selectedUserToSwitch.name}</strong>,</p>
                <p className="text-xs text-slate-600 mt-2">
                  Confirmamos que sua conta foi ativada e novas credenciais foram geradas com sucesso para este perfil.
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 my-3 text-xs space-y-1.5">
                  <div><strong>E-mail Login:</strong> <span className="font-mono text-slate-800 font-semibold">{selectedUserToSwitch.email}</span></div>
                  <div className="flex items-center gap-2">
                    <strong>Senha Registrada:</strong> 
                    <span className="font-mono text-emerald-750 font-black tracking-widest bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 select-none">
                      {showSwitchedReceiptPassword ? switchPassword : "••••••"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSwitchedReceiptPassword(!showSwitchedReceiptPassword)}
                      className="p-1 px-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors cursor-pointer flex items-center justify-center"
                      title={showSwitchedReceiptPassword ? "Ocultar Senha" : "Ver Senha"}
                    >
                      {showSwitchedReceiptPassword ? <EyeOff className="h-3.5 w-3.5 text-slate-500" /> : <Eye className="h-3.5 w-3.5 text-slate-500" />}
                    </button>
                  </div>
                  <div><strong>Função Técnica:</strong> <span className="font-semibold text-slate-800">{selectedUserToSwitch.role}</span></div>
                </div>

                <p className="text-[10px] text-slate-450 italic mt-3">
                  CODEMAR Engenharia Geral - Segurança Corporativa
                </p>
              </div>
            </div>

            <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={handleConfirmReceipt}
                className={`text-white font-bold text-xs uppercase py-2.5 px-5 rounded-xl transition-all shadow-md cursor-pointer ${
                  wasRealGmailSent ? "bg-emerald-600 hover:bg-emerald-500" : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                Concluir & Conectar Perfil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <form 
            onSubmit={handleCreateEngineer}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200 text-left"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-emerald-500" />
                  Cadastrar Engenheiro / Operador
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Adicione profissionais autorizados para realizar lançamentos técnicos ou auditoria no painel.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowSwitchModal(true);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 my-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="Ex: Eng. André Albuquerque"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email Profissional *</label>
                <input
                  type="email"
                  required
                  maxLength={100}
                  placeholder="Ex: andre.albuquerque@fiscal.com.br"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Perfil de Acesso / Função *</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-sans"
                >
                  <option value={UserRole.ENGENHEIRO_FISCAL}>Engenheiro Fiscal (Lançamentos semanais)</option>
                  <option value={UserRole.ENGENHEIRO_CHEFE}>Engenheiro Chefe (Lançamentos + Aditivos)</option>
                  <option value={UserRole.ADMINISTRADOR}>Administrador Geral (Acesso Irrestrito)</option>
                  <option value={UserRole.LEITOR}>Leitor / Auditor (Apenas visualização)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowSwitchModal(true);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 px-5 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Salvar Engenheiro
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
