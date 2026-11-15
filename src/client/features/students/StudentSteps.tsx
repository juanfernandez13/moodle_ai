"use client";
import { Trail } from "../../components/trail.tsx";
import type { StudentStage } from "./hooks/use-students-workflow.ts";

const STEPS: { stage: StudentStage; label: string }[] = [
  { stage: 1, label: "Alunos" },
  { stage: 2, label: "Conferir" },
  { stage: 3, label: "Enviar" },
];

/**
 * The three steps, always in view (the same Trail as the other tools). A finished step goes back with one click; the
 * ones ahead are only a number: the main button of each step is the way forward.
 */
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
    <Trail
      className="stu-steps"
      label="Etapas do cadastro"
      steps={STEPS.map((step) => ({
        id: String(step.stage),
        label: step.label,
        state:
          step.stage === stage
            ? "current"
            : step.stage < stage
              ? "done"
              : "todo",
        onGo:
          step.stage < stage && open[step.stage]
            ? () => onSelect(step.stage)
            : undefined,
      }))}
    />
  );
}
