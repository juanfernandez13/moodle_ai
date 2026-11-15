"use client";
import { useState } from "react";
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  CircleMinus,
  CircleQuestionMark,
  CircleX,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { dateResultLabel, friendlyMessage } from "../helpers.ts";
import type { DateOperationResult } from "../types.ts";
import { DateBackLink } from "./DateBackLink.tsx";

const PAGE = 200;
/** What needs attention goes first, so nobody scrolls past twenty "Aplicado" to find the one that failed. */
const ORDER: Record<string, number> = { unknown: 0, error: 1, not_applied: 2, applied: 3 };

function StatusIcon({ status }: { status: string }) {
  const props = { size: 22, "aria-hidden": true } as const;
  if (status === "applied") return <CircleCheck {...props} />;
  if (status === "unknown") return <CircleQuestionMark {...props} />;
  if (status === "not_applied") return <CircleMinus {...props} />;
  return <CircleX {...props} />;
}

/** After "Aplicar": waits while Moodle works, then says how many dates changed and lists each item. */
export function DateResultsPanel({
  results,
  busy,
  locked,
  onNext,
  onBack,
}: {
  results: DateOperationResult[];
  busy: boolean;
  locked: boolean;
  onNext(): void;
  onBack(): void;
}) {
  const [limit, setLimit] = useState(PAGE);
  // Esperando o Moodle e a tela de resultado são a mesma tela: o título e a região ao vivo ficam no lugar, então o
  // foco não se perde e o leitor de tela fala o resultado quando ele chega.
  const waiting = busy && results.length === 0;

  const sorted = [...results].sort(
    (a, b) => (ORDER[a.status] ?? 1) - (ORDER[b.status] ?? 1),
  );
  const applied = results.filter((entry) => entry.status === "applied").length;
  const unknown = locked || results.some((entry) => entry.status === "unknown");
  const everything = results.length > 0 && applied === results.length;
  const tone = unknown ? "warn" : everything ? "ok" : applied > 0 ? "warn" : "error";
  const title = unknown
    ? "Não sabemos o resultado"
    : everything
      ? "Datas aplicadas"
      : applied > 0
        ? "Aplicadas em parte"
        : "Nada foi aplicado";
  const detail = unknown
    ? "Confira no Moodle antes de tentar de novo."
    : results.length
      ? `${applied} de ${results.length} ${results.length === 1 ? "aplicada" : "aplicadas"}.`
      : "";
  return (
    <>
      <div className={waiting ? "dw-body" : "dw-body dw-body-table"}>
        <h2 className="visually-hidden">Resultado</h2>
        <div role="status" aria-atomic="true">
          {waiting ? (
            <div className="dw-result" data-tone="wait">
              <span className="dw-seal" aria-hidden="true">
                <LoaderCircle className="spinner" size={32} />
              </span>
              <div>
                <p className="dw-big">Aplicando no Moodle…</p>
                <p className="dw-help">Não feche esta página.</p>
              </div>
            </div>
          ) : (
            <div className="dw-result" data-tone={tone}>
              <span className="dw-seal" aria-hidden="true">
                {tone === "ok" ? (
                  <CircleCheck size={32} />
                ) : tone === "error" ? (
                  <CircleX size={32} />
                ) : (
                  <CircleAlert size={32} />
                )}
              </span>
              <div>
                <p className="dw-big">{title}</p>
                {detail && <p className="dw-help">{detail}</p>}
              </div>
            </div>
          )}
        </div>
        {!waiting && results.length > 0 && (
          <div className="dw-table-wrap" tabIndex={0} role="region" aria-label="Resultado de cada item">
            <table className="dw-table dw-results" role="table">
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" role="columnheader">
                    Unidade ou atividade
                  </th>
                  <th scope="col" role="columnheader">
                    Resultado
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {sorted.slice(0, limit).map((entry) => (
                  <tr key={entry.id} role="row">
                    <th scope="row" className="dw-what" role="rowheader">
                      <span>{entry.title || entry.id}</span>
                    </th>
                    <td data-label="Resultado" role="cell">
                      <span className="dw-state" data-status={entry.status}>
                        <StatusIcon status={entry.status} />
                        {dateResultLabel(entry.status)}
                      </span>
                      {entry.status !== "applied" && entry.message && (
                        <small className="dw-why">{friendlyMessage(entry.message)}</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {results.length > limit && (
              <button type="button" className="dw-link dw-more" onClick={() => setLimit(limit + PAGE)}>
                Mostrar mais
              </button>
            )}
          </div>
        )}
      </div>
      {!waiting && (
      <div className="dw-actions">
        {unknown ? (
          <button
            type="button"
            className="dw-link"
            onClick={() => window.location.reload()}
          >
            <RotateCcw size={20} aria-hidden="true" />
            Começar de novo
          </button>
        ) : (
          <>
            {!everything && <DateBackLink onClick={onBack} label="Tentar de novo" />}
            <button type="button" className="primary dw-primary" onClick={onNext}>
              Escolher outra disciplina
              <ArrowRight size={22} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      )}
    </>
  );
}
