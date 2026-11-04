import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Download,
  KeyRound,
  LogOut,
  Mail,
  Monitor,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import {
  authApi,
  type ApiSession,
  type ProfileInput,
} from "../services/api";

function formatDate(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Profile() {
  const { user, updateUser, logout } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [instrument, setInstrument] = useState(user?.instrument ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [marketingOptIn, setMarketingOptIn] = useState(
    user?.marketingOptIn ?? false
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [sessionsError, setSessionsError] = useState("");

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSessions() {
      try {
        const result = await authApi.sessions();

        if (active) {
          setSessions(result.sessions);
          setSessionsError("");
        }
      } catch (error) {
        if (active) {
          setSessionsError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as sessões."
          );
        }
      }
    }

    void loadSessions();

    return () => {
      active = false;
    };
  }, []);

  if (!user) {
    return null;
  }

  async function handleProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage("");
    setProfileError("");

    const input: ProfileInput = {
      name: name.trim(),
      instrument: instrument.trim() || null,
      avatarUrl: avatarUrl.trim() || null,
      marketingOptIn,
    };

    setSavingProfile(true);

    try {
      const result = await authApi.updateProfile(input);

      updateUser(result.user);
      setProfileMessage("Perfil atualizado.");
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o perfil."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não conferem.");
      return;
    }

    setSavingPassword(true);

    try {
      await authApi.changePassword(currentPassword, newPassword);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage(
        "Senha alterada. As outras sessões foram encerradas."
      );

      const result = await authApi.sessions();
      setSessions(result.sessions);
    } catch (error) {
      setPasswordError(
        error instanceof Error
          ? error.message
          : "Não foi possível trocar a senha."
      );
    } finally {
      setSavingPassword(false);
    }
  }

  async function revokeSession(id: string) {
    try {
      await authApi.revokeSession(id);

      if (sessions.some((session) => session.id === id && session.current)) {
        window.location.reload();
        return;
      }

      setSessions((current) =>
        current.filter((session) => session.id !== id)
      );
    } catch (error) {
      setSessionsError(
        error instanceof Error
          ? error.message
          : "Não foi possível encerrar a sessão."
      );
    }
  }

  async function endAllSessions() {
    try {
      await authApi.logoutAll();
    } finally {
      window.location.reload();
    }
  }

  async function handleExport() {
    setExportError("");
    setExporting(true);

    try {
      await authApi.exportData();
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "Não foi possível exportar os dados."
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeleteError("");

    if (deleteConfirmation !== "EXCLUIR") {
      setDeleteError('Digite "EXCLUIR" para confirmar.');
      return;
    }

    setDeleting(true);

    try {
      await authApi.deleteAccount({
        confirmation: deleteConfirmation,
        email: deleteEmail.trim(),
        password: deletePassword,
      });

      await logout();
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a conta."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="profile-page">
      <header className="page-header">
        <div>
          <h1>Perfil</h1>
          <p>
            Sua conta, segurança e controle dos seus dados pessoais.
          </p>
        </div>
      </header>

      <section className="profile-hero panel">
        <div className="profile-avatar">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" />
          ) : (
            <span>{initials(user.name) || "S"}</span>
          )}
        </div>

        <div className="profile-identity">
          <h2>{user.name}</h2>

          <p>
            <Mail size={15} />
            {user.email}
            {user.emailVerified && (
              <span className="profile-verified">
                <BadgeCheck size={15} />
                confirmado
              </span>
            )}
          </p>

          <small>
            Conta criada em {formatDate(user.createdAt)}
            {user.consentedAt
              ? ` · consentimento LGPD v${user.consentVersion} em ${formatDate(user.consentedAt)}`
              : ""}
          </small>
        </div>
      </section>

      <div className="profile-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>
              <UserRound size={18} />
              Dados do perfil
            </h2>
          </div>

          <form onSubmit={handleProfile} className="profile-form">
            <div className="form-group">
              <label htmlFor="profile-name">Nome</label>
              <input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                maxLength={80}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="profile-email">E-mail</label>
              <input
                id="profile-email"
                value={user.email}
                disabled
                title="A troca de e-mail exige confirmação e será disponibilizada em breve."
              />
            </div>

            <div className="form-group">
              <label htmlFor="profile-instrument">Instrumento</label>
              <input
                id="profile-instrument"
                value={instrument}
                onChange={(event) => setInstrument(event.target.value)}
                placeholder="Guitarra, voz, bateria..."
                maxLength={60}
              />
            </div>

            <div className="form-group">
              <label htmlFor="profile-avatar">Foto (URL HTTPS)</label>
              <input
                id="profile-avatar"
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>

            <label className="auth-check profile-check">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(event) =>
                  setMarketingOptIn(event.target.checked)
                }
              />
              <span>
                Aceito receber comunicações de novidades (opcional e
                revogável a qualquer momento).
              </span>
            </label>

            {profileError && (
              <p className="form-message form-message-error" role="alert">
                {profileError}
              </p>
            )}

            {profileMessage && (
              <p
                className="form-message form-message-success"
                role="status"
              >
                {profileMessage}
              </p>
            )}

            <button
              type="submit"
              className="primary-button"
              disabled={savingProfile}
            >
              <Save size={17} />
              {savingProfile ? "Salvando..." : "Salvar perfil"}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>
              <KeyRound size={18} />
              Segurança
            </h2>
          </div>

          <form onSubmit={handlePassword} className="profile-form">
            <div className="form-group">
              <label htmlFor="current-password">
                Senha atual (se houver)
              </label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(event.target.value)
                }
                autoComplete="current-password"
                placeholder="Obrigatória se você já tem senha"
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-password">Nova senha</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={10}
                required
              />
              <small>
                Mínimo de 10 caracteres, combinando letras e números.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">
                Confirmar nova senha
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                autoComplete="new-password"
                minLength={10}
                required
              />
            </div>

            {passwordError && (
              <p className="form-message form-message-error" role="alert">
                {passwordError}
              </p>
            )}

            {passwordMessage && (
              <p
                className="form-message form-message-success"
                role="status"
              >
                {passwordMessage}
              </p>
            )}

            <button
              type="submit"
              className="primary-button"
              disabled={savingPassword}
            >
              <ShieldCheck size={17} />
              {savingPassword ? "Salvando..." : "Alterar senha"}
            </button>
          </form>

          <div className="profile-sessions">
            <h3>
              <Monitor size={17} />
              Sessões ativas
            </h3>

            {sessionsError && (
              <p className="form-message form-message-error">
                {sessionsError}
              </p>
            )}

            <ul>
              {sessions.map((session) => (
                <li key={session.id}>
                  <div>
                    <strong>
                      {session.current
                        ? "Este dispositivo"
                        : "Outro dispositivo"}
                    </strong>
                    <small>
                      Último acesso: {formatDate(session.lastUsedAt)}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => revokeSession(session.id)}
                  >
                    Encerrar
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="secondary-button"
              onClick={endAllSessions}
            >
              <LogOut size={16} />
              Sair de todos os dispositivos
            </button>
          </div>
        </section>
      </div>

      <section className="panel profile-lgpd">
        <div className="panel-header">
          <h2>
            <ShieldCheck size={18} />
            Privacidade e LGPD
          </h2>
        </div>

        <div className="profile-lgpd-body">
          <div>
            <h3>Portabilidade dos dados</h3>
            <p>
              Baixe um arquivo JSON com sua conta, workspaces, músicas,
              shows e setlists. Nenhum dado sensível de terceiros é
              incluído.
            </p>

            {exportError && (
              <p className="form-message form-message-error">
                {exportError}
              </p>
            )}

            <button
              type="button"
              className="secondary-button"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download size={16} />
              {exporting ? "Gerando arquivo..." : "Baixar meus dados"}
            </button>
          </div>

          <div className="profile-danger">
            <h3>
              <AlertTriangle size={17} />
              Excluir conta
            </h3>
            <p>
              A exclusão é definitiva: apaga a conta, o workspace e os
              dados da banda que pertencem só a você. Se houver outros
              integrantes, apenas o seu vínculo é removido.
            </p>

            {!deleteOpen ? (
              <button
                type="button"
                className="danger-button"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 size={16} />
                Excluir minha conta
              </button>
            ) : (
              <form onSubmit={handleDelete} className="profile-form">
                <div className="form-group">
                  <label htmlFor="delete-confirmation">
                    Digite EXCLUIR para confirmar
                  </label>
                  <input
                    id="delete-confirmation"
                    value={deleteConfirmation}
                    onChange={(event) =>
                      setDeleteConfirmation(event.target.value)
                    }
                    placeholder="EXCLUIR"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="delete-email">
                    Confirme seu e-mail
                  </label>
                  <input
                    id="delete-email"
                    type="email"
                    value={deleteEmail}
                    onChange={(event) =>
                      setDeleteEmail(event.target.value)
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="delete-password">Senha</label>
                  <input
                    id="delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(event) =>
                      setDeletePassword(event.target.value)
                    }
                    autoComplete="current-password"
                    placeholder="Obrigatória se você já tem senha"
                  />
                </div>

                {deleteError && (
                  <p
                    className="form-message form-message-error"
                    role="alert"
                  >
                    {deleteError}
                  </p>
                )}

                <div className="profile-danger-actions">
                  <button
                    type="submit"
                    className="danger-button"
                    disabled={deleting}
                  >
                    <Trash2 size={16} />
                    {deleting
                      ? "Excluindo..."
                      : "Confirmar exclusão definitiva"}
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setDeleteOpen(false)}
                    disabled={deleting}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Profile;
