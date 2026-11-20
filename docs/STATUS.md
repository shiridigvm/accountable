## Status

The MVP is built to the plan in `docs/changes/mvp/plan.md`. Each phase has its tests, and the full suite is run with `npm test`.

Design and spec:

- `docs/changes/mvp/intent.md`: what the MVP was for. Settled.
- `docs/spec.md`: a summary of the product as built today, with an index of the area files in `docs/specs/`, which hold the requirements, data model, API and screens, one file per product area.
- `docs/mockups/final.html`: the approved dashboard and pipeline design. The built app follows it.

## Sign-in, search and a user menu (branch `multi-user`)

Built to `docs/changes/multi-user/plan.md`, phases 1 to 4. Departures are written into the plan.

- Sign-in: Supabase Auth with email and password in the browser (`frontend/src/lib/auth.ts`). The backend checks every token with Supabase's `/auth/v1/user` and caches good ones for 5 minutes (`backend/accountable/auth.py`). Every router except `routes/auth.py` needs a token. The sign-in screen replaces the page at the same URL (`components/AuthGate.tsx`, `pages/SignIn.tsx`).
- Test sign-in (`ACCOUNTABLE_TEST_SIGN_IN=1`): an email and no password, for the end-to-end tests and ui-check. The app refuses to start with it on Postgres. `npm run dev` turns it on.
- Database: SQLite for `npm run dev` and the tests, Postgres on Supabase through `DATABASE_URL` for `npm start` and Render. Alembic migrations run at startup (`backend/accountable/migrate.py`, `migrations/`). A database with no tables is seeded once. Row-level security is on for every table on Postgres.
- Who added and last changed each organization, contact, deal and activity: set by the backend from the token, shown on detail pages and timeline activities (`components/AddedBy.tsx`).
- Search in the top bar (`components/SearchBox.tsx`, `GET /api/search`). Matching runs in Python (`rules/search.py`), so SQLite and Postgres give the same results.
- User menu under the initials (`components/UserMenu.tsx`): email, Light, Dark or System, and Sign out. System is the default and follows the device. The sidebar toggle is gone.
- Running: `scripts/run.mjs` reads `.env` with Node's own parser. `npm run dev` leaves `DATABASE_URL` out. `npm start` builds the frontend and serves it from FastAPI at http://127.0.0.1:8000 against Supabase. `render.yaml` describes the Render service.
- New dependencies: `psycopg[binary]`, `alembic`, `@supabase/supabase-js` (cases in the plan, choice 1).

## Dark mode (branch `dark-mode`)

Built to `docs/changes/dark-mode/plan.md`, all phases done.

- Every color is a token in `frontend/src/styles.css`, light under `:root` and dark under `:root[data-theme='dark']`. Stage colors (`lib/stages.ts`) and chart colors (`pages/Dashboard.tsx`) use the tokens. Recharts' own white tooltip, dot fill and grey cursor are overridden with tokens too.
- `--cerulean` is now defined, so focus rings are Cerulean as the CSS intended. Before, they fell back to the text color.
- The "Dark mode" toggle (`aria-pressed`) sits at the foot of the sidebar, in `components/Layout.tsx`. `lib/theme.ts` applies and saves the mode. An inline script in `frontend/index.html` applies a saved dark mode before the first paint.
- Tests: `styles.test.ts` (light values unchanged, no color literals outside `styles.css`, every token has a dark value, dark contrast meets R36), `lib/stages.test.ts`, `lib/theme.test.ts`, the toggle in `components/Layout.test.tsx`, and `e2e/tests/theme.spec.ts` (default light, toggle and reload, back to light, no flash with React blocked, keyboard and focus ring, every section and a dialog, blocked storage).
- Screenshots of the dashboard and pipeline in both modes are in `docs/changes/dark-mode/`. Light mode matched the pre-change screenshots byte for byte after the token move; the final light ones differ only by the toggle.
- Vitest now reads `.css?raw` imports (`frontend/vite.config.ts`), so the token tests can read `styles.css`. Other CSS imports stay empty in tests as before.
- Review fixes:
  - The danger button's fill is darker in dark mode (`--raspberry-fill: #d6355d`), so its white text is 4.64:1 and meets R36. Before, it was 3.62:1. `styles.test.ts` now checks that pair.
  - `plan.md` now records what was built: no `readSavedTheme`, no Marigold small-text token, and the dark Raspberry fill.
  - Below 720px wide the sidebar becomes a bar above the content (spec 6.2). Before, it kept its 220px width and the dashboard and pipeline were cut off on a phone.

## How to run

Needs Node (24 or later), npm, and uv. Python 3.12 is pinned in `.python-version`.

```
npm install
npm run dev
```

`.env` holds `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Then open http://127.0.0.1:5173 and sign in, with your Supabase user or with test sign-in. `npm run dev` keeps its data in `backend/data/accountable.db` and never uses `DATABASE_URL`. The first start creates the database and fills it with sample data.

To run the app the way Render does, against the team's Postgres on Supabase (its migrations change that database):

```
npm start
```

Then open http://127.0.0.1:8000.

To reset the local SQLite file to the sample data (it refuses when `DATABASE_URL` points at Postgres):

```
npm run seed
```

To run every test:

```
npm test
```

This runs the backend tests (pytest), the frontend unit tests (Vitest), and the browser tests (Playwright, with the installed Google Chrome). The browser tests start their own servers on a separate database, so they do not touch your data.

Other checks: `npm run typecheck`, `npm run lint`, `npm run build`.

## What is built

- Backend (`backend/accountable/`): FastAPI and SQLAlchemy Core on SQLite. Stage rules, delete refusals, expected revenue, timelines, board layout and dashboard figures are pure functions with unit tests.
- Frontend (`frontend/`): React, Vite, TypeScript. Sections: Dashboard, Organizations, Contacts, Deals, Pipeline. Detail pages for organizations, contacts and deals, with timelines and activity logging.
- Pipeline: drag between stages and within a stage with the mouse or the keyboard. Keyboard: Space to pick up, arrow keys to move, Space to drop. Up and down move one card, left and right move one column.
- Browser tests (`e2e/tests/`) cover the success criteria: tables, the contacts filter, refusals, detail pages, the pipeline, and the dashboard.
- Review fixes (from `docs/REVIEW.md`):
  - Deal edit sends only changed fields. Before, editing a deal's stage in the form re-sent the old probability and close date, which undid R5 and R6. Covered by `frontend/src/pages/Deals.test.ts` and a stage-only PATCH test in `backend/tests/test_api_records.py`.
  - A failed refresh after a saved pipeline move no longer says the move was not saved. A card dropped in Won or Lost loses its Late tag at once (`frontend/src/lib/board.test.ts`).
  - Dashboard follows spec 4.3 and R23: four figures (deals won, revenue won, open pipeline, expected revenue), line and bar charts show won figures only, the late-deals panel and late KPI are removed, and the pipeline visual is a full-width panel above follow-ups and recent activity.
  - The dashboard shows the pipeline's load error too. Before, a failed `/api/pipeline` left it on "Loading…" forever (`frontend/src/pages/Dashboard.test.tsx`).
  - Contacts search matches the organization column even when the first row has no organization. The table's default filter skipped such columns (`frontend/src/components/DataTable.test.tsx`).
  - `.mcp.json` pins `@playwright/mcp` to 0.0.84 instead of `latest`.
  - Not changed: the activity dialog's default date comes from the browser clock. It is a default for a new entry, not a today comparison, so the backend does not need to supply it.

- Quality gates: `npm run check` runs formatting, lint (ESLint with TypeScript, React Hooks and jsx-a11y rules; ruff), complexity (max 15 per function), types (tsc and ty), gitleaks, and `npm test` with coverage of at least 80% (backend pytest-cov and frontend Vitest line coverage). `npm run check:quick` skips the browser tests. `npm run format` fixes formatting.
- Hooks: a lefthook pre-commit hook (`lefthook.yml`) formats staged files, then runs lint, types and gitleaks. It skips tests. The agent's Stop hook runs `npm run check:quick` and blocks once on failure (`.claude/hooks/check-on-stop.mjs`). The agent's PreToolUse hook blocks edits to `.env` files (`.claude/hooks/block-env-edit.mjs`).
- Subagents (`.claude/agents/`, both on Sonnet): `reviewer` reviews a branch with `docs/REVIEW.md`. Its Bash is limited to read-only commands by a PreToolUse hook (`.claude/hooks/read-only-bash.mjs`). `ui-check` checks each page in light and dark mode with the Playwright MCP server, against the brand skill and `docs/spec.md`. It has no edit or shell tools and saves screenshots in `.playwright-mcp/`.
- CI: `.github/workflows/ci.yml` runs on every push. It scans the repo with gitleaks first, then runs `npm run check:quick` on GitHub's Ubuntu runner with Node 26 and uv: formatting, lint, types, gitleaks, backend tests and frontend unit tests. The end-to-end tests do not run in CI; run `npm run check` locally for them. No secrets are used. The Playwright config writes an HTML report (`e2e/playwright-report`) as well as the list output.
- Timeline errors on the organization, contact and deal pages showed "Something went wrong." instead of the server's message. The message is now shown (`frontend/src/pages/DealDetail.test.tsx`).

## Known gaps

- Sign-in, search and the menu (`multi-user`):
  - No automated test signs in through Supabase or runs on Postgres. Those are checked by hand with `npm start` against Supabase: see the plan's Phase 1 checks.
  - A token the backend has cached stays valid there for up to 5 minutes after sign-out.
  - `render.yaml` sets `TZ` to `Australia/Brisbane`, guessed from this computer's time zone, and leaves the region at Render's default (Oregon). Both should match the team and the Supabase region before the first deploy; the region can't change after.
  - Stage changes don't record who made them (R46).
  - The "Unknown" default stays on the who columns (plan, choice 7), so the tests, not the database, catch a write that forgets them.
  - Test sign-in tokens live in the backend's memory, so restarting the backend (or the dev reloader after a backend edit) signs test users out.

- Only Chrome is tested automatically. Safari, Firefox and Edge have not been checked.
- The app has not been checked by eye in a real browser session yet. That is the user's check (criterion 8).
- Visual comparison with `final.html` is by eye only, not automated.
- The dashboard chunk is larger than 500 kB because Recharts is bundled in one piece. This is a build warning, not an error.
- Restart persistence is tested at the API level (a new app instance on the same file). The browser tests do not restart the server.
- Some light-mode colors are below WCAG AA: white on Cerulean (3.96:1), white on Raspberry (3.62:1), Raspberry on its tint (3.09:1), muted text on the page (4.46:1). Left as they are by the dark-mode change, which keeps light mode unchanged.
- The narrow-screen layout (spec 6.2) is tested at 390px on the dashboard and pipeline only (`e2e/tests/layout.spec.ts`). Other pages and sizes between 390px and 720px are not checked.
- Links in tables and the dashboard's "Open the pipeline" link use the browser's default link colors (blue in light mode, a light purple in dark mode), not brand tokens. They meet AA in dark mode. Changing them would change light mode.
- Dark mode has only been checked in Chrome.
