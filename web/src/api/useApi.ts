import { useEffect, useState } from 'react';
import { ApiError } from './client';

export type ApiState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | { status: 'success'; data: T };

const toApiError = (error: unknown) =>
  error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', 'Unexpected error');

/** Loads data for a page. Re-runs when `deps` change and ignores responses that arrive late. */
export function useApi<T>(load: () => Promise<T>, deps: unknown[]): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    load().then(
      (data) => active && setState({ status: 'success', data }),
      (error: unknown) => active && setState({ status: 'error', error: toApiError(error) }),
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers pass the inputs `load` depends on
  }, deps);

  return state;
}
