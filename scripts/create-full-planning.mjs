// Reproducible synthetic planning fixture; no student, institutional or AI data.
import JSZip from "jszip";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const directory = resolve(process.argv[2] ?? "docs/examples");
await mkdir(directory, { recursive: true });
const lines = `Disciplina: Curso completo fictício
Código: DEMO-COMPLETO
Início do curso: 2026-10-12T00:00:00Z
Carga horária: 40
Professor: Professor de demonstração
Semestre: 2026.2
Turma: Turma fictícia
Resumo: Planejamento de demonstração com seis módulos e três tipos de questão.
Tópico 1: Preparação e revisão
Fórum: Apresentações
Discussão: geral
Descrição: Apresente seus objetivos de estudo.
Fórum: Discussão orientada
Discussão: única
Descrição: Compare duas estratégias de revisão.
Tarefa: Plano de estudo
Nota: 10
Envio: arquivo
Descrição: Entregue um plano de estudo fictício.
Abre: 2026-10-12T08:00:00-03:00
Fecha: 2026-10-18T23:59:00-03:00
Tarefa: Reflexão
Nota: 100
Envio: ambos
Descrição: Registre uma reflexão sobre seu processo.
Quiz: Verificação inicial
Nota: 10
Tentativas: 2
Embaralhar: não
Questão MC: Qual prática ajuda a revisar?
Pontuação: 1
Feedback: A revisão ativa favorece a prática.
Alternativa correta: Recuperar o conteúdo de memória
Feedback: Você identificou uma prática ativa.
Alternativa: Apenas reler sem pausa
Quiz: Verificação final
Nota: 100
Tentativas: 1
Embaralhar: sim
Questão associativa: Associe as práticas aos objetivos.
Pontuação: 2
Par: Revisar => Consolidar
Par: Planejar => Organizar
Questão discursiva: Descreva sua estratégia de estudo.
Pontuação: 3
Formato da resposta: editor
Resposta obrigatória: sim
Linhas: 15
Anexos permitidos: 1
Chat: Conversa de revisão
Repetição: semanal
Reter dias: 30
Sessão: 2026-10-19T12:00:00Z
Descrição: Converse sobre o planejamento fictício.
Wiki: Estratégias da turma
Modo: colaborativo
Página inicial: Estratégias
Descrição: Construa uma lista de estratégias.
Glossário: Termos do curso
Duplicatas: não
Aprovação: sim
Entradas por página: 20
Conceito: Revisão
Definição: Retomar um conteúdo com intenção de consolidar a aprendizagem.`.split(
  "\n",
);
const escape = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const document =
  '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
  lines
    .map(
      (line) =>
        `<w:p><w:r><w:t xml:space="preserve">${escape(line)}</w:t></w:r></w:p>`,
    )
    .join("") +
  "</w:body></w:document>";
const zip = new JSZip();
zip.file(
  "[Content_Types].xml",
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
);
zip.file(
  "_rels/.rels",
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdDocument" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
);
zip.file("word/document.xml", document);
zip.file(
  "word/_rels/document.xml.rels",
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>',
);
await writeFile(
  resolve(directory, "planejamento-completo.txt"),
  lines.join("\n") + "\n",
);
await writeFile(
  resolve(directory, "planejamento-completo.docx"),
  await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
);
console.log(
  "Fixture fictícia com nove atividades em uma unidade: " + directory,
);
