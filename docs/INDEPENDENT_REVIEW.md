# Independent review: `multi-user` against `main`

Reviewed against `docs/REVIEW.md` at `3c00a56`, with all five passes: bugs, security, spec and plan, undocumented code, standards. Style was skipped. The review was done by the read-only `reviewer` subagent, and every finding below was then checked against the code. Severity follows REVIEW.md: Important means the change breaks behavior that should work, leaks data or breaks a rule in AGENTS.md.

## Important

### 1. An expired token is accepted for up to 5 minutes (R40)

`backend/accountable/auth.py:79-89`. A good token is cached for `now + CACHE_SECONDS` (300 s), whatever the token's own `exp`.

- Failure: a token that expires at 10:00:00 is first checked at 09:59:30. The backend accepts it until 10:04:30.
- Rule: R40 says "A missing, expired or invalid token gets 401." The plan's accepted risk (`plan.md` risk table, "A cached token outlives its sign-out") covers sign-out only, and it relies on "the token also expires on its own". The cache defeats exactly that.
- Fix: cap the cache entry at the JWT's `exp` (decode the payload without verifying, since Supabase has already checked it). Or, if the gap is accepted, record it in plan choice 2, `accounts.md` R40 and `STATUS.md`.

### 2. A failed first seed leaves the database empty for good (R28)

`backend/accountable/main.py:41-43`, `backend/accountable/migrate.py:15-27`, `backend/accountable/seed.py:413-415`. `run_migrations` commits in its own `engine.begin()` and reports "new" only when the app tables did not exist before. `seed_database` then runs in a second transaction.

- Failure: the first Render boot against an empty Supabase database. The migrations commit, then the seed fails (a dropped pooler connection, or Render killing a slow cold start). The seed rolls back, leaving empty tables. The next start finds the tables, treats the database as not new, and never seeds it.
- Rule: R28 says an empty Postgres database "is seeded once". Recovery needs someone to drop the tables by hand on the team's database.
- Fix: run the seed on the same connection and transaction as the migrations, or decide "new" from something that is only written after the seed succeeds.

## Should fix (not blocking)

### 3. Some Supabase connection failures give 500, not 503

`backend/accountable/auth.py:64-72`. The code catches only `HTTPError`, `URLError` and `TimeoutError`. In the standard library (`AbstractHTTPHandler.do_open`), only errors from `h.request(...)` are wrapped in `URLError`. `h.getresponse()` runs after that wrapper, so `http.client.RemoteDisconnected` and `ConnectionResetError` while reading the reply escape unwrapped. A 200 reply that isn't JSON (for example a wrong `SUPABASE_URL` that serves HTML) raises `JSONDecodeError`, which also escapes.

- Failure: Supabase or a proxy drops the connection mid-reply, and the request gets an unhandled 500 instead of the planned 503 "Can't reach the sign-in service." (plan choice 2).
- Fix: catch `OSError` (which covers `URLError` and `TimeoutError`) and `ValueError`, and raise `SignInServiceDown`. Add `ConnectionResetError` to the parametrized test in `backend/tests/test_auth.py`.

### 4. The cache pruning can race between threads (unconfirmed)

`backend/accountable/auth.py:86-87`. `require_user` is a sync dependency, so FastAPI runs it in a threadpool. Two cache misses at the same moment can both list the same stale key, and the second `del _cache[stale]` raises `KeyError`. Iterating `_cache.items()` while another thread inserts can raise `RuntimeError: dictionary changed size during iteration`. Both give a 500. Not reproduced.

- Fix: iterate over `list(_cache.items())` and use `_cache.pop(stale, None)`.

### 5. R28 says the opposite of what was built

`docs/specs/platform.md:11` says "When the database is new **or empty**, the first start runs the migrations and fills it". Plan choice 8 and `test_a_database_emptied_by_hand_is_not_reseeded` seed only a database with no tables. AGENTS.md says the spec and the plan must agree. R28 should say "has no tables".

### 6. Behavior the spec does not describe

- The backend's 503 `{"error": "Can't reach the sign-in service."}` (`main.py:91`). `docs/specs/data.md:62` says other errors are 401, 404 or 422.
- The "Cannot reach the Accountable server. Check that it is running." screen when `/api/auth/config` fails (`frontend/src/components/AuthGate.tsx:19`). It is not in the `accounts.md` Screens section.
- "Test sign-in needs an email address." (`frontend/src/lib/auth.ts:192`) and "Cannot reach the Accountable server." (`auth.ts:206`) on the test sign-in panel. Neither is in `accounts.md`.

### 7. An end-to-end test's name claims something it does not check

`e2e/tests/auth.spec.ts:57`: "sign out returns to the sign-in screen, and the old token stops working". The test never sends the old token, only reloads the page. The claim is also false: `signOut` only clears the browser's copy. Test tokens stay in `_test_tokens` until the backend restarts, and Supabase tokens stay in the cache for up to 5 minutes. Rename the test to what it checks (the plan's Proof says a reload stays signed out), or add a backend revoke and assert on it.

### 8. `render.yaml` departs from the plan

`render.yaml:20` sets `NODE_VERSION`. The plan's `render.yaml` row (`plan.md:129`) and `platform.md:45` list only `PYTHON_VERSION` and `TZ`. AGENTS.md says departures go into `plan.md`.

## Nits

1. Empty catch blocks with only a comment: `frontend/src/lib/auth.ts:80, 90, 191`, `frontend/src/lib/theme.ts:39, 48`, and `.catch(() => undefined)` at `auth.ts:212`. This is against STANDARDS.md section 5. It is a repeat from `dark-mode` (see the IMPROVE.md log).
2. `GET /api/me` is built and tested but never called. The plan's interface table (`plan.md:43`) says parts C and F use it. Use it, or note the change in the plan.
3. FastAPI's `/docs`, `/redoc` and `/openapi.json` are served without sign-in (`main.py:49`). They are outside `/api`, so the auth test does not cover them. They show the API's shape but no data. Pass `docs_url=None, redoc_url=None, openapi_url=None` in production if that matters.
4. An empty `PATCH {}` now marks the record "Last changed by" the caller, because `changed_by(request)` is always merged in. Before, `store.update_*` wrote nothing for empty data. The frontend never sends an empty PATCH.
5. `isAuthApiError(error)` maps every Supabase auth API error to "Email or password is wrong." (`auth.ts:166-167`), possibly including a 429 rate limit. Not checked against supabase-js's error classes.

## Checked and found fine

- **Test sign-in:** the route answers 404 and `test-` tokens are refused unless `ACCOUNTABLE_TEST_SIGN_IN=1`. `check_settings()` runs before the migrations and refuses test sign-in with a Postgres URL. `run.mjs start` removes the test and reset flags. `run.mjs dev` removes `DATABASE_URL` and binds 127.0.0.1.
- **Auth coverage:** every router except `routes/auth.py` depends on `require_user`, and a test walks every `/api` route in the OpenAPI schema. The email comes from the token only. `created_by` and `updated_by` sent in a body are ignored, and this is tested.
- **Secrets:** `/api/auth/config` returns only the URL, the publishable key and the flag. `render.yaml` uses `sync: false` and holds no secrets. Nothing logs a token or a setting. Tokens are cached under a sha256 hash. Users with no email are refused.
- **Database:** RLS is enabled on all five tables plus `alembic_version`, on Postgres only. An old `create_all` file is stamped at the baseline before upgrading. Reset is refused on Postgres.
- **Frontend serving:** the frontend file route blocks path traversal, and `/api/*` stays a JSON 404.
- **Search, who-added and the menu:** search matching, sort and limit. Who-added on every write path, including `move_deal` changing only the moved deal. The SearchBox stale-response guard, the UserMenu focus handling, and the theme script in `index.html` matching `theme.ts`.
- **Spec coverage:** R32-R35, R37-R49, R51-R57 are built as written, apart from the points above. Every Proof item in the plan has a test with a matching name, and the new area files are in the `docs/spec.md` index.

## Not checked

- No tests were run for this review. The last full `npm run check` passed before `3c00a56`, and that commit changed only docs, `.gitignore`, the ui-check agent and CSS already covered by that run.
- Real Postgres and Supabase: whether `DATABASE_URL` uses Supabase's transaction pooler (port 6543), where psycopg3's prepared statements can fail without `prepare_threshold=None`. Also what status code Supabase returns for a malformed token: only 401 and 403 map to 401, so a 400 would become 503.
- Render specifics: Node in the Python runtime, `autoDeployTrigger`, and lefthook's postinstall during `npm ci`.
- Problems ui-check found that are already on `main` (the organization detail counts, table numbers not in mono) are recorded in `docs/STATUS.md` and are not findings against this branch.
