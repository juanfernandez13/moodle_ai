import { UPLOAD_LIMITS, formatMegabytes } from "../shared/upload-limits.ts";

export function downloadFile(
  bytes: Uint8Array,
  name: string,
  type: string,
): void {
  const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes)], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// The size of a file as the teacher reads it: B, KB or MB (pt-BR), the same
// everywhere a file is listed. Megabytes show one decimal below 10 MB only.
export function formatBytes(size: number): string {
  const kilobytes = Math.round(size / 1024);
  if (kilobytes < 1024) return size >= 1024 ? `${kilobytes} KB` : `${size} B`;
  if (size < 10 * 1024 * 1024) return formatMegabytes(size);
  return `${Math.round(size / (1024 * 1024))} MB`;
}
// The largest file the server sends back is a source document; base64 takes 4
// characters for every 3 bytes.
const BASE64_MAX_LENGTH = Math.ceil(UPLOAD_LIMITS.maxFileBytes / 3) * 4;
// Checked and decoded one slice at a time (a multiple of 4 characters). One
// regular expression over the whole text throws "Maximum call stack size
// exceeded" from about 4 MiB of file, far below the upload limit.
const BASE64_SLICE = 1 << 20;
const BASE64_BODY = /^[A-Za-z0-9+/]*$/;
const BASE64_END =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
export function fromBase64(value: string): Uint8Array {
  if (value.length > BASE64_MAX_LENGTH || value.length % 4 !== 0)
    throw new Error("Arquivo inválido recebido na importação.");
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  const bytes = new Uint8Array((value.length / 4) * 3 - padding);
  let position = 0;
  for (let start = 0; start < value.length; start += BASE64_SLICE) {
    const slice = value.slice(start, start + BASE64_SLICE);
    const last = start + BASE64_SLICE >= value.length;
    if (!(last ? BASE64_END : BASE64_BODY).test(slice))
      throw new Error("Arquivo inválido recebido na importação.");
    const binary = atob(slice);
    for (let index = 0; index < binary.length; index++)
      bytes[position++] = binary.charCodeAt(index);
  }
  return bytes;
}
