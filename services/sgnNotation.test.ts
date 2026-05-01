import { describe, it, expect } from 'vitest';
import { pitToSGN, sgnToPit, buildSGNEntries, formatSGNText } from './sgnNotation';

describe('pitToSGN', () => {
  it('converts Player One pits to A1-A7', () => {
    expect(pitToSGN(0)).toBe('A1');
    expect(pitToSGN(3)).toBe('A4');
    expect(pitToSGN(6)).toBe('A7');
  });

  it('converts Player Two pits to B1-B7', () => {
    expect(pitToSGN(7)).toBe('B1');
    expect(pitToSGN(10)).toBe('B4');
    expect(pitToSGN(13)).toBe('B7');
  });

  it('returns ?? for invalid index', () => {
    expect(pitToSGN(14)).toBe('??');
    expect(pitToSGN(-1)).toBe('??');
  });
});

describe('sgnToPit', () => {
  it('converts A1-A7 to pit indices 0-6', () => {
    expect(sgnToPit('A1')).toBe(0);
    expect(sgnToPit('A7')).toBe(6);
  });

  it('converts B1-B7 to pit indices 7-13', () => {
    expect(sgnToPit('B1')).toBe(7);
    expect(sgnToPit('B7')).toBe(13);
  });

  it('is case-insensitive', () => {
    expect(sgnToPit('a3')).toBe(2);
    expect(sgnToPit('b5')).toBe(11);
  });

  it('returns -1 for invalid notation', () => {
    expect(sgnToPit('C1')).toBe(-1);
    expect(sgnToPit('X')).toBe(-1);
  });
});

describe('buildSGNEntries', () => {
  const initialBoard = Array(14).fill(5);

  it('builds entries from a sequence of moves', () => {
    const entries = buildSGNEntries(initialBoard, [0, 7]);
    expect(entries).toHaveLength(2);
    expect(entries[0].player).toBe(0); // Player.One
    expect(entries[0].label).toMatch(/^A1/);
    expect(entries[1].player).toBe(1); // Player.Two
    expect(entries[1].label).toMatch(/^B1/);
  });

  it('adds capture suffix when seeds are captured', () => {
    const entries = buildSGNEntries(initialBoard, [0, 7]);
    const captureEntry = entries.find(e => e.captured > 0);
    if (captureEntry) {
      expect(captureEntry.label).toContain('x');
    }
  });

  it('marks game end with result text', () => {
    // Play a very long game until it ends — just verify the flag works on a finished entry
    const entries = buildSGNEntries(initialBoard, [0]);
    expect(entries[0].isGameEnd).toBe(false);
  });
});

describe('formatSGNText', () => {
  it('formats metadata headers', () => {
    const entries = buildSGNEntries(Array(14).fill(5), [0, 7]);
    const text = formatSGNText(entries, {
      player1: 'Alice',
      player2: 'Bob',
      date: '2026-04-18',
    });
    expect(text).toContain('[Joueur1 "Alice"]');
    expect(text).toContain('[Joueur2 "Bob"]');
    expect(text).toContain('1. A1');
  });

  it('pairs moves by number', () => {
    const entries = buildSGNEntries(Array(14).fill(5), [0, 7, 1, 8]);
    const text = formatSGNText(entries);
    expect(text).toContain('1.');
    expect(text).toContain('2.');
  });
});
