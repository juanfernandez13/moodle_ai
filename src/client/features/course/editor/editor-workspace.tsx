"use client";
import type { CourseProject } from "../../../project.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";
import { EditorHeader } from "./editor-header.tsx";
import { CourseNavigation } from "./course-navigation.tsx";
import { CourseMetadataPanel } from "./course-metadata-panel.tsx";
import { SectionPanel } from "./section-panel.tsx";
import { GradesPanel } from "./grades-panel.tsx";
import { ProjectFilesPanel } from "./project-files-panel.tsx";
import { ReviewSidebar } from "./review-sidebar.tsx";

type Props = Pick<
  CourseBuilderModel,
  "setProject"
  | "setError"
  | "setMessage"
  | "saveState"
  | "busy"
  | "portable"
  | "setShowReview"
  | "setValidatedRevision"
  | "issues"
  | "view"
  | "setView"
  | "setActivityId"
  | "commands"
  | "setShowProjects"
  | "section"
  | "coursePane"
  | "setCoursePane"
  | "issueFocus"
  | "activity"
  | "setActivityPages"
  | "visibleActivities"
  | "activityPage"
  | "allActivities"
  | "missingTarget"
  | "setMissingTarget"
  | "addFiles"
  | "lastCopy"
  | "showIssue"
>
  & { project: CourseProject; };

export function EditorWorkspace({
  setProject,
  setError,
  setMessage,
  project,
  saveState,
  busy,
  portable,
  setShowReview,
  setValidatedRevision,
  issues,
  view,
  setView,
  setActivityId,
  commands,
  setShowProjects,
  section,
  coursePane,
  setCoursePane,
  issueFocus,
  activity,
  setActivityPages,
  visibleActivities,
  activityPage,
  allActivities,
  missingTarget,
  setMissingTarget,
  addFiles,
  lastCopy,
  showIssue,
}: Props) {
  return (
    <main className="editor-layout">
      <EditorHeader
        setProject={setProject}
        setError={setError}
        setMessage={setMessage}
        project={project}
        saveState={saveState}
        busy={busy}
        portable={portable}
        setShowReview={setShowReview}
        setValidatedRevision={setValidatedRevision}
        issues={issues}
      />
      <CourseNavigation
        view={view}
        setView={setView}
        setActivityId={setActivityId}
        project={project}
        commands={commands}
        setShowProjects={setShowProjects}
      />

      <section
        className="editor-content glass"
        id={`entity-${section?.id ?? project.draft.id}`}
      >
        {view === "course" && (
          <CourseMetadataPanel
            coursePane={coursePane}
            setCoursePane={setCoursePane}
            project={project}
            commands={commands}
            issueFocus={issueFocus}
          />
        )}
        {section && (
          <SectionPanel
            project={project}
            section={section}
            activity={activity}
            commands={commands}
            setView={setView}
            setActivityId={setActivityId}
            issueFocus={issueFocus}
            setActivityPages={setActivityPages}
            visibleActivities={visibleActivities}
            activityPage={activityPage}
          />
        )}
        {view === "grades" && (
          <GradesPanel
            project={project}
            commands={commands}
            allActivities={allActivities}
            setProject={setProject}
            setValidatedRevision={setValidatedRevision}
          />
        )}
        {view === "files" && (
          <ProjectFilesPanel
            project={project}
            missingTarget={missingTarget}
            setMissingTarget={setMissingTarget}
            addFiles={addFiles}
            allActivities={allActivities}
            setProject={setProject}
            setValidatedRevision={setValidatedRevision}
            lastCopy={lastCopy}
          />
        )}
      </section>
      <ReviewSidebar
        project={project}
        issues={issues}
        showIssue={showIssue}
        setShowReview={setShowReview}
        setValidatedRevision={setValidatedRevision}
      />
    </main>
  );
}
