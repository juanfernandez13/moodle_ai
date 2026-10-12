"use client";
import { useMemo, useState } from "react";
import type { CourseProject } from "../../../project.ts";
import { focusIssueField } from "../../../navigation.ts";
import type { View, UiIssue } from "../types.ts";
import { projectIssues } from "../helpers.ts";

type Options = {
  project: CourseProject | null;
  setShowReview: (show: boolean) => void;
  setError: (message: string) => void
};

export function useCourseNavigation({ project, setShowReview, setError }: Options) {
  const [coursePane, setCoursePane] = useState("discipline");
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
  return {
    coursePane,
    setCoursePane,
    view,
    setView,
    activityId,
    setActivityId,
    activityPages,
    setActivityPages,
    issueFocus,
    setIssueFocus,
    issues,
    section,
    activity,
    activityPage,
    visibleActivities,
    allActivities,
    showIssue,
  };
}
