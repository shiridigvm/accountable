# Improve the harness

Run this at Deploy, after the review fixes and before the merge. If `docs/STATUS.md` records no review for this branch, run the `reviewer` subagent first. If an Important review finding is still open, say so first: it still has to be fixed before the merge.

1. Look at what went wrong on this change: the review's findings, what ui-check found, what the person corrected and what the checks caught. Also look for stray files the agents left behind (`git status`, `git ls-files`).
2. Find repeats. Compare this change's list with the log at the end of this file, and with the review fixes recorded in `docs/STATUS.md` and the git history.
3. For a mistake that has happened twice, add the correction to AGENTS.md or docs/REVIEW.md, or suggest a change to docs/STANDARDS.md for the person to make. If a tool can catch it, add it to the checks instead.
4. Remove anything out of date.
5. Add this change to the log below, one line per mistake, so the next round can count repeats.
6. Improve this file, so that the next round makes a better change. Keep this as the last step.

## Log

- mvp: the build did not match spec 4.3 and R23 on the dashboard (review). Deal edit re-sent unchanged fields (review). `STATUS.md` said nothing was committed, which went stale.
- dark-mode: the plan kept white on Raspberry, against R36, and the contrast test left that pair out (review). `readSavedTheme` and its Proof tests were dropped, and the Marigold token was skipped, with the change noted only in `STATUS.md` (review). `STATUS.md` said "not committed yet" again. Two deliberate empty catch blocks, against STANDARDS.md section 5 (review nit).
- multi-user: new UI ("Added by" on detail pages and timelines) shipped with unstyled spacing, and the new popovers merge with black panels in dark mode, found by ui-check after the build. This repeats the dark-mode phone layout, so AGENTS.md now says to run ui-check before calling UI work done. ui-check saved a screenshot in the repo root, as one had been before (`dashboard-light.png`, committed in `0d2e07e`): the Playwright MCP saves bare filenames in the root, so ui-check now passes `.playwright-mcp/` in the name, and `.gitignore` ignores root `*.png`. A unit test mocked API fields the real endpoint does not send (`OrganizationDetail.test.tsx`, counts), so a real bug passed (from `main`). `STATUS.md` still said the subagents run on Sonnet. No review was run before this step.
