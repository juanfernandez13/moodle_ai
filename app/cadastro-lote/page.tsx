"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FileSpreadsheet,
  Download,
  Check,
  AlertCircle,
  Upload,
  Eye,
} from "lucide-react";
import { Shell } from "../../src/client/components/shell.tsx";
import { downloadFile, formatBytes } from "../../src/client/download.ts";
import {
  MoodleConnection,
  useMoodle,
  moodlePost,
} from "../../src/client/components/moodle-connection.tsx";
import { z } from "zod";
import { Pagination } from "../../src/client/components/pagination.tsx";
import {
  mapStudentRows,
  validateStudents,
  buildStudentPreview,
} from "../../src/domain/students/index.ts";
import type {
  StudentRow,
  StudentMapping,
  StudentPreview,
  StudentOptions,
} from "../../src/domain/students/index.ts";

const fields = [
  ["fullName", "Nome completo"],
  ["firstName", "Primeiro nome"],
  ["lastName", "Sobrenome"],
  ["email", "E-mail"],
  ["username", "Usuário"],
  ["cpf", "CPF"],
  ["course", "Curso"],
] as const;
export default function StudentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [matrix, setMatrix] = useState<string[][]>([]);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [sheet, setSheet] = useState("");
  const [sheets, setSheets] = useState<string[]>([]);
  const [mapping, setMapping] = useState<StudentMapping>({
    header: true,
    columns: {},
  });
  const [mappingOpen, setMappingOpen] = useState(false);
  const [options, setOptions] = useState<StudentOptions>({
    mode: "create",
    enrol: true,
  });
  const [destinations, setDestinations] = useState("");
  const [previews, setPreviews] = useState<StudentPreview[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [page, setPage] = useState(0);
  const [opsPage, setOpsPage] = useState(0);
  const moodle = useMoodle();
  const [previewIndex, setPreviewIndex] = useState(0);
  const [moodlePreview, setMoodlePreview] = useState<{
    previewId: string;
    hash: string;
    rows: {
      username: string;
      name?: string | undefined;
      email?: string | undefined;
      status: string;
    }[];
    effectiveOptions?:
      | {
          mode: string;
          enrol: boolean;
          newPassword: string;
          existingPasswords: string;
          updateFields: string;
          allowDelete: boolean;
          allowRename: boolean;
          allowSuspend: boolean;
          defaults: Record<string, string>;
          enrolments: {
            courseId: number;
            shortName: string;
            enrolId: number;
            method: "manual";
            roleId: number;
            role: "student";
            durationSeconds: number;
            expiryNotify: boolean;
          }[];
        }
      | undefined;
    issues?: { code: string; message: string }[] | undefined;
  } | null>(null);
  const [results, setResults] = useState<
    { username: string; status: string; message: string }[]
  >([]);
  const [unknownResult, setUnknownResult] = useState(false);
  const generation = useRef(0);
  const validation = useMemo(
    () => (rows.length ? validateStudents(rows) : { valid: false, issues: [] }),
    [rows],
  );
  const invalidate = () => {
    generation.current++;
    setPreviews([]);
    setPreviewIndex(0);
    setMoodlePreview(null);
    setResults([]);
    if (stage === 3) setStage(2);
    setError("");
  };
  function changeRow(
    id: string,
    field: keyof Pick<
      StudentRow,
      "username" | "firstName" | "lastName" | "email" | "cpf" | "course"
    >,
    value: string,
  ) {
    invalidate();
    setRows((previous) =>
      previous.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }
  async function parse(source: File, targetSheet?: string) {
    setBusy(true);
    invalidate();
    setFile(source);
    try {
      if (source.size > 8 * 1024 * 1024)
        throw new Error("A planilha pode ter até 8 MiB.");
      const data = new FormData();
      data.set("file", source);
      if (targetSheet) data.set("sheet", targetSheet);
      const response = await fetch("/api/students/parse", {
        method: "POST",
        body: data,
      });
      const result = (await response.json()) as {
        ok: boolean;
        rows?: StudentRow[];
        matrix?: string[][];
        sheet?: string;
        sheetNames?: string[];
        issues?: { message: string }[];
      };
      if (result.matrix) setMatrix(result.matrix);
      if (result.sheetNames) setSheets(result.sheetNames);
      if (result.sheet) setSheet(result.sheet);
      if (!response.ok || !result.ok || !result.rows) {
        setMappingOpen(Boolean(result.matrix));
        throw new Error(
          result.issues?.map((issue) => issue.message).join("\n") ||
            "Não foi possível interpretar a planilha.",
        );
      }
      setRows(result.rows);
      setPage(0);
      setStage(2);
      setMappingOpen(false);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível ler a planilha. A revisão anterior foi preservada.",
      );
    } finally {
      setBusy(false);
    }
  }
  function example() {
    const source = [
      ["Nome completo", "E-mail", "CPF", "Curso"],
      ["Ana Lima", "ana@example.org", "", "PROG-2026"],
      ["Bruno Costa", "bruno@", "", "PROG-2026"],
    ];
    invalidate();
    setFile(null);
    setMatrix(source);
    setRows(mapStudentRows(source));
    setPage(0);
    setSheets([]);
    setStage(2);
    setMappingOpen(false);
  }
  async function preview() {
    const revision = generation.current;
    setBusy(true);
    setError("");
    try {
      const courses = [
        ...new Set(
          destinations
            .split(/[,;\n]/)
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ];
      const batches =
        options.enrol && courses.length
          ? courses.map((course) => rows.map((row) => ({ ...row, course })))
          : [rows];
      const results = await Promise.all(
        batches.map((batch) => buildStudentPreview(batch, options)),
      );
      const failed = results.find((result) => !result.ok);
      if (failed && !failed.ok)
        throw new Error(
          failed.issues
            .map(
              (issue) =>
                `Linha ${rows.find((row) => row.id === issue.rowId)?.rowNumber ?? "?"}: ${issue.message}`,
            )
            .join("\n"),
        );
      if (revision !== generation.current)
        throw new Error(
          "A lista mudou durante a conferência. Gere uma nova prévia.",
        );
      setPreviews(
        results.flatMap((result) => (result.ok ? [result.preview] : [])),
      );
      setStage(3);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível conferir o lote.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function previewMoodle() {
    const candidate = previews[previewIndex];
    if (!candidate) return;
    const expected = generation.current;
    setBusy(true);
    setError("");
    try {
      const value = await moodlePost("/api/moodle/students/preview", {
        rows: candidate.rows,
        options: candidate.options,
        expectedHash: candidate.hash,
      });
      const parsed = z
        .object({
          ok: z.literal(true),
          previewId: z.string(),
          hash: z.string(),
          rows: z.array(
            z.object({
              username: z.string(),
              name: z.string().optional(),
              email: z.string().optional(),
              status: z.string(),
            }),
          ),
          effectiveOptions: z.object({
            mode: z.enum(["create", "update"]),
            enrol: z.boolean(),
            newPassword: z.enum([
              "generated-by-moodle-and-email",
              "not-created",
            ]),
            existingPasswords: z.literal("preserved"),
            updateFields: z.literal("csv-only"),
            allowDelete: z.literal(false),
            allowRename: z.literal(false),
            allowSuspend: z.literal(false),
            defaults: z.record(z.string(), z.string()),
            enrolments: z.array(
              z.object({
                courseId: z.number().int().positive(),
                shortName: z.string(),
                enrolId: z.number().int().positive(),
                method: z.literal("manual"),
                roleId: z.number().int().positive(),
                role: z.literal("student"),
                durationSeconds: z.number().int().nonnegative(),
                expiryNotify: z.boolean(),
              }),
            ),
          }),
          issues: z
            .array(z.object({ code: z.string(), message: z.string() }))
            .optional(),
        })
        .parse(value);
      if (generation.current !== expected)
        throw new Error("A lista mudou; confira o CSV novamente.");
      if (parsed.hash !== candidate.hash)
        throw new Error(
          "A identificação da prévia mudou. Confira o CSV novamente.",
        );
      setMoodlePreview(parsed);
      setOpsPage(0);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "A prévia no Moodle falhou.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function confirmMoodle() {
    if (!moodlePreview) return;
    const approved = moodlePreview;
    setMoodlePreview(null);
    setBusy(true);
    setError("");
    try {
      const value = await moodlePost("/api/moodle/students/confirm", {
        previewId: approved.previewId,
        expectedHash: approved.hash,
        confirmation: true,
      });
      const parsed = z
        .object({
          ok: z.literal(true),
          results: z.array(
            z.object({
              username: z.string(),
              status: z.enum(["created", "updated", "error", "unknown"]),
              message: z.string(),
            }),
          ),
        })
        .parse(value);
      setResults(parsed.results);
      setUnknownResult(
        parsed.results.some((entry) => entry.status === "unknown"),
      );
    } catch (failure) {
      setUnknownResult(true);
      setError(
        `${failure instanceof Error ? failure.message : "O resultado do envio é desconhecido."} Confira o estado dos usuários no Moodle antes de repetir.`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell active="students">
      <main className="tool-panel glass">
        <div className="tool-heading">
          <div>
            <h1>Cadastro em lote</h1>
            <p>
              Importe uma planilha fictícia, confira cada linha e prepare os
              CSVs. Nesta execução, o envio usa somente o laboratório local.
            </p>
          </div>
          <Link className="text-button" href="/">
            <ArrowLeft size={17} />
            Voltar ao curso
          </Link>
        </div>
        <ol className="steps" aria-label="Etapas do cadastro">
          <li className={stage === 1 ? "current" : ""}>
            <button type="button" onClick={() => setStage(1)}>
              1. Planilha
            </button>
          </li>
          <li className={stage === 2 ? "current" : ""}>
            <button
              type="button"
              disabled={!rows.length}
              onClick={() => setStage(2)}
            >
              2. Revisão
            </button>
          </li>
          <li className={stage === 3 ? "current" : ""}>
            <button
              type="button"
              disabled={!previews.length}
              onClick={() => setStage(3)}
            >
              3. Download
            </button>
          </li>
        </ol>
        {error && (
          <div className="status-banner error-banner" role="alert">
            <AlertCircle size={18} />
            <span className="preserve-text">{error}</span>
          </div>
        )}
        <section hidden={stage !== 1}>
          <div className="upload-group planning-group">
            <div className="upload-row">
              <FileSpreadsheet size={25} />
              <div className="upload-copy">
                <label htmlFor="student-file">Planilha de alunos</label>
                <p>
                  {file
                    ? `${file.name} · ${formatBytes(file.size)}`
                    : "XLS, XLSX ou CSV · até 8 MiB"}
                </p>
              </div>
              <label htmlFor="student-file" className="file-button">
                <Upload size={16} />
                Escolher planilha
                <input
                  id="student-file"
                  className="visually-hidden"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(event) => {
                    if (event.target.files?.[0])
                      void parse(event.target.files[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          <div className="button-row">
            <button type="button" className="text-button" onClick={example}>
              Usar planilha de exemplo
            </button>
            {matrix.length > 0 && (
              <button
                type="button"
                className="text-button"
                onClick={() => setMappingOpen(!mappingOpen)}
              >
                Conferir mapeamento
              </button>
            )}
          </div>
          {sheets.length > 1 && (
            <label className="field">
              <span>Aba da planilha</span>
              <select
                value={sheet}
                disabled={busy}
                onChange={(event) => {
                  setSheet(event.target.value);
                  if (file) void parse(file, event.target.value);
                }}
              >
                {sheets.map((entry) => (
                  <option key={entry}>{entry}</option>
                ))}
              </select>
            </label>
          )}
          {mappingOpen && matrix.length > 0 && (
            <section className="notice">
              <h2>Relacionar as colunas</h2>
              <p>
                Confira a primeira linha. Ela só será tratada como cabeçalho se
                você marcar a opção.
              </p>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={mapping.header}
                  onChange={(event) =>
                    setMapping({ ...mapping, header: event.target.checked })
                  }
                />
                A primeira linha contém os nomes das colunas
              </label>
              <div className="table-scroll sheet-preview">
                <table>
                  <tbody>
                    {matrix.slice(0, 4).map((row, index) => (
                      <tr key={index}>
                        {row.map((value, column) => (
                          <td key={column}>{value || "(vazio)"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mapping-grid">
                {fields.map(([field, label]) => (
                  <label className="field" key={field}>
                    <span>{label}</span>
                    <select
                      value={mapping.columns[field] ?? ""}
                      onChange={(event) => {
                        const columns = { ...mapping.columns };
                        if (event.target.value)
                          columns[field] = Number(event.target.value);
                        else delete columns[field];
                        setMapping({ ...mapping, columns });
                      }}
                    >
                      <option value="">Não usar coluna</option>
                      {Array.from(
                        {
                          length: Math.max(...matrix.map((row) => row.length)),
                        },
                        (_, index) => (
                          <option key={index} value={index}>
                            Coluna {index + 1}
                            {mapping.header
                              ? `: ${matrix[0]?.[index] ?? ""}`
                              : ""}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  try {
                    const next = mapStudentRows(matrix, mapping);
                    invalidate();
                    setRows(next);
                    setPage(0);
                    setStage(2);
                    setMappingOpen(false);
                  } catch (failure) {
                    setError(
                      failure instanceof Error
                        ? failure.message
                        : "Confira o mapeamento.",
                    );
                  }
                }}
              >
                Aplicar mapeamento
              </button>
            </section>
          )}
          {rows.length > 0 && (
            <button
              className="primary"
              type="button"
              onClick={() => setStage(2)}
            >
              Continuar revisão
            </button>
          )}
        </section>
        {rows.length > 0 && stage === 2 && (
          <>
            <div className="section-heading">
              <div>
                <h2>Conferir {rows.length} alunos</h2>
                <p className="field-help">
                  A linha e os valores originais continuam disponíveis. Corrigir
                  um campo revalida a lista.
                </p>
              </div>
              <span
                className={validation.valid ? "valid-count" : "issue-count"}
              >
                {validation.valid ? (
                  <Check size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
                {validation.issues.length} pendências
              </span>
            </div>
            <div className="table-scroll student-table">
              <table>
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Usuário</th>
                    <th>Primeiro nome</th>
                    <th>Sobrenome</th>
                    <th>E-mail</th>
                    <th>CPF</th>
                    <th>Curso</th>
                    <th>Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(page * 10, page * 10 + 10).map((row) => (
                    <tr key={row.id} id={`student-${row.id}`}>
                      <td>{row.rowNumber}</td>
                      {(
                        [
                          "username",
                          "firstName",
                          "lastName",
                          "email",
                          "cpf",
                          "course",
                        ] as const
                      ).map((field) => (
                        <td key={field}>
                          <input
                            aria-label={`Linha ${row.rowNumber}: ${field === "firstName" ? "primeiro nome" : field === "lastName" ? "sobrenome" : field === "username" ? "usuário" : field === "email" ? "e-mail" : field === "cpf" ? "CPF" : "curso"}`}
                            value={row[field]}
                            aria-invalid={validation.issues.some(
                              (issue) =>
                                issue.rowId === row.id &&
                                issue.path.endsWith(field),
                            )}
                            onChange={(event) =>
                              changeRow(row.id, field, event.target.value)
                            }
                          />
                        </td>
                      ))}
                      <td>
                        <details>
                          <summary>Fonte</summary>
                          {Object.entries(row.original).map(([key, value]) => (
                            <p key={key}>
                              {key}: {value}
                            </p>
                          ))}
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} count={rows.length} onChange={setPage} />
            {validation.issues.length > 0 && (
              <div className="review-issues">
                {validation.issues.map((issue, index) => (
                  <button
                    type="button"
                    className="issue-link"
                    key={index}
                    onClick={() => {
                      setPage(
                        Math.floor(
                          rows.findIndex((row) => row.id === issue.rowId) / 10,
                        ),
                      );
                      setTimeout(() => {
                        const node = document.getElementById(
                          `student-${issue.rowId}`,
                        );
                        node?.scrollIntoView({ block: "center" });
                        (
                          node?.querySelector(
                            "[aria-invalid=true]",
                          ) as HTMLElement | null
                        )?.focus();
                      }, 50);
                    }}
                  >
                    Linha{" "}
                    {rows.find((row) => row.id === issue.rowId)?.rowNumber}:{" "}
                    {issue.message}
                  </button>
                ))}
              </div>
            )}
            <div className="field-grid">
              <label className="field">
                <span>Modo de cadastro</span>
                <select
                  value={options.mode}
                  onChange={(event) => {
                    invalidate();
                    setOptions({
                      ...options,
                      mode: event.target.value as "create" | "update",
                    });
                  }}
                >
                  <option value="create">Criar novos usuários</option>
                  <option value="update">Atualizar usuários existentes</option>
                </select>
              </label>
              <label className="field">
                <span>Cursos para todo o lote (opcional)</span>
                <input
                  value={destinations}
                  onChange={(event) => {
                    invalidate();
                    setDestinations(event.target.value);
                  }}
                  placeholder="PROG-2026, LOGICA-2026"
                />
                <small className="field-help">
                  Um CSV por curso, com todos os alunos. Em branco, mantém o
                  curso informado em cada linha.
                </small>
              </label>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={options.enrol}
                onChange={(event) => {
                  invalidate();
                  setOptions({ ...options, enrol: event.target.checked });
                }}
              />
              Incluir matrícula em curso no CSV
            </label>
            <button
              type="button"
              className="primary"
              disabled={busy || !validation.valid}
              onClick={() => {
                void preview();
              }}
            >
              <Eye size={18} />
              Conferir e preparar CSV
            </button>
          </>
        )}
        {previews.length > 0 && stage === 3 && (
          <section className="delivery">
            <div>
              <h2>CSVs conferidos</h2>
              <p>
                Os arquivos correspondem à lista e às opções que você conferiu.
                Editar invalida esta prévia.
              </p>
              {previews.map((preview, index) => (
                <div className="preset-row" key={preview.hash}>
                  <span>
                    <strong>
                      {preview.rows[0]?.course || "Cadastro de usuários"}
                    </strong>
                    <small>
                      {preview.count} alunos · identificação{" "}
                      {preview.hash.slice(0, 12)}
                    </small>
                  </span>
                  <button
                    type="button"
                    className="primary"
                    onClick={() =>
                      downloadFile(
                        new TextEncoder().encode(preview.csv),
                        `alunos-${preview.rows[0]?.course || index + 1}.csv`,
                        "text/csv;charset=utf-8",
                      )
                    }
                  >
                    <Download size={17} />
                    Baixar CSV
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
        <section hidden={stage !== 3}>
          <MoodleConnection moodle={moodle} />
          {moodle.courses.length > 0 && (
            <label className="field">
              <span>Usar um curso do Moodle para todo o lote</span>
              <select
                value=""
                onChange={(event) => {
                  invalidate();
                  setDestinations(event.target.value);
                }}
              >
                <option value="">Selecione um curso</option>
                {moodle.courses.map((course) => (
                  <option
                    key={course.id}
                    value={course.shortName ?? ""}
                    disabled={!course.shortName}
                  >
                    {course.title}
                    {course.shortName
                      ? ` (${course.shortName})`
                      : " — sem nome curto disponível"}
                  </option>
                ))}
              </select>
            </label>
          )}
          {previews.length > 1 && (
            <label className="field">
              <span>CSV para conferir no Moodle</span>
              <select
                value={previewIndex}
                onChange={(event) => {
                  generation.current++;
                  setPreviewIndex(Number(event.target.value));
                  setMoodlePreview(null);
                  setOpsPage(0);
                }}
              >
                {previews.map((entry, index) => (
                  <option key={entry.hash} value={index}>
                    {entry.rows[0]?.course || `Lote ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="tool-warning">
            A primeira etapa envia somente o CSV à prévia Moodle. Criar ou
            atualizar alunos exige confirmar a prévia atual.
          </div>
          <button
            type="button"
            className="secondary"
            disabled={
              busy ||
              unknownResult ||
              previews.length === 0 ||
              !moodle.status?.authenticated ||
              !moodle.status.validated
            }
            onClick={() => {
              void previewMoodle();
            }}
          >
            Conferir cadastro no Moodle
          </button>
          {moodlePreview && (
            <section className="notice">
              <h3>Prévia de cadastro no Moodle</h3>
              <p>
                Identificação {moodlePreview.hash.slice(0, 12)}. Nenhum aluno
                foi cadastrado nesta etapa.
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moodlePreview.rows
                      .slice(opsPage * 10, opsPage * 10 + 10)
                      .map((row, index) => (
                        <tr key={`${row.username}-${index}`}>
                          <td>{row.username}</td>
                          <td>{row.name}</td>
                          <td>{row.email}</td>
                          <td>{row.status}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={opsPage}
                count={moodlePreview.rows.length}
                onChange={setOpsPage}
              />
              {moodlePreview.effectiveOptions && (
                <details className="form-details" open>
                  <summary>Opções efetivas do cadastro</summary>
                  <p>
                    Novas senhas:{" "}
                    {moodlePreview.effectiveOptions.newPassword ===
                    "generated-by-moodle-and-email"
                      ? "geradas pelo Moodle e enviadas por e-mail"
                      : "não são criadas"}
                    . Senhas existentes são preservadas. Só os campos do CSV são
                    atualizados.
                  </p>
                  <dl>
                    {Object.entries(
                      moodlePreview.effectiveOptions.defaults,
                    ).map(([key, value]) => (
                      <div key={key}>
                        <dt>
                          {key === "city"
                            ? "Cidade"
                            : key === "country"
                              ? "País"
                              : key}
                        </dt>
                        <dd>{value || "(em branco)"}</dd>
                      </div>
                    ))}
                  </dl>
                  {moodlePreview.effectiveOptions.enrolments.length > 0 && (
                    <>
                      <p>
                        Matrícula manual com papel Estudante nos cursos
                        conferidos:
                      </p>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Curso</th>
                              <th>Duração</th>
                              <th>Aviso de expiração</th>
                            </tr>
                          </thead>
                          <tbody>
                            {moodlePreview.effectiveOptions.enrolments.map(
                              (enrolment) => (
                                <tr
                                  key={`${enrolment.courseId}-${enrolment.enrolId}`}
                                >
                                  <td>{enrolment.shortName}</td>
                                  <td>
                                    {enrolment.durationSeconds === 0
                                      ? "Sem prazo"
                                      : `${enrolment.durationSeconds / 86400} dias`}
                                  </td>
                                  <td>
                                    {enrolment.expiryNotify
                                      ? "Ativado"
                                      : "Desativado"}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                  <p className="field-help">
                    Exclusão, renomeação e suspensão de usuários estão
                    desativadas.
                  </p>
                </details>
              )}
              {moodlePreview.issues?.map((issue) => (
                <p className="field-help" key={issue.code}>
                  {issue.message}
                </p>
              ))}
              <button
                type="button"
                className="primary"
                disabled={busy || !moodle.status?.authenticated}
                onClick={() => {
                  void confirmMoodle();
                }}
              >
                Confirmar cadastro de {moodlePreview.rows.length} alunos
              </button>
            </section>
          )}
          {results.length > 0 && (
            <section className="notice">
              <h3>Resultado por aluno</h3>
              <table>
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Estado</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {results
                    .slice(opsPage * 10, opsPage * 10 + 10)
                    .map((entry, index) => (
                      <tr key={`${entry.username}-${index}`}>
                        <td>{entry.username}</td>
                        <td>
                          {{
                            created: "Criado",
                            updated: "Atualizado",
                            error: "Erro",
                            unknown: "Desconhecido",
                          }[entry.status] ?? entry.status}
                        </td>
                        <td>{entry.message}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <Pagination
                page={opsPage}
                count={results.length}
                onChange={setOpsPage}
              />
            </section>
          )}
          {unknownResult && (
            <p className="error-text">
              Há resultado desconhecido. O reenvio está bloqueado nesta sessão;
              confira os usuários no Moodle antes de uma nova operação.
            </p>
          )}
        </section>
        <p className="field-help">
          As planilhas de alunos permanecem somente nesta sessão e não entram no
          projeto portátil do curso.
        </p>
        <Link className="tool-link" href="/datas">
          Planejar datas de unidades e atividades
        </Link>
      </main>
    </Shell>
  );
}
