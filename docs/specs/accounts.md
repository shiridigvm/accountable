# Sign-in, people and the user menu

Part of the product spec. Read `docs/spec.md` first. Requirement and decision numbers match the rest of the spec.

## Requirements

### Sign-in

- **R37 Sign-in**: everyone signs in with an email and password through Supabase Auth. Signed out, every page shows the sign-in screen instead of its content, and every API route answers 401, except the two routes that sign-in itself needs (R41 and R43).
- **R38 No sign-up**: there is no sign-up page and no way to create an account in the app. People are added in Supabase's dashboard, where sign-ups are turned off.
- **R39 Session**: a signed-in person stays signed in across reloads and browser restarts, until they sign out or the session can no longer be renewed. Then the app shows the sign-in screen. After signing in, the app opens the page that was asked for, or the dashboard.
- **R40 Token check**: the browser sends the access token with every API request. The backend checks the token on every request and takes the person's email from it, never from the request body, query or other headers. A missing, expired or invalid token gets 401.
- **R41 Keys in the browser**: the browser holds only the Supabase URL and the publishable key, which it gets from `GET /api/auth/config`. No other setting or secret reaches the browser.
- **R42 Sign out**: Sign out is in the user menu. It ends the session and shows the sign-in screen.
- **R43 Test sign-in**: when the environment variable `ACCOUNTABLE_TEST_SIGN_IN=1` is set, the backend offers a test-only sign-in that takes an email and no password, and the sign-in screen shows a form for it. The end-to-end tests and ui-check use it, so they need no real password and never touch Supabase. The app refuses to start when `ACCOUNTABLE_TEST_SIGN_IN=1` is set and `DATABASE_URL` points at Postgres, so test sign-in can never open the real data. Without the variable, the test sign-in route answers 404 and the backend refuses test tokens.

### Who added and changed a record

- **R44**: each organization, contact, deal and activity records who added it and who last changed it. The backend sets both from the signed-in person (R40). Moving a deal on the pipeline is a change to the moved deal only: re-numbering the other cards in a column does not change who last changed them. Marking an activity done is a change to that activity.
- **R45**: a person is shown by their email, everywhere. The sample data shows "Sample data" as who added and last changed it. Records that existed before sign-in was added show "Unknown".
- **R46**: detail pages show "Added by" and "Last changed by" in the summary panel. Each activity in a timeline shows who added it. Stage changes do not record who made them.

### User menu

- **R47 Initials**: the menu button shows the person's initials, taken from the part of the email before the @. That part is split at `.`, `_`, `-` and `+`, and the first letters of the first two pieces are shown in capitals. With one piece, its first letter is shown. For example, `jane.doe@example.com` shows "JD" and `sam@example.com` shows "S".
- **R48 Menu contents**: the person's email, the theme choice (Light, Dark, System; see R32 and R33 in `appearance.md`), and Sign out.
- **R49 Keyboard**: Enter or Space on the button opens the menu, arrow keys move between items, Enter or Space picks one, and Escape closes the menu and puts focus back on the button.

## Screens

### Sign-in screen

- Page background with one panel in the middle and the wordmark above it. No sidebar and no top bar.
- Heading "Sign in", then Email and Password fields and a "Sign in" button in Sea Green with Midnight text.
- A wrong email or password shows "Email or password is wrong." under the form, in Raspberry text. When Supabase can't be reached, it shows "Can't reach the sign-in service. Check your connection."
- While test sign-in is on (R43), a second panel headed "Test sign-in" has an Email field and a "Sign in for testing" button.
- The screen follows the theme (R32 to R35).

### User menu

- A round button at the right end of the top bar, Sea Green with the initials in Midnight. Its accessible name is "Account menu for" and the email.
- The menu opens below the button and is styled like the app's dialogs: the email first, in muted text, then "Theme" with Light, Dark and System, the current choice marked, then "Sign out".

## Design decisions

Choices the requirements leave open, with the reason for each.

- **12. Records store the email, not a user id.** People are shown by email everywhere, so storing it avoids a users table and a lookup on every read. If someone's email changes in Supabase, records keep the old one.
- **13. Test sign-in is on the sign-in screen.** ui-check works only through the browser, so the test sign-in needs a form, not only an API route.
- **14. The app refuses to start with test sign-in on Postgres,** rather than each route checking. One check at startup can't be missed by a new route.
- **15. Records from before sign-in show "Unknown".** The local SQLite file may hold records the person added before this change, so they can't all be called "Sample data".
