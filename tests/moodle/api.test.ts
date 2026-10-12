import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMoodleApi } from '../../src/server/moodle/api.ts';
import { studentFixture,studentRow,dateFixture,dateInput } from './fixtures.ts';
import { buildStudentPreview } from '../../src/domain/students/index.ts';

function mutation(path: string,body: unknown,cookie?: string): Request { return new Request(`http://app.local/api/moodle/${path}`,{method:'POST',headers:{origin:'http://app.local','content-type':'application/json',...(cookie?{cookie}: {})},body:JSON.stringify(body)}); }

test('public Moodle routes reject cross origin login before making an external request', async () => {
  let calls = 0;
  const api = createMoodleApi({ url: 'http://localhost:3211', profile: 'moodle-4.1.17-lab-ops-v1', fetch: async () => { calls++; return new Response(''); } });
  const response = await api(new Request('http://app.local/api/moodle/login', { method: 'POST', headers: { origin: 'http://evil.invalid', 'content-type': 'application/json' }, body: JSON.stringify({ username: 'lab', password: 'fake' }) }), 'login');
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { ok: false, issues: [{ code: 'invalid_origin', message: 'A operação deve partir desta aplicação.' }] });
  assert.equal(calls, 0);
});

test('student confirmation consumes the reviewed preview once even after an uncertain timeout', async () => {
  for(const timeout of [false,true]) {
    const fixture=studentFixture({timeout});const api=createMoodleApi({url:'http://localhost:3211',profile:'moodle-4.1.17-lab-ops-v1',fetch:fixture.fetch,timeoutMs:20});
    const login=await api(mutation('login',{username:'lab',password:'fictitious'}),'login');const cookie=login.headers.get('set-cookie')!.split(';')[0]!;
    const reviewed=await buildStudentPreview([studentRow],{mode:'create',enrol:false});assert.ok(reviewed.ok);
    const preview=await api(mutation('students/preview',{rows:[studentRow],options:{mode:'create',enrol:false},expectedHash:reviewed.preview.hash},cookie),'studentsPreview');assert.equal(preview.status,200);
    assert.equal(fixture.confirms(),0);const p=await preview.json();
    const body={previewId:p.previewId,expectedHash:p.hash,confirmation:true};
    const refused=await api(mutation('students/confirm',{...body,expectedHash:'0'.repeat(64)},cookie),'studentsConfirm');assert.equal(refused.status,409);assert.equal(fixture.confirms(),0);
    const confirmed=await api(mutation('students/confirm',body,cookie),'studentsConfirm');assert.equal(confirmed.status,200);
    const result=await confirmed.json();assert.equal(result.results[0].status,timeout?'unknown':'created');
    const repeated=await api(mutation('students/confirm',body,cookie),'studentsConfirm');assert.equal(repeated.status,409);assert.equal(fixture.confirms(),1);
    assert.ok(!JSON.stringify(result).includes('Private HTML'));
  }
});

test('date confirmation rejects another session and consumes preview on course drift', async () => {
  const fixture=dateFixture({drift:true}),users=studentFixture();
  const api=createMoodleApi({url:'http://localhost:3211',profile:'moodle-4.1.17-lab-ops-v1',fetch:async(input,init)=>new URL(String(input)).pathname.startsWith('/login/')?users.fetch(input,init):fixture.fetch(input,init)});
  const a=await api(mutation('login',{username:'first',password:'fictitious'}),'login'),b=await api(mutation('login',{username:'second',password:'fictitious'}),'login');
  const cookieA=a.headers.get('set-cookie')!.split(';')[0]!,cookieB=b.headers.get('set-cookie')!.split(';')[0]!;
  const preview=await api(mutation('dates/preview',{courseId:3,input:dateInput},cookieA),'datesPreview');assert.equal(preview.status,200);const p=await preview.json();
  const body={previewId:p.previewId,expectedHash:p.hash,confirmation:true};
  assert.equal((await api(mutation('dates/confirm',body,cookieB),'datesConfirm')).status,409);
  const conflict=await api(mutation('dates/confirm',body,cookieA),'datesConfirm');assert.equal(conflict.status,409);assert.equal((await conflict.json()).issues[0].code,'moodle_state_changed');
  assert.equal((await api(mutation('dates/confirm',body,cookieA),'datesConfirm')).status,409);assert.deepEqual(fixture.posts,[]);
});

test('unconfigured and remote Moodle configurations disclose setup issues without authentication or network access', async () => {
  for (const config of [{}, { url: 'https://production.invalid', profile: 'moodle-4.1.17-lab-ops-v1' }, { url: 'http://localhost:3211', profile: 'unproven' }]) {
    let calls = 0;
    const api = createMoodleApi({ ...config, fetch: async () => { calls++; return new Response(''); } });
    const status = await api(new Request('http://app.local/api/moodle/status'), 'status');
    const body = await status.json(); assert.equal(body.validated, false); assert.equal(body.authenticated, false); assert.ok(body.issues.length);
    const login = await api(new Request('http://app.local/api/moodle/login', { method: 'POST', headers: { origin: 'http://app.local', 'content-type': 'application/json' }, body: JSON.stringify({ username:'lab',password:'fictitious' }) }), 'login');
    assert.equal(login.status, 503); assert.equal(calls, 0); assert.equal(status.headers.get('cache-control'), 'no-store, max-age=0');
  }
});

test('strict schema, actual body limit, unknown session and expired sessions fail closed', async () => {
  let now = 0, calls = 0;
  const api = createMoodleApi({ url: 'http://localhost:3211', profile: 'moodle-4.1.17-lab-ops-v1', now: () => now, fetch: async () => {
    calls++; return new Response(calls === 1 ? `<form id='login'><input name='logintoken' value='x'></form>` : `<script>M.cfg={"sesskey":"private"}</script>`);
  } });
  const request = (body: unknown, extra: Record<string,string> = {}) => new Request('http://app.local/api/moodle/login', { method: 'POST', headers: { origin: 'http://app.local', 'content-type': 'application/json', ...extra }, body: JSON.stringify(body) });
  assert.equal((await api(request({username:'lab',password:'x',url:'http://evil.invalid'}),'login')).status,422);
  assert.equal((await api(request({username:'lab',password:'x'.repeat(5000)}, {'content-length':'1'}),'login')).status,413);
  assert.equal(calls,0);
  const login = await api(request({username:'lab',password:'fictitious'}),'login'); assert.equal(login.status,200);
  const privateCookie = login.headers.get('set-cookie')!.split(';')[0]!;
  assert.match(privateCookie,/moodle_ai_session=[a-f0-9-]{36}$/); assert.ok(!privateCookie.includes('private'));
  now = 31 * 60_000;
  const expired = await api(new Request('http://app.local/api/moodle/courses',{headers:{cookie:privateCookie}}),'courses');
  assert.equal(expired.status,401); assert.equal(calls,2);
});

test('logout disconnects an anonymous or expired session without requiring an invented JSON body', async () => {
  const api = createMoodleApi({});
  const response = await api(new Request('https://app.local/api/moodle/logout', { method: 'POST', headers: { origin: 'https://app.local' } }), 'logout');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.match(response.headers.get('set-cookie') ?? '', /HttpOnly; SameSite=Strict; Max-Age=0; Secure/);
});
