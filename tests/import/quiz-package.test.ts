// Importar só quizzes: cada arquivo vira um quiz, e o código (não a IA) decide a seção de destino.
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildImportPrompt,
  importDocuments,
  type ImportResult,
} from "../../src/server/import/index.ts";
import {
  assignTargets,
  quizNumberOf,
} from "../../src/server/import/quiz-package.ts";
import { chatReply, chatRequest } from "./ai-fake.ts";
import { validateDraft } from "../../src/domain/course/index.ts";

const encode = (text: string) => new TextEncoder().encode(text);
const file = (name: string, text: string) => ({
  id: `source-${name.replace(/\W/g, "")}`,
  name,
  mediaType: "text/plain",
  bytes: encode(text),
});

test("o número no nome do arquivo é a seção de destino: Quiz 3, quiz_3, Questionário 3", () => {
  assert.equal(quizNumberOf("Quiz 3.docx"), 3);
  assert.equal(quizNumberOf("quiz_3.docx"), 3);
  assert.equal(quizNumberOf("Questionário-12.pdf"), 12);
  assert.equal(quizNumberOf("Questionario 0.txt"), 0);
  assert.equal(quizNumberOf("Prova final.docx"), null);
  // Número que não cabe numa seção do contrato não vale como destino.
  assert.equal(quizNumberOf("Quiz 900.docx"), null);
  // O número solto do nome não é o do quiz: só o que vem depois de "quiz"/"questionário".
  assert.equal(quizNumberOf("4. Prova.docx"), null);
});

test("sem número, o arquivo ocupa a primeira seção livre, em ordem do nome", () => {
  const result = assignTargets([
    { name: "Quiz 2.docx" },
    { name: "Revisão B.docx" },
    { name: "Revisão A.docx" },
    { name: "Quiz 1.docx" },
  ]);
  assert.deepEqual(
    result.map((item) => [item.file.name, item.target]),
    [
      ["Quiz 1.docx", 1],
      ["Quiz 2.docx", 2],
      ["Revisão A.docx", 3],
      ["Revisão B.docx", 4],
    ],
  );
});

test("o número 10 vem depois do 2 (ordem numérica, não alfabética)", () => {
  const result = assignTargets([
    { name: "Quiz 10.docx" },
    { name: "Quiz 2.docx" },
  ]);
  assert.deepEqual(result.map((item) => item.target), [2, 10]);
});

test("dois arquivos com o mesmo número ficam os dois, na mesma seção de destino", () => {
  const result = assignTargets([
    { name: "Quiz 3 B.docx" },
    { name: "Quiz 3 A.docx" },
  ]);
  assert.deepEqual(
    result.map((item) => [item.file.name, item.target]),
    [
      ["Quiz 3 A.docx", 3],
      ["Quiz 3 B.docx", 3],
    ],
  );
});

const question = (id: string, statement: string) => ({
  id: `${id}-q`,
  type: "multiple-choice",
  statement,
  feedback: "",
  options: [
    { id: `${id}-a`, text: "Certa", fraction: 1, feedback: "" },
    { id: `${id}-b`, text: "Errada", fraction: 0, feedback: "" },
  ],
});
/** Uma seção por documento, na ordem recebida: é o que o prompt pede à IA. */
const aiSection = (id: string, statement: string) => ({
  id: `sec-${id}`,
  title: `Título da IA ${id}`,
  summary: "Resumo inventado",
  activities: [
    {
      id: `quiz-${id}`,
      type: "quiz",
      title: `Título da IA ${id}`,
      description: "",
      attachmentIds: [],
      settings: { maxGrade: 10, attempts: 0, shuffleQuestions: false },
      questions: [question(id, statement)],
    },
  ],
});
const aiDraft = (sections: unknown[]) => ({
  schemaVersion: 1,
  id: "pacote-ia",
  revision: 0,
  metadata: {
    fullName: "Curso inventado",
    shortName: "INV",
    summary: "Resumo",
    organization: "weeks",
    teacher: { name: "Docente inventado" },
  },
  sections,
  attachments: [],
  gradebook: {
    categories: [
      { id: "cat", name: "Quizzes", weight: 100, activityIds: ["quiz-a"] },
    ],
  },
});
const geminiReturning = (draft: unknown, fields: unknown[] = []) => ({
  apiKey: "CHAVE-FICTICIA",
  model: "modelo-teste",
  fetch: (async (_url: unknown, options?: RequestInit) => {
    // Guarda o que foi enviado para os testes olharem.
    sent.body = chatRequest(options);
    return chatReply(JSON.stringify({ draft, fields }));
  }) as typeof fetch,
});
const sent: { body: ReturnType<typeof chatRequest> | null } = { body: null };
const ask = (files: ReturnType<typeof file>[], draft: unknown, fields: unknown[] = []) =>
  importDocuments(
    { files, profile: "docx-topicos-v1", provider: "gemini", mode: "quizzes" },
    geminiReturning(draft, fields),
  );
const accepted = (result: ImportResult) => {
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) assert.fail("importação recusada");
  return result;
};

test("os documentos chegam à IA na ordem das seções de destino, e o prompt é o de quizzes", async () => {
  const files = [file("Quiz 3.txt", "três"), file("Quiz 1.txt", "um")];
  await ask(files, aiDraft([aiSection("a", "um"), aiSection("b", "três")]));
  const body = sent.body!;
  assert.equal(body.messages[0]!.content, buildImportPrompt("docx-topicos-v1", "quizzes"));
  const received = JSON.parse(String(body.messages[1]!.content)) as { name: string }[];
  assert.deepEqual(received.map((item) => item.name), ["Quiz 1.txt", "Quiz 3.txt"]);
});

test("o código define a seção de destino, o título e a marca de pacote, e solta o resto", async () => {
  const result = accepted(
    await ask(
      [file("Quiz 3.txt", "três"), file("Quiz_1.txt", "um")],
      aiDraft([aiSection("a", "um"), aiSection("b", "três")]),
    ),
  );
  const draft = result.draft;
  assert.equal(draft.metadata.quizOnly, true);
  assert.equal(draft.metadata.organization, "topics");
  assert.equal(draft.metadata.teacher, undefined);
  assert.equal(draft.gradebook, undefined);
  assert.deepEqual(draft.sections.map((item) => item.targetNumber), [1, 3]);
  assert.deepEqual(draft.sections.map((item) => item.title), ["Seção 1", "Seção 3"]);
  assert.deepEqual(
    draft.sections.map((item) => item.activities[0]!.title),
    ["Quiz 1", "Quiz 3"],
  );
  assert.equal(draft.sections[0]!.summary, "");
  assert.equal(result.provenance.promptVersion, "moodle-quiz-import-v1");
  assert.equal(validateDraft(draft).valid, true);
});

test("arquivos do mesmo destino viram uma seção só, com os dois quizzes", async () => {
  const result = accepted(
    await ask(
      [file("Quiz 2 A.txt", "a"), file("Quiz 2 B.txt", "b")],
      aiDraft([aiSection("a", "a"), aiSection("b", "b")]),
    ),
  );
  assert.equal(result.draft.sections.length, 1);
  assert.equal(result.draft.sections[0]!.targetNumber, 2);
  assert.deepEqual(
    result.draft.sections[0]!.activities.map((item) => item.title),
    ["Quiz 2 A", "Quiz 2 B"],
  );
});

test("a origem dos campos acompanha o quiz mesmo depois de juntar seções", async () => {
  const documents = [file("Quiz 2 A.txt", "a"), file("Quiz 2 B.txt", "b")];
  // O leitor de texto dá a cada documento um único bloco, com este id.
  const block = (document: { id: string }) => `block-${document.id}-1`;
  const result = accepted(
    await ask(
      documents,
      aiDraft([aiSection("a", "a"), aiSection("b", "b")]),
      [
        // O 2º quiz foi parar depois do 1º, na mesma seção: o caminho da origem acompanha.
        {
          path: "sections[1].activities[0].questions[0].statement",
          sourceId: documents[1]!.id,
          blockId: block(documents[1]!),
        },
        // Título da seção e do quiz foram refeitos pelo código: a origem deles some.
        { path: "sections[1].title", sourceId: documents[1]!.id, blockId: block(documents[1]!) },
        { path: "sections[1].activities[0].title", sourceId: documents[1]!.id, blockId: block(documents[1]!) },
        { path: "metadata.fullName", sourceId: documents[0]!.id, blockId: block(documents[0]!) },
      ],
    ),
  );
  assert.deepEqual(
    result.provenance.fields.map((item) => item.path),
    ["sections[0].activities[1].questions[0].statement"],
  );
});

test("a IA que não separa um quiz por arquivo é recusada com uma frase clara", async () => {
  const result = await ask(
    [file("Quiz 1.txt", "um"), file("Quiz 2.txt", "dois")],
    aiDraft([aiSection("a", "um")]),
  );
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((item) => item.code === "quiz_package_shape"));
});

test("a IA que erra o número de seções é chamada a corrigir, e o segundo envio vale", async () => {
  const files = [file("Quiz 1.txt", "um"), file("Quiz 2.txt", "dois")];
  const drafts = [
    aiDraft([aiSection("a", "um")]),
    aiDraft([aiSection("a", "um"), aiSection("b", "dois")]),
  ];
  const requests: ReturnType<typeof chatRequest>[] = [];
  const result = await importDocuments(
    { files, profile: "docx-topicos-v1", provider: "gemini", mode: "quizzes" },
    {
      apiKey: "CHAVE-FICTICIA",
      model: "modelo-teste",
      fetch: (async (_url: unknown, options?: RequestInit) => {
        requests.push(chatRequest(options));
        return chatReply(
          JSON.stringify({
            draft: drafts[Math.min(requests.length, 2) - 1],
            fields: [],
          }),
        );
      }) as typeof fetch,
    },
  );
  const done = accepted(result);
  assert.equal(requests.length, 2);
  assert.match(
    String(requests[1]!.messages.at(-1)!.content),
    /exatamente 2 seções/,
  );
  assert.equal(done.draft.sections.length, 2);
});

test("fórum devolvido pela IA não é descartado em silêncio: o contrato recusa", async () => {
  const section = aiSection("a", "um");
  section.activities.push({
    id: "forum-a",
    type: "forum",
    title: "Fórum",
    description: "",
    attachmentIds: [],
    settings: { discussionMode: "general" },
  } as never);
  const result = await ask([file("Quiz 1.txt", "um")], aiDraft([section]));
  assert.equal(result.ok, false);
});

test("só quizzes precisa de uma IA: o leitor sem IA não monta o pacote", async () => {
  const result = await importDocuments({
    files: [file("Quiz 1.txt", "um")],
    profile: "docx-topicos-v1",
    provider: "offline",
    mode: "quizzes",
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((item) => item.code === "quiz_package_requires_ai"));
});

test("o prompt do curso não fala do pacote de quizzes; o de quizzes fala", () => {
  const course = buildImportPrompt("docx-topicos-v1");
  assert.doesNotMatch(course, /quizOnly|targetNumber/);
  assert.equal(course, buildImportPrompt("docx-topicos-v1", "course"));
  const quizzes = buildImportPrompt("docx-topicos-v1", "quizzes");
  assert.match(quizzes, /moodle-quiz-import-v1/);
  assert.match(quizzes, /exatamente uma seção por documento/);
  assert.doesNotMatch(quizzes, /targetNumber/);
});
