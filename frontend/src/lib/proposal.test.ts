import { describe, expect, it } from 'vitest';
import type { Proposal } from '../api/copilot';
import {
  fieldLabel,
  formatField,
  proposalRequest,
  proposalTitle,
  recordPath,
  savedLink,
} from './proposal';

function proposal(overrides: Partial<Proposal>): Proposal {
  return {
    kind: 'deal',
    action: 'create',
    id: null,
    name: 'Big deal',
    fields: {},
    current: null,
    ...overrides,
  };
}

describe('proposalTitle', () => {
  it('names the action and the kind', () => {
    expect(proposalTitle(proposal({}))).toBe('Create deal');
    expect(
      proposalTitle(proposal({ kind: 'contact', action: 'update', id: 7 })),
    ).toBe('Update contact');
    expect(proposalTitle(proposal({ kind: 'organization' }))).toBe(
      'Create organization',
    );
    expect(proposalTitle(proposal({ kind: 'activity' }))).toBe(
      'Create activity',
    );
  });
});

describe('proposalRequest', () => {
  it('posts a create and patches an update, to the routes the forms use', () => {
    expect(proposalRequest(proposal({}))).toEqual({
      method: 'POST',
      path: '/api/deals',
    });
    expect(
      proposalRequest(proposal({ kind: 'contact', action: 'update', id: 7 })),
    ).toEqual({ method: 'PATCH', path: '/api/contacts/7' });
    expect(
      proposalRequest(proposal({ kind: 'activity', action: 'update', id: 3 })),
    ).toEqual({ method: 'PATCH', path: '/api/activities/3' });
  });
});

describe('formatField', () => {
  it('shows money from cents and dates in the app format', () => {
    expect(formatField('value_cents', 4800000)).toBe('$48,000.00');
    expect(formatField('expected_close', '2027-01-15')).toBe('Jan 15, 2027');
    expect(formatField('follow_up_on', '2026-11-20')).toBe('Nov 20, 2026');
  });

  it('shows the other kinds of value readably', () => {
    expect(formatField('probability', 40)).toBe('40%');
    expect(formatField('done', true)).toBe('Yes');
    expect(formatField('done', false)).toBe('No');
    expect(formatField('status', 'customer')).toBe('Customer');
    expect(formatField('type', 'call')).toBe('Call');
    expect(formatField('contact_id', 12)).toBe('#12');
    expect(formatField('stage', 'Negotiation')).toBe('Negotiation');
    expect(formatField('notes', null)).toBe('None');
    expect(formatField('website', '')).toBe('None');
  });
});

describe('fieldLabel', () => {
  it('has a label for every field the forms can set', () => {
    const fields = [
      'name',
      'website',
      'industry',
      'notes',
      'email',
      'phone',
      'job_title',
      'status',
      'organization_id',
      'stage',
      'value_cents',
      'probability',
      'expected_close',
      'actual_close',
      'main_contact_id',
      'type',
      'description',
      'occurred_on',
      'follow_up_on',
      'done',
      'contact_id',
      'deal_id',
    ];
    for (const field of fields) expect(fieldLabel(field)).not.toBe(field);
    expect(fieldLabel('value_cents')).toBe('Value');
    expect(fieldLabel('description')).toBe('What happened');
  });
});

describe('record paths', () => {
  it('goes to the detail page of each kind', () => {
    expect(recordPath('organization', 1)).toBe('/organizations/1');
    expect(recordPath('contact', 2)).toBe('/contacts/2');
    expect(recordPath('deal', 3)).toBe('/deals/3');
  });

  it('links a saved activity to its contact or deal', () => {
    expect(savedLink('deal', { id: 3, name: 'Big deal' })).toEqual({
      path: '/deals/3',
      name: 'Big deal',
    });
    expect(
      savedLink('activity', { id: 9, contact_id: 2, contact_name: 'Ana' }),
    ).toEqual({ path: '/contacts/2', name: 'Ana' });
    expect(
      savedLink('activity', {
        id: 9,
        contact_id: null,
        deal_id: 3,
        deal_name: 'Big deal',
      }),
    ).toEqual({ path: '/deals/3', name: 'Big deal' });
    expect(savedLink('activity', { id: 9 })).toBeNull();
  });
});
