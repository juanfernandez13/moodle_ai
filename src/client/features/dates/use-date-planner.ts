"use client";
import { useRef, useState } from "react";
import { z } from "zod";
import { buildDatePlan, previewDatePlan } from "../../../domain/dates/index.ts";
import type { DatePlanInput, DateTarget, DatePlan } from "../../../domain/dates/index.ts";
import { useMoodle, moodlePost, issuesMessage } from "../../components/moodle-connection.tsx";
import { dateTargets } from "./helpers.ts";
import type { DatePane, DateOperationResult } from "./types.ts";

/** Keeps revision invalidation and one-use confirmation beside their async actions. */
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
  const [pane, setPane] = useState<DatePane>("plan");
  const [page, setPage] = useState(0);
  const moodle = useMoodle();
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
  function change(field: keyof DatePlanInput, value: string | number) {
    revision.current++;
    setPreview(null);
    setMoodlePreview(null);
    setError("");
    setInput((previous) => ({ ...previous, [field]: value }));
  }
  async function simulate() {
    setError("");
    const expected = revision.current;
    try {
      const targets = dateTargets(input.unitCount, targetsText);
      const result = buildDatePlan(input, targets);
      if (!result.ok)
        throw new Error(
          result.issues
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join("\n"),
        );
      const next = await previewDatePlan(result.plan);
      if (expected !== revision.current)
        throw new Error("O planejamento mudou. Simule novamente.");
      setPreview(next);
      setMoodlePreview(null);
      setPage(0);
      setPane("preview");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Confira as datas e os alvos.",
      );
    }
  }
  async function previewMoodleDates() {
    const expected = revision.current;
    setBusy(true);
    setError("");
    try {
      const value = await moodlePost("/api/moodle/dates/preview", {
        courseId,
        input,
      });
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
          "O plano recebido difere dos alvos e das regras atuais. Confira a configuração.",
        );
      if (expected !== revision.current)
        throw new Error("O planejamento mudou. Confira novamente.");
      setMoodlePreview({
        previewId: parsed.previewId,
        hash: parsed.hash,
        plan: calculated.plan,
      });
      setPage(0);
      setPane("preview");
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "A prévia Moodle falhou.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function confirmDates() {
    if (!moodlePreview) return;
    const approved = moodlePreview;
    setMoodlePreview(null);
    setBusy(true);
    setPane("result");
    setError("");
    try {
      const value = await moodlePost("/api/moodle/dates/confirm", {
        previewId: approved.previewId,
        expectedHash: approved.hash,
        confirmation: true,
      });
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
      setPage(0);
      setPane("result");
      setUnknownResult(
        parsed.results.some((entry) => entry.status === "unknown"),
      );
    } catch (failure) {
      setUnknownResult(true);
      setError(
        `${failure instanceof Error ? failure.message : "O resultado é desconhecido."} Confira as datas atuais no Moodle antes de repetir.`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function readTargets() {
    const expected = revision.current;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/moodle/course?courseId=${courseId}`, {
        cache: "no-store",
      });
      const value: unknown = await response.json();
      const parsed = z
        .object({ ok: z.literal(true), targets: z.array(z.unknown()) })
        .safeParse(value);
      if (!response.ok || !parsed.success)
        throw new Error(
          issuesMessage(value, "Não foi possível ler os alvos do curso."),
        );
      const targets = parsed.data.targets as DateTarget[];
      const count = Math.max(
        ...targets.map((target) => target.sectionIndex + 1),
      );
      const check = buildDatePlan({ ...input, unitCount: count }, targets);
      if (!check.ok)
        throw new Error(check.issues.map((issue) => issue.message).join("\n"));
      if (expected !== revision.current)
        throw new Error(
          "O curso ou plano mudou durante a leitura. Leia novamente.",
        );
      change("unitCount", count);
      setTargetsText(JSON.stringify(targets, null, 2));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível ler o curso.",
      );
    } finally {
      setBusy(false);
    }
  }
  function changeTargets(value: string) {
    revision.current++;
    setPreview(null);
    setMoodlePreview(null);
    setError("");
    setTargetsText(value);
  }
  function selectCourse(value: number) {
    revision.current++;
    setMoodlePreview(null);
    setResults([]);
    setCourseId(value);
  }
  return {
    input,
    targetsText,
    preview,
    error,
    pane,
    setPane,
    page,
    setPage,
    moodle,
    courseId,
    busy,
    moodlePreview,
    results,
    unknownResult,
    change,
    changeTargets,
    selectCourse,
    simulate,
    previewMoodleDates,
    confirmDates,
    readTargets
  };
}
export type DatePlanner = ReturnType<typeof useDatePlanner>;
