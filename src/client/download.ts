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
export const formatBytes = (size: number): string =>
  size >= 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} MiB`
    : size >= 1024
      ? `${(size / 1024).toFixed(1)} KiB`
      : `${size} bytes`;
export function fromBase64(value: string): Uint8Array {
  if (
    value.length > 24 * 1024 * 1024 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value,
    )
  )
    throw new Error("Arquivo inválido recebido na importação.");
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
