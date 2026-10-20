"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CalendarDays } from "lucide-react";
import type { useMoodle } from "../../components/moodle-connection.tsx";
import type { useStudentCsv } from "./hooks/use-student-csv.ts";
import type { useStudentMoodle } from "./hooks/use-student-moodle.ts";
import { useStageFocus } from "./hooks/use-stage-focus.ts";
import { StudentExports } from "./StudentExports.tsx";
import { MoodleStudentPanel, MoodleStudentOutput } from "./MoodleStudentPanel.tsx";
import type { MoodlePending } from "./MoodleStudentPanel.tsx";

/** Third step: two equal ways to finish, a file to keep or the students sent straight to Moodle. */
export function StudentSend({
  visible,
  busy,
  csv,
  remote,
  connection,
  onBack,
}: {
  visible: boolean;
  busy: boolean;
  csv: ReturnType<typeof useStudentCsv>;
  remote: ReturnType<typeof useStudentMoodle>;
  connection: ReturnType<typeof useMoodle>;
  onBack: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<MoodlePending>(null);
  const heading = useStageFocus(visible, true);
  const total = csv.previews[0]?.count ?? 0;

  // What the screen is waiting for, so the right words show while Moodle answers.
  async function wait(kind: Exclude<MoodlePending, null>, action: () => Promise<void>) {
    setPending(kind);
    try {
      await action();
    } finally {
      setPending(null);
    }
  }

  return (
    <section hidden={!visible} className="stu-send" aria-labelledby="student-send-title">
      <header className="stu-stage-head">
        <div>
          <h2 id="student-send-title" tabIndex={-1} ref={heading}>
            {total} {total === 1 ? "aluno pronto" : "alunos prontos"}
          </h2>
          <p className="stu-help">Escolha como enviar.</p>
        </div>
      </header>
      <div className="stu-send-grid">
        {csv.previews.length > 0 && <StudentExports previews={csv.previews} />}
        <MoodleStudentPanel
          open={open}
          moodle={connection}
          previews={csv.previews}
          previewIndex={csv.previewIndex}
          busy={busy}
          pending={pending}
          unknownResult={remote.unknownResult}
          hasPreview={remote.moodlePreview !== null}
          onToggle={() => setOpen(!open)}
          onDestinationsChange={csv.changeDestinations}
          onPreviewSelect={csv.selectPreview}
          onPreview={() => wait("preview", remote.previewMoodle)}
        >
          <MoodleStudentOutput
            authenticated={Boolean(connection.status?.authenticated)}
            busy={busy}
            sending={pending === "confirm"}
            preview={remote.moodlePreview}
            results={remote.results}
            unknownResult={remote.unknownResult}
            page={remote.opsPage}
            onPageChange={remote.setOpsPage}
            onConfirm={() => wait("confirm", remote.confirmMoodle)}
          />
        </MoodleStudentPanel>
      </div>
      <div className="stu-actions">
        <button type="button" className="text-button" onClick={onBack}>
          <ArrowLeft size={20} aria-hidden="true" />
          Voltar
        </button>
        <Link className="text-button" href="/datas">
          <CalendarDays size={20} aria-hidden="true" />
          Ajustar as datas
        </Link>
      </div>
    </section>
  );
}
