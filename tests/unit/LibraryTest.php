<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__, 2) . '/lib/state_store.php';
require_once dirname(__DIR__, 2) . '/lib/http_cache.php';
require_once dirname(__DIR__, 2) . '/lib/goals.php';

final class LibraryTest extends TestCase
{
    public function testStateMutationRollsBackEveryDocumentOnFailure(): void
    {
        $db = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $db->exec('CREATE TABLE app_state (user_id INTEGER NOT NULL DEFAULT 1, state_key TEXT NOT NULL, state_value TEXT NOT NULL, PRIMARY KEY (user_id, state_key))');
        $db->exec("INSERT INTO app_state (state_key, state_value) VALUES ('a', '{\"value\":1}')");
        $store = new StateStore($db);
        try {
            $store->mutate(['a' => [], 'b' => []], function (array &$documents) {
                $documents['a']['value'] = 99;
                $documents['b'] = ['created' => true];
                throw new RuntimeException('Abort');
            });
            self::fail('Mutation should fail');
        } catch (RuntimeException $error) { self::assertSame('Abort', $error->getMessage()); }
        self::assertSame(['value' => 1], $store->get('a', []));
        self::assertNull($store->raw('b'));
        self::assertFalse($db->inTransaction());
    }

    public function testStaleRevisionCannotOverwriteSavedState(): void
    {
        $db = new PDO('sqlite::memory:', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $db->exec('CREATE TABLE app_state (user_id INTEGER NOT NULL DEFAULT 1, state_key TEXT NOT NULL, state_value TEXT NOT NULL, PRIMARY KEY (user_id, state_key))');
        $store = new StateStore($db);
        $revision = $store->compareAndSwap('a', '{"value":1}', null);
        $store->compareAndSwap('a', '{"value":2}', $revision);
        try { $store->compareAndSwap('a', '{"value":3}', $revision); self::fail('Expected conflict'); }
        catch (ApiException $error) { self::assertSame(409, $error->status); }
        self::assertSame(['value' => 2], $store->get('a', []));
    }

    public function testCachePolicySeparatesDocumentsAndVersionedAssets(): void
    {
        self::assertSame('private, no-store', life_os_static_cache('html', ['v' => '1']));
        self::assertSame('private, max-age=31536000, immutable', life_os_static_cache('js', ['v' => '1']));
        self::assertSame('private, max-age=3600', life_os_static_cache('css', []));
        self::assertSame('private, max-age=3600', life_os_static_cache('css', ['v' => ['1']]));
    }

    public function testInvalidCalendarDateIsRejected(): void
    {
        self::assertSame('2024-02-29', api_date('2024-02-29', 'date'));
        $this->expectException(ApiException::class);
        api_date('2025-02-29', 'date');
    }

    public function testConfiguredTimezoneAndCoordinates(): void
    {
        try {
            putenv('LIFEOS_TIMEZONE=Pacific/Kiritimati');
            putenv('LIFEOS_WEATHER_LATITUDE=-33.9');
            putenv('LIFEOS_WEATHER_LONGITUDE=151.2');
            self::assertSame((new DateTimeImmutable('now', new DateTimeZone('Pacific/Kiritimati')))->format('Y-m-d'), api_today());
            self::assertSame(['latitude' => -33.9, 'longitude' => 151.2], life_os_weather_coordinates());
            putenv('LIFEOS_WEATHER_LATITUDE=91');
            $this->expectException(RuntimeException::class);
            life_os_weather_coordinates();
        } finally {
            putenv('LIFEOS_TIMEZONE'); putenv('LIFEOS_WEATHER_LATITUDE'); putenv('LIFEOS_WEATHER_LONGITUDE');
        }
    }

    public function testGoalsSyncTodosCreatesUpdatesAndRemovesLinkedTodos(): void
    {
        $todosDoc = goals_default_todos_doc();
        $goals = [
            [
                'id' => 'goal-1',
                'title' => 'Learn Rust',
                'specific' => 'Complete the Rust book',
                'relevant' => 'Systems programming',
                'notes' => 'Chapter 1-10',
                'category' => 'Career',
                'priority' => 'high',
                'deadline' => '2026-12-31',
                'status' => 'active',
                'progressSource' => 'checklist',
                'tasks' => [
                    ['id' => 'sub-1', 'title' => 'Read ch 1', 'done' => true],
                    ['id' => 'sub-2', 'title' => 'Read ch 2', 'done' => false],
                ],
            ],
        ];
        self::assertTrue(goals_sync_todos($goals, $todosDoc));
        self::assertCount(1, $todosDoc['tasks']);
        self::assertSame('goal-1', $todosDoc['tasks'][0]['goalId']);
        self::assertSame('Learn Rust', $todosDoc['tasks'][0]['title']);
        self::assertFalse($todosDoc['tasks'][0]['done']);
        self::assertCount(2, $todosDoc['tasks'][0]['subtasks']);

        // Completing all goal tasks marks the linked Todo done.
        $goals[0]['tasks'][1]['done'] = true;
        self::assertTrue(goals_sync_todos($goals, $todosDoc));
        self::assertTrue($todosDoc['tasks'][0]['done']);

        // Deleting the goal removes the linked Todo.
        self::assertTrue(goals_sync_todos([], $todosDoc, 'goal-1'));
        self::assertCount(0, $todosDoc['tasks']);
    }
}
