'use client';

import { useEffect, useState } from 'react';
import type { GameSnapshot, PlayerId } from '@arcade/game-sdk';
import type { RoomState } from '@arcade/protocol';
import { getClientGame } from '@/games/registry';
import { request } from '@/lib/online';
import { Button, ErrorNote, ResultBanner } from '../ui/kit';

export function OnlineGame({
  room,
  snapshot,
  me,
}: {
  room: RoomState;
  snapshot: GameSnapshot | null;
  me: PlayerId | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const game = getClientGame(room.gameId);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  if (!game || !snapshot) return <p className="text-muted">Chargement de la partie…</p>;

  const seated = room.seats.some((s) => s.id === me && !s.isBot);
  const isHost = me === room.hostId;
  const nameOf = (id: PlayerId) => room.seats.find((s) => s.id === id)?.name ?? '?';
  const absent = room.seats.filter((s) => !s.isBot && (!s.connected || s.autopilot));
  const { result } = snapshot;
  const { Board } = game;

  async function sendMove(move: unknown) {
    const res = await request('game:move', { move });
    setError(res.ok ? null : res.error);
  }

  return (
    <div className="flex flex-col gap-4">
      {result && (
        <>
          <ResultBanner
            title={result.title}
            detail={result.detail}
            winners={result.winners.map(nameOf)}
          />
          {isHost ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="primary" onClick={() => request('room:start', {})}>
                Rejouer
              </Button>
              <Button onClick={() => request('room:backToLobby', {})}>Retour au salon</Button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted">En attente de l’hôte pour la suite…</p>
          )}
        </>
      )}

      {absent.length > 0 && (
        <p className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-muted">
          {absent
            .map((s) => `${s.name} ${s.autopilot ? 'est absent : un bot joue à sa place' : 'se reconnecte…'}`)
            .join(' · ')}
        </p>
      )}
      {!seated && (
        <p className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">
          Tu regardes cette partie en spectateur. Tu pourras jouer à la suivante.
        </p>
      )}
      <ErrorNote>{error}</ErrorNote>

      <Board
        view={snapshot.view}
        viewer={seated ? me : null}
        actingAs={seated ? me : null}
        mode="online"
        sendMove={sendMove}
      />

      {isHost && !result && (
        <div className="flex justify-end">
          <Button
            variant="danger"
            className="px-3 py-1.5 text-xs"
            onClick={() => {
              if (window.confirm('Arrêter la partie pour tout le monde ?')) {
                void request('room:backToLobby', {});
              }
            }}
          >
            Arrêter la partie
          </Button>
        </div>
      )}
    </div>
  );
}
