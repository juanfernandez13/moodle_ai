import { load } from 'cheerio';
import { MoodleError } from './http.ts';

export class Fields {
  pairs: [string, string][];
  constructor(pairs: readonly (readonly [string, string])[] = []) { this.pairs = pairs.map(([name, value]) => [name, value]); }
  get(name: string): string | undefined { return this.pairs.findLast(pair => pair[0] === name)?.[1]; }
  has(name: string): boolean { return this.pairs.some(pair => pair[0] === name); }
  set(name: string, value: string): void { const pair = this.pairs.findLast(pair => pair[0] === name); if (pair) pair[1] = value; else this.pairs.push([name, value]); }
  clone(): Fields { return new Fields(this.pairs); }
}
export type MoodleForm = { action: string; fields: Fields; controls: Map<string, { type: string; values: string[]; disabled: boolean }>; buttons: Map<string, string> };
export function readForm(html: string, selector: string): MoodleForm {
  const $ = load(html), form = $(selector).first();
  if (!form.length) throw new MoodleError('moodle_form_missing', 'O formulário esperado não está disponível. Confira permissões e perfil Moodle.');
  if ((form.attr('method') ?? 'post').toLowerCase() !== 'post') throw new MoodleError('unsupported_form', 'O método do formulário Moodle não é suportado.');
  const result: MoodleForm = { action: form.attr('action') ?? '', fields: new Fields(), controls: new Map(), buttons: new Map() };
  form.find('input, select, textarea, button').each((_, element) => {
    const el = $(element), name = el.attr('name');
    if (!name) return;
    const tag = element.tagName.toLowerCase(), type = tag === 'input' ? (el.attr('type') ?? 'text').toLowerCase() : tag;
    const disabled = el.attr('disabled') !== undefined || el.parents('fieldset[disabled]').length > 0;
    const options = tag === 'select' ? el.find('option').filter((_, option) => $(option).attr('disabled') === undefined && $(option).parents('optgroup[disabled]').length === 0) : null;
    const values = options ? options.toArray().map(option => $(option).attr('value') ?? $(option).text()) : [el.attr('value') ?? ''];
    result.controls.set(name, { type, values, disabled });
    if (disabled) return;
    if (['submit', 'button'].includes(type) || tag === 'button') { result.buttons.set(name, el.attr('value') ?? el.text()); return; }
    if (['reset', 'file', 'image'].includes(type)) return;
    if (tag === 'textarea') { result.fields.pairs.push([name, el.text()]); return; }
    if (options) {
      const selected = options.filter((_, option) => $(option).attr('selected') !== undefined);
      const successful = selected.length ? (el.attr('multiple') === undefined ? selected.last() : selected) : el.attr('multiple') === undefined ? options.first() : options.filter(() => false);
      successful.each((_, option) => { result.fields.pairs.push([name, $(option).attr('value') ?? $(option).text()]); });
      return;
    }
    if (['checkbox', 'radio'].includes(type) && el.attr('checked') === undefined) return;
    result.fields.pairs.push([name, el.attr('value') ?? (['checkbox', 'radio'].includes(type) ? 'on' : '')]);
  });
  return result;
}
export function setChoice(form: MoodleForm, fields: Fields, name: string, value: string, required = true): void {
  const control = form.controls.get(name);
  if (!control) { if (!required) return; throw new MoodleError('unsupported_form', 'Uma opção necessária está ausente no formulário Moodle.'); }
  if (control.type === 'select' && !control.values.includes(value)) throw new MoodleError('unsupported_form', 'Uma opção necessária não existe neste Moodle.');
  fields.set(name, value);
}
export function submitButton(form: MoodleForm, fields: Fields, names: readonly string[]): void {
  const name = names.find(name => form.buttons.has(name));
  if (!name) throw new MoodleError('unsupported_form', 'Não foi possível identificar a ação de salvar do Moodle.');
  fields.pairs.push([name, form.buttons.get(name)!]);
}
export function isLoginPage(html: string): boolean { return load(html)('input[name="logintoken"], form#login').length > 0; }
export function requirePage(html: string): void {
  if (isLoginPage(html)) throw new MoodleError('session_expired', 'A sessão Moodle expirou. Conecte novamente.');
  const $ = load(html);
  if ($('#page-error, .errorbox, .alert-danger, [data-region="error-message"]').length) throw new MoodleError('moodle_permission', 'O Moodle recusou a operação. Confira permissões e dados do formulário.');
}
