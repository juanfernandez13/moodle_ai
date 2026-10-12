import { readFile, writeFile } from "node:fs/promises";
import { createCanvas } from "@napi-rs/canvas";
import JSZip from "jszip";

const canvas = createCanvas(96, 96),
  context = canvas.getContext("2d");
context.fillStyle = "#f0fdfa";
context.fillRect(0, 0, 96, 96);
context.fillStyle = "#0f766e";
context.fillRect(12, 12, 72, 72);
context.fillStyle = "#ffffff";
context.fillRect(24, 24, 48, 48);
const image = canvas.toBuffer("image/png");
await writeFile(new URL("figure.png", import.meta.url), image);
for (const [source, target, images] of [
  ["topics-images.xml", "topicos-com-imagens.docx", true],
  ["weeks-table.xml", "semanas-em-tabela.docx", false],
]) {
  let document = await readFile(new URL(source, import.meta.url), "utf8");
  document = document.replace(
    /<a:graphic><a:blip r:embed="rId1"\/><\/a:graphic>/g,
    '<wp:extent cx="914400" cy="914400"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="figure.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>',
  );
  await writeFile(new URL(source, import.meta.url), document);
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip.file(
    "_rels/.rels",
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdDocument" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file("word/document.xml", document);
  zip.file(
    "word/_rels/document.xml.rels",
    images
      ? '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/figure.png"/></Relationships>'
      : '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>',
  );
  if (images) zip.file("word/media/figure.png", image);
  await writeFile(
    new URL(target, import.meta.url),
    await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
  );
}
