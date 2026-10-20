/** Wizard screens: login and course are the Moodle-only steps; plan and preview/result are shared with the test mode. */
export type DatePane = "login" | "course" | "plan" | "preview" | "result";
export interface DateOperationResult {
  id: string;
  title?: string | undefined;
  status: string;
  message: string;
}
export interface CourseSummary {
  units: number;
  activities: number;
}
