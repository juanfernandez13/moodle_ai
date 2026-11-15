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

interface PageTool {
  name: string;
  annotations?: { readOnlyHint?: boolean };
  execute: (input: unknown) => Promise<unknown>;
}

/** Página de mentira com `document.modelContext`. `honorsSignal: false` imita um navegador antigo, que ignora o sinal. */
async function withPage(
  honorsSignal: boolean,
  run: (page: {
    registered: Map<string, PageTool>;
    attempts: () => number;
    drain: () => Promise<void>;
  }) => Promise<void>,
) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  const registered = new Map<string, PageTool>();
  let attempts = 0;
  const mock = {
    modelContext: {
      async registerTool(tool: PageTool, options?: { signal?: AbortSignal }) {
        await Promise.resolve();
        attempts++;
        if (registered.has(tool.name)) throw new Error("Duplicate tool name");
        registered.set(tool.name, tool);
        if (honorsSignal)
          options?.signal?.addEventListener("abort", () =>
            registered.delete(tool.name),
          );
      },
    },
  };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: mock,
  });
  try {
    await run({
      registered,
      attempts: () => attempts,
      drain: () =>
        (
          mock as unknown as {
            __moodleAiRegistration: { queue: Promise<void> };
          }
        ).__moodleAiRegistration.queue,
    });
  } finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else Reflect.deleteProperty(globalThis, "document");
  }
}

test("tools leave the page when the course screen closes and come back without duplicates", async () => {
  await withPage(true, async ({ registered, attempts, drain }) => {
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
    assert.equal(attempts(), 5, "StrictMode must not register twice");
    const stale = registered.get("get_course_summary")!;
    secondCleanup();
    await drain();
    assert.equal(registered.size, 0, "no tool stays on the other screens");
    assert.match(
      ((await stale.execute({})) as { error: string }).error,
      /Abra um projeto/,
    );
    project.draft.revision++;
    const finalCleanup = registerBuilderTools(
      () => project,
      () => {},
    );
    await drain();
    assert.equal(registered.size, 5);
    const summary = (await registered
      .get("get_course_summary")!
      .execute({})) as { revision: number };
    assert.equal(summary.revision, project.draft.revision);
    finalCleanup();
    await drain();
    assert.equal(registered.size, 0);
  });
});

test("a browser that ignores the registration signal keeps working tools after reopening", async () => {
  await withPage(false, async ({ registered, drain }) => {
    const project = projectFixture();
    registerBuilderTools(
      () => project,
      () => {},
    )();
    await drain();
    project.draft.revision++;
    const cleanup = registerBuilderTools(
      () => project,
      () => {},
    );
    await drain();
    assert.equal(registered.size, 5);
    const summary = (await registered
      .get("get_course_summary")!
      .execute({})) as { revision: number };
    assert.equal(summary.revision, project.draft.revision);
    cleanup();
    await drain();
  });
});

test("tools say which ones only read and answer mistakes as values the agent can read", async () => {
  await withPage(true, async ({ registered, drain }) => {
    const project = projectFixture();
    let proposals = 0;
    const cleanup = registerBuilderTools(
      () => project,
      () => {
        proposals++;
      },
    );
    await drain();
    for (const [name, tool] of registered)
      assert.equal(
        tool.annotations?.readOnlyHint,
        name !== "propose_course_changes",
        name,
      );
    const missing = (await registered
      .get("get_activity")!
      .execute({ activityId: "nao-existe" })) as { error: string };
    assert.match(missing.error, /não encontrada/);
    const invalid = (await registered.get("get_activity")!.execute({})) as {
      error: string;
    };
    assert.match(invalid.error, /activityId/);
    const stale = (await registered.get("propose_course_changes")!.execute({
      expectedRevision: project.draft.revision + 1,
      changes: [
        {
          activityId: project.draft.sections[0]!.activities[0]!.id,
          title: "Desatualizado",
        },
      ],
    })) as { error: string };
    assert.match(stale.error, /stale_revision/);
    assert.equal(proposals, 0);
    cleanup();
    await drain();
  });
});
