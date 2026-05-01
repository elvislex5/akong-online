/**
 * Smoke tests for the engine abstraction — verify the module loads, the
 * types are exported, and the legendary panthéon is well-formed.
 *
 * Full runtime tests (actually invoking minimax + neural MCTS via workers /
 * ONNX) are deferred to the integration suite since they need browser APIs.
 */
import { describe, expect, it } from 'vitest';

import {
  LEGENDARY_BOTS,
  getMove,
  hint,
  type EnginePolicy,
  type EngineResponse,
  type LegendaryBot,
  type LegendaryBotMeta,
} from './index';

describe('services/engine barrel exports', () => {
  it('exports getMove and hint as functions', () => {
    expect(typeof getMove).toBe('function');
    expect(typeof hint).toBe('function');
  });

  it('exposes a 6-bot panthéon with strictly increasing Elo', () => {
    expect(LEGENDARY_BOTS).toHaveLength(6);
    const elos = LEGENDARY_BOTS.map(b => b.targetElo);
    for (let i = 1; i < elos.length; i++) {
      expect(elos[i]).toBeGreaterThan(elos[i - 1]);
    }
    const expectedIds: LegendaryBot[] = ['eki', 'radimese', 'ditoto', 'nda', 'mbang', 'vivi'];
    expect(LEGENDARY_BOTS.map(b => b.id)).toEqual(expectedIds);
  });

  it('every legendary bot has a non-empty label and flavor', () => {
    for (const bot of LEGENDARY_BOTS) {
      expect(bot.label.length).toBeGreaterThan(0);
      expect(bot.flavor.length).toBeGreaterThan(0);
    }
  });
});

describe('EnginePolicy shape', () => {
  // Compile-time exhaustiveness check: list every variant once.
  it('accepts all documented policy kinds', () => {
    const policies: EnginePolicy[] = [
      { kind: 'legacy', difficulty: 'easy' },
      { kind: 'legacy', difficulty: 'medium' },
      { kind: 'legacy', difficulty: 'hard' },
      { kind: 'legacy', difficulty: 'expert' },
      { kind: 'legacy', difficulty: 'legend' },
      { kind: 'master' },
      { kind: 'master', timeLimitMs: 3000 },
      { kind: 'legendary', bot: 'eki' },
      { kind: 'legendary', bot: 'vivi' },
      { kind: 'coach', targetElo: 1500 },
      { kind: 'divine' },
      { kind: 'divine', timeLimitMs: 10000 },
    ];
    expect(policies.length).toBeGreaterThan(10);
  });
});

// Type-level sanity: EngineResponse must carry a move and duration.
// We assert by constructing a dummy instance — TypeScript type-checks at compile.
const _sample: EngineResponse = {
  move: 3,
  source: 'minimax',
  confidence: 'medium',
  durationMs: 1234,
};
void _sample;

// Every LegendaryBotMeta export has the required fields.
const _meta: LegendaryBotMeta = LEGENDARY_BOTS[0];
void _meta;
