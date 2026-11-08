'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { ACCOUNT_NAME_MIN, NAME_MAX, PASSWORD_MIN } from '@arcade/protocol';
import { loadAccount, signIn, signOut, useAccount } from '@/lib/api';
import { Button, ErrorNote, Panel } from '../ui/kit';

export function AccountScreen() {
  const { status, user } = useAccount();
  useEffect(() => void loadAccount(), []);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6 sm:py-10">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-sm text-muted hover:text-fg">
          ←
        </Link>
        <h1 className="text-xl font-bold">Mon compte</h1>
      </header>

      {status === 'unknown' && <p className="text-sm text-muted">Chargement…</p>}

      {status === 'signedIn' && user && (
        <Panel className="flex flex-col gap-3">
          <p>
            Connecté en tant que <strong>{user.name}</strong>
            {user.admin && (
              <span className="ml-2 rounded border border-key/60 px-1.5 py-0.5 text-[11px] uppercase text-key">admin</span>
            )}
          </p>
          <p className="text-sm text-muted">
            Ton pseudo de compte est utilisé par défaut dans les salons. Les points et les déblocages arriveront plus tard.
          </p>
          {user.admin && (
            <Link
              href="/admin/mots"
              className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg hover:brightness-110"
            >
              Gérer les mots des jeux
            </Link>
          )}
          <Button onClick={() => void signOut()}>Se déconnecter</Button>
        </Panel>
      )}

      {status === 'anonymous' && <SignInForm />}
    </main>
  );
}

function SignInForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === 'register' && password !== confirm) return setError('Les deux mots de passe ne correspondent pas.');
    setBusy(true);
    setError(await signIn(mode, name, password));
    setBusy(false);
  }

  return (
    <Panel>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-line p-1" role="tablist">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === m ? 'bg-accent text-bg' : 'text-muted hover:text-fg'}`}
          >
            {m === 'login' ? 'Connexion' : 'Créer un compte'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Pseudo</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={ACCOUNT_NAME_MIN}
            maxLength={NAME_MAX}
            required
            autoComplete="username"
            className="rounded-xl border border-line bg-bg px-3 py-2.5 outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={PASSWORD_MIN}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="rounded-xl border border-line bg-bg px-3 py-2.5 outline-none focus:border-accent"
          />
        </label>
        {mode === 'register' && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Confirme le mot de passe</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={PASSWORD_MIN}
              required
              autoComplete="new-password"
              className="rounded-xl border border-line bg-bg px-3 py-2.5 outline-none focus:border-accent"
            />
          </label>
        )}
        <ErrorNote>{error}</ErrorNote>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Un instant…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </Button>
        <p className="text-xs text-muted">
          {mode === 'register'
            ? `Pseudo de ${ACCOUNT_NAME_MIN} à ${NAME_MAX} caractères, mot de passe de ${PASSWORD_MIN} caractères minimum. Pas d’e-mail demandé : note bien ton mot de passe.`
            : 'Pas besoin de compte pour jouer : il sert à garder ton pseudo (et bientôt tes points).'}
        </p>
      </form>
    </Panel>
  );
}
