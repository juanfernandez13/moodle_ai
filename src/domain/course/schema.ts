import { z } from 'zod';

const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
const nonBlank = (maximum: number) => z.string().min(1).max(maximum).refine((value) => value.trim().length > 0);
const name = nonBlank(200);
const text = z.string().max(50_000);
const requiredText = nonBlank(50_000);
const timestamp = z.iso.datetime({ offset: true });
const schedule = z.strictObject({ opensAt: timestamp.optional(), closesAt: timestamp.optional() })
  .refine((value) => value.opensAt !== undefined || value.closesAt !== undefined);
const option = z.strictObject({ id, text: requiredText, fraction: z.number().min(0).max(1), feedback: text });
const question = z.strictObject({
  id, type: z.literal('multiple-choice'), statement: requiredText,
  options: z.array(option).min(2).max(20), feedback: text,
});
const activityFields = {
  id, title: name, description: text,
  attachmentIds: z.array(id).max(500), schedule: schedule.optional(),
};
const forum = z.strictObject({
  ...activityFields, type: z.literal('forum'),
  settings: z.strictObject({ discussionMode: z.enum(['general', 'single']) }),
});
const assignment = z.strictObject({
  ...activityFields, type: z.literal('assignment'),
  settings: z.strictObject({ maxGrade: z.number().positive(), submissionMode: z.enum(['file', 'text', 'both']) }),
});
const quiz = z.strictObject({
  ...activityFields, type: z.literal('quiz'),
  settings: z.strictObject({ maxGrade: z.number().positive(), attempts: z.number().int().min(0).max(100), shuffleQuestions: z.boolean() }),
  questions: z.array(question).min(1).max(200),
});
const activity = z.discriminatedUnion('type', [forum, assignment, quiz]);
const section = z.strictObject({ id, title: name, summary: text, activities: z.array(activity).max(200) });
const attachment = z.strictObject({ id, name, size: z.number().int().min(0), mediaType: name });
const gradeCategory = z.strictObject({ id, name, weight: z.number().positive().max(100), activityIds: z.array(id).min(1).max(500) });

export const courseDraftSchema = z.strictObject({
  schemaVersion: z.literal(1), id, revision: z.number().int().min(0),
  metadata: z.strictObject({
    fullName: name, shortName: name, summary: text,
    organization: z.enum(['topics', 'weeks']), startDate: timestamp.optional(),
  }),
  sections: z.array(section).min(1).max(200), attachments: z.array(attachment).max(500),
  gradebook: z.strictObject({ categories: z.array(gradeCategory).min(1).max(100) }).optional(),
});

export type CourseDraft = z.infer<typeof courseDraftSchema>;
export type CourseMetadata = CourseDraft['metadata'];
export type Section = CourseDraft['sections'][number];
export type Activity = Section['activities'][number];
export type Forum = z.infer<typeof forum>;
export type Assignment = z.infer<typeof assignment>;
export type Quiz = z.infer<typeof quiz>;
export type Schedule = z.infer<typeof schedule>;
export type Question = z.infer<typeof question>;
export type Option = z.infer<typeof option>;
export type AttachmentRef = z.infer<typeof attachment>;
export type Gradebook = NonNullable<CourseDraft['gradebook']>;
export type GradeCategory = z.infer<typeof gradeCategory>;
