import { z } from "zod";
import { courseDraftSchema } from "../../../domain/course/schema.ts";
import type { CourseProject } from "../../project.ts";

export function coursePrompt(profile: string, project: CourseProject | null): string {
  return `Transforme o planejamento fornecido em CourseDraft schemaVersion 1, sem inventar conteúdo ausente. Perfil: ${profile}; preset: ${project?.profiles.pedagogy ?? "personalizado"}. Preserve todas as atividades, questões e ocorrências de imagem. Use IDs estáveis globalmente únicos, nunca caminhos físicos ou credenciais. Retorne somente JSON. Tipo não suportado deve ser indicado para revisão, nunca convertido silenciosamente. Datas ISO8601 com fuso. Questão multiple-choice: exatamente uma alternativa fraction1 e demais0. Gradebook opcional: categorias somam100 e referenciam somente tarefa/quiz.\n\nContrato de estrutura:\n${JSON.stringify(z.toJSONSchema(courseDraftSchema, { unrepresentable: "any" }), null, 2)}\n\nForneça sua fonte junto deste prompt. Importe o resultado em Importar JSON e confira o curso.`;
}
