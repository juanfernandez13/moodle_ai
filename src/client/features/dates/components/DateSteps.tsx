import { Check } from "lucide-react";
import type { DatePane } from "../types.ts";
import type { DateStepItem } from "../use-date-wizard.ts";

/** Numbered steps. Finished steps go back with one click; steps that are not ready yet stay off. */
export function DateSteps({
  steps,
  onGo,
}: {
  steps: DateStepItem[];
  onGo(id: DatePane): void;
}) {
  const current = steps.findIndex((step) => step.state === "current");
  return (
    <nav className="dw-steps-nav" aria-label="Etapas">
      <ol className="dw-steps">
        {steps.map((step, index) => (
          <li key={step.id} className="dw-step" data-state={step.state}>
            <button
              type="button"
              className="dw-step-button"
              aria-current={step.state === "current" ? "step" : undefined}
              disabled={!step.enabled && step.state !== "current"}
              onClick={() => {
                if (step.state !== "current") onGo(step.id);
              }}
            >
              <span className="dw-num" aria-hidden="true">
                {step.state === "done" ? (
                  <Check size={20} strokeWidth={3} />
                ) : (
                  index + 1
                )}
              </span>
              <span className="dw-label">
                <span className="visually-hidden">Passo {index + 1}: </span>
                {step.label}
                {step.state === "done" && (
                  <span className="visually-hidden"> (concluído)</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ol>
      {current >= 0 && (
        <p className="dw-now" aria-hidden="true">
          Passo {current + 1} de {steps.length}: {steps[current]?.label}
        </p>
      )}
    </nav>
  );
}
