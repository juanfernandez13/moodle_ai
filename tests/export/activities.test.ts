// One exported activity per test: module.xml, the activity XML, inforef, files and gradebook.
import test from "node:test";
import assert from "node:assert/strict";
import {
  activityFiles,
  assignment,
  attachment,
  draft,
  exportMbz,
  forum,
  list,
  seconds,
  section,
  sha1,
  type Mbz,
} from "./mbz.ts";

const opensAt = "2026-11-02T11:00:00Z";
const closesAt = "2026-11-09T02:59:00Z";

/** Checks the relations every activity must keep, whatever its type. */
function assertWiring(
  mbz: Mbz,
  found: ReturnType<Mbz["activity"]>,
  modulename: string,
) {
  const { entry, module, body } = found;
  assert.equal(entry.modulename, modulename);
  assert.equal(entry.directory, `activities/${modulename}_${entry.moduleid}`);
  assert.equal(module["@_id"], entry.moduleid);
  assert.equal(module.modulename, modulename);
  assert.equal(module.sectionid, entry.sectionid);
  assert.equal(body["@_id"], entry.moduleid);
  assert.equal(body["@_moduleid"], entry.moduleid);
  assert.equal(body["@_modulename"], modulename);
  assert.equal(body[modulename]["@_id"], entry.moduleid);
  const owner = mbz.sections().find((sec) => sec["@_id"] === entry.sectionid);
  assert.ok(owner, "a seção da atividade deve existir");
  assert.ok(String(owner.sequence).split(",").includes(entry.moduleid));
  assert.equal(module.sectionnumber, owner.number);
  assert.equal(mbz.setting(`${modulename}_${entry.moduleid}_included`), "1");
  for (const name of [
    "grade_history.xml",
    "completion.xml",
    "calendar.xml",
    "comments.xml",
    "filters.xml",
    "competencies.xml",
    "roles.xml",
  ])
    mbz.xml(`${found.dir}/${name}`);
}

test("fórum exporta modo de discussão, datas, restrição de acesso e anexo da descrição", async () => {
  const guide = attachment("guide", "guia da unidade.pdf", "%PDF guia");
  const mbz = await exportMbz(
    draft(
      [
        section("s1", [
          forum("forum-1", {
            title: "Fórum de apresentação",
            description: "Conte <quem> você é.",
            attachmentIds: ["guide"],
            schedule: { opensAt, closesAt },
            settings: { discussionMode: "single" },
          }),
        ]),
      ],
      [guide],
    ),
  );
  const found = mbz.activity("forum-1");
  assertWiring(mbz, found, "forum");
  assert.equal(found.module["@_version"], "2022112801");
  assert.deepEqual(JSON.parse(found.module.availability), {
    op: "&",
    c: [
      { type: "date", d: ">=", t: Number(seconds(opensAt)) },
      { type: "date", d: "<", t: Number(seconds(closesAt)) },
    ],
    showc: [true, true],
  });
  const body = found.body.forum;
  assert.equal(body.name, "Fórum de apresentação");
  assert.equal(body.type, "single");
  assert.equal(body.duedate, seconds(closesAt));
  assert.equal(body.cutoffdate, seconds(closesAt));
  assert.equal(body.introformat, "1");
  assert.equal(
    body.intro,
    '<p>Conte &lt;quem&gt; você é.</p><ul><li><a href="@@PLUGINFILE@@/guia%20da%20unidade.pdf">guia da unidade.pdf</a></li></ul>',
  );
  assert.equal(body.grade_forum, "0");
  // Forums are not graded: no grade item and no grade reference.
  assert.equal(found.grades.grade_items, "");
  assert.equal(found.inforef.grade_itemref, undefined);

  const files = activityFiles(mbz, found.body["@_contextid"]);
  assert.equal(files.length, 1);
  const [file] = files;
  assert.equal(file?.component, "mod_forum");
  assert.equal(file?.filearea, "intro");
  assert.equal(file?.itemid, "0");
  assert.equal(file?.filename, "guia da unidade.pdf");
  assert.equal(file?.mimetype, "application/pdf");
  assert.equal(file?.filesize, String(guide.bytes.byteLength));
  assert.equal(file?.contenthash, sha1(guide.bytes));
  assert.deepEqual(new Uint8Array(file!.stored!), guide.bytes);
  assert.deepEqual(
    list(found.inforef.fileref.file).map((ref: { id: string }) => ref.id),
    [file?.["@_id"]],
  );
  // Moodle also needs the directory record of each file area.
  assert.ok(
    mbz
      .files()
      .some(
        (row) =>
          row.contextid === found.body["@_contextid"] &&
          row.filearea === "intro" &&
          row.filename === "." &&
          row.contenthash === "da39a3ee5e6b4b0d3255bfef95601890afd80709",
      ),
  );
});

test("fórum sem datas não recebe restrição nem prazos", async () => {
  const mbz = await exportMbz(draft([section("s1", [forum("forum-1")])]));
  const found = mbz.activity("forum-1");
  assert.equal(found.module.availability, "$@NULL@$");
  assert.equal(found.body.forum.duedate, "0");
  assert.equal(found.body.forum.type, "general");
  assert.equal(found.body.forum.intro, "<p>Apresente-se.</p>");
  assert.equal(found.inforef.fileref, undefined);
});

test("tarefa com anexos exporta envio, nota, gradebook, grading e os bytes de cada anexo", async () => {
  const plan = attachment("plan", "plano de aula.pdf", "%PDF plano");
  const sheet = attachment(
    "sheet",
    "rubrica.xlsx",
    "PK rubrica",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  const mbz = await exportMbz(
    draft(
      [
        section("s1", [
          assignment("task-1", {
            title: "Relatório final",
            attachmentIds: ["plan", "sheet"],
            schedule: { opensAt, closesAt },
            settings: { maxGrade: 25, submissionMode: "both" },
          }),
        ]),
      ],
      [plan, sheet],
    ),
  );
  const found = mbz.activity("task-1");
  assertWiring(mbz, found, "assign");
  assert.equal(found.module["@_version"], "2022112801");
  const body = found.body.assign;
  assert.equal(body.name, "Relatório final");
  assert.equal(body.grade, "25");
  assert.equal(body.allowsubmissionsfromdate, seconds(opensAt));
  assert.equal(body.duedate, seconds(closesAt));
  assert.equal(body.cutoffdate, seconds(closesAt));
  assert.match(
    body.intro,
    /<li><a href="@@PLUGINFILE@@\/plano%20de%20aula\.pdf">plano de aula\.pdf<\/a><\/li><li><a href="@@PLUGINFILE@@\/rubrica\.xlsx">rubrica\.xlsx<\/a><\/li>/,
  );
  const configs = Object.fromEntries(
    list<{ plugin: string; name: string; value: string; subtype: string }>(
      body.plugin_configs.plugin_config,
    ).map((config) => {
      assert.equal(config.subtype, "assignsubmission");
      return [`${config.plugin}.${config.name}`, config.value];
    }),
  );
  assert.deepEqual(configs, {
    "onlinetext.enabled": "1",
    "file.enabled": "1",
    "file.maxfilesubmissions": "20",
    "file.maxsubmissionsizebytes": "0",
    "file.filetypeslist": "",
  });

  const item = found.grades.grade_items.grade_item;
  assert.equal(item.itemtype, "mod");
  assert.equal(item.itemmodule, "assign");
  assert.equal(item.iteminstance, found.entry.moduleid);
  assert.equal(item.itemname, "Relatório final");
  assert.equal(item.grademax, "25");
  assert.equal(item.itemnumber, "0");
  assert.equal(found.inforef.grade_itemref.grade_item.id, item["@_id"]);
  const root = mbz.xml("gradebook.xml").gradebook.grade_categories.grade_category;
  assert.equal(item.categoryid, list(root)[0]["@_id"]);
  assert.equal(
    mbz.xml(`${found.dir}/grading.xml`).areas.area.areaname,
    "submissions",
  );

  const files = activityFiles(mbz, found.body["@_contextid"]);
  assert.deepEqual(
    files.map((file) => [file.component, file.filearea, file.filename]),
    [
      ["mod_assign", "intro", "plano de aula.pdf"],
      ["mod_assign", "intro", "rubrica.xlsx"],
    ],
  );
  for (const [file, source] of [
    [files[0], plan],
    [files[1], sheet],
  ] as const) {
    assert.equal(file?.contenthash, sha1(source.bytes));
    assert.equal(file?.mimetype, source.ref.mediaType);
    assert.deepEqual(new Uint8Array(file!.stored!), source.bytes);
  }
  assert.deepEqual(
    list(found.inforef.fileref.file)
      .map((ref: { id: string }) => ref.id)
      .sort(),
    files.map((file) => file["@_id"]).sort(),
  );
});

test("modo de envio da tarefa liga só o plugin escolhido", async () => {
  const mbz = await exportMbz(
    draft([
      section("s1", [
        assignment("text-only", { settings: { maxGrade: 10, submissionMode: "text" } }),
        assignment("file-only", { settings: { maxGrade: 10, submissionMode: "file" } }),
      ]),
    ]),
  );
  const enabled = (id: string) =>
    list<{ plugin: string; name: string; value: string }>(
      mbz.activity(id).body.assign.plugin_configs.plugin_config,
    )
      .filter((config) => config.name === "enabled")
      .map((config) => `${config.plugin}=${config.value}`);
  assert.deepEqual(enabled("text-only"), ["onlinetext=1", "file=0"]);
  assert.deepEqual(enabled("file-only"), ["onlinetext=0", "file=1"]);
});

test("quiz exporta tentativas, datas, nota, embaralhamento e as categorias de questões do próprio contexto", async () => {
  const mbz = await exportMbz(
    draft([
      section("s1", [
        {
          id: "quiz-1",
          type: "quiz",
          title: "Quiz da unidade",
          description: "Responda.",
          attachmentIds: [],
          schedule: { opensAt, closesAt },
          settings: { maxGrade: 20, attempts: 3, shuffleQuestions: true },
          questions: [
            {
              id: "q1",
              type: "essay",
              statement: "Explique.",
              feedback: "",
              maxMark: 4,
              settings: {
                responseFormat: "editor",
                responseRequired: true,
                responseLines: 10,
                attachments: 0,
              },
            },
          ],
        },
      ]),
    ]),
  );
  const found = mbz.activity("quiz-1");
  assertWiring(mbz, found, "quiz");
  assert.equal(found.module["@_version"], "2022112800");
  const body = found.body.quiz;
  assert.equal(body.timeopen, seconds(opensAt));
  assert.equal(body.timeclose, seconds(closesAt));
  assert.equal(body.attempts_number, "3");
  assert.equal(body.grade, "20");
  assert.equal(body.sumgrades, "4");
  assert.equal(body.sections.section.shufflequestions, "1");
  assert.equal(body.sections.section.firstslot, "1");
  const item = found.grades.grade_items.grade_item;
  assert.equal(item.itemmodule, "quiz");
  assert.equal(item.grademax, "20");
  assert.equal(found.inforef.grade_itemref.grade_item.id, item["@_id"]);

  const categories = list<Record<string, string>>(
    mbz.xml("questions.xml").question_categories.question_category,
  );
  assert.deepEqual(
    list(found.inforef.question_categoryref.question_category).map(
      (ref: { id: string }) => ref.id,
    ),
    categories.map((category) => category["@_id"]),
  );
  const [top, own] = categories;
  assert.equal(top?.name, "top");
  assert.equal(top?.parent, "0");
  assert.equal(own?.name, "Quiz da unidade");
  assert.equal(own?.parent, top?.["@_id"]);
  for (const category of categories) {
    assert.equal(category.contextid, found.body["@_contextid"]);
    assert.equal(category.contextlevel, "70");
    assert.equal(category.contextinstanceid, found.entry.moduleid);
  }
});

test("chat exporta sessão, repetição e retenção sem item de nota", async () => {
  const sessionAt = "2026-11-03T22:00:00Z";
  const chat = (id: string, repeat: "none" | "daily" | "weekly", at?: string) => ({
    id,
    type: "chat" as const,
    title: `Chat ${id}`,
    description: "Plantão de dúvidas.",
    attachmentIds: [],
    settings: { repeat, keepDays: 30, ...(at ? { sessionAt: at } : {}) },
  });
  const mbz = await exportMbz(
    draft([
      section("s1", [
        chat("once", "none", sessionAt),
        chat("daily", "daily", sessionAt),
        chat("weekly", "weekly", sessionAt),
        chat("unscheduled", "none"),
      ]),
    ]),
  );
  const found = mbz.activity("once");
  assertWiring(mbz, found, "chat");
  assert.equal(found.module["@_version"], "2022112800");
  assert.equal(found.body.chat.keepdays, "30");
  assert.equal(found.body.chat.chattime, seconds(sessionAt));
  assert.equal(found.body.chat.studentlogs, "0");
  assert.equal(found.grades.grade_items, "");
  assert.equal(found.inforef.grade_itemref, undefined);
  // mod_chat: 0 = do not publish times, 1 = publish the session once, 2 = daily, 3 = weekly.
  const schedule = (id: string) => mbz.activity(id).body.chat.schedule;
  assert.equal(schedule("once"), "1");
  assert.equal(schedule("daily"), "2");
  assert.equal(schedule("weekly"), "3");
  assert.equal(schedule("unscheduled"), "0");
  assert.equal(mbz.activity("unscheduled").body.chat.chattime, "0");
});

test("wiki exporta modo, primeira página e formato HTML", async () => {
  const mbz = await exportMbz(
    draft([
      section("s1", [
        {
          id: "wiki-1",
          type: "wiki",
          title: "Wiki da turma",
          description: "Construa o glossário coletivo.",
          attachmentIds: [],
          settings: { mode: "individual", firstPageTitle: "Página inicial" },
        },
      ]),
    ]),
  );
  const found = mbz.activity("wiki-1");
  assertWiring(mbz, found, "wiki");
  const body = found.body.wiki;
  assert.equal(body.name, "Wiki da turma");
  assert.equal(body.wikimode, "individual");
  assert.equal(body.firstpagetitle, "Página inicial");
  assert.equal(body.defaultformat, "html");
  assert.equal(body.forceformat, "1");
  assert.equal(body.subwikis, "");
  assert.equal(found.grades.grade_items, "");
});

test("glossário exporta entradas editoriais, imagem da definição e configurações", async () => {
  const figure = attachment("fig", "celula.png", "PNG celula", "image/png");
  const mbz = await exportMbz(
    draft(
      [
        section("s1", [
          {
            id: "glossary-1",
            type: "glossary",
            title: "Glossário",
            description: "Termos da unidade.",
            attachmentIds: [],
            settings: { allowDuplicates: true, requireApproval: true, entriesPerPage: 15 },
            entries: [
              { id: "e1", concept: "Célula", definition: "Unidade da vida.", definitionBlocks: [
                { id: "b1", kind: "text", text: "Unidade da vida." },
                { id: "b2", kind: "image", attachmentId: "fig", alt: "Célula animal" },
              ] },
              { id: "e2", concept: "Tecido", definition: "Conjunto de células." },
            ],
          },
        ]),
      ],
      [figure],
    ),
  );
  const found = mbz.activity("glossary-1");
  assertWiring(mbz, found, "glossary");
  const body = found.body.glossary;
  assert.equal(body.allowduplicatedentries, "1");
  assert.equal(body.defaultapproval, "0");
  assert.equal(body.entbypage, "15");
  assert.equal(body.displayformat, "dictionary");
  const entries = list<Record<string, string>>(body.entries.entry);
  assert.deepEqual(
    entries.map((entry) => [entry.concept, entry.approved, entry.teacherentry, entry.userid]),
    [
      ["Célula", "1", "1", "0"],
      ["Tecido", "1", "1", "0"],
    ],
  );
  assert.equal(
    entries[0]?.definition,
    '<p>Unidade da vida.</p><img src="@@PLUGINFILE@@/celula.png" alt="Célula animal" style="max-width:100%;height:auto">',
  );
  assert.equal(entries[1]?.definition, "<p>Conjunto de células.</p>");
  const [image] = activityFiles(mbz, found.body["@_contextid"]);
  assert.equal(image?.component, "mod_glossary");
  assert.equal(image?.filearea, "entry");
  assert.equal(image?.itemid, entries[0]?.["@_id"]);
  assert.equal(image?.contenthash, sha1(figure.bytes));
  assert.equal(mbz.setting(`glossary_${found.entry.moduleid}_userinfo`), "1");
  assert.ok(mbz.archive.has("users.xml"));
});

test("glossário vazio não pede informação de usuário na restauração", async () => {
  const mbz = await exportMbz(
    draft([
      section("s1", [
        {
          id: "glossary-1",
          type: "glossary",
          title: "Glossário",
          description: "",
          attachmentIds: [],
          settings: { allowDuplicates: false, requireApproval: false, entriesPerPage: 10 },
          entries: [],
        },
      ]),
    ]),
  );
  const found = mbz.activity("glossary-1");
  assert.equal(found.body.glossary.defaultapproval, "1");
  assert.equal(found.body.glossary.entries, "");
  assert.equal(mbz.setting("users"), "0");
  assert.equal(mbz.setting(`glossary_${found.entry.moduleid}_userinfo`), "0");
  assert.equal(mbz.archive.has("users.xml"), false);
  assert.equal(
    mbz.result.ok && mbz.result.warnings.some((w) => w.code === "glossary_restore_setting"),
    false,
  );
});
