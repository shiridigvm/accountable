import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./App', () => ({ default: () => <p>App is mounted</p> }));
vi.mock('./fonts', () => ({}));

describe('main', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts the app inside the router on the root element', async () => {
    await import('./main');
    await vi.waitFor(() =>
      expect(document.getElementById('root')).toHaveTextContent(
        'App is mounted',
      ),
    );
  });
});
