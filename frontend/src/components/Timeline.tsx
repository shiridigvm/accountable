import { formatDate } from '../lib/format';
import type { TimelineEntry } from '../api/types';

type Props = {
  entries: TimelineEntry[];
  onEdit?: (entry: TimelineEntry) => void;
  onDelete?: (entry: TimelineEntry) => void;
  onMarkDone?: (entry: TimelineEntry) => void;
};

const TYPE_LABELS = { note: 'Note', call: 'Call', email: 'Email' } as const;

// Activities and stage changes, newest first (R11). Stage changes are read only.
export function Timeline({ entries, onEdit, onDelete, onMarkDone }: Props) {
  if (entries.length === 0) return <p className="empty">Nothing has happened yet.</p>;
  return (
    <ol className="timeline">
      {entries.map((entry) => (
        <li key={`${entry.kind}-${entry.id}`} className={entry.kind === 'stage_change' ? 'stage-entry' : ''}>
          <div className="timeline-head">
            <span className="timeline-kind">
              {entry.kind === 'stage_change' ? 'Stage' : TYPE_LABELS[entry.type ?? 'note']}
            </span>
            <span className="muted">{formatDate(entry.on)}</span>
            {entry.deal_name && <span className="muted">· {entry.deal_name}</span>}
            {entry.contact_name && <span className="muted">· {entry.contact_name}</span>}
            {entry.kind === 'activity' && entry.follow_up_on && !entry.done && (
              <span className="tag soon">Follow up {formatDate(entry.follow_up_on)}</span>
            )}
            {entry.kind === 'activity' && entry.done && <span className="tag done">Done</span>}
          </div>
          <p className="timeline-text">{entry.text}</p>
          {entry.kind === 'activity' && (
            <div className="row-actions">
              {onMarkDone && !entry.done && entry.follow_up_on && (
                <button type="button" className="link-button" onClick={() => onMarkDone(entry)}>
                  Mark done
                </button>
              )}
              {onEdit && (
                <button type="button" className="link-button" onClick={() => onEdit(entry)}>
                  Edit
                </button>
              )}
              {onDelete && (
                <button type="button" className="link-button danger-text" onClick={() => onDelete(entry)}>
                  Delete
                </button>
              )}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
