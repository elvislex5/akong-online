import { useState, useEffect } from 'react';
import { getUserSelectedSkin, type BoardSkin } from '../services/boardSkinService';

/**
 * Hook to manage board skin for a user
 * Returns the currently selected board skin image URL
 */
export function useBoardSkin(userId: string | null) {
  const [boardSkinUrl, setBoardSkinUrl] = useState<string>('/akong.png'); // Default
  const [selectedSkin, setSelectedSkin] = useState<BoardSkin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      // Not logged in, use default
      setBoardSkinUrl('/akong.png');
      setLoading(false);
      return;
    }

    const fetchSelectedSkin = async () => {
      try {
        const skin = await getUserSelectedSkin(userId);
        if (skin) {
          setSelectedSkin(skin);
          setBoardSkinUrl(skin.image_url);
        } else {
          // No skin selected, use default
          setBoardSkinUrl('/akong.png');
        }
      } catch (error) {
        console.error('[useBoardSkin] Error fetching selected skin:', error);
        setBoardSkinUrl('/akong.png'); // Fallback to default
      } finally {
        setLoading(false);
      }
    };

    fetchSelectedSkin();
  }, [userId]);

  return {
    boardSkinUrl,
    selectedSkin,
    loading,
  };
}
