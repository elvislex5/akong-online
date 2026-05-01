import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameStatus } from '../types';
import { type SGNEntry } from '../services/sgnNotation';
import { List, X, Copy, Check } from 'lucide-react';

interface MoveHistoryProps {
  entries: SGNEntry[];
  currentMoveIndex: number;
  gameStatus: GameStatus;
  nameOne: string;
  nameTwo: string;
  sgnText: string;
}

export function MoveHistoryToggle({ entries, currentMoveIndex, gameStatus, nameOne, nameTwo, sgnText }: MoveHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (entries.length === 0 && !isOpen) return null;

  return (
    <>
      {/* Toggle FAB — bottom-left */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={
          'fixed z-30 inline-flex items-center justify-center w-10 h-10 rounded-full border shadow-md transition-colors duration-150 ' +
          (isOpen
            ? 'bg-accent text-accent-ink border-accent'
            : 'bg-canvas/90 backdrop-blur-md text-ink-muted border-rule hover:text-accent hover:border-accent')
        }
        style={{
          bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
          left: 'calc(0.75rem + env(safe-area-inset-left, 0px))',
        }}
        title="Historique des coups"
        aria-label="Historique des coups"
      >
        <List size={16} strokeWidth={1.75} />
        {entries.length > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-medium tabular-nums bg-accent text-accent-ink rounded-full">
            {entries.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <MoveHistoryPanel
            entries={entries}
            currentMoveIndex={currentMoveIndex}
            gameStatus={gameStatus}
            nameOne={nameOne}
            nameTwo={nameTwo}
            sgnText={sgnText}
            onClose={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function MoveHistoryPanel({
  entries,
  currentMoveIndex,
  gameStatus,
  nameOne,
  nameTwo,
  sgnText,
  onClose,
}: MoveHistoryProps & { onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sgnText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const rows: { moveNum: number; p1?: SGNEntry; p2?: SGNEntry }[] = [];
  for (let i = 0; i < entries.length; i += 2) {
    rows.push({
      moveNum: Math.floor(i / 2) + 1,
      p1: entries[i],
      p2: entries[i + 1],
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.18 }}
      className="fixed bottom-16 left-3 z-30 w-72 max-h-[60vh] bg-surface border border-rule shadow-lg overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-rule">
        <p className="kicker">Coups · {entries.length}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center w-7 h-7 text-ink-muted hover:text-ink hover:bg-canvas transition-colors duration-150"
            title="Copier la notation SGN"
            aria-label="Copier la notation SGN"
          >
            {copied ? <Check size={14} strokeWidth={1.75} className="text-success" /> : <Copy size={14} strokeWidth={1.75} />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex items-center justify-center w-7 h-7 text-ink-muted hover:text-ink hover:bg-canvas transition-colors duration-150"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 px-3 py-1.5 border-b border-rule">
        <span className="kicker text-[10px]">#</span>
        <span className="kicker text-[10px] truncate" title={nameOne}>{nameOne}</span>
        <span className="kicker text-[10px] truncate" title={nameTwo}>{nameTwo}</span>
      </div>

      {/* Move list */}
      <div ref={scrollRef} className="overflow-y-auto flex-1 py-1">
        {rows.length === 0 ? (
          <div className="text-center text-ink-subtle text-xs py-6">Aucun coup joué</div>
        ) : (
          rows.map((row) => (
            <div
              key={row.moveNum}
              className="grid grid-cols-[2rem_1fr_1fr] gap-2 px-3 py-1 hover:bg-canvas"
            >
              <span className="text-ink-subtle font-mono text-xs leading-6">{row.moveNum}.</span>
              <MoveCell entry={row.p1} isCurrent={row.p1 ? entries.indexOf(row.p1) === currentMoveIndex : false} />
              <MoveCell entry={row.p2} isCurrent={row.p2 ? entries.indexOf(row.p2) === currentMoveIndex : false} />
            </div>
          ))
        )}
      </div>

      {/* Result */}
      {gameStatus === GameStatus.Finished && entries.length > 0 && entries[entries.length - 1].resultText && (
        <div className="px-4 py-2 border-t border-rule text-center">
          <span className="text-sm font-medium text-ink italic font-display" style={{ fontVariationSettings: '"opsz" 14, "SOFT" 50' }}>
            {entries[entries.length - 1].resultText}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function MoveCell({ entry, isCurrent }: { entry?: SGNEntry; isCurrent?: boolean }) {
  if (!entry) return <span />;
  const cls = [
    'font-mono text-xs leading-6 px-1.5',
    isCurrent ? 'bg-accent/15 text-accent rounded-sm font-medium' : 'text-ink-muted',
    entry.captured > 0 && !isCurrent ? 'text-success' : '',
  ].filter(Boolean).join(' ');
  return <span className={cls}>{entry.label}</span>;
}
