"use client";
import { useEffect, useRef, useId } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
export function Modal({
  title,
  children,
  onClose,
  returnFocus,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  returnFocus?: HTMLElement | null | undefined;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous =
      returnFocus ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous?.isConnected) previous.focus();
    };
  }, [returnFocus]);
  return (
    <dialog
      ref={ref}
      className="modal surface-panel"
      aria-labelledby={titleId}
      // Sem armadilha de Tab feita à mão: showModal() já prende o foco na janela. A armadilha antiga só conhecia
      // botões e campos, então o Tab nunca chegava ao quadro do "Ver arquivo" (PDF e Word) para rolar o conteúdo.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-title">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Fechar diálogo"
          onClick={onClose}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
