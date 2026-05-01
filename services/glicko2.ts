import { GameSystem } from '../types';

export interface Glicko2Rating {
  rating: number;      // μ (default 1200)
  rd: number;          // Rating Deviation φ (default 350)
  volatility: number;  // σ (default 0.06)
}

export type Cadence = 'bullet' | 'blitz' | 'rapide' | 'classique';

export interface RatingKey {
  gameSystem: GameSystem;
  cadence: Cadence;
}

const TAU = 0.5;
const EPSILON = 0.000001;
const GLICKO2_SCALE = 173.7178;

export const DEFAULT_RATING: Glicko2Rating = {
  rating: 1200,
  rd: 350,
  volatility: 0.06,
};

function toGlicko2Scale(rating: number, rd: number): { mu: number; phi: number } {
  return {
    mu: (rating - 1200) / GLICKO2_SCALE,
    phi: rd / GLICKO2_SCALE,
  };
}

function fromGlicko2Scale(mu: number, phi: number): { rating: number; rd: number } {
  return {
    rating: Math.round(mu * GLICKO2_SCALE + 1200),
    rd: Math.max(30, Math.min(350, Math.round(phi * GLICKO2_SCALE))),
  };
}

function g(phi: number): number {
  return 1 / Math.sqrt(1 + 3 * phi * phi / (Math.PI * Math.PI));
}

function E(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

function computeVariance(mu: number, opponents: Array<{ mu: number; phi: number }>): number {
  let sum = 0;
  for (const opp of opponents) {
    const gPhi = g(opp.phi);
    const e = E(mu, opp.mu, opp.phi);
    sum += gPhi * gPhi * e * (1 - e);
  }
  return 1 / sum;
}

function computeDelta(
  mu: number,
  v: number,
  opponents: Array<{ mu: number; phi: number; score: number }>
): number {
  let sum = 0;
  for (const opp of opponents) {
    sum += g(opp.phi) * (opp.score - E(mu, opp.mu, opp.phi));
  }
  return v * sum;
}

function computeNewVolatility(sigma: number, phi: number, v: number, delta: number): number {
  const a = Math.log(sigma * sigma);
  const phiSq = phi * phi;
  const deltaSq = delta * delta;

  const f = (x: number) => {
    const ex = Math.exp(x);
    const d = phiSq + v + ex;
    return (ex * (deltaSq - phiSq - v - ex)) / (2 * d * d) - (x - a) / (TAU * TAU);
  };

  let A = a;
  let B: number;
  if (deltaSq > phiSq + v) {
    B = Math.log(deltaSq - phiSq - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);

  while (Math.abs(B - A) > EPSILON) {
    const C = A + (A - B) * fA / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }

  return Math.exp(A / 2);
}

export interface GameResult {
  opponentRating: Glicko2Rating;
  score: number; // 1 = win, 0.5 = draw, 0 = loss
}

export function updateRating(player: Glicko2Rating, results: GameResult[]): Glicko2Rating {
  if (results.length === 0) {
    const { phi } = toGlicko2Scale(player.rating, player.rd);
    const newPhi = Math.sqrt(phi * phi + player.volatility * player.volatility);
    const { rd: newRd } = fromGlicko2Scale(0, newPhi);
    return { ...player, rd: newRd };
  }

  const { mu, phi } = toGlicko2Scale(player.rating, player.rd);

  const opponents = results.map(r => {
    const { mu: muJ, phi: phiJ } = toGlicko2Scale(r.opponentRating.rating, r.opponentRating.rd);
    return { mu: muJ, phi: phiJ, score: r.score };
  });

  const v = computeVariance(mu, opponents);
  const delta = computeDelta(mu, v, opponents);

  const newSigma = computeNewVolatility(player.volatility, phi, v, delta);
  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * opponents.reduce(
    (sum, opp) => sum + g(opp.phi) * (opp.score - E(mu, opp.mu, opp.phi)),
    0
  );

  const { rating, rd } = fromGlicko2Scale(newMu, newPhi);
  return { rating, rd, volatility: Math.round(newSigma * 1000000) / 1000000 };
}

export function getExpectedScore(player: Glicko2Rating, opponent: Glicko2Rating): number {
  const { mu } = toGlicko2Scale(player.rating, player.rd);
  const { mu: muJ, phi: phiJ } = toGlicko2Scale(opponent.rating, opponent.rd);
  return E(mu, muJ, phiJ);
}

export function getEkangTitle(rating: number): { name: string; color: string; minRating: number } {
  if (rating >= 2200) return { name: 'Esprit du Songo', color: 'text-red-500', minRating: 2200 };
  if (rating >= 2000) return { name: 'Seigneur', color: 'text-purple-500', minRating: 2000 };
  if (rating >= 1600) return { name: 'Grand Maître', color: 'text-blue-400', minRating: 1600 };
  if (rating >= 1200) return { name: 'Maître Semeur', color: 'text-green-400', minRating: 1200 };
  if (rating >= 800) return { name: 'Nle Songo', color: 'text-amber-400', minRating: 800 };
  return { name: 'Nle Angbwé', color: 'text-gray-400', minRating: 0 };
}

export function getCadenceFromTimeControl(timeSeconds: number): Cadence {
  if (timeSeconds <= 60) return 'bullet';
  if (timeSeconds <= 300) return 'blitz';
  if (timeSeconds <= 900) return 'rapide';
  return 'classique';
}
