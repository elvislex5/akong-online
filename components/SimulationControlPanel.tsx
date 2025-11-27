import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, GameStatus } from '../types';
import { FlaskConical, Turtle, Zap, Rocket, Bot, Smile, Meh, Frown, Gamepad2, Wrench, Trash2, RotateCcw, Target, X } from 'lucide-react';

interface SimulationControlPanelProps {
  gameStatus: GameStatus;
  currentPlayer: Player;
  simSpeed: 'slow' | 'normal' | 'fast';
  simDifficulty: 'easy' | 'medium' | 'hard';
  isSimAuto: boolean;
  onSetCurrentPlayer: (player: Player) => void;
  onSetSimSpeed: (speed: 'slow' | 'normal' | 'fast') => void;
  onSetSimDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void;
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

  return (
    <motion.div
      initial={{ x: 300 }}
      animate={{ x: 0 }}
      exit={{ x: 300 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed right-0 top-20 bottom-0 w-80 bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border-l-2 border-purple-500/30 shadow-2xl z-40 flex flex-col"
    >
      {/* Subtle glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 pointer-events-none rounded-l-3xl"></div>

      <div className="relative z-10 p-4 space-y-4 overflow-y-auto flex-1">
        {/* Header */}
        <div className="text-center flex-shrink-0">
          <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 mb-1 flex items-center justify-center">
            <FlaskConical className="w-6 h-6 mr-2 text-purple-400" /> LABO
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
                  <Zap className="w-3 h-3 mr-1" /> Qui commence ?
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => onSetCurrentPlayer(Player.One)}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all duration-300 ${currentPlayer === Player.One
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/50'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                  >
                    Joueur BAS
                  </button>
                  <button
                    onClick={() => onSetCurrentPlayer(Player.Two)}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all duration-300 ${currentPlayer === Player.Two
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
                  <Zap className="w-3 h-3 mr-1" /> Vitesse
                </label>
                <div className="flex gap-1.5">
                  {(['slow', 'normal', 'fast'] as const).map((speed) => (
                    <button
                      key={speed}
                      onClick={() => onSetSimSpeed(speed)}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all duration-300 ${simSpeed === speed
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                    >
                      {speed === 'slow' ? <span className="flex items-center justify-center"><Turtle className="w-3 h-3 mr-1" /> Lent</span> : speed === 'normal' ? <span className="flex items-center justify-center"><Zap className="w-3 h-3 mr-1" /> Normal</span> : <span className="flex items-center justify-center"><Rocket className="w-3 h-3 mr-1" /> Rapide</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Difficulty */}
              <div className="bg-white/5 border border-purple-500/20 rounded-xl p-3">
                <label className="text-xs font-bold text-purple-400 uppercase mb-2 flex items-center">
                  <Bot className="w-3 h-3 mr-1" /> Niveau IA
                </label>
                <div className="flex gap-1.5">
                  {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
                    <button
                      key={difficulty}
                      onClick={() => onSetSimDifficulty(difficulty)}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] uppercase transition-all duration-300 ${simDifficulty === difficulty
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                    >
                      {difficulty === 'easy' ? <span className="flex items-center justify-center"><Smile className="w-3 h-3 mr-1" /> Facile</span> : difficulty === 'medium' ? <span className="flex items-center justify-center"><Meh className="w-3 h-3 mr-1" /> Moyen</span> : <span className="flex items-center justify-center"><Frown className="w-3 h-3 mr-1" /> Difficile</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto/Manual Mode */}
              <div className="bg-white/5 border border-purple-500/20 rounded-xl p-3">
                <label className="text-xs font-bold text-purple-400 uppercase mb-2 flex items-center">
                  <Gamepad2 className="w-3 h-3 mr-1" /> Mode
                </label>
                <button
                  onClick={onToggleSimAuto}
                  className={`w-full py-2 rounded-lg font-bold text-xs transition-all duration-300 ${isSimAuto
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50'
                    }`}
                >
                  {isSimAuto ? <span className="flex items-center justify-center"><Bot className="w-4 h-4 mr-2" /> IA Auto (IA vs IA)</span> : <span className="flex items-center justify-center"><Gamepad2 className="w-4 h-4 mr-2" /> Manuel (Vous jouez)</span>}
                </button>
              </div>

              {/* Board Actions */}
              <div className="bg-white/5 border border-purple-500/20 rounded-xl p-3">
                <label className="text-xs font-bold text-purple-400 uppercase mb-2 flex items-center">
                  <Wrench className="w-3 h-3 mr-1" /> Plateau
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={onClearBoard}
                    className="py-1.5 bg-white/10 hover:bg-red-900/50 text-white rounded-lg font-semibold text-[10px] transition-all duration-300 border border-red-500/30 hover:border-red-500/60"
                  >
                    <span className="flex items-center justify-center"><Trash2 className="w-3 h-3 mr-1" /> Vider</span>
                  </button>
                  <button
                    onClick={onResetBoard}
                    className="py-1.5 bg-white/10 hover:bg-blue-900/50 text-white rounded-lg font-semibold text-[10px] transition-all duration-300 border border-blue-500/30 hover:border-blue-500/60"
                  >
                    <span className="flex items-center justify-center"><RotateCcw className="w-3 h-3 mr-1" /> Réinit</span>
                  </button>
                </div>
              </div>

              {/* Start Simulation Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onStartSimulation}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-xl font-black text-sm shadow-2xl shadow-green-500/50 transition-all duration-300"
              >
                <span className="flex items-center justify-center"><Rocket className="w-4 h-4 mr-2" /> LANCER</span>
              </motion.button>

              {/* Calibration Tool Button */}
              {onOpenCalibration && (
                <button
                  onClick={onOpenCalibration}
                  className="w-full py-2 bg-white/10 hover:bg-purple-900/50 text-purple-300 hover:text-white rounded-xl font-bold text-xs transition-all duration-300 border border-purple-500/30 hover:border-purple-500/60"
                >
                  <span className="flex items-center justify-center"><Target className="w-3 h-3 mr-1" /> Calibrer le tablier</span>
                </button>
              )}

              {/* Exit Button */}
              <button
                onClick={onExit}
                className="w-full py-2 bg-white/10 hover:bg-red-900/50 text-red-300 hover:text-white rounded-xl font-bold text-xs transition-all duration-300 border border-red-500/30 hover:border-red-500/60"
              >
                <span className="flex items-center justify-center"><X className="w-3 h-3 mr-1" /> Quitter</span>
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
                  <span className="flex items-center justify-center"><Zap className="w-3 h-3 mr-1" /> ACTIVE</span>
                </motion.div>
              </div>

              {/* Auto/Manual Toggle */}
              <div className="bg-white/5 border border-purple-500/20 rounded-xl p-3">
                <label className="text-xs font-bold text-purple-400 uppercase mb-2 flex items-center">
                  <Gamepad2 className="w-3 h-3 mr-1" /> Mode
                </label>
                <button
                  onClick={onToggleSimAuto}
                  className={`w-full py-2 rounded-lg font-bold text-xs transition-all duration-300 ${isSimAuto
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50'
                    }`}
                >
                  {isSimAuto ? <span className="flex items-center justify-center"><Bot className="w-4 h-4 mr-2" /> IA Auto</span> : <span className="flex items-center justify-center"><Gamepad2 className="w-4 h-4 mr-2" /> Manuel</span>}
                </button>
              </div>

              {/* Restart Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onRestartSimulation}
                className="w-full py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/50 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Recommencer
              </motion.button>

              {/* Stop Button */}
              <button
                onClick={onExit}
                className="w-full py-2 bg-white/10 hover:bg-red-900/50 text-red-300 hover:text-white rounded-xl font-bold text-xs transition-all duration-300 border border-red-500/30 hover:border-red-500/60"
              >
                <span className="flex items-center justify-center"><X className="w-3 h-3 mr-1" /> Arrêter</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default SimulationControlPanel;
