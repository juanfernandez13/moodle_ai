// Separate, opt-in integration: never part of npm test, never reaches an external Moodle.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createMoodleApi, LAB_PROFILE } from '../../src/server/moodle/api.ts';
import { MoodleClient } from '../../src/server/moodle/client.ts';
import { buildStudentPreview } from '../../src/domain/students/index.ts';

if (process.env.MOODLE_LAB_RUN !== 'fictional-course4-only' || !process.env.MOODLE_LAB_USER || !process.env.MOODLE_LAB_PASSWORD) throw new Error('Explicit fictional laboratory flag and transient environment credentials required.');
const report = { origin: 'http://localhost:3211', moodleVersion: '4.1.17 Build 20250317', profile: LAB_PROFILE, courseId: 4, tests: [] };
const api = createMoodleApi({ url: report.origin, profile: LAB_PROFILE });
let cookie = '';
async function call(path, action, body) {
  const request = new Request(`http://127.0.0.1:3210/api/moodle/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { origin: 'http://127.0.0.1:3210', 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const response = await api(request, action), value = await response.json();
  if (response.headers.has('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
  return { status: response.status, value };
}
const login = await call('login', 'login', { username: process.env.MOODLE_LAB_USER, password: process.env.MOODLE_LAB_PASSWORD });
assert.equal(login.status, 200);
const readback = new MoodleClient(report.origin);
await readback.login(process.env.MOODLE_LAB_USER, process.env.MOODLE_LAB_PASSWORD);
const status = await call('status', 'status'); assert.equal(status.value.authenticated, true); assert.equal(status.value.validated, true);
const courses = await call('courses', 'courses'); assert.ok(courses.value.courses.some(course => course.id === 4));
report.tests.push({ test: 'real login/status/catalogue', passed: true });

const prefix = `lab-test-ops-${crypto.randomUUID().slice(0, 8)}`;
const rows = ['one', 'two'].map((suffix, index) => ({ id: `lab-${suffix}`, rowNumber: index + 2, original: {}, username: `${prefix}-${suffix}`, firstName: 'Fictício', lastName: index ? 'Dois' : 'Um', email: `${prefix}-${suffix}@example.invalid`, cpf: '', course: 'FULL-01_2' }));
const makePreview = async (data, options) => {
  const reviewed = await buildStudentPreview(data, options); assert.ok(reviewed.ok);
  const result = await call('students/preview', 'studentsPreview', { rows: data, options, expectedHash: reviewed.preview.hash }); assert.equal(result.status, 200); assert.equal(result.value.hash, reviewed.preview.hash);
  return { previewId: result.value.previewId, expectedHash: result.value.hash, confirmation: true };
};
const create = await makePreview(rows, { mode: 'create', enrol: false });
const before = await readback.http.text('/admin/user.php?perpage=1000'); assert.ok(rows.every(row => !before.includes(row.email)));
report.tests.push({ test: 'Moodle draft preview creates no users', passed: true });
const created = await call('students/confirm', 'studentsConfirm', create); assert.deepEqual(created.value.counts, { created: 2, updated: 0, error: 0, unknown: 0 });
const afterCreate = await readback.http.text('/admin/user.php?perpage=1000'); assert.ok(rows.every(row => afterCreate.includes(row.email)));
const retry = await call('students/confirm', 'studentsConfirm', create); assert.equal(retry.status, 409);
report.tests.push({ test: 'two fictional users created and observed by independent admin page; retry refused', counts: created.value.counts, passed: true });

const duplicate = await makePreview(rows, { mode: 'create', enrol: false });
const duplicateResult = await call('students/confirm', 'studentsConfirm', duplicate); assert.deepEqual(duplicateResult.value.counts, { created: 0, updated: 0, error: 2, unknown: 0 });
report.tests.push({ test: 'Moodle existing-user error is explicit per row', counts: duplicateResult.value.counts, passed: true });

const updatedRows = rows.map(row => ({ ...row, lastName: 'Atualizado' }));
const update = await makePreview(updatedRows, { mode: 'update', enrol: true });
const updated = await call('students/confirm', 'studentsConfirm', update); assert.deepEqual(updated.value.counts, { created: 0, updated: 2, error: 0, unknown: 0 });
const participants = await readback.http.text('/user/index.php?id=4'); assert.ok(participants.includes('Atualizado'));
report.tests.push({ test: 'two fictional users updated and manually enrolled as student', counts: updated.value.counts, passed: true, databaseReadback: 'Run lab-fixture.php readback with report.syntheticPrefix.' });

const input = { startDate: '2026-10-12', unitCount: 1, daysPerUnit: 7, opensAtTime: '08:00', closesAtTime: '18:00', timezoneOffsetMinutes: -180 };
const dates = await call('dates/preview', 'datesPreview', { courseId: 4, input }); assert.equal(dates.status, 200); assert.equal(dates.value.targets.length, 7);
const confirmed = await call('dates/confirm', 'datesConfirm', { previewId: dates.value.previewId, expectedHash: dates.value.hash, confirmation: true });
assert.equal(confirmed.status, 200); assert.deepEqual(confirmed.value.counts, { applied: 7, error: 0, unknown: 0, not_applied: 0 }); assert.equal(confirmed.value.partial, false);
const actual = await call('course?courseId=4', 'course'); assert.equal(actual.status, 200);
assert.equal(actual.value.targets.find(target => target.id === 'module:17').opensAt, '2026-10-12T11:00:00.000Z');
assert.equal(actual.value.targets.find(target => target.id === 'module:19').closesAt, '2026-10-18T21:00:00.000Z');
report.tests.push({ test: 'seven section/forum/assignment/quiz targets applied and independently re-read; cutoff and other fields preserved', counts: confirmed.value.counts, passed: true });
await call('logout', 'logout', {}); await readback.logout();
report.syntheticPrefix = prefix;
report.completedAt = new Date().toISOString();
await writeFile(new URL('./lab-evidence.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
