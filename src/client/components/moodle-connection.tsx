"use client";

// Stable imports for the two feature screens; behavior lives in the Moodle feature.
export { MoodleConnection } from "../features/moodle/components/moodle-connection.tsx";
export { useMoodle } from "../features/moodle/hooks/use-moodle.ts";
export {
  moodlePost,
  issuesMessage,
} from "../features/moodle/helpers/moodle-api.ts";
export type { MoodleStatus, MoodleCourse } from "../features/moodle/types.ts";
