import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildImportPrompt,
  interpretText,
  type ImportProfile,
} from "../../src/server/import/index.ts";

const profiles: ImportProfile[] = ["docx-topicos-v1", "docx-semanal-v1"];
const fixture = (name: string) =>
  readFile(new URL(`../fixtures/import/${name}`, import.meta.url), "utf8");

test("a IA identifica a organização pelo documento, nos dois perfis", () => {
  for (const profile of profiles) {
    const prompt = buildImportPrompt(profile);
    assert.match(
      prompt,
      /identifique pelo documento se o curso é por tópicos \(topics\) ou por semanas \(weeks\)/,
      profile,
    );
    assert.match(prompt, /preencha metadata\.organization/, profile);
    assert.match(prompt, /sem indicação clara, use topics/, profile);
    assert.doesNotMatch(prompt, /Organização: (topics|weeks)\b/, profile);
  }
});

test("o perfil não define a organização: os prompts diferem só pelo nome do perfil", () => {
  const topics = buildImportPrompt("docx-topicos-v1");
  const weeks = buildImportPrompt("docx-semanal-v1");
  assert.ok(topics.includes("docx-topicos-v1"));
  assert.ok(weeks.includes("docx-semanal-v1"));
  assert.equal(weeks, topics.replace("docx-topicos-v1", "docx-semanal-v1"));
});

test("o provedor recebe exatamente o prompt de buildImportPrompt, nos dois providers e perfis", async () => {
  const sample = await fixture("topics.txt");
  for (const provider of ["openai", "gemini"] as const) {
    for (const profile of profiles) {
      let sent = "";
      await interpretText(
        {
          text: sample,
          profile,
          provider,
          apiKey: "CHAVE-FICTICIA",
          model: "modelo-teste",
        },
        {
          fetch: async (_url, options) => {
            const body = JSON.parse(String(options?.body));
            sent =
              provider === "openai"
                ? body.input[0].content
                : body.systemInstruction.parts[0].text;
            return new Response("", { status: 400 });
          },
        },
      );
      assert.equal(sent, buildImportPrompt(profile), `${provider} ${profile}`);
    }
  }
});

test("a organização devolvida pela IA não é trocada pelo perfil informado", async () => {
  const sample = await fixture("topics.txt");
  const offline = await interpretText({
    text: sample,
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(offline.ok, true, JSON.stringify(offline));
  if (!offline.ok) return;
  const draft = {
    ...offline.draft,
    metadata: { ...offline.draft.metadata, organization: "weeks" },
  };
  const envelope = JSON.stringify({
    draft,
    fields: offline.provenance.fields,
  });
  const result = await interpretText(
    {
      text: sample,
      profile: "docx-topicos-v1",
      provider: "gemini",
      apiKey: "CHAVE-FICTICIA",
      model: "modelo-teste",
    },
    {
      fetch: async () =>
        Response.json({
          candidates: [
            { finishReason: "STOP", content: { parts: [{ text: envelope }] } },
          ],
        }),
    },
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  if (result.ok) assert.equal(result.draft.metadata.organization, "weeks");
});
