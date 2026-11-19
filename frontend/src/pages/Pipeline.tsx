import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  KeyboardSensor,
  type KeyboardCoordinateGetter,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api, errorMessage } from '../api/client';
import type {
  Board,
  BoardColumn,
  BoardDeal,
  Contact,
  Organization,
} from '../api/types';
import { useResource } from '../api/useResource';
import { FormDialog } from '../components/FormDialog';
import { moveDealLocally, findColumn } from '../lib/board';
import { formatDate, formatMoney, formatPercent } from '../lib/format';
import { STAGE_COLORS, type Stage } from '../lib/stages';
import { fieldsFor, toBody, toInitial } from './Deals';

// Keyboard moves: up and down move one card place, left and right move to the next column.
// The step is the card size plus the gap between cards and columns.
const keyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { currentCoordinates, context },
) => {
  const rect = context.collisionRect;
  if (!rect) return undefined;
  const down = rect.height + 8;
  const across = rect.width + 36;
  switch (event.code) {
    case 'ArrowDown':
      return { x: currentCoordinates.x, y: currentCoordinates.y + down };
    case 'ArrowUp':
      return { x: currentCoordinates.x, y: currentCoordinates.y - down };
    case 'ArrowLeft':
      return { x: currentCoordinates.x - across, y: currentCoordinates.y };
    case 'ArrowRight':
      return { x: currentCoordinates.x + across, y: currentCoordinates.y };
    default:
      return undefined;
  }
};

// Cards and columns are dnd-kit items. Card ids carry the deal id, column ids carry the stage.
const cardId = (dealId: number) => `deal-${dealId}`;
const columnId = (stage: Stage) => `column-${stage}`;

export default function Pipeline() {
  const serverBoard = useResource<Board>('/api/pipeline');
  const orgs = useResource<Organization[]>('/api/organizations');
  const contacts = useResource<Contact[]>('/api/contacts');
  // While a move is saved, the board shows the local result. The server's answer replaces it.
  const [local, setLocal] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingIn, setAddingIn] = useState<Stage | null>(null);

  const board = local ?? serverBoard.data;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  );

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !board) return;
    const dealId = Number(String(active.id).replace('deal-', ''));
    const source = findColumn(board, dealId);
    if (!source) return;
    const overId = String(over.id);

    let stage: Stage;
    let position: number;
    if (overId.startsWith('column-')) {
      stage = overId.slice('column-'.length) as Stage;
      const others = board.columns
        .find((c) => c.stage === stage)!
        .deals.filter((d) => d.id !== dealId);
      position = others.length;
    } else {
      const overDealId = Number(overId.replace('deal-', ''));
      const target = findColumn(board, overDealId);
      if (!target) return;
      stage = target.stage;
      if (target.stage === source.stage) {
        // Within a column the server removes the card, then inserts it at the position, so use the full index.
        position = target.deals.findIndex((d) => d.id === overDealId);
        if (position === source.deals.findIndex((d) => d.id === dealId)) return;
      } else {
        position = target.deals
          .filter((d) => d.id !== dealId)
          .findIndex((d) => d.id === overDealId);
      }
    }
    if (stage === source.stage && overId.startsWith('column-')) return;

    setError(null);
    setLocal(moveDealLocally(board, dealId, stage, position));
    try {
      await api('POST', `/api/deals/${dealId}/move`, { stage, position });
    } catch (failure) {
      setLocal(null);
      setError(`The move was not saved. ${errorMessage(failure)}`);
      return;
    }
    // The move is saved. If the refresh fails, keep the local board, which already shows the move.
    try {
      setLocal(await api<Board>('GET', '/api/pipeline'));
    } catch {
      // Keep the local board until the next successful load.
    }
    serverBoard.reload();
  }

  if (serverBoard.error)
    return (
      <p className="form-error" role="alert">
        {serverBoard.error}
      </p>
    );
  if (!board) return <p className="empty">Loading…</p>;

  return (
    <>
      <div className="pipe-head">
        <div>
          <h1>Pipeline</h1>
          <p className="subtitle">
            Drag a deal to another stage, or within a stage to change its place.
          </p>
        </div>
        <div className="board-totals">
          <span>
            Open value <strong>{formatMoney(board.open_value_cents)}</strong>
          </span>
          <span>
            Expected revenue{' '}
            <strong>{formatMoney(board.open_expected_cents)}</strong>
          </span>
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={onDragEnd}
      >
        <div className="board">
          {board.columns.map((column) => (
            <Column
              key={column.stage}
              column={column}
              onAdd={() => setAddingIn(column.stage)}
            />
          ))}
        </div>
      </DndContext>
      {addingIn && orgs.data && contacts.data && (
        <FormDialog
          title={`Add deal to ${addingIn}`}
          fields={fieldsFor(orgs.data, contacts.data)}
          initial={{ ...toInitial(null), stage: addingIn }}
          submitLabel="Add"
          onClose={() => setAddingIn(null)}
          onSave={async (values) => {
            await api('POST', '/api/deals', toBody(values));
            setLocal(null);
            serverBoard.reload();
          }}
        />
      )}
    </>
  );
}

function Column({ column, onAdd }: { column: BoardColumn; onAdd: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId(column.stage) });
  const isOpen = column.open;
  return (
    <section
      className={`column${isOver ? ' over' : ''}`}
      aria-label={`${column.stage} column`}
    >
      <header className="column-head">
        <div className="column-name">
          <i style={{ background: STAGE_COLORS[column.stage] }} />
          {column.stage}
          <span className="count">{column.count}</span>
        </div>
        <div className="column-totals">
          <div>{formatMoney(column.value_cents)}</div>
          {isOpen && column.expected_cents !== null && (
            <div className="muted">
              {formatMoney(column.expected_cents)} expected
            </div>
          )}
        </div>
      </header>
      <div ref={setNodeRef} className="card-list">
        <SortableContext
          items={column.deals.map((d) => cardId(d.id))}
          strategy={verticalListSortingStrategy}
        >
          {column.deals.map((deal) => (
            <Card key={deal.id} deal={deal} />
          ))}
        </SortableContext>
        {column.deals.length === 0 && (
          <p className="empty small">No deals in {column.stage}.</p>
        )}
      </div>
      <button type="button" className="add-deal" onClick={onAdd}>
        + Add deal
      </button>
    </section>
  );
}

function Card({ deal }: { deal: BoardDeal }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: cardId(deal.id),
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <article
      ref={setNodeRef}
      style={style}
      className="card"
      {...attributes}
      {...listeners}
    >
      <div className="card-name">
        <Link
          to={`/deals/${deal.id}`}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {deal.name}
        </Link>
      </div>
      {deal.organization_name && (
        <div className="muted small">{deal.organization_name}</div>
      )}
      <div className="card-row">
        <span>{formatMoney(deal.value_cents)}</span>
        <span>{formatPercent(deal.probability)}</span>
      </div>
      <div className="card-row">
        <span className={deal.late ? 'late-text' : 'muted'}>
          {formatDate(deal.expected_close)}
        </span>
        {deal.late && <span className="tag">Late</span>}
      </div>
    </article>
  );
}
