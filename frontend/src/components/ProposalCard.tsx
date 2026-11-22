import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import type { Proposal } from '../api/copilot';
import { notifyDataChanged } from '../api/useResource';
import {
  fieldLabel,
  formatField,
  proposalRequest,
  proposalTitle,
  savedLink,
  type SavedRecord,
} from '../lib/proposal';

type Outcome =
  | { state: 'open' | 'saving' | 'cancelled' }
  | { state: 'saved'; link: { path: string; name: string } | null }
  | { state: 'failed'; message: string };

// A change the Copilot proposes (R64 to R66). Nothing is saved until Confirm,
// which sends the same request the app's forms send. A card answers once.
export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const [outcome, setOutcome] = useState<Outcome>({ state: 'open' });
  const title = proposalTitle(proposal);
  const answered = outcome.state !== 'open';

  async function confirm() {
    setOutcome({ state: 'saving' });
    const { method, path } = proposalRequest(proposal);
    try {
      const saved = await api<SavedRecord>(method, path, proposal.fields);
      setOutcome({ state: 'saved', link: savedLink(proposal.kind, saved) });
      notifyDataChanged();
    } catch (error) {
      setOutcome({ state: 'failed', message: errorMessage(error) });
    }
  }

  return (
    <section className="proposal" aria-label={title}>
      <p className="proposal-title">
        {title}
        {proposal.name && (
          <span className="proposal-name">{proposal.name}</span>
        )}
      </p>
      <dl className="proposal-fields">
        {Object.entries(proposal.fields).map(([field, value]) => (
          <div key={field}>
            <dt>{fieldLabel(field)}</dt>
            <dd>
              {proposal.current && (
                <>
                  <span className="proposal-current">
                    {formatField(field, proposal.current[field] ?? null)}
                  </span>
                  <span aria-hidden="true"> → </span>
                  <span className="sr-only"> changes to </span>
                </>
              )}
              {formatField(field, value)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="proposal-actions">
        <button
          type="button"
          className="button primary"
          disabled={answered}
          onClick={() => void confirm()}
        >
          Confirm
        </button>
        <button
          type="button"
          className="link-button proposal-cancel"
          disabled={answered}
          onClick={() => setOutcome({ state: 'cancelled' })}
        >
          Cancel
        </button>
      </div>
      <OutcomeLine outcome={outcome} />
    </section>
  );
}

function OutcomeLine({ outcome }: { outcome: Outcome }) {
  if (outcome.state === 'open' || outcome.state === 'saving') return null;
  if (outcome.state === 'saved')
    return (
      <p className="proposal-outcome" role="status">
        Saved.{' '}
        {outcome.link && (
          <Link to={outcome.link.path}>{outcome.link.name}</Link>
        )}
      </p>
    );
  if (outcome.state === 'failed')
    return (
      <p className="proposal-outcome danger-text" role="alert">
        {outcome.message}
      </p>
    );
  return (
    <p className="proposal-outcome muted" role="status">
      Cancelled
    </p>
  );
}
