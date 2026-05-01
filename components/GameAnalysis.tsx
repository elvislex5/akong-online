import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Player, GameState, GameStatus, GameSystem } from '../types';
import { executeMove, createInitialState, INITIAL_SEEDS, TOTAL_PITS } from '../services/songoLogic';
import { pitToSGN, type SGNEntry, buildSGNEntries, formatSGNText } from '../services/sgnNotation';
import {
  analyzeGame,
  type GameAnalysis as Analysis,
  type AnalyzedMove,
  type MoveGrade,
  GRADE_LABEL,
  GRADE_BG,
} from '../services/gameAnalyzer';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, Copy, Check, Sparkles } from 'lucide-react';

interface GameAnalysisProps {
  moves: number[];
  nameOne: string;
  nameTwo: string;
  onClose: () => void;
  /** System under analysis. Defaults to mgpwem (legacy callers). */
  gameSystem?: GameSystem;
}

const GRADE_GLYPH: Record<MoveGrade, string> = {
  excellent: '✓✓',
  bon: '✓',
  imprecis: '?!',
  erreur: '?',
  gaffe: '??',
};

export function GameAnalysis({ moves, nameOne, nameTwo, onClose, gameSystem = 'mgpwem' }: GameAnalysisProps) {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const cancelledRef = useRef(false);

  const initialBoard = useMemo(() => Array(TOTAL_PITS).fill(INITIAL_SEEDS), []);

  const states = useMemo(() => {
    const result: GameState[] = [createInitialState()];
    let state = createInitialState();
    for (const pitIndex of moves) {
      if (state.status === GameStatus.Finished) break;
      state = executeMove(state, pitIndex);
      result.push(state);
    }
    return result;
  }, [moves]);

  const sgnEntries = useMemo(() => buildSGNEntries(initialBoard, moves), [initialBoard, moves]);

  const sgnText = useMemo(
    () =>
      formatSGNText(sgnEntries, {
        player1: nameOne,
        player2: nameTwo,
        date: new Date().toISOString().split('T')[0],
        result: sgnEntries.length > 0 ? sgnEntries[sgnEntries.length - 1].resultText : undefined,
      }),
    [sgnEntries, nameOne, nameTwo]
  );

  const currentState = states[currentIndex + 1] || states[0];
  const totalMoves = moves.length;

  const goFirst = () => setCurrentIndex(-1);
  const goPrev = () => setCurrentIndex((i) => Math.max(-1, i - 1));
  const goNext = () => setCurrentIndex((i) => Math.min(totalMoves - 1, i + 1));
  const goLast = () => setCurrentIndex(totalMoves - 1);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Home') goFirst();
      else if (e.key === 'End') goLast();
      else if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(sgnText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const startAnalysis = async () => {
    if (analyzing || moves.length === 0) return;
    setAnalyzing(true);
    setProgress(0);
    cancelledRef.current = false;
    try {
      const result = await analyzeGame(moves, {
        gameSystem,
        depth: 7,
        timeLimitMs: 600,
        onProgress: (f) => {
          if (!cancelledRef.current) setProgress(f);
        },
      });
      if (!cancelledRef.current) setAnalysis(result);
    } catch (err) {
      console.error('[GameAnalysis] analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Cancel an in-flight analysis if the user closes the panel.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const moveRows: { num: number; p1?: SGNEntry; p2?: SGNEntry; p1Idx: number; p2Idx: number }[] = [];
  for (let i = 0; i < sgnEntries.length; i += 2) {
    moveRows.push({
      num: Math.floor(i / 2) + 1,
      p1: sgnEntries[i],
      p2: sgnEntries[i + 1],
      p1Idx: i,
      p2Idx: i + 1,
    });
  }

  // Quick lookup: ply → graded move. Sparse if analysis hasn't run.
  const gradeByPly = useMemo(() => {
    const m = new Map<number, AnalyzedMove>();
    if (analysis) for (const am of analysis.moves) m.set(am.ply, am);
    return m;
  }, [analysis]);

  const currentGrade = currentIndex >= 0 ? gradeByPly.get(currentIndex) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-canvas flex flex-col"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      autoFocus
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-rule">
        <div>
          <p className="kicker">Analyse</p>
          <p className="text-sm text-ink-muted">
            {nameOne} <span className="text-ink-subtle">vs</span> {nameTwo}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copier la notation SGN"
            title="Copier SGN"
            className="inline-flex items-center justify-center w-9 h-9 text-ink-muted hover:text-ink hover:bg-surface transition-colors duration-150"
          >
            {copied ? <Check size={16} strokeWidth={1.75} className="text-success" /> : <Copy size={16} strokeWidth={1.75} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex items-center justify-center w-9 h-9 text-ink-muted hover:text-ink hover:bg-surface transition-colors duration-150"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Board side */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Player Two */}
          <div className="text-center mb-4">
            <p className="kicker">{nameTwo}</p>
            <p
              className="font-display tabular-nums text-ink mt-1"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30', fontSize: '1.5rem' }}
            >
              {currentState.scores[Player.Two]}
            </p>
            {analysis && (
              <p className="kicker mt-1 text-[10px]">Précision {analysis.accuracy[Player.Two]}%</p>
            )}
          </div>

          {/* Board */}
          <div className="w-full max-w-lg border border-rule bg-surface p-3">
            {/* Top row: pits 13..7 */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {[13, 12, 11, 10, 9, 8, 7].map((idx) => (
                <Cell
                  key={idx}
                  idx={idx}
                  value={currentState.board[idx]}
                  highlighted={currentIndex >= 0 && moves[currentIndex] === idx}
                  bestHint={currentGrade && !currentGrade.isBest && currentGrade.bestMoveIndex === idx}
                  sgnAbove
                />
              ))}
            </div>
            {/* Bottom row: pits 0..6 */}
            <div className="grid grid-cols-7 gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
                <Cell
                  key={idx}
                  idx={idx}
                  value={currentState.board[idx]}
                  highlighted={currentIndex >= 0 && moves[currentIndex] === idx}
                  bestHint={currentGrade && !currentGrade.isBest && currentGrade.bestMoveIndex === idx}
                />
              ))}
            </div>
          </div>

          {/* Player One */}
          <div className="text-center mt-4">
            <p className="kicker">{nameOne}</p>
            <p
              className="font-display tabular-nums text-ink mt-1"
              style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30', fontSize: '1.5rem' }}
            >
              {currentState.scores[Player.One]}
            </p>
            {analysis && (
              <p className="kicker mt-1 text-[10px]">Précision {analysis.accuracy[Player.One]}%</p>
            )}
          </div>

          {/* Move info */}
          <div className="mt-6 text-center text-sm">
            {currentIndex >= 0 ? (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="text-ink-subtle">
                  Coup {currentIndex + 1} / {totalMoves}
                </span>
                <span className="text-ink font-medium font-mono">{sgnEntries[currentIndex]?.label}</span>
                {(sgnEntries[currentIndex]?.captured ?? 0) > 0 && (
                  <span className="text-success">+{sgnEntries[currentIndex].captured}</span>
                )}
                {currentGrade && (
                  <span
                    className={
                      'text-[11px] font-medium px-2 py-0.5 rounded-sm border ' + GRADE_BG[currentGrade.grade]
                    }
                  >
                    {GRADE_LABEL[currentGrade.grade]}
                    {!currentGrade.isBest && currentGrade.bestMoveIndex >= 0 && (
                      <span className="ml-1 opacity-70 font-mono">
                        (mieux : {pitToSGN(currentGrade.bestMoveIndex)})
                      </span>
                    )}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-ink-subtle">Position initiale</span>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1 mt-6">
            <NavButton onClick={goFirst} disabled={currentIndex === -1} aria-label="Premier coup">
              <ChevronsLeft size={16} strokeWidth={1.75} />
            </NavButton>
            <NavButton onClick={goPrev} disabled={currentIndex === -1} aria-label="Coup précédent">
              <ChevronLeft size={16} strokeWidth={1.75} />
            </NavButton>
            <span className="text-ink-subtle font-mono text-xs tabular-nums min-w-[80px] text-center">
              {currentIndex + 1} / {totalMoves}
            </span>
            <NavButton onClick={goNext} disabled={currentIndex >= totalMoves - 1} aria-label="Coup suivant">
              <ChevronRight size={16} strokeWidth={1.75} />
            </NavButton>
            <NavButton onClick={goLast} disabled={currentIndex >= totalMoves - 1} aria-label="Dernier coup">
              <ChevronsRight size={16} strokeWidth={1.75} />
            </NavButton>
          </div>
          <p className="text-ink-subtle text-xs mt-2">Utilisez ← / → pour naviguer.</p>
        </div>

        {/* Move list sidebar */}
        <aside className="lg:w-80 border-t lg:border-t-0 lg:border-l border-rule flex flex-col max-h-[45vh] lg:max-h-full">
          {/* Analyze button OR summary panel */}
          {!analysis && !analyzing && moves.length > 0 && (
            <div className="px-3 py-3 border-b border-rule">
              <button
                type="button"
                onClick={startAnalysis}
                className="w-full inline-flex items-center justify-center gap-2 h-9 px-3 rounded-md bg-accent text-accent-ink hover:bg-accent-hover text-xs font-medium tracking-wide transition-colors duration-150"
              >
                <Sparkles size={14} strokeWidth={1.75} />
                Analyser la partie
              </button>
              <p className="text-[10px] text-ink-subtle text-center mt-1.5 leading-snug">
                Évaluation IA coup par coup. ~{Math.max(10, Math.ceil(moves.length * 0.6))}s.
              </p>
            </div>
          )}
          {analyzing && (
            <div className="px-3 py-3 border-b border-rule">
              <p className="text-xs text-ink-muted text-center mb-2">Analyse en cours…</p>
              <div className="h-1.5 bg-surface overflow-hidden rounded-sm">
                <div
                  className="h-full bg-accent transition-all duration-150"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-ink-subtle text-center mt-1.5 tabular-nums">
                {Math.round(progress * 100)}%
              </p>
            </div>
          )}
          {analysis && (
            <div className="px-3 py-3 border-b border-rule">
              <p className="kicker mb-2">Résumé</p>
              <SummaryRow name={nameOne} accuracy={analysis.accuracy[Player.One]} counts={analysis.counts[Player.One]} />
              <div className="h-2" />
              <SummaryRow name={nameTwo} accuracy={analysis.accuracy[Player.Two]} counts={analysis.counts[Player.Two]} />
            </div>
          )}

          {/* Move list */}
          <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 px-3 py-2 border-b border-rule">
            <span className="kicker text-[10px]">#</span>
            <span className="kicker text-[10px] truncate" title={nameOne}>{nameOne}</span>
            <span className="kicker text-[10px] truncate" title={nameTwo}>{nameTwo}</span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {moveRows.map((row) => (
              <div key={row.num} className="grid grid-cols-[2rem_1fr_1fr] gap-1 px-3 py-0.5">
                <span className="text-ink-subtle font-mono text-xs leading-6">{row.num}.</span>
                <MoveButton
                  entry={row.p1}
                  ply={row.p1Idx}
                  active={currentIndex === row.p1Idx}
                  graded={gradeByPly.get(row.p1Idx)}
                  onClick={() => row.p1 && setCurrentIndex(row.p1Idx)}
                />
                <MoveButton
                  entry={row.p2}
                  ply={row.p2Idx}
                  active={currentIndex === row.p2Idx}
                  graded={gradeByPly.get(row.p2Idx)}
                  onClick={() => row.p2 && setCurrentIndex(row.p2Idx)}
                />
              </div>
            ))}
          </div>
          {sgnEntries.length > 0 && sgnEntries[sgnEntries.length - 1].resultText && (
            <div className="px-3 py-2 border-t border-rule text-center">
              <span className="text-sm font-medium text-ink italic font-display" style={{ fontVariationSettings: '"opsz" 14, "SOFT" 50' }}>
                {sgnEntries[sgnEntries.length - 1].resultText}
              </span>
            </div>
          )}
        </aside>
      </div>
    </motion.div>
  );
}

const Cell: React.FC<{
  idx: number;
  value: number;
  highlighted: boolean;
  bestHint?: boolean | null;
  sgnAbove?: boolean;
}> = ({ idx, value, highlighted, bestHint, sgnAbove }) => {
  // Three-state visual: played highlight wins, then best-hint, then idle.
  const cls = [
    'aspect-square flex flex-col items-center justify-center rounded-sm',
    highlighted
      ? 'bg-accent/15 border border-accent'
      : bestHint
        ? 'bg-emerald-50 border border-emerald-400 border-dashed'
        : 'bg-canvas border border-rule',
  ].join(' ');
  const sgn = (
    <span className="text-[10px] text-ink-subtle leading-none tracking-wider uppercase">
      {pitToSGN(idx)}
    </span>
  );
  return (
    <div className={cls}>
      {sgnAbove && sgn}
      <span
        className={
          'font-display tabular-nums leading-none ' + (value === 0 ? 'text-ink-subtle' : 'text-ink')
        }
        style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30', fontSize: '1.125rem' }}
      >
        {value}
      </span>
      {!sgnAbove && sgn}
    </div>
  );
};

const NavButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  'aria-label': string;
  children: React.ReactNode;
}> = ({ onClick, disabled, 'aria-label': ariaLabel, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className="inline-flex items-center justify-center w-9 h-9 text-ink-muted hover:text-ink hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors duration-150"
  >
    {children}
  </button>
);

const MoveButton: React.FC<{
  entry?: SGNEntry;
  ply: number;
  active: boolean;
  graded?: AnalyzedMove;
  onClick: () => void;
}> = ({ entry, active, graded, onClick }) => {
  if (!entry) return <span />;
  const baseColor =
    active
      ? 'bg-accent/15 text-accent rounded-sm font-medium'
      : entry.captured > 0
        ? 'text-success hover:bg-canvas'
        : 'text-ink-muted hover:bg-canvas';
  return (
    <button
      type="button"
      onClick={onClick}
      className={'flex items-center justify-between gap-1 text-left font-mono text-xs px-1.5 py-0.5 leading-5 transition-colors duration-150 ' + baseColor}
    >
      <span>{entry.label}</span>
      {graded && (
        <span
          className={'text-[10px] font-bold ' + GRADE_BG[graded.grade].split(' ').filter(c => c.startsWith('text-')).join(' ')}
          title={GRADE_LABEL[graded.grade]}
        >
          {GRADE_GLYPH[graded.grade]}
        </span>
      )}
    </button>
  );
};

const SummaryRow: React.FC<{
  name: string;
  accuracy: number;
  counts: Record<MoveGrade, number>;
}> = ({ name, accuracy, counts }) => (
  <div>
    <div className="flex items-baseline justify-between mb-1">
      <span className="text-xs text-ink-muted truncate">{name}</span>
      <span className="text-sm font-display tabular-nums text-ink" style={{ fontVariationSettings: '"opsz" 14, "SOFT" 30' }}>
        {accuracy}%
      </span>
    </div>
    <div className="flex gap-1 text-[10px]">
      {(['excellent', 'bon', 'imprecis', 'erreur', 'gaffe'] as MoveGrade[]).map((g) =>
        counts[g] > 0 ? (
          <span key={g} className={'px-1.5 py-0.5 rounded-sm border ' + GRADE_BG[g]}>
            {counts[g]} {GRADE_GLYPH[g]}
          </span>
        ) : null
      )}
    </div>
  </div>
);
