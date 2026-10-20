import assert from "node:assert/strict";
import test from "node:test";
import {
  UPLOAD_LIMITS,
  UPLOAD_MESSAGES,
  checkUploadLimits,
  formatMegabytes,
} from "../../src/shared/upload-limits.ts";

const MiB = 1024 * 1024;
const sizes = (...values: number[]) => values.map((size) => ({ size }));

test("a importação aceita até 30 arquivos, 25 MB cada e 80 MB no total", () => {
  assert.deepEqual(
    { ...UPLOAD_LIMITS },
    { maxFiles: 30, maxFileBytes: 25 * MiB, maxTotalBytes: 80 * MiB },
  );
  assert.equal(Object.isFrozen(UPLOAD_LIMITS), true);
});

test("as mensagens usam MB e os números dos limites", () => {
  assert.deepEqual(
    { ...UPLOAD_MESSAGES },
    {
      fileCount: "Selecione entre 1 e 30 arquivos .docx, .pdf ou .txt.",
      fileSize: "Cada documento pode ter até 25 MB.",
      totalSize: "Os documentos juntos podem ter até 80 MB.",
    },
  );
  assert.equal(formatMegabytes(25 * MiB), "25 MB");
  assert.equal(formatMegabytes(1.5 * MiB), "1,5 MB");
});

test("a seleção no limite passa e um passo além é recusado com a mensagem certa", () => {
  const limit = UPLOAD_LIMITS;
  assert.equal(checkUploadLimits(sizes(limit.maxFileBytes)), null);
  assert.equal(
    checkUploadLimits(sizes(...Array<number>(limit.maxFiles).fill(MiB))),
    null,
  );
  assert.equal(
    checkUploadLimits(sizes(...Array<number>(4).fill(20 * MiB))),
    null,
    "quatro arquivos de 20 MB somam exatamente 80 MB",
  );
  assert.equal(
    checkUploadLimits(sizes(...Array<number>(limit.maxFiles + 1).fill(MiB))),
    UPLOAD_MESSAGES.fileCount,
  );
  assert.equal(checkUploadLimits([]), UPLOAD_MESSAGES.fileCount);
  assert.equal(
    checkUploadLimits(sizes(limit.maxFileBytes + 1)),
    UPLOAD_MESSAGES.fileSize,
  );
  assert.equal(
    checkUploadLimits(sizes(25 * MiB, 25 * MiB, 25 * MiB, 5 * MiB + 1)),
    UPLOAD_MESSAGES.totalSize,
  );
});

test("quando mais de um limite é quebrado, a quantidade vem antes do tamanho", () => {
  assert.equal(
    checkUploadLimits(
      sizes(...Array<number>(UPLOAD_LIMITS.maxFiles).fill(0), 26 * MiB),
    ),
    UPLOAD_MESSAGES.fileCount,
  );
  assert.equal(
    checkUploadLimits(sizes(26 * MiB, 25 * MiB, 25 * MiB, 25 * MiB)),
    UPLOAD_MESSAGES.fileSize,
  );
});
