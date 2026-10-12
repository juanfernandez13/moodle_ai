import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MoodleClient } from '../../src/server/moodle/client.ts';
import { previewDates, confirmDates } from '../../src/server/moodle/dates.ts';
import { dateFixture, dateInput } from './fixtures.ts';

const availability = '{"op":"&","c":[{"type":"group","id":7}],"showc":[true],"unknown":"keep"}';
function repeatedTags(initial: string[], dropAfterPost = false) {
  const fixture = dateFixture({ filemanager: true });
  const tags = new Map(['2', '4', '5'].map(id => [id, [...initial]]));
  const submissions: string[][] = [];
  const client = new MoodleClient('http://localhost:3211', { fetch: async (url, init) => {
    const address = new URL(String(url)), fields = new URLSearchParams(String(init?.body));
    const id = address.searchParams.get('id') ?? address.searchParams.get('update') ?? fields.get('id');
    if (init?.method === 'POST' && id) {
      const submitted = fields.getAll('tags[]');
      submissions.push(submitted);
      tags.set(id, dropAfterPost ? submitted.slice(-1) : submitted);
    }
    const response = await fixture.fetch(url, init);
    let html = await response.text();
    if (id && html.includes('<form')) html = html.replace(/<input name='tags\[\]'[^>]*>/g, '').replace('</form>', `<select name='tags[]' multiple>${(tags.get(id) ?? []).map(tag => `<option selected value='${tag}'>${tag}</option>`).join('')}</select></form>`);
    return new Response(html, { status: response.status });
  } });
  return { client, tags, submissions, posts: fixture.posts };
}
test('dates preview reads current Moodle forms and preserves unknown access conditions without sending changes', async () => {
  const calls: string[] = [];
  const client = new MoodleClient('http://localhost:3211', { fetch: async (url, init) => {
    assert.notEqual(init?.method, 'POST'); calls.push(String(url));
    if (String(url).includes('/user/edit')) return new Response(`<form method='post'><select name='timezone'><option selected value='Europe/London'>London</option></select></form>`);
    if (String(url).includes('/course/view')) return new Response(`<h1>Lab</h1><li id='section-0' data-number='0' data-id='1'></li><li id='section-1' data-number='1' data-id='2'><h3 class='sectionname'>Unit</h3><ul><li id='module-4' class='modtype_forum'><span class='instancename'>Discuss</span></li></ul></li>`);
    const identifier = String(url).includes('modedit') ? 'coursemodule' : '_qf__editsection_form';
    return new Response(`<form action='/course/editsection.php' method='post'><input name='${identifier}' value='1'><input name='sesskey' value='private'><input name='id' value='2'><input name='name' value='Unit'><input name='availabilityconditionsjson' value='${availability}'><input name='submitbutton' type='submit' value='Save'></form>`);
  } });
  const result = await previewDates(client, 3, { startDate: '2030-01-07', unitCount: 1, daysPerUnit: 7, opensAtTime: '08:00', closesAtTime: '18:00', timezoneOffsetMinutes: -180 });
  assert.equal(result.plan.changes[0]?.after.opensAt, '2030-01-07T11:00:00.000Z');
  const after = JSON.parse(String(result.plan.changes[0]?.after.availability));
  assert.deepEqual(after.c[0], { type: 'group', id: 7 });
  assert.equal(after.unknown, 'keep');
  assert.equal(calls.length, 4);
});

test('a changed course is refused before sending any target', async () => {
  const fixture=dateFixture({drift:true});const client=new MoodleClient('http://localhost:3211',{fetch:fixture.fetch});
  const preview=await previewDates(client,3,dateInput);
  await assert.rejects(confirmDates(client,preview.operation),(e: unknown)=>typeof e==='object'&&e!==null&&'code'in e&&e.code==='moodle_state_changed');
  assert.deepEqual(fixture.posts,[]);
});

test('partial rejection stops later targets and preserves unrelated Moodle settings', async () => {
  const fixture=dateFixture({partial:true});const client=new MoodleClient('http://localhost:3211',{fetch:fixture.fetch});
  const preview=await previewDates(client,3,dateInput),result=await confirmDates(client,preview.operation);
  assert.deepEqual(result.counts,{applied:1,error:1,unknown:0,not_applied:1});assert.equal(result.partial,true);
  assert.deepEqual(fixture.posts,['2','4']);assert.equal(fixture.states.get('2')?.summary,'keep');assert.equal(fixture.states.get('5')?.grade,'90');
  assert.ok(!JSON.stringify(result).includes('private'));
});

test('a timeout after a date POST is unknown and later targets are not sent', async () => {
  const fixture=dateFixture({timeout:true});const client=new MoodleClient('http://localhost:3211',{fetch:fixture.fetch,timeoutMs:20});
  const preview=await previewDates(client,3,dateInput),result=await confirmDates(client,preview.operation);
  assert.deepEqual(result.counts,{applied:0,error:0,unknown:1,not_applied:2});assert.deepEqual(fixture.posts,['2']);
});

test('native quiz selectors express instants in the actual Moodle timezone across summer time', async () => {
  const fixture=dateFixture();const client=new MoodleClient('http://localhost:3211',{fetch:fixture.fetch});
  const preview=await previewDates(client,3,{...dateInput,startDate:'2026-10-12'});await confirmDates(client,preview.operation);
  assert.equal(fixture.states.get('5')?.['timeopen[hour]'],'12'); // 11:00 UTC equals 12:00 Europe/London before DST ends.
  assert.equal(fixture.states.get('5')?.['timeclose[hour]'],'22');
});

test('relative Moodle form actions resolve against the current editing page', async () => {
  const fixture=dateFixture({relativeAction:true}); const client=new MoodleClient('http://localhost:3211',{fetch:fixture.fetch});
  const preview=await previewDates(client,3,dateInput); const result=await confirmDates(client,preview.operation);
  assert.equal(result.partial,false); assert.equal(result.counts.applied,3);
});

test('preview rejects a year the Moodle date selector cannot represent before any mutation', async () => {
  const fixture=dateFixture({restrictedYears:true});
  const client=new MoodleClient('http://localhost:3211',{fetch:fixture.fetch});
  await assert.rejects(previewDates(client,3,dateInput), (e: unknown)=>typeof e==='object' && e!==null && 'code' in e && e.code==='unsupported_form');
  assert.deepEqual(fixture.posts,[]);
});

test('Moodle regenerating an empty Safe Exam Browser draft is not course drift', async () => {
  const fixture = dateFixture({filemanager:true});
  const client = new MoodleClient('http://localhost:3211',{fetch:fixture.fetch});
  const preview = await previewDates(client,3,dateInput);
  const result = await confirmDates(client,preview.operation);
  assert.equal(result.partial,false); assert.deepEqual(result.counts,{applied:3,error:0,unknown:0,not_applied:0});
});

test('changing an earlier repeated form value invalidates the preview before any POST', async () => {
  const fixture = repeatedTags(['original', 'fixed']);
  const preview = await previewDates(fixture.client, 3, dateInput);
  fixture.tags.set('4', ['changed', 'fixed']);
  await assert.rejects(confirmDates(fixture.client, preview.operation), (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'moodle_state_changed');
  assert.deepEqual(fixture.posts, []);
});

test('losing a repeated form value after POST is unknown and stops later targets', async () => {
  const fixture = repeatedTags(['first', 'last'], true);
  const preview = await previewDates(fixture.client, 3, dateInput);
  const result = await confirmDates(fixture.client, preview.operation);
  assert.deepEqual(fixture.submissions, [['first', 'last']]);
  assert.deepEqual(fixture.posts, ['2']);
  assert.deepEqual(result.counts, { applied: 0, error: 0, unknown: 1, not_applied: 2 });
  assert.equal(result.partial, true);
});

test('repeated values retain their order through POST/readback despite volatile draft fields', async () => {
  const fixture = repeatedTags(['second', 'first', 'fixed']);
  const preview = await previewDates(fixture.client, 3, dateInput);
  const result = await confirmDates(fixture.client, preview.operation);
  assert.deepEqual(fixture.submissions, [['second', 'first', 'fixed'], ['second', 'first', 'fixed'], ['second', 'first', 'fixed']]);
  assert.deepEqual(result.counts, { applied: 3, error: 0, unknown: 0, not_applied: 0 });
  assert.equal(result.partial, false);
});

test('reordering earlier repeated values invalidates the preview even when the final value is unchanged', async () => {
  const fixture = repeatedTags(['first', 'second', 'fixed']);
  const preview = await previewDates(fixture.client, 3, dateInput);
  fixture.tags.set('4', ['second', 'first', 'fixed']);
  await assert.rejects(confirmDates(fixture.client, preview.operation), (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'moodle_state_changed');
  assert.deepEqual(fixture.posts, []);
});

test('enabling a Moodle date checkbox preserves its hidden false value and checked value in readback', async () => {
  const fixture = dateFixture();
  const client = new MoodleClient('http://localhost:3211', { fetch: async (url, init) => {
    const response = await fixture.fetch(url, init);
    const html = (await response.text()).replace(/<input name='(timeopen|timeclose)\[enabled\]' value='([01])'>/g, (_, prefix: string, value: string) => `<input name='${prefix}[enabled]' type='hidden' value='0'><input name='${prefix}[enabled]' type='checkbox' value='1'${value === '1' ? ' checked' : ''}>`);
    return new Response(html, { status: response.status });
  } });
  const preview = await previewDates(client, 3, dateInput);
  const result = await confirmDates(client, preview.operation);
  assert.deepEqual(result.counts, { applied: 3, error: 0, unknown: 0, not_applied: 0 });
  assert.equal(result.partial, false);
});
