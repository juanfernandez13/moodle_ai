"use client";
import { Check, AlertCircle, LoaderCircle } from "lucide-react";
import type { CourseBuilderModel } from "./hooks/use-course-builder.ts";

type Props = Pick<
  CourseBuilderModel,
  "error" | "message" | "setError" | "setMessage" | "busy" | "controller"
>;

export function StatusMessages({
  error,
  message,
  setError,
  setMessage,
  busy,
  controller
}: Props) {
  return (
    <>{(error || message) && (
      <div
        className={`status-banner ${error ? "error-banner" : ""}`}
        role={error ? "alert" : "status"}
      >
        {error ? <AlertCircle size={18} /> : <Check size={18} />}
        <span className="preserve-text">{error || message}</span>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setError("");
            setMessage("");
          }}
        >
          Fechar
        </button>
      </div>
    )}
      {busy && (
        <div className="status-banner" role="status">
          <LoaderCircle className="spinner" size={18} />
          <span>
            {busy === "import"
              ? "Lendo e validando o planejamento…"
              : busy === "export"
                ? "Gerando o backup da revisão conferida…"
                : "Preparando a cópia portátil…"}
          </span>
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
      )}</>
  );
}
