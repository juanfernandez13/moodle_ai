import { ArrowLeft } from "lucide-react";

/** The one way back on every step: a small text link beside the main button. */
export function DateBackLink({
  onClick,
  label = "Voltar",
}: {
  onClick(): void;
  label?: string;
}) {
  return (
    <button type="button" className="dw-link" onClick={onClick}>
      <ArrowLeft size={20} aria-hidden="true" />
      {label}
    </button>
  );
}
