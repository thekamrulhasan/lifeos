# Total Tasks — Edi Life OS

> Master tracking list of all project tasks (completed, in-progress, and planned/upcoming). Update this file as new requirements or tasks are identified.

---

## Phase 1: Project Exploration & Documentation Setup
- [x] **TASK-001:** Explore all files, directories, backend modules, frontend workspaces, and configuration in `/home/ghitl/project/lifeos/`.
- [x] **TASK-002:** Create `Project_docs/` directory at `/home/ghitl/project/lifeos/Project_docs/` to store all project-relevant `.md` files.
- [x] **TASK-003:** Document all current features of the entire project in `Project_docs/Current_all_Features.md`.
- [x] **TASK-004:** Create and initialize `Project_docs/Updated_features.md` to track feature updates and local customizations.
- [x] **TASK-005:** Create and initialize `Project_docs/Total_tasks.md` to track all project tasks.
- [x] **TASK-006:** Create and initialize `Project_docs/Completed_tasks.md` to log completed tasks.

---

## Phase 2: SMART Goal ↔ Todo Integration & Synchronization
- [x] **TASK-007:** Automatically create a linked Todo item (`edi_todos_v1`) whenever a SMART Goal (`edi_goals_v1`) is created via `#goals`, REST API (`/api/v1/goals`), or Kanban "Move to goal".
- [x] **TASK-008:** Update backend (`state.php`, `lib/goals.php`, `lib/tasks.php`, `lib/kanban_goal.php`) and `storage.js` revision broadcasting to synchronize Goals and Todos atomically without revision conflicts.
- [x] **TASK-009:** Update Goals and Todo UI/UX (`SMART Goals` view in Todo, `🎯 SMART Goal` chips, `Todo ✓` card badge, `Open in Todo ↗` and `Open in Goals ↗` deep-linking, and two-way task/subtask sync).
- [x] **TASK-010:** Fetch existing SMART Goals and update/backfill all Todo items across backend (`GET /state.php`), frontend (`syncGoalsToTodos` / `syncFromGoals`), and live database state.

---

## Phase 3: SMART Goal ↔ Kanban Integration & Synchronization
- [x] **TASK-011:** Automatically create and place a linked Kanban card (`kanban_boards_v1`, in `To Do` / `In Progress` / `Done`) whenever a SMART Goal (`edi_goals_v1`) is created or updated via `#goals`, `/api/v1/goals`, or `/api/v1/tasks`.
- [x] **TASK-012:** Update backend (`state.php`, `migrate.php`, `lib/goals.php`, `lib/tasks.php`) to synchronize SMART Goals ↔ Kanban cards and backfill existing Goals in the database and live container.
- [x] **TASK-013:** Update Goals and Kanban UI/UX (`🎯 SMART Goal` card badges, `Todo · Kanban ✓` goal badges, `⇄ Sync Goals` tab button, `Open in Kanban ↗` and `Open in Goals ↗` deep-linking, and two-way drag/checklist/modal sync).
- [x] **TASK-014:** Add automated unit and API test assertions (`tests/api_test.php`, `tests/unit/LibraryTest.php`) for SMART Goal ↔ Kanban synchronization and verify in container.

---

## Phase 4: Potential Maintenance, Enhancements & Upcoming Tasks (Backlog)
- [ ] **TASK-015:** Align `TZ` environment variable fallback in `docker-compose.yml` (`TZ: ${LIFEOS_TIMEZONE:-Asia/Dhaka}`) with `LIFEOS_TIMEZONE` and verify `db` healthcheck user (`thedukelifeosman` vs `lifeos`).
- [ ] **TASK-016:** Add `docker/config.php` support for `trust_proxy` and `api_user_id` environment variables (`LIFEOS_TRUST_PROXY`, `LIFEOS_API_USER_ID`) for parity with `config.example.php`.
- [ ] **TASK-017:** Expose new workspaces (`Todo`, `Growth`, `Financial Commitments`) via `/api/v1` endpoints and optional MCP server tools if external AI assistant access is needed for those domains.
- [ ] **TASK-018:** Make frontend browser calendar/date helpers respect the server-configured `timezone` (`Asia/Dhaka` / `LIFEOS_TIMEZONE`) instead of hardcoded `Asia/Tehran` where applicable.

