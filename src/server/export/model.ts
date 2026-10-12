import { createHash } from "node:crypto";
import type {
  Activity,
  AttachmentRef,
  ContentBlock,
  CourseDraft,
  InlineBlock,
  Question,
} from "../../domain/course/index.ts";

export const xmlEscape = (value: string | number): string =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
export const field = (name: string, value: string | number | boolean): string =>
  `<${name}>${xmlEscape(typeof value === "boolean" ? Number(value) : value)}</${name}>`;
export const fields = (
  values: Record<string, string | number | boolean>,
): string =>
  Object.entries(values)
    .map(([name, value]) => field(name, value))
    .join("");
export const document = (body: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`;
export const timestamp = (value: string | undefined): number =>
  value === undefined ? 0 : Math.floor(Date.parse(value) / 1000);
export const htmlEscape = xmlEscape;
export interface QuestionModel {
  source: Question;
  id: number;
  bank: number;
  version: number;
  slot: number;
  reference: number;
  options: Map<string, number>;
  plugin: number;
}
export interface ActivityModel {
  source: Activity;
  id: number;
  context: number;
  sectionId: number;
  sectionNumber: number;
  gradeId?: number;
  gradeCategory?: number;
  gradeSort?: number;
  questionTop?: number;
  questionCategory?: number;
  questions: QuestionModel[];
  entryIds: Map<string, number>;
  pluginIds: number[];
}
export interface FileEntry {
  id: number;
  context: number;
  component: string;
  area: string;
  item: number;
  attachment: AttachmentRef;
  hash: string;
  bytes: Uint8Array;
}
export interface FileContext {
  context: number;
  component: string;
  area: string;
  item: number;
}

export class ExportModel {
  private nextId = 1000;
  readonly courseId = this.allocate();
  readonly courseContext = this.allocate();
  readonly rootGrade = this.allocate();
  readonly courseGrade = this.allocate();
  readonly sectionZero = this.allocate();
  readonly now = Math.floor(Date.now() / 1000);
  readonly backupId = createHash("sha256")
    .update(`${this.now}:${Math.random()}`)
    .digest("hex")
    .slice(0, 32);
  readonly sections: Array<{
    source: CourseDraft["sections"][number];
    id: number;
    number: number;
    activities: ActivityModel[];
  }> = [];
  readonly activities: ActivityModel[] = [];
  readonly categories: Array<{
    source: NonNullable<CourseDraft["gradebook"]>["categories"][number];
    id: number;
    item: number;
    sort: number;
  }> = [];
  readonly files: FileEntry[] = [];
  readonly fileKeys = new Map<string, FileEntry>();
  readonly attachments: Map<string, AttachmentRef>;
  readonly draft: CourseDraft;
  readonly bytes: Map<string, Uint8Array>;
  constructor(draft: CourseDraft, bytes: Map<string, Uint8Array>) {
    this.draft = draft;
    this.bytes = bytes;
    this.attachments = new Map(draft.attachments.map((ref) => [ref.id, ref]));
    for (const category of draft.gradebook?.categories ?? [])
      this.categories.push({
        source: category,
        id: this.allocate(),
        item: this.allocate(),
        sort: 0,
      });
    draft.sections.forEach((section, index) => {
      const sec = {
        source: section,
        id: this.allocate(),
        number: index + 1,
        activities: [] as ActivityModel[],
      };
      this.sections.push(sec);
      section.activities.forEach((activity) => {
        const model: ActivityModel = {
          source: activity,
          id: this.allocate(),
          context: this.allocate(),
          sectionId: sec.id,
          sectionNumber: sec.number,
          questions: [],
          entryIds: new Map(),
          pluginIds: [],
        };
        if (activity.type === "assignment" || activity.type === "quiz")
          model.gradeId = this.allocate();
        if (activity.type === "quiz") {
          model.questionTop = this.allocate();
          model.questionCategory = this.allocate();
          for (const question of activity.questions) {
            const q: QuestionModel = {
              source: question,
              id: this.allocate(),
              bank: this.allocate(),
              version: this.allocate(),
              slot: this.allocate(),
              reference: this.allocate(),
              options: new Map(),
              plugin: this.allocate(),
            };
            for (const option of question.type === "multiple-choice"
              ? question.options
              : question.type === "matching"
                ? question.pairs
                : [])
              q.options.set(option.id, this.allocate());
            model.questions.push(q);
          }
        }
        if (activity.type === "glossary")
          for (const entry of activity.entries)
            model.entryIds.set(entry.id, this.allocate());
        for (let i = 0; i < 12; i++) model.pluginIds.push(this.allocate());
        sec.activities.push(model);
        this.activities.push(model);
      });
    });
    let sort = 2;
    for (const category of this.categories) {
      category.sort = sort++;
      for (const id of category.source.activityIds) {
        const activity = this.activities.find((a) => a.source.id === id)!;
        activity.gradeCategory = category.id;
        activity.gradeSort = sort++;
      }
    }
    for (const activity of this.activities)
      if (
        activity.gradeId !== undefined &&
        activity.gradeCategory === undefined
      ) {
        activity.gradeCategory = this.rootGrade;
        activity.gradeSort = sort++;
      }
  }
  allocate(): number {
    return this.nextId++;
  }
  file(attachmentId: string, context: FileContext): FileEntry {
    const key = `${context.context}:${context.component}:${context.area}:${context.item}:${attachmentId}`;
    const existing = this.fileKeys.get(key);
    if (existing) return existing;
    const attachment = this.attachments.get(attachmentId)!;
    const bytes = this.bytes.get(attachmentId)!;
    const entry = {
      id: this.allocate(),
      ...context,
      attachment,
      bytes,
      hash: createHash("sha1").update(bytes).digest("hex"),
    };
    this.fileKeys.set(key, entry);
    this.files.push(entry);
    return entry;
  }
  content(
    plain: string,
    blocks: readonly (ContentBlock | InlineBlock)[] | undefined,
    context: FileContext,
  ): string {
    if (blocks === undefined)
      return plain
        .split(/\n\n+/)
        .map((text) => `<p>${htmlEscape(text).replace(/\n/g, "<br>")}</p>`)
        .join("");
    return blocks
      .map((block) => {
        if (block.kind === "text")
          return `<p>${htmlEscape(block.text).replace(/\n/g, "<br>")}</p>`;
        if (block.kind === "image") {
          const ref = this.file(block.attachmentId, context);
          return `<img src="@@PLUGINFILE@@/${encodeURIComponent(ref.attachment.name)}" alt="${htmlEscape(block.alt)}" style="max-width:100%;height:auto">`;
        }
        return `<table><tbody>${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${this.content("", cell.blocks, context)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      })
      .join("");
  }
  intro(activity: ActivityModel): string {
    const context = {
      context: activity.context,
      component: `mod_${moduleName(activity.source)}`,
      area: "intro",
      item: 0,
    };
    const text = this.content(
      activity.source.description,
      activity.source.descriptionBlocks,
      context,
    );
    const links = activity.source.attachmentIds.map((id) => {
      const file = this.file(id, context);
      return `<li><a href="@@PLUGINFILE@@/${encodeURIComponent(file.attachment.name)}">${htmlEscape(file.attachment.name)}</a></li>`;
    });
    return text + (links.length ? `<ul>${links.join("")}</ul>` : "");
  }
}
export const moduleName = (activity: Activity): string =>
  activity.type === "assignment" ? "assign" : activity.type;
