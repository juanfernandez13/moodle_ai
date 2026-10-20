import type {
  DatePlan,
  DatePlanInput,
  DateTarget,
} from "../../../domain/dates/index.ts";
import type { CourseSummary } from "./types.ts";

/** The screen only offers Brasília time (UTC−3); the offset is never shown as a choice. */
export const BRASILIA_OFFSET_MINUTES = -180;

const pad = (value: number) => String(value).padStart(2, "0");
const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

/** Test mode only: explicitly fictitious units, with an old schedule so "Antes" has something to compare. */
export function dateTargets(unitCount: number, text: string): DateTarget[] {
  if (text.trim()) return JSON.parse(text) as DateTarget[];
  // Example times are Brasília time (UTC−3), written as UTC instants.
  const example = (day: number, hour: number, minute: number) =>
    new Date(Date.UTC(2026, 7, day, hour + 3, minute)).toISOString();
  return Array.from({ length: unitCount }, (_, sectionIndex) => {
    const opensAt = example(3 + sectionIndex * 7, 8, 0);
    const closesAt = example(9 + sectionIndex * 7, 23, 59);
    return [
      {
        id: `section-${sectionIndex + 1}`,
        kind: "section" as const,
        sectionIndex,
        title: `Unidade ${sectionIndex + 1}`,
        opensAt,
      },
      {
        id: `assignment-${sectionIndex + 1}`,
        kind: "assignment" as const,
        sectionIndex,
        title: `Tarefa da unidade ${sectionIndex + 1}`,
        opensAt,
        closesAt,
      },
      {
        id: `quiz-${sectionIndex + 1}`,
        kind: "quiz" as const,
        sectionIndex,
        title: `Quiz da unidade ${sectionIndex + 1}`,
        opensAt,
        closesAt,
      },
    ];
  }).flat();
}

/** Units and activities of a course read from Moodle (the hook keeps its targets as JSON text). */
export function summarizeTargets(text: string): CourseSummary | null {
  if (!text.trim()) return null;
  try {
    const list: unknown = JSON.parse(text);
    if (!Array.isArray(list) || !list.length) return null;
    let units = 0;
    let activities = 0;
    for (const item of list as unknown[]) {
      if (typeof item !== "object" || item === null) continue;
      const target = item as { kind?: unknown; sectionIndex?: unknown };
      if (typeof target.sectionIndex === "number")
        units = Math.max(units, target.sectionIndex + 1);
      if (target.kind !== "section") activities++;
    }
    return { units, activities };
  } catch {
    return null;
  }
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function kindLabel(kind: DateTarget["kind"]): string {
  const labels: Record<DateTarget["kind"], string> = {
    section: "Unidade",
    assignment: "Tarefa",
    quiz: "Quiz",
    forum: "Fórum",
  };
  return labels[kind];
}

export interface DateMoment {
  year: number;
  day: string;
  time: string;
}

/** Day and time of an instant as the teacher reads them: "20/10" and "08:00", at the given UTC offset. */
export function dateMoment(
  value: string | undefined,
  offsetMinutes: number = BRASILIA_OFFSET_MINUTES,
): DateMoment | null {
  if (!value) return null;
  const instant = Date.parse(value);
  if (Number.isNaN(instant)) return null;
  const local = new Date(instant + offsetMinutes * 60_000);
  return {
    year: local.getUTCFullYear(),
    day: `${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
  };
}

/** "20/10 às 08:00" (with the year only when a schedule crosses years). */
export function momentText(moment: DateMoment, withYear = false): string {
  const day = withYear ? `${moment.day}/${String(moment.year).slice(2)}` : moment.day;
  return `${day} às ${moment.time}`;
}

/** True when the dates shown for a plan fall in more than one year, so the day alone would be ambiguous. */
export function spansYears(plan: DatePlan): boolean {
  const offset = plan.input.timezoneOffsetMinutes;
  const years = new Set<number>();
  for (const change of plan.changes)
    for (const value of [
      change.before.opensAt,
      change.before.closesAt,
      change.after.opensAt,
      change.after.closesAt,
    ]) {
      const moment = dateMoment(value, offset);
      if (moment) years.add(moment.year);
    }
  return years.size > 1;
}

export function sameInstant(a: string | undefined, b: string | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return Date.parse(a) === Date.parse(b);
}

/** "segunda-feira, 19/10/2026" for a YYYY-MM-DD value; empty when the value is not a real day. */
export function longDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "";
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return "";
  return `${WEEKDAYS[date.getUTCDay()]}, ${pad(day)}/${pad(month)}/${year}`;
}

/** YYYY-MM-DD of the local calendar day. */
export function todayIso(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The Monday after today, as YYYY-MM-DD, so a stale default never starts a course in the past. */
export function nextMonday(now: Date): string {
  const ahead = (8 - now.getDay()) % 7 || 7;
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + ahead))
    .toISOString()
    .slice(0, 10);
}

/** First thing wrong with the answers of "Novas datas", in plain words; empty when the plan can be built. */
export function scheduleProblem(input: DatePlanInput): string {
  if (!longDate(input.startDate)) return "Escolha o dia em que o curso começa.";
  const year = Number(input.startDate.slice(0, 4));
  if (year < 1900 || year > 2100) return "Escolha um dia entre 1900 e 2100.";
  if (
    !Number.isInteger(input.daysPerUnit) ||
    input.daysPerUnit < 1 ||
    input.daysPerUnit > 365
  )
    return "Use de 1 a 365 dias.";
  if (!input.opensAtTime || !input.closesAtTime) return "Escolha os dois horários.";
  if (input.daysPerUnit === 1 && input.closesAtTime <= input.opensAtTime)
    return "Fechar precisa ser depois de abrir.";
  return "";
}

export function dateResultLabel(status: string): string {
  const labels: Record<string, string> = {
    applied: "Aplicado",
    error: "Erro",
    unknown: "Não sabemos",
    not_applied: "Não aplicado",
  };
  return labels[status] ?? "Erro";
}

export function hostOf(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Domain, server and connection sentences that use technical words, in the words a teacher would use. Anything else passes through. */
const PLAIN: Record<string, string> = {
  "Confira data, horários, quantidade de unidades e alvos do cronograma.":
    "Confira o dia e os horários.",
  "A unidade não está no intervalo do cronograma.":
    "O curso tem mais unidades do que o previsto. Leia o curso de novo.",
  "O mesmo alvo não pode ser aplicado duas vezes.": "O curso tem itens repetidos.",
  "O fechamento deve ocorrer depois da abertura.": "Fechar precisa ser depois de abrir.",
  "As restrições atuais não puderam ser lidas; elas não serão substituídas.":
    "Uma regra de acesso do curso não pôde ser lida.",
  "A prévia está obsoleta, expirada ou já foi consumida. Gere e revise outra prévia.":
    "Esta conferência não vale mais. Veja como fica de novo.",
  "O curso Moodle mudou depois da prévia. Gere e revise um novo plano.":
    "O curso mudou no Moodle. Veja como fica de novo.",
  "Há prévias demais nesta sessão. Aguarde a expiração ou reconecte.":
    "Há conferências demais abertas. Entre no Moodle de novo.",
  "Já existe uma operação Moodle em andamento nesta sessão.":
    "O Moodle está ocupado. Tente de novo em instantes.",
  "O Moodle recusou o formulário de datas.": "O Moodle recusou as datas.",
  "Não foi possível preparar este alvo.": "Não foi possível preparar este item.",
  "Não enviado após falha de um alvo anterior. Revise o curso antes de uma nova operação.":
    "Não foi enviado: um item anterior falhou.",
  "Este alvo mudou desde a revisão; o envio foi interrompido.":
    "Este item mudou no Moodle. Nada foi enviado.",
  "O Moodle respondeu, mas a releitura divergiu do plano ou de outros campos. Verifique o estado efetivo antes de continuar.":
    "Não sabemos se ficou certo. Confira no Moodle.",
  "O envio começou, mas o estado efetivo não pôde ser confirmado. Confira no Moodle antes de reenviar.":
    "Não sabemos se foi aplicado. Confira no Moodle.",
  "Conecte sua sessão Moodle para continuar.": "Entre no Moodle para continuar.",
  "A sessão Moodle expirou. Conecte novamente.": "A conexão terminou. Entre de novo.",
  "Usuário ou senha inválidos, ou autenticação adicional necessária.":
    "Usuário ou senha não aceitos. O Moodle pode estar pedindo outra confirmação.",
  "Informe a URL base do Moodle para conectar.": "Escreva o endereço do Moodle.",
  "Informe a URL base Moodle HTTP ou HTTPS, sem usuário, senha, consulta ou fragmento.":
    "Confira o endereço do Moodle. Ele costuma começar com https://.",
  "Use um endereço público Moodle. Endereços privados e serviços internos não são permitidos.":
    "Esse endereço não é permitido. Use o endereço público do Moodle.",
  "O endereço Moodle resolve para uma rede privada ou indisponível. A conexão foi bloqueada.":
    "Não foi possível chegar a esse endereço.",
  "Aguarde um minuto antes de tentar conectar novamente.":
    "Muitas tentativas. Espere um minuto.",
  "O prazo da solicitação ao Moodle foi esgotado.": "O Moodle demorou demais. Tente de novo.",
  "Não foi possível concluir a operação Moodle. Os detalhes privados permanecem no servidor.":
    "O Moodle não respondeu como esperado. Tente de novo.",
  "A operação não foi concluída. Confira o estado antes de repetir.":
    "Não foi possível concluir. Tente de novo.",
  "A integração Moodle ainda não está disponível nesta instalação.":
    "Não foi possível falar com o Moodle.",
  "O Moodle recusou a solicitação. Confira permissões e disponibilidade.":
    "O Moodle recusou. Confira suas permissões.",
  "O Moodle recusou a operação. Confira permissões e dados do formulário.":
    "O Moodle recusou. Confira suas permissões.",
  "Não há permissão de edição para um alvo do cronograma.":
    "Você não pode editar um item deste curso.",
  "Este curso excede o limite de 2.000 alvos de datas.":
    "Este curso tem itens demais (mais de 2.000).",
  "Não foi possível determinar o fuso Moodle para editar as datas.":
    "Não foi possível saber o horário do Moodle.",
  "O fuso configurado no Moodle não é suportado. Ajuste o perfil Moodle antes da prévia.":
    "Este Moodle usa um horário que ainda não funciona aqui.",
  "Uma data do Moodle cai em um horário inválido no fuso configurado.":
    "Uma data cai em um horário que o Moodle não aceita.",
  "As restrições Moodle não puderam ser lidas. Nenhuma alteração será enviada.":
    "Uma regra de acesso do curso não pôde ser lida. Nada foi enviado.",
  "Confira o cronograma.": "Confira o dia e os horários.",
};

export function friendlyMessage(text: string): string {
  return text
    .split("\n")
    .map((line) => PLAIN[line.trim()] ?? line)
    .join("\n");
}
