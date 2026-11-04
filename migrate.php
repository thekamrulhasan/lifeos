<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/lib/state_store.php';
require_once __DIR__ . '/lib/goals.php';
try {
    $db = life_os_db();
    $userIds = $db->query("SELECT DISTINCT user_id FROM app_state WHERE state_key = '" . GOALS_KEY . "'")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($userIds as $uid) {
        $GLOBALS['life_os_request_user_id'] = (int) $uid;
        $store = new StateStore($db);
        $goals = $store->get(GOALS_KEY, ['goals' => []])['goals'] ?? [];
        if (is_array($goals) && $goals) {
            $store->mutate([TODOS_KEY => goals_default_todos_doc()], function (array &$docs) use ($goals, $db): void {
                goals_sync_todos($goals, $docs[TODOS_KEY], null, $db);
            });
        }
    }
    unset($GLOBALS['life_os_request_user_id']);
    echo 'Schema version: ' . life_os_schema_version($db) . "\n";
}
catch (Throwable $error) { fwrite(STDERR, 'Migration failed: ' . get_class($error) . "\n"); exit(1); }
