import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Lock,
  LogIn,
  Mail,
  Music2,
  ShieldCheck,
  User,
} from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import { API_URL } from "../services/http";
import {
  authApi,
  type RegisterInput,
} from "../services/api";

type Mode = "login" | "register" | "forgot" | "reset";

const passwordHint =
  "Mínimo de 10 caracteres, combinando letras e números.";

function validatePassword(password: string): string | null {
  if (password.length < 10) {
    return "A senha deve ter pelo menos 10 caracteres.";
  }

  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) {
    return "A senha deve combinar letras e números.";
  }

  return null;
}

function oauthErrorMessage(code: string): string {
  switch (code) {
    case "consent_required":
      return "Aceite os termos de uso e a política de privacidade para criar a conta.";
    case "email_unverified":
      return "Confirme seu e-mail antes de vincular este login social.";
    case "not_configured":
      return "Este login social ainda não está disponível.";
    case "missing_email":
      return "O provedor não compartilhou um e-mail. Tente outra forma de login.";
    default:
      return "Não foi possível concluir o login social. Tente novamente.";
  }
}

function readAuthParams(): {
  mode: Mode;
  error: string;
  notice: string;
  token: string;
  hasQuery: boolean;
} {
  const params = new URLSearchParams(window.location.search);

  const authResult = params.get("auth");
  const authError = params.get("auth_error");
  const emailVerified = params.get("email_verified");
  const emailError = params.get("email_error");
  const token = params.get("reset_token") ?? "";

  return {
    mode: token ? "reset" : "login",
    error: authError
      ? oauthErrorMessage(authError)
      : emailError
        ? "O link de confirmação é inválido ou expirou."
        : "",
    notice: emailVerified
      ? "E-mail confirmado com sucesso."
      : authResult === "ok"
        ? "Login social concluído."
        : "",
    token,
    hasQuery: Boolean(
      authResult || authError || emailVerified || emailError || token
    ),
  };
}

function Auth() {
  const { user, providers, login, register, error } = useAuth();

  const [initial] = useState(readAuthParams);
  const [mode, setMode] = useState<Mode>(initial.mode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(initial.error);
  const [notice, setNotice] = useState(initial.notice);
  const [resetToken, setResetToken] = useState(initial.token);

  const consentVersion = providers?.consentVersion ?? "2026-11-04";
  const termsVersion = providers?.termsVersion ?? "2026-11-04";

  useEffect(() => {
    if (initial.hasQuery) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [initial]);

  const socialEnabled =
    Boolean(providers?.google) || Boolean(providers?.apple);

  const consentGiven = acceptedTerms && acceptedPrivacy;

  const heading = useMemo(() => {
    switch (mode) {
      case "register":
        return "Crie sua conta";
      case "forgot":
        return "Recuperar acesso";
      case "reset":
        return "Defina uma nova senha";
      default:
        return "Entre na sua conta";
    }
  }, [mode]);

  function resetMessages() {
    setFormError("");
    setNotice("");
  }

  function switchMode(next: Mode) {
    resetMessages();
    setPassword("");
    setPasswordConfirm("");
    setMode(next);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setSubmitting(true);

    try {
      await login({ email: email.trim(), password });
    } catch {
      // A mensagem já é exposta pelo AuthContext.
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (name.trim().length < 2) {
      setFormError("Informe seu nome.");
      return;
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      setFormError(passwordError);
      return;
    }

    if (password !== passwordConfirm) {
      setFormError("As senhas não conferem.");
      return;
    }

    if (!consentGiven) {
      setFormError(
        "É necessário aceitar os termos de uso e a política de privacidade."
      );
      return;
    }

    const input: RegisterInput = {
      name: name.trim(),
      email: email.trim(),
      password,
      acceptedTerms,
      acceptedPrivacy,
      marketingOptIn,
    };

    setSubmitting(true);

    try {
      await register(input);
    } catch {
      // A mensagem já é exposta pelo AuthContext.
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setSubmitting(true);

    try {
      const result = await authApi.forgotPassword(email.trim());

      setNotice(result.message);
    } catch (currentError) {
      setFormError(
        currentError instanceof Error
          ? currentError.message
          : "Não foi possível enviar as instruções."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    const passwordError = validatePassword(password);

    if (passwordError) {
      setFormError(passwordError);
      return;
    }

    if (password !== passwordConfirm) {
      setFormError("As senhas não conferem.");
      return;
    }

    setSubmitting(true);

    try {
      await authApi.resetPassword(resetToken, password);

      setResetToken("");
      setPassword("");
      setPasswordConfirm("");
      setMode("login");
      setNotice(
        "Senha alterada. Entre com a nova senha para continuar."
      );
    } catch (currentError) {
      setFormError(
        currentError instanceof Error
          ? currentError.message
          : "Não foi possível redefinir a senha."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function socialHref(provider: "google" | "apple") {
    return `${API_URL}/api/auth/${provider}/start?accepted=1`;
  }

  if (user) {
    return null;
  }

  return (
    <div className="auth-screen">
      <div className="auth-glow" aria-hidden="true" />

      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo-icon">S</div>

          <div className="logo-text">
            <strong>StageManager</strong>
            <span>Band Workspace</span>
          </div>
        </div>

        <h1>{heading}</h1>

        <p className="auth-subtitle">
          {mode === "register"
            ? "Sua conta cria um workspace privado para a sua banda."
            : mode === "forgot" || mode === "reset"
              ? "Vamos devolver o acesso à sua conta com segurança."
              : "Acesso restrito: entre para gerenciar shows, setlists e repertório."}
        </p>

        {(formError || error) && (
          <div className="auth-alert auth-alert-error" role="alert">
            <AlertCircle size={17} />
            <span>{formError || error}</span>
          </div>
        )}

        {notice && (
          <div className="auth-alert auth-alert-success" role="status">
            <Check size={17} />
            <span>{notice}</span>
          </div>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="auth-form">
            <label className="auth-field">
              <span>E-mail</span>
              <div className="auth-input">
                <Mail size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@exemplo.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Senha</span>
              <div className="auth-input">
                <Lock size={17} />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>

            <label className="auth-check auth-check-compact">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(event) => {
                  setAcceptedTerms(event.target.checked);
                  setAcceptedPrivacy(event.target.checked);
                }}
              />
              <span>
                Li e aceito os Termos de Uso e a Política de Privacidade
                (LGPD).
              </span>
            </label>

            <button
              type="submit"
              className="primary-button auth-submit"
              disabled={submitting}
            >
              <LogIn size={18} />
              {submitting ? "Entrando..." : "Entrar"}
            </button>

            <div className="auth-links">
              <button
                type="button"
                className="link-button"
                onClick={() => switchMode("forgot")}
              >
                Esqueci minha senha
              </button>

              <button
                type="button"
                className="link-button"
                onClick={() => switchMode("register")}
              >
                Criar conta
              </button>
            </div>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegister} className="auth-form">
            <label className="auth-field">
              <span>Nome</span>
              <div className="auth-input">
                <User size={17} />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Como devemos te chamar"
                  autoComplete="name"
                  required
                />
              </div>
            </label>

            <label className="auth-field">
              <span>E-mail</span>
              <div className="auth-input">
                <Mail size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@exemplo.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Senha</span>
              <div className="auth-input">
                <Lock size={17} />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Crie uma senha forte"
                  autoComplete="new-password"
                  minLength={10}
                  required
                />
              </div>
              <small>{passwordHint}</small>
            </label>

            <label className="auth-field">
              <span>Confirmar senha</span>
              <div className="auth-input">
                <Lock size={17} />
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(event) =>
                    setPasswordConfirm(event.target.value)
                  }
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  minLength={10}
                  required
                />
              </div>
            </label>

            <div className="auth-consent">
              <label className="auth-check">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) =>
                    setAcceptedTerms(event.target.checked)
                  }
                />
                <span>
                  Li e aceito os{" "}
                  <a
                    href="/termos.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Termos de Uso
                  </a>{" "}
                  (versão {termsVersion}).
                </span>
              </label>

              <label className="auth-check">
                <input
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(event) =>
                    setAcceptedPrivacy(event.target.checked)
                  }
                />
                <span>
                  Li e aceito a{" "}
                  <a
                    href="/privacidade.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Política de Privacidade
                  </a>{" "}
                  (versão {consentVersion}) e o tratamento dos meus
                  dados conforme a LGPD.
                </span>
              </label>

              <label className="auth-check auth-check-optional">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(event) =>
                    setMarketingOptIn(event.target.checked)
                  }
                />
                <span>
                  Quero receber novidades do StageManager (opcional).
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="primary-button auth-submit"
              disabled={submitting}
            >
              <ShieldCheck size={18} />
              {submitting ? "Criando conta..." : "Criar conta gratuita"}
            </button>

            <div className="auth-links">
              <button
                type="button"
                className="link-button"
                onClick={() => switchMode("login")}
              >
                Já tenho conta
              </button>
            </div>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleForgot} className="auth-form">
            <label className="auth-field">
              <span>E-mail da conta</span>
              <div className="auth-input">
                <Mail size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@exemplo.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <button
              type="submit"
              className="primary-button auth-submit"
              disabled={submitting}
            >
              <Mail size={18} />
              {submitting ? "Enviando..." : "Enviar instruções"}
            </button>

            <div className="auth-links">
              <button
                type="button"
                className="link-button"
                onClick={() => switchMode("login")}
              >
                <ArrowLeft size={15} />
                Voltar para o login
              </button>
            </div>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={handleReset} className="auth-form">
            <label className="auth-field">
              <span>Nova senha</span>
              <div className="auth-input">
                <Lock size={17} />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Crie uma senha forte"
                  autoComplete="new-password"
                  minLength={10}
                  required
                />
              </div>
              <small>{passwordHint}</small>
            </label>

            <label className="auth-field">
              <span>Confirmar nova senha</span>
              <div className="auth-input">
                <Lock size={17} />
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(event) =>
                    setPasswordConfirm(event.target.value)
                  }
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                  minLength={10}
                  required
                />
              </div>
            </label>

            <button
              type="submit"
              className="primary-button auth-submit"
              disabled={submitting}
            >
              <ShieldCheck size={18} />
              {submitting ? "Salvando..." : "Salvar nova senha"}
            </button>

            <div className="auth-links">
              <button
                type="button"
                className="link-button"
                onClick={() => switchMode("login")}
              >
                <ArrowLeft size={15} />
                Voltar para o login
              </button>
            </div>
          </form>
        )}

        {mode !== "forgot" && mode !== "reset" && socialEnabled && (
          <>
            <div className="auth-divider">
              <span>ou continue com</span>
            </div>

            <div className="auth-social">
              {providers?.google && (
                <a
                  className="social-button"
                  href={socialHref("google")}
                  onClick={(event) => {
                    if (!consentGiven) {
                      event.preventDefault();
                      setFormError(
                        "Marque o aceite dos termos e da política de privacidade antes de usar o login social."
                      );
                    }
                  }}
                >
                  <span className="social-icon social-google">G</span>
                  Google
                </a>
              )}

              {providers?.apple && (
                <a
                  className="social-button"
                  href={socialHref("apple")}
                  onClick={(event) => {
                    if (!consentGiven) {
                      event.preventDefault();
                      setFormError(
                        "Marque o aceite dos termos e da política de privacidade antes de usar o login social."
                      );
                    }
                  }}
                >
                  <span className="social-icon social-apple">
                    &#63743;
                  </span>
                  Apple
                </a>
              )}
            </div>

            {!consentGiven && (
              <p className="auth-social-hint">
                Para entrar com Google ou Apple, marque o aceite dos
                termos de uso e da política de privacidade.
              </p>
            )}
          </>
        )}

        <footer className="auth-footer">
          <Music2 size={15} />
          <span>
            Seus dados ficam no seu workspace. Você pode exportar ou
            excluir a conta a qualquer momento no Perfil.
          </span>
        </footer>
      </div>
    </div>
  );
}

export default Auth;
