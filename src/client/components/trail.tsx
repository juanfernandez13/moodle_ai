"use client";
import type { CSSProperties } from "react";
import { Check } from "lucide-react";

export type TrailStep = {
  id: string;
  label: string;
  state: "done" | "current" | "todo";
  /** Only a finished step can take the person back: the others are plain numbers, never a link or a gray button. */
  onGo?: (() => void) | undefined;
};

/**
 * The numbered steps at the top of a tool (design system: Trail). A finished step has a check in its circle and goes
 * back with one click, the step on screen is marked, and the next ones are only a number. One look for the three
 * tools; the CSS is in globals.css (.trail).
 */
export function Trail({
  steps,
  label,
  className,
}: {
  steps: TrailStep[];
  label: string;
  className?: string;
}) {
  return (
    <ol
      className={[
        "trail",
        // Four steps with long names need more room than three: the stacked layout starts at a wider screen.
        steps.length > 3 && "trail-many",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      style={{ "--trail-count": steps.length } as CSSProperties}
    >
      {steps.map((step, index) => {
        const content = (
          <>
            <span className="trail-mark" aria-hidden="true">
              {step.state === "done" ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
            <span className="trail-label">
              <span className="visually-hidden">Passo {index + 1}: </span>
              {step.label}
              {step.state === "done" && (
                <span className="visually-hidden"> (concluído)</span>
              )}
            </span>
          </>
        );
        return (
          <li
            key={step.id}
            className="trail-step"
            data-state={step.state}
            aria-current={step.state === "current" ? "step" : undefined}
          >
            {step.state === "done" && step.onGo ? (
              <button type="button" className="trail-item" onClick={step.onGo}>
                {content}
              </button>
            ) : (
              <span className="trail-item">{content}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
