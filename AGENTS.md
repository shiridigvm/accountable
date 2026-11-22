# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/spec.md`: a short summary of what the product is and does today, with an index of the area files. Read this first.
- `docs/specs/<area>.md`: the detail for one product area, such as `docs/specs/deals.md`. After `docs/spec.md`, read only the area files the current change touches.
- `docs/changes/<branch name>/`: one folder per change, with its `intent.md` (what the change is for) and `plan.md` (how it gets built). Read only the folder for the current branch. Ignore the others.
- `docs/TECH_STACK.md`: the stack
- `docs/BRAND.md`: the look, for UI work
- `docs/REVIEW.md`: the review policy
- `docs/STANDARDS.md`: engineering standards for writing and maintaining code
- `docs/STATUS.md`: what's done so far
- `docs/IMPROVE.md`: follow it at Deploy, after the review fixes and before the merge
- `.claude/agents/`: project subagents. `reviewer` reviews a branch with `docs/REVIEW.md` and only reads. `ui-check` checks the running app in the browser against the brand and the spec, and saves screenshots in `.playwright-mcp/`.

## Testing

- `npm run check` is the full gate: formatting (Prettier, ruff format), lint (ESLint with TypeScript, React Hooks and accessibility rules; ruff check), complexity (max 15 per function: ESLint `complexity` and ruff C901), types (tsc and ty), secret scan (gitleaks, with the git-ignored `.env` allowed), and `npm test`. Run it before calling work done.
- `npm run check:quick` runs the same checks without the end-to-end tests.
- `npm run format` fixes formatting.
- `npm test` runs every test: backend (pytest), frontend unit (Vitest), and end-to-end in a browser (Playwright, with the installed Google Chrome). It exits with an error if any test fails.
- Run `npm test` before you call a piece of work done, and fix failures. Do not weaken, skip or delete a test to make it pass.
- After a change to what a page shows or how it looks, run the `ui-check` subagent with `npm run dev` running, before you call the work done. Fix what it finds that the change caused, in both modes, and record what already existed in `docs/STATUS.md` under Known gaps.
- The end-to-end tests start their own servers on ports 8000, 5173 and 8100 (the fake OpenRouter) with a separate test database. Stop any `npm run dev` before you run `npm test`, or the tests cannot start their servers.
- No test touches Supabase, Postgres or OpenRouter: the tests use their own SQLite files and test sign-in, and remove `DATABASE_URL`, the Supabase settings and the OpenRouter settings. The end-to-end tests start a fake OpenRouter on port 8100 (`e2e/fake-openrouter.mjs`).

## Running the app

- `npm run dev`: the dev servers on 127.0.0.1, with data in the local SQLite file. It reads the Supabase URL and publishable key from `.env` for real sign-in, and `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` for the Copilot, and turns on test sign-in for ui-check. It never uses `DATABASE_URL`.
- `npm start`: builds the frontend and runs the app the way Render does, at http://127.0.0.1:8000, against `DATABASE_URL` (the team's Postgres on Supabase). Its migrations change the real database, so ask the person before running it.

## Plans and status

- Keep the spec up to date in the same change: update `docs/spec.md` and every area file in `docs/specs/` that the change affects. Add an area file, and list it in the index in `docs/spec.md`, when a change needs one.
- If `docs/spec.md` or an area file and the plan disagree, stop and ask the person which one changes, and update that document before building. A test must not leave out a case the spec rule covers.
- When the build departs from the plan (a function, test or token dropped or added), update `plan.md`, including its Proof, in the same change. A note in `docs/STATUS.md` alone is not enough.
- Update `docs/STATUS.md` when you finish a piece of work. Record what is built and its known gaps, not git state such as "not committed yet": the person does the commits, so that goes stale.
