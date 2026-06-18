import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider Setup
const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/gmail.send");
provider.addScope("https://www.googleapis.com/auth/drive");

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedGmailUser: User | null = null;

/**
 * Initiates the Google Sign-In popup with Gmail scopes.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Não foi possível adquirir o token de acesso da conta Google.");
    }
    
    cachedAccessToken = credential.accessToken;
    cachedGmailUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Erro no login com Google:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Returns the currently cached Gmail access token if logged in.
 */
export const getGmailToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Returns the Google user metadata if authenticated.
 */
export const getGmailUser = (): User | null => {
  return cachedGmailUser;
};

/**
 * Signs the user out of the Google session.
 */
export const googleLogout = async () => {
  try {
    await signOut(auth);
    cachedAccessToken = null;
    cachedGmailUser = null;
  } catch (err) {
    console.error("Erro ao desconectar Google:", err);
  }
};

/**
 * Encodes string data into web-safe base64url encoding.
 */
function base64UrlEncode(str: string): string {
  // Safe encoding handler for UTF-8 unicode
  const escaped = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  });
  return btoa(escaped)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Sends a real transactional email via Google Gmail API on behalf of the signed-in user.
 */
export const sendGmailConfirmation = async (
  accessToken: string,
  toEmail: string,
  userName: string,
  userRole: string,
  passwordCreated: string
): Promise<boolean> => {
  try {
    const fromName = "CODEMAR Segurança";
    const subject = "Ativação de Acesso & Credenciais de Engenharia - CODEMAR";
    
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg: 12px; background-color: #ffffff;">
        <div style="display: flex; align-items: center; border-bottom: 2px solid #f97316; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #1e293b; margin: 0; font-size: 18px; text-transform: uppercase; font-weight: bold;">COORDENAÇÃO DE ENGENHARIA CODEMAR</h2>
        </div>
        
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">Prezado(a) <strong>${userName}</strong>,</p>
        
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Confirmamos que seu primeiro acesso ao <strong>Painel de Fiscalização de Engenharia CODEMAR</strong> foi realizado com sucesso hoje, e sua senha de acesso foi criada.
        </p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-top: 0; margin-bottom: 10px;">Suas Credenciais Seguras:</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: 500; width: 120px;">Login (E-mail):</td>
              <td style="padding: 4px 0; color: #1e293b; font-family: monospace; font-weight: bold;">${toEmail}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: 500;">Senha Ativa:</td>
              <td style="padding: 4px 0; color: #16a34a; font-family: monospace; font-weight: 900; letter-spacing: 1px;">${passwordCreated}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: 500;">Função Técnica:</td>
              <td style="padding: 4px 0; color: #1e293b; font-weight: bold;">${userRole}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 20px;">
          * Este e-mail é um recibo eletrônico de confirmação oficial de segurança. Lembre-se de memorizar sua senha e nunca revelá-la publicamente.
        </p>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 25px; text-align: center; font-size: 11px; color: #94a3b8;">
          Mensagem automática emitida via integração autorizada com o Google Workspace CODEMAR S/A.
        </div>
      </div>
    `;

    // Construct MIME / RFC 822 email format
    const rfc822Lines = [
      `To: ${toEmail}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      `X-Mailer: CODEMAR-V1`,
      ``,
      htmlBody
    ];
    
    const rfc822Message = rfc822Lines.join("\r\n");
    const rawPayload = base64UrlEncode(rfc822Message);

    // Call Gmail send API
    const response = await fetch("https://gmail.googleapis.com/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw: rawPayload })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Falha ao disparar Gmail API:", errText);
      return false;
    }

    console.log("Email enviado com sucesso via Gmail API!");
    return true;
  } catch (err) {
    console.error("Excessão ao enviar email via Gmail API:", err);
    return false;
  }
};

/**
 * Sends a real login notification email via Google Gmail API.
 */
export const sendGmailLoginNotification = async (
  accessToken: string,
  toEmail: string,
  userName: string,
  userRole: string
): Promise<boolean> => {
  try {
    const subject = "Notificação de Segurança - Novo Login Painel CODEMAR";
    const dateFormatted = new Date().toLocaleString("pt-BR", {
      dateStyle: "long",
      timeStyle: "short"
    });
    
    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="display: flex; align-items: center; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px; gap: 10px;">
          <h2 style="color: #1e293b; margin: 0; font-size: 18px; text-transform: uppercase; font-weight: bold;">COORDENAÇÃO DE ENGENHARIA CODEMAR</h2>
        </div>
        
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">Prezado(a) <strong>${userName}</strong>,</p>
        
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Confirmamos que foi realizado um **novo acesso (login)** recente utilizando este perfil da plataforma.
        </p>
        
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #166534; margin-top: 0; margin-bottom: 10px;">Informações do Login do Perfil:</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500; width: 120px; border-bottom: 1px solid #f1f5f9;">Perfil / Login:</td>
              <td style="padding: 6px 0; color: #1e293b; font-family: monospace; font-weight: bold; border-bottom: 1px solid #f1f5f9;">${toEmail}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500; border-bottom: 1px solid #f1f5f9;">Nome:</td>
              <td style="padding: 6px 0; color: #1e293b; font-weight: bold; border-bottom: 1px solid #f1f5f9;">${userName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500; border-bottom: 1px solid #f1f5f9;">Função Técnica:</td>
              <td style="padding: 6px 0; color: #1e293b; font-weight: bold; border-bottom: 1px solid #f1f5f9;">${userRole}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Data e Hora:</td>
              <td style="padding: 6px 0; color: #1e293b; font-weight: bold;">${dateFormatted}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 20px;">
          Se foi você quem executou este login, nenhuma ação é necessária. Se você não reconhece esta atividade ou este e-mail, entre em contato imediatamente com a equipe de Segurança da Informação CODEMAR.
        </p>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 25px; text-align: center; font-size: 11px; color: #94a3b8;">
          Mensagem de segurança em tempo real disparada via integração autorizada com o Google Workspace CODEMAR S/A.
        </div>
      </div>
    `;

    // Construct MIME / RFC 822 email format
    const rfc822Lines = [
      `To: ${toEmail}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      `X-Mailer: CODEMAR-V1`,
      ``,
      htmlBody
    ];
    
    const rfc822Message = rfc822Lines.join("\r\n");
    const rawPayload = base64UrlEncode(rfc822Message);

    const response = await fetch("https://gmail.googleapis.com/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw: rawPayload })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Falha ao disparar Gmail login API:", errText);
      return false;
    }

    console.log("Email de login enviado com sucesso via Gmail API!");
    return true;
  } catch (err) {
    console.error("Excessão ao enviar email de login via Gmail API:", err);
    return false;
  }
};
