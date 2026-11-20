# Dashboard

Part of the product spec. Read `docs/spec.md` first. Requirement and decision numbers match the rest of the spec.

## Requirements

- **R22 Month window**: 12 months back and 6 months ahead of today, by month.
- **R23 Figures**:
  - Four stat panels: deals won this year (count), revenue won this year, open pipeline value, expected revenue.
  - Deals won per month (count) as a bar chart, and revenue won per month (sum of value, by actual close date) as a line chart, over the R22 window. Only won deals are counted.
  - Open pipeline by stage, with value and expected revenue, shown as one stacked bar whose segments are sized by value, with a legend.
  - Follow-ups: upcoming (due in the next 14 days, not done) and overdue (due before today, not done). Overdue is listed first. Marking one done removes it from this list. The list covers the whole team's follow-ups, not only the signed-in person's.
  - Recent activity: the latest entries across contacts and deals, including stage changes.
- **R24**: Dashboard figures are computed from the same data the tables show, so they match.

## Screen

- Top row: the four stat panels from R23, each with one large number in JetBrains Mono.
- Revenue line chart and deals-won bar chart (Cerulean bars), over the R22 window.
- Pipeline visual: one full-width stacked bar of the four open stages, with a legend listing value and expected revenue per stage.
- Lower row: follow-ups panel (overdue first, in Raspberry text) and recent activity panel.

## Design decisions

Choices the requirements leave open, with the reason for each.

- **5. Follow-up window of 14 days** for "upcoming".
