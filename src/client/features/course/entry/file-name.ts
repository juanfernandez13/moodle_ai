/**
 * Splits a file name into the pieces that may break across lines (after _ - . and a space, never inside a word). The
 * extension (".pdf") is kept apart, so it can stay glued to the word before it: it never lands alone on the next line.
 */
export function splitFileName(text: string): {
  parts: string[];
  extension: string;
} {
  const dot = text.lastIndexOf(".");
  const extension =
    dot > 0 && dot < text.length - 1 && text.length - dot <= 6
      ? text.slice(dot)
      : "";
  const stem = extension ? text.slice(0, dot) : text;
  // Sem "lookbehind": navegadores mais antigos não o aceitam e a tela inteira falharia.
  const parts = stem.match(/[^_.\s-]*[_.\s-]+|[^_.\s-]+/g) ?? [stem];
  return { parts, extension };
}
