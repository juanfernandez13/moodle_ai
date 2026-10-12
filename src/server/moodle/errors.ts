export class MoodleError extends Error {
  code: string;
  uncertain: boolean;
  constructor(code: string, message: string, uncertain = false) {
    super(message);
    this.name = "MoodleError";
    this.code = code;
    this.uncertain = uncertain;
  }
}
