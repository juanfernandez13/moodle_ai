"use client";
import { useState } from "react";
import { moodlePost } from "../../../components/moodle-connection.tsx";
import type { StudentPreview } from "../../../../domain/students/index.ts";
import { moodleStudentPreviewSchema, moodleStudentConfirmSchema } from "../schemas.ts";
import type { MoodleStudentPreview, MoodleStudentResult } from "../schemas.ts";

export function useStudentMoodle({
  candidate,
  generation,
  setBusy,
  setError,
}: {
  candidate: StudentPreview | undefined;
  generation: { current: number };
  setBusy: (busy: boolean) => void;
  setError: (error: string) => void;
}) {
  const [moodlePreview, setMoodlePreview] = useState<MoodleStudentPreview | null>(null);
  const [results, setResults] = useState<MoodleStudentResult[]>([]);
  const [unknownResult, setUnknownResult] = useState(false);
  const [opsPage, setOpsPage] = useState(0);
  async function previewMoodle() {
    if (!candidate) return;
    const expected = generation.current;
    setBusy(true);
    setError("");
    try {
      const value = await moodlePost("/api/moodle/students/preview", {
        rows: candidate.rows,
        options: candidate.options,
        expectedHash: candidate.hash,
      });
      const parsed = moodleStudentPreviewSchema.parse(value);
      if (generation.current !== expected)
        throw new Error("A lista mudou; confira o CSV novamente.");
      if (parsed.hash !== candidate.hash)
        throw new Error(
          "A identificação da prévia mudou. Confira o CSV novamente.",
        );
      setMoodlePreview(parsed);
      setOpsPage(0);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "A prévia no Moodle falhou.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function confirmMoodle() {
    if (!moodlePreview) return;
    const approved = moodlePreview;
    setMoodlePreview(null);
    setBusy(true);
    setError("");
    try {
      const value = await moodlePost("/api/moodle/students/confirm", {
        previewId: approved.previewId,
        expectedHash: approved.hash,
        confirmation: true,
      });
      const parsed = moodleStudentConfirmSchema.parse(value);
      setResults(parsed.results);
      setUnknownResult(
        parsed.results.some((entry) => entry.status === "unknown"),
      );
    } catch (failure) {
      setUnknownResult(true);
      setError(
        `${failure instanceof Error ? failure.message : "O resultado do envio é desconhecido."} Confira o estado dos usuários no Moodle antes de repetir.`,
      );
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setMoodlePreview(null);
    setResults([]);
    // An unknown send outcome stays locked for the remainder of this session.
  }
  function clearPreview() {
    setMoodlePreview(null);
    setOpsPage(0);
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
    clearPreview
  };
}
