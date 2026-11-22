# Copilot

Part of the product spec. Read `docs/spec.md` first. Requirement and decision numbers match the rest of the spec.

## Requirements

### The panel

- **R58 Opening it**: a Copilot button in the top bar opens a chat panel at the right of the window, on every page except the sign-in screen. The panel's close button, the Copilot button again, or Escape closes it and puts focus back on the Copilot button.
- **R59 The conversation**: the conversation stays while the person moves between pages. It lives in the page only: refreshing, closing the tab or signing out clears it, and nothing about it is stored on the server or in the database.
- **R60 Keyboard and screen readers**: Enter sends a message, and Shift+Enter starts a new line. A new reply is announced to screen readers. While a reply is on its way, the panel shows "Thinking" and the send button is turned off.

### Questions

- **R61 Answers**: the Copilot answers questions about the team's organizations, contacts, deals, activities, the pipeline and the dashboard figures. It looks things up through the same backend functions the API's read routes use (see `data.md`), as the signed-in person. It never reads the database any other way.
- **R62 Records named**: a reply lists the records it used, each as a link to its detail page. A link is shown only for a record that exists.

### Changes

- **R63 What it can change**: the Copilot can propose to create or update one organization, contact, deal or activity at a time. Updates include moving a deal to another stage and marking an activity done.
- **R64 Proposals**: a proposed change is shown as a card in the conversation, with the action ("Create deal", "Update contact"), the record's name, and each field it will set. For an update, the card shows each field's current value next to the new one. The card has Confirm and Cancel buttons.
- **R65 Confirm**: nothing is saved until the person presses Confirm. Confirm sends the change through the same API route the app's forms use (`POST` to create, `PATCH` to update), so every rule applies as it does in the app, including R5 and R6 for stage changes and the activity link rule. The person is recorded as who added or last changed the record (R44 in `accounts.md`). The card then shows "Saved" with a link to the record, or the API's error message, and the page on screen shows the change. A card can be confirmed once.
- **R66 Cancel**: Cancel saves nothing and marks the card "Cancelled". A card left without an answer saves nothing.
- **R67 Not supported**: the Copilot can't delete records, change several records in one card, or act outside Accountable. Asked to, it says it can't, proposes nothing, and nothing changes.

### Safety

- **R68 Record content is data**: names, notes, descriptions and every other field of a record go to the model marked as record content, and the model is told to treat them as information, never as instructions. Because every change needs Confirm, text in a record can never cause a change by itself.
- **R69 Proposals are checked**: the backend checks every proposal before the browser sees it: the record type is one of the four, the action is create or update, every field is one the app's forms can set for that type, and the record being updated exists. A proposal that fails is dropped, and the reply says the Copilot couldn't prepare that change.
- **R70 Replies are text**: the model's replies are shown as plain text, never as HTML, so a reply can't add links, scripts or buttons. Record links (R62) and cards (R64) are drawn by the app from data the backend checked.
- **R71 Signed in only**: the Copilot routes need a signed-in person, like every other route (R37 and R40). Signed out, they answer 401.

### Model and errors

- **R72 OpenRouter**: the backend calls OpenRouter's chat completions API. The key is `OPENROUTER_API_KEY` and the model is `OPENROUTER_MODEL`, which defaults to `openrouter/free`, both in `.env` (R55 in `platform.md`). The key never reaches the browser. Neither the key nor the contents of a conversation are logged.
- **R73 Errors**: the panel shows a clear message in Raspberry text, and the rest of the app keeps working:
  - no key set: "The Copilot isn't set up yet. Ask whoever runs Accountable to add an OpenRouter key."
  - OpenRouter rate-limits the request: "The AI service is busy. Try again in a minute."
  - OpenRouter fails, times out or sends a reply the backend can't read: "The Copilot couldn't get an answer. Try again."
  - a message over 2,000 characters: "Messages can be up to 2,000 characters." The message is not sent.

## Screen

- The Copilot button sits at the right of the top bar, left of the user menu button. Its label is "Copilot" and it shows as pressed while the panel is open.
- The panel is about 400px wide, below the top bar, on the panel surface for the current mode, rounded with no outline. On wide screens the main area narrows to make room, so the page stays readable beside it. Below about 720px wide the panel covers the main area.
- The panel has a heading "Copilot" with a close button, the conversation, and a message box at the bottom with the placeholder "Ask about your organizations, contacts and deals" and a Send button.
- The person's messages sit on the right in a Sea Green tint. Replies sit on the left on the page background. Record links use the app's link color.
- A proposal card is a panel inside the conversation. Confirm is Sea Green with Midnight text. Cancel is a plain text button.
- An empty conversation shows one line, "Ask a question or ask for a change. Nothing is saved until you confirm."
- Everything uses the color tokens, in light and dark mode (R36 in `appearance.md`).

## Design decisions

Choices the requirements leave open, with the reason for each.

- **22. Confirm goes through the existing routes from the browser.** The backend never writes on the model's say-so. The write is the same request the app's forms send, made by the person pressing Confirm, so the rules, validation and who-changed-it tracking are the ones already tested.
- **23. Lookups run on the backend, through the read functions the API uses.** The model never gets database access or SQL, only a fixed set of read-only lookups, each running as the signed-in person.
- **24. One record per proposal.** A card for several records is harder to read and check before confirming. People can ask again for the next one.
- **25. The conversation is not stored.** It avoids a new table, row-level security and a retention question, and a first version does not need history.
- **26. `openrouter/free` by default.** It costs nothing to try. It picks a free model at random on each request, so answers vary in quality and free models have lower rate limits. `OPENROUTER_MODEL` picks a fixed model when that matters.
- **27. Messages are limited to 2,000 characters.** It keeps requests to the model small and quick and limits what one message can cost.
