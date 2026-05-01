import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, X, Loader2, Check } from 'lucide-react';
import { type PitPosition, setCalibrationCache } from '../config/boardSkinConfigs';
import {
  getAllBoardSkinsWithCalibration,
  saveCalibration,
  type BoardSkin,
  type BoardSkinCalibration,
} from '../services/boardSkinService';
import { useFocusTrap } from '../hooks/useFocusTrap';
import toast from 'react-hot-toast';

interface BoardCalibrationToolProps {
  onClose: () => void;
}

type ElementType = 'pit' | 'granary';

const BoardCalibrationTool: React.FC<BoardCalibrationToolProps> = ({ onClose }) => {
  const [boardSkins, setBoardSkins] = useState<BoardSkin[]>([]);
  const [selectedSkin, setSelectedSkin] = useState<BoardSkin | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pitPositions, setPitPositions] = useState<{ [key: string]: PitPosition }>({});
  const [granaryOne, setGranaryOne] = useState({ x: 25, y: 50, w: 15, h: 15 });
  const [granaryTwo, setGranaryTwo] = useState({ x: 75, y: 50, w: 15, h: 15 });

  const [dragging, setDragging] = useState<{ type: ElementType; id: string | number } | null>(null);
  const [selectedElement, setSelectedElement] = useState<{ type: ElementType; id: string | number } | null>(null);

  const modalRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    getAllBoardSkinsWithCalibration()
      .then((skins) => {
        setBoardSkins(skins);
        if (skins.length > 0) {
          handleBoardChange(skins[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('[BoardCalibrationTool] Error loading skins:', err);
        toast.error('Erreur de chargement des skins');
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getDefaultPitPositions = (): { [key: string]: PitPosition } => {
    const positions: { [key: string]: PitPosition } = {};
    for (let i = 0; i <= 6; i++) positions[String(i)] = { x: 80 - i * 10, y: 71, w: 8, h: 16 };
    for (let i = 7; i <= 13; i++) positions[String(i)] = { x: 18 + (i - 7) * 10, y: 27, w: 8, h: 16 };
    return positions;
  };

  const handleBoardChange = (skin: BoardSkin) => {
    setSelectedSkin(skin);
    if (skin.calibration) {
      setPitPositions(skin.calibration.pitPositions);
      setGranaryOne(skin.calibration.granaryPositions.playerOne);
      setGranaryTwo(skin.calibration.granaryPositions.playerTwo);
    } else {
      setPitPositions(getDefaultPitPositions());
      setGranaryOne({ x: 25, y: 50, w: 15, h: 15 });
      setGranaryTwo({ x: 75, y: 50, w: 15, h: 15 });
    }
    setSelectedElement(null);
  };

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
      setPitPositions((prev) => ({
        ...prev,
        [dragging.id]: {
          ...prev[dragging.id as string],
          x: Math.max(0, Math.min(100, x)),
          y: Math.max(0, Math.min(100, y)),
        },
      }));
    } else if (dragging.id === 'one') {
      setGranaryOne((prev) => ({ ...prev, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }));
    } else if (dragging.id === 'two') {
      setGranaryTwo((prev) => ({ ...prev, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }));
    }
  };

  const handleMouseUp = () => setDragging(null);

  const handleSave = async () => {
    if (!selectedSkin) return;
    setSaving(true);
    try {
      const calibration: BoardSkinCalibration = {
        pitPositions,
        granaryPositions: { playerOne: granaryOne, playerTwo: granaryTwo },
      };

      await saveCalibration(selectedSkin.id, calibration);

      setBoardSkins((prev) => prev.map((s) => (s.id === selectedSkin.id ? { ...s, calibration } : s)));
      setSelectedSkin((prev) => (prev ? { ...prev, calibration } : prev));

      const cacheObj: { [url: string]: any } = {};
      boardSkins.forEach((s) => {
        if (s.id === selectedSkin.id) cacheObj[s.image_url] = calibration;
        else if (s.calibration) cacheObj[s.image_url] = s.calibration;
      });
      setCalibrationCache(cacheObj);

      toast.success('Calibration enregistrée');
    } catch (err) {
      console.error('[BoardCalibrationTool] Save error:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const getSelectedPosition = () => {
    if (!selectedElement) return null;
    if (selectedElement.type === 'pit') return pitPositions[selectedElement.id as string];
    if (selectedElement.id === 'one') return granaryOne;
    return granaryTwo;
  };

  const updateSelectedPosition = (field: 'x' | 'y' | 'w' | 'h', value: number) => {
    if (!selectedElement) return;
    if (selectedElement.type === 'pit') {
      setPitPositions((prev) => ({
        ...prev,
        [selectedElement.id]: { ...prev[selectedElement.id as string], [field]: value },
      }));
    } else if (selectedElement.id === 'one') {
      setGranaryOne((prev) => ({ ...prev, [field]: value }));
    } else {
      setGranaryTwo((prev) => ({ ...prev, [field]: value }));
    }
  };

  const selectedPosition = getSelectedPosition();

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-canvas/85 backdrop-blur-sm flex items-center justify-center">
        <Loader2 size={20} strokeWidth={1.75} className="text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-canvas/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-label="Outil de calibration du plateau"
        aria-modal="true"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-7xl bg-surface border border-rule shadow-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-rule flex justify-between items-start gap-4 shrink-0">
          <div>
            <p className="kicker">Admin · calibration</p>
            <h2
              className="font-display text-2xl text-ink mt-1"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
            >
              Calibrer le plateau
            </h2>
            <p className="text-xs text-ink-muted mt-1 hidden sm:block">
              Positionnez les 14 cases (0-13) et les 2 greniers · valeurs en % du plateau
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex items-center justify-center w-9 h-9 text-ink-muted hover:text-ink hover:bg-canvas transition-colors duration-150 shrink-0"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
          {/* Left: board preview */}
          <div className="flex-1 p-4 lg:p-5 overflow-y-auto min-h-0 space-y-4">
            {/* Skin selector */}
            <div>
              <p className="kicker mb-2">Plateau</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-rule border border-rule">
                {boardSkins.map((skin) => {
                  const isActive = selectedSkin?.id === skin.id;
                  return (
                    <button
                      key={skin.id}
                      type="button"
                      onClick={() => handleBoardChange(skin)}
                      aria-pressed={isActive}
                      className={
                        'h-9 px-3 text-xs font-medium tracking-wide inline-flex items-center justify-center gap-1.5 transition-colors duration-150 ' +
                        (isActive
                          ? 'bg-accent text-accent-ink'
                          : 'bg-canvas text-ink-muted hover:text-ink hover:bg-surface')
                      }
                    >
                      <span className="truncate">{skin.name}</span>
                      {skin.calibration && (
                        <Check size={11} strokeWidth={2} className={isActive ? 'opacity-90' : 'text-success'} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Board preview with draggables */}
            {selectedSkin && (
              <div
                className="relative w-full aspect-[21/9] border border-rule cursor-crosshair overflow-hidden"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                role="application"
                aria-label="Zone de calibration"
              >
                <img
                  src={selectedSkin.image_url}
                  alt="Plateau"
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover select-none"
                />

                {/* Pits */}
                {Object.keys(pitPositions).map((pitIndex) => {
                  const pos = pitPositions[pitIndex];
                  const isDragging = dragging?.type === 'pit' && dragging?.id === pitIndex;
                  const isSelected = selectedElement?.type === 'pit' && selectedElement?.id === pitIndex;
                  return (
                    <DraggableMarker
                      key={`pit-${pitIndex}`}
                      pos={pos}
                      isSelected={isSelected}
                      isDragging={isDragging}
                      label={pitIndex}
                      ariaLabel={`Case ${pitIndex}`}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleMouseDown('pit', pitIndex);
                      }}
                      onSelect={() => handleSelect('pit', pitIndex)}
                    />
                  );
                })}

                {/* Granary 1 */}
                <DraggableMarker
                  pos={granaryOne}
                  isSelected={selectedElement?.type === 'granary' && selectedElement?.id === 'one'}
                  isDragging={dragging?.type === 'granary' && dragging?.id === 'one'}
                  label="G1"
                  ariaLabel="Grenier 1 (gauche)"
                  thick
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown('granary', 'one');
                  }}
                  onSelect={() => handleSelect('granary', 'one')}
                />

                {/* Granary 2 */}
                <DraggableMarker
                  pos={granaryTwo}
                  isSelected={selectedElement?.type === 'granary' && selectedElement?.id === 'two'}
                  isDragging={dragging?.type === 'granary' && dragging?.id === 'two'}
                  label="G2"
                  ariaLabel="Grenier 2 (droit)"
                  thick
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown('granary', 'two');
                  }}
                  onSelect={() => handleSelect('granary', 'two')}
                />
              </div>
            )}
          </div>

          {/* Right: fine tuning panel */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-rule p-5 overflow-y-auto bg-canvas">
            <p className="kicker mb-4">Ajustements précis</p>

            {selectedElement ? (
              <div className="space-y-5">
                <div className="border-l-2 border-accent pl-3">
                  <p className="text-xs text-ink-subtle">Sélection</p>
                  <p
                    className="font-display text-lg text-ink mt-0.5"
                    style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
                  >
                    {selectedElement.type === 'pit'
                      ? `Case ${selectedElement.id}`
                      : `Grenier ${selectedElement.id === 'one' ? '1 · gauche' : '2 · droit'}`}
                  </p>
                </div>

                {selectedPosition && (
                  <div className="space-y-4">
                    <Slider
                      id="pos-x"
                      label="Position X"
                      value={selectedPosition.x}
                      min={0}
                      max={100}
                      step={0.1}
                      onChange={(v) => updateSelectedPosition('x', v)}
                    />
                    <Slider
                      id="pos-y"
                      label="Position Y"
                      value={selectedPosition.y}
                      min={0}
                      max={100}
                      step={0.1}
                      onChange={(v) => updateSelectedPosition('y', v)}
                    />
                    <Slider
                      id="pos-w"
                      label="Largeur"
                      value={selectedPosition.w}
                      min={1}
                      max={30}
                      step={0.1}
                      onChange={(v) => updateSelectedPosition('w', v)}
                    />
                    <Slider
                      id="pos-h"
                      label="Hauteur"
                      value={selectedPosition.h}
                      min={1}
                      max={30}
                      step={0.1}
                      onChange={(v) => updateSelectedPosition('h', v)}
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink-muted leading-relaxed">
                Cliquez sur une case ou un grenier pour l'ajuster.
              </p>
            )}

            {/* Instructions */}
            <div className="mt-8 pt-6 border-t border-rule">
              <p className="kicker mb-2">Mode d'emploi</p>
              <ul className="text-xs text-ink-muted leading-relaxed space-y-1">
                <li>· Cliquer-glisser pour déplacer</li>
                <li>· Cliquer pour sélectionner</li>
                <li>· Sliders pour les réglages fins</li>
                <li>· Enregistrer sauvegarde en base</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-rule flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-10 inline-flex items-center justify-center px-4 rounded-md text-sm font-medium text-ink-muted hover:text-ink hover:bg-canvas transition-colors duration-150"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !selectedSkin}
            className="h-10 inline-flex items-center justify-center gap-2 px-5 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          >
            {saving ? <Loader2 size={14} strokeWidth={1.75} className="animate-spin" /> : <Save size={14} strokeWidth={1.75} />}
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default BoardCalibrationTool;

/* ----------------------------------------------------------------
   Local components
   ---------------------------------------------------------------- */

const DraggableMarker: React.FC<{
  pos: PitPosition;
  isSelected?: boolean;
  isDragging?: boolean;
  label: string;
  ariaLabel: string;
  thick?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onSelect: () => void;
}> = ({ pos, isSelected, isDragging, label, ariaLabel, thick, onMouseDown, onSelect }) => {
  const baseBorder = thick ? 'border-[3px]' : 'border-2';
  const stateClass = isDragging
    ? 'border-accent bg-accent/30 ring-1 ring-inset ring-accent'
    : isSelected
      ? 'border-accent bg-accent/20'
      : 'border-clay-50/70 bg-clay-50/10 hover:border-accent';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      onMouseDown={onMouseDown}
      className={`absolute ${baseBorder} ${stateClass} cursor-move transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: `${pos.w}%`,
        height: `${pos.h}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center bg-clay-900/55 backdrop-blur-[1px]">
        <span
          className="font-display tabular-nums text-clay-50 text-[11px] leading-none select-none"
          style={{ fontVariationSettings: '"opsz" 14, "SOFT" 30' }}
        >
          {label}
        </span>
      </div>
    </div>
  );
};

const Slider: React.FC<{
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}> = ({ id, label, value, min, max, step, onChange }) => (
  <div>
    <label htmlFor={id} className="flex items-baseline justify-between mb-2">
      <span className="kicker">{label}</span>
      <span className="text-xs text-ink font-mono tabular-nums">{value.toFixed(1)} %</span>
    </label>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 rounded-full bg-rule accent-accent cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    />
  </div>
);
