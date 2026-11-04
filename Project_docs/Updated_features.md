# Updated Features Log — Edi Life OS

> This document tracks newly added, modified, or customized features across the repository and local deployment environment. Update this file whenever features or configurations are changed.

---

## 1. Local Environment & Docker Customizations (`docker-compose.yml`)
- **Custom Port Mapping:** Default host port changed to `8784:80` (`${LIFEOS_PORT:-8784}:80`).
- **Custom Database Naming:** Configured MySQL database as `thedukelifeosdb` and database user as `thedukelifeosman`.
- **Localized Timezone & Weather Defaults:**
  - `LIFEOS_TIMEZONE` defaulted to `Asia/Dhaka`.
  - `LIFEOS_WEATHER_LATITUDE` set to `23.7808` and `LIFEOS_WEATHER_LONGITUDE` set to `90.4074`.
  - `LIFEOS_WEATHER_LOCATION` set to `Mohakhali, Dhaka`.
- **Bind-Mounted Persistence:** Configured local bind mounts `./mysql:/var/lib/mysql` and `./attachments:/data/attachments` for direct host-level persistence.

---

## 2. Recent Feature Additions in Project History
- **Todo Workspace (`public_html/todo/`, `edi_todos_v1`):**
  - Added dedicated Todo workspace with `Inbox`, `Today`, `Upcoming`, `All tasks`, and `Completed` views plus custom color-coded lists.
  - Added subtasks, due dates, priorities (`high`, `medium`, `low`, `none`), notes, sorting, search, and undo toasts.
  - Updated **Clear completed** undo logic so undoing restores only the cleared tasks while preserving any tasks added or edited afterward.
- **Kanban "All Projects" View & "Move to Goal" (`public_html/kanban/`, `kanban.php`, `lib/kanban_goal.php`):**
  - Added **All projects** board view merging lists of the same name across all boards side-by-side with drag-and-drop support.
  - Added transactional **Move to goal** action converting a Kanban card and its checklists into a SMART Goal in `edi_goals_v1`.
- **Habittify Calendar Setting (`public_html/habittify/`, `public_html/settings/`):**
  - Added configurable **Gregorian / Jalali** calendar toggle in Settings (`edi_calendar_v1`) with Gregorian as the default.
- **Due-Date Alerts & Notifications (`public_html/assets/due-alerts.js`):**
  - Added top-bar notification bell, grouped due/overdue dialog panel, Overview urgent banner, and optional browser notifications for Kanban cards, SMART goal deadlines, and Finance obligations.
- **Documentation & Project Tracking (`Project_docs/`):**
  - Initialized `Project_docs/` directory with `Current_all_Features.md`, `Updated_features.md`, `Total_tasks.md`, and `Completed_tasks.md`.
- **SMART Goal ↔ Todo Automatic Sync & Deep-Linking (`lib/goals.php`, `lib/tasks.php`, `lib/kanban_goal.php`, `state.php`, `public_html/goals/`, `public_html/todo/`, `public_html/assets/os.js`, `public_html/assets/storage.js`):**
  - Automatically creates and updates a linked Todo item in `edi_todos_v1` whenever a SMART Goal is created or edited in `#goals`, `/api/v1/goals`, `/api/v1/tasks`, or moved from Kanban (`kanban_card_to_goal`).
  - Automatically fetches existing SMART goals from `edi_goals_v1` and syncs/backfills all Todo items on `GET /state.php`, on `#goals` and `#todo` startup, and via manual **⇄ Sync Todo** / **↻ Sync Goals** buttons.
  - Added two-way synchronization so completing a Goal-linked Todo or its subtasks, or editing its title, due date, priority, or subtasks in `#todo`, updates the corresponding SMART Goal in `edi_goals_v1`.
  - Updated `public_html/assets/storage.js` `BroadcastChannel` messages to propagate SHA-256 revisions across same-origin workspace iframes so cross-app state updates never trigger `409 Conflict`.
  - Added a dedicated **SMART Goals** view, `🎯 SMART Goal` task chips, and an **Open in Goals ↗** detail banner in `#todo`, plus `Todo ✓` card badges and **Open in Todo ↗** in `#goals`.

---

## 3. Feature Update Log

| Date | Module / File | Change Type | Description of Update |
| :--- | :--- | :--- | :--- |
| 2026-11-04 | `Project_docs/*` | Added | Created project documentation and task tracking structure in `Project_docs/`. |
| 2026-11-04 | `lib/goals.php`, `lib/tasks.php`, `lib/kanban_goal.php`, `state.php` | Updated | Added `goals_sync_todos()` to automatically create/update/remove linked Todo items in `edi_todos_v1` and backfill existing goals on `GET /state.php`. |
| 2026-11-04 | `public_html/assets/storage.js`, `public_html/assets/os.js`, `public_html/index.html` | Updated | Propagated SHA-256 revisions over `BroadcastChannel` and added cross-frame deep-linking between `#goals` and `#todo`. |
| 2026-11-04 | `public_html/goals/*`, `public_html/todo/*` | Updated | Added automatic Goal → Todo creation, existing Goal fetch & sync, two-way subtask/completion sync, `SMART Goals` Todo view, badges, and cross-navigation buttons. |

