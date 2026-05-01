import { describe, it, expect } from 'vitest';
import {
  updateRating,
  getExpectedScore,
  getEkangTitle,
  getCadenceFromTimeControl,
  DEFAULT_RATING,
  type Glicko2Rating,
} from './glicko2';

describe('Glicko-2 — updateRating', () => {
  it('returns default rating unchanged with no games', () => {
    const updated = updateRating(DEFAULT_RATING, []);
    expect(updated.rating).toBe(DEFAULT_RATING.rating);
    expect(updated.rd).toBeGreaterThanOrEqual(DEFAULT_RATING.rd);
  });

  it('increases rating after a win vs equal opponent', () => {
    const player: Glicko2Rating = { rating: 1500, rd: 200, volatility: 0.06 };
    const opponent: Glicko2Rating = { rating: 1500, rd: 200, volatility: 0.06 };

    const result = updateRating(player, [{ opponentRating: opponent, score: 1 }]);
    expect(result.rating).toBeGreaterThan(1500);
    expect(result.rd).toBeLessThan(200);
  });

  it('decreases rating after a loss vs equal opponent', () => {
    const player: Glicko2Rating = { rating: 1500, rd: 200, volatility: 0.06 };
    const opponent: Glicko2Rating = { rating: 1500, rd: 200, volatility: 0.06 };

    const result = updateRating(player, [{ opponentRating: opponent, score: 0 }]);
    expect(result.rating).toBeLessThan(1500);
  });

  it('draw vs equal opponent keeps rating roughly the same', () => {
    const player: Glicko2Rating = { rating: 1500, rd: 200, volatility: 0.06 };
    const opponent: Glicko2Rating = { rating: 1500, rd: 200, volatility: 0.06 };

    const result = updateRating(player, [{ opponentRating: opponent, score: 0.5 }]);
    expect(Math.abs(result.rating - 1500)).toBeLessThan(5);
  });

  it('win vs stronger opponent gives larger rating gain', () => {
    const player: Glicko2Rating = { rating: 1200, rd: 150, volatility: 0.06 };
    const weak: Glicko2Rating = { rating: 1200, rd: 150, volatility: 0.06 };
    const strong: Glicko2Rating = { rating: 1800, rd: 150, volatility: 0.06 };

    const vsWeak = updateRating(player, [{ opponentRating: weak, score: 1 }]);
    const vsStrong = updateRating(player, [{ opponentRating: strong, score: 1 }]);
    expect(vsStrong.rating - 1200).toBeGreaterThan(vsWeak.rating - 1200);
  });

  it('rd decreases after a game (more confident)', () => {
    const player: Glicko2Rating = { rating: 1500, rd: 300, volatility: 0.06 };
    const opponent: Glicko2Rating = { rating: 1500, rd: 200, volatility: 0.06 };

    const result = updateRating(player, [{ opponentRating: opponent, score: 1 }]);
    expect(result.rd).toBeLessThan(300);
  });

  it('handles multiple results in a rating period', () => {
    const player: Glicko2Rating = { rating: 1500, rd: 200, volatility: 0.06 };
    const results = [
      { opponentRating: { rating: 1400, rd: 30, volatility: 0.06 }, score: 1 },
      { opponentRating: { rating: 1550, rd: 100, volatility: 0.06 }, score: 0 },
      { opponentRating: { rating: 1700, rd: 300, volatility: 0.06 }, score: 0 },
    ];

    const result = updateRating(player, results);
    expect(result.rating).toBeDefined();
    expect(result.rd).toBeLessThan(200);
    expect(result.volatility).toBeGreaterThan(0);
  });

  it('rating stays within reasonable bounds', () => {
    const player: Glicko2Rating = { rating: 1500, rd: 200, volatility: 0.06 };
    const opponent: Glicko2Rating = { rating: 1500, rd: 200, volatility: 0.06 };

    const afterWin = updateRating(player, [{ opponentRating: opponent, score: 1 }]);
    expect(afterWin.rating).toBeGreaterThan(100);
    expect(afterWin.rating).toBeLessThan(3000);
    expect(afterWin.rd).toBeGreaterThanOrEqual(30);
    expect(afterWin.rd).toBeLessThanOrEqual(350);
  });

  it('Glicko-2 reference example (Mark Glickman paper)', () => {
    const player: Glicko2Rating = { rating: 1500, rd: 200, volatility: 0.06 };
    const results = [
      { opponentRating: { rating: 1400, rd: 30, volatility: 0.06 } as Glicko2Rating, score: 1 },
      { opponentRating: { rating: 1550, rd: 100, volatility: 0.06 } as Glicko2Rating, score: 0 },
      { opponentRating: { rating: 1700, rd: 300, volatility: 0.06 } as Glicko2Rating, score: 0 },
    ];

    const result = updateRating(player, results);
    // Expected from Glickman's paper: μ'≈1464, φ'≈152, σ'≈0.05999
    expect(result.rating).toBeGreaterThan(1440);
    expect(result.rating).toBeLessThan(1490);
    expect(result.rd).toBeGreaterThan(140);
    expect(result.rd).toBeLessThan(170);
  });
});

describe('getExpectedScore', () => {
  it('returns ~0.5 for equal players', () => {
    const a: Glicko2Rating = { rating: 1500, rd: 100, volatility: 0.06 };
    const b: Glicko2Rating = { rating: 1500, rd: 100, volatility: 0.06 };
    expect(getExpectedScore(a, b)).toBeCloseTo(0.5, 1);
  });

  it('returns > 0.5 when player is stronger', () => {
    const a: Glicko2Rating = { rating: 1800, rd: 100, volatility: 0.06 };
    const b: Glicko2Rating = { rating: 1200, rd: 100, volatility: 0.06 };
    expect(getExpectedScore(a, b)).toBeGreaterThan(0.8);
  });
});

describe('getEkangTitle', () => {
  it('returns correct titles for rating ranges', () => {
    expect(getEkangTitle(500).name).toBe('Nle Angbwé');
    expect(getEkangTitle(900).name).toBe('Nle Songo');
    expect(getEkangTitle(1300).name).toBe('Maître Semeur');
    expect(getEkangTitle(1700).name).toBe('Grand Maître');
    expect(getEkangTitle(2100).name).toBe('Seigneur');
    expect(getEkangTitle(2300).name).toBe('Esprit du Songo');
  });
});

describe('getCadenceFromTimeControl', () => {
  it('classifies time controls correctly', () => {
    expect(getCadenceFromTimeControl(30)).toBe('bullet');
    expect(getCadenceFromTimeControl(60)).toBe('bullet');
    expect(getCadenceFromTimeControl(180)).toBe('blitz');
    expect(getCadenceFromTimeControl(300)).toBe('blitz');
    expect(getCadenceFromTimeControl(600)).toBe('rapide');
    expect(getCadenceFromTimeControl(1200)).toBe('classique');
  });
});
