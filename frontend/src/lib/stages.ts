// The six fixed stages (R7) with their column colors from the brand skill.

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
  New: '#118ab2',
  Qualified: '#ffc145',
  Proposal: '#f78c6b',
  Negotiation: '#3e6373',
  Won: '#06d6a0',
  Lost: '#ef476f',
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
