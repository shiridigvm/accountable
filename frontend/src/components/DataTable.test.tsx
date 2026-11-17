import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ColumnDef } from '@tanstack/react-table';
import { describe, expect, it } from 'vitest';
import { DataTable } from './DataTable';

type Row = { name: string; value: number };
const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'value', header: 'Value' },
];
const data: Row[] = [
  { name: 'Beta', value: 20 },
  { name: 'Alpha', value: 10 },
  { name: 'Gamma', value: 30 },
];

function namesInOrder() {
  const rows = within(screen.getByRole('table', { name: 'Things' })).getAllByRole('row').slice(1);
  return rows.map((row) => within(row).getAllByRole('cell')[0].textContent);
}

describe('DataTable', () => {
  it('filters rows with the search box', async () => {
    render(<DataTable label="Things" searchLabel="Search things" data={data} columns={columns} emptyText="None" />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search things' }), 'alp');
    expect(namesInOrder()).toEqual(['Alpha']);
  });

  it('sorts by a column when its heading is clicked, and back again', async () => {
    render(<DataTable label="Things" searchLabel="Search things" data={data} columns={columns} emptyText="None" />);
    await userEvent.click(screen.getByRole('button', { name: /Name/ }));
    expect(namesInOrder()).toEqual(['Alpha', 'Beta', 'Gamma']);
    await userEvent.click(screen.getByRole('button', { name: /Name/ }));
    expect(namesInOrder()).toEqual(['Gamma', 'Beta', 'Alpha']);
  });

  it('shows the empty message when there are no records', () => {
    render(<DataTable label="Things" searchLabel="Search things" data={[]} columns={columns} emptyText="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('says so when a search matches nothing', async () => {
    render(<DataTable label="Things" searchLabel="Search things" data={data} columns={columns} emptyText="None" />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search things' }), 'zzz');
    expect(screen.getByText('No matches for this search.')).toBeInTheDocument();
  });
});
