"use client";
import { useRef, useState } from "react";
import { moodlePost } from "../../../components/moodle-connection.tsx";
import type { StudentPreview } from "../../../../domain/students/index.ts";
import {
  moodleStudentPreviewSchema,
  moodleStudentConfirmSchema,
} from "../schemas.ts";
import type { MoodleStudentPreview, MoodleStudentResult } from "../schemas.ts";

export function useStudentMoodle({
  candidate,
  generation,
  sessionGeneration,
  setBusy,
  setError,
}: {
  candidate: StudentPreview | undefined;
  generation: { current: number };
  sessionGeneration: { current: number };
  setBusy: (busy: boolean) => void;
  setError: (error: string) => void;
}) {
  const [moodlePreview, setMoodlePreview] =
    useState<MoodleStudentPreview | null>(null);
  const [results, setResults] = useState<MoodleStudentResult[]>([]);
  const [unknownResult, setUnknownResult] = useState(false);
  const [opsPage, setOpsPage] = useState(0);
  const currentPreview = useRef<MoodleStudentPreview | null>(null);
  const unknown = useRef(false);
  const confirming = useRef(false);
  const renderedSession = sessionGeneration.current;
  async function previewMoodle() {
    if (
      !candidate ||
      renderedSession !== sessionGeneration.current ||
      unknown.current ||
      confirming.current
    )
      return;
    const expected = generation.current;
    const expectedSession = sessionGeneration.current;
    setBusy(true);
    setError("");
    try {
      const value = await moodlePost("/api/moodle/students/preview", {
        rows: candidate.rows,
        options: candidate.options,
        expectedHash: candidate.hash,
      });
      if (expectedSession !== sessionGeneration.current) return;
      const parsed = moodleStudentPreviewSchema.parse(value);
      if (generation.current !== expected)
        throw new Error("A lista mudou; confira o CSV novamente.");
      if (parsed.hash !== candidate.hash)
        throw new Error(
          "A identificação da prévia mudou. Confira o CSV novamente.",
        );
      currentPreview.current = parsed;
      setMoodlePreview(parsed);
      setOpsPage(0);
    } catch (failure) {
      if (expectedSession !== sessionGeneration.current) return;
      setError(
        failure instanceof Error
          ? failure.message
          : "A prévia no Moodle falhou.",
      );
    } finally {
      if (expectedSession === sessionGeneration.current) setBusy(false);
    }
  }
  async function confirmMoodle() {
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
    setBusy(true);
    setError("");
    try {
      const value = await moodlePost("/api/moodle/students/confirm", {
        previewId: approved.previewId,
        expectedHash: approved.hash,
        confirmation: true,
      });
      if (expectedSession !== sessionGeneration.current) return;
      const parsed = moodleStudentConfirmSchema.parse(value);
      setResults(parsed.results);
      unknown.current ||= parsed.results.some(
        (entry) => entry.status === "unknown",
      );
      setUnknownResult(unknown.current);
    } catch (failure) {
      if (expectedSession !== sessionGeneration.current) return;
      unknown.current = true;
      setUnknownResult(true);
      setError(
        `${failure instanceof Error ? failure.message : "O resultado do envio é desconhecido."} Confira o estado dos usuários no Moodle antes de repetir.`,
      );
    } finally {
      confirming.current = false;
      if (expectedSession === sessionGeneration.current) setBusy(false);
    }
  }

  function clear() {
    currentPreview.current = null;
    setMoodlePreview(null);
    setResults([]);
    // An unknown send outcome stays locked for the remainder of this session.
  }
  function clearPreview() {
    currentPreview.current = null;
    setMoodlePreview(null);
    setOpsPage(0);
  }
  function invalidateConnection() {
    clearPreview();
    if (confirming.current) unknown.current = true;
    setUnknownResult(unknown.current);
    if (unknown.current) {
      setError(
        "Há um envio anterior sem resultado confirmado. Confira os usuários no Moodle de origem antes de repetir.",
      );
    } else setResults([]);
  }
  return {
    moodlePreview,
    results,
    unknownResult,
    opsPage,
    setOpsPage,
    previewMoodle,
    confirmMoodle,
    clear,
    clearPreview,
    invalidateConnection,
  };
}
