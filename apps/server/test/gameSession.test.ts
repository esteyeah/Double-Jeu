import { afterEach, describe, expect, it, vi } from 'vitest';
import { interrogation, type InterrogationView } from '@arcade/interrogation';
import { GameSession } from '../src/gameSession';

const players = Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, name: `J${i}`, isBot: false }));

afterEach(() => {
  vi.useRealTimers();
});

describe('GameSession — chrono imposé par le serveur', () => {
  it('Garde à vue : fin d’interrogatoire → paris → délai d’accusation, sans action de l’Enquêteur', () => {
    vi.useFakeTimers({ now: 1_000_000 });
    let changes = 0;
    const session = new GameSession(interrogation, players, { minutes: 3, rounds: 0 }, {
      isAutomated: () => false,
      onChange: () => changes++,
      onEnd: () => {},
    });
    const view = () => session.snapshot(null).view as InterrogationView;

    for (const p of players) expect(session.submit(p.id, { type: 'ack' })).toBeNull();
    expect(view().phase).toBe('interrogation');

    vi.advanceTimersByTime(3 * 60_000 - 1_000);
    expect(view().phase).toBe('interrogation');

    vi.advanceTimersByTime(2_000);
    expect(view().phase).toBe('bets');

    // Les paris n'ont pas de chrono : on attend les suspects.
    vi.advanceTimersByTime(10 * 60_000);
    expect(view().phase).toBe('bets');
    for (const p of view().players) if (p.id !== view().inspector) session.submit(p.id, { type: 'bet', found: true });
    expect(view().phase).toBe('accusation');

    vi.advanceTimersByTime(61_000);
    expect(view().phase).toBe('review');
    expect(view().accused).toBeNull();
    expect(changes).toBeGreaterThanOrEqual(players.length + 5);
    session.dispose();
  });

  it('clore l’interrogatoire avant la fin annule le chrono', () => {
    vi.useFakeTimers({ now: 5_000_000 });
    const session = new GameSession(interrogation, players, { minutes: 3, rounds: 0 }, {
      isAutomated: () => false,
      onChange: () => {},
      onEnd: () => {},
    });
    const view = () => session.snapshot(null).view as InterrogationView;
    for (const p of players) session.submit(p.id, { type: 'ack' });
    expect(session.submit(view().inspector, { type: 'close' })).toBeNull();
    vi.advanceTimersByTime(10 * 60_000);
    expect(view().phase).toBe('bets');
    for (const p of view().players) if (p.id !== view().inspector) session.submit(p.id, { type: 'bet', found: false });
    const target = view().players.find((p) => p.id !== view().inspector)!.id;
    expect(session.submit(view().inspector, { type: 'accuse', target })).toBeNull();
    expect(view().phase).toBe('review');
    expect(view().accused).toBe(target);
    session.dispose();
  });
});
