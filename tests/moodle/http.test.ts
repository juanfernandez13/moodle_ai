import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MoodleHttp, MoodleError } from '../../src/server/moodle/http.ts';

test('Moodle HTTP never follows a redirect or sends cookies to another origin', async () => {
  const calls: string[] = [];
  const http = new MoodleHttp('http://localhost:3211', { fetch: async (input) => {
    calls.push(String(input));
    return new Response('', { status: 302, headers: { location: 'https://outside.invalid/', 'set-cookie': 'MoodleSession=secret; Path=/' } });
  } });
  await assert.rejects(http.text('/login/index.php'), (error) => error instanceof MoodleError && error.code === 'unsafe_redirect');
  assert.deepEqual(calls, ['http://localhost:3211/login/index.php']);
});

test('HTTP caps actual streamed bytes even with a small declared content length', async () => {
  const http = new MoodleHttp('http://localhost:3211', { maximumBytes: 4, fetch: async () => new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('toolong')); controller.close(); } }), { headers: { 'content-length': '1' } }) });
  await assert.rejects(http.text('/large'), (error) => error instanceof MoodleError && error.code === 'response_too_large');
});

test('same origin redirects keep intermediate Moodle cookies private and preserve 307 method', async () => {
  const seen: { method: string; cookie: string | null; body: string }[] = [];
  const http = new MoodleHttp('http://localhost:3211', { fetch: async (_, init) => {
    const headers = new Headers(init?.headers); seen.push({ method: init?.method ?? 'GET', cookie: headers.get('cookie'), body: String(init?.body ?? '') });
    return seen.length === 1 ? new Response('', { status: 307, headers: { location: '/same', 'set-cookie': 'MoodleSession=private; Path=/' } }) : new Response('ok');
  } });
  assert.equal(await http.post('/start', [['field','value']]), 'ok');
  assert.deepEqual(seen, [{ method: 'POST', cookie: null, body: 'field=value' }, { method: 'POST', cookie: 'MoodleSession=private', body: 'field=value' }]);
});

test('Moodle deadline covers a stalled streamed response after a POST and reports uncertain state', async () => {
  const http = new MoodleHttp('http://localhost:3211', { timeoutMs: 15, fetch: async () => new Response(new ReadableStream({ start() { /* A server that never finishes the response. */ } })) });
  const completion = http.post('/mutate.php', [['fake', 'value']]).then(() => 'unexpected-success', error => error instanceof MoodleError && error.code === 'moodle_timeout' && error.uncertain ? 'uncertain-timeout' : 'wrong-error');
  const observed = await Promise.race([completion, new Promise(resolve => setTimeout(() => resolve('hung'), 100))]);
  assert.equal(observed, 'uncertain-timeout');
});

test('redirect to the same installation with a fragment is followed (Moodle does it after saving a section) and the fragment is never requested', async () => {
  const seen: { method: string; url: string }[] = [];
  const http = new MoodleHttp('http://localhost:3211', { fetch: async (input, init) => {
    seen.push({ method: init?.method ?? 'GET', url: String(input) });
    return seen.length === 1 ? new Response('', { status: 302, headers: { location: 'http://localhost:3211/course/view.php?id=17#section-1' } }) : new Response('curso');
  } });
  assert.equal(await http.post('/course/editsection.php', [['field', 'value']]), 'curso');
  // O fragmento é só da página: nunca vai ao servidor, e o POST vira GET como em todo 302.
  assert.deepEqual(seen.map((call) => call.url), ['http://localhost:3211/course/editsection.php', 'http://localhost:3211/course/view.php?id=17']);
});

test('a fragment does not make another origin or another installation path acceptable', async () => {
  for (const location of ['https://outside.invalid/course/view.php?id=17#section-1', 'http://localhost.evil.invalid:3211/#x', 'http://user:pass@localhost:3211/course/view.php#x']) {
    const calls: string[] = [];
    const http = new MoodleHttp('http://localhost:3211', { fetch: async (input) => {
      calls.push(String(input));
      return new Response('', { status: 302, headers: { location } });
    } });
    await assert.rejects(http.text('/course/editsection.php'), (error) => error instanceof MoodleError && error.code === 'unsafe_redirect', location);
    assert.equal(calls.length, 1, location);
  }
  const nested = new MoodleHttp('http://localhost:3211/moodle/', { fetch: async () => new Response('', { status: 302, headers: { location: 'http://localhost:3211/outro/course/view.php#x' } }) });
  await assert.rejects(nested.text('/course/editsection.php'), (error) => error instanceof MoodleError && error.code === 'unsafe_redirect');
});
