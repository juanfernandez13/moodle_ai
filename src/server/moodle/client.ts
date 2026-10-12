import { load } from 'cheerio';
import { MoodleHttp, MoodleError } from './http.ts';
import type { HttpOptions } from './http.ts';
import { isLoginPage, readForm, requirePage } from './forms.ts';

export class MoodleClient {
  readonly http: MoodleHttp;
  private name = '';
  constructor(base: string, options?: HttpOptions) { this.http = new MoodleHttp(base, options); }
  async login(username: string, password: string): Promise<{ name: string }> {
    const start = await this.http.text('/login/index.php');
    const $ = load(start), token = $('input[name="logintoken"]').attr('value');
    if (!token || token.length > 256) throw new MoodleError('unsupported_login', 'O formulário de autenticação Moodle não é suportado.');
    const html = await this.http.post('/login/index.php', [['logintoken', token], ['username', username], ['password', password], ['anchor', '']]);
    if (isLoginPage(html) || !this.sesskey(html)) { this.http.clear(); throw new MoodleError('invalid_credentials', 'Usuário ou senha inválidos, ou autenticação adicional necessária.'); }
    const page = load(html);
    this.name = page('.usertext, .userbutton .usertext').first().text().trim().slice(0, 200) || 'Usuário Moodle';
    return { name: this.name };
  }
  async alive(): Promise<boolean> {
    const html = await this.http.text('/my/');
    return !isLoginPage(html) && Boolean(this.sesskey(html));
  }
  async logout(): Promise<void> {
    try { const html = await this.http.text('/my/'), key = this.sesskey(html); if (key) await this.http.text(`/login/logout.php?sesskey=${encodeURIComponent(key)}`); }
    finally { this.http.clear(); }
  }
  private sesskey(html: string): string | undefined {
    const key = load(html)('input[name="sesskey"]').attr('value') ?? /"sesskey"\s*:\s*"([A-Za-z0-9]+)"/.exec(html)?.[1];
    return key && /^[A-Za-z0-9]{1,128}$/.test(key) ? key : undefined;
  }
  async timezone(): Promise<string> {
    const html = await this.http.text('/user/edit.php'); requirePage(html);
    let zone = readForm(html, 'form:has([name="timezone"])').fields.get('timezone');
    if (!zone || zone === '99') {
      const site = await this.http.text('/admin/settings.php?section=locationsettings'); requirePage(site);
      const $ = load(site), select = $('select[name="s__timezone"]');
      zone = select.find('option[selected]').attr('value');
    }
    if (!zone) throw new MoodleError('unknown_timezone', 'Não foi possível determinar o fuso Moodle para editar as datas.');
    try { new Intl.DateTimeFormat('en', { timeZone: zone }); }
    catch { throw new MoodleError('unsupported_timezone', 'O fuso configurado no Moodle não é suportado. Ajuste o perfil Moodle antes da prévia.'); }
    return zone;
  }
  async courses(): Promise<{ id: number; title: string; shortName?: string }[]> {
    const result = new Map<number, { id: number; title: string; shortName?: string }>();
    for (let page = 0; page < 20; page++) {
      const html = await this.http.text(`/course/index.php?browse=courses&perpage=100&page=${page}`); requirePage(html);
      const $ = load(html);
      $('.coursebox, .course-listitem').each((_, element) => {
        const box = $(element), link = box.find('.coursename a, a[href*="course/view.php"]').first();
        const href = link.attr('href'); if (!href) return;
        const id = Number(this.http.url(href).searchParams.get('id'));
        const title = link.text().trim().slice(0, 200);
        if (Number.isSafeInteger(id) && id > 1 && title) result.set(id, { id, title });
      });
      const next = $('a[rel="next"], .pagination .page-item').toArray().some(element => {
        const href = $(element).attr('href') ?? $(element).find('a').attr('href');
        if (!href) return false;
        return Number(this.http.url(href).searchParams.get('page')) === page + 1;
      });
      if (!next) break;
      if (page === 19) throw new MoodleError('course_limit', 'Há cursos demais para esta consulta.');
    }
    return [...result.values()];
  }
}
