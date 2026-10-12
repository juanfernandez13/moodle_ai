"use client";
import { Copy } from "lucide-react";
import { Modal } from "../../../components/modal.tsx";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

type Props = Pick<
  CourseBuilderModel,
  "setShowPrompt" | "prompt" | "setMessage"
>;

export function PromptDialog({ setShowPrompt, prompt, setMessage }: Props) {
  return (
    <Modal
      title="Prompt para outra IA"
      onClose={() => setShowPrompt(false)}
    >
      <p>
        Copie o contrato e forneça seu planejamento à IA escolhida. Traga a
        resposta em Importar JSON.
      </p>
      <label className="field">
        <span>Prompt completo</span>
        <textarea
          className="prompt-text"
          value={prompt}
          readOnly
          onFocus={(event) => event.target.select()}
        />
      </label>
      <button
        type="button"
        className="primary"
        onClick={() => {
          navigator.clipboard
            ?.writeText(prompt)
            .then(() => setMessage("Prompt copiado."))
            .catch(() =>
              setMessage("Selecione o texto acima e copie manualmente."),
            );
        }}
      >
        <Copy size={18} />
        Copiar texto
      </button>
      <p className="field-help">
        Se a cópia for bloqueada, selecione o texto e use Ctrl+C.
      </p>
    </Modal>
  );
}
