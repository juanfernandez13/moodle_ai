import { load } from 'cheerio';
import { buildStudentPreview } from '../../domain/students/index.ts';
import type { StudentRow, StudentOptions } from '../../domain/students/index.ts';
import type { MoodleClient } from './client.ts';
import type { MoodleForm } from './forms.ts';
import { readForm, requirePage, setChoice, submitButton } from './forms.ts';
import { MoodleError } from './http.ts';
import { inspectStudentEnrolments } from './enrolments.ts';
import type { StudentEnrolment } from './enrolments.ts';

const PATH = '/admin/tool/uploaduser/index.php';
export type StudentOperation = { kind: 'students'; hash: string; rows: StudentRow[]; options: StudentOptions; form: MoodleForm; enrolments: StudentEnrolment[] };
export type StudentResult = { username: string; status: 'created' | 'updated' | 'error' | 'unknown'; message: string };
export type EffectiveStudentOptions = { mode: StudentOptions['mode']; enrol: boolean; newPassword: string; existingPasswords: 'preserved'; updateFields: 'csv-only'; allowDelete: false; allowRename: false; allowSuspend: false; defaults: Record<string, string>; enrolments: StudentEnrolment[] };

function uploadRepository(html: string): string {
  // Filepicker repository configuration is inert data. Never evaluate script or invent repository IDs.
  for (const match of html.matchAll(/\{[^{}]{0,400}"type"\s*:\s*"upload"[^{}]{0,1000}\}/g)) {
    try { const data: unknown = JSON.parse(match[0]); if (typeof data === 'object' && data !== null && 'id' in data && /^\d+$/.test(String(data.id))) return String(data.id); } catch { /* Try another configuration object. */ }
  }
  throw new MoodleError('upload_repository_missing', 'O Moodle não informou um repositório de envio de arquivo compatível.');
}
export async function previewStudents(client: MoodleClient, rows: StudentRow[], options: StudentOptions, expectedHash: string): Promise<{ operation: StudentOperation; rows: { username: string; name: string; email: string; status: string }[]; effectiveOptions: EffectiveStudentOptions; issues: { code: string; message: string }[] }> {
  const checked = await buildStudentPreview(rows, options);
  if (!checked.ok) throw new MoodleError('invalid_students', 'Corrija a validação dos alunos antes de enviar a prévia.');
  if (expectedHash !== checked.preview.hash) throw new MoodleError('stale_preview', 'A planilha ou as opções mudaram desde a revisão. Revise novamente.');
  const enrolments = options.enrol ? await inspectStudentEnrolments(client, rows) : [];
  const html = await client.http.text(PATH); requirePage(html);
  const first = readForm(html, 'form:has([name="userfile"])');
  first.action = new URL(first.action || PATH, client.http.url(PATH)).toString(); client.http.url(first.action);
  const itemid = first.fields.get('userfile'), key = first.fields.get('sesskey');
  if (!itemid || !/^\d+$/.test(itemid) || !key) throw new MoodleError('moodle_permission', 'Sem permissão para enviar usuários neste Moodle.');
  const repository = uploadRepository(html);
  const body = new FormData();
  for (const [name, value] of Object.entries({ sesskey: key, repo_id: repository, itemid, savepath: '/', title: 'alunos.csv', author: '', env: 'filepicker' })) body.set(name, value);
  body.set('repo_upload_file', new Blob([checked.preview.csv], { type: 'text/csv' }), 'alunos.csv');
  const uploaded = await client.http.text('/repository/repository_ajax.php?action=upload', { method: 'POST', body });
  let upload: unknown;
  try { upload = JSON.parse(uploaded); } catch { throw new MoodleError('upload_rejected', 'O Moodle recusou o arquivo de prévia.'); }
  if (typeof upload !== 'object' || upload === null || 'error' in upload || !('id' in upload) || String(upload.id) !== itemid) throw new MoodleError('upload_rejected', 'O Moodle recusou o arquivo de prévia.');
  const fields = first.fields.clone();
  setChoice(first, fields, 'delimiter_name', 'comma'); setChoice(first, fields, 'encoding', 'UTF-8'); setChoice(first, fields, 'previewrows', '100000');
  submitButton(first, fields, ['submitbutton']);
  const preview = await client.http.post(first.action || PATH, fields.pairs); requirePage(preview);
  const form = readForm(preview, 'form:has([name="uutype"])');
  form.action = new URL(form.action || PATH, client.http.url(PATH)).toString(); client.http.url(form.action);
  const page = load(preview), table = page('#uupreview'), columns = table.find('th').map((_, element) => page(element).text().trim()).get();
  const usernames = new Map<string, boolean>();
  table.find('tr').each((_, element) => {
    const cells = page(element).find('td'); if (!cells.length) return;
    const username = cells.eq(columns.indexOf('username')).text().trim();
    if (username) usernames.set(username.toLowerCase(), cells.last().text().trim() !== '');
  });
  if (!columns.includes('username') || rows.some(row => !usernames.has(row.username.toLowerCase()))) throw new MoodleError('moodle_preview_mismatch', 'A prévia Moodle não confirmou todas as linhas do CSV revisado. Nenhuma conta foi criada.');
  const pairs = form.fields;
  // Moodle 4.1 core constants, checked against the actual select values before posting.
  const settings: Record<string, string> = { uutype: options.mode === 'create' ? '0' : '3', uupasswordnew: '1', uuupdatetype: options.mode === 'create' ? '0' : '1', uupasswordold: '0' };
  settings['uumatchemail'] = '0';
  for (const [name, value] of Object.entries(settings)) setChoice(form, pairs, name, value);
  for (const name of ['uuallowdeletes', 'uuallowrenames', 'uuallowsuspends', 'uubulk', 'uustandardusernames']) setChoice(form, pairs, name, '0');
  setChoice(form, pairs, 'uunoemailduplicates', '1');
  setChoice(form, pairs, 'uuforcepasswordchange', '0', false);
  const defaults = Object.fromEntries(pairs.pairs.filter(([name]) => !name.startsWith('uu') && !name.startsWith('_qf') && !name.startsWith('mform_') && !['sesskey', 'iid', 'previewrows'].includes(name) && !name.endsWith('[itemid]')));
  const effectiveOptions: EffectiveStudentOptions = { mode: options.mode, enrol: options.enrol, newPassword: options.mode === 'create' ? 'generated-by-moodle-and-email' : 'not-created', existingPasswords: 'preserved', updateFields: 'csv-only', allowDelete: false, allowRename: false, allowSuspend: false, defaults, enrolments };
  const issues = [{ code: 'moodle_options_review', message: options.mode === 'create' ? 'Criação apenas de novos usuários. Sem senha no CSV, o Moodle gera senha e agenda e-mail; a entrega depende do Moodle. Revise os padrões efetivos apresentados antes de confirmar.' : 'Atualização apenas de usuários existentes, somente pelos campos do CSV. Senhas, renomeação, exclusão e suspensão são preservadas. Revise os padrões efetivos antes de confirmar.' }];
  return { operation: { kind: 'students', hash: checked.preview.hash, rows: checked.preview.rows, options: checked.preview.options, form, enrolments }, rows: rows.map(row => ({ username: row.username, name: `${row.firstName} ${row.lastName}`, email: row.email, status: usernames.get(row.username.toLowerCase()) ? 'Moodle informou pendência nesta linha. Revise antes de confirmar.' : 'Revisado; nenhuma conta criada nesta prévia.' })), effectiveOptions, issues };
}
export async function confirmStudents(client: MoodleClient, operation: StudentOperation): Promise<{ rows: StudentResult[]; counts: Record<StudentResult['status'], number> }> {
  if (operation.options.enrol && JSON.stringify(await inspectStudentEnrolments(client, operation.rows)) !== JSON.stringify(operation.enrolments)) throw new MoodleError('moodle_state_changed', 'As opções de matrícula Moodle mudaram após a prévia. Revise uma nova prévia.');
  const fields = operation.form.fields.clone(); submitButton(operation.form, fields, ['submitbutton']);
  let html: string;
  try { html = await client.http.post(operation.form.action || PATH, fields.pairs); }
  catch (error) { if (!(error instanceof MoodleError) || !error.uncertain) throw error; return studentResults(operation.rows.map(row => ({ username: row.username, status: 'unknown', message: 'O envio foi iniciado, mas o resultado não pôde ser confirmado. Verifique no Moodle antes de qualquer nova operação.' }))); }
  const $ = load(html), result = new Map<string, StudentResult>();
  if ($('form:has([name="uutype"])').length && !$('#uuresults').length) return studentResults(operation.rows.map(row => ({ username: row.username, status: 'error', message: 'O Moodle recusou as opções do formulário antes de criar ou atualizar este lote. Gere uma nova prévia.' })));
  $('#uuresults tr').each((_, element) => {
    const cells = $(element).find('td'); if (cells.length < 4) return;
    const username = cells.eq(3).text().trim();
    if (!operation.rows.some(row => row.username.toLowerCase() === username.toLowerCase())) return;
    const statusText = cells.eq(0).text().trim();
    const status: StudentResult['status'] = $(element).find('.uuerror').length ? 'error' : /^new user$|^novo usu[aá]rio$/i.test(statusText) ? 'created' : /^(user|usu[aá]rio).*(updated|atualiz)|up.to.date/i.test(statusText) ? 'updated' : cells.eq(0).find('.uuwarning').length ? 'error' : 'unknown';
    result.set(username.toLowerCase(), { username, status, message: status === 'created' ? 'Usuário criado pelo Moodle.' : status === 'updated' ? 'Usuário atualizado pelo Moodle.' : status === 'error' ? 'O Moodle informou falha nesta linha; cadastro ou matrícula podem ter sido aplicados parcialmente. Confira no Moodle.' : 'O Moodle não forneceu um resultado reconhecível. Confira antes de reenviar.' });
  });
  return studentResults(operation.rows.map(row => result.get(row.username.toLowerCase()) ?? { username: row.username, status: 'unknown', message: 'O Moodle não confirmou o resultado desta linha. Confira antes de reenviar.' }));
}
function studentResults(rows: StudentResult[]): { rows: StudentResult[]; counts: Record<StudentResult['status'], number> } {
  const counts = { created: 0, updated: 0, error: 0, unknown: 0 }; for (const row of rows) counts[row.status]++;
  return { rows, counts };
}
