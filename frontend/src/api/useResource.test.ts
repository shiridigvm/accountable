import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';
import { notifyDataChanged, useResource } from './useResource';

vi.mock('./client', () => ({
  api: vi.fn(),
  errorMessage: (error: unknown) => String(error),
}));

const apiMock = vi.mocked(api);

describe('useResource', () => {
  afterEach(() => {
    apiMock.mockReset();
  });

  it('loads again when notifyDataChanged is called', async () => {
    apiMock.mockResolvedValueOnce('first').mockResolvedValueOnce('second');
    const { result } = renderHook(() => useResource<string>('/api/deals'));
    await waitFor(() => expect(result.current.data).toBe('first'));

    act(() => notifyDataChanged());

    await waitFor(() => expect(result.current.data).toBe('second'));
    expect(apiMock).toHaveBeenCalledTimes(2);
    expect(apiMock).toHaveBeenLastCalledWith('GET', '/api/deals');
  });

  it('stops listening once unmounted', async () => {
    apiMock.mockResolvedValue('data');
    const { unmount } = renderHook(() => useResource<string>('/api/deals'));
    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1));
    unmount();
    act(() => notifyDataChanged());
    expect(apiMock).toHaveBeenCalledTimes(1);
  });
});
