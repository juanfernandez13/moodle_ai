import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

const transitions = {
  planned: ['executing', 'replan'],
  executing: ['verifying', 'replan'],
  verifying: ['reviewing', 'needs-fix', 'replan'],
  reviewing: ['accepted', 'needs-fix', 'verifying', 'replan'],
  'needs-fix': ['executing', 'replan'],
  accepted: ['integrated', 'verifying', 'replan'],
  replan: ['planned'],
  integrated: [],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const text = (value) => typeof value === 'string' && value.trim().length > 0;
const nullableText = (value) => value === null || text(value);
const integer = (value) => Number.isInteger(value) && value >= 0;

function unique(items, key, label) {
  const values = items.map((item) => item[key]);
  assert(values.every(text) && new Set(values).size === values.length, `${label} IDs must be nonempty and unique.`);
}

function checksPassed(task) {
  for (const check of task.checks.filter((item) => item.required)) {
    assert(check.status === 'passed' && text(check.evidence) && check.revision === task.revision,
      `Required check ${check.id} needs passing evidence at the candidate revision.`);
  }
}

function reviewsPassed(task) {
  for (const review of task.reviews) {
    assert(review.status === 'passed' && text(review.evidence) && review.revision === task.revision,
      `${review.axis} review needs approval evidence at the candidate revision.`);
  }
  for (const criterion of task.acceptance) {
    assert(criterion.evidence.length > 0 && criterion.revision === task.revision,
      `Acceptance ${criterion.id} needs evidence at the candidate revision.`);
  }
}

function phaseGates(task) {
  if (!['planned', 'replan'].includes(task.status)) {
    assert(text(task.contextEvidence), 'A guardian context report is required before execution.');
  }
  if (['verifying', 'reviewing', 'accepted', 'integrated'].includes(task.status)) {
    assert(text(task.revision), 'Pin the candidate revision before verification.');
  }
  if (['reviewing', 'accepted', 'integrated'].includes(task.status)) checksPassed(task);
  if (['accepted', 'integrated'].includes(task.status)) reviewsPassed(task);
  if (task.status === 'integrated') {
    assert(task.integration.revision === task.revision && text(task.integration.evidence),
      'Integration needs evidence for the exact accepted candidate revision.');
  }
}

export function validateTask(task) {
  assert(task && typeof task === 'object' && !Array.isArray(task), 'Task must be an object.');
  assert(task.schemaVersion === 1, 'Unsupported task schemaVersion.');
  assert(text(task.id) && /^[A-Za-z0-9_-]+$/.test(task.id), 'Task ID must use letters, digits, underscores or hyphens.');
  assert(text(task.goal), 'Task goal is required.');
  assert(Array.isArray(task.spec) && task.spec.length > 0 && task.spec.every(text), 'At least one spec source is required.');
  assert(Object.hasOwn(transitions, task.status), 'Unknown task status.');
  assert(nullableText(task.revision), 'revision must be null or nonempty text.');
  assert(nullableText(task.contextEvidence), 'contextEvidence must be null or nonempty text.');
  assert(Array.isArray(task.owners) && task.owners.length > 0, 'At least one executor owner is required.');
  assert(task.owners.every((owner) => owner && typeof owner === 'object'), 'Owners must be objects.');
  unique(task.owners, 'agent', 'Owner');
  const scopes = [];
  for (const owner of task.owners) {
    assert(Array.isArray(owner.writePaths) && owner.writePaths.length > 0, 'Each owner needs write paths.');
    for (const path of owner.writePaths) {
      assert(text(path) && !/[\\:*?]/.test(path) && !path.startsWith('/') &&
        !path.split('/').some((part) => ['.', '..'].includes(part)),
      'Write paths must be relative literal paths inside the project, using forward slashes.');
      const normalized = path.replace(/\/+$/, '').toLowerCase();
      assert(normalized && !normalized.includes('//'), 'Write paths must be nonempty normalized paths.');
      for (const other of scopes) {
        const overlaps = normalized === other.path || normalized.startsWith(`${other.path}/`) || other.path.startsWith(`${normalized}/`);
        assert(!overlaps || owner.agent === other.agent, `Overlapping ownership: ${owner.agent} and ${other.agent}.`);
      }
      scopes.push({ agent: owner.agent, path: normalized });
    }
  }
  assert(Array.isArray(task.acceptance) && task.acceptance.length > 0, 'At least one acceptance criterion is required.');
  assert(task.acceptance.every((item) => item && text(item.text) && nullableText(item.revision) &&
    Array.isArray(item.evidence) && item.evidence.every(text)), 'Acceptance criteria need text, revision and evidence arrays.');
  unique(task.acceptance, 'id', 'Acceptance');
  assert(Array.isArray(task.checks) && task.checks.length > 0, 'At least one real check or inspection is required.');
  assert(task.checks.every((item) => item && typeof item.required === 'boolean' &&
    ['pending', 'passed', 'failed', 'skipped'].includes(item.status) && nullableText(item.revision) && nullableText(item.evidence)),
  'Checks need valid status, required, revision and evidence fields.');
  unique(task.checks, 'id', 'Check');
  assert(task.checks.some((item) => item.required), 'At least one check must be required.');
  assert(Array.isArray(task.reviews) && task.reviews.length === 2 &&
    task.reviews.every((item) => item && ['spec', 'quality'].includes(item.axis) && text(item.agent) &&
      ['pending', 'passed', 'changes-requested'].includes(item.status) && nullableText(item.revision) && nullableText(item.evidence)),
  'Exactly two review axes, spec and quality, are required.');
  unique(task.reviews, 'axis', 'Review axis');
  unique(task.reviews, 'agent', 'Reviewer context');
  assert(task.reviews.every((review) => !task.owners.some((owner) => owner.agent === review.agent)),
    'An executor cannot approve its own task.');
  assert(task.budget && integer(task.budget.maxCorrections) && integer(task.budget.corrections) &&
    task.budget.corrections <= task.budget.maxCorrections, 'Correction budget must contain valid nonnegative counts.');
  assert(task.integration && nullableText(task.integration.revision) && nullableText(task.integration.evidence),
    'Integration needs revision and evidence fields.');
  assert(Array.isArray(task.history), 'Task history must be an array.');
  phaseGates(task);
  return task;
}

function invalidateEvidence(task) {
  for (const check of task.checks) Object.assign(check, { status: 'pending', revision: null, evidence: null });
  for (const review of task.reviews) Object.assign(review, { status: 'pending', revision: null, evidence: null });
  for (const criterion of task.acceptance) Object.assign(criterion, { revision: null, evidence: [] });
  task.integration = { revision: null, evidence: null };
}

export function transitionTask(task, target, reason = '') {
  validateTask(task);
  assert(transitions[task.status].includes(target), `Invalid transition: ${task.status} -> ${target}.`);
  if (['needs-fix', 'replan'].includes(target)) assert(text(reason), 'Record the diagnosis for correction or replanning.');
  const next = structuredClone(task);
  let destination = target;
  if (target === 'needs-fix') {
    if (next.budget.corrections >= next.budget.maxCorrections) destination = 'replan';
    else next.budget.corrections += 1;
  }
  next.history.push({
    from: task.status, to: destination, requestedTo: target,
    at: new Date().toISOString(), revision: task.revision, reason,
    evidence: {
      checks: task.checks.filter((item) => item.evidence).map((item) => item.evidence),
      reviews: task.reviews.filter((item) => item.evidence).map((item) => item.evidence),
      acceptance: task.acceptance.flatMap((item) => item.evidence),
    },
  });
  next.status = destination;
  if (destination === 'executing' || destination === 'planned' ||
    (destination === 'verifying' && ['accepted', 'reviewing'].includes(task.status))) invalidateEvidence(next);
  if (destination === 'planned') next.revision = null;
  return validateTask(next);
}

async function main(args) {
  const outputOnly = args.includes('--stdout');
  const [command, taskPath, target, ...reason] = args.filter((arg) => arg !== '--stdout');
  assert(['validate', 'transition'].includes(command) && taskPath,
    'Usage: node task-state.mjs validate <task.json> | transition <task.json> <state> [diagnosis] [--stdout]');
  const file = resolve(taskPath);
  const task = JSON.parse(await readFile(file, 'utf8'));
  if (command === 'validate') {
    validateTask(task);
    console.log(`${task.id}: valid (${task.status}). Evidence contents must still be inspected by the orchestrator.`);
    return;
  }
  const next = transitionTask(task, target, reason.join(' '));
  if (outputOnly) {
    console.log(JSON.stringify(next, null, 2));
    return;
  }
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, { flag: 'wx' });
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
  console.log(`${task.id}: ${task.status} -> ${next.status} (${next.budget.corrections}/${next.budget.maxCorrections} corrections).`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
