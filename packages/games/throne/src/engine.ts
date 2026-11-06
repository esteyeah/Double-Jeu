import { defineGame, visibleLog, type GameMeta, type PlayerId, type Rng } from '@arcade/game-sdk';
import { throneBot } from './bot';
import {
  CROWN_TO_WIN,
  EDICT_LABEL,
  MAX_AGITATION,
  POWER_LABEL,
  ROLE_TABLE,
  SHADOW_TO_WIN,
  USURPER_DANGER,
  VETO_AT,
  powerTrack,
  teamOf,
  throneConfigSchema,
  throneMoveSchema,
  type Edict,
  type Power,
  type Role,
  type ThroneConfig,
  type ThroneMove,
  type ThroneOutcome,
  type ThroneState,
  type ThroneView,
} from './shared';

export const throneMeta: GameMeta = {
  id: 'throne',
  name: 'Le Trône Vide',
  tagline: 'Le roi est mort. Élections, édits votés en secret et un usurpateur caché qui convoite le trône.',
  minPlayers: 5,
  maxPlayers: 10,
  durationMinutes: [30, 60],
  supportsHotseat: true,
  supportsBots: true,
  settings: [
    {
      key: 'votes',
      label: 'Votes',
      choices: [
        { value: 'secret', label: 'À bulletin secret' },
        { value: 'hands', label: 'À main levée (un seul téléphone)' },
      ],
    },
  ],
  hotseatDefaults: { votes: 'hands' },
  rules: [
    'Le roi est mort sans héritier. En attendant le sacre, le Conseil gouverne le royaume à coups d’édits. Mais dans l’ombre, des Conjurés préparent le couronnement de l’Usurpateur.',
    'Chacun reçoit un rôle secret : Loyaliste (la Couronne), Conjuré ou Usurpateur (l’Ombre). Les Conjurés connaissent l’Usurpateur ; lui ne connaît ses Conjurés qu’à 5 ou 6 joueurs.',
    'À chaque tour, le Régent propose un Sénéchal (pas le dernier Sénéchal élu, ni le dernier Régent s’il reste plus de 5 joueurs). Tout le monde vote : à la majorité, le gouvernement est élu. Trois rejets d’affilée déclenchent une émeute : l’édit du dessus de la pile est promulgué d’office.',
    'Le Régent pioche 3 édits, en défausse un en secret et passe les 2 autres au Sénéchal, qui en promulgue un. Personne ne voit les cartes des autres : chacun peut mentir sur ce qu’il a vu.',
    'Certains édits de l’Ombre donnent un pouvoir au Régent : Enquête (découvrir le camp d’un joueur), Présage (voir les 3 prochains édits), Succession (choisir le prochain Régent) ou Exécution. Après 5 édits de l’Ombre, le Sénéchal peut proposer un veto au Régent.',
    'La Couronne gagne avec 5 édits royaux ou en exécutant l’Usurpateur. L’Ombre gagne avec 6 édits de l’Ombre, ou si l’Usurpateur est élu Sénéchal après le 3e édit de l’Ombre.',
  ],
};

// ───────── Aides ─────────

const ids = (s: ThroneState) => s.players.map((p) => p.id);

function isPlayer(s: ThroneState, id: PlayerId | null): id is PlayerId {
  return id !== null && Object.hasOwn(s.roles, id);
}

const isAlive = (s: ThroneState, id: PlayerId) => isPlayer(s, id) && !s.dead.includes(id);
const aliveIds = (s: ThroneState) => ids(s).filter((id) => !s.dead.includes(id));
const nameOf = (s: ThroneState, id: PlayerId | null) => s.players.find((p) => p.id === id)?.name ?? '?';

function log(s: ThroneState, text: string, visibleTo: 'all' | PlayerId[] = 'all'): void {
  s.log.push({ text, visibleTo });
}

function isTermLimited(s: ThroneState, id: PlayerId): boolean {
  return id === s.lastSeneschal || (id === s.lastRegent && aliveIds(s).length > 5);
}

function canBeSeneschal(s: ThroneState, id: PlayerId): boolean {
  return isAlive(s, id) && id !== s.regent && !isTermLimited(s, id);
}

/** S'il reste moins de `n` édits, la défausse est remélangée avec la pile. */
function ensureDeck(s: ThroneState, rng: Rng, n: number): void {
  if (s.deck.length >= n) return;
  s.deck = rng.shuffle([...s.deck, ...s.discard]);
  s.discard = [];
  log(s, 'La défausse est remélangée dans la pile des édits.');
}

function finish(s: ThroneState, outcome: ThroneOutcome): void {
  s.outcome = outcome;
  s.phase = 'over';
  s.pendingPower = null;
  log(s, OUTCOME_TEXT[`${outcome.winner}:${outcome.reason}`] ?? 'Fin de la partie.');
}

const OUTCOME_TEXT: Record<string, string> = {
  'crown:edicts': `${CROWN_TO_WIN} édits royaux : le royaume est sauvé, la Couronne l’emporte !`,
  'crown:usurperExecuted': 'L’Usurpateur a été exécuté : la Couronne l’emporte !',
  'shadow:edicts': `${SHADOW_TO_WIN} édits de l’Ombre : le royaume bascule, l’Ombre l’emporte !`,
  'shadow:usurperCrowned': 'L’Usurpateur a été élu Sénéchal : il s’empare du trône !',
};

/** Fin de tour : le Régent suivant (vivant) dans l'ordre de la table. */
function nextRegent(s: ThroneState): void {
  const n = s.players.length;
  for (let k = 1; k <= n; k++) {
    const i = (s.rotation + k) % n;
    const id = s.players[i]!.id;
    if (!s.dead.includes(id)) {
      s.rotation = i;
      s.regent = id;
      break;
    }
  }
  startNomination(s);
}

function startNomination(s: ThroneState): void {
  s.nominee = null;
  s.votes = {};
  s.hand = [];
  s.passed = [];
  s.vetoRefused = false;
  s.pendingPower = null;
  s.phase = 'nomination';
}

/** Promulgue un édit ; renvoie le pouvoir débloqué (jamais lors d'une émeute). */
function enact(s: ThroneState, edict: Edict, government: boolean): Power | null {
  if (edict === 'crown') s.crown++;
  else s.shadow++;
  s.history.push({
    edict,
    regent: government ? s.regent : null,
    seneschal: government ? s.nominee : null,
  });
  log(
    s,
    government
      ? `${nameOf(s, s.nominee)} promulgue un ${EDICT_LABEL[edict]}.`
      : `L’émeute impose un ${EDICT_LABEL[edict]}.`,
  );
  if (s.crown >= CROWN_TO_WIN) finish(s, { winner: 'crown', reason: 'edicts' });
  else if (s.shadow >= SHADOW_TO_WIN) finish(s, { winner: 'shadow', reason: 'edicts' });
  if (s.outcome || edict !== 'shadow' || !government) return null;
  return powerTrack(s.players.length)[s.shadow - 1] ?? null;
}

/** Trois gouvernements rejetés : l'édit du dessus est promulgué, les mandats sont oubliés. */
function riot(s: ThroneState, rng: Rng): void {
  log(s, `${MAX_AGITATION} gouvernements rejetés d’affilée : émeute dans la capitale !`);
  ensureDeck(s, rng, 1);
  const edict = s.deck.shift() as Edict;
  s.agitation = 0;
  s.lastRegent = null;
  s.lastSeneschal = null;
  enact(s, edict, false);
  ensureDeck(s, rng, 3);
}

function raiseAgitation(s: ThroneState, rng: Rng): void {
  s.agitation++;
  if (s.agitation >= MAX_AGITATION) riot(s, rng);
  if (!s.outcome) nextRegent(s);
}

function resolveVote(s: ThroneState, votes: Record<PlayerId, boolean>, rng: Rng): void {
  const alive = aliveIds(s).length;
  const yes = Object.values(votes).filter(Boolean).length;
  const passed = yes * 2 > alive;
  const nominee = s.nominee as PlayerId;
  s.lastVote = { regent: s.regent, nominee, votes, passed };
  s.votes = {};
  if (!passed) {
    log(s, `Gouvernement rejeté (${yes} oui sur ${alive}).`);
    raiseAgitation(s, rng);
    return;
  }
  log(s, `Gouvernement élu (${yes} oui sur ${alive}) : ${nameOf(s, s.regent)} Régent, ${nameOf(s, nominee)} Sénéchal.`);
  s.agitation = 0;
  if (s.shadow >= USURPER_DANGER && s.roles[nominee] === 'usurper') {
    finish(s, { winner: 'shadow', reason: 'usurperCrowned' });
    return;
  }
  s.lastRegent = s.regent;
  s.lastSeneschal = nominee;
  ensureDeck(s, rng, 3);
  s.hand = s.deck.splice(0, 3);
  s.phase = 'regent';
}

function afterLegislation(s: ThroneState, power: Power | null, rng: Rng): void {
  if (s.outcome) return;
  if (!power) {
    nextRegent(s);
    return;
  }
  s.pendingPower = power;
  s.phase = 'power';
  if (power === 'peek') ensureDeck(s, rng, 3);
  log(s, `Pouvoir du Régent : ${POWER_LABEL[power]}.`);
}

// ───────── Module ─────────

export const throne = defineGame<ThroneState, ThroneMove, ThroneView, ThroneConfig>({
  meta: throneMeta,
  configSchema: throneConfigSchema,
  defaultConfig: { votes: 'secret' },
  moveSchema: throneMoveSchema,

  setup(players, config, rng) {
    const table = ROLE_TABLE[players.length];
    if (!table) throw new Error(`Le Trône Vide se joue de 5 à 10 joueurs (reçu ${players.length}).`);
    const [loyal, conspirators] = table;
    const deal = rng.shuffle<Role>([
      ...Array<Role>(loyal).fill('loyal'),
      ...Array<Role>(conspirators).fill('conspirator'),
      'usurper',
    ]);
    const roles: Record<PlayerId, Role> = {};
    players.forEach((p, i) => {
      roles[p.id] = deal[i] as Role;
    });
    const rotation = rng.int(players.length);
    return {
      players: players.map((p) => ({ ...p })),
      config,
      roles,
      dead: [],
      phase: 'reveal',
      rotation,
      regent: players[rotation]!.id,
      nominee: null,
      lastRegent: null,
      lastSeneschal: null,
      votes: {},
      lastVote: null,
      agitation: 0,
      deck: rng.shuffle<Edict>([...Array<Edict>(6).fill('crown'), ...Array<Edict>(11).fill('shadow')]),
      discard: [],
      hand: [],
      passed: [],
      vetoRefused: false,
      crown: 0,
      shadow: 0,
      history: [],
      pendingPower: null,
      investigated: [],
      knowledge: {},
      acked: [],
      outcome: null,
      log: [{ text: 'Le roi est mort. Chacun découvre son rôle en secret.', visibleTo: 'all' }],
    };
  },

  expectedActors(s) {
    switch (s.phase) {
      case 'reveal':
        return ids(s).filter((id) => !s.acked.includes(id));
      case 'vote':
        return s.config.votes === 'hands'
          ? [s.regent]
          : aliveIds(s).filter((id) => !Object.hasOwn(s.votes, id));
      case 'seneschal':
        return [s.nominee as PlayerId];
      case 'nomination':
      case 'regent':
      case 'veto':
      case 'power':
      case 'powerResult':
        return [s.regent];
      default:
        return [];
    }
  },

  validate(s, by, move) {
    if (s.phase === 'over') return 'La partie est terminée.';
    if (!isPlayer(s, by)) return 'Tu ne participes pas à cette partie.';
    if (!isAlive(s, by)) return 'Les morts ne votent pas… ni ne gouvernent.';
    const regentOnly = by === s.regent ? null : 'C’est au Régent de décider.';
    switch (move.type) {
      case 'ack':
        if (s.phase !== 'reveal') return "Ce n'est pas le moment.";
        return s.acked.includes(by) ? 'Déjà confirmé.' : null;
      case 'nominate':
        if (s.phase !== 'nomination') return "Ce n'est pas le moment de nommer.";
        if (regentOnly) return regentOnly;
        return canBeSeneschal(s, move.target) ? null : 'Ce joueur ne peut pas être Sénéchal ce tour-ci.';
      case 'vote':
        if (s.phase !== 'vote' || s.config.votes !== 'secret') return "Ce n'est pas le moment de voter.";
        return Object.hasOwn(s.votes, by) ? 'Tu as déjà voté.' : null;
      case 'tally': {
        if (s.phase !== 'vote' || s.config.votes !== 'hands') return "Ce n'est pas le moment.";
        if (regentOnly) return regentOnly;
        if (new Set(move.yes).size !== move.yes.length) return 'Joueur en double.';
        return move.yes.every((id) => isAlive(s, id)) ? null : 'Seuls les vivants votent.';
      }
      case 'discard':
        if (s.phase !== 'regent') return "Ce n'est pas le moment.";
        if (regentOnly) return regentOnly;
        return move.index < s.hand.length ? null : 'Édit inexistant.';
      case 'enact':
        if (s.phase !== 'seneschal') return "Ce n'est pas le moment.";
        if (by !== s.nominee) return 'C’est au Sénéchal de promulguer.';
        return move.index < s.hand.length ? null : 'Édit inexistant.';
      case 'veto':
        if (s.phase !== 'seneschal' || by !== s.nominee) return "Ce n'est pas le moment.";
        if (s.shadow < VETO_AT) return `Le veto n'est possible qu'après ${VETO_AT} édits de l’Ombre.`;
        return s.vetoRefused ? 'Le Régent a déjà refusé le veto.' : null;
      case 'vetoAnswer':
        if (s.phase !== 'veto') return "Ce n'est pas le moment.";
        return regentOnly;
      case 'power': {
        if (s.phase !== 'power' && s.phase !== 'powerResult') return "Ce n'est pas le moment.";
        if (regentOnly) return regentOnly;
        if (s.phase === 'powerResult' || s.pendingPower === 'peek') return null;
        const t = move.target;
        if (!t || !isAlive(s, t) || t === by) return 'Choisis un autre joueur vivant.';
        if (s.pendingPower === 'investigate' && s.investigated.includes(t)) {
          return 'Ce joueur a déjà fait l’objet d’une enquête.';
        }
        return null;
      }
    }
  },

  apply(state, by, move, rng) {
    const s = structuredClone(state);
    switch (move.type) {
      case 'ack':
        s.acked.push(by);
        if (s.acked.length === s.players.length) {
          startNomination(s);
          log(s, `${nameOf(s, s.regent)} est le premier Régent.`);
        }
        return s;

      case 'nominate':
        s.nominee = move.target;
        s.votes = {};
        s.phase = 'vote';
        log(s, `${nameOf(s, by)} propose ${nameOf(s, move.target)} comme Sénéchal.`);
        return s;

      case 'vote':
        s.votes[by] = move.yes;
        if (aliveIds(s).every((id) => Object.hasOwn(s.votes, id))) resolveVote(s, s.votes, rng);
        return s;

      case 'tally':
        resolveVote(s, Object.fromEntries(aliveIds(s).map((id) => [id, move.yes.includes(id)])), rng);
        return s;

      case 'discard': {
        const [card] = s.hand.splice(move.index, 1);
        s.discard.push(card as Edict);
        s.passed = [...s.hand];
        s.phase = 'seneschal';
        log(s, `${nameOf(s, by)} défausse un édit et transmet les deux autres.`);
        return s;
      }

      case 'enact': {
        const card = s.hand[move.index] as Edict;
        s.discard.push(...s.hand.filter((_, i) => i !== move.index));
        s.hand = [];
        afterLegislation(s, enact(s, card, true), rng);
        return s;
      }

      case 'veto':
        s.phase = 'veto';
        log(s, `${nameOf(s, by)} propose un veto sur les deux édits.`);
        return s;

      case 'vetoAnswer':
        if (move.accept) {
          s.discard.push(...s.hand);
          s.hand = [];
          log(s, `${nameOf(s, by)} accepte le veto : aucun édit n’est promulgué.`);
          raiseAgitation(s, rng);
        } else {
          s.vetoRefused = true;
          s.phase = 'seneschal';
          log(s, `${nameOf(s, by)} refuse le veto : le Sénéchal doit promulguer.`);
        }
        return s;

      case 'power': {
        if (s.phase === 'powerResult') {
          nextRegent(s);
          return s;
        }
        const target = move.target as PlayerId;
        switch (s.pendingPower) {
          case 'investigate': {
            const team = teamOf(s.roles[target] as Role);
            (s.knowledge[by] ??= []).push({ target, team });
            s.investigated.push(target);
            s.phase = 'powerResult';
            log(s, `${nameOf(s, by)} enquête sur ${nameOf(s, target)}.`);
            log(s, `Enquête : ${nameOf(s, target)} sert ${team === 'crown' ? 'la Couronne' : 'l’Ombre'}.`, [by]);
            return s;
          }
          case 'peek':
            log(s, `${nameOf(s, by)} a consulté les 3 prochains édits.`);
            nextRegent(s);
            return s;
          case 'special':
            log(s, `${nameOf(s, by)} désigne ${nameOf(s, target)} comme prochain Régent.`);
            s.regent = target; // la rotation reprendra après le Régent qui a désigné
            startNomination(s);
            return s;
          case 'execute':
            s.dead.push(target);
            log(s, `${nameOf(s, by)} fait exécuter ${nameOf(s, target)}.`);
            if (s.roles[target] === 'usurper') finish(s, { winner: 'crown', reason: 'usurperExecuted' });
            else nextRegent(s);
            return s;
          default:
            nextRegent(s);
            return s;
        }
      }
    }
  },

  view(s, viewer): ThroneView {
    const over = s.phase === 'over';
    const me = isPlayer(s, viewer) ? viewer : null;
    const myRole = me ? (s.roles[me] as Role) : null;

    // Ce que chaque rôle sait des autres dès le départ.
    const known = new Map<PlayerId, Role>();
    if (me && myRole) {
      known.set(me, myRole);
      const seesShadow = myRole === 'conspirator' || (myRole === 'usurper' && s.players.length <= 6);
      if (seesShadow) {
        for (const id of ids(s)) if (s.roles[id] !== 'loyal') known.set(id, s.roles[id] as Role);
      }
    }

    const inSession = s.phase === 'seneschal' || s.phase === 'veto';
    let hand: Edict[] | null = null;
    if (me && s.phase === 'regent' && me === s.regent) hand = s.hand;
    if (me && inSession && me === s.nominee) hand = s.hand;

    return {
      phase: s.phase,
      config: s.config,
      players: s.players.map((p) => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        alive: !s.dead.includes(p.id),
        termLimited: isTermLimited(s, p.id),
        eligible: s.phase === 'nomination' && canBeSeneschal(s, p.id),
        acked: s.acked.includes(p.id),
        voted: s.phase === 'vote' && Object.hasOwn(s.votes, p.id),
        investigated: s.investigated.includes(p.id),
        role: over ? (s.roles[p.id] as Role) : (known.get(p.id) ?? null),
      })),
      regent: s.regent,
      nominee: s.nominee,
      agitation: s.agitation,
      crown: s.crown,
      shadow: s.shadow,
      track: powerTrack(s.players.length),
      vetoUnlocked: s.shadow >= VETO_AT,
      vetoRefused: s.vetoRefused,
      deckCount: s.deck.length,
      discardCount: s.discard.length,
      lastVote: s.lastVote,
      history: s.history,
      pendingPower: s.pendingPower,
      me:
        me && myRole
          ? {
              id: me,
              role: myRole,
              team: teamOf(myRole),
              allies: [...known].filter(([id]) => id !== me).map(([id, role]) => ({ id, role })),
              investigations: s.knowledge[me] ?? [],
              hand,
              passed: inSession && me === s.regent ? s.passed : null,
              peek:
                s.phase === 'power' && s.pendingPower === 'peek' && me === s.regent ? s.deck.slice(0, 3) : null,
              myVote: s.phase === 'vote' && Object.hasOwn(s.votes, me) ? (s.votes[me] as boolean) : null,
            }
          : null,
      outcome: s.outcome,
      log: visibleLog(s.log, viewer),
    };
  },

  result(s) {
    if (!s.outcome) return null;
    const { winner } = s.outcome;
    return {
      winners: ids(s).filter((id) => teamOf(s.roles[id] as Role) === winner),
      title: winner === 'crown' ? 'Victoire de la Couronne' : 'Victoire de l’Ombre',
      detail: OUTCOME_TEXT[`${s.outcome.winner}:${s.outcome.reason}`],
    };
  },

  bot: throneBot,

  hotseat: {
    needsPrivacy(s) {
      switch (s.phase) {
        case 'reveal':
        case 'regent':
        case 'seneschal':
        case 'powerResult':
          return true;
        case 'vote':
          return s.config.votes === 'secret';
        case 'power':
          return s.pendingPower === 'peek';
        default:
          return false;
      }
    },
  },
});
