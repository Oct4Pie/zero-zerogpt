import { useState, useEffect } from 'react';

const STORAGE_PREFIX = 'zero-zerogpt:';

export function usePersistedState(key, initialValue) {
  const storageKey = STORAGE_PREFIX + key;

  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === null) return initialValue;
      return JSON.parse(raw);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // quota exceeded or storage disabled — non-fatal
    }
  }, [storageKey, value]);

  return [value, setValue];
}
