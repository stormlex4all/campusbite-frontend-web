import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Load data when the screen opens (and again when `deps` change).
 * Returns { data, error, loading, reload }. Stale responses are ignored.
 */
export default function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const latest = useRef(0);

  const run = useCallback(() => {
    const id = ++latest.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(fn)
      .then(
        (data) => id === latest.current && setState({ data, error: null, loading: false }),
        (error) => id === latest.current && setState({ data: null, error, loading: false }),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    return () => {
      latest.current += 1;
    };
  }, [run]);

  return { ...state, reload: run };
}
