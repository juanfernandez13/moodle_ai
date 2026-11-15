// O esquema do prompt é enviado a cada chamada de IA (e cobrado por token). Padrão: por extenso (o que foi medido como
// confiável no Gemini 3.5 Flash). AI_COMPACT_SCHEMA=1: o mesmo schema com $defs/$ref, com um quarto do tamanho.
import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { z } from "zod";
import { courseDraftSchema } from "../../src/domain/course/schema.ts";
import { buildImportPrompt } from "../../src/server/import/index.ts";
import { promptVersionFor } from "../../src/server/import/providers.ts";

type Json = Record<string, unknown>;
const INTRO = "Schema de CourseDraft:";
const INTRO_COMPACT = "Schema de CourseDraft (JSON Schema; cada $ref aponta para uma definição em $defs):";

function withCompact(context: TestContext, on: boolean): void {
  const previous = process.env.AI_COMPACT_SCHEMA;
  context.after(() => {
    if (previous === undefined) delete process.env.AI_COMPACT_SCHEMA;
    else process.env.AI_COMPACT_SCHEMA = previous;
  });
  if (on) process.env.AI_COMPACT_SCHEMA = "1";
  else delete process.env.AI_COMPACT_SCHEMA;
}
/** O JSON do esquema que está no fim do prompt. */
function embedded(prompt: string, intro: string): Json {
  const at = prompt.indexOf(intro);
  assert.ok(at > 0, "o prompt apresenta o schema");
  return JSON.parse(prompt.slice(at + intro.length).trim()) as Json;
}
/** Desfaz os $ref: o mesmo schema, por extenso. */
function expand(root: Json): unknown {
  const defs = (root.$defs ?? {}) as Record<string, unknown>;
  const walk = (node: unknown, hops: number): unknown => {
    assert.ok(hops < 12, "definições circulares");
    if (Array.isArray(node)) return node.map((entry) => walk(entry, hops));
    if (typeof node !== "object" || node === null) return node;
    const entry = node as Json;
    if (typeof entry.$ref === "string") {
      const name = entry.$ref.replace("#/$defs/", "");
      assert.ok(name in defs, `$ref solto: ${entry.$ref}`);
      const rest = { ...entry };
      delete rest.$ref;
      return { ...(walk(defs[name], hops + 1) as Json), ...(walk(rest, hops) as Json) };
    }
    return Object.fromEntries(Object.entries(entry).map(([key, value]) => [key, walk(value, hops)]));
  };
  const body = { ...root };
  delete body.$defs;
  return walk(body, 0);
}
/** O contrato por extenso, sem o que o código decide (a marca de pacote de quizzes e a seção de destino). */
function fullContract(): Json {
  const schema = z.toJSONSchema(courseDraftSchema, { unrepresentable: "any" }) as Json;
  delete schema.$schema;
  const drop = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(drop);
    if (typeof node !== "object" || node === null) return;
    const entry = node as Json;
    const properties = (entry.properties ?? {}) as Json;
    delete properties.quizOnly;
    delete properties.targetNumber;
    Object.values(entry).forEach(drop);
  };
  drop(schema);
  return schema;
}
const withoutMeta = (schema: Json): Json => {
  const copy = { ...schema };
  delete copy.$schema;
  return copy;
};

for (const mode of ["course", "quizzes"] as const) {
  test(`${mode}: por padrão o schema vai por extenso, e é exatamente o contrato`, (context) => {
    withCompact(context, false);
    const prompt = buildImportPrompt("docx-topicos-v1", mode);
    assert.doesNotMatch(prompt, /\$defs|\$ref/);
    assert.deepEqual(withoutMeta(embedded(prompt, INTRO)), fullContract());
  });

  test(`${mode}: com AI_COMPACT_SCHEMA=1, o schema com os $ref desfeitos é exatamente o contrato`, (context) => {
    withCompact(context, true);
    const prompt = buildImportPrompt("docx-topicos-v1", mode);
    assert.deepEqual(expand(embedded(prompt, INTRO_COMPACT)), fullContract());
  });
}

test("o esquema compacto fica abaixo de um terço do tamanho por extenso, e não volta a crescer sem aviso", (context) => {
  withCompact(context, true);
  const spelledOut = JSON.stringify(fullContract()).length;
  for (const mode of ["course", "quizzes"] as const) {
    const prompt = buildImportPrompt("docx-topicos-v1", mode);
    // Hoje: ~12 mil caracteres de schema (eram ~49 mil por extenso) mais ~2 mil de instruções.
    assert.ok(prompt.length < 20_000, `${mode}: ${prompt.length} caracteres`);
    assert.ok(JSON.stringify(embedded(prompt, INTRO_COMPACT)).length < spelledOut / 3, mode);
  }
});

test("a marca de pacote e a seção de destino não chegam à IA, nem nas definições reaproveitadas", (context) => {
  for (const compact of [false, true]) {
    withCompact(context, compact);
    for (const mode of ["course", "quizzes"] as const)
      assert.doesNotMatch(buildImportPrompt("docx-topicos-v1", mode), /quizOnly|targetNumber/, `${mode} compacto=${compact}`);
  }
});

test("a versão do prompt é a do que foi enviado: muda com o esquema e fica registrada", (context) => {
  withCompact(context, false);
  assert.equal(promptVersionFor("course"), "moodle-import-v2");
  assert.equal(promptVersionFor("quizzes"), "moodle-quiz-import-v1");
  assert.match(buildImportPrompt("docx-topicos-v1"), /moodle-import-v2/);
  assert.match(buildImportPrompt("docx-topicos-v1", "quizzes"), /moodle-quiz-import-v1/);
  withCompact(context, true);
  assert.equal(promptVersionFor("course"), "moodle-import-v3");
  assert.equal(promptVersionFor("quizzes"), "moodle-quiz-import-v2");
  assert.match(buildImportPrompt("docx-topicos-v1"), /moodle-import-v3/);
  assert.match(buildImportPrompt("docx-topicos-v1", "quizzes"), /moodle-quiz-import-v2/);
});
