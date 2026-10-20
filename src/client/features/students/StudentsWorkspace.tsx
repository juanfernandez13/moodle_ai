"use client";
import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { PageTurn } from "../../components/page-turn.tsx";
import { Shell } from "../../components/shell.tsx";
import { useStudentsWorkflow } from "./hooks/use-students-workflow.ts";
import { StudentSteps } from "./StudentSteps.tsx";
import { StudentModeToggle } from "./StudentModeToggle.tsx";
import type { StudentEntry } from "./StudentModeToggle.tsx";
import { StudentImport } from "./StudentImport.tsx";
import { StudentReview } from "./StudentReview.tsx";
import { StudentSend } from "./StudentSend.tsx";

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
  const [entry, setEntry] = useState<StudentEntry>("file");
  const body = useRef<HTMLDivElement>(null);
  // Each step opens at its top, whatever the one before had scrolled to.
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [stage]);
  // On a phone the message sits above a long list: bring it into view.
  useEffect(() => {
    if (error) window.scrollTo({ top: 0 });
  }, [error]);
  return (
    <Shell active="students">
      <main className="tool-panel students-panel surface-panel">
        <div className="stu-head">
          <h1>Cadastrar alunos</h1>
          <StudentSteps
            stage={stage}
            hasRows={source.rows.length > 0}
            hasFiles={csv.previews.length > 0}
            onSelect={setStage}
          />
          <StudentModeToggle
            visible={stage === 1}
            entry={entry}
            onChange={setEntry}
          />
        </div>
        {error && (
          <div className="status-banner error-banner" role="alert">
            <AlertCircle size={20} aria-hidden="true" />
            <span className="preserve-text">{error}</span>
          </div>
        )}
        <PageTurn step={stage} className="tool-body stu-body" ref={body}>
          <StudentImport
            visible={stage === 1}
            entry={entry}
            file={source.file}
            matrix={source.matrix}
            sheets={source.sheets}
            sheet={source.sheet}
            mapping={source.mapping}
            mappingOpen={source.mappingOpen}
            busy={busy}
            rowCount={source.rows.length}
            onImport={source.parse}
            onExample={source.example}
            onManual={source.fromManual}
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
              onBack={() => setStage(1)}
            />
          )}
          <StudentSend
            visible={stage === 3}
            busy={busy}
            csv={csv}
            remote={remote}
            connection={connection}
            onBack={() => setStage(2)}
          />
        </PageTurn>
      </main>
    </Shell>
  );
}
