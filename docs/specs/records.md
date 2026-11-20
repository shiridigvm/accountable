# Records, tables and detail pages

Part of the product spec. Read `docs/spec.md` first. Requirement and decision numbers match the rest of the spec. The deal record (R3) and late deals (R10) are in `deals.md`.

## Requirements

### Records

- **R1 Organization**: name, website, industry, notes. Has many contacts and deals.
- **R2 Contact**: name, email, phone, job title, status (`lead`, `qualified`, `customer`), organization (optional). A lead is a contact with the lead status, so there is no separate list of leads.
- **R4 Activity**: type (`note`, `call`, `email`), description, occurred-at date, optional follow-up date, done flag. Linked to one contact or one deal.

### Tables and detail pages

- **R8 Tables** (Organizations, Contacts, Deals): search box, sortable column headings, an add button, and edit and delete on each row. Search and sort run in the browser.
- **R9 Contacts filter**: filter by status (all, lead, qualified, customer).
- **R11 Detail pages**:
  - Organization: its contacts, its deals, and a timeline merging the activities of its contacts and deals, plus stage changes of its deals, newest first.
  - Contact: its organization, its activities, and the activities of deals where it is the main contact, newest first. Stage changes of those deals are shown too.
  - Deal: its details and its timeline (activities and stage changes), newest first.
  - Every detail page shows who added and last changed the record (R46 in `accounts.md`).
- **R12 Activities**: log, edit and delete from a contact or deal. A follow-up date and a done flag are optional.

### Delete rules

- **R13**: Every delete asks for confirmation first.
- **R14**: A delete is refused while the record has linked records. The refusal lists what is linked (for example "3 contacts, 2 deals") and says what to remove first.
  - Organization: blocked by contacts or deals.
  - Contact: blocked by activities, or by being main contact of a deal.
  - Deal: blocked by activities.
  - Activity: never blocked.
- **R15**: Nothing is cascaded and nothing is unlinked silently. The one exception is a deal's stage history, which is part of the deal (see design decision 2 in deals.md).

## Screen

### Tables and forms

- Table: search box above, add button top right, sortable headings with an arrow, row actions (edit, delete) at the right.
- Form: a dialog with the fields from the record requirements (R1 to R4). Validation messages sit under each field.
- Delete dialog: asks "Delete X?". When the server refuses, the dialog lists the linked records and says what to remove first, with no delete button.

## Design decisions

Choices the requirements leave open, with the reason for each.

- **3. Contact timeline includes main-contact deals.** Without this, a contact's timeline would miss most deal activity.
- **4. Organization timeline includes stage changes.** They are part of what happened with the company's deals.
- **8. Client-side search and sort.** The data is small (about 25 deals and 20 contacts).
