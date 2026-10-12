"use client";
import { useState } from "react";
import type { CourseProject } from "../../../project.ts";
import { useCourseDialogs } from "./use-course-dialogs.ts";
import { useCourseWorkspace } from "./use-course-workspace.ts";
import { useCourseNavigation } from "./use-course-navigation.ts";
import { useCourseTransfers } from "./use-course-transfers.ts";
import { useCourseImport } from "./use-course-import.ts";
import { createExampleProject } from "../helpers.ts";
import { coursePrompt } from "../prompt.ts";

export function useCourseBuilder() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const dialogs = useCourseDialogs();
  const workspace = useCourseWorkspace({
    setError,
    setAgentProposal: dialogs.setAgentProposal,
  });
  const editor = useCourseNavigation({
    project: workspace.project,
    setShowReview: dialogs.setShowReview,
    setError,
  });
  const transfers = useCourseTransfers({
    project: workspace.project,
    projects: workspace.projects,
    projectRef: workspace.projectRef,
    setProject: workspace.setProject,
    validatedRevision: workspace.validatedRevision,
    setValidatedRevision: workspace.setValidatedRevision,
    setLastCopy: workspace.setLastCopy,
    setArtifact: workspace.setArtifact,
    issues: editor.issues,
    setError,
    setMessage,
    setProposal: dialogs.setProposal,
    setShowReview: dialogs.setShowReview,
  });
  const imports = useCourseImport({
    setBusy: transfers.setBusy,
    controller: transfers.controller,
    setProposal: dialogs.setProposal,
    proposalTrigger: dialogs.proposalTrigger,
    setError,
    setMessage,
  });
  function openProject(next: CourseProject) {
    workspace.setProject(next);
    editor.setView("course");
    editor.setActivityId(null);
    workspace.setValidatedRevision(null);
    workspace.setArtifact(null);
    workspace.setLastCopy(null);
    setError("");
    setMessage("Curso aberto. Confira o conteúdo antes de exportar.");
  }
  async function openSaved(id: string) {
    try {
      const next = await workspace.loadSaved(id);
      openProject(next);
      dialogs.setShowProjects(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível reabrir.");
    }
  }
  function example() {
    openProject(createExampleProject());
  }
  const prompt = coursePrompt(imports.profile, workspace.project);
  return {
    ...workspace,
    ...editor,
    ...transfers,
    ...imports,
    ...dialogs,
    message,
    setMessage,
    error,
    setError,
    openProject,
    openSaved,
    example,
    prompt,
  };
}
export type CourseBuilderModel = ReturnType<typeof useCourseBuilder>;
