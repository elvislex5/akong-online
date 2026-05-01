import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Crown, Flame, Frown, Gamepad2, Meh, Smile,
  Rocket, RotateCcw, Trash2, Target, Turtle, X, Zap,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
} from 'lucide-react';
import { Player, GameStatus, AIDifficulty } from '../types';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface SimulationControlPanelProps {
  gameStatus: GameStatus;
  currentPlayer: Player;
  simSpeed: 'slow' | 'normal' | 'fast';
  simDifficultyP1: AIDifficulty;
  simDifficultyP2: AIDifficulty;
  isSimAuto: boolean;
  isSimContinuous: boolean;
  onSetCurrentPlayer: (player: Player) => void;
  onSetSimSpeed: (speed: 'slow' | 'normal' | 'fast') => void;
  onSetSimDifficultyP1: (difficulty: AIDifficulty) => void;
  onSetSimDifficultyP2: (difficulty: AIDifficulty) => void;
  onToggleSimAuto: () => void;
  onToggleSimContinuous: () => void;
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
  simDifficultyP1,
  simDifficultyP2,
  isSimAuto,
  isSimContinuous,
  onSetCurrentPlayer,
  onSetSimSpeed,
  onSetSimDifficultyP1,
  onSetSimDifficultyP2,
  onToggleSimAuto,
  onToggleSimContinuous,
  onStartSimulation,
  onRestartSimulation,
  onClearBoard,
  onResetBoard,
  onExit,
  onOpenCalibration,
}) => {
  const isSetup = gameStatus === GameStatus.Setup;
  const panelRef = useFocusTrap<HTMLDivElement>(true);
  const [collapsed, setCollapsed] = React.useState(false);
  const [activeAITab, setActiveAITab] = React.useState<Player>(Player.One);

  const activeDiff = activeAITab === Player.One ? simDifficultyP1 : simDifficultyP2;
  const setActiveDiff = (d: AIDifficulty) =>
    activeAITab === Player.One ? onSetSimDifficultyP1(d) : onSetSimDifficultyP2(d);

  return (
    <>
      {/* Toggle handle — lives OUTSIDE the panel so it never slides off-screen.
          Position animates between the panel edge (expanded) and screen edge (collapsed). */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Ouvrir le panneau Labo' : 'Réduire le panneau Labo'}
        title={collapsed ? 'Ouvrir le panneau Labo' : 'Réduire le panneau Labo'}
        aria-expanded={!collapsed}
        className={
          'fixed z-50 inline-flex items-center justify-center ' +
          'bg-surface border border-rule shadow-md ' +
          'text-ink-muted hover:text-ink hover:border-accent ' +
          'transition-[right,bottom,color,border-color] duration-300 ease-out ' +
          // Mobile: handle is a horizontal tab (12 wide × 7 tall), centered horizontally
          'left-1/2 -translate-x-1/2 w-12 h-7 ' +
          // Desktop: handle becomes a vertical tab (7 wide × 12 tall), positioned mid-height
          'sm:left-auto sm:translate-x-0 sm:top-1/2 sm:-translate-y-1/2 sm:w-7 sm:h-12 ' +
          // State-conditional position
          (collapsed
            ? 'bottom-0 sm:bottom-auto sm:right-0'
            : 'bottom-[min(70vh,calc(70vh-1px))] sm:bottom-auto sm:right-80')
        }
      >
        {/* Icon orientation depends on viewport + state */}
        <span className="sm:hidden" aria-hidden="true">
          {collapsed ? <ChevronUp size={14} strokeWidth={1.75} /> : <ChevronDown size={14} strokeWidth={1.75} />}
        </span>
        <span className="hidden sm:inline" aria-hidden="true">
          {collapsed ? <ChevronLeft size={14} strokeWidth={1.75} /> : <ChevronRight size={14} strokeWidth={1.75} />}
        </span>
      </button>

    <motion.div
      initial={{ x: 320, y: 0 }}
      animate={{
        x: collapsed ? (typeof window !== 'undefined' && window.innerWidth < 640 ? 0 : 320) : 0,
        y: collapsed ? (typeof window !== 'undefined' && window.innerWidth < 640 ? 600 : 0) : 0,
      }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      ref={panelRef}
      role="dialog"
      aria-label="Panneau de contrôle de simulation"
      aria-hidden={collapsed}
      className="fixed z-40 flex flex-col bg-surface border-rule shadow-lg
                 inset-x-0 bottom-0 max-h-[70vh] border-t
                 sm:inset-x-auto sm:right-0 sm:top-14 sm:bottom-0 sm:w-80 sm:max-h-none sm:border-t-0 sm:border-l"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        pointerEvents: collapsed ? 'none' : 'auto',
      }}
    >

      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-rule">
        <p className="kicker">Labo · simulation</p>
        <h2
          className="font-display text-2xl text-ink mt-1"
          style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30' }}
        >
          {isSetup ? 'Configuration' : 'En cours'}
        </h2>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        <AnimatePresence mode="wait">
          {isSetup ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Starting player */}
              <Field icon={Zap} label="Qui commence ?">
                <div className="grid grid-cols-2 gap-px bg-rule border border-rule">
                  <Toggle
                    active={currentPlayer === Player.One}
                    onClick={() => onSetCurrentPlayer(Player.One)}
                    label="Joueur bas"
                  />
                  <Toggle
                    active={currentPlayer === Player.Two}
                    onClick={() => onSetCurrentPlayer(Player.Two)}
                    label="Joueur haut"
                  />
                </div>
              </Field>

              {/* Speed */}
              <Field icon={Zap} label="Vitesse">
                <div className="grid grid-cols-3 gap-px bg-rule border border-rule">
                  <Toggle
                    active={simSpeed === 'slow'}
                    onClick={() => onSetSimSpeed('slow')}
                    icon={Turtle}
                    label="Lent"
                  />
                  <Toggle
                    active={simSpeed === 'normal'}
                    onClick={() => onSetSimSpeed('normal')}
                    icon={Zap}
                    label="Normal"
                  />
                  <Toggle
                    active={simSpeed === 'fast'}
                    onClick={() => onSetSimSpeed('fast')}
                    icon={Rocket}
                    label="Rapide"
                  />
                </div>
              </Field>

              {/* AI difficulty (with P1/P2 tab) */}
              <Field icon={Bot} label="Niveau IA">
                <div className="flex items-center justify-between mb-2 -mt-1">
                  <span className="text-xs text-ink-subtle">
                    {activeAITab === Player.One ? 'Joueur bas' : 'Joueur haut'}
                  </span>
                  <div className="inline-flex border border-rule">
                    <button
                      type="button"
                      onClick={() => setActiveAITab(Player.One)}
                      className={
                        'px-2 h-6 text-[10px] font-medium tracking-wider uppercase transition-colors duration-150 ' +
                        (activeAITab === Player.One
                          ? 'bg-accent text-accent-ink'
                          : 'text-ink-muted hover:text-ink hover:bg-canvas')
                      }
                    >
                      Bas
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAITab(Player.Two)}
                      className={
                        'px-2 h-6 text-[10px] font-medium tracking-wider uppercase transition-colors duration-150 ' +
                        (activeAITab === Player.Two
                          ? 'bg-accent text-accent-ink'
                          : 'text-ink-muted hover:text-ink hover:bg-canvas')
                      }
                    >
                      Haut
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-px bg-rule border border-rule">
                  <Toggle active={activeDiff === 'easy'} onClick={() => setActiveDiff('easy')} icon={Smile} label="Facile" />
                  <Toggle active={activeDiff === 'medium'} onClick={() => setActiveDiff('medium')} icon={Meh} label="Moyen" />
                  <Toggle active={activeDiff === 'hard'} onClick={() => setActiveDiff('hard')} icon={Frown} label="Difficile" />
                </div>
                <div className="grid grid-cols-3 gap-px bg-rule border border-rule mt-px">
                  <Toggle active={activeDiff === 'expert'} onClick={() => setActiveDiff('expert')} icon={Flame} label="Expert" />
                  <Toggle active={activeDiff === 'neural'} onClick={() => setActiveDiff('neural')} icon={Bot} label="Neuronale" />
                  <Toggle active={activeDiff === 'legend'} onClick={() => setActiveDiff('legend')} icon={Crown} label="Légende" />
                </div>
              </Field>

              {/* Mode */}
              <Field icon={Gamepad2} label="Mode">
                <button
                  type="button"
                  onClick={onToggleSimAuto}
                  aria-pressed={isSimAuto}
                  className={
                    'w-full h-10 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors duration-150 ' +
                    (isSimAuto
                      ? 'bg-accent text-accent-ink hover:bg-accent-hover'
                      : 'border border-rule-strong text-ink hover:border-accent hover:text-accent')
                  }
                >
                  {isSimAuto ? <Bot size={14} strokeWidth={1.75} /> : <Gamepad2 size={14} strokeWidth={1.75} />}
                  {isSimAuto ? 'IA auto · IA contre IA' : 'Manuel · vous jouez'}
                </button>
              </Field>

              {/* Board actions */}
              <Field label="Plateau">
                <div className="grid grid-cols-2 gap-px bg-rule border border-rule">
                  <BoardAction icon={Trash2} label="Vider" onClick={onClearBoard} />
                  <BoardAction icon={RotateCcw} label="Réinit" onClick={onResetBoard} />
                </div>
              </Field>

              {/* Launch */}
              <button
                type="button"
                onClick={onStartSimulation}
                className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-md bg-accent text-accent-ink hover:bg-accent-hover text-sm font-medium tracking-wide transition-colors duration-150"
              >
                <Rocket size={14} strokeWidth={1.75} />
                Lancer la simulation
              </button>

              {/* Calibration (admin) */}
              {onOpenCalibration && (
                <button
                  type="button"
                  onClick={onOpenCalibration}
                  className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium border border-rule-strong text-ink-muted hover:text-ink hover:border-accent transition-colors duration-150"
                >
                  <Target size={14} strokeWidth={1.75} />
                  Calibrer le tablier
                </button>
              )}

              {/* Exit */}
              <button
                type="button"
                onClick={onExit}
                className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium text-danger hover:bg-danger/10 transition-colors duration-150"
              >
                <X size={14} strokeWidth={1.75} />
                Quitter
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="running"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              {/* Status */}
              <div className="border border-rule px-3 py-2 flex items-center gap-2 bg-canvas">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inset-0 bg-accent rounded-full animate-ping opacity-50" />
                  <span className="absolute inset-0 bg-accent rounded-full" />
                </span>
                <span className="kicker">Active</span>
              </div>

              {/* Mode */}
              <Field icon={Gamepad2} label="Mode">
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={onToggleSimAuto}
                    aria-pressed={isSimAuto}
                    className={
                      'w-full h-10 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors duration-150 ' +
                      (isSimAuto
                        ? 'bg-accent text-accent-ink hover:bg-accent-hover'
                        : 'border border-rule-strong text-ink hover:border-accent hover:text-accent')
                    }
                  >
                    {isSimAuto ? <Bot size={14} strokeWidth={1.75} /> : <Gamepad2 size={14} strokeWidth={1.75} />}
                    {isSimAuto ? 'IA auto' : 'Manuel'}
                  </button>

                  <button
                    type="button"
                    onClick={onToggleSimContinuous}
                    disabled={!isSimAuto}
                    aria-pressed={isSimContinuous}
                    className={
                      'w-full h-9 inline-flex items-center justify-center gap-2 rounded-md text-xs font-medium transition-colors duration-150 ' +
                      (!isSimAuto
                        ? 'opacity-40 cursor-not-allowed text-ink-subtle border border-rule'
                        : isSimContinuous
                          ? 'bg-success/10 text-success border border-success/40'
                          : 'border border-rule-strong text-ink-muted hover:text-ink hover:border-accent')
                    }
                  >
                    <Rocket size={12} strokeWidth={1.75} />
                    Boucle continue
                  </button>
                </div>
              </Field>

              {/* Restart */}
              <button
                type="button"
                onClick={onRestartSimulation}
                className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium border border-rule-strong text-ink hover:border-accent hover:text-accent transition-colors duration-150"
              >
                <RotateCcw size={14} strokeWidth={1.75} />
                Recommencer
              </button>

              {/* Stop */}
              <button
                type="button"
                onClick={onExit}
                className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium text-danger hover:bg-danger/10 transition-colors duration-150"
              >
                <X size={14} strokeWidth={1.75} />
                Arrêter
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
    </>
  );
};

export default SimulationControlPanel;

/* ----------------------------------------------------------------
   Local components
   ---------------------------------------------------------------- */

const Field: React.FC<{
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  children: React.ReactNode;
}> = ({ icon: Icon, label, children }) => (
  <div>
    <p className="kicker mb-2 inline-flex items-center gap-1.5">
      {Icon && <Icon size={11} strokeWidth={1.75} />}
      {label}
    </p>
    {children}
  </div>
);

const Toggle: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}> = ({ active, onClick, label, icon: Icon }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={
      'h-10 inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors duration-150 ' +
      (active
        ? 'bg-accent text-accent-ink'
        : 'bg-canvas text-ink-muted hover:text-ink hover:bg-surface')
    }
  >
    {Icon && <Icon size={12} strokeWidth={1.75} />}
    {label}
  </button>
);

const BoardAction: React.FC<{
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  onClick: () => void;
}> = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="h-10 bg-canvas inline-flex items-center justify-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface transition-colors duration-150"
  >
    <Icon size={12} strokeWidth={1.75} />
    {label}
  </button>
);
