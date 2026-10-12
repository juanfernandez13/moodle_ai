"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  Download,
  Save,
  FolderOpen,
  Copy,
  Code2,
  BookOpen,
  Paperclip,
  AlertCircle,
  ArrowLeft,
  LoaderCircle,
  ClipboardList,
  ListChecks,
} from "lucide-react";
import { validateDraft } from "../src/domain/course/index.ts";
import type {
  ValidationIssue,
  ContentBlock,
} from "../src/domain/course/index.ts";
import { courseDraftSchema } from "../src/domain/course/schema.ts";
import { Shell } from "../src/client/components/shell.tsx";
import { EntryMascot } from "../src/client/components/entry-mascot.tsx";
import { Modal } from "../src/client/components/modal.tsx";
import { ActivityEditor } from "../src/client/components/activity-editor.tsx";
import {
  RichEditor,
  ContentPreview,
} from "../src/client/components/content.tsx";
import {
  createProject,
  makeSection,
  makeActivity,
  makeQuestion,
  newId,
  activityLabels,
  validateProject,
  projectIdentity,
} from "../src/client/project.ts";
import type { CourseProject, ProjectFile } from "../src/client/project.ts";
import { applyCommands } from "../src/client/commands.ts";
import type { CourseCommand } from "../src/client/commands.ts";
import { ProjectStore } from "../src/client/project-store.ts";
import { createPortable, readPortable } from "../src/client/portable.ts";
import {
  downloadFile,
  formatBytes,
  fromBase64,
} from "../src/client/download.ts";
import { registerBuilderTools } from "../src/client/webmcp.ts";
import type { CourseProposal } from "../src/client/webmcp.ts";
import {
  captureProvenance,
  importProvenanceSchema,
  sourcePreviewSchema,
  withDraft,
} from "../src/client/provenance.ts";
import { ProvenanceViewer } from "../src/client/components/provenance-viewer.tsx";
import { Pagination } from "../src/client/components/pagination.tsx";
import { focusIssueField, richBlockFocus } from "../src/client/navigation.ts";
import { utcFieldValue, utcTimestamp } from "../src/client/dates.ts";

type View = string;
type UiIssue = Omit<ValidationIssue, "severity"> & {
  severity: "error" | "warning";
};
type ImportProposal = {
  project: CourseProject;
  issues: UiIssue[];
  preview: { name: string; blocks: ContentBlock[] }[];
};
const apiFile = z.strictObject({
  id: z.string(),
  name: z.string(),
  mediaType: z.string(),
  base64: z.string(),
});
const safeIssue = z.strictObject({
  code: z.string(),
  path: z.string(),
  severity: z.enum(["error", "warning"]),
  message: z.string(),
});

// Preserve the current editing session while switching to the auxiliary screens.
// API credentials stay in component memory and never enter this workspace cache.
const workspaceSession = {
  project: null as CourseProject | null,
  revisions: new Map<string, number>(),
  blocked: new Set<string>(),
  queue: Promise.resolve() as Promise<void>,
};

function projectIssues(project: CourseProject): UiIssue[] {
  const issues: UiIssue[] = [...validateDraft(project.draft).issues];
  for (const attachment of project.draft.attachments) {
    if (
      !project.assets.some(
        (asset) =>
          asset.id === attachment.id && asset.bytes.length === attachment.size,
      )
    )
      issues.push({
        code: "missing_bytes",
        path: `attachments[${project.draft.attachments.indexOf(attachment)}]`,
        severity: "error",
        message: `Adicione os bytes do anexo “${attachment.name}” em Arquivos do projeto.`,
      });
  }
  return issues;
}

function activitySummary(
  activities: CourseProject["draft"]["sections"][number]["activities"],
): string {
  const total = `${activities.length} ${activities.length === 1 ? "atividade" : "atividades"}`;
  const tasks = activities.filter((entry) => entry.type === "assignment").length;
  const quizzes = activities.filter((entry) => entry.type === "quiz").length;
  return [
    total,
    tasks > 0 ? `${tasks} ${tasks === 1 ? "tarefa" : "tarefas"}` : "",
    quizzes > 0 ? `${quizzes} ${quizzes === 1 ? "quiz" : "quizzes"}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function Home() {
  const [project, setProject] = useState<CourseProject | null>(
    workspaceSession.project,
  );
  const projectRef = useRef<CourseProject | null>(null);
  projectRef.current = project;
  const [projects, setProjects] = useState<CourseProject[]>([]);
  const store = useRef<ProjectStore | null>(null);
  const savedRevisions = useRef(workspaceSession.revisions);
  const blocked = useRef(workspaceSession.blocked);
  const saveQueue = useRef(workspaceSession.queue);
  const [storageReady, setStorageReady] = useState(false);
  const [saveState, setSaveState] = useState("Ainda não salvo");
  const [lastCopy, setLastCopy] = useState<number | null>(null);
  const [entry, setEntry] = useState<"files" | "manual" | "json">("files");
  const [coursePane, setCoursePane] = useState("discipline");
  const [name, setName] = useState("");
  const [firstSection, setFirstSection] = useState("Unidade 1");
  const [jsonText, setJsonText] = useState("");
  const [view, setView] = useState<View>("course");
  const [activityId, setActivityId] = useState<string | null>(null);
  const [activityPages, setActivityPages] = useState<Record<string, number>>(
    {},
  );
  const [issueFocus, setIssueFocus] = useState<{
    activityId: string;
    path: string;
    request: number;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<{
    planning: File[];
    tasks: File[];
    quizzes: File[];
  }>({ planning: [], tasks: [], quizzes: [] });
  const [profile, setProfile] = useState<"docx-topicos-v1" | "docx-semanal-v1">(
    "docx-topicos-v1",
  );
  const [provider, setProvider] = useState<"offline" | "openai" | "gemini">(
    "offline",
  );
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState<"import" | "export" | "copy" | null>(null);
  const controller = useRef<AbortController | null>(null);
  const [proposal, setProposal] = useState<ImportProposal | null>(null);
  const proposalTrigger = useRef<HTMLElement | null>(null);
  const [agentProposal, setAgentProposal] = useState<CourseProposal | null>(
    null,
  );
  const [showPrompt, setShowPrompt] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [validatedRevision, setValidatedRevision] = useState<number | null>(
    null,
  );
  const [artifact, setArtifact] = useState<{
    bytes: Uint8Array;
    name: string;
    revision: number;
    glossaryUserinfo: boolean;
  } | null>(null);
  const [missingTarget, setMissingTarget] = useState("");
  const portableInput = useRef<HTMLInputElement>(null);
  const issues = useMemo(
    () => (project ? projectIssues(project) : []),
    [project],
  );
  const section = project?.draft.sections.find((entry) => entry.id === view);
  const activity = section?.activities.find((entry) => entry.id === activityId);
  const activityPage = section
    ? Math.min(
        activityPages[section.id] ?? 0,
        Math.max(0, Math.ceil(section.activities.length / 5) - 1),
      )
    : 0;
  const visibleActivities =
    section?.activities
      .map((entry, index) => ({ entry, index }))
      .slice(activityPage * 5, activityPage * 5 + 5) ?? [];
  const allActivities =
    project?.draft.sections.flatMap((section) => section.activities) ?? [];

  useEffect(() => {
    const database = new ProjectStore(indexedDB);
    store.current = database;
    database
      .list()
      .then((list) => {
        setProjects(list);
        setStorageReady(true);
      })
      .catch((failure: unknown) =>
        setError(
          failure instanceof Error
            ? failure.message
            : "Armazenamento indisponível. Exporte uma cópia portátil.",
        ),
      );
    return () => {
      void saveQueue.current.finally(() => database.close());
    };
  }, []);
  useEffect(() => {
    workspaceSession.project = project;
  }, [project]);
  useEffect(
    () => registerBuilderTools(() => projectRef.current, setAgentProposal),
    [],
  );
  useEffect(() => {
    if (!project || !storageReady || !store.current) return;
    const snapshot = structuredClone(project);
    const workspaceId = projectIdentity(snapshot);
    setSaveState("Salvando neste navegador…");
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(async () => {
        if (blocked.current.has(workspaceId)) return;
        try {
          await store.current!.save(
            snapshot,
            savedRevisions.current.get(workspaceId) ?? null,
          );
          savedRevisions.current.set(workspaceId, snapshot.draft.revision);
          if (
            projectRef.current &&
            projectIdentity(projectRef.current) === workspaceId &&
            projectRef.current.draft.revision === snapshot.draft.revision
          )
            setSaveState(
              `Salvo neste navegador · revisão ${snapshot.draft.revision}`,
            );
          setProjects(await store.current!.list());
        } catch (failure) {
          const text =
            failure instanceof Error
              ? failure.message
              : "Falha ao salvar. Exporte uma cópia portátil.";
          if (/outra aba/i.test(text)) blocked.current.add(workspaceId);
          if (
            projectRef.current &&
            projectIdentity(projectRef.current) === workspaceId
          )
            setSaveState(`Não salvo: ${text}`);
        }
      });
    workspaceSession.queue = saveQueue.current;
  }, [project, storageReady]);

  function openProject(next: CourseProject) {
    setProject(next);
    setView("course");
    setActivityId(null);
    setValidatedRevision(null);
    setArtifact(null);
    setLastCopy(null);
    setError("");
    setMessage("Curso aberto. Confira o conteúdo antes de exportar.");
  }
  function commands(
    changes: CourseCommand[],
    expectedRevision = project?.draft.revision,
    origin: "user" | "preset" = "user",
    presetId?: string,
  ) {
    if (!project || expectedRevision === undefined) return;
    const result = applyCommands(project.draft, expectedRevision, changes);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setProject(
      withDraft(
        project,
        result.draft,
        origin,
        presetId,
        origin === "preset" ? ["metadata.organization", "gradebook"] : [],
      ),
    );
    setValidatedRevision(null);
    setError("");
  }
  function showIssue(issue: UiIssue) {
    setShowReview(false);
    setError(`${issue.message} (${issue.path})`);
    const sectionIndex = Number(issue.path.match(/^sections\[(\d+)\]/)?.[1]);
    const activityIndex = Number(
      issue.path.match(/\.activities\[(\d+)\]/)?.[1],
    );
    setIssueFocus((previous) => ({
      activityId:
        project?.draft.sections[sectionIndex]?.activities[activityIndex]?.id ??
        "",
      path: issue.path,
      request: (previous?.request ?? 0) + 1,
    }));
    if (issue.path.startsWith("attachments")) setView("files");
    else if (issue.path.startsWith("gradebook")) setView("grades");
    else if (
      Number.isInteger(sectionIndex) &&
      project?.draft.sections[sectionIndex]
    ) {
      const target = project.draft.sections[sectionIndex]!;
      setView(target.id);
      if (Number.isInteger(activityIndex))
        setActivityPages((previous) => ({
          ...previous,
          [target.id]: Math.floor(activityIndex / 5),
        }));
      setActivityId(
        Number.isInteger(activityIndex)
          ? (target.activities[activityIndex]?.id ?? null)
          : null,
      );
    } else {
      setView("course");
      setCoursePane(
        issue.path.startsWith("metadata.teacher")
          ? "teacher"
          : /^metadata\.(organization|startDate|workloadHours|semester|className)/.test(
                issue.path,
              )
            ? "organization"
            : "discipline",
      );
    }
    setTimeout(() => {
      focusIssueField(project?.draft, issue.path, document);
    }, 50);
  }
  async function openSaved(id: string) {
    try {
      const next = await store.current?.load(id);
      if (!next) throw new Error("Projeto não encontrado.");
      savedRevisions.current.set(id, next.draft.revision);
      blocked.current.delete(id);
      openProject(next);
      setShowProjects(false);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível reabrir.",
      );
    }
  }
  function example() {
    const next = createProject("Introdução à programação", "Primeiros passos");
    next.draft.metadata.shortName = "PROG-2026";
    next.draft.metadata.summary =
      "Um curso de exemplo para explorar atividades, questões e revisão.";
    next.draft.sections.push(makeSection(2));
    next.draft.sections[1]!.title = "Praticar e construir";
    for (const type of [
      "forum",
      "assignment",
      "quiz",
      "chat",
      "wiki",
      "glossary",
    ])
      next.draft.sections[0]!.activities.push(makeActivity(type));
    const quiz = next.draft.sections[0]!.activities.find(
      (entry) => entry.type === "quiz",
    );
    if (quiz?.type === "quiz") {
      quiz.questions[0]!.statement =
        "Qual conceito permite repetir uma instrução?";
      quiz.questions.push(makeQuestion("matching"), makeQuestion("essay"));
    }
    next.draft.sections[1]!.activities.push(
      makeActivity("assignment"),
      makeActivity("quiz"),
    );
    const bytes = new TextEncoder().encode(
      "Material de apoio fictício. Leia, pratique e revise seu algoritmo.",
    );
    const file = {
      id: newId("attachment"),
      name: "material-de-apoio.txt",
      mediaType: "text/plain",
      bytes,
    };
    next.assets.push(file);
    next.draft.attachments.push({
      id: file.id,
      name: file.name,
      mediaType: file.mediaType,
      size: bytes.length,
    });
    next.draft.sections[0]!.activities.find(
      (entry) => entry.type === "assignment",
    )!.attachmentIds.push(file.id);
    openProject(next);
  }
  function importJson(trigger: HTMLElement) {
    proposalTrigger.current = trigger;
    try {
      const value: unknown = JSON.parse(jsonText);
      const result = validateDraft(value);
      if (!result.valid) {
        setError(
          result.issues
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join("\n"),
        );
        return;
      }
      const next = createProject();
      next.draft = result.draft;
      setProposal({ project: next, issues: projectIssues(next), preview: [] });
    } catch {
      setError("JSON inválido. Confira vírgulas, aspas e a versão do curso.");
    }
  }
  async function importDocuments(textOnly = false, trigger?: HTMLElement) {
    proposalTrigger.current =
      trigger ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    setError("");
    setMessage("");
    if (!textOnly && selectedFiles.planning.length === 0) {
      setError(
        "Escolha um documento de planejamento ou crie o curso manualmente.",
      );
      return;
    }
    if (textOnly && !pasteText.trim()) {
      setError("Cole o texto do planejamento antes de interpretar.");
      return;
    }
    if (!textOnly) {
      const files = [
        ...selectedFiles.planning,
        ...selectedFiles.tasks,
        ...selectedFiles.quizzes,
      ];
      if (
        files.length > 10 ||
        files.some((file) => file.size > 10 * 1024 * 1024) ||
        files.reduce((size, file) => size + file.size, 0) > 20 * 1024 * 1024
      ) {
        setError(
          "Importe até 10 arquivos, com até 10 MiB por arquivo e 20 MiB no total.",
        );
        return;
      }
    }
    const abort = new AbortController();
    controller.current = abort;
    setBusy("import");
    try {
      let response: Response;
      if (textOnly)
        response = await fetch("/api/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: pasteText,
            profile,
            provider,
            ...(apiKey ? { apiKey } : {}),
            ...(model ? { model } : {}),
          }),
          signal: abort.signal,
        });
      else {
        const data = new FormData();
        for (const file of [
          ...selectedFiles.planning,
          ...selectedFiles.tasks,
          ...selectedFiles.quizzes,
        ])
          data.append("files", file);
        data.set("profile", profile);
        data.set("provider", provider);
        if (apiKey) data.set("apiKey", apiKey);
        if (model) data.set("model", model);
        response = await fetch("/api/import", {
          method: "POST",
          body: data,
          signal: abort.signal,
        });
      }
      const value: unknown = await response.json();
      const envelope = z
        .object({
          ok: z.boolean(),
          issues: z.array(safeIssue),
          draft: z.unknown().optional(),
          assets: z.array(apiFile).optional(),
          sources: z.array(apiFile).optional(),
          provenance: importProvenanceSchema.optional(),
          preview: z.array(sourcePreviewSchema).optional(),
        })
        .parse(value);
      if (!response.ok || !envelope.ok) {
        setError(
          envelope.issues
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join("\n") ||
            "O documento não foi reconhecido. Tente o perfil adequado ou continue manualmente.",
        );
        return;
      }
      const draft = validateDraft(envelope.draft);
      if (!draft.valid)
        throw new Error("A proposta recebida não atende ao contrato do curso.");
      const convert = (file: z.infer<typeof apiFile>): ProjectFile => ({
        id: file.id,
        name: file.name,
        mediaType: file.mediaType,
        bytes: fromBase64(file.base64),
      });
      const next = createProject();
      next.draft = draft.draft;
      next.assets = (envelope.assets ?? []).map(convert);
      next.sources = (envelope.sources ?? []).map(convert);
      next.profiles.importProfile = profile;
      next.profiles.provider = provider;
      if (!envelope.provenance || !envelope.preview)
        throw new Error(
          "A proposta não informou a rastreabilidade e a prévia das fontes.",
        );
      next.provenance = captureProvenance(
        next.draft,
        envelope.provenance,
        envelope.preview,
      );
      validateProject(next);
      setProposal({
        project: next,
        issues: envelope.issues,
        preview: (envelope.preview ?? []).map((entry) => ({
          name: entry.name,
          blocks: entry.blocks,
        })),
      });
    } catch (failure) {
      setError(
        abort.signal.aborted
          ? "Interpretação cancelada. Seus arquivos e o curso anterior foram mantidos."
          : failure instanceof Error
            ? failure.message
            : "A interpretação falhou. Sua entrada foi mantida.",
      );
    } finally {
      setBusy(null);
      controller.current = null;
    }
  }
  async function portable(nextFile?: File) {
    setBusy("copy");
    setError("");
    try {
      if (nextFile) {
        const next = await readPortable(
          new Uint8Array(await nextFile.arrayBuffer()),
        );
        const existing = projects.find(
          (entry) => projectIdentity(entry) === projectIdentity(next),
        );
        if (existing)
          throw new Error(
            "Este projeto já está salvo neste navegador. Reabra em Projetos salvos; a importação não substituiu a versão existente.",
          );
        setProposal({ project: next, issues: [], preview: [] });
      } else if (project) {
        const bytes = await createPortable(project);
        downloadFile(
          bytes,
          `${project.draft.metadata.shortName || "curso"}.moodleai`,
          "application/zip",
        );
        setLastCopy(project.draft.revision);
        setMessage(
          `Cópia portátil da revisão ${project.draft.revision} pronta, com arquivos e presets.`,
        );
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "A cópia não foi importada. Seu curso anterior está intacto.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function addFiles(files: FileList | null) {
    if (!files || !project) return;
    try {
      const additions: ProjectFile[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 16 * 1024 * 1024)
          throw new Error("Cada arquivo pode ter até 16 MiB.");
        additions.push({
          id:
            missingTarget && files.length === 1
              ? missingTarget
              : newId("attachment"),
          name: file.name,
          mediaType: file.type || "application/octet-stream",
          bytes: new Uint8Array(await file.arrayBuffer()),
        });
      }
      const current = projectRef.current;
      if (!current || projectIdentity(current) !== projectIdentity(project))
        throw new Error("O projeto mudou enquanto os arquivos eram lidos.");
      if (
        [...current.assets, ...current.sources, ...additions].reduce(
          (sum, file) => sum + file.bytes.length,
          0,
        ) >
        64 * 1024 * 1024
      )
        throw new Error("Os arquivos do projeto podem somar até 64 MiB.");
      const attachments = [
        ...current.draft.attachments.filter(
          (entry) => !additions.some((file) => file.id === entry.id),
        ),
        ...additions.map((file) => ({
          id: file.id,
          name: file.name,
          size: file.bytes.length,
          mediaType: file.mediaType,
        })),
      ];
      const result = applyCommands(current.draft, current.draft.revision, [
        { type: "set_attachments", attachments },
      ]);
      if (!result.ok) throw new Error(result.message);
      setProject({
        ...withDraft(current, result.draft),
        assets: [
          ...current.assets.filter(
            (entry) => !additions.some((file) => file.id === entry.id),
          ),
          ...additions,
        ],
      });
      setValidatedRevision(null);
      setMissingTarget("");
      setError("");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível adicionar o arquivo.",
      );
    }
  }
  async function exportMbz() {
    if (
      !project ||
      validatedRevision !== project.draft.revision ||
      issues.some((issue) => issue.severity === "error")
    ) {
      setError("Confira e valide a revisão atual antes de gerar o curso.");
      return;
    }
    const snapshot = structuredClone(project);
    const abort = new AbortController();
    controller.current = abort;
    setBusy("export");
    setError("");
    try {
      const data = new FormData();
      data.set("draft", JSON.stringify(snapshot.draft));
      for (const file of snapshot.assets)
        data.set(
          `file:${file.id}`,
          new Blob([Uint8Array.from(file.bytes)], { type: file.mediaType }),
          file.name,
        );
      const response = await fetch("/api/export", {
        method: "POST",
        body: data,
        signal: abort.signal,
      });
      if (!response.ok) {
        const body = (await response.json()) as { issues?: ValidationIssue[] };
        throw new Error(
          body.issues
            ?.map((issue) => `${issue.path}: ${issue.message}`)
            .join("\n") || "Não foi possível gerar o backup.",
        );
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      const current = projectRef.current;
      if (
        !current ||
        projectIdentity(current) !== projectIdentity(snapshot) ||
        current.draft.revision !== snapshot.draft.revision
      )
        throw new Error(
          "O projeto mudou durante a geração. Confira a revisão atual e gere o backup novamente.",
        );
      const filename =
        response.headers
          .get("content-disposition")
          ?.match(/filename="?([^";]+)"?/)?.[1] ??
        `${snapshot.draft.metadata.shortName}-r${snapshot.draft.revision}.mbz`;
      setArtifact({
        bytes,
        name: filename,
        revision: snapshot.draft.revision,
        glossaryUserinfo:
          response.headers.get("x-moodleai-glossary-userinfo") === "required",
      });
      setShowReview(false);
      setMessage(
        `Backup da revisão ${snapshot.draft.revision} pronto para baixar.`,
      );
    } catch (failure) {
      setError(
        abort.signal.aborted
          ? "Geração cancelada. O curso foi mantido."
          : failure instanceof Error
            ? failure.message
            : "Falha na geração. O curso foi mantido.",
      );
    } finally {
      setBusy(null);
      controller.current = null;
    }
  }
  const prompt = `Transforme o planejamento fornecido em CourseDraft schemaVersion 1, sem inventar conteúdo ausente. Perfil: ${profile}; preset: ${project?.profiles.pedagogy ?? "personalizado"}. Preserve todas as atividades, questões e ocorrências de imagem. Use IDs estáveis globalmente únicos, nunca caminhos físicos ou credenciais. Retorne somente JSON. Tipo não suportado deve ser indicado para revisão, nunca convertido silenciosamente. Datas ISO8601 com fuso. Questão multiple-choice: exatamente uma alternativa fraction1 e demais0. Gradebook opcional: categorias somam100 e referenciam somente tarefa/quiz.\n\nContrato de estrutura:\n${JSON.stringify(z.toJSONSchema(courseDraftSchema, { unrepresentable: "any" }), null, 2)}\n\nForneça sua fonte junto deste prompt. Importe o resultado em Importar JSON e confira o curso.`;

  return (
    <Shell>
      <input
        ref={portableInput}
        type="file"
        className="visually-hidden"
        tabIndex={-1}
        accept=".moodleai,.zip"
        aria-label="Importar cópia portátil"
        onChange={(event) => {
          void portable(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {(error || message) && (
        <div
          className={`status-banner ${error ? "error-banner" : ""}`}
          role={error ? "alert" : "status"}
        >
          {error ? <AlertCircle size={18} /> : <Check size={18} />}
          <span className="preserve-text">{error || message}</span>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setError("");
              setMessage("");
            }}
          >
            Fechar
          </button>
        </div>
      )}
      {busy && (
        <div className="status-banner" role="status">
          <LoaderCircle className="spinner" size={18} />
          <span>
            {busy === "import"
              ? "Lendo e validando o planejamento…"
              : busy === "export"
                ? "Gerando o backup da revisão conferida…"
                : "Preparando a cópia portátil…"}
          </span>
          {controller.current && (
            <button
              type="button"
              className="text-button"
              onClick={() => controller.current?.abort()}
            >
              Cancelar
            </button>
          )}
        </div>
      )}
      {!project ? (
        <main className="entry-panel glass">
          <ol className="journey" aria-label="Etapas de criação">
            <li aria-current="step">
              <span>1</span>Documentos
            </li>
            <li>
              <span>2</span>Revisão
            </li>
            <li>
              <span>3</span>Baixar curso
            </li>
          </ol>
          <div className="entry-tabs" role="tablist" aria-label="Como começar">
            {[
              ["files", "Importar arquivos"],
              ["manual", "Criar manualmente"],
              ["json", "Importar JSON"],
            ].map(([value, label], index) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={entry === value}
                aria-controls={`panel-${value}`}
                id={`tab-${value}`}
                tabIndex={entry === value ? 0 : -1}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                    const modes = ["files", "manual", "json"] as const;
                    const next =
                      (index + (event.key === "ArrowRight" ? 1 : 2)) % 3;
                    setEntry(modes[next]!);
                    document.getElementById(`tab-${modes[next]}`)?.focus();
                  }
                }}
                onClick={() => {
                  setEntry(value as typeof entry);
                  setError("");
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <section
            id={`panel-${entry}`}
            role="tabpanel"
            aria-labelledby={`tab-${entry}`}
            className="entry-content"
          >
            <div className="panel-heading">
              <div>
                <h1>
                  {entry === "files"
                    ? "Arquivos do curso"
                    : entry === "manual"
                      ? "Comece sua disciplina"
                      : "Importar JSON"}
                </h1>
                <p>
                  {entry === "files"
                    ? "Adicione o planejamento e os materiais."
                    : entry === "manual"
                      ? "Dê um nome ao curso. As unidades e atividades vêm depois."
                      : "Traga um curso versionado ou a resposta de outra IA."}
                </p>
              </div>
              <EntryMascot />
            </div>
            {entry === "files" && (
              <>
                <div className="uploads">
                  {[
                    [
                      "planning",
                      "Documento de planejamento",
                      "Obrigatório",
                      "DOCX, PDF com texto ou TXT",
                      "Escolher documento",
                    ],
                    [
                      "tasks",
                      "Tarefas",
                      "Opcional",
                      "Documentos DOCX, PDF ou TXT de tarefas",
                      "Adicionar tarefas",
                    ],
                    [
                      "quizzes",
                      "Quizzes",
                      "Opcional",
                      "Documentos DOCX, PDF ou TXT com questões",
                      "Adicionar quizzes",
                    ],
                  ].map(([group, label, requirement, help, action]) => (
                    <div
                      className={`upload-group ${group === "planning" ? "planning-group" : ""}`}
                      id={`upload-group-${group}`}
                      key={group}
                    >
                      <div className="upload-row">
                        {group === "planning" ? (
                          <FileText size={24} aria-hidden="true" />
                        ) : group === "tasks" ? (
                          <ClipboardList size={24} aria-hidden="true" />
                        ) : (
                          <ListChecks size={24} aria-hidden="true" />
                        )}
                        <div className="upload-copy">
                          <label htmlFor={`upload-${group}`}>
                            {label}
                            <small>{requirement}</small>
                          </label>
                          <p>{help}</p>
                        </div>
                        <label
                          className="file-button"
                          htmlFor={`upload-${group}`}
                        >
                          {action}
                          <input
                            id={`upload-${group}`}
                            className="visually-hidden"
                            type="file"
                            multiple={group !== "planning"}
                            accept={".docx,.pdf,.txt"}
                            onChange={(event) => {
                              const files = Array.from(
                                event.target.files ?? [],
                              );
                              setSelectedFiles((previous) => ({
                                ...previous,
                                [group!]:
                                  group === "planning"
                                    ? files.slice(0, 1)
                                    : [
                                        ...previous[
                                          group as keyof typeof previous
                                        ],
                                        ...files,
                                      ],
                              }));
                              event.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                      {selectedFiles[group as keyof typeof selectedFiles]
                        .length > 0 && (
                        <ul className="file-list">
                          {selectedFiles[
                            group as keyof typeof selectedFiles
                          ].map((file, index) => (
                            <li key={`${file.name}-${index}`}>
                              <FileText size={17} />
                              <span>
                                {file.name}
                                <small>{formatBytes(file.size)}</small>
                              </span>
                              <button
                                type="button"
                                className="icon-button"
                                aria-label={`Remover ${file.name}`}
                                onClick={() =>
                                  setSelectedFiles((previous) => ({
                                    ...previous,
                                    [group!]: previous[
                                      group as keyof typeof previous
                                    ].filter(
                                      (_, position) => position !== index,
                                    ),
                                  }))
                                }
                              >
                                <Trash2 size={18} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
                <details className="interpret-settings">
                  <summary>
                    Organização:{" "}
                    {profile === "docx-topicos-v1" ? "tópicos" : "semanas"} ·{" "}
                    {provider === "offline"
                      ? "Perfil local, sem IA"
                      : provider === "openai"
                        ? "OpenAI"
                        : "Gemini"}
                  </summary>
                  <div className="field-grid">
                    <label className="field">
                      <span>Organização do documento</span>
                      <select
                        value={profile}
                        onChange={(event) =>
                          setProfile(event.target.value as typeof profile)
                        }
                      >
                        <option value="docx-topicos-v1">Por tópicos</option>
                        <option value="docx-semanal-v1">Por semanas</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Interpretar com</span>
                      <select
                        value={provider}
                        onChange={(event) =>
                          setProvider(event.target.value as typeof provider)
                        }
                      >
                        <option value="offline">Perfil local, sem IA</option>
                        <option value="openai">OpenAI</option>
                        <option value="gemini">Gemini</option>
                      </select>
                    </label>
                  </div>
                  <p className="field-help">
                    O perfil local aceita planejamentos delimitados e informa o
                    que não reconhece. Nada é enviado a uma IA nesse modo.
                  </p>
                  {provider !== "offline" && (
                    <>
                      <label className="field">
                        <span>Chave do provedor (somente nesta sessão)</span>
                        <input
                          type="password"
                          autoComplete="off"
                          value={apiKey}
                          onChange={(event) => setApiKey(event.target.value)}
                        />
                      </label>
                      <label className="field">
                        <span>Modelo</span>
                        <input
                          value={model}
                          onChange={(event) => setModel(event.target.value)}
                          placeholder={
                            provider === "openai"
                              ? "Modelo configurado pelo servidor"
                              : "Modelo configurado pelo servidor"
                          }
                        />
                      </label>
                      <p className="field-help">
                        O documento será enviado ao provedor escolhido. A chave
                        não será salva no projeto.
                      </p>
                    </>
                  )}
                  <label className="field">
                    <span>Ou cole um planejamento em texto</span>
                    <textarea
                      value={pasteText}
                      onChange={(event) => setPasteText(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy !== null}
                    onClick={(event) => {
                      void importDocuments(true, event.currentTarget);
                    }}
                  >
                    Interpretar texto
                  </button>
                </details>
                <button
                  type="button"
                  className="primary entry-primary"
                  disabled={busy !== null}
                  onClick={(event) => {
                    void importDocuments(false, event.currentTarget);
                  }}
                >
                  <Upload size={18} />
                  Interpretar planejamento
                </button>
                <p className="field-help centered import-limits">
                  Até 10 MiB por arquivo, 20 MiB e 10 arquivos no total. Confira
                  a proposta antes de abrir o editor.
                </p>
              </>
            )}
            {entry === "manual" && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!name.trim() || !firstSection.trim()) {
                    setError(
                      "Preencha o nome do curso e o título da primeira unidade.",
                    );
                    return;
                  }
                  const next = createProject(name, firstSection);
                  openProject(
                    withDraft(next, next.draft, "user", undefined, [
                      "metadata.fullName",
                      "sections[0].title",
                    ]),
                  );
                }}
              >
                <label className="field">
                  <span>Nome do curso</span>
                  <input
                    value={name}
                    maxLength={200}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ex.: Introdução à programação"
                  />
                </label>
                <label className="field">
                  <span>Primeira unidade</span>
                  <input
                    value={firstSection}
                    maxLength={200}
                    onChange={(event) => setFirstSection(event.target.value)}
                  />
                </label>
                <button type="submit" className="primary entry-primary">
                  <Plus size={18} />
                  Criar curso
                </button>
              </form>
            )}
            {entry === "json" && (
              <>
                <label className="field">
                  <span>CourseDraft em JSON</span>
                  <textarea
                    className="json-input"
                    value={jsonText}
                    onChange={(event) => setJsonText(event.target.value)}
                    placeholder={'{ "schemaVersion": 1, ... }'}
                  />
                </label>
                <button
                  type="button"
                  className="primary entry-primary"
                  onClick={(event) => importJson(event.currentTarget)}
                >
                  <Code2 size={18} />
                  Validar e conferir JSON
                </button>
                <p className="field-help">
                  Referências sem arquivos aparecerão como pendências no editor.
                </p>
              </>
            )}
          </section>
          <div className="entry-secondary">
            <button type="button" className="text-button" onClick={example}>
              <BookOpen size={17} />
              Usar exemplo
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => setShowPrompt(true)}
            >
              <Copy size={17} />
              Copiar prompt
            </button>
            <button
              type="button"
              className="text-button"
              onClick={(event) => {
                proposalTrigger.current = event.currentTarget;
                portableInput.current?.click();
              }}
            >
              <FolderOpen size={17} />
              Importar projeto
            </button>
            {projects.length > 0 && (
              <button
                type="button"
                className="text-button"
                onClick={() => setShowProjects(true)}
              >
                <Save size={17} />
                Projetos salvos ({projects.length})
              </button>
            )}
          </div>
        </main>
      ) : (
        <main className="editor-layout">
          <header className="editor-heading glass">
            <div>
              <div className="title-with-back">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Voltar à entrada mantendo o curso salvo"
                  onClick={() => {
                    setProject(null);
                    setError("");
                    setMessage(
                      "Seu curso salvo pode ser reaberto em Projetos salvos.",
                    );
                  }}
                >
                  <ArrowLeft size={20} />
                </button>
                <h1>{project.draft.metadata.fullName || "Curso sem nome"}</h1>
              </div>
              <p
                className={`save-state ${saveState.startsWith("Não salvo") ? "error-text" : ""}`}
                role="status"
              >
                {saveState}
              </p>
            </div>
            <div className="editor-tools">
              <button
                type="button"
                className="secondary"
                disabled={busy !== null}
                onClick={() => {
                  void portable();
                }}
              >
                <Download size={17} />
                Salvar cópia
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setShowReview(true);
                  setValidatedRevision(
                    issues.some((issue) => issue.severity === "error")
                      ? null
                      : project.draft.revision,
                  );
                }}
              >
                <Check size={18} />
                Conferir curso
              </button>
            </div>
          </header>
          <div className="mobile-course-nav glass">
            <label className="field">
              <span>Onde editar</span>
              <select
                value={view}
                onChange={(event) => {
                  setView(event.target.value);
                  setActivityId(null);
                }}
              >
                <option value="course">Dados da disciplina</option>
                {project.draft.sections.map((entry, index) => (
                  <option key={entry.id} value={entry.id}>
                    {index + 1}. {entry.title} ({activitySummary(entry.activities)})
                  </option>
                ))}
                <option value="grades">Avaliação e presets</option>
                <option value="files">Arquivos do projeto</option>
              </select>
            </label>
            <div className="button-row">
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  const next = makeSection(project.draft.sections.length + 1);
                  commands([{ type: "add_section", section: next }]);
                  setView(next.id);
                  setActivityId(null);
                }}
              >
                <Plus size={16} />
                Unidade
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => setShowProjects(true)}
              >
                <FolderOpen size={16} />
                Projetos
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() =>
                  downloadFile(
                    new TextEncoder().encode(
                      JSON.stringify(project.draft, null, 2),
                    ),
                    `${project.draft.metadata.shortName}.json`,
                    "application/json",
                  )
                }
              >
                <Code2 size={16} />
                JSON
              </button>
            </div>
          </div>
          <aside className="course-nav glass" aria-label="Estrutura do curso">
            <div className="nav-title">
              <BookOpen size={18} />
              <strong>Seu curso</strong>
            </div>
            <button
              type="button"
              className={view === "course" ? "selected" : ""}
              onClick={() => {
                setView("course");
                setActivityId(null);
              }}
            >
              Dados da disciplina
            </button>
            {project.draft.sections.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                className={`section-nav ${view === entry.id ? "selected" : ""}`}
                onClick={() => {
                  setView(entry.id);
                  setActivityId(null);
                }}
              >
                <span className="unit-number">{index + 1}</span>
                <span>
                  {entry.title}
                  <small>{activitySummary(entry.activities)}</small>
                </span>
              </button>
            ))}
            <button
              type="button"
              className="nav-add"
              onClick={() => {
                const next = makeSection(project.draft.sections.length + 1);
                commands([{ type: "add_section", section: next }]);
                setView(next.id);
                setActivityId(null);
              }}
            >
              <Plus size={17} />
              Adicionar unidade
            </button>
            <div className="nav-divider" />
            <button
              type="button"
              className={view === "grades" ? "selected" : ""}
              onClick={() => setView("grades")}
            >
              Avaliação e presets
            </button>
            <button
              type="button"
              className={view === "files" ? "selected" : ""}
              onClick={() => setView("files")}
            >
              <Paperclip size={17} />
              Arquivos ({project.assets.length})
            </button>
            <button type="button" onClick={() => setShowProjects(true)}>
              <FolderOpen size={17} />
              Projetos salvos
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFile(
                  new TextEncoder().encode(
                    JSON.stringify(project.draft, null, 2),
                  ),
                  `${project.draft.metadata.shortName}.json`,
                  "application/json",
                )
              }
            >
              <Code2 size={17} />
              Exportar JSON
            </button>
          </aside>
          <section
            className="editor-content glass"
            id={`entity-${section?.id ?? project.draft.id}`}
          >
            {view === "course" && (
              <>
                <div className="section-heading">
                  <div>
                    <p className="subtle">Disciplina</p>
                    <h2>Dados do curso</h2>
                  </div>
                </div>
                <nav className="panel-tabs" aria-label="Dados do curso">
                  {[
                    ["discipline", "Disciplina"],
                    ["organization", "Organização"],
                    ["teacher", "Professor"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={coursePane === id}
                      onClick={() => setCoursePane(id!)}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
                <div hidden={coursePane !== "discipline"}>
                  <div className="field-grid">
                    <label className="field">
                      <span>Nome completo do curso</span>
                      <input
                        data-field="metadata.fullName"
                        value={project.draft.metadata.fullName}
                        onChange={(event) =>
                          commands([
                            {
                              type: "set_metadata",
                              metadata: {
                                ...project.draft.metadata,
                                fullName: event.target.value,
                              },
                            },
                          ])
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Nome curto</span>
                      <input
                        data-field="metadata.shortName"
                        value={project.draft.metadata.shortName}
                        onChange={(event) =>
                          commands([
                            {
                              type: "set_metadata",
                              metadata: {
                                ...project.draft.metadata,
                                shortName: event.target.value,
                              },
                            },
                          ])
                        }
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>Apresentação</span>
                    <textarea
                      data-field="metadata.summary"
                      value={project.draft.metadata.summary}
                      onChange={(event) =>
                        commands([
                          {
                            type: "set_metadata",
                            metadata: {
                              ...project.draft.metadata,
                              summary: event.target.value,
                            },
                          },
                        ])
                      }
                    />
                  </label>
                  <RichEditor
                    key={`metadata-summary-${issueFocus?.request ?? 0}`}
                    label="Apresentação"
                    fallback={project.draft.metadata.summary}
                    blocks={project.draft.metadata.summaryBlocks}
                    focusBlock={richBlockFocus(
                      issueFocus?.path,
                      "metadata.summaryBlocks",
                    )}
                    focusPath={issueFocus?.path}
                    assets={project.assets}
                    onChange={(blocks) =>
                      commands([
                        {
                          type: "set_metadata",
                          metadata: {
                            ...project.draft.metadata,
                            summaryBlocks: blocks,
                          },
                        },
                      ])
                    }
                  />
                </div>
                <div hidden={coursePane !== "organization"}>
                  <div className="field-grid">
                    <label className="field">
                      <span>Organização</span>
                      <select
                        data-field="metadata.organization"
                        value={project.draft.metadata.organization}
                        onChange={(event) =>
                          commands([
                            {
                              type: "set_metadata",
                              metadata: {
                                ...project.draft.metadata,
                                organization: event.target.value as
                                  | "topics"
                                  | "weeks",
                              },
                            },
                          ])
                        }
                      >
                        <option value="topics">Tópicos</option>
                        <option value="weeks">Semanas</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Início do curso (UTC)</span>
                      <input
                        type="datetime-local"
                        data-field="metadata.startDate"
                        value={utcFieldValue(project.draft.metadata.startDate)}
                        onChange={(event) => {
                          const metadata = { ...project.draft.metadata };
                          const timestamp = utcTimestamp(event.target.value);
                          if (timestamp) metadata.startDate = timestamp;
                          else delete metadata.startDate;
                          commands([{ type: "set_metadata", metadata }]);
                        }}
                      />
                    </label>
                    <label className="field">
                      <span>Carga horária (opcional)</span>
                      <input
                        type="number"
                        min="1"
                        data-field="metadata.workloadHours"
                        value={project.draft.metadata.workloadHours ?? ""}
                        onChange={(event) => {
                          const metadata = { ...project.draft.metadata };
                          if (event.target.value)
                            metadata.workloadHours = Number(event.target.value);
                          else delete metadata.workloadHours;
                          commands([{ type: "set_metadata", metadata }]);
                        }}
                      />
                    </label>
                    <label className="field">
                      <span>Semestre (opcional)</span>
                      <input
                        data-field="metadata.semester"
                        value={project.draft.metadata.semester ?? ""}
                        onChange={(event) => {
                          const metadata = { ...project.draft.metadata };
                          if (event.target.value)
                            metadata.semester = event.target.value;
                          else delete metadata.semester;
                          commands([{ type: "set_metadata", metadata }]);
                        }}
                      />
                    </label>
                    <label className="field">
                      <span>Turma (opcional)</span>
                      <input
                        data-field="metadata.className"
                        value={project.draft.metadata.className ?? ""}
                        onChange={(event) => {
                          const metadata = { ...project.draft.metadata };
                          if (event.target.value)
                            metadata.className = event.target.value;
                          else delete metadata.className;
                          commands([{ type: "set_metadata", metadata }]);
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div hidden={coursePane !== "teacher"}>
                  <h3>Professor ou tutor</h3>
                  <div className="field-grid">
                    {[
                      ["name", "Nome"],
                      ["email", "E-mail"],
                      ["qualification", "Formação"],
                    ].map(([key, label]) => (
                      <label className="field" key={key}>
                        <span>{label}</span>
                        <input
                          data-field={`metadata.teacher.${key}`}
                          value={
                            project.draft.metadata.teacher?.[
                              key as "name" | "email" | "qualification"
                            ] ?? ""
                          }
                          onChange={(event) => {
                            const teacher = {
                              name: "",
                              ...project.draft.metadata.teacher,
                            };
                            if (event.target.value || key === "name")
                              teacher[
                                key as "name" | "email" | "qualification"
                              ] = event.target.value;
                            else
                              delete teacher[key as "email" | "qualification"];
                            const metadata = { ...project.draft.metadata };
                            if (
                              teacher.name ||
                              teacher.email ||
                              teacher.qualification
                            )
                              metadata.teacher = teacher;
                            else delete metadata.teacher;
                            commands([{ type: "set_metadata", metadata }]);
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="notice">
                  As unidades e atividades ficam na estrutura ao lado. Nenhuma
                  avaliação ou regra institucional é acrescentada
                  automaticamente.
                </div>
              </>
            )}
            {section && (
              <>
                <div className="section-heading">
                  <div>
                    <p className="subtle">
                      Unidade {project.draft.sections.indexOf(section) + 1}
                    </p>
                    <h2>{activity ? activity.title : section.title}</h2>
                  </div>
                  <div className="icon-actions">
                    <button
                      type="button"
                      aria-label="Subir unidade"
                      disabled={project.draft.sections.indexOf(section) === 0}
                      onClick={() =>
                        commands([
                          {
                            type: "move_section",
                            sectionId: section.id,
                            to: project.draft.sections.indexOf(section) - 1,
                          },
                        ])
                      }
                    >
                      <ArrowUp size={17} />
                    </button>
                    <button
                      type="button"
                      aria-label="Descer unidade"
                      disabled={
                        project.draft.sections.indexOf(section) ===
                        project.draft.sections.length - 1
                      }
                      onClick={() =>
                        commands([
                          {
                            type: "move_section",
                            sectionId: section.id,
                            to: project.draft.sections.indexOf(section) + 1,
                          },
                        ])
                      }
                    >
                      <ArrowDown size={17} />
                    </button>
                    <button
                      type="button"
                      aria-label="Remover unidade"
                      disabled={project.draft.sections.length === 1}
                      onClick={() => {
                        if (
                          confirm(
                            `Remover “${section.title}” e suas ${section.activities.length} atividades?`,
                          )
                        ) {
                          commands([
                            { type: "remove_section", sectionId: section.id },
                          ]);
                          setView("course");
                        }
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
                {activity ? (
                  <>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setActivityId(null)}
                    >
                      <ArrowLeft size={16} />
                      Todas as atividades da unidade
                    </button>
                    <ActivityEditor
                      key={`${activity.id}-${issueFocus?.request ?? 0}`}
                      activity={activity}
                      assets={project.assets}
                      focusPath={
                        issueFocus?.activityId === activity.id
                          ? issueFocus.path
                          : undefined
                      }
                      onChange={(next) =>
                        commands([
                          {
                            type: "set_activity",
                            activityId: next.id,
                            activity: next,
                          },
                        ])
                      }
                    />
                  </>
                ) : (
                  <>
                    <div className="add-activities">
                      <h3>Adicionar atividade</h3>
                      <div className="activity-choices">
                        {Object.entries(activityLabels).map(([type, label]) => (
                          <button
                            type="button"
                            key={type}
                            className="secondary"
                            onClick={() => {
                              const next = makeActivity(type);
                              commands([
                                {
                                  type: "add_activity",
                                  sectionId: section.id,
                                  activity: next,
                                },
                              ]);
                              setActivityId(next.id);
                              setActivityPages((previous) => ({
                                ...previous,
                                [section.id]: Math.floor(
                                  section.activities.length / 5,
                                ),
                              }));
                            }}
                          >
                            <Plus size={16} />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <h3>Atividades</h3>
                    {section.activities.length === 0 && (
                      <p className="empty-state">
                        Esta unidade está pronta para receber sua primeira
                        atividade.
                      </p>
                    )}
                    <div className="activity-list">
                      {visibleActivities.map(({ entry, index }) => (
                        <div className="activity-row" key={entry.id}>
                          <button
                            type="button"
                            className="activity-open"
                            onClick={() => setActivityId(entry.id)}
                          >
                            <span
                              className={`activity-type type-${entry.type}`}
                            >
                              {activityLabels[entry.type]}
                            </span>
                            <strong>{entry.title}</strong>
                            <small>
                              {entry.type === "quiz"
                                ? `${entry.questions.length} ${entry.questions.length === 1 ? "questão" : "questões"}`
                                : `${entry.attachmentIds.length} anexos`}
                            </small>
                          </button>
                          <span className="icon-actions">
                            <button
                              type="button"
                              aria-label={`Subir ${entry.title}`}
                              disabled={index === 0}
                              onClick={() => {
                                commands([
                                  {
                                    type: "move_activity",
                                    activityId: entry.id,
                                    to: index - 1,
                                  },
                                ]);
                                setActivityPages((previous) => ({
                                  ...previous,
                                  [section.id]: Math.floor((index - 1) / 5),
                                }));
                              }}
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Descer ${entry.title}`}
                              disabled={index === section.activities.length - 1}
                              onClick={() => {
                                commands([
                                  {
                                    type: "move_activity",
                                    activityId: entry.id,
                                    to: index + 1,
                                  },
                                ]);
                                setActivityPages((previous) => ({
                                  ...previous,
                                  [section.id]: Math.floor((index + 1) / 5),
                                }));
                              }}
                            >
                              <ArrowDown size={16} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Remover ${entry.title}`}
                              onClick={() => {
                                if (confirm(`Remover “${entry.title}”?`))
                                  commands([
                                    {
                                      type: "remove_activity",
                                      activityId: entry.id,
                                    },
                                  ]);
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                    {section.activities.length > 5 && (
                      <Pagination
                        page={activityPage}
                        count={section.activities.length}
                        size={5}
                        onChange={(page) =>
                          setActivityPages((previous) => ({
                            ...previous,
                            [section.id]: page,
                          }))
                        }
                      />
                    )}
                    <h3>Título e resumo da unidade</h3>
                    <label className="field">
                      <span>Título da unidade</span>
                      <input
                        data-field="title"
                        value={section.title}
                        onChange={(event) =>
                          commands([
                            {
                              type: "set_section",
                              sectionId: section.id,
                              title: event.target.value,
                              summary: section.summary,
                            },
                          ])
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Resumo da unidade</span>
                      <textarea
                        data-field="summary"
                        value={section.summary}
                        onChange={(event) =>
                          commands([
                            {
                              type: "set_section",
                              sectionId: section.id,
                              title: section.title,
                              summary: event.target.value,
                            },
                          ])
                        }
                      />
                    </label>
                    <RichEditor
                      key={`section-summary-${section.id}-${issueFocus?.request ?? 0}`}
                      label="Resumo da unidade"
                      fallback={section.summary}
                      blocks={section.summaryBlocks}
                      focusBlock={richBlockFocus(
                        issueFocus?.path,
                        `sections[${project.draft.sections.indexOf(section)}].summaryBlocks`,
                      )}
                      focusPath={issueFocus?.path}
                      assets={project.assets}
                      onChange={(blocks) =>
                        commands([
                          {
                            type: "set_section",
                            sectionId: section.id,
                            title: section.title,
                            summary: section.summary,
                            summaryBlocks: blocks,
                          },
                        ])
                      }
                    />
                  </>
                )}
              </>
            )}
            {view === "grades" && (
              <>
                <h2>Avaliação e presets</h2>
                <p className="intro-help">
                  Defina as categorias e os vínculos. Sem categorias, o curso
                  conserva somente as notas máximas das atividades.
                </p>
                {project.draft.gradebook?.categories.map((category, index) => (
                  <fieldset
                    className="grade-category"
                    key={category.id}
                    id={`entity-${category.id}`}
                  >
                    <legend>Categoria {index + 1}</legend>
                    <div className="field-grid">
                      <label className="field">
                        <span>Nome da categoria</span>
                        <input
                          data-field="name"
                          value={category.name}
                          onChange={(event) =>
                            commands([
                              {
                                type: "set_gradebook",
                                gradebook: {
                                  categories:
                                    project.draft.gradebook!.categories.map(
                                      (entry) =>
                                        entry.id === category.id
                                          ? {
                                              ...entry,
                                              name: event.target.value,
                                            }
                                          : entry,
                                    ),
                                },
                              },
                            ])
                          }
                        />
                      </label>
                      <label className="field">
                        <span>Peso (%)</span>
                        <input
                          type="number"
                          min="0.01"
                          max="100"
                          step="0.01"
                          data-field="weight"
                          value={category.weight}
                          onChange={(event) =>
                            commands([
                              {
                                type: "set_gradebook",
                                gradebook: {
                                  categories:
                                    project.draft.gradebook!.categories.map(
                                      (entry) =>
                                        entry.id === category.id
                                          ? {
                                              ...entry,
                                              weight: Number(
                                                event.target.value,
                                              ),
                                            }
                                          : entry,
                                    ),
                                },
                              },
                            ])
                          }
                        />
                      </label>
                    </div>
                    {allActivities
                      .filter(
                        (entry) =>
                          entry.type === "assignment" || entry.type === "quiz",
                      )
                      .map((entry) => (
                        <label className="check-row" key={entry.id}>
                          <input
                            type="checkbox"
                            data-field={`activityIds.${entry.id}`}
                            checked={category.activityIds.includes(entry.id)}
                            onChange={(event) =>
                              commands([
                                {
                                  type: "set_gradebook",
                                  gradebook: {
                                    categories:
                                      project.draft.gradebook!.categories.map(
                                        (item) =>
                                          item.id === category.id
                                            ? {
                                                ...item,
                                                activityIds: event.target
                                                  .checked
                                                  ? [
                                                      ...item.activityIds,
                                                      entry.id,
                                                    ]
                                                  : item.activityIds.filter(
                                                      (id) => id !== entry.id,
                                                    ),
                                              }
                                            : item,
                                      ),
                                  },
                                },
                              ])
                            }
                          />
                          {entry.title}
                        </label>
                      ))}
                    <button
                      type="button"
                      className="text-button danger"
                      onClick={() => {
                        const categories =
                          project.draft.gradebook!.categories.filter(
                            (entry) => entry.id !== category.id,
                          );
                        commands([
                          {
                            type: "set_gradebook",
                            gradebook: categories.length
                              ? { categories }
                              : undefined,
                          },
                        ]);
                      }}
                    >
                      Remover categoria
                    </button>
                  </fieldset>
                ))}
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    commands([
                      {
                        type: "set_gradebook",
                        gradebook: {
                          categories: [
                            ...(project.draft.gradebook?.categories ?? []),
                            {
                              id: newId("category"),
                              name: "Nova categoria",
                              weight: project.draft.gradebook ? 50 : 100,
                              activityIds: allActivities
                                .filter(
                                  (entry) =>
                                    entry.type === "assignment" ||
                                    entry.type === "quiz",
                                )
                                .map((entry) => entry.id),
                            },
                          ],
                        },
                      },
                    ])
                  }
                >
                  <Plus size={16} />
                  Categoria de notas
                </button>
                <p className="field-help">
                  Os pesos devem somar 100%. Cada atividade pertence a uma
                  categoria.
                </p>
                <hr />
                <h3>Presets deste projeto</h3>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    const presetName = promptName();
                    if (!presetName) return;
                    setProject({
                      ...project,
                      draft: {
                        ...project.draft,
                        revision: project.draft.revision + 1,
                      },
                      presets: [
                        ...project.presets,
                        {
                          id: newId("preset"),
                          name: presetName,
                          organization: project.draft.metadata.organization,
                          ...(project.draft.gradebook
                            ? {
                                gradebook: structuredClone(
                                  project.draft.gradebook,
                                ),
                              }
                            : {}),
                        },
                      ],
                    });
                    setValidatedRevision(null);
                  }}
                >
                  <Save size={16} />
                  Salvar organização como preset
                </button>
                {project.presets.map((preset) => (
                  <div className="preset-row" key={preset.id}>
                    <span>
                      <strong>{preset.name}</strong>
                      <small>
                        {preset.organization === "weeks"
                          ? "Semanas"
                          : "Tópicos"}{" "}
                        · {preset.gradebook?.categories.length ?? 0} categorias
                      </small>
                    </span>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        if (
                          !confirm(
                            `Aplicar “${preset.name}”? A organização e as categorias serão substituídas; textos e atividades permanecem.`,
                          )
                        )
                          return;
                        commands(
                          [
                            {
                              type: "set_metadata",
                              metadata: {
                                ...project.draft.metadata,
                                organization:
                                  preset.organization ??
                                  project.draft.metadata.organization,
                              },
                            },
                            {
                              type: "set_gradebook",
                              gradebook: structuredClone(preset.gradebook),
                            },
                          ],
                          project.draft.revision,
                          "preset",
                          preset.id,
                        );
                      }}
                    >
                      Conferir e aplicar
                    </button>
                  </div>
                ))}
              </>
            )}
            {view === "files" && (
              <>
                <h2>Arquivos do projeto</h2>
                <p className="intro-help">
                  Os arquivos ficam neste navegador e acompanham a cópia
                  portátil. Associe-os às atividades ou aos blocos de imagem.
                </p>
                {project.draft.attachments.some(
                  (entry) =>
                    !project.assets.some((asset) => asset.id === entry.id),
                ) && (
                  <label className="field">
                    <span>Completar uma referência sem bytes</span>
                    <select
                      value={missingTarget}
                      onChange={(event) => setMissingTarget(event.target.value)}
                    >
                      <option value="">Adicionar novo arquivo</option>
                      {project.draft.attachments
                        .filter(
                          (entry) =>
                            !project.assets.some(
                              (asset) => asset.id === entry.id,
                            ),
                        )
                        .map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {entry.name}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                <label className="file-button add-file">
                  <Upload size={18} />
                  {missingTarget
                    ? "Fornecer arquivo desta referência"
                    : "Adicionar arquivos"}
                  <input
                    className="visually-hidden"
                    type="file"
                    multiple={!missingTarget}
                    aria-label="Adicionar arquivos ao projeto"
                    onChange={(event) => {
                      void addFiles(event.target.files);
                      event.target.value = "";
                    }}
                  />
                </label>
                <p className="field-help">
                  Até 16 MiB por arquivo e 64 MiB por projeto, incluindo fontes.
                </p>
                <ul className="file-list project-file-list">
                  {project.assets.map((file) => (
                    <li key={file.id}>
                      <Paperclip size={19} />
                      <span>
                        {file.name}
                        <small>
                          {formatBytes(file.bytes.length)} ·{" "}
                          {
                            allActivities.filter((entry) =>
                              entry.attachmentIds.includes(file.id),
                            ).length
                          }{" "}
                          vínculos diretos
                        </small>
                      </span>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Baixar ${file.name}`}
                        onClick={() =>
                          downloadFile(file.bytes, file.name, file.mediaType)
                        }
                      >
                        <Download size={18} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remover ${file.name}`}
                        onClick={() => {
                          if (
                            !confirm(
                              `Remover “${file.name}”? Vínculos ou imagens que dependem dele ficarão pendentes.`,
                            )
                          )
                            return;
                          const result = applyCommands(
                            project.draft,
                            project.draft.revision,
                            [
                              {
                                type: "set_attachments",
                                attachments: project.draft.attachments.filter(
                                  (entry) => entry.id !== file.id,
                                ),
                              },
                            ],
                          );
                          if (result.ok) {
                            setProject({
                              ...withDraft(project, result.draft),
                              assets: project.assets.filter(
                                (entry) => entry.id !== file.id,
                              ),
                            });
                            setValidatedRevision(null);
                          }
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
                <h3>Documentos de origem</h3>
                {project.sources.length === 0 ? (
                  <p className="field-help">
                    Este curso foi criado sem documento de origem.
                  </p>
                ) : (
                  <ul className="file-list">
                    {project.sources.map((file) => (
                      <li key={file.id}>
                        <FileText size={18} />
                        <span>
                          {file.name}
                          <small>{formatBytes(file.bytes.length)}</small>
                        </span>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Baixar fonte ${file.name}`}
                          onClick={() =>
                            downloadFile(file.bytes, file.name, file.mediaType)
                          }
                        >
                          <Download size={18} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="notice">
                  Última cópia portátil:{" "}
                  {lastCopy === null
                    ? "ainda não exportada nesta sessão"
                    : `revisão ${lastCopy}`}
                  . Salvar no navegador não substitui uma cópia em outro local.
                </div>
                <ProvenanceViewer project={project} />
              </>
            )}
          </section>
          <aside className="issues-panel glass">
            <h2>Conferência</h2>
            <p className="revision-label">Revisão {project.draft.revision}</p>
            <div className={issues.length ? "issue-count" : "valid-count"}>
              {issues.length ? <AlertCircle size={20} /> : <Check size={20} />}
              <strong>
                {issues.length
                  ? `${issues.length} pendências`
                  : "Estrutura válida"}
              </strong>
            </div>
            {issues.length === 0 ? (
              <p className="field-help">
                Confira o conteúdo e gere o backup desta revisão.
              </p>
            ) : (
              <ul className="issue-list">
                {issues.slice(0, 30).map((issue, index) => (
                  <li key={`${issue.path}-${index}`}>
                    <button type="button" onClick={() => showIssue(issue)}>
                      <strong>{issue.message}</strong>
                      <small>{issue.path}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="field-help">
              Perfil testado no laboratório Moodle 4.1.17, build 20250317.
              Outras versões não foram verificadas.
            </p>
            <button
              type="button"
              className="secondary full-width"
              onClick={() => {
                setShowReview(true);
                setValidatedRevision(
                  issues.some((issue) => issue.severity === "error")
                    ? null
                    : project.draft.revision,
                );
              }}
            >
              Conferir revisão
            </button>
          </aside>
        </main>
      )}
      {artifact && project && (
        <section className="delivery glass">
          <div>
            <p className="subtle">Backup pronto</p>
            <h2>Seu curso está preparado para baixar</h2>
            <p>
              Revisão {artifact.revision}
              {project.draft.revision !== artifact.revision
                ? ` · o editor está na revisão ${project.draft.revision}`
                : ""}
              . O pacote mantém a revisão que foi conferida.
            </p>
            <p className="field-help">
              Restaure em um curso novo e vazio no laboratório local. Perfil
              testado em Moodle 4.1.17, build 20250317; outras versões não foram
              verificadas.
            </p>
          </div>
          {artifact.glossaryUserinfo && (
            <p className="notice">
              Para preservar as entradas de glossário, mantenha “Informação de
              usuário” habilitada na restauração desse módulo. O pacote não
              contém contas ou matrículas; as entradas ficam sem autor.
            </p>
          )}
          <button
            type="button"
            className="primary"
            onClick={() =>
              downloadFile(artifact.bytes, artifact.name, "application/gzip")
            }
          >
            <Download size={18} />
            Baixar curso MBZ
          </button>
        </section>
      )}
      {showPrompt && (
        <Modal
          title="Prompt para outra IA"
          onClose={() => setShowPrompt(false)}
        >
          <p>
            Copie o contrato e forneça seu planejamento à IA escolhida. Traga a
            resposta em Importar JSON.
          </p>
          <label className="field">
            <span>Prompt completo</span>
            <textarea
              className="prompt-text"
              value={prompt}
              readOnly
              onFocus={(event) => event.target.select()}
            />
          </label>
          <button
            type="button"
            className="primary"
            onClick={() => {
              navigator.clipboard
                ?.writeText(prompt)
                .then(() => setMessage("Prompt copiado."))
                .catch(() =>
                  setMessage("Selecione o texto acima e copie manualmente."),
                );
            }}
          >
            <Copy size={18} />
            Copiar texto
          </button>
          <p className="field-help">
            Se a cópia for bloqueada, selecione o texto e use Ctrl+C.
          </p>
        </Modal>
      )}
      {proposal && (
        <Modal
          title="Conferir a proposta de curso"
          returnFocus={proposalTrigger.current}
          onClose={() => setProposal(null)}
        >
          <h3>{proposal.project.draft.metadata.fullName}</h3>
          <p>
            {proposal.project.draft.sections.length} unidades ·{" "}
            {proposal.project.draft.sections.reduce(
              (sum, entry) => sum + entry.activities.length,
              0,
            )}{" "}
            atividades · {proposal.project.assets.length} arquivos
          </p>
          {project && (
            <p className="notice">
              O curso aberto será substituído na tela. A versão salva neste
              navegador continua em Projetos salvos.
            </p>
          )}
          {proposal.issues.map((issue, index) => (
            <p
              key={index}
              className={
                issue.severity === "error" ? "error-text" : "field-help"
              }
            >
              {issue.path}: {issue.message}
            </p>
          ))}
          {proposal.preview.map((entry, index) => (
            <details key={index} className="form-details">
              <summary>Fonte: {entry.name}</summary>
              <ContentPreview
                blocks={entry.blocks}
                assets={proposal.project.assets}
              />
            </details>
          ))}
          <div className="button-row">
            <button
              type="button"
              className="secondary"
              onClick={() => setProposal(null)}
            >
              Voltar e ajustar
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => {
                openProject(proposal.project);
                setProposal(null);
              }}
            >
              Abrir proposta no editor
            </button>
          </div>
        </Modal>
      )}
      {agentProposal && (
        <Modal
          title="Alterações propostas pelo agente"
          onClose={() => setAgentProposal(null)}
        >
          <p>
            Revisão de origem: {agentProposal.expectedRevision}. Confira antes
            de aplicar.
          </p>
          <ul>
            {agentProposal.summary.map((entry, index) => (
              <li key={index}>{entry}</li>
            ))}
          </ul>
          <button
            type="button"
            className="primary"
            onClick={() => {
              if (
                !project ||
                projectIdentity(project) !== agentProposal.projectId
              ) {
                setError(
                  "O projeto da proposta mudou. Solicite uma proposta para o projeto atual.",
                );
                setAgentProposal(null);
                return;
              }
              commands(agentProposal.commands, agentProposal.expectedRevision);
              setAgentProposal(null);
            }}
          >
            Aplicar alterações conferidas
          </button>
        </Modal>
      )}
      {showReview && project && (
        <Modal
          title="Conferir curso para exportação"
          onClose={() => setShowReview(false)}
        >
          <h3>{project.draft.metadata.fullName}</h3>
          <p>
            Revisão {project.draft.revision}: {project.draft.sections.length}{" "}
            unidades, {allActivities.length} atividades e{" "}
            {project.assets.length} arquivos.
          </p>
          {project.draft.sections.map((entry, index) => (
            <div className="review-unit" key={entry.id}>
              <strong>
                {index + 1}. {entry.title}
              </strong>
              <ul>
                {entry.activities.map((item) => (
                  <li key={item.id}>
                    {activityLabels[item.type]}: {item.title}
                    {item.schedule?.closesAt
                      ? ` · até ${item.schedule.closesAt}`
                      : ""}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {project.draft.gradebook && (
            <p>
              Categorias:{" "}
              {project.draft.gradebook.categories
                .map((entry) => `${entry.name} ${entry.weight}%`)
                .join(", ")}
              .
            </p>
          )}
          {issues.length ? (
            <div className="review-issues">
              <h3>Resolva antes de gerar</h3>
              {issues.map((issue, index) => (
                <button
                  type="button"
                  className="issue-link"
                  key={index}
                  onClick={() => showIssue(issue)}
                >
                  {issue.message}
                  <small>{issue.path}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="valid-count">
              <Check size={18} />
              Revisão validada. Edições posteriores exigem nova conferência.
            </p>
          )}
          <div className="notice">
            Perfil testado no laboratório local: Moodle 4.1.17, build 20250317.
            Use a conferência de restauração nesse ambiente; outras versões não
            foram verificadas.
          </div>
          {allActivities.some(
            (entry) => entry.type === "glossary" && entry.entries.length > 0,
          ) && (
            <p className="notice">
              Entradas de glossário exigem manter “Informação de usuário”
              habilitada na restauração do módulo. Nenhuma conta ou matrícula
              entra no pacote.
            </p>
          )}
          <div className="button-row">
            <button
              type="button"
              className="secondary"
              onClick={() => setShowReview(false)}
            >
              Continuar editando
            </button>
            <button
              type="button"
              className="primary"
              disabled={
                busy !== null ||
                issues.some((issue) => issue.severity === "error")
              }
              onClick={() => {
                void exportMbz();
              }}
            >
              <Download size={18} />
              Gerar backup MBZ
            </button>
          </div>
        </Modal>
      )}
      {showProjects && (
        <Modal
          title="Projetos salvos neste navegador"
          onClose={() => setShowProjects(false)}
        >
          {projects.length === 0 ? (
            <p>
              Nenhum curso salvo ainda. Crie um curso ou importe uma cópia
              portátil.
            </p>
          ) : (
            projects.map((entry) => (
              <div className="preset-row" key={projectIdentity(entry)}>
                <span>
                  <strong>{entry.draft.metadata.fullName}</strong>
                  <small>
                    Revisão {entry.draft.revision} ·{" "}
                    {entry.draft.sections.length} unidades
                  </small>
                </span>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    void openSaved(projectIdentity(entry));
                  }}
                >
                  Reabrir
                </button>
              </div>
            ))
          )}
          <button
            type="button"
            className="text-button"
            onClick={(event) => {
              proposalTrigger.current = event.currentTarget;
              portableInput.current?.click();
            }}
          >
            <Upload size={16} />
            Importar cópia portátil
          </button>
        </Modal>
      )}
    </Shell>
  );
}
function promptName(): string | null {
  return window.prompt("Nome do preset", "Minha organização");
}
