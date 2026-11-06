'use client';

import { useState } from 'react';
import type { PlayerId } from '@arcade/game-sdk';
import type { Ack, RoomState } from '@arcade/protocol';
import { getClientGame } from '@/games/registry';
import { request } from '@/lib/online';
import { Button, ErrorNote, Panel, Rules } from '../ui/kit';
import { SettingsForm } from '../ui/Settings';
import { InviteBox } from './Invite';

export function Lobby({ room, me }: { room: RoomState; me: PlayerId | null }) {
  const [error, setError] = useState<string | null>(null);
  const meta = getClientGame(room.gameId)?.module.meta;
  const isHost = me === room.hostId;
  const n = room.seats.length;
  const max = meta?.maxPlayers ?? 8;
  const missing = meta ? Math.max(0, meta.minPlayers - n) : 0;
  const canStart = !!meta && n >= meta.minPlayers && n <= meta.maxPlayers;
  const hostName = room.seats.find((s) => s.id === room.hostId)?.name ?? 'l’hôte';

  async function run(p: Promise<Ack>) {
    const res = await p;
    setError(res.ok ? null : res.error);
  }

  return (
    <div className="flex flex-col gap-4">
      {meta && (
        <Panel>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl font-bold">{meta.name}</h2>
            <span className="text-sm text-muted">
              {meta.minPlayers}–{meta.maxPlayers} joueurs · {meta.durationMinutes[0]}–
              {meta.durationMinutes[1]} min
            </span>
          </div>
          <p className="mt-1 text-muted">{meta.tagline}</p>
          {meta.settings && (
            <div className="mt-4">
              <SettingsForm
                settings={meta.settings}
                config={room.config}
                readOnly={!isHost}
                onChange={(patch) => run(request('room:setConfig', { config: patch }))}
              />
            </div>
          )}
          <div className="mt-3">
            <Rules rules={meta.rules} />
          </div>
        </Panel>
      )}

      <Panel>
        <h3 className="flex items-baseline justify-between text-sm font-semibold uppercase tracking-wide text-muted">
          <span>Joueurs</span>
          <span className="tabular-nums">
            {n} / {max}
          </span>
        </h3>
        <ul className="mt-3 flex flex-col gap-2">
          {room.seats.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${s.connected ? 'bg-good' : 'bg-muted'}`}
                title={s.connected ? 'connecté' : 'déconnecté'}
              />
              <span className="min-w-0 flex-1 truncate font-medium">
                {s.name}
                {s.id === me && <span className="text-accent"> (toi)</span>}
              </span>
              {s.id === room.hostId && (
                <span className="text-xs font-semibold text-key">hôte</span>
              )}
              {s.isBot && <span className="text-xs text-muted">bot</span>}
              {!s.connected && <span className="text-xs text-muted">reconnexion…</span>}
              {isHost && s.id !== me && (
                <button
                  type="button"
                  onClick={() => run(request('room:removeSeat', { playerId: s.id }))}
                  className="rounded-md px-2 py-1 text-xs text-muted hover:bg-sabo/10 hover:text-sabo"
                  aria-label={`Retirer ${s.name}`}
                >
                  Retirer
                </button>
              )}
            </li>
          ))}
        </ul>

        {room.spectators.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            Spectateurs : {room.spectators.map((s) => s.name).join(', ')}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {isHost ? (
            <>
              {meta?.supportsBots && (
                <Button disabled={n >= max} onClick={() => run(request('room:addBot', {}))}>
                  + Ajouter un bot
                </Button>
              )}
              <Button
                variant="primary"
                disabled={!canStart}
                onClick={() => run(request('room:start', {}))}
                className="sm:ml-auto"
              >
                Lancer la partie
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted">En attente que {hostName} lance la partie…</p>
          )}
        </div>
        {isHost && missing > 0 && (
          <p className="mt-2 text-xs text-muted">
            Encore {missing} joueur{missing > 1 ? 's' : ''}
            {meta?.supportsBots ? ` (ou bot${missing > 1 ? 's' : ''})` : ''} pour lancer.
          </p>
        )}
        {meta && !meta.supportsBots && (
          <p className="mt-2 text-xs text-muted">
            Jeu de parole : il se joue entre humains, autour d’une table ou en appel vocal.
          </p>
        )}
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Panel>

      <InviteBox code={room.code} />
    </div>
  );
}
