import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Clipboard, Circle, X } from 'lucide-react';

interface GranaryPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface GranaryCalibrationToolProps {
  boardSkinUrl: string;
  onClose: () => void;
}

const GranaryCalibrationTool: React.FC<GranaryCalibrationToolProps> = ({
  boardSkinUrl,
  onClose,
}) => {
  const [granaryOne, setGranaryOne] = useState<GranaryPosition>({
    x: 5,
    y: 50,
    w: 8,
    h: 25,
  });

  const [granaryTwo, setGranaryTwo] = useState<GranaryPosition>({
    x: 95,
    y: 50,
    w: 8,
    h: 25,
  });

  const [dragging, setDragging] = useState<'one' | 'two' | null>(null);
  const [resizing, setResizing] = useState<'one' | 'two' | null>(null);

  const handleMouseDown = (granary: 'one' | 'two', e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(granary);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging && !resizing) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (dragging === 'one') {
      setGranaryOne((prev) => ({ ...prev, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }));
    } else if (dragging === 'two') {
      setGranaryTwo((prev) => ({ ...prev, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }));
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setResizing(null);
  };

  const copyToClipboard = () => {
    const code = `const granaryPosition = player === Player.One
  ? { x: ${granaryOne.x.toFixed(1)}, y: ${granaryOne.y.toFixed(1)}, w: ${granaryOne.w.toFixed(1)}, h: ${granaryOne.h.toFixed(1)} }   // Grenier GAUCHE (Joueur 1 - bas)
  : { x: ${granaryTwo.x.toFixed(1)}, y: ${granaryTwo.y.toFixed(1)}, w: ${granaryTwo.w.toFixed(1)}, h: ${granaryTwo.h.toFixed(1)} }; // Grenier DROIT (Joueur 2 - haut)`;

    navigator.clipboard.writeText(code);
    alert('Code copié dans le presse-papier !');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-6xl bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border-2 border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-black/60 backdrop-blur-xl p-4 border-b border-purple-500/30 flex justify-between items-center">
          <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
            <Target className="w-6 h-6 inline mr-2 text-purple-400" /> Calibration des Greniers
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Instructions */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <h3 className="text-sm font-bold text-purple-400 mb-2 flex items-center"><Clipboard className="w-4 h-4 mr-1" /> Instructions</h3>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>• <strong className="text-purple-400">Grenier GAUCHE (bleu)</strong> : Joueur 1 (bas)</li>
              <li>• <strong className="text-amber-400">Grenier DROIT (amber)</strong> : Joueur 2 (haut)</li>
              <li>• <strong>Cliquez et glissez</strong> les rectangles pour les positionner</li>
              <li>• Utilisez les <strong>sliders</strong> pour ajuster la taille</li>
              <li>• Cliquez sur <strong>"Copier le code"</strong> puis collez dans BoardRevolutionary.tsx</li>
            </ul>
          </div>

          {/* Board Preview */}
          <div
            className="relative w-full aspect-[21/9] rounded-xl overflow-hidden shadow-2xl cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img src={boardSkinUrl} alt="Plateau" className="absolute inset-0 w-full h-full object-cover" />

            {/* Granary One (Player 1 - GAUCHE) */}
            <div
              className={`absolute border-4 ${dragging === 'one' ? 'border-blue-500 bg-blue-500/30' : 'border-blue-400 bg-blue-500/20'} rounded-lg cursor-move transition-all`}
              style={{
                left: `${granaryOne.x}%`,
                top: `${granaryOne.y}%`,
                width: `${granaryOne.w}%`,
                height: `${granaryOne.h}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseDown={(e) => handleMouseDown('one', e)}
            >
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs bg-black/50">
                GAUCHE<br />J1
              </div>
            </div>

            {/* Granary Two (Player 2 - DROIT) */}
            <div
              className={`absolute border-4 ${dragging === 'two' ? 'border-amber-500 bg-amber-500/30' : 'border-amber-400 bg-amber-500/20'} rounded-lg cursor-move transition-all`}
              style={{
                left: `${granaryTwo.x}%`,
                top: `${granaryTwo.y}%`,
                width: `${granaryTwo.w}%`,
                height: `${granaryTwo.h}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseDown={(e) => handleMouseDown('two', e)}
            >
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs bg-black/50">
                DROIT<br />J2
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Granary One Controls */}
            <div className="bg-white/5 border border-blue-500/30 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-blue-400 flex items-center"><Circle className="w-3 h-3 mr-1 fill-blue-500 text-blue-500" /> Grenier GAUCHE (Joueur 1)</h3>

              <div>
                <label className="text-xs text-gray-400">Position X: {granaryOne.x.toFixed(1)}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={granaryOne.x}
                  onChange={(e) => setGranaryOne({ ...granaryOne, x: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400">Position Y: {granaryOne.y.toFixed(1)}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={granaryOne.y}
                  onChange={(e) => setGranaryOne({ ...granaryOne, y: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400">Largeur: {granaryOne.w.toFixed(1)}%</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.1"
                  value={granaryOne.w}
                  onChange={(e) => setGranaryOne({ ...granaryOne, w: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400">Hauteur: {granaryOne.h.toFixed(1)}%</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="0.1"
                  value={granaryOne.h}
                  onChange={(e) => setGranaryOne({ ...granaryOne, h: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Granary Two Controls */}
            <div className="bg-white/5 border border-amber-500/30 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-amber-400 flex items-center"><Circle className="w-3 h-3 mr-1 fill-amber-500 text-amber-500" /> Grenier DROIT (Joueur 2)</h3>

              <div>
                <label className="text-xs text-gray-400">Position X: {granaryTwo.x.toFixed(1)}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={granaryTwo.x}
                  onChange={(e) => setGranaryTwo({ ...granaryTwo, x: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400">Position Y: {granaryTwo.y.toFixed(1)}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={granaryTwo.y}
                  onChange={(e) => setGranaryTwo({ ...granaryTwo, y: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400">Largeur: {granaryTwo.w.toFixed(1)}%</label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.1"
                  value={granaryTwo.w}
                  onChange={(e) => setGranaryTwo({ ...granaryTwo, w: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400">Hauteur: {granaryTwo.h.toFixed(1)}%</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="0.1"
                  value={granaryTwo.h}
                  onChange={(e) => setGranaryTwo({ ...granaryTwo, h: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={copyToClipboard}
              className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-green-500/50"
            >
              <span className="flex items-center justify-center"><Clipboard className="w-5 h-5 mr-2" /> Copier le code</span>
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all duration-300"
            >
              Fermer
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default GranaryCalibrationTool;
