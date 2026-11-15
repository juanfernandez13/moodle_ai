import { test } from "node:test";
import assert from "node:assert/strict";
import { issueLines } from "../../src/client/features/course/helpers.ts";
import { splitFileName } from "../../src/client/features/course/entry/file-name.ts";

test("a mensagem de erro mostra o lugar só quando ele diz algo", () => {
  assert.equal(
    issueLines([
      { path: "$", message: "O limite de uso da IA foi atingido." },
      { path: "", message: "Sem lugar." },
      { path: "sections[0].title", message: "Informe o título." },
    ]),
    [
      "O limite de uso da IA foi atingido.",
      "Sem lugar.",
      "sections[0].title: Informe o título.",
    ].join("\n"),
  );
  assert.equal(issueLines([]), "");
});

test("a extensão do arquivo fica colada à palavra de antes e nunca vira uma linha sozinha", () => {
  const long = splitFileName(
    "Tarefa 2 - Mapa conceitual da celula animal e vegetal.pdf",
  );
  assert.equal(long.extension, ".pdf");
  assert.equal(long.parts.join(""), "Tarefa 2 - Mapa conceitual da celula animal e vegetal");
  // Cada pedaço é uma palavra com os separadores que vêm depois dela: a linha só quebra entre pedaços.
  assert.deepEqual(long.parts.slice(0, 4), [
    "Tarefa ",
    "2 - ",
    "Mapa ",
    "conceitual ",
  ]);

  const underscores = splitFileName("Quiz_03_revisao.docx");
  assert.equal(underscores.extension, ".docx");
  assert.deepEqual(underscores.parts, ["Quiz_", "03_", "revisao"]);
});

test("nome sem extensão ou com ponto no meio de uma frase não perde nenhum pedaço", () => {
  assert.deepEqual(splitFileName("Anotacoes"), {
    parts: ["Anotacoes"],
    extension: "",
  });
  const dotted = splitFileName("Aula 1.2 resumo da unidade");
  assert.equal(dotted.extension, "");
  assert.equal(dotted.parts.join(""), "Aula 1.2 resumo da unidade");
  const hidden = splitFileName(".gitignore");
  assert.equal(hidden.extension, "");
  assert.equal(hidden.parts.join(""), ".gitignore");
});
