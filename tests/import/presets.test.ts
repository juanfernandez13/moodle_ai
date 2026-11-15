// As IAs que a tela oferece: a tabela de predefinições precisa estar inteira e coerente (é o que decide o que é chamado).
import assert from "node:assert/strict";
import test from "node:test";
import { AI_PRESETS, AI_PROVIDER_IDS } from "../../src/shared/ai-providers.ts";

test("cada IA tem o que a chamada e a tela precisam, e o Gemini 3.5 Flash é o padrão do Gemini", () => {
  const variables = new Set<string>();
  for (const id of AI_PROVIDER_IDS) {
    const preset = AI_PRESETS[id];
    assert.equal(preset.id, id);
    assert.ok(preset.label.length > 0, id);
    // Só a Outra IA não tem endereço próprio; os outros são https e sem barra no fim (o cliente acrescenta o caminho).
    if (id === "custom") assert.equal(preset.baseUrl, null);
    else {
      assert.match(preset.baseUrl!, /^https:\/\/[^/]+(\/[^?#]*[^/])?$/, id);
      assert.ok(preset.defaultModel, `${id} precisa de modelo padrão`);
      assert.ok(preset.suggestions.includes(preset.defaultModel!), `${id}: o padrão está nas sugestões`);
      assert.match(preset.keyUrl!, /^https:\/\//, id);
    }
    assert.equal(new Set(preset.suggestions).size, preset.suggestions.length, `${id}: sugestões repetidas`);
    for (const suggestion of preset.suggestions)
      assert.match(suggestion, /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,199}$/, suggestion);
    for (const name of [preset.keyVariable, preset.modelVariable, ...(preset.baseUrlVariable ? [preset.baseUrlVariable] : [])]) {
      assert.match(name, /^[A-Z][A-Z0-9_]+$/);
      assert.equal(variables.has(name), false, `${name} repetida`);
      variables.add(name);
    }
  }
  assert.equal(AI_PRESETS.gemini.defaultModel, "gemini-3.5-flash");
  // A Outra IA é a única com endereço vindo do servidor.
  assert.equal(AI_PRESETS.custom.baseUrlVariable, "CUSTOM_AI_BASE_URL");
});
