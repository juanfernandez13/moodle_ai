// node build.mjs [boardName...]  → writes out/project/<file>.dc.html, preview/<file>.html and prints the checker report.
import { writeFileSync, readdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setIconDir, setHeights, dcFile, previewFile } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
setIconDir(join(here, "icons"));
const blobs = existsSync(join(here, "blobs.json")) ? JSON.parse(readFileSync(join(here, "blobs.json"), "utf8")) : {};

const face = (fam, url, w, style) => `@font-face{font-family:"${fam}";src:url("${url}") format("woff2");font-weight:${w};font-style:${style};font-display:swap}`;
const previewFonts = [face("Switzer", "/dl-fonts/Switzer-Variable.woff2", "100 900", "normal"), face("Switzer", "/dl-fonts/Switzer-VariableItalic.woff2", "100 900", "italic")].join("\n");
const dcFonts = blobs.switzer ? [face("Switzer", blobs.switzer, "100 900", "normal"), face("Switzer", blobs.switzerItalic, "100 900", "italic")].join("\n") : previewFonts;

const only = process.argv.slice(2);
const files = readdirSync(join(here, "boards")).filter((f) => f.endsWith(".mjs") && (!only.length || only.includes(f.replace(".mjs", ""))));
let bad = 0;
for (const f of files) {
  const mod = await import(pathToFileURL(join(here, "boards", f)).href + `?t=${process.hrtime.bigint()}`);
  const hf = join(here, "heights", f.replace(".mjs", ".json"));
  setHeights(existsSync(hf) ? JSON.parse(readFileSync(hf, "utf8")) : {});
  const prev = mod.build({ owlUrl: "/ds/project/assets/Logos/brand-owl.svg" });
  writeFileSync(join(here, "preview", mod.meta.file.replace(".dc.html", ".html")), previewFile(prev, { fontFaces: previewFonts }));
  const board = mod.build({ owlUrl: blobs.owl ?? "/ds/project/assets/Logos/brand-owl.svg" });
  writeFileSync(join(here, "out", "project", mod.meta.file), dcFile(board, { fontFaces: dcFonts }));
  const issues = board.check();
  bad += issues.length;
  console.log(`\n${f}: ${board.width}x${board.height}, ${board.nodes.size} cards, ${board.edges.length} arrows, ${issues.length} issues`);
  for (const i of issues) console.log("  - " + i);
}
process.exitCode = bad ? 1 : 0;
