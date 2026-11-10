'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PlayerInfo, SetupExtras } from '@arcade/game-sdk';
import { NAME_MAX } from '@arcade/protocol';
import { getClientGame, type ClientGame } from '@/games/registry';
import { fetchWords } from '@/lib/api';
import { KEYS, storage } from '@/lib/storage';
import { Button, ErrorNote, Panel, Rules } from '../ui/kit';
import { SettingsForm } from '../ui/Settings';
import { LocalGame } from './LocalGame';

interface RosterEntry {
  name: string;
  isBot: boolean;
}

export function LocalScreen({ gameId }: { gameId: string }) {
  const game = getClientGame(gameId);
  const [players, setPlayers] = useState<PlayerInfo[] | null>(null);
  const [config, setConfig] = useState<Record<string, unknown>>(() => ({
    ...((game?.module.defaultConfig as Record<string, unknown> | undefined) ?? {}),
    ...(game?.module.meta.hotseatDefaults ?? {}),
  }));
  const [gameKey, setGameKey] = useState(0);
  const [extras, setExtras] = useState<SetupExtras>({});

  if (!game || !game.module.meta.supportsHotseat) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p>Ce jeu n’est pas disponible en mode local.</p>
        <Link href="/" className="mt-4 inline-block text-accent">
          Retour à l’accueil
        </Link>
      </main>
    );
  }

  // Plateau immersif : la scène plein écran est elle-même l'élément principal de la page.
  const Wrapper = players && game.immersive ? 'div' : 'main';
  return (
    <Wrapper className="mx-auto max-w-4xl px-4 py-4 sm:py-6">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/"
          className="text-sm text-muted hover:text-fg"
          onClick={(e) => {
            if (players && !window.confirm('Quitter la partie en cours ?')) e.preventDefault();
          }}
        >
          ←
        </Link>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wide text-muted">Partie locale · un seul téléphone</div>
          <div className="text-lg font-bold">{game.module.meta.name}</div>
        </div>
      </header>

      {players ? (
        <LocalGame
          key={gameKey}
          game={game}
          players={players}
          config={config}
          extras={extras}
          onReplay={() => setGameKey((k) => k + 1)}
          onExit={() => setPlayers(null)}
        />
      ) : (
        <LocalSetup
          game={game}
          config={config}
          onConfig={(patch) => setConfig((c) => ({ ...c, ...patch }))}
          onStart={async (roster) => {
            // Mots ajoutés par l'administrateur : on les prend s'ils arrivent vite, sinon on joue avec la liste de base.
            if (game.module.wordBank) {
              const res = await fetchWords(game.module.meta.id, 2500);
              setExtras(res.ok ? { words: res.words.map((w) => w.word) } : {});
            }
            setPlayers(
              roster.map((p, i) => ({
                id: `local_${i}`,
                name: p.name.trim(),
                isBot: game.module.meta.supportsBots && p.isBot,
              })),
            );
          }}
        />
      )}
    </Wrapper>
  );
}

function defaultRoster(min: number): RosterEntry[] {
  const me = storage.get(KEYS.name)?.trim();
  return Array.from({ length: min }, (_, i) => ({
    name: i === 0 && me ? me : `Joueur ${i + 1}`,
    isBot: false,
  }));
}

function LocalSetup({
  game,
  config,
  onConfig,
  onStart,
}: {
  game: ClientGame;
  config: Record<string, unknown>;
  onConfig: (patch: Record<string, unknown>) => void;
  onStart: (r: RosterEntry[]) => void | Promise<void>;
}) {
  const { meta } = game.module;
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(storage.get(KEYS.localRoster) ?? 'null') as RosterEntry[] | null;
      if (Array.isArray(saved) && saved.length > 0) {
        setRoster(saved.slice(0, meta.maxPlayers));
        return;
      }
    } catch {
      /* stockage corrompu : on repart des valeurs par défaut */
    }
    setRoster(defaultRoster(meta.minPlayers));
  }, [meta.maxPlayers, meta.minPlayers]);

  const update = (i: number, patch: Partial<RosterEntry>) =>
    setRoster((r) => r.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  function start() {
    const names = roster.map((p) => p.name.trim());
    if (roster.length < meta.minPlayers || roster.length > meta.maxPlayers) {
      return setError(`${meta.name} se joue de ${meta.minPlayers} à ${meta.maxPlayers} joueurs.`);
    }
    if (names.some((n) => !n)) return setError('Chaque joueur a besoin d’un nom.');
    if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) {
      return setError('Deux joueurs ont le même nom.');
    }
    const blocked = game.module.canStart?.(roster.length, config);
    if (blocked) return setError(blocked);
    storage.set(KEYS.localRoster, JSON.stringify(roster));
    onStart(roster);
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <p className="text-sm text-muted">
          Un seul appareil pour toute la table. Quand le jeu a besoin d’une info secrète, il demande
          de passer le téléphone au bon joueur, qui confirme avant que l’écran ne s’affiche.{' '}
          {meta.supportsBots ? 'Les bots jouent tout seuls. ' : 'Les discussions se font de vive voix. '}
          Aucune connexion nécessaire une fois la page chargée.
        </p>
        {meta.settings && (
          <div className="mt-4">
            <SettingsForm settings={meta.settings} config={config} onChange={onConfig} />
          </div>
        )}
        <div className="mt-3">
          <Rules rules={meta.rules} />
        </div>
      </Panel>

      <Panel>
        <h2 className="flex justify-between text-sm font-semibold uppercase tracking-wide text-muted">
          <span>Joueurs</span>
          <span className="tabular-nums">
            {roster.length} / {meta.maxPlayers}
          </span>
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {roster.map((p, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                value={p.name}
                maxLength={NAME_MAX}
                onChange={(e) => update(i, { name: e.target.value })}
                aria-label={`Nom du joueur ${i + 1}`}
                className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2.5 outline-none focus:border-accent"
              />
              {meta.supportsBots && (
                <button
                  type="button"
                  onClick={() => update(i, { isBot: !p.isBot })}
                  aria-pressed={p.isBot}
                  className={`w-20 shrink-0 rounded-xl border px-2 py-2.5 text-xs font-semibold ${
                    p.isBot ? 'border-accent/60 text-accent' : 'border-line text-muted'
                  }`}
                >
                  {p.isBot ? 'Bot' : 'Humain'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setRoster((r) => r.filter((_, j) => j !== i))}
                aria-label={`Retirer ${p.name || `le joueur ${i + 1}`}`}
                className="shrink-0 rounded-xl px-3 py-2.5 text-muted hover:text-sabo"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            disabled={roster.length >= meta.maxPlayers}
            onClick={() =>
              setRoster((r) => [...r, { name: `Joueur ${r.length + 1}`, isBot: false }])
            }
          >
            + Ajouter un joueur
          </Button>
          <Button variant="primary" className="sm:ml-auto" onClick={start}>
            Lancer la partie
          </Button>
        </div>
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      </Panel>
    </div>
  );
}
