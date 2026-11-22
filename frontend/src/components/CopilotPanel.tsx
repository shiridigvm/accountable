import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../api/client';
import {
  sendChat,
  type ChatMessage,
  type Proposal,
  type RecordRef,
} from '../api/copilot';
import { recordPath } from '../lib/proposal';
import { ProposalCard } from './ProposalCard';
import './CopilotPanel.css';

export const MESSAGE_LIMIT = 2000;
const TOO_LONG = 'Messages can be up to 2,000 characters.';

type Entry =
  | { role: 'user'; content: string }
  | {
      role: 'assistant';
      content: string;
      records: RecordRef[];
      proposal: Proposal | null;
    }
  | { role: 'error'; content: string };

type Props = { id: string; open: boolean; onClose: () => void };

// The Copilot chat panel (R58 to R60, R62, R70, R73). Layout keeps it mounted
// while the person moves between pages, so closing it only hides it and the
// conversation stays until the page is refreshed or the person signs out (R59).
export function CopilotPanel({ id, open, onClose }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    // preventScroll: focusing must not scroll the page and hide the top bar.
    if (open) input.current?.focus({ preventScroll: true });
  }, [open]);

  // Escape anywhere in the panel closes it (R58). A listener, because lint
  // rightly refuses key handlers on a non-interactive element like <aside>.
  useEffect(() => {
    const node = panel.current;
    if (!open || !node) return;
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    }
    node.addEventListener('keydown', onKey);
    return () => node.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function send() {
    const text = draft.trim();
    if (!text || thinking) return;
    if (text.length > MESSAGE_LIMIT) {
      setDraftError(TOO_LONG);
      return;
    }
    setDraftError(null);
    const next: Entry[] = [...entries, { role: 'user', content: text }];
    setEntries(next);
    setDraft('');
    setThinking(true);
    try {
      const reply = await sendChat(toMessages(next));
      setEntries((current) => [
        ...current,
        {
          role: 'assistant',
          content: reply.reply,
          records: reply.records,
          proposal: reply.proposal,
        },
      ]);
    } catch (error) {
      setEntries((current) => [
        ...current,
        { role: 'error', content: errorMessage(error) },
      ]);
    } finally {
      setThinking(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send();
  }

  function onInputKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <aside
      id={id}
      className="copilot"
      aria-labelledby={`${id}-heading`}
      hidden={!open}
      ref={panel}
    >
      <div className="copilot-head">
        <h2 id={`${id}-heading`}>Copilot</h2>
        <button
          type="button"
          className="link-button copilot-close"
          aria-label="Close Copilot"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className="copilot-log" role="log" aria-live="polite">
        {entries.length === 0 && (
          <p className="muted copilot-empty">
            Ask a question or ask for a change. Nothing is saved until you
            confirm.
          </p>
        )}
        {entries.map((entry, index) => (
          <Message key={index} entry={entry} />
        ))}
        {thinking && <p className="muted copilot-thinking">Thinking</p>}
      </div>
      <form className="copilot-form" onSubmit={onSubmit}>
        <textarea
          ref={input}
          aria-label="Message"
          placeholder="Ask about your organizations, contacts and deals"
          rows={3}
          value={draft}
          aria-invalid={draftError ? true : undefined}
          aria-describedby={draftError ? `${id}-draft-error` : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onInputKey}
        />
        {draftError && (
          <p id={`${id}-draft-error`} className="danger-text" role="alert">
            {draftError}
          </p>
        )}
        <button type="submit" className="button primary" disabled={thinking}>
          Send
        </button>
      </form>
    </aside>
  );
}

// Errors stay on screen but are not sent back to the model.
function toMessages(entries: Entry[]): ChatMessage[] {
  return entries.flatMap((entry) =>
    entry.role === 'error'
      ? []
      : [{ role: entry.role, content: entry.content }],
  );
}

// Replies are React text, never HTML, so a reply can't add links or scripts
// (R70). Record links and cards are drawn from data the backend checked.
function Message({ entry }: { entry: Entry }) {
  if (entry.role === 'user')
    return <p className="copilot-message copilot-user">{entry.content}</p>;
  if (entry.role === 'error')
    return (
      <p className="copilot-message copilot-error" role="alert">
        {entry.content}
      </p>
    );
  return (
    <div className="copilot-message copilot-reply">
      <p className="copilot-text">{entry.content}</p>
      {entry.records.length > 0 && (
        <ul className="copilot-records" aria-label="Records used">
          {entry.records.map((record) => (
            <li key={`${record.kind}-${record.id}`}>
              <Link to={recordPath(record.kind, record.id)}>{record.name}</Link>
            </li>
          ))}
        </ul>
      )}
      {entry.proposal && <ProposalCard proposal={entry.proposal} />}
    </div>
  );
}
