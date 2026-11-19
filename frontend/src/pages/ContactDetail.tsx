import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { Contact, TimelineEntry } from '../api/types';
import { useResource } from '../api/useResource';
import { ActivityDialog } from '../components/ActivityDialog';
import { DeleteDialog } from '../components/DeleteDialog';
import { PageHeader } from '../components/PageHeader';
import { Timeline } from '../components/Timeline';
import { STATUS_LABELS } from '../lib/labels';

export default function ContactDetail() {
  const { id } = useParams();
  const contactId = Number(id);
  const contact = useResource<Contact>(`/api/contacts/${contactId}`);
  const timeline = useResource<TimelineEntry[]>(
    `/api/contacts/${contactId}/timeline`,
  );
  const [logging, setLogging] = useState(false);
  const [editing, setEditing] = useState<TimelineEntry | null>(null);
  const [deleting, setDeleting] = useState<TimelineEntry | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (contact.error)
    return (
      <p className="form-error" role="alert">
        {contact.error}
      </p>
    );
  if (!contact.data) return <p className="empty">Loading…</p>;
  const c = contact.data;

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
        title={c.name}
        subtitle={[c.job_title, STATUS_LABELS[c.status]]
          .filter(Boolean)
          .join(' · ')}
      />
      <section className="panel summary">
        <p>
          {c.organization_id ? (
            <Link to={`/organizations/${c.organization_id}`}>
              {c.organization_name}
            </Link>
          ) : (
            'No organization'
          )}
        </p>
        <p className="muted">
          {[c.email, c.phone].filter(Boolean).join(' · ') ||
            'No email or phone.'}
        </p>
      </section>
      <div className="detail-grid">
        <section className="panel">
          <div className="section-head">
            <h2 className="section-title">Activity</h2>
            <button
              type="button"
              className="button primary"
              onClick={() => setLogging(true)}
            >
              Log activity
            </button>
          </div>
          <p className="muted">
            Notes, calls and emails. A follow-up date puts it on the dashboard.
          </p>
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
          target={{ contactId }}
          entry={editing}
          onClose={() => {
            setLogging(false);
            setEditing(null);
          }}
          onSaved={() => timeline.reload()}
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
