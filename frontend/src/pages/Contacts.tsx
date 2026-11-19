import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Contact, Organization } from '../api/types';
import { useResource } from '../api/useResource';
import { DataTable } from '../components/DataTable';
import { DeleteDialog } from '../components/DeleteDialog';
import { FormDialog, type FieldSpec } from '../components/FormDialog';
import { PageHeader } from '../components/PageHeader';
import { CONTACT_STATUSES, type ContactStatus } from '../lib/stages';

type Filter = 'all' | ContactStatus;
type Editing = Contact | 'new' | null;

const STATUS_LABELS: Record<ContactStatus, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  customer: 'Customer',
};

function fieldsFor(orgs: Organization[]): FieldSpec[] {
  return [
    { name: 'name', label: 'Name', kind: 'text', required: true },
    { name: 'email', label: 'Email', kind: 'email' },
    { name: 'phone', label: 'Phone', kind: 'text' },
    { name: 'job_title', label: 'Job title', kind: 'text' },
    {
      name: 'status',
      label: 'Status',
      kind: 'select',
      required: true,
      options: CONTACT_STATUSES.map((s) => ({
        value: s,
        label: STATUS_LABELS[s],
      })),
    },
    {
      name: 'organization_id',
      label: 'Organization',
      kind: 'select',
      options: [
        { value: '', label: 'None' },
        ...orgs.map((o) => ({ value: String(o.id), label: o.name })),
      ],
    },
  ];
}

function toInitial(contact: Contact | null): Record<string, string> {
  return {
    name: contact?.name ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    job_title: contact?.job_title ?? '',
    status: contact?.status ?? 'lead',
    organization_id: contact?.organization_id
      ? String(contact.organization_id)
      : '',
  };
}

function toBody(values: Record<string, string>) {
  const clean = (value: string) => (value.trim() === '' ? null : value.trim());
  return {
    name: values.name.trim(),
    email: clean(values.email),
    phone: clean(values.phone),
    job_title: clean(values.job_title),
    status: values.status,
    organization_id: values.organization_id
      ? Number(values.organization_id)
      : null,
  };
}

export default function Contacts() {
  const [filter, setFilter] = useState<Filter>('all');
  const path =
    filter === 'all' ? '/api/contacts' : `/api/contacts?status=${filter}`;
  const contacts = useResource<Contact[]>(path);
  const orgs = useResource<Organization[]>('/api/organizations');
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);

  const columns = useMemo<ColumnDef<Contact, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: (c) => (
          <Link to={`/contacts/${c.row.original.id}`}>
            {c.getValue() as string}
          </Link>
        ),
      },
      {
        accessorKey: 'job_title',
        header: 'Job title',
        cell: (c) => c.getValue() ?? '',
      },
      {
        accessorKey: 'organization_name',
        header: 'Organization',
        cell: (c) => c.getValue() ?? '',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (c) => STATUS_LABELS[c.getValue() as ContactStatus],
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: (c) => c.getValue() ?? '',
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        cell: (c) => c.getValue() ?? '',
      },
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

  const loaded = contacts.data !== undefined && orgs.data !== undefined;

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle="The people we deal with: leads, qualified contacts and customers."
      />
      {contacts.error && (
        <p className="form-error" role="alert">
          {contacts.error}
        </p>
      )}
      {loaded && (
        <DataTable
          label="Contacts"
          searchLabel="Search contacts"
          data={contacts.data ?? []}
          columns={columns}
          emptyText="No contacts match this filter."
          toolbar={
            <>
              <label className="filter">
                Status
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as Filter)}
                >
                  <option value="all">All</option>
                  {CONTACT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button primary"
                onClick={() => setEditing('new')}
              >
                Add contact
              </button>
            </>
          }
        />
      )}
      {editing && orgs.data && (
        <FormDialog
          title={editing === 'new' ? 'Add contact' : 'Edit contact'}
          fields={fieldsFor(orgs.data)}
          initial={toInitial(editing === 'new' ? null : editing)}
          submitLabel={editing === 'new' ? 'Add' : 'Save'}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            const body = toBody(values);
            if (editing === 'new') await api('POST', '/api/contacts', body);
            else await api('PATCH', `/api/contacts/${editing.id}`, body);
            contacts.reload();
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          name={deleting.name}
          kind="contact"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api('DELETE', `/api/contacts/${deleting.id}`);
            contacts.reload();
          }}
        />
      )}
      {(contacts.loading || orgs.loading) && <p className="empty">Loading…</p>}
    </>
  );
}
