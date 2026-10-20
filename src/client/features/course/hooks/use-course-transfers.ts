"use client";
import { useRef, useState } from "react";
import type { ValidationIssue } from "../../../../domain/course/index.ts";
import {
  PROJECT_FILE_LIMITS,
  newId,
  projectIdentity,
} from "../../../project.ts";
import type { ProjectFile } from "../../../project.ts";
import { applyCommands } from "../../../commands.ts";
import { createPortable, readPortable } from "../../../portable.ts";
import { downloadFile } from "../../../download.ts";
import { withDraft } from "../../../provenance.ts";
import type { CourseWorkspace } from "./use-course-workspace.ts";
import type { ImportProposal, UiIssue } from "../types.ts";

type Options = Pick<
  CourseWorkspace,
  "project"
  | "projects"
  | "projectRef"
  | "setProject"
  | "validatedRevision"
  | "setValidatedRevision"
  | "setLastCopy"
  | "setArtifact"
>
  & {
    issues: UiIssue[];
    setError: (message: string) => void;
    setMessage: (message: string) => void;
    setProposal: (proposal: ImportProposal) => void;
    setShowReview: (show: boolean) => void
  };

export function useCourseTransfers({
  project,
  projects,
  projectRef,
  setProject,
  validatedRevision,
  setValidatedRevision,
  setLastCopy,
  setArtifact,
  issues,
  setError,
  setMessage,
  setProposal,
  setShowReview,
}: Options) {
  const [busy, setBusy] = useState<"import" | "export" | "copy" | null>(null);
  const controller = useRef<AbortController | null>(null);
  const [missingTarget, setMissingTarget] = useState("");
  const portableInput = useRef<HTMLInputElement>(null);
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
        if (file.size > PROJECT_FILE_LIMITS.attachmentBytes)
          throw new Error("Cada anexo pode ter até 16 MB.");
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
      // Only attachments count: imported sources have their own, larger limit.
      if (
        [...current.assets, ...additions].reduce(
          (sum, file) => sum + file.bytes.length,
          0,
        ) > PROJECT_FILE_LIMITS.attachmentsTotalBytes
      )
        throw new Error("Os anexos do curso podem somar até 64 MB.");
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
  return {
    busy,
    setBusy,
    controller,
    missingTarget,
    setMissingTarget,
    portableInput,
    portable,
    addFiles,
    exportMbz,
  };
}

export type CourseTransfers = ReturnType<typeof useCourseTransfers>;
