<?php
// Read-only semantic evidence for this task's fictitious Moodle laboratory.
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once($CFG->libdir . '/clilib.php');
$shortname = $argv[1] ?? 'FULL-01';
$course = $DB->get_record('course', ctype_digit($shortname) ? ['id' => (int)$shortname] : ['shortname' => $shortname], '*', MUST_EXIST);
$context = context_course::instance($course->id);
$contexts = [$context->id];
$sections = array_values($DB->get_records('course_sections', ['course' => $course->id], 'section ASC'));
$activities = [];
$cms = $DB->get_records_sql('SELECT cm.*, m.name AS modname FROM {course_modules} cm JOIN {modules} m ON m.id=cm.module WHERE cm.course=? ORDER BY cm.id', [$course->id]);
foreach ($cms as $cm) {
    $instance = $DB->get_record($cm->modname, ['id' => $cm->instance], '*', MUST_EXIST);
    $contexts[] = context_module::instance($cm->id)->id;
    $activity = ['cm' => $cm, 'instance' => $instance];
    if ($cm->modname === 'glossary') $activity['entries'] = array_values($DB->get_records('glossary_entries', ['glossaryid' => $instance->id], 'id ASC'));
    if ($cm->modname === 'forum') $activity['discussions'] = array_values($DB->get_records('forum_discussions', ['forum' => $instance->id], 'id ASC'));
    if ($cm->modname === 'wiki') $activity['pages'] = array_values($DB->get_records_sql('SELECT p.* FROM {wiki_pages} p JOIN {wiki_subwikis} s ON s.id=p.subwikiid WHERE s.wikiid=? ORDER BY p.id', [$instance->id]));
    if ($cm->modname === 'assign') $activity['pluginConfig'] = array_values($DB->get_records('assign_plugin_config', ['assignment' => $instance->id], 'id ASC'));
    $activities[] = $activity;
}
list($insql, $params) = $DB->get_in_or_equal($contexts);
$categories = array_values($DB->get_records_select('question_categories', "contextid $insql", $params, 'id ASC'));
$questions = [];
foreach ($categories as $category) {
    $entries = $DB->get_records('question_bank_entries', ['questioncategoryid' => $category->id], 'id ASC');
    foreach ($entries as $entry) {
        $versions = $DB->get_records('question_versions', ['questionbankentryid' => $entry->id], 'version ASC');
        foreach ($versions as $versionrecord) {
            $question = $DB->get_record('question', ['id' => $versionrecord->questionid], '*', MUST_EXIST);
            $result = ['category' => $category, 'entry' => $entry, 'version' => $versionrecord, 'question' => $question, 'answers' => array_values($DB->get_records('question_answers', ['question' => $question->id], 'id ASC'))];
            if ($question->qtype === 'match') $result['pairs'] = array_values($DB->get_records('qtype_match_subquestions', ['questionid' => $question->id], 'id ASC'));
            if ($question->qtype === 'essay') $result['options'] = $DB->get_record('qtype_essay_options', ['questionid' => $question->id]);
            if ($question->qtype === 'multichoice') $result['options'] = $DB->get_record('qtype_multichoice_options', ['questionid' => $question->id]);
            $questions[] = $result;
        }
    }
}
$files = [];
$records = $DB->get_records_select('files', "contextid $insql AND filename<>'.'", $params, 'id ASC');
foreach ($records as $record) {
    $file = get_file_storage()->get_file_by_id($record->id);
    $content = $file->get_content();
    $files[] = ['record' => $record, 'bytes' => strlen($content), 'sha256' => hash('sha256', $content), 'sha1' => sha1($content)];
}
$snapshot = [
    'siteCounts' => ['users' => $DB->count_records('user'), 'userEnrolments' => $DB->count_records('user_enrolments')],
    'moodle' => ['release' => $CFG->release, 'version' => $CFG->version], 'course' => $course,
    'sections' => $sections, 'activities' => $activities, 'questionCategories' => $categories, 'questions' => $questions,
    'quizSlots' => array_values($DB->get_records_sql('SELECT s.* FROM {quiz_slots} s JOIN {quiz} q ON q.id=s.quizid WHERE q.course=? ORDER BY s.id', [$course->id])),
    'quizSections' => array_values($DB->get_records_sql('SELECT s.* FROM {quiz_sections} s JOIN {quiz} q ON q.id=s.quizid WHERE q.course=? ORDER BY s.id', [$course->id])),
    'questionReferences' => array_values($DB->get_records_select('question_references', "usingcontextid $insql", $params, 'id ASC')),
    'gradeCategories' => array_values($DB->get_records('grade_categories', ['courseid' => $course->id], 'id ASC')),
    'gradeItems' => array_values($DB->get_records('grade_items', ['courseid' => $course->id], 'id ASC')), 'files' => $files,
];
echo json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . "\n";
