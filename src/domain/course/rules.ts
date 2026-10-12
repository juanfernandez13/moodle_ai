import type { CourseDraft, Activity, ContentBlock, InlineBlock } from './schema.ts';
import type { ValidationIssue } from './validate-draft.ts';

function isAfter(opensAt: string, closesAt: string): boolean {
  const openingSecond = Date.parse(opensAt.replace(/\.\d+/, ''));
  const closingSecond = Date.parse(closesAt.replace(/\.\d+/, ''));
  if (openingSecond !== closingSecond) return openingSecond > closingSecond;

  // Frações decimais são comparadas como texto para conservar toda a precisão aceita.
  const openingFraction = opensAt.match(/\.(\d+)/)?.[1] ?? '';
  const closingFraction = closesAt.match(/\.(\d+)/)?.[1] ?? '';
  const precision = Math.max(openingFraction.length, closingFraction.length);
  return openingFraction.padEnd(precision, '0') > closingFraction.padEnd(precision, '0');
}

export function validateDomainRules(draft: CourseDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const entityIds = new Set<string>();
  const attachmentIds = new Set(draft.attachments.map((attachment) => attachment.id));
  const activitiesById = new Map<string, Activity>();

  function add(code: string, path: string, message: string): void {
    issues.push({ code, path, severity: 'error', message });
  }

  function registerId(id: string, path: string): void {
    if (entityIds.has(id)) {
      add('duplicate_id', path, 'O identificador deve ser único entre todas as entidades do rascunho.');
    }
    entityIds.add(id);
  }

  registerId(draft.id, 'id');
  function inspectBlocks(blocks: readonly (ContentBlock | InlineBlock)[] | undefined, path: string): void {
    blocks?.forEach((block, index) => {
      const blockPath = `${path}[${index}]`;
      registerId(block.id, `${blockPath}.id`);
      if (block.kind === 'image' && !attachmentIds.has(block.attachmentId)) {
        add('missing_attachment', `${blockPath}.attachmentId`, 'A imagem deve apontar para um anexo declarado no rascunho.');
      }
      if (block.kind === 'table') block.rows.forEach((row, rowIndex) => row.forEach((cell, cellIndex) => inspectBlocks(cell.blocks, `${blockPath}.rows[${rowIndex}][${cellIndex}].blocks`)));
    });
  }
  inspectBlocks(draft.metadata.summaryBlocks, 'metadata.summaryBlocks');
  draft.sections.forEach((section, sectionIndex) => {
    const sectionPath = `sections[${sectionIndex}]`;
    registerId(section.id, `${sectionPath}.id`);
    inspectBlocks(section.summaryBlocks, `${sectionPath}.summaryBlocks`);
    section.activities.forEach((activity, activityIndex) => {
      const activityPath = `${sectionPath}.activities[${activityIndex}]`;
      registerId(activity.id, `${activityPath}.id`);
      activitiesById.set(activity.id, activity);
      inspectBlocks(activity.descriptionBlocks, `${activityPath}.descriptionBlocks`);
      const schedule = activity.schedule;
      if (schedule?.opensAt !== undefined && schedule.closesAt !== undefined &&
        isAfter(schedule.opensAt, schedule.closesAt)) {
        add('inverted_schedule', `${activityPath}.schedule.closesAt`,
          'O fechamento deve ocorrer no mesmo instante ou depois da abertura.');
      }
      const usedAttachments = new Set<string>();
      activity.attachmentIds.forEach((id, referenceIndex) => {
        const path = `${activityPath}.attachmentIds[${referenceIndex}]`;
        if (!attachmentIds.has(id)) {
          add('missing_attachment', path, 'A referência deve apontar para um anexo declarado no rascunho.');
        }
        if (usedAttachments.has(id)) {
          add('duplicate_reference', path, 'O mesmo anexo não pode ser referenciado duas vezes na atividade.');
        }
        usedAttachments.add(id);
      });
      if (activity.type === 'quiz') {
        activity.questions.forEach((question, questionIndex) => {
          const questionPath = `${activityPath}.questions[${questionIndex}]`;
          registerId(question.id, `${questionPath}.id`);
          inspectBlocks(question.statementBlocks, `${questionPath}.statementBlocks`);
          inspectBlocks(question.feedbackBlocks, `${questionPath}.feedbackBlocks`);
          if (question.type === 'multiple-choice' && (question.options.filter((option) => option.fraction === 1).length !== 1 ||
            question.options.some((option) => option.fraction !== 0 && option.fraction !== 1))) {
            add('invalid_single_choice', `${questionPath}.options`,
              'A questão deve ter exatamente uma alternativa com fração 1 e todas as demais com fração 0.');
          }
          if (question.type === 'multiple-choice') question.options.forEach((option, optionIndex) => {
            registerId(option.id, `${questionPath}.options[${optionIndex}].id`);
            inspectBlocks(option.textBlocks, `${questionPath}.options[${optionIndex}].textBlocks`);
            inspectBlocks(option.feedbackBlocks, `${questionPath}.options[${optionIndex}].feedbackBlocks`);
          });
          if (question.type === 'matching') question.pairs.forEach((pair, pairIndex) => {
            registerId(pair.id, `${questionPath}.pairs[${pairIndex}].id`);
            inspectBlocks(pair.statementBlocks, `${questionPath}.pairs[${pairIndex}].statementBlocks`);
          });
        });
      }
      if (activity.type === 'glossary') activity.entries.forEach((entry, entryIndex) => {
        registerId(entry.id, `${activityPath}.entries[${entryIndex}].id`);
        inspectBlocks(entry.definitionBlocks, `${activityPath}.entries[${entryIndex}].definitionBlocks`);
      });
    });
  });
  draft.attachments.forEach((attachment, index) => registerId(attachment.id, `attachments[${index}].id`));
  const categorizedActivities = new Set<string>();
  draft.gradebook?.categories.forEach((category, index) => {
    const categoryPath = `gradebook.categories[${index}]`;
    registerId(category.id, `${categoryPath}.id`);
    const categoryActivities = new Set<string>();
    category.activityIds.forEach((id, referenceIndex) => {
      const path = `${categoryPath}.activityIds[${referenceIndex}]`;
      if (!activitiesById.has(id)) {
        add('missing_activity', path,
          'A referência deve apontar para uma atividade declarada no rascunho.');
      }
      const activityType = activitiesById.get(id)?.type;
      if (activityType !== undefined && activityType !== 'assignment' && activityType !== 'quiz') {
        add('ungradable_activity', path, 'A categoria de notas só pode referenciar tarefas e quizzes.');
      }
      if (categoryActivities.has(id)) {
        add('duplicate_reference', path, 'A mesma atividade não pode aparecer duas vezes na categoria.');
      } else if (categorizedActivities.has(id)) {
        add('activity_in_multiple_categories', path, 'Cada atividade avaliável pode pertencer a no máximo uma categoria.');
      }
      categoryActivities.add(id);
      categorizedActivities.add(id);
    });
  });
  if (draft.gradebook !== undefined) {
    const totalWeight = draft.gradebook.categories.reduce((total, category) => total + category.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.000001) {
      add('invalid_category_weights', 'gradebook.categories',
        'A soma dos pesos das categorias deve ser 100, com tolerância de 0,000001.');
    }
  }
  return issues;
}
