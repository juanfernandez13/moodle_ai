import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { readArchive, hash256 } from "../../src/shared/archive.ts";

const limits = { maxEntries: 10, maxEntryBytes: 100, maxTotalBytes: 1000 };
async function zip(files: Record<string, string>): Promise<Uint8Array> {
  const archive = new JSZip();
  for (const [name, value] of Object.entries(files)) archive.file(name, value);
  return archive.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
test("leitura conserva bytes e SHA256 conhecido", async () => {
  const contents = await readArchive(
    await zip({ "manifest.json": "abc", "assets/a.txt": "arquivo" }),
    limits,
  );
  assert.equal(new TextDecoder().decode(contents.get("manifest.json")), "abc");
  assert.equal(
    await hash256(contents.get("manifest.json")!),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});
test("não normaliza caminho que tenta sair do pacote", async () => {
  await assert.rejects(
    readArchive(await zip({ "../private.txt": "abc" }), limits),
    { code: "unsafe_archive_path" },
  );
});
test("arquivo e expansão total têm limites antes de retornar bytes", async () => {
  await assert.rejects(
    readArchive(await zip({ "a.txt": "a".repeat(101) }), limits),
    { code: "archive_entry_limit" },
  );
  const bytes = await zip({ a: "a".repeat(600), b: "b".repeat(600) });
  await assert.rejects(readArchive(bytes, { ...limits, maxEntryBytes: 700 }), {
    code: "archive_total_limit",
  });
});
test("arquivo corrompido não entrega resultado parcial", async () => {
  await assert.rejects(readArchive(new Uint8Array([1, 2, 3]), limits), {
    code: "invalid_archive",
  });
});
test("quantidade de entradas é limitada", async () => {
  await assert.rejects(
    readArchive(await zip({ a: "1", b: "2" }), { ...limits, maxEntries: 1 }),
    { code: "archive_entry_count" },
  );
});
test("nomes duplicados no diretório central são rejeitados", async () => {
  const bytes = await zip({ a: "1", b: "2" });
  for (let i = 0; i + 46 < bytes.length; i++) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 1 &&
      bytes[i + 3] === 2 &&
      bytes[i + 46] === 0x62
    )
      bytes[i + 46] = 0x61;
  }
  await assert.rejects(readArchive(bytes, limits), {
    code: "duplicate_archive_path",
  });
});
test("CRC corrompido impede entrega mesmo quando tamanho e caminho são válidos", async () => {
  const archive = new JSZip();
  archive.file("a.txt", "abc");
  const bytes = await archive.generateAsync({
    type: "uint8array",
    compression: "STORE",
  });
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const payload = 30 + view.getUint16(26, true) + view.getUint16(28, true);
  bytes[payload] = 0x78;
  await assert.rejects(readArchive(bytes, limits), { code: "invalid_archive" });
});
