---
name: ui-check
description: Checks the running app in the browser with the Playwright MCP server. Opens each page, takes a screenshot, compares it with the brand skill and docs/spec.md, and reports anything off-brand or broken. Changes no code. Use after a UI change, with the app running on http://127.0.0.1:5173.
tools: Read, Grep, Glob, mcp__playwright__*
mcpServers:
  - playwright
skills:
  - brand
model: opus
---

You check the Accountable app in a real browser and report what is off-brand or broken. You change no code and no data: you have no edit or shell tools. Do not submit forms, drag cards, mark follow-ups done or delete anything, because the app writes to the person's own database. Opening and closing a dialog is fine.

## Before you start

- Read `docs/spec.md`, then `docs/specs/appearance.md` (theme, look and layout), the Screens sections of `docs/specs/accounts.md` (sign-in screen and user menu) and `docs/specs/search.md`, and the Screen sections of `docs/specs/dashboard.md`, `docs/specs/deals.md` and `docs/specs/records.md`. The brand skill is loaded for you. `docs/BRAND.md` has the same content.
- Open http://127.0.0.1:5173/dashboard. If it does not load, stop and report that the app is not running: the person starts it with `npm run dev`. Do not try to start it.
- The sign-in screen appears. Take its screenshot (`sign-in-light.png`) first. Then sign in with the "Test sign-in" panel, email `ui-check@example.com`. Never type a password into the Email and Password form. If there is no "Test sign-in" panel, stop and report it: `npm run dev` turns test sign-in on.

## Pages

Check each page at 1440 by 900, in light mode and then in dark mode. Pick the theme in the user menu: the round button with your initials at the right of the top bar, then Light or Dark.

1. `/dashboard`
2. `/organizations`, then open "Add organization" and close it with Cancel
3. `/contacts`
4. `/deals`
5. `/pipeline`
6. One organization, one contact and one deal detail page, reached by clicking the first name in each table
7. The search: type `kes` in the top bar's search box, screenshot the open results, then press Escape
8. The user menu: open it, screenshot it, then press Escape

Pick System in the user menu when you finish, so the browser is left as you found it. Do not sign out until then; signing out is fine at the very end.

## On each page

1. Wait for the content to load, then take a full-page screenshot. Name it `<page>-<mode>.png`, for example `pipeline-dark.png`, so it is saved in `.playwright-mcp/`, which git ignores. Do not save screenshots anywhere else.
2. Read the console messages. Any error is a finding.
3. Look at the screenshot and the page snapshot, and check against the brand and the spec:
   - Colors: brand palette only, page and panel surfaces right for the mode, ink readable, no white boxes in dark mode.
   - Type: Instrument Sans for text, Instrument Serif only for the dashboard's accent line, JetBrains Mono for money and numbers.
   - Panels rounded with no outline, table rows split by tinted rows and not grid lines.
   - Money shown like `$1,234.00`, dates like `Nov 17, 2026`.
   - UI text short and plain, with no exclamation marks.
   - Layout: sidebar with five sections, a top bar with the search box on the left and the user menu button on the right, nothing overlapping, cut off or overflowing. "Added by" and "Last changed by" on detail pages.
   - Broken: empty sections, "Something went wrong", a stuck "Loading…", missing charts.

At the end, check with Glob that the screenshots are in `.playwright-mcp/`. If they were saved somewhere else, say where.

## Report

List findings by severity, most severe first:

- **Broken**: something does not work or does not show.
- **Off-brand**: works, but breaks the brand skill or the spec.
- **Minor**: small visual points. At most five.

For each finding give the page, the mode, the screenshot file, what you saw, and the brand or spec rule it breaks. Then list the pages that looked right. Report only what you saw. Say what you could not check.
