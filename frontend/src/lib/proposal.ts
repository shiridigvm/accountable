// What a Copilot proposal card shows and where its Confirm goes (R64, R65).
// Pure functions, so the card stays simple.
import type { FieldValue, Proposal, RecordKind } from '../api/copilot';
import { formatDate, formatMoney, formatPercent } from './format';
import { STATUS_LABELS } from './labels';
import type { ContactStatus } from './stages';

const PLURAL: Record<RecordKind, string> = {
  organization: 'organizations',
  contact: 'contacts',
  deal: 'deals',
  activity: 'activities',
};

// The labels the app's forms use for the same fields.
const LABELS: Record<string, string> = {
  name: 'Name',
  website: 'Website',
  industry: 'Industry',
  notes: 'Notes',
  email: 'Email',
  phone: 'Phone',
  job_title: 'Job title',
  status: 'Status',
  organization_id: 'Organization',
  stage: 'Stage',
  value_cents: 'Value',
  probability: 'Probability of close',
  expected_close: 'Expected close date',
  actual_close: 'Actual close date',
  main_contact_id: 'Main contact',
  type: 'Type',
  description: 'What happened',
  occurred_on: 'Date',
  follow_up_on: 'Follow-up date',
  done: 'Done',
  contact_id: 'Contact',
  deal_id: 'Deal',
};

const DATE_FIELDS = new Set([
  'expected_close',
  'actual_close',
  'occurred_on',
  'follow_up_on',
]);
const ID_FIELDS = new Set([
  'organization_id',
  'main_contact_id',
  'contact_id',
  'deal_id',
]);
const ACTIVITY_TYPES: Record<string, string> = {
  note: 'Note',
  call: 'Call',
  email: 'Email',
};

export function proposalTitle(proposal: Proposal): string {
  const verb = proposal.action === 'create' ? 'Create' : 'Update';
  return `${verb} ${proposal.kind}`;
}

export function proposalRequest(proposal: Proposal): {
  method: 'POST' | 'PATCH';
  path: string;
} {
  const base = `/api/${PLURAL[proposal.kind]}`;
  return proposal.action === 'create'
    ? { method: 'POST', path: base }
    : { method: 'PATCH', path: `${base}/${proposal.id}` };
}

export function fieldLabel(field: string): string {
  return LABELS[field] ?? field;
}

export function formatField(field: string, value: FieldValue): string {
  if (value === null || value === '') return 'None';
  if (field === 'value_cents') return formatMoney(Number(value));
  if (field === 'probability') return formatPercent(Number(value));
  if (DATE_FIELDS.has(field)) return formatDate(String(value));
  if (field === 'done') return value ? 'Yes' : 'No';
  if (field === 'status')
    return STATUS_LABELS[value as ContactStatus] ?? String(value);
  if (field === 'type') return ACTIVITY_TYPES[String(value)] ?? String(value);
  if (ID_FIELDS.has(field)) return `#${value}`;
  return String(value);
}

export function recordPath(
  kind: 'organization' | 'contact' | 'deal',
  id: number,
): string {
  return `/${PLURAL[kind]}/${id}`;
}

// A saved record, as the POST or PATCH route returns it.
export type SavedRecord = {
  id: number;
  name?: string;
  contact_id?: number | null;
  contact_name?: string | null;
  deal_id?: number | null;
  deal_name?: string | null;
};

// Where "Saved" links to. An activity has no page of its own, so it links to the
// contact or deal it belongs to.
export function savedLink(
  kind: RecordKind,
  saved: SavedRecord,
): { path: string; name: string } | null {
  if (kind !== 'activity')
    return { path: recordPath(kind, saved.id), name: saved.name ?? '' };
  if (saved.contact_id)
    return {
      path: recordPath('contact', saved.contact_id),
      name: saved.contact_name ?? '',
    };
  if (saved.deal_id)
    return {
      path: recordPath('deal', saved.deal_id),
      name: saved.deal_name ?? '',
    };
  return null;
}
