## Status

The MVP is built to the plan in `docs/plan.md`. Each phase has its tests, and the full suite is run with `npm test`.

Design and spec:

- `docs/intent.md`: what we are building. Settled.
- `docs/spec.md`: requirements, data model, API, screens. All decisions are recorded in its Decisions section, which the user asked to be made without them. A change goes into the spec first.
- `docs/mockups/final.html`: the approved dashboard and pipeline design. The built app follows it.

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

## Known gaps

- Only Chrome is tested automatically. Safari, Firefox and Edge have not been checked.
- The app has not been checked by eye in a real browser session yet. That is the user's check (criterion 8).
- Visual comparison with `final.html` is by eye only, not automated.
- The dashboard chunk is larger than 500 kB because Recharts is bundled in one piece. This is a build warning, not an error.
- Restart persistence is tested at the API level (a new app instance on the same file). The browser tests do not restart the server.
- Nothing is committed yet. The user does the commits.
