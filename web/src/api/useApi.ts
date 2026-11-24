import { useEffect, useState } from 'react';
import { ApiError } from './client';

export type ApiState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | { status: 'success'; data: T };

const toApiError = (error: unknown) =>
  error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', 'Unexpected error');

/**
 * Loads data for a page. Re-runs when `deps` change; while the result for the current deps has not
 * arrived it reports `loading`, and responses for stale deps are ignored.
 */
export function useApi<T>(load: () => Promise<T>, deps: readonly unknown[]): ApiState<T> {
  const key = JSON.stringify(deps);
  const [result, setResult] = useState<{ key: string; state: ApiState<T> }>();

  useEffect(() => {
    let active = true;
    load().then(
      (data) => active && setResult({ key, state: { status: 'success', data } }),
      (error: unknown) => active && setResult({ key, state: { status: 'error', error: toApiError(error) } }),
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the inputs `load` depends on
  }, [key]);

  return result?.key === key ? result.state : { status: 'loading' };
}
