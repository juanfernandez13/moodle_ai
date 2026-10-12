import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateDraft, type CourseDraft, type ValidationIssue } from '../../src/domain/course/index.ts';

function fixture(): CourseDraft {
  return JSON.parse(readFileSync(new URL('../fixtures/course-valid.json', import.meta.url), 'utf8')) as CourseDraft;
}

function invalid(input: unknown, expectedPath: string): ValidationIssue[] {
  const snapshot = JSON.stringify(input);
  const result = validateDraft(input);
  assert.equal(result.valid, false, `Deveria rejeitar ${expectedPath}.`);
  if (result.valid) assert.fail('Entrada inválida não deve publicar draft.');
  assert.equal(Object.hasOwn(result, 'draft'), false);
  assert.ok(result.issues.some((issue) => issue.path === expectedPath),
    `Problema em ${expectedPath}; recebido: ${JSON.stringify(result.issues)}`);
  assert.ok(result.issues.every((issue) => issue.severity === 'error' && issue.code.length > 0 && issue.message.length > 0));
  assert.equal(JSON.stringify(input), snapshot);
  return result.issues;
}

function activities(input: CourseDraft) {
  const section = input.sections[0];
  assert.ok(section);
  return section.activities;
}

function firstQuiz(input: CourseDraft) {
  const quiz = activities(input)[4];
  assert.ok(quiz?.type === 'quiz');
  return quiz;
}

function firstQuestion(input: CourseDraft) {
  const question = firstQuiz(input).questions[0];
  assert.ok(question?.type === 'multiple-choice');
  return question;
}

test('aceita seis atividades e devolve uma cópia validada sem alterar a entrada', () => {
  const input = fixture();
  const snapshot = structuredClone(input);
  const result = validateDraft(input);
  assert.equal(result.valid, true);
  if (!result.valid) assert.fail('Fixture válida deve ser aceita.');
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.draft, snapshot);
  assert.deepEqual(input, snapshot);
  assert.notEqual(result.draft, input);
  assert.notEqual(result.draft.sections[0], input.sections[0]);
  assert.notEqual(result.draft.sections[0]?.activities[4], input.sections[0]?.activities[4]);
  assert.deepEqual(result.draft.sections[0]?.activities.map((activity) => activity.type),
    ['forum', 'forum', 'assignment', 'assignment', 'quiz', 'quiz']);
});

test('rejeita versão desconhecida no campo schemaVersion', () => {
  const input = fixture();
  Object.assign(input, { schemaVersion: 999 });
  invalid(input, 'schemaVersion');
});

const strictTargets: [string, (draft: CourseDraft) => object][] = [
  ['', (draft) => draft],
  ['metadata', (draft) => draft.metadata],
  ['sections[0]', (draft) => draft.sections[0]!],
  ['sections[0].activities[0]', (draft) => activities(draft)[0]!],
  ['sections[0].activities[0].settings', (draft) => activities(draft)[0]!.settings],
  ['sections[0].activities[2]', (draft) => activities(draft)[2]!],
  ['sections[0].activities[2].settings', (draft) => activities(draft)[2]!.settings],
  ['sections[0].activities[2].schedule', (draft) => activities(draft)[2]!.schedule!],
  ['sections[0].activities[4]', firstQuiz],
  ['sections[0].activities[4].settings', (draft) => firstQuiz(draft).settings],
  ['sections[0].activities[4].questions[0]', firstQuestion],
  ['sections[0].activities[4].questions[0].options[0]', (draft) => firstQuestion(draft).options[0]!],
  ['attachments[0]', (draft) => draft.attachments[0]!],
  ['gradebook', (draft) => draft.gradebook!],
  ['gradebook.categories[0]', (draft) => draft.gradebook!.categories[0]!],
];

for (const [path, select] of strictTargets) {
  test(`rejeita campo interno em ${path || 'raiz'} sem ecoar seu valor`, () => {
    const input = fixture();
    const secret = 'VALUE_NEVER_PRINT_PRIVATE_PATH';
    Object.assign(select(input), { filePath: secret });
    const issues = invalid(input, path ? `${path}.filePath` : 'filePath');
    assert.equal(JSON.stringify(issues).includes(secret), false);
  });
}

const boundedFields: [string, (draft: CourseDraft, value: string) => void, string[]][] = [
  ['id', (draft, value) => { draft.id = value; }, ['', '_leading', '-leading', 'with space', 'não-ascii', 'x'.repeat(129)]],
  ['metadata.fullName', (draft, value) => { draft.metadata.fullName = value; }, ['', ' \t\n', 'x'.repeat(201)]],
  ['metadata.shortName', (draft, value) => { draft.metadata.shortName = value; }, ['', ' ', 'x'.repeat(201)]],
  ['metadata.summary', (draft, value) => { draft.metadata.summary = value; }, ['x'.repeat(50_001)]],
  ['sections[0].id', (draft, value) => { draft.sections[0]!.id = value; }, ['bad/id']],
  ['sections[0].title', (draft, value) => { draft.sections[0]!.title = value; }, ['', ' ', 'x'.repeat(201)]],
  ['sections[0].summary', (draft, value) => { draft.sections[0]!.summary = value; }, ['x'.repeat(50_001)]],
  ['sections[0].activities[0].id', (draft, value) => { activities(draft)[0]!.id = value; }, ['bad:id']],
  ['sections[0].activities[0].title', (draft, value) => { activities(draft)[0]!.title = value; }, ['', ' ', 'x'.repeat(201)]],
  ['sections[0].activities[0].description', (draft, value) => { activities(draft)[0]!.description = value; }, ['x'.repeat(50_001)]],
  ['sections[0].activities[0].attachmentIds[0]', (draft, value) => { activities(draft)[0]!.attachmentIds[0] = value; }, ['bad id']],
  ['sections[0].activities[4].questions[0].id', (draft, value) => { firstQuestion(draft).id = value; }, ['bad/id']],
  ['sections[0].activities[4].questions[0].statement', (draft, value) => { firstQuestion(draft).statement = value; }, ['', ' ', 'x'.repeat(50_001)]],
  ['sections[0].activities[4].questions[0].feedback', (draft, value) => { firstQuestion(draft).feedback = value; }, ['x'.repeat(50_001)]],
  ['sections[0].activities[4].questions[0].options[0].id', (draft, value) => { firstQuestion(draft).options[0]!.id = value; }, ['bad/id']],
  ['sections[0].activities[4].questions[0].options[0].text', (draft, value) => { firstQuestion(draft).options[0]!.text = value; }, ['', ' ', 'x'.repeat(50_001)]],
  ['sections[0].activities[4].questions[0].options[0].feedback', (draft, value) => { firstQuestion(draft).options[0]!.feedback = value; }, ['x'.repeat(50_001)]],
  ['attachments[0].id', (draft, value) => { draft.attachments[0]!.id = value; }, ['bad/id']],
  ['attachments[0].name', (draft, value) => { draft.attachments[0]!.name = value; }, ['', ' ', 'x'.repeat(201)]],
  ['attachments[0].mediaType', (draft, value) => { draft.attachments[0]!.mediaType = value; }, ['', ' ', 'x'.repeat(201)]],
  ['gradebook.categories[0].id', (draft, value) => { draft.gradebook!.categories[0]!.id = value; }, ['bad/id']],
  ['gradebook.categories[0].name', (draft, value) => { draft.gradebook!.categories[0]!.name = value; }, ['', ' ', 'x'.repeat(201)]],
  ['gradebook.categories[0].activityIds[0]', (draft, value) => { draft.gradebook!.categories[0]!.activityIds[0] = value; }, ['bad id']],
];

for (const [path, mutate, values] of boundedFields) {
  test(`valida formato e comprimento de ${path}`, () => {
    for (const value of values) {
      const input = fixture();
      mutate(input, value);
      invalid(input, path);
    }
  });
}

const numericAndEnumCases: [string, (draft: CourseDraft) => void][] = [
    ['revision', (draft) => { draft.revision = -1; }],
    ['revision', (draft) => { draft.revision = 0.5; }],
    ['attachments[0].size', (draft) => { draft.attachments[0]!.size = -1; }],
    ['attachments[0].size', (draft) => { draft.attachments[0]!.size = 1.1; }],
    ['sections[0].activities[2].settings.maxGrade', (draft) => Object.assign(activities(draft)[2]!.settings, { maxGrade: 0 })],
    ['sections[0].activities[4].settings.maxGrade', (draft) => { firstQuiz(draft).settings.maxGrade = -1; }],
    ['sections[0].activities[4].settings.attempts', (draft) => { firstQuiz(draft).settings.attempts = 101; }],
    ['sections[0].activities[4].settings.attempts', (draft) => { firstQuiz(draft).settings.attempts = -1; }],
    ['sections[0].activities[4].settings.attempts', (draft) => { firstQuiz(draft).settings.attempts = 0.5; }],
    ['sections[0].activities[4].settings.shuffleQuestions', (draft) => Object.assign(firstQuiz(draft).settings, { shuffleQuestions: 'private-invalid-value' })],
    ['sections[0].activities[4].questions[0].options[0].fraction', (draft) => { firstQuestion(draft).options[0]!.fraction = 1.1; }],
    ['sections[0].activities[4].questions[0].options[0].fraction', (draft) => { firstQuestion(draft).options[0]!.fraction = -0.1; }],
    ['gradebook.categories[0].weight', (draft) => { draft.gradebook!.categories[0]!.weight = 0; }],
    ['gradebook.categories[0].weight', (draft) => { draft.gradebook!.categories[0]!.weight = 101; }],
    ['sections[0].activities[0].type', (draft) => Object.assign(activities(draft)[0]!, { type: 'private-invalid-value' })],
    ['sections[0].activities[4].questions[0].type', (draft) => Object.assign(firstQuestion(draft), { type: 'private-invalid-value' })],
    ['metadata.organization', (draft) => Object.assign(draft.metadata, { organization: 'private-invalid-value' })],
    ['sections[0].activities[0].settings.discussionMode', (draft) => Object.assign(activities(draft)[0]!.settings, { discussionMode: 'private-invalid-value' })],
    ['sections[0].activities[2].settings.submissionMode', (draft) => Object.assign(activities(draft)[2]!.settings, { submissionMode: 'private-invalid-value' })],
];
for (const [index, [path, mutate]] of numericAndEnumCases.entries()) {
  test(`valida restrição numérica ou tipo conhecido ${index + 1} em ${path}`, () => {
    const input = fixture();
    mutate(input);
    assert.equal(JSON.stringify(invalid(input, path)).includes('private-invalid-value'), false);
  });
}

test('rejeita valores raiz não estruturados e campos obrigatórios ausentes', () => {
  for (const input of [null, false, 42, 'private-invalid-value', [], undefined]) invalid(input, '$');
  const input = fixture();
  const incomplete: Record<string, unknown> = { ...input };
  delete incomplete.attachments;
  invalid(incomplete, 'attachments');
});

test('não normaliza nomes e não acrescenta gradebook, datas ou defaults pedagógicos', () => {
  const input = fixture();
  input.metadata.fullName = '  Nome conservado  ';
  input.metadata.summary = '';
  delete input.metadata.startDate;
  delete input.gradebook;
  const result = validateDraft(input);
  assert.equal(result.valid, true);
  if (!result.valid) assert.fail();
  assert.deepEqual(result.draft, input);
  assert.equal(Object.hasOwn(result.draft, 'gradebook'), false);
  assert.equal(Object.hasOwn(result.draft.metadata, 'startDate'), false);
});

const collectionCases: [string, (draft: CourseDraft) => void][] = [
  ['sections', (draft) => { draft.sections = []; }],
  ['sections', (draft) => { draft.sections = Array.from({ length: 201 }, () => structuredClone(draft.sections[0]!)); }],
  ['sections[0].activities', (draft) => { draft.sections[0]!.activities = Array.from({ length: 201 }, () => structuredClone(activities(draft)[0]!)); }],
  ['sections[0].activities[4].questions', (draft) => { firstQuiz(draft).questions = []; }],
  ['sections[0].activities[4].questions', (draft) => { firstQuiz(draft).questions = Array.from({ length: 201 }, () => structuredClone(firstQuestion(draft))); }],
  ['sections[0].activities[4].questions[0].options', (draft) => { firstQuestion(draft).options.length = 1; }],
  ['sections[0].activities[4].questions[0].options', (draft) => { firstQuestion(draft).options = Array.from({ length: 21 }, () => structuredClone(firstQuestion(draft).options[0]!)); }],
  ['attachments', (draft) => { draft.attachments = Array.from({ length: 501 }, () => structuredClone(draft.attachments[0]!)); }],
  ['sections[0].activities[0].attachmentIds', (draft) => { activities(draft)[0]!.attachmentIds = Array.from({ length: 501 }, () => 'attachment-intro'); }],
  ['gradebook.categories', (draft) => { draft.gradebook!.categories = []; }],
  ['gradebook.categories', (draft) => { draft.gradebook!.categories = Array.from({ length: 101 }, () => structuredClone(draft.gradebook!.categories[0]!)); }],
  ['gradebook.categories[0].activityIds', (draft) => { draft.gradebook!.categories[0]!.activityIds = []; }],
  ['gradebook.categories[0].activityIds', (draft) => { draft.gradebook!.categories[0]!.activityIds = Array.from({ length: 501 }, () => 'assignment-1'); }],
];

for (const [index, [path, mutate]] of collectionCases.entries()) {
  test(`aplica limite de coleção ${index + 1} em ${path}`, () => {
    const input = fixture();
    mutate(input);
    invalid(input, path);
  });
}

test('aceita os limites inclusivos sem truncar dados', () => {
  const input = fixture();
  input.revision = 0;
  input.id = `a${'_'.repeat(126)}0`;
  input.metadata.fullName = 'n'.repeat(200);
  input.metadata.summary = 't'.repeat(50_000);
  input.attachments = Array.from({ length: 500 }, (_, index) => ({
    id: `attachment-boundary-${index}`, name: `Arquivo ${index}`, size: 0, mediaType: 'text/plain',
  }));
  for (const activity of activities(input)) activity.attachmentIds = [];
  activities(input)[0]!.attachmentIds = input.attachments.map((attachment) => attachment.id);
  const quiz = firstQuiz(input);
  quiz.settings.attempts = 100;
  quiz.questions = Array.from({ length: 200 }, (_, questionIndex) => ({
    id: `question-boundary-${questionIndex}`, type: 'multiple-choice', statement: 'Enunciado', feedback: '',
    options: Array.from({ length: 20 }, (_, optionIndex) => ({
      id: `option-boundary-${questionIndex}-${optionIndex}`, text: 'Alternativa', fraction: optionIndex === 0 ? 1 : 0, feedback: '',
    })),
  }));
  input.sections.push(...Array.from({ length: 199 }, (_, index) => ({
    id: `section-boundary-${index}`, title: `Seção ${index}`, summary: '', activities: [],
  })));
  const result = validateDraft(input);
  assert.equal(result.valid, true);
  if (!result.valid) assert.fail();
  assert.deepEqual(result.draft, input);
  assert.equal(result.draft.sections.length, 200);
  assert.equal(result.draft.attachments.length, 500);
});

const duplicateCases: [string, (draft: CourseDraft) => void][] = [
  ['sections[0].id', (draft) => { draft.sections[0]!.id = draft.id; }],
  ['sections[0].activities[0].id', (draft) => { activities(draft)[0]!.id = draft.sections[0]!.id; }],
  ['sections[0].activities[1].id', (draft) => { activities(draft)[1]!.id = activities(draft)[0]!.id; }],
  ['sections[0].activities[4].questions[0].id', (draft) => { firstQuestion(draft).id = draft.id; }],
  ['sections[0].activities[4].questions[0].options[1].id', (draft) => { firstQuestion(draft).options[1]!.id = firstQuestion(draft).options[0]!.id; }],
  ['attachments[0].id', (draft) => { draft.attachments[0]!.id = draft.id; }],
  ['attachments[1].id', (draft) => { draft.attachments[1]!.id = draft.attachments[0]!.id; }],
  ['gradebook.categories[0].id', (draft) => { draft.gradebook!.categories[0]!.id = firstQuestion(draft).options[0]!.id; }],
];

for (const [path, mutate] of duplicateCases) {
  test(`rejeita ID global duplicado em ${path}`, () => {
    const input = fixture();
    mutate(input);
    const issues = invalid(input, path);
    assert.ok(issues.some((issue) => issue.path === path && issue.code === 'duplicate_id'));
  });
}

test('rejeita referência de anexo inexistente sem incluir o ID na mensagem', () => {
  const input = fixture();
  const unknownId = 'PRIVATE_MISSING_ATTACHMENT_ID';
  activities(input)[0]!.attachmentIds = [unknownId];
  assert.equal(JSON.stringify(invalid(input, 'sections[0].activities[0].attachmentIds[0]')).includes(unknownId), false);
});

test('rejeita referência de anexo repetida na mesma atividade', () => {
  const input = fixture();
  activities(input)[0]!.attachmentIds.push('attachment-intro');
  invalid(input, 'sections[0].activities[0].attachmentIds[1]');
});

test('reordenação preserva IDs e associações por ID em todas as listas', () => {
  const input = fixture();
  const moved = activities(input).splice(3, 3);
  input.sections.push({ id: 'section-2', title: 'Segundo tópico', summary: '', activities: moved });
  function bindings(draft: CourseDraft) {
    return Object.fromEntries(draft.sections.flatMap((section) => section.activities.map((activity) => [activity.id, {
      type: activity.type,
      attachmentIds: [...activity.attachmentIds].sort(),
      questions: activity.type === 'quiz' ? Object.fromEntries(activity.questions.map((question) => [question.id,
        question.type === 'multiple-choice' ? Object.fromEntries(question.options.map((option) => [option.id, option.fraction])) : {}])) : undefined,
    }])));
  }
  const before = bindings(input);
  input.sections.reverse();
  for (const section of input.sections) {
    section.activities.reverse();
    for (const activity of section.activities) {
      activity.attachmentIds.reverse();
      if (activity.type === 'quiz') {
        activity.questions.reverse();
        for (const question of activity.questions) { assert.ok(question.type === 'multiple-choice'); question.options.reverse(); }
      }
    }
  }
  input.attachments.reverse();
  input.gradebook!.categories.reverse();
  for (const category of input.gradebook!.categories) category.activityIds.reverse();
  const result = validateDraft(input);
  assert.equal(result.valid, true);
  if (!result.valid) assert.fail();
  assert.deepEqual(result.draft, input);
  assert.deepEqual(bindings(result.draft), before);
});

test('datas usam timestamp ISO 8601 com fuso e rejeitam datas inexistentes', () => {
  for (const value of ['2026-10-12', '2026-10-12T12:00:00', '2026-02-30T12:00:00Z', 'private-invalid-value']) {
    const input = fixture();
    input.metadata.startDate = value;
    invalid(input, 'metadata.startDate');
    input.metadata.startDate = '2028-02-29T12:00:00Z';
    activities(input)[2]!.schedule = { opensAt: value };
    const issues = invalid(input, 'sections[0].activities[2].schedule.opensAt');
    assert.equal(JSON.stringify(issues).includes('private-invalid-value'), false);
    activities(input)[2]!.schedule = { closesAt: value };
    invalid(input, 'sections[0].activities[2].schedule.closesAt');
  }
  for (const value of ['2028-02-29T12:00:00Z', '2026-10-12T09:00:00.123-03:00', '2026-10-12T14:00:00+02:00']) {
    const input = fixture();
    input.metadata.startDate = value;
    activities(input)[2]!.schedule = { opensAt: value };
    assert.equal(validateDraft(input).valid, true);
  }
});

test('abertura deve preceder ou coincidir com fechamento comparando o instante e o fuso', () => {
  const input = fixture();
  activities(input)[2]!.schedule = {
    opensAt: '2026-10-12T09:30:00-03:00', closesAt: '2026-10-12T10:00:00-02:00',
  };
  invalid(input, 'sections[0].activities[2].schedule.closesAt');
  for (const schedule of [
    { opensAt: '2026-10-12T09:00:00-03:00', closesAt: '2026-10-12T12:00:00Z' },
    { opensAt: '2026-10-12T11:00:00Z', closesAt: '2026-10-12T09:00:00-03:00' },
    { opensAt: '2026-10-12T12:00:00Z' },
    { closesAt: '2026-10-12T12:00:00Z' },
  ]) {
    activities(input)[2]!.schedule = schedule;
    assert.equal(validateDraft(input).valid, true);
  }
});

test('ordem de datas preserva frações inferiores a milissegundo, igualdade e fusos', () => {
  const cases = [
    ['2026-10-12T12:00:00.0009Z', '2026-10-12T12:00:00.0001Z', false],
    ['2026-10-12T12:00:00.0001Z', '2026-10-12T12:00:00.0009Z', true],
    ['2026-10-12T12:00:00.0009Z', '2026-10-12T12:00:00.0009000Z', true],
    ['2026-10-12T09:00:00.0009-03:00', '2026-10-12T14:00:00.0001+02:00', false],
    ['2026-10-12T09:00:00.0001-03:00', '2026-10-12T14:00:00.0009+02:00', true],
    ['2026-10-12T09:00:00.0009-03:00', '2026-10-12T14:00:00.000900+02:00', true],
    ['2026-10-12T12:00:00.00000000000000000001Z', '2026-10-12T12:00:00Z', false],
    ['2026-10-12T12:00:00.000000Z', '2026-10-12T12:00:00Z', true],
    ['2026-10-12T12:00:00.999999Z', '2026-10-12T12:00:01.000001Z', true],
    ['2026-10-12T12:00:01.000001Z', '2026-10-12T12:00:00.999999Z', false],
  ] as const;
  for (const [opensAt, closesAt, expectedValid] of cases) {
    const input = fixture();
    activities(input)[2]!.schedule = { opensAt, closesAt };
    if (expectedValid) {
      assert.equal(validateDraft(input).valid, true);
    } else {
      const issues = invalid(input, 'sections[0].activities[2].schedule.closesAt');
      assert.ok(issues.some((issue) => issue.code === 'inverted_schedule'));
    }
  }
});

test('schedule presente deve informar abertura e/ou fechamento', () => {
  const input = fixture();
  activities(input)[2]!.schedule = {};
  invalid(input, 'sections[0].activities[2].schedule');
});

test('questão de resposta única exige exatamente uma fração 1 e todas as demais 0', () => {
  for (const fractions of [[0, 0, 0], [1, 1, 0], [1, 0.5, 0], [0.5, 0.5, 0]]) {
    const input = fixture();
    firstQuestion(input).options.forEach((option, index) => { option.fraction = fractions[index]!; });
    invalid(input, 'sections[0].activities[4].questions[0].options');
  }
  const input = fixture();
  firstQuestion(input).options.forEach((option, index) => { option.fraction = index === 2 ? 1 : 0; });
  assert.equal(validateDraft(input).valid, true);
});

test('categoria deve apontar para atividade existente sem ecoar ID desconhecido', () => {
  const input = fixture();
  input.gradebook!.categories[0]!.activityIds[0] = 'PRIVATE_MISSING_ACTIVITY_ID';
  const issues = invalid(input, 'gradebook.categories[0].activityIds[0]');
  assert.equal(JSON.stringify(issues).includes('PRIVATE_MISSING_ACTIVITY_ID'), false);
});

test('atividade pertence a no máximo uma categoria e aparece apenas uma vez nela', () => {
  const input = fixture();
  input.gradebook!.categories[0]!.activityIds.push('assignment-1');
  invalid(input, 'gradebook.categories[0].activityIds[2]');
  input.gradebook!.categories[0]!.activityIds.pop();
  input.gradebook!.categories[1]!.activityIds.push('assignment-1');
  invalid(input, 'gradebook.categories[1].activityIds[2]');
});

test('fórum não pertence a categorias de notas', () => {
  const input = fixture();
  input.gradebook!.categories[0]!.activityIds = ['forum-1'];
  invalid(input, 'gradebook.categories[0].activityIds[0]');
});

test('pesos somam 100 com tolerância 0,000001 sem exigir categoria para toda atividade', () => {
  const input = fixture();
  input.gradebook!.categories[0]!.weight = 59;
  invalid(input, 'gradebook.categories');
  input.gradebook!.categories[0]!.weight = 60.000002;
  invalid(input, 'gradebook.categories');
  input.gradebook!.categories[0]!.weight = 60.0000005;
  assert.equal(validateDraft(input).valid, true);
  input.gradebook!.categories = [{ id: 'single-category', name: 'Parcial', weight: 100, activityIds: ['assignment-1'] }];
  assert.equal(validateDraft(input).valid, true);
});

const invalidFixtures = [
  ['course-invalid-version.json', 'schemaVersion'],
  ['course-invalid-duplicate-id.json', 'sections[0].activities[1].id'],
  ['course-invalid-internal-field.json', 'attachments[0].filePath'],
] as const;

for (const [name, path] of invalidFixtures) {
  test(`fixture ${name} é rejeitada com diagnóstico localizado`, () => {
    const input: unknown = JSON.parse(readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8'));
    const issues = invalid(input, path);
    assert.equal(JSON.stringify(issues).includes('PRIVATE_INTERNAL_PATH_SENTINEL'), false);
  });
}
