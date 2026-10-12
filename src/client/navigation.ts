/** A validation path selects its content block without losing the surrounding field. */
export function richBlockFocus(
  issuePath: string | undefined,
  fieldPath: string,
): number | undefined {
  if (!issuePath || !fieldPath || !issuePath.startsWith(fieldPath))
    return undefined;
  const suffix = issuePath.slice(fieldPath.length);
  if (suffix === "" || suffix.startsWith(".")) return 0;
  const index = suffix.match(/^\[(\d+)\]/)?.[1];
  return index === undefined ? undefined : Number(index);
}

export function richTableRowFocus(
  issuePath: string | undefined,
): number | undefined {
  const row = issuePath?.match(/\.rows\[(\d+)\]/)?.[1];
  return row === undefined ? undefined : Number(row);
}

/** Resolve the nearest stable entity ID while reading a field path; never evaluate it. */
export function issueEntityId(
  draft: unknown,
  path: string,
): string | undefined {
  return issueFieldTarget(draft, path).entityId;
}

export function issueFieldTarget(
  draft: unknown,
  path: string,
): { entityId?: string | undefined; field: string } {
  const parts = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
  let current = draft;
  let entity: string | undefined;
  let entityDepth = 0;
  let primitiveReference: string | undefined;
  const remember = (depth: number) => {
    if (
      current !== null &&
      typeof current === "object" &&
      "id" in current &&
      typeof current.id === "string"
    ) {
      entity = current.id;
      entityDepth = depth;
    }
  };
  remember(0);
  for (const [index, part] of parts.entries()) {
    if (
      ["__proto__", "constructor", "prototype"].includes(part) ||
      current === null ||
      typeof current !== "object" ||
      !Object.hasOwn(current, part)
    )
      break;
    const parent = current;
    current = (current as Record<string, unknown>)[part];
    if (
      index === parts.length - 1 &&
      Array.isArray(parent) &&
      typeof current === "string" &&
      /^(attachmentIds|activityIds)$/.test(parts[index - 1] ?? "")
    )
      primitiveReference = current;
    remember(index + 1);
  }
  const fields = parts.slice(entityDepth);
  if (primitiveReference) fields[fields.length - 1] = primitiveReference;
  return { entityId: entity, field: fields.join(".") };
}

/** Focus the canonical field under its stable entity, or the entity for structural issues. */
export function focusIssueField(
  draft: unknown,
  path: string,
  root: Document = document,
): HTMLElement | null {
  const target = issueFieldTarget(draft, path);
  const entity =
    (target.entityId
      ? root.getElementById(`entity-${target.entityId}`)
      : null) ?? root.querySelector<HTMLElement>(".editor-content");
  if (!entity) return null;
  const control = Array.from(
    entity.querySelectorAll<HTMLElement>("[data-field]"),
  ).find(
    (node) =>
      node.dataset.field === target.field && node.getClientRects().length > 0,
  );
  const node = control ?? entity;
  if (!control) node.tabIndex = -1;
  node.scrollIntoView({ behavior: "auto", block: "center" });
  node.focus();
  return node;
}
