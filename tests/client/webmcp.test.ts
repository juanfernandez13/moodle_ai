import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createProject,
  makeActivity,
  projectIdentity,
} from "../../src/client/project.ts";
import {
  buildProposal,
  registerBuilderTools,
} from "../../src/client/webmcp.ts";
import { applyCommands } from "../../src/client/commands.ts";

function projectFixture() {
  const project = createProject("Ferramentas assistidas");
  project.draft.sections[0]!.activities.push(makeActivity("assignment"));
  return project;
}

test("WebMCP proposals preserve the course until reviewed and reject stale or private fields", () => {
  const project = projectFixture();
  const activity = project.draft.sections[0]!.activities[0]!;
  const before = structuredClone(project);
  const proposal = buildProposal(project, {
    expectedRevision: project.draft.revision,
    changes: [{ activityId: activity.id, title: "Título revisado" }],
  });
  assert.deepEqual(project, before);
  assert.equal(proposal.projectId, projectIdentity(project));
  const otherWorkspace = createProject();
  otherWorkspace.draft = structuredClone(project.draft);
  assert.equal(otherWorkspace.draft.id, project.draft.id);
  assert.notEqual(proposal.projectId, projectIdentity(otherWorkspace));
  const applied = applyCommands(
    project.draft,
    proposal.expectedRevision,
    proposal.commands,
  );
  assert.equal(applied.ok, true);
  if (applied.ok)
    assert.equal(
      applied.draft.sections[0]!.activities[0]!.title,
      "Título revisado",
    );
  assert.throws(
    () =>
      buildProposal(project, {
        expectedRevision: project.draft.revision + 1,
        changes: [{ activityId: activity.id, title: "Desatualizado" }],
      }),
    /stale_revision/,
  );
  assert.throws(() =>
    buildProposal(project, {
      expectedRevision: project.draft.revision,
      changes: [{ activityId: activity.id, apiKey: "private" }],
    }),
  );
});

test("WebMCP refuses ambiguous repeated activity edits and empty edits", () => {
  const project = projectFixture();
  const activityId = project.draft.sections[0]!.activities[0]!.id;
  assert.throws(() =>
    buildProposal(project, {
      expectedRevision: project.draft.revision,
      changes: [
        { activityId, title: "Título" },
        { activityId, description: "Descrição" },
      ],
    }),
  );
  assert.throws(() =>
    buildProposal(project, {
      expectedRevision: project.draft.revision,
      changes: [{ activityId }],
    }),
  );
});

test("optional async registration tolerates StrictMode and resumes without duplicate tools", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  const registered = new Map<
    string,
    { execute: (input: unknown) => Promise<unknown> }
  >();
  let attempts = 0;
  const mock = {
    modelContext: {
      async registerTool(tool: {
        name: string;
        execute: (input: unknown) => Promise<unknown>;
      }) {
        await Promise.resolve();
        attempts++;
        if (registered.has(tool.name)) throw new Error("Duplicate tool name");
        registered.set(tool.name, tool);
      },
    },
  };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: mock,
  });
  const drain = () =>
    (mock as unknown as { __moodleAiRegistration: { queue: Promise<void> } })
      .__moodleAiRegistration.queue;
  try {
    const project = projectFixture();
    const firstCleanup = registerBuilderTools(
      () => project,
      () => {},
    );
    firstCleanup();
    const secondCleanup = registerBuilderTools(
      () => project,
      () => {},
    );
    await drain();
    assert.equal(registered.size, 5);
    secondCleanup();
    await drain();
    await assert.rejects(
      registered.get("get_course_summary")!.execute({}),
      /Abra um projeto/,
    );
    project.draft.revision++;
    const finalCleanup = registerBuilderTools(
      () => project,
      () => {},
    );
    await drain();
    assert.equal(
      attempts,
      5,
      "an API without unregister must reuse the existing tools",
    );
    const summary = (await registered
      .get("get_course_summary")!
      .execute({})) as { revision: number };
    assert.equal(summary.revision, project.draft.revision);
    finalCleanup();
    await drain();
  } finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
