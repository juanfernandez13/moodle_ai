"use client";
import { useId, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import type { MoodleCourse } from "../../../components/moodle-connection.tsx";
import { plural } from "../helpers.ts";
import type { CourseSummary } from "../types.ts";
import { DateBackLink } from "./DateBackLink.tsx";

const plain = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Step 2: the courses as big cards; choosing one reads its current dates and says what it found. */
export function DateCourseStep({
  courses,
  loading,
  loaded,
  courseId,
  reading,
  summary,
  onPick,
  onReload,
  onBack,
  onContinue,
}: {
  courses: MoodleCourse[];
  loading: boolean;
  loaded: boolean;
  courseId: number;
  reading: boolean;
  summary: CourseSummary | null;
  onPick(id: number): void;
  onReload(): void;
  onBack(): void;
  onContinue(): void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const words = plain(query.trim());
  const shown = words
    ? courses.filter((course) =>
        plain(`${course.title} ${course.shortName ?? ""}`).includes(words),
      )
    : courses;
  const failed = courseId > 0 && !reading && !summary;
  return (
    <>
      <div className="dw-body dw-body-list">
        <h2 className="visually-hidden">Escolher o curso</h2>
        <div
          className="dw-choice"
          role="group"
          aria-labelledby={`${id}-prompt`}
          aria-describedby={`${id}-status`}
        >
          <h3 id={`${id}-prompt`} className="dw-prompt">
            Qual curso?
          </h3>
          {courses.length > 8 && (
            <div className="dw-field dw-search">
              <label htmlFor={`${id}-search`}>Buscar curso</label>
              <div className="dw-search-box">
                <Search size={20} aria-hidden="true" />
                <input
                  id={`${id}-search`}
                  className="dw-input"
                  type="search"
                  autoComplete="off"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>
          )}
          {loading ? (
            <p className="dw-wait" role="status">
              <LoaderCircle className="spinner" size={24} aria-hidden="true" />
              Procurando seus cursos…
            </p>
          ) : courses.length === 0 && loaded ? (
            <p className="dw-empty">Nenhum curso encontrado.</p>
          ) : shown.length === 0 && courses.length > 0 ? (
            <p className="dw-empty">Nenhum curso com esse nome.</p>
          ) : (
            <div className="dw-courses">
              {shown.map((course) => {
                const selected = course.id === courseId;
                return (
                  <button
                    key={course.id}
                    type="button"
                    className="dw-course"
                    aria-pressed={selected}
                    aria-disabled={reading || undefined}
                    onClick={() => onPick(course.id)}
                  >
                    <span className="dw-mark" aria-hidden="true">
                      {selected && <Check size={18} strokeWidth={3.4} />}
                    </span>
                    <span className="dw-course-text">
                      <span className="dw-course-title">{course.title}</span>
                      {course.shortName && course.shortName !== course.title && (
                        <small>{course.shortName}</small>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="dw-list-foot">
          <p id={`${id}-status`} className="dw-status" aria-live="polite">
            {reading ? (
              <>
                <LoaderCircle className="spinner" size={22} aria-hidden="true" />
                Lendo as datas…
              </>
            ) : summary ? (
              <>
                <CircleCheck size={22} aria-hidden="true" />
                {plural(summary.units, "unidade", "unidades")} ·{" "}
                {plural(summary.activities, "atividade", "atividades")}
              </>
            ) : failed ? (
              <>
                <CircleAlert size={22} aria-hidden="true" />
                Não foi possível ler.
                <button
                  type="button"
                  className="dw-link"
                  onClick={() => onPick(courseId)}
                >
                  Tentar de novo
                </button>
              </>
            ) : null}
          </p>
          <button
            type="button"
            className="dw-link"
            disabled={loading}
            onClick={onReload}
          >
            <RefreshCw size={18} aria-hidden="true" />
            Atualizar lista
          </button>
        </div>
      </div>
      <div className="dw-actions">
        <button
          type="button"
          className="primary dw-primary"
          disabled={!summary || reading}
          onClick={onContinue}
        >
          Continuar
          <ArrowRight size={22} aria-hidden="true" />
        </button>
        <DateBackLink onClick={onBack} />
      </div>
    </>
  );
}
