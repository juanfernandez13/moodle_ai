"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  friendlyMessage,
  nextMonday,
  summarizeTargets,
  todayIso,
} from "./helpers.ts";
import type { DatePane } from "./types.ts";
import { useDatePlanner } from "./use-date-planner.ts";

export interface DateStepItem {
  id: DatePane;
  label: string;
  state: "done" | "current" | "todo";
  enabled: boolean;
}

const UNKNOWN_RESULT =
  "Não sabemos se as datas mudaram. Confira no Moodle antes de tentar de novo.";

/**
 * Screen flow on top of the planner: which step shows, what the step list allows and the automatic moves
 * between steps (connected -> courses, chosen course -> its dates). Moodle-changing rules stay in the planner.
 */
export function useDateWizard() {
  const planner = useDatePlanner();
  const {
    moodle,
    pane,
    demo,
    courseId,
    targetsText,
    busy,
    input,
    preview,
    moodlePreview,
    results,
    unknownResult,
  } = planner;
  const authenticated = moodle.status?.authenticated === true;
  const sessionKey = authenticated
    ? `${moodle.status?.connectedUrl ?? ""}|${moodle.status?.name ?? ""}`
    : "";
  const [askedKey, setAskedKey] = useState("");
  const wasConnected = useRef(false);
  const leaving = useRef(false);
  const [dropped, setDropped] = useState(false);
  const summary = useMemo(() => summarizeTargets(targetsText), [targetsText]);
  // The test mode only has the dates steps; a stray session event must not leave it on a Moodle step.
  const shown: DatePane = demo ? (pane === "preview" ? "preview" : "plan") : pane;

  // A default start date that has already passed would be applied by accident: move it to the next Monday.
  useEffect(() => {
    const now = new Date();
    if (input.startDate < todayIso(now)) planner.change("startDate", nextMonday(now));
  }, []);

  // Connecting (or opening the page already connected) moves from the login to the course list.
  // Losing the connection without the person asking for it is remembered, so the login can say so.
  useEffect(() => {
    if (authenticated && !wasConnected.current && pane === "login" && !demo)
      planner.setPane("course");
    if (!authenticated && wasConnected.current && !leaving.current) setDropped(true);
    if (authenticated) {
      leaving.current = false;
      setDropped(false);
    }
    wasConnected.current = authenticated;
  }, [authenticated, pane, demo]);

  // When a Moodle action fails while connected, check whether the session is the reason (it lasts 30 minutes).
  useEffect(() => {
    if (planner.error && authenticated && !demo) void moodle.refresh();
  }, [planner.error]);

  // The course list loads by itself once per connection.
  useEffect(() => {
    if (!authenticated) {
      if (askedKey) setAskedKey("");
      return;
    }
    if (demo || pane !== "course" || askedKey === sessionKey) return;
    setAskedKey(sessionKey);
    void moodle.loadCourses();
  }, [authenticated, demo, pane, sessionKey, askedKey]);

  // The course being changed is named again on the review page: that is the last look before Moodle changes.
  const courseTitle = demo
    ? ""
    : (moodle.courses.find((course) => course.id === courseId)?.title ?? "");
  const loadingCourses = moodle.busy && moodle.courses.length === 0;
  const coursesLoaded = authenticated && askedKey === sessionKey && !moodle.busy;

  function pickCourse(id: number) {
    if (busy || moodle.busy) return;
    if (id !== courseId) planner.selectCourse(id);
    else if (summary) return;
    void planner.readTargets(id);
  }

  /** After a result: back to the course list with nothing chosen, so the next course starts clean. */
  function chooseAnother() {
    planner.selectCourse(0);
    planner.setPane("course");
  }

  function signOut() {
    leaving.current = true;
    void moodle.logout();
  }

  const labels: [DatePane, string][] = demo
    ? [
        ["plan", "Novas datas"],
        ["preview", "Conferir"],
      ]
    : [
        ["login", "Entrar no Moodle"],
        ["course", "Escolher o curso"],
        ["plan", "Novas datas"],
        ["preview", "Conferir"],
      ];
  const currentIndex = labels.findIndex(
    ([id]) => id === (shown === "result" ? "preview" : shown),
  );
  function reachable(id: DatePane): boolean {
    if (id === "login") return true;
    if (id === "plan" && demo) return true;
    if (id === "preview" && demo) return preview !== null;
    if (!authenticated) return false;
    if (id === "course") return true;
    if (id === "plan") return courseId > 0 && summary !== null;
    return moodlePreview !== null || results.length > 0 || unknownResult;
  }
  // Moodle is applying the dates: the steps wait, so the result page cannot be left by accident.
  const applying = busy && pane === "result";
  const steps: DateStepItem[] = labels.map(([id, label], index) => ({
    id,
    label,
    state:
      index < currentIndex ? "done" : index === currentIndex ? "current" : "todo",
    enabled: reachable(id) && !applying,
  }));
  function goTo(id: DatePane) {
    if (!reachable(id)) return;
    planner.setPane(id === "preview" && !demo && !moodlePreview ? "result" : id);
  }

  /** "Ver como fica": the test mode plans on this device, the Moodle flow asks Moodle for the before and after. */
  function previewPlan() {
    return demo ? planner.simulate() : planner.previewMoodleDates();
  }

  // The results page already explains a lock; every other page gets the sentence in the banner.
  const raw =
    planner.error ||
    moodle.error ||
    (unknownResult && shown !== "result" ? UNKNOWN_RESULT : "");
  return {
    ...planner,
    shown,
    steps,
    summary,
    authenticated,
    courseTitle,
    loadingCourses,
    coursesLoaded,
    applying,
    dropped,
    signOut,
    chooseAnother,
    message: friendlyMessage(raw),
    pickCourse,
    goTo,
    previewPlan,
  };
}
