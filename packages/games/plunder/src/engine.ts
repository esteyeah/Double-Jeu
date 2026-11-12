import { defineGame, visibleLog, type GameMeta, type PlayerId, type Rng } from '@arcade/game-sdk';
import { plunderBot } from './bot';
import {
  LOOT_LABEL,
  LOOT_PER_ROUND,
  MAX_WOUNDS,
  PEARL_BONUS,
  PEARL_VALUE,
  ROUNDS,
  RUM_VALUE,
  START_DRY,
  START_WET,
  mapValue,
  plunderConfigSchema,
  plunderMoveSchema,
  type LootItem,
  type PlunderConfig,
  type PlunderMove,
  type PlunderState,
  type PlunderView,
} from './shared';

export const plunderMeta: GameMeta = {
  records: [{ key: 'loot', label: 'Plus gros butin en une partie', unit: 'doublons' }],
  id: 'plunder',
  name: 'Butin',
  tagline: 'Pistolet chargé ou balle à blanc : les pirates se partagent le trésor, arme au poing.',
  minPlayers: 3,
  maxPlayers: 8,
  durationMinutes: [20, 35],
  supportsHotseat: true,
  supportsBots: true,
  settings: [
    {
      key: 'courage',
      label: 'Plonger dans la cale',
      choices: [
        { value: 'secret', label: 'Chacun sur son écran' },
        { value: 'table', label: 'À voix haute (un seul téléphone)' },
      ],
    },
  ],
  hotseatDefaults: { courage: 'table' },
  rules: [
    'Abordage réussi ! Les pirates se partagent le trésor… mais personne n’a envie de partager. À chaque manche, un nouveau butin est déposé sur le pont.',
    `Chaque pirate possède ${START_DRY + START_WET} balles : ${START_DRY} réelles et ${START_WET} à blanc. Au début de chaque manche, chacun charge en secret son pistolet (pistolet chargé ou balle à blanc) et choisit le pirate qu’il vise.`,
    'Les visées sont révélées. Le Capitaine peut obliger un pirate, qu’il le vise ou non, à viser quelqu’un d’autre. Puis chacun décide : tenir bon ou plonger dans la cale. Ceux qui plongent ne risquent rien… mais ne prennent rien, et leur balle reste secrète.',
    `On tire ! Chaque pistolet chargé blesse sa cible (une balle à blanc ne fait que du bruit) ; un pirate touché ne participe pas au partage. À ${MAX_WOUNDS} blessures, il est coulé et ne peut plus gagner.`,
    'Les pirates indemnes se servent un objet chacun à leur tour, en commençant par le Capitaine, jusqu’à ce que le pont soit vide. Ce que personne ne prend reste pour la manche suivante.',
    `Doublons (5, 10 ou 20) ; perles (${PEARL_VALUE} chacune, +${PEARL_BONUS} pour le plus gros collier) ; fragments de carte (1 : 5, 2 : 15, 3 : 30, 4 : 50, puis +25 chacun) ; rhum (soigne une blessure, sinon vaut ${RUM_VALUE}) ; munitions (une balle réelle en plus) ; bicorne (tu seras Capitaine à la manche suivante). Après ${ROUNDS} manches, le pirate encore à flot le plus riche gagne.`,
  ],
};

// ───────── Aides ─────────

function buildDeck(): LootItem[] {
  const repeat = (item: LootItem, n: number) => Array.from({ length: n }, () => ({ ...item }));
  return [
    ...repeat({ kind: 'coin', value: 5 }, 15),
    ...repeat({ kind: 'coin', value: 10 }, 12),
    ...repeat({ kind: 'coin', value: 20 }, 7),
    ...repeat({ kind: 'pearl' }, 10),
    ...repeat({ kind: 'map' }, 8),
    ...repeat({ kind: 'rum' }, 6),
    ...repeat({ kind: 'powder' }, 4),
    ...repeat({ kind: 'bicorne' }, 2),
  ];
}
export const DECK_SIZE = buildDeck().length;

const ids = (s: PlunderState) => s.players.map((p) => p.id);
const isPlayer = (s: PlunderState, id: PlayerId | null): id is PlayerId => id !== null && Object.hasOwn(s.pirates, id);
const afloat = (s: PlunderState, id: PlayerId) => isPlayer(s, id) && !s.pirates[id]!.sunk;
const standing = (s: PlunderState) => ids(s).filter((id) => !s.pirates[id]!.sunk);
const isBot = (s: PlunderState, id: PlayerId) => s.players.find((p) => p.id === id)?.isBot === true;
const nameOf = (s: PlunderState, id: PlayerId | null) => s.players.find((p) => p.id === id)?.name ?? '?';

function log(s: PlunderState, text: string): void {
  s.log.push({ text, visibleTo: 'all' });
}

/** Joueurs (filtrés) dans l'ordre de la table, à partir de `start`. */
function fromSeat(s: PlunderState, start: PlayerId, keep: (id: PlayerId) => boolean): PlayerId[] {
  const all = ids(s);
  const i = Math.max(0, all.indexOf(start));
  return [...all.slice(i), ...all.slice(0, i)].filter(keep);
}

/** Humain chargé de reporter les plongeons en mode « table ». */
function reporter(s: PlunderState): PlayerId | null {
  return fromSeat(s, s.captain, (id) => afloat(s, id) && !isBot(s, id))[0] ?? null;
}

function pendingCourage(s: PlunderState): PlayerId[] {
  return standing(s).filter((id) => !Object.hasOwn(s.fled, id));
}

export function pearlLeaders(s: PlunderState): PlayerId[] {
  const counts = standing(s).map((id) => ({ id, n: s.pirates[id]!.loot.filter((l) => l.kind === 'pearl').length }));
  const best = Math.max(0, ...counts.map((c) => c.n));
  return best === 0 ? [] : counts.filter((c) => c.n === best).map((c) => c.id);
}

export function scoreOf(s: PlunderState, id: PlayerId): number {
  const loot = s.pirates[id]?.loot ?? [];
  const count = (k: LootItem['kind']) => loot.filter((l) => l.kind === k).length;
  const coins = loot.reduce((sum, l) => sum + (l.kind === 'coin' ? (l.value ?? 0) : 0), 0);
  return (
    coins +
    count('pearl') * PEARL_VALUE +
    (pearlLeaders(s).includes(id) ? PEARL_BONUS : 0) +
    mapValue(count('map')) +
    count('rum') * RUM_VALUE
  );
}

function revealAims(s: PlunderState): void {
  for (const id of standing(s)) s.aims[id] = s.prepared[id]!.target;
  log(s, 'Les pistolets sont braqués !');
  // Le Capitaine peut réorienter le pistolet de n'importe quel pirate (à partir de 3 pirates debout).
  s.phase = standing(s).length >= 3 && standing(s).includes(s.captain) ? 'order' : 'courage';
}

/** On tire : balles réelles des pirates restés debout, sur des cibles restées debout. */
function resolve(s: PlunderState): void {
  s.shots = [];
  s.hit = [];
  const wounds: Record<PlayerId, number> = {};
  for (const shooter of fromSeat(s, s.captain, (id) => afloat(s, id))) {
    if (s.fled[shooter]) continue; // sa balle reste secrète
    const target = s.aims[shooter] as PlayerId;
    const charge = s.prepared[shooter]!.charge;
    const hit = charge === 'dry' && !s.fled[target];
    s.shots.push({ shooter, target, charge, hit });
    if (hit) wounds[target] = (wounds[target] ?? 0) + 1;
  }
  const divers = standing(s).filter((id) => s.fled[id]);
  if (divers.length) log(s, `${divers.map((id) => nameOf(s, id)).join(', ')} plonge${divers.length > 1 ? 'nt' : ''} dans la cale.`);
  for (const shot of s.shots) {
    log(
      s,
      `${nameOf(s, shot.shooter)} tire sur ${nameOf(s, shot.target)} : ${
        shot.charge === 'wet' ? 'clic… balle à blanc' : shot.hit ? 'PAN !' : 'PAN… dans le vide !'
      }`,
    );
  }
  for (const [id, n] of Object.entries(wounds)) {
    const pirate = s.pirates[id]!;
    pirate.wounds = Math.min(MAX_WOUNDS, pirate.wounds + n);
    s.hit.push(id);
    if (pirate.wounds >= MAX_WOUNDS) {
      pirate.sunk = true;
      log(s, `${nameOf(s, id)} est coulé !`);
    }
  }
  s.pickers = fromSeat(s, s.captain, (id) => afloat(s, id) && !s.fled[id] && !s.hit.includes(id));
  s.turn = 0;
  if (s.pickers.length === 0 || s.deckOnBoard.length === 0) {
    log(s, 'Personne ne se sert : le butin reste sur le pont.');
    endRound(s);
  } else {
    s.phase = 'loot';
  }
}

function endRound(s: PlunderState): void {
  const alive = standing(s);
  if (s.round >= ROUNDS || alive.length <= 1) {
    s.phase = 'over';
    log(s, alive.length <= 1 ? 'Il ne reste plus assez de pirates à flot : fin de la partie.' : 'Dernière manche jouée : comptons le butin !');
    return;
  }
  s.round++;
  const crowned = s.nextCaptain && afloat(s, s.nextCaptain) ? s.nextCaptain : null;
  s.captain = crowned ?? fromSeat(s, s.captain, (id) => afloat(s, id) && id !== s.captain)[0] ?? s.captain;
  s.nextCaptain = null;
  s.deckOnBoard.push(...s.deck.splice(0, LOOT_PER_ROUND));
  s.prepared = {};
  s.aims = {};
  s.order = null;
  s.fled = {};
  s.hit = [];
  s.pickers = [];
  s.turn = 0;
  s.phase = 'prepare';
  log(s, `Manche ${s.round} : ${nameOf(s, s.captain)} est Capitaine. ${s.deckOnBoard.length} objets sur le pont.`);
}

function maybeResolveCourage(s: PlunderState): void {
  if (pendingCourage(s).length === 0) resolve(s);
}

// ───────── Module ─────────

export const plunder = defineGame<PlunderState, PlunderMove, PlunderView, PlunderConfig>({
  meta: plunderMeta,
  configSchema: plunderConfigSchema,
  defaultConfig: { courage: 'secret' },
  moveSchema: plunderMoveSchema,

  setup(players, config, rng) {
    const n = players.length;
    if (n < plunderMeta.minPlayers || n > plunderMeta.maxPlayers) {
      throw new Error(`Butin se joue de 3 à 8 joueurs (reçu ${n}).`);
    }
    const deck = rng.shuffle(buildDeck());
    const captain = rng.pick(players).id;
    return {
      players: players.map((p) => ({ ...p })),
      config,
      pirates: Object.fromEntries(
        players.map((p) => [p.id, { dry: START_DRY, wet: START_WET, wounds: 0, sunk: false, loot: [] }]),
      ),
      round: 1,
      captain,
      nextCaptain: null,
      phase: 'prepare',
      prepared: {},
      aims: {},
      order: null,
      fled: {},
      shots: [],
      hit: [],
      pickers: [],
      turn: 0,
      deckOnBoard: deck.slice(0, LOOT_PER_ROUND),
      deck: deck.slice(LOOT_PER_ROUND),
      used: [],
      log: [{ text: `Manche 1 : ${players.find((p) => p.id === captain)!.name} est Capitaine. Le butin est sur le pont.`, visibleTo: 'all' }],
    };
  },

  expectedActors(s) {
    switch (s.phase) {
      case 'prepare':
        return standing(s).filter((id) => !Object.hasOwn(s.prepared, id));
      case 'order':
        return [s.captain];
      case 'courage': {
        const pending = pendingCourage(s);
        if (s.config.courage === 'secret') return pending;
        const bots = pending.filter((id) => isBot(s, id));
        if (bots.length) return bots;
        const rep = reporter(s);
        return pending.length && rep ? [rep] : [];
      }
      case 'loot':
        return [s.pickers[s.turn % s.pickers.length] as PlayerId];
      default:
        return [];
    }
  },

  validate(s, by, move) {
    if (s.phase === 'over') return 'La partie est terminée.';
    if (!isPlayer(s, by)) return 'Tu ne participes pas à cette partie.';
    if (!afloat(s, by)) return 'Tu as été coulé.';
    switch (move.type) {
      case 'prepare': {
        if (s.phase !== 'prepare') return "Ce n'est pas le moment de charger.";
        if (Object.hasOwn(s.prepared, by)) return 'Tu as déjà chargé.';
        const pirate = s.pirates[by]!;
        if (move.charge === 'dry' && pirate.dry === 0) return 'Plus de balle réelle.';
        if (move.charge === 'wet' && pirate.wet === 0) return 'Plus de balle à blanc.';
        if (move.target === by || !afloat(s, move.target)) return 'Vise un autre pirate encore à flot.';
        return null;
      }
      case 'order': {
        if (s.phase !== 'order') return "Ce n'est pas le moment.";
        if (by !== s.captain) return 'Seul le Capitaine donne des ordres.';
        if (!move.pirate && !move.target) return null; // laisser faire
        if (!move.pirate || !move.target) return 'Ordre incomplet.';
        if (move.pirate === s.captain || !afloat(s, move.pirate) || !Object.hasOwn(s.aims, move.pirate)) return 'Choisis un autre pirate.';
        if (move.target === move.pirate || move.target === s.captain || move.target === s.aims[move.pirate] || !afloat(s, move.target)) {
          return 'Choisis une nouvelle cible valable.';
        }
        return null;
      }
      case 'courage':
        if (s.phase !== 'courage') return "Ce n'est pas le moment.";
        if (Object.hasOwn(s.fled, by)) return 'Tu as déjà décidé.';
        if (s.config.courage === 'table' && !isBot(s, by)) return 'Le plongeon est annoncé à voix haute.';
        return null;
      case 'cowards': {
        if (s.phase !== 'courage' || s.config.courage !== 'table') return "Ce n'est pas le moment.";
        if (by !== reporter(s)) return 'C’est au Capitaine de reporter les plongeons.';
        if (pendingCourage(s).some((id) => isBot(s, id))) return 'Les bots n’ont pas encore décidé.';
        const humans = pendingCourage(s);
        return move.fled.every((id) => humans.includes(id)) ? null : 'Joueur inattendu.';
      }
      case 'take':
        if (s.phase !== 'loot') return "Ce n'est pas le moment de se servir.";
        if (by !== s.pickers[s.turn % s.pickers.length]) return 'Ce n’est pas ton tour.';
        return move.index < s.deckOnBoard.length ? null : 'Objet introuvable.';
    }
  },

  apply(state, by, move) {
    const s = structuredClone(state);
    switch (move.type) {
      case 'prepare': {
        s.prepared[by] = { charge: move.charge, target: move.target };
        s.pirates[by]![move.charge]--;
        if (standing(s).every((id) => Object.hasOwn(s.prepared, id))) revealAims(s);
        return s;
      }
      case 'order': {
        if (move.pirate && move.target) {
          s.aims[move.pirate] = move.target;
          s.order = { pirate: move.pirate, from: s.captain, to: move.target };
          log(s, `Le Capitaine ${nameOf(s, by)} ordonne à ${nameOf(s, move.pirate)} de viser ${nameOf(s, move.target)} !`);
        } else {
          log(s, `Le Capitaine ${nameOf(s, by)} laisse faire.`);
        }
        s.phase = 'courage';
        return s;
      }
      case 'courage':
        s.fled[by] = move.flee;
        maybeResolveCourage(s);
        return s;
      case 'cowards':
        for (const id of pendingCourage(s)) s.fled[id] = move.fled.includes(id);
        maybeResolveCourage(s);
        return s;
      case 'take': {
        const [item] = s.deckOnBoard.splice(move.index, 1) as [LootItem];
        const pirate = s.pirates[by]!;
        let note = '';
        if (item.kind === 'rum' && pirate.wounds > 0) {
          pirate.wounds--;
          s.used.push(item);
          note = ' et soigne une blessure';
        } else if (item.kind === 'powder') {
          pirate.dry++;
          s.used.push(item);
          note = ' : une balle réelle de plus';
        } else if (item.kind === 'bicorne') {
          s.nextCaptain = by;
          s.used.push(item);
          note = ' : Capitaine à la manche suivante';
        } else {
          pirate.loot.push(item);
        }
        log(s, `${nameOf(s, by)} prend : ${LOOT_LABEL[item.kind]}${item.value ? ` (${item.value})` : ''}${note}.`);
        s.turn++;
        if (s.deckOnBoard.length === 0) endRound(s);
        return s;
      }
    }
  },

  view(s, viewer): PlunderView {
    const me = isPlayer(s, viewer) ? viewer : null;
    const resolved = s.phase === 'loot' || s.phase === 'over' || (s.phase === 'prepare' && s.round > 1);
    const pending = s.phase === 'courage' ? pendingCourage(s) : [];
    return {
      phase: s.phase,
      config: s.config,
      round: s.round,
      rounds: ROUNDS,
      captain: s.captain,
      nextCaptain: s.nextCaptain,
      pirates: s.players.map((p) => {
        const st = s.pirates[p.id]!;
        return {
          id: p.id,
          name: p.name,
          isBot: p.isBot,
          wounds: st.wounds,
          sunk: st.sunk,
          charges: st.dry + st.wet,
          loot: st.loot,
          score: scoreOf(s, p.id),
          prepared: s.phase === 'prepare' && Object.hasOwn(s.prepared, p.id),
          aim: s.aims[p.id] ?? null,
          decided: s.phase === 'courage' && Object.hasOwn(s.fled, p.id),
          fled: s.phase === 'loot' || s.phase === 'over' ? (s.fled[p.id] ?? false) : null,
          hit: s.hit.includes(p.id),
        };
      }),
      board: s.deckOnBoard,
      deckLeft: s.deck.length,
      order: s.order,
      shots: resolved ? s.shots : [],
      picker: s.phase === 'loot' ? (s.pickers[s.turn % s.pickers.length] ?? null) : null,
      pickers: s.phase === 'loot' ? s.pickers : [],
      toReport:
        s.config.courage === 'table' && s.phase === 'courage' && !pending.some((id) => isBot(s, id))
          ? pending
          : [],
      reporter: s.config.courage === 'table' ? reporter(s) : null,
      me: me
        ? {
            id: me,
            dry: s.pirates[me]!.dry,
            wet: s.pirates[me]!.wet,
            prepared: s.prepared[me] ?? null,
            courage: s.phase === 'courage' && Object.hasOwn(s.fled, me) ? (s.fled[me] as boolean) : null,
          }
        : null,
      pearlLeaders: pearlLeaders(s),
      log: visibleLog(s.log, viewer),
    };
  },

  recordValues(s) {
    if (s.phase !== 'over') return [];
    return standing(s).map((id) => ({ key: 'loot', players: [id], value: scoreOf(s, id) }));
  },

  result(s) {
    if (s.phase !== 'over') return null;
    const alive = standing(s);
    if (alive.length === 0) return { winners: [], title: 'Tous coulés !', detail: 'Personne ne profite du trésor.' };
    const best = Math.max(...alive.map((id) => scoreOf(s, id)));
    const winners = alive.filter((id) => scoreOf(s, id) === best);
    return {
      winners,
      title:
        winners.length === 1
          ? `${nameOf(s, winners[0]!)} repart avec le trésor`
          : `Égalité : ${winners.map((id) => nameOf(s, id)).join(', ')}`,
      detail: `${best} doublons`,
    };
  },

  bot: plunderBot,

  hotseat: {
    needsPrivacy: (s) => s.phase === 'prepare' || (s.phase === 'courage' && s.config.courage === 'secret'),
  },
});
