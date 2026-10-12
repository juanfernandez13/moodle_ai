"use client";

import { useEffect, useState } from "react";
import { Globe, LogIn, LogOut, RefreshCw } from "lucide-react";
import type { useMoodle } from "../hooks/use-moodle.ts";

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
      <h3>Conectar ao Moodle</h3>
      {moodle.error && (
        <p className="error-text preserve-text" role="alert">
          {moodle.error}
        </p>
      )}
      {!moodle.status && !moodle.error ? (
        <p className="field-help" role="status">
          Consultando a conexão…
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
              <RefreshCw size={16} /> Carregar cursos
            </button>
            <button
              type="button"
              className="secondary"
              disabled={moodle.busy}
              onClick={() => {
                void moodle.logout();
              }}
            >
              <LogOut size={16} /> Desconectar / trocar Moodle
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
          <p className="field-help">
            Informe o endereço e use o login padrão da sua instalação. A sessão
            expira em 30 minutos e não é salva nos projetos.
          </p>
          {moodle.status?.issues?.map((issue, index) => (
            <p className="field-help" key={index}>
              {issue.message}
            </p>
          ))}
          <label className="field">
            <span>URL do Moodle</span>
            <input
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://moodle.exemplo.edu.br"
              value={url}
              disabled={moodle.busy}
              required
              onChange={(event) => {
                setEditedUrl(true);
                setUrl(event.target.value);
              }}
            />
            <span className="field-help">
              Inclua a pasta da instalação, se houver:
              https://exemplo.edu.br/moodle.
            </span>
          </label>
          {url.trim().toLowerCase().startsWith("http:") && (
            <p className="field-help">
              HTTP envia os dados sem criptografia. Prefira HTTPS quando
              disponível.
            </p>
          )}
          <div className="field-grid">
            <label className="field">
              <span>Usuário Moodle</span>
              <input
                autoComplete="username"
                value={username}
                disabled={moodle.busy}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Senha Moodle</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                disabled={moodle.busy}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
          </div>
          <button type="submit" className="secondary" disabled={moodle.busy}>
            <LogIn size={16} />{" "}
            {moodle.busy ? "Conectando…" : "Conectar Moodle"}
          </button>
          <p className="field-help">
            A compatibilidade de cada instalação depende da versão, dos plugins
            e das permissões. Revise as prévias antes de confirmar alterações.
          </p>
        </form>
      )}
    </section>
  );
}
