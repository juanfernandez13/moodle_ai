// Course-level structure of the backup: sections and sequences, dates, gradebook and shared files.
import test from "node:test";
import assert from "node:assert/strict";
import { exportCourse } from "../../src/server/export/index.ts";
import {
  activityFiles,
  assignment,
  attachment,
  draft,
  exportMbz,
  forum,
  list,
  profileId,
  seconds,
  section,
  sha1,
} from "./mbz.ts";

test("várias atividades do mesmo tipo na mesma unidade mantêm ordem, IDs e diretórios próprios", async () => {
  const mbz = await exportMbz(
    draft([
      section("s1", [
        forum("f1"),
        assignment("a1"),
        forum("f2"),
        assignment("a2"),
        forum("f3"),
      ]),
      section("s2", [forum("f4")]),
    ]),
  );
  assert.deepEqual(
    mbz.entries.map((entry) => entry.title),
    ["Fórum f1", "Tarefa a1", "Fórum f2", "Tarefa a2", "Fórum f3", "Fórum f4"],
  );
  assert.equal(new Set(mbz.entries.map((entry) => entry.moduleid)).size, 6);
  assert.equal(new Set(mbz.entries.map((entry) => entry.directory)).size, 6);
  const [general, first, second] = mbz.sections();
  assert.equal(general.number, "0");
  assert.equal(general.name, "Geral");
  assert.equal(general.sequence, "");
  assert.equal(first.number, "1");
  assert.equal(first.name, "Unidade s1");
  assert.equal(second.number, "2");
  const ids = (...draftIds: string[]) =>
    draftIds.map((id) => mbz.activity(id).entry.moduleid).join(",");
  assert.equal(first.sequence, ids("f1", "a1", "f2", "a2", "f3"));
  assert.equal(second.sequence, ids("f4"));
  for (const id of ["f1", "f2", "f3"])
    assert.equal(mbz.activity(id).module.sectionid, first["@_id"]);
  assert.equal(mbz.activity("f4").module.sectionnumber, "2");
  // Each assignment has its own grade item; forums have none.
  assert.notEqual(
    mbz.activity("a1").grades.grade_items.grade_item["@_id"],
    mbz.activity("a2").grades.grade_items.grade_item["@_id"],
  );
  const course = mbz.xml("course/course.xml").course;
  const numsections = list<{ name: string; value: string }>(
    course.courseformatoptions.courseformatoption,
  ).find((option) => option.name === "numsections");
  assert.equal(numsections?.value, "2");
  for (const sec of mbz.sections()) {
    assert.equal(mbz.setting(`section_${sec["@_id"]}_included`), "1");
    assert.equal(mbz.setting(`section_${sec["@_id"]}_userinfo`), "0");
  }
  const index = mbz.archive.get(".ARCHIVE_INDEX")!.toString("utf8");
  assert.match(index, new RegExp(`^Moodle archive file index\\. Count: ${mbz.archive.size - 1}\\n`));
});

test("o mesmo anexo em duas atividades gera um registro por contexto e um único blob", async () => {
  const guide = attachment("guide", "guia.pdf", "%PDF compartilhado");
  const mbz = await exportMbz(
    draft(
      [
        section("s1", [
          forum("f1", { attachmentIds: ["guide"] }),
          forum("f2", { attachmentIds: ["guide"] }),
        ]),
      ],
      [guide],
    ),
  );
  const first = mbz.activity("f1"), second = mbz.activity("f2");
  const a = activityFiles(mbz, first.body["@_contextid"]);
  const b = activityFiles(mbz, second.body["@_contextid"]);
  assert.equal(a.length, 1);
  assert.equal(b.length, 1);
  assert.notEqual(a[0]?.["@_id"], b[0]?.["@_id"]);
  assert.equal(a[0]?.contenthash, sha1(guide.bytes));
  assert.equal(b[0]?.contenthash, sha1(guide.bytes));
  assert.equal(
    [...mbz.archive.keys()].filter((name) => name.startsWith("files/")).length,
    1,
  );
  assert.equal(first.inforef.fileref.file.id, a[0]?.["@_id"]);
  assert.equal(second.inforef.fileref.file.id, b[0]?.["@_id"]);
});

test("anexos diferentes com o mesmo nome na mesma atividade são recusados", async () => {
  const one = attachment("one", "material.pdf", "%PDF um");
  const two = attachment("two", "material.pdf", "%PDF dois");
  const { draft: input, bytes } = draft(
    [section("s1", [forum("f1", { attachmentIds: ["one", "two"] })])],
    [one, two],
  );
  const result = await exportCourse(input, {
    profileId,
    resolveAttachment: async (id) => bytes.get(id) ?? null,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.issues[0]?.code, "duplicate_filename");
  // In different activities the same name is fine: each has its own file area.
  const separate = draft(
    [
      section("s1", [
        forum("f1", { attachmentIds: ["one"] }),
        forum("f2", { attachmentIds: ["two"] }),
      ]),
    ],
    [one, two],
  );
  const mbz = await exportMbz(separate);
  assert.equal(
    [...mbz.archive.keys()].filter((name) => name.startsWith("files/")).length,
    2,
  );
});

test("datas com fuso viram segundos UTC e só a borda informada entra na restrição", async () => {
  const opensAt = "2026-11-02T08:00:00-03:00";
  const closesAt = "2026-11-08T23:59:00.000-03:00";
  const mbz = await exportMbz(
    draft(
      [
        section("s1", [
          assignment("opens-only", { schedule: { opensAt } }),
          assignment("closes-only", { schedule: { closesAt } }),
          forum("both", { schedule: { opensAt, closesAt } }),
        ]),
      ],
      [],
      {
        metadata: {
          fullName: "Curso semanal",
          shortName: "SEM",
          summary: "",
          organization: "weeks",
          startDate: "2026-11-02T00:00:00-03:00",
        },
      },
    ),
  );
  assert.equal(seconds(opensAt), seconds("2026-11-02T11:00:00Z"));
  const course = mbz.xml("course/course.xml").course;
  assert.equal(course.format, "weeks");
  assert.equal(course.startdate, seconds("2026-11-02T03:00:00Z"));
  assert.equal(
    mbz.backup.original_course_startdate,
    seconds("2026-11-02T03:00:00Z"),
  );
  assert.equal(mbz.backup.original_course_format, "weeks");

  const opensOnly = mbz.activity("opens-only");
  assert.deepEqual(JSON.parse(opensOnly.module.availability).c, [
    { type: "date", d: ">=", t: Number(seconds(opensAt)) },
  ]);
  assert.equal(opensOnly.body.assign.allowsubmissionsfromdate, seconds(opensAt));
  assert.equal(opensOnly.body.assign.duedate, "0");
  assert.equal(opensOnly.body.assign.cutoffdate, "0");

  const closesOnly = mbz.activity("closes-only");
  assert.deepEqual(JSON.parse(closesOnly.module.availability).c, [
    { type: "date", d: "<", t: Number(seconds(closesAt)) },
  ]);
  assert.equal(closesOnly.body.assign.allowsubmissionsfromdate, "0");
  assert.equal(closesOnly.body.assign.duedate, seconds(closesAt));

  const both = mbz.activity("both");
  assert.equal(both.body.forum.duedate, seconds("2026-11-09T02:59:00Z"));
});

test("notas: categorias com peso, item por atividade e atividade sem categoria na raiz", async () => {
  const quiz = {
    id: "quiz-1",
    type: "quiz" as const,
    title: "Prova",
    description: "",
    attachmentIds: [],
    settings: { maxGrade: 50, attempts: 1, shuffleQuestions: false },
    questions: [
      {
        id: "q1",
        type: "essay" as const,
        statement: "?",
        feedback: "",
        settings: { responseFormat: "plain" as const, responseRequired: true, responseLines: 5, attachments: 0 },
      },
    ],
  };
  const mbz = await exportMbz(
    draft(
      [
        section("s1", [
          assignment("a1", { settings: { maxGrade: 10, submissionMode: "file" } }),
          quiz,
          forum("f1"),
        ]),
        section("s2", [
          assignment("a2", { settings: { maxGrade: 30, submissionMode: "text" } }),
          assignment("a3", { settings: { maxGrade: 5, submissionMode: "both" } }),
        ]),
      ],
      [],
      {
        gradebook: {
          categories: [
            { id: "cat-provas", name: "Provas", weight: 60, activityIds: ["quiz-1", "a1"] },
            { id: "cat-trabalhos", name: "Trabalhos", weight: 40, activityIds: ["a2"] },
          ],
        },
      },
    ),
  );
  const book = mbz.xml("gradebook.xml").gradebook;
  const categories = list<Record<string, string>>(book.grade_categories.grade_category);
  const [root, provas, trabalhos] = categories;
  assert.equal(categories.length, 3);
  assert.equal(root?.depth, "1");
  assert.equal(root?.parent, "$@NULL@$");
  assert.equal(root?.path, `/${root?.["@_id"]}/`);
  for (const [category, name] of [
    [provas, "Provas"],
    [trabalhos, "Trabalhos"],
  ] as const) {
    assert.equal(category?.fullname, name);
    assert.equal(category?.parent, root?.["@_id"]);
    assert.equal(category?.depth, "2");
    assert.equal(category?.path, `/${root?.["@_id"]}/${category?.["@_id"]}/`);
    assert.equal(category?.aggregation, "10");
  }
  const items = list<Record<string, string>>(book.grade_items.grade_item);
  const course = items.find((item) => item.itemtype === "course");
  assert.equal(course?.iteminstance, root?.["@_id"]);
  const weights = items
    .filter((item) => item.itemtype === "category")
    .map((item) => [item.iteminstance, item.aggregationcoef]);
  assert.deepEqual(weights, [
    [provas?.["@_id"], "60"],
    [trabalhos?.["@_id"], "40"],
  ]);

  const item = (id: string) => mbz.activity(id).grades.grade_items.grade_item;
  assert.equal(item("quiz-1").categoryid, provas?.["@_id"]);
  assert.equal(item("a1").categoryid, provas?.["@_id"]);
  assert.equal(item("a2").categoryid, trabalhos?.["@_id"]);
  assert.equal(item("a3").categoryid, root?.["@_id"]);
  assert.deepEqual(
    ["a1", "quiz-1", "a2", "a3"].map((id) => item(id).grademax),
    ["10", "50", "30", "5"],
  );
  assert.equal(mbz.activity("f1").grades.grade_items, "");
  const sortorders = [
    course?.sortorder,
    ...items.filter((i) => i.itemtype === "category").map((i) => i.sortorder),
    ...["quiz-1", "a1", "a2", "a3"].map((id) => item(id).sortorder),
  ].map(Number);
  assert.equal(new Set(sortorders).size, sortorders.length);
});

test("sem gradebook, as atividades avaliáveis ficam na categoria raiz do curso", async () => {
  const mbz = await exportMbz(draft([section("s1", [assignment("a1"), assignment("a2")])]));
  const book = mbz.xml("gradebook.xml").gradebook;
  const root = list<Record<string, string>>(book.grade_categories.grade_category);
  assert.equal(root.length, 1);
  assert.deepEqual(
    list<Record<string, string>>(book.grade_items.grade_item).map((item) => item.itemtype),
    ["course"],
  );
  for (const id of ["a1", "a2"])
    assert.equal(
      mbz.activity(id).grades.grade_items.grade_item.categoryid,
      root[0]?.["@_id"],
    );
});

test("resumo da seção com imagem e dados do professor chegam ao curso com suas referências", async () => {
  const figure = attachment("fig", "mapa.png", "PNG mapa", "image/png");
  const unit = section("s1", [forum("f1")]);
  unit.summary = "Mapa da unidade";
  unit.summaryBlocks = [
    { id: "t1", kind: "text", text: "Mapa da unidade" },
    { id: "i1", kind: "image", attachmentId: "fig", alt: "Mapa" },
  ];
  const mbz = await exportMbz(
    draft([unit], [figure], {
      metadata: {
        fullName: "Curso de Teste",
        shortName: "TESTE",
        summary: "Bem-vindos.",
        organization: "topics",
        teacher: { name: "Prof. Ana", email: "ana@example.test", qualification: "Mestra" },
        workloadHours: 60,
        semester: "2026.2",
        className: "Turma A",
      },
    }),
  );
  const sec = mbz.sections()[1];
  assert.equal(
    sec.summary,
    '<p>Mapa da unidade</p><img src="@@PLUGINFILE@@/mapa.png" alt="Mapa" style="max-width:100%;height:auto">',
  );
  const file = mbz
    .files()
    .find((row) => row.component === "course" && row.filearea === "section" && row.filename === "mapa.png");
  assert.equal(file?.itemid, sec["@_id"]);
  const sectionDir = list<{ sectionid: string; directory: string }>(
    mbz.backup.contents.sections.section,
  ).find((item) => item.sectionid === sec["@_id"])!.directory;
  assert.equal(mbz.xml(`${sectionDir}/inforef.xml`).inforef.fileref.file.id, file?.["@_id"]);
  assert.equal(
    mbz.xml("course/course.xml").course.summary,
    "<p>Bem-vindos.</p><p>Professor(a): Prof. Ana — Mestra (ana@example.test)<br>Carga horária: 60 h<br>Semestre: 2026.2<br>Turma: Turma A</p>",
  );
});
