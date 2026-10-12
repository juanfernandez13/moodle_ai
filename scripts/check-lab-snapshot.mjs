import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const read = (path) =>
  JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
const snapshot = read(process.argv[2]);
const draft = read(process.argv[3] ?? "tests/fixtures/export/full-course.json");
const assets = read(process.argv[4] ?? "tests/fixtures/export/assets.json");
const numeric = (actual, expected, message) =>
  assert.equal(Number(actual), expected, message);
const expectedType = (type) =>
  ({
    assignment: "assign",
    "multiple-choice": "multichoice",
    matching: "match",
  })[type] ?? type;
const imageBlocks = (value) =>
  Array.isArray(value)
    ? value.reduce((total, item) => total + imageBlocks(item), 0)
    : value && typeof value === "object"
      ? value.kind === "image"
        ? 1
        : Object.values(value).reduce(
            (total, item) => total + imageBlocks(item),
            0,
          )
      : 0;
const richCount = (html) => (html.match(/<img\b/g) ?? []).length;
assert.equal(snapshot.course.format, draft.metadata.organization);
numeric(
  snapshot.course.startdate,
  draft.metadata.startDate ? Date.parse(draft.metadata.startDate) / 1000 : 0,
  "course start timestamp",
);
assert.equal(snapshot.sections.length, draft.sections.length + 1);
assert.equal(
  snapshot.sections[0].sequence,
  "",
  "technical section must not invent activities",
);
const sourceActivities = draft.sections.flatMap(
  (section) => section.activities,
);
assert.equal(snapshot.activities.length, sourceActivities.length);
const bySource = new Map();
for (let index = 0; index < sourceActivities.length; index++) {
  const source = sourceActivities[index],
    actual = snapshot.activities[index];
  bySource.set(source.id, actual);
  assert.equal(actual.cm.modname, expectedType(source.type));
  assert.equal(actual.instance.name, source.title);
  if (source.type === "assignment") {
    numeric(actual.instance.grade, source.settings.maxGrade);
    numeric(
      actual.instance.allowsubmissionsfromdate,
      source.schedule?.opensAt ? Date.parse(source.schedule.opensAt) / 1000 : 0,
    );
    numeric(
      actual.instance.duedate,
      source.schedule?.closesAt
        ? Date.parse(source.schedule.closesAt) / 1000
        : 0,
    );
    for (const plugin of ["file", "onlinetext"]) {
      const config = actual.pluginConfig.find(
        (entry) => entry.plugin === plugin && entry.name === "enabled",
      );
      numeric(
        config?.value,
        Number(
          source.settings.submissionMode === "both" ||
            source.settings.submissionMode ===
              (plugin === "file" ? "file" : "text"),
        ),
      );
    }
  }
  if (source.type === "forum") {
    assert.equal(actual.instance.type, source.settings.discussionMode);
    if (source.settings.discussionMode === "single")
      assert.equal(
        actual.discussions.length,
        1,
        "single forum requires its initial discussion",
      );
  }
  if (source.type === "quiz") {
    numeric(actual.instance.grade, source.settings.maxGrade);
    numeric(actual.instance.attempts, source.settings.attempts);
    const section = snapshot.quizSections.find(
      (entry) => entry.quizid === actual.instance.id,
    );
    numeric(section.shufflequestions, Number(source.settings.shuffleQuestions));
    const slots = snapshot.quizSlots.filter(
      (slot) => slot.quizid === actual.instance.id,
    );
    assert.equal(slots.length, source.questions.length);
    for (let position = 0; position < source.questions.length; position++) {
      const question = source.questions[position];
      const restored = snapshot.questions.find(
        (entry) => entry.question.name === question.id,
      );
      assert.ok(restored, `question ${question.id} restored`);
      assert.equal(restored.question.qtype, expectedType(question.type));
      numeric(restored.question.defaultmark, question.maxMark ?? 1);
      numeric(slots[position].maxmark, question.maxMark ?? 1);
      const reference = snapshot.questionReferences.find(
        (entry) =>
          entry.itemid === slots[position].id &&
          entry.component === "mod_quiz" &&
          entry.questionarea === "slot",
      );
      assert.equal(
        reference?.questionbankentryid,
        restored.entry.id,
        "slot must reference its question",
      );
      if (question.type === "multiple-choice") {
        assert.equal(restored.answers.length, question.options.length);
        question.options.forEach((option, optionIndex) =>
          numeric(restored.answers[optionIndex].fraction, option.fraction),
        );
      }
      if (question.type === "matching") {
        assert.equal(restored.pairs.length, question.pairs.length);
        question.pairs.forEach((pair, pairIndex) =>
          assert.equal(restored.pairs[pairIndex].answertext, pair.answer),
        );
      }
      if (question.type === "essay") {
        assert.equal(
          restored.options.responseformat,
          question.settings.responseFormat,
        );
        numeric(
          restored.options.responserequired,
          Number(question.settings.responseRequired),
        );
        numeric(
          restored.options.responsefieldlines,
          question.settings.responseLines,
        );
        numeric(restored.options.attachments, question.settings.attachments);
      }
    }
  }
  if (source.type === "chat") {
    numeric(
      actual.instance.chattime,
      source.settings.sessionAt
        ? Date.parse(source.settings.sessionAt) / 1000
        : 0,
    );
    numeric(
      actual.instance.schedule,
      { none: 0, daily: 2, weekly: 3 }[source.settings.repeat],
    );
    numeric(actual.instance.keepdays, source.settings.keepDays);
  }
  if (source.type === "wiki") {
    assert.equal(actual.instance.wikimode, source.settings.mode);
    assert.equal(
      actual.instance.firstpagetitle,
      source.settings.firstPageTitle,
    );
  }
  if (source.type === "glossary") {
    assert.equal(
      actual.entries.length,
      source.entries.length,
      "glossary entries cannot disappear",
    );
    source.entries.forEach((entry, entryIndex) =>
      assert.equal(actual.entries[entryIndex].concept, entry.concept),
    );
    numeric(
      actual.instance.allowduplicatedentries,
      Number(source.settings.allowDuplicates),
    );
    numeric(
      actual.instance.defaultapproval,
      Number(!source.settings.requireApproval),
    );
    numeric(actual.instance.entbypage, source.settings.entriesPerPage);
  }
}
draft.sections.forEach((section, index) => {
  const actual = snapshot.sections[index + 1];
  assert.equal(actual.name, section.title);
  assert.equal(
    actual.sequence,
    section.activities
      .map((activity) => bySource.get(activity.id).cm.id)
      .join(","),
  );
});
for (const category of draft.gradebook?.categories ?? []) {
  const actual = snapshot.gradeCategories.find(
    (entry) => entry.fullname === category.name,
  );
  assert.ok(actual, "grade category");
  const total = snapshot.gradeItems.find(
    (entry) =>
      entry.itemtype === "category" && entry.iteminstance === actual.id,
  );
  numeric(total.aggregationcoef, category.weight);
  const members = snapshot.gradeItems
    .filter(
      (entry) => entry.itemtype === "mod" && entry.categoryid === actual.id,
    )
    .map(
      (item) =>
        snapshot.activities.find(
          (activity) =>
            activity.cm.modname === item.itemmodule &&
            activity.instance.id === item.iteminstance,
        ).instance.name,
    )
    .sort();
  assert.deepEqual(
    members,
    category.activityIds.map((id) => bySource.get(id).instance.name).sort(),
  );
}
let images =
  richCount(snapshot.course.summary) +
  snapshot.sections.reduce(
    (total, section) => total + richCount(section.summary),
    0,
  );
images += snapshot.activities.reduce(
  (total, activity) =>
    total +
    richCount(activity.instance.intro) +
    (activity.entries ?? []).reduce(
      (sum, entry) => sum + richCount(entry.definition),
      0,
    ),
  0,
);
images += snapshot.questions.reduce(
  (total, entry) =>
    total +
    richCount(entry.question.questiontext) +
    richCount(entry.question.generalfeedback) +
    (entry.pairs ?? []).reduce(
      (sum, pair) => sum + richCount(pair.questiontext),
      0,
    ) +
    entry.answers.reduce(
      (sum, answer) =>
        sum + richCount(answer.answer) + richCount(answer.feedback),
      0,
    ),
  0,
);
assert.equal(images, imageBlocks(draft), "all image occurrences");
if (
  draft.metadata.summaryBlocks?.some(
    (block) =>
      block.kind === "text" && block.text.includes("<script>texto</script>"),
  )
)
  assert.ok(
    snapshot.course.summary.includes("&lt;script&gt;texto&lt;/script&gt;") &&
      !snapshot.course.summary.includes("<script>"),
    "literal markup remains escaped",
  );
for (const file of snapshot.files) {
  const ref = draft.attachments.find(
    (attachment) => attachment.name === file.record.filename,
  );
  assert.ok(ref, "no invented file");
  const source = assets[ref.id];
  const bytes = Buffer.from(
    typeof source === "string" ? source : source.base64,
    "base64",
  );
  assert.equal(file.sha256, createHash("sha256").update(bytes).digest("hex"));
  assert.equal(file.bytes, ref.size);
}
const imageFiles = snapshot.files.filter((file) =>
  file.record.mimetype.startsWith("image/"),
);
if (draft.id === "course-full")
  assert.equal(
    imageFiles.length,
    imageBlocks(draft),
    "six image destinations contain bytes",
  );
for (const attachment of draft.attachments.filter((file) =>
  file.mediaType.startsWith("image/"),
))
  assert.ok(
    imageFiles.some((file) => file.record.filename === attachment.name),
    "every image asset has restored bytes",
  );
console.log(
  JSON.stringify({
    ok: true,
    moodle: snapshot.moodle,
    courseId: snapshot.course.id,
    activities: snapshot.activities.length,
    questions: snapshot.questions.length,
    files: snapshot.files.length,
    imageOccurrences: images,
    evidence:
      "Restoration plus semantic fields, references, grades, timestamps and attachment byte hashes.",
  }),
);
