import { afterEach, describe, expect, it, vi } from 'vitest';
import { interrogation, type InterrogationView } from '@arcade/interrogation';
import { GameSession } from '../src/gameSession';

const players = Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, name: `J${i}`, isBot: false }));

afterEach(() => {
  vi.useRealTimers();
});

describe('GameSession — chrono imposé par le serveur', () => {
  it('Garde à vue : fin d’interrogatoire puis fin du délai d’accusation, sans action des joueurs', () => {
    vi.useFakeTimers({ now: 1_000_000 });
    let changes = 0;
    const session = new GameSession(interrogation, players, { minutes: 3, rounds: 0 }, {
      isAutomated: () => false,
      onChange: () => changes++,
      onEnd: () => {},
    });
    const phase = () => (session.snapshot(null).view as InterrogationView).phase;

    for (const p of players) expect(session.submit(p.id, { type: 'ack' })).toBeNull();
    expect(phase()).toBe('interrogation');

    vi.advanceTimersByTime(3 * 60_000 - 1_000);
    expect(phase()).toBe('interrogation');

    vi.advanceTimersByTime(2_000);
    expect(phase()).toBe('accusation');

    vi.advanceTimersByTime(61_000);
    const view = session.snapshot(null).view as InterrogationView;
    expect(view.phase).toBe('review');
    expect(view.accused).toBeNull();
    expect(changes).toBeGreaterThanOrEqual(players.length + 2);
    session.dispose();
  });

  it('une accusation avant la fin annule le chrono', () => {
    vi.useFakeTimers({ now: 5_000_000 });
    const session = new GameSession(interrogation, players, { minutes: 3, rounds: 0 }, {
      isAutomated: () => false,
      onChange: () => {},
      onEnd: () => {},
    });
    for (const p of players) session.submit(p.id, { type: 'ack' });
    const view = session.snapshot(null).view as InterrogationView;
    const target = view.players.find((p) => p.id !== view.inspector)!.id;
    expect(session.submit(view.inspector, { type: 'accuse', target })).toBeNull();
    vi.advanceTimersByTime(10 * 60_000);
    expect((session.snapshot(null).view as InterrogationView).phase).toBe('review');
    expect((session.snapshot(null).view as InterrogationView).accused).toBe(target);
    session.dispose();
  });
});
