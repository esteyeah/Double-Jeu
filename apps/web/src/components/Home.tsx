'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { NAME_MAX, ROOM_CODE_LENGTH } from '@arcade/protocol';
import { catalog } from '@/games/registry';
import { loadAccount, useAccount } from '@/lib/api';
import { request } from '@/lib/online';
import { KEYS, storage } from '@/lib/storage';
import { Button, ErrorNote, Panel } from './ui/kit';

export function Home() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const account = useAccount();
  useEffect(() => {
    setName(storage.get(KEYS.name) ?? '');
    void loadAccount();
  }, []);
  // Connecté et sans pseudo : on reprend celui du compte.
  useEffect(() => {
    if (account.user && !storage.get(KEYS.name)) setName(account.user.name);
  }, [account.user]);

  const updateName = (value: string) => {
    setName(value);
    storage.set(KEYS.name, value);
  };

  const requireName = (): string | null => {
    const n = name.trim();
    if (!n) {
      setError('Choisis d’abord un pseudo.');
      nameRef.current?.focus();
      return null;
    }
    return n;
  };

  async function createRoom(gameId: string) {
    const n = requireName();
    if (!n) return;
    setBusy(gameId);
    setError(null);
    const res = await request('room:create', { name: n, gameId });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    router.push(`/room/${res.code}`);
  }

  function joinRoom(e: FormEvent) {
    e.preventDefault();
    if (!requireName()) return;
    const c = code.trim().toUpperCase();
    if (c.length !== ROOM_CODE_LENGTH) return setError(`Le code fait ${ROOM_CODE_LENGTH} caractères.`);
    router.push(`/room/${c}`);
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Double <span className="text-accent">Jeu</span>
          </h1>
          <div className="mt-1 flex min-w-0 shrink-0 flex-col items-end gap-1.5 sm:flex-row">
            <Link
              href="/records"
              className="rounded-xl border border-line bg-surface px-3 py-2 text-sm hover:border-accent/60"
            >
              🏆 Records
            </Link>
            <Link
              href="/compte"
              className="max-w-[10rem] truncate rounded-xl border border-line bg-surface px-3 py-2 text-sm hover:border-accent/60"
            >
              {account.status === 'signedIn' && account.user ? `👤 ${account.user.name}` : 'Se connecter'}
            </Link>
          </div>
        </div>
        <p className="mt-1 text-muted">
          Rôles cachés, bluff et déduction. En ligne entre amis, ou sur un seul téléphone qu’on se
          passe.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <label htmlFor="name" className="text-sm font-semibold">
            Ton pseudo
          </label>
          <input
            id="name"
            ref={nameRef}
            value={name}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            onChange={(e) => updateName(e.target.value)}
            placeholder="ex. Camille"
            className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 outline-none focus:border-accent"
          />
          <p className="mt-2 text-xs text-muted">
            Pas besoin de compte pour jouer : ton pseudo est gardé sur cet appareil.{' '}
            {account.status !== 'signedIn' && (
              <Link href="/compte" className="text-accent">
                Créer un compte
              </Link>
            )}
          </p>
        </Panel>

        <Panel>
          <form onSubmit={joinRoom}>
            <label htmlFor="code" className="text-sm font-semibold">
              Rejoindre un salon
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="code"
                value={code}
                maxLength={ROOM_CODE_LENGTH}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CODE"
                className="w-full min-w-0 rounded-xl border border-line bg-bg px-4 py-3 font-mono text-lg tracking-[0.3em] uppercase outline-none focus:border-accent"
              />
              <Button type="submit" variant="primary" className="shrink-0 px-5">
                Entrer
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted">Demande le code à 5 caractères à l’hôte.</p>
          </form>
        </Panel>
      </div>

      <ErrorNote>{error}</ErrorNote>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Les jeux</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((g) => (
            <article
              key={g.id}
              className={`flex flex-col rounded-2xl border border-line bg-gradient-to-br ${g.accent} to-surface to-60% p-4 ${
                g.ready ? '' : 'opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold">{g.name}</h3>
                <span className="shrink-0 rounded-md border border-line bg-bg/40 px-2 py-0.5 text-xs text-muted">
                  {g.players} joueurs
                </span>
              </div>
              <p className="mt-1 flex-1 text-sm text-muted">{g.tagline}</p>
              {g.ready ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="primary"
                    disabled={busy !== null}
                    onClick={() => createRoom(g.id)}
                  >
                    {busy === g.id ? 'Création…' : 'Salon en ligne'}
                  </Button>
                  <Link
                    href={`/local/${g.id}`}
                    className="inline-flex items-center justify-center rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-center text-sm hover:border-accent/60"
                  >
                    Un seul téléphone
                  </Link>
                </div>
              ) : (
                <span className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
                  Bientôt
                </span>
              )}
            </article>
          ))}
        </div>
      </section>
      <footer className="mt-10 border-t border-line pt-4 text-xs leading-relaxed text-muted">
        Icônes : <a className="underline underline-offset-2 hover:text-fg" href="https://game-icons.net" target="_blank" rel="noreferrer">game-icons.net</a>{' '}
        (Lorc, Delapouite et contributeurs, CC BY 3.0). Textures : Poly Haven et ambientCG (CC0). Polices sous licence SIL OFL.
      </footer>
    </main>
  );
}
