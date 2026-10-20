"use client";
import {
  ArrowRight,
  GraduationCap,
  Info,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import type { DatePlan } from "../../../../domain/dates/index.ts";
import { plural } from "../helpers.ts";
import { DateBackLink } from "./DateBackLink.tsx";
import { DatePreviewTable } from "./DatePreviewTable.tsx";

/** Step 4: the before and after, the sentence that nothing changed yet, and the one button that changes Moodle. */
export function DateReviewStep({
  plan,
  courseTitle,
  demo,
  busy,
  onApply,
  onBack,
  onUseMoodle,
}: {
  plan: DatePlan;
  courseTitle: string;
  demo: boolean;
  busy: boolean;
  onApply(): void;
  onBack(): void;
  onUseMoodle(): void;
}) {
  return (
    <>
      <div className="dw-body dw-body-table">
        <h2 className="visually-hidden">Conferir</h2>
        {courseTitle && (
          <p className="dw-course-line">
            <GraduationCap size={24} aria-hidden="true" />
            <span>{courseTitle}</span>
          </p>
        )}
        <DatePreviewTable plan={plan} />
        <p className="dw-note">
          <Info size={22} aria-hidden="true" />
          {demo ? "É só um teste. Nada vai para o Moodle." : "Nada mudou ainda no Moodle."}
        </p>
      </div>
      <div className="dw-actions">
        {demo ? (
          <button type="button" className="primary dw-primary" onClick={onUseMoodle}>
            Usar no Moodle
            <ArrowRight size={22} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="primary dw-primary dw-apply"
            disabled={busy}
            onClick={onApply}
          >
            {busy ? (
              <LoaderCircle className="spinner" size={22} aria-hidden="true" />
            ) : (
              <ShieldCheck size={22} aria-hidden="true" />
            )}
            Aplicar {plural(plan.changes.length, "mudança", "mudanças")}
          </button>
        )}
        <DateBackLink onClick={onBack} />
        {!demo && <p className="dw-help">Não dá para desfazer.</p>}
      </div>
    </>
  );
}
