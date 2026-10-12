"use client";
import Link from "next/link";
import { ArrowLeft, Download, AlertCircle } from "lucide-react";
import { Shell } from "../../components/shell.tsx";
import { downloadFile } from "../../download.ts";
import { useDatePlanner } from "./use-date-planner.ts";
import { DatePlanForm } from "./components/DatePlanForm.tsx";
import { DateConnectionPanel } from "./components/DateConnectionPanel.tsx";
import { DatePreviewTable } from "./components/DatePreviewTable.tsx";
import { DateResultsPanel } from "./components/DateResultsPanel.tsx";

export function DatesWorkspace() {
  const {
    input,
    targetsText,
    preview,
    error,
    pane,
    setPane,
    page,
    setPage,
    moodle,
    courseId,
    busy,
    moodlePreview,
    results,
    unknownResult,
    change,
    changeTargets,
    selectCourse,
    simulate,
    previewMoodleDates,
    confirmDates,
    readTargets
  } = useDatePlanner();
  return (
    <Shell active="dates">
      <main className="tool-panel glass">
        <div className="tool-heading">
          <div>
            <h1>Planejar datas</h1>
            <p>
              Defina a cadência, confira o antes e depois e exporte um plano
              identificado.
            </p>
          </div>
          <Link href="/" className="text-button">
            <ArrowLeft size={17} />
            Voltar ao curso
          </Link>
        </div>
        <nav className="panel-tabs" aria-label="Etapas das datas">
          {[
            ["plan", "Planejar"],
            ["connection", "Moodle"],
            ["preview", "Conferir"],
            ["result", "Resultado"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={pane === id}
              disabled={
                (id === "preview" && !preview && !moodlePreview) ||
                (id === "result" && !results.length && !unknownResult)
              }
              onClick={() => setPane(id as typeof pane)}
            >
              {label}
            </button>
          ))}
        </nav>
        {error && (
          <div className="status-banner error-banner" role="alert">
            <AlertCircle size={18} />
            <span className="preserve-text">{error}</span>
          </div>
        )}
        <DatePlanForm
          active={pane === "plan"}
          input={input}
          targetsText={targetsText}
          onChange={change}
          onTargetsChange={changeTargets}
          onSimulate={simulate}
        />
        {preview && pane === "preview" && !moodlePreview && (
          <section className="date-results">
            <h2>Conferir antes e depois</h2>
            <p className="field-help">
              Plano {preview.hash.slice(0, 16)}. Alterar qualquer campo invalida
              esta prévia.
            </p>
            <DatePreviewTable plan={preview.plan} page={page} onPageChange={setPage} showKind />
            <button
              type="button"
              className="primary"
              onClick={() =>
                downloadFile(
                  new TextEncoder().encode(JSON.stringify(preview, null, 2)),
                  "cronograma-conferido.json",
                  "application/json",
                )
              }
            >
              <Download size={18} />
              Baixar plano conferido
            </button>
          </section>
        )}
        <DateConnectionPanel
          active={pane === "connection"}
          moodle={moodle}
          courseId={courseId}
          busy={busy}
          unknownResult={unknownResult}
          onSelectCourse={selectCourse}
          onReadTargets={readTargets}
          onPreview={previewMoodleDates}
        />
        {moodlePreview && pane === "preview" && (
          <section className="notice">
            <h3>Prévia de mudanças no Moodle</h3>
            <p>
              Identificação {moodlePreview.hash.slice(0, 16)}. Confira{" "}
              {moodlePreview.plan.changes.length} alvos antes de aplicar.
            </p>
            <DatePreviewTable plan={moodlePreview.plan} page={page} onPageChange={setPage} />
            <button
              type="button"
              className="primary"
              disabled={busy || !moodle.status?.authenticated}
              onClick={() => {
                void confirmDates();
              }}
            >
              Confirmar alterações de datas
            </button>
          </section>
        )}
        {results.length > 0 && pane === "result" && (
          <DateResultsPanel results={results} page={page} onPageChange={setPage} />
        )}
        {unknownResult && (
          <p className="error-text">
            Há resultado desconhecido. Confira o Moodle antes de outra
            aplicação; uma nova tentativa está bloqueada nesta sessão.
          </p>
        )}
      </main>
    </Shell>
  );
}
