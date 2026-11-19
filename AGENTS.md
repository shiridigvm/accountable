# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/spec.md`: what the product is and does today. Read this first.
- `docs/changes/<branch name>/`: one folder per change, with its `intent.md` (what the change is for) and `plan.md` (how it gets built). Read only the folder for the current branch. Ignore the others.
- `docs/TECH_STACK.md`: the stack
- `docs/BRAND.md`: the look, for UI work
- `docs/REVIEW.md`: the review policy
- `docs/STANDARDS.md`: engineering standards for writing and maintaining code
- `docs/STATUS.md`: what's done so far

## Testing

- `npm test` runs every test: backend (pytest), frontend unit (Vitest), and end-to-end in a browser (Playwright, with the installed Google Chrome). It exits with an error if any test fails.
- Run `npm test` before you call a piece of work done, and fix failures. Do not weaken, skip or delete a test to make it pass.
- The end-to-end tests start their own servers on ports 8000 and 5173 with a separate test database. Stop any `npm run dev` before you run `npm test`, or the tests cannot start their servers.

Update `docs/STATUS.md` when you finish a piece of work
