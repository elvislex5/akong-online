import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { getAllSkinsWithUnlockStatus, selectBoardSkin, type BoardSkin } from '../../services/boardSkinService';
import toast from 'react-hot-toast';

interface BoardSkinSelectorProps {
  userId: string;
  currentSkinId: string | null;
  onSkinSelected: () => void;
}

const BoardSkinSelector: React.FC<BoardSkinSelectorProps> = ({
  userId,
  currentSkinId,
  onSkinSelected,
}) => {
  const [skins, setSkins] = useState<Array<BoardSkin & { unlocked: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    loadSkins();
  }, [userId]);

  const loadSkins = async () => {
    try {
      const skinsWithStatus = await getAllSkinsWithUnlockStatus(userId);
      setSkins(skinsWithStatus);
    } catch (error) {
      console.error('Error loading skins:', error);
      toast.error('Erreur de chargement des plateaux');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSkin = async (skinId: string, unlocked: boolean) => {
    if (!unlocked) {
      toast.error('Ce plateau n\'est pas encore débloqué');
      return;
    }

    if (skinId === currentSkinId) {
      return; // Already selected
    }

    setSelecting(true);
    try {
      await selectBoardSkin(userId, skinId);
      toast.success('Plateau sélectionné !');
      onSkinSelected();
    } catch (error) {
      console.error('Error selecting skin:', error);
      toast.error('Erreur lors de la sélection');
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-400 mt-2">Chargement des plateaux...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4">
        Personnaliser le plateau
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {skins.map((skin) => (
          <motion.button
            key={skin.id}
            whileHover={{ scale: skin.unlocked ? 1.02 : 1 }}
            whileTap={{ scale: skin.unlocked ? 0.98 : 1 }}
            onClick={() => handleSelectSkin(skin.id, skin.unlocked)}
            disabled={!skin.unlocked || selecting}
            className={`
              relative group overflow-hidden rounded-xl transition-all duration-300
              ${skin.id === currentSkinId
                ? 'ring-4 ring-amber-500 shadow-lg shadow-amber-500/50'
                : skin.unlocked
                  ? 'ring-2 ring-white/20 hover:ring-white/40'
                  : 'ring-2 ring-gray-700 opacity-60 cursor-not-allowed'
              }
            `}
          >
            {/* Preview Image */}
            <div className="aspect-video relative">
              <img
                src={skin.image_url}
                alt={skin.name}
                className={`w-full h-full object-cover ${skin.unlocked ? '' : 'grayscale blur-sm'
                  }`}
              />

              {/* Locked Overlay */}
              {!skin.unlocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="text-center">
                    <div className="mb-2 flex justify-center"><Lock className="w-8 h-8 text-white/80" /></div>
                    {skin.price > 0 && (
                      <p className="text-amber-400 font-bold">{skin.price} pts</p>
                    )}
                  </div>
                </div>
              )}

              {/* Selected Badge */}
              {skin.id === currentSkinId && (
                <div className="absolute top-2 right-2 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  ✓ Actif
                </div>
              )}

              {/* Premium Badge */}
              {skin.is_premium && (
                <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  ⭐ Premium
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3 bg-white/5 backdrop-blur-sm">
              <h4 className="font-bold text-white text-sm mb-1">{skin.name}</h4>
              {skin.description && (
                <p className="text-xs text-gray-400 line-clamp-1">{skin.description}</p>
              )}
            </div>

            {/* Hover Glow */}
            {skin.unlocked && (
              <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            )}
          </motion.button>
        ))}
      </div>

      {skins.length === 0 && (
        <p className="text-center text-gray-400 py-8">
          Aucun plateau disponible
        </p>
      )}
    </div>
  );
};

export default BoardSkinSelector;
