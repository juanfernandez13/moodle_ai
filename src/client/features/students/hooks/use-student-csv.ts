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
      if (failed && !failed.ok) {
        // A long list of the same problem helps no one: the first few lines say what to fix.
        const names: Record<string, string> = {
          username: "usuário",
          firstName: "primeiro nome",
          lastName: "sobrenome",
          email: "e-mail",
          cpf: "CPF",
          course: "curso",
        };
        const lines = failed.issues.map((issue) => {
          const line = rows.find((row) => row.id === issue.rowId)?.rowNumber ?? "?";
          const field = issue.path.split(".").pop() ?? "";
          return issue.code === "unsafe_csv_value"
            ? `Linha ${line}, ${names[field] ?? field}: apague o sinal = + - ou @ do começo.`
            : `Linha ${line}: ${issue.message}`;
        });
        throw new Error(
          [
            ...lines.slice(0, 4),
            ...(lines.length > 4 ? [`E mais ${lines.length - 4}.`] : []),
          ].join("\n"),
        );
      }
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
