import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard';

function jsonResponse(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body };
}

afterEach(() => vi.unstubAllGlobals());

describe('Dashboard', () => {
  it('shows the error when the pipeline fails, instead of loading forever', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string) =>
        Promise.resolve(
          path === '/api/dashboard'
            ? jsonResponse(200, { today: '2026-11-17', stats: {}, monthly: [] })
            : jsonResponse(500, { error: 'Pipeline is unavailable.' }),
        ),
      ),
    );
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Pipeline is unavailable.');
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });
});
