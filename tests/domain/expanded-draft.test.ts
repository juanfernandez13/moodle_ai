import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateDraft } from '../../src/domain/course/index.ts';

function expanded(): Record<string, unknown> {
  const draft = JSON.parse(readFileSync(new URL('../fixtures/course-valid.json', import.meta.url), 'utf8'));
  draft.metadata.summaryBlocks = [{ id: 'summary-text', kind: 'text', text: 'Resumo' }, {
    id: 'summary-table', kind: 'table', rows: [{ blocks: [{ id: 'table-image', kind: 'image', attachmentId: 'attachment-intro', alt: 'Ilustração' }] }].map(cell => [cell]),
  }];
  draft.metadata.teacher = { name: 'Docente', email: 'docente@example.test', qualification: 'Especialista' };
  draft.metadata.workloadHours = 40;
  draft.sections[0].activities.push(
    { id: 'chat-1', type: 'chat', title: 'Conversa', description: '', attachmentIds: [], settings: { repeat: 'weekly', keepDays: 30 } },
    { id: 'wiki-1', type: 'wiki', title: 'Wiki', description: '', attachmentIds: [], settings: { mode: 'collaborative', firstPageTitle: 'Página inicial' } },
    { id: 'glossary-1', type: 'glossary', title: 'Glossário', description: '', attachmentIds: [], settings: { allowDuplicates: false, requireApproval: true, entriesPerPage: 10 }, entries: [{ id: 'entry-1', concept: 'Aprendizagem', definition: 'Processo de aprender.' }] },
  );
  draft.sections[0].activities[4].questions.push(
    { id: 'match-1', type: 'matching', statement: 'Associe', feedback: '', maxMark: 2, pairs: [{ id: 'pair-1', statement: 'Verdade', answer: 'V' }, { id: 'pair-2', statement: 'Falsidade', answer: 'F' }] },
    { id: 'essay-1', type: 'essay', statement: 'Explique', feedback: 'Critérios', settings: { responseFormat: 'editor', responseRequired: true, responseLines: 15, attachments: 0 } },
  );
  return draft;
}

test('expansão aditiva aceita seis módulos, três questões e imagem em tabela', () => {
  assert.equal(validateDraft(expanded()).valid, true);
});

test('blocos rich content referenciam anexos e IDs são únicos globalmente', () => {
  const draft = expanded() as { metadata: { summaryBlocks: Array<{ id: string; kind: string; text?: string; rows?: Array<Array<{ blocks: Array<{ attachmentId: string }> }>> }> } };
  draft.metadata.summaryBlocks[0]!.id = 'course-demo';
  draft.metadata.summaryBlocks[1]!.rows![0]![0]!.blocks[0]!.attachmentId = 'absent';
  const result = validateDraft(draft);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(issue => issue.code === 'duplicate_id' && issue.path === 'metadata.summaryBlocks[0].id'));
  assert.ok(result.issues.some(issue => issue.code === 'missing_attachment' && issue.path.includes('blocks[0].attachmentId')));
});

test('questões/entradas/blocos são estritos e rejeitam HTML arbitrário', () => {
  const draft = expanded();
  const raw = draft as { metadata: { summaryBlocks: Array<Record<string, unknown>> } };
  raw.metadata.summaryBlocks[0]!.html = '<script>secret</script>';
  const result = validateDraft(draft);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(issue => issue.code === 'unknown_field'));
});
