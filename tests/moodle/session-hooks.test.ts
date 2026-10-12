import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { z } from "zod";
import {
  buildDatePlan,
  previewDatePlan,
} from "../../src/domain/dates/index.ts";
import type { DatePlanInput } from "../../src/domain/dates/index.ts";
import type { useMoodle } from "../../src/client/features/moodle/hooks/use-moodle.ts";

function publicFunction<T>(
  path: URL,
  name: string,
  dependencies: Record<string, unknown>,
): T {
  const source = readFileSync(path, "utf8");
  const ast = ts.createSourceFile(
    path.pathname,
    source,
    ts.ScriptTarget.ESNext,
    true,
  );
  const declaration = ast.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === name,
  );
  assert.ok(declaration, name);
  const compiled = ts
    .transpileModule(declaration.getText(ast), {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    })
    .outputText.replace(/^export /, "");
  return new Function(
    ...Object.keys(dependencies),
    `${compiled}; return ${name};`,
  )(...Object.values(dependencies)) as T;
}

function stateFixture() {
  let cursor = 0;
  const states: unknown[] = [];
  function useState<T>(initial: T): [T, (next: T | ((value: T) => T)) => void] {
    const index = cursor++;
    if (!(index in states)) states[index] = initial;
    return [
      states[index] as T,
      (next) => {
        states[index] =
          typeof next === "function"
            ? (next as (value: T) => T)(states[index] as T)
            : next;
      },
    ];
  }
  return {
    hooks: {
      useState,
      useRef: <T>(initial: T) => useState({ current: initial })[0],
      useCallback: <T>(callback: T) => callback,
      useEffect() {},
    },
    render<T>(hook: () => T) {
      cursor = 0;
      return hook();
    },
  };
}

const status = {
  available: true,
  configured: true,
  validated: false,
  authenticated: true,
  connectedUrl: "https://same.example/",
  profile: null,
  compatibility: { verified: false, profile: null, message: "Unverified" },
};
const connectionPath = new URL(
  "../../src/client/features/moodle/hooks/use-moodle.ts",
  import.meta.url,
);
const message = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

test("connection changes synchronously invalidate owners, including same-account login, and drop an old catalogue response", async () => {
  const state = stateFixture();
  let invalidations = 0,
    resolveCourses: ((value: unknown) => void) | undefined;
  const connection = publicFunction<typeof useMoodle>(
    connectionPath,
    "useMoodle",
    {
      ...state.hooks,
      message,
      moodlePost: async () => ({ ok: true }),
      readMoodleStatus: async () => status,
      readMoodleCourses: async () =>
        await new Promise((resolve) => {
          resolveCourses = resolve;
        }),
    },
  );
  const render = () =>
    state.render(() =>
      connection({
        onSessionChange() {
          invalidations++;
        },
      }),
    );
  const pending = render().loadCourses();
  const reconnect = render().login("same", "fake", "https://same.example/");
  assert.equal(invalidations, 1);
  assert.deepEqual(render().courses, []);
  resolveCourses!([{ id: 5, title: "Old course" }]);
  await pending;
  await reconnect;
  assert.deepEqual(render().courses, []);
  const logout = render().logout();
  assert.equal(invalidations, 2);
  await logout;
  await render().login("same", "fake", "https://same.example/");
  assert.equal(invalidations, 3);
});

test("status refresh and rejected catalogue requests invalidate expired or externally changed connections once", async () => {
  const state = stateFixture();
  let invalidations = 0;
  let next = { ...status, name: "First account" };
  let denied = false;
  const connection = publicFunction<typeof useMoodle>(
    connectionPath,
    "useMoodle",
    {
      ...state.hooks,
      message,
      moodlePost: async () => ({ ok: true }),
      readMoodleStatus: async () => next,
      readMoodleCourses: async () => {
        if (denied) throw new Error("Session expired");
        return [{ id: 5, title: "Old course" }];
      },
    },
  );
  const render = () =>
    state.render(() =>
      connection({
        onSessionChange() {
          invalidations++;
        },
      }),
    );
  await render().refresh();
  await render().loadCourses();
  next = { ...next, authenticated: false };
  denied = true;
  await render().loadCourses();
  assert.equal(invalidations, 1);
  assert.equal(render().status?.authenticated, false);
  assert.deepEqual(render().courses, []);
  assert.equal(render().busy, false);
  await render().refresh();
  assert.equal(invalidations, 1);
  next = { ...next, authenticated: true };
  await render().refresh();
  next = { ...next, connectedUrl: "https://other.example/" };
  await render().refresh();
  assert.equal(invalidations, 2);
  next = { ...next, name: "Other account" };
  await render().refresh();
  assert.equal(invalidations, 3);
  await render().login("same", "fake", "https://other.example/");
  assert.equal(
    invalidations,
    4,
    "explicit login invalidates once, with no duplicate invalidation from its status readback",
  );
});

type Dates = {
  input: DatePlanInput;
  courseId: number;
  targetsText: string;
  moodlePreview: unknown;
  error: string;
  busy: boolean;
  unknownResult: boolean;
  moodle: ReturnType<typeof useMoodle>;
  selectCourse(id: number): void;
  changeTargets(text: string): void;
  readTargets(): Promise<void>;
  previewMoodleDates(): Promise<void>;
  confirmDates(): Promise<void>;
};
const targets = [
  { id: "section:2", kind: "section", sectionIndex: 0, title: "Unit" },
];
function dateFixture(
  post: (path: string, body: unknown) => Promise<unknown>,
  read: () => Promise<Response> = async () =>
    Response.json({ ok: true, targets }),
) {
  const state = stateFixture();
  const connection = publicFunction<typeof useMoodle>(
    connectionPath,
    "useMoodle",
    {
      ...state.hooks,
      message,
      moodlePost: async () => ({ ok: true }),
      readMoodleStatus: async () => status,
      readMoodleCourses: async () => [],
    },
  );
  // The override lets isolated worktrees test the same production hook before integration.
  const datePath = process.env.MOODLE_TEST_DATE_HOOK
    ? pathToFileURL(process.env.MOODLE_TEST_DATE_HOOK)
    : new URL(
        "../../src/client/features/dates/use-date-planner.ts",
        import.meta.url,
      );
  const planner = publicFunction<() => Dates>(datePath, "useDatePlanner", {
    ...state.hooks,
    useMoodle: connection,
    z,
    buildDatePlan,
    previewDatePlan,
    moodlePost: post,
    issuesMessage: (_value: unknown, fallback: string) => fallback,
    fetch: read,
  });
  return () => state.render(planner);
}
function datePreview(input: DatePlanInput) {
  const plan = buildDatePlan(
    input,
    targets as Parameters<typeof buildDatePlan>[1],
  );
  assert.ok(plan.ok);
  return {
    ok: true,
    previewId: "old-preview",
    hash: "fake-hash",
    plan: plan.plan,
    targets,
  };
}

test("date logout resets the course and remote targets before an old confirmation callback can send", async () => {
  const calls: string[] = [];
  const render = dateFixture(async (path, body) => {
    calls.push(path);
    return datePreview((body as { input: DatePlanInput }).input);
  });
  let planner = render();
  planner.selectCourse(5);
  planner = render();
  await planner.readTargets();
  planner = render();
  assert.match(planner.targetsText, /section:2/);
  await planner.previewMoodleDates();
  planner = render();
  const oldConfirm = planner.confirmDates;
  const logout = planner.moodle.logout();
  planner = render();
  assert.equal(planner.courseId, 0);
  assert.equal(planner.targetsText, "");
  assert.equal(planner.moodlePreview, null);
  await oldConfirm();
  await logout;
  await render().moodle.login("other", "fake", "https://other.example/");
  await oldConfirm();
  assert.deepEqual(calls, ["/api/moodle/dates/preview"]);
  assert.equal(render().unknownResult, false);
});

test("late date previews and course reads are discarded after reconnect while manually entered targets survive", async () => {
  let resolvePreview: ((value: unknown) => void) | undefined;
  let resolveRead: ((value: Response) => void) | undefined;
  const render = dateFixture(
    async () =>
      await new Promise((resolve) => {
        resolvePreview = resolve;
      }),
    async () =>
      await new Promise((resolve) => {
        resolveRead = resolve;
      }),
  );
  let planner = render();
  planner.selectCourse(5);
  planner = render();
  const pendingPreview = planner.previewMoodleDates();
  await planner.moodle.login("same", "fake", "https://same.example/");
  resolvePreview!(datePreview(planner.input));
  await pendingPreview;
  assert.equal(render().moodlePreview, null);
  planner = render();
  planner.selectCourse(8);
  planner = render();
  const pendingRead = planner.readTargets();
  await planner.moodle.logout();
  resolveRead!(Response.json({ ok: true, targets }));
  await pendingRead;
  assert.equal(render().targetsText, "");
  assert.equal(render().courseId, 0);
  assert.equal(render().error, "");
  planner = render();
  planner.changeTargets("[]");
  await render().moodle.login("same", "fake", "https://same.example/");
  assert.equal(render().targetsText, "[]");
});

test("a date confirmation already sent remains locked when connection changes before a late response", async () => {
  let reject: ((error: Error) => void) | undefined;
  let confirmations = 0;
  const render = dateFixture(async (path, body) => {
    if (path.endsWith("/preview"))
      return datePreview((body as { input: DatePlanInput }).input);
    confirmations++;
    return await new Promise((_resolve, fail) => {
      reject = fail;
    });
  });
  let planner = render();
  planner.selectCourse(5);
  planner = render();
  await planner.previewMoodleDates();
  planner = render();
  const pending = planner.confirmDates();
  await planner.moodle.logout();
  assert.equal(render().unknownResult, true);
  reject!(new Error("Lost response"));
  await pending;
  planner = render();
  assert.equal(planner.unknownResult, true);
  await planner.previewMoodleDates();
  await render().confirmDates();
  assert.equal(confirmations, 1);
});
