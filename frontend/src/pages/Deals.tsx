import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Contact, Deal, Organization } from '../api/types';
import { useResource } from '../api/useResource';
import { DataTable } from '../components/DataTable';
import { DeleteDialog } from '../components/DeleteDialog';
import { FormDialog, type FieldSpec } from '../components/FormDialog';
import { PageHeader } from '../components/PageHeader';
import { formatDate, formatMoney, formatPercent } from '../lib/format';
import { STAGE_COLORS, STAGES } from '../lib/stages';

type Editing = Deal | 'new' | null;

export function fieldsFor(orgs: Organization[], contacts: Contact[]): FieldSpec[] {
  return [
    { name: 'name', label: 'Name', kind: 'text', required: true },
    { name: 'stage', label: 'Stage', kind: 'select', required: true, options: STAGES.map((s) => ({ value: s, label: s })) },
    { name: 'value', label: 'Value (US dollars)', kind: 'number', required: true, min: 0, step: 0.01 },
    {
      name: 'probability',
      label: 'Probability of close (%)',
      kind: 'number',
      min: 0,
      max: 100,
      step: 1,
      hint: 'Leave empty to use the stage’s usual probability.',
    },
    { name: 'expected_close', label: 'Expected close date', kind: 'date', required: true },
    { name: 'actual_close', label: 'Actual close date', kind: 'date' },
    {
      name: 'organization_id',
      label: 'Organization',
      kind: 'select',
      options: [{ value: '', label: 'None' }, ...orgs.map((o) => ({ value: String(o.id), label: o.name }))],
    },
    {
      name: 'main_contact_id',
      label: 'Main contact',
      kind: 'select',
      options: [{ value: '', label: 'None' }, ...contacts.map((c) => ({ value: String(c.id), label: c.name }))],
    },
  ];
}

export function toInitial(deal: Deal | null): Record<string, string> {
  return {
    name: deal?.name ?? '',
    stage: deal?.stage ?? 'New',
    value: deal ? String(deal.value_cents / 100) : '',
    probability: deal ? String(deal.probability) : '',
    expected_close: deal?.expected_close ?? '',
    actual_close: deal?.actual_close ?? '',
    organization_id: deal?.organization_id ? String(deal.organization_id) : '',
    main_contact_id: deal?.main_contact_id ? String(deal.main_contact_id) : '',
  };
}

// Money goes to the API in cents, so the dollar input is converted here.
export function toBody(values: Record<string, string>) {
  const optionalNumber = (value: string) => (value.trim() === '' ? null : Number(value));
  const optionalDate = (value: string) => (value.trim() === '' ? null : value);
  const optionalId = (value: string) => (value === '' ? null : Number(value));
  return {
    name: values.name.trim(),
    stage: values.stage,
    value_cents: Math.round(Number(values.value) * 100),
    probability: optionalNumber(values.probability),
    expected_close: values.expected_close,
    actual_close: optionalDate(values.actual_close),
    organization_id: optionalId(values.organization_id),
    main_contact_id: optionalId(values.main_contact_id),
  };
}

export default function Deals() {
  const deals = useResource<Deal[]>('/api/deals');
  const orgs = useResource<Organization[]>('/api/organizations');
  const contacts = useResource<Contact[]>('/api/contacts');
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Deal | null>(null);

  const columns = useMemo<ColumnDef<Deal, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: (c) => (
          <span>
            <Link to={`/deals/${c.row.original.id}`}>{c.getValue() as string}</Link>
            {c.row.original.late && <span className="tag late">Late</span>}
          </span>
        ),
      },
      {
        accessorKey: 'stage',
        header: 'Stage',
        cell: (c) => (
          <span className="stage">
            <i style={{ background: STAGE_COLORS[c.getValue() as keyof typeof STAGE_COLORS] }} />
            {c.getValue() as string}
          </span>
        ),
      },
      { accessorKey: 'organization_name', header: 'Organization', cell: (c) => c.getValue() ?? '' },
      { accessorKey: 'value_cents', header: 'Value', cell: (c) => formatMoney(c.getValue() as number) },
      { accessorKey: 'probability', header: 'Probability', cell: (c) => formatPercent(c.getValue() as number) },
      {
        accessorKey: 'expected_close',
        header: 'Expected close',
        cell: (c) => <span className={c.row.original.late ? 'late-text' : ''}>{formatDate(c.getValue() as string)}</span>,
      },
      { accessorKey: 'actual_close', header: 'Actual close', cell: (c) => formatDate(c.getValue() as string | null) },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: (c) => (
          <div className="row-actions">
            <button type="button" className="link-button" onClick={() => setEditing(c.row.original)}>
              Edit
            </button>
            <button type="button" className="link-button danger-text" onClick={() => setDeleting(c.row.original)}>
              Delete
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const loaded = deals.data !== undefined && orgs.data !== undefined && contacts.data !== undefined;

  return (
    <>
      <PageHeader title="Deals" subtitle="Potential sales, with their stage, value and close date." />
      {deals.error && <p className="form-error" role="alert">{deals.error}</p>}
      {loaded && (
        <DataTable
          label="Deals"
          searchLabel="Search deals"
          data={deals.data ?? []}
          columns={columns}
          emptyText="No deals yet."
          toolbar={
            <button type="button" className="button primary" onClick={() => setEditing('new')}>
              Add deal
            </button>
          }
        />
      )}
      {editing && orgs.data && contacts.data && (
        <FormDialog
          title={editing === 'new' ? 'Add deal' : 'Edit deal'}
          fields={fieldsFor(orgs.data, contacts.data)}
          initial={toInitial(editing === 'new' ? null : editing)}
          submitLabel={editing === 'new' ? 'Add' : 'Save'}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            const body = toBody(values);
            if (editing === 'new') await api('POST', '/api/deals', body);
            else await api('PATCH', `/api/deals/${editing.id}`, body);
            deals.reload();
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          name={deleting.name}
          kind="deal"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api('DELETE', `/api/deals/${deleting.id}`);
            deals.reload();
          }}
        />
      )}
      {(deals.loading || orgs.loading || contacts.loading) && <p className="empty">Loading…</p>}
    </>
  );
}
