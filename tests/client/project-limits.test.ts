import assert from "node:assert/strict";
import test from "node:test";
import { createPortable, readPortable } from "../../src/client/portable.ts";
import {
  PROJECT_FILE_LIMITS,
  createProject,
  validateProject,
  type ProjectFile,
} from "../../src/client/project.ts";
import {
  UPLOAD_LIMITS,
  UPLOAD_MESSAGES,
} from "../../src/shared/upload-limits.ts";

const MiB = 1024 * 1024;
// Files of the same size can share their bytes: the checks only count them.
const zeros = (size: number) => new Uint8Array(size);
const file = (
  id: string,
  bytes: Uint8Array,
  name = `${id}.bin`,
): ProjectFile => ({ id, name, mediaType: "application/octet-stream", bytes });
function projectWith(assets: ProjectFile[], sources: ProjectFile[]) {
  const project = createProject();
  project.assets = assets;
  project.sources = sources;
  return project;
}

test("o projeto guarda documentos de origem até o limite do envio e anexos até o limite da exportação", () => {
  assert.equal(PROJECT_FILE_LIMITS.sourceBytes, UPLOAD_LIMITS.maxFileBytes);
  assert.equal(
    PROJECT_FILE_LIMITS.sourcesTotalBytes,
    UPLOAD_LIMITS.maxTotalBytes,
  );
  assert.equal(PROJECT_FILE_LIMITS.attachmentBytes, 16 * MiB);
  assert.equal(PROJECT_FILE_LIMITS.attachmentsTotalBytes, 64 * MiB);
});

test("um documento de origem de 25 MB é aceito e um byte a mais não", () => {
  validateProject(
    projectWith([], [file("source-1", zeros(UPLOAD_LIMITS.maxFileBytes))]),
  );
  assert.throws(
    () =>
      validateProject(
        projectWith(
          [],
          [file("source-1", zeros(UPLOAD_LIMITS.maxFileBytes + 1))],
        ),
      ),
    { message: UPLOAD_MESSAGES.fileSize },
  );
});

test("documentos de origem somam até 80 MB", () => {
  const twenty = zeros(20 * MiB);
  const sources = [1, 2, 3, 4].map((n) => file(`source-${n}`, twenty));
  validateProject(projectWith([], sources));
  assert.throws(
    () =>
      validateProject(
        projectWith(
          [],
          [...sources.slice(0, 3), file("source-4", zeros(20 * MiB + 1))],
        ),
      ),
    { message: UPLOAD_MESSAGES.totalSize },
  );
});

test("anexos continuam em 16 MB cada e 64 MB no total, sem contar as fontes", () => {
  const sixteen = zeros(16 * MiB);
  const assets = [1, 2, 3, 4].map((n) => file(`asset-${n}`, sixteen));
  validateProject(projectWith(assets, []));
  assert.throws(
    () =>
      validateProject(
        projectWith([file("asset-1", zeros(16 * MiB + 1))], []),
      ),
    { message: "Cada anexo pode ter até 16 MB." },
  );
  assert.throws(
    () =>
      validateProject(
        projectWith([...assets, file("asset-5", zeros(1))], []),
      ),
    { message: "Os anexos do curso podem somar até 64 MB." },
  );
  // O maior projeto possível: 64 MB de anexos e 80 MB de documentos.
  validateProject(
    projectWith(
      assets,
      [1, 2, 3, 4].map((n) => file(`source-${n}`, zeros(20 * MiB))),
    ),
  );
});

test("anexo e fonte não podem repetir o mesmo identificador", () => {
  assert.throws(
    () =>
      validateProject(
        projectWith([file("same", zeros(1))], [file("same", zeros(1))]),
      ),
    { message: "Identificador de arquivo inválido ou repetido." },
  );
});

test("cópia portátil guarda e devolve uma fonte de 20 MB, acima do antigo teto de 16 MB", async () => {
  const project = projectWith(
    [],
    [file("source-1", zeros(20 * MiB), "plano.pdf")],
  );
  const restored = await readPortable(await createPortable(project));
  assert.equal(restored.sources[0]!.bytes.length, 20 * MiB);
  assert.deepEqual(restored, project);
});

test("cópia portátil recusa fonte grande demais com a mensagem do limite, não com erro interno", async () => {
  await assert.rejects(
    createPortable(
      projectWith(
        [],
        [file("source-1", zeros(UPLOAD_LIMITS.maxFileBytes + 1))],
      ),
    ),
    { message: UPLOAD_MESSAGES.fileSize },
  );
});

test("cópia portátil guarda e devolve o maior projeto possível: 64 MB de anexos e 80 MB de fontes", async () => {
  const project = projectWith(
    [1, 2, 3, 4].map((n) => file(`asset-${n}`, zeros(16 * MiB))),
    [1, 2, 3, 4].map((n) => file(`source-${n}`, zeros(20 * MiB))),
  );
  const copy = await createPortable(project);
  const restored = await readPortable(copy);
  assert.deepEqual(
    restored.assets.map((entry) => entry.bytes.length),
    project.assets.map((entry) => entry.bytes.length),
  );
  assert.deepEqual(
    restored.sources.map((entry) => entry.bytes.length),
    project.sources.map((entry) => entry.bytes.length),
  );
});

test("cópia portátil acima do limite compactado é recusada com o limite em MB", async () => {
  // 64 MB de anexos + 80 MB de fontes + 16 MB de documentos do projeto.
  await assert.rejects(readPortable(new Uint8Array(160 * MiB + 1)), {
    message: "A cópia portátil pode ter até 160 MB compactados.",
  });
});
