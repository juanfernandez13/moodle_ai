"use client";
import type { StudentStage } from "./hooks/use-students-workflow.ts";

const STEPS: { stage: StudentStage; label: string }[] = [
  { stage: 1, label: "Alunos" },
  { stage: 2, label: "Conferir" },
  { stage: 3, label: "Enviar" },
];

/** The three steps, always in view. A step opens once the one before it has produced something to show. */
export function StudentSteps({
  stage,
  hasRows,
  hasFiles,
  onSelect,
}: {
  stage: StudentStage;
  hasRows: boolean;
  hasFiles: boolean;
  onSelect: (stage: StudentStage) => void;
}) {
  const open: Record<StudentStage, boolean> = {
    1: true,
    2: hasRows,
    3: hasFiles,
  };
  return (
    <ol className="stu-steps" aria-label="Etapas do cadastro">
      {STEPS.map((step) => (
        <li
          key={step.stage}
          className={
            step.stage === stage ? "current" : step.stage < stage ? "done" : ""
          }
        >
          <button
            type="button"
            aria-current={step.stage === stage ? "step" : undefined}
            disabled={!open[step.stage]}
            onClick={() => onSelect(step.stage)}
          >
            <span className="stu-step-number" aria-hidden="true">
              {step.stage}
            </span>
            <span className="stu-step-label">{step.label}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
