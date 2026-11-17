import { api } from '../api/client';
import type { TimelineEntry } from '../api/types';
import { FormDialog, type FieldSpec } from './FormDialog';

type Target = { contactId?: number; dealId?: number };

const FIELDS: FieldSpec[] = [
  {
    name: 'type',
    label: 'Type',
    kind: 'select',
    required: true,
    options: [
      { value: 'note', label: 'Note' },
      { value: 'call', label: 'Call' },
      { value: 'email', label: 'Email' },
    ],
  },
  { name: 'description', label: 'What happened', kind: 'textarea', required: true },
  { name: 'occurred_on', label: 'Date', kind: 'date', required: true },
  { name: 'follow_up_on', label: 'Follow-up date', kind: 'date', hint: 'Optional. Shows on the dashboard until done.' },
];

type Props = {
  target: Target;
  entry: TimelineEntry | null; // null means a new activity
  onClose: () => void;
  onSaved: () => void;
};

function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function ActivityDialog({ target, entry, onClose, onSaved }: Props) {
  const initial = {
    type: entry?.type ?? 'note',
    description: entry?.text ?? '',
    occurred_on: entry?.on ?? todayIso(),
    follow_up_on: entry?.follow_up_on ?? '',
  };
  return (
    <FormDialog
      title={entry ? 'Edit activity' : 'Log activity'}
      fields={FIELDS}
      initial={initial}
      submitLabel={entry ? 'Save' : 'Log'}
      onClose={onClose}
      onSave={async (values) => {
        const body = {
          type: values.type,
          description: values.description.trim(),
          occurred_on: values.occurred_on,
          follow_up_on: values.follow_up_on || null,
        };
        if (entry) {
          await api('PATCH', `/api/activities/${entry.id}`, body);
        } else {
          await api('POST', '/api/activities', {
            ...body,
            contact_id: target.contactId ?? null,
            deal_id: target.dealId ?? null,
          });
        }
        onSaved();
      }}
    />
  );
}
