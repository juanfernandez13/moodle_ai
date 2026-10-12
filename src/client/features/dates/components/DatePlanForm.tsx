import { CalendarDays, Eye } from "lucide-react";
import type { DatePlanInput } from "../../../../domain/dates/index.ts";
interface Props {
  active: boolean;
  input: DatePlanInput;
  targetsText: string;
  onChange(field: keyof DatePlanInput, value: string | number): void;
  onTargetsChange(value: string): void;
  onSimulate(): Promise<void>;
}

export function DatePlanForm({
  active,
  input,
  targetsText,
  onChange,
  onTargetsChange,
  onSimulate
}: Props) {
  return (
    <section hidden={!active}>
      <div className="field-grid">
        <label className="field">
          <span>Início do cronograma</span>
          <input
            type="date"
            value={input.startDate}
            min="1900-01-01"
            max="2100-12-31"
            onChange={(event) => onChange("startDate", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Quantidade de unidades</span>
          <input
            type="number"
            min="1"
            max="200"
            value={input.unitCount}
            onChange={(event) =>
              onChange("unitCount", Number(event.target.value))
            }
          />
        </label>
        <label className="field">
          <span>Dias por unidade</span>
          <input
            type="number"
            min="1"
            max="365"
            value={input.daysPerUnit}
            onChange={(event) =>
              onChange("daysPerUnit", Number(event.target.value))
            }
          />
        </label>
        <label className="field">
          <span>Fuso horário</span>
          <select
            value={input.timezoneOffsetMinutes}
            onChange={(event) =>
              onChange("timezoneOffsetMinutes", Number(event.target.value))
            }
          >
            <option value={-180}>UTC−3 (Fortaleza/Brasília)</option>
            <option value={-240}>UTC−4</option>
            <option value={0}>UTC</option>
            <option value={60}>UTC+1</option>
          </select>
        </label>
        <label className="field">
          <span>Horário de abertura</span>
          <input
            type="time"
            value={input.opensAtTime}
            onChange={(event) => onChange("opensAtTime", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Horário de fechamento no último dia</span>
          <input
            type="time"
            value={input.closesAtTime}
            onChange={(event) => onChange("closesAtTime", event.target.value)}
          />
        </label>
      </div>
      <details className="form-details">
        <summary>Usar alvos de um curso existente</summary>
        <p className="field-help">
          Cole uma lista JSON de alvos: id, kind
          (section/assignment/quiz/forum), sectionIndex a partir de zero,
          title, opensAt/closesAt e availability opcionais. As demais
          condições de acesso são preservadas.
        </p>
        <label className="field">
          <span>Alvos JSON (opcional)</span>
          <textarea
            className="json-input"
            value={targetsText}
            onChange={(event) => onTargetsChange(event.target.value)}
            placeholder={
              '[{"id":"tarefa-1","kind":"assignment","sectionIndex":0,"title":"Tarefa 1"}]'
            }
          />
        </label>
      </details>
      <div className="notice">
        <CalendarDays size={19} /> Sem alvos próprios, o plano usa unidades,
        tarefas e quizzes fictícios. Unidades recebem somente abertura;
        atividades também recebem fechamento.
      </div>
      <button
        type="button"
        className="primary"
        onClick={() => {
          void onSimulate();
        }}
      >
        <Eye size={18} />
        Simular cronograma
      </button>
    </section>
  );
}
