'use client';

import { useEffect, useState } from 'react';
import type { GameSnapshot, PlayerId } from '@arcade/game-sdk';
import type { RoomState } from '@arcade/protocol';
import { getClientGame, type ClientGame } from '@/games/registry';
import { request, useOnline } from '@/lib/online';
import { AvatarProvider } from '@arcade/tabletop';
import { Drawer, FullscreenButton, HudButton, HudIcon, ResultOverlay, SoundButton, Stage, StageButton, Toast } from '../immersive/Stage';
import { Button, ErrorNote, ResultBanner, Rules } from '../ui/kit';
import { Chat } from './Chat';

export function OnlineGame({
  room,
  snapshot,
  me,
  onLeave,
}: {
  room: RoomState;
  snapshot: GameSnapshot | null;
  me: PlayerId | null;
  onLeave?: () => void;
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

  if (game.immersive) {
    return (
      <ImmersiveOnline
        game={game}
        room={room}
        snapshot={snapshot}
        me={me}
        seated={seated}
        isHost={isHost}
        error={error}
        sendMove={sendMove}
        onLeave={onLeave}
      />
    );
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

/** Partie en ligne en plein écran : le plateau d'abord, le reste dans des panneaux. */
function ImmersiveOnline({
  game,
  room,
  snapshot,
  me,
  seated,
  isHost,
  error,
  sendMove,
  onLeave,
}: {
  game: ClientGame;
  room: RoomState;
  snapshot: GameSnapshot;
  me: PlayerId | null;
  seated: boolean;
  isHost: boolean;
  error: string | null;
  sendMove: (move: unknown) => void;
  onLeave?: () => void;
}) {
  const chat = useOnline((s) => s.chat);
  const [panel, setPanel] = useState<'chat' | 'menu' | null>(null);
  const [seen, setSeen] = useState(chat.length);
  const [spectatorNote, setSpectatorNote] = useState(!seated);
  useEffect(() => {
    if (panel === 'chat') setSeen(chat.length);
  }, [panel, chat.length]);
  useEffect(() => {
    if (!spectatorNote) return;
    const t = setTimeout(() => setSpectatorNote(false), 5000);
    return () => clearTimeout(t);
  }, [spectatorNote]);

  const { Board } = game;
  const { result } = snapshot;
  const nameOf = (id: PlayerId) => room.seats.find((s) => s.id === id)?.name ?? '?';
  const absent = room.seats.filter((s) => !s.isBot && (!s.connected || s.autopilot));
  const unread = Math.max(0, chat.length - seen);

  return (
    <Stage
      skin={game.immersive}
      hud={
        <>
          <HudButton label="Discussion" onClick={() => setPanel('chat')} badge={unread}>
            <HudIcon name="chat" />
          </HudButton>
          <HudButton label="Menu" onClick={() => setPanel('menu')} badge={absent.length}>
            <HudIcon name="menu" />
          </HudButton>
          <SoundButton />
          <FullscreenButton />
        </>
      }
    >
      <AvatarProvider skins={Object.fromEntries(room.seats.map((s) => [s.id, s.skin]))}>
        <Board view={snapshot.view} viewer={seated ? me : null} actingAs={seated ? me : null} mode="online" sendMove={sendMove} />
      </AvatarProvider>

      {result && (
        <ResultOverlay
          title={result.title}
          detail={result.detail}
          winners={result.winners.map(nameOf)}
          outcome={seated && me ? (result.winners.includes(me) ? 'win' : 'lose') : null}
          actions={
            isHost ? (
              <>
                <StageButton onClick={() => request('room:start', {})}>Rejouer</StageButton>
                <StageButton tone="secondary" onClick={() => request('room:backToLobby', {})}>
                  Retour au salon
                </StageButton>
              </>
            ) : (
              <p className="text-sm opacity-75">En attente de l’hôte pour la suite…</p>
            )
          }
        />
      )}

      {error && <Toast tone="error">{error}</Toast>}
      {!error && spectatorNote && <Toast>Tu regardes cette partie en spectateur : tu joueras à la suivante.</Toast>}

      <Drawer title="Discussion" open={panel === 'chat'} onClose={() => setPanel(null)}>
        <Chat title={false} className="h-full rounded-none border-0 bg-transparent" />
      </Drawer>
      <Drawer title={game.module.meta.name} open={panel === 'menu'} onClose={() => setPanel(null)}>
        <div className="flex flex-col gap-5 p-4 text-sm">
          <section>
            <div className="text-xs uppercase tracking-wide text-muted">Code du salon</div>
            <div className="font-mono text-2xl font-bold tracking-[0.25em]">{room.code}</div>
          </section>
          <section>
            <div className="text-xs uppercase tracking-wide text-muted">Joueurs</div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {room.seats.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${s.isBot ? 'bg-muted' : s.connected && !s.autopilot ? 'bg-good' : 'bg-key'}`}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {s.name}
                    {s.id === me && <span className="text-accent"> (toi)</span>}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {s.isBot ? 'bot' : s.autopilot ? 'absent : un bot joue' : s.connected ? '' : 'se reconnecte…'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <Rules rules={game.module.meta.rules} />
          <div className="flex flex-col gap-2">
            {isHost && !result && (
              <Button
                variant="danger"
                onClick={() => {
                  if (window.confirm('Arrêter la partie pour tout le monde ?')) void request('room:backToLobby', {});
                }}
              >
                Arrêter la partie
              </Button>
            )}
            {onLeave && <Button onClick={onLeave}>Quitter le salon</Button>}
          </div>
        </div>
      </Drawer>
    </Stage>
  );
}
