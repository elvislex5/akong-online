import React, { useEffect, useMemo, useState } from 'react';
import { getRatingHistory, type RatingHistoryPoint } from '../../services/ratingService';
import type { GameSystem } from '../../types';
import type { Cadence } from '../../services/glicko2';

interface Props {
  userId: string;
  gameSystem: GameSystem;
  cadence: Cadence;
}

const SYSTEMS: { value: GameSystem; label: string }[] = [
  { value: 'mgpwem', label: 'Mgpwém' },
  { value: 'angbwe', label: 'Angbwé' },
];

const CADENCES: { value: Cadence; label: string }[] = [
  { value: 'bullet', label: 'Bullet' },
  { value: 'blitz', label: 'Blitz' },
  { value: 'rapide', label: 'Rapide' },
  { value: 'classique', label: 'Classique' },
];

/**
 * SVG line chart of one (system × cadence) rating evolution. Built without
 * external libs to stay light. Tabs above let the user switch system and
 * cadence in place.
 *
 * Visual style matches the editorial direction: hairline axis, mono-color
 * accent line, sparse y-axis labels, tabular-nums everywhere.
 */
export const RatingChart: React.FC<Props> = ({ userId, gameSystem: initialSystem, cadence: initialCadence }) => {
  const [system, setSystem] = useState<GameSystem>(initialSystem);
  const [cadence, setCadence] = useState<Cadence>(initialCadence);
  const [points, setPoints] = useState<RatingHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRatingHistory(userId, system, cadence).then((p) => {
      if (!cancelled) {
        setPoints(p);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId, system, cadence]);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="kicker">Évolution du rating</p>
        <div className="flex flex-wrap items-center gap-1">
          {SYSTEMS.map((s) => (
            <Pill key={s.value} active={s.value === system} onClick={() => setSystem(s.value)}>
              {s.label}
            </Pill>
          ))}
          <span className="mx-1 text-ink-subtle text-xs">·</span>
          {CADENCES.map((c) => (
            <Pill key={c.value} active={c.value === cadence} onClick={() => setCadence(c.value)}>
              {c.label}
            </Pill>
          ))}
        </div>
      </div>

      <div className="border border-rule p-4 sm:p-6">
        {loading ? (
          <div className="h-[180px] flex items-center justify-center text-xs text-ink-subtle">Chargement…</div>
        ) : points.length < 2 ? (
          <div className="h-[180px] flex items-center justify-center text-sm text-ink-subtle text-center px-4">
            Pas encore assez de parties classées pour tracer une courbe.
            <br />
            <span className="text-xs">Jouez quelques parties en {labelFor(cadence)} pour voir votre évolution.</span>
          </div>
        ) : (
          <Chart points={points} />
        )}
      </div>
    </section>
  );
};

/* ---------------------------------------------------------------- */

const labelFor = (c: Cadence) => CADENCES.find((x) => x.value === c)?.label || c;

const Pill: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({
  active,
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={
      'h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors duration-150 ' +
      (active
        ? 'bg-accent text-accent-ink'
        : 'text-ink-muted hover:text-ink hover:bg-surface')
    }
  >
    {children}
  </button>
);

/* ---------------------------------------------------------------- */

const VIEWBOX_W = 600;
const VIEWBOX_H = 180;
const PADDING = { top: 16, right: 16, bottom: 24, left: 40 };
const PLOT_W = VIEWBOX_W - PADDING.left - PADDING.right;
const PLOT_H = VIEWBOX_H - PADDING.top - PADDING.bottom;

const Chart: React.FC<{ points: RatingHistoryPoint[] }> = ({ points }) => {
  const { pathD, areaD, gridY, current, peak, low, firstDate, lastDate } = useMemo(() => {
    const ratings = points.map((p) => p.rating);
    const min = Math.min(...ratings);
    const max = Math.max(...ratings);
    // Add 5% headroom on both sides so the line never touches the edge
    const range = Math.max(50, max - min);
    const yMin = Math.floor((min - range * 0.05) / 10) * 10;
    const yMax = Math.ceil((max + range * 0.05) / 10) * 10;

    const xFor = (i: number) => PADDING.left + (i / Math.max(1, points.length - 1)) * PLOT_W;
    const yFor = (rating: number) =>
      PADDING.top + PLOT_H - ((rating - yMin) / (yMax - yMin)) * PLOT_H;

    const segments = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.rating).toFixed(1)}`);
    const pathD = segments.join(' ');
    const areaD =
      `M ${xFor(0).toFixed(1)} ${(PADDING.top + PLOT_H).toFixed(1)} ` +
      segments.map((s) => s.replace(/^M/, 'L')).join(' ') +
      ` L ${xFor(points.length - 1).toFixed(1)} ${(PADDING.top + PLOT_H).toFixed(1)} Z`;

    // 3 evenly-spaced gridlines across the y range
    const gridY = [0, 0.5, 1].map((t) => {
      const value = Math.round(yMin + t * (yMax - yMin));
      return { y: yFor(value), value };
    });

    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

    return {
      pathD,
      areaD,
      gridY,
      current: ratings[ratings.length - 1],
      peak: max,
      low: min,
      firstDate: fmt(points[0].recorded_at),
      lastDate: fmt(points[points.length - 1].recorded_at),
    };
  }, [points]);

  return (
    <div>
      {/* Header stats */}
      <div className="flex items-baseline gap-6 mb-3">
        <Stat label="Actuel" value={current} accent />
        <Stat label="Plus haut" value={peak} />
        <Stat label="Plus bas" value={low} />
        <span className="text-[10px] text-ink-subtle ml-auto tabular-nums hidden sm:inline">
          {points.length} parties
        </span>
      </div>

      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Évolution du rating : ${current} actuel`}
        preserveAspectRatio="none"
      >
        {/* Gridlines + y-axis labels */}
        {gridY.map((g, i) => (
          <g key={i}>
            <line
              x1={PADDING.left}
              x2={VIEWBOX_W - PADDING.right}
              y1={g.y}
              y2={g.y}
              className="stroke-rule"
              strokeWidth="0.5"
            />
            <text
              x={PADDING.left - 6}
              y={g.y + 3}
              textAnchor="end"
              className="fill-ink-subtle text-[9px] tabular-nums"
              style={{ fontSize: '9px' }}
            >
              {g.value}
            </text>
          </g>
        ))}

        {/* Filled area below the line */}
        <path d={areaD} className="fill-accent/10" />

        {/* Line */}
        <path d={pathD} className="stroke-accent" strokeWidth="1.5" fill="none" strokeLinejoin="round" />

        {/* X-axis date labels */}
        <text x={PADDING.left} y={VIEWBOX_H - 6} className="fill-ink-subtle text-[9px]" style={{ fontSize: '9px' }}>
          {firstDate}
        </text>
        <text
          x={VIEWBOX_W - PADDING.right}
          y={VIEWBOX_H - 6}
          textAnchor="end"
          className="fill-ink-subtle text-[9px]"
          style={{ fontSize: '9px' }}
        >
          {lastDate}
        </text>
      </svg>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; accent?: boolean }> = ({ label, value, accent }) => (
  <div>
    <p className="kicker">{label}</p>
    <p
      className={
        'font-display tabular-nums leading-none mt-0.5 ' + (accent ? 'text-accent' : 'text-ink')
      }
      style={{ fontVariationSettings: '"opsz" 32, "SOFT" 30', fontSize: '1.5rem' }}
    >
      {value}
    </p>
  </div>
);
