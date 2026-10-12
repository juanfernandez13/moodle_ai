"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { LogIn, LogOut, RefreshCw } from "lucide-react";

const statusSchema = z.object({
  configured: z.boolean(),
  validated: z.boolean(),
  authenticated: z.boolean(),
  name: z.string().optional(),
  profile: z.unknown().optional(),
  issues: z.array(z.object({ message: z.string() })).optional(),
});
export type MoodleStatus = z.infer<typeof statusSchema>;
export type MoodleCourse = {
  id: number;
  title: string;
  shortName?: string | undefined;
};
export function useMoodle() {
  const [status, setStatus] = useState<MoodleStatus | null>(null);
  const [courses, setCourses] = useState<MoodleCourse[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = async () => {
    try {
      const response = await fetch("/api/moodle/status", { cache: "no-store" });
      if (!response.ok)
        throw new Error(
          "A integração Moodle ainda não está disponível nesta instalação.",
        );
      setStatus(statusSchema.parse(await response.json()));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Conexão Moodle indisponível.",
      );
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  async function login(username: string, password: string) {
    setBusy(true);
    setError("");
    try {
      await moodlePost("/api/moodle/login", { username, password });
      await refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível entrar no Moodle.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await moodlePost("/api/moodle/logout", {});
      setCourses([]);
      await refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível encerrar a sessão.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function loadCourses() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/moodle/courses", {
        cache: "no-store",
      });
      const value: unknown = await response.json();
      const result = z
        .object({
          ok: z.literal(true),
          courses: z.array(
            z.object({
              id: z.number().int().positive(),
              title: z.string(),
              shortName: z.string().optional(),
            }),
          ),
        })
        .safeParse(value);
      if (!response.ok || !result.success)
        throw new Error(
          issuesMessage(value, "Não foi possível ler os cursos."),
        );
      setCourses(result.data.courses);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível ler os cursos.",
      );
    } finally {
      setBusy(false);
    }
  }
  return { status, courses, busy, error, login, logout, loadCourses, refresh };
}
export function issuesMessage(value: unknown, fallback: string): string {
  const parsed = z
    .object({ issues: z.array(z.object({ message: z.string() })) })
    .safeParse(value);
  return parsed.success
    ? parsed.data.issues.map((issue) => issue.message).join("\n") || fallback
    : fallback;
}
export async function moodlePost(
  path: string,
  body: unknown,
): Promise<unknown> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const value: unknown = await response.json();
  const envelope = z.object({ ok: z.boolean() }).safeParse(value);
  if (!response.ok || !envelope.success || !envelope.data.ok)
    throw new Error(
      issuesMessage(
        value,
        "A operação não foi concluída. Confira o estado antes de repetir.",
      ),
    );
  return value;
}

export function MoodleConnection({
  moodle,
}: {
  moodle: ReturnType<typeof useMoodle>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  return (
    <section className="moodle-connection notice">
      <h3>Conexão com o laboratório Moodle</h3>
      {moodle.error && (
        <p className="error-text preserve-text" role="alert">
          {moodle.error}
        </p>
      )}
      {!moodle.status ? (
        <p className="field-help">Consultando a configuração da instalação…</p>
      ) : !moodle.status.configured ? (
        <p className="field-help">
          Esta instalação não tem laboratório Moodle configurado. Os CSVs e
          planos locais continuam disponíveis. A conexão é configurada no
          servidor pelo responsável.
        </p>
      ) : !moodle.status.validated ? (
        <p className="field-help">
          O ambiente configurado ainda aguarda validação do adaptador. Operações
          de cadastro e datas permanecem bloqueadas.
        </p>
      ) : moodle.status.authenticated ? (
        <>
          <p>
            Conectado como{" "}
            <strong>{moodle.status.name || "usuário Moodle"}</strong>.
          </p>
          <div className="button-row">
            <button
              type="button"
              className="secondary"
              disabled={moodle.busy}
              onClick={() => {
                void moodle.loadCourses();
              }}
            >
              <RefreshCw size={16} />
              Carregar cursos
            </button>
            <button
              type="button"
              className="text-button"
              disabled={moodle.busy}
              onClick={() => {
                void moodle.logout();
              }}
            >
              <LogOut size={16} />
              Desconectar
            </button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void moodle.login(username, password).then(() => setPassword(""));
          }}
        >
          <p className="field-help">
            Entre somente no laboratório Moodle local configurado nesta
            instalação. Use contas fictícias. A sessão expira e não é incluída
            em projetos ou downloads.
          </p>
          <div className="field-grid">
            <label className="field">
              <span>Usuário do laboratório</span>
              <input
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Senha do laboratório</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
          </div>
          <button type="submit" className="secondary" disabled={moodle.busy}>
            <LogIn size={16} />
            Entrar no laboratório
          </button>
        </form>
      )}
    </section>
  );
}
