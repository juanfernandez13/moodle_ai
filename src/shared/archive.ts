import JSZip from "jszip";

export type ArchiveLimits = {
  maxEntries: number;
  maxEntryBytes: number;
  maxTotalBytes: number;
};
export class ArchiveError extends Error {
  code: string;
  path: string;
  constructor(code: string, message: string, path = "$") {
    super(message);
    this.name = "ArchiveError";
    this.code = code;
    this.path = path;
  }
}
const fail = (code: string, message: string): never => {
  throw new ArchiveError(code, message);
};

function checkPath(value: string): void {
  const path = value.endsWith("/") ? value.slice(0, -1) : value;
  if (
    !path ||
    /[\\:\x00-\x1f]/.test(path) ||
    path.startsWith("/") ||
    path.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    fail(
      "unsafe_archive_path",
      "O pacote contém um caminho de arquivo inválido.",
    );
  }
}

// Check the central directory before inflating. ZIP64 and split archives are not this format.
function inspectDirectory(
  bytes: Uint8Array,
  limits: ArchiveLimits,
): Map<string, number> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (
    let index = bytes.length - 22;
    index >= Math.max(0, bytes.length - 65_557);
    index--
  ) {
    if (
      view.getUint32(index, true) === 0x06054b50 &&
      index + 22 + view.getUint16(index + 20, true) === bytes.length
    ) {
      end = index;
      break;
    }
  }
  if (end < 0)
    fail("invalid_archive", "O arquivo não é um pacote ZIP íntegro.");
  const count = view.getUint16(end + 10, true);
  if (
    view.getUint16(end + 4, true) !== 0 ||
    view.getUint16(end + 6, true) !== 0 ||
    view.getUint16(end + 8, true) !== count ||
    count === 65_535
  )
    fail("invalid_archive", "O formato deste ZIP não é suportado.");
  if (count > limits.maxEntries)
    fail("archive_entry_count", "O pacote tem arquivos demais.");
  let offset = view.getUint32(end + 16, true);
  const directoryEnd = offset + view.getUint32(end + 12, true);
  if (directoryEnd !== end)
    fail("invalid_archive", "O diretório do ZIP está corrompido.");
  let total = 0;
  const names = new Set<string>();
  const checksums = new Map<string, number>();
  for (let index = 0; index < count; index++) {
    if (
      offset + 46 > directoryEnd ||
      view.getUint32(offset, true) !== 0x02014b50
    )
      fail("invalid_archive", "O diretório do ZIP está corrompido.");
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const next =
      offset +
      46 +
      nameLength +
      view.getUint16(offset + 30, true) +
      view.getUint16(offset + 32, true);
    if (next > directoryEnd || (view.getUint16(offset + 8, true) & 1) !== 0)
      fail(
        "invalid_archive",
        "Arquivo corrompido ou criptografado não é suportado.",
      );
    let name: string;
    try {
      name = new TextDecoder("utf-8", { fatal: true }).decode(
        bytes.subarray(offset + 46, offset + 46 + nameLength),
      );
    } catch {
      return fail("invalid_archive", "O ZIP deve usar nomes de arquivo UTF-8.");
    }
    checkPath(name);
    if (names.has(name))
      fail(
        "duplicate_archive_path",
        "O pacote contém arquivos com o mesmo caminho.",
      );
    names.add(name);
    checksums.set(name, view.getUint32(offset + 16, true));
    if (size > limits.maxEntryBytes)
      fail("archive_entry_limit", "Um arquivo excede o limite descompactado.");
    total += size;
    if (total > limits.maxTotalBytes)
      fail("archive_total_limit", "O pacote excede o limite descompactado.");
    offset = next;
  }
  if (offset !== directoryEnd)
    fail("invalid_archive", "O diretório do ZIP está corrompido.");
  return checksums;
}

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let checksum = value;
  for (let bit = 0; bit < 8; bit++)
    checksum = checksum & 1 ? 0xedb88320 ^ (checksum >>> 1) : checksum >>> 1;
  return checksum >>> 0;
});

export async function readArchive(
  bytes: Uint8Array,
  limits: ArchiveLimits,
): Promise<Map<string, Uint8Array>> {
  if (
    ![limits.maxEntries, limits.maxEntryBytes, limits.maxTotalBytes].every(
      (limit) => Number.isSafeInteger(limit) && limit > 0,
    )
  ) {
    throw new Error("Limites de arquivo inválidos.");
  }
  if (bytes.length > limits.maxTotalBytes)
    fail("archive_total_limit", "O pacote excede o limite de arquivo.");
  const checksums = inspectDirectory(bytes, limits);
  let archive: JSZip;
  try {
    archive = await JSZip.loadAsync(bytes, { createFolders: false });
  } catch {
    return fail("invalid_archive", "Não foi possível ler este ZIP.");
  }
  const result = new Map<string, Uint8Array>();
  let total = 0;
  for (const [name, file] of Object.entries(archive.files)) {
    checkPath(file.unsafeOriginalName ?? name);
    checkPath(name);
    if (file.dir) continue;
    const value = await new Promise<Uint8Array>((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      let length = 0,
        settled = false,
        checksum = 0xffffffff;
      // JSZip exposes this streaming API at runtime; its bundled object types omit it.
      const stream = (
        file as JSZip.JSZipObject & {
          internalStream(
            type: "uint8array",
          ): JSZip.JSZipStreamHelper<Uint8Array>;
        }
      ).internalStream("uint8array");
      stream.on("data", (chunk: Uint8Array) => {
        if (settled) return;
        length += chunk.length;
        total += chunk.length;
        if (length > limits.maxEntryBytes || total > limits.maxTotalBytes) {
          settled = true;
          stream.pause();
          reject(
            new ArchiveError(
              length > limits.maxEntryBytes
                ? "archive_entry_limit"
                : "archive_total_limit",
              "O conteúdo expandido excede o limite permitido.",
            ),
          );
          return;
        }
        chunks.push(chunk);
        for (const byte of chunk)
          checksum =
            (crcTable[(checksum ^ byte) & 255]! ^ (checksum >>> 8)) >>> 0;
      });
      stream.on("error", () => {
        settled = true;
        reject(
          new ArchiveError(
            "invalid_archive",
            "O conteúdo do ZIP está corrompido.",
          ),
        );
      });
      stream.on("end", () => {
        if (settled) return;
        settled = true;
        if (
          (checksum ^ 0xffffffff) >>> 0 !==
          checksums.get(file.unsafeOriginalName ?? name)
        ) {
          reject(
            new ArchiveError(
              "invalid_archive",
              "Um arquivo do ZIP não passou na conferência de integridade.",
            ),
          );
          return;
        }
        const output = new Uint8Array(length);
        let cursor = 0;
        for (const chunk of chunks) {
          output.set(chunk, cursor);
          cursor += chunk.length;
        }
        resolve(output);
      });
      stream.resume();
    });
    result.set(name, value);
  }
  return result;
}

export async function hash256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new Uint8Array(bytes).buffer,
  );
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}
