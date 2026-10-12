import { test } from "node:test";
import assert from "node:assert/strict";
import { issueEntityId, richBlockFocus } from "../../src/client/navigation.ts";
import {
  createProject,
  makeActivity,
  makeQuestion,
} from "../../src/client/project.ts";
import { applyCommands } from "../../src/client/commands.ts";

test("a nested content issue selects the correct block and stable entity rather than a hidden field", () => {
  const project = createProject();
  const quiz = makeActivity("quiz");
  assert.equal(quiz.type, "quiz");
  if (quiz.type !== "quiz") return;
  const question = makeQuestion("multiple-choice");
  assert.equal(question.type, "multiple-choice");
  if (question.type !== "multiple-choice") return;
  question.options[1]!.textBlocks = [
    { id: "block-first", kind: "text", text: "Primeiro" },
    {
      id: "block-second",
      kind: "image",
      attachmentId: "missing-image",
      alt: "Imagem",
    },
  ];
  quiz.questions = [question];
  project.draft.sections[0]!.activities = [quiz];
  const prefix = "sections[0].activities[0].questions[0].options[1].textBlocks";
  const path = `${prefix}[1].attachmentId`;
  assert.equal(richBlockFocus(path, prefix), 1);
  assert.equal(
    richBlockFocus(
      path,
      "sections[0].activities[0].questions[0].statementBlocks",
    ),
    undefined,
  );
  assert.equal(issueEntityId(project.draft, path), "block-second");
  assert.equal(
    issueEntityId(
      project.draft,
      "sections[0].activities[0].questions[0].options[1].text",
    ),
    question.options[1]!.id,
  );
});

test("reordering across the five-item page boundary keeps the moved activity and its data", () => {
  const project = createProject();
  const activities = Array.from({ length: 9 }, (_, index) => ({
    ...makeActivity("assignment"),
    title: `Atividade ${index + 1}`,
  }));
  project.draft.sections[0]!.activities = activities;
  const moved = activities[4]!;
  const result = applyCommands(project.draft, project.draft.revision, [
    { type: "move_activity", activityId: moved.id, to: 5 },
  ]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.draft.sections[0]!.activities[5], moved);
  assert.equal(result.draft.sections[0]!.activities[4]!.id, activities[5]!.id);
  assert.equal(project.draft.sections[0]!.activities[4]!.id, moved.id);
});
