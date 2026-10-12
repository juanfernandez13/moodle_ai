"use client";
import { useEffect, useRef, useState } from "react";
import { projectIdentity } from "../../../project.ts";
import type { CourseProject } from "../../../project.ts";
import { applyCommands } from "../../../commands.ts";
import type { CourseCommand } from "../../../commands.ts";
import { ProjectStore } from "../../../project-store.ts";
import { withDraft } from "../../../provenance.ts";
import { registerBuilderTools } from "../../../webmcp.ts";
import type { CourseProposal } from "../../../webmcp.ts";
import { workspaceSession } from "../workspace-session.ts";

type Options = {
  setError: (message: string) => void;
  setAgentProposal: (proposal: CourseProposal) => void
};

export function useCourseWorkspace({ setError, setAgentProposal }: Options) {
  const [project, setProject] = useState<CourseProject | null>(
    workspaceSession.project,
  );
  const projectRef = useRef<CourseProject | null>(null);
  const [projects, setProjects] = useState<CourseProject[]>([]);
  const store = useRef<ProjectStore | null>(null);
  const savedRevisions = useRef(workspaceSession.revisions);
  const blocked = useRef(workspaceSession.blocked);
  const saveQueue = useRef(workspaceSession.queue);
  const [storageReady, setStorageReady] = useState(false);
  const [saveState, setSaveState] = useState("Ainda não salvo");
  const [lastCopy, setLastCopy] = useState<number | null>(null);
  const [validatedRevision, setValidatedRevision] = useState<number | null>(
    null,
  );
  const [artifact, setArtifact] = useState<{
    bytes: Uint8Array;
    name: string;
    revision: number;
    glossaryUserinfo: boolean;
  }
    | null>(null);
  projectRef.current = project;
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
  useEffect(() => registerBuilderTools(() => projectRef.current, setAgentProposal), []);
  useEffect(() => {
    if (!project || !storageReady || !store.current) return;
    const snapshot = structuredClone(project);
    const workspaceId = projectIdentity(snapshot);
    setSaveState("Salvando neste navegador…");
    saveQueue.current = saveQueue.current
      .catch(() => { })
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
  async function loadSaved(id: string) {
    const next = await store.current?.load(id);
    if (!next) throw new Error("Projeto não encontrado.");
    savedRevisions.current.set(id, next.draft.revision);
    blocked.current.delete(id);
    return next;
  }
  return {
    project,
    setProject,
    projectRef,
    projects,
    setProjects,
    store,
    savedRevisions,
    blocked,
    saveQueue,
    storageReady,
    setStorageReady,
    saveState,
    setSaveState,
    lastCopy,
    setLastCopy,
    validatedRevision,
    setValidatedRevision,
    artifact,
    setArtifact,
    commands,
    loadSaved,
  };
}

export type CourseWorkspace = ReturnType<typeof useCourseWorkspace>;
