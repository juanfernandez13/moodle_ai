/** O professor lê e escreve datas no horário do próprio computador; o curso guarda o instante (com fuso explícito).
    Mostrar uma data nunca reescreve o valor guardado: ele só muda quando a pessoa edita o campo. */

const pad = (value: number, size = 2) => String(value).padStart(size, "0");

function parse(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Valor de um campo datetime-local ("AAAA-MM-DDTHH:mm") no horário do computador. */
export function localFieldValue(value: string | undefined): string {
  const date = parse(value);
  if (!date) return "";
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** O campo datetime-local não traz fuso: o que foi digitado é lido no horário do computador e vira um instante. */
export function localTimestamp(value: string): string | undefined {
  // Só o formato do campo: outro texto com fuso próprio seria lido como outro instante.
  if (!/^\d{4,}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return undefined;
  return parse(value)?.toISOString();
}

/** "18/10/2026 às 23:59", no horário do computador. */
export function readableDate(value: string | undefined): string {
  const date = parse(value);
  if (!date) return "";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${pad(date.getFullYear(), 4)} às ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
