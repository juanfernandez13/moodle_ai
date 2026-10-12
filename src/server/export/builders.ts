import {
  ExportModel,
  document,
  field,
  fields,
  moduleName,
  timestamp,
  type ActivityModel,
  type FileContext,
  type QuestionModel,
} from "./model.ts";

const nil = "$@NULL@$";
const empty = (root: string, inner = ""): string =>
  document(`<${root}>${inner}</${root}>`);
const tagged = (
  name: string,
  id: number,
  content: string,
  attributes: Record<string, string | number> = {},
): string =>
  `<${name} id="${id}"${Object.entries(attributes)
    .map(([key, value]) => ` ${key}="${value}"`)
    .join("")}>${content}</${name}>`;
const activityDocument = (activity: ActivityModel, inner: string): string =>
  document(
    `<activity id="${activity.id}" moduleid="${activity.id}" modulename="${moduleName(activity.source)}" contextid="${activity.context}">${tagged(moduleName(activity.source), activity.id, inner)}</activity>`,
  );
export function inforef(
  options: { grade?: number; files?: number[]; categories?: number[] } = {},
): string {
  const refs = (name: string, ids: number[]) =>
    `<${name}ref>${ids.map((id) => `<${name}>${field("id", id)}</${name}>`).join("")}</${name}ref>`;
  return empty(
    "inforef",
    (options.grade === undefined ? "" : refs("grade_item", [options.grade])) +
      (options.files?.length ? refs("file", options.files) : "") +
      (options.categories?.length
        ? refs("question_category", options.categories)
        : ""),
  );
}
function availability(activity: ActivityModel): string {
  const schedule = activity.source.schedule;
  const conditions = [];
  if (schedule?.opensAt !== undefined)
    conditions.push({ type: "date", d: ">=", t: timestamp(schedule.opensAt) });
  if (schedule?.closesAt !== undefined)
    conditions.push({ type: "date", d: "<", t: timestamp(schedule.closesAt) });
  return conditions.length
    ? JSON.stringify({
        op: "&",
        c: conditions,
        showc: conditions.map(() => true),
      })
    : nil;
}
function moduleXml(activity: ActivityModel, now: number): string {
  return document(
    tagged(
      "module",
      activity.id,
      fields({
        modulename: moduleName(activity.source),
        sectionid: activity.sectionId,
        sectionnumber: activity.sectionNumber,
        idnumber: activity.source.id,
        added: now,
        score: 0,
        indent: 0,
        visible: 1,
        visibleoncoursepage: 1,
        visibleold: 1,
        groupmode: 0,
        groupingid: 0,
        completion: 0,
        completiongradeitemnumber: nil,
        completionpassgrade: 0,
        completionview: 0,
        completionexpected: 0,
        availability: availability(activity),
        showdescription: 0,
        downloadcontent: 1,
        lang: "",
      }) + "<tags/>",
      {
        version:
          activity.source.type === "forum" ||
          activity.source.type === "assignment"
            ? 2022112801
            : 2022112800,
      },
    ),
  );
}
function activityXml(model: ExportModel, activity: ActivityModel): string {
  const source = activity.source;
  const now = model.now;
  const common = {
    name: source.title,
    intro: model.intro(activity),
    introformat: 1,
  };
  const open = timestamp(source.schedule?.opensAt);
  const close = timestamp(source.schedule?.closesAt);
  switch (source.type) {
    case "forum":
      return activityDocument(
        activity,
        fields({
          ...common,
          type: source.settings.discussionMode,
          duedate: close,
          cutoffdate: close,
          assessed: 0,
          assesstimestart: 0,
          assesstimefinish: 0,
          scale: 0,
          maxbytes: 0,
          maxattachments: 9,
          forcesubscribe: 0,
          trackingtype: 1,
          rsstype: 0,
          rssarticles: 0,
          timemodified: now,
          warnafter: 0,
          blockafter: 0,
          blockperiod: 0,
          completiondiscussions: 0,
          completionreplies: 0,
          completionposts: 0,
          displaywordcount: 0,
          lockdiscussionafter: 0,
          grade_forum: 0,
        }) +
          "<discussions/><subscriptions/><digests/><readposts/><trackedprefs/><poststags/><grades/>",
      );
    case "assignment": {
      const config = (
        plugin: string,
        name: string,
        value: string | number,
        id: number,
      ) =>
        tagged(
          "plugin_config",
          id,
          fields({ plugin, subtype: "assignsubmission", name, value }),
        );
      return activityDocument(
        activity,
        fields({
          ...common,
          alwaysshowdescription: 1,
          submissiondrafts: 0,
          sendnotifications: 0,
          sendlatenotifications: 0,
          sendstudentnotifications: 1,
          duedate: close,
          cutoffdate: close,
          gradingduedate: 0,
          allowsubmissionsfromdate: open,
          grade: source.settings.maxGrade,
          timemodified: now,
          completionsubmit: 0,
          requiresubmissionstatement: 0,
          teamsubmission: 0,
          requireallteammemberssubmit: 0,
          teamsubmissiongroupingid: 0,
          blindmarking: 0,
          hidegrader: 0,
          revealidentities: 0,
          attemptreopenmethod: "none",
          maxattempts: -1,
          markingworkflow: 0,
          markingallocation: 0,
          preventsubmissionnotingroup: 0,
          activity: "",
          activityformat: 1,
          timelimit: 0,
          submissionattachments: 0,
        }) +
          "<userflags/><submissions/><grades/><plugin_configs>" +
          config(
            "onlinetext",
            "enabled",
            source.settings.submissionMode === "file" ? 0 : 1,
            activity.pluginIds[0]!,
          ) +
          config(
            "file",
            "enabled",
            source.settings.submissionMode === "text" ? 0 : 1,
            activity.pluginIds[1]!,
          ) +
          config("file", "maxfilesubmissions", 20, activity.pluginIds[2]!) +
          config("file", "maxsubmissionsizebytes", 0, activity.pluginIds[3]!) +
          config("file", "filetypeslist", "", activity.pluginIds[4]!) +
          "</plugin_configs><overrides/>",
      );
    }
    case "quiz": {
      const slots = activity.questions
        .map((question, index) =>
          tagged(
            "question_instance",
            question.slot,
            fields({
              quizid: activity.id,
              slot: index + 1,
              page: index + 1,
              requireprevious: 0,
              maxmark: question.source.maxMark ?? 1,
            }) +
              tagged(
                "question_reference",
                question.reference,
                fields({
                  usingcontextid: activity.context,
                  component: "mod_quiz",
                  questionarea: "slot",
                  questionbankentryid: question.bank,
                  version: 1,
                }),
              ),
          ),
        )
        .join("");
      return activityDocument(
        activity,
        fields({
          ...common,
          timeopen: open,
          timeclose: close,
          timelimit: 0,
          overduehandling: "autosubmit",
          graceperiod: 0,
          preferredbehaviour: "deferredfeedback",
          canredoquestions: 0,
          attempts_number: source.settings.attempts,
          attemptonlast: 0,
          grademethod: 1,
          decimalpoints: 2,
          questiondecimalpoints: -1,
          reviewattempt: 69904,
          reviewcorrectness: 4368,
          reviewmarks: 4368,
          reviewspecificfeedback: 4368,
          reviewgeneralfeedback: 4368,
          reviewrightanswer: 16,
          reviewoverallfeedback: 16,
          questionsperpage: 1,
          navmethod: "free",
          shuffleanswers: 0,
          sumgrades: source.questions.reduce(
            (sum, q) => sum + (q.maxMark ?? 1),
            0,
          ),
          grade: source.settings.maxGrade,
          timecreated: now,
          timemodified: now,
          password: "",
          subnet: "",
          browsersecurity: "-",
          delay1: 0,
          delay2: 0,
          showuserpicture: 0,
          showblocks: 0,
          completionattemptsexhausted: 0,
          completionminattempts: 0,
          allowofflineattempts: 0,
        }) +
          `<question_instances>${slots}</question_instances><sections>${tagged("section", activity.pluginIds[0]!, fields({ firstslot: 1, heading: "", shufflequestions: source.settings.shuffleQuestions }))}</sections><feedbacks/><overrides/><grades/><attempts/>`,
      );
    }
    case "chat":
      return activityDocument(
        activity,
        fields({
          ...common,
          keepdays: source.settings.keepDays,
          studentlogs: 0,
          chattime: timestamp(source.settings.sessionAt),
          schedule:
            source.settings.repeat === "none"
              ? 0
              : source.settings.repeat === "daily"
                ? 2
                : 3,
          timemodified: now,
        }) + "<messages/><users/>",
      );
    case "wiki":
      return activityDocument(
        activity,
        fields({
          ...common,
          timecreated: now,
          timemodified: now,
          firstpagetitle: source.settings.firstPageTitle,
          wikimode: source.settings.mode,
          defaultformat: "html",
          forceformat: 1,
          editbegin: 0,
          editend: 0,
        }) + "<subwikis/>",
      );
    case "glossary": {
      const entries = source.entries
        .map((entry) => {
          const id = activity.entryIds.get(entry.id)!;
          const definition = model.content(
            entry.definition,
            entry.definitionBlocks,
            {
              context: activity.context,
              component: "mod_glossary",
              area: "entry",
              item: id,
            },
          );
          return tagged(
            "entry",
            id,
            fields({
              concept: entry.concept,
              definition,
              definitionformat: 1,
              definitiontrust: 0,
              attachment: 0,
              timecreated: now,
              timemodified: now,
              teacherentry: 1,
              sourceglossaryid: 0,
              usedynalink: 0,
              casesensitive: 0,
              fullmatch: 0,
              approved: 1,
              userid: 0,
            }) + "<aliases/><categories/><ratings/>",
          );
        })
        .join("");
      return activityDocument(
        activity,
        fields({
          ...common,
          allowduplicatedentries: source.settings.allowDuplicates,
          displayformat: "dictionary",
          mainglossary: 0,
          showspecial: 1,
          showalphabet: 1,
          showall: 1,
          allowcomments: 0,
          allowprintview: 1,
          usedynalink: 0,
          defaultapproval: !source.settings.requireApproval,
          globalglossary: 0,
          entbypage: source.settings.entriesPerPage,
          editalways: 0,
          rsstype: 0,
          rssarticles: 0,
          assessed: 0,
          assesstimestart: 0,
          assesstimefinish: 0,
          scale: 0,
          timecreated: now,
          timemodified: now,
          completionentries: 0,
        }) + `<entries>${entries}</entries><categories/>`,
      );
    }
  }
}
function questionXml(
  model: ExportModel,
  activity: ActivityModel,
  question: QuestionModel,
): string {
  const source = question.source;
  const context = (
    area: string,
    item: number,
    component = "question",
  ): FileContext => ({ context: activity.context, component, area, item });
  let plugin = "";
  let type = "";
  if (source.type === "multiple-choice") {
    type = "multichoice";
    const answers = source.options
      .map((option) => {
        const id = question.options.get(option.id)!;
        return tagged(
          "answer",
          id,
          fields({
            answertext: model.content(
              option.text,
              option.textBlocks,
              context("answer", id),
            ),
            answerformat: 1,
            fraction: option.fraction,
            feedback: model.content(
              option.feedback,
              option.feedbackBlocks,
              context("answerfeedback", id),
            ),
            feedbackformat: 1,
          }),
        );
      })
      .join("");
    plugin = `<plugin_qtype_multichoice_question><answers>${answers}</answers>${tagged("multichoice", question.plugin, fields({ layout: 0, single: 1, shuffleanswers: 0, correctfeedback: "", correctfeedbackformat: 1, partiallycorrectfeedback: "", partiallycorrectfeedbackformat: 1, incorrectfeedback: "", incorrectfeedbackformat: 1, answernumbering: "abc", shownumcorrect: 0, showstandardinstruction: 0 }))}</plugin_qtype_multichoice_question>`;
  } else if (source.type === "matching") {
    type = "match";
    const matches = source.pairs
      .map((pair) => {
        const id = question.options.get(pair.id)!;
        return tagged(
          "match",
          id,
          fields({
            questiontext: model.content(
              pair.statement,
              pair.statementBlocks,
              context("subquestion", id, "qtype_match"),
            ),
            questiontextformat: 1,
            answertext: pair.answer,
          }),
        );
      })
      .join("");
    plugin = `<plugin_qtype_match_question>${tagged("matchoptions", question.plugin, fields({ shuffleanswers: 0, correctfeedback: "", correctfeedbackformat: 1, partiallycorrectfeedback: "", partiallycorrectfeedbackformat: 1, incorrectfeedback: "", incorrectfeedbackformat: 1, shownumcorrect: 0 }))}<matches>${matches}</matches></plugin_qtype_match_question>`;
  } else {
    type = "essay";
    plugin = `<plugin_qtype_essay_question>${tagged("essay", question.plugin, fields({ responseformat: source.settings.responseFormat, responserequired: source.settings.responseRequired, responsefieldlines: source.settings.responseLines, minwordlimit: nil, maxwordlimit: nil, attachments: source.settings.attachments, attachmentsrequired: 0, maxbytes: 0, filetypeslist: nil, graderinfo: "", graderinfoformat: 1, responsetemplate: "", responsetemplateformat: 1 }))}</plugin_qtype_essay_question>`;
  }
  const text =
    fields({
      parent: 0,
      name: source.id,
      questiontext: model.content(
        source.statement,
        source.statementBlocks,
        context("questiontext", question.id),
      ),
      questiontextformat: 1,
      generalfeedback: model.content(
        source.feedback,
        source.feedbackBlocks,
        context("generalfeedback", question.id),
      ),
      generalfeedbackformat: 1,
      defaultmark: source.maxMark ?? 1,
      penalty: 0,
      qtype: type,
      length: 1,
      stamp: `moodleai-${question.id}-${model.backupId}`,
      timecreated: model.now,
      timemodified: model.now,
      createdby: nil,
      modifiedby: nil,
    }) +
    plugin +
    "<question_hints/><tags/>";
  return tagged(
    "question_bank_entry",
    question.bank,
    fields({
      questioncategoryid: activity.questionCategory!,
      idnumber: source.id,
      ownerid: nil,
    }) +
      `<question_version>${tagged("question_versions", question.version, fields({ version: 1, status: "ready" }) + `<questions>${tagged("question", question.id, text)}</questions>`)}</question_version>`,
  );
}
function questionsXml(model: ExportModel): string {
  const categories = model.activities
    .filter((activity) => activity.source.type === "quiz")
    .map((activity) => {
      const common = {
        contextid: activity.context,
        contextlevel: 70,
        contextinstanceid: activity.id,
        info: "",
        infoformat: 0,
        stamp: `moodleai-${activity.id}-${model.backupId}`,
        sortorder: 0,
        idnumber: nil,
      };
      return (
        tagged(
          "question_category",
          activity.questionTop!,
          fields({ ...common, name: "top", parent: 0 }) +
            "<question_bank_entries/>",
        ) +
        tagged(
          "question_category",
          activity.questionCategory!,
          fields({
            ...common,
            name: activity.source.title,
            parent: activity.questionTop!,
          }) +
            `<question_bank_entries>${activity.questions.map((question) => questionXml(model, activity, question)).join("")}</question_bank_entries>`,
        )
      );
    })
    .join("");
  return empty("question_categories", categories);
}
function gradeItem(
  id: number,
  values: Record<string, string | number>,
  now: number,
): string {
  return tagged(
    "grade_item",
    id,
    fields({
      categoryid: nil,
      itemname: nil,
      itemtype: "course",
      itemmodule: nil,
      iteminstance: 0,
      itemnumber: nil,
      iteminfo: "",
      idnumber: "",
      calculation: nil,
      gradetype: 1,
      grademax: 100,
      grademin: 0,
      scaleid: nil,
      outcomeid: nil,
      gradepass: 0,
      multfactor: 1,
      plusfactor: 0,
      aggregationcoef: 1,
      aggregationcoef2: 0,
      weightoverride: 0,
      sortorder: 1,
      display: 0,
      decimals: nil,
      hidden: 0,
      locked: 0,
      locktime: 0,
      needsupdate: 0,
      timecreated: now,
      timemodified: now,
      ...values,
    }) + "<grade_grades/>",
  );
}
function activityGrades(model: ExportModel, activity: ActivityModel): string {
  if (activity.gradeId === undefined)
    return empty("activity_gradebook", "<grade_items/><grade_letters/>");
  const source = activity.source;
  const max =
    source.type === "assignment" || source.type === "quiz"
      ? source.settings.maxGrade
      : 0;
  return empty(
    "activity_gradebook",
    `<grade_items>${gradeItem(activity.gradeId, { categoryid: activity.gradeCategory!, itemname: source.title, itemtype: "mod", itemmodule: moduleName(source), iteminstance: activity.id, itemnumber: 0, grademax: max, sortorder: activity.gradeSort! }, model.now)}</grade_items><grade_letters/>`,
  );
}
function gradebook(model: ExportModel): string {
  const category = (id: number, name: string, parent: number | undefined) =>
    tagged(
      "grade_category",
      id,
      fields({
        parent: parent ?? nil,
        depth: parent === undefined ? 1 : 2,
        path: parent === undefined ? `/${id}/` : `/${parent}/${id}/`,
        fullname: name,
        aggregation: 10,
        keephigh: 0,
        droplow: 0,
        aggregateonlygraded: 0,
        aggregateoutcomes: 0,
        timecreated: model.now,
        timemodified: model.now,
        hidden: 0,
      }),
    );
  const categories =
    category(model.rootGrade, "?", undefined) +
    model.categories
      .map((cat) => category(cat.id, cat.source.name, model.rootGrade))
      .join("");
  const items =
    gradeItem(
      model.courseGrade,
      { itemtype: "course", iteminstance: model.rootGrade, sortorder: 1 },
      model.now,
    ) +
    model.categories
      .map((cat) =>
        gradeItem(
          cat.item,
          {
            itemtype: "category",
            iteminstance: cat.id,
            sortorder: cat.sort,
            aggregationcoef: cat.source.weight,
          },
          model.now,
        ),
      )
      .join("");
  return empty(
    "gradebook",
    `<attributes/><grade_categories>${categories}</grade_categories><grade_items>${items}</grade_items><grade_letters/><grade_settings>${tagged("grade_setting", model.allocate(), fields({ name: "minmaxtouse", value: 1 }))}</grade_settings>`,
  );
}
function filesXml(model: ExportModel): string {
  const seen = new Set<string>();
  const rows: string[] = [];
  for (const file of model.files) {
    const key = `${file.context}:${file.component}:${file.area}:${file.item}`;
    const values = {
      contextid: file.context,
      component: file.component,
      filearea: file.area,
      itemid: file.item,
      filepath: "/",
      userid: nil,
      status: 0,
      timecreated: model.now,
      timemodified: model.now,
      source: nil,
      author: nil,
      license: "allrightsreserved",
      sortorder: 0,
      repositorytype: nil,
      repositoryid: nil,
      reference: nil,
    };
    if (!seen.has(key)) {
      seen.add(key);
      rows.push(
        tagged(
          "file",
          model.allocate(),
          fields({
            ...values,
            contenthash: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
            filename: ".",
            filesize: 0,
            mimetype: nil,
          }),
        ),
      );
    }
    rows.push(
      tagged(
        "file",
        file.id,
        fields({
          ...values,
          contenthash: file.hash,
          filename: file.attachment.name,
          filesize: file.bytes.byteLength,
          mimetype: file.attachment.mediaType,
          source: file.attachment.name,
        }),
      ),
    );
  }
  return empty("files", rows.join(""));
}
export function buildBackup(model: ExportModel): Map<string, Uint8Array> {
  const entries = new Map<string, Uint8Array>();
  const write = (name: string, value: string | Uint8Array) =>
    entries.set(
      name,
      typeof value === "string" ? Buffer.from(value, "utf8") : value,
    );
  const sections = [
    {
      id: model.sectionZero,
      number: 0,
      title: "Geral",
      summary: "",
      activities: [] as ActivityModel[],
    },
    ...model.sections.map((sec) => ({
      id: sec.id,
      number: sec.number,
      title: sec.source.title,
      summary: model.content(sec.source.summary, sec.source.summaryBlocks, {
        context: model.courseContext,
        component: "course",
        area: "section",
        item: sec.id,
      }),
      activities: sec.activities,
    })),
  ];
  const acts = model.activities
    .map(
      (activity) =>
        `<activity>${fields({ moduleid: activity.id, sectionid: activity.sectionId, modulename: moduleName(activity.source), title: activity.source.title, directory: `activities/${moduleName(activity.source)}_${activity.id}` })}</activity>`,
    )
    .join("");
  const contents = `<contents><activities>${acts}</activities><sections>${sections.map((sec) => `<section>${fields({ sectionid: sec.id, title: sec.title, directory: `sections/section_${sec.id}` })}</section>`).join("")}</sections><course>${fields({ courseid: model.courseId, title: model.draft.metadata.shortName, directory: "course" })}</course></contents>`;
  const setting = (level: string, name: string, value: string, key?: string) =>
    `<setting>${fields({ level, ...(key ? { [level]: key } : {}), name, value })}</setting>`;
  const editorialEntries = (act: ActivityModel) =>
    act.source.type === "glossary" && act.source.entries.length > 0;
  const hasEditorialEntries = model.activities.some(editorialEntries);
  const settings =
    setting("root", "users", hasEditorialEntries ? "1" : "0") +
    ["anonymize", "role_assignments", "groups"]
      .map((name) => setting("root", name, "0"))
      .join("") +
    ["activities", "files"].map((name) => setting("root", name, "1")).join("") +
    setting("root", "filename", "backup.mbz") +
    setting("root", "blocks", "0") +
    sections
      .map(
        (sec) =>
          setting(
            "section",
            `section_${sec.id}_included`,
            "1",
            `section_${sec.id}`,
          ) +
          setting(
            "section",
            `section_${sec.id}_userinfo`,
            sec.activities.some(editorialEntries) ? "1" : "0",
            `section_${sec.id}`,
          ),
      )
      .join("") +
    model.activities
      .map(
        (act) =>
          setting(
            "activity",
            `${moduleName(act.source)}_${act.id}_included`,
            "1",
            `${moduleName(act.source)}_${act.id}`,
          ) +
          setting(
            "activity",
            `${moduleName(act.source)}_${act.id}_userinfo`,
            editorialEntries(act) ? "1" : "0",
            `${moduleName(act.source)}_${act.id}`,
          ),
      )
      .join("");
  write(
    "moodle_backup.xml",
    empty(
      "moodle_backup",
      `<information>${fields({ name: "backup.mbz", moodle_version: "2022112817.01", moodle_release: "4.1.17+ (Build: 20250321)", backup_version: "2022112800", backup_release: "4.1", backup_date: model.now, mnet_remoteusers: 0, include_files: 1, include_file_references_to_external_content: 0, original_wwwroot: "https://moodle.example.invalid", original_site_identifier_hash: model.backupId, original_course_id: model.courseId, original_course_format: model.draft.metadata.organization, original_course_fullname: model.draft.metadata.fullName, original_course_shortname: model.draft.metadata.shortName, original_course_startdate: timestamp(model.draft.metadata.startDate), original_course_enddate: 0, original_course_contextid: model.courseContext, original_system_contextid: 1 })}<details><detail backup_id="${model.backupId}">${fields({ type: "course", format: "moodle2", interactive: 1, mode: 10, execution: 1, executiontime: 0 })}</detail></details>${contents}<settings>${settings}</settings></information>`,
    ),
  );
  const metadata = model.draft.metadata;
  let summary = model.content(metadata.summary, metadata.summaryBlocks, {
    context: model.courseContext,
    component: "course",
    area: "summary",
    item: 0,
  });
  const extra = [
    metadata.teacher
      ? `Professor(a): ${metadata.teacher.name}${metadata.teacher.qualification ? " — " + metadata.teacher.qualification : ""}${metadata.teacher.email ? " (" + metadata.teacher.email + ")" : ""}`
      : "",
    metadata.workloadHours === undefined
      ? ""
      : `Carga horária: ${metadata.workloadHours} h`,
    metadata.semester ? `Semestre: ${metadata.semester}` : "",
    metadata.className ? `Turma: ${metadata.className}` : "",
  ].filter(Boolean);
  if (extra.length)
    summary += model.content(extra.join("\n"), undefined, {
      context: model.courseContext,
      component: "course",
      area: "summary",
      item: 0,
    });
  write(
    "course/course.xml",
    document(
      `<course id="${model.courseId}" contextid="${model.courseContext}">${fields({ shortname: metadata.shortName, fullname: metadata.fullName, idnumber: model.draft.id, summary, summaryformat: 1, format: metadata.organization, showgrades: 1, newsitems: 0, startdate: timestamp(metadata.startDate), enddate: 0, marker: 0, maxbytes: 0, legacyfiles: 0, showreports: 0, visible: 1, groupmode: 0, groupmodeforce: 0, defaultgroupingid: 0, lang: "", theme: "", timecreated: model.now, timemodified: model.now, requested: 0, showactivitydates: 1, showcompletionconditions: 0, enablecompletion: 0, completionnotify: 0 })}<category id="${model.allocate()}">${fields({ name: "Cursos", description: "" })}</category><tags/><customfields/><courseformatoptions>${tagged("courseformatoption", model.allocate(), fields({ format: metadata.organization, sectionid: 0, name: "numsections", value: model.sections.length }))}${tagged("courseformatoption", model.allocate(), fields({ format: metadata.organization, sectionid: 0, name: "coursedisplay", value: 0 }))}</courseformatoptions></course>`,
    ),
  );
  for (const sec of sections) {
    write(
      `sections/section_${sec.id}/section.xml`,
      document(
        tagged(
          "section",
          sec.id,
          fields({
            number: sec.number,
            name: sec.title,
            summary: sec.summary,
            summaryformat: 1,
            sequence: sec.activities.map((a) => a.id).join(","),
            visible: 1,
            availabilityjson: nil,
            timemodified: model.now,
          }),
        ),
      ),
    );
  }
  for (const activity of model.activities) {
    const dir = `activities/${moduleName(activity.source)}_${activity.id}`;
    write(`${dir}/module.xml`, moduleXml(activity, model.now));
    write(
      `${dir}/${moduleName(activity.source)}.xml`,
      activityXml(model, activity),
    );
    write(`${dir}/grades.xml`, activityGrades(model, activity));
    write(
      `${dir}/grade_history.xml`,
      empty("grade_history", "<grade_grades/>"),
    );
    write(`${dir}/completion.xml`, empty("completions", "<completionviews/>"));
    write(`${dir}/calendar.xml`, empty("events"));
    write(`${dir}/comments.xml`, empty("comments"));
    write(
      `${dir}/filters.xml`,
      empty("filters", "<filter_actives/><filter_configs/>"),
    );
    write(
      `${dir}/competencies.xml`,
      empty("course_module_competencies", "<competencies/>"),
    );
    write(
      `${dir}/roles.xml`,
      empty("roles", "<role_overrides/><role_assignments/>"),
    );
    if (activity.source.type === "assignment")
      write(
        `${dir}/grading.xml`,
        empty(
          "areas",
          tagged(
            "area",
            model.allocate(),
            fields({ areaname: "submissions", activemethod: nil }) +
              "<definitions/>",
          ),
        ),
      );
  }
  write("questions.xml", questionsXml(model));
  write("gradebook.xml", gradebook(model));
  write("files.xml", filesXml(model));
  for (const file of model.files)
    write(`files/${file.hash.slice(0, 2)}/${file.hash}`, file.bytes);
  for (const activity of model.activities) {
    const options: { grade?: number; files: number[]; categories: number[] } = {
      files: model.files
        .filter((file) => file.context === activity.context)
        .map((file) => file.id),
      categories:
        activity.questionTop === undefined
          ? []
          : [activity.questionTop, activity.questionCategory!],
    };
    if (activity.gradeId !== undefined) options.grade = activity.gradeId;
    write(
      `activities/${moduleName(activity.source)}_${activity.id}/inforef.xml`,
      inforef(options),
    );
  }
  for (const sec of sections)
    write(
      `sections/section_${sec.id}/inforef.xml`,
      inforef({
        files: model.files
          .filter(
            (file) =>
              file.context === model.courseContext &&
              file.area === "section" &&
              file.item === sec.id,
          )
          .map((file) => file.id),
      }),
    );
  write(
    "course/inforef.xml",
    inforef({
      files: model.files
        .filter(
          (file) =>
            file.context === model.courseContext && file.area === "summary",
        )
        .map((file) => file.id),
    }),
  );
  write("course/enrolments.xml", empty("enrolments", "<enrols/>"));
  write("course/completiondefaults.xml", empty("course_completion_defaults"));
  write(
    "course/filters.xml",
    empty("filters", "<filter_actives/><filter_configs/>"),
  );
  write(
    "course/competencies.xml",
    empty("course_competencies", "<competencies/><user_competencies/>"),
  );
  write("course/contentbank.xml", empty("contents"));
  write("course/calendar.xml", empty("events"));
  write("course/comments.xml", empty("comments"));
  write(
    "course/roles.xml",
    empty("roles", "<role_overrides/><role_assignments/>"),
  );
  write("groups.xml", empty("groups", "<groupings/><groups/>"));
  write("outcomes.xml", empty("outcomes_definition"));
  write("roles.xml", empty("roles_definition"));
  write("scales.xml", empty("scales_definition"));
  // 4.1 restaura conteúdo editorial do glossário através de userinfo; não há contas.
  if (hasEditorialEntries) write("users.xml", empty("users"));
  write(
    "moodle_backup.log",
    "Backup criado pelo Moodle-AI. Integridade local verificável; restauração pendente.\n",
  );
  write(
    ".ARCHIVE_INDEX",
    `Moodle archive file index. Count: ${entries.size}\n${[...entries].map(([name, bytes]) => `${name}\tf\t${bytes.byteLength}\t${model.now}`).join("\n")}\n`,
  );
  return entries;
}
