export type DatePane = "plan" | "connection" | "preview" | "result";
export interface DateOperationResult {
  id: string;
  title?: string | undefined;
  status: string;
  message: string;
}
