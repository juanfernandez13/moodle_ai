import { z } from 'zod';

const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
const nonBlank = (maximum: number) => z.string().min(1).max(maximum).refine((value) => value.trim().length > 0);
const name = nonBlank(200);
const text = z.string().max(50_000);
const requiredText = nonBlank(50_000);
const timestamp = z.iso.datetime({ offset: true });
const schedule = z.strictObject({ opensAt: timestamp.optional(), closesAt: timestamp.optional() })
  .refine((value) => value.opensAt !== undefined || value.closesAt !== undefined);
const textBlock = z.strictObject({ id, kind: z.literal('text'), text });
const imageBlock = z.strictObject({ id, kind: z.literal('image'), attachmentId: id, alt: z.string().max(2000) });
const inlineBlock = z.discriminatedUnion('kind', [textBlock, imageBlock]);
const tableCell = z.strictObject({ blocks: z.array(inlineBlock).max(100) });
const tableBlock = z.strictObject({ id, kind: z.literal('table'), rows: z.array(z.array(tableCell).min(1).max(20)).min(1).max(100) });
const contentBlock = z.discriminatedUnion('kind', [textBlock, imageBlock, tableBlock]);
const blocks = z.array(contentBlock).max(500);
const option = z.strictObject({ id, text: requiredText, fraction: z.number().min(0).max(1), feedback: text, textBlocks: blocks.optional(), feedbackBlocks: blocks.optional() });
const questionFields = { id, statement: requiredText, feedback: text, maxMark: z.number().positive().optional(), statementBlocks: blocks.optional(), feedbackBlocks: blocks.optional() };
const multipleChoice = z.strictObject({
  ...questionFields, type: z.literal('multiple-choice'),
  options: z.array(option).min(2).max(20), feedback: text,
});
const matchingPair = z.strictObject({ id, statement: requiredText, answer: requiredText, statementBlocks: blocks.optional() });
const matching = z.strictObject({ ...questionFields, type: z.literal('matching'), pairs: z.array(matchingPair).min(2).max(100) });
const essay = z.strictObject({ ...questionFields, type: z.literal('essay'), settings: z.strictObject({ responseFormat: z.enum(['editor', 'plain']), responseRequired: z.boolean(), responseLines: z.number().int().min(5).max(50), attachments: z.number().int().min(0).max(10) }) });
const question = z.discriminatedUnion('type', [multipleChoice, matching, essay]);
const activityFields = {
  id, title: name, description: text,
  attachmentIds: z.array(id).max(500), schedule: schedule.optional(), descriptionBlocks: blocks.optional(),
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
const chat = z.strictObject({ ...activityFields, type: z.literal('chat'), settings: z.strictObject({ sessionAt: timestamp.optional(), repeat: z.enum(['none', 'daily', 'weekly']), keepDays: z.number().int().min(0).max(3650) }) });
const wiki = z.strictObject({ ...activityFields, type: z.literal('wiki'), settings: z.strictObject({ mode: z.enum(['collaborative', 'individual']), firstPageTitle: name }) });
const glossaryEntry = z.strictObject({ id, concept: name, definition: requiredText, definitionBlocks: blocks.optional() });
const glossary = z.strictObject({ ...activityFields, type: z.literal('glossary'), settings: z.strictObject({ allowDuplicates: z.boolean(), requireApproval: z.boolean(), entriesPerPage: z.number().int().min(1).max(100) }), entries: z.array(glossaryEntry).max(500) });
const activity = z.discriminatedUnion('type', [forum, assignment, quiz, chat, wiki, glossary]);
const section = z.strictObject({ id, title: name, summary: text, summaryBlocks: blocks.optional(), activities: z.array(activity).max(200) });
const attachment = z.strictObject({ id, name, size: z.number().int().min(0), mediaType: name });
const gradeCategory = z.strictObject({ id, name, weight: z.number().positive().max(100), activityIds: z.array(id).min(1).max(500) });

export const courseDraftSchema = z.strictObject({
  schemaVersion: z.literal(1), id, revision: z.number().int().min(0),
  metadata: z.strictObject({
    fullName: name, shortName: name, summary: text,
    organization: z.enum(['topics', 'weeks']), startDate: timestamp.optional(),
    summaryBlocks: blocks.optional(), teacher: z.strictObject({ name, email: z.email().optional(), qualification: text.optional() }).optional(),
    workloadHours: z.number().int().positive().optional(), semester: name.optional(), className: name.optional(),
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
export type Chat = z.infer<typeof chat>;
export type Wiki = z.infer<typeof wiki>;
export type Glossary = z.infer<typeof glossary>;
export type GlossaryEntry = z.infer<typeof glossaryEntry>;
export type Schedule = z.infer<typeof schedule>;
export type Question = z.infer<typeof question>;
export type MultipleChoice = z.infer<typeof multipleChoice>;
export type Matching = z.infer<typeof matching>;
export type MatchingPair = z.infer<typeof matchingPair>;
export type Essay = z.infer<typeof essay>;
export type ContentBlock = z.infer<typeof contentBlock>;
export type InlineBlock = z.infer<typeof inlineBlock>;
export type TableCell = z.infer<typeof tableCell>;
export type Option = z.infer<typeof option>;
export type AttachmentRef = z.infer<typeof attachment>;
export type Gradebook = NonNullable<CourseDraft['gradebook']>;
export type GradeCategory = z.infer<typeof gradeCategory>;
