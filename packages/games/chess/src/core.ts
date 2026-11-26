/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Règles des Échecs Sournois : échecs classiques complets (roque, prise en passant, promotion)
 * plus les variantes (cases effondrées, imposteurs, échanges, contraintes et missions secrètes).
 * Fonctions pures. Les grilles sont manipulées en `any` pour garder le code lisible malgré
 * `noUncheckedIndexedAccess` : toutes les coordonnées sont bornées par `inB`.
 */
import type { Rng } from '@arcade/game-sdk';
import {
  FR,
  NAMES,
  PNAME,
  SWAPS,
  VANISH_AT,
  has,
  other,
  sq,
  type ChessConfig,
  type Color,
  type FlipAction,
  type HistoryEntry,
  type LegalMove,
  type PieceType,
  type SecretView,
  type Sq,
  type SwapAction,
} from './shared';

const KN = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]] as const;
const KG = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
const VAL: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export interface Constraint {
  key: string;
  text: string;
  f?: number;
  n?: number;
  d?: boolean;
}
export interface Secrets {
  constraints: Constraint[];
  mission: { key: string; text: string } | null;
  done: boolean;
  traitors: number[];
  used: number[];
}
export interface Core {
  board: any;
  turn: Color;
  ep: Sq | null;
  holes: any;
  visits: any;
  last: Record<Color, number | null>;
  lastType: Record<Color, PieceType | null>;
  lastCap: Record<Color, boolean>;
  pawnStreak: Record<Color, number>;
  hold: Record<Color, number>;
  swaps: Record<Color, number>;
  voidLost: Record<Color, number>;
  moveCount: Record<Color, number>;
  stats: Record<Color, { cap: Record<PieceType, number>; checks: number; promos: number; kingCaps: number }>;
  taken: { w: { t: PieceType; c: Color }[]; b: { t: PieceType; c: Color }[]; void: { t: PieceType; c: Color }[] };
  history: HistoryEntry[];
  cfg: ChessConfig;
  secrets: Record<Color, Secrets>;
  over: { winner: Color | null; reason: string } | null;
  lastMove: { from?: Sq; to?: Sq } | null;
  nextId: number;
  /** Demi-coups sans prise ni coup de pion (règle des 75 coups). */
  quiet: number;
}
export interface MoveFull extends LegalMove {
  pid: number;
  ep?: boolean;
  double?: boolean;
  promo?: PieceType;
}

export const inB = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
export const open = (s: { holes: any }, r: number, c: number) => inB(r, c) && !s.holes[r][c];
const isDark = (r: number, c: number) => (r + c) % 2 === 1;
/** Rangée vue par le joueur : 0 = sa première rangée, 7 = la dernière rangée adverse. */
const rel = (c: Color, r: number) => (c === 'w' ? 7 - r : r);
const fwd = (c: Color, m: LegalMove) => (c === 'w' ? m.tr < m.fr : m.tr > m.fr);
const back = (c: Color, m: LegalMove) => (c === 'w' ? m.tr > m.fr : m.tr < m.fr);
export function pieces(s: { board: any }, c: Color, t?: PieceType): [number, number, any][] {
  const o: [number, number, any][] = [];
  for (let r = 0; r < 8; r++)
    for (let f = 0; f < 8; f++) {
      const p = s.board[r][f];
      if (p && p.color === c && (!t || p.type === t)) o.push([r, f, p]);
    }
  return o;
}

// ───────── Contraintes ─────────

type Gen = (rng: Rng) => Omit<Constraint, 'key'>;
const fixed = (text: string): Gen => () => ({ text });
interface CDef {
  group?: string;
  gen: Gen;
  ok: (s: Core, m: MoveFull, c: Color, k: Constraint) => boolean;
}
export const CDEF: Record<string, CDef> = {
  nofile: {
    gen: (rng) => {
      const f = rng.pick([2, 3, 4, 5]);
      return { f, text: `Interdit de jouer dans la colonne ${'ABCDEFGH'[f]}` };
    },
    ok: (s, m, c, k) => m.tc !== k.f && !(m.castle && (m.castle === 'K' ? 5 : 3) === k.f),
  },
  norank: {
    gen: (rng) => {
      const n = rng.pick([3, 4, 5, 6]);
      return { n, text: `Interdit de poser une pièce sur la rangée ${n}` };
    },
    ok: (s, m, c, k) => 8 - m.tr !== k.n,
  },
  edges: { gen: fixed('Interdit de jouer dans les colonnes A et H'), ok: (s, m) => m.tc !== 0 && m.tc !== 7 },
  same: { group: 'repeat', gen: fixed('Jamais deux fois de suite la même pièce'), ok: (s, m, c) => m.pid !== s.last[c] },
  sametype: { group: 'repeat', gen: fixed('Jamais deux fois de suite le même type de pièce'), ok: (s, m, c) => m.type !== s.lastType[c] },
  pawnstreak: { group: 'repeat', gen: fixed('Jamais plus de 2 coups de pion de suite'), ok: (s, m, c) => m.type !== 'p' || s.pawnStreak[c] < 2 },
  nocastle: { gen: fixed('Interdit de roquer'), ok: (s, m) => !m.castle },
  queencap: { gen: fixed('Ta dame ne capture jamais'), ok: (s, m) => !(m.type === 'q' && m.capture) },
  kingcap: { gen: fixed('Ton roi ne capture jamais'), ok: (s, m) => !(m.type === 'k' && m.capture) },
  bishopcap: { gen: fixed('Tes fous ne capturent jamais'), ok: (s, m) => !(m.type === 'b' && m.capture) },
  knightcap: { gen: fixed('Tes cavaliers ne capturent jamais'), ok: (s, m) => !(m.type === 'n' && m.capture) },
  rookcap: { gen: fixed('Tes tours ne capturent jamais'), ok: (s, m) => !(m.type === 'r' && m.capture) },
  nodouble: { gen: fixed('Tes pions n’avancent jamais de deux cases'), ok: (s, m) => !m.double },
  knightback: { gen: fixed('Tes cavaliers ne reculent jamais'), ok: (s, m, c) => m.type !== 'n' || fwd(c, m) },
  bishopback: { gen: fixed('Tes fous ne reculent jamais'), ok: (s, m, c) => m.type !== 'b' || fwd(c, m) },
  queenback: { gen: fixed('Ta dame ne recule jamais'), ok: (s, m, c) => m.type !== 'q' || !back(c, m) },
  queendark: {
    gen: (rng) => {
      const d = rng.pick([true, false]);
      return { d, text: `Ta dame ne se pose jamais sur une case ${d ? 'foncée' : 'claire'}` };
    },
    ok: (s, m, c, k) => m.type !== 'q' || isDark(m.tr, m.tc) !== k.d,
  },
  rooklate: { gen: fixed('Tes tours ne bougent pas avant ton 12e coup (roque compris)'), ok: (s, m, c) => !(m.type === 'r' || m.castle) || s.moveCount[c] >= 11 },
  queenlate: { gen: fixed('Ta dame ne bouge pas avant ton 8e coup'), ok: (s, m, c) => m.type !== 'q' || s.moveCount[c] >= 7 },
  kingstill: {
    gen: fixed('Ton roi ne bouge pas avant ton 10e coup, sauf pour sortir d’un échec'),
    ok: (s, m, c) => m.type !== 'k' || s.moveCount[c] >= 9 || inCheck(s, c),
  },
  capstreak: { gen: fixed('Jamais deux captures de suite'), ok: (s, m, c) => !(m.capture && s.lastCap[c]) },
  nocheck: { gen: fixed('Interdit de faire échec avant ton 15e coup'), ok: (s, m, c) => s.moveCount[c] >= 14 || !inCheck(simMove(s, m), other(c)) },
};

// ───────── Missions ─────────
/* « hold » : la condition doit être vraie à la fin de N de tes tours d'affilée ;
   si l'adversaire la casse entre-temps, le compteur repart à zéro. */
interface MDef {
  text: string;
  conflicts?: string[];
  hold?: number;
  cond?: (s: Core, c: Color) => boolean;
  done?: (s: Core, c: Color) => boolean;
  progress?: (s: Core, c: Color) => string;
}
const capPoints = (s: Core, c: Color) => (Object.entries(s.stats[c].cap) as [PieceType, number][]).reduce((a, [t, n]) => a + VAL[t] * n, 0);
export const MDEF: Record<string, MDef> = {
  queen: { text: 'Capture la dame adverse', done: (s, c) => s.stats[c].cap.q >= 1 },
  rooks: { text: 'Capture les deux tours adverses', done: (s, c) => s.stats[c].cap.r >= 2 },
  bishops: { text: 'Capture les deux fous adverses', done: (s, c) => s.stats[c].cap.b >= 2 },
  knights: { text: 'Capture les deux cavaliers adverses', done: (s, c) => s.stats[c].cap.n >= 2 },
  minors: { text: 'Capture 3 pièces mineures (fous ou cavaliers)', done: (s, c) => s.stats[c].cap.b + s.stats[c].cap.n >= 3 },
  pawns: { text: 'Capture 6 pions adverses', done: (s, c) => s.stats[c].cap.p >= 6, progress: (s, c) => `${s.stats[c].cap.p}/6` },
  material: {
    text: 'Capture 15 points de matériel (pion 1, cavalier et fou 3, tour 5, dame 9)',
    done: (s, c) => capPoints(s, c) >= 15,
    progress: (s, c) => `${capPoints(s, c)}/15`,
  },
  promote: { text: 'Fais promouvoir un pion', done: (s, c) => s.stats[c].promos >= 1 },
  checks: { text: 'Mets le roi adverse en échec 5 fois', done: (s, c) => s.stats[c].checks >= 5, progress: (s, c) => `${s.stats[c].checks}/5` },
  kingcap: { text: 'Capture une pièce avec ton roi', conflicts: ['kingcap', 'kingstill'], done: (s, c) => s.stats[c].kingCaps >= 1 },
  untouched: {
    text: 'Ne perds aucune pièce avant la fin de ton 12e coup',
    done: (s, c) => s.moveCount[c] >= 12 && s.taken[other(c)].length === 0 && s.voidLost[c] === 0,
    progress: (s, c) => (s.taken[other(c)].length || s.voidLost[c] ? 'ratée' : `${Math.min(s.moveCount[c], 12)}/12`),
  },
  kingwalk: {
    text: 'Garde ton roi dans la moitié adverse pendant 2 de tes tours',
    conflicts: ['kingstill'],
    hold: 2,
    cond: (s, c) => pieces(s, c, 'k').some(([r]) => rel(c, r) >= 4),
  },
  center: {
    text: 'Occupe d4, e4, d5 et e5 en même temps pendant 3 de tes tours',
    conflicts: ['nofile', 'norank'],
    hold: 3,
    cond: (s, c) =>
      ([[3, 3], [3, 4], [4, 3], [4, 4]] as const).every(([r, f]) => {
        const p = s.board[r][f];
        return p && p.color === c;
      }),
  },
  rook7: {
    text: 'Garde une tour sur ta 7e rangée (la 2e des adversaires) pendant 3 de tes tours',
    conflicts: ['norank', 'rooklate'],
    hold: 3,
    cond: (s, c) => pieces(s, c, 'r').some(([r]) => rel(c, r) === 6),
  },
  outpost: { text: 'Garde un cavalier dans la moitié adverse pendant 4 de tes tours', hold: 4, cond: (s, c) => pieces(s, c, 'n').some(([r]) => rel(c, r) >= 4) },
  pawnwall: {
    text: 'Aie 3 pions sur ta 5e rangée en même temps pendant 3 de tes tours',
    conflicts: ['norank'],
    hold: 3,
    cond: (s, c) => pieces(s, c, 'p').filter(([r]) => rel(c, r) === 4).length >= 3,
  },
  queendeep: {
    text: 'Garde ta dame sur la dernière rangée adverse pendant 2 de tes tours',
    conflicts: ['queenlate', 'queendark'],
    hold: 2,
    cond: (s, c) => pieces(s, c, 'q').some(([r]) => rel(c, r) === 7),
  },
  twobishops: {
    text: 'Garde tes deux fous jusqu’à ton 25e coup',
    done: (s, c) => s.moveCount[c] >= 25 && pieces(s, c, 'b').length >= 2,
    progress: (s, c) => `${Math.min(s.moveCount[c], 25)}/25`,
  },
};
export function missionDone(s: Core, c: Color): boolean {
  const m = s.secrets[c].mission;
  if (!m) return false;
  const d = MDEF[m.key]!;
  return d.hold ? s.hold[c] >= d.hold : d.done!(s, c);
}
export function missionProgress(s: Core, c: Color): string {
  const m = s.secrets[c].mission;
  if (!m) return '';
  const d = MDEF[m.key]!;
  if (s.secrets[c].done) return 'réussie';
  if (d.hold) return `${s.hold[c]}/${d.hold} tours`;
  return d.progress ? d.progress(s, c) : '';
}
export function dealSecrets(s: Core, rng: Rng): void {
  const n = s.cfg.constraints;
  for (const c of ['w', 'b'] as const) {
    const keys: string[] = [];
    const groups: string[] = [];
    for (const k of rng.shuffle(Object.keys(CDEF))) {
      if (keys.length >= n) break;
      const g = CDEF[k]!.group;
      if (g && groups.includes(g)) continue;
      keys.push(k);
      if (g) groups.push(g);
    }
    s.secrets[c].constraints = keys.map((k) => ({ key: k, ...CDEF[k]!.gen(rng) }));
    const pool = Object.keys(MDEF).filter((m) => !(MDEF[m]!.conflicts ?? []).some((k) => keys.includes(k)));
    const mk = rng.pick(pool);
    s.secrets[c].mission = { key: mk, text: MDEF[mk]!.text };
  }
}
function updateHolds(s: Core, me: Color): void {
  for (const c of ['w', 'b'] as const) {
    const m = s.secrets[c].mission;
    if (!m || s.secrets[c].done) continue;
    const d = MDEF[m.key]!;
    if (!d.hold) continue;
    const ok = d.cond!(s, c);
    if (c === me) s.hold[c] = ok ? s.hold[c] + 1 : 0;
    else if (!ok) s.hold[c] = 0;
  }
}

// ───────── Plateau ─────────

export function newCore(cfg: ChessConfig): Core {
  let uid = 0;
  const mk = (t: PieceType, c: Color) => ({ id: ++uid, type: t, color: c, moved: false });
  const backRank = 'rnbqkbnr';
  const board: any = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0][c] = mk(backRank[c] as PieceType, 'b');
    board[1][c] = mk('p', 'b');
    board[6][c] = mk('p', 'w');
    board[7][c] = mk(backRank[c] as PieceType, 'w');
  }
  const grid = <T,>(v: T) => Array.from({ length: 8 }, () => Array<T>(8).fill(v));
  const st = () => ({ cap: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }, checks: 0, promos: 0, kingCaps: 0 });
  const sec = (): Secrets => ({ constraints: [], mission: null, done: false, traitors: [], used: [] });
  const two = <T,>(v: T): Record<Color, T> => ({ w: v, b: v });
  return {
    board,
    turn: 'w',
    ep: null,
    holes: grid(false),
    visits: grid(0),
    last: two<number | null>(null),
    lastType: two<PieceType | null>(null),
    lastCap: two(false),
    pawnStreak: two(0),
    hold: two(0),
    swaps: two(SWAPS),
    voidLost: two(0),
    moveCount: two(0),
    stats: { w: st(), b: st() },
    taken: { w: [], b: [], void: [] },
    history: [],
    cfg,
    secrets: { w: sec(), b: sec() },
    over: null,
    lastMove: null,
    nextId: 100,
    quiet: 0,
  };
}

export function attacked(s: { board: any; holes: any }, r: number, c: number, by: Color): boolean {
  const B = s.board;
  const pr = by === 'w' ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    const pc = c + dc;
    if (inB(pr, pc)) {
      const p = B[pr][pc];
      if (p && p.color === by && p.type === 'p') return true;
    }
  }
  for (const [dr, dc] of KN) {
    const rr = r + dr,
      cc = c + dc;
    if (inB(rr, cc)) {
      const p = B[rr][cc];
      if (p && p.color === by && p.type === 'n') return true;
    }
  }
  for (const [dr, dc] of KG) {
    const rr = r + dr,
      cc = c + dc;
    if (inB(rr, cc)) {
      const p = B[rr][cc];
      if (p && p.color === by && p.type === 'k') return true;
    }
  }
  for (const [dirs, types] of [[ORTH, 'rq'], [DIAG, 'bq']] as const)
    for (const [dr, dc] of dirs) {
      let rr = r + dr,
        cc = c + dc;
      while (open(s, rr, cc)) {
        const p = B[rr][cc];
        if (p) {
          if (p.color === by && types.includes(p.type)) return true;
          break;
        }
        rr += dr;
        cc += dc;
      }
    }
  return false;
}
export function kingPos(s: { board: any }, color: Color): Sq | null {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = s.board[r][c];
      if (p && p.type === 'k' && p.color === color) return [r, c];
    }
  return null;
}
export function inCheck(s: { board: any; holes: any }, color: Color): boolean {
  const k = kingPos(s, color);
  return !k || attacked(s, k[0], k[1], other(color));
}
export function findPiece(s: { board: any }, id: number): Sq | null {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = s.board[r][c];
      if (p && p.id === id) return [r, c];
    }
  return null;
}

export function genMoves(s: Core, color: Color): MoveFull[] {
  const B = s.board,
    out: MoveFull[] = [];
  const add = (p: any, fr: number, fc: number, tr: number, tc: number, x: Partial<MoveFull> = {}) =>
    out.push({ fr, fc, tr, tc, pid: p.id, type: p.type, capture: !!B[tr][tc] || !!x.ep, ...x });
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = B[r][c];
      if (!p || p.color !== color) continue;
      if (p.type === 'p') {
        const d = color === 'w' ? -1 : 1,
          start = color === 'w' ? 6 : 1,
          lastR = color === 'w' ? 0 : 7,
          r1 = r + d;
        const addP = (tc: number) => add(p, r, c, r1, tc, r1 === lastR ? { promo: 'q', needPromo: true } : {});
        if (open(s, r1, c) && !B[r1][c]) {
          addP(c);
          const r2 = r + 2 * d;
          if (r === start && open(s, r2, c) && !B[r2][c]) add(p, r, c, r2, c, { double: true });
        }
        for (const dc of [-1, 1]) {
          const tc = c + dc;
          if (!open(s, r1, tc)) continue;
          const t = B[r1][tc];
          if (t && t.color !== color) addP(tc);
          else if (!t && s.ep && s.ep[0] === r1 && s.ep[1] === tc) {
            const v = B[r][tc];
            if (v && v.type === 'p' && v.color !== color) add(p, r, c, r1, tc, { ep: true });
          }
        }
      } else if (p.type === 'n' || p.type === 'k') {
        for (const [dr, dc] of p.type === 'n' ? KN : KG) {
          const tr = r + dr,
            tc = c + dc;
          if (!open(s, tr, tc)) continue;
          const t = B[tr][tc];
          if (!t || t.color !== color) add(p, r, c, tr, tc);
        }
        if (p.type === 'k' && !p.moved && c === 4 && r === (color === 'w' ? 7 : 0) && !attacked(s, r, c, other(color))) {
          for (const side of ['K', 'Q'] as const) {
            const rook = B[r][side === 'K' ? 7 : 0];
            if (!rook || rook.type !== 'r' || rook.color !== color || rook.moved) continue;
            if ((side === 'K' ? [5, 6] : [1, 2, 3]).some((x) => !open(s, r, x) || B[r][x])) continue;
            if ((side === 'K' ? [5, 6] : [3, 2]).some((x) => attacked(s, r, x, other(color)))) continue;
            add(p, r, c, r, side === 'K' ? 6 : 2, { castle: side });
          }
        }
      } else {
        const dirs = p.type === 'r' ? ORTH : p.type === 'b' ? DIAG : [...ORTH, ...DIAG];
        for (const [dr, dc] of dirs) {
          let tr = r + dr,
            tc = c + dc;
          while (open(s, tr, tc)) {
            const t = B[tr][tc];
            if (t) {
              if (t.color !== color) add(p, r, c, tr, tc);
              break;
            }
            add(p, r, c, tr, tc);
            tr += dr;
            tc += dc;
          }
        }
      }
    }
  return out;
}

/** Applique un coup en place. Renvoie les pièces prises et englouties. */
function doMove(s: Core, m: MoveFull): { captured: any; vanished: any[] } {
  const B = s.board,
    p = B[m.fr][m.fc];
  let captured = B[m.tr][m.tc];
  if (m.ep) {
    captured = B[m.fr][m.tc];
    B[m.fr][m.tc] = null;
  }
  B[m.tr][m.tc] = p;
  B[m.fr][m.fc] = null;
  p.moved = true;
  if (m.promo) p.type = m.promo;
  const arrivals: Sq[] = [[m.tr, m.tc]];
  if (m.castle) {
    const rc = m.castle === 'K' ? 7 : 0,
      nc = m.castle === 'K' ? 5 : 3,
      rook = B[m.fr][rc];
    B[m.fr][nc] = rook;
    B[m.fr][rc] = null;
    rook.moved = true;
    arrivals.push([m.fr, nc]);
  }
  s.ep = m.double ? [(m.fr + m.tr) / 2, m.fc] : null;
  const vanished: any[] = [];
  if (has(s.cfg, 'vanish'))
    for (const [r, c] of arrivals) {
      s.visits[r][c]++;
      if (s.visits[r][c] >= VANISH_AT) {
        if (B[r][c]) vanished.push({ ...B[r][c], at: [r, c] });
        B[r][c] = null;
        s.holes[r][c] = true;
        if (s.ep && r === m.tr && c === m.tc) s.ep = null;
      }
    }
  return { captured, vanished };
}
function doFlip(s: Core, a: FlipAction) {
  const p = s.board[a.r][a.c];
  p.color = other(p.color);
  p.moved = true;
  s.ep = null;
}
function doSwap(s: Core, a: SwapAction) {
  const B = s.board,
    p = B[a.fr][a.fc],
    q = B[a.tr][a.tc];
  B[a.fr][a.fc] = q;
  B[a.tr][a.tc] = p;
  p.moved = true;
  q.moved = true;
  s.ep = null;
}
const cloneLite = (s: Core): Core => ({
  ...s,
  board: s.board.map((row: any[]) => row.map((p) => (p ? { ...p } : null))),
  holes: s.holes.map((r: boolean[]) => r.slice()),
  visits: s.visits.map((r: number[]) => r.slice()),
});
export function simMove(s: Core, m: MoveFull) {
  const n = cloneLite(s);
  doMove(n, m);
  return n;
}
function simFlip(s: Core, a: FlipAction) {
  const n = cloneLite(s);
  doFlip(n, a);
  return n;
}
function simSwap(s: Core, a: SwapAction) {
  const n = cloneLite(s);
  doSwap(n, a);
  return n;
}
export function legalMoves(s: Core, color: Color) {
  return genMoves(s, color).filter((m) => !inCheck(simMove(s, m), color));
}
function flipActions(s: Core, color: Color): FlipAction[] {
  if (!has(s.cfg, 'imposter')) return [];
  const sec = s.secrets[color];
  const out: FlipAction[] = [];
  for (const id of sec.traitors) {
    if (sec.used.includes(id)) continue;
    const pos = findPiece(s, id);
    if (!pos) continue;
    const p = s.board[pos[0]][pos[1]];
    if (p.color === color || p.type === 'k') continue;
    const a = { id, r: pos[0], c: pos[1], type: p.type };
    if (!inCheck(simFlip(s, a), color)) out.push(a);
  }
  return out;
}
/** Échange : même type des deux côtés, jamais le roi, interdit s'il laisse son roi en échec. */
function swapActions(s: Core, color: Color): SwapAction[] {
  if (!has(s.cfg, 'swap') || s.swaps[color] <= 0) return [];
  const out: SwapAction[] = [];
  const theirs = pieces(s, other(color)).filter((x) => x[2].type !== 'k');
  for (const [fr, fc, p] of pieces(s, color)) {
    if (p.type === 'k') continue;
    for (const [tr, tc, q] of theirs) {
      if (q.type !== p.type) continue;
      const a = { fr, fc, tr, tc, type: p.type };
      if (!inCheck(simSwap(s, a), color)) out.push(a);
    }
  }
  return out;
}
export function allActions(s: Core, color: Color) {
  const legal = legalMoves(s, color);
  let moves = legal,
    lifted = false;
  if (has(s.cfg, 'missions')) {
    const ok = legal.filter((m) => s.secrets[color].constraints.every((k) => CDEF[k.key]!.ok(s, m, color, k)));
    if (ok.length || !legal.length) moves = ok;
    else lifted = true;
  }
  return { moves, lifted, flips: flipActions(s, color), swaps: swapActions(s, color) };
}
/** Cases où poser la dame de renfort : vides, intactes, sans donner échec. */
export function placeSquares(s: Core, me: Color): Sq[] {
  const out: Sq[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      if (s.board[r][c] || s.holes[r][c]) continue;
      const n = cloneLite(s);
      n.board[r][c] = { id: -1, type: 'q', color: me, moved: true };
      if (!inCheck(n, other(me))) out.push([r, c]);
    }
  return out;
}
/** Roi emmuré : chaque case voisine est un trou ou hors du plateau. */
function walled(s: Core, color: Color) {
  const k = kingPos(s, color);
  if (!k) return false;
  return KG.every(([dr, dc]) => !open(s, k[0] + dr, k[1] + dc));
}
const onlyKings = (s: Core) => s.board.every((row: any[]) => row.every((p) => !p || p.type === 'k'));

// ───────── Actions complètes ─────────

export type Action =
  | { t: 'move'; m: MoveFull }
  | { t: 'flip'; a: FlipAction }
  | { t: 'swap'; a: SwapAction };

/**
 * Joue une action du joueur au trait. Renvoie le nouvel état et, si une mission vient
 * d'être réussie avec la récompense « dame », le texte en attente (la pose suit).
 */
export function play(s0: Core, act: Action): { s: Core; pending: { text: string; cls: HistoryEntry['cls'] } | null } {
  const s: Core = structuredClone(s0);
  const me = s.turn,
    op = other(me);
  let text: string,
    cls: HistoryEntry['cls'] = '';
  s.lastType[me] = null;
  s.pawnStreak[me] = 0;
  s.last[me] = null;
  s.lastCap[me] = false;
  if (act.t === 'flip') {
    const a = act.a;
    doFlip(s, a);
    s.secrets[me].used.push(a.id);
    text = `${PNAME[a.type]} ${sq(a.r, a.c)} trahit`;
    cls = 'flip';
    s.lastMove = { to: [a.r, a.c] };
  } else if (act.t === 'swap') {
    const a = act.a;
    doSwap(s, a);
    s.swaps[me]--;
    text = `${FR[a.type] || 'pion '}${sq(a.fr, a.fc)}⇄${sq(a.tr, a.tc)}`;
    cls = 'swap';
    s.lastMove = { from: [a.fr, a.fc], to: [a.tr, a.tc] };
  } else {
    const a = act.m;
    const info = doMove(s, a);
    if (info.captured) {
      s.stats[me].cap[info.captured.type as PieceType]++;
      s.taken[me].push({ t: info.captured.type, c: info.captured.color });
      if (a.type === 'k') s.stats[me].kingCaps++;
    }
    if (a.promo) s.stats[me].promos++;
    s.quiet = info.captured || a.type === 'p' ? 0 : s.quiet + 1;
    s.last[me] = a.pid;
    s.lastType[me] = a.type;
    s.lastCap[me] = !!info.captured;
    s.pawnStreak[me] = a.type === 'p' ? s0.pawnStreak[me] + 1 : 0;
    text = a.castle
      ? a.castle === 'K'
        ? 'O-O'
        : 'O-O-O'
      : `${FR[a.type]}${sq(a.fr, a.fc)}${a.capture ? '×' : '–'}${sq(a.tr, a.tc)}${a.promo ? '=' + FR[a.promo] : ''}`;
    for (const v of info.vanished) {
      text += ' ⊘';
      s.taken.void.push({ t: v.type, c: v.color });
      s.voidLost[v.color as Color]++;
    }
    s.lastMove = { from: [a.fr, a.fc], to: [a.tr, a.tc] };
  }
  s.moveCount[me]++;
  if (inCheck(s, op)) s.stats[me].checks++;
  updateHolds(s, me);
  if (has(s.cfg, 'missions') && !s.secrets[me].done && missionDone(s, me)) {
    s.secrets[me].done = true;
    const mt = s.secrets[me].mission!.text;
    if (s.cfg.reward === 'win') s.over = { winner: me, reason: `Mission secrète des ${NAMES[me]} accomplie : « ${mt} »` };
    else if (placeSquares(s, me).length) return { s, pending: { text, cls } };
  }
  return { s: finish(s, me, text, cls), pending: null };
}
export function placeQueen(s0: Core, r: number, c: number, pending: { text: string; cls: HistoryEntry['cls'] }): Core {
  const s: Core = structuredClone(s0);
  const me = s.turn;
  s.board[r][c] = { id: ++s.nextId, type: 'q', color: me, moved: true };
  return finish(s, me, `${pending.text} · mission ! D@${sq(r, c)}`, 'queen');
}
function finish(s: Core, me: Color, text: string, cls: HistoryEntry['cls']): Core {
  const op = other(me),
    chk = inCheck(s, op);
  s.turn = op;
  if (!s.over) {
    const acts = allActions(s, op);
    const stuck = !acts.moves.length && !acts.flips.length && !acts.swaps.length;
    const trap = has(s.cfg, 'vanish') && s.cfg.walled;
    if (trap && walled(s, op)) s.over = { winner: me, reason: `Roi des ${NAMES[op]} emmuré : toutes les cases autour de lui se sont effondrées` };
    else if (trap && walled(s, me)) s.over = { winner: op, reason: `Les ${NAMES[me]} ont emmuré leur propre roi` };
    else if (stuck && chk) s.over = { winner: me, reason: 'Échec et mat' };
    else if (stuck && trap) s.over = { winner: me, reason: `Roi des ${NAMES[op]} enfermé : plus aucun coup possible` };
    else if (stuck) s.over = { winner: null, reason: `Pat : les ${NAMES[op]} n’ont plus aucun coup` };
    else if (onlyKings(s)) s.over = { winner: null, reason: 'Il ne reste que les rois' };
    else if (s.quiet >= 150) s.over = { winner: null, reason: 'Règle des 75 coups : aucune prise ni coup de pion depuis 75 coups' };
  }
  text += s.over && s.over.reason === 'Échec et mat' ? '#' : chk ? '+' : '';
  s.history.push({ c: me, t: text, cls });
  return s;
}

export function secretView(s: Core, c: Color): SecretView {
  const sec = s.secrets[c];
  return {
    constraints: sec.constraints.map((k) => k.text),
    mission: sec.mission?.text ?? null,
    progress: missionProgress(s, c),
    done: sec.done,
    traitors: sec.traitors.map((id) => {
      const pos = findPiece(s, id);
      const used = sec.used.includes(id);
      if (!pos) return { id, label: used ? 'traître retourné, puis tombé' : 'traître éliminé avant d’avoir servi', used, alive: false };
      const p = s.board[pos[0]][pos[1]];
      return { id, label: `${PNAME[p.type as PieceType]} en ${sq(pos[0], pos[1])}`, used, alive: true };
    }),
  };
}

/** Cases visées géométriquement, sans tenir compte des pièces (prémoves). */
export function premoveTargets(v: { board: any; holes: any }, r: number, c: number): Sq[] {
  const p = v.board[r]?.[c];
  const out: Sq[] = [];
  if (!p) return out;
  const add = (tr: number, tc: number) => {
    if (open(v, tr, tc)) out.push([tr, tc]);
  };
  if (p.type === 'p') {
    const d = p.color === 'w' ? -1 : 1;
    add(r + d, c);
    if (r === (p.color === 'w' ? 6 : 1) && open(v, r + d, c)) add(r + 2 * d, c);
    add(r + d, c - 1);
    add(r + d, c + 1);
  } else if (p.type === 'n') KN.forEach(([a, b]) => add(r + a, c + b));
  else if (p.type === 'k') {
    KG.forEach(([a, b]) => add(r + a, c + b));
    if (!p.moved && c === 4) {
      add(r, 6);
      add(r, 2);
    }
  } else {
    const dirs = p.type === 'r' ? ORTH : p.type === 'b' ? DIAG : [...ORTH, ...DIAG];
    for (const [dr, dc] of dirs) {
      let tr = r + dr,
        tc = c + dc;
      while (open(v, tr, tc)) {
        out.push([tr, tc]);
        tr += dr;
        tc += dc;
      }
    }
  }
  return out;
}
