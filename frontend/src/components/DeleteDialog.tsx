import { useEffect, useRef, useState } from 'react';
import { ApiError, errorMessage } from '../api/client';

const SINGULAR: Record<string, string> = {
  activities: 'activity',
  contacts: 'contact',
  deals: 'deal',
  'deals as main contact': 'deal as main contact',
};

// The server sends plural words. A count of one uses the singular, as the server message does.
function countLabel(key: string, count: number): string {
  return count === 1 ? (SINGULAR[key] ?? key) : key;
}

type Props = {
  name: string;
  kind: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

// Asks before a delete. If the server refuses because records are linked, it lists them and
// offers no delete button (R13, R14).
export function DeleteDialog({ name, kind, onConfirm, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [linked, setLinked] = useState<string[]>([]);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  async function confirm() {
    setBusy(true);
    setFailure(null);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      setBusy(false);
      if (error instanceof ApiError && error.status === 409) {
        setRefusal(error.message);
        setLinked(
          Object.entries(error.linked ?? {}).map(
            ([key, count]) => `${count} ${countLabel(key, count)}`,
          ),
        );
      } else {
        setFailure(errorMessage(error));
      }
    }
  }

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="delete-title"
      onCancel={onClose}
    >
      <div>
        <h2 id="delete-title">
          {refusal ? `This ${kind} cannot be deleted` : `Delete ${name}?`}
        </h2>
        {refusal ? (
          <>
            <p>{refusal}</p>
            {linked.length > 0 && (
              <ul className="linked-list">
                {linked.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p>This removes the {kind} from Accountable. It cannot be undone.</p>
        )}
        {failure && (
          <p className="form-error" role="alert">
            {failure}
          </p>
        )}
        <div className="dialog-actions">
          {refusal ? (
            <button type="button" className="button primary" onClick={onClose}>
              Close
            </button>
          ) : (
            <>
              <button type="button" className="button ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="button danger"
                onClick={confirm}
                disabled={busy}
              >
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
