import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDatePlan,
  previewDatePlan,
} from "../../src/domain/dates/index.ts";

const input = {
  startDate: "2026-10-12",
  unitCount: 2,
  daysPerUnit: 7,
  opensAtTime: "08:00",
  closesAtTime: "23:59",
  timezoneOffsetMinutes: -180,
};
test("cadência explícita respeita fuso e seção não recebe fechamento", () => {
  const result = buildDatePlan(input, [
    { id: "s1", kind: "section", sectionIndex: 0, title: "Tópico1" },
    { id: "q2", kind: "quiz", sectionIndex: 1, title: "Quiz2" },
  ]);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      result.plan.changes[0]?.after.opensAt,
      "2026-10-12T11:00:00.000Z",
    );
    assert.equal(result.plan.changes[0]?.after.closesAt, undefined);
    assert.equal(
      result.plan.changes[1]?.after.opensAt,
      "2026-10-19T11:00:00.000Z",
    );
    assert.equal(
      result.plan.changes[1]?.after.closesAt,
      "2026-10-26T02:59:00.000Z",
    );
  }
});
test("calendário inexistente e alvo fora das unidades impedem plano", () => {
  assert.equal(
    buildDatePlan({ ...input, startDate: "2026-02-30" }, []).ok,
    false,
  );
  assert.equal(
    buildDatePlan(input, [
      { id: "s", kind: "section", sectionIndex: 2, title: "inválido" },
    ]).ok,
    false,
  );
});
test("restrições por direção são atualizadas preservando ordem e condições não relacionadas", () => {
  const availability = {
    op: "&",
    c: [
      { type: "group", id: 32 },
      { type: "date", d: "<", t: 100 },
      { type: "date", d: ">=", t: 10 },
    ],
    showc: [false, true, false],
  };
  const before = structuredClone(availability);
  const result = buildDatePlan(input, [
    {
      id: "a",
      kind: "assignment",
      title: "Tarefa",
      sectionIndex: 0,
      availability,
    },
  ]);
  assert.equal(result.ok, true);
  if (result.ok) {
    const after = result.plan.changes[0]!.after
      .availability as typeof availability;
    assert.deepEqual(after.c[0], before.c[0]);
    assert.deepEqual(after.showc, before.showc);
    assert.equal(after.c[1]?.t, Date.parse("2026-10-19T02:59:00Z") / 1000);
    assert.equal(after.c[2]?.t, Date.parse("2026-10-12T11:00:00Z") / 1000);
    assert.deepEqual(availability, before);
  }
});
test("editar plano invalida hash da prévia e prévia não altera entradas", async () => {
  const result = buildDatePlan(input, [
    { id: "s", kind: "section", sectionIndex: 0, title: "Aula" },
  ]);
  assert.equal(result.ok, true);
  if (result.ok) {
    const first = await previewDatePlan(result.plan);
    result.plan.changes[0]!.after.opensAt = "2026-10-13T11:00:00Z";
    const next = await previewDatePlan(result.plan);
    assert.notEqual(first.hash, next.hash);
    assert.notEqual(
      first.plan.changes[0]?.after.opensAt,
      next.plan.changes[0]?.after.opensAt,
    );
  }
});
