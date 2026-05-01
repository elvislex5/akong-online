import { describe, it, expect } from 'vitest';
import { formatTime, TIME_CONTROLS } from './useGameTimer';

describe('formatTime', () => {
  it('formats zero as 0:00', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats negative as 0:00', () => {
    expect(formatTime(-1000)).toBe('0:00');
  });

  it('formats seconds correctly', () => {
    expect(formatTime(30000)).toBe('0:30');
    expect(formatTime(5000)).toBe('0:05');
    expect(formatTime(1000)).toBe('0:01');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(60000)).toBe('1:00');
    expect(formatTime(90000)).toBe('1:30');
    expect(formatTime(600000)).toBe('10:00');
  });

  it('rounds up partial seconds', () => {
    expect(formatTime(1500)).toBe('0:02');
    expect(formatTime(100)).toBe('0:01');
  });
});

describe('TIME_CONTROLS', () => {
  it('has correct blitz config (3+2)', () => {
    expect(TIME_CONTROLS.blitz.initialTimeMs).toBe(3 * 60 * 1000);
    expect(TIME_CONTROLS.blitz.incrementMs).toBe(2000);
  });

  it('has correct rapid config (10+5)', () => {
    expect(TIME_CONTROLS.rapid.initialTimeMs).toBe(10 * 60 * 1000);
    expect(TIME_CONTROLS.rapid.incrementMs).toBe(5000);
  });

  it('has correct classical config (30+10)', () => {
    expect(TIME_CONTROLS.classical.initialTimeMs).toBe(30 * 60 * 1000);
    expect(TIME_CONTROLS.classical.incrementMs).toBe(10000);
  });

  it('none has zero times', () => {
    expect(TIME_CONTROLS.none.initialTimeMs).toBe(0);
    expect(TIME_CONTROLS.none.incrementMs).toBe(0);
  });
});
