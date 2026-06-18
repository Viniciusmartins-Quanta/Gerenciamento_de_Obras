import React, { useState, useEffect } from "react";
import { UserProfile, UserRole } from "../types";
import { getSavedEngineers, userHasPassword, saveUserPassword, validateUserPassword } from "../utils/auth";
import { Building2, ShieldCheck, Mail, KeyRound, AlertCircle, Sparkles, Send, Eye, EyeOff, CheckCircle2 } from "lucide-react";
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

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [engineers, setEngineers] = useState<UserProfile[]>([]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [step, setStep] = useState<"find_email" | "password_entry" | "create_password" | "direct_login">(() => {
    return localStorage.getItem("app_has_accessed_before") === "true" ? "direct_login" : "find_email";
  });
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showReceiptPassword, setShowReceiptPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // States for unified email+password direct login
  const [directEmail, setDirectEmail] = useState("");
  const [directPassword, setDirectPassword] = useState("");
  
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  
  // Loading & simulated dispatch states
  const [isDispatchingEmail, setIsDispatchingEmail] = useState(false);
  const [showEmailReceipt, setShowEmailReceipt] = useState(false);

  // Real Workspace states
  const [gmailUser, setGmailUser] = useState<any>(getGmailUser());
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [wasRealGmailSent, setWasRealGmailSent] = useState(false);
  const [isSendingLoginEmail, setIsSendingLoginEmail] = useState(false);
  const [wasLoginEmailSent, setWasLoginEmailSent] = useState(false);

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

  useEffect(() => {
    const list = getSavedEngineers();
    setEngineers(list);
    if (list.length > 0) {
      setSelectedEmail(list[0].email);
    }
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    
    const emailToVerify = (customEmail.trim() || selectedEmail).toLowerCase().trim();
    if (!emailToVerify) {
      setErrorMsg("Por favor, selecione ou insira um e-mail.");
      return;
    }

    const user = engineers.find(u => u.email.toLowerCase().trim() === emailToVerify);
    if (!user) {
      setErrorMsg("E-mail não cadastrado. Verifique a grafia ou entre em contato com o Administrador.");
      return;
    }

    setTargetUser(user);
    
    // Check if user has password
    const hasPwd = userHasPassword(emailToVerify);
    if (!hasPwd) {
      setStep("create_password");
    } else {
      setStep("password_entry");
    }
  };

  const handleCreatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!targetUser) return;

    if (password.length < 6) {
      setErrorMsg("A senha deve ter no mínimo 6 dígitos.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("As senhas não coincidem.");
      return;
    }

    // Save Password
    saveUserPassword(targetUser.email, password);

    const token = getGmailToken();
    setIsDispatchingEmail(true);
    if (token) {
      sendGmailConfirmation(
        token,
        targetUser.email,
        targetUser.name,
        targetUser.role,
        password
      ).then((success) => {
        setIsDispatchingEmail(false);
        setWasRealGmailSent(success);
        setShowEmailReceipt(true);
      }).catch((err) => {
        console.error("Erro no envio do Gmail real de primeiro acesso:", err);
        setIsDispatchingEmail(false);
        setWasRealGmailSent(false);
        setShowEmailReceipt(true);
      });
    } else {
      // Trigger simulated sending of confirmation email
      setTimeout(() => {
        setIsDispatchingEmail(false);
        setWasRealGmailSent(false);
        setShowEmailReceipt(true);
      }, 1500);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!targetUser) return;

    const isValid = validateUserPassword(targetUser.email, password);
    if (!isValid) {
      setErrorMsg("Senha incorreta. Tente novamente.");
      return;
    }

    const token = getGmailToken();
    if (token) {
      setIsSendingLoginEmail(true);
      try {
        await sendGmailLoginNotification(
          token,
          targetUser.email,
          targetUser.name,
          targetUser.role
        );
        setWasLoginEmailSent(true);
      } catch (err) {
        console.error("Erro ao enviar email de login real:", err);
      } finally {
        setIsSendingLoginEmail(false);
        sessionStorage.setItem("auth_session_active", "true");
        localStorage.setItem("app_has_accessed_before", "true");
        onLoginSuccess(targetUser);
      }
    } else {
      // Success login
      sessionStorage.setItem("auth_session_active", "true");
      localStorage.setItem("app_has_accessed_before", "true");
      onLoginSuccess(targetUser);
    }
  };

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const emailToVerify = directEmail.toLowerCase().trim();
    if (!emailToVerify) {
      setErrorMsg("Por favor, insira o seu e-mail.");
      return;
    }

    const user = engineers.find(u => u.email.toLowerCase().trim() === emailToVerify);
    if (!user) {
      setErrorMsg("E-mail não cadastrado. Verifique a grafia ou entre em contato com o Administrador.");
      return;
    }

    setTargetUser(user);

    const hasPwd = userHasPassword(emailToVerify);
    if (!hasPwd) {
      setStep("create_password");
      setPassword("");
      setConfirmPassword("");
      setErrorMsg("Este é o seu primeiro acesso. Por favor, crie sua senha de segurança.");
      return;
    }

    const isValid = validateUserPassword(emailToVerify, directPassword);
    if (!isValid) {
      setErrorMsg("Senha incorreta. Tente novamente.");
      return;
    }

    const token = getGmailToken();
    if (token) {
      setIsSendingLoginEmail(true);
      try {
        await sendGmailLoginNotification(
          token,
          user.email,
          user.name,
          user.role
        );
        setWasLoginEmailSent(true);
      } catch (err) {
        console.error("Erro ao enviar email de login real:", err);
      } finally {
        setIsSendingLoginEmail(false);
        sessionStorage.setItem("auth_session_active", "true");
        localStorage.setItem("app_has_accessed_before", "true");
        onLoginSuccess(user);
      }
    } else {
      sessionStorage.setItem("auth_session_active", "true");
      localStorage.setItem("app_has_accessed_before", "true");
      onLoginSuccess(user);
    }
  };

  const handleConfirmReceipt = () => {
    setShowEmailReceipt(false);
    setShowReceiptPassword(false);
    if (targetUser) {
      setDirectEmail(targetUser.email);
      setDirectPassword("");
      setPassword("");
      setConfirmPassword("");
      setErrorMsg("");
      localStorage.setItem("app_has_accessed_before", "true");
      setStep("direct_login");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans select-none">
      
      {/* Background Decorative Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <div className="inline-flex p-3 rounded-2xl bg-orange-500 text-white shadow-xl shadow-orange-500/10 mb-4 animate-bounce">
          <Building2 className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white uppercase">CODEMAR</h2>
        <p className="mt-1 text-xs font-semibold tracking-widest text-slate-400 uppercase">
          Painel de Fiscalização & Engenharia
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-slate-800/80 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-700/60 transition-all duration-300">
          
          {step === "direct_login" && (
            <form onSubmit={handleDirectLogin} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="text-center mb-6">
                <span className="text-[10px] bg-slate-700/50 text-slate-300 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  Controle de Acesso
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-2">Acesso com Usuário & Senha</h3>
                <p className="text-xs text-slate-400 mt-1">Insira suas credenciais cadastradas</p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 text-xs font-medium text-red-400 rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* GOOGLE WORKSPACE GMAIL STATUS MODULE FOR SECURE LOGINS */}
              <div className="p-3.5 rounded-2xl border border-slate-700 bg-slate-900/40 flex items-center justify-between text-xs transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 border ${gmailUser ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"}`}>
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="font-bold text-slate-200 flex items-center gap-1.5 leading-tight">
                      Alertas por Gmail real
                      {gmailUser && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[150px]">
                      {gmailUser 
                        ? `${gmailUser.email}` 
                        : "Ative notificações para sua conta."}
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
                        <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0"></span>
                      ) : null}
                      Ativar Real
                    </button>
                  )}
                </div>
              </div>

              {/* Direct email field */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                    Usuário / E-mail funcional *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="seu.email@quantaconsultoria.com"
                      value={directEmail}
                      onChange={(e) => setDirectEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-200 placeholder-slate-500 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Direct password field */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                    Senha de acesso *
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••"
                      value={directPassword}
                      onChange={(e) => setDirectPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-200 placeholder-slate-600 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 py-1 px-1 text-slate-450 hover:text-slate-300 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("find_email");
                      setErrorMsg("");
                    }}
                    className="text-[11px] font-bold text-orange-400 hover:text-orange-350 transition-colors underline cursor-pointer"
                  >
                    Primeiro acesso? Vincular e-mail
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase py-3.5 px-4 rounded-xl shadow-lg shadow-orange-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Entrar com Usuário e Senha
                </button>
              </div>
            </form>
          )}

          {step === "find_email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div className="text-center mb-6">
                <span className="text-[10px] bg-slate-700/50 text-slate-300 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  Controle de Acesso Obrigatório
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-2">Identifique-se para continuar</h3>
                <p className="text-xs text-slate-400 mt-1">Insira seu e-mail funcional registrado no sistema</p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 text-xs font-medium text-red-400 rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* GOOGLE WORKSPACE GMAIL STATUS MODULE FOR SECURE LOGINS */}
              <div className="p-3.5 rounded-2xl border border-slate-700 bg-slate-900/40 flex items-center justify-between text-xs transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 border ${gmailUser ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"}`}>
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="font-bold text-slate-200 flex items-center gap-1.5 leading-tight">
                      Alertas por Gmail real
                      {gmailUser && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[150px]">
                      {gmailUser 
                        ? `${gmailUser.email}` 
                        : "Ative notificações para sua conta."}
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
                      className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-2.5 py-1.5 rounded-xl text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-md"
                    >
                      {isConnectingGoogle ? (
                        <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0"></span>
                      ) : null}
                      Ativar Real
                    </button>
                  )}
                </div>
              </div>

              {/* Selector vs Manual Email toggler */}
              <div className="space-y-4">
                {!isNewUser ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                      Selecione seu Nome / E-mail cadastrado *
                    </label>
                    <select
                      value={selectedEmail}
                      onChange={(e) => {
                        setSelectedEmail(e.target.value);
                        setCustomEmail("");
                      }}
                      className="w-full px-3 py-3 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-200 transition-all"
                    >
                      {engineers.map((user) => (
                        <option key={user.id} value={user.email}>
                          {user.name} ({user.role})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                      Digite seu E-mail Funcional *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        maxLength={100}
                        placeholder="nome.sobrenome@quantaconsultoria.com"
                        value={customEmail}
                        onChange={(e) => {
                          setCustomEmail(e.target.value);
                          setSelectedEmail("");
                        }}
                        className="w-full pl-10 pr-3 py-3 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-200 placeholder-slate-500 transition-all font-mono"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewUser(!isNewUser);
                      setErrorMsg("");
                    }}
                    className="text-[11px] font-bold text-orange-400 hover:text-orange-350 transition-colors underline"
                  >
                    {!isNewUser ? "Não está na lista? Digitar email manualmente" : "Ver lista de emails cadastrados"}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase py-3.5 px-4 rounded-xl shadow-lg shadow-orange-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Prosseguir Identificação
                </button>
              </div>
            </form>
          )}

          {step === "password_entry" && targetUser && (
            <form onSubmit={handlePasswordLogin} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="text-center mb-4">
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  Usuário Reconhecido
                </span>
                <h3 className="text-base font-bold text-slate-100 mt-2">{targetUser.name}</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">{targetUser.email}</p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 text-xs font-medium text-red-400 rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* GOOGLE WORKSPACE GMAIL STATUS MODULE FOR SECURE LOGINS */}
              <div className="p-3.5 rounded-2xl border border-slate-700 bg-slate-900/40 flex items-center justify-between text-xs transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 border ${gmailUser ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"}`}>
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="font-bold text-slate-200 flex items-center gap-1.5 leading-tight">
                      Alertas por Gmail real
                      {gmailUser && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[150px]">
                      {gmailUser 
                        ? `${gmailUser.email}` 
                        : "Ative notificações para sua conta."}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 pl-1">
                  {gmailUser ? (
                    <button
                      type="button"
                      onClick={handleDisconnectGoogle}
                      className="bg-slate-855 hover:bg-red-950/40 border border-slate-700 hover:border-red-900 text-slate-400 hover:text-red-400 font-bold px-2.5 py-1.5 rounded-xl text-[10px] transition-all cursor-pointer"
                    >
                      Sair
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectGoogle}
                      disabled={isConnectingGoogle}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-2.5 py-1.5 rounded-xl text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-md"
                    >
                      {isConnectingGoogle ? (
                        <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0"></span>
                      ) : null}
                      Ativar Real
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Digite sua senha de acesso</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    maxLength={50}
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-200 placeholder-slate-600 font-mono transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 py-1 px-1 text-slate-450 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("find_email");
                    setPassword("");
                    setErrorMsg("");
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs uppercase py-3.5 px-4 rounded-xl transition-all"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs uppercase py-3.5 px-4 rounded-xl shadow-lg shadow-orange-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  Confirmar & Entrar
                </button>
              </div>
            </form>
          )}

          {step === "create_password" && targetUser && (
            <form onSubmit={handleCreatePassword} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="text-center mb-4">
                <div className="inline-flex gap-1.5 items-center text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-black uppercase tracking-wider mb-2">
                  <Sparkles className="h-3 w-3" />
                  Primeiro Acesso de Engenheiro
                </div>
                <h3 className="text-base font-bold text-slate-100">{targetUser.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Este é o primeiro login deste e-mail. Crie uma senha confidencial de no mínimo 6 dígitos/caracteres.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 text-xs font-medium text-red-400 rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Defina uma senha (mínimo de 6 dígitos) *</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 w-4 w-4 text-slate-450" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    maxLength={50}
                    placeholder="Mínimo 6 dígitos"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-200 font-mono transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 py-1 px-1 text-slate-450 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Repita a Senha para Confirmar *</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 w-4 w-4 text-slate-450" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    maxLength={50}
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-200 font-mono transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 py-1 px-1 text-slate-450 hover:text-slate-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("find_email");
                    setPassword("");
                    setConfirmPassword("");
                    setErrorMsg("");
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs uppercase py-3 px-4 rounded-xl transition-all font-sans"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="h-3.5 w-3.5" />
                  Ativar & Criar Senha
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      {/* SENDING LOGIN NOTIFICATION EMAIL SPINNER OVERLAY */}
      {isSendingLoginEmail && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h4 className="text-lg font-black text-white uppercase tracking-wider">Disparando Alerta de Segurança...</h4>
            <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed font-sans">
              Notificando {targetUser?.email} em tempo real sobre este login via e-mail corporativo.
            </p>
          </div>
        </div>
      )}

      {/* DISPATCHING CONFIRMATION EMAIL SPINNER OVERLAY */}
      {isDispatchingEmail && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h4 className="text-lg font-black text-white uppercase tracking-wider">Registrando Senha...</h4>
            <p className="text-xs text-slate-450 mt-1 max-w-xs leading-relaxed font-sans">
              Vinculando chave de acesso ao e-mail e enviando mensagem eletrônica de confirmação segura...
            </p>
          </div>
        </div>
      )}

      {/* HIGH-FIDELITY SIMULATED EMAIL CONFIRMATION RECEIPT */}
      {showEmailReceipt && targetUser && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-150 overflow-hidden text-left flex flex-col max-h-[90vh]">
            
            {/* Simulation Header */}
            <div className={`px-6 py-4 text-white flex items-center justify-between ${wasRealGmailSent ? "bg-emerald-600" : "bg-orange-500"}`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-widest font-sans">
                  {wasRealGmailSent ? "E-mail de Confirmação Recomendado via Gmail" : "E-mail de Confirmação Enviado"}
                </span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${wasRealGmailSent ? "bg-emerald-700" : "bg-orange-600"}`}>
                {wasRealGmailSent ? "Gmail Real" : "Simulador"}
              </span>
            </div>

            {/* Email Body Wrap */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
              
              {/* Envelope Info */}
              <div className="border border-slate-200 rounded-2xl bg-white p-4 space-y-2 text-xs text-slate-600 shadow-xs leading-relaxed">
                <div>
                  <strong className="text-slate-800">De: </strong> 
                  <span className="font-mono">{wasRealGmailSent && gmailUser ? gmailUser.email : "eng-security@quantaconsultoria.com (CODEMAR Segurança)"}</span>
                </div>
                <div>
                  <strong className="text-slate-800">Para: </strong> 
                  <span className="font-mono text-indigo-650 font-bold">{targetUser.email}</span>
                </div>
                <div>
                  <strong className="text-slate-800">Assunto: </strong> 
                  <span className="font-semibold text-slate-800 text-xs">Ativação de Acesso & Credenciais de Engenharia - CODEMAR</span>
                </div>
                {wasRealGmailSent && (
                  <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0"></span>
                    E-mail disparado via API do Google Gmail com sucesso!
                  </div>
                )}
                <div className="pt-1 text-[10px] text-slate-400">
                  Data de Envio: {new Date().toLocaleString("pt-BR")} (UTC-3)
                </div>
              </div>

              {/* Graphical Email Message Layout */}
              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-xs leading-relaxed">
                
                {/* Email Header */}
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
                  <div className="p-2 bg-orange-50 text-orange-500 rounded-lg">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wide text-slate-700">COORDENAÇÃO DE ENGENHARIA</h5>
                    <p className="text-[10px] font-semibold text-orange-500">CODEMAR S/A</p>
                  </div>
                </div>

                {/* Email content typography */}
                <div className="space-y-3.5 text-xs text-slate-600 font-sans">
                  <p>Prezado(a) <strong className="text-slate-800">{targetUser.name}</strong>,</p>
                  <p>
                    Confirmamos que seu primeiro acesso ao <strong>Painel de Fiscalização de Engenharia CODEMAR</strong> foi registrado hoje e uma nova senha foi criada. 
                    Seus dados de segurança do perfil foram registrados no ecossistema e agora estão vinculados.
                  </p>
                  
                  {/* Dashboard Credentials Table card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 my-2.5 space-y-2">
                    <div className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">SEUS DADOS DE AUTENTICAÇÃO:</div>
                    <div className="grid grid-cols-3 gap-1">
                      <span className="text-slate-500 font-semibold">Login (E-mail):</span>
                      <span className="col-span-2 font-mono text-slate-800 font-bold">{targetUser.email}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 items-center">
                      <span className="text-slate-500 font-semibold">Senha Criada:</span>
                      <div className="col-span-2 flex items-center gap-2">
                        <span className="font-mono text-emerald-650 font-black tracking-widest bg-emerald-50 px-2 py-1 rounded-xl border border-emerald-150 inline-block text-xs select-none">
                          {showReceiptPassword ? password : "••••••"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowReceiptPassword(!showReceiptPassword)}
                          className="p-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer flex items-center justify-center border-0"
                          title={showReceiptPassword ? "Ocultar Senha" : "Ver Senha"}
                        >
                          {showReceiptPassword ? <EyeOff className="h-3.5 w-3.5 text-slate-500" /> : <Eye className="h-3.5 w-3.5 text-slate-500" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-150">
                      <span className="text-slate-500 font-semibold">Perfil de Acesso:</span>
                      <span className="col-span-2 font-bold text-slate-800">{targetUser.role}</span>
                    </div>
                  </div>

                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    * Esta mensagem serve como recibo oficial de ativação. Por motivos de segurança, memorize sua senha e não compartilhe seu login funcional.
                  </p>
                  <p className="pt-2 text-slate-400 text-[10px] italic">
                    Mensagem automatizada gerada pelo Sistema de Auditoria Interna CODEMAR.
                  </p>
                </div>

              </div>

            </div>

            {/* Email Actions footer */}
            <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex justify-between items-center shrink-0">
              <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                <Send className="h-3 w-3 text-emerald-500" />
                {wasRealGmailSent ? "E-mail real disparado!" : "E-mail virtual enviado"}
              </span>
              <button
                onClick={handleConfirmReceipt}
                className={`text-white font-bold text-xs uppercase py-2.5 px-5 rounded-xl transition-all shadow-md cursor-pointer ${
                  wasRealGmailSent ? "bg-emerald-600 hover:bg-emerald-500 animate-pulse" : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                Confirmar Leitura & Entrar no Painel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
