"use client";
import { ArrowUp, ArrowDown } from "lucide-react";

export function OrderControls({
  label,
  index,
  count,
  move,
}: {
  label: string;
  index: number;
  count: number;
  move: (destination: number) => void;
}) {
  return (
    <span className="icon-actions">
      <button
        type="button"
        aria-label={`Subir ${label}`}
        disabled={index === 0}
        onClick={() => move(index - 1)}
      >
        <ArrowUp size={16} />
      </button>
      <button
        type="button"
        aria-label={`Descer ${label}`}
        disabled={index === count - 1}
        onClick={() => move(index + 1)}
      >
        <ArrowDown size={16} />
      </button>
    </span>
  );
}
