import { z } from "zod";

export const moodleStudentPreviewSchema = z
  .object({
    ok: z.literal(true),
    previewId: z.string(),
    hash: z.string(),
    rows: z.array(
      z.object({
        username: z.string(),
        name: z.string().optional(),
        email: z.string().optional(),
        status: z.string(),
      }),
    ),
    effectiveOptions: z.object({
      mode: z.enum(["create", "update"]),
      enrol: z.boolean(),
      newPassword: z.enum([
        "generated-by-moodle-and-email",
        "not-created",
      ]),
      existingPasswords: z.literal("preserved"),
      updateFields: z.literal("csv-only"),
      allowDelete: z.literal(false),
      allowRename: z.literal(false),
      allowSuspend: z.literal(false),
      defaults: z.record(z.string(), z.string()),
      enrolments: z.array(
        z.object({
          courseId: z.number().int().positive(),
          shortName: z.string(),
          enrolId: z.number().int().positive(),
          method: z.literal("manual"),
          roleId: z.number().int().positive(),
          role: z.literal("student"),
          durationSeconds: z.number().int().nonnegative(),
          expiryNotify: z.boolean(),
        }),
      ),
    }),
    issues: z
      .array(z.object({ code: z.string(), message: z.string() }))
      .optional(),
  });

export const moodleStudentConfirmSchema = z
  .object({
    ok: z.literal(true),
    results: z.array(
      z.object({
        username: z.string(),
        status: z.enum(["created", "updated", "error", "unknown"]),
        message: z.string(),
      }),
    ),
  });

export type MoodleStudentPreview = z.infer<typeof moodleStudentPreviewSchema>;
export type MoodleStudentResult = z.infer<typeof moodleStudentConfirmSchema>["results"][number];
