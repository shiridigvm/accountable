# Spec: the Accountable MVP

This spec turns `docs/intent.md` into requirements and a design. It follows `docs/TECH_STACK.md` for the stack and the brand skill (`.claude/skills/brand/SKILL.md`) for the look. Where this spec makes a choice the intent left open, it says so under **Decisions to confirm**.

## 1. Requirements

Requirements are numbered so they can be referred to in tests and reviews. Each one comes from `docs/intent.md`.

### 1.1 Records

- **R1 Organization**: name, website, industry, notes. Has many contacts and deals.
- **R2 Contact**: name, email, phone, job title, status (`lead`, `qualified`, `customer`), organization (optional).
- **R3 Deal**: name, stage, value (US dollars), probability of close, expected close date, actual close date, organization (optional), main contact (optional).
- **R4 Activity**: type (`note`, `call`, `email`), description, occurred-at date, optional follow-up date, done flag. Linked to one contact or one deal.

### 1.2 Stages

| Stage       | Usual probability | Column accent (see section 4) |
|-------------|-------------------|-------------------------------|
| New         | 10%               | Cerulean                      |
| Qualified   | 25%               | Marigold                      |
| Proposal    | 50%               | Coral                         |
| Negotiation | 75%               | Midnight tint                 |
| Won         | 100%              | Sea Green                     |
| Lost        | 0%                | Raspberry                     |

- **R5**: A deal's probability is set from its stage when the stage changes. A probability typed by hand is kept until the stage changes again.
- **R6**: Moving a deal to Won or Lost sets its actual close date to today, unless it already has one. Moving from Won or Lost to an open stage clears the actual close date, because an open deal has no outcome. Moving between Won and Lost keeps it. Other moves leave it alone.
- **R7**: Stages are fixed. Users cannot add, rename or reorder them.

### 1.3 Sections and tables

- **R8 Tables** (Organizations, Contacts, Deals): search box, sortable column headings, an add button, and edit and delete on each row.
- **R9 Contacts filter**: filter by status (all, lead, qualified, customer).
- **R10 Deals late flag**: an open deal (not Won or Lost) whose expected close date is before today is marked as late, in the table and on its pipeline card.
- **R11 Detail pages**:
  - Organization: its contacts, its deals, and a timeline merging the activities of its contacts and deals, plus stage changes of its deals, newest first.
  - Contact: its organization, its activities, and the activities of deals where it is the main contact, newest first. Stage changes are shown too, where the contact is main contact.
  - Deal: its details and its timeline (activities and stage changes), newest first.
- **R12 Activities**: log, edit and delete from a contact or deal. A follow-up date and a done flag are optional.

### 1.4 Delete rules

- **R13**: Every delete asks for confirmation first.
- **R14**: A delete is refused while the record has linked records. The refusal lists what is linked (for example "3 contacts, 2 deals") and says what to remove first.
  - Organization: blocked by contacts or deals.
  - Contact: blocked by activities, or by being main contact of a deal.
  - Deal: blocked by activities.
  - Activity: never blocked.
- **R15**: Nothing is cascaded and nothing is unlinked silently.

### 1.5 Pipeline

- **R16**: One column per stage (six columns), each card a deal.
- **R17**: Dragging a card to another column changes its stage (R5, R6 apply).
- **R18**: Dragging within a column changes its place in that column. A card dropped anywhere in a column stays where it was dropped, including after a refresh.
- **R19**: A new deal can be added from a column, starting at that stage.
- **R20**: The board header shows total value and expected revenue of open deals (New to Negotiation). Each column shows its own total value and expected revenue. These update as soon as a card moves.
- **R21**: Expected revenue for a deal is its value times its probability of close.

### 1.6 Dashboard

- **R22 Month window**: 12 months back and 6 months ahead of today, by month.
- **R23 Figures**:
  - Deals won per month (count) and revenue won per month (sum of value, by actual close date). Line chart and bar chart.
  - Open pipeline by stage, with value and expected revenue. A pipeline visual, such as a funnel.
  - Recent activity (latest entries across contacts and deals, including stage changes).
  - Follow-ups: upcoming (due in the next 14 days, not done) and overdue (due before today, not done). Marking one done removes it from this list.
- **R24**: Dashboard figures are computed from the same data the tables show, so they match.

### 1.7 Persistence and setup

- **R25**: Every change is saved to the local SQLite file at once. It survives a browser refresh and an app restart.
- **R26**: `npm run dev` starts backend and frontend together, and opens on the dashboard.
- **R27**: `npm run seed` replaces the database with the sample data.
- **R28**: The database is created with sample data on first start, if it does not exist.
- **R29**: The app needs no internet connection to use. Fonts are bundled, not loaded from Google Fonts at run time (see section 6).

### 1.8 Money and dates

- **R30**: Money is US dollars, shown like `$1,234.00`, and always with its currency sign.
- **R31**: Dates are shown like `Nov 17, 2026`. Dates are stored as ISO dates (`2026-11-17`) and converted only for display.

### 1.9 Out of scope for the MVP

Sign-in and accounts, several users, dark mode, phone layout, AI features, email, calendar or phone integrations, other currencies, reports beyond the dashboard, tags or custom fields, changing stages, import and export.

## 2. Data model

Tables are defined with SQLAlchemy Core (no raw SQL, per `docs/TECH_STACK.md`).

| Table | Columns |
|-------|---------|
| `organizations` | id, name, website, industry, notes |
| `contacts` | id, name, email, phone, job_title, status, organization_id (nullable, FK) |
| `deals` | id, name, stage, value_cents (integer), probability (integer percent), expected_close (date), actual_close (date, nullable), organization_id (nullable, FK), main_contact_id (nullable, FK), position (integer, order within stage) |
| `activities` | id, type, description, occurred_on (date), follow_up_on (date, nullable), done (boolean), contact_id (nullable, FK), deal_id (nullable, FK) |
| `deal_stage_changes` | id, deal_id (FK), from_stage, to_stage, changed_on (date), created_at (datetime, used for ordering) |

Notes:

- **Money as integer cents.** Avoids float rounding in totals. The API sends cents; the frontend formats them.
- **Activity links.** An activity has exactly one of `contact_id` or `deal_id`. The backend enforces this.
- **Stage changes are not activities.** Activities are what the user logs (note, call, email). Stage changes are written by the app and kept in their own table, so the activity type list stays as the intent defines it. They are merged into timelines when they are read.
- **Deal position.** Positions within a column are integers, re-numbered when a card is dropped. Ties are not possible.
- **Deleting a deal** removes its stage-change history with it. This is the one owned-data exception to R15 (see Decisions to confirm).

## 3. API

JSON over HTTP, served by FastAPI under `/api`. The frontend calls it through Vite's dev proxy.

| Method and path | Purpose |
|-----------------|---------|
| `GET/POST /api/organizations`, `GET/PATCH/DELETE /api/organizations/{id}` | Organization CRUD. Delete returns 409 with linked counts when blocked. |
| `GET /api/organizations/{id}/timeline` | Merged timeline for an organization. |
| `GET/POST /api/contacts`, `GET/PATCH/DELETE /api/contacts/{id}` | Contact CRUD. `GET` accepts `status`. |
| `GET /api/contacts/{id}/timeline` | Contact timeline. |
| `GET/POST /api/deals`, `GET/PATCH/DELETE /api/deals/{id}` | Deal CRUD. Changing `stage` applies R5 and R6 and writes a stage change. |
| `POST /api/deals/{id}/move` | Body: `{stage, position}`. Used by the pipeline drag and drop. Re-numbers positions in the source and target columns. |
| `GET /api/deals/{id}/timeline` | Deal timeline. |
| `GET/POST /api/activities`, `PATCH/DELETE /api/activities/{id}` | Activity CRUD. `PATCH` also sets `done`. |
| `GET /api/pipeline` | Deals grouped by stage with column and board totals. |
| `GET /api/dashboard` | Monthly series, open pipeline by stage, recent activity, follow-ups. |

Errors use one shape: `{"error": "...", "linked": {...}}` for 409 delete refusals, and standard 404 and 422 otherwise.

## 4. Screens and design

### 4.1 Look

From the brand skill (`.claude/skills/brand/SKILL.md`, same content as `docs/BRAND.md`):

- **Fonts**: Instrument Sans for headings and body. Instrument Serif only for one accent line on the dashboard (a short tagline or the page greeting). JetBrains Mono for money, numbers and identifiers in tables.
- **Colors**: Midnight `#073B4C` for ink. Sea Green `#06D6A0` for success and primary actions (with Midnight text). Marigold `#FFC145`, Coral `#F78C6B`, Cerulean `#118AB2` and Raspberry `#EF476F` for the rest. Darkened Sea Green and Marigold for small text on light backgrounds.
- **Surfaces**: page `#F0F4F5`, white rounded panels, no outline.
- **Tables**: separate rows with alternating background tint, not grid lines. This follows the brand's "no outline" rule and the general guidance to avoid grid lines.
- **Tone of UI text**: short labels, plain English, no exclamation marks. Money always has `$`.

### 4.2 Layout

- Left sidebar with the five sections: Dashboard, Organizations, Contacts, Deals, Pipeline. Light panel, active item in Sea Green tint.
- Main area: page title, then content. Desktop and laptop widths only (no phone layout).
- Detail pages: a summary panel at the top (key fields and links), then two columns on wide screens: related records on the left, timeline on the right. Single column below about 1100px.

### 4.3 Dashboard

- Top row: four stat panels, each with one large number in JetBrains Mono: won this year, revenue won this year, open pipeline value, expected revenue.
- Line chart: revenue won per month, 18 months (R22), Sea Green line.
- Bar chart: deals won per month, Cerulean bars, same months.
- Pipeline visual: one stacked bar of the four open stages, segments sized by value, with a legend listing value and expected revenue per stage. Colors from section 4.1. This is the design approved in `docs/mockups/final.html`.
- Lower row: follow-ups panel (overdue first, in Raspberry text) and recent activity panel.

### 4.4 Pipeline

- Six columns side by side, scrollable horizontally if the window is narrow.
- Column header: stage name, count, value, expected revenue (open stages only for totals; Won and Lost show value only).
- Card: deal name, organization, value, probability, expected close date. Late deals get a Raspberry date and a small "Late" tag.
- Drag and drop with dnd-kit: a card can be dropped at any position in any column. A drop sends one `move` call and updates the board immediately, then reverts if the call fails.
- "Add deal" at the foot of each column opens the add form with that stage pre-set.

### 4.5 Tables and forms

- Table: search box above, add button top right, sortable headings with a small arrow, row actions (edit, delete) at the right.
- Form: a side panel or dialog with the fields from section 1. Validation messages under each field.
- Delete dialog: asks "Delete X?" by default. When the server refuses, it lists the linked records and says what to remove first, with no delete button.

## 5. Sample data

Created by the seed script (`npm run seed`) and on first start if the database file is new.

- 6 organizations across several industries.
- 20 contacts: a mix of leads, qualified contacts and customers. Some have no organization.
- 25 deals: at every stage. Won and lost deals across the past 12 months. Open deals expected to close in the next 6 months. A few open deals with expected close dates in the past (late).
- 40 activities: notes, calls and emails. Some follow-ups due in the next 14 days, some overdue, some done.
- Dates are computed from today when the data is written.

Seed data is fixed, not random, so the same reset gives the same records. Values are plausible round numbers.

## 6. Technical plan

Per `docs/TECH_STACK.md`:

- **Frontend**: TypeScript, React, Vite, in `frontend/`. Proposed libraries: React Router (sections), TanStack Table (sort and search), Recharts (charts), dnd-kit (pipeline drag and drop), and Vitest with React Testing Library for unit tests.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy Core, SQLite, in `backend/`. Managed with uv, `pyproject.toml` and `uv.lock` at the repo root. Tests with pytest.
- **Root scripts**: `npm run dev`, `npm test`, `npm run seed` in `package.json`. `frontend/` is an npm workspace.
- **Tests**: unit tests (Vitest, pytest) and end-to-end tests in `e2e/` with Playwright Test using the installed Google Chrome. The e2e run starts the app itself and uses a separate test database.
- **Data file**: `backend/data/accountable.db`, git-ignored. Test runs use a different file.
- **Fonts**: bundled through the `@fontsource` packages for Instrument Sans, Instrument Serif and JetBrains Mono, so the app works offline. The brand names Google Fonts as the source; bundling keeps the same fonts and removes the network dependency required by R29.

Library choices are proposals. Check each one against its current documentation before use.

## 7. Acceptance

The intent's success criteria stand as written in `docs/intent.md`. Automated tests cover the business rules (R5, R6, R14, R18, R21, R24) at unit and API level. End-to-end tests cover the flows in criteria 1 to 6. Criterion 8, the browser check by eye with no console errors, is done by the user.

## Decisions to confirm

These were choices the intent did not settle. Each item records the decision made. The user asked for the best decisions to be made without them, so these can be changed, but a change goes into this spec first.

1. **Stage changes as their own table.** The intent lists activity types as note, call and email. The automatic "Moved from X to Y" entries therefore go in `deal_stage_changes`, not in `activities`. **Decided:** keep.
2. **Deleting a deal removes its stage history.** It is owned data, not a linked record. The alternative is to block deletes of deals with any history, which would make most deals undeletable. **Decided:** keep. Stage history is part of the deal, and the deal's activities still block its delete (R14).
3. **Contact timeline includes the main-contact deals.** The intent says "everything that has happened with them". Without this, a contact's timeline would miss most deal activity. **Decided:** keep, as R11 states.
4. **Organization timeline includes stage changes.** The intent names activities only. Stage changes are included because they are part of what happened with the company's deals. **Decided:** keep.
5. **Follow-up window.** "Upcoming" means due within the next 14 days. The intent does not give a number. **Decided:** 14 days.
6. **Fonts bundled.** The brand names Google Fonts, but R29 needs no internet. This spec bundles them. **Decided:** bundle.
7. **Stage colors.** Six stages need six colors from a palette of five plus a Midnight tint. Negotiation uses the Midnight tint so it does not match Won's Sea Green. **Decided:** keep, as in `final.html`.
8. **Client-side search and sort.** The data is small (about 25 deals, 20 contacts), so tables filter and sort in the browser. **Decided:** keep.
9. **Reopening a Won or Lost deal.** The intent does not say what happens when a won or lost deal moves back to an open stage. **Decided:** clear the actual close date, because an open deal has no outcome. The probability follows the new stage (R5). Won to Lost keeps the date, under the intent's rule that an existing actual close date is not replaced (R6).
