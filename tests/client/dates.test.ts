import { test } from "node:test";
import assert from "node:assert/strict";
import { utcFieldValue, utcTimestamp } from "../../src/client/dates.ts";
import { createProject } from "../../src/client/project.ts";
import { applyCommands } from "../../src/client/commands.ts";

test("UTC course/activity/chat fields convert explicit offsets to the represented instant", () => {
  assert.equal(utcFieldValue("2026-10-12T09:00:00-03:00"), "2026-10-12T12:00");
  assert.equal(utcFieldValue("2026-10-12T23:30:00-03:00"), "2026-10-13T02:30");
  assert.equal(utcFieldValue("2026-10-12T09:00:00+02:00"), "2026-10-12T07:00");
  assert.equal(utcTimestamp("2026-10-12T12:01"), "2026-10-12T12:01:00.000Z");
  assert.equal(utcFieldValue(undefined), "");
  assert.equal(utcTimestamp(""), undefined);
});

test("displaying UTC does not normalize original dates during unrelated course edits", () => {
  const project = createProject();
  const original = "2026-10-12T09:00:34-03:00";
  project.draft.metadata.startDate = original;
  assert.equal(
    utcFieldValue(project.draft.metadata.startDate),
    "2026-10-12T12:00",
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
