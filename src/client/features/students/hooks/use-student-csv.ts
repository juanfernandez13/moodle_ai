"use client";
import { useState } from "react";
import { buildStudentPreview } from "../../../../domain/students/index.ts";
import type { StudentOptions, StudentPreview, StudentRow } from "../../../../domain/students/index.ts";
import { buildStudentBatches } from "../helpers.ts";

export function useStudentCsv({
  rows,
  generation,
  setBusy,
  setError,
  onInvalidate,
  onReady,
  onPreviewChange,
}: {
  rows: StudentRow[];
  generation: { current: number };
  setBusy: (busy: boolean) => void;
  setError: (error: string) => void;
  onInvalidate: () => void;
  onReady: () => void;
  onPreviewChange: () => void;
}) {
  const [options, setOptions] = useState<StudentOptions>({ mode: "create", enrol: true });
  const [destinations, setDestinations] = useState("");
  const [previews, setPreviews] = useState<StudentPreview[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  async function prepare() {
    const revision = generation.current;
    setBusy(true);
    setError("");
    try {
      const batches = buildStudentBatches(rows, options, destinations);
      const results = await Promise.all(
        batches.map((batch) => buildStudentPreview(batch, options)),
      );
      const failed = results.find((result) => !result.ok);
      if (failed && !failed.ok)
        throw new Error(
          failed.issues
            .map(
              (issue) =>
                `Linha ${rows.find((row) => row.id === issue.rowId)?.rowNumber ?? "?"}: ${issue.message}`,
            )
            .join("\n"),
        );
      if (revision !== generation.current)
        throw new Error(
          "A lista mudou durante a conferência. Gere uma nova prévia.",
        );
      setPreviews(
        results.flatMap((result) => (result.ok ? [result.preview] : [])),
      );
      onReady();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível conferir o lote.",
      );
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setPreviews([]);
    setPreviewIndex(0);
  }
  function changeOptions(next: StudentOptions) {
    onInvalidate();
    setOptions(next);
  }
  function changeDestinations(next: string) {
    onInvalidate();
    setDestinations(next);
  }
  function selectPreview(index: number) {
    generation.current++;
    setPreviewIndex(index);
    onPreviewChange();
  }
  return {
    options,
    destinations,
    previews,
    previewIndex,
    prepare,
    clear,
    changeOptions,
    changeDestinations,
    selectPreview
  };
}
