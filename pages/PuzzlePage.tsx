import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Puzzle, ArrowLeft, CheckCircle, XCircle, Lightbulb, RotateCcw, ChevronRight, Calendar } from 'lucide-react';
import { getPuzzles, getDailyPuzzle, checkPuzzleAnswer, type Puzzle as PuzzleType } from '../services/puzzleService';
import { pitToSGN } from '../services/sgnNotation';
import { isValidMove } from '../services/songoLogic';
import { Player, GameStatus } from '../types';

const PuzzlePage = () => {
  const puzzles = useMemo(() => getPuzzles(), []);
  const dailyPuzzle = useMemo(() => getDailyPuzzle(), []);
  const dailyIdx = useMemo(() => puzzles.findIndex(p => p.id === dailyPuzzle.id), [puzzles, dailyPuzzle]);
  const [currentIdx, setCurrentIdx] = useState(() => dailyIdx >= 0 ? dailyIdx : 0);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [solved, setSolved] = useState<Set<string>>(new Set());

  const puzzle = puzzles[currentIdx];

  const handlePitClick = (pitIndex: number) => {
    if (result !== null) return;

    const state = {
      board: [...puzzle.board],
      scores: { [Player.One]: puzzle.scores[0], [Player.Two]: puzzle.scores[1] },
      currentPlayer: puzzle.currentPlayer,
      status: GameStatus.Playing as GameStatus,
      winner: null,
      message: '',
      isSolidarityMode: false,
      solidarityBeneficiary: null,
    };

    const validation = isValidMove(state, pitIndex);
    if (!validation.valid) return;

    const { correct } = checkPuzzleAnswer(puzzle, pitIndex);
    setResult(correct ? 'correct' : 'wrong');
    if (correct) {
      setSolved(prev => new Set(prev).add(puzzle.id));
    }
  };

  const goNext = () => {
    if (currentIdx < puzzles.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setResult(null);
      setShowHint(false);
    }
  };

  const retry = () => {
    setResult(null);
    setShowHint(false);
  };

  const playerIndices = puzzle.currentPlayer === Player.One ? [0, 1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12, 13];
  const difficultyColors = { easy: 'text-green-400 bg-green-500/20', medium: 'text-amber-400 bg-amber-500/20', hard: 'text-red-400 bg-red-500/20' };
  const difficultyLabels = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Retour
          </Link>
          <div className="text-gray-400 text-sm">
            {solved.size}/{puzzles.length} résolus
          </div>
        </div>

        {/* Puzzle du jour banner */}
        {puzzle.id === dailyPuzzle.id && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-bold">Puzzle du jour</span>
          </div>
        )}

        {/* Puzzle info */}
        <motion.div
          key={puzzle.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <Puzzle className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl font-bold text-white">{puzzle.title}</h1>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${difficultyColors[puzzle.difficulty]}`}>
              {difficultyLabels[puzzle.difficulty]}
            </span>
          </div>
          <p className="text-gray-300 text-sm">{puzzle.description}</p>
          <p className="text-gray-500 text-xs mt-1">
            Au tour de {puzzle.currentPlayer === Player.One ? 'Joueur 1 (bas)' : 'Joueur 2 (haut)'}
            {' — '}Score: {puzzle.scores[0]} - {puzzle.scores[1]}
          </p>
        </motion.div>

        {/* Board */}
        <div className="mb-6">
          {/* Top row: Player Two */}
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {[13, 12, 11, 10, 9, 8, 7].map(idx => {
              const isPlayable = puzzle.currentPlayer === Player.Two && puzzle.board[idx] > 0 && result === null;
              return (
                <button
                  key={idx}
                  onClick={() => isPlayable && handlePitClick(idx)}
                  disabled={!isPlayable}
                  className={`
                    aspect-square rounded-xl flex flex-col items-center justify-center transition-all
                    ${isPlayable ? 'bg-amber-900/50 border-2 border-amber-600 hover:bg-amber-800/60 cursor-pointer active:scale-95' : 'bg-gray-800 border border-gray-700'}
                    ${result === 'correct' && idx === puzzle.bestMove ? 'ring-2 ring-green-400 bg-green-500/20' : ''}
                    ${result === 'wrong' && idx === puzzle.bestMove ? 'ring-2 ring-green-400 bg-green-500/20' : ''}
                  `}
                >
                  <span className="text-[10px] text-gray-500">{pitToSGN(idx)}</span>
                  <span className={`text-lg font-bold ${puzzle.board[idx] === 0 ? 'text-gray-600' : 'text-white'}`}>
                    {puzzle.board[idx]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom row: Player One */}
          <div className="grid grid-cols-7 gap-1.5">
            {[0, 1, 2, 3, 4, 5, 6].map(idx => {
              const isPlayable = puzzle.currentPlayer === Player.One && puzzle.board[idx] > 0 && result === null;
              return (
                <button
                  key={idx}
                  onClick={() => isPlayable && handlePitClick(idx)}
                  disabled={!isPlayable}
                  className={`
                    aspect-square rounded-xl flex flex-col items-center justify-center transition-all
                    ${isPlayable ? 'bg-blue-900/50 border-2 border-blue-600 hover:bg-blue-800/60 cursor-pointer active:scale-95' : 'bg-gray-800 border border-gray-700'}
                    ${result === 'correct' && idx === puzzle.bestMove ? 'ring-2 ring-green-400 bg-green-500/20' : ''}
                    ${result === 'wrong' && idx === puzzle.bestMove ? 'ring-2 ring-green-400 bg-green-500/20' : ''}
                  `}
                >
                  <span className={`text-lg font-bold ${puzzle.board[idx] === 0 ? 'text-gray-600' : 'text-white'}`}>
                    {puzzle.board[idx]}
                  </span>
                  <span className="text-[10px] text-gray-500">{pitToSGN(idx)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Result feedback */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-6 p-4 rounded-xl border ${result === 'correct' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {result === 'correct' ? (
                  <><CheckCircle className="w-5 h-5 text-green-400" /><span className="text-green-400 font-bold">Correct !</span></>
                ) : (
                  <><XCircle className="w-5 h-5 text-red-400" /><span className="text-red-400 font-bold">Incorrect</span></>
                )}
              </div>
              <p className="text-gray-300 text-sm">
                {result === 'correct'
                  ? puzzle.explanation
                  : `Le bon coup était ${pitToSGN(puzzle.bestMove)}. ${puzzle.explanation}`
                }
              </p>
              <div className="flex gap-2 mt-3">
                {result === 'wrong' && (
                  <button onClick={retry} className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors">
                    <RotateCcw className="w-4 h-4" /> Réessayer
                  </button>
                )}
                {currentIdx < puzzles.length - 1 && (
                  <button onClick={goNext} className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-lg text-white text-sm transition-colors">
                    Suivant <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint button */}
        {!result && (
          <div className="text-center">
            <button
              onClick={() => setShowHint(true)}
              className="inline-flex items-center gap-2 text-gray-500 hover:text-amber-400 text-sm transition-colors"
            >
              <Lightbulb className="w-4 h-4" />
              {showHint ? `Indice : jouez ${pitToSGN(puzzle.bestMove)}` : 'Voir un indice'}
            </button>
          </div>
        )}

        {/* Puzzle navigation */}
        <div className="mt-8 flex justify-center gap-2">
          {puzzles.map((p, i) => (
            <button
              key={p.id}
              onClick={() => { setCurrentIdx(i); setResult(null); setShowHint(false); }}
              className={`
                w-8 h-8 rounded-full text-xs font-bold transition-all
                ${i === currentIdx ? 'bg-amber-500 text-white' : solved.has(p.id) ? 'bg-green-500/30 text-green-400 border border-green-500/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}
              `}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PuzzlePage;
