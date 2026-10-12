import { MoodleConnection } from "../../../components/moodle-connection.tsx";
import type { DatePlanner } from "../use-date-planner.ts";
interface Props {
  active: boolean;
  moodle: DatePlanner["moodle"];
  courseId: number;
  busy: boolean;
  unknownResult: boolean;
  onSelectCourse(value: number): void;
  onReadTargets(): Promise<void>;
  onPreview(): Promise<void>;
}

export function DateConnectionPanel({
  active,
  moodle,
  courseId,
  busy,
  unknownResult,
  onSelectCourse,
  onReadTargets,
  onPreview
}: Props) {
  return (
    <section hidden={!active}>
      <MoodleConnection moodle={moodle} />
      {moodle.courses.length > 0 && (
        <>
          <label className="field">
            <span>Curso no Moodle</span>
            <select
              value={courseId || ""}
              onChange={(event) => onSelectCourse(Number(event.target.value))}
            >
              <option value="">Escolha um curso</option>
              {moodle.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="secondary"
            disabled={busy || !courseId}
            onClick={() => {
              void onReadTargets();
            }}
          >
            Ler datas atuais do curso
          </button>
        </>
      )}
      <div className="tool-warning">
        A prévia lê os formulários atuais do curso. Aplicar exige confirmar
        o antes e depois; nenhuma mudança é enviada ao abrir esta página.
      </div>
      <button
        type="button"
        className="secondary"
        disabled={
          busy ||
          unknownResult ||
          !courseId ||
          !moodle.status?.authenticated ||
          !moodle.status.available
        }
        onClick={() => {
          void onPreview();
        }}
      >
        Conferir mudanças no Moodle
      </button>
    </section>
  );
}
