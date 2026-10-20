"use client";
import { useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  ArrowRight,
  Check,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Lock,
  Table2,
  Upload,
} from "lucide-react";
import { downloadFile, formatBytes } from "../../download.ts";
import type { StudentMapping } from "../../../domain/students/index.ts";
import { createStudentTemplate } from "./helpers.ts";
import { ManualStudentEntry } from "./ManualStudentEntry.tsx";
import { StudentMappingEditor } from "./StudentMapping.tsx";
import { useStageFocus } from "./hooks/use-stage-focus.ts";
import type { StudentEntry } from "./StudentModeToggle.tsx";

function PrivacyNote() {
  return (
    <p className="stu-note">
      <Lock size={18} aria-hidden="true" />
      Os dados ficam só nesta janela.
    </p>
  );
}

/** First step: the students arrive as one spreadsheet, or typed by hand in the same columns. */
export function StudentImport({
  visible,
  entry,
  file,
  matrix,
  sheets,
  sheet,
  mapping,
  mappingOpen,
  busy,
  rowCount,
  onImport,
  onExample,
  onManual,
  onToggleMapping,
  onSheetChange,
  onMappingChange,
  onApplyMapping,
  onContinue,
}: {
  visible: boolean;
  entry: StudentEntry;
  file: File | null;
  matrix: string[][];
  sheets: string[];
  sheet: string;
  mapping: StudentMapping;
  mappingOpen: boolean;
  busy: boolean;
  rowCount: number;
  onImport: (source: File) => Promise<void>;
  onExample: () => void;
  onManual: (matrix: string[][]) => void;
  onToggleMapping: () => void;
  onSheetChange: (sheet: string) => void;
  onMappingChange: (mapping: StudentMapping) => void;
  onApplyMapping: () => void;
  onContinue: () => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const heading = useStageFocus(visible, true);
  const showMapping = mappingOpen && matrix.length > 0;

  // A file dropped beside the drop area must not make the browser leave the app and lose the list.
  useEffect(() => {
    const keep = (event: globalThis.DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    window.addEventListener("dragover", keep);
    window.addEventListener("drop", keep);
    return () => {
      window.removeEventListener("dragover", keep);
      window.removeEventListener("drop", keep);
    };
  }, []);

  function choose(files: FileList | null) {
    const chosen = files?.[0];
    if (chosen) void onImport(chosen);
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (!busy) choose(event.dataTransfer.files);
  }
  function openPicker() {
    if (!busy) picker.current?.click();
  }

  return (
    <section hidden={!visible} className="stu-import">
      <h2 className="visually-hidden" tabIndex={-1} ref={heading}>
        Alunos
      </h2>
      <div
        id="student-panel-file"
        role="tabpanel"
        aria-labelledby="student-tab-file"
        hidden={entry !== "file"}
        className="stu-pane"
      >
        <input
          ref={picker}
          id="student-file"
          className="visually-hidden"
          type="file"
          accept=".csv,.xlsx,.xls"
          tabIndex={-1}
          aria-label="Planilha de alunos"
          onChange={(event) => {
            choose(event.target.files);
            event.target.value = "";
          }}
        />
        {showMapping ? (
          <>
            <div className="stu-file-row">
              <FileSpreadsheet size={22} aria-hidden="true" />
              <span>
                {file ? `${file.name} · ${formatBytes(file.size)}` : "Planilha"}
              </span>
              <button type="button" className="text-button" onClick={openPicker}>
                <Upload size={20} aria-hidden="true" />
                Trocar planilha
              </button>
            </div>
            <StudentMappingEditor
              matrix={matrix}
              mapping={mapping}
              onChange={onMappingChange}
              onApply={onApplyMapping}
              onCancel={onToggleMapping}
            />
          </>
        ) : (
          <>
            <div
              className={`stu-zone${dragging ? " dragging" : ""}`}
              aria-busy={busy}
              onClick={openPicker}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                  setDragging(false);
              }}
              onDrop={drop}
            >
              <span className="stu-zone-icon" aria-hidden="true">
                {busy ? (
                  <Loader2 size={40} className="spinner" />
                ) : (
                  <FileSpreadsheet size={40} />
                )}
              </span>
              <p className="stu-zone-title" role={busy ? "status" : undefined}>
                {busy ? (
                  "Lendo a planilha…"
                ) : dragging ? (
                  "Solte a planilha aqui"
                ) : (
                  <>
                    <span className="stu-drag-text">Arraste a planilha aqui</span>
                    <span className="stu-touch-text">Escolha a planilha</span>
                  </>
                )}
              </p>
              <button
                type="button"
                className={`${rowCount > 0 ? "secondary" : "primary"} stu-pick`}
                disabled={busy}
                onClick={(event) => {
                  event.stopPropagation();
                  openPicker();
                }}
              >
                <Upload size={22} aria-hidden="true" />
                {rowCount > 0 ? "Trocar planilha" : "Escolher planilha"}
              </button>
              <p className="stu-zone-help">Excel ou CSV · até 8 MB</p>
              {file && !busy && (
                <p className="stu-zone-file">
                  {file.name} · {formatBytes(file.size)}
                </p>
              )}
            </div>
            <div className="stu-links">
              <button type="button" className="text-button" onClick={onExample}>
                <Eye size={20} aria-hidden="true" />
                Ver exemplo
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  downloadFile(
                    createStudentTemplate(),
                    "modelo-alunos.csv",
                    "text/csv;charset=utf-8",
                  )
                }
              >
                <Download size={20} aria-hidden="true" />
                Baixar modelo
              </button>
              {file && matrix.length > 0 && (
                <button
                  type="button"
                  className="text-button"
                  onClick={onToggleMapping}
                >
                  <Table2 size={20} aria-hidden="true" />
                  Conferir colunas
                </button>
              )}
              {sheets.length > 1 && (
                <label className="field stu-sheet-pick">
                  <span>Aba da planilha</span>
                  <select
                    value={sheet}
                    disabled={busy}
                    onChange={(event) => onSheetChange(event.target.value)}
                  >
                    {sheets.map((entryName) => (
                      <option key={entryName}>{entryName}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {rowCount > 0 && (
              <div className="stu-actions stu-loaded">
                <p className="stu-hint">
                  <Check size={18} aria-hidden="true" />
                  {rowCount} {rowCount === 1 ? "aluno" : "alunos"} na lista
                </p>
                <button type="button" className="primary" onClick={onContinue}>
                  Continuar
                  <ArrowRight size={20} aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        )}
        <PrivacyNote />
      </div>
      <div
        id="student-panel-manual"
        role="tabpanel"
        aria-labelledby="student-tab-manual"
        hidden={entry !== "manual"}
        className="stu-pane"
      >
        <ManualStudentEntry busy={busy} onContinue={onManual} />
        <PrivacyNote />
      </div>
    </section>
  );
}
