# Plan: sign-in, search and a user menu

Built from `docs/changes/multi-user/intent.md`, `docs/spec.md` and the area files it touches: `accounts.md` (R37 to R49), `search.md` (R51 to R54), `appearance.md` (R32 to R35), `data.md` (R25, R50, data model, API) and `platform.md` (R26 to R29, R55 to R57). This plan lists the files, the order, the risks and the proof. No code is written yet.

## 1. Files that change

### Choices this plan makes

The spec leaves these open. A change to any of them goes into this plan first.

1. **New dependencies, three of them.** The intent asks for a case for each.
   - `psycopg[binary]` (backend): SQLAlchemy needs a driver to reach Postgres. There is no way around it.
   - `alembic` (backend): the schema has to change on an existing SQLite file and on Postgres (R28, data model). Adding columns to a SQLite table means rebuilding it, which Alembic's batch mode does. Writing that by hand is the kind of custom code `docs/TECH_STACK.md` says not to write.
   - `@supabase/supabase-js` (frontend): sign-in, keeping the session across reloads, and renewing the token before it expires (R39). Renewing tokens by hand is easy to get subtly wrong.
   - Not added: a JWT library, `python-dotenv` and `requests`. The reasons are in choices 2 and 6.
2. **How the backend checks a Supabase token (R40).** It sends the token to Supabase's `GET {SUPABASE_URL}/auth/v1/user`, with the publishable key as `apikey`, using Python's `urllib`, and takes the email from the reply. Supabase's docs list this method, and it works whichever kind of signing key the project uses. Each good token is cached in memory with its email for 5 minutes, so a busy page costs one call to Supabase, not one per request. When Supabase can't be reached, the backend answers 503 with "Can't reach the sign-in service.", not 401, so a network blip doesn't sign everyone out.
3. **Test tokens (R43).** `POST /api/auth/test-sign-in` makes a random token that starts with `test-` and keeps it in memory with the email, for the life of the process. A `test-` token is never sent to Supabase. Restarting the backend forgets them all, so `npm run dev --reload` signs ui-check out after a backend edit. That is acceptable for a test sign-in.
4. **One place enforces sign-in.** `main.py` includes every router except `routes/auth.py` with `dependencies=[Depends(require_user)]`. `require_user` puts the email on `request.state.user_email`. A test walks `app.routes` and checks that every `/api` route except the two auth routes answers 401 without a token, so a new router can't skip the check.
5. **Who added a record (R44).** The route takes the email from `request.state` and passes it to `store` or `deals`, which write `created_by` and `updated_by`. `schemas.py` input models don't have those fields, so a value in the request body is ignored. `move_deal` sets `updated_by` on the moved deal only.
6. **Running the app with `.env` (R26, R55, R56).** A small Node script, `scripts/run.mjs`, reads `.env` with Node's built-in `util.parseEnv` (no package needed) and starts the servers:
   - `npm run dev` passes `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `ACCOUNTABLE_TEST_SIGN_IN=1`, and removes `DATABASE_URL` even if the shell has it set.
   - `npm start` builds the frontend and runs uvicorn on `127.0.0.1:8000` with all three settings.
   - Without a `.env`, `npm run dev` still starts. Real sign-in then shows "Can't reach the sign-in service", and test sign-in still works.
   - The backend never reads `.env` itself.
7. **Migrations.** Alembic runs from code (`migrate.py`), with no `alembic.ini`, and the scripts live in `backend/accountable/migrations/`.
   - `0001` creates today's five tables.
   - `0002` adds `created_by` and `updated_by`. Existing rows get "Unknown" (R45), then the default is dropped so a missing value is an error, not a silent "Unknown".
   - `0003` turns on row-level security on Postgres and does nothing on SQLite. Postgres has no SQLAlchemy Core construct for this, so `0003` uses `op.execute("ALTER TABLE … ENABLE ROW LEVEL SECURITY")`. That is the one place with raw SQL, and its comment says why.
   - An existing SQLite file made by `create_all` has the tables but no `alembic_version`. `migrate.py` marks it as being at `0001` first, then upgrades it.
8. **When to seed (R28).** `migrate.py` reports whether the database had no tables before it ran. The app seeds only then. "Empty" means "new", so a team that deletes every record is not re-seeded on the next restart.
9. **Search runs in Python (R51 to R53).** The backend reads the id and name of every organization, contact and deal, plus each contact's organization name, and filters them in `rules/search.py`. It lower-cases A to Z only, matches the text literally, sorts by name and keeps 5 of each kind. Postgres's `lower()` also folds É to é and SQLite's doesn't, so filtering in SQL would break R52. Accountable's data is small (decision 8), so reading every name is cheap.
10. **The sign-in screen appears in place (R39).** `AuthGate` shows the sign-in screen at the URL that was asked for, with no redirect. After signing in, the same URL renders its page.
11. **Theme values.** The localStorage key stays `accountable-theme`. Its values are `light`, `dark` or `system`, and anything else means `system`. The inline script in `index.html` resolves `system` with `matchMedia('(prefers-color-scheme: dark)')` before the first paint. `theme.ts` listens for changes while System is chosen.
12. **CSS per part.** Each part puts its styles in its own CSS file next to its component and uses only the tokens from `styles.css`. Then two parts never edit `styles.css` at the same time. The token test is widened so that every `.css` file other than `styles.css` is checked for color literals.
13. **Where the app listens.** `npm run dev` and `npm start` listen on `127.0.0.1`. Render's start command uses `0.0.0.0` and `$PORT`. The `HOST` constant and its test move to checking the two npm scripts.

### How the parts connect

Each part owns its files, and only that part's agent edits them. These are the agreed interfaces between parts:

| Interface                                                                                                                                                                       | Made by | Used by                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------- |
| `GET /api/auth/config` → `{supabase_url, supabase_publishable_key, test_sign_in}`. `POST /api/auth/test-sign-in` `{email}` → `{access_token, email}`. `GET /api/me` → `{email}` | A       | C, F                            |
| `require_user` dependency, `request.state.user_email`, and the `client` fixture in `backend/tests/conftest.py` that sends a test token                                          | A       | B                               |
| `accountable.routes.search.router` for `GET /api/search?q=` → `{organizations: [{id, name}], contacts: [{id, name, organization_name}], deals: [{id, name}]}`                   | B       | A (includes it in `main.py`), D |
| `useSession()` → `{email}`, and `signOut()`, from `frontend/src/lib/auth.ts`                                                                                                    | C       | E                               |
| Test session kept in localStorage as `accountable-test-session` (`{access_token, email}`)                                                                                       | C       | F                               |
| `<SearchBox />` from `frontend/src/components/SearchBox.tsx`                                                                                                                    | D       | E                               |

### Part A: backend database and sign-in

| Path                                                                                                                          | Phase | Change                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pyproject.toml`, `uv.lock`                                                                                                   | 1     | Add `psycopg[binary]` and `alembic` (choice 1).                                                                                                                                                                                                                                 |
| `backend/accountable/config.py`                                                                                               | 1     | `database_url()` (`DATABASE_URL`, else the SQLite path, with `postgres://` and `postgresql://` turned into `postgresql+psycopg://`), `is_postgres()`, `test_sign_in_enabled()`, the Supabase settings. Drop `HOST`.                                                             |
| `backend/accountable/db.py`                                                                                                   | 1     | `make_engine(url)`: the foreign-keys pragma for SQLite only, and `pool_pre_ping` for Postgres.                                                                                                                                                                                  |
| `backend/accountable/migrate.py` (new)                                                                                        | 1     | `run_migrations(engine) -> bool`, which returns whether the database was new (choices 7 and 8).                                                                                                                                                                                 |
| `backend/accountable/migrations/env.py`, `versions/0001_baseline.py`, `0002_who_added.py`, `0003_row_level_security.py` (new) | 1     | Alembic scripts (choice 7).                                                                                                                                                                                                                                                     |
| `backend/accountable/auth.py` (new)                                                                                           | 1     | `require_user`, the Supabase check with its cache and 503 (choice 2), and the test token store (choice 3).                                                                                                                                                                      |
| `backend/accountable/routes/auth.py` (new)                                                                                    | 1     | `GET /api/auth/config`, `POST /api/auth/test-sign-in`, `GET /api/me`.                                                                                                                                                                                                           |
| `backend/accountable/main.py`                                                                                                 | 1, 2  | Lifespan: refuse to start with test sign-in on Postgres (R43), run migrations, seed when new. Include routers with `require_user`. Serve `frontend/dist` with an `index.html` fallback outside `/api` when it exists. 401 and 503 handlers. Phase 2: include the search router. |
| `backend/accountable/schema.py`                                                                                               | 1     | `created_by` and `updated_by` on four tables (kept in step with the migrations).                                                                                                                                                                                                |
| `backend/accountable/store.py`, `backend/accountable/deals.py`                                                                | 1     | Write `created_by` and `updated_by` on insert, and `updated_by` on update and on the moved deal (choice 5).                                                                                                                                                                     |
| `backend/accountable/routes/organizations.py`, `contacts.py`, `deals.py`, `activities.py`                                     | 1     | Pass `request.state.user_email` on writes.                                                                                                                                                                                                                                      |
| `backend/accountable/routes/admin.py`                                                                                         | 1     | Reset answers 404 on Postgres.                                                                                                                                                                                                                                                  |
| `backend/accountable/rules/timeline.py`                                                                                       | 1     | Activity entries carry `created_by`.                                                                                                                                                                                                                                            |
| `backend/accountable/seed.py`                                                                                                 | 1     | Write "Sample data" as who added and changed each record. `main()` refuses when `DATABASE_URL` is Postgres (R27) and uses `run_migrations` instead of `create_all`.                                                                                                             |
| `backend/tests/conftest.py`                                                                                                   | 1     | Remove `DATABASE_URL` and the Supabase settings from the environment. Turn on test sign-in, and give `client` a test token by default. Add an `anon_client` fixture with no token.                                                                                              |
| `backend/tests/test_auth.py`, `test_who_added.py`, `test_migrations.py`, `test_config.py`, `test_serve_frontend.py` (new)     | 1     | See Proof.                                                                                                                                                                                                                                                                      |
| `backend/tests/test_seed_and_persistence.py`, `test_timeline.py`                                                              | 1     | The seed refusal and the new seeding rule. The loopback check moves to `test_config.py`. Timeline entries carry `created_by`.                                                                                                                                                   |

### Part B: backend search

| Path                                                             | Phase | Change                                                                                 |
| ---------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------- |
| `backend/accountable/rules/search.py` (new)                      | 2     | Pure functions: normalize the text, lower-case A to Z, match, sort, keep 5 (choice 9). |
| `backend/accountable/search.py` (new)                            | 2     | Read the ids and names of the three kinds of record (SQLAlchemy Core).                 |
| `backend/accountable/routes/search.py` (new)                     | 2     | `GET /api/search`.                                                                     |
| `backend/tests/test_search_rules.py`, `test_api_search.py` (new) | 2     | See Proof.                                                                             |

### Part C: frontend sign-in, session and who added

| Path                                                                                               | Phase | Change                                                                                                                 |
| -------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------- |
| `frontend/package.json`, `package-lock.json`                                                       | 1     | Add `@supabase/supabase-js`.                                                                                           |
| `frontend/src/lib/auth.ts`, `auth.test.ts` (new)                                                   | 1     | Load the config, sign in with Supabase or test sign-in, get the access token, `signOut`, `useSession`, `AuthProvider`. |
| `frontend/src/api/client.ts`, `client.test.ts` (new)                                               | 1     | Send `Authorization: Bearer`. A 401 ends the session, and a 503 gives the sign-in service message.                     |
| `frontend/src/components/AuthGate.tsx`, `AuthGate.test.tsx` (new)                                  | 1     | Shows the sign-in screen in place when signed out (choice 10).                                                         |
| `frontend/src/pages/SignIn.tsx`, `SignIn.test.tsx`, `SignIn.css` (new)                             | 1     | The sign-in screen and the test sign-in panel (accounts.md, Screens).                                                  |
| `frontend/src/App.tsx`, `App.test.tsx`                                                             | 1     | Wrap the routes in `AuthProvider` and `AuthGate`.                                                                      |
| `frontend/src/api/types.ts`                                                                        | 1     | `created_by` and `updated_by` on records, and `created_by` on timeline entries.                                        |
| `frontend/src/pages/OrganizationDetail.tsx`, `ContactDetail.tsx`, `DealDetail.tsx` and their tests | 1     | "Added by" and "Last changed by" in the summary panel (R46).                                                           |
| `frontend/src/components/Timeline.tsx`, `Timeline.test.tsx`                                        | 1     | "Added by" on each activity (R46).                                                                                     |

### Part D: frontend search box

| Path                                                                                 | Phase | Change                                                                   |
| ------------------------------------------------------------------------------------ | ----- | ------------------------------------------------------------------------ |
| `frontend/src/api/search.ts` (new)                                                   | 2     | The search types and the call to `GET /api/search`.                      |
| `frontend/src/components/SearchBox.tsx`, `SearchBox.test.tsx`, `SearchBox.css` (new) | 2     | The box, the grouped results, "No matches", and the keyboard (R53, R54). |

### Part E: frontend top bar, user menu and theme

| Path                                                                              | Phase | Change                                                                                                                |
| --------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/Layout.tsx`, `Layout.test.tsx`                           | 2, 3  | Phase 2: the top bar with `<SearchBox />`. Phase 3: remove the toggle, add `<UserMenu />`, and the narrow-screen bar. |
| `frontend/src/styles.css`                                                         | 2, 3  | Top bar and narrow-screen layout. Remove the toggle styles.                                                           |
| `frontend/src/lib/initials.ts`, `initials.test.ts` (new)                          | 3     | R47.                                                                                                                  |
| `frontend/src/components/UserMenu.tsx`, `UserMenu.test.tsx`, `UserMenu.css` (new) | 3     | The menu: email, theme choice, Sign out, and the keyboard (R48, R49).                                                 |
| `frontend/src/lib/theme.ts`, `theme.test.ts`                                      | 3     | `system`, resolving it and following changes (choice 11).                                                             |
| `frontend/index.html`                                                             | 3     | The inline script resolves `system`, which is now the default.                                                        |
| `frontend/src/styles.test.ts`                                                     | 3     | Check every other `.css` file for color literals (choice 12).                                                         |

### Part F: running, deploying, end-to-end tests and docs

| Path                                                                                                                     | Phase   | Change                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/run.mjs` (new), `package.json`                                                                                  | 1       | `dev` and `start` through the script (choice 6). `seed` unchanged.                                                                                                                                                                                                                                      |
| `e2e/playwright.config.ts`                                                                                               | 1       | Remove `DATABASE_URL` and the Supabase settings, set `ACCOUNTABLE_TEST_SIGN_IN=1`, and check readiness on `/api/auth/config`.                                                                                                                                                                           |
| `e2e/tests/fixtures.ts` (new)                                                                                            | 1       | A `test` that signs in with test sign-in and puts the session in localStorage before each page loads.                                                                                                                                                                                                   |
| `e2e/tests/dashboard.spec.ts`, `detail.spec.ts`, `layout.spec.ts`, `pipeline.spec.ts`, `smoke.spec.ts`, `tables.spec.ts` | 1, 2, 3 | Phase 1: import `test` from `fixtures.ts`. `detail.spec.ts` checks "Added by". Phases 2 and 3: `layout.spec.ts` checks the top bar at both widths.                                                                                                                                                      |
| `e2e/tests/auth.spec.ts` (new)                                                                                           | 1, 3    | Signed-out pages and test sign-in. Phase 3: sign out.                                                                                                                                                                                                                                                   |
| `e2e/tests/search.spec.ts` (new)                                                                                         | 2       | Search from the top bar.                                                                                                                                                                                                                                                                                |
| `e2e/tests/theme.spec.ts`                                                                                                | 3       | The theme from the menu, including System.                                                                                                                                                                                                                                                              |
| `render.yaml` (new)                                                                                                      | 4       | One free web service. It builds the frontend and runs `uv sync` and `npm ci`. The start command is `uv run -m uvicorn accountable.main:app --host 0.0.0.0 --port $PORT`. The three settings are `sync: false`. It sets `PYTHON_VERSION` and `TZ`, deploys after checks pass, and has no `branch:` line. |
| `.claude/agents/ui-check.md`                                                                                             | 3       | Sign in with test sign-in first, check the sign-in screen, the top bar, search and the menu, and pick the theme in the menu.                                                                                                                                                                            |
| `AGENTS.md`                                                                                                              | 4       | `npm start`, and the note that `npm run dev` now needs the Supabase settings for real sign-in.                                                                                                                                                                                                          |
| `docs/TECH_STACK.md`                                                                                                     | 4       | Supabase and Render are now in use.                                                                                                                                                                                                                                                                     |
| `docs/STATUS.md`, this `plan.md`                                                                                         | every   | Progress, and any departure from this plan.                                                                                                                                                                                                                                                             |

Not changed: `.github/workflows/ci.yml` (`uv` and `npm ci` already install the new dependencies, and CI needs no secrets), `.gitleaks.toml`, `docs/BRAND.md`, the pipeline and dashboard pages, and `backend/accountable/routes/pipeline.py` and `dashboard.py`.

## 2. Order of work

Each phase ends with `npm run check` passing. Within a phase, the parts can be built at the same time, because they share only the interfaces above.

### Phase 1: sign-in and the database

- **A:** config, engine, migrations (`0001` to `0003`), seeding when new, the auth dependency and routes, who added a record, the seed and reset refusals, serving `frontend/dist`. Update `conftest.py` first so the existing tests keep passing with a token.
- **C:** `auth.ts`, the API client, `AuthGate`, the sign-in screen, "Added by" on detail pages and timelines.
- **F:** `scripts/run.mjs`, the `dev` and `start` scripts, the Playwright config and `fixtures.ts`, the existing specs moved onto the fixture, and `auth.spec.ts` without sign out.
- **Check by hand:**
  - `npm run dev`, then sign in with the real Supabase user.
  - `npm start` against Supabase: the tables are created, the sample data appears once, and a second start doesn't re-seed.
  - Through the Supabase MCP server (read-only): the tables, `alembic_version`, and `rowsecurity` true on every table.
  - With the publishable key and Supabase's Data API, a read of `organizations` returns nothing.

### Phase 2: search

- **B:** `rules/search.py`, `search.py`, `routes/search.py` and their tests.
- **A:** include the search router in `main.py`.
- **D:** `SearchBox` and `api/search.ts`.
- **E:** the top bar in `Layout.tsx` with `<SearchBox />`, and its styles at both widths.
- **F:** `search.spec.ts`, and the top bar in `layout.spec.ts`.

### Phase 3: the user menu

- **E:** `initials.ts`, `UserMenu`, `theme.ts` with System, `index.html`, the toggle removed, the token test widened.
- **F:** sign out in `auth.spec.ts`, `theme.spec.ts` on the menu, the menu in `layout.spec.ts`, and the ui-check update.
- **Check by hand:** run ui-check against `npm run dev`.

### Phase 4: finish

- **F:** `render.yaml`, `AGENTS.md`, `docs/TECH_STACK.md` and `docs/STATUS.md`.
- Run `npm run check`. Run `uv run -m pytest backend/tests --durations=0` and the Vitest timings, and confirm that no unit test takes a second or more.
- Check that `docs/spec.md` and the area files still match what was built.

## 3. Risks

| Risk                                                             | Effect                                                                                | What this plan does                                                                                                                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test sign-in reaches the real data                               | Anyone could open the team's data with no password                                    | The app refuses to start with test sign-in on Postgres (R43). `test-` tokens are never accepted unless the variable is set. Both are tested. The tests and `run.mjs` remove `DATABASE_URL`.                         |
| A route misses the sign-in check                                 | Data readable without signing in                                                      | One dependency on every router (choice 4), and a test over `app.routes` (Proof).                                                                                                                                    |
| Supabase's Data API exposes the tables                           | The publishable key is public, so anyone could read or change the data                | Migration `0003` turns on row-level security with no policies. Checked by hand with the MCP server and a Data API read (Phase 1). New tables need the same (`data.md`).                                             |
| Sign-ups left on in Supabase                                     | Anyone could create an account                                                        | Out of the code's reach. The student turned them off during setup, and the Phase 1 check confirms it with `course/check_supabase.py`.                                                                               |
| Postgres behavior is never covered by automated tests            | A Postgres-only fault (the driver, migrations, row-level security) shows up on Render | Every query goes through SQLAlchemy Core. Search avoids database case rules (choice 9). Run by hand with `npm start` against Supabase, in Phase 1 and before the merge.                                             |
| An existing SQLite file has no Alembic history                   | The first start tries to create tables that exist and fails                           | `migrate.py` marks such a file as `0001` first (choice 7). Tested with a file made by `create_all`.                                                                                                                 |
| Re-seeding a database that is empty on purpose                   | The team's deleted data comes back as sample data                                     | Seed only when the database had no tables (choice 8). Tested.                                                                                                                                                       |
| Supabase is slow or down                                         | Every request waits, or everyone is signed out                                        | Good tokens are cached for 5 minutes, there is a short timeout on the call, and the backend answers 503 rather than 401 when Supabase can't be reached (choice 2). Tested with a stand-in for Supabase.             |
| A cached token outlives its sign-out                             | A signed-out token works for up to 5 more minutes on this backend                     | Accepted: the browser drops the token on sign-out, and the token also expires on its own. Recorded in `STATUS.md` as a known gap.                                                                                   |
| Unit tests get slower                                            | Over a second each on this computer, slower still on CI                               | Migrations on a temporary SQLite file are quick. If `--durations` shows a slow test, `conftest.py` migrates one template file per session and copies it for each test. The Supabase check is always faked in tests. |
| Render's Python runtime may not have Node for the frontend build | The first deploy fails                                                                | Check Render's docs in Phase 4 before writing `render.yaml`. If Node isn't there, the build step installs it, or the service uses a Dockerfile, and this plan is updated.                                           |
| Two people move cards in the same column                         | Positions are re-numbered from a stale order                                          | Each move runs in one transaction and the last save wins (R50). Accepted for a small team.                                                                                                                          |
| The token sits in localStorage                                   | Script injected into the page could read it                                           | That is supabase-js's default. The app renders no HTML from data and loads no third-party script. Accepted.                                                                                                         |
| Raw SQL in migration `0003`                                      | `docs/TECH_STACK.md` says no raw SQL                                                  | Limited to `ENABLE ROW LEVEL SECURITY`, which Core can't express, with a comment saying so (choice 7).                                                                                                              |
| `npm run dev` with the reloader forgets test tokens              | ui-check is signed out after a backend edit                                           | Accepted. It signs in again with test sign-in (choice 3).                                                                                                                                                           |

## 4. Proof

### Backend unit and API tests (pytest)

- `test_config.py`:
  - The database URL is SQLite when `DATABASE_URL` is unset, and `postgres://` is turned into `postgresql+psycopg://`.
  - The app refuses to start with test sign-in on and a Postgres URL (R43).
  - The `dev` and `start` scripts listen on `127.0.0.1`.
- `test_auth.py`:
  - Every `/api` route answers 401 without a token, except the two auth routes (R37, R40).
  - A bad token gets 401, and so does a `test-` token while test sign-in is off.
  - Test sign-in answers 404 while off and gives a working token while on (R43).
  - `/api/me` returns the email.
  - With Supabase faked:
    - A good token is accepted and cached.
    - A rejected token gets 401.
    - Supabase unreachable gives 503.
  - `/api/auth/config` returns only the URL, the publishable key and the test flag (R41).
- `test_who_added.py`:
  - Creating each of the four kinds of record sets both fields to the signed-in email. An update changes `updated_by` only. A value in the request body is ignored (R40, R44).
  - Moving a deal changes the moved deal only, and the other cards in the column keep their `updated_by` (R44).
  - Marking an activity done is a change.
  - Timeline activity entries carry `created_by` (R46).
- `test_migrations.py`:
  - A new file is migrated to the latest version and reported as new.
  - A file made by `create_all` with data in it is upgraded, and its rows show "Unknown" (R45).
  - A second run changes nothing.
  - The row-level security migration does nothing on SQLite.
- `test_seed_and_persistence.py`:
  - The seed writes "Sample data" (R45).
  - The first start seeds a new database, and a restart doesn't re-seed (R28).
  - A database emptied by hand is not re-seeded.
  - `seed.main` refuses with a Postgres URL and changes nothing (R27).
  - Reset answers 404 with a Postgres URL.
  - Persistence across restart still holds (R25).
- `test_serve_frontend.py`: with a built `index.html` in a temporary folder, `/dashboard` serves it, and `/api/unknown` still gives a JSON 404.
- `test_search_rules.py` (R51 to R53):
  - Matching ignores A to Z case but not É and é.
  - `%` and `_` match only themselves.
  - Spaces at either end are ignored, and empty text gives nothing.
  - Results are sorted by name and limited to 5 of each kind.
- `test_api_search.py`: finds an organization, a contact (with its organization name) and a deal by part of a name in any case, and answers 401 without a token.
- The existing tests keep passing, now with a token.

### Frontend unit tests (Vitest)

- `auth.test.ts`:
  - Test sign-in stores and restores the session (R39), and `signOut` clears it (R42).
  - A Supabase "invalid credentials" error and a network error map to the two messages on the sign-in screen.
- `client.test.ts`: the bearer header is sent, a 401 ends the session, and a 503 gives the sign-in service message.
- `AuthGate.test.tsx`: signed out, it shows the sign-in screen at the same URL. After signing in, it renders the page asked for (R37, R39).
- `SignIn.test.tsx`: the fields and button, both error messages, and the test sign-in panel only when the config says so (R43).
- Detail page tests: "Added by" and "Last changed by" show (R46). `Timeline.test.tsx`: "Added by" on activities, none on stage changes.
- `SearchBox.test.tsx` (R53, R54):
  - Empty text sends no request.
  - Results are grouped, and a contact shows its organization.
  - "No matches" shows when nothing matches.
  - Down, Up and Enter open the right detail page, and Escape closes the list.
- `initials.test.ts`: `jane.doe@…` gives JD, `sam@…` gives S, and `_`, `-` and `+` split the name too (R47).
- `UserMenu.test.tsx`:
  - The button's accessible name, and the email, the three theme choices with the current one marked, and Sign out (R48).
  - The keyboard: open, arrows, pick, and Escape returning focus to the button (R49).
- `theme.test.ts`:
  - A missing or unknown saved value means System (R32).
  - System follows a `matchMedia` change, and Light and Dark don't (R32, R34).
- `Layout.test.tsx`: no toggle in the sidebar, and the top bar holds the search box and the menu (appearance.md, Layout).
- `styles.test.ts`: no color literals in any CSS file other than `styles.css`. The existing token and contrast tests are unchanged.

### End-to-end tests (Playwright)

- `auth.spec.ts`:
  - Signed out, every section shows the sign-in screen (success criterion 2).
  - Test sign-in opens the page that was asked for (R39).
  - Sign out returns to the sign-in screen (R42).
  - A reload keeps the session.
- `detail.spec.ts`: a record added by `ana@example.com` shows "Added by ana@example.com". A sample record shows "Sample data" (success criterion 3).
- `search.spec.ts`: finds an organization, a contact and a deal by part of a name in mixed case, and opens each one (success criterion 4).
- `theme.spec.ts`:
  - Picking Dark in the menu applies it and keeps it after a reload, with no flash.
  - With System, emulating a dark device gives dark (success criterion 5).
- `layout.spec.ts`: the top bar at 1440px, and the search box and menu in the narrow bar at 700px.
- The existing specs run signed in and keep passing.

### By hand

- Success criterion 1: `npm run check` with and without the Supabase settings in `.env`.
- Success criterion 6: `npm start` signs in against Supabase, plus the Phase 1 database checks.
- ui-check in light, dark and System.
- After the merge: the live onrender.com site.
