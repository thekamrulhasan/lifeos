<?php

declare(strict_types=1);

require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/lib/api_response.php';
require_once __DIR__ . '/lib/state_store.php';
require_once __DIR__ . '/lib/goals.php';
life_os_require_auth();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function state_reply(array $payload, int $status = 200): never
{
    life_os_json_reply($payload, $status);
}

try {
    $db = life_os_db();
    $allowed = [
        'edi_focus_v1', 'daramd_periods_v1', 'daramd_active_period_v1', 'daramd_v1',
        'kanban_boards_v1', 'edi_goals_v1', 'edi_goals_drafts_v1', 'edi_notes_v1', 'edi_notepad_v1', 'edi_todos_v1', 'edi_growth_v1', 'edi_currency_v1', 'edi_calendar_v1',
        'edi_os_theme', 'edifinance_theme', 'habittify_theme',
        'edi_kanban_theme', 'edi_goals_theme', 'edi_notes_theme',
    ];
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'GET') {
        $rows = $db->query('SELECT state_key, state_value FROM app_state WHERE user_id = ' . life_os_user_id())->fetchAll();
        $data = [];
        $revisions = [];
        foreach ($rows as $row) {
            $data[$row['state_key']] = $row['state_value'];
            $revisions[$row['state_key']] = hash('sha256', $row['state_value']);
        }
        if (isset($data[GOALS_KEY])) {
            try {
                $goalsDoc = json_decode((string) $data[GOALS_KEY], true, 64, JSON_THROW_ON_ERROR);
                $todosDoc = isset($data[TODOS_KEY])
                    ? json_decode((string) $data[TODOS_KEY], true, 64, JSON_THROW_ON_ERROR)
                    : goals_default_todos_doc();
                if (is_array($goalsDoc['goals'] ?? null) && is_array($todosDoc)) {
                    if (goals_sync_todos($goalsDoc['goals'], $todosDoc, null, $db)) {
                        $store = new StateStore($db);
                        $store->mutate([TODOS_KEY => goals_default_todos_doc()], function (array &$docs) use ($goalsDoc, $db): void {
                            goals_sync_todos($goalsDoc['goals'], $docs[TODOS_KEY], null, $db);
                        });
                        $updatedRaw = $store->raw(TODOS_KEY);
                        if ($updatedRaw !== null) {
                            $data[TODOS_KEY] = $updatedRaw;
                            $revisions[TODOS_KEY] = hash('sha256', $updatedRaw);
                        }
                    }
                }
                $kanbanDoc = isset($data[KANBAN_KEY])
                    ? json_decode((string) $data[KANBAN_KEY], true, 64, JSON_THROW_ON_ERROR)
                    : goals_default_kanban_doc();
                if (is_array($goalsDoc['goals'] ?? null) && is_array($kanbanDoc)) {
                    if (goals_sync_kanban($goalsDoc['goals'], $kanbanDoc, null, $db)) {
                        $store ??= new StateStore($db);
                        $store->mutate([KANBAN_KEY => goals_default_kanban_doc()], function (array &$docs) use ($goalsDoc, $db): void {
                            goals_sync_kanban($goalsDoc['goals'], $docs[KANBAN_KEY], null, $db);
                        });
                        $updatedKanbanRaw = $store->raw(KANBAN_KEY);
                        if ($updatedKanbanRaw !== null) {
                            $data[KANBAN_KEY] = $updatedKanbanRaw;
                            $revisions[KANBAN_KEY] = hash('sha256', $updatedKanbanRaw);
                        }
                    }
                }
            } catch (Throwable) {
                // Ignore malformed state and return stored documents as-is.
            }
        }
        life_os_start_session();
        $_SESSION['state_csrf'] ??= bin2hex(random_bytes(32));
        state_reply(['data' => (object) $data, 'revisions' => (object) $revisions, 'csrf' => $_SESSION['state_csrf'], 'user_id' => life_os_user_id()]);
    }
    if ($method !== 'PUT') state_reply(['error' => 'Method not allowed'], 405);
    life_os_require_csrf(fn () => state_reply(['error' => 'Invalid request token'], 403));
    $raw = (string) file_get_contents('php://input');
    if (strlen($raw) > 2_000_000) state_reply(['error' => 'Data too large'], 413);
    $payload = json_decode($raw, true);
    $key = $payload['key'] ?? null;
    $value = $payload['value'] ?? null;
    $isBackup = is_string($key) && preg_match('/^legacy_backup_[0-9a-f]{32}$/', $key);
    if (!is_string($key) || (!in_array($key, $allowed, true) && !$isBackup) || !is_string($value)) state_reply(['error' => 'Invalid data'], 400);
    if (!array_key_exists('revision', $payload)) state_reply(['error' => 'Reload the app to use the current save protocol.'], 409);
    $revision = $payload['revision'];
    if ($revision !== null && (!is_string($revision) || !preg_match('/^[a-f0-9]{64}$/D', $revision))) state_reply(['error' => 'Invalid revision'], 400);
    $newRevision = (new StateStore($db))->compareAndSwap($key, $value, $revision);
    state_reply(['ok' => true, 'revision' => $newRevision]);
} catch (ApiException $error) {
    state_reply(['error' => $error->getMessage()], $error->status);
} catch (Throwable $error) {
    error_log($error->__toString());
    state_reply(['error' => 'Database unavailable. Check config.php and MySQL.'], 503);
}
