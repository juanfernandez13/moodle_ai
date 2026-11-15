"use client";
import { Check, AlertCircle, LoaderCircle } from "lucide-react";
import type { CourseBuilderModel } from "./hooks/use-course-builder.ts";

type Props = Pick<
  CourseBuilderModel,
  "error" | "message" | "setError" | "setMessage" | "busy" | "controller"
>;

// A leitura da Matriz avisa no cartão da IA, logo abaixo do botão que a pessoa apertou (o aviso do alto empurraria a tela).
const BUSY_TEXT = {
  export: "Preparando o arquivo do curso…",
  copy: "Preparando a cópia…",
} as const;

// Avisos que a tela já mostra por si (o curso abriu: ele está ali). O leitor de tela ainda fala; a faixa não aparece.
const SPOKEN_ONLY = new Set(["Disciplina aberta."]);

export function StatusMessages({
  error,
  message,
  setError,
  setMessage,
  busy,
  controller
}: Props) {
  return (
    <>
      {/* As duas regiões ao vivo ficam sempre na página, vazias (sem altura) até chegar um aviso: o leitor de tela fala o
          aviso quando ele entra nelas. Um aviso que nasce já com o papel de alerta ou de status nem sempre é falado. */}
      <div role="alert">
        {error && (
          <div className="status-banner error-banner">
            <AlertCircle size={18} aria-hidden="true" />
            <span className="preserve-text">{error}</span>
            <button
              type="button"
              className="text-button"
              aria-label="Fechar aviso"
              onClick={() => {
                setError("");
                setMessage("");
              }}
            >
              Fechar
            </button>
          </div>
        )}
      </div>
      <div role="status">
        {!error && SPOKEN_ONLY.has(message) && (
          <span className="visually-hidden">{message}</span>
        )}
        {!error && message && !SPOKEN_ONLY.has(message) && (
          <div className="status-banner">
            <Check size={18} aria-hidden="true" />
            <span className="preserve-text">{message}</span>
            <button
              type="button"
              className="text-button"
              aria-label="Fechar aviso"
              onClick={() => {
                setError("");
                setMessage("");
              }}
            >
              Fechar
            </button>
          </div>
        )}
        {busy && busy !== "import" && (
          <div className="status-banner">
            <LoaderCircle className="spinner" size={18} aria-hidden="true" />
            <span>{BUSY_TEXT[busy]}</span>
            {controller.current && (
              <button
                type="button"
                className="text-button"
                onClick={() => controller.current?.abort()}
              >
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
