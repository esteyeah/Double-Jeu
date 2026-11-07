import { defineGame, visibleLog, type GameMeta, type PlayerId, type Rng } from '@arcade/game-sdk';
import { courtBot } from './bot';
import {
  ACTION_RULES,
  CHARACTERS,
  CHARACTER_LABEL,
  CHARACTER_POWER,
  CHARACTER_THE,
  CLASSIC_COURT,
  COPIES,
  FORCED_CONSPIRACY,
  MIN_COURT,
  START_COINS,
  charactersNeeded,
  ecus,
  courtConfigSchema,
  courtMoveSchema,
  type ActionKind,
  type Character,
  type CourtConfig,
  type CourtMove,
  type CourtState,
  type CourtView,
  type Then,
} from './shared';

export const courtMeta: GameMeta = {
  id: 'court',
  name: 'La Cité',
  tagline: 'Deux influences cachées, des écus et beaucoup de mensonges à la cour de la Cité.',
  minPlayers: 2,
  maxPlayers: 6,
  durationMinutes: [10, 20],
  supportsHotseat: true,
  supportsBots: true,
  settings: [
    {
      key: 'reaction',
      label: 'Temps pour contester ou contrer',
      choices: [
        { value: 10, label: '10 secondes' },
        { value: 20, label: '20 secondes' },
        { value: 30, label: '30 secondes' },
      ],
    },
    {
      key: 'characters',
      label: 'Personnages en jeu',
      kind: 'multi',
      min: MIN_COURT,
      max: CHARACTERS.length,
      choices: CHARACTERS.map((c) => ({ value: c, label: CHARACTER_LABEL[c], hint: CHARACTER_POWER[c] })),
    },
  ],
  hotseatDefaults: { reaction: 30 },
  rules: [
    `À la cour de la cité marchande, chacun avance masqué : 2 influences cachées (des personnages) et ${START_COINS} écus. Perds tes 2 influences et tu quittes la cour. Le dernier en lice gagne.`,
    `À ton tour, choisis une action. Toujours possibles : Revenu (+1 écu), Faveur (+2, que le Banquier peut contrer), Conspiration (7 écus : un joueur perd une influence, imparable ; obligatoire dès ${FORCED_CONSPIRACY} écus).`,
    'Actions de personnage, que tu peux annoncer même sans avoir la carte : Banquier (Taxe : +3), Bourreau (Exécution : paie 3, la cible perd une influence), Brigand (Racket : prends 2 écus à un joueur), Émissaire (Échange : pioche 2 personnages et garde ceux que tu veux).',
    'Contres : le Banquier contre la Faveur, la Garde contre l’Exécution, le Brigand et l’Émissaire contrent le Racket. Un contre est aussi une annonce : on peut mentir.',
    'Toute annonce peut être contestée. Si l’annonceur avait bien le personnage, il le montre, en pioche un autre, et le contestataire perd une influence. Sinon, c’est le menteur qui perd une influence et son action (ou son contre) échoue.',
    'Avant la partie, l’hôte choisit les personnages en jeu (3 exemplaires de chacun) : il en faut assez pour donner 2 cartes à chacun. Deux personnages en plus sont proposés : Mouchard (Espionnage : la cible te montre en secret une de ses influences) et Mercenaire (Escorte : paie 2, plus aucune action de personnage ne peut te viser jusqu’à ton prochain tour ; la Conspiration reste imparable). Un personnage absent ne peut être ni annoncé ni utilisé pour contrer.',
  ],
};

// ───────── Aides ─────────

const ids = (s: CourtState) => s.players.map((p) => p.id);
const isPlayer = (s: CourtState, id: PlayerId | null | undefined): id is PlayerId =>
  !!id && Object.hasOwn(s.seats, id);
const alive = (s: CourtState, id: PlayerId) => isPlayer(s, id) && s.seats[id]!.cards.length > 0;
const aliveIds = (s: CourtState) => ids(s).filter((id) => alive(s, id));
const nameOf = (s: CourtState, id: PlayerId | null) => s.players.find((p) => p.id === id)?.name ?? '?';

function log(s: CourtState, text: string, visibleTo: 'all' | PlayerId[] = 'all'): void {
  s.log.push({ text, visibleTo });
}

/** Personnages de cette cour capables de contrer l'action. */
export function blockersInPlay(s: CourtState, kind: ActionKind): Character[] {
  return ACTION_RULES[kind].blockedBy.filter((c) => s.config.characters.includes(c));
}

/** Joueurs dont on attend une réaction dans la fenêtre ouverte. */
export function responders(s: CourtState): PlayerId[] {
  const a = s.action;
  if (!a) return [];
  let pool: PlayerId[] = [];
  if (s.phase === 'challenge') pool = aliveIds(s).filter((id) => id !== a.actor);
  else if (s.phase === 'block') {
    const rule = ACTION_RULES[a.kind];
    if (blockersInPlay(s, a.kind).length === 0) pool = [];
    else if (rule.blockers === 'anyone') pool = aliveIds(s).filter((id) => id !== a.actor);
    else if (rule.blockers === 'target' && a.target && alive(s, a.target)) pool = [a.target];
  } else if (s.phase === 'challengeBlock' && s.block) {
    pool = aliveIds(s).filter((id) => id !== s.block!.blocker);
  }
  return pool.filter((id) => !s.passed.includes(id));
}

function openWindow(s: CourtState, phase: 'challenge' | 'block' | 'challengeBlock', now: number): void {
  s.phase = phase;
  s.passed = [];
  s.windowEndsAt = now + s.config.reaction * 1000;
}

function nextTurn(s: CourtState): void {
  s.action = null;
  s.block = null;
  s.passed = [];
  s.windowEndsAt = null;
  s.loss = null;
  s.exchange = null;
  const living = aliveIds(s);
  if (living.length <= 1) {
    s.phase = 'over';
    s.winner = living[0] ?? null;
    log(s, s.winner ? `${nameOf(s, s.winner)} reste seul à la cour : victoire !` : 'Plus personne à la cour.');
    return;
  }
  const n = s.players.length;
  for (let k = 1; k <= n; k++) {
    const i = (s.turn + k) % n;
    if (alive(s, s.players[i]!.id)) {
      s.turn = i;
      break;
    }
  }
  s.active = s.players[s.turn]!.id;
  s.phase = 'turn';
  const seat = s.seats[s.active]!;
  if (seat.escorted) {
    seat.escorted = false;
    log(s, `L’escorte de ${nameOf(s, s.active)} prend fin.`);
  }
}

/** Retourne l'influence (choisie ou forcée) puis enchaîne. */
function loseInfluence(s: CourtState, player: PlayerId, then: Then, rng: Rng, now: number): void {
  const seat = s.seats[player]!;
  if (seat.cards.length === 0) return continueAfter(s, then, rng, now);
  if (seat.cards.length === 1) {
    reveal(s, player, seat.cards[0]!);
    return continueAfter(s, then, rng, now);
  }
  s.loss = { player, then };
  s.phase = 'loss';
  s.windowEndsAt = null;
}

function reveal(s: CourtState, player: PlayerId, card: Character): void {
  const seat = s.seats[player]!;
  seat.cards.splice(seat.cards.indexOf(card), 1);
  seat.revealed.push(card);
  log(s, `${nameOf(s, player)} perd une influence : ${CHARACTER_LABEL[card]}${seat.cards.length ? '.' : ' — éliminé !'}`);
}

function continueAfter(s: CourtState, then: Then, rng: Rng, now: number): void {
  s.loss = null;
  if (aliveIds(s).length <= 1) return nextTurn(s);
  if (then === 'next') return nextTurn(s);
  if (then === 'block') return afterChallenge(s, rng, now);
  return resolve(s, rng, now);
}

/** L'annonce a tenu (ou n'était pas contestable) : place aux contres éventuels. */
function afterChallenge(s: CourtState, rng: Rng, now: number): void {
  const a = s.action!;
  if (!alive(s, a.actor)) return nextTurn(s);
  const rule = ACTION_RULES[a.kind];
  if (rule.blockers !== 'none' && blockersInPlay(s, a.kind).length > 0) {
    openWindow(s, 'block', now);
    if (responders(s).length > 0) return;
  }
  resolve(s, rng, now);
}

function resolve(s: CourtState, rng: Rng, now: number): void {
  const a = s.action!;
  const actor = s.seats[a.actor]!;
  s.phase = 'turn';
  s.windowEndsAt = null;
  switch (a.kind) {
    case 'income':
      actor.coins += 1;
      break;
    case 'favor':
      actor.coins += 2;
      break;
    case 'tax':
      actor.coins += 3;
      break;
    case 'racket': {
      const victim = s.seats[a.target!]!;
      const amount = Math.min(2, victim.coins);
      victim.coins -= amount;
      actor.coins += amount;
      log(s, `${nameOf(s, a.actor)} empoche ${ecus(amount)} de ${nameOf(s, a.target)}.`);
      break;
    }
    case 'exchange': {
      const drawn = s.deck.splice(0, 2);
      s.exchange = [...actor.cards, ...drawn];
      s.phase = 'exchange';
      return;
    }
    case 'execute':
    case 'conspiracy':
      if (a.target && alive(s, a.target)) return loseInfluence(s, a.target, 'next', rng, now);
      break;
    case 'snoop': {
      const target = a.target && alive(s, a.target) ? s.seats[a.target]! : null;
      if (!target) break;
      if (target.cards.length === 1) {
        showCard(s, a.target!, target.cards[0]!);
        return;
      }
      s.phase = 'show';
      return;
    }
    case 'escort':
      actor.escorted = true;
      log(s, `${nameOf(s, a.actor)} s’offre l’escorte du Mercenaire jusqu’à son prochain tour.`);
      break;
  }
  nextTurn(s);
}

/** Espionnage : la cible montre une influence ; seul le Mouchard la voit. */
function showCard(s: CourtState, target: PlayerId, card: Character): void {
  const spy = s.action!.actor;
  (s.intel[spy] ??= []).push({ target, card });
  log(s, `${nameOf(s, target)} montre en secret une influence à ${nameOf(s, spy)}.`);
  log(s, `Espionnage : ${nameOf(s, target)} t’a montré ${CHARACTER_THE[card]}.`, [spy]);
  s.phase = 'peek';
}

/** Contestation : l'annonceur montre la carte (et en change) ou perd une influence. */
function settleChallenge(s: CourtState, challenger: PlayerId, rng: Rng, now: number): void {
  const onBlock = s.phase === 'challengeBlock';
  const claimant = onBlock ? s.block!.blocker : s.action!.actor;
  const claim = onBlock ? s.block!.claim : ACTION_RULES[s.action!.kind].claim!;
  const seat = s.seats[claimant]!;
  log(s, `${nameOf(s, challenger)} conteste ${CHARACTER_THE[claim]} de ${nameOf(s, claimant)}.`);
  s.windowEndsAt = null;
  if (seat.cards.includes(claim)) {
    // Preuve faite : la carte retourne dans la pioche, on en tire une autre.
    seat.cards.splice(seat.cards.indexOf(claim), 1);
    s.deck = rng.shuffle([...s.deck, claim]);
    seat.cards.push(s.deck.shift() as Character);
    log(s, `${nameOf(s, claimant)} montre ${CHARACTER_THE[claim]} : la contestation échoue.`);
    loseInfluence(s, challenger, onBlock ? 'next' : 'block', rng, now);
  } else {
    log(s, `${nameOf(s, claimant)} bluffait !`);
    if (!onBlock) {
      // Action ratée : on rend ce qui avait été payé.
      s.seats[s.action!.actor]!.coins += s.action!.paid;
      s.action!.paid = 0;
    }
    loseInfluence(s, claimant, onBlock ? 'resolve' : 'next', rng, now);
  }
}

/** Tout le monde a laissé passer (ou le temps est écoulé). */
function closeWindow(s: CourtState, rng: Rng, now: number): void {
  s.windowEndsAt = null;
  if (s.phase === 'challenge') return afterChallenge(s, rng, now);
  if (s.phase === 'block') return resolve(s, rng, now);
  if (s.phase === 'challengeBlock') {
    log(s, `Le contre de ${nameOf(s, s.block!.blocker)} tient : l’action échoue.`);
    return nextTurn(s);
  }
}

function multisetIncludes(pool: Character[], picked: Character[]): boolean {
  const rest = [...pool];
  for (const c of picked) {
    const i = rest.indexOf(c);
    if (i === -1) return false;
    rest.splice(i, 1);
  }
  return true;
}

// ───────── Module ─────────

export const court = defineGame<CourtState, CourtMove, CourtView, CourtConfig>({
  meta: courtMeta,
  configSchema: courtConfigSchema,
  defaultConfig: { reaction: 20, characters: CLASSIC_COURT },
  moveSchema: courtMoveSchema,

  setup(players, config, rng) {
    const n = players.length;
    if (n < courtMeta.minPlayers || n > courtMeta.maxPlayers) {
      throw new Error(`La Cité se joue de 2 à 6 joueurs (reçu ${n}).`);
    }
    const deck = rng.shuffle(config.characters.flatMap((c) => Array<Character>(COPIES).fill(c)));
    const turn = rng.int(n);
    const seats: CourtState['seats'] = {};
    for (const p of players) seats[p.id] = { cards: deck.splice(0, 2), revealed: [], coins: START_COINS, escorted: false };
    // À deux, le premier joueur ne reçoit qu'un écu (sinon il est trop avantagé).
    if (n === 2) seats[players[turn]!.id]!.coins = START_COINS - 1;
    return {
      players: players.map((p) => ({ ...p })),
      config,
      seats,
      deck,
      turn,
      active: players[turn]!.id,
      phase: 'turn',
      action: null,
      block: null,
      passed: [],
      windowEndsAt: null,
      loss: null,
      exchange: null,
      intel: {},
      winner: null,
      log: [{ text: `La cour est réunie. ${players[turn]!.name} commence.`, visibleTo: 'all' }],
    };
  },

  canStart(players, config) {
    const needed = charactersNeeded(players);
    if (config.characters.length < needed) {
      return `À ${players} joueurs, il faut au moins ${needed} personnages en jeu (assez de cartes pour tout le monde).`;
    }
    return null;
  },

  expectedActors(s) {
    switch (s.phase) {
      case 'turn':
      case 'exchange':
        return [s.active];
      case 'challenge':
      case 'block':
      case 'challengeBlock':
        return responders(s);
      case 'loss':
        return [s.loss!.player];
      case 'show':
        return [s.action!.target as PlayerId];
      case 'peek':
        return [s.active];
      default:
        return [];
    }
  },

  validate(s, by, move) {
    if (s.phase === 'over') return 'La partie est terminée.';
    if (!isPlayer(s, by)) return 'Tu ne participes pas à cette partie.';
    if (!alive(s, by)) return 'Tu as quitté la cour.';
    const seat = s.seats[by]!;
    switch (move.type) {
      case 'act': {
        if (s.phase !== 'turn' || by !== s.active) return 'Ce n’est pas ton tour.';
        const rule = ACTION_RULES[move.kind];
        if (seat.coins >= FORCED_CONSPIRACY && move.kind !== 'conspiracy') {
          return `Avec ${FORCED_CONSPIRACY} écus ou plus, la Conspiration est obligatoire.`;
        }
        if (rule.claim && !s.config.characters.includes(rule.claim)) {
          return `Le ${CHARACTER_LABEL[rule.claim]} n’est pas à la cour dans cette partie.`;
        }
        if (seat.coins < rule.cost) return `Il faut ${ecus(rule.cost)}.`;
        if (rule.targeted) {
          if (!move.target || move.target === by || !alive(s, move.target)) return 'Choisis un autre joueur encore en lice.';
          if (rule.claim && s.seats[move.target]!.escorted) return `${nameOf(s, move.target)} est sous escorte : impossible de le viser.`;
        }
        return null;
      }
      case 'challenge': {
        if (s.phase !== 'challenge' && s.phase !== 'challengeBlock') return 'Rien à contester.';
        return responders(s).includes(by) ? null : 'Tu ne peux pas contester maintenant.';
      }
      case 'pass':
        if (s.phase !== 'challenge' && s.phase !== 'block' && s.phase !== 'challengeBlock') return 'Rien à laisser passer.';
        return responders(s).includes(by) ? null : 'Tu as déjà réagi.';
      case 'block': {
        if (s.phase !== 'block') return 'Rien à contrer.';
        if (!responders(s).includes(by)) return 'Tu ne peux pas contrer cette action.';
        return blockersInPlay(s, s.action!.kind).includes(move.claim) ? null : 'Ce personnage ne contre pas cette action.';
      }
      case 'lose':
        if (s.phase !== 'loss' || s.loss?.player !== by) return 'Tu n’as pas d’influence à perdre.';
        return seat.cards.includes(move.card) ? null : 'Tu n’as pas ce personnage.';
      case 'show':
        if (s.phase !== 'show' || by !== s.action?.target) return 'Personne ne t’espionne.';
        return seat.cards.includes(move.card) ? null : 'Tu n’as pas ce personnage.';
      case 'seen':
        return s.phase === 'peek' && by === s.active ? null : 'Rien à voir.';
      case 'keep': {
        if (s.phase !== 'exchange' || by !== s.active) return 'Pas d’échange en cours.';
        if (move.cards.length !== seat.cards.length) return `Garde exactement ${seat.cards.length} personnage${seat.cards.length > 1 ? 's' : ''}.`;
        return multisetIncludes(s.exchange ?? [], move.cards) ? null : 'Ces personnages ne sont pas dans ta main.';
      }
    }
  },

  apply(state, by, move, rng, now) {
    const s = structuredClone(state);
    switch (move.type) {
      case 'act': {
        const rule = ACTION_RULES[move.kind];
        s.seats[by]!.coins -= rule.cost;
        s.action = { kind: move.kind, actor: by, target: rule.targeted ? (move.target as PlayerId) : null, paid: rule.cost };
        s.block = null;
        log(
          s,
          `${nameOf(s, by)} annonce ${rule.label}${rule.claim ? ` (${CHARACTER_LABEL[rule.claim]})` : ''}${
            s.action.target ? ` sur ${nameOf(s, s.action.target)}` : ''
          }.`,
        );
        if (rule.claim) openWindow(s, 'challenge', now);
        else afterChallenge(s, rng, now);
        return s;
      }
      case 'challenge':
        settleChallenge(s, by, rng, now);
        return s;
      case 'pass':
        s.passed.push(by);
        if (responders(s).length === 0) closeWindow(s, rng, now);
        return s;
      case 'block':
        s.block = { blocker: by, claim: move.claim };
        log(s, `${nameOf(s, by)} contre avec ${CHARACTER_THE[move.claim]}.`);
        openWindow(s, 'challengeBlock', now);
        return s;
      case 'lose': {
        const then = s.loss!.then;
        reveal(s, by, move.card);
        continueAfter(s, then, rng, now);
        return s;
      }
      case 'show':
        showCard(s, by, move.card);
        return s;
      case 'seen':
        nextTurn(s);
        return s;
      case 'keep': {
        const pool = [...(s.exchange ?? [])];
        for (const c of move.cards) pool.splice(pool.indexOf(c), 1);
        s.seats[by]!.cards = [...move.cards];
        s.deck = rng.shuffle([...s.deck, ...pool]);
        log(s, `${nameOf(s, by)} a échangé ses personnages.`);
        nextTurn(s);
        return s;
      }
    }
  },

  view(s, viewer): CourtView {
    const me = isPlayer(s, viewer) ? viewer : null;
    const over = s.phase === 'over';
    const waiting = new Set(responders(s));
    return {
      phase: s.phase,
      config: s.config,
      players: s.players.map((p) => {
        const seat = s.seats[p.id]!;
        return {
          id: p.id,
          name: p.name,
          isBot: p.isBot,
          coins: seat.coins,
          influence: seat.cards.length,
          // En fin de partie, le gagnant montre ses cartes.
          revealed: over ? [...seat.revealed, ...seat.cards] : seat.revealed,
          alive: seat.cards.length > 0,
          escorted: seat.escorted,
          passed: s.passed.includes(p.id),
        };
      }),
      active: s.active,
      action: s.action,
      block: s.block,
      responders: [...waiting],
      windowEndsAt: s.windowEndsAt,
      losing: s.loss?.player ?? null,
      deckCount: s.deck.length,
      me: me
        ? {
            id: me,
            hand: s.seats[me]!.cards,
            exchange: s.phase === 'exchange' && me === s.active ? s.exchange : null,
            intel: s.intel[me] ?? [],
          }
        : null,
      winner: s.winner,
      log: visibleLog(s.log, viewer),
    };
  },

  result(s) {
    if (s.phase !== 'over') return null;
    return {
      winners: s.winner ? [s.winner] : [],
      title: s.winner ? `${nameOf(s, s.winner)} règne sur la Cité` : 'Plus personne à la cour',
      detail: 'Dernier en lice.',
    };
  },

  deadline(s) {
    return s.phase === 'challenge' || s.phase === 'block' || s.phase === 'challengeBlock' ? s.windowEndsAt : null;
  },

  onDeadline(state, rng, now) {
    const s = structuredClone(state);
    closeWindow(s, rng, now);
    return s;
  },

  bot: courtBot,

  hotseat: {
    // Choisir quelle influence perdre, ou quels personnages garder, se fait en secret.
    needsPrivacy: (s) => s.phase === 'loss' || s.phase === 'exchange' || s.phase === 'show' || s.phase === 'peek',
  },
});
