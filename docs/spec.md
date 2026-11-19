# Accountable: product spec

This file describes Accountable as it is built today. Read it first. A change in progress is described in its own folder, `docs/changes/<branch name>/`, and is merged into this file when the change is merged. Requirement numbers (R1, R2, ...) are stable so that tests and reviews can refer to them.

## 1. Problem and purpose

A small business keeps track of its customers and sales in spreadsheets, inboxes and people's heads. Nobody can see at a glance which companies it deals with, who its contacts are, what is in the sales pipeline, what happened last with a customer, or what needs doing next.

Accountable is a business management system. It is planned as a sales CRM that grows into a full Business OS, including ERP. The first version is a complete sales CRM for one person, running on their own computer. It works like a private Salesforce for the everyday CRM essentials. It should feel sharp, modern and professional, and be quick to use.

## 2. Users and scope

- **User**: one salesperson, using Accountable on their own computer every day. The rest of the sales team will join later.
- **Runs locally**: the backend listens on `127.0.0.1` only. The app needs no internet connection.
- **Browsers**: the latest Chrome, Safari, Firefox and Edge.
- **Layout**: light mode and dark mode, for laptop and desktop widths. There is no phone layout.
- **Not in the product yet**: sign-in and accounts, several users, following the device's own dark mode setting, a phone layout, AI features, email, calendar or phone integrations, currencies other than US dollars, reports beyond the dashboard, tags or custom fields, changing the pipeline stages, and importing or exporting data.

## 3. Requirements

### 3.1 Records

- **R1 Organization**: name, website, industry, notes. Has many contacts and deals.
- **R2 Contact**: name, email, phone, job title, status (`lead`, `qualified`, `customer`), organization (optional). A lead is a contact with the lead status, so there is no separate list of leads.
- **R3 Deal**: name, stage, value (US dollars), probability of close, expected close date, actual close date, organization (optional), main contact (optional).
- **R4 Activity**: type (`note`, `call`, `email`), description, occurred-at date, optional follow-up date, done flag. Linked to one contact or one deal.

### 3.2 Stages

| Stage       | Usual probability | Column accent (see section 4.1) |
| ----------- | ----------------- | ------------------------------- |
| New         | 10%               | Cerulean                        |
| Qualified   | 25%               | Marigold                        |
| Proposal    | 50%               | Coral                           |
| Negotiation | 75%               | Midnight tint                   |
| Won         | 100%              | Sea Green                       |
| Lost        | 0%                | Raspberry                       |

- **R5**: A deal's probability is set from its stage when the stage changes. A probability typed by hand is kept until the stage changes again.
- **R6**: Moving a deal to Won or Lost sets its actual close date to today, unless it already has one. Moving from Won or Lost to an open stage clears the actual close date, because an open deal has no outcome. Moving between Won and Lost keeps it. Other moves leave it alone.
- **R7**: Stages are fixed. Users cannot add, rename or reorder them.

### 3.3 Tables and detail pages

- **R8 Tables** (Organizations, Contacts, Deals): search box, sortable column headings, an add button, and edit and delete on each row. Search and sort run in the browser.
- **R9 Contacts filter**: filter by status (all, lead, qualified, customer).
- **R10 Late deals**: an open deal (not Won or Lost) whose expected close date is before today is marked as late, in the table and on its pipeline card.
- **R11 Detail pages**:
  - Organization: its contacts, its deals, and a timeline merging the activities of its contacts and deals, plus stage changes of its deals, newest first.
  - Contact: its organization, its activities, and the activities of deals where it is the main contact, newest first. Stage changes of those deals are shown too.
  - Deal: its details and its timeline (activities and stage changes), newest first.
- **R12 Activities**: log, edit and delete from a contact or deal. A follow-up date and a done flag are optional.

### 3.4 Delete rules

- **R13**: Every delete asks for confirmation first.
- **R14**: A delete is refused while the record has linked records. The refusal lists what is linked (for example "3 contacts, 2 deals") and says what to remove first.
  - Organization: blocked by contacts or deals.
  - Contact: blocked by activities, or by being main contact of a deal.
  - Deal: blocked by activities.
  - Activity: never blocked.
- **R15**: Nothing is cascaded and nothing is unlinked silently. The one exception is a deal's stage history, which is part of the deal (see section 9).

### 3.5 Pipeline

- **R16**: One column per stage (six columns), each card a deal.
- **R17**: Dragging a card to another column changes its stage (R5 and R6 apply).
- **R18**: Dragging within a column changes its place in that column. A card dropped anywhere in a column stays where it was dropped, including after a refresh. Keyboard users can do the same: Space picks a card up, arrow keys move it (up and down by one card, left and right by one column), and Space drops it.
- **R19**: A new deal can be added from a column, starting at that stage.
- **R20**: The board header shows total value and expected revenue of open deals (New to Negotiation). Each column shows its own total value and expected revenue. These update as soon as a card moves. Won and Lost columns show value only.
- **R21**: Expected revenue for a deal is its value times its probability of close.

### 3.6 Dashboard

- **R22 Month window**: 12 months back and 6 months ahead of today, by month.
- **R23 Figures**:
  - Four stat panels: deals won this year (count), revenue won this year, open pipeline value, expected revenue.
  - Deals won per month (count) as a bar chart, and revenue won per month (sum of value, by actual close date) as a line chart, over the R22 window. Only won deals are counted.
  - Open pipeline by stage, with value and expected revenue, shown as one stacked bar whose segments are sized by value, with a legend.
  - Follow-ups: upcoming (due in the next 14 days, not done) and overdue (due before today, not done). Overdue is listed first. Marking one done removes it from this list.
  - Recent activity: the latest entries across contacts and deals, including stage changes.
- **R24**: Dashboard figures are computed from the same data the tables show, so they match.

### 3.7 Persistence and setup

- **R25**: Every change is saved to the local SQLite file at once. It survives a browser refresh and an app restart.
- **R26**: `npm run dev` starts the backend and the frontend together. The app opens on the dashboard at http://127.0.0.1:5173.
- **R27**: `npm run seed` replaces the database with the sample data.
- **R28**: When the database file is new or empty, the first start creates it and fills it with sample data.
- **R29**: The app needs no internet connection to use. Fonts are bundled, not loaded from Google Fonts at run time.

### 3.8 Money and dates

- **R30**: Money is US dollars, shown like `$1,234.00`, always with its currency sign.
- **R31**: Dates are shown like `Nov 17, 2026`. Dates are stored as ISO dates (`2026-11-17`) and converted only for display.

### 3.9 Light and dark mode

- **R32**: The app has a light mode and a dark mode. Light mode is the default.
- **R33**: A toggle at the bottom of the sidebar switches between the modes. Because the sidebar is on every page, the toggle is too. The switch applies at once to every section, including charts, dialogs and messages.
- **R34**: The chosen mode is saved in the browser's localStorage and restored on the next visit. It is not stored on the backend or in the database.
- **R35**: The saved mode is applied before the first paint, so a dark-mode user never sees a flash of light mode on load or reload.
- **R36**: Text in dark mode meets WCAG AA contrast: 4.5:1 for normal text, and 3:1 for large text and for non-text parts such as chart marks, stage accents and focus rings. Light mode keeps its current colors.

## 4. Data model

Tables are defined with SQLAlchemy Core in `backend/accountable/schema.py`. No raw SQL.

| Table                | Columns                                                                                                                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organizations`      | id, name, website, industry, notes                                                                                                                                                                                                  |
| `contacts`           | id, name, email, phone, job_title, status, organization_id (nullable, FK)                                                                                                                                                           |
| `deals`              | id, name, stage, value_cents (integer), probability (integer percent), expected_close (date), actual_close (date, nullable), organization_id (nullable, FK), main_contact_id (nullable, FK), position (integer, order within stage) |
| `activities`         | id, type, description, occurred_on (date), follow_up_on (date, nullable), done (boolean), created_at (datetime), contact_id (nullable, FK), deal_id (nullable, FK)                                                                  |
| `deal_stage_changes` | id, deal_id (FK), from_stage, to_stage, changed_on (date), created_at (datetime, used for ordering)                                                                                                                                 |

Notes:

- **Money as integer cents.** This avoids float rounding in totals. The API sends cents and the frontend formats them.
- **Activity links.** An activity has exactly one of `contact_id` or `deal_id`. The backend enforces this.
- **Stage changes are not activities.** Activities are what the user logs (note, call, email). The app writes stage changes itself and keeps them in their own table. They are merged into timelines when read, as entries like "Moved from Proposal to Negotiation".
- **Deal position.** Positions within a column are integers, re-numbered when a card is dropped.

## 5. API

JSON over HTTP, served by FastAPI under `/api`. The frontend calls it through Vite's dev proxy.

| Method and path                                                           | Purpose                                                                                                                                                     |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET/POST /api/organizations`, `GET/PATCH/DELETE /api/organizations/{id}` | Organization CRUD. Delete returns 409 with linked counts when blocked.                                                                                      |
| `GET /api/organizations/{id}/timeline`                                    | Merged timeline for an organization.                                                                                                                        |
| `GET/POST /api/contacts`, `GET/PATCH/DELETE /api/contacts/{id}`           | Contact CRUD. `GET` accepts `status`.                                                                                                                       |
| `GET /api/contacts/{id}/timeline`                                         | Contact timeline.                                                                                                                                           |
| `GET/POST /api/deals`, `GET/PATCH/DELETE /api/deals/{id}`                 | Deal CRUD. Changing `stage` applies R5 and R6 and writes a stage change. A PATCH sends only the fields that change.                                         |
| `POST /api/deals/{id}/move`                                               | Body: `{stage, position}`. Used by pipeline drag and drop. Re-numbers positions in the source and target columns.                                           |
| `GET /api/deals/{id}/timeline`                                            | Deal timeline.                                                                                                                                              |
| `GET/POST /api/activities`, `PATCH/DELETE /api/activities/{id}`           | Activity CRUD. `PATCH` also sets `done`.                                                                                                                    |
| `GET /api/pipeline`                                                       | Deals grouped by stage, with column and board totals.                                                                                                       |
| `GET /api/dashboard`                                                      | Monthly series, open pipeline by stage, recent activity, follow-ups.                                                                                        |
| `POST /api/admin/reset`                                                   | Replaces all data with the sample data. Returns 404 unless the environment variable `ACCOUNTABLE_ALLOW_RESET=1` is set, which only the end-to-end tests do. |

Errors use one shape: `{"error": "...", "linked": {...}}` for 409 delete refusals. Other errors are 404 (not found) or 422 (invalid input), with `{"error": "..."}`.

## 6. Screens and design

### 6.1 Look

From the brand skill (`.claude/skills/brand/SKILL.md`, same content as `docs/BRAND.md`). The brand takes priority over general design guidance.

- **Fonts**: Instrument Sans for headings and body. Instrument Serif only for one accent line on the dashboard. JetBrains Mono for money, numbers and identifiers in tables.
- **Colors**: Sea Green `#06D6A0` for success and primary actions (with Midnight text). Marigold `#FFC145`, Coral `#F78C6B`, Cerulean `#118AB2` and Raspberry `#EF476F` for the rest. Sea Green and Marigold are darkened for small text in light mode and lightened for small text in dark mode.
- **Ink**: Midnight `#073B4C` in light mode, Sea Mist `#CDD8DB` in dark mode.
- **Surfaces**: light mode has page `#F0F4F5` and white panels. Dark mode has page `#04232E` and black panels. Panels are rounded with no outline in both modes.
- **Tokens**: every color is defined once, as a token, with a light and a dark value. Components, charts and dialogs use the tokens, with no per-component color overrides for dark mode.
- **Tables**: rows separated by alternating background tint, not grid lines.
- **UI text**: short labels, plain English, no exclamation marks. Money always has `$`.

The approved dashboard and pipeline design is `docs/mockups/final.html`.

### 6.2 Layout

- Left sidebar with five sections: Dashboard, Organizations, Contacts, Deals, Pipeline. Panel surface for the current mode, active item in Sea Green tint. The light and dark mode toggle (R33) sits at the bottom.
- Main area: page title, then content.
- Detail pages: a summary panel at the top (key fields and links), then two columns on wide screens, with related records on the left and the timeline on the right. A single column below about 1100px.

### 6.3 Dashboard

- Top row: the four stat panels from R23, each with one large number in JetBrains Mono.
- Revenue line chart and deals-won bar chart (Cerulean bars), over the R22 window.
- Pipeline visual: one full-width stacked bar of the four open stages, with a legend listing value and expected revenue per stage.
- Lower row: follow-ups panel (overdue first, in Raspberry text) and recent activity panel.

### 6.4 Pipeline

- Six columns side by side, scrollable horizontally when the window is narrow.
- Column header: stage name, count, value, expected revenue (Won and Lost show value only).
- Card: deal name, organization, value, probability, expected close date. Late deals get a Raspberry date and a small "Late" tag, which is removed when the deal moves to Won or Lost.
- Drag and drop uses dnd-kit with mouse and keyboard sensors. The board updates at once. If the save fails, the board reverts. A failed refresh after a saved move does not report the move as unsaved.
- "Add deal" at the foot of each column opens the add form with that stage set.

### 6.5 Tables and forms

- Table: search box above, add button top right, sortable headings with an arrow, row actions (edit, delete) at the right.
- Form: a dialog with the fields from section 3. Validation messages sit under each field.
- Delete dialog: asks "Delete X?". When the server refuses, the dialog lists the linked records and says what to remove first, with no delete button.

## 7. Sample data

Created by `npm run seed`, and on first start when the database is new.

- 6 organizations across several industries.
- 20 contacts: leads, qualified contacts and customers. Some have no organization.
- 25 deals at every stage. Won and lost deals across the past 12 months. Open deals expected to close in the next 6 months. A few open deals with expected close dates in the past (late).
- 40 activities: notes, calls and emails. Some follow-ups due in the next 14 days, some overdue, some done.
- Dates are computed from today when the data is written.

The seed data is fixed, not random, so the same reset gives the same records.

## 8. Technical design

Per `docs/TECH_STACK.md`.

- **Frontend** (`frontend/`): TypeScript, React 19, Vite, React Router. TanStack Table for tables, Recharts for charts, dnd-kit for the pipeline. Unit tests with Vitest and Testing Library.
- **Backend** (`backend/accountable/`): Python 3.12, FastAPI, SQLAlchemy Core, SQLite. Business rules live in `backend/accountable/rules/` as functions with no I/O. Managed with uv, with `pyproject.toml` and `uv.lock` at the repo root. Tests in `backend/tests/` with pytest.
- **Database file**: `backend/data/accountable.db`, git-ignored. The `ACCOUNTABLE_DB` environment variable points elsewhere. The end-to-end tests use a separate file.
- **Root scripts** in `package.json`: `npm run dev`, `npm test`, `npm run seed`, plus `typecheck`, `lint` and `build`. `frontend/` and `e2e/` are npm workspaces.
- **Fonts**: bundled through the `@fontsource` packages, so the app works offline (R29).

## 9. Testing

`npm test` runs three suites and fails if any test fails:

- Backend unit and API tests (pytest), covering the rules in section 3 and the API in section 5. Restart persistence is tested by opening a new app instance on the same file.
- Frontend unit tests (Vitest), covering formatting, board layout, dashboard data, tables, dialogs, the forms and the mode toggle.
- End-to-end tests (Playwright Test, with the installed Google Chrome) in `e2e/tests/`. They start the app on their own servers and database, covering tables, the contacts filter, delete refusals, detail pages, the pipeline, the dashboard, and switching to dark mode and keeping it after a reload.

Not covered by automated tests: visual comparison with the mockup, how dark mode looks, Safari, Firefox and Edge, and browser restart.

## 10. Design decisions

Choices the requirements leave open, with the reason for each.

1. **Stage changes in their own table.** The activity types are note, call and email. The automatic "Moved from X to Y" entries therefore go in `deal_stage_changes`, not `activities`.
2. **Deleting a deal removes its stage history.** Stage history is part of the deal, not a linked record. Blocking deletes of any deal with history would make most deals undeletable. The deal's activities still block its delete (R14).
3. **Contact timeline includes main-contact deals.** Without this, a contact's timeline would miss most deal activity.
4. **Organization timeline includes stage changes.** They are part of what happened with the company's deals.
5. **Follow-up window of 14 days** for "upcoming".
6. **Fonts bundled** rather than loaded from Google Fonts, to meet R29.
7. **Stage colors.** Six stages use five palette colors plus a Midnight tint. Negotiation uses the tint so it does not match Won's Sea Green.
8. **Client-side search and sort.** The data is small (about 25 deals and 20 contacts).
9. **Reopening a Won or Lost deal** clears the actual close date, because an open deal has no outcome. The probability follows the new stage (R5). Moving Won to Lost keeps the date, since R6 does not replace an existing one.
10. **Mode saved in the browser, not the database.** There is one user per computer and no accounts, so localStorage is enough and the backend stays unchanged.
11. **Light mode by default, not the device setting.** Following the device setting is left for a later change. Light mode stays the default so the app looks the same as before for anyone who never uses the toggle.
