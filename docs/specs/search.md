# Search

Part of the product spec. Read `docs/spec.md` first. Requirement and decision numbers match the rest of the spec.

## Requirements

- **R51 What it finds**: a search box in the top bar, on every page except the sign-in screen, finds organizations, contacts and deals whose name contains the typed text. Spaces at either end are ignored. The text is matched as typed: `%` and `_` have no special meaning.
- **R52 Case**: search ignores the case of the letters A to Z, and gives the same results on SQLite and Postgres. Other letters, such as É and é, must match exactly.
- **R53 Results**: up to 5 of each kind, grouped under Organizations, Contacts and Deals, each group sorted by name. Picking a result opens its detail page. Text that matches nothing shows "No matches". An empty box shows no results and sends no request.
- **R54 Keyboard**: results update as the person types. Down and Up arrows move through the results, Enter opens the one selected, and Escape closes the list.

## Screen

- The search box sits at the left of the top bar, with the placeholder "Search organizations, contacts and deals".
- Results open in a panel under the box, styled like the app's dialogs, with a heading for each group that has results. A contact's result shows its organization in muted text when it has one.

## Design decisions

Choices the requirements leave open, with the reason for each.

- **16. Search runs on the server.** The tables search in the browser (decision 8), but this box covers all three kinds of record, and it has to give the same results on SQLite and Postgres. It uses `GET /api/search`.
- **17. Five results of each kind.** Keeps the list short enough to read at a glance. The tables are there for longer lists.
- **18. Case is ignored for A to Z only.** SQLite ignores case for those letters only, so going further would give different results on the two databases.
