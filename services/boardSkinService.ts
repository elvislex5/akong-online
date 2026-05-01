import { supabase } from './supabase';
import type { PitPosition, GranaryPosition } from '../config/boardSkinConfigs';

export interface BoardSkinCalibration {
  pitPositions: { [pitIndex: string]: PitPosition };
  granaryPositions: {
    playerOne: GranaryPosition;
    playerTwo: GranaryPosition;
  };
}

export interface BoardSkin {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  price: number;
  is_premium: boolean;
  is_active: boolean;
  calibration: BoardSkinCalibration | null;
  created_at: string;
  updated_at: string;
}

export interface UserBoardSkin {
  user_id: string;
  skin_id: string;
  unlocked_at: string;
  skin?: BoardSkin; // Populated via join
}

/**
 * Get all active board skins
 */
export async function getAllBoardSkins(): Promise<BoardSkin[]> {
  const { data, error } = await supabase
    .from('board_skins')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error) {
    console.error('[boardSkinService] Error fetching board skins:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get board skins unlocked by a user
 */
export async function getUserUnlockedSkins(userId: string): Promise<BoardSkin[]> {
  const { data, error } = await supabase
    .from('user_board_skins')
    .select(`
      skin_id,
      board_skins (*)
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('[boardSkinService] Error fetching user skins:', error);
    throw error;
  }

  // Extract the board_skins from the joined data
  return (data || [])
    .map((item: any) => item.board_skins)
    .filter((skin: any) => skin !== null);
}

/**
 * Check if user has unlocked a specific skin
 */
export async function hasUserUnlockedSkin(userId: string, skinId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_board_skins')
    .select('skin_id')
    .eq('user_id', userId)
    .eq('skin_id', skinId)
    .maybeSingle();

  if (error) {
    console.error('[boardSkinService] Error checking skin unlock:', error);
    return false;
  }

  return data !== null;
}

/**
 * Unlock a board skin for a user (using RPC function)
 */
export async function unlockBoardSkin(userId: string, skinId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('unlock_board_skin', {
    p_user_id: userId,
    p_skin_id: skinId,
  });

  if (error) {
    console.error('[boardSkinService] Error unlocking skin:', error);
    throw error;
  }

  return data === true;
}

/**
 * Select a board skin for a user (using RPC function)
 */
export async function selectBoardSkin(userId: string, skinId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('select_board_skin', {
    p_user_id: userId,
    p_skin_id: skinId,
  });

  if (error) {
    console.error('[boardSkinService] Error selecting skin:', error);
    throw error;
  }

  return data === true;
}

/**
 * Get user's currently selected board skin
 */
export async function getUserSelectedSkin(userId: string): Promise<BoardSkin | null> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('selected_board_skin')
    .eq('id', userId)
    .single();

  if (profileError || !profile?.selected_board_skin) {
    return null;
  }

  const { data: skin, error: skinError } = await supabase
    .from('board_skins')
    .select('*')
    .eq('id', profile.selected_board_skin)
    .single();

  if (skinError) {
    console.error('[boardSkinService] Error fetching selected skin:', skinError);
    return null;
  }

  return skin;
}

/**
 * Get all skins with unlock status for a user
 */
export async function getAllSkinsWithUnlockStatus(userId: string): Promise<Array<BoardSkin & { unlocked: boolean }>> {
  const [allSkins, unlockedSkins] = await Promise.all([
    getAllBoardSkins(),
    getUserUnlockedSkins(userId),
  ]);

  const unlockedIds = new Set(unlockedSkins.map(s => s.id));

  return allSkins.map(skin => ({
    ...skin,
    unlocked: unlockedIds.has(skin.id),
  }));
}

// ============================================
// CALIBRATION
// ============================================

// In-memory cache for calibration data (image_url -> calibration)
const calibrationCache: Map<string, BoardSkinCalibration> = new Map();

/**
 * Load all calibrations from the database and populate the cache
 */
export async function loadAllCalibrations(): Promise<Map<string, BoardSkinCalibration>> {
  const { data, error } = await supabase
    .from('board_skins')
    .select('image_url, calibration')
    .eq('is_active', true)
    .not('calibration', 'is', null);

  if (error) {
    console.error('[boardSkinService] Error loading calibrations:', error);
    return calibrationCache;
  }

  for (const skin of data || []) {
    if (skin.calibration) {
      calibrationCache.set(skin.image_url, skin.calibration as BoardSkinCalibration);
    }
  }

  return calibrationCache;
}

/**
 * Get calibration for a specific board skin image URL (from cache)
 */
export function getCachedCalibration(imageUrl: string): BoardSkinCalibration | null {
  return calibrationCache.get(imageUrl) || null;
}

/**
 * Save calibration data for a board skin (admin only)
 */
export async function saveCalibration(skinId: string, calibration: BoardSkinCalibration): Promise<boolean> {
  const { error } = await supabase
    .from('board_skins')
    .update({ calibration })
    .eq('id', skinId);

  if (error) {
    console.error('[boardSkinService] Error saving calibration:', error);
    throw error;
  }

  // Update cache: find image_url for this skin
  const { data: skin } = await supabase
    .from('board_skins')
    .select('image_url')
    .eq('id', skinId)
    .single();

  if (skin) {
    calibrationCache.set(skin.image_url, calibration);
  }

  return true;
}

/**
 * Get all board skins with their calibration data (for calibration tool)
 */
export async function getAllBoardSkinsWithCalibration(): Promise<BoardSkin[]> {
  const { data, error } = await supabase
    .from('board_skins')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('[boardSkinService] Error fetching skins with calibration:', error);
    throw error;
  }

  return data || [];
}
