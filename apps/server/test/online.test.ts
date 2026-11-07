import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { io as connectClient, type Socket } from 'socket.io-client';
import type { GameSnapshot } from '@arcade/game-sdk';
import type {
  ClientToServerEvents,
  RoomState,
  ServerToClientEvents,
} from '@arcade/protocol';
import type { ReactorView } from '@arcade/reactor';
import { createArcadeServer, type ArcadeServer } from '../src/app';

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;
type Snapshot = GameSnapshot<ReactorView>;

let server: ArcadeServer;
let url: string;
const open: Client[] = [];

beforeAll(async () => {
  server = createArcadeServer({ corsOrigin: true });
  await new Promise<void>((resolve) => server.http.listen(0, resolve));
  url = `http://localhost:${(server.http.address() as AddressInfo).port}`;
});
afterEach(() => {
  for (const s of open.splice(0)) s.disconnect();
});
afterAll(() => server.close());

async function connect(token?: string) {
  const socket: Client = connectClient(url, {
    auth: token ? { token } : {},
    transports: ['websocket'],
    forceNew: true,
  });
  open.push(socket);
  const session = await new Promise<{ token: string; playerId: string }>((resolve) =>
    socket.once('session', resolve),
  );
  return { socket, ...session };
}

// Appel générique avec accusé de réception (le typage fin est testé ailleurs).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (socket: Client, event: string, payload: unknown = {}): Promise<any> =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (socket.timeout(3000) as any).emitWithAck(event, payload);

function waitFor<T>(socket: Client, event: 'game:snapshot' | 'room:state', pred: (x: T) => boolean = () => true, ms = 8000) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Pas de ${event} attendu`)), ms);
    const handler = (x: T) => {
      if (!pred(x)) return;
      clearTimeout(timer);
      socket.off(event, handler as never);
      resolve(x);
    };
    socket.on(event, handler as never);
  });
}

async function roomWithPlayers(humans: number, bots: number) {
  const host = await connect();
  const created = await call(host.socket, 'room:create', { name: 'Hôte', gameId: 'reactor' });
  expect(created.ok).toBe(true);
  const others = [];
  for (let i = 0; i < humans - 1; i++) {
    const c = await connect();
    expect((await call(c.socket, 'room:join', { name: `J${i}`, code: created.code })).ok).toBe(true);
    others.push(c);
  }
  for (let i = 0; i < bots; i++) expect((await call(host.socket, 'room:addBot')).ok).toBe(true);
  return { host, others, code: created.code as string };
}

describe('lobby', () => {
  it('crée un salon, le rejoint par code et diffuse l’état public', async () => {
    const host = await connect();
    const { code } = await call(host.socket, 'room:create', { name: 'Alice', gameId: 'reactor' });
    expect(code).toMatch(/^[A-Z2-9]{5}$/);
    const guest = await connect();
    const state = waitFor<RoomState>(host.socket, 'room:state', (s) => s.seats.length === 2);
    expect((await call(guest.socket, 'room:join', { name: 'Bob', code: code.toLowerCase() })).ok).toBe(true);
    const s = await state;
    expect(s.seats.map((x) => x.name)).toEqual(['Alice', 'Bob']);
    expect(s.hostId).toBe(host.playerId);
  });

  it('refuse les codes inconnus, les payloads mal formés et les actions réservées à l’hôte', async () => {
    const { others } = await roomWithPlayers(2, 0);
    const guest = others[0]!;
    expect((await call(guest.socket, 'room:join', { name: 'X', code: 'ZZZZZ' })).ok).toBe(false);
    expect((await call(guest.socket, 'room:join', { name: '', code: 'ABCDE' })).ok).toBe(false);
    expect((await call(guest.socket, 'room:join', 'pas un objet')).ok).toBe(false);
    expect((await call(guest.socket, 'room:addBot')).error).toMatch(/hôte/);
    expect((await call(guest.socket, 'room:start')).error).toMatch(/hôte/);
  });

  it('applique les options validées et refuse les valeurs hors liste', async () => {
    const host = await connect();
    await call(host.socket, 'room:create', { name: 'Hôte', gameId: 'interrogation' });
    const updated = waitFor<RoomState>(host.socket, 'room:state', (s) => s.config.minutes === 3);
    expect((await call(host.socket, 'room:setConfig', { config: { minutes: 3 } })).ok).toBe(true);
    expect((await updated).config).toEqual({ minutes: 3, rounds: 0 });
    expect((await call(host.socket, 'room:setConfig', { config: { minutes: 999 } })).ok).toBe(false);
    expect((await call(host.socket, 'room:setConfig', { config: { rounds: 'beaucoup' } })).ok).toBe(false);
  });

  it('refuse de lancer La Cité sans assez de personnages pour la table', async () => {
    const host = await connect();
    await call(host.socket, 'room:create', { name: 'Hôte', gameId: 'court' });
    expect((await call(host.socket, 'room:setConfig', { config: { characters: ['banker', 'guard'] } })).ok).toBe(true);
    for (let i = 0; i < 3; i++) await call(host.socket, 'room:addBot');
    expect((await call(host.socket, 'room:start')).error).toMatch(/au moins 4 personnages/);
  });

  it('refuse les bots dans un jeu de parole', async () => {
    const host = await connect();
    await call(host.socket, 'room:create', { name: 'Hôte', gameId: 'interrogation' });
    expect((await call(host.socket, 'room:addBot')).error).toMatch(/sans bots/);
  });

  it('refuse de lancer sans assez de joueurs', async () => {
    const { host } = await roomWithPlayers(1, 2);
    expect((await call(host.socket, 'room:start')).error).toMatch(/4 à 8/);
  });
});

describe('partie en ligne', () => {
  it('Garde à vue : la partie démarre avec la durée choisie, rôles masqués', async () => {
    const host = await connect();
    const { code } = await call(host.socket, 'room:create', { name: 'Hôte', gameId: 'interrogation' });
    await call(host.socket, 'room:setConfig', { config: { minutes: 7, rounds: 3 } });
    const guests = [];
    for (let i = 0; i < 3; i++) {
      const g = await connect();
      await call(g.socket, 'room:join', { name: `S${i}`, code });
      guests.push(g);
    }
    const snap = waitFor<GameSnapshot<{ totalRounds: number; minutes: number; culprit: unknown; me: { role: string } }>>(
      guests[0]!.socket,
      'game:snapshot',
    );
    expect((await call(host.socket, 'room:start')).ok).toBe(true);
    const { view } = await snap;
    expect(view.totalRounds).toBe(3);
    expect(view.minutes).toBe(7);
    expect(view.culprit).toBeNull();
    expect(['inspector', 'culprit', 'innocent']).toContain(view.me.role);
  });

  it('chaque joueur ne reçoit que SA vue (rôles des autres masqués)', async () => {
    const { host, others } = await roomWithPlayers(2, 2);
    const guest = others[0]!;
    const hostSnap = waitFor<Snapshot>(host.socket, 'game:snapshot');
    const guestSnap = waitFor<Snapshot>(guest.socket, 'game:snapshot');
    expect((await call(host.socket, 'room:start')).ok).toBe(true);

    for (const [snapPromise, me] of [
      [hostSnap, host.playerId],
      [guestSnap, guest.playerId],
    ] as const) {
      const { view } = await snapPromise;
      expect(view.me?.id).toBe(me);
      expect(view.me?.role).toMatch(/tech|saboteur/);
      for (const p of view.players) {
        if (p.id !== me) expect(p.role).toBeNull();
        expect(p.slots.every((k) => k === null)).toBe(true);
      }
    }
  });

  it('refuse un coup joué hors de son tour, et les bots font avancer la partie', async () => {
    const { host } = await roomWithPlayers(1, 3);
    const first = waitFor<Snapshot>(host.socket, 'game:snapshot');
    await call(host.socket, 'room:start');
    const { view } = await first;
    const target = view.players.find((p) => p.id !== host.playerId)!.id;
    // Pas encore la phase d'ouverture : refusé.
    const early = await call(host.socket, 'game:move', { move: { type: 'cut', target, slot: 0 } });
    expect(early.ok).toBe(false);

    const cutPhase = waitFor<Snapshot>(host.socket, 'game:snapshot', (s) => s.view.phase === 'cut', 12_000);
    expect((await call(host.socket, 'game:move', { move: { type: 'ack' } })).ok).toBe(true);
    const s = await cutPhase;
    expect(s.view.players.every((p) => p.acked)).toBe(true);
  }, 20_000);

  it('un joueur qui se reconnecte avec son jeton retrouve son siège et sa vue', async () => {
    const { host, others, code } = await roomWithPlayers(2, 2);
    const guest = others[0]!;
    const started = waitFor<Snapshot>(guest.socket, 'game:snapshot');
    await call(host.socket, 'room:start');
    const before = await started;
    guest.socket.disconnect();

    const back = await connect(guest.token);
    expect(back.playerId).toBe(guest.playerId);
    const again = waitFor<Snapshot>(back.socket, 'game:snapshot');
    expect((await call(back.socket, 'room:join', { name: 'J0', code })).ok).toBe(true);
    const after = await again;
    expect(after.view.me?.role).toBe(before.view.me?.role);
  });

  it('un jeton inconnu donne une nouvelle identité (impossible d’usurper un joueur)', async () => {
    const a = await connect();
    const b = await connect('jeton-invente');
    expect(b.playerId).not.toBe(a.playerId);
    expect(b.token).not.toBe('jeton-invente');
  });
});
