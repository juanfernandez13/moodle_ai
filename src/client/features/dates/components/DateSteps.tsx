import { Trail } from "../../../components/trail.tsx";
import type { DatePane } from "../types.ts";
import type { DateStepItem } from "../use-date-wizard.ts";

/**
 * Numbered steps (the same Trail as the other tools). A finished step goes back with one click, unless Moodle is
 * working; the ones ahead are only a number.
 */
export function DateSteps({
  steps,
  onGo,
}: {
  steps: DateStepItem[];
  onGo(id: DatePane): void;
}) {
  return (
    <Trail
      className="dw-steps"
      label="Etapas"
      steps={steps.map((step) => ({
        id: step.id,
        label: step.label,
        state: step.state,
        onGo:
          step.state === "done" && step.enabled
            ? () => onGo(step.id)
            : undefined,
      }))}
    />
  );
}
