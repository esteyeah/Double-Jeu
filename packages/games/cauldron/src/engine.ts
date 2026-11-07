import { defineGame, visibleLog, type GameMeta, type PlayerId, type Rng } from '@arcade/game-sdk';
import { cauldronBot } from './bot';
import {
  DECK,
  EXPEL_AT,
  HAND_SIZE,
  INGREDIENT_LABEL,
  POISONERS,
  ROLE_LABEL,
  SKIM_COUNT,
  TASTE_COUNT,
  cauldronConfigSchema,
  cauldronMoveSchema,
  signed,
  targetFor,
  type Card,
  type CauldronConfig,
  type CauldronMove,
  type CauldronOutcome,
  type CauldronState,
  type CauldronView,
  type Ingredient,
  type Role,
} from './shared';

export const cauldronMeta: GameMeta = {
  id: 'cauldron',
  name: 'Le Chaudron',
  tagline: 'La guilde prépare une potion… et des Empoisonneurs y versent de la ciguë en mentant.',
  minPlayers: 3,
  maxPlayers: 8,
  durationMinutes: [15, 25],
  supportsHotseat: true,
  supportsBots: true,
  settings: [
    {
      key: 'votes',
      label: 'Vote pour servir la potion',
      choices: [
        { value: 'secret', label: 'À bulletin secret' },
        { value: 'hands', label: 'À main levée (un seul téléphone)' },
      ],
    },
  ],
  hotseatDefaults: { votes: 'hands' },
  rules: [
    'La guilde des alchimistes prépare la potion du siècle dans un grand chaudron. Mais des Empoisonneurs se sont glissés parmi eux. Chacun reçoit son rôle en secret ; les Empoisonneurs se connaissent entre eux.',
    `Chacun a ${HAND_SIZE} cartes en main. À ton tour, au choix : verse un ingrédient face cachée en annonçant sa valeur (tu peux mentir !), joue une carte Action, ou propose de servir la potion. Puis complète ta main.`,
    'Ingrédients : Racine dorée (+1), Eau de source (0), Ciguë (−2). La potion est réussie si le chaudron atteint la force visée, qui dépend du nombre de joueurs. Tu connais toujours la vraie valeur de ce que tu as versé, pas celle des autres.',
    `Actions : Goûter (regarde en secret les ${TASTE_COUNT} derniers ingrédients versés, sans savoir qui a versé quoi), Écumer (retire les ${SKIM_COUNT} derniers ingrédients sans les regarder), Soupçon (pose un jeton sur un joueur ; à ${EXPEL_AT} jetons, il est chassé de la guilde et son rôle révélé), Plaidoyer (retire un jeton).`,
    'Servir la potion : tout le monde vote. À la majorité, on révèle le chaudron : force atteinte, victoire des Alchimistes ; sinon, victoire des Empoisonneurs. Si le vote échoue, celui qui l’a proposé reçoit un jeton de soupçon.',
    'Les Empoisonneurs gagnent aussi si la pioche est épuisée, ou s’ils deviennent plus nombreux que les Alchimistes encore dans la guilde. Les Alchimistes gagnent aussi en chassant tous les Empoisonneurs.',
  ],
};

// ───────── Aides ─────────

const ids = (s: CauldronState) => s.players.map((p) => p.id);
const isPlayer = (s: CauldronState, id: PlayerId | null | undefined): id is PlayerId => !!id && Object.hasOwn(s.roles, id);
const inGuild = (s: CauldronState, id: PlayerId) => isPlayer(s, id) && !s.expelled.includes(id);
const guild = (s: CauldronState) => ids(s).filter((id) => !s.expelled.includes(id));
const nameOf = (s: CauldronState, id: PlayerId | null) => s.players.find((p) => p.id === id)?.name ?? '?';
const realTotal = (s: CauldronState) => s.cauldron.reduce((sum, p) => sum + p.value, 0);

function log(s: CauldronState, text: string, visibleTo: 'all' | PlayerId[] = 'all'): void {
  s.log.push({ text, visibleTo });
}

const OUTCOME_TEXT: Record<string, string> = {
  'alchemist:potion': 'La potion atteint sa force : victoire des Alchimistes !',
  'alchemist:expelled': 'Tous les Empoisonneurs ont été chassés : victoire des Alchimistes !',
  'poisoner:potion': 'La potion est ratée : victoire des Empoisonneurs !',
  'poisoner:deck': 'Plus un seul ingrédient en réserve : victoire des Empoisonneurs !',
  'poisoner:majority': 'Les Empoisonneurs sont plus nombreux que les Alchimistes : ils prennent la guilde !',
};

function finish(s: CauldronState, outcome: CauldronOutcome): void {
  s.outcome = outcome;
  s.phase = 'over';
  s.vote = null;
  log(s, OUTCOME_TEXT[`${outcome.winner}:${outcome.reason}`] ?? 'Fin de la partie.');
}

function checkGuild(s: CauldronState): void {
  const members = guild(s);
  const poisoners = members.filter((id) => s.roles[id] === 'poisoner').length;
  if (poisoners === 0) finish(s, { winner: 'alchemist', reason: 'expelled' });
  else if (poisoners > members.length - poisoners) finish(s, { winner: 'poisoner', reason: 'majority' });
}

function addSuspicion(s: CauldronState, target: PlayerId, delta: number): void {
  s.suspicion[target] = Math.max(0, (s.suspicion[target] ?? 0) + delta);
  if (s.suspicion[target]! >= EXPEL_AT && !s.expelled.includes(target)) {
    s.expelled.push(target);
    s.discard.push(...(s.hands[target] ?? []));
    s.hands[target] = [];
    log(s, `La guilde chasse ${nameOf(s, target)}. Rôle révélé : ${ROLE_LABEL[s.roles[target] as Role]} !`);
    checkGuild(s);
  }
}

/** Fin du tour : on complète la main, puis au suivant. */
function endTurn(s: CauldronState): void {
  if (s.outcome) return;
  const hand = s.hands[s.active]!;
  if (inGuild(s, s.active)) while (hand.length < HAND_SIZE && s.deck.length) hand.push(s.deck.shift()!);
  if (s.deck.length === 0) return finish(s, { winner: 'poisoner', reason: 'deck' });
  const n = s.players.length;
  for (let k = 1; k <= n; k++) {
    const i = (s.turn + k) % n;
    if (inGuild(s, s.players[i]!.id)) {
      s.turn = i;
      break;
    }
  }
  s.active = s.players[s.turn]!.id;
  s.phase = 'turn';
}

function resolveVote(s: CauldronState, votes: Record<PlayerId, boolean>): void {
  const proposer = s.vote!.proposer;
  const yes = Object.values(votes).filter(Boolean).length;
  const passed = yes * 2 > guild(s).length;
  s.lastVote = { proposer, votes, passed };
  s.vote = null;
  if (passed) {
    const total = realTotal(s);
    log(s, `On sert la potion ! Force réelle : ${total} (visée : ${s.target}).`);
    finish(s, total >= s.target ? { winner: 'alchemist', reason: 'potion' } : { winner: 'poisoner', reason: 'potion' });
    return;
  }
  log(s, `La guilde refuse de servir la potion (${yes} oui). ${nameOf(s, proposer)} reçoit un jeton de soupçon.`);
  addSuspicion(s, proposer, 1);
  if (s.outcome) return;
  s.phase = 'turn';
  endTurn(s);
}

// ───────── Module ─────────

export const cauldron = defineGame<CauldronState, CauldronMove, CauldronView, CauldronConfig>({
  meta: cauldronMeta,
  configSchema: cauldronConfigSchema,
  defaultConfig: { votes: 'secret' },
  moveSchema: cauldronMoveSchema,

  setup(players, config, rng) {
    const n = players.length;
    const poisoners = POISONERS[n];
    if (!poisoners) throw new Error(`Le Chaudron se joue de 3 à 8 joueurs (reçu ${n}).`);
    const roles = rng.shuffle<Role>([
      ...Array<Role>(n - poisoners).fill('alchemist'),
      ...Array<Role>(poisoners).fill('poisoner'),
    ]);
    const deck = rng.shuffle(DECK.flatMap(({ card, count }) => Array.from({ length: count }, () => ({ ...card }) as Card)));
    const hands: Record<PlayerId, Card[]> = {};
    for (const p of players) hands[p.id] = deck.splice(0, HAND_SIZE);
    const turn = rng.int(n);
    return {
      players: players.map((p) => ({ ...p })),
      config,
      roles: Object.fromEntries(players.map((p, i) => [p.id, roles[i] as Role])),
      expelled: [],
      hands,
      deck,
      discard: [],
      cauldron: [],
      suspicion: Object.fromEntries(players.map((p) => [p.id, 0])),
      turn,
      active: players[turn]!.id,
      phase: 'reveal',
      target: targetFor(n),
      acked: [],
      vote: null,
      lastVote: null,
      tastes: {},
      outcome: null,
      log: [{ text: `La guilde se réunit autour du chaudron. Force visée : ${targetFor(n)}.`, visibleTo: 'all' }],
    };
  },

  expectedActors(s) {
    switch (s.phase) {
      case 'reveal':
        return ids(s).filter((id) => !s.acked.includes(id));
      case 'turn':
      case 'tasted':
        return [s.active];
      case 'vote':
        return s.config.votes === 'hands'
          ? [s.vote!.proposer]
          : guild(s).filter((id) => !Object.hasOwn(s.vote!.votes, id));
      default:
        return [];
    }
  },

  validate(s, by, move) {
    if (s.phase === 'over') return 'La partie est terminée.';
    if (!isPlayer(s, by)) return 'Tu ne participes pas à cette partie.';
    if (!inGuild(s, by)) return 'Tu as été chassé de la guilde.';
    const myTurn = s.phase === 'turn' && by === s.active;
    switch (move.type) {
      case 'ack':
        if (s.phase !== 'reveal') return "Ce n'est pas le moment.";
        return s.acked.includes(by) ? 'Déjà confirmé.' : null;
      case 'pour': {
        if (!myTurn) return "Ce n'est pas ton tour.";
        const card = s.hands[by]![move.index];
        return card?.kind === 'ingredient' ? null : 'Cette carte n’est pas un ingrédient.';
      }
      case 'action': {
        if (!myTurn) return "Ce n'est pas ton tour.";
        const card = s.hands[by]![move.index];
        if (card?.kind !== 'action') return 'Cette carte n’est pas une action.';
        if (card.action === 'suspect') {
          if (!move.target || !inGuild(s, move.target) || move.target === by) return 'Choisis un autre membre de la guilde.';
        }
        // Plaidoyer sans jeton à retirer : permis (et sans effet), pour ne jamais rester bloqué.
        if (card.action === 'plead' && (!move.target || !inGuild(s, move.target))) return 'Choisis un membre de la guilde.';
        return null;
      }
      case 'propose':
        if (!myTurn) return "Ce n'est pas ton tour.";
        return s.cauldron.length > 0 ? null : 'Le chaudron est vide.';
      case 'vote':
        if (s.phase !== 'vote' || s.config.votes !== 'secret') return "Ce n'est pas le moment de voter.";
        return Object.hasOwn(s.vote!.votes, by) ? 'Tu as déjà voté.' : null;
      case 'tally':
        if (s.phase !== 'vote' || s.config.votes !== 'hands') return "Ce n'est pas le moment.";
        if (by !== s.vote!.proposer) return 'C’est à celui qui propose de reporter le vote.';
        if (new Set(move.yes).size !== move.yes.length) return 'Joueur en double.';
        return move.yes.every((id) => inGuild(s, id)) ? null : 'Seuls les membres de la guilde votent.';
      case 'seen':
        return s.phase === 'tasted' && by === s.active ? null : 'Rien à voir.';
    }
  },

  apply(state, by, move, rng) {
    const s = structuredClone(state);
    switch (move.type) {
      case 'ack':
        s.acked.push(by);
        if (s.acked.length === s.players.length) {
          s.phase = 'turn';
          log(s, `${nameOf(s, s.active)} commence.`);
        }
        return s;

      case 'pour': {
        const [card] = s.hands[by]!.splice(move.index, 1);
        const value = (card as Extract<Card, { kind: 'ingredient' }>).value;
        s.cauldron.push({ by, value, announced: move.announce });
        log(s, `${nameOf(s, by)} verse un ingrédient et annonce : ${INGREDIENT_LABEL[move.announce]} (${signed(move.announce)}).`);
        endTurn(s);
        return s;
      }

      case 'action': {
        const [card] = s.hands[by]!.splice(move.index, 1);
        const action = (card as Extract<Card, { kind: 'action' }>).action;
        s.discard.push(card!);
        switch (action) {
          case 'taste': {
            if (s.cauldron.length === 0) {
              log(s, `${nameOf(s, by)} veut goûter, mais le chaudron est vide.`);
              break;
            }
            const top = s.cauldron.slice(-TASTE_COUNT);
            const values = rng.shuffle(top.map((p) => p.value)) as Ingredient[];
            (s.tastes[by] ??= []).push({ values, pours: top.map((p) => ({ by: p.by, announced: p.announced })) });
            log(s, `${nameOf(s, by)} goûte les ${top.length} derniers ingrédients.`);
            log(s, `Tu as goûté : ${values.map(signed).join(', ')}.`, [by]);
            s.phase = 'tasted';
            return s;
          }
          case 'skim': {
            const removed = s.cauldron.splice(-SKIM_COUNT);
            const plural = removed.length > 1 ? 's' : '';
            log(
              s,
              removed.length
                ? `${nameOf(s, by)} écume le chaudron : ${removed.length} ingrédient${plural} retiré${plural}.`
                : `${nameOf(s, by)} veut écumer, mais le chaudron est vide.`,
            );
            break;
          }
          case 'suspect':
            log(s, `${nameOf(s, by)} soupçonne ${nameOf(s, move.target!)}.`);
            addSuspicion(s, move.target!, 1);
            break;
          case 'plead':
            log(
              s,
              (s.suspicion[move.target!] ?? 0) > 0
                ? `${nameOf(s, by)} plaide pour ${nameOf(s, move.target!)} : un soupçon en moins.`
                : `${nameOf(s, by)} plaide pour ${nameOf(s, move.target!)} (aucun jeton à retirer).`,
            );
            addSuspicion(s, move.target!, -1);
            break;
        }
        endTurn(s);
        return s;
      }

      case 'propose':
        s.vote = { proposer: by, votes: {} };
        s.phase = 'vote';
        log(s, `${nameOf(s, by)} propose de servir la potion. La guilde vote !`);
        return s;

      case 'vote':
        s.vote!.votes[by] = move.yes;
        if (guild(s).every((id) => Object.hasOwn(s.vote!.votes, id))) resolveVote(s, s.vote!.votes);
        return s;

      case 'tally':
        resolveVote(s, Object.fromEntries(guild(s).map((id) => [id, move.yes.includes(id)])));
        return s;

      case 'seen':
        endTurn(s);
        return s;
    }
  },

  view(s, viewer): CauldronView {
    const over = s.phase === 'over';
    const me = isPlayer(s, viewer) ? viewer : null;
    const myRole = me ? (s.roles[me] as Role) : null;
    const allies = myRole === 'poisoner' ? ids(s).filter((id) => id !== me && s.roles[id] === 'poisoner') : [];
    return {
      phase: s.phase,
      config: s.config,
      players: s.players.map((p) => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        expelled: s.expelled.includes(p.id),
        suspicion: s.suspicion[p.id] ?? 0,
        handCount: s.hands[p.id]?.length ?? 0,
        acked: s.acked.includes(p.id),
        voted: s.phase === 'vote' && Object.hasOwn(s.vote!.votes, p.id),
        role:
          over || p.id === me || allies.includes(p.id) || s.expelled.includes(p.id) ? (s.roles[p.id] as Role) : null,
      })),
      active: s.active,
      target: s.target,
      deckCount: s.deck.length,
      // Chacun connaît la vraie valeur de ce qu'il a lui-même versé.
      pours: s.cauldron.map((p) => ({ by: p.by, announced: p.announced, value: over || p.by === me ? p.value : null })),
      announcedTotal: s.cauldron.reduce((sum, p) => sum + p.announced, 0),
      realTotal: over ? realTotal(s) : null,
      vote: s.vote ? { proposer: s.vote.proposer } : null,
      lastVote: s.lastVote,
      me:
        me && myRole
          ? {
              id: me,
              role: myRole,
              allies,
              hand: s.hands[me] ?? [],
              tastes: s.tastes[me] ?? [],
              myVote: s.phase === 'vote' && Object.hasOwn(s.vote!.votes, me) ? (s.vote!.votes[me] as boolean) : null,
            }
          : null,
      outcome: s.outcome,
      log: visibleLog(s.log, viewer),
    };
  },

  result(s) {
    if (!s.outcome) return null;
    const winner = s.outcome.winner;
    return {
      winners: ids(s).filter((id) => s.roles[id] === winner),
      title: winner === 'alchemist' ? 'Victoire des Alchimistes' : 'Victoire des Empoisonneurs',
      detail: OUTCOME_TEXT[`${s.outcome.winner}:${s.outcome.reason}`],
    };
  },

  bot: cauldronBot,

  hotseat: {
    // La main est secrète : on passe le téléphone au joueur actif à chaque tour.
    needsPrivacy: (s) =>
      s.phase === 'reveal' || s.phase === 'turn' || s.phase === 'tasted' || (s.phase === 'vote' && s.config.votes === 'secret'),
  },
});
