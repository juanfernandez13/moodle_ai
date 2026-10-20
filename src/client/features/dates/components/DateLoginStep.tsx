"use client";
import { useEffect, useId, useState } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LogIn,
  LogOut,
} from "lucide-react";
import { hostOf } from "../helpers.ts";
import type { DatePlanner } from "../use-date-planner.ts";

/** Step 1: three fields and one button. Already connected: say so and offer the next step. */
export function DateLoginStep({
  moodle,
  expired,
  onContinue,
  onLogout,
}: {
  moodle: DatePlanner["moodle"];
  expired: boolean;
  onContinue(): void;
  onLogout(): void;
}) {
  const id = useId();
  const [url, setUrl] = useState("");
  const [editedUrl, setEditedUrl] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const defaultUrl = moodle.status?.defaultUrl;

  useEffect(() => {
    if (!editedUrl && defaultUrl) setUrl(defaultUrl);
  }, [defaultUrl, editedUrl]);

  if (!moodle.status && !moodle.error && !moodle.busy)
    return (
      <div className="dw-body">
        <h2 className="visually-hidden">Entrar no Moodle</h2>
        <p className="dw-wait" role="status">
          <LoaderCircle className="spinner" size={24} aria-hidden="true" />
          Verificando…
        </p>
      </div>
    );

  if (moodle.status?.authenticated) {
    const who = [moodle.status.name, hostOf(moodle.status.connectedUrl)]
      .filter(Boolean)
      .join(" · ");
    return (
      <>
        <div className="dw-body">
          <h2 className="visually-hidden">Entrar no Moodle</h2>
          <div className="dw-connected">
            <span className="dw-seal" aria-hidden="true">
              <Check size={32} strokeWidth={3} />
            </span>
            <div>
              <p className="dw-big">Conectado</p>
              {who && <p className="dw-help">{who}</p>}
            </div>
          </div>
        </div>
        <div className="dw-actions">
          <button type="button" className="primary dw-primary" onClick={onContinue}>
            Continuar
            <ArrowRight size={22} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="dw-link"
            disabled={moodle.busy}
            onClick={onLogout}
          >
            <LogOut size={20} aria-hidden="true" />
            Trocar de conta
          </button>
        </div>
      </>
    );
  }

  const insecure = url.trim().toLowerCase().startsWith("http:");
  const formId = `${id}-login`;
  return (
    <>
      <div className="dw-body">
        <h2 className="visually-hidden">Entrar no Moodle</h2>
        {expired && <p className="dw-warning">A conexão terminou. Entre de novo.</p>}
        <form
          id={formId}
          className="dw-login"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitting(true);
            void moodle.login(username, password, url.trim()).finally(() => {
              setPassword("");
              setSubmitting(false);
            });
          }}
        >
          <div className="dw-field">
            <label htmlFor={`${id}-url`}>Endereço do Moodle</label>
            <input
              id={`${id}-url`}
              className="dw-input"
              type="url"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://moodle.exemplo.edu.br"
              value={url}
              disabled={moodle.busy}
              required
              aria-describedby={insecure ? `${id}-insecure` : undefined}
              onChange={(event) => {
                setEditedUrl(true);
                setUrl(event.target.value);
              }}
            />
            {insecure && (
              <p id={`${id}-insecure`} className="dw-warning">
                Este endereço não protege a senha.
              </p>
            )}
          </div>
          <div className="dw-field">
            <label htmlFor={`${id}-user`}>Usuário</label>
            <input
              id={`${id}-user`}
              className="dw-input"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              disabled={moodle.busy}
              required
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div className="dw-field">
            <label htmlFor={`${id}-password`}>Senha</label>
            <div className="dw-password">
              <input
                id={`${id}-password`}
                className="dw-input"
                type={reveal ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                disabled={moodle.busy}
                required
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="dw-reveal"
                onClick={() => setReveal(!reveal)}
              >
                {reveal ? (
                  <EyeOff size={20} aria-hidden="true" />
                ) : (
                  <Eye size={20} aria-hidden="true" />
                )}
                {reveal ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>
        </form>
        {moodle.status?.issues?.map((issue, index) => (
          <p className="dw-help" key={index}>
            {issue.message}
          </p>
        ))}
      </div>
      <div className="dw-actions">
        <button
          type="submit"
          form={formId}
          className="primary dw-primary"
          disabled={moodle.busy}
        >
          {submitting ? (
            <LoaderCircle className="spinner" size={22} aria-hidden="true" />
          ) : (
            <LogIn size={22} aria-hidden="true" />
          )}
          {submitting ? "Entrando…" : "Entrar"}
        </button>
        <p className="dw-help">A senha não é guardada.</p>
      </div>
    </>
  );
}
