import { hash256 } from "../../shared/archive.ts";
import { z } from "zod";

export type DateTarget = {
  id: string;
  kind: "section" | "assignment" | "quiz" | "forum";
  sectionIndex: number;
  title: string;
  opensAt?: string;
  closesAt?: string;
  availability?: unknown;
};
export type DatePlanInput = {
  startDate: string;
  unitCount: number;
  daysPerUnit: number;
  opensAtTime: string;
  closesAtTime: string;
  timezoneOffsetMinutes: number;
};
export type DateIssue = { code: string; path: string; message: string };
export type DateSnapshot = {
  opensAt?: string;
  closesAt?: string;
  availability?: unknown;
};
export type DatePlan = {
  input: DatePlanInput;
  changes: {
    id: string;
    title: string;
    kind: DateTarget["kind"];
    before: DateSnapshot;
    after: DateSnapshot & { opensAt: string };
  }[];
};

const calendarDate = z.iso
  .date()
  .refine(
    (value) =>
      Number(value.slice(0, 4)) >= 1900 && Number(value.slice(0, 4)) <= 2100,
  );
const clockTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const inputSchema = z.strictObject({
  startDate: calendarDate,
  unitCount: z.number().int().min(1).max(200),
  daysPerUnit: z.number().int().min(1).max(365),
  opensAtTime: clockTime,
  closesAtTime: clockTime,
  timezoneOffsetMinutes: z.number().int().min(-840).max(840),
});
const targetSchema = z.strictObject({
  id: z.string().min(1).max(128),
  kind: z.enum(["section", "assignment", "quiz", "forum"]),
  sectionIndex: z.number().int().min(0),
  title: z.string().min(1).max(200),
  opensAt: z.iso.datetime({ offset: true }).optional(),
  closesAt: z.iso.datetime({ offset: true }).optional(),
  availability: z.unknown().optional(),
});
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function updateAvailability(
  input: unknown,
  opening: number,
  closing: number | undefined,
): unknown {
  const source: unknown =
    typeof input === "string"
      ? input.trim() === ""
        ? null
        : JSON.parse(input)
      : structuredClone(input);
  let openingFound = false,
    closingFound = false;
  function rewrite(value: unknown, depth: number): unknown {
    if (depth > 32 || !record(value)) throw new Error("Restrição inválida.");
    if (value.type === "date") {
      if (value.d === ">=") {
        openingFound = true;
        return { ...value, t: opening };
      }
      if (value.d === "<") {
        closingFound = true;
        return closing === undefined ? null : { ...value, t: closing };
      }
      return value;
    }
    if (value.c !== undefined) {
      if (!Array.isArray(value.c) || value.c.length > 500)
        throw new Error("Restrição inválida.");
      const old = value.c;
      const mapped = old.map((child) => rewrite(child, depth + 1));
      const kept = mapped
        .map((child, index) => ({ child, index }))
        .filter(({ child }) => child !== null);
      const result: Record<string, unknown> = {
        ...value,
        c: kept.map(({ child }) => child),
      };
      if (value.showc !== undefined) {
        if (!Array.isArray(value.showc) || value.showc.length !== old.length)
          throw new Error("Restrição inválida.");
        result.showc = kept.map(
          ({ index }) => (value.showc as unknown[])[index],
        );
      }
      return result;
    }
    return value;
  }
  let result =
    source === null || source === ""
      ? { op: "&", c: [], showc: [] }
      : rewrite(source, 0);
  if (result === null) result = { op: "&", c: [], showc: [] };
  const added: Record<string, unknown>[] = [];
  if (!openingFound) added.push({ type: "date", d: ">=", t: opening });
  if (closing !== undefined && !closingFound)
    added.push({ type: "date", d: "<", t: closing });
  if (added.length) {
    if (record(result) && result.op === "&" && Array.isArray(result.c)) {
      const flags = Array.isArray(result.showc)
        ? result.showc
        : result.c.map(() => false);
      result = {
        ...result,
        c: [...result.c, ...added],
        showc: [...flags, ...added.map(() => false)],
      };
    } else
      result = {
        op: "&",
        c: [result, ...added],
        showc: [false, ...added.map(() => false)],
      };
  }
  return typeof input === "string" ? JSON.stringify(result) : result;
}

export function buildDatePlan(
  input: DatePlanInput,
  targets: readonly DateTarget[],
): { ok: true; plan: DatePlan } | { ok: false; issues: DateIssue[] } {
  const configuration = inputSchema.safeParse(input);
  const checkedTargets = z
    .array(targetSchema)
    .min(1)
    .max(40_000)
    .safeParse(targets);
  if (!configuration.success || !checkedTargets.success)
    return {
      ok: false,
      issues: [
        {
          code: "invalid_date_plan",
          path: !configuration.success ? "input" : "targets",
          message:
            "Confira data, horários, quantidade de unidades e alvos do cronograma.",
        },
      ],
    };
  const identities = new Set<string>();
  const issues: DateIssue[] = [];
  targets.forEach((target, index) => {
    if (target.sectionIndex >= input.unitCount)
      issues.push({
        code: "invalid_unit",
        path: `targets[${index}].sectionIndex`,
        message: "A unidade não está no intervalo do cronograma.",
      });
    if (identities.has(target.id))
      issues.push({
        code: "duplicate_target",
        path: `targets[${index}].id`,
        message: "O mesmo alvo não pode ser aplicado duas vezes.",
      });
    identities.add(target.id);
  });
  if (issues.length) return { ok: false, issues };
  const parts = input.startDate.split("-").map(Number);
  const instant = (unit: number, closing: boolean) => {
    const clock = (closing ? input.closesAtTime : input.opensAtTime)
      .split(":")
      .map(Number);
    return new Date(
      Date.UTC(
        parts[0]!,
        parts[1]! - 1,
        parts[2]! +
          unit * input.daysPerUnit +
          (closing ? input.daysPerUnit - 1 : 0),
        clock[0]!,
        clock[1]!,
      ) -
        input.timezoneOffsetMinutes * 60_000,
    ).toISOString();
  };
  const changes = targets.map((target) => {
    const before: DateSnapshot = {};
    if (target.opensAt !== undefined) before.opensAt = target.opensAt;
    if (target.closesAt !== undefined) before.closesAt = target.closesAt;
    if (target.availability !== undefined)
      before.availability = structuredClone(target.availability);
    const after: DateSnapshot & { opensAt: string } = {
      opensAt: instant(target.sectionIndex, false),
    };
    if (target.kind !== "section")
      after.closesAt = instant(target.sectionIndex, true);
    if (
      after.closesAt !== undefined &&
      Date.parse(after.closesAt) < Date.parse(after.opensAt)
    )
      issues.push({
        code: "inverted_schedule",
        path: `targets.${target.id}`,
        message: "O fechamento deve ocorrer depois da abertura.",
      });
    if (target.availability !== undefined) {
      try {
        after.availability = updateAvailability(
          target.availability,
          Date.parse(after.opensAt) / 1000,
          after.closesAt === undefined
            ? undefined
            : Date.parse(after.closesAt) / 1000,
        );
      } catch {
        issues.push({
          code: "invalid_availability",
          path: `targets.${target.id}.availability`,
          message:
            "As restrições atuais não puderam ser lidas; elas não serão substituídas.",
        });
      }
    }
    return {
      id: target.id,
      title: target.title,
      kind: target.kind,
      before,
      after,
    };
  });
  return issues.length
    ? { ok: false, issues }
    : { ok: true, plan: { input: structuredClone(input), changes } };
}

export async function previewDatePlan(
  plan: DatePlan,
): Promise<{ hash: string; plan: DatePlan }> {
  const copied = structuredClone(plan);
  return {
    hash: await hash256(new TextEncoder().encode(JSON.stringify(copied))),
    plan: copied,
  };
}
