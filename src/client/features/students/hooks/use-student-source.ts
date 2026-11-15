"use client";
import { useState } from "react";
import { deriveStudentUsername, mapStudentRows } from "../../../../domain/students/index.ts";
import type { StudentRow, StudentMapping } from "../../../../domain/students/index.ts";
import { createStudentExample, friendlyParseMessage } from "../helpers.ts";
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
  // The list was typed by hand: its lines have no spreadsheet to point back to (no "original" cells to show).
  const [typed, setTyped] = useState(false);
  function changeRow(
    id: string,
    field: StudentEditField,
    value: string,
  ) {
    onInvalidate();
    setRows((previous) =>
      previous.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, [field]: value };
        // The login the system worked out (from the CPF or the e-mail) follows the edit; one written in the spreadsheet stays.
        if ((field === "cpf" || field === "email") && row.username === deriveStudentUsername(row))
          next.username = deriveStudentUsername(next);
        return next;
      }),
    );
  }
  async function parse(source: File, targetSheet?: string) {
    setBusy(true);
    onInvalidate();
    setFile(source);
    try {
      if (source.size > 8 * 1024 * 1024)
        throw new Error("A planilha pode ter até 8 MB.");
      const data = new FormData();
      data.set("file", source);
      if (targetSheet) data.set("sheet", targetSheet);
      let response: Response;
      let result: {
        ok: boolean;
        rows?: StudentRow[];
        matrix?: string[][];
        sheet?: string;
        sheetNames?: string[];
        issues?: { code?: string; message: string }[];
      };
      try {
        response = await fetch("/api/students/parse", {
          method: "POST",
          body: data,
        });
        result = await response.json();
      } catch {
        throw new Error("Não foi possível ler a planilha. Tente de novo.");
      }
      if (result.matrix) setMatrix(result.matrix);
      if (result.sheetNames) setSheets(result.sheetNames);
      if (result.sheet) setSheet(result.sheet);
      if (!response.ok || !result.ok || !result.rows) {
        setMappingOpen(Boolean(result.matrix));
        throw new Error(
          result.issues
            ?.map((issue) => friendlyParseMessage(issue, result.matrix?.length))
            .join("\n") ||
          "Não foi possível ler a planilha.",
        );
      }
      setRows(result.rows);
      setTyped(false);
      onReview();
      setMappingOpen(false);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível ler a planilha.",
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
    setTyped(false);
    setSheets([]);
    onReview();
    setMappingOpen(false);
  }
  /** Typed students arrive as the matrix the example uses, so mapping, validation and review work the same. */
  function fromManual(typed: string[][]) {
    if (typed.length < 2) {
      setError("Preencha ao menos um aluno.");
      return;
    }
    let mapped: StudentRow[];
    try {
      // The lines are counted from 1: there is no header row in what the person typed.
      mapped = mapStudentRows(typed).map((row, index) => ({
        ...row,
        rowNumber: index + 1,
      }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Confira os alunos.");
      return;
    }
    onInvalidate();
    setFile(null);
    setMatrix(typed);
    setRows(mapped);
    setTyped(true);
    setSheets([]);
    onReview();
    setMappingOpen(false);
  }

  function applyMapping() {
    try {
      const next = mapStudentRows(matrix, mapping);
      onInvalidate();
      setRows(next);
      setTyped(false);
      onReview();
      setMappingOpen(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Confira as colunas.");
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
    typed,
    parse,
    example,
    fromManual,
    changeRow,
    changeSheet,
    applyMapping,
    setMapping,
    toggleMapping: () => setMappingOpen(!mappingOpen)
  };
}
