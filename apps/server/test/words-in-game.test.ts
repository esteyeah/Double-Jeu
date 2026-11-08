import type { AddressInfo } from 'node:net';
import { afterAll, expect, it } from 'vitest';
import { io as connectClient, type Socket } from 'socket.io-client';
import type { CompassView } from '@arcade/compass';
import type { GameSnapshot } from '@arcade/game-sdk';
import { Accounts } from '../src/accounts';
import { createArcadeServer, type ArcadeServer } from '../src/app';
import { wordBankGames } from '../src/games';
import { MemoryStore } from '../src/store';
import { WordBank } from '../src/words';

let server: ArcadeServer | null = null;
const sockets: Socket[] = [];
afterAll(async () => {
  for (const s of sockets) s.disconnect();
  await server?.close();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (socket: Socket, event: string, payload: unknown = {}): Promise<any> =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (socket.timeout(3000) as any).emitWithAck(event, payload);

it('les mots ajoutés par l’administrateur sortent dans les parties en ligne', async () => {
  const store = new MemoryStore();
  const words = await WordBank.load(store, wordBankGames());
  const custom = Array.from({ length: 1500 }, (_, i) => `ajout${String.fromCharCode(97 + (i % 26))}${i}`);
  const { added } = await words.add('compass', custom, 'admin');
  expect(added).toHaveLength(1500);

  server = await createArcadeServer({ corsOrigin: true, services: { store, accounts: new Accounts(store), words, persistent: true } });
  await new Promise<void>((resolve) => server!.http.listen(0, resolve));
  const url = `http://localhost:${(server.http.address() as AddressInfo).port}`;

  const connect = async () => {
    const s = connectClient(url, { transports: ['websocket'], forceNew: true });
    sockets.push(s);
    await new Promise((resolve) => s.once('session', resolve));
    return s;
  };
  const host = await connect();
  const guest = await connect();
  const created = await call(host, 'room:create', { name: 'Hôte', gameId: 'compass' });
  expect(created.ok).toBe(true);
  expect((await call(guest, 'room:join', { name: 'Invité', code: created.code })).ok).toBe(true);

  const snapshot = new Promise<GameSnapshot<CompassView>>((resolve) =>
    host.on('game:snapshot', (s: GameSnapshot<CompassView>) => s.view.mine && resolve(s)),
  );
  expect((await call(host, 'room:start')).ok).toBe(true);
  const { view } = await snapshot;
  const dealt = view.mine!.cards.flatMap((c) => c.words);
  expect(dealt).toHaveLength(20);
  expect(dealt.some((w) => w.startsWith('ajout'))).toBe(true);
});
