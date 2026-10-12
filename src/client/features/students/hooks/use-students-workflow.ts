"use client";
import { useMemo, useRef, useState } from "react";
import { useMoodle } from "../../../components/moodle-connection.tsx";
import { validateStudents } from "../../../../domain/students/index.ts";
import { useStudentSource } from "./use-student-source.ts";
import { useStudentCsv } from "./use-student-csv.ts";
import { useStudentMoodle } from "./use-student-moodle.ts";

export type StudentStage = 1 | 2 | 3;

export function useStudentsWorkflow() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<StudentStage>(1);
  const generation = useRef(0);
  const connection = useMoodle();

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
    onReview: () => setStage(2)
  });
  const csv = useStudentCsv({
    rows: source.rows,
    generation,
    setBusy,
    setError,
    onInvalidate: invalidate,
    onReady: () => setStage(3),
    onPreviewChange: () => remote.clearPreview()
  });
  const remote = useStudentMoodle({
    candidate: csv.previews[csv.previewIndex],
    generation,
    setBusy,
    setError
  });
  const validation = useMemo(
    () => source.rows.length ? validateStudents(source.rows) : { valid: false, issues: [] },
    [source.rows],
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
    validation
  };
}
