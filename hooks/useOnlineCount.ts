import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { getPresenceCounts, type PresenceCounts } from '../services/presenceService';

/**
 * Live counter of users currently on the platform.
 * Initial value comes from a one-shot fetch; subsequent updates are pushed
 * by Postgres CDC (any insert/update/delete on user_presence triggers a
 * refetch — debounced by the rAF semantics of state updates).
 *
 * Used by the navbar pill that shows "247 en ligne · 18 en partie".
 */
export function useOnlineCount(): PresenceCounts {
  const [counts, setCounts] = useState<PresenceCounts>({ online: 0, inGame: 0, total: 0 });

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const c = await getPresenceCounts();
      if (!cancelled) setCounts(c);
    };
    refresh();

    const channel = supabase
      .channel('presence-counts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        () => { refresh(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return counts;
}
