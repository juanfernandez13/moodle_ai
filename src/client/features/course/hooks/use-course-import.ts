"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { validateDraft } from "../../../../domain/course/index.ts";
import { createProject, validateProject } from "../../../project.ts";
import type { ProjectFile } from "../../../project.ts";
import { fromBase64 } from "../../../download.ts";
import type { AiProviderId } from "../../../../shared/ai-providers.ts";
import { checkUploadLimits } from "../../../../shared/upload-limits.ts";
import { captureProvenance, importProvenanceSchema, sourcePreviewSchema } from "../../../provenance.ts";
import type { CourseTransfers } from "./use-course-transfers.ts";
import type { CourseDialogs } from "./use-course-dialogs.ts";
import { apiFile, safeIssue, projectIssues, issueLines } from "../helpers.ts";
import { workspaceSession } from "../workspace-session.ts";

type Options = Pick<
  CourseTransfers,
  "setBusy" | "controller"
>
  & Pick<
    CourseDialogs,
    "setProposal" | "proposalTrigger"
  >
  & {
    setError: (message: string) => void;
    setMessage: (message: string) => void
  };

/** As IAs que a entrada oferece (src/shared/ai-providers.ts). "Sem IA" é o mesmo que Criar manualmente e não aparece mais. */
export type AiProvider = AiProviderId;
/**
 * Chave, modelo e (na Outra IA) endereço digitados nesta aba; cada um pode ficar em branco, e então vale o do servidor ou
 * o padrão. Vive só na memória da aba: nunca vai para o armazenamento do navegador.
 */
export interface TabKey {
  apiKey: string;
  model: string;
  baseUrl: string;
}
export type TabKeys = Partial<Record<AiProvider, TabKey>>;
/** O que a IA respondeu sobre a chave: "invalid" (não funcionou) ou "missing" (a IA escolhida está sem chave). */
export type AiProblem = "" | "invalid" | "missing";
/** Respostas do servidor que são sobre a chave, não sobre o documento: o aviso fica no cartão da IA. */
const KEY_PROBLEMS: Record<string, Exclude<AiProblem, "">> = {
  provider_authentication: "invalid",
  provider_unconfigured: "missing",
};

// "Tópicos ou semanas" não é mais perguntado: a IA descobre pelo documento e a pessoa muda no Caderno.
// A API ainda pede um perfil, então vai sempre o padrão.
const DEFAULT_PROFILE = "docx-topicos-v1" as const;

export function useCourseImport({
  setBusy,
  controller,
  setProposal,
  proposalTrigger,
  setError,
  setMessage
}: Options) {
  const [entry, setEntry] = useState<"files" | "manual" | "json" | "quizzes">(
    "files",
  );
  const [name, setName] = useState("");
  const [firstSection, setFirstSection] = useState("Unidade 1");
  const [jsonText, setJsonText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<{
    planning: File[];
    tasks: File[];
    quizzes: File[];
  }>({ planning: [], tasks: [], quizzes: [] });
  const profile = DEFAULT_PROFILE;
  // null: ainda não há IA escolhida. A entrada escolhe sozinha a primeira que já tem chave, se houver.
  const [provider, setProvider] = useState<AiProvider | null>(
    () => workspaceSession.provider,
  );
  // A chave vale para esta aba: sobrevive a uma troca de tela dentro do app (Alunos, Datas e de volta), some ao
  // recarregar ou fechar a aba e nunca vai para o armazenamento do navegador.
  const [keys, setKeys] = useState<TabKeys>(() => workspaceSession.keys);
  useEffect(() => {
    workspaceSession.keys = keys;
    workspaceSession.provider = provider;
  }, [keys, provider]);
  const [aiProblem, setAiProblem] = useState<AiProblem>("");
  // Trocou a IA ou a chave: o aviso da chave antiga não vale mais.
  useEffect(() => {
    setAiProblem("");
  }, [provider, keys]);
  const [pasteText, setPasteText] = useState("");
  function importJson(trigger: HTMLElement) {
    proposalTrigger.current = trigger;
    try {
      const value: unknown = JSON.parse(jsonText);
      const result = validateDraft(value);
      if (!result.valid) {
        setError(issueLines(result.issues));
        return;
      }
      const next = createProject();
      next.draft = result.draft;
      setProposal({ project: next, issues: projectIssues(next), preview: [] });
    } catch {
      setError("JSON inválido. Confira vírgulas, aspas e a versão da disciplina.");
    }
  }
  /**
   * course: a Matriz (e os anexos) viram uma disciplina. quizzes: só os quizzes, para mesclar numa disciplina que já
   * existe no Moodle.
   */
  async function importDocuments(
    textOnly = false,
    trigger?: HTMLElement,
    mode: "course" | "quizzes" = "course",
  ) {
    proposalTrigger.current =
      trigger ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    setError("");
    setMessage("");
    setAiProblem("");
    const quizzesOnly = mode === "quizzes" && !textOnly;
    if (quizzesOnly && selectedFiles.quizzes.length === 0) {
      setError("Envie os quizzes.");
      return;
    }
    if (!textOnly && !quizzesOnly && selectedFiles.planning.length === 0) {
      setError("Envie a Matriz ou crie a disciplina manualmente.");
      return;
    }
    if (textOnly && !pasteText.trim()) {
      setError("Cole o texto da Matriz antes de enviar.");
      return;
    }
    if (!provider) {
      setError("Escolha uma IA.");
      return;
    }
    // Só quizzes: a Matriz e as tarefas que estiverem escolhidas ficam de fora do envio.
    const sent = quizzesOnly
      ? selectedFiles.quizzes
      : [
          ...selectedFiles.planning,
          ...selectedFiles.tasks,
          ...selectedFiles.quizzes,
        ];
    if (!textOnly) {
      const problem = checkUploadLimits(sent);
      if (problem) {
        setError(problem);
        return;
      }
    }
    const abort = new AbortController();
    controller.current = abort;
    setBusy("import");
    // Só vai a chave (ou o modelo) adicionada nesta aba; ela vale mais que a do servidor. Sem ela, vale a configuração do servidor.
    const tabKey = keys[provider];
    const typedKey = tabKey?.apiKey.trim() ?? "";
    const typedModel = tabKey?.model.trim() ?? "";
    // O endereço só existe na Outra IA; nas demais ele nunca vai.
    const typedBaseUrl = provider === "custom" ? (tabKey?.baseUrl.trim() ?? "") : "";
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
            ...(typedKey ? { apiKey: typedKey } : {}),
            ...(typedModel ? { model: typedModel } : {}),
            ...(typedBaseUrl ? { baseUrl: typedBaseUrl } : {}),
          }),
          signal: abort.signal,
        });
      else {
        const data = new FormData();
        for (const file of sent) data.append("files", file);
        if (quizzesOnly) data.set("mode", "quizzes");
        data.set("profile", profile);
        data.set("provider", provider);
        if (typedKey) data.set("apiKey", typedKey);
        if (typedModel) data.set("model", typedModel);
        if (typedBaseUrl) data.set("baseUrl", typedBaseUrl);
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
        // A chave recusada tem lugar próprio, no cartão da IA, com o botão para trocá-la; o resto vai para o aviso do alto.
        const keyProblem = envelope.issues
          .map((issue) => KEY_PROBLEMS[issue.code])
          .find(Boolean);
        if (keyProblem) {
          setAiProblem(keyProblem);
          return;
        }
        setError(
          issueLines(envelope.issues) ||
            "Não reconhecemos este documento. Tente outro arquivo.",
        );
        return;
      }
      const draft = validateDraft(envelope.draft);
      if (!draft.valid)
        throw new Error("A proposta recebida não atende ao contrato da disciplina.");
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
          ? "Envio cancelado. Seus arquivos foram mantidos."
          : failure instanceof Error
            ? failure.message
            : "Não deu certo. O que você escolheu foi mantido.",
      );
    } finally {
      setBusy(null);
      controller.current = null;
    }
  }
  return {
    entry,
    setEntry,
    name,
    setName,
    firstSection,
    setFirstSection,
    jsonText,
    setJsonText,
    selectedFiles,
    setSelectedFiles,
    profile,
    provider,
    setProvider,
    keys,
    setKeys,
    aiProblem,
    pasteText,
    setPasteText,
    importJson,
    importDocuments,
  };
}
