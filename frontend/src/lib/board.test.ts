import { describe, expect, it } from 'vitest';
import type { Board, BoardDeal } from '../api/types';
import { moveDealLocally } from './board';

function deal(
  id: number,
  stage: string,
  late: boolean,
  position: number,
): BoardDeal {
  return {
    id,
    name: `Deal ${id}`,
    stage,
    value_cents: 100000,
    probability: 10,
    expected_close: '2026-10-01',
    actual_close: null,
    organization_id: null,
    organization_name: null,
    main_contact_id: null,
    main_contact_name: null,
    position,
    expected_cents: 10000,
    late,
  } as unknown as BoardDeal;
}

function board(): Board {
  const column = (stage: string, deals: BoardDeal[], open: boolean) => ({
    stage,
    probability: 10,
    open,
    count: deals.length,
    value_cents: deals.reduce((s, d) => s + d.value_cents, 0),
    expected_cents: open
      ? deals.reduce((s, d) => s + d.expected_cents, 0)
      : null,
    deals,
  });
  return {
    columns: [
      column('New', [deal(1, 'New', true, 0)], true),
      column('Won', [], false),
    ] as Board['columns'],
    open_value_cents: 100000,
    open_expected_cents: 10000,
  };
}

describe('moveDealLocally', () => {
  it('clears the late flag when a late deal is dropped in Won', () => {
    const moved = moveDealLocally(board(), 1, 'Won', 0);
    expect(moved.columns.find((c) => c.stage === 'Won')!.deals[0].late).toBe(
      false,
    );
  });

  it('keeps the late flag when a late deal stays in an open stage', () => {
    const moved = moveDealLocally(board(), 1, 'New', 0);
    expect(moved.columns.find((c) => c.stage === 'New')!.deals[0].late).toBe(
      true,
    );
  });
});
