import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateTask, transitionTask } from './task-state.mjs';

const template = JSON.parse(await readFile(new URL('../assets/task.json', import.meta.url), 'utf8'));
function planned() {
  const task = structuredClone(template);
  task.id = 'TEST';
  task.contextEvidence = 'reports/context.md';
  return task;
}
function verifying() {
  let task = transitionTask(planned(), 'executing');
  task.revision = 'candidate-001';
  return transitionTask(task, 'verifying');
}
function passChecks(task) {
  for (const check of task.checks) Object.assign(check, {
    status: 'passed', revision: task.revision, evidence: 'reports/checks.txt',
  });
  return task;
}
function reviewing() { return transitionTask(passChecks(verifying()), 'reviewing'); }
function passReview(task) {
  for (const review of task.reviews) Object.assign(review, {
    status: 'passed', revision: task.revision, evidence: `reports/${review.axis}.md`,
  });
  for (const criterion of task.acceptance) Object.assign(criterion, {
    revision: task.revision, evidence: ['reports/acceptance.md'],
  });
  return task;
}

test('a task cannot execute before its project context is recorded', () => {
  const task = structuredClone(template);
  assert.doesNotThrow(() => validateTask(task));
  assert.throws(() => transitionTask(task, 'executing'), /context report/);
});

test('review starts only after required checks pass at the pinned revision', () => {
  const task = verifying();
  assert.throws(() => transitionTask(task, 'reviewing'), /Required check/);
  passChecks(task);
  task.checks[0].revision = 'older-candidate';
  assert.throws(() => transitionTask(task, 'reviewing'), /candidate revision/);
});

test('pending approval and missing criterion evidence prevent acceptance', () => {
  const task = reviewing();
  assert.throws(() => transitionTask(task, 'accepted'), /review needs approval/);
  passReview(task);
  task.acceptance[0].evidence = [];
  assert.throws(() => transitionTask(task, 'accepted'), /Acceptance A1/);
});

test('stale review evidence cannot approve a newer candidate', () => {
  const task = passReview(reviewing());
  task.reviews[0].revision = 'older-candidate';
  assert.throws(() => transitionTask(task, 'accepted'), /spec review/);
});

test('executor self-approval and shared reviewer context are rejected', () => {
  const task = planned();
  task.reviews[0].agent = task.owners[0].agent;
  assert.throws(() => validateTask(task), /own task/);
  task.reviews[0].agent = task.reviews[1].agent;
  assert.throws(() => validateTask(task), /Reviewer context/);
});

test('nested scopes and case aliases cannot have two different writers', () => {
  const task = planned();
  task.owners.push({ agent: 'executor-other', writePaths: ['SRC/domain/export.mjs'] });
  assert.throws(() => validateTask(task), /Overlapping ownership/);
  task.owners[1].writePaths = ['src/ui/'];
  assert.doesNotThrow(() => validateTask(task));
  task.owners[1].writePaths = ['../reference-project/'];
  assert.throws(() => validateTask(task), /inside the project/);
});

test('retry invalidates approvals and keeps original report references in history', () => {
  const source = passReview(reviewing());
  const fix = transitionTask(source, 'needs-fix', 'Wrong exported title.');
  const retry = transitionTask(fix, 'executing');
  assert.equal(retry.budget.corrections, 1);
  assert.equal(retry.checks[0].status, 'pending');
  assert.equal(retry.reviews[0].status, 'pending');
  assert.deepEqual(retry.acceptance[0].evidence, []);
  assert.ok(retry.history.at(-1).evidence.reviews.includes('reports/spec.md'));
  assert.equal(source.reviews[0].status, 'passed');
});

test('a third correction request forces replanning with the configured two-cycle budget', () => {
  let task = reviewing();
  for (let cycle = 0; cycle < 2; cycle += 1) {
    task = transitionTask(task, 'needs-fix', 'Repeated defect.');
    assert.equal(task.status, 'needs-fix');
    task = transitionTask(task, 'executing');
    task.revision = `candidate-${cycle + 2}`;
    task = transitionTask(task, 'verifying');
    task = transitionTask(passChecks(task), 'reviewing');
  }
  task = transitionTask(task, 'needs-fix', 'Repeated defect after two corrections.');
  assert.equal(task.status, 'replan');
  assert.equal(task.budget.corrections, 2);
  assert.equal(task.history.at(-1).requestedTo, 'needs-fix');
  assert.throws(() => transitionTask(task, 'executing'), /Invalid transition/);
});

test('integration requires the exact accepted candidate and recorded evidence', () => {
  const task = transitionTask(passReview(reviewing()), 'accepted');
  assert.throws(() => transitionTask(task, 'integrated'), /Integration needs evidence/);
  task.integration = { revision: 'different-candidate', evidence: 'reports/integration.md' };
  assert.throws(() => transitionTask(task, 'integrated'), /exact accepted/);
  task.integration.revision = task.revision;
  const integrated = transitionTask(task, 'integrated');
  assert.equal(integrated.status, 'integrated');
  assert.throws(() => transitionTask(integrated, 'executing'), /Invalid transition/);
});

test('reverification after integration changes invalidates earlier acceptance', () => {
  const task = transitionTask(passReview(reviewing()), 'accepted');
  const candidate = transitionTask(task, 'verifying');
  candidate.revision = 'merged-candidate';
  assert.throws(() => transitionTask(candidate, 'reviewing'), /Required check/);
  assert.equal(candidate.reviews[0].status, 'pending');
});

test('CLI preserves the task on rejection and persists a successful transition', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'moodle-agent-loop-test-'));
  const file = join(directory, 'task.json');
  const script = fileURLToPath(new URL('./task-state.mjs', import.meta.url));
  try {
    const original = `${JSON.stringify(planned())}\n`;
    await writeFile(file, original);
    const rejected = spawnSync(process.execPath, [script, 'transition', file, 'accepted'], { encoding: 'utf8' });
    assert.equal(rejected.status, 1);
    assert.equal(await readFile(file, 'utf8'), original);
    const passed = spawnSync(process.execPath, [script, 'transition', file, 'executing'], { encoding: 'utf8' });
    assert.equal(passed.status, 0, passed.stderr);
    assert.equal(JSON.parse(await readFile(file, 'utf8')).status, 'executing');
  } finally {
    await rm(file, { force: true });
    await rmdir(directory);
  }
});

test('CLI can emit a validated transition without writing any task state', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'moodle-agent-loop-output-test-'));
  const file = join(directory, 'task.json');
  const script = fileURLToPath(new URL('./task-state.mjs', import.meta.url));
  try {
    const original = `${JSON.stringify(planned())}\n`;
    await writeFile(file, original);
    const result = spawnSync(process.execPath, [script, 'transition', file, 'executing', '--stdout'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, 'executing');
    assert.equal(await readFile(file, 'utf8'), original);
  } finally {
    await rm(file, { force: true });
    await rmdir(directory);
  }
});
