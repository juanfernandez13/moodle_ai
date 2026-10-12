import { z } from "zod";
import { moodleCourseSchema, moodleStatusSchema } from "../types.ts";
import type { MoodleCourse, MoodleStatus } from "../types.ts";

export function issuesMessage(value: unknown, fallback: string): string {
  const parsed = z
    .object({ issues: z.array(z.object({ message: z.string() })) })
    .safeParse(value);
  return parsed.success
    ? parsed.data.issues.map((issue) => issue.message).join("\n") || fallback
    : fallback;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error(
      "A conexão Moodle recebeu uma resposta inválida. Tente novamente.",
    );
  }
}

export async function moodlePost(
  path: string,
  body: unknown,
): Promise<unknown> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const value = await readJson(response);
  const envelope = z.object({ ok: z.boolean() }).safeParse(value);
  if (!response.ok || !envelope.success || !envelope.data.ok)
    throw new Error(
      issuesMessage(
        value,
        "A operação não foi concluída. Confira o estado antes de repetir.",
      ),
    );
  return value;
}

export async function readMoodleStatus(): Promise<MoodleStatus> {
  const response = await fetch("/api/moodle/status", { cache: "no-store" });
  const value = await readJson(response);
  const status = moodleStatusSchema.safeParse(value);
  if (!response.ok || !status.success)
    throw new Error(
      "A integração Moodle ainda não está disponível nesta instalação.",
    );
  return status.data;
}

export async function readMoodleCourses(): Promise<MoodleCourse[]> {
  const response = await fetch("/api/moodle/courses", { cache: "no-store" });
  const value = await readJson(response);
  const courses = z
    .object({ ok: z.literal(true), courses: z.array(moodleCourseSchema) })
    .safeParse(value);
  if (!response.ok || !courses.success)
    throw new Error(issuesMessage(value, "Não foi possível ler os cursos."));
  return courses.data.courses;
}
