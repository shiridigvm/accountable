# Deals and pipeline

Part of the product spec. Read `docs/spec.md` first. Requirement and decision numbers match the rest of the spec.

## Requirements

### Deal record

- **R3 Deal**: name, stage, value (US dollars), probability of close, expected close date, actual close date, organization (optional), main contact (optional).

### Stages

| Stage       | Usual probability | Column accent (see appearance.md) |
| ----------- | ----------------- | --------------------------------- |
| New         | 10%               | Cerulean                          |
| Qualified   | 25%               | Marigold                          |
| Proposal    | 50%               | Coral                             |
| Negotiation | 75%               | Midnight tint                     |
| Won         | 100%              | Sea Green                         |
| Lost        | 0%                | Raspberry                         |

- **R5**: A deal's probability is set from its stage when the stage changes. A probability typed by hand is kept until the stage changes again.
- **R6**: Moving a deal to Won or Lost sets its actual close date to today, unless it already has one. Moving from Won or Lost to an open stage clears the actual close date, because an open deal has no outcome. Moving between Won and Lost keeps it. Other moves leave it alone.
- **R7**: Stages are fixed. Users cannot add, rename or reorder them.

### Late deals

- **R10 Late deals**: an open deal (not Won or Lost) whose expected close date is before today is marked as late, in the table and on its pipeline card.

### Pipeline

- **R16**: One column per stage (six columns), each card a deal.
- **R17**: Dragging a card to another column changes its stage (R5 and R6 apply).
- **R18**: Dragging within a column changes its place in that column. A card dropped anywhere in a column stays where it was dropped, including after a refresh. Keyboard users can do the same: Space picks a card up, arrow keys move it (up and down by one card, left and right by one column), and Space drops it.
- **R19**: A new deal can be added from a column, starting at that stage.
- **R20**: The board header shows total value and expected revenue of open deals (New to Negotiation). Each column shows its own total value and expected revenue. These update as soon as a card moves. Won and Lost columns show value only.
- **R21**: Expected revenue for a deal is its value times its probability of close.

## Screen

### Pipeline

- Six columns side by side, scrollable horizontally when the window is narrow.
- Column header: stage name, count, value, expected revenue (Won and Lost show value only).
- Card: deal name, organization, value, probability, expected close date. Late deals get a Raspberry date and a small "Late" tag, which is removed when the deal moves to Won or Lost.
- Drag and drop uses dnd-kit with mouse and keyboard sensors. The board updates at once. If the save fails, the board reverts. A failed refresh after a saved move does not report the move as unsaved.
- "Add deal" at the foot of each column opens the add form with that stage set.

## Design decisions

Choices the requirements leave open, with the reason for each.

- **1. Stage changes in their own table.** The activity types are note, call and email. The automatic "Moved from X to Y" entries therefore go in `deal_stage_changes`, not `activities`.
- **2. Deleting a deal removes its stage history.** Stage history is part of the deal, not a linked record. Blocking deletes of any deal with history would make most deals undeletable. The deal's activities still block its delete (R14).
- **7. Stage colors.** Six stages use five palette colors plus a Midnight tint. Negotiation uses the tint so it does not match Won's Sea Green.
- **9. Reopening a Won or Lost deal** clears the actual close date, because an open deal has no outcome. The probability follows the new stage (R5). Moving Won to Lost keeps the date, since R6 does not replace an existing one.
