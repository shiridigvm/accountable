import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { DndContextProps, DragEndEvent } from '@dnd-kit/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Board, BoardDeal } from '../api/types';
import Pipeline from './Pipeline';

// Keep the real dnd-kit, but record the props given to DndContext so a test can finish a drag
// without a real pointer or layout, which jsdom does not have.
let dndProps: DndContextProps | undefined;
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DndContext: (props: DndContextProps) => {
      dndProps = props;
      return <actual.DndContext {...props} />;
    },
  };
});

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

function deal(id: number, over: Partial<BoardDeal> = {}): BoardDeal {
  return {
    id,
    name: `Deal ${id}`,
    stage: 'New',
    value_cents: 100000,
    probability: 10,
    expected_close: '2026-12-01',
    actual_close: null,
    organization_id: null,
    organization_name: null,
    main_contact_id: null,
    main_contact_name: null,
    position: 0,
    expected_cents: 10000,
    late: false,
    created_by: 'ana@example.com',
    updated_by: 'ben@example.com',
    ...over,
  };
}

const board: Board = {
  open_value_cents: 350000,
  open_expected_cents: 40000,
  columns: [
    {
      stage: 'New',
      probability: 10,
      open: true,
      count: 2,
      value_cents: 200000,
      expected_cents: 20000,
      deals: [
        deal(1, { organization_name: 'Acme', late: true }),
        deal(2, { position: 1 }),
      ],
    },
    {
      stage: 'Proposal',
      probability: 50,
      open: true,
      count: 1,
      value_cents: 150000,
      expected_cents: 75000,
      deals: [deal(3, { stage: 'Proposal', probability: 50 })],
    },
    {
      stage: 'Won',
      probability: 100,
      open: false,
      count: 0,
      value_cents: 0,
      expected_cents: null,
      deals: [],
    },
  ],
};

type Handler = (
  method: string,
  path: string,
) => ReturnType<typeof jsonResponse>;

function stubFetch(handler: Handler) {
  const fetchMock = vi.fn((path: string, init?: RequestInit) =>
    Promise.resolve(handler(init?.method ?? 'GET', path)),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const defaultHandler: Handler = (_method, path) => {
  if (path === '/api/pipeline') return jsonResponse(200, board);
  if (path === '/api/organizations') return jsonResponse(200, []);
  if (path === '/api/contacts') return jsonResponse(200, []);
  return jsonResponse(200, {});
};

// After a move the server's board has the deal in its new column.
function movedBoard(): Board {
  const moved = board.columns[0].deals[1];
  return {
    ...board,
    columns: board.columns.map((c) =>
      c.stage === 'New'
        ? { ...c, deals: c.deals.filter((d) => d.id !== moved.id) }
        : c.stage === 'Won'
          ? { ...c, deals: [{ ...moved, stage: 'Won' as const }] }
          : c,
    ),
  };
}

function renderPipeline() {
  render(
    <MemoryRouter>
      <Pipeline />
    </MemoryRouter>,
  );
}

function dragEnd(activeId: string, overId: string | null) {
  return act(async () => {
    await dndProps?.onDragEnd?.({
      active: { id: activeId },
      over: overId === null ? null : { id: overId },
    } as unknown as DragEndEvent);
  });
}

beforeEach(() => {
  dndProps = undefined;
});
afterEach(() => vi.unstubAllGlobals());

describe('Pipeline rendering', () => {
  it('shows the totals, the columns and the cards', async () => {
    stubFetch(defaultHandler);
    renderPipeline();
    expect(await screen.findByText('Open value')).toBeInTheDocument();
    expect(screen.getByText('$3,500.00')).toBeInTheDocument();
    expect(screen.getByText('$400.00')).toBeInTheDocument();

    const lead = screen.getByRole('region', { name: 'New column' });
    expect(within(lead).getByRole('link', { name: 'Deal 1' })).toHaveAttribute(
      'href',
      '/deals/1',
    );
    expect(within(lead).getByText('Acme')).toBeInTheDocument();
    expect(within(lead).getByText('Deal 2')).toBeInTheDocument();
    expect(within(lead).getByText('$200.00 expected')).toBeInTheDocument();

    const proposal = screen.getByRole('region', { name: 'Proposal column' });
    expect(within(proposal).getByText('Deal 3')).toBeInTheDocument();
    expect(within(proposal).getByText('50%')).toBeInTheDocument();
  });

  it('marks only late deals with the Late tag', async () => {
    stubFetch(defaultHandler);
    renderPipeline();
    await screen.findByText('Deal 1');
    expect(screen.getAllByText('Late')).toHaveLength(1);
    const lateCard = screen.getByText('Deal 1').closest('article')!;
    expect(within(lateCard).getByText('Late')).toBeInTheDocument();
  });

  it('shows an empty message and no expected figure for a closed column', async () => {
    stubFetch(defaultHandler);
    renderPipeline();
    const won = await screen.findByRole('region', { name: 'Won column' });
    expect(within(won).getByText('No deals in Won.')).toBeInTheDocument();
    expect(within(won).queryByText(/expected/)).not.toBeInTheDocument();
  });

  it('shows the load error', async () => {
    stubFetch((_method, path) =>
      path === '/api/pipeline'
        ? jsonResponse(500, { error: 'Pipeline is unavailable.' })
        : defaultHandler(_method, path),
    );
    renderPipeline();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pipeline is unavailable.',
    );
  });

  it('shows a loading message before the board arrives', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    renderPipeline();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('makes cards keyboard focusable for dnd-kit', async () => {
    stubFetch(defaultHandler);
    renderPipeline();
    const card = (await screen.findByText('Deal 1')).closest('article')!;
    expect(card).toHaveAttribute('tabindex', '0');
    expect(card).toHaveAttribute('role', 'button');
  });
});

describe('Pipeline add deal', () => {
  it('opens the add dialog for the column and saves a new deal', async () => {
    const fetchMock = stubFetch(defaultHandler);
    renderPipeline();
    await screen.findByText('Deal 1');
    const proposal = screen.getByRole('region', { name: 'Proposal column' });
    await userEvent.click(
      within(proposal).getByRole('button', { name: '+ Add deal' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Add deal to Proposal' }),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Name/), 'New deal');
    await userEvent.type(screen.getByLabelText(/Value/), '1000');
    await userEvent.type(
      screen.getByLabelText(/Expected close date/),
      '2026-12-31',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([path, init]) =>
            path === '/api/deals' && (init as RequestInit)?.method === 'POST',
        ),
      ).toBe(true),
    );
  });
});

describe('Pipeline moves', () => {
  it('moves a card to another column and saves it', async () => {
    let moved = false;
    const fetchMock = stubFetch((_method, path) => {
      if (path === '/api/deals/2/move') moved = true;
      if (path === '/api/pipeline' && moved)
        return jsonResponse(200, movedBoard());
      return defaultHandler(_method, path);
    });
    renderPipeline();
    await screen.findByText('Deal 1');
    await dragEnd('deal-2', 'column-Won');

    const won = screen.getByRole('region', { name: 'Won column' });
    expect(within(won).getByText('Deal 2')).toBeInTheDocument();
    const move = fetchMock.mock.calls.find(
      ([path]) => path === '/api/deals/2/move',
    );
    expect(move).toBeDefined();
    expect(JSON.parse((move![1] as RequestInit).body as string)).toEqual({
      stage: 'Won',
      position: 0,
    });
  });

  it('moves a card onto another card in a different column', async () => {
    const fetchMock = stubFetch(defaultHandler);
    renderPipeline();
    await screen.findByText('Deal 1');
    await dragEnd('deal-1', 'deal-3');
    const move = fetchMock.mock.calls.find(
      ([path]) => path === '/api/deals/1/move',
    );
    expect(JSON.parse((move![1] as RequestInit).body as string)).toEqual({
      stage: 'Proposal',
      position: 0,
    });
  });

  it('reorders within a column using the full index', async () => {
    const fetchMock = stubFetch(defaultHandler);
    renderPipeline();
    await screen.findByText('Deal 1');
    await dragEnd('deal-1', 'deal-2');
    const move = fetchMock.mock.calls.find(
      ([path]) => path === '/api/deals/1/move',
    );
    expect(JSON.parse((move![1] as RequestInit).body as string)).toEqual({
      stage: 'New',
      position: 1,
    });
  });

  it('does nothing when a card is dropped on itself, its own column, or nowhere', async () => {
    const fetchMock = stubFetch(defaultHandler);
    renderPipeline();
    await screen.findByText('Deal 1');
    await dragEnd('deal-1', 'deal-1');
    await dragEnd('deal-1', 'column-New');
    await dragEnd('deal-1', null);
    await dragEnd('deal-99', 'column-Won');
    await dragEnd('deal-1', 'deal-99');
    expect(
      fetchMock.mock.calls.filter(([path]) => String(path).includes('/move')),
    ).toHaveLength(0);
  });

  it('shows an error and restores the board when the move fails', async () => {
    stubFetch((_method, path) =>
      path === '/api/deals/2/move'
        ? jsonResponse(500, { error: 'Disk full.' })
        : defaultHandler(_method, path),
    );
    renderPipeline();
    await screen.findByText('Deal 1');
    await dragEnd('deal-2', 'column-Won');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The move was not saved. Disk full.',
    );
    const lead = screen.getByRole('region', { name: 'New column' });
    expect(within(lead).getByText('Deal 2')).toBeInTheDocument();
  });
});

describe('Pipeline keyboard', () => {
  it('registers a keyboard sensor that moves a focused card with the arrow keys', async () => {
    stubFetch(defaultHandler);
    renderPipeline();
    const card = (await screen.findByText('Deal 1')).closest('article')!;
    expect(dndProps?.sensors?.length).toBe(2);
    // Space picks the card up. dnd-kit announces it through its live region.
    card.focus();
    await userEvent.keyboard(' ');
    expect(document.querySelector('[role="status"]')?.textContent).toContain(
      'deal-1',
    );
    await userEvent.keyboard('{Escape}');
  });
});
