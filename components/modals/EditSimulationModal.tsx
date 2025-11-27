import React from 'react';
import { Player } from '../../types';

interface EditSimulationModalProps {
  isOpen: boolean;
  editPitIndex: number | null;
  editScorePlayer: Player | null;
  editValue: number;
  onSetEditValue: (value: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EditSimulationModal({
  isOpen,
  editPitIndex,
  editScorePlayer,
  editValue,
  onSetEditValue,
  onConfirm,
  onCancel
}: EditSimulationModalProps) {
  if (!isOpen) return null;

  const increment = () => onSetEditValue(Math.min(editValue + 1, 99));
  const decrement = () => onSetEditValue(Math.max(editValue - 1, 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-dark neon-border-emerald p-8 rounded-3xl shadow-2xl text-center max-w-sm card-3d animate-scale-in">

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-2 neon-text-emerald text-glow-emerald-md">
          Modifier
        </h2>

        {/* Subtitle */}
        <p className="text-white-60 mb-6 text-sm">
          {editPitIndex !== null ? `Case ${editPitIndex + 1}` :
            editScorePlayer !== null ? `Score Joueur ${editScorePlayer === Player.One ? '1' : '2'}` : ''}
        </p>

        {/* Value editor with neon styling */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={decrement}
            className="glass-button w-12 h-12 rounded-xl font-bold text-2xl hover:glass-glow-emerald transition-all"
          >
            −
          </button>

          <div className="glass-glow-emerald px-6 py-4 rounded-xl min-w-[100px]">
            <span className="text-4xl font-black text-emerald-400 text-glow-emerald-md">
              {editValue}
            </span>
          </div>

          <button
            onClick={increment}
            className="glass-button w-12 h-12 rounded-xl font-bold text-2xl hover:glass-glow-emerald transition-all"
          >
            +
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onConfirm}
            className="neon-button-emerald px-6 py-3 rounded-xl font-bold flex-1"
          >
            Valider
          </button>
          <button
            onClick={onCancel}
            className="glass-button px-6 py-3 rounded-xl font-bold flex-1 hover:glass-glow-amber transition-all"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
