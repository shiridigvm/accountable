# Intent: dark mode

## Problem

Accountable only has a light mode, and some people prefer a dark screen.

## Proposed outcome

A dark mode with a toggle on every page, across every section. The toggle sits at the bottom of the sidebar, so one placement covers every page. Dark surfaces and ink follow `docs/BRAND.md` (page `#04232E`, black panels, Sea Mist `#CDD8DB` ink).

## Constraints

- Light mode stays the default, and the app remembers the choice in the browser's localStorage. No backend or database change. The saved mode is applied before first paint, so a dark-mode user sees no flash of light mode.
- Light mode looks exactly as it does today, apart from the toggle.
- Colors stay in one place, as tokens, with no scattered overrides.
- Text in dark mode meets WCAG AA: 4.5:1 for normal text, 3:1 for large text and for non-text parts such as chart marks and focus rings. spec.md has no numeric contrast rule, so this sets one. Sea Green and Marigold are lightened for small text on dark backgrounds, per `docs/BRAND.md`.
- Charts, dialogs and messages follow the mode too.
- No new dependencies unless the plan makes the case for one.

## Not in this change

- Following the device's own dark mode setting.
- A layout for phones.

## Success criteria

1. npm run check passes.
2. A new end-to-end test proves that the toggle works and is remembered after a reload.
3. Screenshots of the dashboard and the pipeline in both modes are saved in docs/changes/dark-mode/.
