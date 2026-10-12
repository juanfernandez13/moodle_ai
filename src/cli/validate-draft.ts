import { open } from 'node:fs/promises';
import { validateDraft } from '../domain/course/index.ts';

const MAX_BYTES = 1_048_576;

function report(code: string, message: string, exitCode: number): void {
  console.log(JSON.stringify({ valid: false, issues: [{ code, path: '$', severity: 'error', message }] }));
  process.exitCode = exitCode;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const path = args[0];
  if (args.length !== 1 || !path) {
    report('usage_error', 'Use npm run validate:draft -- <arquivo.json>.', 2);
    return;
  }
  let content: string;
  try {
    const file = await open(path, 'r');
    try {
      if (!(await file.stat()).isFile()) {
        report('file_error', 'Informe um arquivo JSON regular.', 2);
        return;
      }
      // Read at most one byte past the limit, even if the file grows during reading.
      const bytes = Buffer.alloc(MAX_BYTES + 1);
      let length = 0;
      while (length < bytes.length) {
        const { bytesRead } = await file.read(bytes, length, bytes.length - length, null);
        if (bytesRead === 0) break;
        length += bytesRead;
      }
      if (length > MAX_BYTES) {
        report('file_too_large', 'O arquivo JSON deve ter no máximo 1 MiB.', 2);
        return;
      }
      content = bytes.subarray(0, length).toString('utf8');
    } finally {
      await file.close();
    }
  } catch {
    report('file_error', 'Não foi possível ler o arquivo JSON regular informado.', 2);
    return;
  }
  let input: unknown;
  try {
    input = JSON.parse(content);
  } catch {
    report('invalid_json', 'O arquivo não contém JSON válido. Corrija a sintaxe e tente novamente.', 1);
    return;
  }
  const result = validateDraft(input);
  console.log(JSON.stringify(result.valid ? {
    valid: true, issues: [], revision: result.draft.revision,
    summary: {
      sections: result.draft.sections.length,
      activities: result.draft.sections.reduce((count, section) => count + section.activities.length, 0),
      attachments: result.draft.attachments.length,
    },
  } : result));
  process.exitCode = result.valid ? 0 : 1;
}

await main();
