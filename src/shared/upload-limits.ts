const MEBIBYTE = 1024 * 1024;

/**
 * What a teacher can send in one import. The import API, the check the browser
 * makes before sending and the source documents a project keeps share these
 * numbers, so a file one of them accepts is not refused by the next.
 * Messages call a mebibyte "MB", the unit the system shows beside each file.
 */
export const UPLOAD_LIMITS = Object.freeze({
  maxFiles: 30,
  maxFileBytes: 25 * MEBIBYTE,
  maxTotalBytes: 80 * MEBIBYTE,
});

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
/** "25 MB" for messages a teacher reads. */
export const formatMegabytes = (bytes: number): string =>
  `${decimal.format(bytes / MEBIBYTE)} MB`;

export const UPLOAD_MESSAGES = Object.freeze({
  fileCount: `Selecione entre 1 e ${UPLOAD_LIMITS.maxFiles} arquivos .docx, .pdf ou .txt.`,
  fileSize: `Cada documento pode ter até ${formatMegabytes(UPLOAD_LIMITS.maxFileBytes)}.`,
  totalSize: `Os documentos juntos podem ter até ${formatMegabytes(UPLOAD_LIMITS.maxTotalBytes)}.`,
});

/** First limit the selection breaks, as a message for the teacher, or null. */
export function checkUploadLimits(
  files: readonly { size: number }[],
): string | null {
  if (files.length < 1 || files.length > UPLOAD_LIMITS.maxFiles)
    return UPLOAD_MESSAGES.fileCount;
  if (files.some((file) => file.size > UPLOAD_LIMITS.maxFileBytes))
    return UPLOAD_MESSAGES.fileSize;
  if (
    files.reduce((total, file) => total + file.size, 0) >
    UPLOAD_LIMITS.maxTotalBytes
  )
    return UPLOAD_MESSAGES.totalSize;
  return null;
}
