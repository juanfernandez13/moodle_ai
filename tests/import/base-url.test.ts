// O endereço da "Outra IA" é digitado na tela e chamado pelo servidor: só sai daqui um endereço que pode ser chamado.
import assert from "node:assert/strict";
import test from "node:test";
import { baseUrlPolicy, checkBaseUrl } from "../../src/server/import/base-url.ts";

const open = { allowLocal: false };
const local = { allowLocal: true };
const accepted = (raw: string, policy = open) => {
  const result = checkBaseUrl(raw, policy);
  assert.equal(result.ok, true, `${raw}: ${JSON.stringify(result)}`);
  return result.ok ? result.url : "";
};
const refused = (raw: string, policy = open) =>
  assert.equal(checkBaseUrl(raw, policy).ok, false, raw);

test("endereços públicos em https passam, sem barra no fim", () => {
  assert.equal(accepted("https://openrouter.ai/api/v1"), "https://openrouter.ai/api/v1");
  assert.equal(accepted("https://openrouter.ai/api/v1/"), "https://openrouter.ai/api/v1");
  assert.equal(accepted("  https://api.groq.com/openai/v1  "), "https://api.groq.com/openai/v1");
  assert.equal(accepted("https://ia.exemplo.com"), "https://ia.exemplo.com");
});

test("http, usuário e senha, parâmetros e lixo são recusados", () => {
  for (const raw of [
    "http://openrouter.ai/api/v1",
    "ftp://openrouter.ai/v1",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "https://usuario:senha@ia.exemplo.com/v1",
    "https://ia.exemplo.com/v1?key=1",
    "https://ia.exemplo.com/v1#x",
    "ia.exemplo.com/v1",
    "",
    "não é um endereço",
  ])
    refused(raw);
});

test("a rede interna e a metadata de nuvem são recusadas num servidor publicado", () => {
  for (const raw of [
    "https://localhost/v1",
    "https://api.localhost/v1",
    "https://127.0.0.1/v1",
    "https://127.1.2.3/v1",
    "https://0.0.0.0/v1",
    "https://10.0.0.5/v1",
    "https://172.16.0.1/v1",
    "https://172.31.255.255/v1",
    "https://192.168.1.10/v1",
    "https://169.254.169.254/latest/meta-data",
    "https://100.64.0.1/v1",
    "https://[::1]/v1",
    "https://[fd00::1]/v1",
    "https://[fe80::1]/v1",
    "https://[::ffff:127.0.0.1]/v1",
    "https://[::ffff:10.0.0.1]/v1",
    "https://intranet/v1",
    "https://servidor.local/v1",
    "https://db.internal/v1",
    // Formas disfarçadas do mesmo endereço: o URL as normaliza antes da conferência.
    "https://2130706433/v1",
    "https://0x7f000001/v1",
    "https://127.1/v1",
  ])
    refused(raw);
  // Os vizinhos das faixas privadas são públicos.
  accepted("https://172.32.0.1/v1");
  accepted("https://172.15.0.1/v1");
  accepted("https://8.8.8.8/v1");
  accepted("https://100.128.0.1/v1");
});

test("máquina local passa só quando a política permite (Ollama, LM Studio)", () => {
  accepted("http://localhost:11434/v1", local);
  accepted("http://127.0.0.1:1234/v1", local);
  accepted("http://192.168.0.20:8080/v1", local);
  accepted("https://servidor.local/v1", local);
  // Mesmo permitindo a máquina local, o resto das regras vale.
  refused("ftp://localhost/v1", local);
  refused("http://user:pass@localhost/v1", local);
  // E um endereço público continua precisando de https.
  refused("http://ia.exemplo.com/v1", local);
});

test("a lista do servidor trava tudo: só o que está nela passa, inclusive em máquina local", () => {
  const policy = {
    allowLocal: true,
    allowed: ["https://openrouter.ai/api/v1", "http://localhost:11434/v1/"],
  };
  assert.equal(accepted("https://openrouter.ai/api/v1/", policy), "https://openrouter.ai/api/v1");
  assert.equal(accepted("http://localhost:11434/v1", policy), "http://localhost:11434/v1");
  refused("https://api.groq.com/openai/v1", policy);
  refused("https://openrouter.ai/api/v2", policy);
  refused("https://openrouter.ai.evil.com/api/v1", policy);
  refused("http://localhost:9999/v1", policy);
});

test("a política vem do ambiente: máquina local só fora de produção ou com a variável", () => {
  assert.equal(baseUrlPolicy({}).allowLocal, true);
  assert.equal(baseUrlPolicy({ NODE_ENV: "development" }).allowLocal, true);
  assert.equal(baseUrlPolicy({ NODE_ENV: "production" }).allowLocal, false);
  assert.equal(
    baseUrlPolicy({ NODE_ENV: "production", AI_ALLOW_LOCAL_BASE_URLS: "1" }).allowLocal,
    true,
  );
  assert.equal(
    baseUrlPolicy({ NODE_ENV: "production", AI_ALLOW_LOCAL_BASE_URLS: "true" }).allowLocal,
    false,
    "só o valor 1 liga",
  );
  assert.equal(baseUrlPolicy({}).allowed, undefined);
  assert.deepEqual(
    baseUrlPolicy({ AI_ALLOWED_BASE_URLS: " https://a.com/v1 , https://b.com/v1 ,," }).allowed,
    ["https://a.com/v1", "https://b.com/v1"],
  );
});
