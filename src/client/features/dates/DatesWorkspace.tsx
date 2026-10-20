"use client";
import { useEffect, useRef } from "react";
import { CircleAlert, FlaskConical, LogIn } from "lucide-react";
import { PageTurn } from "../../components/page-turn.tsx";
import { Shell } from "../../components/shell.tsx";
import { useDateWizard } from "./use-date-wizard.ts";
import { DateSteps } from "./components/DateSteps.tsx";
import { DateLoginStep } from "./components/DateLoginStep.tsx";
import { DateCourseStep } from "./components/DateCourseStep.tsx";
import { DateScheduleStep } from "./components/DateScheduleStep.tsx";
import { DateReviewStep } from "./components/DateReviewStep.tsx";
import { DateResultsPanel } from "./components/DateResultsPanel.tsx";

/** "Ajustar datas": four steps on one page (login, course, new dates, review), or the two dates steps in test mode. */
export function DatesWorkspace() {
  const wizard = useDateWizard();
  const stage = useRef<HTMLElement>(null);
  const lastShown = useRef(wizard.shown);
  const plan = wizard.demo ? wizard.preview?.plan : wizard.moodlePreview?.plan;
  const shown = wizard.shown === "preview" && !plan ? "plan" : wizard.shown;

  // Keyboard and screen-reader users land on the new step instead of on a button that no longer exists.
  // The step title (visually hidden) takes the focus: PageDown and the arrows then scroll that step.
  useEffect(() => {
    if (lastShown.current === shown) return;
    lastShown.current = shown;
    const title = stage.current?.querySelector("h2");
    if (title) {
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
    }
  }, [shown]);

  return (
    <Shell active="dates">
      <main className="tool-panel dates-wizard surface-panel">
        <div className="dw-top">
          <div className="dw-title">
            <h1>Ajustar datas</h1>
            {wizard.demo && (
              <span className="dw-chip">
                <FlaskConical size={18} aria-hidden="true" />
                Só um teste
              </span>
            )}
          </div>
          <button
            type="button"
            className="dw-link dw-mode"
            disabled={wizard.applying}
            onClick={wizard.demo ? wizard.leaveDemo : wizard.startDemo}
          >
            {wizard.demo ? (
              <LogIn size={20} aria-hidden="true" />
            ) : (
              <FlaskConical size={20} aria-hidden="true" />
            )}
            {wizard.demo ? "Usar o Moodle" : "Testar sem o Moodle"}
          </button>
          <DateSteps steps={wizard.steps} onGo={wizard.goTo} />
        </div>
        {wizard.message && (
          <div className="status-banner error-banner" role="alert">
            <CircleAlert size={22} aria-hidden="true" />
            <span className="preserve-text">{wizard.message}</span>
          </div>
        )}
        <PageTurn
          as="section"
          step={["login", "course", "plan", "preview", "result"].indexOf(shown)}
          ref={stage}
          className="dw-stage"
          aria-label={wizard.steps.find((step) => step.state === "current")?.label}
        >
          {shown === "login" && (
            <DateLoginStep
              moodle={wizard.moodle}
              expired={wizard.dropped}
              onContinue={() => wizard.setPane("course")}
              onLogout={wizard.signOut}
            />
          )}
          {shown === "course" && (
            <DateCourseStep
              courses={wizard.moodle.courses}
              loading={wizard.loadingCourses}
              loaded={wizard.coursesLoaded}
              courseId={wizard.courseId}
              reading={wizard.busy}
              summary={wizard.summary}
              onPick={wizard.pickCourse}
              onReload={() => {
                void wizard.moodle.loadCourses();
              }}
              onBack={() => wizard.setPane("login")}
              onContinue={() => wizard.setPane("plan")}
            />
          )}
          {shown === "plan" && (
            <DateScheduleStep
              input={wizard.input}
              demo={wizard.demo}
              demoUnits={wizard.demoUnits}
              busy={wizard.busy}
              locked={wizard.unknownResult}
              onChange={wizard.change}
              onDemoUnits={wizard.changeDemoUnits}
              onBack={() => wizard.setPane("course")}
              onNext={() => {
                void wizard.previewPlan();
              }}
            />
          )}
          {shown === "preview" && plan && (
            <DateReviewStep
              plan={plan}
              courseTitle={wizard.courseTitle}
              demo={wizard.demo}
              busy={wizard.busy}
              onApply={() => {
                void wizard.confirmDates();
              }}
              onBack={() => wizard.setPane("plan")}
              onUseMoodle={wizard.leaveDemo}
            />
          )}
          {shown === "result" && (
            <DateResultsPanel
              results={wizard.results}
              busy={wizard.busy}
              locked={wizard.unknownResult}
              onNext={wizard.chooseAnother}
              onBack={() => wizard.setPane("plan")}
            />
          )}
        </PageTurn>
      </main>
    </Shell>
  );
}
