"use client";
import { PageTurnOverlay } from "../../components/page-turn.tsx";
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

export function CourseBuilder() {
  const course = useCourseBuilder();
  return (
    <Shell>
      <input
        ref={course.portableInput}
        type="file"
        className="visually-hidden"
        tabIndex={-1}
        accept=".moodleai,.zip"
        aria-label="Importar cópia portátil"
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
        pasteText={course.pasteText}
        setPasteText={course.setPasteText}
        busy={course.busy}
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
        proposalTrigger={course.proposalTrigger}
        portableInput={course.portableInput}
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
      />}
      {course.artifact && course.project && <DeliveryPanel artifact={course.artifact} project={course.project} />}
      <PageTurnOverlay step={!course.project ? 0 : course.artifact ? 2 : 1} />
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
        openSaved={course.openSaved}
        proposalTrigger={course.proposalTrigger}
        portableInput={course.portableInput}
      />}
    </Shell>
  );
}
