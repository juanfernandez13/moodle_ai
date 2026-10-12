import test from 'node:test';
import assert from 'node:assert/strict';
import { hasSameOrigin } from '../../src/shared/request-origin.ts';

test('Next internal localhost admits the explicit browser origin only with its matching loopback Host', () => {
  const request = (origin: string, host: string) => new Request('http://localhost:3210/api/interpret', { headers: { origin, host } });
  assert.equal(hasSameOrigin(request('http://127.0.0.1:3210', '127.0.0.1:3210')), true);
  assert.equal(hasSameOrigin(request('http://localhost:3210', 'localhost:3210')), true);
  assert.equal(hasSameOrigin(request('http://localhost:3210', '127.0.0.1:3210')), false);
  assert.equal(hasSameOrigin(request('http://127.0.0.1:3210', 'localhost:3210')), false);
});

test('cross-origin, spoofed hosts, wrong ports and forwarded headers cannot authorize local requests', () => {
  const blocked = [
    { origin: 'https://evil.invalid', host: '127.0.0.1:3210' },
    { origin: 'https://evil.invalid', host: 'evil.invalid' },
    { origin: 'http://evil.invalid', host: 'evil.invalid' },
    { origin: 'http://127.0.0.1:3211', host: '127.0.0.1:3211' },
    { origin: 'null', host: '127.0.0.1:3210' },
    { origin: 'http://127.0.0.1:3210/', host: '127.0.0.1:3210' },
    { origin: 'http://127.0.0.1:3210', host: 'localhost:3210@evil.invalid' },
    { origin: 'http://127.0.0.1:3210', host: '127.0.0.1:3210/path' },
  ];
  for (const headers of blocked) assert.equal(hasSameOrigin(new Request('http://localhost:3210/api/interpret', { headers })), false);
  assert.equal(hasSameOrigin(new Request('http://localhost:3210/api/interpret', { headers: { origin: 'https://evil.invalid', host: 'localhost:3210', 'x-forwarded-host': 'evil.invalid' } })), false);
  assert.equal(hasSameOrigin(new Request('http://localhost:3210/api/interpret')), false);
});

test('ordinary Request origin remains canonical when no runtime Host header is present', () => {
  assert.equal(hasSameOrigin(new Request('https://app.example.test/api/interpret', { headers: { origin: 'https://app.example.test' } })), true);
  assert.equal(hasSameOrigin(new Request('https://app.example.test/api/interpret', { headers: { origin: 'https://elsewhere.example.test' } })), false);
});
