import { describe, expect, it } from 'vitest';
import type { Deal } from '../api/types';
import { changedBody, toInitial } from './Deals';

const deal = {
  id: 7,
  name: 'Atlas contract',
  stage: 'New',
  value_cents: 125000,
  probability: 10,
  expected_close: '2027-01-15',
  actual_close: null,
  organization_id: null,
  main_contact_id: null,
} as unknown as Deal;

describe('changedBody', () => {
  it('sends only the stage when only the stage changed, so the stage rules set probability and close date', () => {
    const initial = toInitial(deal);
    expect(changedBody(initial, { ...initial, stage: 'Won' })).toEqual({
      stage: 'Won',
    });
  });

  it('sends a changed value in cents and nothing else', () => {
    const initial = toInitial(deal);
    expect(changedBody(initial, { ...initial, value: '2000' })).toEqual({
      value_cents: 200000,
    });
  });

  it('sends a probability the user typed by hand', () => {
    const initial = toInitial(deal);
    expect(changedBody(initial, { ...initial, probability: '35' })).toEqual({
      probability: 35,
    });
  });

  it('sends an empty probability as null, so the stage default applies', () => {
    const initial = toInitial({ ...deal, probability: 35 } as Deal);
    expect(changedBody(initial, { ...initial, probability: '' })).toEqual({
      probability: null,
    });
  });

  it('sends nothing when nothing changed', () => {
    const initial = toInitial(deal);
    expect(changedBody(initial, { ...initial })).toEqual({});
  });
});
