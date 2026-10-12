import { load } from 'cheerio';
import type { StudentRow } from '../../domain/students/index.ts';
import type { MoodleClient } from './client.ts';
import { readForm, requirePage } from './forms.ts';
import { MoodleError } from './http.ts';

export type StudentEnrolment = { courseId: number; shortName: string; enrolId: number; method: 'manual'; roleId: number; role: 'student'; durationSeconds: number; expiryNotify: boolean };
export async function inspectStudentEnrolments(client: MoodleClient, rows: readonly StudentRow[]): Promise<StudentEnrolment[]> {
  const courses = [...new Set(rows.map(row => row.course))];
  if (courses.length > 20) throw new MoodleError('enrol_course_limit', 'Use até 20 cursos distintos por lote de matrículas.');
  const result: StudentEnrolment[] = [];
  for (const shortName of courses) {
    const found = await client.http.text(`/course/search.php?search=${encodeURIComponent(shortName)}&perpage=100`); requirePage(found);
    const search = load(found), ids = new Set<number>();
    search('.coursebox .coursename a, .course-listitem a[href*="course/view.php"]').each((_, element) => {
      const href = search(element).attr('href'); if (!href) return;
      const id = Number(client.http.url(href).searchParams.get('id')); if (Number.isSafeInteger(id) && id > 1) ids.add(id);
    });
    if (ids.size > 50) throw new MoodleError('ambiguous_enrol_course', 'O nome curto do curso retornou candidatos demais. Confira o lote.');
    let courseId: number | undefined;
    for (const id of ids) {
      const html = await client.http.text(`/course/edit.php?id=${id}`); requirePage(html);
      if (load(html)('input[name="shortname"]').attr('value') === shortName) { courseId = id; break; }
    }
    if (!courseId) throw new MoodleError('enrol_course_missing', 'Um curso de matrícula não foi encontrado ou não está acessível pelo nome curto exato.');
    const html = await client.http.text(`/enrol/instances.php?id=${courseId}`); requirePage(html);
    const $ = load(html), links = new Set<string>();
    $('a[href*="editinstance.php"]').each((_, element) => {
      const href = $(element).attr('href'); if (!href) return;
      const url = client.http.url(href); if (url.searchParams.get('type') === 'manual') links.add(url.toString());
    });
    if (links.size !== 1) throw new MoodleError('manual_enrol_missing', 'O curso deve ter um único método de matrícula manual configurado e revisado no Moodle. O adaptador não cria métodos.');
    const formHtml = await client.http.text([...links][0]!); requirePage(formHtml);
    const form = readForm(formHtml, 'form:has([name="roleid"])');
    const enrolId = Number(form.fields.get('id')), roleId = Number(form.fields.get('roleid'));
    if (form.fields.get('status') !== '0' || !Number.isSafeInteger(enrolId) || enrolId < 1 || !Number.isSafeInteger(roleId) || roleId < 1) throw new MoodleError('manual_enrol_disabled', 'O método de matrícula manual precisa estar ativo e possuir um papel válido.');
    // Do not confer an administrator/teacher default through a student upload.
    const roleHtml = await client.http.text(`/admin/roles/define.php?action=edit&roleid=${roleId}`); requirePage(roleHtml);
    const rolePage = load(roleHtml), archetype = rolePage('[name="archetype"] option[selected]').attr('value') ?? rolePage('input[name="archetype"]').attr('value');
    if (archetype !== 'student') throw new MoodleError('unsafe_enrol_role', 'O papel padrão de matrícula deve possuir o arquétipo student. Nenhuma permissão adicional será concedida.');
    const duration = Number(form.fields.get('enrolperiod[number]')) * Number(form.fields.get('enrolperiod[timeunit]'));
    if (!Number.isSafeInteger(duration) || duration < 0) throw new MoodleError('invalid_enrol_options', 'O prazo de matrícula Moodle não pôde ser interpretado.');
    result.push({ courseId, shortName, enrolId, method: 'manual', roleId, role: 'student', durationSeconds: duration, expiryNotify: form.fields.get('expirynotify') !== '0' });
  }
  return result;
}
