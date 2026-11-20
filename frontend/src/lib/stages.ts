// The six fixed stages (R7) with their column colors from the brand skill.
// The colors are CSS tokens from styles.css, so they follow the light or dark mode.

export const STAGES = [
  'New',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost',
] as const;
export type Stage = (typeof STAGES)[number];

export const OPEN_STAGES: readonly Stage[] = [
  'New',
  'Qualified',
  'Proposal',
  'Negotiation',
];

export const STAGE_COLORS: Record<Stage, string> = {
  New: 'var(--stage-new)',
  Qualified: 'var(--stage-qualified)',
  Proposal: 'var(--stage-proposal)',
  Negotiation: 'var(--stage-negotiation)',
  Won: 'var(--stage-won)',
  Lost: 'var(--stage-lost)',
};

export const CONTACT_STATUSES = ['lead', 'qualified', 'customer'] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

// The usual probability for each stage (R5). Matches the backend.
export const DEFAULT_PROBABILITY: Record<Stage, number> = {
  New: 10,
  Qualified: 25,
  Proposal: 50,
  Negotiation: 75,
  Won: 100,
  Lost: 0,
};
