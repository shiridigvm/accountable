# Setup, sample data, technical design and testing

Part of the product spec. Read `docs/spec.md` first. Requirement and decision numbers match the rest of the spec.

## Requirements

### Setup

- **R26**: `npm run dev` starts the backend and the frontend together on `127.0.0.1`. It reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `.env` and leaves `DATABASE_URL` out, so its data stays in the local SQLite file. It turns on test sign-in (R43 in `accounts.md`) so ui-check can sign in. The app opens at http://127.0.0.1:5173, on the sign-in screen when signed out and on the dashboard after signing in.
- **R27**: `npm run seed` replaces the local SQLite database with the sample data. When `DATABASE_URL` points at Postgres, it refuses, says why, and changes nothing, so nobody wipes the team's data by mistake.
- **R28**: When the database is new or empty, the first start runs the migrations and fills it with sample data. This holds for a new SQLite file and for an empty Postgres database on Supabase, which is seeded once. A database with data in it is never replaced.
- **R29**: The app needs an internet connection, for Supabase Auth and, in the built app, Supabase's Postgres. The tests run without one. Fonts are bundled, not loaded from Google Fonts at run time.

### Settings

- **R55**: The settings live in the git-ignored `.env` file as `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. When `DATABASE_URL` is not set, the backend uses the local SQLite file. The settings are never committed or logged, and only the URL and publishable key reach the browser (R41).

### Running it the way Render does

- **R56**: `npm start` builds the frontend and runs the app on this computer the way Render runs it: one FastAPI process serving the built frontend and the API at http://127.0.0.1:8000, using all three settings from `.env`, against Supabase. Its migrations change the real database.
- **R57**: The app deploys to Render's free plan as one web service, described in `render.yaml`. Render builds the frontend, runs the migrations when the app starts, and serves it at its onrender.com address. The three settings are entered in Render, not written in `render.yaml`. Render deploys `main` each time CI passes on it.

## Sample data

Created by `npm run seed`, and on first start when the database is new.

- 6 organizations across several industries.
- 20 contacts: leads, qualified contacts and customers. Some have no organization.
- 25 deals at every stage. Won and lost deals across the past 12 months. Open deals expected to close in the next 6 months. A few open deals with expected close dates in the past (late).
- 40 activities: notes, calls and emails. Some follow-ups due in the next 14 days, some overdue, some done.
- Dates are computed from today when the data is written.
- Every record shows "Sample data" as who added and last changed it.

The seed data is fixed, not random, so the same reset gives the same records.

## Technical design

Per `docs/TECH_STACK.md`.

- **Frontend** (`frontend/`): TypeScript, React 19, Vite, React Router. TanStack Table for tables, Recharts for charts, dnd-kit for the pipeline. Unit tests with Vitest and Testing Library.
- **Backend** (`backend/accountable/`): Python 3.12, FastAPI, SQLAlchemy Core, with Postgres on Supabase for the built app and SQLite for `npm run dev` and the tests. Business rules live in `backend/accountable/rules/` as functions with no I/O. Managed with uv, with `pyproject.toml` and `uv.lock` at the repo root. Tests in `backend/tests/` with pytest.
- **Sign-in**: Supabase Auth with email and password. The browser signs in with Supabase directly and sends the access token to the backend, which checks it (R40).
- **Database file**: `backend/data/accountable.db`, git-ignored. The `ACCOUNTABLE_DB` environment variable points elsewhere. The end-to-end tests use a separate file.
- **Root scripts** in `package.json`: `npm run dev`, `npm start`, `npm test`, `npm run seed`, plus `typecheck`, `lint` and `build`. `frontend/` and `e2e/` are npm workspaces.
- **Render**: `render.yaml` sets `PYTHON_VERSION` to a 3.12 release, since Render's default Python is newer, and `TZ` to the team's time zone. Render's free plan sleeps after 15 minutes without visits and takes about a minute to wake.
- **Fonts**: bundled through the `@fontsource` packages, so no font is loaded from Google Fonts (R29).

## Testing

`npm test` runs three suites and fails if any test fails. Every suite uses its own SQLite database and test sign-in (R43), and never touches Supabase, whether or not the settings are in `.env`. CI needs no secrets. Every unit test, backend and frontend, runs in under a second on the developer's computer, because CI runs on a much slower machine.

- Backend unit and API tests (pytest), covering the rules in the area files and the API in `data.md`, including the 401 on every route without a valid token, who added and changed a record, search, the seed's refusal on Postgres, and the refusal to start with test sign-in on Postgres. Restart persistence is tested by opening a new app instance on the same file.
- Frontend unit tests (Vitest), covering formatting, board layout, dashboard data, tables, dialogs, the forms, the sign-in screen, search, the user menu and its initials, the theme choice including System, and the color tokens (light values unchanged, no colors outside `styles.css`, dark-mode contrast for R36).
- End-to-end tests (Playwright Test, with the installed Google Chrome) in `e2e/tests/`. They start the app on their own servers and database, covering the sign-in screen when signed out, test sign-in and sign out, tables, the contacts filter, delete refusals, detail pages with who added a record, search, the pipeline, the dashboard, and picking a theme in the user menu and keeping it after a reload.

Not covered by automated tests: signing in through Supabase Auth, the app on Postgres and on Render (checked by hand with `npm start` and the live site), visual comparison with the mockup, how dark mode looks, Safari, Firefox and Edge, and browser restart.

## Design decisions

Choices the requirements leave open, with the reason for each.

- **6. Fonts bundled** rather than loaded from Google Fonts. The app needs the internet for Supabase, but bundled fonts keep the tests offline and the pages quick to load.
- **19. `npm run dev` leaves `DATABASE_URL` out.** `.env` holds the Postgres address for `npm start` and Render, and a development run must not change the team's data.
- **20. `npm run dev` turns on test sign-in.** ui-check works on the app that `npm run dev` runs and has no password. Its data is the local SQLite file, so R43's Postgres check still keeps test sign-in away from the real data.
- **21. `TZ` set on Render.** Render runs on UTC, and "today" drives late deals, follow-ups and the dashboard, so it has to be the team's date.
