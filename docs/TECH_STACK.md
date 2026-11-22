This project will use the following high level technical stack:

1. Node.js 26, the current LTS (24 or later works) / TypeScript for the frontend, using React and Vite, in `frontend/`
2. Python 3.12 for the backend using uv, with FastAPI, in `backend/`, with `pyproject.toml` and `uv.lock` at the repo root

The frontend gets its data from the backend's JSON API. The backend keeps the data in Postgres on Supabase for the built app, and in a local SQLite file for `npm run dev` and the tests, using SQLAlchemy Core with no raw SQL, and fills it with the sample data when the database is new. Alembic migrations create and change the tables. The one piece of raw SQL is the migration that turns on row-level security, which Core cannot express.

Prefer popular, well-supported libraries to custom code, such as for the data tables, the charts and the drag-and-drop pipeline. Don't hand-roll what a mature library does well.

Supabase provides sign-in (email and password, through `@supabase/supabase-js` in the browser) and the database. The app deploys to Render's free plan as one web service, described in `render.yaml`.

The Copilot calls OpenRouter's chat completions API from the backend, with Python's `urllib` and no SDK. The key and the model are `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in `.env`. The tests never call OpenRouter: the backend tests replace the call, and the end-to-end tests run a scripted fake (`e2e/fake-openrouter.mjs`).

Commands are npm scripts in a `package.json` at the repo root, with `frontend/` as an npm workspace, so they work the same on Mac, Linux and Windows:

- `npm run dev` starts the backend and the frontend together
- `npm start` builds the frontend and runs the app the way Render does
- `npm test` runs all the tests and fails if any test fails
- `npm run seed` resets the local SQLite database to the sample data. It refuses to run against Postgres

`docs/STATUS.md` says how to run the app. `README.md` is the course's own guide, so leave it as it is.

Testing will cover:

1. Unit tests for the frontend, using Vitest
2. Unit tests for the backend, using pytest
3. End-to-end tests of the whole app in a browser, in `e2e/`, using Playwright Test (`@playwright/test`) with the installed Google Chrome. They start the app themselves, so `npm test` needs nothing else running.

The tests use a database of their own, so running them never changes your data.
