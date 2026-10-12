import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MoodleClient } from '../../src/server/moodle/client.ts';

test('login starts on the real login form and verifies authentication without exposing Moodle cookies', async () => {
  const calls: { url: string; body: string }[] = [];
  const client = new MoodleClient('http://localhost:3211', { fetch: async (input, init) => {
    calls.push({ url: String(input), body: String(init?.body ?? '') });
    if (calls.length === 1) return new Response(`<form id='login'><input name='logintoken' value='token'></form>`, { headers: { 'set-cookie': 'MoodleSession=private; Path=/' } });
    return new Response(`<script>M.cfg={"sesskey":"privatekey"};</script><span class='usertext'>Lab Admin</span>`);
  } });
  assert.deepEqual(await client.login('lab-user', 'fictitious-pass'), { name: 'Lab Admin' });
  assert.equal(calls[0]?.url, 'http://localhost:3211/login/index.php');
  assert.ok(calls[1]?.body.includes('logintoken=token'));
  assert.equal(calls.length, 2);
});
