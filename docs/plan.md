# Plan: building the Accountable MVP

Built from `docs/intent.md` and `docs/spec.md`. The design is `docs/mockups/final.html`. This plan lists the files, the order, the risks and the tests. No code is written yet.

All nine decisions in `spec.md` are made, and the user asked for them to be made without them. Items 1, 2 and 4 shape the data model. Item 3 shapes the contact timeline in Phase 4. Item 9 shapes the stage rules in Phase 2. A change to any of them goes into the spec first.

## 1. Files that change

Nothing in the repo is code yet. The repo root has `AGENTS.md`, `README.md` (course guide, not changed), `course/`, `assets/`, `community_contributions/` and `docs/`.

### New files

| Path | Phase | Purpose |
|------|-------|---------|
| `package.json` (root) | 0 | Workspaces (`frontend`, `e2e`). Scripts: `dev`, `test`, `seed`. |
| `pyproject.toml`, `uv.lock` (root) | 0 | Python 3.12 backend dependencies, managed with uv. |
| `backend/app/main.py` | 0, 1 | FastAPI app, router registration, first-start database setup. |
| `backend/app/db.py` | 1 | SQLite engine and connection, file path from config. |
| `backend/app/schema.py` | 1 | SQLAlchemy Core table definitions (section 2 of spec). |
| `backend/app/seed.py` | 1 | Fixed sample data, computed from today. Used by first start and `npm run seed`. |
| `backend/app/rules/stages.py` | 2 | Stage order, default probabilities, R5 and R6 logic. |
| `backend/app/rules/delete.py` | 1 | Linked-record checks and 409 response (R14). |
| `backend/app/rules/expected.py` | 2 | Expected revenue and late flag (R10, R21). |
| `backend/app/rules/timeline.py` | 4 | Merged timelines (R11). |
| `backend/app/rules/dashboard.py` | 6 | Monthly series, pipeline, recent activity, follow-ups (R22, R23). |
| `backend/app/routes/organizations.py`, `contacts.py`, `deals.py`, `activities.py`, `pipeline.py`, `dashboard.py` | 1 to 6 | API routes (section 3 of spec). |
| `backend/app/schemas.py` | 1 | Request and response models. |
| `backend/tests/` | 1 to 6 | pytest tests, one file per rule module and route group. |
| `backend/data/` | 1 | Runtime database folder, git-ignored. |
| `frontend/package.json`, `frontend/vite.config.ts`, `frontend/index.html` | 0 | Vite React TypeScript app, npm workspace member, dev proxy to `/api`. |
| `frontend/src/main.tsx`, `App.tsx` | 0, 3 | Entry point, routes, sidebar layout. |
| `frontend/src/styles/tokens.css` | 0 | Brand colors and surfaces from `final.html`. |
| `frontend/src/fonts.ts` | 0 | Bundled fonts via `@fontsource` (R29). |
| `frontend/src/lib/format.ts` | 3 | Money (`$1,234.00`) and date (`Nov 17, 2026`) formatting (R30, R31). |
| `frontend/src/lib/stages.ts` | 3 | Stage names, order, colors. |
| `frontend/src/api/client.ts` | 3 | Typed calls to `/api`, error shape handling. |
| `frontend/src/components/Table.tsx` | 3 | TanStack Table wrapper: search, sort, row actions (R8). |
| `frontend/src/components/RecordDialog.tsx` | 3 | Add and edit form with validation. |
| `frontend/src/components/DeleteDialog.tsx` | 3 | Confirm, and the refusal list from 409 (R13, R14). |
| `frontend/src/pages/Organizations.tsx`, `OrganizationDetail.tsx` | 3, 4 | Table and detail page. |
| `frontend/src/pages/Contacts.tsx`, `ContactDetail.tsx` | 3, 4 | Table with status filter (R9), detail page. |
| `frontend/src/pages/Deals.tsx`, `DealDetail.tsx` | 3, 4 | Table with late flag (R10), detail page. |
| `frontend/src/components/ActivityPanel.tsx`, `Timeline.tsx` | 4 | Log, edit, delete activities (R12), timeline list. |
| `frontend/src/pages/Pipeline.tsx`, `components/PipelineCard.tsx`, `components/PipelineColumn.tsx` | 5 | Board, drag and drop, column totals (R16 to R20). |
| `frontend/src/pages/Dashboard.tsx`, `components/charts/*` | 6 | Stat cards, line and bar charts, funnel, follow-ups, recent (R22, R23). |
| `frontend/src/**/*.test.ts(x)` | 3 to 6 | Vitest unit tests next to the code. |
| `e2e/playwright.config.ts` | 0 | Starts the app, uses the installed Chrome and a separate test database. |
| `e2e/tests/*.spec.ts` | 1 to 7 | Browser tests (section 4). |

### Existing files that change

| Path | Phase | Change |
|------|-------|--------|
| `.gitignore` | 0 | Add `backend/data/`, `node_modules/`, `frontend/dist/`, test database files, and the Playwright output folders. Check each entry against the current file first. |
| `docs/STATUS.md` | every phase | Record what is done and what is next. Required by `AGENTS.md`. |
| `docs/spec.md` | when a decision changes | Update the affected requirement or the decision entry. |

Not changed: `README.md`, `course/`, `assets/`, `community_contributions/`, `docs/intent.md`, `docs/TECH_STACK.md`, `docs/BRAND.md`, `.claude/`.

## 2. Order of work

Each phase ends with a working app and passing tests for that phase. Phases run in order because each one depends on the one before.

### Phase 0: Setup

- Root `package.json` with npm workspaces, and scripts `dev`, `test`, `seed` (empty until later phases fill them in).
- `pyproject.toml` and `uv.lock` with FastAPI, SQLAlchemy, uvicorn, pytest.
- Frontend scaffold: Vite, React, TypeScript, brand tokens, bundled fonts, a page that shows "Dashboard" with the sidebar.
- `e2e/` scaffold: Playwright config that starts the dev servers and uses Google Chrome.
- `npm run dev` starts backend and frontend together (cross-platform process runner, see Risks).
- The backend binds to `127.0.0.1` only, so the app is not reachable from other machines on the network.
- `docs/STATUS.md` gets the run instructions. Criterion 1 needs the one documented command, and `README.md` stays as the course's guide.
- Add lint, typecheck (`tsc`) and production build (`vite build`) commands to the root scripts. Tool choices are proposals to check at build time.

**Done when:** `npm run dev` opens a blank branded page in the browser; `npm test` runs with zero tests failing; `uv run -m pytest` passes with no tests collected or with a smoke test.

### Phase 1: Database and first records

- Core tables from spec section 2. Database created on first start.
- Seed script with the fixed sample set (spec section 5), dates relative to today.
- CRUD for organizations, contacts and deals (basic fields only, no stage logic yet). Deals in this phase are created through the API only. The UI form for adding deals comes in Phase 3, after the Phase 2 rules that set default probability and close date.
- Delete rules for organizations and contacts (R14).
- `npm run seed` resets the database.
- Startup seeds only when the database file is new. An existing file is never overwritten on start (R25, R28).

**Decided:** spec items 1 and 2. Stage changes get their own table, and deleting a deal removes its history.

**Done when:** the API creates, reads, updates and deletes these records; deletes with linked records return 409 with counts; the database survives a restart; `npm run seed` brings back the sample data.

### Phase 2: Stage rules and pipeline API

- Stage rules: default probability on stage change (R5), close date set on Won or Lost (R6), stage changes written to `deal_stage_changes`.
- `POST /api/deals/{id}/move` with position re-numbering (R17, R18).
- Expected revenue and late flag (R10, R21).
- `GET /api/pipeline` with column and board totals (R20).
- Activities CRUD, with the rule that an activity links to exactly one record.

**Decided:** spec item 9. Moving from Won or Lost to an open stage clears the actual close date.

**Done when:** the rules pass their unit tests (section 4); the move endpoint keeps order within a column after repeated moves.

### Phase 3: Frontend shell and tables

- Sidebar layout from the mockup, routing for the five sections.
- Organizations, Contacts and Deals tables: search, sort, add, edit, delete (R8).
- Contacts status filter (R9).
- Delete dialog that shows the 409 refusal list (R13, R14).
- Formatting for money and dates (R30, R31).
- Every "today" comparison (late deals, overdue follow-ups) comes from the backend response, not the browser clock. Otherwise the browser and the server can disagree about what is late, and fixed-date tests cannot control the browser.
- Form validation: required name, value of zero or more, probability from 0 to 100, email format if given. Messages appear under each field.
- Empty states: an empty table, an empty pipeline column and a deal with no activity each show a short message, not a blank area.
- API errors (server down or a 500) show a message and do not leave the screen in a loading state.

**Done when:** success criteria 2 and 3 pass in the browser tests for the tables.

### Phase 4: Detail pages and activities

- Organization, contact and deal detail pages with linked records (R11).
- Activity log, edit and delete from contacts and deals (R12).
- Timelines: merged, newest first, including stage changes (R11).

**Decided:** spec items 3 and 4. The contact timeline includes activities of deals where it is main contact, and the organization timeline includes stage changes. Stage change entries use the wording from the intent: "Moved from Proposal to Negotiation".

**Done when:** success criteria 3 and part of 5 pass in the browser tests.

### Phase 5: Pipeline board

- Six columns from the mockup, cards with late tags.
- Drag between columns (stage change) and within a column (position), with one `move` call per drop, immediate update, and revert on failure (R17, R18).
- Add a deal from a column at that stage (R19).
- Column and board totals update on each move (R20).

**Done when:** success criterion 4 passes in the browser tests, including reload after a drop.

### Phase 6: Dashboard

- Four stat cards, revenue line chart and deals-won bar chart over 19 months (R22).
- Pipeline funnel of open stages (R23).
- Follow-ups: upcoming (14 days) and overdue, with mark-done that removes the item (R23).
- Recent activity including stage changes.

**Done when:** success criteria 5 and 6 pass in the browser tests; dashboard figures match the API values used by the tables (R24).

### Phase 7: Hardening

- Check the console has no errors on every screen.
- Check the brand on every screen against `final.html`.
- Run the full `npm test`, typecheck, lint and build.
- Fresh clone: follow only the instructions in `docs/STATUS.md` (install, `npm run dev`, `npm run seed`). Any step that needs a note outside that file is a gap to fix.
- Update `docs/STATUS.md` and hand the app to the user for the check in criterion 8.

**Done when:** `npm test` passes; the user has done the check in criterion 8.

## 3. Risks

| Risk | Effect | Response |
|------|--------|----------|
| Decisions change later | Rework in a finished phase | Decisions are recorded in the spec. A change goes into the spec first. |
| Within-column reordering with drag and drop is harder than moves between columns | Phase 5 slips | Use dnd-kit's sortable support, and test reorder in Phase 5 before adding the rest. |
| Sample data is relative to today | Tests that assert specific dates fail on other days | Add a test-only "today" setting, read from the environment, that both the seed and the rules use. Tests set it to a fixed date. |
| Time zones | Late flags and monthly buckets shift by a day | Store dates without a time. Use the machine's local date for "today" everywhere. Test with a fixed date. |
| `npm run dev` must start two processes on Mac, Linux and Windows | Setup breaks for some users | Use a cross-platform process runner (for example `concurrently`). Check it on each platform before Phase 7. Mark as unverified until checked. |
| Only Chromium is tested automatically | Safari, Firefox and Edge may break | Run the browser tests on Chrome. Check the other browsers by hand before Phase 7. Say in the status file that the other browsers are not automated. |
| Pipeline visual differs between spec and mockup | Confusion at review | Decided: stacked bar. Spec 4.3 is updated to match `final.html`. |
| Sample data size differs between mockup and spec | Wrong expectations at review | The mockups have 29 deals. Follow the spec: 6 organizations, 20 contacts, 25 deals, 40 activities. |
| Bundled fonts add size | Slow first load | Bundle only the weights the design uses. Measure the build size in Phase 7. |
| Deleting a deal with activities is refused | User is surprised the seeded deals cannot be deleted | Dialog text says what to remove first (R14). Check this in the browser test for criterion 2. |
| Tests share a database with development | Test runs change the user's data | E2E tests use their own database file (spec section 6). Check that the dev file is not touched by a test run. |
| Browser and server disagree on "today" | A deal is late in one place and not the other | Backend supplies all "today"-based flags (Phase 3). The test "today" is set once for both. |
| Reopening a Won or Lost deal | Close date inconsistent | Decided (spec item 9) and covered by a unit test. |
| App reachable from the network | Local data exposed to other machines | Bind to `127.0.0.1` only, and test it (section 4). |
| Startup overwrites data | User loses changes on restart | Seed only on a new database file, with a test (section 4). |
| Accessibility gaps in drag and dialogs | Keyboard users cannot add, move or delete | dnd-kit keyboard sensor, focus returns to the page after a dialog closes, tested in Phase 5 and in the manual checks. |

## 4. Proof

Proof is the list of tests that must pass before a phase is called done. Every phase also passes typecheck, lint and the production build, using the commands added in Phase 0. The user's own check (criterion 8) is separate and comes last.

### Unit tests: backend (pytest, `backend/tests/`)

- **Stage rules (R5, R6):** a stage change sets the default probability; a hand-set probability is kept while the stage stays the same; moving to Won or Lost sets the actual close date to today; an existing actual close date is not changed; moving between open stages leaves the close date alone; moving from Won or Lost to an open stage clears the close date; moving from Won to Lost keeps it.
- **Position (R18):** after a move within a column, positions are whole numbers in the right order; after a move between columns, both columns are re-numbered; repeated moves keep the order.
- **Expected revenue and late flag (R10, R21):** value times probability; Won and Lost count as zero in expected revenue; an open deal with an expected close date before today is late; a won deal is never late.
- **Delete rules (R14):** organization with contacts or deals is refused with counts; contact with activities or as main contact is refused; deal with activities is refused; activity delete is never refused; deleting a deal removes its stage history (spec item 2).
- **Activity links:** an activity with both or neither of contact and deal is rejected.
- **Timelines (R11):** merged, newest first; organization timeline includes contacts' and deals' activities; stage changes appear where decided.
- **Dashboard series (R22, R23):** 19 months from 12 back to 6 ahead; won count and revenue fall in the month of the actual close date; follow-ups split into upcoming (within 14 days) and overdue; done follow-ups are excluded.
- **Seed (R27, R28):** the seed creates 6 organizations, 20 contacts, 25 deals and 40 activities; running it twice gives the same records; dates move with the fixed test "today".
- **Persistence (R25):** a record written in one database session is read back in a new session.
- **Startup (R28):** starting with an existing database file leaves its records unchanged; starting with no file creates it with sample data.
- **Money rounding (R21, R30):** expected revenue rounds to the cent, half up; totals are sums of cents, not floats.
- **Validation:** value below zero rejected; probability outside 0 to 100 rejected; blank name rejected; activity with neither or both links rejected.
- **Empty results:** organization, contact and deal lists return empty lists, not errors; a deal with no activity has an empty timeline; dashboard with no deals returns zero figures.
- **Network binding:** the server is configured to listen on `127.0.0.1` only.

### Unit tests: frontend (Vitest, next to the code)

- **Formatting (R30, R31):** money shows `$1,234.00`; dates show `Nov 17, 2026`; zero and large numbers.
- **Stage helpers:** order, colors, which stages count as open.
- **Table logic:** search matches name and organization; sort ascending and descending; status filter for contacts.
- **Pipeline logic:** a drop computes the target stage and position; column totals and board totals update after a move; a failed move reverts the board.
- **Dashboard logic:** stat values from data; late tags appear for late deals only.
- **Delete dialog:** shows the refusal list from a 409 response and no delete button.
- **Forms:** validation messages appear under the right field; the form does not submit while invalid.
- **Keyboard:** add, edit and delete work with the keyboard alone; the pipeline card can be picked up and moved with the keyboard sensor.
- **Late flags:** tables and pipeline cards use the backend's late flag, not the browser's date.

### End-to-end tests (Playwright Test, `e2e/tests/`, Google Chrome, separate test database)

Each test starts from a fresh seed and a fixed test "today".

- **Start (criterion 1):** `npm run dev` opens the app and lands on the dashboard; each section has sample data on screen.
- **Tables (criterion 2):** for organizations, contacts and deals: add a record, search for it, sort by a column, edit it, delete it; a delete with linked records is refused and the dialog lists what to remove; after a reload, the change is still there; after restarting the app, the change is still there; the reset command brings back the sample data.
- **Filter and links (criterion 3):** contacts filtered by each status; a detail page shows its organization and its linked records.
- **Pipeline (criterion 4):** drag a deal to Won: stage, probability 100% and close date today show in the board and in the deals table; drag a card to a new place in its own column and reload: the card stays there; add a deal from a column and it starts at that stage; column totals change on the move without a reload; a late deal shows the Late tag.
- **Activities and timelines (criterion 5):** log a call on a deal with a follow-up; it appears at the top of the deal timeline; a stage change appears in the timeline and in recent activity; the organization timeline shows the activity; a follow-up appears on the dashboard as upcoming or overdue; marking it done removes it from the dashboard.
- **Dashboard figures (criterion 6):** the stat cards, the chart totals and the pipeline funnel match the values from the API; after a deal is marked won, the won figures increase.
- **Console:** every page loads with no errors in the browser console.
- **Activity edit and delete (R12):** an edited activity shows the new text in the timeline; a deleted one is removed from the timeline and the dashboard.
- **Table late flag (R10):** an open deal past its close date shows the flag in the Deals table, not only on the pipeline.
- **Stage wording:** a stage change shows "Moved from Proposal to Negotiation" in the deal timeline.
- **Validation and errors:** an invalid form shows field messages and does not save; a stopped backend shows an error message.
- **Empty states:** a new empty database shows the empty messages on each section.
- **Data safety:** a full test run leaves the development database file byte-for-byte unchanged.
- **Visual comparison (criterion 7, partial):** screenshots of the dashboard and pipeline at 1440 px wide are compared with `docs/mockups/final.png`. The tolerance is set in Phase 6 and recorded in `docs/STATUS.md`. The user's check is still required.

### Manual checks (before Phase 7 is called done)

- Run the app on Safari, Firefox and Edge, since the browser tests cover Chrome only.
- Run `npm run dev` on Windows and Linux as well as Mac.
- Check the layout at the desktop widths in the spec and at a narrow laptop width.
- Keyboard-only run of the add, edit, delete and move flows.

### Not covered by automated tests

- Safari, Firefox and Edge (manual check only).
- Phone layout (out of scope).
- The user's end-to-end check (criterion 8).
