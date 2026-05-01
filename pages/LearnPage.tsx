import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Clock, BookOpen } from 'lucide-react';
import { getLessons, getCategories, type Lesson, type LessonStep } from '../services/lessonService';
import { pitToSGN } from '../services/sgnNotation';
import { Container } from '../components/ui/Container';

const STORAGE_KEY = 'songo_lessons_completed';

const loadCompleted = (): Set<string> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch {
    return new Set();
  }
};

const persistCompleted = (set: Set<string>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* noop */
  }
};

const LearnPage: React.FC = () => {
  const lessons = getLessons();
  const categories = getCategories();
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(loadCompleted);

  const markComplete = (lessonId: string) => {
    const next = new Set(completed).add(lessonId);
    setCompleted(next);
    persistCompleted(next);
  };

  if (activeLesson) {
    return (
      <LessonView
        lesson={activeLesson}
        stepIdx={stepIdx}
        onBack={() => {
          setActiveLesson(null);
          setStepIdx(0);
        }}
        onPrev={() => setStepIdx((i) => Math.max(0, i - 1))}
        onNext={() => setStepIdx((i) => i + 1)}
        onFinish={() => {
          markComplete(activeLesson.id);
          setActiveLesson(null);
          setStepIdx(0);
        }}
      />
    );
  }

  return (
    <div className="bg-canvas">
      {/* Header */}
      <section className="border-b border-rule">
        <Container width="wide" className="py-16 md:py-24">
          <p className="kicker mb-6">Parcours · {completed.size} / {lessons.length} terminées</p>
          <h1
            className="font-display text-ink leading-[0.95] tracking-[-0.03em]"
            style={{
              fontVariationSettings: '"opsz" 144, "SOFT" 50',
              fontSize: 'clamp(3rem, 8vw, 6rem)',
            }}
          >
            Apprendre
          </h1>
          <p className="lead mt-6 max-w-[640px]">
            Histoire du jeu, premiers pas en Angbwé, maîtrise du Mgpwém. Chaque
            leçon est interactive et se garde en mémoire.
          </p>
        </Container>
      </section>

      {/* Lesson list */}
      <section>
        <Container width="reading" className="py-12 md:py-16">
          <div className="space-y-12">
            {categories.map((cat) => {
              const catLessons = lessons.filter((l) => l.category === cat.id);
              if (catLessons.length === 0) return null;
              return (
                <div key={cat.id}>
                  <p className="kicker mb-4">{cat.name}</p>
                  <ul role="list" className="border border-rule divide-y divide-rule">
                    {catLessons.map((lesson) => {
                      const isDone = completed.has(lesson.id);
                      return (
                        <li key={lesson.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveLesson(lesson);
                              setStepIdx(0);
                            }}
                            className="w-full text-left px-5 py-5 flex items-center gap-4 bg-canvas hover:bg-surface transition-colors duration-150 group"
                          >
                            <div
                              className={
                                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ' +
                                (isDone
                                  ? 'border-success bg-success/10 text-success'
                                  : 'border-rule-strong text-ink-subtle group-hover:border-accent group-hover:text-accent')
                              }
                            >
                              {isDone ? (
                                <Check size={14} strokeWidth={2} />
                              ) : (
                                <BookOpen size={14} strokeWidth={1.75} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className="font-display text-lg text-ink mb-0.5"
                                style={{ fontVariationSettings: '"opsz" 18, "SOFT" 30' }}
                              >
                                {lesson.title}
                              </p>
                              <p className="text-sm text-ink-muted truncate">
                                {lesson.description}
                              </p>
                            </div>
                            <div className="hidden sm:flex items-center gap-1 text-xs text-ink-subtle shrink-0">
                              <Clock size={12} strokeWidth={1.5} />
                              {lesson.estimatedMinutes} min
                            </div>
                            <ChevronRight
                              size={16}
                              strokeWidth={1.5}
                              className="text-ink-subtle group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-200 shrink-0"
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </Container>
      </section>
    </div>
  );
};

export default LearnPage;

/* ----------------------------------------------------------------
   In-lesson view
   ---------------------------------------------------------------- */

const LessonView: React.FC<{
  lesson: Lesson;
  stepIdx: number;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
}> = ({ lesson, stepIdx, onBack, onPrev, onNext, onFinish }) => {
  const step = lesson.steps[stepIdx];
  const isLast = stepIdx === lesson.steps.length - 1;
  const progress = ((stepIdx + 1) / lesson.steps.length) * 100;

  return (
    <div className="bg-canvas min-h-[80vh]">
      <Container width="reading" className="py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center gap-4 mb-8">
          <button
            type="button"
            onClick={onBack}
            aria-label="Retour aux leçons"
            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-ink-muted hover:text-ink hover:bg-surface transition-colors duration-150"
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="kicker">
              Étape {stepIdx + 1} / {lesson.steps.length}
            </p>
            <p className="text-sm text-ink-muted truncate">{lesson.title}</p>
          </div>
        </div>

        {/* Progress hairline */}
        <div className="relative h-px bg-rule mb-12">
          <div
            className="absolute inset-y-0 left-0 bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step content */}
        <article className="mb-12">
          {step.title && (
            <h2
              className="font-display text-ink leading-[1.05] tracking-[-0.03em] mb-6"
              style={{
                fontVariationSettings: '"opsz" 60, "SOFT" 40',
                fontSize: 'clamp(1.875rem, 4vw, 2.5rem)',
              }}
            >
              {step.title}
            </h2>
          )}

          {step.content && <StepContent content={step.content} />}

          {(step.type === 'board' || step.type === 'interactive') && step.board && (
            <BoardDiagram step={step} />
          )}
        </article>

        {/* Nav */}
        <div className="flex items-center justify-between gap-3 pt-6 border-t border-rule">
          <button
            type="button"
            onClick={onPrev}
            disabled={stepIdx === 0}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md text-sm font-medium text-ink-muted hover:text-ink hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors duration-150"
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
            Précédent
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={onFinish}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent-hover transition-colors duration-150"
            >
              <Check size={16} strokeWidth={1.75} />
              Terminer la leçon
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md text-sm font-medium border border-rule-strong text-ink hover:border-accent hover:text-accent transition-colors duration-150"
            >
              Suivant
              <ChevronRight size={16} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </Container>
    </div>
  );
};

/* ----------------------------------------------------------------
   Step content — handles **bold** and paragraphs
   ---------------------------------------------------------------- */

const StepContent: React.FC<{ content: string }> = ({ content }) => (
  <div className="prose-body text-ink-muted space-y-4 max-w-[640px]">
    {content.split('\n\n').map((paragraph, i) => (
      <p
        key={i}
        dangerouslySetInnerHTML={{
          __html: paragraph
            .replace(/\*\*(.+?)\*\*/g, '<strong class="text-ink font-semibold">$1</strong>')
            .replace(/\n/g, '<br />'),
        }}
      />
    ))}
  </div>
);

/* ----------------------------------------------------------------
   Board diagram — minimal pit grid
   ---------------------------------------------------------------- */

const BoardDiagram: React.FC<{ step: LessonStep }> = ({ step }) => {
  if (!step.board) return null;
  return (
    <div className="mt-8 border border-rule p-5 bg-surface">
      {step.scores && (
        <div className="flex items-baseline justify-between mb-4 text-xs text-ink-subtle">
          <span className="kicker">J2 · {step.scores[1]}</span>
          <span className="kicker">J1 · {step.scores[0]}</span>
        </div>
      )}
      {/* Top row: Player Two — visual right-to-left = pits 13..7 */}
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {[13, 12, 11, 10, 9, 8, 7].map((idx) => (
          <Pit key={idx} idx={idx} value={step.board![idx]} highlighted={step.highlightPits?.includes(idx)} sgnAbove />
        ))}
      </div>
      {/* Bottom row: Player One — visual left-to-right = pits 0..6 */}
      <div className="grid grid-cols-7 gap-1.5">
        {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
          <Pit key={idx} idx={idx} value={step.board![idx]} highlighted={step.highlightPits?.includes(idx)} />
        ))}
      </div>
    </div>
  );
};

const Pit: React.FC<{ idx: number; value: number; highlighted?: boolean; sgnAbove?: boolean }> = ({
  idx,
  value,
  highlighted,
  sgnAbove,
}) => {
  const cls = [
    'aspect-square flex flex-col items-center justify-center rounded-sm',
    highlighted ? 'bg-accent/10 border border-accent' : 'bg-canvas border border-rule',
  ].join(' ');
  const sgnLabel = (
    <span className="text-[10px] text-ink-subtle leading-none tracking-wider uppercase">
      {pitToSGN(idx)}
    </span>
  );
  return (
    <div className={cls}>
      {sgnAbove && sgnLabel}
      <span
        className={
          'font-display tabular-nums leading-none ' +
          (value === 0 ? 'text-ink-subtle' : 'text-ink')
        }
        style={{ fontVariationSettings: '"opsz" 24, "SOFT" 30', fontSize: '1.25rem' }}
      >
        {value}
      </span>
      {!sgnAbove && sgnLabel}
    </div>
  );
};
