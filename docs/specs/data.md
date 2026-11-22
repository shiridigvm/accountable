# Data model, API and persistence

Part of the product spec. Read `docs/spec.md` first. Requirement and decision numbers match the rest of the spec.

## Requirements

### Persistence

- **R25**: Every change is saved to the database at once: Postgres on Supabase for the built app, and the local SQLite file for `npm run dev`. It survives a browser refresh and an app restart.
- **R50 Shared data**: everyone who signs in works on the same organizations, contacts, deals and activities, and can do everything. When two people change the same record, the last save wins. A change made by someone else shows up when the page is next loaded. Nothing updates live.

### Money and dates

- **R30**: Money is US dollars, shown like `$1,234.00`, always with its currency sign.
- **R31**: Dates are shown like `Nov 17, 2026`. Dates are stored as ISO dates (`2026-11-17`) and converted only for display.

## Data model

Tables are defined with SQLAlchemy Core in `backend/accountable/schema.py`. No raw SQL. The same schema runs on SQLite and Postgres. Migrations create and update it when the app starts, on both.

| Table                | Columns                                                                                                                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organizations`      | id, name, website, industry, notes, created_by, updated_by                                                                                                                                                                                                  |
| `contacts`           | id, name, email, phone, job_title, status, organization_id (nullable, FK), created_by, updated_by                                                                                                                                                           |
| `deals`              | id, name, stage, value_cents (integer), probability (integer percent), expected_close (date), actual_close (date, nullable), organization_id (nullable, FK), main_contact_id (nullable, FK), position (integer, order within stage), created_by, updated_by |
| `activities`         | id, type, description, occurred_on (date), follow_up_on (date, nullable), done (boolean), created_at (datetime), contact_id (nullable, FK), deal_id (nullable, FK), created_by, updated_by                                                                  |
| `deal_stage_changes` | id, deal_id (FK), from_stage, to_stage, changed_on (date), created_at (datetime, used for ordering)                                                                                                                                                         |

Notes:

- **Money as integer cents.** This avoids float rounding in totals. The API sends cents and the frontend formats them.
- **Activity links.** An activity has exactly one of `contact_id` or `deal_id`. The backend enforces this.
- **Stage changes are not activities.** Activities are what the user logs (note, call, email). The app writes stage changes itself and keeps them in their own table. They are merged into timelines when read, as entries like "Moved from Proposal to Negotiation".
- **Deal position.** Positions within a column are integers, re-numbered when a card is dropped.
- **Who added and changed a record.** `created_by` and `updated_by` are text and never empty. They hold an email, "Sample data" for the sample data, or "Unknown" for records that existed before sign-in (R44 and R45 in `accounts.md`).
- **No Copilot tables.** Copilot conversations are not stored (R59 in `copilot.md`), and changes it proposes are saved through the routes below, into the tables above.
- **Row-level security.** On Postgres, every table has row-level security turned on, with no policies, so Supabase's Data API can't read or change anything with the publishable key. The backend connects through `DATABASE_URL` and is not affected. A table added by a later change needs the same.

## API

JSON over HTTP, served by FastAPI under `/api`. With `npm run dev` the frontend calls it through Vite's dev proxy. In the built app, the same FastAPI process serves the frontend, and any path outside `/api` gets the frontend's `index.html`.

Every route needs `Authorization: Bearer <token>` (R40 in `accounts.md`), except `GET /api/auth/config` and `POST /api/auth/test-sign-in`. Organizations, contacts, deals and activities include `created_by` and `updated_by`, and activity entries in timelines include `created_by`.

| Method and path                                                           | Purpose                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET/POST /api/organizations`, `GET/PATCH/DELETE /api/organizations/{id}` | Organization CRUD. Delete returns 409 with linked counts when blocked.                                                                                                                                                     |
| `GET /api/organizations/{id}/timeline`                                    | Merged timeline for an organization.                                                                                                                                                                                       |
| `GET/POST /api/contacts`, `GET/PATCH/DELETE /api/contacts/{id}`           | Contact CRUD. `GET` accepts `status`.                                                                                                                                                                                      |
| `GET /api/contacts/{id}/timeline`                                         | Contact timeline.                                                                                                                                                                                                          |
| `GET/POST /api/deals`, `GET/PATCH/DELETE /api/deals/{id}`                 | Deal CRUD. Changing `stage` applies R5 and R6 and writes a stage change. A PATCH sends only the fields that change.                                                                                                        |
| `POST /api/deals/{id}/move`                                               | Body: `{stage, position}`. Used by pipeline drag and drop. Re-numbers positions in the source and target columns.                                                                                                          |
| `GET /api/deals/{id}/timeline`                                            | Deal timeline.                                                                                                                                                                                                             |
| `GET/POST /api/activities`, `PATCH/DELETE /api/activities/{id}`           | Activity CRUD. `PATCH` also sets `done`.                                                                                                                                                                                   |
| `GET /api/pipeline`                                                       | Deals grouped by stage, with column and board totals.                                                                                                                                                                      |
| `GET /api/dashboard`                                                      | Monthly series, open pipeline by stage, recent activity, follow-ups.                                                                                                                                                       |
| `GET /api/search`                                                         | Query: `q`. Up to 5 organizations, contacts and deals whose name contains `q` (R51 to R53 in `search.md`). Contacts include their organization's name.                                                                     |
| `POST /api/copilot/chat`                                                  | Body: `{messages}`, the conversation so far. Returns `{reply, records, proposal}`: the reply text, the records it used, and a checked proposal or `null` (R61 to R69 in `copilot.md`). Writes nothing.                     |
| `GET /api/me`                                                             | The signed-in person's email.                                                                                                                                                                                              |
| `GET /api/auth/config`                                                    | No token needed. The Supabase URL, the publishable key, and whether test sign-in is on (R41, R43).                                                                                                                         |
| `POST /api/auth/test-sign-in`                                             | No token needed. Body: `{email}`. Returns a test token for that email. Returns 404 unless `ACCOUNTABLE_TEST_SIGN_IN=1` is set (R43).                                                                                       |
| `POST /api/admin/reset`                                                   | Replaces all data with the sample data. Returns 404 unless the environment variable `ACCOUNTABLE_ALLOW_RESET=1` is set, which only the end-to-end tests do, and always returns 404 when `DATABASE_URL` points at Postgres. |

Errors use one shape: `{"error": "...", "linked": {...}}` for 409 delete refusals. Other errors are 401 (not signed in), 404 (not found) or 422 (invalid input), with `{"error": "..."}`. `POST /api/copilot/chat` also answers 503 when the Copilot isn't set up, 429 when OpenRouter rate-limits it, and 502 when OpenRouter fails or times out (R73 in `copilot.md`).
