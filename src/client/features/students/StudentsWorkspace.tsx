"use client";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Shell } from "../../components/shell.tsx";
import { useStudentsWorkflow } from "./hooks/use-students-workflow.ts";
import { StudentImport } from "./StudentImport.tsx";
import { StudentReview } from "./StudentReview.tsx";
import { StudentExports } from "./StudentExports.tsx";
import { MoodleStudentPanel } from "./MoodleStudentPanel.tsx";

export function StudentsWorkspace() {
  const {
    busy,
    error,
    stage,
    setStage,
    source,
    csv,
    remote,
    connection,
    validation
  } = useStudentsWorkflow();
  return (
    <Shell active="students">
      <main className="tool-panel glass">
        <div className="tool-heading">
          <div>
            <h1>Cadastro em lote</h1>
            <p>
              Importe uma planilha, confira cada linha e prepare os CSVs.
              Para enviar, conecte seu Moodle e confirme a prévia das operações.
            </p>
          </div>
          <Link className="text-button" href="/">
            <ArrowLeft size={17} />
            Voltar ao curso
          </Link>
        </div>
        <ol className="steps" aria-label="Etapas do cadastro">
          <li className={stage === 1 ? "current" : ""}>
            <button type="button" onClick={() => setStage(1)}>
              1. Planilha
            </button>
          </li>
          <li className={stage === 2 ? "current" : ""}>
            <button
              type="button"
              disabled={!source.rows.length}
              onClick={() => setStage(2)}
            >
              2. Revisão
            </button>
          </li>
          <li className={stage === 3 ? "current" : ""}>
            <button
              type="button"
              disabled={!csv.previews.length}
              onClick={() => setStage(3)}
            >
              3. Download
            </button>
          </li>
        </ol>
        {error && (
          <div className="status-banner error-banner" role="alert">
            <AlertCircle size={18} />
            <span className="preserve-text">{error}</span>
          </div>
        )}
        <StudentImport
          visible={stage === 1}
          file={source.file}
          matrix={source.matrix}
          sheets={source.sheets}
          sheet={source.sheet}
          mapping={source.mapping}
          mappingOpen={source.mappingOpen}
          busy={busy}
          hasRows={source.rows.length > 0}
          onImport={source.parse}
          onExample={source.example}
          onToggleMapping={source.toggleMapping}
          onSheetChange={source.changeSheet}
          onMappingChange={source.setMapping}
          onApplyMapping={source.applyMapping}
          onContinue={() => setStage(2)}
        />
        {source.rows.length > 0 && stage === 2 && (
          <StudentReview
            rows={source.rows}
            validation={validation}
            page={source.page}
            options={csv.options}
            destinations={csv.destinations}
            busy={busy}
            onPageChange={source.setPage}
            onRowChange={source.changeRow}
            onOptionsChange={csv.changeOptions}
            onDestinationsChange={csv.changeDestinations}
            onPrepare={csv.prepare}
          />
        )}
        {csv.previews.length > 0 && stage === 3 && <StudentExports previews={csv.previews} />}
        <MoodleStudentPanel
          visible={stage === 3}
          moodle={connection}
          previews={csv.previews}
          previewIndex={csv.previewIndex}
          busy={busy}
          preview={remote.moodlePreview}
          results={remote.results}
          unknownResult={remote.unknownResult}
          page={remote.opsPage}
          onPageChange={remote.setOpsPage}
          onDestinationsChange={csv.changeDestinations}
          onPreviewSelect={csv.selectPreview}
          onPreview={remote.previewMoodle}
          onConfirm={remote.confirmMoodle}
        />
        <p className="field-help">
          As planilhas de alunos permanecem somente nesta sessão e não entram no
          projeto portátil do curso.
        </p>
        <Link className="tool-link" href="/datas">
          Planejar datas de unidades e atividades
        </Link>
      </main>
    </Shell>
  );
}

