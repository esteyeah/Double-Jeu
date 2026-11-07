import { defineGame, visibleLog, type GameMeta, type PlayerId, type Rng } from '@arcade/game-sdk';
import { cupsBot } from './bot';
import {
  REVEAL_MS,
  bidText,
  countFace,
  cupsConfigSchema,
  cupsMoveSchema,
  isLegalBid,
  type CupsConfig,
  type CupsMove,
  type CupsState,
  type CupsView,
  type Face,
} from './shared';

export const cupsMeta: GameMeta = {
  id: 'cups',
  name: 'Gobelets',
  tagline: 'Des dés cachés sous les gobelets et des enchères de plus en plus folles. Menteur !',
  minPlayers: 2,
  maxPlayers: 8,
  durationMinutes: [10, 30],
  supportsHotseat: true,
  supportsBots: true,
  settings: [
    {
      key: 'dice',
      label: 'Dés par joueur',
      choices: [
        { value: 5, label: '5 (classique)' },
        { value: 4, label: '4' },
        { value: 3, label: '3 (partie rapide)' },
      ],
    },
    {
      key: 'exact',
      label: 'Annonce « Pile ! »',
      choices: [
        { value: true, label: 'Oui', hint: 'Parier que l’enchère est exacte : réussi, on regagne un dé ; raté, on en perd un.' },
        { value: false, label: 'Non' },
      ],
    },
    {
      key: 'dry',
      label: 'Manche sèche',
      choices: [
        {
          value: true,
          label: 'Oui',
          hint: 'Quand un joueur tombe à son dernier dé : les As ne sont plus jokers et la valeur ne change plus de la manche.',
        },
        { value: false, label: 'Non' },
      ],
    },
  ],
  rules: [
    'Chacun cache ses dés sous son gobelet et les secoue : tu ne vois que les tiens. Les As (les 1) sont jokers : ils comptent pour n’importe quelle valeur.',
    'À tour de rôle, on enchérit sur TOUS les dés de la table : « 4 × Cinq » veut dire « il y a au moins quatre Cinq (As compris) sous l’ensemble des gobelets ». Chaque enchère doit monter : plus de dés, ou autant de dés d’une valeur plus forte.',
    'Parier sur les As : la moitié de la quantité suffit (arrondie au-dessus). Revenir des As vers une autre valeur : il faut le double plus un. On ne peut pas ouvrir une manche sur les As.',
    'Au lieu de monter, tu peux crier « Menteur ! » : on soulève les gobelets. S’il y a au moins la quantité annoncée, tu perds un dé ; sinon, c’est l’enchérisseur qui en perd un.',
    'Variante « Pile ! » : tu paries que l’enchère est exactement juste. Si c’est le cas, tu regagnes un dé (sans dépasser ton nombre de départ) ; sinon, tu en perds un.',
    'Celui qui vient de perdre un dé ouvre la manche suivante, et tout le monde relance ses dés. Sans dé, on est éliminé ; le dernier à garder des dés gagne.',
    'Variante « Manche sèche » : quand un joueur tombe à son dernier dé (une fois par joueur, à trois joueurs ou plus), la manche suivante se joue sans jokers et la valeur annoncée à l’ouverture ne change plus.',
  ],
};

// ───────── Aides ─────────

const ids = (s: CupsState) => s.players.map((p) => p.id);
const isPlayer = (s: CupsState, id: PlayerId | null | undefined): id is PlayerId => !!id && Object.hasOwn(s.counts, id);
const alive = (s: CupsState) => ids(s).filter((id) => (s.counts[id] ?? 0) > 0);
const nameOf = (s: CupsState, id: PlayerId | null) => s.players.find((p) => p.id === id)?.name ?? '?';
const totalDice = (s: CupsState) => alive(s).reduce((sum, id) => sum + s.counts[id]!, 0);

function log(s: CupsState, text: string, visibleTo: 'all' | PlayerId[] = 'all'): void {
  s.log.push({ text, visibleTo });
}

/** Le joueur encore en jeu après `id` (ou `id` lui-même s'il est encore là et `self`). */
function nextAlive(s: CupsState, id: PlayerId, self = false): PlayerId {
  const n = s.players.length;
  const at = s.players.findIndex((p) => p.id === id);
  for (let k = self ? 0 : 1; k <= n; k++) {
    const candidate = s.players[(at + k) % n]!.id;
    if ((s.counts[candidate] ?? 0) > 0) return candidate;
  }
  return id;
}

function startRound(s: CupsState, rng: Rng): void {
  s.round++;
  s.dry = s.nextDry;
  s.nextDry = false;
  s.dice = {};
  for (const id of alive(s)) {
    s.dice[id] = Array.from({ length: s.counts[id]! }, () => (rng.int(6) + 1) as Face).sort((a, b) => a - b);
  }
  s.bid = null;
  s.history = [];
  s.reveal = null;
  s.revealUntil = null;
  s.active = s.starter;
  s.phase = 'bid';
  log(
    s,
    `Manche ${s.round} : tout le monde secoue son gobelet (${totalDice(s)} dés en jeu). ${nameOf(s, s.starter)} ouvre.${
      s.dry ? ' Manche sèche : pas de jokers, la valeur ne change pas.' : ''
    }`,
  );
}

function resolve(s: CupsState, call: 'liar' | 'exact', caller: PlayerId, now: number): void {
  const bid = s.bid!;
  const all = Object.values(s.dice).flat();
  const count = countFace(all, bid.face, s.dry);
  let loser: PlayerId | null = null;
  let gainer: PlayerId | null = null;

  if (call === 'liar') {
    loser = count >= bid.quantity ? caller : bid.by;
    log(
      s,
      `${nameOf(s, caller)} crie « Menteur ! » sur ${bidText(bid)}. Il y en a ${count} : ${
        loser === caller ? `l’enchère tenait, ${nameOf(s, caller)} perd un dé.` : `${nameOf(s, bid.by)} bluffait et perd un dé.`
      }`,
    );
  } else if (count === bid.quantity) {
    gainer = s.counts[caller]! < s.config.dice ? caller : null;
    log(
      s,
      `${nameOf(s, caller)} annonce « Pile ! » sur ${bidText(bid)}. Il y en a exactement ${count} : ${
        gainer ? `${nameOf(s, caller)} regagne un dé !` : 'bien vu (déjà au maximum de dés).'
      }`,
    );
  } else {
    loser = caller;
    log(s, `${nameOf(s, caller)} annonce « Pile ! » sur ${bidText(bid)}. Il y en a ${count} : raté, un dé de perdu.`);
  }

  s.reveal = { dice: structuredClone(s.dice), bid, call, caller, count, dry: s.dry, loser, gainer };
  if (gainer) s.counts[gainer]!++;
  if (loser) {
    s.counts[loser]!--;
    if (s.counts[loser] === 0) {
      s.out.push(loser);
      log(s, `${nameOf(s, loser)} n’a plus de dés : éliminé.`);
    } else if (
      s.counts[loser] === 1 &&
      s.config.dry &&
      !s.dryUsed.includes(loser) &&
      alive(s).length >= 3
    ) {
      s.dryUsed.push(loser);
      s.nextDry = true;
      log(s, `${nameOf(s, loser)} tombe à son dernier dé : la prochaine manche sera sèche.`);
    }
  }

  const left = alive(s);
  if (left.length === 1) {
    s.winner = left[0]!;
    s.phase = 'over';
    s.revealUntil = null;
    log(s, `${nameOf(s, s.winner)} est le dernier à garder des dés : victoire !`);
    return;
  }
  // Le perdant ouvre la manche suivante (ou le suivant s'il est éliminé) ; après un « Pile ! », celui qui l'a annoncé.
  s.starter = nextAlive(s, loser ?? caller, true);
  s.phase = 'reveal';
  s.revealUntil = now + REVEAL_MS;
}

// ───────── Module ─────────

export const cups = defineGame<CupsState, CupsMove, CupsView, CupsConfig>({
  meta: cupsMeta,
  configSchema: cupsConfigSchema,
  defaultConfig: { dice: 5, exact: true, dry: true },
  moveSchema: cupsMoveSchema,

  setup(players, config, rng) {
    const starter = players[rng.int(players.length)]!.id;
    const s: CupsState = {
      players: players.map((p) => ({ ...p })),
      config,
      dice: {},
      counts: Object.fromEntries(players.map((p) => [p.id, config.dice])),
      round: 0,
      phase: 'bid',
      active: starter,
      starter,
      bid: null,
      history: [],
      dry: false,
      nextDry: false,
      dryUsed: [],
      reveal: null,
      revealUntil: null,
      out: [],
      winner: null,
      log: [],
    };
    startRound(s, rng);
    return s;
  },

  expectedActors(s) {
    if (s.phase === 'bid') return [s.active];
    if (s.phase === 'reveal') return [s.starter];
    return [];
  },

  validate(s, by, move) {
    if (s.phase === 'over') return 'La partie est terminée.';
    if (!isPlayer(s, by)) return 'Tu ne participes pas à cette partie.';
    if (s.counts[by] === 0) return 'Tu es éliminé.';
    switch (move.type) {
      case 'bid':
        if (s.phase !== 'bid' || by !== s.active) return "Ce n'est pas ton tour.";
        return isLegalBid(s.bid, move.quantity, move.face, s.dry, totalDice(s))
          ? null
          : 'Enchère impossible : elle doit monter (et respecter la règle des As).';
      case 'liar':
        if (s.phase !== 'bid' || by !== s.active) return "Ce n'est pas ton tour.";
        return s.bid ? null : 'Il n’y a encore aucune enchère.';
      case 'exact':
        if (s.phase !== 'bid' || by !== s.active) return "Ce n'est pas ton tour.";
        if (!s.config.exact) return 'L’annonce « Pile ! » n’est pas activée.';
        return s.bid ? null : 'Il n’y a encore aucune enchère.';
      case 'next':
        return s.phase === 'reveal' && by === s.starter ? null : "Ce n'est pas à toi de relancer.";
    }
  },

  apply(state, by, move, rng, now) {
    const s = structuredClone(state);
    switch (move.type) {
      case 'bid':
        s.bid = { by, quantity: move.quantity, face: move.face };
        s.history.push(s.bid);
        log(s, `${nameOf(s, by)} annonce ${bidText(s.bid)}.`);
        s.active = nextAlive(s, by);
        return s;
      case 'liar':
      case 'exact':
        resolve(s, move.type, by, now);
        return s;
      case 'next':
        startRound(s, rng);
        return s;
    }
  },

  view(s, viewer): CupsView {
    const me = isPlayer(s, viewer) && s.phase === 'bid' && s.dice[viewer] ? viewer : null;
    return {
      phase: s.phase,
      config: s.config,
      round: s.round,
      players: s.players.map((p) => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        dice: s.counts[p.id] ?? 0,
        out: (s.counts[p.id] ?? 0) === 0,
        dryUsed: s.dryUsed.includes(p.id),
      })),
      active: s.active,
      starter: s.starter,
      totalDice: totalDice(s),
      bid: s.bid,
      history: s.history,
      dry: s.dry,
      // Les dés de la manche terminée sont publics ; ceux de la manche en cours, jamais.
      reveal: s.reveal,
      revealUntil: s.revealUntil,
      me: me ? { id: me, dice: s.dice[me]! } : null,
      winner: s.winner,
      log: visibleLog(s.log, viewer),
    };
  },

  result(s) {
    if (s.phase !== 'over' || !s.winner) return null;
    return {
      winners: [s.winner],
      title: `${nameOf(s, s.winner)} remporte la partie`,
      detail: 'Dernier à garder des dés sous son gobelet.',
    };
  },

  // Quand c'est un bot qui relance, on laisse le temps de regarder les dés révélés.
  deadline: (s) =>
    s.phase === 'reveal' && s.players.find((p) => p.id === s.starter)?.isBot ? s.revealUntil : null,

  onDeadline(state, rng) {
    const s = structuredClone(state);
    if (s.phase === 'reveal') startRound(s, rng);
    return s;
  },

  bot: cupsBot,

  hotseat: {
    // Chacun ne doit voir que ses propres dés : on passe le téléphone à chaque enchère.
    needsPrivacy: (s) => s.phase === 'bid',
  },
});
