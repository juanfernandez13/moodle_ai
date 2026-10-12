"use client";
import { Plus } from "lucide-react";
import { createProject } from "../../../project.ts";
import { withDraft } from "../../../provenance.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

type Props = Pick<
  CourseBuilderModel,
  "name" | "firstSection" | "setError" | "openProject" | "setName" | "setFirstSection"
>;

export function ManualCourseForm({
  name,
  firstSection,
  setError,
  openProject,
  setName,
  setFirstSection
}: Props) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim() || !firstSection.trim()) {
          setError(
            "Preencha o nome do curso e o título da primeira unidade.",
          );
          return;
        }
        const next = createProject(name, firstSection);
        openProject(
          withDraft(next, next.draft, "user", undefined, [
            "metadata.fullName",
            "sections[0].title",
          ]),
        );
      }}
    >
      <label className="field">
        <span>Nome do curso</span>
        <input
          value={name}
          maxLength={200}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Introdução à programação"
        />
      </label>
      <label className="field">
        <span>Primeira unidade</span>
        <input
          value={firstSection}
          maxLength={200}
          onChange={(event) => setFirstSection(event.target.value)}
        />
      </label>
      <button type="submit" className="primary entry-primary">
        <Plus size={18} />
        Criar curso
      </button>
    </form>
  );
}
