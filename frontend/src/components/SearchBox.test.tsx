import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchResults } from '../api/search';
import { SearchBox } from './SearchBox';

const searchRecords = vi.fn<(text: string) => Promise<SearchResults>>();

vi.mock('../api/search', () => ({
  searchRecords: (text: string) => searchRecords(text),
}));

const RESULTS: SearchResults = {
  organizations: [{ id: 3, name: 'Kestrel Freight' }],
  contacts: [
    { id: 7, name: 'Kes Patel', organization_name: 'Kestrel Freight' },
    { id: 8, name: 'Kesha Lone', organization_name: null },
  ],
  deals: [{ id: 12, name: 'Kestrel renewal' }],
};

const EMPTY: SearchResults = { organizations: [], contacts: [], deals: [] };

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderBox() {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <SearchBox />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  return screen.getByRole('combobox', { name: 'Search' });
}

beforeEach(() => {
  searchRecords.mockReset();
  searchRecords.mockResolvedValue(RESULTS);
});

describe('SearchBox', () => {
  it('has the placeholder from the spec', () => {
    expect(renderBox()).toHaveAttribute(
      'placeholder',
      'Search organizations, contacts and deals',
    );
  });

  it('sends no request for empty or blank text (R53)', async () => {
    const box = renderBox();
    await userEvent.type(box, '   ');
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(searchRecords).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('groups results and shows a contact organization (R53)', async () => {
    const box = renderBox();
    await userEvent.type(box, ' kes ');
    const list = await screen.findByRole('listbox');
    expect(searchRecords).toHaveBeenLastCalledWith('kes');
    const groups = within(list).getAllByRole('group');
    expect(groups.map((g) => g.getAttribute('aria-labelledby'))).toHaveLength(
      3,
    );
    expect(within(groups[0]).getByText('Organizations')).toBeVisible();
    expect(within(groups[1]).getByText('Contacts')).toBeVisible();
    expect(within(groups[2]).getByText('Deals')).toBeVisible();
    expect(
      within(groups[1]).getByRole('option', { name: /Kes Patel/ }),
    ).toHaveTextContent('Kes Patel Kestrel Freight');
    expect(
      within(groups[1]).getByRole('option', { name: 'Kesha Lone' }),
    ).toBeVisible();
  });

  it('leaves out groups with no results and says No matches when none match', async () => {
    searchRecords.mockResolvedValue({
      ...EMPTY,
      deals: [{ id: 1, name: 'X' }],
    });
    const box = renderBox();
    await userEvent.type(box, 'x');
    const list = await screen.findByRole('listbox');
    expect(within(list).getAllByRole('group')).toHaveLength(1);

    searchRecords.mockResolvedValue(EMPTY);
    await userEvent.type(box, 'yz');
    expect(await screen.findByRole('status')).toHaveTextContent('No matches');
  });

  it('moves with the arrow keys and opens the selected result with Enter (R54)', async () => {
    const box = renderBox();
    await userEvent.type(box, 'kes');
    await screen.findByRole('listbox');
    expect(
      screen.getByRole('option', { name: 'Kestrel Freight' }),
    ).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowUp}');
    const selected = screen.getByRole('option', { name: 'Kesha Lone' });
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(box).toHaveAttribute('aria-activedescendant', selected.id);
    await userEvent.keyboard('{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent('/contacts/8');
    expect(box).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('wraps from the first result to the last with Up', async () => {
    const box = renderBox();
    await userEvent.type(box, 'kes');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{ArrowUp}');
    expect(
      screen.getByRole('option', { name: 'Kestrel renewal' }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('opens a result with a click', async () => {
    const box = renderBox();
    await userEvent.type(box, 'kes');
    await userEvent.click(
      await screen.findByRole('option', { name: 'Kestrel renewal' }),
    );
    expect(screen.getByTestId('where')).toHaveTextContent('/deals/12');
  });

  it('closes the list with Escape and keeps the text (R54)', async () => {
    const box = renderBox();
    await userEvent.type(box, 'kes');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(box).toHaveValue('kes');
    expect(box).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows an error from the server', async () => {
    searchRecords.mockRejectedValue(
      new Error("Can't reach the sign-in service."),
    );
    const box = renderBox();
    await userEvent.type(box, 'kes');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Can't reach the sign-in service.",
    );
  });
});
