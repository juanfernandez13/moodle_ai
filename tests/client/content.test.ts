import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { createElement } from "react";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import type { Element } from "domhandler";
import * as navigation from "../../src/client/navigation.ts";
import { validateDraft } from "../../src/domain/course/index.ts";
import type { ContentBlock } from "../../src/domain/course/index.ts";
import {
  richTableRowFocus,
  issueEntityId,
} from "../../src/client/navigation.ts";
import {
  createProject,
  makeActivity,
  makeQuestion,
} from "../../src/client/project.ts";
import { utcFieldValue, utcTimestamp } from "../../src/client/dates.ts";

// Native Node strips .ts; compile the actual client TSX for behavior-level rendered output.
registerHooks({
  load(url, context, nextLoad) {
    if (!url.endsWith(".tsx") || !url.includes("/src/client/"))
      return nextLoad(url, context);
    return {
      format: "module",
      shortCircuit: true,
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }).outputText,
    };
  },
});
const { ContentPreview, RichEditor } =
  await import("../../src/client/components/content.tsx");
const { ActivityEditor } =
  await import("../../src/client/components/activity-editor.tsx");

test("a hundred-row table has a five-row preview and its issue opens exactly the affected editable row", () => {
  const table: Extract<ContentBlock, { kind: "table" }> = {
    id: "large-table",
    kind: "table",
    rows: Array.from({ length: 100 }, (_, index) => [
      {
        blocks: [
          {
            id: `cell-${index}`,
            kind: "text",
            text: `Row-content-${index}-end`,
          },
        ],
      },
    ]),
  };
  const project = createProject();
  project.draft.metadata.summaryBlocks = [table];
  const issuePath = "metadata.summaryBlocks[0].rows[87][0].blocks[0].text";
  assert.equal(richTableRowFocus(issuePath), 87);
  assert.equal(issueEntityId(project.draft, issuePath), "cell-87");
  const preview = renderToStaticMarkup(
    createElement(ContentPreview, { blocks: [table], assets: [] }),
  );
  assert.equal((preview.match(/<tr>/g) ?? []).length, 5);
  assert.ok(preview.includes("Row-content-4-end"));
  assert.ok(!preview.includes("Row-content-5-end"));
  const editor = renderToStaticMarkup(
    createElement(RichEditor, {
      label: "Resumo",
      blocks: [table],
      fallback: "",
      assets: [],
      focusBlock: 0,
      focusPath: issuePath,
      onChange() {},
    }),
  );
  assert.equal((editor.match(/<tr>/g) ?? []).length, 1);
  assert.ok(editor.includes("Row-content-87-end"));
  assert.ok(editor.includes('id="entity-cell-87"'));
  assert.ok(!editor.includes("Row-content-0-end"));
  assert.ok(!editor.includes("Row-content-86-end"));
  assert.ok(!editor.includes("Row-content-88-end"));
  assert.equal(
    issueFocusProbe(project, issuePath, editor),
    "Linha 88, coluna 1",
  );
  table.rows[87]![0]!.blocks = [
    {
      id: "cell-image-87",
      kind: "image",
      attachmentId: "missing",
      alt: "Imagem da fonte",
    },
  ];
  const imagePath =
    "metadata.summaryBlocks[0].rows[87][0].blocks[0].attachmentId";
  const imageEditor = renderToStaticMarkup(
    createElement(RichEditor, {
      label: "Resumo",
      blocks: [table],
      fallback: "",
      assets: [
        {
          id: "valid-image",
          name: "Imagem válida",
          mediaType: "image/png",
          bytes: new Uint8Array(),
        },
      ],
      focusBlock: 0,
      focusPath: imagePath,
      onChange() {},
    }),
  );
  assert.equal(
    issueFocusProbe(project, imagePath, imageEditor),
    "Imagem da célula",
  );
});

test("actual activity and chat datetime controls display UTC while retaining original offset strings", () => {
  const assignment = makeActivity("assignment");
  assignment.schedule = {
    opensAt: "2026-10-12T09:00:00-03:00",
    closesAt: "2026-10-12T15:00:00-03:00",
  };
  const before = structuredClone(assignment);
  const html = renderToStaticMarkup(
    createElement(ActivityEditor, {
      activity: assignment,
      assets: [],
      focusPath: "sections[0].activities[0].schedule.opensAt",
      onChange() {},
    }),
  );
  assert.ok(html.includes('value="2026-10-12T12:00"'));
  assert.ok(html.includes('value="2026-10-12T18:00"'));
  assert.deepEqual(assignment, before);
  const chat = makeActivity("chat");
  assert.equal(chat.type, "chat");
  if (chat.type !== "chat") return;
  chat.settings.sessionAt = "2026-10-12T09:00:00-03:00";
  const chatHtml = renderToStaticMarkup(
    createElement(ActivityEditor, {
      activity: chat,
      assets: [],
      focusPath: "sections[0].activities[0].settings.sessionAt",
      onChange() {},
    }),
  );
  assert.ok(chatHtml.includes('value="2026-10-12T12:00"'));
  assert.equal(chat.settings.sessionAt, "2026-10-12T09:00:00-03:00");
});

function issueFocusProbe(
  project: ReturnType<typeof createProject>,
  path: string,
  html: string,
): string {
  const $ = load(html);
  let focused = "";
  const wrap = (node: Element): HTMLElement =>
    ({
      dataset: { field: node.attribs["data-field"] },
      getClientRects: () =>
        $(node).parents("[hidden]").length || $(node).is("[hidden]")
          ? []
          : [{}],
      focus: () => {
        focused =
          $(node).closest("label").find("span").first().text() ||
          node.attribs.id ||
          "structural";
      },
      querySelectorAll: (selector: string) =>
        $(node)
          .find(selector)
          .toArray()
          .map((element) => wrap(element as Element)),
      scrollIntoView() {},
      tabIndex: -1,
    }) as unknown as HTMLElement;
  const doc = {
    getElementById: (id: string) => {
      const node = $("[id]")
        .toArray()
        .find((element) => $(element).attr("id") === id);
      return node ? wrap(node as Element) : null;
    },
    querySelector: () => wrap($("body")[0] as Element),
    querySelectorAll: (selector: string) =>
      $(selector)
        .toArray()
        .map((element) => wrap(element as Element)),
  } as unknown as Document;
  const source = readFileSync(
    new URL("../../app/page.tsx", import.meta.url),
    "utf8",
  );
  const ast = ts.createSourceFile(
    "page.tsx",
    source,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TSX,
  );
  let fn = "";
  const find = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "showIssue")
      fn = node.getText(ast);
    ts.forEachChild(node, find);
  };
  find(ast);
  assert.ok(fn);
  const names = [
    "project",
    "document",
    "setTimeout",
    ...Object.keys(navigation),
    "setShowReview",
    "setError",
    "setIssueFocus",
    "setView",
    "setActivityPages",
    "setActivityId",
    "setCoursePane",
  ];
  const values = [
    project,
    doc,
    (callback: () => void) => callback(),
    ...Object.values(navigation),
    ...Array.from({ length: 7 }, () => () => {}),
  ];
  const compiled = ts.transpileModule(fn, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  const showIssue = new Function(...names, `${compiled};return showIssue;`)(
    ...values,
  ) as (issue: { path: string; message: string }) => void;
  showIssue({ path, message: "Pendência real" });
  return focused;
}

test("showIssue focuses the real maximum-grade control rather than the activity title", () => {
  const project = createProject();
  const assignment = makeActivity("assignment");
  assert.equal(assignment.type, "assignment");
  if (assignment.type !== "assignment") return;
  assignment.settings.maxGrade = 0;
  project.draft.sections[0]!.activities = [assignment];
  const path = "sections[0].activities[0].settings.maxGrade";
  assert.ok(
    validateDraft(project.draft).issues.some((issue) => issue.path === path),
  );
  const html = renderToStaticMarkup(
    createElement(ActivityEditor, {
      activity: assignment,
      assets: [],
      focusPath: path,
      onChange() {},
    }),
  );
  assert.equal(issueFocusProbe(project, path, html), "Nota máxima");
});

test("showIssue focuses the real closing UTC control for an end-before-start issue", () => {
  const project = createProject();
  const assignment = makeActivity("assignment");
  assignment.schedule = {
    opensAt: "2026-10-12T12:00:00Z",
    closesAt: "2026-10-12T11:00:00Z",
  };
  project.draft.sections[0]!.activities = [assignment];
  const path = "sections[0].activities[0].schedule.closesAt";
  assert.ok(
    validateDraft(project.draft).issues.some((issue) => issue.path === path),
  );
  const html = renderToStaticMarkup(
    createElement(ActivityEditor, {
      activity: assignment,
      assets: [],
      focusPath: path,
      onChange() {},
    }),
  );
  assert.equal(issueFocusProbe(project, path, html), "Fechamento (UTC)");
});

test("question, option and matching controls use stable entity/field pairs and structural fallback", () => {
  const project = createProject();
  const quiz = makeActivity("quiz");
  assert.equal(quiz.type, "quiz");
  if (quiz.type !== "quiz") return;
  quiz.questions = [
    makeQuestion("multiple-choice"),
    makeQuestion("matching"),
    makeQuestion("essay"),
  ];
  project.draft.sections[0]!.activities = [quiz];
  const prefix = "sections[0].activities[0].questions";
  for (const [suffix, label] of [
    ["[0].statement", "Enunciado"],
    ["[0].maxMark", "Peso da questão"],
    ["[0].options[1].text", "Texto da alternativa 2"],
    ["[0].options[1].feedback", "Feedback da alternativa"],
    ["[1].pairs[1].answer", "Resposta correspondente"],
    ["[2].settings.responseLines", "Linhas da resposta"],
    ["[0].options", `entity-${quiz.questions[0]!.id}`],
  ]) {
    const path = `${prefix}${suffix}`;
    const html = renderToStaticMarkup(
      createElement(ActivityEditor, {
        activity: quiz,
        assets: [],
        focusPath: path,
        onChange() {},
      }),
    );
    assert.equal(issueFocusProbe(project, path, html), label, path);
  }
  const moved = quiz.questions.splice(0, 1)[0]!;
  quiz.questions.push(moved);
  const path = `${prefix}[2].options[1].feedback`;
  const html = renderToStaticMarkup(
    createElement(ActivityEditor, {
      activity: quiz,
      assets: [],
      focusPath: path,
      onChange() {},
    }),
  );
  assert.equal(issueFocusProbe(project, path, html), "Feedback da alternativa");
});

test("actual metadata labels focus their own fields rather than the first course input", () => {
  const project = createProject();
  project.draft.metadata.startDate = "2026-10-12T09:00:00-03:00";
  const source = readFileSync(
    new URL("../../app/page.tsx", import.meta.url),
    "utf8",
  );
  const ast = ts.createSourceFile(
    "page.tsx",
    source,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TSX,
  );
  const controls: string[] = [];
  for (const [field, label] of [
    ["metadata.fullName", "Nome completo do curso"],
    ["metadata.startDate", "Início do curso (UTC)"],
  ]) {
    let jsx = "";
    const find = (node: ts.Node) => {
      if (
        ts.isJsxElement(node) &&
        node.openingElement.tagName.getText(ast) === "label" &&
        node.getText(ast).includes(`data-field="${field}"`)
      )
        jsx = node.getText(ast);
      ts.forEachChild(node, find);
    };
    find(ast);
    assert.ok(jsx);
    const compiled = ts.transpileModule(
      `function Control(){return (${jsx});}`,
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.React,
        },
      },
    ).outputText;
    const Control = new Function(
      "React",
      "project",
      "commands",
      "utcFieldValue",
      "utcTimestamp",
      `${compiled};return Control;`,
    )(
      React,
      project,
      () => {},
      utcFieldValue,
      utcTimestamp,
    ) as React.ComponentType;
    controls.push(renderToStaticMarkup(createElement(Control)));
    const html = `<section class="editor-content" id="entity-${project.draft.id}">${controls.join("")}</section>`;
    assert.equal(issueFocusProbe(project, field!, html), label);
  }
});
