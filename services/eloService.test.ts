import { describe, it, expect } from 'vitest';
import { calculateElo, getEloTier } from './eloService';

describe('calculateElo', () => {
  it('gives positive delta for a win against equal opponent', () => {
    const result = calculateElo(1200, 1200, 1);
    expect(result.deltaA).toBe(16); // K/2 = 32/2
    expect(result.newRatingA).toBe(1216);
    expect(result.newRatingB).toBe(1184);
  });

  it('gives zero-sum: total ELO is preserved', () => {
    const result = calculateElo(1500, 1300, 1);
    expect(result.newRatingA + result.newRatingB).toBe(1500 + 1300);
  });

  it('gives zero delta for a draw between equal players', () => {
    const result = calculateElo(1200, 1200, 0.5);
    expect(result.deltaA).toBe(0);
    expect(result.newRatingA).toBe(1200);
    expect(result.newRatingB).toBe(1200);
  });

  it('rewards upset wins more', () => {
    const upset = calculateElo(1000, 1400, 1);
    const expected = calculateElo(1400, 1000, 1);
    expect(upset.deltaA).toBeGreaterThan(expected.deltaA);
  });

  it('gives negative delta for a loss', () => {
    const result = calculateElo(1200, 1200, 0);
    expect(result.deltaA).toBe(-16);
    expect(result.newRatingA).toBe(1184);
  });

  it('never drops below 100', () => {
    const result = calculateElo(100, 2000, 0);
    expect(result.newRatingA).toBeGreaterThanOrEqual(100);
  });
});

describe('getEloTier', () => {
  it('returns Débutant for low ratings', () => {
    expect(getEloTier(1200).name).toBe('Débutant');
  });

  it('returns Maître for 2200+', () => {
    expect(getEloTier(2200).name).toBe('Maître');
    expect(getEloTier(2500).name).toBe('Maître');
  });

  it('returns correct tiers at boundaries', () => {
    expect(getEloTier(1399).name).toBe('Débutant');
    expect(getEloTier(1400).name).toBe('Apprenti');
    expect(getEloTier(1600).name).toBe('Intermédiaire');
    expect(getEloTier(1800).name).toBe('Avancé');
    expect(getEloTier(2000).name).toBe('Expert');
  });
});
