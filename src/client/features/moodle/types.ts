import { z } from "zod";

export const moodleStatusSchema = z.object({
  available: z.boolean(),
  configured: z.boolean(),
  validated: z.boolean(),
  authenticated: z.boolean(),
  name: z.string().optional(),
  defaultUrl: z.string().optional(),
  connectedUrl: z.string().optional(),
  profile: z.string().nullable(),
  compatibility: z.object({
    verified: z.boolean(),
    profile: z.string().nullable(),
    message: z.string(),
  }),
  issues: z.array(z.object({ message: z.string() })).optional(),
});

export const moodleCourseSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  shortName: z.string().optional(),
});

export type MoodleStatus = z.infer<typeof moodleStatusSchema>;
export type MoodleCourse = z.infer<typeof moodleCourseSchema>;
