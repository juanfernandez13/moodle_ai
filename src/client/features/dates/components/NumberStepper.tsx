"use client";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";

/** A whole number with big − and + buttons; typing works too, and an empty box is allowed while typing. */
export function NumberStepper({
  labelledBy,
  value,
  min,
  max,
  unit,
  lessLabel,
  moreLabel,
  onChange,
}: {
  labelledBy: string;
  value: number;
  min: number;
  max: number;
  unit: [singular: string, plural: string];
  lessLabel: string;
  moreLabel: string;
  onChange(value: number): void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (number: number) => Math.min(max, Math.max(min, Math.round(number)));
  return (
    <div className="dw-stepper" role="group" aria-labelledby={labelledBy}>
      <button
        type="button"
        className="dw-round"
        disabled={value <= min}
        aria-label={lessLabel}
        onClick={() => {
          setDraft(null);
          onChange(clamp(value - 1));
        }}
      >
        <Minus size={26} strokeWidth={2.6} aria-hidden="true" />
      </button>
      <input
        className="dw-number"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={draft ?? String(value)}
        aria-labelledby={labelledBy}
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          const number = Number(text);
          if (text !== "" && Number.isInteger(number) && number >= min && number <= max)
            onChange(number);
        }}
        onBlur={() => {
          if (draft === null) return;
          const number = Number(draft);
          onChange(draft === "" ? min : clamp(number));
          setDraft(null);
        }}
      />
      <button
        type="button"
        className="dw-round"
        disabled={value >= max}
        aria-label={moreLabel}
        onClick={() => {
          setDraft(null);
          onChange(clamp(value + 1));
        }}
      >
        <Plus size={26} strokeWidth={2.6} aria-hidden="true" />
      </button>
      <span className="dw-unit">{value === 1 ? unit[0] : unit[1]}</span>
    </div>
  );
}
