"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Shell } from "../../src/client/components/shell.tsx";
import {
  buildDatePlan,
  previewDatePlan,
} from "../../src/domain/dates/index.ts";
import type {
  DatePlanInput,
  DateTarget,
  DatePlan,
} from "../../src/domain/dates/index.ts";
import { downloadFile } from "../../src/client/download.ts";
import {
  MoodleConnection,
  useMoodle,
  moodlePost,
  issuesMessage,
} from "../../src/client/components/moodle-connection.tsx";
import { z } from "zod";
import { Pagination } from "../../src/client/components/pagination.tsx";

export default function DatesPage() {
  const [input, setInput] = useState<DatePlanInput>({
    startDate: "2026-10-19",
    unitCount: 4,
    daysPerUnit: 7,
    opensAtTime: "00:00",
    closesAtTime: "23:59",
    timezoneOffsetMinutes: -180,
  });
  const [targetsText, setTargetsText] = useState("");
  const [preview, setPreview] = useState<{
    hash: string;
    plan: DatePlan;
  } | null>(null);
  const [error, setError] = useState("");
  const [pane, setPane] = useState<
    "plan" | "connection" | "preview" | "result"
  >("plan");
  const [page, setPage] = useState(0);
  const moodle = useMoodle();
  const [courseId, setCourseId] = useState(0);
  const [busy, setBusy] = useState(false);
  const [moodlePreview, setMoodlePreview] = useState<{
    previewId: string;
    hash: string;
    plan: DatePlan;
  } | null>(null);
  const [results, setResults] = useState<
    {
      id: string;
      title?: string | undefined;
      status: string;
      message: string;
    }[]
  >([]);
  const [unknownResult, setUnknownResult] = useState(false);
  const revision = useRef(0);
  function change(field: keyof DatePlanInput, value: string | number) {
    revision.current++;
    setPreview(null);
    setMoodlePreview(null);
    setError("");
    setInput((previous) => ({ ...previous, [field]: value }));
  }
  async function simulate() {
    setError("");
    const expected = revision.current;
    try {
      let targets: DateTarget[];
      if (targetsText.trim()) targets = JSON.parse(targetsText) as DateTarget[];
      else
        targets = Array.from({ length: input.unitCount }, (_, sectionIndex) => [
          {
            id: `section-${sectionIndex + 1}`,
            kind: "section" as const,
            sectionIndex,
            title: `Unidade ${sectionIndex + 1}`,
          },
          {
            id: `assignment-${sectionIndex + 1}`,
            kind: "assignment" as const,
            sectionIndex,
            title: `Tarefa da unidade ${sectionIndex + 1}`,
          },
          {
            id: `quiz-${sectionIndex + 1}`,
            kind: "quiz" as const,
            sectionIndex,
            title: `Quiz da unidade ${sectionIndex + 1}`,
          },
        ]).flat();
      const result = buildDatePlan(input, targets);
      if (!result.ok)
        throw new Error(
          result.issues
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join("\n"),
        );
      const next = await previewDatePlan(result.plan);
      if (expected !== revision.current)
        throw new Error("O planejamento mudou. Simule novamente.");
      setPreview(next);
      setMoodlePreview(null);
      setPage(0);
      setPane("preview");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Confira as datas e os alvos.",
      );
    }
  }
  const display = (value?: string) =>
    value
      ? new Date(value).toLocaleString("pt-BR", { timeZone: "UTC" }) + " UTC"
      : "Sem data";
  async function previewMoodleDates() {
    const expected = revision.current;
    setBusy(true);
    setError("");
    try {
      const value = await moodlePost("/api/moodle/dates/preview", {
        courseId,
        input,
      });
      const parsed = z
        .object({
          ok: z.literal(true),
          previewId: z.string(),
          hash: z.string(),
          plan: z.unknown(),
          targets: z.array(z.unknown()),
        })
        .parse(value);
      const calculated = buildDatePlan(input, parsed.targets as DateTarget[]);
      if (
        !calculated.ok ||
        JSON.stringify(calculated.plan) !== JSON.stringify(parsed.plan)
      )
        throw new Error(
          "O plano recebido difere dos alvos e das regras atuais. Confira a configuração.",
        );
      if (expected !== revision.current)
        throw new Error("O planejamento mudou. Confira novamente.");
      setMoodlePreview({
        previewId: parsed.previewId,
        hash: parsed.hash,
        plan: calculated.plan,
      });
      setPage(0);
      setPane("preview");
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "A prévia Moodle falhou.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function confirmDates() {
    if (!moodlePreview) return;
    const approved = moodlePreview;
    setMoodlePreview(null);
    setBusy(true);
    setPane("result");
    setError("");
    try {
      const value = await moodlePost("/api/moodle/dates/confirm", {
        previewId: approved.previewId,
        expectedHash: approved.hash,
        confirmation: true,
      });
      const parsed = z
        .object({
          ok: z.literal(true),
          results: z.array(
            z.object({
              id: z.string(),
              title: z.string().optional(),
              status: z.enum(["applied", "error", "unknown", "not_applied"]),
              message: z.string(),
            }),
          ),
        })
        .parse(value);
      setResults(parsed.results);
      setPage(0);
      setPane("result");
      setUnknownResult(
        parsed.results.some((entry) => entry.status === "unknown"),
      );
    } catch (failure) {
      setUnknownResult(true);
      setError(
        `${failure instanceof Error ? failure.message : "O resultado é desconhecido."} Confira as datas atuais no Moodle antes de repetir.`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function readTargets() {
    const expected = revision.current;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/moodle/course?courseId=${courseId}`, {
        cache: "no-store",
      });
      const value: unknown = await response.json();
      const parsed = z
        .object({ ok: z.literal(true), targets: z.array(z.unknown()) })
        .safeParse(value);
      if (!response.ok || !parsed.success)
        throw new Error(
          issuesMessage(value, "Não foi possível ler os alvos do curso."),
        );
      const targets = parsed.data.targets as DateTarget[];
      const count = Math.max(
        ...targets.map((target) => target.sectionIndex + 1),
      );
      const check = buildDatePlan({ ...input, unitCount: count }, targets);
      if (!check.ok)
        throw new Error(check.issues.map((issue) => issue.message).join("\n"));
      if (expected !== revision.current)
        throw new Error(
          "O curso ou plano mudou durante a leitura. Leia novamente.",
        );
      change("unitCount", count);
      setTargetsText(JSON.stringify(targets, null, 2));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível ler o curso.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell active="dates">
      <main className="tool-panel glass">
        <div className="tool-heading">
          <div>
            <h1>Planejar datas</h1>
            <p>
              Defina a cadência, confira o antes e depois e exporte um plano
              identificado.
            </p>
          </div>
          <Link href="/" className="text-button">
            <ArrowLeft size={17} />
            Voltar ao curso
          </Link>
        </div>
        <nav className="panel-tabs" aria-label="Etapas das datas">
          {[
            ["plan", "Planejar"],
            ["connection", "Laboratório"],
            ["preview", "Conferir"],
            ["result", "Resultado"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={pane === id}
              disabled={
                (id === "preview" && !preview && !moodlePreview) ||
                (id === "result" && !results.length && !unknownResult)
              }
              onClick={() => setPane(id as typeof pane)}
            >
              {label}
            </button>
          ))}
        </nav>
        {error && (
          <div className="status-banner error-banner" role="alert">
            <AlertCircle size={18} />
            <span className="preserve-text">{error}</span>
          </div>
        )}
        <section hidden={pane !== "plan"}>
          <div className="field-grid">
            <label className="field">
              <span>Início do cronograma</span>
              <input
                type="date"
                value={input.startDate}
                min="1900-01-01"
                max="2100-12-31"
                onChange={(event) => change("startDate", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Quantidade de unidades</span>
              <input
                type="number"
                min="1"
                max="200"
                value={input.unitCount}
                onChange={(event) =>
                  change("unitCount", Number(event.target.value))
                }
              />
            </label>
            <label className="field">
              <span>Dias por unidade</span>
              <input
                type="number"
                min="1"
                max="365"
                value={input.daysPerUnit}
                onChange={(event) =>
                  change("daysPerUnit", Number(event.target.value))
                }
              />
            </label>
            <label className="field">
              <span>Fuso horário</span>
              <select
                value={input.timezoneOffsetMinutes}
                onChange={(event) =>
                  change("timezoneOffsetMinutes", Number(event.target.value))
                }
              >
                <option value={-180}>UTC−3 (Fortaleza/Brasília)</option>
                <option value={-240}>UTC−4</option>
                <option value={0}>UTC</option>
                <option value={60}>UTC+1</option>
              </select>
            </label>
            <label className="field">
              <span>Horário de abertura</span>
              <input
                type="time"
                value={input.opensAtTime}
                onChange={(event) => change("opensAtTime", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Horário de fechamento no último dia</span>
              <input
                type="time"
                value={input.closesAtTime}
                onChange={(event) => change("closesAtTime", event.target.value)}
              />
            </label>
          </div>
          <details className="form-details">
            <summary>Usar alvos de um curso existente</summary>
            <p className="field-help">
              Cole uma lista JSON de alvos: id, kind
              (section/assignment/quiz/forum), sectionIndex a partir de zero,
              title, opensAt/closesAt e availability opcionais. As demais
              condições de acesso são preservadas.
            </p>
            <label className="field">
              <span>Alvos JSON (opcional)</span>
              <textarea
                className="json-input"
                value={targetsText}
                onChange={(event) => {
                  revision.current++;
                  setPreview(null);
                  setMoodlePreview(null);
                  setError("");
                  setTargetsText(event.target.value);
                }}
                placeholder={
                  '[{"id":"tarefa-1","kind":"assignment","sectionIndex":0,"title":"Tarefa 1"}]'
                }
              />
            </label>
          </details>
          <div className="notice">
            <CalendarDays size={19} /> Sem alvos próprios, o plano usa unidades,
            tarefas e quizzes fictícios. Unidades recebem somente abertura;
            atividades também recebem fechamento.
          </div>
          <button
            type="button"
            className="primary"
            onClick={() => {
              void simulate();
            }}
          >
            <Eye size={18} />
            Simular cronograma
          </button>
        </section>
        {preview && pane === "preview" && !moodlePreview && (
          <section className="date-results">
            <h2>Conferir antes e depois</h2>
            <p className="field-help">
              Plano {preview.hash.slice(0, 16)}. Alterar qualquer campo invalida
              esta prévia.
            </p>
            <div className="table-scroll date-preview">
              <table>
                <thead>
                  <tr>
                    <th>Alvo</th>
                    <th>Abertura anterior</th>
                    <th>Nova abertura</th>
                    <th>Fechamento anterior</th>
                    <th>Novo fechamento</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.plan.changes
                    .slice(page * 10, page * 10 + 10)
                    .map((change) => (
                      <tr key={change.id}>
                        <td>
                          {change.title}
                          <small>{change.kind}</small>
                        </td>
                        <td>{display(change.before.opensAt)}</td>
                        <td>{display(change.after.opensAt)}</td>
                        <td>{display(change.before.closesAt)}</td>
                        <td>{display(change.after.closesAt)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              count={preview.plan.changes.length}
              onChange={setPage}
            />
            <button
              type="button"
              className="primary"
              onClick={() =>
                downloadFile(
                  new TextEncoder().encode(JSON.stringify(preview, null, 2)),
                  "cronograma-conferido.json",
                  "application/json",
                )
              }
            >
              <Download size={18} />
              Baixar plano conferido
            </button>
          </section>
        )}
        <section hidden={pane !== "connection"}>
          <MoodleConnection moodle={moodle} />
          {moodle.courses.length > 0 && (
            <>
              <label className="field">
                <span>Curso no Moodle</span>
                <select
                  value={courseId || ""}
                  onChange={(event) => {
                    revision.current++;
                    setMoodlePreview(null);
                    setResults([]);
                    setCourseId(Number(event.target.value));
                  }}
                >
                  <option value="">Escolha um curso</option>
                  {moodle.courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="secondary"
                disabled={busy || !courseId}
                onClick={() => {
                  void readTargets();
                }}
              >
                Ler datas atuais do curso
              </button>
            </>
          )}
          <div className="tool-warning">
            A prévia lê os formulários atuais do curso. Aplicar exige confirmar
            o antes e depois; nenhuma mudança é enviada ao abrir esta página.
          </div>
          <button
            type="button"
            className="secondary"
            disabled={
              busy ||
              unknownResult ||
              !courseId ||
              !moodle.status?.authenticated ||
              !moodle.status.validated
            }
            onClick={() => {
              void previewMoodleDates();
            }}
          >
            Conferir mudanças no Moodle
          </button>
        </section>
        {moodlePreview && pane === "preview" && (
          <section className="notice">
            <h3>Prévia de mudanças no Moodle</h3>
            <p>
              Identificação {moodlePreview.hash.slice(0, 16)}. Confira{" "}
              {moodlePreview.plan.changes.length} alvos antes de aplicar.
            </p>
            <div className="table-scroll date-preview">
              <table>
                <thead>
                  <tr>
                    <th>Alvo</th>
                    <th>Abertura anterior</th>
                    <th>Nova abertura</th>
                    <th>Fechamento anterior</th>
                    <th>Novo fechamento</th>
                  </tr>
                </thead>
                <tbody>
                  {moodlePreview.plan.changes
                    .slice(page * 10, page * 10 + 10)
                    .map((change) => (
                      <tr key={change.id}>
                        <td>{change.title}</td>
                        <td>{display(change.before.opensAt)}</td>
                        <td>{display(change.after.opensAt)}</td>
                        <td>{display(change.before.closesAt)}</td>
                        <td>{display(change.after.closesAt)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              count={moodlePreview.plan.changes.length}
              onChange={setPage}
            />
            <button
              type="button"
              className="primary"
              disabled={busy || !moodle.status?.authenticated}
              onClick={() => {
                void confirmDates();
              }}
            >
              Confirmar alterações de datas
            </button>
          </section>
        )}
        {results.length > 0 && pane === "result" && (
          <section className="notice">
            <h3>Resultado por alvo</h3>
            <p>
              {results.filter((entry) => entry.status === "applied").length} de{" "}
              {results.length} alvos aplicados.
              {results.some((entry) => entry.status === "applied") &&
              results.some((entry) => entry.status !== "applied")
                ? " A aplicação foi parcial; confira os demais resultados antes de continuar."
                : ""}
            </p>
            <table>
              <thead>
                <tr>
                  <th>Alvo</th>
                  <th>Estado</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(page * 10, page * 10 + 10).map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.title || entry.id}</td>
                    <td>
                      {{
                        applied: "Aplicado",
                        error: "Erro",
                        unknown: "Desconhecido",
                        not_applied: "Não aplicado",
                      }[entry.status] ?? entry.status}
                    </td>
                    <td>{entry.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} count={results.length} onChange={setPage} />
          </section>
        )}
        {unknownResult && (
          <p className="error-text">
            Há resultado desconhecido. Confira o Moodle antes de outra
            aplicação; uma nova tentativa está bloqueada nesta sessão.
          </p>
        )}
      </main>
    </Shell>
  );
}
