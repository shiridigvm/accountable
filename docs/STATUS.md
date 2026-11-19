## Status

The MVP is built to the plan in `docs/changes/mvp/plan.md`. Each phase has its tests, and the full suite is run with `npm test`.

Design and spec:

- `docs/changes/mvp/intent.md`: what the MVP was for. Settled.
- `docs/spec.md`: the product as built today: requirements, data model, API, screens.
- `docs/mockups/final.html`: the approved dashboard and pipeline design. The built app follows it.

## In progress: dark mode (branch `dark-mode`)

- `docs/changes/dark-mode/intent.md`: agreed.
- `docs/spec.md` already describes the product with dark mode, as it will be once this branch is merged: new section 3.9 (R32 to R36), mode-aware colors, surfaces and tokens in 6.1, the toggle in 6.2, the new tests in section 9, and design decisions 10 and 11. The app does not have dark mode yet.
- Next: `docs/changes/dark-mode/plan.md`. Open points for the plan:
  - A dark-mode color for the Negotiation stage. Its current color (`#3e6373`) is about 2.5:1 on the dark page, below the 3:1 that R36 requires.
  - Cerulean and Raspberry small text on the dark page are below 4.5:1, so they go on panels only, or use lighter versions.
  - Chart colors in `Dashboard.tsx` and stage colors in `lib/stages.ts` are hardcoded and need to move to tokens.
  - White text on Cerulean is about 4:1 in light mode today. Either R36 is narrowed to dark mode, or this is fixed.
  - Still to decide: the toggle's label, what happens when localStorage is unavailable, and the lightened Sea Green and Marigold values.

## How to run

Needs Node (24 or later), npm, and uv. Python 3.12 is pinned in `.python-version`.

```
npm install
npm run dev
```

Then open http://127.0.0.1:5173. The app starts on the dashboard. The first start creates the database and fills it with sample data. Data is kept in `backend/data/accountable.db`.

To reset to the sample data:

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
- CI: `.github/workflows/ci.yml` runs on every push. It scans the repo with gitleaks first, then runs `npm run check` on GitHub's Ubuntu runner with Node 26, uv and the preinstalled Google Chrome. On failure it uploads the Playwright HTML report (`e2e/playwright-report`). No secrets are used. The Playwright config now writes that HTML report as well as the list output.
- Timeline errors on the organization, contact and deal pages showed "Something went wrong." instead of the server's message. The message is now shown (`frontend/src/pages/DealDetail.test.tsx`).

## Known gaps

- Only Chrome is tested automatically. Safari, Firefox and Edge have not been checked.
- The app has not been checked by eye in a real browser session yet. That is the user's check (criterion 8).
- Visual comparison with `final.html` is by eye only, not automated.
- The dashboard chunk is larger than 500 kB because Recharts is bundled in one piece. This is a build warning, not an error.
- Restart persistence is tested at the API level (a new app instance on the same file). The browser tests do not restart the server.
- Nothing is committed yet. The user does the commits.
