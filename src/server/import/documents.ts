import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { ContentBlock, InlineBlock } from "../../domain/course/index.ts";
import { readArchive, hash256 } from "../../shared/archive.ts";
import {
  IMPORT_LIMITS,
  ImportError,
  abortIfNeeded,
  blockText,
  issue,
  type DocumentInput,
  type ExtractedDocument,
  type ImportIssue,
} from "./types.ts";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};
type XmlNode = Record<string, unknown>;
const record = (value: unknown): XmlNode =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as XmlNode)
    : {};
const nodes = (value: unknown): XmlNode[] =>
  Array.isArray(value) ? value.map(record) : [];
const tag = (node: XmlNode): string =>
  Object.keys(node).find((key) => key !== ":@") ?? "";
const local = (name: string): string => name.split(":").at(-1) ?? name;
const attrs = (node: XmlNode): XmlNode => record(node[":@"]);
const children = (node: XmlNode): XmlNode[] => nodes(node[tag(node)]);
function descendants(node: XmlNode, name: string): XmlNode[] {
  return [
    ...(local(tag(node)) === name ? [node] : []),
    ...children(node).flatMap((child) => descendants(child, name)),
  ];
}
const attribute = (node: XmlNode, name: string): string =>
  String(
    Object.entries(attrs(node)).find(
      ([key]) => local(key.replace(/^@_/, "")) === name,
    )?.[1] ?? "",
  );
function xml(bytes: Uint8Array): XmlNode[] {
  const value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (
    /<!DOCTYPE|<!ENTITY/i.test(value) ||
    XMLValidator.validate(value) !== true
  )
    throw new ImportError(
      "invalid_document",
      "O XML do DOCX está inválido ou contém definições não permitidas.",
    );
  return nodes(
    new XMLParser({
      preserveOrder: true,
      ignoreAttributes: false,
      trimValues: false,
      parseTagValue: false,
      parseAttributeValue: false,
    }).parse(value),
  );
}
function leafText(node: XmlNode): string {
  if (tag(node) === "#text") return String(node["#text"] ?? "");
  return children(node).map(leafText).join("");
}

async function extractDocx(
  input: DocumentInput,
  signal?: AbortSignal,
): Promise<ExtractedDocument> {
  const entries = await readArchive(input.bytes, {
    maxEntries: IMPORT_LIMITS.maxArchiveEntries,
    maxEntryBytes: IMPORT_LIMITS.maxArchiveEntryBytes,
    maxTotalBytes: IMPORT_LIMITS.maxArchiveTotalBytes,
  });
  abortIfNeeded(signal);
  const document = entries.get("word/document.xml");
  if (!document)
    throw new ImportError(
      "invalid_document",
      "O DOCX não contém word/document.xml.",
    );
  const issues: ImportIssue[] = [],
    assets: DocumentInput[] = [];
  const relationships = new Map<string, string>();
  const relationBytes = entries.get("word/_rels/document.xml.rels");
  if (relationBytes)
    for (const root of xml(relationBytes))
      for (const relation of descendants(root, "Relationship")) {
        if (!attribute(relation, "Type").endsWith("/image")) continue;
        const target = attribute(relation, "Target");
        if (
          attribute(relation, "TargetMode") === "External" ||
          /^[a-z]+:|^[/\\]|(?:^|\/)\.\.(?:\/|$)/i.test(target)
        ) {
          issues.push(
            issue(
              "external_image",
              "Uma imagem usa um vínculo externo. Forneça os bytes da figura para preservar o conteúdo.",
              `sources.${input.id}`,
            ),
          );
          continue;
        }
        relationships.set(
          attribute(relation, "Id"),
          `word/${target.replace(/^\.\//, "")}`,
        );
      }
  const mediaByRelation = new Map<string, string>(),
    dedup = new Map<string, string>();
  for (const [relationId, path] of relationships) {
    const bytes = entries.get(path);
    if (!bytes) {
      issues.push(
        issue(
          "missing_image",
          "Uma imagem incorporada não foi encontrada no DOCX.",
          `sources.${input.id}`,
        ),
      );
      continue;
    }
    const name = path.split("/").at(-1) ?? "imagem";
    const mediaType = MIME[name.split(".").at(-1)?.toLowerCase() ?? ""];
    if (!mediaType) {
      issues.push(
        issue(
          "unsupported_image",
          "Uma imagem usa formato não suportado. Converta a figura para PNG, JPEG, GIF ou WebP e reimporte.",
          `sources.${input.id}`,
        ),
      );
      continue;
    }
    const hash = await hash256(bytes);
    let id = dedup.get(hash);
    if (!id) {
      id = `media-${input.id}-${hash.slice(0, 12)}`;
      dedup.set(hash, id);
      assets.push({ id, name, mediaType, bytes });
    }
    mediaByRelation.set(relationId, id);
  }
  let sequence = 0;
  const nextId = () => `block-${input.id}-${++sequence}`;
  function paragraph(node: XmlNode): InlineBlock[] {
    const output: InlineBlock[] = [];
    let text = "";
    const flush = () => {
      if (text !== "") {
        output.push({ id: nextId(), kind: "text", text });
        text = "";
      }
    };
    function walk(current: XmlNode): void {
      const name = local(tag(current));
      if (name === "t") {
        text += leafText(current);
        return;
      }
      if (name === "tab") {
        text += "\t";
        return;
      }
      if (name === "br" || name === "cr") {
        text += "\n";
        return;
      }
      if (name === "oMath" || name === "oMathPara") {
        text += descendants(current, "t").map(leafText).join("");
        issues.push(
          issue(
            "equation_review",
            "Uma fórmula foi extraída como texto; confira sua apresentação na fonte antes de exportar.",
            `sources.${input.id}`,
            "warning",
          ),
        );
        return;
      }
      if (name === "drawing" || name === "pict") {
        flush();
        const property = descendants(current, "docPr")[0];
        const alt = property
          ? attribute(property, "descr") || attribute(property, "title")
          : "";
        const images = [
          ...descendants(current, "blip"),
          ...descendants(current, "imagedata"),
        ];
        for (const image of images) {
          const relationId =
            attribute(image, "embed") || attribute(image, "id");
          const attachmentId = mediaByRelation.get(relationId);
          if (attachmentId)
            output.push({ id: nextId(), kind: "image", attachmentId, alt });
          else if (!issues.some((problem) => problem.code === "external_image"))
            issues.push(
              issue(
                "missing_image",
                "Uma ocorrência de imagem não pôde ser resolvida.",
                `sources.${input.id}`,
              ),
            );
        }
        if (
          descendants(current, "srcRect").some((crop) =>
            Object.values(attrs(crop)).some((value) => Number(value) !== 0),
          ) ||
          descendants(current, "xfrm").some(
            (transform) =>
              attribute(transform, "rot") !== "" &&
              attribute(transform, "rot") !== "0",
          )
        ) {
          issues.push(
            issue(
              "image_presentation",
              "Uma figura tem recorte ou rotação. Confira e ajuste a apresentação; a importação preserva o arquivo original.",
              `sources.${input.id}`,
            ),
          );
        }
        return;
      }
      for (const child of children(current)) walk(child);
    }
    walk(node);
    flush();
    return output;
  }
  function bodyBlocks(body: XmlNode): ContentBlock[] {
    const output: ContentBlock[] = [];
    for (const child of children(body)) {
      const name = local(tag(child));
      if (name === "p") output.push(...paragraph(child));
      else if (name === "tbl") {
        const rows = children(child)
          .filter((row) => local(tag(row)) === "tr")
          .map((row) =>
            children(row)
              .filter((cell) => local(tag(cell)) === "tc")
              .map((cell) => ({
                blocks: children(cell)
                  .filter((entry) => local(tag(entry)) === "p")
                  .flatMap(paragraph),
              })),
          );
        output.push({ id: nextId(), kind: "table", rows });
        if (descendants(child, "tbl").length > 1)
          issues.push(
            issue(
              "nested_table",
              "Uma tabela contém outra tabela. A estrutura requer revisão manual.",
              `sources.${input.id}`,
            ),
          );
      } else output.push(...bodyBlocks(child));
    }
    return output;
  }
  const bodies = xml(document).flatMap((root) => descendants(root, "body"));
  if (bodies.length !== 1)
    throw new ImportError(
      "invalid_document",
      "Não foi possível identificar o corpo principal do DOCX.",
    );
  const blocks = bodyBlocks(bodies[0]!);
  return { ...input, blocks, assets, issues };
}

async function extractPdf(
  input: DocumentInput,
  signal?: AbortSignal,
): Promise<ExtractedDocument> {
  const header = new TextDecoder().decode(input.bytes.subarray(0, 8));
  if (!header.startsWith("%PDF-"))
    throw new ImportError(
      "invalid_document",
      "O arquivo não contém um PDF válido.",
    );
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
    data: new Uint8Array(input.bytes),
    useSystemFonts: false,
    verbosity: 0,
  });
  const cancel = () => {
    void task.destroy();
  };
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > IMPORT_LIMITS.maxPdfPages)
      throw new ImportError(
        "pdf_page_limit",
        `O PDF excede ${IMPORT_LIMITS.maxPdfPages} páginas.`,
      );
    const blocks: ContentBlock[] = [],
      issues: ImportIssue[] = [];
    let sequence = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      abortIfNeeded(signal);
      const page = await pdf.getPage(pageNumber),
        content = await page.getTextContent();
      let line = "";
      for (const item of content.items)
        if ("str" in item) {
          line += `${line ? " " : ""}${item.str}`;
          if (item.hasEOL) {
            if (line.trim())
              blocks.push({
                id: `block-${input.id}-p${pageNumber}-${++sequence}`,
                kind: "text",
                text: line,
              });
            line = "";
          }
        }
      if (line.trim())
        blocks.push({
          id: `block-${input.id}-p${pageNumber}-${++sequence}`,
          kind: "text",
          text: line,
        });
      const operators = await page.getOperatorList();
      if (
        operators.fnArray.some((operation) =>
          [
            pdfjs.OPS.paintImageXObject,
            pdfjs.OPS.paintInlineImageXObject,
            pdfjs.OPS.paintImageMaskXObject,
          ].includes(operation),
        )
      ) {
        issues.push(
          issue(
            "pdf_image_review",
            "Este PDF contém figuras. A extração de imagens deste formato exige revisão; importe um DOCX com as figuras incorporadas para conservar os bytes e as ocorrências.",
            `sources.${input.id}.pages[${pageNumber - 1}]`,
          ),
        );
      }
      page.cleanup();
    }
    if (blocks.length === 0)
      throw new ImportError(
        "scanned_pdf",
        "O PDF não contém texto selecionável. Envie DOCX/TXT ou faça OCR e confira o resultado antes de importar.",
      );
    issues.push(
      issue(
        "pdf_reading_order",
        "Confira a ordem de leitura do PDF, especialmente colunas e tabelas.",
        `sources.${input.id}`,
        "warning",
      ),
    );
    return { ...input, blocks, assets: [], issues };
  } finally {
    signal?.removeEventListener("abort", cancel);
    await task.destroy();
  }
}

export async function extractDocument(
  input: DocumentInput,
  signal?: AbortSignal,
): Promise<ExtractedDocument> {
  abortIfNeeded(signal);
  if (input.bytes.length === 0)
    throw new ImportError("empty_document", "O documento está vazio.");
  if (input.bytes.length > IMPORT_LIMITS.maxFileBytes)
    throw new ImportError(
      "file_size_limit",
      "Cada documento pode ter até 10 MiB.",
    );
  const extension = input.name.split(".").at(-1)?.toLowerCase();
  let result: ExtractedDocument;
  if (extension === "docx") result = await extractDocx(input, signal);
  else if (extension === "pdf") result = await extractPdf(input, signal);
  else if (extension === "txt") {
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(input.bytes);
    } catch {
      throw new ImportError(
        "invalid_text_encoding",
        "O arquivo TXT deve usar UTF-8.",
      );
    }
    result = {
      ...input,
      assets: [],
      issues: [],
      blocks: text
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .filter((line) => line.trim() !== "")
        .map((line, index) => ({
          id: `block-${input.id}-${index + 1}`,
          kind: "text" as const,
          text: line,
        })),
    };
  } else
    throw new ImportError(
      "unsupported_document",
      "Importe arquivos DOCX, PDF ou TXT.",
    );
  if (!result.blocks.length)
    throw new ImportError(
      "empty_document",
      "Não foi possível extrair conteúdo deste documento.",
    );
  if (
    result.blocks.length > IMPORT_LIMITS.maxSourceBlocks ||
    result.blocks.reduce((total, block) => total + blockText(block).length, 0) >
      IMPORT_LIMITS.maxTextCharacters ||
    result.assets.length > IMPORT_LIMITS.maxAssets
  ) {
    throw new ImportError(
      "document_content_limit",
      "O documento excede os limites de texto, blocos ou imagens. Divida-o em documentos menores.",
    );
  }
  abortIfNeeded(signal);
  return result;
}
