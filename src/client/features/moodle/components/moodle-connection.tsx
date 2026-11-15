"use client";

import { useEffect, useState } from "react";
import { Globe, LogIn, LogOut, RefreshCw } from "lucide-react";
import type { useMoodle } from "../hooks/use-moodle.ts";

/** Entrar no Moodle, com as mesmas palavras da página Datas: Endereço do Moodle, Usuário, Senha, Entrar. */
export function MoodleConnection({
  moodle,
}: {
  moodle: ReturnType<typeof useMoodle>;
}) {
  const [url, setUrl] = useState("");
  const [editedUrl, setEditedUrl] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const defaultUrl = moodle.status?.defaultUrl;

  useEffect(() => {
    if (!editedUrl && defaultUrl) setUrl(defaultUrl);
  }, [defaultUrl, editedUrl]);

  return (
    <section
      className="moodle-connection notice"
      aria-label="Conexão com Moodle"
    >
      <h3>Entrar no Moodle</h3>
      {moodle.error && (
        <p className="error-text preserve-text" role="alert">
          {moodle.error}
        </p>
      )}
      {!moodle.status && !moodle.error ? (
        <p className="field-help" role="status">
          Verificando…
        </p>
      ) : moodle.status?.authenticated ? (
        <>
          <p>
            Conectado como{" "}
            <strong>{moodle.status.name || "usuário Moodle"}</strong>.
          </p>
          <p className="field-help preserve-text">
            <Globe size={14} aria-hidden="true" /> {moodle.status.connectedUrl}
          </p>
          <p className="field-help">{moodle.status.compatibility.message}</p>
          <div className="button-row">
            <button
              type="button"
              className="secondary"
              disabled={moodle.busy}
              onClick={() => {
                void moodle.loadCourses();
              }}
            >
              <RefreshCw size={16} /> Carregar disciplinas
            </button>
            <button
              type="button"
              className="secondary"
              disabled={moodle.busy}
              onClick={() => {
                void moodle.logout();
              }}
            >
              <LogOut size={16} /> Trocar de conta
            </button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void moodle
              .login(username, password, url.trim())
              .finally(() => setPassword(""));
          }}
        >
          {moodle.status?.issues?.map((issue, index) => (
            <p className="field-help" key={index}>
              {issue.message}
            </p>
          ))}
          {/* id e name fixos: é por eles que o navegador e o gerenciador de senhas guardam e preenchem o login. */}
          <label className="field" htmlFor="moodle-login-url">
            <span>Endereço do Moodle</span>
            <input
              id="moodle-login-url"
              name="url"
              type="url"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              placeholder="Ex.: https://moodle.suaescola.edu.br"
              value={url}
              disabled={moodle.busy}
              required
              onChange={(event) => {
                setEditedUrl(true);
                setUrl(event.target.value);
              }}
            />
          </label>
          {url.trim().toLowerCase().startsWith("http:") && (
            <p className="field-help">Este endereço não protege a senha.</p>
          )}
          <div className="field-grid">
            <label className="field" htmlFor="moodle-login-username">
              <span>Usuário</span>
              <input
                id="moodle-login-username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                value={username}
                disabled={moodle.busy}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>
            <label className="field" htmlFor="moodle-login-password">
              <span>Senha</span>
              <input
                id="moodle-login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                enterKeyHint="done"
                value={password}
                disabled={moodle.busy}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
          </div>
          <button type="submit" className="secondary" disabled={moodle.busy}>
            <LogIn size={16} /> {moodle.busy ? "Entrando…" : "Entrar"}
          </button>
          <p className="field-help">A senha não é guardada.</p>
        </form>
      )}
    </section>
  );
}
