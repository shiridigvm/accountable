# Accountable: product spec

This file summarizes Accountable as it is built today and indexes the area files in `docs/specs/`, which hold the detail. Read this file first, then only the area files the current change touches. A change in progress is described in its own folder, `docs/changes/<branch name>/`, and is merged into this file and the area files when the change is merged. Requirement numbers (R1, R2, ...) and design decision numbers (1, 2, ...) are stable so that tests and reviews can refer to them, and each one lives in exactly one area file.

## 1. Problem and purpose

A small business keeps track of its customers and sales in spreadsheets, inboxes and people's heads. Nobody can see at a glance which companies it deals with, who its contacts are, what is in the sales pipeline, what happened last with a customer, or what needs doing next.

Accountable is a business management system. It is planned as a sales CRM that grows into a full Business OS, including ERP. Today it is a complete sales CRM for a small team, shared on the web, with an AI Copilot that answers questions about the data and makes changes once the person confirms them. It works like a private Salesforce for the everyday CRM essentials. It should feel sharp, modern and professional, and be quick to use.

## 2. Users and scope

- **Users**: a small sales team sharing one Accountable. Everyone signs in with an email and password and works on the same organizations, contacts and deals. Each record shows who added it. Everyone can do everything.
- **Runs on the web**: the built app runs on Render's free plan, with its data in Postgres and sign-in through Supabase. It needs an internet connection. The Copilot uses OpenRouter, so the team's record content is sent to OpenRouter and the model it picks. For development, `npm run dev` runs it on this computer on `127.0.0.1`, with its data in a local SQLite file.
- **Browsers**: the latest Chrome, Safari, Firefox and Edge.
- **Layout**: light mode and dark mode, chosen in the user menu or following the device's setting, for laptop and desktop widths. There is no phone layout.
- **Not in the product yet**: roles and permissions, a sign-up page, signing in with Google, magic links or a password reset, live updates when someone else changes a record, a phone layout, AI features beyond the Copilot (such as saved conversations or deleting through it), email, calendar or phone integrations, currencies other than US dollars, reports beyond the dashboard, tags or custom fields, changing the pipeline stages, and importing or exporting data.

## 3. Areas

Each area file holds the requirements, screens and design decisions for one part of the product.

- [`specs/records.md`](specs/records.md): organizations, contacts and activities, the tables, the contacts filter, detail pages and delete rules. R1, R2, R4, R8, R9, R11 to R15. Decisions 3, 4, 8.
- [`specs/deals.md`](specs/deals.md): the deal record, stages and their rules, late deals and the pipeline board. R3, R5 to R7, R10, R16 to R21. Decisions 1, 2, 7, 9.
- [`specs/dashboard.md`](specs/dashboard.md): the dashboard's month window, figures, charts, follow-ups and recent activity. R22 to R24. Decision 5.
- [`specs/accounts.md`](specs/accounts.md): sign-in and sign out, test sign-in, who added and changed a record, and the user menu. R37 to R49. Decisions 12 to 15.
- [`specs/search.md`](specs/search.md): the search box in the top bar. R51 to R54. Decisions 16 to 18.
- [`specs/copilot.md`](specs/copilot.md): the Copilot chat panel, its answers, proposed changes and Confirm, its safety rules, OpenRouter and its errors. R58 to R73. Decisions 22 to 27.
- [`specs/appearance.md`](specs/appearance.md): the theme (light, dark or system), the look (fonts, colors, tokens) and the page layout, including the top bar. R32 to R36. Decisions 10, 11.
- [`specs/data.md`](specs/data.md): persistence, shared data, money and dates, the data model, and the API and its errors. R25, R30, R31, R50.
- [`specs/platform.md`](specs/platform.md): setup and seeding, settings, `npm start` and Render, sample data, technical design and testing. R26 to R29, R55 to R57. Decisions 6, 19 to 21.
