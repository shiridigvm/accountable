import { Link, useParams } from 'react-router-dom';
import { errorMessage } from '../api/client';
import type { Contact, Deal, Organization, TimelineEntry } from '../api/types';
import { useResource } from '../api/useResource';
import { Timeline } from '../components/Timeline';
import { PageHeader } from '../components/PageHeader';
import { formatMoney } from '../lib/format';
import { STAGE_COLORS } from '../lib/stages';

export default function OrganizationDetail() {
  const { id } = useParams();
  const orgId = Number(id);
  const org = useResource<Organization>(`/api/organizations/${orgId}`);
  const timeline = useResource<TimelineEntry[]>(`/api/organizations/${orgId}/timeline`);
  const contacts = useResource<Contact[]>(`/api/contacts`);
  const deals = useResource<Deal[]>(`/api/deals`);

  if (org.error) return <p className="form-error" role="alert">{org.error}</p>;
  if (!org.data) return <p className="empty">Loading…</p>;

  const orgContacts = (contacts.data ?? []).filter((c) => c.organization_id === orgId);
  const orgDeals = (deals.data ?? []).filter((d) => d.organization_id === orgId);

  return (
    <>
      <PageHeader title={org.data.name} subtitle={[org.data.industry, org.data.website].filter(Boolean).join(' · ') || undefined} />
      <section className="panel summary">
        <p>{org.data.notes || 'No notes.'}</p>
        <p className="muted">
          {org.data.contact_count} contacts · {org.data.deal_count} deals
        </p>
      </section>
      <div className="detail-grid">
        <div className="stack">
          <section className="panel">
            <h2 className="section-title">Contacts</h2>
            {orgContacts.length === 0 ? (
              <p className="empty">No contacts.</p>
            ) : (
              <ul className="plain-list">
                {orgContacts.map((c) => (
                  <li key={c.id}>
                    <Link to={`/contacts/${c.id}`}>{c.name}</Link> <span className="muted">{c.job_title}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="panel">
            <h2 className="section-title">Deals</h2>
            {orgDeals.length === 0 ? (
              <p className="empty">No deals.</p>
            ) : (
              <ul className="plain-list">
                {orgDeals.map((d) => (
                  <li key={d.id}>
                    <i className="dot" style={{ background: STAGE_COLORS[d.stage] }} />
                    <Link to={`/deals/${d.id}`}>{d.name}</Link> <span className="muted">{d.stage} · {formatMoney(d.value_cents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <section className="panel">
          <h2 className="section-title">Timeline</h2>
          {timeline.error ? (
            <p className="form-error" role="alert">{errorMessage(timeline.error)}</p>
          ) : (
            <Timeline entries={timeline.data ?? []} />
          )}
        </section>
      </div>
    </>
  );
}
