'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyDeadline,
  applyMove,
  cryptoRng,
  nextBotMove,
  type PlayerId,
  type PlayerInfo,
  type SetupExtras,
} from '@arcade/game-sdk';
import type { ClientGame } from '@/games/registry';
import { Button, ErrorNote, ResultBanner } from '../ui/kit';
import { Handoff } from './Handoff';

/**
 * Partie sur un seul appareil, générique pour tous les jeux :
 * - phase privée (`hotseat.needsPrivacy`) → on passe le téléphone à chaque joueur attendu ;
 * - phase publique → un écran partagé qui ne montre que la vue « spectateur ».
 * Le moteur tourne dans le navigateur : aucune connexion n'est nécessaire.
 */
export function LocalGame({
  game,
  players,
  config,
  extras,
  onReplay,
  onExit,
}: {
  game: ClientGame;
  players: PlayerInfo[];
  config: Record<string, unknown>;
  /** Mots ajoutés depuis le site, chargés avant la partie si le jeu en accepte. */
  extras?: SetupExtras;
  onReplay: () => void;
  onExit: () => void;
}) {
  const mod = game.module;
  const { Board } = game;
  const rng = useMemo(() => cryptoRng(), []);
  const [state, setState] = useState<unknown>(() => mod.setup(players, config, rng, extras));
  /** Joueur qui a confirmé tenir le téléphone pendant la phase privée. */
  const [unlockedFor, setUnlockedFor] = useState<PlayerId | null>(null);
  /** « Revoir mes cartes » pendant une phase publique. */
  const [peek, setPeek] = useState<{ who: PlayerId | null; unlocked: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const humans = useMemo(() => players.filter((p) => !p.isBot).map((p) => p.id), [players]);
  const bots = useMemo(() => players.filter((p) => p.isBot).map((p) => p.id), [players]);
  const nameOf = (id: PlayerId) => players.find((p) => p.id === id)?.name ?? '?';

  const result = mod.result(state);
  const privacy = !result && (mod.hotseat?.needsPrivacy(state) ?? false);
  const expected = mod.expectedActors(state);
  const pendingHuman = expected.find((id) => humans.includes(id)) ?? null;

  // Quand une nouvelle phase privée commence, l'écran se reverrouille.
  const wasPrivate = useRef(privacy);
  useEffect(() => {
    if (privacy && !wasPrivate.current) setUnlockedFor(null);
    wasPrivate.current = privacy;
  }, [privacy]);

  // Les bots jouent tout seuls, avec un petit délai pour rester lisibles.
  useEffect(() => {
    if (result || bots.length === 0) return;
    const next = nextBotMove(mod, state, bots, rng);
    if (!next) return;
    const t = setTimeout(() => {
      const out = applyMove(mod, state, next.by, next.move, rng);
      if (out.ok) setState(out.state);
    }, 650);
    return () => clearTimeout(t);
  }, [state, result, bots, mod, rng]);

  // Chrono imposé : à l'échéance, le moteur fait avancer la partie (même sans action).
  useEffect(() => {
    const at = mod.deadline?.(state) ?? null;
    if (at === null || result) return;
    const t = setTimeout(
      () => {
        const next = applyDeadline(mod, state, rng);
        if (next) setState(next);
      },
      Math.max(0, at - Date.now()) + 50,
    );
    return () => clearTimeout(t);
  }, [state, result, mod, rng]);

  const play = (by: PlayerId) => (move: unknown) => {
    const out = applyMove(mod, state, by, move, rng);
    if (!out.ok) return setError(out.error);
    setError(null);
    setState(out.state);
    setUnlockedFor(null); // après chaque action, l'écran privé se referme
  };
  const noop = () => {};

  // ── Un seul humain face à des bots : rien à lui cacher, il voit toujours ses informations. ──
  const solo = humans.length === 1 ? humans[0]! : null;
  if (solo) {
    const acting = !result && expected.includes(solo) ? solo : null;
    const waitingBots = !result && !acting && expected.length > 0;
    return (
      <div className="flex flex-col gap-4">
        {result && (
          <ResultBanner title={result.title} detail={result.detail} winners={result.winners.map(nameOf)} />
        )}
        {result && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={onReplay}>
              Rejouer
            </Button>
            <Button onClick={onExit}>Changer les joueurs</Button>
          </div>
        )}
        {waitingBots && (
          <p className="text-sm text-muted">
            {expected.map(nameOf).join(', ')} réfléchi{expected.length > 1 ? 'ssent' : 't'}…
          </p>
        )}
        <ErrorNote>{error}</ErrorNote>
        <Board
          view={mod.view(state, solo)}
          viewer={solo}
          actingAs={acting}
          mode="hotseat"
          sendMove={acting ? play(solo) : noop}
        />
      </div>
    );
  }

  // ── Revoir ses cartes (écran privé à la demande) ──
  if (peek) {
    if (!peek.who) {
      return (
        <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-center">
          <p className="text-muted">Qui veut revoir ses informations secrètes ?</p>
          <div className="flex max-w-md flex-wrap justify-center gap-2">
            {humans.map((id) => (
              <Button key={id} onClick={() => setPeek({ who: id, unlocked: false })}>
                {nameOf(id)}
              </Button>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setPeek(null)}>
            Annuler
          </Button>
        </div>
      );
    }
    if (!peek.unlocked) {
      return (
        <Handoff
          name={nameOf(peek.who)}
          onReady={() => setPeek({ ...peek, unlocked: true })}
          onCancel={() => setPeek(null)}
        />
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <PrivateBanner name={nameOf(peek.who)} />
        <Board view={mod.view(state, peek.who)} viewer={peek.who} actingAs={null} mode="hotseat" sendMove={noop} />
        <Button variant="primary" onClick={() => setPeek(null)}>
          Cacher et rendre le téléphone
        </Button>
      </div>
    );
  }

  // ── Phase privée : chacun son tour ──
  if (privacy && pendingHuman) {
    if (unlockedFor !== pendingHuman) {
      return <Handoff name={nameOf(pendingHuman)} onReady={() => setUnlockedFor(pendingHuman)} />;
    }
    return (
      <div className="flex flex-col gap-4">
        <PrivateBanner name={nameOf(pendingHuman)} />
        <ErrorNote>{error}</ErrorNote>
        <Board
          view={mod.view(state, pendingHuman)}
          viewer={pendingHuman}
          actingAs={pendingHuman}
          mode="hotseat"
          sendMove={play(pendingHuman)}
        />
      </div>
    );
  }

  // ── Écran public partagé ──
  const actor = result ? null : pendingHuman;
  const botThinking = !result && !actor && expected.length > 0;
  return (
    <div className="flex flex-col gap-4">
      {result && (
        <ResultBanner title={result.title} detail={result.detail} winners={result.winners.map(nameOf)} />
      )}
      {result && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={onReplay}>
            Rejouer
          </Button>
          <Button onClick={onExit}>Changer les joueurs</Button>
        </div>
      )}
      {botThinking && (
        <p className="text-sm text-muted">
          {expected.map(nameOf).join(', ')} réfléchi{expected.length > 1 ? 'ssent' : 't'}…
        </p>
      )}
      <ErrorNote>{error}</ErrorNote>
      <Board
        view={mod.view(state, null)}
        viewer={null}
        actingAs={actor}
        mode="hotseat"
        sendMove={actor ? play(actor) : noop}
      />
      {!result && humans.length > 0 && (
        <Button onClick={() => setPeek({ who: null, unlocked: false })}>
          Revoir mes informations secrètes
        </Button>
      )}
    </div>
  );
}

function PrivateBanner({ name }: { name: string }) {
  return (
    <div className="rounded-xl border border-accent/50 bg-accent/10 px-4 py-2 text-sm">
      Écran privé de <strong>{name}</strong> : ne le montre à personne.
    </div>
  );
}
