import { load } from 'cheerio';
import { buildDatePlan, previewDatePlan } from '../../domain/dates/index.ts';
import type { DatePlan, DatePlanInput, DateTarget } from '../../domain/dates/index.ts';
import { hash256 } from '../../shared/archive.ts';
import type { MoodleClient } from './client.ts';
import type { Fields, MoodleForm } from './forms.ts';
import { readForm, requirePage, setChoice, submitButton } from './forms.ts';
import { MoodleError } from './http.ts';

type ReadTarget = { target: DateTarget; form: MoodleForm; path: string; fingerprint: string };
export type DateOperation = { kind: 'dates'; hash: string; courseId: number; plan: DatePlan; timezone: string; snapshots: ReadTarget[] };
export type DateResult = { id: string; title: string; status: 'applied' | 'error' | 'unknown' | 'not_applied'; message: string };
type Issue = { code: string; message: string };
const native: Partial<Record<DateTarget['kind'], [string, string]>> = { assignment: ['allowsubmissionsfromdate', 'duedate'], quiz: ['timeopen', 'timeclose'] };
const normalized = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 200);
const jsonHash = (value: unknown) => hash256(new TextEncoder().encode(JSON.stringify(value)));

function localParts(instant: number, timezone: string): { year: number; month: number; day: number; hour: number; minute: number } {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(instant)).map(part => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day), hour: Number(values.hour), minute: Number(values.minute) };
}
function utc(parts: ReturnType<typeof localParts>): number { return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute); }
function readDate(fields: Fields, prefix: string, timezone: string): string | undefined {
  if (fields.get(`${prefix}[enabled]`) !== '1') return undefined;
  const part = (name: string) => Number(fields.get(`${prefix}[${name}]`));
  const wanted = { year: part('year'), month: part('month'), day: part('day'), hour: part('hour'), minute: part('minute') };
  if (Object.values(wanted).some(value => !Number.isInteger(value))) throw new MoodleError('invalid_moodle_date', 'Uma data atual do Moodle não pôde ser lida.');
  const wall = utc(wanted); let instant = wall;
  for (let attempt = 0; attempt < 4; attempt++) { const actual = utc(localParts(instant, timezone)); if (actual === wall) return new Date(instant).toISOString(); instant += wall - actual; }
  throw new MoodleError('invalid_moodle_date', 'Uma data do Moodle cai em um horário inválido no fuso configurado.');
}
function writeDate(form: MoodleForm, fields: Fields, prefix: string, instant: string, timezone: string): void {
  const parts = localParts(Date.parse(instant), timezone);
  for (const [name, value] of Object.entries(parts)) setChoice(form, fields, `${prefix}[${name}]`, String(value));
  const enabled = `${prefix}[enabled]`, control = form.controls.get(enabled);
  if (control?.type === 'checkbox' && fields.get(enabled) !== '1') {
    if (!control.values.includes('1')) throw new MoodleError('unsupported_form', 'O seletor de ativação da data Moodle não é suportado.');
    // Checking an optional date adds the checkbox after its existing hidden false input.
    fields.pairs.push([enabled, '1']);
  } else setChoice(form, fields, enabled, '1');
}
function availabilityValue(form: MoodleForm): string | undefined {
  const value = form.fields.get('availabilityconditionsjson');
  if (value === undefined) return undefined;
  if (!value.trim()) return '';
  try { return JSON.stringify(JSON.parse(value)); }
  catch { throw new MoodleError('invalid_availability', 'As restrições Moodle não puderam ser lidas. Nenhuma alteração será enviada.'); }
}
function dateConditions(value: string | undefined): { opensAt?: string; closesAt?: string } {
  if (!value) return {};
  const dates: { direction: string; timestamp: number }[] = [];
  function walk(data: unknown, depth = 0): void {
    if (depth > 32 || typeof data !== 'object' || data === null) return;
    const object = data as Record<string, unknown>;
    if (object.type === 'date' && typeof object.d === 'string' && Number.isSafeInteger(object.t)) dates.push({ direction: object.d, timestamp: Number(object.t) });
    if (Array.isArray(object.c)) object.c.forEach(child => walk(child, depth + 1));
  }
  walk(JSON.parse(value));
  const open = dates.find(date => date.direction === '>='), close = dates.find(date => date.direction === '<');
  return { ...(open ? { opensAt: new Date(open.timestamp * 1000).toISOString() } : {}), ...(close ? { closesAt: new Date(close.timestamp * 1000).toISOString() } : {}) };
}
function semantic(form: MoodleForm): [string, string][] {
  const entries = form.fields.pairs.filter(([name]) => name !== 'sesskey' && !name.startsWith('mform_') && !name.endsWith('[itemid]') && !['introattachments', 'files', 'filemanager_sebconfigfile'].includes(name));
  // Stable sort groups fields by name while retaining every value and its order within that field.
  return entries.map(([name, original]): [string, string] => {
    let value = original;
    if (name === 'availabilityconditionsjson' && value.trim()) { try { value = JSON.stringify(JSON.parse(value)); } catch { /* Validation diagnoses the restriction later. */ } }
    // Moodle rewrites draft area IDs in rich content on every GET; the attachment association is unchanged.
    if (name.endsWith('[text]')) value = value.replace(/(\/draftfile\.php\/\d+\/user\/draft\/)\d+(\/)/g, '$1DRAFT$2');
    return [name, value];
  }).sort(([a], [b]) => a.localeCompare(b));
}
async function readTarget(client: MoodleClient, target: DateTarget, timezone: string): Promise<ReadTarget> {
  const numeric = target.id.split(':')[1];
  const path = target.kind === 'section' ? `/course/editsection.php?id=${numeric}` : `/course/modedit.php?update=${numeric}`;
  const html = await client.http.text(path); requirePage(html);
  const form = readForm(html, target.kind === 'section' ? 'form:has([name="_qf__editsection_form"])' : 'form:has([name="coursemodule"])');
  form.action = new URL(form.action || path, client.http.url(path)).toString();
  client.http.url(form.action);
  if (!form.fields.get('sesskey')) throw new MoodleError('moodle_permission', 'Não há permissão de edição para um alvo do cronograma.');
  const availability = availabilityValue(form);
  if (availability === undefined) throw new MoodleError('unsupported_availability', 'O Moodle não disponibilizou o formulário de restrições necessário.');
  const names = native[target.kind];
  const current = names ? { opensAt: readDate(form.fields, names[0], timezone), closesAt: readDate(form.fields, names[1], timezone) } : dateConditions(availability);
  const title = form.fields.get('name')?.trim() || target.title;
  const enriched: DateTarget = { id: target.id, kind: target.kind, sectionIndex: target.sectionIndex, title: normalized(title), availability };
  if (current.opensAt) enriched.opensAt = current.opensAt;
  if (current.closesAt) enriched.closesAt = current.closesAt;
  return { target: enriched, form, path, fingerprint: await jsonHash(semantic(form)) };
}
export async function readCourse(client: MoodleClient, courseId: number, knownTimezone?: string): Promise<{ course: { id: number; title: string }; targets: DateTarget[]; snapshots: ReadTarget[]; timezone: string; issues: Issue[] }> {
  const html = await client.http.text(`/course/view.php?id=${courseId}`); requirePage(html);
  const $ = load(html), targets: DateTarget[] = [], issues: Issue[] = [], seen = new Set<string>();
  $('li[id^="section-"], [data-for="section"]').each((_, element) => {
    const section = $(element), number = Number(section.attr('data-number') ?? /section-(\d+)/.exec(section.attr('id') ?? '')?.[1]);
    if (!Number.isSafeInteger(number) || number < 1) return;
    const id = section.attr('data-id');
    if (!id || !/^\d+$/.test(id)) { issues.push({ code: 'unsupported_section', message: 'Uma seção não informou o ID Moodle necessário.' }); return; }
    const sectionId = `section:${id}`;
    if (seen.has(sectionId)) return;
    seen.add(sectionId);
    targets.push({ id: sectionId, kind: 'section', sectionIndex: number - 1, title: normalized(section.find('.sectionname, .course-section-header').first().text()) || `Unidade ${number}` });
    section.find('[class*="modtype_"]').each((_, node) => {
      const module = $(node), moduleId = /module-(\d+)/.exec(module.attr('id') ?? '')?.[1] ?? module.attr('data-cmid');
      const type = /(?:^|\s)modtype_([a-z0-9_]+)/.exec(module.attr('class') ?? '')?.[1];
      if (!moduleId || !/^\d+$/.test(moduleId) || !type || seen.has(`module:${moduleId}`)) return;
      seen.add(`module:${moduleId}`);
      const kind = type === 'assign' ? 'assignment' : type === 'quiz' || type === 'forum' ? type : undefined;
      if (!kind) { issues.push({ code: 'unsupported_date_type', message: `Atividade ${moduleId} (${type.slice(0, 40)}) não recebe datas por este perfil.` }); return; }
      const name = module.find('.instancename, .activityname, .aalink').first().clone(); name.find('.accesshide').remove();
      targets.push({ id: `module:${moduleId}`, kind, sectionIndex: number - 1, title: normalized(name.text()) || `${kind} ${moduleId}` });
    });
  });
  if (targets.length > 2000) throw new MoodleError('date_target_limit', 'Este curso excede o limite de 2.000 alvos de datas.');
  const timezone = knownTimezone ?? await client.timezone();
  const snapshots: ReadTarget[] = [];
  for (const target of targets) {
    const snapshot = await readTarget(client, target, timezone); snapshots.push(snapshot);
    if (snapshot.form.fields.get('cutoffdate[enabled]') === '1') issues.push({ code: 'preserved_cutoff', message: `O prazo de corte adicional de “${target.title}” será preservado. Confira se ele permite o período planejado.` });
  }
  return { course: { id: courseId, title: normalized($('h1').first().text()) || `Curso ${courseId}` }, targets: snapshots.map(snapshot => snapshot.target), snapshots, timezone, issues };
}
export async function previewDates(client: MoodleClient, courseId: number, input: DatePlanInput): Promise<{ operation: DateOperation; hash: string; plan: DatePlan; targets: DateTarget[]; issues: Issue[] }> {
  const course = await readCourse(client, courseId);
  const result = buildDatePlan(input, course.targets);
  if (!result.ok) throw new MoodleError('invalid_date_plan', result.issues[0]?.message ?? 'Confira o cronograma.');
  const checked = await previewDatePlan(result.plan);
  for (const snapshot of course.snapshots) {
    const change = checked.plan.changes.find(change => change.id === snapshot.target.id)!;
    const fields = changedFields(snapshot, change.after, course.timezone);
    submitButton(snapshot.form, fields, ['submitbutton', 'submitbutton2']);
  }
  return { operation: { kind: 'dates', hash: checked.hash, courseId, plan: checked.plan, timezone: course.timezone, snapshots: course.snapshots }, ...checked, targets: course.targets, issues: course.issues };
}
function changedFields(snapshot: ReadTarget, after: DatePlan['changes'][number]['after'], timezone: string): Fields {
  const fields = snapshot.form.fields.clone(), names = native[snapshot.target.kind];
  if (names) { writeDate(snapshot.form, fields, names[0], after.opensAt, timezone); if (after.closesAt) writeDate(snapshot.form, fields, names[1], after.closesAt, timezone); }
  if (after.availability !== undefined) fields.set('availabilityconditionsjson', typeof after.availability === 'string' ? after.availability : JSON.stringify(after.availability));
  return fields;
}
export async function confirmDates(client: MoodleClient, operation: DateOperation): Promise<{ results: DateResult[]; partial: boolean; counts: Record<DateResult['status'], number> }> {
  const current = await readCourse(client, operation.courseId);
  if (current.timezone !== operation.timezone || current.snapshots.length !== operation.snapshots.length || current.snapshots.some((snapshot, index) => snapshot.target.id !== operation.snapshots[index]?.target.id || snapshot.fingerprint !== operation.snapshots[index]?.fingerprint)) throw new MoodleError('moodle_state_changed', 'O curso Moodle mudou depois da prévia. Gere e revise um novo plano.');
  const results: DateResult[] = []; let stop = false;
  for (const snapshot of current.snapshots) {
    const change = operation.plan.changes.find(change => change.id === snapshot.target.id)!;
    const base = { id: change.id, title: change.title };
    if (stop) { results.push({ ...base, status: 'not_applied', message: 'Não enviado após falha de um alvo anterior. Revise o curso antes de uma nova operação.' }); continue; }
    let sent = false;
    try {
      // An additional GET narrows the drift window before each individual mutation.
      const latest = await readTarget(client, snapshot.target, operation.timezone);
      if (latest.fingerprint !== snapshot.fingerprint) { results.push({ ...base, status: 'not_applied', message: 'Este alvo mudou desde a revisão; o envio foi interrompido.' }); stop = true; continue; }
      const fields = changedFields(latest, change.after, operation.timezone);
      const expected = semantic({ ...latest.form, fields });
      submitButton(latest.form, fields, ['submitbutton', 'submitbutton2']);
      sent = true;
      const response = await client.http.post(latest.form.action || latest.path, fields.pairs);
      const $ = load(response);
      if ($('.invalid-feedback, .form-control-feedback, .errorbox, .alert-danger, #page-error').filter((_, element) => $(element).text().trim() !== '').length) throw new MoodleError('moodle_form_rejected', 'O Moodle recusou o formulário de datas.');
      requirePage(response);
      const verified = await readTarget(client, snapshot.target, operation.timezone);
      // Compare native dates, every restriction and the preserved nonvolatile fields.
      const actual = semantic(verified.form);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        results.push({ ...base, status: 'unknown', message: 'O Moodle respondeu, mas a releitura divergiu do plano ou de outros campos. Verifique o estado efetivo antes de continuar.' }); stop = true;
      } else results.push({ ...base, status: 'applied', message: 'Datas aplicadas e conferidas por releitura no Moodle.' });
    } catch (error) {
      const uncertain = sent && (!(error instanceof MoodleError) || error.uncertain || error.code !== 'moodle_form_rejected');
      results.push({ ...base, status: uncertain ? 'unknown' : 'error', message: uncertain ? 'O envio começou, mas o estado efetivo não pôde ser confirmado. Confira no Moodle antes de reenviar.' : error instanceof MoodleError ? error.message : 'Não foi possível preparar este alvo.' }); stop = true;
    }
  }
  const counts = { applied: 0, error: 0, unknown: 0, not_applied: 0 }; for (const result of results) counts[result.status]++;
  return { results, counts, partial: counts.applied !== results.length };
}
