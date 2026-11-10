'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { NAME_MAX } from '@arcade/protocol';
import { getClientGame } from '@/games/registry';
import { getSocket, request, resetOnlineRoom, useOnline } from '@/lib/online';
import { KEYS, storage, mySkin } from '@/lib/storage';
import { Button, ErrorNote, Panel } from '../ui/kit';
import { Chat } from './Chat';
import { Lobby } from './Lobby';
import { OnlineGame } from './OnlineGame';

export function RoomScreen({ code }: { code: string }) {
  const router = useRouter();
  const { room, snapshot, playerId, connection, left, chat } = useOnline();
  /** `null` = pas encore lu depuis le stockage, `''` = à demander. */
  const [name, setName] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [seenChat, setSeenChat] = useState(0);

  useEffect(() => {
    resetOnlineRoom();
    setName(storage.get(KEYS.name)?.trim() ?? '');
  }, []);

  // Rejoindre le salon, et le re-rejoindre automatiquement après chaque reconnexion.
  useEffect(() => {
    if (!name) return;
    const socket = getSocket();
    const join = async () => {
      const res = await request('room:join', { name, code, skin: mySkin() });
      setError(res.ok ? null : res.error);
    };
    if (socket.connected) void join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
    };
  }, [name, code]);

  useEffect(() => {
    if (chatOpen) setSeenChat(chat.length);
  }, [chatOpen, chat.length]);
  const unread = Math.max(0, chat.length - seenChat);

  async function leave() {
    await request('room:leave', {});
    resetOnlineRoom();
    router.push('/');
  }

  function submitName(e: FormEvent) {
    e.preventDefault();
    const n = draft.trim();
    if (!n) return;
    storage.set(KEYS.name, n);
    setName(n);
  }

  if (name === '') {
    return (
      <Centered>
        <Panel className="w-full max-w-sm">
          <form onSubmit={submitName} className="flex flex-col gap-3">
            <label htmlFor="pseudo" className="font-semibold">
              Choisis un pseudo pour rejoindre le salon <span className="font-mono">{code}</span>
            </label>
            <input
              id="pseudo"
              autoFocus
              value={draft}
              maxLength={NAME_MAX}
              onChange={(e) => setDraft(e.target.value)}
              className="rounded-xl border border-line bg-bg px-4 py-3 outline-none focus:border-accent"
            />
            <Button type="submit" variant="primary">
              Rejoindre
            </Button>
          </form>
        </Panel>
      </Centered>
    );
  }

  if (left) {
    return (
      <Centered>
        <Panel className="max-w-sm text-center">
          <p>{left === 'kicked' ? 'L’hôte t’a retiré du salon.' : 'Tu as quitté le salon.'}</p>
          <Link href="/" className="mt-4 inline-block text-accent">
            Retour à l’accueil
          </Link>
        </Panel>
      </Centered>
    );
  }

  if (!room) {
    return (
      <Centered>
        {error ? (
          <Panel className="flex max-w-sm flex-col gap-3 text-center">
            <ErrorNote>{error}</ErrorNote>
            <Link href="/" className="text-accent">
              Retour à l’accueil
            </Link>
          </Panel>
        ) : (
          <p className="text-muted">
            {connection === 'disconnected' ? 'Connexion au serveur perdue, nouvelle tentative…' : 'Connexion au salon…'}
          </p>
        )}
      </Centered>
    );
  }

  // Jeux immersifs : en partie, le plateau occupe tout l'écran (chat et menu passent en panneaux).
  if (room.status !== 'lobby' && getClientGame(room.gameId)?.immersive) {
    return <OnlineGame room={room} snapshot={snapshot} me={playerId} onLeave={leave} />;
  }

  return (
    // pb-24 : sur mobile, le bouton Chat flottant ne doit pas masquer le bas de la page.
    <main className="mx-auto max-w-6xl px-4 pt-4 pb-24 sm:pt-6 lg:pb-6">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/" className="text-sm text-muted hover:text-fg" aria-label="Accueil">
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-muted">Salon</div>
          <div className="flex items-center gap-2 font-mono text-lg font-bold tracking-[0.2em]">
            {room.code}
            <span
              className={`h-2 w-2 rounded-full ${connection === 'connected' ? 'bg-good' : 'animate-pulse bg-key'}`}
              title={connection === 'connected' ? 'connecté' : 'reconnexion…'}
            />
          </div>
        </div>
        <Button variant="ghost" onClick={leave}>
          Quitter
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {room.status === 'lobby' ? (
            <Lobby room={room} me={playerId} />
          ) : (
            <OnlineGame room={room} snapshot={snapshot} me={playerId} />
          )}
        </div>
        <aside className="sticky top-4 hidden h-[calc(100dvh-7rem)] lg:block">
          <Chat className="h-full" />
        </aside>
      </div>

      {/* Chat mobile : bouton flottant + panneau du bas */}
      <button
        type="button"
        onClick={() => setChatOpen(true)}
        className="fixed right-4 bottom-4 z-20 rounded-full border border-line bg-surface-2 px-4 py-3 text-sm font-semibold shadow-xl lg:hidden"
      >
        Chat
        {unread > 0 && (
          <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-bg">{unread}</span>
        )}
      </button>
      {chatOpen && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end bg-bg/70 lg:hidden" onClick={() => setChatOpen(false)}>
          <div className="h-[70dvh] animate-pop p-2" onClick={(e) => e.stopPropagation()}>
            <Chat className="h-full" />
          </div>
          <Button variant="ghost" className="mx-auto mb-2" onClick={() => setChatOpen(false)}>
            Fermer
          </Button>
        </div>
      )}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-dvh items-center justify-center px-4">{children}</main>;
}
