// Date plan rules not covered elsewhere: cadence per unit, before/after snapshots and access-restriction rewriting.
import test from "node:test";
import assert from "node:assert/strict";
import { buildDatePlan, type DatePlanInput, type DateTarget } from "../../src/domain/dates/index.ts";
import { kindLabel, sameInstant } from "../../src/client/features/dates/helpers.ts";

const input: DatePlanInput = {
  startDate: "2030-01-07",
  unitCount: 3,
  daysPerUnit: 7,
  opensAtTime: "08:00",
  closesAtTime: "23:59",
  timezoneOffsetMinutes: -180,
};
const t = (iso: string) => Date.parse(iso) / 1000;
function plan(targets: DateTarget[], overrides: Partial<DatePlanInput> = {}) {
  const result = buildDatePlan({ ...input, ...overrides }, targets);
  assert.ok(result.ok, JSON.stringify(result));
  return result.plan;
}
const after = (targets: DateTarget[], overrides: Partial<DatePlanInput> = {}) =>
  plan(targets, overrides).changes.map((change) => change.after);

test("várias atividades da mesma unidade recebem a mesma janela e cada unidade avança a cadência", () => {
  const changes = plan([
    { id: "s1", kind: "section", sectionIndex: 0, title: "Unidade 1" },
    { id: "f1", kind: "forum", sectionIndex: 0, title: "Fórum" },
    { id: "a1", kind: "assignment", sectionIndex: 0, title: "Tarefa" },
    { id: "q3", kind: "quiz", sectionIndex: 2, title: "Quiz" },
  ]).changes;
  assert.deepEqual(changes.map((change) => change.id), ["s1", "f1", "a1", "q3"]);
  assert.deepEqual(
    changes.map((change) => [change.after.opensAt, change.after.closesAt]),
    [
      ["2030-01-07T11:00:00.000Z", undefined],
      ["2030-01-07T11:00:00.000Z", "2030-01-14T02:59:00.000Z"],
      ["2030-01-07T11:00:00.000Z", "2030-01-14T02:59:00.000Z"],
      ["2030-01-21T11:00:00.000Z", "2030-01-28T02:59:00.000Z"],
    ],
  );
});

test("fusos positivos e unidades de um dia mantêm o horário local escolhido", () => {
  const [kolkata] = after(
    [{ id: "a", kind: "assignment", sectionIndex: 0, title: "Tarefa" }],
    { timezoneOffsetMinutes: 330, daysPerUnit: 1, opensAtTime: "08:00", closesAtTime: "18:30" },
  );
  assert.deepEqual(kolkata, { opensAt: "2030-01-07T02:30:00.000Z", closesAt: "2030-01-07T13:00:00.000Z" });
  const inverted = buildDatePlan(
    { ...input, daysPerUnit: 1, opensAtTime: "18:00", closesAtTime: "08:00" },
    [{ id: "a", kind: "assignment", sectionIndex: 0, title: "Tarefa" }],
  );
  assert.equal(inverted.ok, false);
  if (!inverted.ok) assert.equal(inverted.issues[0]?.code, "inverted_schedule");
});

test("o antes guarda uma cópia das datas e restrições atuais", () => {
  const availability = { op: "&", c: [{ type: "group", id: 2 }], showc: [true] };
  const targets: DateTarget[] = [
    { id: "q", kind: "quiz", sectionIndex: 0, title: "Quiz", opensAt: "2026-03-09T11:00:00.000Z", availability },
  ];
  const result = plan(targets);
  availability.c.push({ type: "group", id: 99 });
  assert.deepEqual(result.changes[0]?.before, {
    opensAt: "2026-03-09T11:00:00.000Z",
    availability: { op: "&", c: [{ type: "group", id: 2 }], showc: [true] },
  });
});

test("restrição em texto continua texto; vazia ganha as datas como condições ocultas", () => {
  const [section, assign] = after([
    { id: "s", kind: "section", sectionIndex: 0, title: "Unidade", availability: "" },
    { id: "a", kind: "assignment", sectionIndex: 0, title: "Tarefa", availability: "  " },
  ]);
  assert.equal(typeof section?.availability, "string");
  assert.deepEqual(JSON.parse(String(section?.availability)), {
    op: "&",
    c: [{ type: "date", d: ">=", t: t("2030-01-07T11:00:00Z") }],
    showc: [false],
  });
  assert.deepEqual(JSON.parse(String(assign?.availability)), {
    op: "&",
    c: [
      { type: "date", d: ">=", t: t("2030-01-07T11:00:00Z") },
      { type: "date", d: "<", t: t("2030-01-14T02:59:00Z") },
    ],
    showc: [false, false],
  });
});

test("seção perde a condição de fechamento, junto com sua flag de exibição", () => {
  const [section] = after([
    {
      id: "s",
      kind: "section",
      sectionIndex: 0,
      title: "Unidade",
      availability: {
        op: "&",
        c: [
          { type: "date", d: ">=", t: 1 },
          { type: "completion", cm: 7, e: 1 },
          { type: "date", d: "<", t: 2 },
        ],
        showc: [true, false, true],
      },
    },
  ]);
  assert.deepEqual(section?.availability, {
    op: "&",
    c: [
      { type: "date", d: ">=", t: t("2030-01-07T11:00:00Z") },
      { type: "completion", cm: 7, e: 1 },
    ],
    showc: [true, false],
  });
});

test("datas aninhadas são reescritas no lugar e árvore 'ou' sem datas é envolvida por 'e'", () => {
  const [nested, alternative] = after([
    {
      id: "a",
      kind: "assignment",
      sectionIndex: 0,
      title: "Tarefa",
      availability: {
        op: "|",
        show: true,
        c: [
          { op: "&", c: [{ type: "date", d: ">=", t: 1 }, { type: "date", d: "<", t: 2 }] },
          { type: "profile", sf: "email", op: "contains", v: "@example.test" },
        ],
      },
    },
    {
      id: "f",
      kind: "forum",
      sectionIndex: 0,
      title: "Fórum",
      availability: { op: "|", show: false, c: [{ type: "group", id: 1 }, { type: "group", id: 2 }] },
    },
  ]);
  assert.deepEqual(nested?.availability, {
    op: "|",
    show: true,
    c: [
      {
        op: "&",
        c: [
          { type: "date", d: ">=", t: t("2030-01-07T11:00:00Z") },
          { type: "date", d: "<", t: t("2030-01-14T02:59:00Z") },
        ],
      },
      { type: "profile", sf: "email", op: "contains", v: "@example.test" },
    ],
  });
  assert.deepEqual(alternative?.availability, {
    op: "&",
    c: [
      { op: "|", show: false, c: [{ type: "group", id: 1 }, { type: "group", id: 2 }] },
      { type: "date", d: ">=", t: t("2030-01-07T11:00:00Z") },
      { type: "date", d: "<", t: t("2030-01-14T02:59:00Z") },
    ],
    showc: [false, false, false],
  });
});

test("restrição ilegível ou incoerente bloqueia o plano em vez de ser substituída", () => {
  for (const availability of [
    "{não é json",
    { op: "&", c: [{ type: "date", d: ">=", t: 1 }], showc: [true, false] },
    { op: "&", c: "x" },
    { op: "&", c: [null] },
  ]) {
    const result = buildDatePlan(input, [{ id: "a", kind: "assignment", sectionIndex: 0, title: "Tarefa", availability }]);
    assert.equal(result.ok, false, JSON.stringify(availability));
    if (!result.ok) assert.deepEqual(result.issues.map((issue) => issue.code), ["invalid_availability"]);
  }
});

test("entrada ou alvos fora do contrato e alvos repetidos não geram plano", () => {
  const target: DateTarget = { id: "a", kind: "assignment", sectionIndex: 0, title: "Tarefa" };
  for (const overrides of [
    { opensAtTime: "24:00" },
    { closesAtTime: "8:00" },
    { unitCount: 0 },
    { daysPerUnit: 366 },
    { timezoneOffsetMinutes: 900 },
    { startDate: "2101-01-03" },
  ]) {
    const result = buildDatePlan({ ...input, ...overrides }, [target]);
    assert.equal(result.ok, false, JSON.stringify(overrides));
    if (!result.ok) assert.deepEqual(result.issues.map((issue) => [issue.code, issue.path]), [["invalid_date_plan", "input"]]);
  }
  const empty = buildDatePlan(input, []);
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.equal(empty.issues[0]?.path, "targets");
  const unknownKind = buildDatePlan(input, [{ ...target, kind: "label" } as unknown as DateTarget]);
  assert.equal(unknownKind.ok, false);
  const repeated = buildDatePlan(input, [target, { ...target, title: "Outra" }]);
  assert.equal(repeated.ok, false);
  if (!repeated.ok) assert.deepEqual(repeated.issues.map((issue) => issue.code), ["duplicate_target"]);
});

test("a tabela de prévia compara instantes, não o texto da data", () => {
  assert.equal(sameInstant("2030-01-07T11:00:00Z", "2030-01-07T11:00:00.000Z"), true);
  assert.equal(sameInstant("2030-01-07T08:00:00-03:00", "2030-01-07T11:00:00.000Z"), true);
  assert.equal(sameInstant("2030-01-07T11:00:00Z", "2030-01-07T11:01:00Z"), false);
  assert.equal(sameInstant(undefined, undefined), true);
  assert.equal(sameInstant(undefined, "2030-01-07T11:00:00Z"), false);
  assert.deepEqual(
    (["section", "assignment", "quiz", "forum"] as const).map(kindLabel),
    ["Unidade", "Tarefa", "Quiz", "Fórum"],
  );
});
