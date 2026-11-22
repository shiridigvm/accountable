import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from './client';

type State<T> = { data: T | undefined; error: string | null; loading: boolean };

// Every mounted hook's reload, so a change made outside the page (a Copilot
// Confirm) can make the page on screen load its data again.
const reloaders = new Set<() => void>();

export function notifyDataChanged(): void {
  reloaders.forEach((reload) => reload());
}

// Loads one GET request. `reload` fetches again after a change.
export function useResource<T>(path: string) {
  const [state, setState] = useState<State<T>>({
    data: undefined,
    error: null,
    loading: true,
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    api<T>('GET', path)
      .then((data) => {
        if (active) setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (active)
          setState({
            data: undefined,
            error: errorMessage(error),
            loading: false,
          });
      });
    return () => {
      active = false;
    };
  }, [path, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    reloaders.add(reload);
    return () => {
      reloaders.delete(reload);
    };
  }, [reload]);

  return { ...state, reload };
}
