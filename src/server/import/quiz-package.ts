import { hasField } from "./providers.ts";
import { titleFromFileName } from "../../shared/quiz-targets.ts";
import {
  ImportError,
  type ExtractedDocument,
  type ImportProvenance,
} from "./types.ts";

/**
 * Importar só quizzes: cada arquivo é um quiz e vai para uma seção do curso que já existe.
 * A IA transcreve as questões; o código decide para onde cada quiz vai e como ele se chama.
 */

// A regra do destino é compartilhada com a tela (src/shared/quiz-targets.ts).
export {
  assignTargets,
  quizNumberOf,
  titleFromFileName,
} from "../../shared/quiz-targets.ts";

type Json = Record<string, unknown>;
const object = (value: unknown): Json =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Json)
    : {};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const shapeError = () =>
  new ImportError(
    "quiz_package_shape",
    "A IA não separou um quiz por arquivo. Tente de novo ou envie menos arquivos de cada vez.",
  );

/**
 * Dá ao rascunho da IA a forma do pacote de quizzes. `documents` e `targets` chegam na mesma ordem das seções que a
 * IA devolveu: uma seção por documento, com um quiz dentro.
 */
export function shapeQuizPackage(
  candidate: unknown,
  fields: ImportProvenance["fields"],
  documents: readonly ExtractedDocument[],
  targets: readonly number[],
): { candidate: unknown; fields: ImportProvenance["fields"] } {
  const source = object(candidate);
  const sections = list(source.sections).map(object);
  const oneQuiz = (section: Json) => {
    const activities = list(section.activities);
    return activities.length === 1 && object(activities[0]).type === "quiz";
  };
  if (sections.length !== documents.length || !sections.every(oneQuiz))
    throw shapeError();

  const grouped: { id: unknown; target: number; activities: Json[] }[] = [];
  // Para cada seção da IA: onde o quiz dela foi parar depois de juntar as seções de mesmo destino.
  const moved: { section: number; offset: number }[] = [];
  sections.forEach((section, index) => {
    const target = targets[index]!;
    const quiz = object(list(section.activities)[0]);
    const named = {
      ...quiz,
      title: titleFromFileName(documents[index]!.name) || `Quiz ${target}`,
    };
    let position = grouped.findIndex((group) => group.target === target);
    if (position < 0) {
      grouped.push({ id: section.id, target, activities: [] });
      position = grouped.length - 1;
    }
    const group = grouped[position]!;
    moved.push({ section: position, offset: group.activities.length });
    group.activities.push(named);
  });

  const shaped = {
    schemaVersion: source.schemaVersion,
    id: source.id,
    revision: source.revision,
    // Dados do curso não existem aqui: o quiz entra num curso que já tem os dele.
    metadata: {
      fullName: "Questionários",
      shortName: "QUIZZES",
      summary: "",
      organization: "topics",
      quizOnly: true,
    },
    sections: grouped.map((group) => ({
      id: group.id,
      title: group.target === 0 ? "Seção geral" : `Seção ${group.target}`,
      summary: "",
      targetNumber: group.target,
      activities: group.activities,
    })),
    attachments: source.attachments,
  };

  const kept = fields.flatMap((field) => {
    const section = /^sections\[(\d+)\](.*)$/.exec(field.path);
    // Dados do curso e notas foram refeitos ou saíram do pacote: a origem deles também.
    if (!section) {
      return /^(metadata|gradebook)(\.|\[|$)/.test(field.path) ? [] : [field];
    }
    const place = moved[Number(section[1])];
    const activity = /^\.activities\[0\](.*)$/.exec(section[2]!);
    // Título e resumo da seção, e o título do quiz, são refeitos pelo código.
    if (!place || !activity || activity[1] === ".title") return [];
    return [
      {
        ...field,
        path: `sections[${place.section}].activities[${place.offset}]${activity[1]}`,
      },
    ];
  });
  return {
    candidate: shaped,
    fields: kept.filter((field) => hasField(shaped, field.path)),
  };
}
