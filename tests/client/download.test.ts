import assert from "node:assert/strict";
import test from "node:test";
import { formatBytes, fromBase64 } from "../../src/client/download.ts";
import { UPLOAD_LIMITS } from "../../src/shared/upload-limits.ts";

const MiB = 1024 * 1024;
const pattern = (size: number): Uint8Array => {
  const bytes = new Uint8Array(size);
  for (let index = 0; index < size; index++)
    bytes[index] = (index * 31 + (index >> 8)) & 255;
  return bytes;
};
const encode = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("base64");
const invalid = { message: "Arquivo inválido recebido na importação." };

test("formatBytes mostra B, KB e MB como a professora lê, sem MiB nem KiB", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(999), "999 B");
  assert.equal(formatBytes(1023), "1023 B");
  assert.equal(formatBytes(1024), "1 KB");
  assert.equal(formatBytes(2458), "2 KB");
  // Perto de 1 MB não aparece "1024 KB".
  assert.equal(formatBytes(MiB - 1), "1 MB");
  assert.equal(formatBytes(MiB), "1 MB");
  assert.equal(formatBytes(1.5 * MiB), "1,5 MB");
  // A partir de 10 MB, número inteiro.
  assert.equal(formatBytes(12.4 * MiB), "12 MB");
  assert.equal(formatBytes(UPLOAD_LIMITS.maxFileBytes), "25 MB");
  for (const size of [0, 1000, 5000, 3 * MiB, 80 * MiB])
    assert.doesNotMatch(formatBytes(size), /iB/);
});

test("fromBase64 devolve os mesmos bytes em todos os restos de padding", () => {
  for (const size of [0, 1, 2, 3, 4, 5, 255, 256, 257, 1000]) {
    const bytes = pattern(size);
    assert.deepEqual(fromBase64(encode(bytes)), bytes, `${size} bytes`);
  }
});

test("fromBase64 lê arquivos maiores que 4 MB, até o maior documento do envio", () => {
  // Uma única expressão regular sobre o texto todo estourava a pilha a
  // partir de uns 4 MB de arquivo.
  for (const size of [4 * MiB, 7 * MiB + 1, UPLOAD_LIMITS.maxFileBytes]) {
    const bytes = pattern(size);
    const decoded = fromBase64(encode(bytes));
    assert.equal(decoded.length, bytes.length);
    assert.ok(Buffer.from(decoded).equals(bytes), `${size} bytes`);
  }
});

test("fromBase64 recusa texto que não é base64 canônico", () => {
  for (const value of [
    "AAA",
    "AAAAA",
    "AA=A",
    "A===",
    "====",
    "AAAA====",
    "AA==AAAA",
    "AAA=AAAA",
    "AAA!",
    "AA AA",
    "AA A",
    "AAAA\n",
    "AAAA-_AA",
  ])
    assert.throws(() => fromBase64(value), invalid, JSON.stringify(value));
});

test("fromBase64 recusa símbolo ou padding fora do lugar numa fatia do meio ou do fim", () => {
  const slice = 1 << 20;
  const body = "A".repeat(2 * slice);
  assert.equal(fromBase64(`${body}AAAA`).length, (2 * slice * 3) / 4 + 3);
  const symbol = `${body.slice(0, slice + 4)}!${body.slice(slice + 5)}AAAA`;
  assert.throws(() => fromBase64(symbol), invalid);
  assert.throws(
    () => fromBase64(`${body.slice(0, slice - 4)}AA==${body.slice(slice)}AAAA`),
    invalid,
  );
  assert.throws(() => fromBase64(`${body}AAA!`), invalid);
  assert.throws(() => fromBase64(`${body}A==A`), invalid);
});

test("fromBase64 recusa texto maior que o maior documento do envio", () => {
  const largest = Math.ceil(UPLOAD_LIMITS.maxFileBytes / 3) * 4;
  assert.equal(fromBase64("A".repeat(largest)).length, (largest / 4) * 3);
  assert.throws(() => fromBase64("A".repeat(largest + 4)), invalid);
});
