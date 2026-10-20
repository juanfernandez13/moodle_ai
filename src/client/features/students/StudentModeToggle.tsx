"use client";
import type { KeyboardEvent } from "react";
import { FileSpreadsheet, PencilLine } from "lucide-react";

export type StudentEntry = "file" | "manual";

const MODES = [
  ["file", "Enviar planilha", FileSpreadsheet],
  ["manual", "Preencher à mão", PencilLine],
] as const;

/** Two ways to give the students, the same pair the course entry offers: send the file or fill it in by hand. */
export function StudentModeToggle({
  visible,
  entry,
  onChange,
}: {
  visible: boolean;
  entry: StudentEntry;
  onChange: (entry: StudentEntry) => void;
}) {
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = MODES.length - 1;
    const target =
      event.key === "ArrowRight"
        ? index === last ? 0 : index + 1
        : event.key === "ArrowLeft"
          ? index === 0 ? last : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : -1;
    if (target < 0) return;
    event.preventDefault();
    const next = MODES[target]![0];
    onChange(next);
    document.getElementById(`student-tab-${next}`)?.focus();
  }
  return (
    <div
      className="stu-modes"
      role="tablist"
      aria-label="Como informar os alunos"
      hidden={!visible}
    >
      {MODES.map(([value, label, Icon], index) => (
        <button
          key={value}
          id={`student-tab-${value}`}
          type="button"
          role="tab"
          aria-selected={entry === value}
          aria-controls={`student-panel-${value}`}
          tabIndex={entry === value ? 0 : -1}
          onKeyDown={(event) => move(event, index)}
          onClick={() => onChange(value)}
        >
          <Icon size={20} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
