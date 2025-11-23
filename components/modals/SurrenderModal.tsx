import React from 'react';
import { GameMode, Player } from '../../types';

interface SurrenderModalProps {
  isOpen: boolean;
  gameMode: GameMode | null;
  onClose: () => void;
  onSurrender: (player: Player) => void;
}

export function SurrenderModal({
  isOpen,
  gameMode,
  onClose,
  onSurrender
}: SurrenderModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto border border-gray-600 text-center">
        <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">Abandonner la partie ?</h3>
        <p className="text-gray-400 mb-4 sm:mb-6 text-sm">L'adversaire sera déclaré vainqueur.</p>

        {gameMode === GameMode.LocalMultiplayer ? (
          <div className="flex flex-col gap-2">
            <button onClick={() => onSurrender(Player.One)} className="w-full py-3 rounded-xl bg-blue-900/50 text-blue-200 hover:bg-blue-900 font-bold border border-blue-800">
              Joueur 1 abandonne
            </button>
            <button onClick={() => onSurrender(Player.Two)} className="w-full py-3 rounded-xl bg-amber-900/50 text-amber-200 hover:bg-amber-900 font-bold border border-amber-800">
              Joueur 2 abandonne
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-bold hover:bg-gray-600">
              Non, continuer
            </button>
            <button onClick={() => onSurrender(gameMode === GameMode.OnlineGuest ? Player.Two : Player.One)} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500">
              Oui, abandonner
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
