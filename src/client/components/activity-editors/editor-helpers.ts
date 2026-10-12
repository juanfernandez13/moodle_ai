"use client";

export function reorder<T>(values: T[], from: number, to: number): T[] {
  const next = [...values];
  const value = next.splice(from, 1)[0]!;
  next.splice(to, 0, value);
  return next;
}
