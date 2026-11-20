# Review policy

Every change is reviewed against this policy before it merges. The reviewer reports its findings and doesn't change any code.

## Passes

Make a separate pass over every change for each of these:

- **Bugs:** the code does what it's meant to, including when something goes wrong.
- **Security:** no secrets or personal data are exposed, and nobody can do what they shouldn't.
- **Matches the spec and plan.md:** the change does what `docs/spec.md`, the area files in `docs/specs/` it touches, and `plan.md` say, with nothing missing and nothing extra. Check that the tests for a spec rule cover every case the rule covers, so a passing test does not hide a gap. Check that any departure from the plan is written into `plan.md`.
- **Undocumented code:** flag any code that `docs/spec.md` and the area files don't describe, so the change updates the right area file too. Flag a change that alters an area's behavior without updating that area's file, and a new area file that is missing from the index in `docs/spec.md`.
- **Standards:** the change follows docs/STANDARDS.md.

## Important

An Important finding must be fixed before the change merges. A finding is Important if the change breaks behavior that should work, leaks data or breaks a rule in AGENTS.md.

## Nits

A nit is a small point, such as style or naming, that doesn't block the merge. Report at most five per review.
