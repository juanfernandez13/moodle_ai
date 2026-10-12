"use client";
import { useState } from "react";
import { mapStudentRows } from "../../../../domain/students/index.ts";
import type { StudentRow, StudentMapping } from "../../../../domain/students/index.ts";
import { createStudentExample } from "../helpers.ts";
import type { StudentEditField } from "../helpers.ts";

export function useStudentSource({
  setBusy,
  setError,
  onInvalidate,
  onReview,
}: {
  setBusy: (busy: boolean) => void;
  setError: (error: string) => void;
  onInvalidate: () => void;
  onReview: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [matrix, setMatrix] = useState<string[][]>([]);
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [sheet, setSheet] = useState("");
  const [sheets, setSheets] = useState<string[]>([]);
  const [mapping, setMapping] = useState<StudentMapping>({
    header: true,
    columns: {},
  });
  const [mappingOpen, setMappingOpen] = useState(false);
  const [page, setPage] = useState(0);
  function changeRow(
    id: string,
    field: StudentEditField,
    value: string,
  ) {
    onInvalidate();
    setRows((previous) =>
      previous.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }
  async function parse(source: File, targetSheet?: string) {
    setBusy(true);
    onInvalidate();
    setFile(source);
    try {
      if (source.size > 8 * 1024 * 1024)
        throw new Error("A planilha pode ter até 8 MiB.");
      const data = new FormData();
      data.set("file", source);
      if (targetSheet) data.set("sheet", targetSheet);
      const response = await fetch("/api/students/parse", {
        method: "POST",
        body: data,
      });
      const result = (await response.json()) as {
        ok: boolean;
        rows?: StudentRow[];
        matrix?: string[][];
        sheet?: string;
        sheetNames?: string[];
        issues?: { message: string }[];
      };
      if (result.matrix) setMatrix(result.matrix);
      if (result.sheetNames) setSheets(result.sheetNames);
      if (result.sheet) setSheet(result.sheet);
      if (!response.ok || !result.ok || !result.rows) {
        setMappingOpen(Boolean(result.matrix));
        throw new Error(
          result.issues?.map((issue) => issue.message).join("\n") ||
          "Não foi possível interpretar a planilha.",
        );
      }
      setRows(result.rows);
      setPage(0);
      onReview();
      setMappingOpen(false);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível ler a planilha. A revisão anterior foi preservada.",
      );
    } finally {
      setBusy(false);
    }
  }
  function example() {
    const source = createStudentExample();
    onInvalidate();
    setFile(null);
    setMatrix(source);
    setRows(mapStudentRows(source));
    setPage(0);
    setSheets([]);
    onReview();
    setMappingOpen(false);
  }

  function applyMapping() {
    try {
      const next = mapStudentRows(matrix, mapping);
      onInvalidate();
      setRows(next);
      setPage(0);
      onReview();
      setMappingOpen(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Confira o mapeamento.");
    }
  }
  function changeSheet(next: string) {
    setSheet(next);
    if (file) void parse(file, next);
  }
  return {
    file,
    matrix,
    rows,
    sheet,
    sheets,
    mapping,
    mappingOpen,
    page,
    parse,
    example,
    changeRow,
    changeSheet,
    applyMapping,
    setPage,
    setMapping,
    toggleMapping: () => setMappingOpen(!mappingOpen)
  };
}
