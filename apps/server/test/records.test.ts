import type { AddressInfo } from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import { io as connectClient, type Socket } from 'socket.io-client';
import type { CourtView } from '@arcade/court';
import type { GameSnapshot } from '@arcade/game-sdk';
import { Accounts } from '../src/accounts';
import { createArcadeServer, createServices, type ArcadeServer } from '../src/app';
import { RECORD_TOP, RecordBook } from '../src/records';
import { MemoryStore } from '../src/store';

describe('Tableau des records', () => {
  it('garde les 10 meilleurs ; à égalité, le premier arrivé reste devant', async () => {
    const store = new MemoryStore();
    const book = await RecordBook.load(store);
    const entry = (value: number, name: string, at: number) =>
      book.submit({ game: 'plunder', key: 'loot', value, names: [name], verified: false }, at);
    for (let i = 1; i <= RECORD_TOP; i++) expect(await entry(i * 10, `J${i}`, i)).not.toBeNull();
    expect(await entry(5, 'Trop faible', 50)).toBeNull();
    expect(await entry(10, 'Égalité avec le dernier', 51)).toBeNull();
    expect(await entry(100, 'Ex aequo', 52)).toBe(2); // derrière J10, arrivé avant
    expect(await entry(0, 'Zéro', 53)).toBeNull();
    const top = book.top('plunder', 'loot');
    expect(top).toHaveLength(RECORD_TOP);
    expect(top.map((r) => r.names[0]).slice(0, 3)).toEqual(['J10', 'Ex aequo', 'J9']);
    // Le stockage ne garde que le tableau (le 10e d'avant a été retiré).
    expect(await store.listRecords()).toHaveLength(RECORD_TOP);
    expect((await RecordBook.load(store)).top('plunder', 'loot')[0]!.names).toEqual(['J10']);
  });
});

describe('Records des parties en ligne', () => {
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

  it('une partie de La Cité terminée inscrit ses records (pseudo du compte si connecté)', async () => {
    const services = await createServices(new MemoryStore());
    server = await createArcadeServer({ corsOrigin: true, services });
    await new Promise<void>((resolve) => server!.http.listen(0, resolve));
    const url = `http://localhost:${(server.http.address() as AddressInfo).port}`;
    const reg = await services.accounts.register({ name: 'Camille', password: 'motdepasse1' });
    expect(reg.ok).toBe(true);

    const connect = async (account?: string) => {
      const s = connectClient(url, { transports: ['websocket'], forceNew: true, auth: account ? { account } : {} });
      sockets.push(s);
      const session = await new Promise<{ playerId: string }>((resolve) => s.once('session', resolve));
      return { s, id: session.playerId };
    };
    const host = await connect(reg.ok ? reg.token : undefined);
    const guest = await connect();
    const chat: string[] = [];
    host.s.on('chat:message', (m: { text: string }) => chat.push(m.text));
    const created = await call(host.s, 'room:create', { name: 'Cam', gameId: 'court' });
    await call(guest.s, 'room:join', { name: 'Invité', code: created.code });

    // Stratégie déterministe : Revenu jusqu'à 7 écus, puis Conspiration (imparable, incontrable).
    const latest = new Map<Socket, CourtView>();
    const ended = new Promise<void>((resolve) => {
      for (const p of [host, guest]) {
        p.s.on('game:snapshot', (snap: GameSnapshot<CourtView>) => {
          latest.set(p.s, snap.view);
          const v = snap.view;
          if (v.phase === 'over') return resolve();
          if (v.phase === 'turn' && v.active === p.id) {
            const me = v.players.find((x) => x.id === p.id)!;
            const other = v.players.find((x) => x.id !== p.id)!;
            void call(p.s, 'game:move', {
              move: me.coins >= 7 ? { type: 'act', kind: 'conspiracy', target: other.id } : { type: 'act', kind: 'income' },
            });
          }
          if (v.phase === 'loss' && v.losing === p.id) void call(p.s, 'game:move', { move: { type: 'lose', card: v.me!.hand[0] } });
        });
      }
    });
    expect((await call(host.s, 'room:start')).ok).toBe(true);
    await ended;
    await new Promise((r) => setTimeout(r, 100));

    const res = await fetch(`${url}/api/records`);
    const data = (await res.json()) as {
      games: { id: string; records: { key: string; entries: { names: string[]; verified: boolean; value: number }[] }[] }[];
    };
    const coins = data.games.find((g) => g.id === 'court')!.records.find((r) => r.key === 'coins')!;
    expect(coins.entries.map((e) => e.names[0]).sort()).toEqual(['Camille', 'Invité']);
    expect(coins.entries.find((e) => e.names[0] === 'Camille')!.verified).toBe(true);
    expect(coins.entries.find((e) => e.names[0] === 'Invité')!.verified).toBe(false);
    expect(coins.entries.every((e) => e.value >= 7)).toBe(true);
    // Le salon annonce les performances qui entrent au tableau.
    expect(chat.some((t) => t.startsWith('🏆 Nouveau record') && t.includes('écus'))).toBe(true);
    // Les jeux sans record n'apparaissent pas ; Butin, Gobelets et Boussole oui.
    expect(data.games.map((g) => g.id).sort()).toEqual(['compass', 'court', 'cups', 'plunder']);
  }, 30_000);
});
