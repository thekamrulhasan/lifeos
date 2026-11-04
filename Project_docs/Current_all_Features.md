# Current All Features — Edi Life OS

## 1. Project Overview & Core Architecture
- **Self-Hosted Personal Life & Work OS:** Combines habits, goals, focus timer, personal finance, tasks/to-dos, Kanban project boards, calendar, personal growth reviews, markdown notepad, and sticky notes in a unified dashboard.
- **Zero-Build Vanilla Stack:** Built with PHP 8.1+ (`pdo_mysql`, `mbstring`, `curl`), MySQL 8+ / MariaDB 10.4+, and vanilla HTML/CSS/JavaScript (ES modules and classic scripts) with no frontend framework or build step.
- **Unified Shell & Multi-App Navigation (`public_html/index.html`, `public_html/assets/os.js`):**
  - Top navigation bar with live Pomodoro countdown badge (`#navTimer`), due-date notification bell (`#dueBell`), and dark/light theme toggle (`#theme`).
  - Mobile navigation drawer (`public_html/assets/mobile-nav.js`).
  - Same-origin iframe workspace embedding (`growth`, `finance`, `habittify`, `todo`, `kanban`, `calendar`, `goals`, `notes`, `notepad`, `settings`) with hash routing and cross-frame deep-linking (`postMessage`).
- **Revision-Checked State Store (`state.php`, `lib/state_store.php`, `public_html/assets/storage.js`):**
  - Stores workspace JSON documents in `app_state` scoped by `user_id` and `state_key`.
  - Compare-and-swap (CAS) concurrency control using SHA-256 revisions (`409 Conflict` on stale writes) and `SELECT ... FOR UPDATE` row locking inside MySQL transactions.
  - Multi-document atomic mutations via `appStorage.mutateItems`.
  - Cross-tab synchronization via `BroadcastChannel` / `localStorage` scoped per authenticated user ID.
  - One-time legacy `localStorage` import for the original account (`id=1`) with automatic archival of conflicting snapshots as `legacy_backup_<hash>` keys.

---

## 2. Authentication, Multi-User Accounts & Security (`auth.php`, `login.php`, `logout.php`, `users.php`, `credentials.php`)
- **Multi-Admin Private Workspaces (Schema v3):**
  - Every account in `app_users` is an administrator with a completely isolated private workspace (`user_id` scoping across `app_state`, `habits`, `habit_logs`, `categories`, and `card_attachments`).
  - Self-service credential management (`credentials.php`) to update one's own username or password (requires current password confirmation; invalidates other sessions via credential fingerprint).
  - Account administration (`users.php`) to list accounts, create new administrators, rename accounts, reset passwords (12–72 bytes), and deactivate/reactivate accounts while preventing deactivation of the last active administrator.
- **Session & Request Security:**
  - `edi_life_os` session cookie with `HttpOnly`, `SameSite=Lax`, and automatic `Secure` flag over HTTPS or trusted reverse proxy (`LIFEOS_TRUST_PROXY`).
  - Per-session CSRF token (`X-CSRF-Token`) verified via `hash_equals()` (`life_os_require_csrf()`) on all session write endpoints.
  - IP-based login rate limiting (`login_throttle` table): locks out an IP for 15 minutes (`900s`) after 5 failed attempts (`HTTP 429`), with timing-safe dummy hash verification for nonexistent usernames.
  - Strict Content-Security-Policy (CSP), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.

---

## 3. Ten Workspaces & Functional Modules

### 3.1 Overview Dashboard (`public_html/assets/dashboard.js`, `weather.php`)
- **Daily Productivity Score:** Live composite score (0–100) with letter grade and week-over-week delta calculated from Focus progress (toward 90 min daily target), Habit completion rate, active SMART Goal progress, and Kanban workflow completion share.
- **Key Metric Cards:** Live counters and deltas for Focus time today (including in-progress intervals), Habits completed today, Active goals (with due-soon indicators), and Kanban cards in flight.
- **Six Life Dimensions Summary (`public_html/assets/growth-overview.js`):** Snapshot of Religion & Spirituality, Health, Relationships & Family, Finance, Self Growth, and Fun & Rest, plus review due status.
- **Local Weather & Marine Forecast (`weather.php`, `public_html/assets/weather.js`):**
  - Configurable coordinates, location label, and timezone (`config.php` or `LIFEOS_WEATHER_*` env vars; configured in `docker-compose.yml` for Mohakhali, Dhaka / default Qeshm).
  - Fetches current weather, 7-day daily forecast, and coastal sea-level/tide estimates via Open-Meteo and DWD Marine APIs using parallel `curl_multi` requests.
- **Visual Analytics & Widgets:**
  - 14-day smooth cubic-bezier area/line charts for deep-work minutes and daily habit completion rate.
  - 16-week GitHub-style habit completion streak heatmap.
  - Automated "Signals worth knowing" insights list.
  - Goal progress bars, Kanban workflow load breakdown, and current-period Finance spend watch.
  - Quick-launch application bar.

### 3.2 Personal Growth Workspace (`public_html/growth/`, `public_html/assets/growth-model.js`)
- **Six Fixed Life Dimensions:** Religion & Spirituality, Health, Relationships & Family, Finance, Self Growth, and Fun & Rest.
- **Long-Term Plans (`edi_growth_v1`):**
  - Create, edit, achieve, archive, or delete long-term plans within any dimension with title, "why" reason, target date, and status (`active`, `achieved`, `archived`).
  - Link existing SMART goals and daily habits to long-term plans (deduplicated per dimension).
  - Live calculation of **SMART progress** (average of linked non-archived goals' measures and task completion) and **7-day Habit consistency** (completions divided by eligible daily opportunities since habit creation).
- **Guided 8-Step Life Review Wizard (`review-stepper.js`):**
  - Supports **Weekly** (7-day), **Monthly** (30-day), and **Quarterly** (90-day) review cadences with rolling due dates.
  - Step-by-step reflection and "next step" planning for each of the 6 dimensions, displaying current progress and the previous review's next step.
  - Stores immutable historical progress snapshots (`goalPct`, `habitPct`, counts) at the time of review.
- **Shareable Review Image Export (`share-image.js`):**
  - Renders a privacy-preserving `1080×1350` PNG summary card on HTML5 Canvas showing overall and per-dimension progress rings (excluding private reflections/notes) with Web Share API or direct download support.

### 3.3 Focus Timer & Soundtrack (`public_html/index.html`, `public_html/assets/timer.mjs`, `public_html/assets/focus-audio.js`)
- **Pomodoro Timer:**
  - Focus (default 25 min), Short Break (default 5 min), and Long Break (default 15 min) modes with customizable durations (1–180 min) and 4-session cycles.
  - Accurate deadline-based countdown (`timer.mjs`), live navbar timer display, and daily session/minute history persisted in `edi_focus_v1`.
  - Dynamic illustrated landscape scene (`focus-scene`) with sky, sun, moon, stars, clouds, hills, swaying grass SVG, and fireflies that adapt to the time of day.
- **Focus Soundtrack Player (`focus-audio.js`):**
  - 10 built-in Creative Commons ambient tracks (`carefree.mp3`, `comfortable-mystery.mp3`, `dreamy-flashback.mp3`, `friendly-day.mp3`, `inspired.mp3`, `luminous-rain.mp3`, `thinking-music.mp3`, `touching-story.mp3`, `water-lily.mp3`, `winter-reflections.mp3`).
  - Multi-track checkbox playlist picker playing in selection order with continuous queue repeat, Play/Pause, Next track, and persistent volume/track preferences.
  - Session-only local audio file upload (`accept="audio/*" multiple`) using Blob URLs without uploading audio bytes to the server.

### 3.4 Finance & Financial Commitments (`public_html/finance/`, `finance-obligations.php`, `lib/finance.php`, `lib/obligations.php`)
- **Multi-Period Ledger (`daramd_periods_v1`, `daramd_active_period_v1`, `daramd_v1`):**
  - Manage multiple accounting periods (create, switch, rename, delete, reset).
  - Track **Expenses** by category (`want`, `need`, `saving` types, custom icons/colors, category budgets), **Income streams**, and net balance.
  - Category budget allocation, spend vs. budget progress bars, and visual analytics.
- **Excel Workbook Import (`public_html/finance/assets/scripts/import.js`):**
  - Drag-and-drop `.xlsx` / `.xls` import supporting single or multiple "Budget" sheets, automatic category mapping, budget totals, income sources, and transaction lists.
- **Debts & Credits Workspace (`finance-obligations.php`, `lib/obligations.php`, `edi_obligations_v1`):**
  - Two separate directions: **I owe (debt)** (creates/links expenses) and **Owed to me (credit)** (creates/links income entries).
  - Three schedule types:
    1. **One-time:** Single amount on a specific due date.
    2. **Recurring (same amount):** Every 1–12 days, weeks, months, or years (open-ended, fixed count, or until an end date), plus optional subscription flag for skippable occurrences.
    3. **Recurring (split a total / installments):** Divides a total amount into whole currency units with remainder placed on the final installment.
  - **Occurrence Lifecycle & Atomic Ledger Sync:**
    - Dynamically generates due occurrences (`plan UUID:index`) across date ranges.
    - Actions: `create`, `update`, `delete`, `cancel` (stop future dues from a date), `pay` (record new expense/income or link existing ledger item in a single MySQL transaction), `undo` (reverts occurrence to pending and removes auto-created unchanged ledger entry or unlinks preexisting entry), `reject` (skip optional subscription or mark debt/credit as deferred/late), and `restore`.
    - Detects reconciliation issues if a linked ledger item is removed or its amount changes during bulk import/reset.
    - Full audit history and monthly summary metrics (Commitments, Paid, Remaining, Optional skips, Earlier unpaid dues, Overdue this month).

### 3.5 Habittify Habit Tracker (`public_html/habittify/`, `public_html/habittify/api.php`, `lib/habits.php`)
- **Dedicated Relational Storage:** Uses MySQL tables `habits`, `categories`, and `habit_logs` (seeded with default habits on initial fresh database creation).
- **Habit & Category Management:**
  - Create, edit, and delete habits with custom name, category, color, and icon.
  - Create, rename (cascading to habits), and delete habit categories.
- **Completion Tracking & Analytics:**
  - Idempotent daily check-ins (`logs/toggle`), current and best streak calculations, 7-day consistency chart, and monthly grid view.
- **Dual Calendar Support:** Supports both **Gregorian** and **Jalali (Persian)** calendars (`g2j` / `j2g` conversion) controlled via Settings (`edi_calendar_v1`).
- **SQLite Migration Tool (`migrate-sqlite.php`):** CLI tool to import legacy Habittify SQLite databases (`habits.db`) into MySQL before first use.

### 3.6 Todo Workspace (`public_html/todo/`)
- **Views & Custom Lists (`edi_todos_v1`):**
  - Built-in smart views: **Inbox** (unassigned tasks), **Today** (due today + overdue with alert badge), **Upcoming** (all dated tasks sorted chronologically), **SMART Goals** (actionable todos automatically synced with SMART goals), **All tasks**, and **Completed**.
  - Custom user-created lists with color dots, rename, and delete (safely moves tasks back to Inbox).
- **Automatic SMART Goal ↔ Todo Two-Way Synchronization:**
  - Every non-archived SMART goal in `edi_goals_v1` automatically creates and maintains a linked Todo item (`goalId`, `goalCategory`, `goalProgressSource`, `title`, `notes`, `due`, `priority`, `done`, and `subtasks` mapped 1-to-1 from goal checklist tasks).
  - Header **↻ Sync Goals** button in Todo and **⇄ Sync Todo** button in Goals fetch all existing goals and update all Todo items immediately (also triggered automatically on page load, on state save, and on `GET /state.php`).
  - Checking off a Goal-linked Todo or its subtasks, or editing its title, due date, priority, or subtasks in `#todo`, automatically syncs changes back to the linked SMART Goal in `edi_goals_v1`.
  - Goal-linked Todo rows display a `🎯 SMART Goal` badge (with goal category), and the Todo detail panel includes a SMART Goal banner with an **Open in Goals ↗** deep-link button.
- **Rich Task Details:**
  - Title, multi-line notes/descriptions, due dates, priority levels (`high`, `medium`, `low`, `none`), list assignment, and nested **subtasks** with completion progress bar.
  - Sort by Smart, Due date, Priority, Created date, or Title; live instant search across titles, notes, and subtasks.
- **Undo & Clear Completed:**
  - Toast notifications with **Undo** support for completing tasks, deleting tasks, and **Clear completed** (restores only the cleared tasks while preserving any subsequent task additions or edits).

### 3.7 Kanban Project Boards (`public_html/kanban/`, `kanban.php`, `attachments.php`, `lib/kanban_goal.php`)
- **Multi-Board & Column Management (`kanban_boards_v1`):**
  - Multiple project boards with custom backgrounds, board descriptions, custom color labels (`labelDefs`), and draggable columns/lists.
  - **All Projects View (`all-projects-view.js`):** Merges columns with matching names across all boards side-by-side and supports dragging a card between columns within its own project.
- **Rich Cards:**
  - Drag-and-drop reordering across columns, priorities (`low`, `medium`, `high`), multiple labels, start and due dates with due times, reminder intervals (5m, 1h, 1d before), descriptions, multiple named checklists with item progress, and timestamped comments.
  - **Voice Dictation (`public_html/assets/voice-input.js`):** Web Speech API dictation button in card description/comment textareas.
- **Cross-Project Card Move & Convert to Goal (`kanban.php`, `lib/kanban_goal.php`):**
  - Atomically move a card to another board/column, automatically matching or creating label definitions and updating `card_attachments` board associations.
  - **Move to Goal (`action: "to_goal"`):** Converts a Kanban card into a checklist-driven SMART Goal in `edi_goals_v1` (transferring title, description, priority, dates, labels, and checklist items) and removes the card from the board in one transaction.
- **Private File Attachments (`attachments.php`):**
  - Upload (up to 8 MB / PHP INI limit), download, and delete files per Kanban card.
  - Stored outside the web root in `.lifeos-files-<hash>` (or `/data/attachments` volume in Docker) with metadata in `card_attachments`.

### 3.8 Calendar (`public_html/calendar/`)
- **Unified Schedule & Month Grid:**
  - Aggregates dated Kanban cards across all boards and generated financial dues (`Pay` debts and `Receive` credits) from `finance-obligations.php`.
  - 42-day **Month view** with mini-calendar sidebar, **Schedule view**, **Overdue filter**, **Include completed** toggle, per-board and Financial commitments filter checkboxes, and live text search.
  - Clicking an event opens the corresponding Kanban card modal or Finance obligation occurrence directly.

### 3.9 SMART Goals (`public_html/goals/`, `public_html/assets/goal-progress.js`, `lib/goals.php`)
- **SMART Goal Wizard & Management (`edi_goals_v1`, `edi_goals_drafts_v1`):**
  - Title, category, priority (`low`, `medium`, `high`), start date, deadline, SMART fields (`specific`, `achievable`, `relevant`, `timeBound`), notes, and draft saving.
  - Voice input support for textareas.
  - **Automatic Todo Creation & Sync:** Creating, updating, or deleting a SMART goal (via `#goals`, `/api/v1/goals`, `/api/v1/tasks`, or Kanban "Move to goal") automatically creates, updates, or deletes the corresponding Todo item and subtasks in `edi_todos_v1`.
  - Includes a `Todo ✓` sync badge on goal cards, a **⇄ Sync Todo** header action, and an **Open in Todo ↗** button inside the Goal Detail modal for instant cross-app navigation.
- **Three Progress Sources (`progressSource`):**
  1. **Checklist (`tasks`):** Inline-editable, sortable, and filterable checklist items with optional due dates.
  2. **Success Measures (`measure`):** Numeric metrics with `metric`, `target`, `current`, and `unit` (averages capped current/target ratios).
  3. **Linked Habit (`habit`):** Links a SMART goal to a Habittify habit with a target number of completed days between `startDate` and `deadline`, automatically computing progress and quarter milestones from actual attendance logs.

### 3.10 Notepad & Sticky Notes (`public_html/notepad/`, `public_html/notes/`, `lib/notes.php`)
- **Markdown Notepad (`public_html/notepad/`, `edi_notepad_v1`):**
  - Multi-note tabbed editor with manual drag-and-drop / arrow reordering, alphabetical or recent sorting, live Markdown preview (headings, tables with column alignment, fenced code blocks, blockquotes, links, interactive task list checkboxes), word/character/reading-time stats, cursor line/column indicator, Web Speech voice dictation, and `.md` file download.
  - **Automatic RTL/LTR BiDi Detection:** Detects Persian/Arabic/Hebrew script dominance per note and per preview block while keeping code blocks LTR.
- **Sticky Notes Canvas (`public_html/notes/`, `edi_notes_v1`):**
  - Freeform 2D spatial canvas with snap-to-grid (`32px`) draggable and resizable sticky notes.
  - 6 colors (`yellow`, `pink`, `blue`, `green`, `lavender`, `peach`), 3 font families (`sans`, `serif`, `mono`), adjustable font size (`11–28px`), and inline Markdown rendering.
  - **Visual Note Connections:** Connect pairs of sticky notes with interactive SVG cubic-bezier curves (`connections: [{a, b}]`).
  - **Secret Notes:** Lock/hide notes (`secret: true`) so they are masked in the UI, excluded from search, and hidden from API/MCP reads by default.

### 3.11 Settings & Preferences (`public_html/settings/`, `public_html/assets/currency.js`)
- **Preferences:**
  - Theme selection (**Dark** / **Light**) synced across all workspace theme keys.
  - Display currency selector supporting **31 currencies** (IRT/Toman default, IRR, USD, EUR, GBP, AED, TRY, CAD, AUD, CHF, JPY, CNY, INR, SEK, NOK, DKK, PLN, CZK, BRL, MXN, ARS, CLP, COP, SAR, QAR, KWD, EGP, ZAR, NGN, PKR, BDT).
  - Habittify calendar selector (**Gregorian** / **Jalali**).
  - Browser due-date notifications toggle (`due-alerts.js`).
- **My Account & Accounts Administration:** Self-service username/password update, sign out (`POST /logout.php`), and multi-admin account management modal.

---

## 4. Cross-Cutting Alerts & Notifications (`public_html/assets/due-alerts.js`)
- **In-App Due Bell & Overview Banner:**
  - Collects open dated Kanban cards, active SMART goal deadlines, and unpaid/unskipped Finance obligations.
  - Groups items into **Overdue**, **Today**, and **Coming up** (next 24h for timed cards, 3 days for date-only items).
- **Browser Notifications:**
  - Fires native desktop/browser `Notification` alerts at due time and at configured earlier card reminder intervals (`5`, `60`, or `1440` minutes before) within a 6-hour window, remembering shown alerts per device in `localStorage`.

---

## 5. External HTTP API (`/api/v1`) & MCP Server (`api.php`, `lib/`, `mcp/`)
- **Token-Protected REST API (`/api/v1`):**
  - Dedicated bearer token authentication (`LIFEOS_API_TOKEN` or `config.php` `api_token`, minimum 32 chars) bound to `api_user_id` (default `1`).
  - Endpoints:
    - `GET /api/v1/health`
    - `GET /api/v1/dashboard`
    - `GET / POST /api/v1/goals`, `GET / PATCH / DELETE /api/v1/goals/{id}`
    - `GET / POST /api/v1/tasks`, `GET / PATCH / DELETE /api/v1/tasks/{id}`, `POST /api/v1/tasks/{id}/complete` (bridges both Goal checklist tasks and Kanban board cards)
    - `GET /api/v1/habits`, `GET /api/v1/habits/today`, `POST / DELETE /api/v1/habits/{id}/complete`
    - `GET /api/v1/finance`, `GET / POST /api/v1/finance/expenses`, `GET / POST /api/v1/finance/incomes`
    - `GET / POST /api/v1/notes`, `GET / PATCH / DELETE /api/v1/notes/{id}` (respects `api_allow_secret_notes`)
- **Model Context Protocol (MCP) Server (`mcp/`, `@edicodes/lifeos-mcp` v2.0.0):**
  - Official MCP SDK stdio server with Zod validation and **15 tools**:
    - Read tool: `lifeos_query` (`dashboard`, `goals`, `goal`, `tasks`, `task`, `habits`, `today_habits`, `finance_summary`, `expenses`, `incomes`, `notes`, `note`).
    - Write tools: `lifeos_create_goal`, `lifeos_update_goal`, `lifeos_delete_goal`, `lifeos_create_task`, `lifeos_update_task`, `lifeos_complete_task`, `lifeos_delete_task`, `lifeos_complete_habit`, `lifeos_uncomplete_habit`, `lifeos_log_expense`, `lifeos_set_income`, `lifeos_create_note`, `lifeos_update_note`, `lifeos_delete_note`.

---

## 6. Deployment, Configuration & Testing Infrastructure
- **Docker & Docker Compose (`Dockerfile`, `docker-compose.yml`, `docker-compose.image.yml`, `docker/config.php`):**
  - PHP 8.3 + Apache container paired with MySQL 8.4 container, healthchecks, persistent volumes (`./mysql`, `./attachments`), and environment-driven configuration (currently configured in `docker-compose.yml` for port `8784`, database `thedukelifeosdb`, timezone `Asia/Dhaka`, and location `Mohakhali, Dhaka`).
- **Database Schema & Migrations (`migrate.php`, `lib/schema.php`):**
  - Advisory-locked (`GET_LOCK`) automatic and CLI schema migrations across versions 1, 2, and 3 (`schema_migrations`).
- **Comprehensive Test Suite (`tests/`, `mcp/test/`):**
  - Node.js unit tests (`due-alerts.test.mjs`, `frontend-syntax.test.mjs`, `growth-model.test.mjs`, `html-escape.test.mjs`, `notepad.test.mjs`, `timer.test.mjs`).
  - PHPUnit & standalone PHP integration tests (`LibraryTest.php`, `api_test.php`, `api_mysql_test.php`, `obligations_test.php`, `kanban_goal_test.php`, `credentials_test.php`, `logout_test.php`, `proxy_test.php`, `migrations_test.php`, `habittify_logs_test.php`, `habittify_rollback_test.php`).
  - MCP server test suite (`cli.test.js`, `local-api.test.js`, `protocol.test.js`, `tools.test.js`).

