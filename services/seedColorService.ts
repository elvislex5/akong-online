import { supabase } from './supabase';
import type { SeedColorId } from '../config/seedColors';

/**
 * Persist a user's seed colour choice to their profile.
 * Throws if the underlying CHECK constraint rejects the value.
 */
export async function selectSeedColor(userId: string, colorId: SeedColorId): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ selected_seed_color: colorId })
    .eq('id', userId);

  if (error) {
    console.error('[seedColorService] Error updating seed color:', error);
    throw new Error(`Impossible de mettre à jour la couleur des graines : ${error.message}`);
  }
}
