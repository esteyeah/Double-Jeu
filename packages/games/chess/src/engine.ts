import type { GameMeta, GameModule, PlayerId, PlayerInfo } from '@arcade/game-sdk';
import { chessBot } from './bot';
import {
  allActions,
  dealSecrets,
  findPiece,
  inCheck,
  newCore,
  placeQueen,
  placeSquares,
  play,
  secretView,
  type Core,
  type MoveFull,
} from './core';
import {
  MODES,
  NAMES,
  configSchema,
  has,
  moveSchema,
  other,
  type ChessConfig,
  type ChessMove,
  type ChessView,
  type Color,
  type HistoryEntry,
  type Legal,
} from './shared';

export interface ChessState {
  players: Record<Color, { id: PlayerId; name: string }>;
  core: Core;
  phase: 'pick' | 'play' | 'place' | 'over';
  picked: Record<Color, boolean>;
  pending: { text: string; cls: HistoryEntry['cls'] } | null;
  drawOffer: Color | null;
  undoRequest: Color | null;
  /** États avant chaque action, pour revenir en arrière et revoir la partie. */
  stack: Core[];
}

const MODE_LABEL: Record<(typeof MODES)[number], { label: string; hint: string }> = {
  missions: { label: 'Missions secrètes', hint: 'Contraintes cachées et une mission à réussir.' },
  vanish: { label: 'Cases effondrées', hint: 'Une case se fissure à chaque passage et s’effondre au 3e.' },
  imposter: { label: 'Imposteur', hint: 'Un pion et une pièce adverses peuvent passer dans ton camp.' },
  swap: { label: 'Échange', hint: '3 fois : échange une pièce avec une pièce adverse du même type.' },
  blind: { label: 'À l’aveugle', hint: 'Les pièces sont invisibles : on joue de mémoire.' },
};

export const chessMeta: GameMeta = {
  id: 'chess',
  name: 'Échecs Sournois',
  tagline: 'Les échecs, avec des secrets, des traîtres, des échanges et un plateau qui s’effondre.',
  minPlayers: 2,
  maxPlayers: 2,
  durationMinutes: [10, 40],
  supportsHotseat: true,
  supportsBots: true,
  settings: [
    {
      key: 'modes',
      label: 'Modes (combinables)',
      kind: 'multi',
      min: 0,
      max: MODES.length,
      choices: MODES.map((m) => ({ value: m, label: MODE_LABEL[m].label, hint: MODE_LABEL[m].hint })),
    },
    {
      key: 'constraints',
      label: 'Contraintes par joueur (Missions secrètes)',
      choices: [0, 1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) })),
    },
    {
      key: 'reward',
      label: 'Mission réussie',
      choices: [
        { value: 'win', label: 'Victoire immédiate' },
        { value: 'queen', label: 'Une dame en renfort', hint: 'À poser sur une case vide, sans donner échec.' },
      ],
    },
    {
      key: 'walled',
      label: 'Roi enfermé (Cases effondrées)',
      choices: [
        { value: true, label: 'Défaite', hint: 'Roi entouré de trous, ou plus aucun coup : défaite.' },
        { value: false, label: 'Pat classique (nulle)' },
      ],
    },
  ],
  rules: [
    'Les règles des échecs classiques s’appliquent : roque, prise en passant, promotion, échec et mat, pat.',
    'Missions secrètes : chacun reçoit en secret des contraintes (ex. « interdit de jouer dans la colonne E ») et une mission. Si aucun coup ne respecte tes contraintes, elles sont levées pour ce coup. Une mission réussie fait gagner, ou donne une dame à poser, selon le réglage.',
    'Cases effondrées : chaque arrivée d’une pièce fissure la case ; au 3e passage elle s’effondre avec la pièce posée dessus. Les trous bloquent tours, fous, dames et pions ; seuls les cavaliers les sautent.',
    'Imposteur : au début, chacun désigne en secret un pion et une pièce adverses (pas le roi). À ton tour, au lieu de jouer, tu peux faire passer un traître dans ton camp. Chaque traître ne sert qu’une fois.',
    'Échange : trois fois par partie, au lieu de jouer, échange la place d’une de tes pièces avec une pièce adverse du même type (pas le roi), si ton roi n’est pas en échec ensuite.',
    'À l’aveugle : les pièces sont invisibles. Tape tes coups (e2e4, O-O, e7e8=D) ou touche les cases.',
    'En ligne : prémove (touche une pièce puis sa case pendant le tour adverse) et flèches au clic droit, comme sur les sites d’échecs.',
  ],
  hotseatDefaults: { modes: [], constraints: 2, reward: 'win', walled: true },
};

const colorOf = (s: ChessState, id: PlayerId): Color | null =>
  s.players.w.id === id ? 'w' : s.players.b.id === id ? 'b' : null;
const secretsOn = (cfg: ChessConfig) => has(cfg, 'missions') || has(cfg, 'imposter');

function legalFor(s: ChessState, c: Color): Legal | null {
  if (s.phase === 'place' && s.core.turn === c) return { moves: [], flips: [], swaps: [], lifted: false, place: placeSquares(s.core, c) };
  if (s.phase !== 'play' || s.core.turn !== c) return null;
  const a = allActions(s.core, c);
  return {
    moves: a.moves.map(({ fr, fc, tr, tc, type, capture, needPromo, castle }) => ({ fr, fc, tr, tc, type, capture, needPromo, castle })),
    flips: a.flips,
    swaps: a.swaps,
    lifted: a.lifted,
    place: [],
  };
}

/** Coups à annuler : le sien, plus la réponse adverse si elle a déjà été jouée. */
const undoDepth = (s: ChessState, c: Color) => (s.core.turn === c ? 2 : 1);

function end(s: ChessState, over: { winner: Color | null; reason: string }): ChessState {
  return { ...s, phase: 'over', drawOffer: null, core: { ...s.core, over } };
}

export const chess: GameModule<ChessState, ChessMove, ChessView, ChessConfig> = {
  meta: chessMeta,
  configSchema,
  defaultConfig: { modes: [], constraints: 2, reward: 'win', walled: true },
  moveSchema,

  setup(players: PlayerInfo[], config, rng) {
    const [a, b] = rng.shuffle(players);
    const core = newCore(config);
    if (has(config, 'missions')) dealSecrets(core, rng);
    return {
      players: { w: { id: a!.id, name: a!.name }, b: { id: b!.id, name: b!.name } },
      core,
      phase: has(config, 'imposter') ? 'pick' : 'play',
      picked: { w: false, b: false },
      pending: null,
      drawOffer: null,
      undoRequest: null,
      stack: [],
    };
  },

  expectedActors(s) {
    if (s.phase === 'over') return [];
    if (s.undoRequest) return [s.players[other(s.undoRequest)].id];
    if (s.drawOffer) return [s.players[other(s.drawOffer)].id];
    if (s.phase === 'pick') return (['w', 'b'] as const).filter((c) => !s.picked[c]).map((c) => s.players[c].id);
    return [s.players[s.core.turn].id];
  },

  validate(s, by, mv) {
    const c = colorOf(s, by);
    if (!c) return 'Tu ne joues pas dans cette partie.';
    if (s.phase === 'over') return 'La partie est terminée.';
    if (mv.t === 'resign') return null;
    if (mv.t === 'undo-request') {
      if (s.phase !== 'play') return 'Pas maintenant.';
      if (s.undoRequest || s.drawOffer) return 'Une demande est déjà en attente.';
      return s.stack.length >= undoDepth(s, c) ? null : 'Aucun de tes coups à annuler.';
    }
    if (mv.t === 'undo-accept' || mv.t === 'undo-decline') return s.undoRequest === other(c) ? null : 'Aucune demande d’annulation.';
    if (mv.t === 'draw-decline') return s.drawOffer === other(c) ? null : 'Aucune nulle proposée.';
    if (mv.t === 'draw-accept') return s.drawOffer === other(c) ? null : 'Aucune nulle proposée.';
    if (s.undoRequest || s.drawOffer) return 'Une demande attend la réponse de l’adversaire.';
    if (mv.t === 'draw-offer') return s.phase !== 'play' ? 'La partie n’a pas commencé.' : s.drawOffer === c ? 'Nulle déjà proposée.' : null;
    if (mv.t === 'pick') {
      if (s.phase !== 'pick' || s.picked[c]) return 'Pas de traître à choisir maintenant.';
      const pawn = findPiece(s.core, mv.pawn),
        piece = findPiece(s.core, mv.piece);
      const pp = pawn && s.core.board[pawn[0]][pawn[1]],
        pc = piece && s.core.board[piece[0]][piece[1]];
      if (!pp || pp.color === c || pp.type !== 'p') return 'Choisis un pion adverse.';
      if (!pc || pc.color === c || pc.type === 'p' || pc.type === 'k') return 'Choisis une pièce adverse (pas le roi).';
      return null;
    }
    if (s.core.turn !== c) return 'Ce n’est pas ton tour.';
    if (mv.t === 'place') {
      if (s.phase !== 'place') return 'Pas de dame à poser.';
      return placeSquares(s.core, c).some(([r, cc]) => r === mv.r && cc === mv.c) ? null : 'Pose la dame sur une case vide, sans donner échec.';
    }
    if (s.phase !== 'play') return 'Pas maintenant.';
    const a = allActions(s.core, c);
    if (mv.t === 'move') {
      const m = a.moves.find((x) => x.fr === mv.fr && x.fc === mv.fc && x.tr === mv.tr && x.tc === mv.tc);
      if (m) return null;
      const anyLegal = allActions({ ...s.core, cfg: { ...s.core.cfg, modes: s.core.cfg.modes.filter((x) => x !== 'missions') } }, c).moves.some(
        (x) => x.fr === mv.fr && x.fc === mv.fc && x.tr === mv.tr && x.tc === mv.tc,
      );
      return anyLegal ? 'Coup interdit par une de tes contraintes.' : 'Coup impossible.';
    }
    if (mv.t === 'flip') return a.flips.some((x) => x.id === mv.id) ? null : 'Ce traître ne peut pas changer de camp maintenant.';
    if (mv.t === 'swap')
      return a.swaps.some((x) => x.fr === mv.fr && x.fc === mv.fc && x.tr === mv.tr && x.tc === mv.tc) ? null : 'Échange impossible.';
    return 'Coup inconnu.';
  },

  apply(s, by, mv) {
    const c = colorOf(s, by)!;
    if (mv.t === 'resign') return end(s, { winner: other(c), reason: `Les ${NAMES[c]} abandonnent` });
    if (mv.t === 'draw-offer') return { ...s, drawOffer: c };
    if (mv.t === 'draw-accept') return end(s, { winner: null, reason: 'Nulle d’un commun accord' });
    if (mv.t === 'draw-decline') return { ...s, drawOffer: null };
    if (mv.t === 'undo-request') return { ...s, undoRequest: c };
    if (mv.t === 'undo-decline') return { ...s, undoRequest: null };
    if (mv.t === 'undo-accept') {
      const n = undoDepth(s, other(c));
      const stack = s.stack.slice(0, s.stack.length - n);
      return { ...s, core: s.stack[s.stack.length - n]!, stack, undoRequest: null, drawOffer: null, pending: null, phase: 'play' };
    }
    if (mv.t === 'pick') {
      const core = structuredClone(s.core);
      core.secrets[c].traitors = [mv.pawn, mv.piece];
      const picked = { ...s.picked, [c]: true };
      return { ...s, core, picked, phase: picked.w && picked.b ? 'play' : 'pick' };
    }
    let core: Core;
    let pending: ChessState['pending'] = null;
    const stack = mv.t === 'place' ? s.stack : [...s.stack, s.core];
    if (mv.t === 'place') core = placeQueen(s.core, mv.r, mv.c, s.pending!);
    else {
      const a = allActions(s.core, c);
      let out;
      if (mv.t === 'move') {
        const m = a.moves.find((x) => x.fr === mv.fr && x.fc === mv.fc && x.tr === mv.tr && x.tc === mv.tc)!;
        const full: MoveFull = m.needPromo ? { ...m, promo: mv.promo ?? 'q' } : m;
        out = play(s.core, { t: 'move', m: full });
      } else if (mv.t === 'flip') out = play(s.core, { t: 'flip', a: a.flips.find((x) => x.id === mv.id)! });
      else out = play(s.core, { t: 'swap', a: a.swaps.find((x) => x.fr === mv.fr && x.fc === mv.fc && x.tr === mv.tr && x.tc === mv.tc)! });
      core = out.s;
      pending = out.pending;
    }
    return { ...s, core, stack, pending, drawOffer: null, undoRequest: null, phase: core.over ? 'over' : pending ? 'place' : 'play' };
  },

  view(s, viewer) {
    const me = viewer ? colorOf(s, viewer) : null;
    const core = s.core;
    // Sans information secrète, l'écran partagé peut proposer les coups du joueur au trait.
    const legalColor = me ?? (secretsOn(core.cfg) ? null : core.turn);
    return {
      phase: s.phase,
      players: s.players,
      me,
      config: core.cfg,
      board: core.board,
      turn: core.turn,
      holes: core.holes,
      visits: core.visits,
      lastMove: core.lastMove,
      history: core.history,
      taken: core.taken,
      swapsLeft: core.swaps,
      check: s.phase !== 'over' && inCheck(core, core.turn),
      drawOffer: s.drawOffer,
      undoRequest: s.undoRequest,
      canUndo: { w: s.phase === 'play' && s.stack.length >= undoDepth(s, 'w'), b: s.phase === 'play' && s.stack.length >= undoDepth(s, 'b') },
      frames: s.phase === 'over' ? [...s.stack, core].map((k) => ({ board: k.board, holes: k.holes, visits: k.visits, lastMove: k.lastMove })) : null,
      picked: s.picked,
      over: core.over,
      mine: me && secretsOn(core.cfg) ? secretView(core, me) : null,
      legal: legalColor ? legalFor(s, legalColor) : null,
      reveal: s.phase === 'over' && secretsOn(core.cfg) ? { w: secretView(core, 'w'), b: secretView(core, 'b') } : null,
      placing: s.phase === 'place' && s.core.secrets[core.turn].mission ? s.core.secrets[core.turn].mission!.text : null,
    };
  },

  result(s) {
    if (s.phase !== 'over' || !s.core.over) return null;
    const o = s.core.over;
    return {
      winners: o.winner ? [s.players[o.winner].id] : [],
      title: o.winner ? `Victoire des ${NAMES[o.winner]} (${s.players[o.winner].name})` : 'Partie nulle',
      detail: o.reason,
    };
  },

  bot: chessBot,

  hotseat: {
    needsPrivacy: (s) => secretsOn(s.core.cfg),
  },
};
