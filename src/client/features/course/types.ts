import type { ValidationIssue, ContentBlock } from "../../../domain/course/index.ts";
import type { CourseProject } from "../../project.ts";

export type View = string;
export type UiIssue = Omit<ValidationIssue, "severity"> & {
  severity: "error" | "warning";
};
export type ImportProposal = {
  project: CourseProject;
  issues: UiIssue[];
  preview: {
    name: string;
    blocks: ContentBlock[]
  }[];
};
