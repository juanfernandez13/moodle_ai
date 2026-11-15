"use client";
import { useMemo, useRef, useState } from "react";
import { useMoodle } from "../../../components/moodle-connection.tsx";
import { validateStudents } from "../../../../domain/students/index.ts";
import { buildStudentBatches, sheetCourses } from "../helpers.ts";
import { useStudentSource } from "./use-student-source.ts";
import { useStudentCsv } from "./use-student-csv.ts";
import { useStudentMoodle } from "./use-student-moodle.ts";

export type StudentStage = 1 | 2 | 3;

export function useStudentsWorkflow() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<StudentStage>(1);
  const generation = useRef(0);
  const sessionGeneration = useRef(0);
  const connection = useMoodle({
    onSessionChange() {
      generation.current++;
      sessionGeneration.current++;
      setBusy(false);
      setError("");
      remote.invalidateConnection();
    },
  });

  // Called from user actions after all three state owners have been created.
  function invalidate() {
    generation.current++;
    csv.clear();
    remote.clear();
    if (stage === 3) setStage(2);
    setError("");
  }
  const source = useStudentSource({
    setBusy,
    setError,
    onInvalidate: invalidate,
    onReview(rows) {
      // A lista de disciplinas começa pelas que a planilha traz.
      csv.seedDestinations(sheetCourses(rows));
      setStage(2);
    },
  });
  const csv = useStudentCsv({
    rows: source.rows,
    generation,
    setBusy,
    setError,
    onInvalidate: invalidate,
    onReady: () => setStage(3),
    onPreviewChange: () => remote.clearPreview(),
  });
  const remote = useStudentMoodle({
    candidate: csv.previews[csv.previewIndex],
    generation,
    sessionGeneration,
    setBusy,
    setError,
  });
  // Confere a lista como ela vai sair: a disciplina é a da lista, não a de cada linha. Assim o mesmo aluno escrito em
  // duas linhas com disciplinas diferentes é um aluno repetido (vai uma vez a cada disciplina), não um conflito.
  const validation = useMemo(
    () =>
      source.rows.length
        ? validateStudents(buildStudentBatches(source.rows, csv.options, csv.destinations)[0] ?? source.rows)
        : { valid: false, issues: [], repeats: [] },
    [source.rows, csv.options, csv.destinations],
  );
  return {
    busy,
    error,
    stage,
    setStage,
    source,
    csv,
    remote,
    connection,
    validation,
  };
}
