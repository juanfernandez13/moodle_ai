"use client";
import { FileSpreadsheet, Upload } from "lucide-react";
import { formatBytes } from "../../download.ts";
import type { StudentMapping } from "../../../domain/students/index.ts";
import { StudentMappingEditor } from "./StudentMapping.tsx";

export function StudentImport({
  visible,
  file,
  matrix,
  sheets,
  sheet,
  mapping,
  mappingOpen,
  busy,
  hasRows,
  onImport,
  onExample,
  onToggleMapping,
  onSheetChange,
  onMappingChange,
  onApplyMapping,
  onContinue,
}: {
  visible: boolean;
  file: File | null;
  matrix: string[][];
  sheets: string[];
  sheet: string;
  mapping: StudentMapping;
  mappingOpen: boolean;
  busy: boolean;
  hasRows: boolean;
  onImport: (source: File) => Promise<void>;
  onExample: () => void;
  onToggleMapping: () => void;
  onSheetChange: (sheet: string) => void;
  onMappingChange: (mapping: StudentMapping) => void;
  onApplyMapping: () => void;
  onContinue: () => void;
}) {
  return (
    <section hidden={!visible}>
      <div className="upload-group planning-group">
        <div className="upload-row">
          <FileSpreadsheet size={25} />
          <div className="upload-copy">
            <label htmlFor="student-file">Planilha de alunos</label>
            <p>
              {file
                ? `${file.name} · ${formatBytes(file.size)}`
                : "XLS, XLSX ou CSV · até 8 MiB"}
            </p>
          </div>
          <label htmlFor="student-file" className="file-button">
            <Upload size={16} />
            Escolher planilha
            <input
              id="student-file"
              className="visually-hidden"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => {
                if (event.target.files?.[0])
                  void onImport(event.target.files[0]);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      <div className="button-row">
        <button type="button" className="text-button" onClick={onExample}>
          Usar planilha de exemplo
        </button>
        {matrix.length > 0 && (
          <button
            type="button"
            className="text-button"
            onClick={onToggleMapping}
          >
            Conferir mapeamento
          </button>
        )}
      </div>
      {sheets.length > 1 && (
        <label className="field">
          <span>Aba da planilha</span>
          <select
            value={sheet}
            disabled={busy}
            onChange={(event) => onSheetChange(event.target.value)}
          >
            {sheets.map((entry) => (
              <option key={entry}>{entry}</option>
            ))}
          </select>
        </label>
      )}
      {mappingOpen && matrix.length > 0 && (
        <StudentMappingEditor
          matrix={matrix}
          mapping={mapping}
          onChange={onMappingChange}
          onApply={onApplyMapping}
        />
      )}
      {hasRows && (
        <button
          className="primary"
          type="button"
          onClick={onContinue}
        >
          Continuar revisão
        </button>
      )}
    </section>
  );
}

