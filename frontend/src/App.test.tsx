import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

describe('App shell', () => {
  it('opens on the dashboard', () => {
    // The dashboard fetches data. No server runs in unit tests, so stub fetch with a pending request.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveClass(
      'active',
    );
    vi.unstubAllGlobals();
  });
});
