import { defineGame, visibleLog, type GameMeta, type PlayerId } from '@arcade/game-sdk';
import { expeditionBot } from './bot';
import {
  MAX_REJECTIONS,
  MISSIONS,
  MUTINEERS,
  STAGE_NAMES,
  TEAM_SIZES,
  TO_WIN,
  expeditionConfigSchema,
  expeditionMoveSchema,
  sabotagesNeeded,
  sideOf,
  type ExpeditionConfig,
  type ExpeditionMove,
  type ExpeditionOutcome,
  type ExpeditionState,
  type ExpeditionView,
  type Role,
} from './shared';

export const expeditionMeta: GameMeta = {
  id: 'expedition',
  name: 'Expédition',
  tagline: 'Des Mutins sabotent l’expédition polaire. Composez la bonne cordée.',
  minPlayers: 5,
  maxPlayers: 10,
  durationMinutes: [20, 40],
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
    {
      key: 'roles',
      label: 'Rôles',
      choices: [
        { value: 'basic', label: 'Explorateurs et Mutins', hint: 'Aucun rôle spécial.' },
        {
          value: 'cartographer',
          label: 'Avec la Cartographe',
          hint: 'Une exploratrice connaît les Mutins. Pas d’Espion : avantage à l’Expédition.',
        },
        {
          value: 'special',
          label: 'Avec Cartographe et Espion',
          hint: 'La Cartographe connaît les Mutins ; l’Espion peut la démasquer à la fin.',
        },
      ],
    },
  ],
  hotseatDefaults: { votes: 'hands' },
  rules: [
    'Une expédition polaire part conquérir le Pôle. Mais certains explorateurs, payés par une expédition rivale, sont des Mutins décidés à la faire échouer. Les Mutins se connaissent entre eux ; les autres ne savent rien.',
    `${MISSIONS} étapes jalonnent le voyage. À chaque étape, le Chef d’expédition (à tour de rôle) compose une cordée du nombre indiqué, puis tout le monde vote. À la majorité, la cordée part ; sinon, le rôle de Chef passe au suivant. ${MAX_REJECTIONS} refus d’affilée : l’expédition s’enlise et les Mutins gagnent.`,
    'Chaque membre de la cordée joue en secret une carte Réussite ou Sabotage. Les explorateurs loyaux jouent toujours Réussite. Un seul Sabotage suffit à faire échouer l’étape (il en faut deux pour la 4e étape à partir de 7 joueurs). On ne révèle que le nombre de sabotages, jamais qui les a joués.',
    `${TO_WIN} étapes réussies : l’expédition atteint le Pôle. ${TO_WIN} étapes ratées : les Mutins l’emportent.`,
    'Rôles au choix avant la partie : la Cartographe connaît les Mutins mais doit rester discrète. Si l’Espion est aussi en jeu (chez les Mutins), il peut tout renverser : quand l’expédition atteint le Pôle, il désigne qui est la Cartographe ; s’il voit juste, les Mutins gagnent.',
  ],
};

// ───────── Aides ─────────

const ids = (s: ExpeditionState) => s.players.map((p) => p.id);
const isPlayer = (s: ExpeditionState, id: PlayerId | null): id is PlayerId => id !== null && Object.hasOwn(s.roles, id);
const nameOf = (s: ExpeditionState, id: PlayerId | null) => s.players.find((p) => p.id === id)?.name ?? '?';
const leaderOf = (s: ExpeditionState) => s.players[s.leaderIndex]!.id;
const teamSize = (s: ExpeditionState) => TEAM_SIZES[s.players.length]![s.mission]!;
const spyOf = (s: ExpeditionState) => ids(s).find((id) => s.roles[id] === 'spy') ?? null;

function log(s: ExpeditionState, text: string): void {
  s.log.push({ text, visibleTo: 'all' });
}

function finish(s: ExpeditionState, outcome: ExpeditionOutcome): void {
  s.outcome = outcome;
  s.phase = 'over';
  log(s, OUTCOME_TEXT[`${outcome.winner}:${outcome.reason}`] ?? 'Fin de la partie.');
}

const OUTCOME_TEXT: Record<string, string> = {
  'expedition:missions': 'L’expédition atteint le Pôle : victoire des explorateurs !',
  'expedition:spyMissed': 'L’Espion s’est trompé : l’expédition triomphe !',
  'mutiny:missions': 'Trois étapes sabotées : l’expédition fait demi-tour, victoire des Mutins !',
  'mutiny:deadlock': `${MAX_REJECTIONS} cordées refusées d’affilée : l’expédition s’enlise, victoire des Mutins !`,
  'mutiny:cartographer': 'L’Espion a démasqué la Cartographe : victoire des Mutins !',
};

function nextLeader(s: ExpeditionState): void {
  s.leaderIndex = (s.leaderIndex + 1) % s.players.length;
  startTeam(s);
}

function startTeam(s: ExpeditionState): void {
  s.team = [];
  s.votes = {};
  s.cards = {};
  s.phase = 'team';
}

function resolveVote(s: ExpeditionState, votes: Record<PlayerId, boolean>): void {
  const yes = Object.values(votes).filter(Boolean).length;
  const approved = yes * 2 > s.players.length;
  const record = { leader: leaderOf(s), team: [...s.team], votes, approved };
  s.lastVote = record;
  s.votesHistory.push(record);
  s.votes = {};
  if (approved) {
    s.rejections = 0;
    s.cards = {};
    s.phase = 'mission';
    log(s, `Cordée acceptée (${yes} oui sur ${s.players.length}) : ${s.team.map((id) => nameOf(s, id)).join(', ')} partent.`);
    return;
  }
  s.rejections++;
  log(s, `Cordée refusée (${yes} oui sur ${s.players.length}). Refus d’affilée : ${s.rejections}/${MAX_REJECTIONS}.`);
  if (s.rejections >= MAX_REJECTIONS) finish(s, { winner: 'mutiny', reason: 'deadlock' });
  else nextLeader(s);
}

function resolveMission(s: ExpeditionState): void {
  const sabotages = Object.values(s.cards).filter((c) => c === 'sabotage').length;
  const success = sabotages < sabotagesNeeded(s.players.length, s.mission);
  s.results.push({ leader: leaderOf(s), team: [...s.team], sabotages, success });
  log(
    s,
    `${STAGE_NAMES[s.mission]} : ${success ? 'étape franchie' : 'étape ratée'} (${sabotages} sabotage${sabotages > 1 ? 's' : ''}).`,
  );
  const wins = s.results.filter((r) => r.success).length;
  const losses = s.results.length - wins;
  if (losses >= TO_WIN) {
    finish(s, { winner: 'mutiny', reason: 'missions' });
  } else if (wins >= TO_WIN) {
    if (s.config.roles === 'special' && spyOf(s)) {
      s.phase = 'spy';
      log(s, 'L’expédition touche au but… mais l’Espion peut encore démasquer la Cartographe !');
    } else {
      finish(s, { winner: 'expedition', reason: 'missions' });
    }
  } else {
    s.mission++;
    nextLeader(s);
  }
}

// ───────── Module ─────────

export const expedition = defineGame<ExpeditionState, ExpeditionMove, ExpeditionView, ExpeditionConfig>({
  meta: expeditionMeta,
  configSchema: expeditionConfigSchema,
  defaultConfig: { votes: 'secret', roles: 'basic' },
  moveSchema: expeditionMoveSchema,

  setup(players, config, rng) {
    const n = players.length;
    const mutineers = MUTINEERS[n];
    if (!mutineers) throw new Error(`Expédition se joue de 5 à 10 joueurs (reçu ${n}).`);
    const deck: Role[] = [
      ...Array<Role>(n - mutineers).fill('explorer'),
      ...Array<Role>(mutineers).fill('mutineer'),
    ];
    if (config.roles !== 'basic') deck[0] = 'cartographer';
    if (config.roles === 'special') deck[n - 1] = 'spy';
    const dealt = rng.shuffle(deck);
    const roles: Record<PlayerId, Role> = {};
    players.forEach((p, i) => {
      roles[p.id] = dealt[i] as Role;
    });
    return {
      players: players.map((p) => ({ ...p })),
      config,
      roles,
      phase: 'reveal',
      leaderIndex: rng.int(n),
      mission: 0,
      rejections: 0,
      team: [],
      votes: {},
      lastVote: null,
      votesHistory: [],
      cards: {},
      results: [],
      acked: [],
      unmasked: null,
      outcome: null,
      log: [{ text: 'L’expédition se prépare. Chacun découvre son rôle en secret.', visibleTo: 'all' }],
    };
  },

  expectedActors(s) {
    switch (s.phase) {
      case 'reveal':
        return ids(s).filter((id) => !s.acked.includes(id));
      case 'team':
        return [leaderOf(s)];
      case 'vote':
        return s.config.votes === 'hands' ? [leaderOf(s)] : ids(s).filter((id) => !Object.hasOwn(s.votes, id));
      case 'mission':
        return s.team.filter((id) => !Object.hasOwn(s.cards, id));
      case 'spy':
        return [spyOf(s) as PlayerId];
      default:
        return [];
    }
  },

  validate(s, by, move) {
    if (s.phase === 'over') return 'La partie est terminée.';
    if (!isPlayer(s, by)) return 'Tu ne participes pas à cette partie.';
    switch (move.type) {
      case 'ack':
        if (s.phase !== 'reveal') return "Ce n'est pas le moment.";
        return s.acked.includes(by) ? 'Déjà confirmé.' : null;
      case 'propose': {
        if (s.phase !== 'team') return "Ce n'est pas le moment de composer la cordée.";
        if (by !== leaderOf(s)) return 'C’est au Chef d’expédition de composer la cordée.';
        if (move.team.length !== teamSize(s)) return `La cordée doit compter ${teamSize(s)} membres.`;
        if (new Set(move.team).size !== move.team.length) return 'Membre en double.';
        return move.team.every((id) => isPlayer(s, id)) ? null : 'Joueur inconnu.';
      }
      case 'vote':
        if (s.phase !== 'vote' || s.config.votes !== 'secret') return "Ce n'est pas le moment de voter.";
        return Object.hasOwn(s.votes, by) ? 'Tu as déjà voté.' : null;
      case 'tally':
        if (s.phase !== 'vote' || s.config.votes !== 'hands') return "Ce n'est pas le moment.";
        if (by !== leaderOf(s)) return 'C’est au Chef de reporter le vote.';
        if (new Set(move.yes).size !== move.yes.length) return 'Joueur en double.';
        return move.yes.every((id) => isPlayer(s, id)) ? null : 'Joueur inconnu.';
      case 'play':
        if (s.phase !== 'mission') return "Ce n'est pas le moment.";
        if (!s.team.includes(by)) return 'Tu ne fais pas partie de la cordée.';
        if (Object.hasOwn(s.cards, by)) return 'Tu as déjà joué.';
        if (move.card === 'sabotage' && sideOf(s.roles[by] as Role) === 'expedition') {
          return 'Un membre loyal de l’expédition ne peut pas saboter.';
        }
        return null;
      case 'unmask':
        if (s.phase !== 'spy') return "Ce n'est pas le moment.";
        if (by !== spyOf(s)) return 'Seul l’Espion peut démasquer la Cartographe.';
        if (!isPlayer(s, move.target) || move.target === by) return 'Choisis un autre joueur.';
        return null;
    }
  },

  apply(state, by, move) {
    const s = structuredClone(state);
    switch (move.type) {
      case 'ack':
        s.acked.push(by);
        if (s.acked.length === s.players.length) {
          startTeam(s);
          log(s, `${nameOf(s, leaderOf(s))} est le premier Chef d’expédition.`);
        }
        return s;
      case 'propose':
        s.team = [...move.team];
        s.votes = {};
        s.phase = 'vote';
        log(s, `${nameOf(s, by)} propose la cordée : ${s.team.map((id) => nameOf(s, id)).join(', ')}.`);
        return s;
      case 'vote':
        s.votes[by] = move.yes;
        if (ids(s).every((id) => Object.hasOwn(s.votes, id))) resolveVote(s, s.votes);
        return s;
      case 'tally':
        resolveVote(s, Object.fromEntries(ids(s).map((id) => [id, move.yes.includes(id)])));
        return s;
      case 'play':
        s.cards[by] = move.card;
        if (s.team.every((id) => Object.hasOwn(s.cards, id))) resolveMission(s);
        return s;
      case 'unmask': {
        s.unmasked = move.target;
        const hit = s.roles[move.target] === 'cartographer';
        log(s, `L’Espion ${nameOf(s, by)} désigne ${nameOf(s, move.target)}.`);
        finish(s, hit ? { winner: 'mutiny', reason: 'cartographer' } : { winner: 'expedition', reason: 'spyMissed' });
        return s;
      }
    }
  },

  view(s, viewer): ExpeditionView {
    const over = s.phase === 'over';
    const me = isPlayer(s, viewer) ? viewer : null;
    const myRole = me ? (s.roles[me] as Role) : null;

    // Ce que chacun sait : les Mutins (Espion compris) se connaissent ; la Cartographe voit les Mutins
    // sans savoir lequel est l'Espion.
    const known = new Map<PlayerId, Role>();
    if (me && myRole) {
      known.set(me, myRole);
      if (sideOf(myRole) === 'mutiny') {
        for (const id of ids(s)) if (sideOf(s.roles[id] as Role) === 'mutiny') known.set(id, s.roles[id] as Role);
      } else if (myRole === 'cartographer') {
        for (const id of ids(s)) if (sideOf(s.roles[id] as Role) === 'mutiny') known.set(id, 'mutineer');
      }
    }

    const sizes = TEAM_SIZES[s.players.length]!;
    return {
      phase: s.phase,
      config: s.config,
      players: s.players.map((p) => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        acked: s.acked.includes(p.id),
        voted: s.phase === 'vote' && Object.hasOwn(s.votes, p.id),
        played: s.phase === 'mission' && Object.hasOwn(s.cards, p.id),
        onTeam: s.team.includes(p.id),
        role: over ? (s.roles[p.id] as Role) : (known.get(p.id) ?? null),
      })),
      leader: leaderOf(s),
      mission: s.mission,
      missions: sizes.map((size, i) => ({
        name: STAGE_NAMES[i] as string,
        size,
        needed: sabotagesNeeded(s.players.length, i),
        result: s.results[i] ?? null,
      })),
      rejections: s.rejections,
      team: s.team,
      lastVote: s.lastVote,
      votesHistory: s.votesHistory,
      me:
        me && myRole
          ? {
              id: me,
              role: myRole,
              side: sideOf(myRole),
              allies: [...known].filter(([id]) => id !== me).map(([id, role]) => ({ id, role })),
              myVote: s.phase === 'vote' && Object.hasOwn(s.votes, me) ? (s.votes[me] as boolean) : null,
              myCard: s.phase === 'mission' ? (s.cards[me] ?? null) : null,
            }
          : null,
      spy: s.phase === 'spy' || over ? spyOf(s) : null,
      unmasked: s.unmasked,
      outcome: s.outcome,
      log: visibleLog(s.log, viewer),
    };
  },

  result(s) {
    if (!s.outcome) return null;
    const winner = s.outcome.winner;
    return {
      winners: ids(s).filter((id) => sideOf(s.roles[id] as Role) === winner),
      title: winner === 'expedition' ? 'Victoire de l’Expédition' : 'Victoire des Mutins',
      detail: OUTCOME_TEXT[`${s.outcome.winner}:${s.outcome.reason}`],
    };
  },

  bot: expeditionBot,

  hotseat: {
    needsPrivacy(s) {
      if (s.phase === 'reveal' || s.phase === 'mission') return true;
      return s.phase === 'vote' && s.config.votes === 'secret';
    },
  },
});

