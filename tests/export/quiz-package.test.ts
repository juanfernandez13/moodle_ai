// Pacote só de quizzes: um .mbz para mesclar num curso que já existe, sem mexer no que o destino tem.
import test from "node:test";
import assert from "node:assert/strict";
import { exportCourse } from "../../src/server/export/index.ts";
import { draft, exportMbz, list, profileId, section } from "./mbz.ts";
import type { Activity } from "../../src/domain/course/index.ts";

const nil = "$@NULL@$";
const quiz = (id: string, title: string): Activity => ({
  id,
  type: "quiz",
  title,
  description: "",
  attachmentIds: [],
  settings: { maxGrade: 10, attempts: 0, shuffleQuestions: false },
  questions: [
    {
      id: `${id}-q1`,
      type: "multiple-choice",
      statement: "Quanto é 2 + 2?",
      feedback: "",
      options: [
        { id: `${id}-o1`, text: "4", fraction: 1, feedback: "" },
        { id: `${id}-o2`, text: "5", fraction: 0, feedback: "" },
      ],
    },
  ],
});
/** [seção do destino, quizzes]: cada par vira uma seção do pacote. */
function quizPackage(targets: [number, Activity[]][]) {
  return draft(
    targets.map(([target, activities]) => ({
      ...section(`secao-${target}`, activities, `Seção ${target}`),
      targetNumber: target,
    })),
    [],
    {
      metadata: {
        fullName: "Questionários",
        shortName: "QUIZZES",
        summary: "",
        organization: "topics",
        quizOnly: true,
      },
    },
  );
}
const byTitle = (mbz: Awaited<ReturnType<typeof exportMbz>>, title: string) => {
  const entry = mbz.entries.find((item) => item.title === title);
  assert.ok(entry, `atividade ${title} no pacote`);
  return {
    entry,
    module: mbz.xml(`${entry.directory}/module.xml`).module,
    grades: mbz.xml(`${entry.directory}/grades.xml`).activity_gradebook,
  };
};

test("cada seção do pacote aponta para a seção de destino, sem nome nem resumo", async () => {
  const mbz = await exportMbz(
    quizPackage([
      [3, [quiz("a", "Quiz 3"), quiz("b", "Quiz 3 reforço")]],
      [1, [quiz("c", "Quiz 1")]],
    ]),
  );
  const sections = mbz.sections();
  // Em ordem de destino e sem a seção geral: ela só entra se alguém pediu a 0.
  assert.deepEqual(sections.map((item) => item.number), ["1", "3"]);
  for (const item of sections) {
    assert.equal(item.name, nil);
    assert.equal(item.summary, "");
    assert.equal(item.availabilityjson, nil);
  }
  const ids = (...titles: string[]) =>
    titles.map((title) => byTitle(mbz, title).entry.moduleid).join(",");
  assert.equal(sections[0]!.sequence, ids("Quiz 1"));
  assert.equal(sections[1]!.sequence, ids("Quiz 3", "Quiz 3 reforço"));
  assert.equal(byTitle(mbz, "Quiz 1").module.sectionnumber, "1");
  assert.equal(byTitle(mbz, "Quiz 3 reforço").module.sectionnumber, "3");
});

test("a seção 0 do destino é a seção geral", async () => {
  const mbz = await exportMbz(quizPackage([[0, [quiz("a", "Aquecimento")]]]));
  const [general] = mbz.sections();
  assert.equal(general!.number, "0");
  assert.equal(mbz.sections().length, 1);
});

test("não leva notas do curso: sem gradebook.xml, nota na raiz e sem peso herdado", async () => {
  const mbz = await exportMbz(
    quizPackage([
      [1, [quiz("a", "Quiz 1")]],
      [2, [quiz("b", "Quiz 2")]],
    ]),
  );
  // Sem o arquivo, o Moodle não mexe na estrutura de notas do destino.
  assert.equal(mbz.archive.has("gradebook.xml"), false);
  const categories = new Set<string>();
  for (const title of ["Quiz 1", "Quiz 2"]) {
    const item = byTitle(mbz, title).grades.grade_items.grade_item;
    assert.equal(item.itemtype, "mod");
    assert.equal(item.itemname, title);
    // Em agregação natural aggregationcoef é o crédito extra: herdar 1 viraria nota extra sem aviso.
    assert.equal(item.aggregationcoef, "0");
    categories.add(item.categoryid);
  }
  assert.equal(categories.size, 1, "as duas notas caem na mesma categoria raiz");
});

test("não leva estrutura do curso: nem idnumber do módulo, nem blocos, nem inscrições", async () => {
  const mbz = await exportMbz(quizPackage([[1, [quiz("a", "Quiz 1")]]]));
  assert.equal(byTitle(mbz, "Quiz 1").module.idnumber, "");
  assert.equal([...mbz.archive.keys()].some((name) => name.startsWith("course/blocks/")), false);
  assert.equal(mbz.setting("blocks"), "0");
  assert.equal(mbz.setting("users"), "0");
  assert.equal(
    list(mbz.xml("course/enrolments.xml").enrolments.enrols).length,
    0,
  );
});

test("o quiz vai com as questões e o nome do arquivo diz que é só de questionários", async () => {
  const mbz = await exportMbz(quizPackage([[1, [quiz("a", "Lógica & <Conjuntos>")]]]));
  assert.match(mbz.result.artifact.filename, /^questionarios-.+\.mbz$/);
  const { entry } = byTitle(mbz, "Lógica & <Conjuntos>");
  assert.equal(mbz.xml(`${entry.directory}/quiz.xml`).activity.quiz.name, "Lógica & <Conjuntos>");
  const questions = mbz.xml("questions.xml").question_categories.question_category;
  assert.ok(list(questions).some((category) => category.name === "Lógica & <Conjuntos>"));
});

test("o curso inteiro não muda: continua com a seção geral, o nome da seção e o gradebook", async () => {
  const mbz = await exportMbz(draft([section("s1", [quiz("a", "Quiz 1")])]));
  assert.equal(mbz.sections()[0]!.name, "Geral");
  assert.equal(mbz.sections()[1]!.name, "Unidade s1");
  assert.ok(mbz.archive.has("gradebook.xml"));
  assert.match(mbz.result.artifact.filename, /^moodle-.+\.mbz$/);
});

test("pacote com notas ou fórum não exporta: as regras do contrato valem na saída", async () => {
  const built = quizPackage([[1, [quiz("a", "Quiz 1")]]]);
  built.draft.gradebook = {
    categories: [{ id: "cat", name: "Quizzes", weight: 100, activityIds: ["a"] }],
  };
  const result = await exportCourse(built.draft, {
    profileId,
    resolveAttachment: async () => null,
  });
  assert.equal(result.ok, false);
  if (result.ok) assert.fail("deveria recusar");
  assert.ok(result.issues.some((item) => item.code === "quiz_package_gradebook"));
});
