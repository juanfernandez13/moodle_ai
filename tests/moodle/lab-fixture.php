<?php
// Explicit laboratory fixture, never called by the product adapter.
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once($CFG->libdir . '/enrollib.php');
if ($CFG->wwwroot !== 'http://localhost:3211') { throw new Exception('Laboratory origin required.'); }
$course = $DB->get_record('course', ['id' => 4, 'shortname' => 'FULL-01_2'], '*', MUST_EXIST);
$student = $DB->get_record('role', ['shortname' => 'student', 'archetype' => 'student'], '*', MUST_EXIST);
if (!enrol_is_enabled('manual')) { throw new Exception('Manual enrol plugin is disabled.'); }
$manual = enrol_get_plugin('manual');
$instances = array_values(array_filter(enrol_get_instances($course->id, false), fn($instance) => $instance->enrol === 'manual'));
$created = false;
if (getenv('MOODLE_LAB_OPERATION') === 'prepare') {
    if (count($instances) > 1) { throw new Exception('Ambiguous manual enrol fixture.'); }
    if (!$instances) {
        $id = $manual->add_instance($course, ['status' => ENROL_INSTANCE_ENABLED, 'roleid' => $student->id]);
        $instances = [$DB->get_record('enrol', ['id' => $id], '*', MUST_EXIST)];
        $created = true;
    }
    if ((int)$instances[0]->roleid !== (int)$student->id || (int)$instances[0]->status !== ENROL_INSTANCE_ENABLED) { throw new Exception('Only active student enrol is allowed.'); }
    echo json_encode(['courseId' => 4, 'shortName' => $course->shortname, 'manualId' => (int)$instances[0]->id, 'roleId' => (int)$student->id, 'roleShortName' => 'student', 'createdFixture' => $created, 'userCount' => $DB->count_records('user'), 'enrolmentCount' => $DB->count_records('user_enrolments')], JSON_UNESCAPED_SLASHES) . "\n";
} elseif (getenv('MOODLE_LAB_OPERATION') === 'readback') {
    $prefix = getenv('MOODLE_LAB_PREFIX');
    if (!preg_match('/^lab-test-ops-[a-f0-9-]{8,36}$/', $prefix)) { throw new Exception('Synthetic test prefix required.'); }
    $rows = [];
    foreach (['one', 'two'] as $suffix) {
        $username = $prefix . '-' . $suffix;
        $user = $DB->get_record('user', ['username' => $username], '*', MUST_EXIST);
        $enrolments = $DB->count_records_sql('SELECT COUNT(*) FROM {user_enrolments} ue JOIN {enrol} e ON e.id=ue.enrolid WHERE ue.userid=:userid AND e.courseid=4 AND e.enrol=:manual', ['userid' => $user->id, 'manual' => 'manual']);
        $roles = $DB->get_fieldset_sql('SELECT r.shortname FROM {role_assignments} ra JOIN {role} r ON r.id=ra.roleid JOIN {context} c ON c.id=ra.contextid WHERE ra.userid=:userid AND c.contextlevel=:courselevel AND c.instanceid=4', ['userid' => $user->id, 'courselevel' => CONTEXT_COURSE]);
        if ($user->lastname !== 'Atualizado' || $enrolments !== 1 || $roles !== ['student']) { throw new Exception('Synthetic user update/enrol readback mismatch.'); }
        $rows[] = ['username' => $username, 'updated' => true, 'manualEnrolments' => $enrolments, 'roles' => $roles];
    }
    echo json_encode(['rows' => $rows], JSON_UNESCAPED_SLASHES) . "\n";
} else { throw new Exception('Explicit lab operation required.'); }
