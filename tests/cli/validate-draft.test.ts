import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtemp, writeFile, readFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cli = fileURLToPath(new URL('../../src/cli/validate-draft.ts', import.meta.url));

test('CLI explains usage and returns 2 when no JSON file is supplied', () => {
  const result = spawnSync(process.execPath, [cli], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  const output = JSON.parse(result.stdout);
  assert.equal(output.valid, false);
  assert.equal(output.issues[0].code, 'usage_error');
  assert.equal(result.stderr, '');
});

test('CLI validates a synthetic JSON and prints counts without echoing course contents', () => {
  const fixture = fileURLToPath(new URL('../fixtures/course-valid.json', import.meta.url));
  const result = spawnSync(process.execPath, [cli, fixture], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.valid, true);
  assert.deepEqual(output.issues, []);
  assert.deepEqual(output.summary, { sections: 1, activities: 6, attachments: 3 });
  assert.equal('draft' in output, false);
  assert.equal('metadata' in output, false);
  assert.equal(result.stderr, '');
});

test('malformed JSON returns 1 with a useful diagnosis and no source text in logs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'moodle-ai-cli-'));
  const file = join(directory, 'malformed.json');
  try {
    await writeFile(file, '{"private": "SECRET-SENTINEL"');
    const result = spawnSync(process.execPath, [cli, file], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stdout).issues[0].code, 'invalid_json');
    assert.equal(result.stderr, '');
    assert.equal(result.stdout.includes('SECRET-SENTINEL'), false);
  } finally {
    await unlink(file);
    await rmdir(directory);
  }
});

test('unreadable file and directory return 2 without leaking filesystem exceptions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'moodle-ai-cli-'));
  try {
    for (const file of [join(directory, 'missing.json'), directory]) {
      const result = spawnSync(process.execPath, [cli, file], { encoding: 'utf8' });
      assert.equal(result.status, 2);
      assert.equal(JSON.parse(result.stdout).issues[0].code, 'file_error');
      assert.equal(result.stderr, '');
      assert.equal(result.stdout.includes(directory), false);
    }
  } finally {
    await rmdir(directory);
  }
});

test('JSON beyond the 1 MiB limit returns 2 before syntax validation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'moodle-ai-cli-'));
  const file = join(directory, 'large.json');
  try {
    await writeFile(file, Buffer.alloc(1_048_577, 32));
    const result = spawnSync(process.execPath, [cli, file], { encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.equal(JSON.parse(result.stdout).issues[0].code, 'file_too_large');
    assert.equal(result.stderr, '');
  } finally {
    await unlink(file);
    await rmdir(directory);
  }
});

test('a valid JSON exactly at the 1 MiB limit is accepted', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'moodle-ai-cli-'));
  const file = join(directory, 'boundary.json');
  try {
    const json = await readFile(new URL('../fixtures/course-valid.json', import.meta.url));
    const bytes = Buffer.alloc(1_048_576, 32);
    json.copy(bytes);
    await writeFile(file, bytes);
    const result = spawnSync(process.execPath, [cli, file], { encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).valid, true);
    assert.equal(result.stderr, '');
  } finally {
    await unlink(file);
    await rmdir(directory);
  }
});

for (const [name, path] of [
  ['course-invalid-version.json', 'schemaVersion'],
  ['course-invalid-duplicate-id.json', 'sections[0].activities[1].id'],
  ['course-invalid-internal-field.json', 'attachments[0].filePath'],
]) {
  test(`CLI rejects ${name} with a localized issue and preserves the file`, async () => {
    const file = fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
    const before = await readFile(file);
    const result = spawnSync(process.execPath, [cli, file], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    const output = JSON.parse(result.stdout);
    assert.equal(output.valid, false);
    assert.equal(output.issues.some((issue: { path: string }) => issue.path === path), true);
    assert.equal(result.stderr, '');
    assert.equal(result.stdout.includes('PRIVATE_INTERNAL_PATH_SENTINEL'), false);
    assert.deepEqual(await readFile(file), before);
  });
}
