"use client";
import { useEffect, useState } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { Modal } from "../../../components/modal.tsx";

type View =
  | { kind: "loading" }
  /** PDF: o próprio leitor do navegador, num quadro. */
  | { kind: "pdf"; url: string }
  /** Word: o texto e as figuras convertidos para uma página, num quadro sem scripts. */
  | { kind: "page"; html: string }
  | { kind: "text"; text: string }
  | { kind: "error" };

// Só o começo de um texto enorme: a janela é para conferir se é o arquivo certo, não para ler tudo.
const MAX_TEXT = 200_000;
const PAGE_STYLE =
  "body{margin:24px;font:1rem/1.55 system-ui,sans-serif;color:#173e30;overflow-wrap:anywhere}" +
  "img{max-width:100%;height:auto}table{border-collapse:collapse;max-width:100%}" +
  "td,th{border:1px solid #bbd4c6;padding:4px 8px;vertical-align:top}";

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

/**
 * "Ver": mostra o arquivo escolhido sem sair da tela, para a pessoa conferir se é o certo antes de enviar.
 * Tudo acontece no navegador: o arquivo não é enviado a lugar nenhum para ser mostrado.
 * O Word vira uma página dentro de um quadro isolado (sandbox, sem scripts): nada do documento roda na aplicação.
 */
export function FilePreview({
  file,
  returnFocus,
  onClose,
}: {
  file: File;
  returnFocus: HTMLElement | null;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>({ kind: "loading" });
  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    const extension = extensionOf(file.name);
    void (async () => {
      try {
        if (extension === "pdf") {
          url = URL.createObjectURL(
            new Blob([await file.arrayBuffer()], { type: "application/pdf" }),
          );
          if (alive) setView({ kind: "pdf", url });
          else URL.revokeObjectURL(url);
        } else if (extension === "txt") {
          const text = await file.text();
          if (alive) setView({ kind: "text", text: text.slice(0, MAX_TEXT) });
        } else {
          const mammoth = await import("mammoth");
          const result = await mammoth.convertToHtml({
            arrayBuffer: await file.arrayBuffer(),
          });
          if (alive) setView({ kind: "page", html: result.value });
        }
      } catch {
        if (alive) setView({ kind: "error" });
      }
    })();
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <Modal title={file.name} onClose={onClose} returnFocus={returnFocus}>
      <div className="entry-preview" data-kind={view.kind}>
        {view.kind === "loading" && (
          <p className="entry-note" role="status">
            <LoaderCircle className="spinner" size={18} aria-hidden="true" />
            Abrindo o arquivo…
          </p>
        )}
        {view.kind === "error" && (
          <p className="entry-error" role="alert">
            <TriangleAlert size={16} aria-hidden="true" />
            Não deu para mostrar este arquivo aqui. Ele ainda pode ser enviado.
          </p>
        )}
        {view.kind === "pdf" && (
          <iframe className="entry-preview-frame" title={file.name} src={view.url} />
        )}
        {view.kind === "page" && (
          <iframe
            className="entry-preview-frame"
            title={file.name}
            sandbox=""
            srcDoc={`<!doctype html><meta charset="utf-8"><style>${PAGE_STYLE}</style>${view.html}`}
          />
        )}
        {view.kind === "text" && (
          <pre className="entry-preview-text" tabIndex={0}>
            {view.text}
          </pre>
        )}
      </div>
    </Modal>
  );
}
