import {
  defineGame,
  visibleLog,
  type GameMeta,
  type PlayerId,
  type PlayerInfo,
  type Rng,
} from '@arcade/game-sdk';
import { reactorBot } from './bot';
import {
  CARD_LABEL,
  FIRST_ROUND_CARDS,
  ROLE_POOL,
  ROUNDS,
  reactorConfigSchema,
  reactorMoveSchema,
  type CardKind,
  type HandCounts,
  type ReactorConfig,
  type ReactorMove,
  type ReactorOutcome,
  type ReactorState,
  type ReactorView,
  type Role,
  type Slot,
} from './shared';

export const reactorMeta: GameMeta = {
  id: 'reactor',
  name: 'Réacteur',
  tagline: 'Ouvrez les bonnes trappes avant la fusion du cœur.',
  minPlayers: 4,
  maxPlayers: 8,
  durationMinutes: [10, 20],
  supportsHotseat: true,
  supportsBots: true,
  rules: [
    "Le cœur de la station orbitale s'emballe. Chacun reçoit en secret un rôle : Technicien ou Saboteur. Personne ne connaît le rôle des autres, et un rôle a parfois été écarté : on ne sait pas toujours combien il y a de Saboteurs.",
    'Au début de chaque manche, chacun découvre en secret ses trappes : combien de Barres de contrôle il possède, et s’il cache la Surcharge. Elles sont ensuite mélangées face cachée : même leur propriétaire ne sait plus laquelle est laquelle.',
    'Annoncez ce que vous avez… ou mentez. Le porteur de la clé ouvre une trappe chez un autre joueur, puis lui passe la clé.',
    "Après autant d'ouvertures que de joueurs, la manche s'arrête : les trappes encore fermées sont mélangées et redistribuées, avec une carte de moins par joueur.",
    'Les Techniciens gagnent dès que toutes les Barres de contrôle sont ouvertes (une par joueur). Les Saboteurs gagnent si la Surcharge est ouverte, ou si les 4 manches passent sans stabiliser le cœur.',
  ],
};

// ───────── Aides ─────────

function repeat<T>(value: T, count: number): T[] {
  return Array.from({ length: count }, () => value);
}

function nameOf(s: ReactorState, id: PlayerId): string {
  return s.players.find((p) => p.id === id)?.name ?? '?';
}

function handOf(s: ReactorState, id: PlayerId): Slot[] {
  return Object.hasOwn(s.hands, id) ? (s.hands[id] as Slot[]) : [];
}

function isPlayer(s: ReactorState, id: PlayerId | null): id is PlayerId {
  return id !== null && Object.hasOwn(s.roles, id);
}

function log(s: ReactorState, text: string): void {
  s.log.push({ text, visibleTo: 'all' });
}

function countHand(slots: readonly Slot[]): HandCounts {
  const c: HandCounts = { rod: 0, overload: 0, empty: 0 };
  for (const slot of slots) c[slot.kind]++;
  return c;
}

function deal(
  players: readonly PlayerInfo[],
  cards: readonly CardKind[],
  perPlayer: number,
  rng: Rng,
): Record<PlayerId, Slot[]> {
  if (cards.length !== players.length * perPlayer) {
    throw new Error(`Distribution impossible : ${cards.length} cartes pour ${players.length}×${perPlayer}`);
  }
  const deck = rng.shuffle(cards);
  const hands: Record<PlayerId, Slot[]> = {};
  players.forEach((p, i) => {
    hands[p.id] = deck
      .slice(i * perPlayer, (i + 1) * perPlayer)
      .map((kind) => ({ kind, revealed: false }));
  });
  return hands;
}

const OUTCOME_TEXT: Record<ReactorOutcome['reason'], string> = {
  rods: 'Toutes les Barres de contrôle sont en place : les Techniciens stabilisent le réacteur !',
  overload: 'La Surcharge est ouverte : le cœur entre en fusion, les Saboteurs gagnent !',
  timeout: `${ROUNDS} manches sans stabiliser le cœur : les Saboteurs gagnent !`,
};

function finish(s: ReactorState, winner: Role, reason: ReactorOutcome['reason']): void {
  s.phase = 'over';
  s.outcome = { winner, reason };
  log(s, OUTCOME_TEXT[reason]);
}

function endRound(s: ReactorState, rng: Rng): void {
  if (s.round === ROUNDS) {
    finish(s, 'saboteur', 'timeout');
    return;
  }
  const remaining = s.players.flatMap((p) =>
    handOf(s, p.id)
      .filter((slot) => !slot.revealed)
      .map((slot) => slot.kind),
  );
  s.round++;
  const perPlayer = FIRST_ROUND_CARDS - (s.round - 1);
  s.hands = deal(s.players, remaining, perPlayer, rng);
  s.cutsThisRound = 0;
  s.phase = 'reveal';
  s.acked = [];
  s.claims = {};
  log(
    s,
    `Manche ${s.round} : les trappes fermées sont mélangées et redistribuées (${perPlayer} chacun).`,
  );
}

// ───────── Module ─────────

export const reactor = defineGame<ReactorState, ReactorMove, ReactorView, ReactorConfig>({
  meta: reactorMeta,
  configSchema: reactorConfigSchema,
  defaultConfig: {},
  moveSchema: reactorMoveSchema,

  setup(players, _config, rng) {
    const n = players.length;
    const pool = ROLE_POOL[n];
    if (!pool) {
      throw new Error(
        `Réacteur se joue de ${reactorMeta.minPlayers} à ${reactorMeta.maxPlayers} joueurs (reçu ${n}).`,
      );
    }
    const [techs, saboteurs] = pool;
    const roleDeck = rng.shuffle<Role>([
      ...repeat<Role>('tech', techs),
      ...repeat<Role>('saboteur', saboteurs),
    ]);
    const roles: Record<PlayerId, Role> = {};
    players.forEach((p, i) => {
      roles[p.id] = roleDeck[i] as Role;
    });
    // Un rôle en trop est écarté face cachée : le nombre de Saboteurs devient incertain.
    const setAside = techs + saboteurs - n;
    const saboteursPossible = setAside > 0 ? [saboteurs - 1, saboteurs] : [saboteurs];

    const cards: CardKind[] = [
      ...repeat<CardKind>('rod', n),
      'overload',
      ...repeat<CardKind>('empty', FIRST_ROUND_CARDS * n - n - 1),
    ];

    return {
      players: players.map((p) => ({ ...p })),
      roles,
      saboteursPossible,
      hands: deal(players, cards, FIRST_ROUND_CARDS, rng),
      phase: 'reveal',
      round: 1,
      cutsThisRound: 0,
      rodsFound: 0,
      rodsTotal: n,
      holder: rng.pick(players).id,
      acked: [],
      claims: {},
      reveals: [],
      log: [{ text: 'Manche 1 : chacun découvre en secret son rôle et ses trappes.', visibleTo: 'all' }],
      outcome: null,
    };
  },

  expectedActors(s) {
    if (s.phase === 'reveal') return s.players.map((p) => p.id).filter((id) => !s.acked.includes(id));
    if (s.phase === 'cut') return [s.holder];
    return [];
  },

  validate(s, by, move) {
    if (s.phase === 'over') return 'La partie est terminée.';
    if (!isPlayer(s, by)) return 'Tu ne participes pas à cette partie.';
    switch (move.type) {
      case 'ack':
        if (s.phase !== 'reveal') return "Ce n'est pas le moment.";
        if (s.acked.includes(by)) return 'Tu as déjà confirmé.';
        return null;
      case 'claim': {
        const size = handOf(s, by).length;
        if (move.rods + (move.overload ? 1 : 0) > size) {
          return `Annonce impossible : tu n'as que ${size} trappes.`;
        }
        return null;
      }
      case 'cut': {
        if (s.phase !== 'cut') return "Ce n'est pas le moment d'ouvrir une trappe.";
        if (by !== s.holder) return "Tu n'as pas la clé.";
        if (move.target === by) return 'Tu ne peux pas ouvrir tes propres trappes.';
        if (!isPlayer(s, move.target)) return 'Joueur inconnu.';
        const slot = handOf(s, move.target)[move.slot];
        if (!slot) return 'Cette trappe n’existe pas.';
        if (slot.revealed) return 'Cette trappe est déjà ouverte.';
        return null;
      }
    }
  },

  apply(state, by, move, rng) {
    const s = structuredClone(state);
    switch (move.type) {
      case 'ack': {
        s.acked.push(by);
        if (s.acked.length === s.players.length) {
          s.phase = 'cut';
          log(s, `Tout le monde a vu ses trappes. ${nameOf(s, s.holder)} détient la clé.`);
        }
        return s;
      }
      case 'claim': {
        s.claims[by] = { rods: move.rods, overload: move.overload };
        const rods = `${move.rods} barre${move.rods > 1 ? 's' : ''}`;
        log(s, `${nameOf(s, by)} annonce ${rods}${move.overload ? ' et la Surcharge' : ''}.`);
        return s;
      }
      case 'cut': {
        const slot = handOf(s, move.target)[move.slot] as Slot;
        slot.revealed = true;
        s.reveals.push({ round: s.round, by, target: move.target, slot: move.slot, kind: slot.kind });
        s.cutsThisRound++;
        log(
          s,
          `${nameOf(s, by)} ouvre une trappe de ${nameOf(s, move.target)} : ${CARD_LABEL[slot.kind]}.`,
        );
        s.holder = move.target;
        if (slot.kind === 'overload') {
          finish(s, 'saboteur', 'overload');
          return s;
        }
        if (slot.kind === 'rod') {
          s.rodsFound++;
          if (s.rodsFound === s.rodsTotal) {
            finish(s, 'tech', 'rods');
            return s;
          }
        }
        if (s.cutsThisRound === s.players.length) endRound(s, rng);
        return s;
      }
    }
  },

  view(s, viewer): ReactorView {
    const over = s.phase === 'over';
    const me = isPlayer(s, viewer) ? viewer : null;
    return {
      phase: s.phase,
      round: s.round,
      rounds: ROUNDS,
      cutsThisRound: s.cutsThisRound,
      cutsPerRound: s.players.length,
      rodsFound: s.rodsFound,
      rodsTotal: s.rodsTotal,
      saboteursPossible: s.saboteursPossible,
      holder: s.holder,
      players: s.players.map((p) => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        // Face cachée = null. Les positions sont aléatoires et inconnues même du propriétaire.
        slots: handOf(s, p.id).map((slot) => (slot.revealed || over ? slot.kind : null)),
        claim: s.claims[p.id] ?? null,
        acked: s.acked.includes(p.id),
        role: over || p.id === me ? (s.roles[p.id] ?? null) : null,
      })),
      // Le joueur connaît le CONTENU de sa main (des comptes), pas l'ordre des trappes.
      me: me ? { id: me, role: s.roles[me] as Role, hand: countHand(handOf(s, me)) } : null,
      reveals: s.reveals,
      log: visibleLog(s.log, viewer),
      outcome: s.outcome,
    };
  },

  result(s) {
    if (!s.outcome) return null;
    const { winner, reason } = s.outcome;
    return {
      winners: s.players.filter((p) => s.roles[p.id] === winner).map((p) => p.id),
      title: winner === 'tech' ? 'Victoire des Techniciens' : 'Victoire des Saboteurs',
      detail: OUTCOME_TEXT[reason],
    };
  },

  bot: reactorBot,

  hotseat: {
    // Pendant la découverte, chacun doit voir SES trappes : on se passe le téléphone.
    // Pendant les ouvertures, tout est public : un seul écran partagé suffit.
    needsPrivacy: (s) => s.phase === 'reveal',
  },
});
