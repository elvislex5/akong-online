import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import {
  DEFAULT_SEED_COLOR,
  SEED_COLORS,
  type SeedColorConfig,
  type SeedColorId,
} from '../config/seedColors';

/**
 * Resolve the active user's preferred seed colour.
 * Falls back to the default ('ezang') when the user is anonymous,
 * the column is missing, or the network call fails.
 *
 * Pattern mirrors useBoardSkin so the props plumbing stays consistent.
 */
export function useSeedColor(userId: string | null): {
  seedColor: SeedColorConfig;
  loading: boolean;
} {
  const [seedColor, setSeedColor] = useState<SeedColorConfig>(DEFAULT_SEED_COLOR);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setSeedColor(DEFAULT_SEED_COLOR);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('selected_seed_color')
          .eq('id', userId)
          .single();

        if (cancelled) return;

        if (error) {
          console.warn('[useSeedColor] Falling back to default:', error.message);
          setSeedColor(DEFAULT_SEED_COLOR);
        } else {
          const id = data?.selected_seed_color as SeedColorId | null | undefined;
          setSeedColor(id && id in SEED_COLORS ? SEED_COLORS[id] : DEFAULT_SEED_COLOR);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useSeedColor] fetch failed:', err);
          setSeedColor(DEFAULT_SEED_COLOR);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { seedColor, loading };
}
