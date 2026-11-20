import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { Deal, TimelineEntry } from '../api/types';
import { useResource } from '../api/useResource';
import { ActivityDialog } from '../components/ActivityDialog';
import { DeleteDialog } from '../components/DeleteDialog';
import { AddedBy } from '../components/AddedBy';
import { PageHeader } from '../components/PageHeader';
import { Timeline } from '../components/Timeline';
import { formatDate, formatMoney, formatPercent } from '../lib/format';
import { STAGE_COLORS } from '../lib/stages';

export default function DealDetail() {
  const { id } = useParams();
  const dealId = Number(id);
  const deal = useResource<Deal>(`/api/deals/${dealId}`);
  const timeline = useResource<TimelineEntry[]>(
    `/api/deals/${dealId}/timeline`,
  );
  const [logging, setLogging] = useState(false);
  const [editing, setEditing] = useState<TimelineEntry | null>(null);
  const [deleting, setDeleting] = useState<TimelineEntry | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (deal.error)
    return (
      <p className="form-error" role="alert">
        {deal.error}
      </p>
    );
  if (!deal.data) return <p className="empty">Loading…</p>;
  const d = deal.data;

  async function markDone(entry: TimelineEntry) {
    try {
      await api('PATCH', `/api/activities/${entry.id}`, { done: true });
      timeline.reload();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }

  return (
    <>
      <PageHeader
        title={d.name}
        subtitle={`${d.stage} · ${formatMoney(d.value_cents)}`}
      />
      <section className="panel summary">
        <dl className="facts">
          <div>
            <dt>Stage</dt>
            <dd>
              <i
                className="dot"
                style={{ background: STAGE_COLORS[d.stage] }}
              />{' '}
              {d.stage}
            </dd>
          </div>
          <div>
            <dt>Probability</dt>
            <dd>{formatPercent(d.probability)}</dd>
          </div>
          <div>
            <dt>Expected revenue</dt>
            <dd>{formatMoney(d.expected_cents)}</dd>
          </div>
          <div>
            <dt>Expected close</dt>
            <dd className={d.late ? 'late-text' : ''}>
              {formatDate(d.expected_close)}
              {d.late && <span className="tag">Late</span>}
            </dd>
          </div>
          <div>
            <dt>Actual close</dt>
            <dd>{formatDate(d.actual_close) || '—'}</dd>
          </div>
          <div>
            <dt>Organization</dt>
            <dd>
              {d.organization_id ? (
                <Link to={`/organizations/${d.organization_id}`}>
                  {d.organization_name}
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt>Main contact</dt>
            <dd>
              {d.main_contact_id ? (
                <Link to={`/contacts/${d.main_contact_id}`}>
                  {d.main_contact_name}
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
        <AddedBy createdBy={d.created_by} updatedBy={d.updated_by} />
      </section>
      <div className="detail-grid">
        <section className="panel">
          <div className="section-head">
            <h2 className="section-title">Log activity</h2>
            <button
              type="button"
              className="button primary"
              onClick={() => setLogging(true)}
            >
              Log activity
            </button>
          </div>
          <p className="muted">Notes, calls and emails about this deal.</p>
        </section>
        <section className="panel">
          <h2 className="section-title">Timeline</h2>
          {actionError && (
            <p className="form-error" role="alert">
              {actionError}
            </p>
          )}
          {timeline.error ? (
            <p className="form-error" role="alert">
              {timeline.error}
            </p>
          ) : (
            <Timeline
              entries={timeline.data ?? []}
              onMarkDone={markDone}
              onEdit={setEditing}
              onDelete={setDeleting}
            />
          )}
        </section>
      </div>
      {(logging || editing) && (
        <ActivityDialog
          target={{ dealId }}
          entry={editing}
          onClose={() => {
            setLogging(false);
            setEditing(null);
          }}
          onSaved={() => {
            setLogging(false);
            setEditing(null);
            timeline.reload();
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          name="this activity"
          kind="activity"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api('DELETE', `/api/activities/${deleting.id}`);
            timeline.reload();
          }}
        />
      )}
    </>
  );
}
