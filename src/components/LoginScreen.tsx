import React, { useState, useEffect } from "react";
import { UserProfile, UserRole } from "../types";
import { getSavedEngineers } from "../utils/auth";
import { supabase } from "../utils/supabaseClient";
import { supabaseSaveUserProfile, supabaseGetUserProfile } from "../utils/supabaseDb";
import { 
  Building2, 
  ShieldCheck, 
  Mail, 
  KeyRound, 
  AlertCircle, 
  Sparkles, 
  Send, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  User, 
  Briefcase 
} from "lucide-react";
import {
  googleSignIn,
  googleLogout,
  getGmailToken,
  getGmailUser,
  sendGmailConfirmation,
  sendGmailLoginNotification
} from "../utils/firebaseAuth";

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

type AuthMode = "login" | "register";

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [engineers, setEngineers] = useState<UserProfile[]>([]);
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register Form States
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerRole, setRegisterRole] = useState<UserRole>(UserRole.ENGENHEIRO_CHEFE);
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");

  // Global UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Real Workspace states
  const [gmailUser, setGmailUser] = useState<any>(getGmailUser());
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [wasRealGmailSent, setWasRealGmailSent] = useState(false);
  const [showEmailReceipt, setShowEmailReceipt] = useState(false);
  const [createdUserPayload, setCreatedUserPayload] = useState<UserProfile | null>(null);

  useEffect(() => {
    const list = getSavedEngineers();
    setEngineers(list);
  }, []);

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

  const handleSupabaseSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    const email = loginEmail.toLowerCase().trim();
    if (!email || !loginPassword) {
      setErrorMsg("Por favor, preencha todos os campos obrigatórios.");
      setIsLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: loginPassword,
      });

      if (authError) {
        throw authError;
      }

      if (authData?.user) {
        // Fetch or create user profile in Supabase
        let profile = await supabaseGetUserProfile(email);
        if (!profile) {
          // If no profile found in Supabase table, look in pre-saved/hardcoded list
          const existingConfig = engineers.find(eng => eng.email.toLowerCase().trim() === email);
          profile = {
            id: authData.user.id,
            name: existingConfig?.name || email.split("@")[0].toUpperCase(),
            email: email,
            role: existingConfig?.role || UserRole.ENGENHEIRO_CHEFE
          };
          // Try to persist it resiliently
          await supabaseSaveUserProfile(profile);
        }

        // Save session data locally
        localStorage.setItem("current_user", JSON.stringify(profile));
        sessionStorage.setItem("auth_session_active", "true");

        // Execute background logging/alert email if configured
        const token = getGmailToken();
        if (token) {
          try {
            await sendGmailLoginNotification(token, profile.email, profile.name, profile.role);
          } catch (gmailErr) {
            console.warn("Sem disparar alerta Gmail de login por restrição de conta:", gmailErr);
          }
        }

        onLoginSuccess(profile);
      } else {
        throw new Error("Erro desconhecido ao obter usuário autenticado.");
      }
    } catch (err: any) {
      console.error("Erro no login Supabase:", err);
      setErrorMsg("Falha na autenticação: " + (err.message || "Senha incorreta ou e-mail inválido. Verifique suas credenciais."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSupabaseSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    const email = registerEmail.toLowerCase().trim();
    if (!registerName.trim() || !email || !registerPassword) {
      setErrorMsg("Por favor, preencha todos os campos de cadastro.");
      setIsLoading(false);
      return;
    }

    if (registerPassword.length < 6) {
      setErrorMsg("A senha deve ter no mínimo 6 dígitos.");
      setIsLoading(false);
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setErrorMsg("As senhas inseridas não coincidem.");
      setIsLoading(false);
      return;
    }

    try {
      // Create user auth in Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: registerPassword,
      });

      if (authError) {
        throw authError;
      }

      if (authData?.user) {
        const newUser: UserProfile = {
          id: authData.user.id,
          name: registerName.trim(),
          email: email,
          role: registerRole
        };

        // Try to register user profile in Supabase table
        await supabaseSaveUserProfile(newUser);

        // Keep as target payload for successful modal visualization
        setCreatedUserPayload(newUser);

        // Check if Gmail token is active to trigger activation confirmation email
        const token = getGmailToken();
        if (token) {
          try {
            const sent = await sendGmailConfirmation(token, newUser.email, newUser.name, newUser.role, registerPassword);
            setWasRealGmailSent(sent);
          } catch (gmailErr) {
            console.warn("Falha ao disparar recebido real Gmail:", gmailErr);
            setWasRealGmailSent(false);
          }
        }

        setSuccessMsg("Conta criada com sucesso no Supabase! Use suas credenciais para efetuar o login.");
        
        // Show confirmation receipt dialog before logging in automatically
        setShowEmailReceipt(true);
      } else {
        throw new Error("Não foi possível autenticar o usuário após o cadastro.");
      }
    } catch (err: any) {
      console.error("Erro no cadastro Supabase:", err);
      setErrorMsg("Não foi possível cadastrar: " + (err.message || "Erro desconhecido. Verifique se este e-mail já está em uso."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReceipt = () => {
    setShowEmailReceipt(false);
    if (createdUserPayload) {
      // Auto populate login email for easier onboarding
      setLoginEmail(createdUserPayload.email);
      setLoginPassword(registerPassword);
      setMode("login");
    }
    // Clear registration fields
    setRegisterName("");
    setRegisterEmail("");
    setRegisterPassword("");
    setRegisterConfirmPassword("");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans select-none" id="auth-panel-wrapper">
      
      {/* Background Decorative Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <div className="inline-flex p-3 rounded-2xl bg-orange-500 text-white shadow-xl shadow-orange-500/10 mb-4 items-center justify-center">
          <Building2 className="h-8 w-8 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white uppercase">CODEMAR</h2>
        <p className="mt-1 text-xs font-semibold tracking-widest text-slate-400 uppercase">
          Painel de Fiscalização & Engenharia
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-800/40 p-1.5 rounded-2xl border border-slate-750 mb-4 gap-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              mode === "login" 
                ? "bg-orange-500 text-white shadow-md shadow-orange-500/10" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Acessar Conta
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              mode === "register" 
                ? "bg-orange-500 text-white shadow-md shadow-orange-500/10" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Criar Nova Conta
          </button>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-700/60 transition-all duration-300">
          
          {errorMsg && (
            <div className="p-3.5 mb-5 bg-red-500/15 border border-red-500/30 text-xs font-medium text-red-400 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 mb-5 bg-emerald-500/15 border border-emerald-500/30 text-xs font-medium text-emerald-400 rounded-xl flex items-start gap-2.5">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-500 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Real Gmail notifications helper segment */}
          <div className="p-3 pr-3.5 mb-5 rounded-2xl border border-slate-700 bg-slate-900/40 flex items-center justify-between text-xs transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`p-2 rounded-xl shrink-0 border ${gmailUser ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"}`}>
                <Mail className="h-4 w-4" />
              </div>
              <div className="min-w-0 text-left">
                <div className="font-bold text-slate-200 flex items-center gap-1.5 leading-tight">
                  Alertas por Gmail Corporativo
                  {gmailUser && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>}
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[150px]">
                  {gmailUser ? `${gmailUser.email}` : "Ative notificações para sua conta."}
                </div>
              </div>
            </div>
            <div className="shrink-0 pl-1">
              {gmailUser ? (
                <button
                  type="button"
                  onClick={handleDisconnectGoogle}
                  className="bg-slate-850 hover:bg-red-950/40 border border-slate-700 hover:border-red-900 text-slate-400 hover:text-red-400 font-bold px-2.5 py-1.5 rounded-xl text-[10px] transition-all cursor-pointer"
                >
                  Sair
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isConnectingGoogle}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-2.5 py-1.5 rounded-xl text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-md border-0"
                >
                  {isConnectingGoogle ? (
                    <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent id-auth-spinner rounded-full animate-spin shrink-0"></span>
                  ) : null}
                  Ativar
                </button>
              )}
            </div>
          </div>

          {/* Mode Login Form */}
          {mode === "login" && (
            <form onSubmit={handleSupabaseSignIn} className="space-y-5 animate-in fade-in duration-200" id="login-form">
              <div className="text-center mb-4">
                <h3 className="text-base font-bold text-slate-100">Autenticação com Supabase</h3>
                <p className="text-xs text-slate-400 mt-1">Conecte-se para puxar seus dados em nuvem</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                  E-mail cadastrado *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="exemplo@quantaconsultoria.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 text-sm bg-slate-900 border border-slate-750 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-200 placeholder-slate-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                  Senha segura *
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 text-sm bg-slate-900 border border-slate-750 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-200 placeholder-slate-600 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-450 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-bold text-xs uppercase py-3.5 px-4 rounded-xl shadow-lg shadow-orange-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  {isLoading ? "Conectando..." : "Realizar Login"}
                </button>
              </div>
            </form>
          )}

          {/* Mode Register Form */}
          {mode === "register" && (
            <form onSubmit={handleSupabaseSignUp} className="space-y-4 animate-in fade-in duration-200" id="register-form">
              <div className="text-center mb-2">
                <h3 className="text-base font-bold text-slate-100">Criar Novo Acesso</h3>
                <p className="text-xs text-slate-400 mt-1">Registre as credenciais corporativas no Supabase</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Nome Completo *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Qual seu nome?"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-900 border border-slate-750 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-200 placeholder-slate-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  E-mail Funcional *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="nome.sobrenome@quantaconsultoria.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-900 border border-slate-750 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-200 placeholder-slate-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Cargo / Função *
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                  <select
                    value={registerRole}
                    onChange={(e) => setRegisterRole(e.target.value as UserRole)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-900 border border-slate-750 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-205 transition-all cursor-pointer"
                  >
                    <option value={UserRole.ADMINISTRADOR}>Administrador</option>
                    <option value={UserRole.ENGENHEIRO_CHEFE}>Engenheiro Chefe</option>
                    <option value={UserRole.ENGENHEIRO_FISCAL}>Engenheiro Fiscal</option>
                    <option value={UserRole.LEITOR}>Leitor / Auditor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Escolha uma senha (mínimo 6 dígitos) *
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 dígitos de segurança"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-900 border border-slate-750 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-200 placeholder-slate-600 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-450 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Confirmar Senha *
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Repita a senha para confirmar"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-900 border border-slate-755 focus:border-orange-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-200 placeholder-slate-650 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-slate-450 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-bold text-xs uppercase py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isLoading ? "Cadastrando..." : "Registrar Conta & Ir para Login"}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      {/* CONFIRMATION EMAIL DIALOG/MODAL ON SUCCESSFUL SIGN UP */}
      {showEmailReceipt && createdUserPayload && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-150 overflow-hidden text-left flex flex-col max-h-[90vh]">
            
            <div className={`px-6 py-4 text-white flex items-center justify-between ${wasRealGmailSent ? "bg-emerald-600" : "bg-orange-500"}`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-widest font-sans">
                  {wasRealGmailSent ? "E-mail de Cadastro Recomendado via Gmail" : "Ativação Concluída no Supabase"}
                </span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${wasRealGmailSent ? "bg-emerald-700" : "bg-orange-600"}`}>
                {wasRealGmailSent ? "Gmail Real" : "Autenticador"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
              
              <div className="border border-slate-200 rounded-2xl bg-white p-4 space-y-2 text-xs text-slate-600 shadow-xs leading-relaxed">
                <div>
                  <strong className="text-slate-800">De: </strong> 
                  <span className="font-mono">eng-security@quantaconsultoria.com (CODEMAR Segurança)</span>
                </div>
                <div>
                  <strong className="text-slate-800">Para: </strong> 
                  <span className="font-mono text-indigo-650 font-bold">{createdUserPayload.email}</span>
                </div>
                <div>
                  <strong className="text-slate-800">Assunto: </strong> 
                  <span className="font-semibold text-slate-800 text-xs">Ativação de Nova Conta de Engenharia - CODEMAR & Supabase</span>
                </div>
                {wasRealGmailSent && (
                  <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 mt-1 flex items-center gap-1.5 font-sans">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0"></span>
                    E-mail disparado via API do Google Gmail com sucesso!
                  </div>
                )}
                <div className="pt-1 text-[10px] text-slate-400 font-sans">
                  Data de Envio: {new Date().toLocaleString("pt-BR")} (UTC-3)
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-xs leading-relaxed">
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
                  <div className="p-2 bg-orange-50 text-orange-500 rounded-lg">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wide text-slate-700">COORDENAÇÃO DE ENGENHARIA</h5>
                    <p className="text-[10px] font-semibold text-orange-500">CODEMAR S/A</p>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs text-slate-600 font-sans">
                  <p>Prezado(a) <strong className="text-slate-800">{createdUserPayload.name}</strong>,</p>
                  <p>
                    Confirmamos que seu cadastro de acesso no <strong>Painel de Fiscalização de Engenharia CODEMAR</strong> foi criado com sucesso usando seu e-mail funcional, com persistência direta e sincronizada no <strong>Supabase</strong>.
                  </p>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 my-2.5 space-y-2">
                    <div className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">RESUMO DAS CREDENCIAIS:</div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-500 font-semibold">Login (E-mail):</span>
                      <span className="col-span-2 font-mono text-slate-800 font-bold">{createdUserPayload.email}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-500 font-semibold">Perfil de Acesso:</span>
                      <span className="col-span-2 font-bold text-slate-800">{createdUserPayload.role}</span>
                    </div>
                  </div>

                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    * Memorize sua senha e vá para a tela de login para conectar suas instâncias e iniciar a sincronização automática.
                  </p>
                </div>
              </div>

            </div>

            <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex justify-between items-center shrink-0">
              <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 font-sans">
                <Send className="h-3 w-3 text-emerald-500" />
                Dados registrados no Supabase!
              </span>
              <button
                onClick={handleConfirmReceipt}
                className="text-white font-bold text-xs uppercase py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 transition-all shadow-md cursor-pointer border-0"
              >
                Ir para o Login e Acessar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
