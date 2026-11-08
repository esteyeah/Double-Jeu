import { create } from 'zustand';
import type { ApiUser, ApiWord } from '@arcade/protocol';
import { KEYS, storage } from './storage';

/**
 * Adresse de l'API HTTP (même serveur que le jeu en ligne) :
 * - `same-origin` : même adresse que la page (`pnpm play`, Render) ;
 * - une URL explicite (déploiement séparé) ;
 * - par défaut : même hôte que la page, port 4000 (dev).
 */
function apiBase(): string {
  const configured = process.env.NEXT_PUBLIC_SERVER_URL;
  if (configured === 'same-origin') return '';
  return configured || `${window.location.protocol}//${window.location.hostname}:4000`;
}

export type ApiResult<T> = ({ ok: true } & T) | { ok: false; error: string };

export async function api<T = object>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
  { timeoutMs = 10_000 }: { timeoutMs?: number } = {},
): Promise<ApiResult<T>> {
  const token = storage.get(KEYS.account);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const data = (await res.json().catch(() => null)) as ApiResult<T> | null;
    return data ?? { ok: false, error: `Erreur ${res.status}.` };
  } catch {
    return { ok: false, error: 'Serveur injoignable. Vérifie ta connexion.' };
  } finally {
    clearTimeout(timer);
  }
}

// ───────── Compte ─────────

interface AccountState {
  status: 'unknown' | 'anonymous' | 'signedIn';
  user: ApiUser | null;
}

export const useAccount = create<AccountState>(() => ({ status: 'unknown', user: null }));

let checking: Promise<void> | null = null;

/** Vérifie une fois le jeton gardé sur cet appareil. */
export function loadAccount(): Promise<void> {
  if (checking) return checking;
  checking = (async () => {
    if (!storage.get(KEYS.account)) return void useAccount.setState({ status: 'anonymous', user: null });
    const res = await api<{ user: ApiUser }>('GET', '/api/auth/me');
    if (res.ok) useAccount.setState({ status: 'signedIn', user: res.user });
    else {
      // Jeton expiré ou révoqué ; si le serveur est injoignable, on reste prudemment « anonyme ».
      if (res.error === 'Non connecté.') storage.remove(KEYS.account);
      useAccount.setState({ status: 'anonymous', user: null });
    }
  })();
  return checking;
}

export async function signIn(mode: 'login' | 'register', name: string, password: string): Promise<string | null> {
  const res = await api<{ token: string; user: ApiUser }>('POST', `/api/auth/${mode}`, { name, password });
  if (!res.ok) return res.error;
  storage.set(KEYS.account, res.token);
  // Le pseudo du compte devient le pseudo de jeu par défaut.
  storage.set(KEYS.name, res.user.name);
  useAccount.setState({ status: 'signedIn', user: res.user });
  checking = Promise.resolve();
  return null;
}

export async function signOut(): Promise<void> {
  await api('POST', '/api/auth/logout');
  storage.remove(KEYS.account);
  useAccount.setState({ status: 'anonymous', user: null });
  checking = Promise.resolve();
}

// ───────── Mots ajoutés aux jeux ─────────

export async function fetchWords(gameId: string, timeoutMs?: number) {
  return api<{ baseCount: number; words: ApiWord[] }>('GET', `/api/words/${gameId}`, undefined, { timeoutMs });
}
