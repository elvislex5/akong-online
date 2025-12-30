import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, GameStatus, AIDifficulty } from '../types';
import { FlaskConical, Turtle, Zap, Rocket, Bot, Smile, Meh, Frown, Gamepad2, Wrench, Trash2, RotateCcw, Target, X, Flame, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface SimulationControlPanelProps {
  gameStatus: GameStatus;
  currentPlayer: Player;
  simSpeed: 'slow' | 'normal' | 'fast';
  simDifficulty: AIDifficulty;
  isSimAuto: boolean;
  onSetCurrentPlayer: (player: Player) => void;
  onSetSimSpeed: (speed: 'slow' | 'normal' | 'fast') => void;
  onSetSimDifficulty: (difficulty: AIDifficulty) => void;
  onToggleSimAuto: () => void;
  onStartSimulation: () => void;
  onRestartSimulation: () => void;
  onClearBoard: () => void;
  onResetBoard: () => void;
  onExit: () => void;
  onOpenCalibration?: () => void;
}

const SimulationControlPanel: React.FC<SimulationControlPanelProps> = ({
  gameStatus,
  currentPlayer,
  simSpeed,
  simDifficulty,
  isSimAuto,
  onSetCurrentPlayer,
  onSetSimSpeed,
  onSetSimDifficulty,
  onToggleSimAuto,
  onStartSimulation,
  onRestartSimulation,
  onClearBoard,
  onResetBoard,
  onExit,
  onOpenCalibration,
}) => {
  const isSetup = gameStatus === GameStatus.Setup;

  // Accessibility: Focus trap
  const panelRef = useFocusTrap<HTMLDivElement>(true);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <motion.div
      initial={{ x: 320 }}
      animate={{ x: isCollapsed ? 320 : 0 }}
      exit={{ x: 320 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed right-0 top-20 bottom-0 w-80 glass-modal border-l-2 border-purple-500/30 shadow-2xl z-40 flex flex-col overflow-visible"
      ref={panelRef}
      role="dialog"
      aria-label="Panneau de contrôle de simulation"
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -left-8 top-24 bg-purple-600/90 hover:bg-purple-500 text-white w-8 h-12 rounded-l-xl shadow-lg flex items-center justify-center transition-all duration-300 z-50 border-y border-l border-purple-400/30 backdrop-blur-md"
        aria-label={isCollapsed ? "Ouvrir le panneau" : "Réduire le panneau"}
        title={isCollapsed ? "Ouvrir le panneau" : "Réduire le panneau"}
      >
        {isCollapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      <div className="glow-overlay-purple rounded-l-3xl"></div>

      <div className="relative z-10 p-4 space-y-4 overflow-y-auto flex-1">
        {/* Header */}
        <div className="text-center flex-shrink-0">
          <h2 className="title-card text-gradient-purple mb-1 flex items-center justify-center">
            <FlaskConical className="w-6 h-6 mr-2 text-purple-400" aria-hidden="true" /> LABO
          </h2>
          <p className="text-xs text-gray-400">
            {isSetup ? 'Configuration' : 'En cours'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {isSetup ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {/* Starting Player */}
              <div className="bg-white/5 border border-purple-500/20 rounded-xl p-3">
                <label className="text-xs font-bold text-purple-400 uppercase mb-2 flex items-center">
                  <Zap className="w-3 h-3 mr-1" aria-hidden="true" /> Qui commence ?
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => onSetCurrentPlayer(Player.One)}
                    aria-pressed={currentPlayer === Player.One}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all duration-300 focus-visible-ring ${currentPlayer === Player.One
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/50'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                  >
                    Joueur BAS
                  </button>
                  <button
                    onClick={() => onSetCurrentPlayer(Player.Two)}
                    aria-pressed={currentPlayer === Player.Two}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all duration-300 focus-visible-ring ${currentPlayer === Player.Two
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/50'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                  >
                    Joueur HAUT
                  </button>
                </div>
              </div>

              {/* Speed Control */}
              <div className="bg-white/5 border border-purple-500/20 rounded-xl p-3">
                <label className="text-xs font-bold text-purple-400 uppercase mb-2 flex items-center">
                  <Zap className="w-3 h-3 mr-1" aria-hidden="true" /> Vitesse
                </label>
                <div className="flex gap-1.5">
                  {(['slow', 'normal', 'fast'] as const).map((speed) => (
                    <button
                      key={speed}
                      onClick={() => onSetSimSpeed(speed)}
                      aria-pressed={simSpeed === speed}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all duration-300 focus-visible-ring ${simSpeed === speed
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                    >
                      {speed === 'slow' ? <span className="flex items-center justify-center"><Turtle className="w-3 h-3 mr-1" aria-hidden="true" /> Lent</span> : speed === 'normal' ? <span className="flex items-center justify-center"><Zap className="w-3 h-3 mr-1" aria-hidden="true" /> Normal</span> : <span className="flex items-center justify-center"><Rocket className="w-3 h-3 mr-1" aria-hidden="true" /> Rapide</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Difficulty */}
              <div className="bg-white/5 border border-purple-500/20 rounded-xl p-3">
                <label className="text-xs font-bold text-purple-400 uppercase mb-2 flex items-center">
                  <Bot className="w-3 h-3 mr-1" aria-hidden="true" /> Niveau IA
                </label>
                <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                  {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
                    <button
                      key={difficulty}
                      onClick={() => onSetSimDifficulty(difficulty)}
                      aria-pressed={simDifficulty === difficulty}
                      className={`py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all duration-300 focus-visible-ring ${simDifficulty === difficulty
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                    >
                      {difficulty === 'easy' ? <span className="flex items-center justify-center"><Smile className="w-3 h-3 mr-1" aria-hidden="true" /> Facile</span> : difficulty === 'medium' ? <span className="flex items-center justify-center"><Meh className="w-3 h-3 mr-1" aria-hidden="true" /> Moyen</span> : <span className="flex items-center justify-center"><Frown className="w-3 h-3 mr-1" aria-hidden="true" /> Difficile</span>}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['expert', 'legend'] as const).map((difficulty) => (
                    <button
                      key={difficulty}
                      onClick={() => onSetSimDifficulty(difficulty)}
                      aria-pressed={simDifficulty === difficulty}
                      className={`py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all duration-300 focus-visible-ring ${simDifficulty === difficulty
                        ? (difficulty === 'legend' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg')
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                    >
                      {difficulty === 'expert' ? <span className="flex items-center justify-center"><Flame className="w-3 h-3 mr-1" aria-hidden="true" /> Expert</span> : <span className="flex items-center justify-center"><Crown className="w-3 h-3 mr-1" aria-hidden="true" /> Légende</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto/Manual Mode */}
              <div className="bg-white/5 border border-purple-500/20 rounded-xl p-3">
                <label className="text-xs font-bold text-purple-400 uppercase mb-2 flex items-center">
                  <Gamepad2 className="w-3 h-3 mr-1" aria-hidden="true" /> Mode
                </label>
                <button
                  onClick={onToggleSimAuto}
                  aria-pressed={isSimAuto}
                  className={`w-full py-2 rounded-lg font-bold text-xs transition-all duration-300 focus-visible-ring ${isSimAuto
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50'
                    }`}
                >
                  {isSimAuto ? <span className="flex items-center justify-center"><Bot className="w-4 h-4 mr-2" aria-hidden="true" /> IA Auto (IA vs IA)</span> : <span className="flex items-center justify-center"><Gamepad2 className="w-4 h-4 mr-2" aria-hidden="true" /> Manuel (Vous jouez)</span>}
                </button>
              </div>

              {/* Board Actions */}
              <div className="bg-white/5 border border-purple-500/20 rounded-xl p-3">
                <label className="text-xs font-bold text-purple-400 uppercase mb-2 flex items-center">
                  <Wrench className="w-3 h-3 mr-1" aria-hidden="true" /> Plateau
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={onClearBoard}
                    className="py-1.5 bg-white/10 hover:bg-red-900/50 text-white rounded-lg font-semibold text-[10px] transition-all duration-300 border-glow-red focus-visible-ring"
                  >
                    <span className="flex items-center justify-center"><Trash2 className="w-3 h-3 mr-1" aria-hidden="true" /> Vider</span>
                  </button>
                  <button
                    onClick={onResetBoard}
                    className="py-1.5 bg-white/10 hover:bg-blue-900/50 text-white rounded-lg font-semibold text-[10px] transition-all duration-300 border-glow-blue focus-visible-ring"
                  >
                    <span className="flex items-center justify-center"><RotateCcw className="w-3 h-3 mr-1" aria-hidden="true" /> Réinit</span>
                  </button>
                </div>
              </div>

              {/* Start Simulation Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onStartSimulation}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-2xl font-black text-sm shadow-2xl shadow-green-500/50 transition-all duration-300 focus-visible-ring"
              >
                <span className="flex items-center justify-center"><Rocket className="w-4 h-4 mr-2" aria-hidden="true" /> LANCER</span>
              </motion.button>

              {/* Calibration Tool Button */}
              {onOpenCalibration && (
                <button
                  onClick={onOpenCalibration}
                  className="w-full py-2 bg-white/10 hover:bg-purple-900/50 text-purple-300 hover:text-white rounded-2xl font-bold text-xs transition-all duration-300 border-glow-purple focus-visible-ring"
                >
                  <span className="flex items-center justify-center"><Target className="w-3 h-3 mr-1" aria-hidden="true" /> Calibrer le tablier</span>
                </button>
              )}

              {/* Exit Button */}
              <button
                onClick={onExit}
                className="w-full py-2 bg-white/10 hover:bg-red-900/50 text-red-300 hover:text-white rounded-2xl font-bold text-xs transition-all duration-300 border-glow-red focus-visible-ring"
              >
                <span className="flex items-center justify-center"><X className="w-3 h-3 mr-1" aria-hidden="true" /> Quitter</span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="running"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {/* Status Badge */}
              <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/50 rounded-xl p-3 text-center">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-xs font-black text-purple-400"
                >
                  <span className="flex items-center justify-center"><Zap className="w-3 h-3 mr-1" aria-hidden="true" /> ACTIVE</span>
                </motion.div>
              </div>

              {/* Auto/Manual Toggle */}
              <div className="bg-white/5 border border-purple-500/20 rounded-xl p-3">
                <label className="text-xs font-bold text-purple-400 uppercase mb-2 flex items-center">
                  <Gamepad2 className="w-3 h-3 mr-1" aria-hidden="true" /> Mode
                </label>
                <button
                  onClick={onToggleSimAuto}
                  aria-pressed={isSimAuto}
                  className={`w-full py-2 rounded-lg font-bold text-xs transition-all duration-300 focus-visible-ring ${isSimAuto
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50'
                    }`}
                >
                  {isSimAuto ? <span className="flex items-center justify-center"><Bot className="w-4 h-4 mr-2" aria-hidden="true" /> IA Auto</span> : <span className="flex items-center justify-center"><Gamepad2 className="w-4 h-4 mr-2" aria-hidden="true" /> Manuel</span>}
                </button>
              </div>

              {/* Restart Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onRestartSimulation}
                className="w-full py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500 text-white rounded-2xl font-bold text-xs shadow-lg shadow-blue-500/50 transition-all duration-300 flex items-center justify-center gap-2 focus-visible-ring"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recommencer
              </motion.button>

              {/* Stop Button */}
              <button
                onClick={onExit}
                className="w-full py-2 bg-white/10 hover:bg-red-900/50 text-red-300 hover:text-white rounded-2xl font-bold text-xs transition-all duration-300 border-glow-red focus-visible-ring"
              >
                <span className="flex items-center justify-center"><X className="w-3 h-3 mr-1" aria-hidden="true" /> Arrêter</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default SimulationControlPanel;
