"use client";
import { useState } from "react";
import { ChevronDown, Copy } from "lucide-react";
import { Modal } from "../../../components/modal.tsx";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

type Props = Pick<
  CourseBuilderModel,
  "setShowPrompt" | "prompt" | "setMessage"
>;

/** O texto vai para a área de transferência com um botão; ler o texto inteiro é opcional e fica fechado. */
export function PromptDialog({ setShowPrompt, prompt, setMessage }: Props) {
  // O aviso da página fica atrás da janela: o resultado da cópia aparece e é falado aqui dentro.
  const [copied, setCopied] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <Modal
      title="Prompt para outra IA"
      onClose={() => setShowPrompt(false)}
    >
      <p>Cole este texto na outra IA, junto com a Matriz.</p>
      <button
        type="button"
        className="primary"
        onClick={() => {
          navigator.clipboard
            ?.writeText(prompt)
            .then(() => {
              setMessage("Prompt copiado.");
              setCopied("Prompt copiado.");
            })
            .catch(() => {
              // Sem a cópia automática, o texto se abre para a pessoa selecionar e copiar.
              setOpen(true);
              setMessage("Selecione o texto e copie.");
              setCopied("Não deu para copiar. Selecione o texto e copie.");
            });
        }}
      >
        <Copy size={18} aria-hidden="true" />
        Copiar texto
      </button>
      <p className="field-help" role="status">
        {copied}
      </p>
      <details
        className="entry-more prompt-more"
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary>
          <ChevronDown size={16} aria-hidden="true" />
          Ver o texto
        </summary>
        <label className="field">
          <span className="visually-hidden">Texto do prompt</span>
          <textarea
            className="prompt-text"
            value={prompt}
            readOnly
            onFocus={(event) => event.target.select()}
          />
        </label>
      </details>
    </Modal>
  );
}
