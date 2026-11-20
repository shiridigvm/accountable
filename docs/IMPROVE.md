# Improve the harness

Run this at Deploy, after the review fixes and before the merge. If an Important review finding is still open, say so first: it still has to be fixed before the merge.

1. Look at what went wrong on this change: the review's findings, what the person corrected and what the checks caught.
2. Find repeats. Compare this change's list with the log at the end of this file, and with the review fixes recorded in `docs/STATUS.md` and the git history.
3. For a mistake that has happened twice, add the correction to AGENTS.md or docs/REVIEW.md, or suggest a change to docs/STANDARDS.md for the person to make. If a tool can catch it, add it to the checks instead.
4. Remove anything out of date.
5. Add this change to the log below, one line per mistake, so the next round can count repeats.
6. Improve this file, so that the next round makes a better change. Keep this as the last step.

## Log

- mvp: the build did not match spec 4.3 and R23 on the dashboard (review). Deal edit re-sent unchanged fields (review). `STATUS.md` said nothing was committed, which went stale.
- dark-mode: the plan kept white on Raspberry, against R36, and the contrast test left that pair out (review). `readSavedTheme` and its Proof tests were dropped, and the Marigold token was skipped, with the change noted only in `STATUS.md` (review). `STATUS.md` said "not committed yet" again. Two deliberate empty catch blocks, against STANDARDS.md section 5 (review nit).
