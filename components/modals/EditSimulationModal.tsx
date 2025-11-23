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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto border border-gray-600">
        <h3 className="text-xl font-bold mb-4 text-center">
          {editPitIndex !== null ? `Modifier Case ${editPitIndex}` : `Modifier Score ${editScorePlayer === Player.One ? 'J1 (Bas)' : 'J2 (Haut)'}`}
        </h3>
        <div className="flex items-center justify-center gap-4 mb-6">
          <button onClick={() => onSetEditValue(Math.max(0, editValue - 1))} className="w-12 h-12 rounded-full bg-gray-700 text-2xl font-bold hover:bg-gray-600">-</button>
          <span className="text-4xl font-mono font-bold text-blue-400 w-20 text-center">{editValue}</span>
          <button onClick={() => onSetEditValue(editValue + 1)} className="w-12 h-12 rounded-full bg-gray-700 text-2xl font-bold hover:bg-gray-600">+</button>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-gray-700 font-bold text-gray-300">Annuler</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-500">Valider</button>
        </div>
      </div>
    </div>
  );
}
