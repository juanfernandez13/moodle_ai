import type { ContentBlock } from "../../domain/course/index.ts";
import {
  blockText,
  issue,
  type ExtractedDocument,
  type ImportIssue,
  type ImportProfile,
  type ImportProvenance,
} from "./types.ts";

type Item = Record<string, unknown>;
type Destination = {
  item: Item;
  field: string;
  blocksField: string;
  path: string;
};
const object = (value: unknown): Item =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Item)
    : {};
const array = (value: unknown): Item[] =>
  Array.isArray(value) ? (value as Item[]) : [];
const normalized = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
function enumValue(value: string): string {
  const input = normalized(value);
  return (
    (
      {
        arquivo: "file",
        texto: "text",
        ambos: "both",
        geral: "general",
        unica: "single",
        nenhum: "none",
        diaria: "daily",
        semanal: "weekly",
        colaborativo: "collaborative",
        individual: "individual",
        simples: "plain",
      } as Record<string, string>
    )[input] ?? input
  );
}
function booleanValue(value: string): unknown {
  const input = normalized(value);
  return ["true", "sim", "verdadeiro"].includes(input)
    ? true
    : ["false", "nao", "falso"].includes(input)
      ? false
      : value;
}

export function interpretOffline(
  documents: ExtractedDocument[],
  profile: ImportProfile,
): {
  candidate: unknown;
  issues: ImportIssue[];
  fields: ImportProvenance["fields"];
} {
  const prefix = documents[0]?.id ?? "document";
  let sequence = 0;
  const nextId = (kind: string) => `${kind}-${prefix}-${++sequence}`;
  const metadata: Item = {
    summary: "",
    organization: profile === "docx-topicos-v1" ? "topics" : "weeks",
  };
  const sections: Item[] = [];
  const candidate: Item = {
    schemaVersion: 1,
    id: nextId("course"),
    revision: 0,
    metadata,
    sections,
    attachments: documents.flatMap((document) =>
      document.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        size: asset.bytes.length,
        mediaType: asset.mediaType,
      })),
    ),
  };
  const issues: ImportIssue[] = [],
    fields: ImportProvenance["fields"] = [];
  const metadataFacts = new Map<string, unknown>();
  let section: Item | undefined,
    activity: Item | undefined,
    question: Item | undefined,
    option: Item | undefined;
  let sectionIndex = -1,
    activityIndex = -1,
    questionIndex = -1;
  let destination: Destination = {
    item: metadata,
    field: "summary",
    blocksField: "summaryBlocks",
    path: "metadata.summary",
  };
  const sectionPattern =
    profile === "docx-topicos-v1"
      ? /^t[oó]pico(?:\s+\d+)?\s*[:–-]\s*(.+)$/i
      : /^semana(?:\s+\d+)?\s*[:–-]\s*(.+)$/i;
  const activities: Record<string, string> = {
    forum: "forum",
    tarefa: "assignment",
    quiz: "quiz",
    questionario: "quiz",
    chat: "chat",
    wiki: "wiki",
    glossario: "glossary",
  };
  const recordOrigin = (
    path: string,
    sourceId: string,
    block: ContentBlock,
  ) => {
    fields.push({ path, sourceId, blockId: block.id });
  };
  function metadataFact(
    path: string,
    value: unknown,
    apply: () => void,
    sourceId: string,
    block: ContentBlock,
  ): void {
    if (metadataFacts.has(path) && metadataFacts.get(path) !== value)
      issues.push(
        issue(
          "ambiguous_field",
          "Há valores diferentes para este campo nos documentos. Escolha o valor correto na revisão.",
          path,
        ),
      );
    else {
      metadataFacts.set(path, value);
      apply();
    }
    recordOrigin(path, sourceId, block);
  }
  function append(block: ContentBlock, sourceId: string): void {
    const text = blockText(block);
    destination.item[destination.field] = [
      String(destination.item[destination.field] ?? ""),
      text,
    ]
      .filter(Boolean)
      .join("\n\n");
    const blocks = destination.item[destination.blocksField] as
      ContentBlock[] | undefined;
    if (blocks) blocks.push(block);
    else destination.item[destination.blocksField] = [block];
    recordOrigin(destination.path, sourceId, block);
  }
  function readLine(
    text: string,
    block: ContentBlock,
    sourceId: string,
    originBlock: ContentBlock = block,
  ): boolean {
    const lineOrigin = (path: string) =>
      recordOrigin(path, sourceId, originBlock);
    const title = sectionPattern.exec(text);
    if (title) {
      section = {
        id: nextId("section"),
        title: title[1]!.trim(),
        summary: "",
        activities: [],
      };
      sections.push(section);
      sectionIndex++;
      activityIndex = -1;
      activity = undefined;
      question = undefined;
      option = undefined;
      destination = {
        item: section,
        field: "summary",
        blocksField: "summaryBlocks",
        path: `sections[${sectionIndex}].summary`,
      };
      lineOrigin(`sections[${sectionIndex}].title`);
      return true;
    }
    const module =
      /^(f[oó]rum|tarefa|quiz|question[aá]rio|chat|wiki|gloss[aá]rio)\s*:\s*(.+)$/i.exec(
        text,
      );
    if (module) {
      if (!section) {
        issues.push(
          issue(
            "activity_without_section",
            "A atividade precisa estar depois de um título de tópico ou semana.",
            `sources.${sourceId}`,
          ),
        );
        return true;
      }
      const type = activities[normalized(module[1]!)];
      activity = {
        id: nextId("activity"),
        type,
        title: module[2]!.trim(),
        description: "",
        attachmentIds: [],
        settings: {},
      };
      if (type === "quiz") activity.questions = [];
      if (type === "glossary") activity.entries = [];
      array(section.activities).push(activity);
      activityIndex++;
      question = undefined;
      option = undefined;
      destination = {
        item: activity,
        field: "description",
        blocksField: "descriptionBlocks",
        path: `sections[${sectionIndex}].activities[${activityIndex}].description`,
      };
      lineOrigin(
        `sections[${sectionIndex}].activities[${activityIndex}].title`,
      );
      lineOrigin(`sections[${sectionIndex}].activities[${activityIndex}].type`);
      return true;
    }
    const questionTitle =
      /^quest[aã]o\s+(mc|m[uú]ltipla escolha|associativa|discursiva)\s*:\s*(.+)$/i.exec(
        text,
      );
    if (questionTitle) {
      if (activity?.type !== "quiz") {
        issues.push(
          issue(
            "question_without_quiz",
            "A questão precisa estar dentro de um quiz.",
            `sources.${sourceId}`,
          ),
        );
        return true;
      }
      const kind = normalized(questionTitle[1]!);
      const type =
        kind === "associativa"
          ? "matching"
          : kind === "discursiva"
            ? "essay"
            : "multiple-choice";
      question = {
        id: nextId("question"),
        type,
        statement: questionTitle[2]!.trim(),
        feedback: "",
      };
      if (type === "multiple-choice") question.options = [];
      if (type === "matching") question.pairs = [];
      if (type === "essay") question.settings = {};
      array(activity.questions).push(question);
      questionIndex = array(activity.questions).length - 1;
      option = undefined;
      const path = `sections[${sectionIndex}].activities[${activityIndex}].questions[${questionIndex}].statement`;
      destination = {
        item: question,
        field: "statement",
        blocksField: "statementBlocks",
        path,
      };
      if (block.kind === "text")
        question.statementBlocks = [{ ...block, text: question.statement }];
      lineOrigin(path);
      lineOrigin(
        `sections[${sectionIndex}].activities[${activityIndex}].questions[${questionIndex}].type`,
      );
      return true;
    }
    const alternative = /^alternativa( correta)?\s*:\s*(.+)$/i.exec(text);
    if (alternative) {
      if (question?.type !== "multiple-choice") {
        issues.push(
          issue(
            "option_without_question",
            "A alternativa precisa estar dentro de uma questão de múltipla escolha.",
            `sources.${sourceId}`,
          ),
        );
        return true;
      }
      option = {
        id: nextId("option"),
        text: alternative[2]!.trim(),
        fraction: alternative[1] ? 1 : 0,
        feedback: "",
      };
      array(question.options).push(option);
      const path = `sections[${sectionIndex}].activities[${activityIndex}].questions[${questionIndex}].options[${array(question.options).length - 1}].text`;
      destination = {
        item: option,
        field: "text",
        blocksField: "textBlocks",
        path,
      };
      if (block.kind === "text")
        option.textBlocks = [{ ...block, text: option.text }];
      lineOrigin(path);
      lineOrigin(
        `sections[${sectionIndex}].activities[${activityIndex}].questions[${questionIndex}].options[${array(question.options).length - 1}].fraction`,
      );
      return true;
    }
    const pair = /^par\s*:\s*(.+?)\s*=>\s*(.+)$/i.exec(text);
    if (pair) {
      if (question?.type !== "matching") {
        issues.push(
          issue(
            "pair_without_question",
            "O par precisa estar em uma questão associativa.",
            `sources.${sourceId}`,
          ),
        );
        return true;
      }
      const entry = {
        id: nextId("pair"),
        statement: pair[1]!.trim(),
        answer: pair[2]!.trim(),
        ...(block.kind === "text"
          ? { statementBlocks: [{ ...block, text: pair[1]!.trim() }] }
          : {}),
      };
      array(question.pairs).push(entry);
      destination = {
        item: entry,
        field: "statement",
        blocksField: "statementBlocks",
        path: `sections[${sectionIndex}].activities[${activityIndex}].questions[${questionIndex}].pairs[${array(question.pairs).length - 1}].statement`,
      };
      lineOrigin(destination.path);
      lineOrigin(
        `sections[${sectionIndex}].activities[${activityIndex}].questions[${questionIndex}].pairs[${array(question.pairs).length - 1}].answer`,
      );
      return true;
    }
    const label = /^([^:]{1,80}):\s*(.*)$/u.exec(text);
    if (!label) return false;
    const key = normalized(label[1]!),
      value = label[2]!.trim();
    const metadataLabels: Record<string, string> = {
      disciplina: "fullName",
      codigo: "shortName",
      semestre: "semester",
      turma: "className",
      "inicio do curso": "startDate",
      "carga horaria": "workloadHours",
    };
    if (metadataLabels[key]) {
      const field = metadataLabels[key]!,
        interpretedValue = field === "workloadHours" ? Number(value) : value;
      metadataFact(
        `metadata.${field}`,
        interpretedValue,
        () => {
          metadata[field] = interpretedValue;
        },
        sourceId,
        originBlock,
      );
      return true;
    }
    if (
      key === "professor" ||
      key === "email do professor" ||
      key === "titulacao"
    ) {
      const teacher = object(metadata.teacher);
      metadata.teacher = teacher;
      const field =
        key === "professor"
          ? "name"
          : key === "email do professor"
            ? "email"
            : "qualification";
      metadataFact(
        `metadata.teacher.${field}`,
        value,
        () => {
          teacher[field] = value;
        },
        sourceId,
        originBlock,
      );
      return true;
    }
    if (key === "resumo" && !section) {
      metadataFact(
        "metadata.summary",
        value,
        () => {
          metadata.summary = value;
          if (block.kind === "text")
            metadata.summaryBlocks = [{ ...block, text: value }];
        },
        sourceId,
        originBlock,
      );
      return true;
    }
    if (key === "descricao") {
      if (block.kind === "text") append({ ...block, text: value }, sourceId);
      return true;
    }
    if (key === "feedback" && question) {
      const target = option ?? question;
      target.feedback = value;
      if (block.kind === "text")
        target.feedbackBlocks = [{ ...block, text: value }];
      const path = `sections[${sectionIndex}].activities[${activityIndex}].questions[${questionIndex}]${option ? `.options[${array(question.options).indexOf(option)}]` : ""}.feedback`;
      destination = {
        item: target,
        field: "feedback",
        blocksField: "feedbackBlocks",
        path,
      };
      lineOrigin(path);
      return true;
    }
    if (key === "conceito" && activity?.type === "glossary") {
      const entry: Item = {
        id: nextId("entry"),
        concept: value,
        definition: "",
      };
      array(activity.entries).push(entry);
      destination = {
        item: entry,
        field: "definition",
        blocksField: "definitionBlocks",
        path: `sections[${sectionIndex}].activities[${activityIndex}].entries[${array(activity.entries).length - 1}].definition`,
      };
      lineOrigin(
        `sections[${sectionIndex}].activities[${activityIndex}].entries[${array(activity.entries).length - 1}].concept`,
      );
      return true;
    }
    if (key === "definicao" && activity?.type === "glossary") {
      if (block.kind === "text") append({ ...block, text: value }, sourceId);
      return true;
    }
    if ((key === "abre" || key === "fecha") && activity) {
      const schedule = object(activity.schedule),
        field = key === "abre" ? "opensAt" : "closesAt";
      activity.schedule = schedule;
      schedule[field] = value;
      lineOrigin(
        `sections[${sectionIndex}].activities[${activityIndex}].schedule.${field}`,
      );
      return true;
    }
    if (key === "pontuacao" && question) {
      question.maxMark = Number(value);
      lineOrigin(
        `sections[${sectionIndex}].activities[${activityIndex}].questions[${questionIndex}].maxMark`,
      );
      return true;
    }
    if (!activity) return false;
    const settings = object(activity.settings);
    const activitySettings: Record<
      string,
      [string, string, (value: string) => unknown]
    > = {
      discussao: ["forum", "discussionMode", enumValue],
      nota: [String(activity.type), "maxGrade", Number],
      envio: ["assignment", "submissionMode", enumValue],
      tentativas: ["quiz", "attempts", Number],
      embaralhar: ["quiz", "shuffleQuestions", booleanValue],
      repeticao: ["chat", "repeat", enumValue],
      "reter dias": ["chat", "keepDays", Number],
      sessao: ["chat", "sessionAt", (input) => input],
      modo: ["wiki", "mode", enumValue],
      "pagina inicial": ["wiki", "firstPageTitle", (input) => input],
      duplicatas: ["glossary", "allowDuplicates", booleanValue],
      aprovacao: ["glossary", "requireApproval", booleanValue],
      "entradas por pagina": ["glossary", "entriesPerPage", Number],
    };
    const setting = activitySettings[key];
    if (setting) {
      if (
        activity.type !== setting[0] ||
        (key === "nota" &&
          !["assignment", "quiz"].includes(String(activity.type)))
      ) {
        issues.push(
          issue(
            "setting_wrong_activity",
            "A configuração está associada a um tipo de atividade diferente.",
            `sources.${sourceId}`,
          ),
        );
        return true;
      }
      settings[setting[1]] = setting[2](value);
      lineOrigin(
        `sections[${sectionIndex}].activities[${activityIndex}].settings.${setting[1]}`,
      );
      return true;
    }
    if (question?.type === "essay") {
      const essaySettings: Record<
        string,
        [string, (value: string) => unknown]
      > = {
        "formato da resposta": ["responseFormat", enumValue],
        "resposta obrigatoria": ["responseRequired", booleanValue],
        linhas: ["responseLines", Number],
        "anexos permitidos": ["attachments", Number],
      };
      const setting = essaySettings[key];
      if (setting) {
        object(question.settings)[setting[0]] = setting[1](value);
        lineOrigin(
          `sections[${sectionIndex}].activities[${activityIndex}].questions[${questionIndex}].settings.${setting[0]}`,
        );
        return true;
      }
    }
    return false;
  }
  for (const document of documents)
    for (const block of document.blocks) {
      if (block.kind === "text") {
        if (!readLine(block.text.trim(), block, document.id))
          append(block, document.id);
      } else if (block.kind === "table") {
        const rows = block.rows.map((row) =>
          row.map((cell) => cell.blocks.map(blockText).join(" ").trim()),
        );
        const metadataKeys = [
          "disciplina",
          "codigo",
          "semestre",
          "turma",
          "inicio do curso",
          "carga horaria",
          "professor",
          "email do professor",
          "titulacao",
          "resumo",
        ];
        const labelRows = rows.every(
          (row) =>
            row.length === 2 &&
            metadataKeys.includes(
              normalized((row[0] ?? "").replace(/:$/, "")),
            ) &&
            row[1] !== "" &&
            !block.rows.some((row) =>
              row.some((cell) =>
                cell.blocks.some((item) => item.kind === "image"),
              ),
            ),
        );
        if (
          labelRows &&
          rows.every((row, index) =>
            readLine(
              `${row[0]!.replace(/:$/, "")}: ${row[1]}`,
              { id: `${block.id}-label-${index}`, kind: "text", text: "" },
              document.id,
              block,
            ),
          )
        )
          continue;
        append(block, document.id);
      } else append(block, document.id);
    }
  if (sections.length === 0)
    issues.push(
      issue(
        "profile_not_recognized",
        profile === "docx-topicos-v1"
          ? "Use títulos como “Tópico 1: Introdução” e os campos Disciplina e Código do perfil por tópicos."
          : "Use títulos como “Semana 1: Introdução” e os campos Disciplina e Código do perfil semanal.",
      ),
    );
  return { candidate, issues, fields };
}
