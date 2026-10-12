/** Display an instant in a field explicitly labelled UTC, without rewriting the stored value. */
export function utcFieldValue(value: string | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toISOString().slice(0, 16);
}

/** datetime-local carries no offset; this application's UTC fields must add it explicitly. */
export function utcTimestamp(value: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}
