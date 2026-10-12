import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MoodleClient } from '../../src/server/moodle/client.ts';
import { previewStudents } from '../../src/server/moodle/students.ts';
import { buildStudentPreview } from '../../src/domain/students/index.ts';
import { studentFixture } from './fixtures.ts';

const row = { id: 'one', rowNumber: 2, original: {}, username: 'lab-test-one', firstName: 'Fictício', lastName: 'Um', email: 'one@example.invalid', cpf: '', course: '' };
test('student preview rejects an unreviewed hash before contacting Moodle', async () => {
  let calls = 0;
  const client = new MoodleClient('http://localhost:3211', { fetch: async () => { calls++; return new Response(''); } });
  const input = await buildStudentPreview([row], { mode: 'create', enrol: false }); assert.ok(input.ok);
  await assert.rejects(previewStudents(client, [row], { mode: 'create', enrol: false }, '0'.repeat(64)), (e: unknown) => typeof e === 'object' && e !== null && 'code' in e && e.code === 'stale_preview');
  assert.equal(calls, 0);
});

test('missing Moodle upload repository is diagnosed without a numeric fallback or file upload', async () => {
  const fixture=studentFixture({missingRepository:true});const client=new MoodleClient('http://localhost:3211',{fetch:fixture.fetch});
  const reviewed=await buildStudentPreview([row],{mode:'create',enrol:false});assert.ok(reviewed.ok);
  await assert.rejects(previewStudents(client,[row],{mode:'create',enrol:false},reviewed.preview.hash),(error: unknown)=>typeof error==='object'&&error!==null&&'code'in error&&error.code==='upload_repository_missing');
  assert.equal(fixture.calls(),1);assert.equal(fixture.confirms(),0);
});

test('preview includes controlled pending status from the actual Moodle preview table without creating users', async () => {
  const fixture=studentFixture({pending:true});const client=new MoodleClient('http://localhost:3211',{fetch:fixture.fetch});
  const reviewed=await buildStudentPreview([row],{mode:'create',enrol:false}); assert.ok(reviewed.ok);
  const result=await previewStudents(client,[row],{mode:'create',enrol:false},reviewed.preview.hash);
  assert.equal(result.rows[0]?.status,'Moodle informou pendência nesta linha. Revise antes de confirmar.');
  assert.equal(fixture.confirms(),0);assert.equal(result.effectiveOptions.defaults.city,'');assert.equal(result.effectiveOptions.newPassword,'generated-by-moodle-and-email');
  assert.ok(!JSON.stringify(result.rows).includes('Duplicate personal email'));
});
