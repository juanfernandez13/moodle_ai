import { gzipSync } from "node:zlib";
import { EXPORT_LIMITS } from "./profile.ts";

// POSIX ustar: nomes são exclusivamente caminhos internos gerados pela aplicação.
export function packageArchive(
  entries: Map<string, Uint8Array>,
  now: number,
): Uint8Array {
  const chunks: Buffer[] = [];
  let total = 1024;
  for (const [name, content] of entries) {
    if (
      Buffer.byteLength(name) > 100 ||
      !/^[-A-Za-z0-9_./]+$/.test(name) ||
      name.includes("..")
    )
      throw new Error("archive_path");
    const header = Buffer.alloc(512);
    header.write(name, 0, 100, "utf8");
    header.write("0000644\0", 100, 8);
    header.write("0000000\0", 108, 8);
    header.write("0000000\0", 116, 8);
    header.write(
      content.byteLength.toString(8).padStart(11, "0") + "\0",
      124,
      12,
    );
    header.write(now.toString(8).padStart(11, "0") + "\0", 136, 12);
    header.fill(32, 148, 156);
    header[156] = 48;
    header.write("ustar\0", 257, 6);
    header.write("00", 263, 2);
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    header.write(checksum.toString(8).padStart(6, "0") + "\0 ", 148, 8);
    const padding = (512 - (content.byteLength % 512)) % 512;
    total += 512 + content.byteLength + padding;
    if (total > EXPORT_LIMITS.expandedBytes) throw new Error("archive_size");
    chunks.push(header, Buffer.from(content), Buffer.alloc(padding));
  }
  chunks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(chunks), { level: 9 });
}
