import { defineGame, visibleLog, type GameMeta, type PlayerId, type Rng } from '@arcade/game-sdk';
import { wordKey } from '@arcade/protocol';
import {
  PERFECT,
  SLOTS,
  WINDS,
  WIND_LABEL,
  compassConfigSchema,
  compassMoveSchema,
  rating,
  type Card,
  type CompassBoard,
  type CompassConfig,
  type CompassMove,
  type CompassState,
  type CompassView,
  type Guess,
  type Placement,
  type Rot,
  type Slot,
} from './shared';
import { BASE_WORDS } from './words';

export const compassMeta: GameMeta = {
  id: 'compass',
  name: 'Boussole',
  tagline: 'Un mot pour en relier deux : retrouvez ensemble la boussole de chacun. Jeu coopératif.',
  minPlayers: 2,
  maxPlayers: 6,
  durationMinutes: [20, 30],
  supportsHotseat: true,
  supportsBots: false,
  settings: [
    {
      key: 'decoys',
      label: 'Cartes leurres',
      choices: [
        { value: 1, label: '1 (classique)' },
        { value: 2, label: '2 (difficile)' },
      ],
    },
  ],
  rules: [
    'Jeu coopératif. Chacun reçoit sa boussole : quatre cartes de quatre mots posées en carré. Sur chaque bord extérieur, deux mots se font face : au Nord, à l’Est, au Sud et à l’Ouest.',
    'En secret, chacun écrit quatre indices : pour chaque point cardinal, UN seul mot qui relie les deux mots de ce côté. Interdit d’utiliser un mot de ses cartes.',
    'Puis, boussole après boussole, l’équipe reçoit les quatre indices et les cartes mélangées avec un leurre (ou deux), dans n’importe quel sens. Les autres joueurs discutent pour replacer et tourner les cartes. L’auteur, lui, reste muet !',
    `Tout juste du premier coup : ${PERFECT} points. Sinon, les cartes mal placées sont retirées et l’équipe a un second essai : 1 point par carte bien placée à la fin.`,
    `But : le meilleur score d’équipe possible (${PERFECT} points par joueur au maximum).`,
  ],
};

// ───────── Aides ─────────

const ids = (s: CompassState) => s.players.map((p) => p.id);
const isPlayer = (s: CompassState, id: PlayerId | null | undefined): id is PlayerId => !!id && Object.hasOwn(s.boards, id);
const nameOf = (s: CompassState, id: PlayerId | null) => s.players.find((p) => p.id === id)?.name ?? '?';
const currentBoard = (s: CompassState): CompassBoard | null => (s.phase === 'guess' || s.phase === 'reveal' ? s.boards[s.order[s.index]!]! : null);
const total = (s: CompassState) => Object.values(s.boards).reduce((sum, b) => sum + (b.score ?? 0), 0);
const isClueWord = (w: string) => /^[\p{L}\p{N}][\p{L}\p{N}'’-]*$/u.test(w);

function log(s: CompassState, text: string, visibleTo: 'all' | PlayerId[] = 'all'): void {
  s.log.push({ text, visibleTo });
}

/** Mots de la partie : la liste de base et les mots ajoutés, sans doublons. */
export function wordPool(extra: readonly string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of [...BASE_WORDS, ...extra]) {
    const word = w.trim();
    const key = wordKey(word);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}

function freshGuess(board: CompassBoard, rng: Rng): Guess {
  return {
    board: [null, null, null, null],
    // Les cartes arrivent dans un sens quelconque : l'orientation d'origine ne se devine pas.
    rotations: Object.fromEntries(board.cards.map((c) => [c.id, rng.int(4) as Rot])),
    locked: [false, false, false, false],
    attempt: 1,
    missed: [],
  };
}

const correctAt = (board: CompassBoard, guess: Guess, slot: Slot) => {
  const card = guess.board[slot];
  const sol = board.solution[slot]!;
  return card === sol.card && guess.rotations[card] === sol.rot;
};

// ───────── Module ─────────

export const compass = defineGame<CompassState, CompassMove, CompassView, CompassConfig>({
  meta: compassMeta,
  configSchema: compassConfigSchema,
  defaultConfig: { decoys: 1 },
  moveSchema: compassMoveSchema,
  wordBank: { base: BASE_WORDS },

  setup(players, config, rng, extras) {
    const perPlayer = 4 + config.decoys;
    const pool = rng.shuffle(wordPool(extras?.words));
    if (pool.length < players.length * perPlayer * 4) throw new Error('Pas assez de mots pour cette table.');
    const boards: Record<PlayerId, CompassBoard> = {};
    for (const p of players) {
      const dealt = Array.from({ length: perPlayer }, () => pool.splice(0, 4) as Card['words']);
      // Les identifiants sont attribués APRÈS mélange : ils ne trahissent pas la position d'origine.
      const order = rng.shuffle(dealt.map((_, i) => i));
      const cards: Card[] = order.map((from, id) => ({ id, words: dealt[from]! }));
      const solution: Placement[] = SLOTS.map((slot) => ({ card: order.indexOf(slot), rot: rng.int(4) as Rot }));
      boards[p.id] = { owner: p.id, cards, solution, clues: null, score: null };
    }
    return {
      players: players.map((p) => ({ ...p })),
      config,
      phase: 'write',
      boards,
      order: rng.shuffle(players.map((p) => p.id)),
      index: 0,
      guess: null,
      log: [{ text: 'Chacun découvre sa boussole et écrit ses quatre indices en secret.', visibleTo: 'all' }],
    };
  },

  expectedActors(s) {
    switch (s.phase) {
      case 'write':
        return ids(s).filter((id) => !s.boards[id]!.clues);
      case 'guess':
        return ids(s).filter((id) => id !== s.order[s.index]);
      case 'reveal':
        return ids(s);
      default:
        return [];
    }
  },

  validate(s, by, move) {
    if (s.phase === 'over') return 'La partie est terminée.';
    if (!isPlayer(s, by)) return 'Tu ne participes pas à cette partie.';
    const board = currentBoard(s);
    const guessing = s.phase === 'guess' && board && s.guess;
    switch (move.type) {
      case 'clues': {
        if (s.phase !== 'write') return "Ce n'est pas le moment d'écrire.";
        const mine = s.boards[by]!;
        if (mine.clues) return 'Tes indices sont déjà écrits.';
        const forbidden = new Set(mine.solution.flatMap((p) => mine.cards.find((c) => c.id === p.card)!.words.map(wordKey)));
        for (const wind of WINDS) {
          const clue = move.clues[wind].trim();
          if (!isClueWord(clue)) return `Indice ${WIND_LABEL[wind]} : un seul mot, sans espace.`;
          if (forbidden.has(wordKey(clue))) return `Indice ${WIND_LABEL[wind]} : interdit d’utiliser un mot de tes cartes.`;
        }
        return null;
      }
      case 'place':
      case 'clear':
      case 'rotate':
      case 'submit': {
        if (!guessing) return "Ce n'est pas le moment.";
        if (by === board.owner) return 'C’est ta boussole : tu restes muet et tu regardes !';
        const g = s.guess!;
        const lockedCard = (card: number) => SLOTS.some((slot) => g.locked[slot] && g.board[slot] === card);
        if (move.type === 'place') {
          if (!board.cards.some((c) => c.id === move.card)) return 'Carte inconnue.';
          if (g.locked[move.slot] || lockedCard(move.card)) return 'Cette carte est déjà validée.';
          return null;
        }
        if (move.type === 'clear') return g.locked[move.slot] ? 'Cette carte est déjà validée.' : null;
        if (move.type === 'rotate') {
          if (!board.cards.some((c) => c.id === move.card)) return 'Carte inconnue.';
          return lockedCard(move.card) ? 'Cette carte est déjà validée.' : null;
        }
        return g.board.every((c) => c !== null) ? null : 'Place une carte sur les quatre emplacements.';
      }
      case 'next':
        return s.phase === 'reveal' ? null : "Ce n'est pas le moment.";
    }
  },

  apply(state, by, move, rng) {
    const s = structuredClone(state);
    switch (move.type) {
      case 'clues': {
        s.boards[by]!.clues = move.clues.map((c) => c.trim()) as CompassBoard['clues'];
        log(s, `${nameOf(s, by)} a écrit ses indices.`);
        if (Object.values(s.boards).every((b) => b.clues)) {
          s.phase = 'guess';
          s.index = 0;
          s.guess = freshGuess(s.boards[s.order[0]!]!, rng);
          log(s, `Tous les indices sont prêts. Première boussole : celle de ${nameOf(s, s.order[0]!)} (qui reste muet).`);
        }
        return s;
      }

      case 'place': {
        const g = s.guess!;
        for (const slot of SLOTS) if (g.board[slot] === move.card) g.board[slot] = null;
        g.board[move.slot] = move.card;
        return s;
      }

      case 'clear':
        s.guess!.board[move.slot] = null;
        return s;

      case 'rotate': {
        const g = s.guess!;
        g.rotations[move.card] = (((g.rotations[move.card] ?? 0) + 1) % 4) as Rot;
        return s;
      }

      case 'submit': {
        const board = currentBoard(s)!;
        const g = s.guess!;
        const good = SLOTS.filter((slot) => correctAt(board, g, slot));
        if (g.attempt === 1 && good.length === 4) {
          board.score = PERFECT;
          s.phase = 'reveal';
          log(s, `Boussole de ${nameOf(s, board.owner)} reconstituée du premier coup : ${PERFECT} points !`);
          return s;
        }
        if (g.attempt === 1) {
          g.locked = SLOTS.map((slot) => good.includes(slot));
          g.missed = SLOTS.filter((slot) => !good.includes(slot));
          for (const slot of g.missed) g.board[slot] = null;
          g.attempt = 2;
          log(
            s,
            `Premier essai : ${good.length} carte${good.length > 1 ? 's' : ''} bien placée${good.length > 1 ? 's' : ''}. Les autres sont retirées : second essai !`,
          );
          return s;
        }
        board.score = good.length;
        s.phase = 'reveal';
        log(s, `Second essai : boussole de ${nameOf(s, board.owner)} terminée avec ${good.length} point${good.length > 1 ? 's' : ''}.`);
        return s;
      }

      case 'next':
        s.index++;
        if (s.index >= s.order.length) {
          s.phase = 'over';
          s.guess = null;
          log(s, `Partie terminée : ${total(s)} points sur ${PERFECT * s.players.length}. ${rating(total(s), PERFECT * s.players.length)}`);
          return s;
        }
        s.phase = 'guess';
        s.guess = freshGuess(s.boards[s.order[s.index]!]!, rng);
        log(s, `Boussole suivante : celle de ${nameOf(s, s.order[s.index]!)}.`);
        return s;
    }
  },

  view(s, viewer): CompassView {
    const me = isPlayer(s, viewer) ? viewer : null;
    const mine = me && s.phase === 'write' ? s.boards[me]! : null;
    const board = currentBoard(s);
    const g = s.guess;
    return {
      phase: s.phase,
      config: s.config,
      players: s.players.map((p) => ({
        id: p.id,
        name: p.name,
        wrote: !!s.boards[p.id]!.clues,
        score: s.boards[p.id]!.score,
      })),
      order: s.order,
      index: s.index,
      mine: mine ? { cards: mine.cards, layout: mine.solution, clues: mine.clues } : null,
      current:
        board && g
          ? {
              owner: board.owner,
              clues: board.clues!,
              cards: board.cards,
              board: g.board,
              rotations: g.rotations,
              locked: g.locked,
              attempt: g.attempt,
              missed: g.missed,
              // La solution n'est montrée qu'à son auteur, et à tous une fois la boussole terminée.
              solution: s.phase === 'reveal' || viewer === board.owner ? board.solution : null,
              score: board.score,
            }
          : null,
      total: total(s),
      max: PERFECT * s.players.length,
      log: visibleLog(s.log, viewer),
    };
  },

  result(s) {
    if (s.phase !== 'over') return null;
    const max = PERFECT * s.players.length;
    return {
      winners: ids(s),
      title: `Score de l’équipe : ${total(s)} / ${max}`,
      detail: rating(total(s), max),
    };
  },

  hotseat: {
    // Chacun écrit ses indices en secret ; la reconstitution se fait ensemble, à découvert.
    needsPrivacy: (s) => s.phase === 'write',
  },
});

