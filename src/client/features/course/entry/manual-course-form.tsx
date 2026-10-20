"use client";
import { useId, useRef, useState } from "react";
import { Plus, TriangleAlert } from "lucide-react";
import { createProject } from "../../../project.ts";
import { withDraft } from "../../../provenance.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

type Props = Pick<
  CourseBuilderModel,
  | "name"
  | "firstSection"
  | "setError"
  | "openProject"
  | "setName"
  | "setFirstSection"
>;

/** Criar manualmente: só o nome e a primeira unidade. O curso começa por tópicos; no Caderno dá para trocar. */
export function ManualCourseForm({
  name,
  firstSection,
  setError,
  openProject,
  setName,
  setFirstSection,
}: Props) {
  const nameId = useId();
  const nameErrorId = useId();
  const sectionId = useId();
  const sectionErrorId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLInputElement>(null);
  const [tried, setTried] = useState(false);
  const nameMissing = tried && !name.trim();
  const sectionMissing = tried && !firstSection.trim();
  return (
    <form
      className="entry-manual"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        if (!name.trim() || !firstSection.trim()) {
          // O aviso fica junto do campo vazio, e o foco vai para ele.
          setTried(true);
          (!name.trim() ? nameRef : sectionRef).current?.focus();
          return;
        }
        // createProject já começa por tópicos (metadata.organization e o perfil de importação).
        const next = createProject(name.trim(), firstSection.trim());
        openProject(
          withDraft(next, next.draft, "user", undefined, [
            "metadata.fullName",
            "metadata.organization",
            "sections[0].title",
          ]),
        );
      }}
    >
      <div className="entry-manual-card">
        <div className="entry-field">
          <label className="entry-label" htmlFor={nameId}>
            Nome da disciplina
          </label>
          <input
            id={nameId}
            ref={nameRef}
            className="entry-input"
            value={name}
            maxLength={200}
            autoComplete="off"
            aria-required="true"
            aria-invalid={nameMissing ? true : undefined}
            aria-describedby={nameMissing ? nameErrorId : undefined}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Matemática básica"
          />
          {nameMissing && (
            <p className="entry-error" id={nameErrorId} role="alert">
              <TriangleAlert size={16} aria-hidden="true" />
              Escreva o nome da disciplina.
            </p>
          )}
        </div>
        <div className="entry-field">
          <label className="entry-label" htmlFor={sectionId}>
            Primeira unidade
          </label>
          <input
            id={sectionId}
            ref={sectionRef}
            className="entry-input"
            value={firstSection}
            maxLength={200}
            autoComplete="off"
            aria-required="true"
            aria-invalid={sectionMissing ? true : undefined}
            aria-describedby={sectionMissing ? sectionErrorId : undefined}
            onChange={(event) => setFirstSection(event.target.value)}
          />
          {sectionMissing && (
            <p className="entry-error" id={sectionErrorId} role="alert">
              <TriangleAlert size={16} aria-hidden="true" />
              Escreva o nome da unidade.
            </p>
          )}
        </div>
        <button type="submit" className="primary entry-send">
          <Plus size={20} aria-hidden="true" />
          Criar disciplina
        </button>
      </div>
    </form>
  );
}
