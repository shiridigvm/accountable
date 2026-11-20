# Intent: sign-in, search and a user menu

## Problem

Accountable runs on one computer for one person. A team can't share it, nobody signs in, and there's no quick way to find a record.

## Proposed outcome

A small team shares one Accountable on the web. Everyone signs in and works on the same organizations, contacts and deals, and each record shows who added it. A search box in the top bar finds any organization, contact or deal. A menu under your initials holds the theme, light, dark or system, and signing out.

## Constraints

- The data lives in Postgres on Supabase, still through SQLAlchemy Core. The tests keep their own SQLite databases.
- Sign-in uses Supabase Auth with an email and password. The browser holds only the publishable key. The backend checks the token on every request and takes the user from it, never from the request.
- There's no sign-up page. People are added in Supabase's dashboard.
- The settings live in .env as DATABASE_URL, SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.
- `npm run dev` keeps using the local SQLite file when DATABASE_URL is not set. Supabase's Postgres is for the built app and Render. `npm run seed` and the first-start seed work on SQLite as they do today.
- Supabase gets the sample data from the first start: an empty Postgres database is seeded once, like a new SQLite file. `npm run seed` refuses to run against Postgres, so nobody wipes the team's data by mistake.
- `npm run dev` signs in through Supabase Auth, so it needs the Supabase settings and an internet connection, even though its data stays in SQLite.
- The end-to-end tests and ui-check sign in through a test-only sign-in, switched on by an environment variable the way `ACCOUNTABLE_ALLOW_RESET` is. It is refused whenever DATABASE_URL points at Postgres, so it can never open the real data.
- The search box and the menu sit in a new bar across the top of the main area. The sidebar keeps the five sections and loses the mode toggle. Below about 720px, where the sidebar already becomes a top bar, the search box and menu join it.
- Each organization, contact, deal and activity records who added it and who last changed it.
- A person is shown by their email, everywhere. The initials on the menu come from the part of the email before the @. The sample data shows "Sample data" as who added it.
- The end-to-end tests and ui-check sign in without anyone's real password and never touch Supabase. CI needs no secrets.
- Search ignores case and works the same on SQLite and Postgres.
- The theme moves from the dark mode button into the menu. System follows the device's setting, and is the default for anyone who hasn't picked one. This replaces light as the default (R32, design decision 11).
- Accountable now needs an internet connection, for Supabase. The tests still run without one.
- The app deploys to Render's free plan as one web service: FastAPI serves the built frontend and the API, migrations run when it starts, and it answers at its onrender.com address. A render.yaml describes it, with the Supabase settings entered in Render, not written in the file.
- Every unit test, old and new, runs in under a second on this computer, because CI runs on a much slower machine.
- No new dependencies unless the plan makes the case for one.

## Not in this change

- Roles and permissions: everyone can do everything.
- Moving the data in the local SQLite file to Supabase. Supabase starts with the sample data.
- Signing in with Google, magic links or a password reset.

## Success criteria

1. npm run check passes and never touches Supabase, with or without the settings in .env.
2. Signed out, every page shows the sign-in screen and every API route refuses. Signed in, everything works as before.
3. Every record and activity shows who added it.
4. Search finds an organization, a contact and a deal by part of a name, in any case.
5. The menu's theme choice is remembered, and System follows the device's setting.
6. The built app runs on this computer the way Render runs it, signed in against Supabase.
