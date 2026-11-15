"use client";
import { useArrivalFocus } from "../../components/arrival-focus.ts";
import { turnClass, usePageTurn } from "../../components/page-turn.tsx";
import { Shell } from "../../components/shell.tsx";
import { useCourseBuilder } from "./hooks/use-course-builder.ts";
import { EntryPanel } from "./entry/entry-panel.tsx";
import { EditorWorkspace } from "./editor/editor-workspace.tsx";
import { DeliveryPanel } from "./delivery-panel.tsx";
import { PromptDialog } from "./dialogs/prompt-dialog.tsx";
import { ImportProposalDialog } from "./dialogs/import-proposal-dialog.tsx";
import { AgentProposalDialog } from "./dialogs/agent-proposal-dialog.tsx";
import { CourseReviewDialog } from "./dialogs/course-review-dialog.tsx";
import { SavedProjectsDialog } from "./dialogs/saved-projects-dialog.tsx";
import { StatusMessages } from "./status-messages.tsx";

/** Where the focus lands when the step changes: the entry title, the first title of the open page, the backup title. */
function arrivalTarget(step: number): HTMLElement | null {
  if (step === 0) return document.getElementById("entry-title");
  if (step === 1)
    return (
      document.querySelector<HTMLElement>(".editor-content h2") ??
      document.querySelector<HTMLElement>(".editor-heading h1")
    );
  return document.querySelector<HTMLElement>(".delivery h2");
}

export function CourseBuilder() {
  const course = useCourseBuilder();
  // 0 entry, 1 editor, 2 backup generated. Also what the page turn follows.
  const step = !course.project ? 0 : course.artifact ? 2 : 1;
  // Only the file ready to download is brought into view: on a phone its title lies far below the first screen.
  useArrivalFocus(step, arrivalTarget, (arrived) => arrived === 2);
  // The page that comes in is the one that turns: the entry when the person goes back to it, the editor when it opens,
  // the delivery bar when the file is ready. Going from the file back to the editor turns nothing.
  const turn = usePageTurn(step);
  const entering =
    turn === null
      ? null
      : turn.to === 2
        ? "delivery"
        : turn.to === 0
          ? "entry"
          : turn.from === 2
            ? null
            : "editor";
  const turning = (page: string) =>
    entering === page ? turnClass(turn) : undefined;
  return (
    <Shell>
      {/* O seletor de arquivo abre pelos botões "Abrir cópia salva" e "Importar cópia portátil": o campo em si fica fora do leitor de tela. */}
      <input
        ref={course.portableInput}
        type="file"
        className="visually-hidden"
        tabIndex={-1}
        accept=".moodleai,.zip"
        aria-hidden="true"
        onChange={(event) => {
          void course.portable(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <StatusMessages
        error={course.error}
        message={course.message}
        setError={course.setError}
        setMessage={course.setMessage}
        busy={course.busy}
        controller={course.controller}
      />
      {!course.project ? <EntryPanel
        entry={course.entry}
        setEntry={course.setEntry}
        setError={course.setError}
        setSelectedFiles={course.setSelectedFiles}
        selectedFiles={course.selectedFiles}
        provider={course.provider}
        setProvider={course.setProvider}
        keys={course.keys}
        setKeys={course.setKeys}
        aiProblem={course.aiProblem}
        pasteText={course.pasteText}
        setPasteText={course.setPasteText}
        busy={course.busy}
        controller={course.controller}
        importDocuments={course.importDocuments}
        name={course.name}
        firstSection={course.firstSection}
        openProject={course.openProject}
        setName={course.setName}
        setFirstSection={course.setFirstSection}
        jsonText={course.jsonText}
        setJsonText={course.setJsonText}
        importJson={course.importJson}
        example={course.example}
        setShowPrompt={course.setShowPrompt}
        setShowProjects={course.setShowProjects}
        projects={course.projects}
        proposalTrigger={course.proposalTrigger}
        portableInput={course.portableInput}
        turnClass={turning("entry")}
      /> : <EditorWorkspace
        setProject={course.setProject}
        setError={course.setError}
        setMessage={course.setMessage}
        project={course.project}
        saveState={course.saveState}
        busy={course.busy}
        portable={course.portable}
        setShowReview={course.setShowReview}
        setValidatedRevision={course.setValidatedRevision}
        issues={course.issues}
        view={course.view}
        setView={course.setView}
        setActivityId={course.setActivityId}
        commands={course.commands}
        setShowProjects={course.setShowProjects}
        section={course.section}
        coursePane={course.coursePane}
        setCoursePane={course.setCoursePane}
        issueFocus={course.issueFocus}
        activity={course.activity}
        setActivityPages={course.setActivityPages}
        visibleActivities={course.visibleActivities}
        activityPage={course.activityPage}
        allActivities={course.allActivities}
        missingTarget={course.missingTarget}
        setMissingTarget={course.setMissingTarget}
        addFiles={course.addFiles}
        lastCopy={course.lastCopy}
        showIssue={course.showIssue}
        fileReady={course.artifact !== null}
        turnClass={turning("editor")}
      />}
      {course.artifact && course.project && <DeliveryPanel artifact={course.artifact} project={course.project} turnClass={turning("delivery")} />}
      {course.showPrompt && <PromptDialog
        setShowPrompt={course.setShowPrompt}
        prompt={course.prompt}
        setMessage={course.setMessage}
      />}
      {course.proposal && <ImportProposalDialog
        proposalTrigger={course.proposalTrigger}
        setProposal={course.setProposal}
        proposal={course.proposal}
        project={course.project}
        openProject={course.openProject}
      />}
      {course.agentProposal && <AgentProposalDialog
        setAgentProposal={course.setAgentProposal}
        agentProposal={course.agentProposal}
        project={course.project}
        setError={course.setError}
        commands={course.commands}
      />}
      {course.showReview && course.project && <CourseReviewDialog
        setShowReview={course.setShowReview}
        project={course.project}
        allActivities={course.allActivities}
        issues={course.issues}
        showIssue={course.showIssue}
        busy={course.busy}
        exportMbz={course.exportMbz}
      />}
      {course.showProjects && <SavedProjectsDialog
        setShowProjects={course.setShowProjects}
        projects={course.projects}
        project={course.project}
        openSaved={course.openSaved}
        removeSaved={course.removeSaved}
        proposalTrigger={course.proposalTrigger}
        portableInput={course.portableInput}
      />}
    </Shell>
  );
}
