// Board helpers for drag and drop. The board updates on screen at once, and the server's answer
// replaces it (R20). These mirror the backend rules for stage, probability and position.
import type { Board, BoardDeal, BoardColumn } from '../api/types';
import { DEFAULT_PROBABILITY, type Stage } from './stages';

export function findColumn(board: Board, dealId: number): BoardColumn | undefined {
  return board.columns.find((c) => c.deals.some((d) => d.id === dealId));
}

export function moveDealLocally(board: Board, dealId: number, stage: Stage, position: number): Board {
  const source = findColumn(board, dealId);
  if (!source) return board;
  const deal = source.deals.find((d) => d.id === dealId)!;
  const changed = source.stage !== stage;
  const probability = changed ? DEFAULT_PROBABILITY[stage] : deal.probability;
  const moved: BoardDeal = {
    ...deal,
    stage,
    probability,
    expected_cents: Math.round((deal.value_cents * probability) / 100),
  };
  const columns = board.columns.map((column) => {
    const remaining = column.deals.filter((d) => d.id !== dealId);
    if (column.stage !== stage) return { column, remaining };
    const index = Math.max(0, Math.min(position, remaining.length));
    return { column, remaining: [...remaining.slice(0, index), moved, ...remaining.slice(index)] };
  });
  const rebuilt = columns.map(({ column, remaining }) => summarize(column, remaining));
  return totals({ ...board, columns: rebuilt });
}

function summarize(column: BoardColumn, deals: BoardDeal[]): BoardColumn {
  return {
    ...column,
    deals,
    count: deals.length,
    value_cents: deals.reduce((sum, d) => sum + d.value_cents, 0),
    expected_cents: column.open ? deals.reduce((sum, d) => sum + d.expected_cents, 0) : null,
  };
}

function totals(board: Board): Board {
  const open = board.columns.filter((c) => c.open).flatMap((c) => c.deals);
  return {
    ...board,
    open_value_cents: open.reduce((sum, d) => sum + d.value_cents, 0),
    open_expected_cents: open.reduce((sum, d) => sum + d.expected_cents, 0),
  };
}
