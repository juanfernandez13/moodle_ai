import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { interpretText } from "../../src/server/import/index.ts";

const fixture = (name: string) =>
  readFile(new URL(`../fixtures/import/${name}`, import.meta.url), "utf8");

test("perfil por tópicos conserva metadados, duas seções e atividades explícitas", async () => {
  const result = await interpretText({
    text: await fixture("topics.txt"),
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.draft.metadata.fullName, "Introdução ao estudo digital");
  assert.equal(result.draft.metadata.shortName, "EST-01");
  assert.equal(result.draft.metadata.organization, "topics");
  assert.deepEqual(
    result.draft.sections.map((section) => section.title),
    ["Preparação", "Revisão"],
  );
  assert.deepEqual(
    result.draft.sections[0]?.activities.map((activity) => activity.type),
    ["forum", "assignment"],
  );
  assert.equal(result.draft.gradebook, undefined);
  assert.equal(result.provenance.provider, "offline");
  assert.equal(result.sources.length, 1);
});

test("perfil semanal conserva organização e texto de uma estrutura diferente", async () => {
  const result = await interpretText({
    text: await fixture("weeks.txt"),
    profile: "docx-semanal-v1",
    provider: "offline",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.draft.metadata.organization, "weeks");
  assert.deepEqual(
    result.draft.sections.map((section) => section.title),
    ["Primeira leitura", "Reescrita"],
  );
  assert.equal(
    result.draft.sections[1]?.activities[0]?.description,
    "Reescreva seu primeiro texto.",
  );
});

test("documento sem perfil reconhecível não vira exemplo e conserva prévia", async () => {
  const result = await interpretText({
    text: "Este documento não contém um planejamento suportado.",
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((issue) => issue.code === "profile_not_recognized"),
  );
  assert.equal(result.preview?.[0]?.blocks[0]?.kind, "text");
});

test("provider sem chave tem diagnóstico útil e não usa fallback offline", async () => {
  const result = await interpretText(
    {
      text: await fixture("topics.txt"),
      profile: "docx-topicos-v1",
      provider: "openai",
    },
    { apiKey: "" },
  );
  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((issue) => issue.code === "provider_unconfigured"),
  );
});

test("configuração obrigatória ausente não recebe nota inventada", async () => {
  const result = await interpretText({
    text: (await fixture("topics.txt")).replace("Nota: 10\n", ""),
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path.includes("maxGrade")));
});

test("perfil divergente e entradas desconhecidas são rejeitados", async () => {
  const wrong = await interpretText({
    text: await fixture("weeks.txt"),
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(wrong.ok, false);
  assert.ok(
    wrong.issues.some((issue) => issue.code === "profile_not_recognized"),
  );
  const input = await interpretText({
    text: await fixture("topics.txt"),
    profile: "docx-topicos-v1",
    provider: "offline",
    filePath: "SECRET",
  });
  assert.equal(input.ok, false);
  assert.ok(input.issues.some((issue) => issue.code === "unknown_field"));
  assert.equal(JSON.stringify(input).includes("SECRET"), false);
});

test("metadados conflitantes não sobrescrevem silenciosamente a primeira origem", async () => {
  const result = await interpretText({
    text: `${await fixture("topics.txt")}\nDisciplina: Outro curso`,
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some(
      (issue) =>
        issue.code === "ambiguous_field" && issue.path === "metadata.fullName",
    ),
  );
});

test("feedback das alternativas vincula o rótulo e a continuação à alternativa correta", async () => {
  const text = [
    "Disciplina: Revisão fictícia",
    "Código: REV-01",
    "Tópico 1: Questões",
    "Quiz: Leitura",
    "Nota: 10",
    "Tentativas: 2",
    "Embaralhar: false",
    "Questão MC: Qual resposta está correta?",
    "Alternativa correta: Resposta A",
    "Feedback: Primeiro comentário.",
    "Continuação do primeiro comentário.",
    "Alternativa: Resposta B",
    "Feedback: Segundo comentário.",
    "Continuação do segundo comentário.",
  ].join("\n");
  const result = await interpretText({
    text,
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  if (!result.ok) return;
  const origin = (path: string, line: string) => {
    const preview = result.preview[0]!;
    const block = preview.blocks.find(
      (block) => block.kind === "text" && block.text === line,
    );
    assert.ok(block, `Bloco da fonte: ${line}`);
    assert.ok(
      result.provenance.fields.some(
        (field) =>
          field.path === path &&
          field.sourceId === preview.sourceId &&
          field.blockId === block.id,
      ),
      `Origem do campo: ${path}`,
    );
  };
  const path = "sections[0].activities[0].questions[0]";
  origin(`${path}.options[0].feedback`, "Feedback: Primeiro comentário.");
  origin(`${path}.options[0].feedback`, "Continuação do primeiro comentário.");
  origin(`${path}.options[1].feedback`, "Feedback: Segundo comentário.");
  origin(`${path}.options[1].feedback`, "Continuação do segundo comentário.");
  assert.equal(
    result.provenance.fields.some((field) => field.path === `${path}.feedback`),
    false,
  );
});

test("datas, pontuação, pares, configurações discursivas e conceitos têm origem real", async () => {
  const text = [
    "Disciplina: Planejamento fictício",
    "Código: PLN-01",
    "Tópico 1: Revisão",
    "Quiz: Conhecimentos",
    "Nota: 10",
    "Tentativas: 1",
    "Embaralhar: false",
    "Abre: 2026-10-12T00:00:00Z",
    "Fecha: 2026-10-19T00:00:00Z",
    "Questão associativa: Relacione os termos.",
    "Pontuação: 2",
    "Par: Primeiro termo => Primeira resposta",
    "Par: Segundo termo => Segunda resposta",
    "Feedback: Confira as relações.",
    "Questão discursiva: Explique sua escolha.",
    "Formato da resposta: editor",
    "Resposta obrigatória: true",
    "Linhas: 10",
    "Anexos permitidos: 0",
    "Glossário: Conceitos",
    "Duplicatas: false",
    "Aprovação: true",
    "Entradas por página: 10",
    "Conceito: Aprendizagem",
    "Definição: Uma definição fictícia.",
  ].join("\n");
  const result = await interpretText({
    text,
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  if (!result.ok) return;
  const expected = [
    [
      "sections[0].activities[0].schedule.opensAt",
      "Abre: 2026-10-12T00:00:00Z",
    ],
    [
      "sections[0].activities[0].schedule.closesAt",
      "Fecha: 2026-10-19T00:00:00Z",
    ],
    ["sections[0].activities[0].questions[0].maxMark", "Pontuação: 2"],
    [
      "sections[0].activities[0].questions[0].pairs[0].statement",
      "Par: Primeiro termo => Primeira resposta",
    ],
    [
      "sections[0].activities[0].questions[0].pairs[0].answer",
      "Par: Primeiro termo => Primeira resposta",
    ],
    [
      "sections[0].activities[0].questions[0].feedback",
      "Feedback: Confira as relações.",
    ],
    [
      "sections[0].activities[0].questions[1].settings.responseFormat",
      "Formato da resposta: editor",
    ],
    [
      "sections[0].activities[0].questions[1].settings.responseRequired",
      "Resposta obrigatória: true",
    ],
    [
      "sections[0].activities[0].questions[1].settings.responseLines",
      "Linhas: 10",
    ],
    [
      "sections[0].activities[0].questions[1].settings.attachments",
      "Anexos permitidos: 0",
    ],
    ["sections[0].activities[1].entries[0].concept", "Conceito: Aprendizagem"],
    [
      "sections[0].activities[1].entries[0].definition",
      "Definição: Uma definição fictícia.",
    ],
  ];
  for (const [path, line] of expected) {
    const preview = result.preview[0]!;
    const block = preview.blocks.find(
      (block) => block.kind === "text" && block.text === line,
    );
    assert.ok(block);
    assert.ok(
      result.provenance.fields.some(
        (field) =>
          field.path === path &&
          field.sourceId === preview.sourceId &&
          field.blockId === block.id,
      ),
      `Origem do campo: ${path}`,
    );
  }
});

test("continuação de par associativo conserva o enunciado inicial no conteúdo ordenado", async () => {
  const text = [
    "Disciplina: Relações fictícias",
    "Código: REL-01",
    "Tópico 1: Termos",
    "Quiz: Associação",
    "Nota: 10",
    "Tentativas: 1",
    "Embaralhar: false",
    "Questão associativa: Relacione as definições.",
    "Par: Primeiro termo => Primeira definição",
    "Explicação adicional do primeiro termo.",
    "Par: Segundo termo => Segunda definição",
  ].join("\n");
  const result = await interpretText({
    text,
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  if (!result.ok) return;
  const quiz = result.draft.sections[0]?.activities[0];
  assert.equal(quiz?.type, "quiz");
  if (quiz?.type !== "quiz") return;
  const question = quiz.questions[0];
  assert.equal(question?.type, "matching");
  if (question?.type !== "matching") return;
  const pair = question.pairs[0];
  assert.equal(
    pair?.statement,
    "Primeiro termo\n\nExplicação adicional do primeiro termo.",
  );
  assert.deepEqual(
    pair?.statementBlocks?.map((block) =>
      block.kind === "text" ? block.text : block.kind,
    ),
    ["Primeiro termo", "Explicação adicional do primeiro termo."],
  );
});
