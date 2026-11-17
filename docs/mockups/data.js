// Shared sample data for the three mockups. Figures are illustrative.
// Each mockup reads these globals and draws its own markup.

const TODAY = new Date(2026, 10, 17);

const STAGE_LIST = [
  { name: 'New', p: 10 },
  { name: 'Qualified', p: 25 },
  { name: 'Proposal', p: 50 },
  { name: 'Negotiation', p: 75 },
  { name: 'Won', p: 100 },
  { name: 'Lost', p: 0 },
];

// name, organization, stage, value (USD), expected close, actual close ('' if open)
const RAW_DEALS = [
  ['Ardent Foods pilot', 'Ardent Foods', 'New', 48000, '2027-01-30', ''],
  ['Brightline Dental intro', 'Brightline Dental', 'New', 18500, '2026-12-15', ''],
  ['Kestrel Freight audit', 'Kestrel Freight', 'New', 32000, '2026-10-20', ''],
  ['Northwind Health pilot', 'Northwind Health', 'New', 41000, '2026-12-30', ''],
  ['Pinecrest Schools license', 'Pinecrest Schools', 'Qualified', 64000, '2026-12-18', ''],
  ['Lumen Analytics expansion', 'Lumen Analytics', 'Qualified', 81000, '2027-01-15', ''],
  ['Quarry Hill Builders', 'Quarry Hill Builders', 'Qualified', 39000, '2026-11-08', ''],
  ['Oakridge Insurance', 'Oakridge Insurance', 'Qualified', 52000, '2027-02-28', ''],
  ['Helix Robotics quote', 'Helix Robotics', 'Proposal', 120000, '2026-12-05', ''],
  ['Bluewater Marine', 'Bluewater Marine', 'Proposal', 96000, '2027-01-22', ''],
  ['Cobalt Retail rollout', 'Cobalt Retail', 'Proposal', 110000, '2027-03-18', ''],
  ['Greenfield Clinics', 'Greenfield Clinics', 'Proposal', 70000, '2026-11-28', ''],
  ['Atlas Logistics', 'Atlas Logistics', 'Negotiation', 150000, '2026-12-10', ''],
  ['Orchid Bakery chain', 'Orchid Bakery', 'Negotiation', 65000, '2026-11-25', ''],
  ['Vantage Legal', 'Vantage Legal', 'Negotiation', 88000, '2027-02-05', ''],
  ['Pioneer Tools', 'Pioneer Tools', 'Won', 28000, '2025-11-14', '2025-11-20'],
  ['Harbor Foods', 'Harbor Foods', 'Won', 42000, '2026-02-10', '2026-02-14'],
  ['Ironwood Partners', 'Ironwood Partners', 'Won', 56000, '2026-03-15', '2026-03-19'],
  ['Crescent Print', 'Crescent Print', 'Won', 38000, '2026-04-05', '2026-04-09'],
  ['Maple Hotels', 'Maple Hotels', 'Won', 120000, '2026-06-20', '2026-06-22'],
  ['Evergreen Pharma', 'Evergreen Pharma', 'Won', 77000, '2026-07-25', '2026-07-28'],
  ['Ferro Metals', 'Ferro Metals', 'Won', 150000, '2026-09-15', '2026-09-18'],
  ['Redwood Energy', 'Redwood Energy', 'Won', 95000, '2026-10-28', '2026-10-30'],
  ['Silverline Media', 'Silverline Media', 'Won', 64000, '2026-11-01', '2026-11-03'],
  ['Basil Cafe', 'Basil Cafe', 'Lost', 12000, '2026-10-10', '2026-10-12'],
  ['Juniper Labs', 'Juniper Labs', 'Lost', 45000, '2026-08-28', '2026-08-30'],
];

const FOLLOW_UPS = [
  { title: 'Call about audit scope', who: 'Kestrel Freight', due: '2026-11-12' },
  { title: 'Send revised quote', who: 'Quarry Hill Builders', due: '2026-11-15' },
  { title: 'Demo for engineering team', who: 'Helix Robotics', due: '2026-11-19' },
  { title: 'Contract review call', who: 'Atlas Logistics', due: '2026-11-21' },
];

const RECENT = [
  { text: 'Call logged with Atlas Logistics', when: 'Today' },
  { text: 'Orchid Bakery chain moved from Proposal to Negotiation', when: 'Yesterday' },
  { text: 'Email sent to Vantage Legal', when: 'Nov 14' },
  { text: 'Note added to Silverline Media', when: 'Nov 13' },
];

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function money(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function shortDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const DEALS = RAW_DEALS.map(([name, org, stage, value, expected, actual]) => {
  const p = STAGE_LIST.find((s) => s.name === stage).p;
  const open = stage !== 'Won' && stage !== 'Lost';
  const exp = parseDate(expected);
  return {
    name, org, stage, value, p, open,
    expected: exp,
    actual: actual ? parseDate(actual) : null,
    late: open && exp < TODAY,
    expectedRev: open ? (value * p) / 100 : 0,
  };
});

const sumBy = (list, key) => list.reduce((t, d) => t + d[key], 0);

const STAGES = STAGE_LIST.map((s) => {
  const deals = DEALS.filter((d) => d.stage === s.name);
  return { ...s, deals, value: sumBy(deals, 'value'), expected: sumBy(deals, 'expectedRev') };
});

const WON_2026 = DEALS.filter((d) => d.stage === 'Won' && d.actual.getFullYear() === 2026);
const OPEN = DEALS.filter((d) => d.open);

const SUMMARY = {
  wonValue: sumBy(WON_2026, 'value'),
  wonCount: WON_2026.length,
  openValue: sumBy(OPEN, 'value'),
  openExpected: sumBy(OPEN, 'expectedRev'),
  openCount: OPEN.length,
  lateCount: OPEN.filter((d) => d.late).length,
};

// 19 months: 12 back from the current month, the current month, and 6 ahead.
const MONTH_COUNT = 19;
const monthIdx = (d) => (d.getFullYear() - 2025) * 12 + d.getMonth() - 10;
const MONTH_LABELS = Array.from({ length: MONTH_COUNT }, (_, i) =>
  new Date(2025, 10 + i, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
);
const MONTHLY = {
  wonRev: Array(MONTH_COUNT).fill(0),
  wonCount: Array(MONTH_COUNT).fill(0),
  expRev: Array(MONTH_COUNT).fill(0),
  expCount: Array(MONTH_COUNT).fill(0),
};
DEALS.forEach((d) => {
  if (d.stage === 'Won') {
    const i = monthIdx(d.actual);
    if (i >= 0 && i < MONTH_COUNT) { MONTHLY.wonRev[i] += d.value; MONTHLY.wonCount[i] += 1; }
  }
  if (d.open) {
    const i = monthIdx(d.expected);
    if (i >= 0 && i < MONTH_COUNT) { MONTHLY.expRev[i] += d.expectedRev; MONTHLY.expCount[i] += 1; }
  }
});
