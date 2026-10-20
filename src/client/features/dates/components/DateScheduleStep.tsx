"use client";
import { useId, useState } from "react";
import { Clock, Eye, LoaderCircle } from "lucide-react";
import type { DatePlanInput } from "../../../../domain/dates/index.ts";
import { longDate, scheduleProblem } from "../helpers.ts";
import { DateBackLink } from "./DateBackLink.tsx";
import { NumberStepper } from "./NumberStepper.tsx";

/** Step 3: two questions in big type. Times and the test mode's unit count are the only extras. */
export function DateScheduleStep({
  input,
  demo,
  demoUnits,
  busy,
  locked,
  onChange,
  onDemoUnits,
  onBack,
  onNext,
}: {
  input: DatePlanInput;
  demo: boolean;
  demoUnits: number;
  busy: boolean;
  locked: boolean;
  onChange(field: keyof DatePlanInput, value: string | number): void;
  onDemoUnits(value: number): void;
  onBack(): void;
  onNext(): void;
}) {
  const id = useId();
  const [timesOpen, setTimesOpen] = useState(false);
  const problem = scheduleProblem(input);
  const working = busy && !demo;
  const caption = longDate(input.startDate);
  return (
    <>
      <div className="dw-body">
        <h2 className="visually-hidden">Novas datas</h2>
        <div className="dw-questions">
          {demo && (
            <div className="dw-question" role="group" aria-labelledby={`${id}-units`}>
              <h3 id={`${id}-units`} className="dw-prompt">
                Quantas unidades?
              </h3>
              <NumberStepper
                labelledBy={`${id}-units`}
                value={demoUnits}
                min={1}
                max={200}
                unit={["unidade", "unidades"]}
                lessLabel="Menos uma unidade"
                moreLabel="Mais uma unidade"
                onChange={onDemoUnits}
              />
            </div>
          )}
          <div className="dw-question" role="group" aria-labelledby={`${id}-start`}>
            <h3 id={`${id}-start`} className="dw-prompt">
              Quando o curso começa?
            </h3>
            <input
              className="dw-input dw-date"
              type="date"
              lang="pt-BR"
              min="1900-01-01"
              max="2100-12-31"
              required
              aria-labelledby={`${id}-start`}
              aria-describedby={`${id}-caption`}
              value={input.startDate}
              onChange={(event) => onChange("startDate", event.target.value)}
            />
            <p
              id={`${id}-caption`}
              className={caption ? "dw-caption" : "dw-caption dw-caption-error"}
              aria-live="polite"
            >
              {caption || "Escolha o dia."}
            </p>
          </div>
          <div className="dw-question" role="group" aria-labelledby={`${id}-days`}>
            <h3 id={`${id}-days`} className="dw-prompt">
              Cada unidade dura quantos dias?
            </h3>
            <NumberStepper
              labelledBy={`${id}-days`}
              value={input.daysPerUnit}
              min={1}
              max={365}
              unit={["dia", "dias"]}
              lessLabel="Menos um dia"
              moreLabel="Mais um dia"
              onChange={(value) => onChange("daysPerUnit", value)}
            />
          </div>
        </div>
        <div className="dw-times">
          <p className="dw-times-line">
            <Clock size={22} aria-hidden="true" />
            <span>
              Abre às <strong>{input.opensAtTime || "--:--"}</strong> · Fecha às{" "}
              <strong>{input.closesAtTime || "--:--"}</strong>
            </span>
            <span className="dw-zone">Horário de Brasília</span>
          </p>
          <button
            type="button"
            className="dw-link"
            aria-expanded={timesOpen}
            aria-controls={`${id}-times`}
            onClick={() => setTimesOpen(!timesOpen)}
          >
            {timesOpen ? "Pronto" : "Mudar horários"}
          </button>
          {timesOpen && (
            <div id={`${id}-times`} className="dw-times-fields">
              <div className="dw-field">
                <label htmlFor={`${id}-opens`}>Abre às</label>
                <input
                  id={`${id}-opens`}
                  className="dw-input"
                  type="time"
                  required
                  value={input.opensAtTime}
                  onChange={(event) => onChange("opensAtTime", event.target.value)}
                />
              </div>
              <div className="dw-field">
                <label htmlFor={`${id}-closes`}>Fecha às</label>
                <input
                  id={`${id}-closes`}
                  className="dw-input"
                  type="time"
                  required
                  value={input.closesAtTime}
                  onChange={(event) => onChange("closesAtTime", event.target.value)}
                />
              </div>
            </div>
          )}
        </div>
        {problem && caption && (
          <p className="dw-problem" role="status">
            {problem}
          </p>
        )}
      </div>
      <div className="dw-actions">
        <button
          type="button"
          className="primary dw-primary"
          disabled={Boolean(problem) || working || (locked && !demo)}
          onClick={onNext}
        >
          {working ? (
            <LoaderCircle className="spinner" size={22} aria-hidden="true" />
          ) : (
            <Eye size={22} aria-hidden="true" />
          )}
          {working ? "Preparando…" : "Ver como fica"}
        </button>
        {!demo && <DateBackLink onClick={onBack} />}
      </div>
    </>
  );
}
