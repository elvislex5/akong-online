import { describe, it, expect, beforeEach } from 'vitest';
import { MatchmakingQueue, type MatchmakingEntry } from './matchmakingService';

function makeEntry(overrides: Partial<MatchmakingEntry> = {}): MatchmakingEntry {
  return {
    userId: 'user-' + Math.random().toString(36).slice(2, 8),
    socketId: 'sock-' + Math.random().toString(36).slice(2, 8),
    rating: 1200,
    rd: 200,
    gameSystem: 'mgpwem',
    cadence: 'blitz',
    joinedAt: Date.now(),
    username: 'TestPlayer',
    ...overrides,
  };
}

describe('MatchmakingQueue', () => {
  let queue: MatchmakingQueue;

  beforeEach(() => {
    queue = new MatchmakingQueue();
  });

  it('adds and removes players', () => {
    const e = makeEntry({ userId: 'u1' });
    queue.add(e);
    expect(queue.getQueueSize()).toBe(1);
    expect(queue.isInQueue('u1')).toBe(true);

    queue.remove('u1');
    expect(queue.getQueueSize()).toBe(0);
    expect(queue.isInQueue('u1')).toBe(false);
  });

  it('prevents duplicate entries for same user', () => {
    const e1 = makeEntry({ userId: 'u1', rating: 1200 });
    const e2 = makeEntry({ userId: 'u1', rating: 1300 });
    queue.add(e1);
    queue.add(e2);
    expect(queue.getQueueSize()).toBe(1);
  });

  it('matches two players with similar ratings', () => {
    queue.add(makeEntry({ userId: 'u1', rating: 1200 }));
    queue.add(makeEntry({ userId: 'u2', rating: 1250 }));

    const match = queue.findMatch();
    expect(match).not.toBeNull();
    expect(queue.getQueueSize()).toBe(0);
  });

  it('does NOT match players with very different ratings', () => {
    queue.add(makeEntry({ userId: 'u1', rating: 1200, joinedAt: Date.now() }));
    queue.add(makeEntry({ userId: 'u2', rating: 1800, joinedAt: Date.now() }));

    const match = queue.findMatch();
    expect(match).toBeNull();
    expect(queue.getQueueSize()).toBe(2);
  });

  it('does NOT match players from different game systems', () => {
    queue.add(makeEntry({ userId: 'u1', gameSystem: 'mgpwem' }));
    queue.add(makeEntry({ userId: 'u2', gameSystem: 'angbwe' }));

    const match = queue.findMatch();
    expect(match).toBeNull();
  });

  it('does NOT match players with different cadences', () => {
    queue.add(makeEntry({ userId: 'u1', cadence: 'blitz' }));
    queue.add(makeEntry({ userId: 'u2', cadence: 'rapide' }));

    const match = queue.findMatch();
    expect(match).toBeNull();
  });

  it('expands range over time for long-waiting players', () => {
    const oldTime = Date.now() - 60000; // 60 seconds ago
    queue.add(makeEntry({ userId: 'u1', rating: 1200, joinedAt: oldTime }));
    queue.add(makeEntry({ userId: 'u2', rating: 1500, joinedAt: oldTime }));

    const match = queue.findMatch();
    expect(match).not.toBeNull();
  });

  it('removes by socket ID', () => {
    queue.add(makeEntry({ userId: 'u1', socketId: 'sock-abc' }));
    expect(queue.getQueueSize()).toBe(1);

    queue.removeBySocket('sock-abc');
    expect(queue.getQueueSize()).toBe(0);
  });

  it('filters queue size by system and cadence', () => {
    queue.add(makeEntry({ userId: 'u1', gameSystem: 'mgpwem', cadence: 'blitz' }));
    queue.add(makeEntry({ userId: 'u2', gameSystem: 'mgpwem', cadence: 'rapide' }));
    queue.add(makeEntry({ userId: 'u3', gameSystem: 'angbwe', cadence: 'blitz' }));

    expect(queue.getQueueSize()).toBe(3);
    expect(queue.getQueueSize('mgpwem')).toBe(2);
    expect(queue.getQueueSize('angbwe')).toBe(1);
    expect(queue.getQueueSize('mgpwem', 'blitz')).toBe(1);
  });
});
