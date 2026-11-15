import { test } from "node:test";
import assert from "node:assert/strict";
import {
  localFieldValue,
  localTimestamp,
  readableDate,
} from "../../src/client/dates.ts";
import { createProject } from "../../src/client/project.ts";
import { applyCommands } from "../../src/client/commands.ts";

// O "computador do professor" destes testes fica em Manaus (UTC−4, sem horário de verão): nem UTC nem Brasília,
// para o teste provar que vale o fuso da máquina. Cada arquivo de teste roda em processo próprio.
process.env.TZ = "America/Manaus";

test("os campos de data mostram o horário do computador do professor, não UTC", () => {
  assert.equal(localFieldValue("2026-10-12T12:00:00Z"), "2026-10-12T08:00");
  assert.equal(localFieldValue("2026-10-12T09:00:00-03:00"), "2026-10-12T08:00");
  // 23:59 de Brasília ainda é o mesmo dia para quem está em Manaus; em UTC já seria o dia seguinte.
  assert.equal(localFieldValue("2026-10-18T23:59:00-03:00"), "2026-10-18T22:59");
  assert.equal(localFieldValue("2026-10-12T01:30:00Z"), "2026-10-11T21:30");
  assert.equal(localFieldValue(undefined), "");
  assert.equal(localFieldValue("não é data"), "");
});

test("o que o professor digita é lido no horário do computador e guardado como instante", () => {
  assert.equal(localTimestamp("2026-10-18T23:59"), "2026-10-19T03:59:00.000Z");
  assert.equal(localTimestamp(""), undefined);
  assert.equal(localTimestamp("não é data"), undefined);
  // Ida e volta: o campo mostra de novo exatamente o que foi digitado.
  for (const typed of ["2026-01-01T00:00", "2026-10-18T23:59", "2027-02-28T12:30"])
    assert.equal(localFieldValue(localTimestamp(typed)), typed);
});

test("a data aparece por extenso do jeito que o professor lê, no horário do computador", () => {
  assert.equal(readableDate("2026-10-18T23:59:00-03:00"), "18/10/2026 às 22:59");
  assert.equal(readableDate("2026-03-05T12:05:00Z"), "05/03/2026 às 08:05");
  assert.equal(readableDate(undefined), "");
  assert.equal(readableDate("não é data"), "");
});

test("mostrar a data não reescreve o valor original em edições que não mexem nela", () => {
  const project = createProject();
  const original = "2026-10-12T09:00:34-03:00";
  project.draft.metadata.startDate = original;
  assert.equal(
    localFieldValue(project.draft.metadata.startDate),
    "2026-10-12T08:00",
  );
  const edited = applyCommands(project.draft, project.draft.revision, [
    {
      type: "set_metadata",
      metadata: { ...project.draft.metadata, fullName: "Curso revisado" },
    },
  ]);
  assert.equal(edited.ok, true);
  if (edited.ok) assert.equal(edited.draft.metadata.startDate, original);
  assert.equal(project.draft.metadata.startDate, original);
});
