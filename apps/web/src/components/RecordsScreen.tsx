'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatRecordValue } from '@arcade/game-sdk';
import { fetchRecords, type ApiGameRecords } from '@/lib/api';
import { ErrorNote, Panel } from './ui/kit';

const MEDAL = ['🥇', '🥈', '🥉'];
const formatDate = (at: number) => new Date(at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export function RecordsScreen() {
  const [games, setGames] = useState<ApiGameRecords[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    void fetchRecords().then((res) => {
      if (!res.ok) return setError(res.error);
      setGames(res.games);
      setSelected((s) => s ?? res.games[0]?.id ?? null);
    });
  }, []);

  const game = games?.find((g) => g.id === selected) ?? null;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:py-10">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-sm text-muted hover:text-fg">
          ←
        </Link>
        <h1 className="text-xl font-bold">🏆 Records</h1>
      </header>
      <p className="text-sm text-muted">
        Les meilleures performances, partie après partie. Seules les parties <strong>en ligne</strong> comptent (le serveur
        arbitre tout, impossible de tricher), et jamais les bots. Un ✓ signale un joueur connecté à son compte.
      </p>
      <ErrorNote>{error}</ErrorNote>
      {!games && !error && <p className="text-sm text-muted">Chargement…</p>}

      {games && (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Jeu">
          {games.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={g.id === selected}
              onClick={() => setSelected(g.id)}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                g.id === selected ? 'border-accent bg-accent/15 text-fg' : 'border-line text-muted hover:text-fg'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {game?.records.map((r) => (
        <Panel key={r.key}>
          <h2 className="font-semibold">{r.label}</h2>
          {r.entries.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Aucun record pour l’instant : à toi de jouer !</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-1.5">
              {r.entries.map((e, i) => (
                <li
                  key={`${e.at}-${i}`}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${i === 0 ? 'border-key/60 bg-key/5' : 'border-line'}`}
                >
                  <span className="w-7 shrink-0 text-center tabular-nums text-muted">{MEDAL[i] ?? `${i + 1}.`}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {e.names.join(', ')}
                      {e.verified && <span className="ml-1 text-good" title="Joueur(s) connecté(s) à leur compte">✓</span>}
                    </span>
                    <span className="block text-xs text-muted">
                      {formatDate(e.at)}
                      {e.detail ? ` · ${e.detail}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-right font-bold tabular-nums">
                    {formatRecordValue(e.value, r.unit)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      ))}
    </main>
  );
}
