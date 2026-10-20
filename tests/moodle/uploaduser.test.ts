// Student upload through admin/tool/uploaduser against core-markup fixtures (Moodle 4.1, Boost).
import { test } from "node:test";
import assert from "node:assert/strict";
import { MoodleClient } from "../../src/server/moodle/client.ts";
import { confirmStudents, previewStudents } from "../../src/server/moodle/students.ts";
import { createMoodleApi } from "../../src/server/moodle/api.ts";
import { buildStudentPreview, type StudentOptions, type StudentRow } from "../../src/domain/students/index.ts";
import { BASE, coreSite, type CoreSiteOptions } from "./core-site.ts";

const student = (rowNumber: number, name: string, course = ""): StudentRow => ({
  id: `row-${rowNumber}`,
  rowNumber,
  original: {},
  username: `lab-${name.toLowerCase()}`,
  firstName: name,
  lastName: name === "Ana" || name === "Bia" ? "Fictícia" : "Fictício",
  email: `${name.toLowerCase()}@example.invalid`,
  cpf: "",
  course,
});
const batch = (course = "") => ["Ana", "Bia", "Caio", "Davi"].map((name, index) => student(index + 2, name, course));
const code = (expected: string) => (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === expected;

async function preview(rows: StudentRow[], options: StudentOptions, siteOptions: CoreSiteOptions = {}) {
  const site = coreSite(siteOptions);
  const client = new MoodleClient(BASE, { fetch: site.fetch });
  const reviewed = await buildStudentPreview(rows, options);
  assert.ok(reviewed.ok);
  const result = await previewStudents(client, rows, options, reviewed.preview.hash);
  return { site, client, reviewed: reviewed.preview, result };
}
const uploadPosts = (site: ReturnType<typeof coreSite>) =>
  site.posts().filter((request) => request.path === "/admin/tool/uploaduser/index.php");
const confirmPosts = (site: ReturnType<typeof coreSite>) =>
  uploadPosts(site).filter((request) => request.body instanceof URLSearchParams && request.body.has("uutype"));

test("prévia envia o CSV revisado pelo repositório de upload e lê #uupreview sem criar contas", async () => {
  const { site, reviewed, result } = await preview(batch(), { mode: "create", enrol: false });
  assert.deepEqual(site.uploads, [reviewed.csv]);
  const upload = site.posts().find((request) => request.path.startsWith("/repository/repository_ajax.php"))!;
  assert.ok(upload.body instanceof FormData);
  // The repository comes from the filepicker configuration ("upload" type), never from a guess.
  assert.equal(upload.body.get("repo_id"), "6");
  assert.equal(upload.body.get("itemid"), "384211077");
  assert.equal(upload.body.get("sesskey"), "aB3dE5fG7h");
  assert.equal(upload.body.get("env"), "filepicker");
  const [first] = uploadPosts(site);
  assert.ok(first?.body instanceof URLSearchParams);
  assert.deepEqual(
    ["userfile", "delimiter_name", "encoding", "previewrows", "_qf__admin_uploaduser_form1", "submitbutton"].map((name) =>
      (first.body as URLSearchParams).get(name),
    ),
    ["384211077", "comma", "UTF-8", "100000", "1", "Upload users"],
  );
  assert.equal(confirmPosts(site).length, 0);
  assert.deepEqual(
    result.rows.map((row) => [row.username, row.name, row.status]),
    [
      ["lab-ana", "Ana Fictícia", "Revisado; nenhuma conta criada nesta prévia."],
      ["lab-bia", "Bia Fictícia", "Revisado; nenhuma conta criada nesta prévia."],
      ["lab-caio", "Caio Fictício", "Moodle informou pendência nesta linha. Revise antes de confirmar."],
      ["lab-davi", "Davi Fictício", "Revisado; nenhuma conta criada nesta prévia."],
    ],
  );
  // Moodle's own text (with another user's name) is not echoed back.
  assert.doesNotMatch(JSON.stringify(result.rows), /lab-zeca|already in use/);
  assert.deepEqual(result.effectiveOptions.defaults, {
    auth: "manual",
    maildisplay: "2",
    emailstop: "0",
    mailformat: "1",
    maildigest: "0",
    autosubscribe: "1",
    city: "",
    country: "",
    timezone: "99",
    lang: "en",
    "description_editor[text]": "",
    "description_editor[format]": "1",
    institution: "",
    department: "",
  });
});

test("modo criação força opções seguras no segundo formulário, mesmo contra os padrões do site", async () => {
  const { result } = await preview(batch(), { mode: "create", enrol: false });
  const fields = result.operation.form.fields;
  assert.deepEqual(
    Object.fromEntries(
      ["uutype", "uupasswordnew", "uuupdatetype", "uupasswordold", "uumatchemail", "uuallowrenames", "uuallowdeletes", "uuallowsuspends", "uubulk", "uustandardusernames", "uunoemailduplicates", "uuforcepasswordchange"].map((name) => [name, fields.get(name)]),
    ),
    {
      uutype: "0",
      uupasswordnew: "1",
      uuupdatetype: "0",
      uupasswordold: "0",
      uumatchemail: "0",
      uuallowrenames: "0",
      uuallowdeletes: "0",
      uuallowsuspends: "0", // the fixture site defaults to "1"
      uubulk: "0",
      uustandardusernames: "0", // the fixture site defaults to "1"
      uunoemailduplicates: "1",
      uuforcepasswordchange: "0", // the fixture site defaults to "1"
    },
  );
  assert.equal(result.effectiveOptions.newPassword, "generated-by-moodle-and-email");
  const update = await preview(batch(), { mode: "update", enrol: false });
  assert.equal(update.result.operation.form.fields.get("uutype"), "3");
  assert.equal(update.result.operation.form.fields.get("uuupdatetype"), "1");
  assert.equal(update.result.effectiveOptions.newPassword, "not-created");
});

test("linha revisada que não aparece na prévia do Moodle impede a confirmação", async () => {
  const rows = [...batch(), student(6, "Eva")];
  const site = coreSite();
  const client = new MoodleClient(BASE, { fetch: site.fetch });
  const reviewed = await buildStudentPreview(rows, { mode: "create", enrol: false });
  assert.ok(reviewed.ok);
  await assert.rejects(previewStudents(client, rows, { mode: "create", enrol: false }, reviewed.preview.hash), code("moodle_preview_mismatch"));
  assert.equal(confirmPosts(site).length, 0);
});

test("confirmação de criação lê #uuresults por linha: criado, aviso vira erro e linha ausente fica desconhecida", async () => {
  const { site, client, result } = await preview(batch(), { mode: "create", enrol: false });
  const confirmed = await confirmStudents(client, result.operation);
  assert.deepEqual(
    confirmed.rows.map((row) => [row.username, row.status]),
    [
      ["lab-ana", "created"],
      ["lab-bia", "error"], // "User not added - already registered"
      ["lab-caio", "error"], // created, but with an enrolment warning
      ["lab-davi", "unknown"], // no row in the results table
    ],
  );
  assert.deepEqual(confirmed.counts, { created: 1, updated: 0, error: 2, unknown: 1 });
  assert.doesNotMatch(JSON.stringify(confirmed), /already registered|LAB2|lab-zeca/);
  const [post] = confirmPosts(site);
  assert.ok(post?.body instanceof URLSearchParams);
  assert.equal(post.body.get("iid"), "1029384756");
  assert.equal(post.body.get("submitbutton"), "Upload users");
  assert.equal(post.body.has("cancel"), false);
  assert.equal(post.body.get("uutype"), "0");
});

test("formulário reexibido sem #uuresults marca o lote inteiro como erro", async () => {
  const { client, result } = await preview(batch(), { mode: "create", enrol: false }, { results: "uploaduser-preview.html" });
  const confirmed = await confirmStudents(client, result.operation);
  assert.deepEqual(confirmed.counts, { created: 0, updated: 0, error: 4, unknown: 0 });
});

test("sessão expirada antes da prévia é diagnosticada; depois do envio nenhum aluno é dado como criado", async () => {
  const site = coreSite();
  site.expire();
  const client = new MoodleClient(BASE, { fetch: site.fetch });
  const rows = batch();
  const reviewed = await buildStudentPreview(rows, { mode: "create", enrol: false });
  assert.ok(reviewed.ok);
  await assert.rejects(previewStudents(client, rows, { mode: "create", enrol: false }, reviewed.preview.hash), code("session_expired"));
  assert.deepEqual(site.uploads, []);

  const later = await preview(rows, { mode: "create", enrol: false });
  later.site.expire();
  const confirmed = await confirmStudents(later.client, later.result.operation);
  assert.deepEqual(confirmed.counts, { created: 0, updated: 0, error: 0, unknown: 4 });
});

test("matrícula usa o único método manual ativo com papel student e o CSV leva course1", async () => {
  const { site, reviewed, result } = await preview(batch("LAB"), { mode: "create", enrol: true });
  assert.deepEqual(result.effectiveOptions.enrolments, [
    { courseId: 4, shortName: "LAB", enrolId: 13, method: "manual", roleId: 5, role: "student", durationSeconds: 0, expiryNotify: false },
  ]);
  assert.match(site.uploads[0]!, /^username,firstname,lastname,email,idnumber,course1\r\n/);
  assert.equal(site.uploads[0], reviewed.csv);
  // Course 9 is a search candidate too, but only the exact short name is accepted.
  assert.deepEqual(
    site.requests.filter((request) => request.path.startsWith("/course/edit.php")).map((request) => request.path),
    ["/course/edit.php?id=4"],
  );
  assert.ok(
    site.requests
      .filter((request) => /^\/(course\/(search|edit)\.php|enrol\/|admin\/roles\/)/.test(request.path))
      .every((request) => request.method === "GET"),
  );
});

test("matrícula recusa curso não encontrado e método manual desativado antes de enviar o CSV", async () => {
  for (const [options, expected] of [
    [{ shortNames: { "4": "LAB-ANTIGO", "9": "LAB-AVANCADO" } }, "enrol_course_missing"],
    [{ enrolDisabled: true }, "manual_enrol_disabled"],
  ] as const) {
    const site = coreSite(options);
    const client = new MoodleClient(BASE, { fetch: site.fetch });
    const rows = batch("LAB");
    const reviewed = await buildStudentPreview(rows, { mode: "create", enrol: true });
    assert.ok(reviewed.ok);
    await assert.rejects(previewStudents(client, rows, { mode: "create", enrol: true }, reviewed.preview.hash), code(expected));
    assert.deepEqual(site.uploads, []);
  }
});

test("matrícula alterada no Moodle entre a prévia e a confirmação bloqueia o envio", async () => {
  const siteOptions: CoreSiteOptions = {};
  const { site, client, result } = await preview(batch("LAB"), { mode: "create", enrol: true }, siteOptions);
  siteOptions.enrolDisabled = true;
  await assert.rejects(confirmStudents(client, result.operation), code("manual_enrol_disabled"));
  siteOptions.enrolDisabled = false;
  siteOptions.shortNames = { "4": "LAB-ANTIGO", "9": "LAB" };
  await assert.rejects(confirmStudents(client, result.operation), code("moodle_state_changed"));
  assert.equal(confirmPosts(site).length, 0);
});

function api(site: ReturnType<typeof coreSite>, now: () => number = Date.now) {
  return createMoodleApi({ url: BASE, profile: "moodle-4.1.17-lab-ops-v1", fetch: site.fetch, now });
}
const post = (path: string, body: unknown, cookie?: string) =>
  new Request(`http://app.local/api/moodle/${path}`, {
    method: "POST",
    headers: { origin: "http://app.local", "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
async function signedIn(handler: ReturnType<typeof api>) {
  const login = await handler(post("login", { username: "lab-admin", password: "fictitious" }), "login");
  assert.equal(login.status, 200);
  return login.headers.get("set-cookie")!.split(";")[0]!;
}
async function previewRequest(handler: ReturnType<typeof api>, cookie: string) {
  const rows = batch();
  const reviewed = await buildStudentPreview(rows, { mode: "create", enrol: false });
  assert.ok(reviewed.ok);
  return handler(post("students/preview", { rows, options: { mode: "create", enrol: false }, expectedHash: reviewed.preview.hash }, cookie), "studentsPreview");
}

test("rota: sessão Moodle expirada na prévia responde 401 e descarta a sessão local", async () => {
  const site = coreSite();
  const handler = api(site);
  const cookie = await signedIn(handler);
  site.expire();
  const response = await previewRequest(handler, cookie);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).issues[0].code, "session_expired");
  const next = await handler(new Request("http://app.local/api/moodle/courses", { headers: { cookie } }), "courses");
  assert.equal(next.status, 401);
  assert.equal((await next.json()).issues[0].code, "authentication_required");
});

test("rota: prévia expirada, de outro tipo ou além do limite não chega a enviar ao Moodle", async () => {
  let now = 0;
  const site = coreSite();
  const handler = api(site, () => now);
  const cookie = await signedIn(handler);
  const first = await (await previewRequest(handler, cookie)).json();
  const confirm = { previewId: first.previewId, expectedHash: first.hash, confirmation: true };
  const asDates = await handler(post("dates/confirm", confirm, cookie), "datesConfirm");
  assert.equal(asDates.status, 409);
  now = 10 * 60_000 + 1;
  const expired = await handler(post("students/confirm", confirm, cookie), "studentsConfirm");
  assert.equal(expired.status, 409);
  assert.equal((await expired.json()).issues[0].code, "stale_preview");
  assert.equal(confirmPosts(site).length, 0);
  for (let index = 0; index < 4; index++) assert.equal((await previewRequest(handler, cookie)).status, 200);
  const limited = await previewRequest(handler, cookie);
  assert.equal(limited.status, 409);
  assert.equal((await limited.json()).issues[0].code, "preview_limit");
});
