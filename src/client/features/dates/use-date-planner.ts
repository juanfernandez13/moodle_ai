"use client";
import { useRef, useState } from "react";
import { z } from "zod";
import { buildDatePlan, previewDatePlan } from "../../../domain/dates/index.ts";
import type {
  DatePlanInput,
  DateTarget,
  DatePlan,
} from "../../../domain/dates/index.ts";
import {
  useMoodle,
  moodlePost,
  issuesMessage,
} from "../../components/moodle-connection.tsx";
import { dateTargets } from "./helpers.ts";
import type { DatePane, DateOperationResult } from "./types.ts";

/**
 * Keeps revision invalidation and one-use confirmation beside their async actions.
 * The wizard (use-date-wizard.ts) only drives screens on top of this; every Moodle-changing rule stays here.
 * Tests extract this function on its own, so it may use only React state/ref hooks and the imports above.
 */
export function useDatePlanner() {
  const [input, setInput] = useState<DatePlanInput>({
    startDate: "2026-10-19",
    unitCount: 4,
    daysPerUnit: 7,
    opensAtTime: "00:00",
    closesAtTime: "23:59",
    timezoneOffsetMinutes: -180,
  });
  const [targetsText, setTargetsText] = useState("");
  const [preview, setPreview] = useState<{
    hash: string;
    plan: DatePlan;
  } | null>(null);
  const [error, setError] = useState("");
  const [pane, setPane] = useState<DatePane>("login");
  // Test mode: example units on this device only; it never reaches the Moodle actions below.
  const [demo, setDemo] = useState(false);
  const [demoUnits, setDemoUnits] = useState(4);
  const [courseId, setCourseId] = useState(0);
  const [busy, setBusy] = useState(false);
  const [moodlePreview, setMoodlePreview] = useState<{
    previewId: string;
    hash: string;
    plan: DatePlan;
  } | null>(null);
  const [results, setResults] = useState<DateOperationResult[]>([]);
  const [unknownResult, setUnknownResult] = useState(false);
  const revision = useRef(0);
  const sessionGeneration = useRef(0);
  const currentPreview = useRef<typeof moodlePreview>(null);
  const remoteTargets = useRef(false);
  const unknown = useRef(false);
  const confirming = useRef(false);
  const renderedSession = sessionGeneration.current;
  const moodle = useMoodle({
    onSessionChange() {
      sessionGeneration.current++;
      revision.current++;
      currentPreview.current = null;
      setMoodlePreview(null);
      setCourseId(0);
      setBusy(false);
      setError("");
      if (remoteTargets.current) {
        remoteTargets.current = false;
        setTargetsText("");
      }
      if (confirming.current) unknown.current = true;
      setUnknownResult(unknown.current);
      // With a lock the screens say so themselves (use-date-wizard.ts): the results page keeps showing.
      if (!unknown.current) {
        setResults([]);
        if (!demo) setPane("login");
      }
    },
  });
  function change(field: keyof DatePlanInput, value: string | number) {
    revision.current++;
    setPreview(null);
    currentPreview.current = null;
    setMoodlePreview(null);
    setError("");
    setInput((previous) => ({ ...previous, [field]: value }));
  }
  function changeDemoUnits(value: number) {
    revision.current++;
    setPreview(null);
    setError("");
    setDemoUnits(value);
  }
  function startDemo() {
    revision.current++;
    currentPreview.current = null;
    setMoodlePreview(null);
    setPreview(null);
    setError("");
    setDemo(true);
    setPane("plan");
  }
  function leaveDemo() {
    revision.current++;
    setPreview(null);
    setError("");
    setDemo(false);
    setPane(moodle.status?.authenticated ? "course" : "login");
  }
  async function simulate() {
    setError("");
    const expected = revision.current;
    try {
      // Remote course targets belong to the Moodle flow; the test mode always uses its own example units.
      const targets = dateTargets(
        demoUnits,
        remoteTargets.current ? "" : targetsText,
      );
      const result = buildDatePlan({ ...input, unitCount: demoUnits }, targets);
      if (!result.ok)
        throw new Error(result.issues.map((issue) => issue.message).join("\n"));
      const next = await previewDatePlan(result.plan);
      if (expected !== revision.current)
        throw new Error("As datas mudaram. Veja como fica de novo.");
      setPreview(next);
      currentPreview.current = null;
      setMoodlePreview(null);
      setPane("preview");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Confira o dia e os horários.",
      );
    }
  }
  async function previewMoodleDates() {
    if (
      !courseId ||
      renderedSession !== sessionGeneration.current ||
      unknown.current ||
      confirming.current
    )
      return;
    const expected = revision.current;
    const expectedSession = sessionGeneration.current;
    setBusy(true);
    setError("");
    try {
      const value = await moodlePost("/api/moodle/dates/preview", {
        courseId,
        input,
      });
      if (expectedSession !== sessionGeneration.current) return;
      const parsed = z
        .object({
          ok: z.literal(true),
          previewId: z.string(),
          hash: z.string(),
          plan: z.unknown(),
          targets: z.array(z.unknown()),
        })
        .parse(value);
      const calculated = buildDatePlan(input, parsed.targets as DateTarget[]);
      if (
        !calculated.ok ||
        JSON.stringify(calculated.plan) !== JSON.stringify(parsed.plan)
      )
        throw new Error(
          "O Moodle devolveu datas diferentes do esperado. Leia o curso de novo.",
        );
      if (expected !== revision.current)
        throw new Error("As datas mudaram. Veja como fica de novo.");
      const next = {
        previewId: parsed.previewId,
        hash: parsed.hash,
        plan: calculated.plan,
      };
      currentPreview.current = next;
      setMoodlePreview(next);
      setPane("preview");
    } catch (failure) {
      if (expectedSession !== sessionGeneration.current) return;
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível ver como fica. Tente de novo.",
      );
    } finally {
      if (expectedSession === sessionGeneration.current) setBusy(false);
    }
  }
  async function confirmDates() {
    if (
      !moodlePreview ||
      currentPreview.current !== moodlePreview ||
      unknown.current ||
      confirming.current
    )
      return;
    const approved = moodlePreview;
    const expectedSession = sessionGeneration.current;
    currentPreview.current = null;
    confirming.current = true;
    setMoodlePreview(null);
    // A second run must not show the first run's results while Moodle is still working.
    setResults([]);
    setBusy(true);
    setPane("result");
    setError("");
    try {
      const value = await moodlePost("/api/moodle/dates/confirm", {
        previewId: approved.previewId,
        expectedHash: approved.hash,
        confirmation: true,
      });
      if (expectedSession !== sessionGeneration.current) return;
      const parsed = z
        .object({
          ok: z.literal(true),
          results: z.array(
            z.object({
              id: z.string(),
              title: z.string().optional(),
              status: z.enum(["applied", "error", "unknown", "not_applied"]),
              message: z.string(),
            }),
          ),
        })
        .parse(value);
      setResults(parsed.results);
      setPane("result");
      unknown.current ||= parsed.results.some(
        (entry) => entry.status === "unknown",
      );
      setUnknownResult(unknown.current);
    } catch (failure) {
      if (expectedSession !== sessionGeneration.current) return;
      unknown.current = true;
      setUnknownResult(true);
      // The results page tells the person it is unknown and what to do; the banner only adds the reason.
      setError(failure instanceof Error ? failure.message : "");
    } finally {
      confirming.current = false;
      if (expectedSession === sessionGeneration.current) setBusy(false);
    }
  }
  async function readTargets(target: number = courseId) {
    if (!target || renderedSession !== sessionGeneration.current) return;
    const expected = revision.current;
    const expectedSession = sessionGeneration.current;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/moodle/course?courseId=${target}`, {
        cache: "no-store",
      });
      const value: unknown = await response.json();
      if (expectedSession !== sessionGeneration.current) return;
      const parsed = z
        .object({ ok: z.literal(true), targets: z.array(z.unknown()) })
        .safeParse(value);
      if (!response.ok || !parsed.success)
        throw new Error(
          issuesMessage(value, "Não foi possível ler as datas do curso."),
        );
      const targets = parsed.data.targets as DateTarget[];
      if (!targets.length)
        throw new Error("Este curso não tem datas para ajustar.");
      const count = Math.max(
        ...targets.map((item) => item.sectionIndex + 1),
      );
      // Only the course is being checked here, so a probe schedule stands in for whatever dates are typed now.
      const check = buildDatePlan(
        {
          startDate: "2026-01-05",
          unitCount: count,
          daysPerUnit: 7,
          opensAtTime: "00:00",
          closesAtTime: "23:59",
          timezoneOffsetMinutes: -180,
        },
        targets,
      );
      if (!check.ok)
        throw new Error(check.issues.map((issue) => issue.message).join("\n"));
      if (expected !== revision.current)
        throw new Error(
          "O curso ou as datas mudaram durante a leitura. Leia de novo.",
        );
      change("unitCount", count);
      remoteTargets.current = true;
      setTargetsText(JSON.stringify(targets, null, 2));
    } catch (failure) {
      if (expectedSession !== sessionGeneration.current) return;
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível ler o curso.",
      );
    } finally {
      if (expectedSession === sessionGeneration.current) setBusy(false);
    }
  }
  function changeTargets(value: string) {
    remoteTargets.current = false;
    revision.current++;
    setPreview(null);
    currentPreview.current = null;
    setMoodlePreview(null);
    setError("");
    setTargetsText(value);
  }
  function selectCourse(value: number) {
    revision.current++;
    currentPreview.current = null;
    setMoodlePreview(null);
    setResults([]);
    setCourseId(value);
    // A summary must never describe the course that was chosen before this one.
    if (remoteTargets.current) {
      remoteTargets.current = false;
      setTargetsText("");
    }
  }
  return {
    input,
    targetsText,
    preview,
    error,
    pane,
    setPane,
    demo,
    demoUnits,
    moodle,
    courseId,
    busy,
    moodlePreview,
    results,
    unknownResult,
    change,
    changeDemoUnits,
    changeTargets,
    selectCourse,
    startDemo,
    leaveDemo,
    simulate,
    previewMoodleDates,
    confirmDates,
    readTargets,
  };
}
export type DatePlanner = ReturnType<typeof useDatePlanner>;
