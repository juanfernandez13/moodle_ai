// Quiz questions: questions.xml per question type and the slots that reference them.
import test from "node:test";
import assert from "node:assert/strict";
import type { Activity, Question } from "../../src/domain/course/index.ts";
import { exportCourse } from "../../src/server/export/index.ts";
import {
  attachment,
  draft,
  exportMbz,
  list,
  profileId,
  section,
  sha1,
  type Mbz,
} from "./mbz.ts";

const quiz = (id: string, questions: Question[]): Activity => ({
  id,
  type: "quiz",
  title: `Quiz ${id}`,
  description: "",
  attachmentIds: [],
  settings: { maxGrade: 10, attempts: 1, shuffleQuestions: false },
  questions,
});
/** Every question bank entry of a quiz, keyed by the draft question ID. */
function bank(mbz: Mbz, quizId: string) {
  const found = mbz.activity(quizId);
  const categories = list(
    mbz.xml("questions.xml").question_categories.question_category,
  ).filter((category) => category.contextid === found.body["@_contextid"]);
  const own = categories.find((category) => category.name !== "top");
  assert.ok(own, "categoria própria do quiz");
  const entries = list(own.question_bank_entries.question_bank_entry);
  return {
    found,
    category: own,
    entries: new Map(entries.map((entry) => [String(entry.idnumber), entry])),
    question: (id: string) => {
      const entry = entries.find((item) => item.idnumber === id);
      assert.ok(entry, `questão ${id}`);
      return entry.question_version.question_versions.questions.question;
    },
  };
}

test("múltipla escolha de resposta única exporta alternativas, frações, feedback e opções do qtype", async () => {
  const mbz = await exportMbz(
    draft([
      section("s1", [
        quiz("quiz-1", [
          {
            id: "mc",
            type: "multiple-choice",
            statement: "Quanto é 2 + 2?",
            feedback: "Soma simples.",
            maxMark: 2,
            options: [
              { id: "mc-a", text: "3", fraction: 0, feedback: "Faltou um." },
              { id: "mc-b", text: "4", fraction: 1, feedback: "Isso." },
              { id: "mc-c", text: "5 & meio", fraction: 0, feedback: "" },
            ],
          },
        ]),
      ]),
    ]),
  );
  const { entries, category, question } = bank(mbz, "quiz-1");
  const entry = entries.get("mc")!;
  assert.equal(entry.questioncategoryid, category["@_id"]);
  assert.equal(entry.question_version.question_versions.version, "1");
  assert.equal(entry.question_version.question_versions.status, "ready");
  const q = question("mc");
  assert.equal(q.qtype, "multichoice");
  assert.equal(q.name, "mc");
  assert.equal(q.questiontext, "<p>Quanto é 2 + 2?</p>");
  assert.equal(q.generalfeedback, "<p>Soma simples.</p>");
  assert.equal(q.defaultmark, "2");
  assert.equal(q.penalty, "0");
  const plugin = q.plugin_qtype_multichoice_question;
  const answers = list<Record<string, string>>(plugin.answers.answer);
  assert.deepEqual(
    answers.map((answer) => [answer.answertext, answer.fraction, answer.feedback]),
    [
      ["<p>3</p>", "0", "<p>Faltou um.</p>"],
      ["<p>4</p>", "1", "<p>Isso.</p>"],
      ["<p>5 &amp; meio</p>", "0", "<p></p>"],
    ],
  );
  assert.equal(new Set(answers.map((answer) => answer["@_id"])).size, 3);
  assert.equal(plugin.multichoice.single, "1");
  assert.equal(plugin.multichoice.shuffleanswers, "0");
  assert.equal(plugin.multichoice.answernumbering, "abc");
});

test("múltipla escolha com mais de uma correta ou frações parciais bloqueia a exportação", async () => {
  const options = (fractions: number[]) =>
    fractions.map((fraction, index) => ({
      id: `opt-${index}`,
      text: `Alternativa ${index}`,
      fraction,
      feedback: "",
    }));
  for (const fractions of [
    [1, 1, 0],
    [0.5, 0.5, 0],
    [0, 0, 0],
  ]) {
    const { draft: input } = draft([
      section("s1", [
        quiz("quiz-1", [
          { id: "mc", type: "multiple-choice", statement: "?", feedback: "", options: options(fractions) },
        ]),
      ]),
    ]);
    let resolved = false;
    const result = await exportCourse(input, {
      profileId,
      resolveAttachment: async () => {
        resolved = true;
        return null;
      },
    });
    assert.equal(result.ok, false, `frações ${fractions}`);
    if (!result.ok)
      assert.deepEqual(
        result.issues.map((issue) => [issue.code, issue.path]),
        [["invalid_single_choice", "sections[0].activities[0].questions[0].options"]],
      );
    assert.equal(resolved, false);
  }
});

test("associação exporta cada par como subquestão com resposta em texto", async () => {
  const mbz = await exportMbz(
    draft([
      section("s1", [
        quiz("quiz-1", [
          {
            id: "match",
            type: "matching",
            statement: "Associe capital e país.",
            feedback: "",
            pairs: [
              { id: "p1", statement: "Brasília", answer: "Brasil" },
              { id: "p2", statement: "Lima", answer: "Peru" },
              { id: "p3", statement: "Quito", answer: "Equador" },
            ],
          },
        ]),
      ]),
    ]),
  );
  const q = bank(mbz, "quiz-1").question("match");
  assert.equal(q.qtype, "match");
  assert.equal(q.defaultmark, "1");
  const plugin = q.plugin_qtype_match_question;
  assert.equal(plugin.matchoptions.shuffleanswers, "0");
  const matches = list<Record<string, string>>(plugin.matches.match);
  assert.deepEqual(
    matches.map((match) => [match.questiontext, match.questiontextformat, match.answertext]),
    [
      ["<p>Brasília</p>", "1", "Brasil"],
      ["<p>Lima</p>", "1", "Peru"],
      ["<p>Quito</p>", "1", "Equador"],
    ],
  );
  assert.equal(new Set(matches.map((match) => match["@_id"])).size, 3);
});

test("discursiva exporta formato, obrigatoriedade, linhas e anexos da resposta", async () => {
  const mbz = await exportMbz(
    draft([
      section("s1", [
        quiz("quiz-1", [
          {
            id: "essay-editor",
            type: "essay",
            statement: "Discorra sobre o tema.",
            feedback: "Use exemplos.",
            maxMark: 5,
            settings: { responseFormat: "editor", responseRequired: true, responseLines: 15, attachments: 2 },
          },
          {
            id: "essay-plain",
            type: "essay",
            statement: "Resuma em texto simples.",
            feedback: "",
            settings: { responseFormat: "plain", responseRequired: false, responseLines: 5, attachments: 0 },
          },
        ]),
      ]),
    ]),
  );
  const { question } = bank(mbz, "quiz-1");
  const editor = question("essay-editor");
  assert.equal(editor.qtype, "essay");
  assert.equal(editor.defaultmark, "5");
  assert.equal(editor.generalfeedback, "<p>Use exemplos.</p>");
  const settings = editor.plugin_qtype_essay_question.essay;
  assert.equal(settings.responseformat, "editor");
  assert.equal(settings.responserequired, "1");
  assert.equal(settings.responsefieldlines, "15");
  assert.equal(settings.attachments, "2");
  assert.equal(settings.attachmentsrequired, "0");
  assert.equal(settings.minwordlimit, "$@NULL@$");
  const plain = question("essay-plain").plugin_qtype_essay_question.essay;
  assert.equal(plain.responseformat, "plain");
  assert.equal(plain.responserequired, "0");
  assert.equal(plain.attachments, "0");
});

test("slots do quiz apontam para as entradas do banco na ordem, com nota por questão", async () => {
  const mbz = await exportMbz(
    draft([
      section("s1", [
        quiz("quiz-1", [
          { id: "q-essay", type: "essay", statement: "A", feedback: "", maxMark: 3, settings: { responseFormat: "plain", responseRequired: true, responseLines: 5, attachments: 0 } },
          { id: "q-match", type: "matching", statement: "B", feedback: "", pairs: [{ id: "x1", statement: "1", answer: "um" }, { id: "x2", statement: "2", answer: "dois" }] },
          { id: "q-mc", type: "multiple-choice", statement: "C", feedback: "", maxMark: 0.5, options: [{ id: "y1", text: "sim", fraction: 1, feedback: "" }, { id: "y2", text: "não", fraction: 0, feedback: "" }] },
        ]),
      ]),
    ]),
  );
  const { found, entries } = bank(mbz, "quiz-1");
  const body = found.body.quiz;
  assert.equal(body.sumgrades, "4.5");
  const slots = list<Record<string, string> & { question_reference: Record<string, string> }>(
    body.question_instances.question_instance,
  );
  assert.deepEqual(
    slots.map((slot) => [slot.slot, slot.page, slot.maxmark, slot.quizid]),
    [
      ["1", "1", "3", found.entry.moduleid],
      ["2", "2", "1", found.entry.moduleid],
      ["3", "3", "0.5", found.entry.moduleid],
    ],
  );
  assert.deepEqual(
    slots.map((slot) => slot.question_reference.questionbankentryid),
    ["q-essay", "q-match", "q-mc"].map((id) => entries.get(id)!["@_id"]),
  );
  for (const slot of slots) {
    assert.equal(slot.question_reference.usingcontextid, found.body["@_contextid"]);
    assert.equal(slot.question_reference.component, "mod_quiz");
    assert.equal(slot.question_reference.questionarea, "slot");
    assert.equal(slot.question_reference.version, "1");
  }
  const stamps = [...entries.values()].map(
    (entry) => entry.question_version.question_versions.questions.question.stamp,
  );
  assert.equal(new Set(stamps).size, 3);
});

test("imagens de enunciado, alternativa, feedback e par ficam na área de arquivo de cada parte", async () => {
  const figure = attachment("fig", "grafico.png", "PNG grafico", "image/png");
  const image = (id: string) => [{ id, kind: "image" as const, attachmentId: "fig", alt: "Gráfico" }];
  const mbz = await exportMbz(
    draft(
      [
        section("s1", [
          quiz("quiz-1", [
            {
              id: "mc",
              type: "multiple-choice",
              statement: "Observe.",
              statementBlocks: image("b-statement"),
              feedback: "Veja.",
              feedbackBlocks: image("b-feedback"),
              options: [
                { id: "o1", text: "A", textBlocks: image("b-option"), fraction: 1, feedback: "ok", feedbackBlocks: image("b-option-feedback") },
                { id: "o2", text: "B", fraction: 0, feedback: "" },
              ],
            },
            {
              id: "match",
              type: "matching",
              statement: "Associe.",
              feedback: "",
              pairs: [
                { id: "p1", statement: "X", statementBlocks: image("b-pair"), answer: "x" },
                { id: "p2", statement: "Y", answer: "y" },
              ],
            },
          ]),
        ]),
      ],
      [figure],
    ),
  );
  const { found, question } = bank(mbz, "quiz-1");
  const mc = question("mc"), match = question("match");
  const answer = list<Record<string, string>>(mc.plugin_qtype_multichoice_question.answers.answer)[0]!;
  const pair = list<Record<string, string>>(match.plugin_qtype_match_question.matches.match)[0]!;
  const rows = mbz
    .files()
    .filter((file) => file.contextid === found.body["@_contextid"] && file.filename === "grafico.png")
    .map((file) => `${file.component}/${file.filearea}/${file.itemid}`);
  assert.deepEqual(rows.sort(), [
    `qtype_match/subquestion/${pair["@_id"]}`,
    `question/answer/${answer["@_id"]}`,
    `question/answerfeedback/${answer["@_id"]}`,
    `question/generalfeedback/${mc["@_id"]}`,
    `question/questiontext/${mc["@_id"]}`,
  ].sort());
  assert.match(mc.questiontext, /<img src="@@PLUGINFILE@@\/grafico\.png" alt="Gráfico"/);
  // One blob, however many areas reference it.
  const blobs = [...mbz.archive.keys()].filter((name) => name.startsWith("files/"));
  assert.deepEqual(blobs, [`files/${sha1(figure.bytes).slice(0, 2)}/${sha1(figure.bytes)}`]);
});

test("cada quiz mantém um banco de questões próprio, sem compartilhar entradas", async () => {
  const essay = (id: string): Question => ({
    id,
    type: "essay",
    statement: id,
    feedback: "",
    settings: { responseFormat: "plain", responseRequired: true, responseLines: 5, attachments: 0 },
  });
  const mbz = await exportMbz(
    draft([section("s1", [quiz("quiz-a", [essay("qa1"), essay("qa2")]), quiz("quiz-b", [essay("qb1")])])]),
  );
  const a = bank(mbz, "quiz-a"), b = bank(mbz, "quiz-b");
  assert.deepEqual([...a.entries.keys()], ["qa1", "qa2"]);
  assert.deepEqual([...b.entries.keys()], ["qb1"]);
  assert.notEqual(a.category["@_id"], b.category["@_id"]);
  const bIds = new Set([...b.entries.values()].map((entry) => entry["@_id"]));
  for (const slot of list<{ question_reference: { questionbankentryid: string } }>(
    a.found.body.quiz.question_instances.question_instance,
  ))
    assert.equal(bIds.has(slot.question_reference.questionbankentryid), false);
});
