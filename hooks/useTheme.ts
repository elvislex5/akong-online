import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = ThemeMode | 'system';

const STORAGE_KEY = 'songo:theme';

const getSystemMode = (): ThemeMode =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

const getStoredPreference = (): ThemePreference => {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
};

const resolveMode = (pref: ThemePreference): ThemeMode =>
  pref === 'system' ? getSystemMode() : pref;

const applyMode = (mode: ThemeMode) => {
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
};

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => getStoredPreference());
  const [mode, setMode] = useState<ThemeMode>(() => resolveMode(getStoredPreference()));

  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  // Follow system changes when preference is 'system'
  useEffect(() => {
    if (preference !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => setMode(getSystemMode());
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setPreferenceState(next);
    setMode(resolveMode(next));
  }, []);

  const toggle = useCallback(() => {
    setPreference(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setPreference]);

  return { mode, preference, setPreference, toggle };
}

/**
 * Synchronously apply the persisted theme before React mounts.
 * Call this once in index.tsx (or inline in <head>) to avoid a flash.
 */
export function bootstrapTheme() {
  if (typeof document === 'undefined') return;
  applyMode(resolveMode(getStoredPreference()));
}
