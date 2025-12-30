import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Clipboard, Sliders, Lightbulb, X } from 'lucide-react';
import { getAllBoardConfigs, type BoardSkinConfig, type PitPosition } from '../config/boardSkinConfigs';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface BoardCalibrationToolProps {
  onClose: () => void;
}

type ElementType = 'pit' | 'granary';

const BoardCalibrationTool: React.FC<BoardCalibrationToolProps> = ({ onClose }) => {
  // État pour le tablier sélectionné
  const [selectedConfig, setSelectedConfig] = useState<BoardSkinConfig>(getAllBoardConfigs()[0]);

  // État pour les positions des trous
  const [pitPositions, setPitPositions] = useState<{ [key: string]: PitPosition }>(selectedConfig.pitPositions);

  // État pour les positions des greniers
  const [granaryOne, setGranaryOne] = useState(selectedConfig.granaryPositions.playerOne);
  const [granaryTwo, setGranaryTwo] = useState(selectedConfig.granaryPositions.playerTwo);

  // État pour le drag & drop
  const [dragging, setDragging] = useState<{ type: ElementType; id: string | number } | null>(null);

  // État pour l'élément sélectionné pour l'édition fine
  const [selectedElement, setSelectedElement] = useState<{ type: ElementType; id: string | number } | null>(null);

  // Accessibility
  const modalRef = useFocusTrap<HTMLDivElement>(true);

  // Changer de tablier
  const handleBoardChange = (config: BoardSkinConfig) => {
    setSelectedConfig(config);
    setPitPositions(config.pitPositions);
    setGranaryOne(config.granaryPositions.playerOne);
    setGranaryTwo(config.granaryPositions.playerTwo);
    setSelectedElement(null);
  };

  // Gestion du drag & drop
  const handleMouseDown = (type: ElementType, id: string | number) => {
    setDragging({ type, id });
    setSelectedElement({ type, id });
  };

  const handleSelect = (type: ElementType, id: string | number) => {
    setSelectedElement({ type, id });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (dragging.type === 'pit') {
      setPitPositions(prev => ({
        ...prev,
        [dragging.id]: {
          ...prev[dragging.id as string],
          x: Math.max(0, Math.min(100, x)),
          y: Math.max(0, Math.min(100, y))
        }
      }));
    } else if (dragging.id === 'one') {
      setGranaryOne(prev => ({ ...prev, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }));
    } else if (dragging.id === 'two') {
      setGranaryTwo(prev => ({ ...prev, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }));
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  // Copier la configuration dans le presse-papier
  const copyToClipboard = () => {
    const config = {
      skinId: selectedConfig.skinId,
      skinName: selectedConfig.skinName,
      imageUrl: selectedConfig.imageUrl,
      pitPositions,
      granaryPositions: {
        playerOne: granaryOne,
        playerTwo: granaryTwo
      }
    };

    const code = `export const ${selectedConfig.skinId.toUpperCase()}_CONFIG: BoardSkinConfig = ${JSON.stringify(config, null, 2)};`;

    navigator.clipboard.writeText(code);
    alert('✅ Configuration copiée ! Collez-la dans config/boardSkinConfigs.ts');
  };

  // Obtenir la position actuellement sélectionnée pour l'édition fine
  const getSelectedPosition = () => {
    if (!selectedElement) return null;
    if (selectedElement.type === 'pit') {
      return pitPositions[selectedElement.id as string];
    } else if (selectedElement.id === 'one') {
      return granaryOne;
    } else {
      return granaryTwo;
    }
  };

  // Mettre à jour la position sélectionnée
  const updateSelectedPosition = (field: 'x' | 'y' | 'w' | 'h', value: number) => {
    if (!selectedElement) return;

    if (selectedElement.type === 'pit') {
      setPitPositions(prev => ({
        ...prev,
        [selectedElement.id]: { ...prev[selectedElement.id as string], [field]: value }
      }));
    } else if (selectedElement.id === 'one') {
      setGranaryOne(prev => ({ ...prev, [field]: value }));
    } else {
      setGranaryTwo(prev => ({ ...prev, [field]: value }));
    }
  };

  const selectedPosition = getSelectedPosition();

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 pt-20 sm:pt-24">
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-label="Outil de calibration du tablier"
        aria-modal="true"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-7xl bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="bg-black/60 backdrop-blur-xl p-3 sm:p-4 border-b border-purple-500/30 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
              <Target className="w-6 h-6 inline mr-2 text-purple-400" aria-hidden="true" /> Calibration du Tablier
            </h2>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1 hidden sm:block">Calibrez tous les trous (0-13) et les 2 greniers</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-300 focus-visible-ring"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
          {/* Left Panel - Board Preview */}
          <div className="flex-1 p-2 sm:p-3 lg:p-4 overflow-y-auto min-h-0">
            {/* Board Selector */}
            <div className="mb-2 sm:mb-3 bg-white/5 border border-purple-500/20 rounded-xl p-2 sm:p-3">
              <label className="text-[10px] sm:text-xs font-bold text-purple-400 uppercase mb-1 sm:mb-2 block">
                <Clipboard className="w-3 h-3 inline mr-1" aria-hidden="true" /> Tablier
              </label>
              <div className="grid grid-cols-3 gap-1 sm:gap-2">
                {getAllBoardConfigs().map((config) => (
                  <button
                    key={config.skinId}
                    onClick={() => handleBoardChange(config)}
                    aria-pressed={selectedConfig.skinId === config.skinId}
                    className={`p-1.5 sm:p-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all focus-visible-ring ${selectedConfig.skinId === config.skinId
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                  >
                    {config.skinName}
                  </button>
                ))}
              </div>
            </div>

            {/* Board Preview */}
            <div
              className="relative w-full aspect-[21/9] rounded-xl overflow-hidden shadow-2xl cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              role="application"
              aria-label="Zone de prévisualisation du tablier"
            >
              <img src={selectedConfig.imageUrl} alt="Plateau" className="absolute inset-0 w-full h-full object-cover" />

              {/* Render all pits */}
              {Object.keys(pitPositions).map((pitIndex) => {
                const pos = pitPositions[pitIndex];
                const isPitDragging = dragging?.type === 'pit' && dragging?.id === pitIndex;
                const isPitSelected = selectedElement?.type === 'pit' && selectedElement?.id === pitIndex;

                return (
                  <div
                    key={`pit-${pitIndex}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Trou ${pitIndex}`}
                    aria-pressed={isPitSelected}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect('pit', pitIndex);
                      }
                    }}
                    className={`absolute border-2 ${isPitDragging
                      ? 'border-yellow-400 bg-yellow-500/40'
                      : isPitSelected
                        ? 'border-green-400 bg-green-500/30'
                        : 'border-blue-400 bg-blue-500/20'
                      } rounded-lg cursor-move transition-all hover:border-green-400 focus-visible-ring`}
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      width: `${pos.w}%`,
                      height: `${pos.h}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleMouseDown('pit', pitIndex);
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[10px] bg-black/50">
                      {pitIndex}
                    </div>
                  </div>
                );
              })}

              {/* Granary One (Player 1 - GAUCHE) */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Grenier 1 (Gauche)"
                aria-pressed={selectedElement?.type === 'granary' && selectedElement?.id === 'one'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect('granary', 'one');
                  }
                }}
                className={`absolute border-4 ${dragging?.type === 'granary' && dragging?.id === 'one'
                  ? 'border-blue-500 bg-blue-500/40'
                  : selectedElement?.type === 'granary' && selectedElement?.id === 'one'
                    ? 'border-green-500 bg-green-500/30'
                    : 'border-blue-400 bg-blue-500/20'
                  } rounded-lg cursor-move transition-all focus-visible-ring`}
                style={{
                  left: `${granaryOne.x}%`,
                  top: `${granaryOne.y}%`,
                  width: `${granaryOne.w}%`,
                  height: `${granaryOne.h}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleMouseDown('granary', 'one');
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs bg-black/50">
                  G1<br />GAUCHE
                </div>
              </div>

              {/* Granary Two (Player 2 - DROIT) */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Grenier 2 (Droit)"
                aria-pressed={selectedElement?.type === 'granary' && selectedElement?.id === 'two'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect('granary', 'two');
                  }
                }}
                className={`absolute border-4 ${dragging?.type === 'granary' && dragging?.id === 'two'
                  ? 'border-amber-500 bg-amber-500/40'
                  : selectedElement?.type === 'granary' && selectedElement?.id === 'two'
                    ? 'border-green-500 bg-green-500/30'
                    : 'border-amber-400 bg-amber-500/20'
                  } rounded-lg cursor-move transition-all focus-visible-ring`}
                style={{
                  left: `${granaryTwo.x}%`,
                  top: `${granaryTwo.y}%`,
                  width: `${granaryTwo.w}%`,
                  height: `${granaryTwo.h}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleMouseDown('granary', 'two');
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs bg-black/50">
                  G2<br />DROIT
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Fine Tuning Controls */}
          <div className="w-80 border-l border-purple-500/30 bg-black/40 p-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-purple-400 mb-3 flex items-center"><Sliders className="w-4 h-4 mr-2" aria-hidden="true" /> Ajustements Précis</h3>

            {selectedElement ? (
              <div className="space-y-3">
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2">
                  <p className="text-xs text-purple-300 font-bold">
                    {selectedElement.type === 'pit'
                      ? `Trou ${selectedElement.id}`
                      : `Grenier ${selectedElement.id === 'one' ? '1 (Gauche)' : '2 (Droit)'}`}
                  </p>
                </div>

                {selectedPosition && (
                  <>
                    <div>
                      <label htmlFor="pos-x" className="text-xs text-gray-400">Position X: {selectedPosition.x.toFixed(1)}%</label>
                      <input
                        id="pos-x"
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        value={selectedPosition.x}
                        onChange={(e) => updateSelectedPosition('x', parseFloat(e.target.value))}
                        className="w-full focus-visible-ring"
                      />
                    </div>

                    <div>
                      <label htmlFor="pos-y" className="text-xs text-gray-400">Position Y: {selectedPosition.y.toFixed(1)}%</label>
                      <input
                        id="pos-y"
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        value={selectedPosition.y}
                        onChange={(e) => updateSelectedPosition('y', parseFloat(e.target.value))}
                        className="w-full focus-visible-ring"
                      />
                    </div>

                    <div>
                      <label htmlFor="pos-w" className="text-xs text-gray-400">Largeur: {selectedPosition.w.toFixed(1)}%</label>
                      <input
                        id="pos-w"
                        type="range"
                        min="1"
                        max="30"
                        step="0.1"
                        value={selectedPosition.w}
                        onChange={(e) => updateSelectedPosition('w', parseFloat(e.target.value))}
                        className="w-full focus-visible-ring"
                      />
                    </div>

                    <div>
                      <label htmlFor="pos-h" className="text-xs text-gray-400">Hauteur: {selectedPosition.h.toFixed(1)}%</label>
                      <input
                        id="pos-h"
                        type="range"
                        min="1"
                        max="30"
                        step="0.1"
                        value={selectedPosition.h}
                        onChange={(e) => updateSelectedPosition('h', parseFloat(e.target.value))}
                        className="w-full focus-visible-ring"
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">
                Cliquez sur un trou ou un grenier pour l'ajuster
              </p>
            )}

            {/* Instructions */}
            <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <h4 className="text-xs font-bold text-blue-400 mb-2 flex items-center"><Lightbulb className="w-3 h-3 mr-1" aria-hidden="true" /> Instructions</h4>
              <ul className="text-[10px] text-gray-300 space-y-1">
                <li>• <strong>Cliquez et glissez</strong> pour déplacer</li>
                <li>• <strong>Cliquez</strong> pour sélectionner</li>
                <li>• <strong>Sliders</strong> pour ajustements fins</li>
                <li>• <strong>Copiez le code</strong> quand fini</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer - Action Buttons */}
        <div className="bg-black/60 backdrop-blur-xl p-4 border-t border-purple-500/30 flex gap-3 flex-shrink-0">
          <button
            onClick={copyToClipboard}
            className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-green-500/50 focus-visible-ring"
          >
            <span className="flex items-center justify-center"><Clipboard className="w-5 h-5 mr-2" aria-hidden="true" /> Copier la Configuration</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all duration-300 focus-visible-ring"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default BoardCalibrationTool;
