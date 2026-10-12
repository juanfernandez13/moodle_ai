"use client";
import { useState } from "react";
import { z } from "zod";
import { validateDraft } from "../../../../domain/course/index.ts";
import { createProject, validateProject } from "../../../project.ts";
import type { ProjectFile } from "../../../project.ts";
import { fromBase64 } from "../../../download.ts";
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
  const [profile, setProfile] = useState<"docx-topicos-v1" | "docx-semanal-v1">(
    "docx-topicos-v1",
  );
  const [provider, setProvider] = useState<"offline" | "openai" | "gemini">(
    "offline",
  );
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
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
    setProfile,
    provider,
    setProvider,
    apiKey,
    setApiKey,
    model,
    setModel,
    pasteText,
    setPasteText,
    importJson,
    importDocuments,
  };
}
