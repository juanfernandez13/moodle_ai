"use client";
import { AlertCircle, Check, Eye } from "lucide-react";
import type { StudentRow, StudentIssue, StudentOptions } from "../../../domain/students/index.ts";
import { EditableStudentTable } from "./EditableStudentTable.tsx";
import { STUDENT_PAGE_SIZE } from "./helpers.ts";
import type { StudentEditField } from "./helpers.ts";

export function StudentReview({
  rows,
  validation,
  page,
  options,
  destinations,
  busy,
  onPageChange,
  onRowChange,
  onOptionsChange,
  onDestinationsChange,
  onPrepare,
}: {
  rows: StudentRow[];
  validation: {
    valid: boolean;
    issues: StudentIssue[]
  };
  page: number;
  options: StudentOptions;
  destinations: string;
  busy: boolean;
  onPageChange: (page: number) => void;
  onRowChange: (id: string, field: StudentEditField, value: string) => void;
  onOptionsChange: (options: StudentOptions) => void;
  onDestinationsChange: (value: string) => void;
  onPrepare: () => Promise<void>;
}) {
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Conferir {rows.length} alunos</h2>
          <p className="field-help">
            A linha e os valores originais continuam disponíveis. Corrigir
            um campo revalida a lista.
          </p>
        </div>
        <span
          className={validation.valid ? "valid-count" : "issue-count"}
        >
          {validation.valid ? (
            <Check size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          {validation.issues.length} pendências
        </span>
      </div>
      <EditableStudentTable
        rows={rows}
        issues={validation.issues}
        page={page}
        onPageChange={onPageChange}
        onRowChange={onRowChange}
      />
      {validation.issues.length > 0 && (
        <div className="review-issues">
          {validation.issues.map((issue, index) => (
            <button
              type="button"
              className="issue-link"
              key={index}
              onClick={() => {
                onPageChange(
                  Math.floor(
                    rows.findIndex((row) => row.id === issue.rowId) / STUDENT_PAGE_SIZE,
                  ),
                );
                setTimeout(() => {
                  const node = document.getElementById(
                    `student-${issue.rowId}`,
                  );
                  node?.scrollIntoView({ block: "center" });
                  (
                    node?.querySelector(
                      "[aria-invalid=true]",
                    ) as HTMLElement | null
                  )?.focus();
                }, 50);
              }}
            >
              Linha{" "}
              {rows.find((row) => row.id === issue.rowId)?.rowNumber}:{" "}
              {issue.message}
            </button>
          ))}
        </div>
      )}
      <div className="field-grid">
        <label className="field">
          <span>Modo de cadastro</span>
          <select
            value={options.mode}
            onChange={(event) => {
              onOptionsChange({
                ...options,
                mode: event.target.value as "create" | "update",
              });
            }}
          >
            <option value="create">Criar novos usuários</option>
            <option value="update">Atualizar usuários existentes</option>
          </select>
        </label>
        <label className="field">
          <span>Cursos para todo o lote (opcional)</span>
          <input
            value={destinations}
            onChange={(event) => {
              onDestinationsChange(event.target.value);
            }}
            placeholder="PROG-2026, LOGICA-2026"
          />
          <small className="field-help">
            Um CSV por curso, com todos os alunos. Em branco, mantém o
            curso informado em cada linha.
          </small>
        </label>
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={options.enrol}
          onChange={(event) => {
            onOptionsChange({ ...options, enrol: event.target.checked });
          }}
        />
        Incluir matrícula em curso no CSV
      </label>
      <button
        type="button"
        className="primary"
        disabled={busy || !validation.valid}
        onClick={() => {
          void onPrepare();
        }}
      >
        <Eye size={18} />
        Conferir e preparar CSV
      </button>
    </>
  );
}

