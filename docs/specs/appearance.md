# Look, layout and light and dark mode

Part of the product spec. Read `docs/spec.md` first. Requirement and decision numbers match the rest of the spec.

## Requirements

### Light and dark mode

- **R32**: The app has a light mode and a dark mode, and three theme choices: Light, Dark and System. System follows the device's light or dark setting, and changes with it while the app is open. System is the default for anyone who hasn't picked a theme.
- **R33**: The theme choice is in the user menu (R48 in `accounts.md`), which is in the top bar on every page except the sign-in screen. A new choice applies at once to every section, including charts, dialogs and messages.
- **R34**: The chosen theme is saved in the browser's localStorage and restored on the next visit. It belongs to the browser, not the person, and is not stored on the backend or in the database.
- **R35**: The saved theme, or the device's setting for System, is applied before the first paint, on the sign-in screen too, so a dark-mode user never sees a flash of light mode on load or reload.
- **R36**: Text in dark mode meets WCAG AA contrast: 4.5:1 for normal text, and 3:1 for large text and for non-text parts such as chart marks, stage accents and focus rings. Light mode keeps its current colors.

## Screens and design

### Look

From the brand skill (`.claude/skills/brand/SKILL.md`, same content as `docs/BRAND.md`). The brand takes priority over general design guidance.

- **Fonts**: Instrument Sans for headings and body. Instrument Serif only for one accent line on the dashboard. JetBrains Mono for money, numbers and identifiers in tables.
- **Colors**: Sea Green `#06D6A0` for success and primary actions (with Midnight text). Marigold `#FFC145`, Coral `#F78C6B`, Cerulean `#118AB2` and Raspberry `#EF476F` for the rest. Sea Green and Marigold are darkened for small text in light mode and lightened for small text in dark mode.
- **Ink**: Midnight `#073B4C` in light mode, Sea Mist `#CDD8DB` in dark mode.
- **Surfaces**: light mode has page `#F0F4F5` and white panels. Dark mode has page `#04232E` and black panels. Panels are rounded with no outline in both modes.
- **Tokens**: every color is defined once, as a token, with a light and a dark value. Components, charts and dialogs use the tokens, with no per-component color overrides for dark mode.
- **Tables**: rows separated by alternating background tint, not grid lines.
- **UI text**: short labels, plain English, no exclamation marks. Money always has `$`.

The approved dashboard and pipeline design is `docs/mockups/final.html`.

### Layout

- Left sidebar with five sections: Dashboard, Organizations, Contacts, Deals, Pipeline. Panel surface for the current mode, active item in Sea Green tint.
- Top bar across the top of the main area: the search box (R51 in `search.md`) on the left, then the Copilot button (R58 in `copilot.md`) and the user menu button (R47 in `accounts.md`) on the right.
- The Copilot panel opens at the right of the window, below the top bar. On wide screens the main area narrows to make room for it (see `copilot.md`).
- Below about 720px wide, the sidebar becomes a bar across the top (wordmark, Copilot button and user menu button, then the search box at full width, then the section links, which scroll sideways if they don't fit), so the main area keeps the full width. The separate top bar is not shown at this width, and the Copilot panel covers the main area.
- Main area: top bar, page title, then content.
- The sign-in screen has no sidebar and no top bar (see `accounts.md`).
- Detail pages: a summary panel at the top (key fields and links), then two columns on wide screens, with related records on the left and the timeline on the right. A single column below about 1100px.

## Design decisions

Choices the requirements leave open, with the reason for each.

- **10. Theme saved in the browser, not the database.** The theme suits the device as much as the person, and saving it in localStorage lets it apply before sign-in and before the first paint (R35), with no backend change.
- **11. System by default.** Following the device setting is what most people expect from a web app. It replaces the earlier light default.
