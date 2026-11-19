import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Organization } from '../api/types';
import { useResource } from '../api/useResource';
import { DataTable } from '../components/DataTable';
import { DeleteDialog } from '../components/DeleteDialog';
import { FormDialog, type FieldSpec } from '../components/FormDialog';
import { PageHeader } from '../components/PageHeader';

const FIELDS: FieldSpec[] = [
  { name: 'name', label: 'Name', kind: 'text', required: true },
  { name: 'website', label: 'Website', kind: 'text' },
  { name: 'industry', label: 'Industry', kind: 'text' },
  { name: 'notes', label: 'Notes', kind: 'textarea' },
];

type Editing = Organization | 'new' | null;

function toInitial(org: Organization | null): Record<string, string> {
  return {
    name: org?.name ?? '',
    website: org?.website ?? '',
    industry: org?.industry ?? '',
    notes: org?.notes ?? '',
  };
}

function toBody(values: Record<string, string>) {
  const clean = (value: string) => (value.trim() === '' ? null : value.trim());
  return {
    name: values.name.trim(),
    website: clean(values.website),
    industry: clean(values.industry),
    notes: clean(values.notes),
  };
}

export default function Organizations() {
  const orgs = useResource<Organization[]>('/api/organizations');
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Organization | null>(null);

  const columns = useMemo<ColumnDef<Organization, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: (c) => (
          <Link to={`/organizations/${c.row.original.id}`}>
            {c.getValue() as string}
          </Link>
        ),
      },
      {
        accessorKey: 'industry',
        header: 'Industry',
        cell: (c) => c.getValue() ?? '',
      },
      {
        accessorKey: 'website',
        header: 'Website',
        cell: (c) => c.getValue() ?? '',
      },
      { accessorKey: 'contact_count', header: 'Contacts' },
      { accessorKey: 'deal_count', header: 'Deals' },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: (c) => (
          <div className="row-actions">
            <button
              type="button"
              className="link-button"
              onClick={() => setEditing(c.row.original)}
            >
              Edit
            </button>
            <button
              type="button"
              className="link-button danger-text"
              onClick={() => setDeleting(c.row.original)}
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Organizations"
        subtitle="The companies we do business with."
      />
      {orgs.error && (
        <p className="form-error" role="alert">
          {orgs.error}
        </p>
      )}
      {orgs.data && (
        <DataTable
          label="Organizations"
          searchLabel="Search organizations"
          data={orgs.data}
          columns={columns}
          emptyText="No organizations yet."
          toolbar={
            <button
              type="button"
              className="button primary"
              onClick={() => setEditing('new')}
            >
              Add organization
            </button>
          }
        />
      )}
      {editing && (
        <FormDialog
          title={editing === 'new' ? 'Add organization' : 'Edit organization'}
          fields={FIELDS}
          initial={toInitial(editing === 'new' ? null : editing)}
          submitLabel={editing === 'new' ? 'Add' : 'Save'}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            const body = toBody(values);
            if (editing === 'new')
              await api('POST', '/api/organizations', body);
            else await api('PATCH', `/api/organizations/${editing.id}`, body);
            orgs.reload();
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          name={deleting.name}
          kind="organization"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api('DELETE', `/api/organizations/${deleting.id}`);
            orgs.reload();
          }}
        />
      )}
      {orgs.loading && <p className="empty">Loading…</p>}
    </>
  );
}
