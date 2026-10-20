// Date editing against core-markup fixtures: course/view.php targets, modedit/editsection forms, preview and readback.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MoodleClient } from "../../src/server/moodle/client.ts";
import { confirmDates, previewDates, readCourse } from "../../src/server/moodle/dates.ts";
import { createMoodleApi } from "../../src/server/moodle/api.ts";
import { BASE, coreSite, formValues, type CoreSiteOptions } from "./core-site.ts";

const input = {
  startDate: "2030-01-07",
  unitCount: 2,
  daysPerUnit: 7,
  opensAtTime: "08:00",
  closesAtTime: "23:59",
  timezoneOffsetMinutes: -180,
};
const seconds = (iso: string) => Date.parse(iso) / 1000;
const code = (expected: string) => (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === expected;
function setup(options: CoreSiteOptions = {}) {
  const site = coreSite(options);
  return { site, client: new MoodleClient(BASE, { fetch: site.fetch }) };
}
const editPosts = (site: ReturnType<typeof coreSite>) =>
  site.posts().filter((request) => /\/course\/(modedit|editsection)\.php/.test(request.path));
const expectedTargets = (topic2: string) => [
  ["section:22", "section", 0, "Unidade 1 — Ligações"],
  ["module:61", "forum", 0, "Fórum da unidade"],
  ["module:62", "assignment", 0, "Relatório & análise"],
  ["section:23", "section", 1, topic2],
  ["module:63", "quiz", 1, "Quiz 1"],
];

test("course/view.php do Boost 4.1 vira seções e atividades com IDs, unidade e títulos limpos", async () => {
  const { site, client } = setup();
  const course = await readCourse(client, 4);
  assert.deepEqual(course.course, { id: 4, title: "Laboratório de Química" });
  assert.deepEqual(
    course.targets.map((target) => [target.id, target.kind, target.sectionIndex, target.title]),
    expectedTargets("Topic 2"),
  );
  assert.deepEqual(
    course.issues.map((issue) => issue.code),
    ["unsupported_date_type", "preserved_cutoff"],
  );
  assert.match(course.issues[0]!.message, /64 \(label\)/);
  // User timezone 99 means "server timezone": the site setting is read.
  assert.equal(course.timezone, "America/Sao_Paulo");
  assert.equal(site.posts().length, 0);
  const byId = new Map(course.targets.map((target) => [target.id, target]));
  assert.equal(byId.get("module:62")?.opensAt, "2026-03-02T03:00:00.000Z");
  assert.equal(byId.get("module:62")?.closesAt, "2026-03-10T02:59:00.000Z");
  assert.equal(byId.get("module:63")?.opensAt, "2026-03-09T11:00:00.000Z");
  assert.equal(byId.get("module:63")?.closesAt, undefined);
  assert.equal(byId.get("module:61")?.opensAt, new Date(1772452800 * 1000).toISOString());
  assert.equal(byId.get("section:22")?.availability, "");
});

test("a mesma leitura vale para o pacote pt_br e para o markup antigo li#section-N", async () => {
  for (const [courseView, topic2] of [
    ["course-view.boost-4.1.pt_br.html", "Tópico 2"],
    ["course-view.legacy-sections.html", "Topic 2"],
  ] as const) {
    const { client } = setup({ courseView });
    const course = await readCourse(client, 4);
    assert.deepEqual(
      course.targets.map((target) => [target.id, target.kind, target.sectionIndex, target.title]),
      expectedTargets(topic2),
      courseView,
    );
    assert.deepEqual(course.issues.map((issue) => issue.code), ["unsupported_date_type", "preserved_cutoff"]);
  }
});

test("seções do Moodle 3.11 sem data-id são apontadas e nada é enviado", async () => {
  const { site, client } = setup({ courseView: "course-view.moodle-3.11.html" });
  const course = await readCourse(client, 4);
  assert.deepEqual(course.targets, []);
  assert.deepEqual(course.issues.map((issue) => issue.code), ["unsupported_section"]);
  await assert.rejects(previewDates(client, 4, input), code("invalid_date_plan"));
  assert.equal(site.posts().length, 0);
});

test("prévia mostra antes e depois de cada alvo e não envia nada", async () => {
  const { site, client } = setup();
  const preview = await previewDates(client, 4, input);
  assert.match(preview.hash, /^[a-f0-9]{64}$/);
  assert.equal(editPosts(site).length, 0);
  const changes = new Map(preview.plan.changes.map((change) => [change.id, change]));
  const unit1 = { opensAt: "2030-01-07T11:00:00.000Z", closesAt: "2030-01-14T02:59:00.000Z" };
  const unit2 = { opensAt: "2030-01-14T11:00:00.000Z", closesAt: "2030-01-21T02:59:00.000Z" };

  const section = changes.get("section:22")!;
  assert.deepEqual(section.before, { availability: "" });
  assert.equal(section.after.opensAt, unit1.opensAt);
  assert.equal(section.after.closesAt, undefined);
  assert.deepEqual(JSON.parse(String(section.after.availability)), {
    op: "&",
    c: [{ type: "date", d: ">=", t: seconds(unit1.opensAt) }],
    showc: [false],
  });

  const forum = changes.get("module:61")!;
  assert.equal(forum.before.opensAt, new Date(1772452800 * 1000).toISOString());
  assert.deepEqual({ opensAt: forum.after.opensAt, closesAt: forum.after.closesAt }, unit1);
  // The group condition and its visibility flag stay as they were.
  assert.deepEqual(JSON.parse(String(forum.after.availability)), {
    op: "&",
    c: [
      { type: "group", id: 3 },
      { type: "date", d: ">=", t: seconds(unit1.opensAt) },
      { type: "date", d: "<", t: seconds(unit1.closesAt) },
    ],
    showc: [true, false, false],
  });

  const assign = changes.get("module:62")!;
  assert.deepEqual(
    { opensAt: assign.before.opensAt, closesAt: assign.before.closesAt },
    { opensAt: "2026-03-02T03:00:00.000Z", closesAt: "2026-03-10T02:59:00.000Z" },
  );
  assert.deepEqual({ opensAt: assign.after.opensAt, closesAt: assign.after.closesAt }, unit1);

  const quiz = changes.get("module:63")!;
  assert.deepEqual({ opensAt: quiz.before.opensAt, closesAt: quiz.before.closesAt }, { opensAt: "2026-03-09T11:00:00.000Z", closesAt: undefined });
  assert.deepEqual({ opensAt: quiz.after.opensAt, closesAt: quiz.after.closesAt }, unit2);
  assert.equal(changes.get("section:23")?.after.opensAt, unit2.opensAt);
});

test("confirmação grava as datas nos formulários, confere por releitura e preserva os demais campos", async () => {
  const { site, client } = setup();
  const before = new Map([...site.forms].map(([key, html]) => [key, formValues(html)]));
  const preview = await previewDates(client, 4, input);
  const result = await confirmDates(client, preview.operation);
  assert.deepEqual(result.counts, { applied: 5, error: 0, unknown: 0, not_applied: 0 });
  assert.equal(result.partial, false);
  assert.deepEqual(
    editPosts(site).map((request) => (request.body as URLSearchParams).get(request.path.includes("editsection") ? "id" : "update")),
    ["22", "61", "62", "23", "63"],
  );
  for (const request of editPosts(site)) {
    const body = request.body as URLSearchParams;
    assert.equal(body.get("submitbutton") !== null, true);
    assert.equal(body.has("cancel"), false);
    assert.equal(body.get("sesskey"), "aB3dE5fG7h");
  }

  const quiz = formValues(site.forms.get("module:63")!);
  assert.deepEqual(
    ["day", "month", "year", "hour", "minute", "enabled"].map((part) => quiz[`timeopen[${part}]`]),
    ["14", "1", "2030", "8", "0", "1"],
  );
  assert.deepEqual(
    ["day", "month", "year", "hour", "minute", "enabled"].map((part) => quiz[`timeclose[${part}]`]),
    ["20", "1", "2030", "23", "59", "1"],
  );
  const assign = formValues(site.forms.get("module:62")!);
  assert.deepEqual(
    ["day", "month", "hour", "minute"].map((part) => assign[`allowsubmissionsfromdate[${part}]`]),
    ["7", "1", "8", "0"],
  );
  assert.deepEqual(["day", "hour", "minute"].map((part) => assign[`duedate[${part}]`]), ["13", "23", "59"]);
  const forum = formValues(site.forms.get("module:61")!);
  assert.deepEqual(JSON.parse(forum["availabilityconditionsjson"]!).c[0], { type: "group", id: 3 });

  // Every field outside the planned dates and restrictions is still what Moodle had.
  const planned: Record<string, RegExp> = {
    "section:22": /^availabilityconditionsjson$/,
    "section:23": /^availabilityconditionsjson$/,
    "module:61": /^availabilityconditionsjson$/,
    "module:62": /^(allowsubmissionsfromdate|duedate)\[|^availabilityconditionsjson$/,
    "module:63": /^(timeopen|timeclose)\[|^availabilityconditionsjson$/,
  };
  // Draft area ids are renewed by Moodle on every edit page; the files they point to are the same.
  const volatile = /\[itemid\]$|^introattachments$|^filemanager_sebconfigfile$/;
  const stable = (value: string | undefined) => value?.replace(/\/user\/draft\/\d+\//g, "/user/draft/ID/");
  for (const [key, original] of before) {
    const after = formValues(site.forms.get(key)!);
    for (const [name, value] of Object.entries(original))
      if (!planned[key]!.test(name) && !volatile.test(name))
        assert.equal(stable(after[name]), stable(value), `${key} ${name}`);
  }
  assert.equal(formValues(site.forms.get("module:62")!)["cutoffdate[day]"], "16");
  assert.equal(formValues(site.forms.get("module:62")!)["gradingduedate[enabled]"], undefined);
  assert.equal(quiz["quizpassword"], "segredo-lab");
  assert.equal(quiz["correctnessimmediately"], undefined);
  assert.match(assign["introeditor[text]"]!, /diagrama\.png/);
});

test("o fuso do próprio usuário Moodle define os seletores nativos", async () => {
  const { site, client } = setup({ userTimezone: "Europe/Lisbon" });
  const preview = await previewDates(client, 4, input);
  await confirmDates(client, preview.operation);
  // 2030-01-14T11:00Z is 11:00 in Lisbon (UTC+0 in January).
  assert.equal(formValues(site.forms.get("module:63")!)["timeopen[hour]"], "11");
  assert.equal(site.requests.some((request) => request.path.startsWith("/admin/settings.php")), false);
});

test("mudança feita no Moodle depois da prévia recusa o envio, antes do primeiro alvo ou no alvo afetado", async () => {
  const early = setup();
  const preview = await previewDates(early.client, 4, input);
  early.site.forms.set("module:62", early.site.forms.get("module:62")!.replace('id="id_grade_modgrade_point" value="25"', 'id="id_grade_modgrade_point" value="30"'));
  await assert.rejects(confirmDates(early.client, preview.operation), code("moodle_state_changed"));
  assert.equal(editPosts(early.site).length, 0);

  const late = setup({
    afterPost: (key, site) => {
      if (key === "section:22") site.forms.set("module:61", site.forms.get("module:61")!.replace('value="Fórum da unidade"', 'value="Fórum renomeado"'));
    },
  });
  const plan = await previewDates(late.client, 4, input);
  const result = await confirmDates(late.client, plan.operation);
  assert.deepEqual(result.results.map((item) => [item.id, item.status]), [
    ["section:22", "applied"],
    ["module:61", "not_applied"],
    ["module:62", "not_applied"],
    ["section:23", "not_applied"],
    ["module:63", "not_applied"],
  ]);
  assert.equal(editPosts(late.site).length, 1);
  assert.equal(formValues(late.site.forms.get("module:61")!)["name"], "Fórum renomeado");
});

test("campo que o Moodle não salvou aparece como incerto e interrompe os próximos alvos", async () => {
  const { site, client } = setup({ ignore: ["duedate[day]"] });
  const preview = await previewDates(client, 4, input);
  const result = await confirmDates(client, preview.operation);
  assert.deepEqual(result.results.map((item) => [item.id, item.status]), [
    ["section:22", "applied"],
    ["module:61", "applied"],
    ["module:62", "unknown"],
    ["section:23", "not_applied"],
    ["module:63", "not_applied"],
  ]);
  assert.equal(result.partial, true);
  assert.equal(editPosts(site).length, 3);
});

test("sessão que expira antes ou durante a confirmação nunca vira datas aplicadas", async () => {
  const before = setup();
  const preview = await previewDates(before.client, 4, input);
  before.site.expire();
  await assert.rejects(confirmDates(before.client, preview.operation), code("session_expired"));
  assert.equal(editPosts(before.site).length, 0);

  const during = setup({ afterPost: (key, site) => key === "section:22" && site.expire() });
  const plan = await previewDates(during.client, 4, input);
  const result = await confirmDates(during.client, plan.operation);
  assert.deepEqual(result.counts, { applied: 0, error: 0, unknown: 1, not_applied: 4 });
  assert.equal(editPosts(during.site).length, 1);
});

test("rota: curso lido do Moodle e prévia de datas pela API, com sessão expirada respondendo 401", async () => {
  const site = coreSite();
  const api = createMoodleApi({ url: BASE, profile: "moodle-4.1.17-lab-ops-v1", fetch: site.fetch });
  const post = (path: string, body: unknown, cookie?: string) =>
    new Request(`http://app.local/api/moodle/${path}`, {
      method: "POST",
      headers: { origin: "http://app.local", "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    });
  const login = await api(post("login", { username: "lab-admin", password: "fictitious" }), "login");
  const cookie = login.headers.get("set-cookie")!.split(";")[0]!;
  const course = await api(new Request("http://app.local/api/moodle/course?courseId=4", { headers: { cookie } }), "course");
  assert.equal(course.status, 200);
  const body = await course.json();
  assert.equal(body.course.title, "Laboratório de Química");
  assert.equal(body.targets.length, 5);
  assert.doesNotMatch(JSON.stringify(body), /segredo-lab|aB3dE5fG7h/);
  const preview = await api(post("dates/preview", { courseId: 4, input }, cookie), "datesPreview");
  assert.equal(preview.status, 200);
  assert.equal((await preview.json()).plan.changes.length, 5);
  site.expire();
  const expired = await api(new Request("http://app.local/api/moodle/course?courseId=4", { headers: { cookie } }), "course");
  assert.equal(expired.status, 401);
  assert.equal(editPosts(site).length, 0);
});
