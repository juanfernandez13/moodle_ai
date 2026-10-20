"use client";
import { useState } from "react";
import { z } from "zod";
import { validateDraft } from "../../../../domain/course/index.ts";
import { createProject, validateProject } from "../../../project.ts";
import type { ProjectFile } from "../../../project.ts";
import { fromBase64 } from "../../../download.ts";
import { checkUploadLimits } from "../../../../shared/upload-limits.ts";
import { captureProvenance, importProvenanceSchema, sourcePreviewSchema } from "../../../provenance.ts";
import type { CourseTransfers } from "./use-course-transfers.ts";
import type { CourseDialogs } from "./use-course-dialogs.ts";
import { apiFile, safeIssue, projectIssues } from "../helpers.ts";

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

/** As IAs que a entrada oferece. "Sem IA" é o mesmo que Criar manualmente e não aparece mais. */
export type AiProvider = "gemini" | "openai";
/** Chave (e modelo, se a pessoa quis) digitada nesta aba. Vive só neste estado do React: nunca vai para o armazenamento do navegador. */
export interface TabKey {
  apiKey: string;
  model: string;
}
export type TabKeys = Partial<Record<AiProvider, TabKey>>;

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
  const [entry, setEntry] = useState<"files" | "manual" | "json">("files");
  const [name, setName] = useState("");
  const [firstSection, setFirstSection] = useState("Unidade 1");
  const [jsonText, setJsonText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<{
    planning: File[];
    tasks: File[];
    quizzes: File[];
  }>({ planning: [], tasks: [], quizzes: [] });
  const profile = DEFAULT_PROFILE;
  // null: ainda não há IA escolhida. A entrada escolhe sozinha a do servidor, se houver.
  const [provider, setProvider] = useState<AiProvider | null>(null);
  const [keys, setKeys] = useState<TabKeys>({});
  const [pasteText, setPasteText] = useState("");
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
      setError("Envie a matriz ou crie o curso manualmente.");
      return;
    }
    if (textOnly && !pasteText.trim()) {
      setError("Cole o texto da matriz antes de enviar.");
      return;
    }
    if (!provider) {
      setError("Escolha uma IA.");
      return;
    }
    if (!textOnly) {
      const problem = checkUploadLimits([
        ...selectedFiles.planning,
        ...selectedFiles.tasks,
        ...selectedFiles.quizzes,
      ]);
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
        if (typedKey) data.set("apiKey", typedKey);
        if (typedModel) data.set("model", typedModel);
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
          "Não reconhecemos este documento. Tente outro arquivo.",
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
    pasteText,
    setPasteText,
    importJson,
    importDocuments,
  };
}
