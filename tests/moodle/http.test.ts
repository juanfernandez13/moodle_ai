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
