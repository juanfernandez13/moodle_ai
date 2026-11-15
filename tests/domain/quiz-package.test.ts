import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateDraft, type CourseDraft } from '../../src/domain/course/index.ts';

function course(): CourseDraft {
  return JSON.parse(readFileSync(new URL('../fixtures/course-valid.json', import.meta.url), 'utf8')) as CourseDraft;
}

/** Pacote só de quizzes: o Quiz 3 vai para a seção 3 do curso de destino e o Quiz 1 para a seção 1. */
function quizPackage(): CourseDraft {
  const source = course();
  const [quizOne, quizTwo] = source.sections[0]!.activities.filter((activity) => activity.type === 'quiz');
  assert.ok(quizOne && quizTwo);
  delete source.gradebook;
  return {
    ...source,
    metadata: { ...source.metadata, quizOnly: true },
    sections: [
      { id: 'section-q3', title: 'Seção 3', summary: '', targetNumber: 3, activities: [quizOne] },
      { id: 'section-q1', title: 'Seção 1', summary: '', targetNumber: 1, activities: [quizTwo] },
    ],
  };
}

function problems(input: unknown) {
  const result = validateDraft(input);
  assert.equal(result.valid, false);
  if (result.valid) assert.fail('Deveria rejeitar.');
  return result.issues;
}

test('aceita um pacote só de quizzes e guarda a seção de destino de cada um', () => {
  const input = quizPackage();
  const result = validateDraft(input);
  if (!result.valid) assert.fail(JSON.stringify(result.issues));
  assert.equal(result.draft.metadata.quizOnly, true);
  assert.deepEqual(result.draft.sections.map((section) => section.targetNumber), [3, 1]);
});

test('a seção 0 (geral) é um destino válido', () => {
  const input = quizPackage();
  input.sections[0]!.targetNumber = 0;
  assert.equal(validateDraft(input).valid, true);
});

test('o pacote só de quizzes pede a seção de destino em todas as seções', () => {
  const input = quizPackage();
  delete input.sections[1]!.targetNumber;
  const issue = problems(input).find((entry) => entry.code === 'missing_target_section');
  assert.equal(issue?.path, 'sections[1].targetNumber');
});

test('duas seções não podem ter o mesmo destino', () => {
  const input = quizPackage();
  input.sections[1]!.targetNumber = 3;
  const issue = problems(input).find((entry) => entry.code === 'duplicate_target_section');
  assert.equal(issue?.path, 'sections[1].targetNumber');
});

test('o pacote só de quizzes recusa fórum, tarefa e o resto', () => {
  const input = quizPackage();
  const forum = course().sections[0]!.activities[0]!;
  input.sections[0]!.activities.push(forum);
  const issue = problems(input).find((entry) => entry.code === 'quiz_package_only_quizzes');
  assert.equal(issue?.path, 'sections[0].activities[1]');
});

test('o pacote só de quizzes não leva notas do curso', () => {
  const input = quizPackage();
  input.gradebook = course().gradebook!;
  const codes = problems(input).map((entry) => entry.code);
  assert.ok(codes.includes('quiz_package_gradebook'));
});

test('um pacote sem nenhum quiz não é um pacote', () => {
  const input = quizPackage();
  for (const section of input.sections) section.activities = [];
  const issue = problems(input).find((entry) => entry.code === 'quiz_package_empty');
  assert.equal(issue?.path, 'sections');
});

test('a seção de destino só existe no pacote de quizzes', () => {
  const input = course();
  input.sections[0]!.targetNumber = 2;
  const issue = problems(input).find((entry) => entry.code === 'target_outside_quiz_package');
  assert.equal(issue?.path, 'sections[0].targetNumber');
});

test('a seção de destino é um número inteiro de 0 a 200', () => {
  for (const bad of [-1, 1.5, 201, '3']) {
    const input = quizPackage();
    Object.assign(input.sections[0]!, { targetNumber: bad });
    assert.equal(validateDraft(input).valid, false, `targetNumber ${String(bad)}`);
  }
});

test('quizOnly só aceita true: o curso comum não leva a marca', () => {
  const input = quizPackage();
  Object.assign(input.metadata, { quizOnly: false });
  assert.equal(validateDraft(input).valid, false);
});
