import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import {
  mapStudentRows, buildStudentPreview, validateStudents,
} from "../../src/domain/students/index.ts";
import type { StudentPreview } from "../../src/domain/students/index.ts";
import {
  buildStudentBatches, createStudentExample, editableStudentFields,
  studentFieldLabels, studentPage,
} from "../../src/client/features/students/helpers.ts";
import {
  moodleStudentPreviewSchema, moodleStudentConfirmSchema,
} from "../../src/client/features/students/schemas.ts";
import type { MoodleStudentPreview } from "../../src/client/features/students/schemas.ts";
import type { useStudentsWorkflow } from "../../src/client/features/students/hooks/use-students-workflow.ts";
import type { EditableStudentTable } from "../../src/client/features/students/EditableStudentTable.tsx";

/** As in the existing client suite, transpile the actual public function only. */
function publicFunction<T>(path: string, name: string, dependencies: Record<string, unknown>): T {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.ESNext, true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const declaration = ast.statements.find((node) =>
    ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(declaration, name);
  const compiled = ts.transpileModule(declaration.getText(ast), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText.replace(/^export /, "");
  return new Function(...Object.keys(dependencies), `${compiled}; return ${name};`)(
    ...Object.values(dependencies),
  ) as T;
}

/** Minimal state scheduling; actions and request boundaries are production code. */
function workflowFixture(post: (url: string, body: unknown) => Promise<unknown>) {
  let cursor = 0;
  const state: unknown[] = [];
  function useState<T>(initial: T): [T, (next: T | ((previous: T) => T)) => void] {
    const index = cursor++;
    if (!(index in state)) state[index] = initial;
    return [state[index] as T, (next) => {
      state[index] = typeof next === "function"
        ? (next as (previous: T) => T)(state[index] as T) : next;
    }];
  }
  const dependencies = {
    useState,
    mapStudentRows,
    createStudentExample,
    buildStudentPreview,
    buildStudentBatches,
    moodlePost: post,
    moodleStudentPreviewSchema,
    moodleStudentConfirmSchema,
  };
  const hooks = "../../src/client/features/students/hooks/";
  const render = publicFunction<typeof useStudentsWorkflow>(
    `${hooks}use-students-workflow.ts`, "useStudentsWorkflow", {
    useState,
    useRef: <T>(initial: T) => useState({ current: initial })[0],
    useMemo: <T>(factory: () => T) => factory(),
    useMoodle: () => ({ status: { authenticated: true, validated: true }, courses: [] }),
    validateStudents,
    useStudentSource: publicFunction(`${hooks}use-student-source.ts`, "useStudentSource", dependencies),
    useStudentCsv: publicFunction(`${hooks}use-student-csv.ts`, "useStudentCsv", dependencies),
    useStudentMoodle: publicFunction(`${hooks}use-student-moodle.ts`, "useStudentMoodle", dependencies),
  });
  return () => {
    cursor = 0;
    return render();
  };
}

function remotePreview(candidate: StudentPreview): MoodleStudentPreview {
  return moodleStudentPreviewSchema.parse({
    ok: true,
    previewId: "preview-one-use",
    hash: candidate.hash,
    rows: candidate.rows.map((row) => ({ username: row.username, status: "new" })),
    effectiveOptions: {
      mode: "create",
      enrol: true,
      newPassword: "generated-by-moodle-and-email",
      existingPasswords: "preserved",
      updateFields: "csv-only",
      allowDelete: false,
      allowRename: false,
      allowSuspend: false,
      defaults: { city: "", country: "BR" },
      enrolments: [],
    },
  });
}

async function prepared(render: ReturnType<typeof workflowFixture>) {
  let workflow = render();
  workflow.source.example();
  workflow = render();
  workflow.source.changeRow(workflow.source.rows[1]!.id, "email", "bruno@example.org");
  workflow = render();
  await workflow.csv.prepare();
  return render();
}

test("course batches preserve edited source and reject spreadsheet formulas without sanitizing them", async () => {
  const rows = mapStudentRows(createStudentExample());
  rows[1]!.email = "bruno@example.org";
  const before = structuredClone(rows);
  const options = { mode: "create" as const, enrol: true };
  const batches = buildStudentBatches(rows, options, " A ;B\nA, =formula() ");
  assert.deepEqual(batches.map((batch) => batch[0]!.course), ["A", "B", "=formula()"]);
  assert.deepEqual(rows, before);
  assert.notEqual(batches[0]![0], rows[0]);
  const result = await buildStudentPreview(batches[2]!, options);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.every((issue) => issue.code === "unsafe_csv_value"));
  assert.equal(batches[2]![0]!.course, "=formula()");
  assert.deepEqual(buildStudentBatches(rows, { ...options, enrol: false }, "A;B"), [rows]);
});

test("CSV preparation discards a snapshot when rows change during hashing", async () => {
  const render = workflowFixture(async () => { throw new Error("No Moodle request expected"); });
  let workflow = render();
  workflow.source.example();
  workflow = render();
  workflow.source.changeRow(workflow.source.rows[1]!.id, "email", "bruno@example.org");
  workflow = render();
  const pending = workflow.csv.prepare();
  workflow.source.changeRow(workflow.source.rows[0]!.id, "firstName", "Anabela");
  await pending;
  workflow = render();
  assert.equal(workflow.stage, 2);
  assert.deepEqual(workflow.csv.previews, []);
  assert.match(workflow.error, /A lista mudou durante a conferência/);
  assert.equal(workflow.busy, false);
});

test("Moodle preview rejects both stale rows and a response with a changed hash", async () => {
  const calls: {
    url: string;
    body: unknown
  }[] = [];
  let resolve: ((value: unknown) => void) | undefined;
  const render = workflowFixture((url, body) => {
    calls.push({ url, body });
    return new Promise((done) => { resolve = done; });
  });
  let workflow = await prepared(render);
  const candidate = workflow.csv.previews[0]!;
  const pending = workflow.remote.previewMoodle();
  assert.equal(calls[0]!.url, "/api/moodle/students/preview");
  assert.deepEqual(calls[0]!.body, {
    rows: candidate.rows,
    options: candidate.options,
    expectedHash: candidate.hash
  });
  workflow.source.changeRow(workflow.source.rows[0]!.id, "firstName", "Anabela");
  resolve!(remotePreview(candidate));
  await pending;
  workflow = render();
  assert.equal(workflow.remote.moodlePreview, null);
  assert.match(workflow.error, /A lista mudou; confira o CSV novamente/);
  await workflow.csv.prepare();
  workflow = render();
  const changedHash = workflow.remote.previewMoodle();
  resolve!({ ...remotePreview(workflow.csv.previews[0]!), hash: "changed" });
  await changedHash;
  workflow = render();
  assert.equal(workflow.remote.moodlePreview, null);
  assert.match(workflow.error, /A identificação da prévia mudou/);
});

test("confirmation consumes its current preview before sending; unknown results remain locked after edits", async () => {
  const calls: {
    url: string;
    body: unknown
  }[] = [];
  const render = workflowFixture(async (url, body) => {
    calls.push({ url, body });
    if (url.endsWith("/preview")) return remotePreview(candidate);
    return {
      ok: true,
      results: [
        { username: "ana.lima", status: "created", message: "Criado" },
        {
          username: "bruno.costa",
          status: "unknown",
          message: "Confira no Moodle"
        },
      ]
    };
  });
  let workflow = await prepared(render);
  const candidate = workflow.csv.previews[0]!;
  await workflow.remote.previewMoodle();
  workflow = render();
  const pending = workflow.remote.confirmMoodle();
  workflow = render();
  assert.equal(workflow.remote.moodlePreview, null);
  await workflow.remote.confirmMoodle();
  await pending;
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1]!.body, {
    previewId: "preview-one-use",
    expectedHash: candidate.hash,
    confirmation: true
  });
  workflow = render();
  assert.equal(workflow.remote.unknownResult, true);
  assert.deepEqual(workflow.remote.results.map((entry) => entry.status), ["created", "unknown"]);
  workflow.source.changeRow(workflow.source.rows[0]!.id, "firstName", "Anabela");
  workflow = render();
  assert.equal(workflow.remote.unknownResult, true);
  assert.deepEqual(workflow.remote.results, []);
});

test("editable student table keeps ten-row pages, stable targets, original cells and precise accessible labels", () => {
  const rows = Array.from({ length: 12 }, (_, index) => ({
    ...mapStudentRows(createStudentExample())[0]!,
    id: `student-${index}`,
    rowNumber: index + 2,
  }));
  const Table = publicFunction<typeof EditableStudentTable>(
    "../../src/client/features/students/EditableStudentTable.tsx", "EditableStudentTable", {
    React,
    editableStudentFields,
    studentFieldLabels,
    studentPage,
    Pagination: () => null,
  });
  const $ = load(renderToStaticMarkup(createElement(Table, {
    rows,
    page: 0,
    issues: [{
      rowId: rows[0]!.id,
      path: "rows[0].email",
      code: "email",
      message: "Confira o e-mail"
    }],
    onPageChange() { },
    onRowChange() { },
  })));
  assert.equal($("tbody tr").length, 10);
  assert.equal($("#student-student-0 input[aria-label='Linha 2: e-mail']").attr("aria-invalid"), "true");
  assert.equal($("#student-student-0 input[aria-label='Linha 2: primeiro nome']").attr("value"), "Ana");
  assert.match($("#student-student-0 details").text(), /Nome completo: Ana Lima/);
  assert.deepEqual(studentPage(rows, 1).map((row) => row.id), ["student-10", "student-11"]);
});
