import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import * as route from "../../app/api/import/providers/route.ts";
import { readProviderStatus } from "../../src/server/import/provider-status.ts";

// Chaves sintéticas: servem só para provar que nada delas aparece na saída.
const OPENAI_KEY = "SYNTHETIC-OPENAI-ZQ7XV9LM2WP4KD8";
const GEMINI_KEY = "SYNTHETIC-GEMINI-HN3RT6YB1CS5FJ0";
const NAMES = [
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
] as const;

// Isola o teste das variáveis de quem executa e as restaura ao terminar.
function useEnvironment(
  context: TestContext,
  values: Partial<Record<(typeof NAMES)[number], string>>,
): void {
  const previous = NAMES.map((name) => [name, process.env[name]] as const);
  context.after(() => {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  for (const name of NAMES) {
    const value = values[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

// Nem a chave inteira nem qualquer trecho de 6 caracteres dela pode aparecer.
function assertWithoutKey(text: string, key: string): void {
  assert.equal(text.includes(key), false, "A chave inteira apareceu.");
  for (let start = 0; start + 6 <= key.length; start++)
    assert.equal(
      text.includes(key.slice(start, start + 6)),
      false,
      `Um trecho da chave apareceu (posição ${start}).`,
    );
}

const configured = (environment: Record<string, string>) => {
  const { providers } = readProviderStatus(environment);
  return [providers.openai.configured, providers.gemini.configured];
};
const models = (environment: Record<string, string>) => {
  const { providers } = readProviderStatus(environment);
  return [providers.openai.model, providers.gemini.model];
};

test("sem chaves nem modelos, nenhum provedor aparece como configurado", () => {
  assert.deepEqual(readProviderStatus({}), {
    providers: {
      openai: { configured: false, model: null },
      gemini: { configured: false, model: null },
    },
  });
});

test("a chave de cada provedor conta separadamente", () => {
  assert.deepEqual(configured({ OPENAI_API_KEY: OPENAI_KEY }), [true, false]);
  assert.deepEqual(configured({ GEMINI_API_KEY: GEMINI_KEY }), [false, true]);
  assert.deepEqual(
    configured({ OPENAI_API_KEY: OPENAI_KEY, GEMINI_API_KEY: GEMINI_KEY }),
    [true, true],
  );
  assert.deepEqual(
    configured({
      OPENAI_MODEL: "modelo-openai",
      GEMINI_MODEL: "modelo-gemini",
      MOODLE_URL: "http://localhost:3211",
    }),
    [false, false],
    "Modelo e outras variáveis não substituem a chave.",
  );
});

test("chave vazia ou só com espaços não conta como configurada", () => {
  for (const blank of ["", " ", "   ", "\t", "\r\n", " \t\n "])
    assert.deepEqual(
      configured({ OPENAI_API_KEY: blank, GEMINI_API_KEY: blank }),
      [false, false],
      JSON.stringify(blank),
    );
  assert.deepEqual(
    configured({
      OPENAI_API_KEY: `  ${OPENAI_KEY}\n`,
      GEMINI_API_KEY: ` ${GEMINI_KEY} `,
    }),
    [true, true],
    "Espaços em volta de uma chave real não a invalidam.",
  );
});

test("o modelo vem do servidor, sem espaços nas pontas, ou é null", () => {
  assert.deepEqual(models({}), [null, null]);
  assert.deepEqual(
    models({ OPENAI_MODEL: "modelo-openai", GEMINI_MODEL: "modelo-gemini" }),
    ["modelo-openai", "modelo-gemini"],
  );
  assert.deepEqual(models({ OPENAI_MODEL: "  modelo-openai  " }), [
    "modelo-openai",
    null,
  ]);
  assert.deepEqual(models({ OPENAI_MODEL: "", GEMINI_MODEL: "   " }), [
    null,
    null,
  ]);
  assert.deepEqual(
    readProviderStatus({ GEMINI_MODEL: "modelo-gemini" }).providers.gemini,
    { configured: false, model: "modelo-gemini" },
    "O modelo vale mesmo sem chave configurada.",
  );
});

test("o resultado traz só configured e model, nunca a chave", () => {
  const status = readProviderStatus({
    OPENAI_API_KEY: OPENAI_KEY,
    OPENAI_MODEL: "modelo-openai",
    GEMINI_API_KEY: GEMINI_KEY,
    GEMINI_MODEL: "modelo-gemini",
  });
  assert.deepEqual(status, {
    providers: {
      openai: { configured: true, model: "modelo-openai" },
      gemini: { configured: true, model: "modelo-gemini" },
    },
  });
  const text = JSON.stringify(status);
  assertWithoutKey(text, OPENAI_KEY);
  assertWithoutKey(text, GEMINI_KEY);
  assert.deepEqual(
    readProviderStatus({
      OPENAI_API_KEY: "x",
      OPENAI_MODEL: "modelo-openai",
      GEMINI_API_KEY: "y".repeat(500),
      GEMINI_MODEL: "modelo-gemini",
    }),
    status,
    "Só a existência da chave importa, não o conteúdo nem o tamanho.",
  );
});

test("chave sem modelo definido deixa model null e não vaza a chave", () => {
  const status = readProviderStatus({
    OPENAI_API_KEY: OPENAI_KEY,
    GEMINI_API_KEY: GEMINI_KEY,
  });
  assert.deepEqual(status, {
    providers: {
      openai: { configured: true, model: null },
      gemini: { configured: true, model: null },
    },
  });
  const text = JSON.stringify(status);
  assertWithoutKey(text, OPENAI_KEY);
  assertWithoutKey(text, GEMINI_KEY);
});

test("sem argumento, lê o ambiente do processo a cada chamada", (context) => {
  useEnvironment(context, {});
  assert.equal(readProviderStatus().providers.openai.configured, false);
  process.env.OPENAI_API_KEY = OPENAI_KEY;
  assert.equal(readProviderStatus().providers.openai.configured, true);
  process.env.OPENAI_API_KEY = "   ";
  assert.equal(readProviderStatus().providers.openai.configured, false);
});

test("GET /api/import/providers informa o estado sem cache e sem a chave", async (context) => {
  useEnvironment(context, {
    OPENAI_API_KEY: OPENAI_KEY,
    OPENAI_MODEL: "modelo-openai",
    GEMINI_API_KEY: GEMINI_KEY,
  });
  const consoleCalls = (
    ["debug", "error", "info", "log", "warn"] as const
  ).map((method) => context.mock.method(console, method, () => undefined));
  const response = route.GET();
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^application\/json/,
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    null,
    "Sem CORS, outro site não consegue ler a resposta.",
  );
  for (const [, value] of response.headers) {
    assertWithoutKey(value, OPENAI_KEY);
    assertWithoutKey(value, GEMINI_KEY);
  }
  const text = await response.text();
  assert.deepEqual(JSON.parse(text), {
    providers: {
      openai: { configured: true, model: "modelo-openai" },
      gemini: { configured: true, model: null },
    },
  });
  assertWithoutKey(text, OPENAI_KEY);
  assertWithoutKey(text, GEMINI_KEY);
  assert.equal(
    consoleCalls.reduce((total, call) => total + call.mock.callCount(), 0),
    0,
    "A rota não escreve no console.",
  );
});

test("a resposta acompanha o servidor a cada chamada", async (context) => {
  useEnvironment(context, {});
  const read = async () => (await route.GET().json()).providers;
  assert.deepEqual(await read(), {
    openai: { configured: false, model: null },
    gemini: { configured: false, model: null },
  });
  process.env.GEMINI_API_KEY = GEMINI_KEY;
  process.env.GEMINI_MODEL = "modelo-gemini";
  assert.deepEqual(await read(), {
    openai: { configured: false, model: null },
    gemini: { configured: true, model: "modelo-gemini" },
  });
});

test("a rota é dinâmica, roda em Node e só expõe leitura", () => {
  assert.equal(route.dynamic, "force-dynamic");
  assert.equal(route.runtime, "nodejs");
  assert.deepEqual(
    Object.keys(route).filter((name) =>
      ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(name),
    ),
    ["GET"],
  );
});
