# Plan: dark mode

Built from `docs/changes/dark-mode/intent.md` and `docs/spec.md` (section 3.9, R32 to R36, and section 6.1). This plan lists the files, the order, the risks and the proof. No code is written yet.

## Decisions made here

The intent and spec leave these open. A change to any of them goes into this plan first.

1. **How the mode is applied.** A `data-theme="dark"` attribute on `<html>`. `styles.css` defines every token once under `:root` (light) and again under `:root[data-theme='dark']`. With no attribute, the app is light, so light mode needs no change.
2. **Before first paint (R35).** A short inline script in the `<head>` of `frontend/index.html` reads localStorage and sets the attribute. It must be inline: the app's own module script runs after the first paint.
3. **Storage.** Key `accountable-theme`, value `light` or `dark`. Any other value, a missing value, or a storage error means light. If saving fails, as it can when storage is blocked, the toggle still switches the mode for the current page and the choice is not remembered.
4. **The toggle.** A native `<button type="button">` labelled "Dark mode", with `aria-pressed` set to true when dark mode is on. It sits in the sidebar, after the section links. A native button gives keyboard use and focus handling for free.
5. **Dark token values.** These values are measured against the page `#04232E` and black panels:

   | Token                              | Light (today) | Dark                 | Worst contrast in dark |
   | ---------------------------------- | ------------- | -------------------- | ---------------------- |
   | `--page`                           | `#f0f4f5`     | `#04232e`            |                        |
   | `--panel`                          | `#ffffff`     | `#000000`            |                        |
   | `--lane` (pipeline column)         | `#e4ecee`     | `#0b3442`            |                        |
   | `--ink`                            | `#073b4c`     | `#cdd8db` (Sea Mist) | 9.1:1 on lane          |
   | `--muted`                          | `#5b7480`     | `#8fa6ae`            | 5.2:1 on lane          |
   | `--sea-ink` (small Sea Green text) | `#04875f`     | `#5ee6c0`            | 8.6:1 on lane          |
   | `--raspberry` (text, late dates)   | `#ef476f`     | `#f7819e`            | 5.4:1 on lane          |
   | `--cerulean` (focus ring, bars)    | `#118ab2`     | `#4fb3d6`            | 5.5:1 on lane          |
   | Negotiation stage accent           | `#3e6373`     | `#7fa3b2`            | 4.9:1 on lane          |
   | Marigold, small text               | none today    | `#ffd47a`            | 9.4:1 on lane          |

   Tints, the dialog shadow and backdrop, the drag-over column, chart grid lines and the tooltip get dark values in Phase 2. Sea Green, Marigold, Coral and Raspberry fills keep their brand values in both modes. Filled buttons keep their text colors (Midnight on Sea Green, white on Raspberry), because the button fill does not change.

6. **R36 applies to dark mode only.** The intent says "Text in dark mode meets WCAG AA" and "Light mode looks exactly as it does today". Some light colors today are below AA: white on Cerulean 3.96:1, white on Raspberry 3.62:1, Raspberry on its tint 3.09:1, muted text on the page 4.46:1. Applying R36 to both modes would mean changing light mode. `docs/spec.md` R36 is corrected to say dark mode, and the light-mode gaps are recorded in `docs/STATUS.md` as known gaps.

## 1. Files that change

### New files

| Path                                                                                                          | Phase | Purpose                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/lib/theme.ts`                                                                                   | 3     | Read, apply and save the mode (the storage key, `readSavedTheme`, `applyTheme`, `saveTheme`).                                                                                                                           |
| `frontend/src/lib/theme.test.ts`                                                                              | 3     | Unit tests for `theme.ts`.                                                                                                                                                                                              |
| `frontend/src/lib/stages.test.ts`                                                                             | 1     | Stage colors are tokens, and each one is defined in both modes.                                                                                                                                                         |
| `frontend/src/styles.test.ts`                                                                                 | 1, 2  | Token tests: the light values are unchanged, there are no color literals outside `styles.css`, and dark contrast meets R36. It reads files with Vite's `?raw` import and `import.meta.glob`, so it needs no Node types. |
| `e2e/tests/theme.spec.ts`                                                                                     | 4     | Browser tests for the toggle, persistence and no flash.                                                                                                                                                                 |
| `docs/changes/dark-mode/dashboard-light.png`, `dashboard-dark.png`, `pipeline-light.png`, `pipeline-dark.png` | 0, 5  | Success criterion 3.                                                                                                                                                                                                    |

### Existing files that change

| Path                                      | Phase       | Change                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/styles.css`                 | 1, 2, 3     | Add the tokens that are missing. `--cerulean` is used at lines 351 and 592 but never defined, so the focus ring falls back to the text color today. Replace the literals at lines 121, 274, 278, 539 and 718 with tokens. Add stage and chart tokens. Add the `:root[data-theme='dark']` block with `color-scheme: dark`. Add toggle styles. |
| `frontend/src/lib/stages.ts`              | 1           | `STAGE_COLORS` values become `var(--stage-new)` and so on. Its users (`Dashboard`, `Pipeline`, `Deals`, `DealDetail`, `OrganizationDetail`) set them as inline `background`, which accepts `var()`, so those files do not change.                                                                                                            |
| `frontend/src/pages/Dashboard.tsx`        | 1           | Chart colors (lines 118 to 179) become `var(--…)` strings. The two `<Tooltip>`s get `contentStyle` and `labelStyle` with panel and ink tokens, because Recharts' default tooltip is a white box.                                                                                                                                             |
| `frontend/index.html`                     | 3           | Inline mode script in `<head>`.                                                                                                                                                                                                                                                                                                              |
| `frontend/src/components/Layout.tsx`      | 3           | The toggle button at the foot of the sidebar, with the mode held in state.                                                                                                                                                                                                                                                                   |
| `frontend/src/components/Layout.test.tsx` | 3           | Toggle tests.                                                                                                                                                                                                                                                                                                                                |
| `docs/spec.md`                            | 0           | R36 scoped to dark mode (decision 6).                                                                                                                                                                                                                                                                                                        |
| `docs/STATUS.md`                          | every phase | Progress, and the light-mode contrast gaps as known gaps.                                                                                                                                                                                                                                                                                    |

Not changed: the backend, the database, `package.json` files (no new dependencies), `docs/BRAND.md`, `.claude/`, and the existing end-to-end tests.

## 2. Order of work

Each phase ends with `npm run check:quick` passing. Phases 4 and 5 end with `npm run check`.

### Phase 0: baseline

- Correct R36 in `docs/spec.md` (decision 6).
- Take the light screenshots of the dashboard and the pipeline before any CSS changes. Use the end-to-end database and the fixed date (`ACCOUNTABLE_TODAY=2026-11-17`) at 1440 by 900. They are the reference for "light mode looks exactly as it does today".

### Phase 1: every color becomes a token (light only)

- Move every color literal in `frontend/src` into `styles.css` tokens: stage colors, chart colors, and the five literals in `styles.css` itself. Define `--cerulean`.
- Check in Chrome that Recharts SVG attributes accept `var()` (see risk 1) before converting all the charts.
- Add `stages.test.ts` and the first two parts of `styles.test.ts`: light values unchanged, and no literals outside `styles.css`.
- Compare the dashboard and pipeline with the Phase 0 screenshots by eye. The one visible difference allowed is the focus ring, which becomes Cerulean as the CSS always intended.

### Phase 2: dark tokens

- Add the `:root[data-theme='dark']` block with the values from decision 5, plus tints, shadow, backdrop, drag-over, grid and tooltip.
- Add the contrast part of `styles.test.ts`.
- Check by eye by setting the attribute in DevTools. Cover every section, a detail page, the add and edit form, the delete dialog with a refusal, the activity dialog, a validation message, an error message, a late deal, a dragged card, and keyboard focus.

### Phase 3: toggle and persistence

- Write `lib/theme.ts` and its tests.
- Add the inline script to `index.html`, using the same key and fallback rules as `theme.ts`.
- Add the toggle to `Layout.tsx`, its styles, and its tests.

### Phase 4: end-to-end

- Write `e2e/tests/theme.spec.ts`.
- Run `npm run check`.

### Phase 5: finish

- Take the four screenshots into `docs/changes/dark-mode/`. Compare the new light ones with the Phase 0 ones.
- Update `docs/STATUS.md`. Check that `docs/spec.md` still matches what was built.
- Run `npm run check`.

## 3. Risks

1. **Recharts and `var()`.** Recharts writes colors as SVG presentation attributes (`stroke="…"`). I expect Chrome to resolve `var()` there, but this is not verified, and Safari and Firefox are not tested. If it fails, the fallback is to read the tokens with `getComputedStyle(document.documentElement)` when the mode changes and pass real colors. That needs the mode in React context so the dashboard re-renders. The check comes first in Phase 1 for this reason.
2. **Light mode drifting.** Moving literals into tokens could change a light color by mistake. The light-values test pins every light token to today's value, and Phase 0 gives screenshots to compare.
3. **The inline script and `theme.ts` can drift.** The key and fallback rules exist twice, because the inline script cannot import the module. A comment in each file points to the other, and the reload end-to-end test fails if they disagree.
4. **Missed hardcoded colors.** Colors could come from places a literal search doesn't find: Recharts defaults (the tooltip, the active dot), the native `<dialog>` backdrop, form controls, the scrollbar. `color-scheme: dark` handles form controls and scrollbars. The rest is covered by the Phase 2 check by eye, which lists every surface.
5. **Black panels on a near-black page.** Panels and page differ by only 1.29:1, so panel edges are faint. This is what the brand specifies, and panels have no outline by rule. If it reads badly in Phase 2, raise it with the user rather than add borders.
6. **Contrast test scope.** The test checks token pairs the plan lists (ink, muted and accents on page, panel and lane). It cannot see where a component actually places a color. A wrong pairing in a component is caught only by eye.
7. **Coverage gate.** New code is small and fully unit-tested, so the 80% line gate should hold. The inline script is not counted by Vitest, and the end-to-end tests cover it.

## 4. Proof

### Unit tests (Vitest)

`frontend/src/lib/theme.test.ts`:

- With nothing saved, the saved mode reads as light.
- With `dark` saved, it reads as dark. With `light` saved, it reads as light.
- An unknown saved value reads as light.
- When localStorage throws on read, it reads as light and does not throw.
- Applying dark sets `data-theme="dark"` on `<html>`. Applying light removes it.
- Saving writes the key. When localStorage throws on write, saving does not throw.

`frontend/src/components/Layout.test.tsx` (added to the existing file):

- The sidebar has a "Dark mode" button after the section links, with `aria-pressed="false"` by default.
- Clicking it sets `aria-pressed="true"`, sets `data-theme="dark"` on `<html>`, and saves `dark`.
- Clicking it again returns to light and saves `light`.
- When `<html>` already has `data-theme="dark"` on mount, as the inline script sets it, the button starts pressed.
- When saving throws, clicking still switches the mode.
- The existing test that lists the section links still passes unchanged.

`frontend/src/lib/stages.test.ts`:

- Every stage color is a `var(--stage-…)` token.
- Each of those tokens is defined in both the light block and the dark block of `styles.css`.

`frontend/src/styles.test.ts`:

- Every light token that exists today keeps today's value.
- No `.ts` or `.tsx` file in `frontend/src`, other than tests, contains a hex or `rgb()` color literal. This covers the "colors in one place" constraint.
- Every token in the light block also has a dark value, except the brand fills that stay the same by decision 5.
- Dark contrast meets R36. Ink, muted, sea-ink, Raspberry and Marigold text reach 4.5:1 on the page, panels and lanes. Cerulean, the stage accents, chart marks and the focus ring reach 3:1 on the backgrounds they sit on.

The existing Dashboard, Pipeline, Deals and detail page tests still pass unchanged.

### End-to-end tests (Playwright, `e2e/tests/theme.spec.ts`)

- **Light by default.** On a fresh visit, `<html>` has no `data-theme`, the page background is `rgb(240, 244, 245)`, and the toggle is not pressed.
- **Toggle and remember (success criterion 2).**
  1. Click the toggle on the dashboard.
  2. The page background becomes `rgb(4, 35, 46)` and the toggle is pressed.
  3. Reload. The page is still dark.
  4. Go to Pipeline. It is still dark, and the toggle is there and pressed.
- **Back to light.** Toggle off, reload, and the page is light.
- **No flash (R35).**
  1. Save `dark` with `addInitScript`.
  2. Block the app's module script with `page.route`, so React never runs.
  3. Load the page. `<html>` already has `data-theme="dark"` and the dark background. This proves the inline script works alone, before the app paints.
- **Keyboard.** Tab reaches the toggle, Space switches it, and the focus ring shows.
- **Every section.** Each of the five sections, plus an open dialog, uses the dark page and panel colors when dark is saved.
- **Blocked storage.** With `localStorage` overridden to throw in `addInitScript`, the app loads in light, and the toggle still switches to dark.

The existing end-to-end tests run unchanged. They never save a mode, so they run in light.

### Other checks

- `npm run check` passes (success criterion 1).
- The four screenshots are in `docs/changes/dark-mode/` (success criterion 3).
- The new light screenshots match the Phase 0 ones by eye, apart from the toggle and the focus ring.
- Not covered: Safari, Firefox and Edge, and an automated pixel comparison of light mode.
