'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * Table ronde : les joueurs sont assis autour d'un centre (trésor, pot, cœur…), comme autour d'un vrai plateau.
 * Le joueur de cet écran est en bas ; les autres suivent dans le sens des aiguilles d'une montre.
 * Des flèches (visées, votes, accusations…) peuvent relier les places.
 */

export interface TableLink {
  id: string;
  from: string;
  to: string;
  color: string;
  width?: number;
  /** Motif de pointillés SVG (« 6 6 »). */
  dash?: string;
  opacity?: number;
  /** Petit halo autour du trait. */
  glow?: boolean;
  /** Trait animé (pointillés qui défilent vers la cible). */
  flow?: boolean;
  /** Sans pointe de flèche (une corde, un lien). */
  head?: boolean;
  /** Courbure (1 par défaut, 0 : ligne droite). */
  curve?: number;
}

export interface SeatGeometry {
  x: number;
  y: number;
  /** Angle en radians (π/2 : en bas). */
  angle: number;
  /** Côté de la table, pour orienter une bulle ou une étiquette. */
  side: 'top' | 'bottom' | 'left' | 'right';
}

export function RoundTable({
  ids,
  me,
  renderSeat,
  center,
  links = [],
  seat,
  className = '',
  style,
  under,
}: {
  /** Places dans l'ordre du jeu. */
  ids: string[];
  /** Joueur de cet écran : placé en bas. */
  me?: string | null;
  renderSeat: (id: string, geo: SeatGeometry) => ReactNode;
  /** Contenu du centre, posé dans le plus grand rectangle libre. */
  center?: ReactNode;
  links?: TableLink[];
  /** Encombrement d'une place (px), pour la garder dans le cadre. */
  seat: { w: number; h: number };
  /** Donne la taille (ex. `aspect-[0.95] sm:aspect-[1.5]`). */
  className?: string;
  style?: CSSProperties;
  /** Décor sous tout le reste (tapis, plateau, cercle…), plein cadre. */
  under?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 360, h: 360 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = ids.length;
  const start = me && ids.includes(me) ? ids.indexOf(me) : 0;
  const ordered = ids.map((_, i) => ids[(start + i) % n]!);
  const cx = size.w / 2;
  const cy = size.h / 2;
  const rx = Math.max(10, size.w / 2 - seat.w / 2 - 2);
  const ry = Math.max(10, size.h / 2 - seat.h / 2 - 2);
  const geo = new Map<string, SeatGeometry>();
  ordered.forEach((id, i) => {
    const angle = Math.PI / 2 + (2 * Math.PI * i) / n;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const side = Math.abs(s) >= Math.abs(c) * 0.9 ? (s > 0 ? 'bottom' : 'top') : c > 0 ? 'right' : 'left';
    geo.set(id, { x, y, angle, side });
  });
  const { w: innerW, h: innerH } = freeCenter([...geo.values()], cx, cy, seat, rx);
  const seatR = Math.min(seat.w, seat.h) * 0.42;

  return (
    <div ref={ref} className={`relative w-full ${className}`} style={style}>
      {under}
      {center && (
        <div className="absolute z-[1] flex items-center justify-center" style={{ left: cx - innerW / 2, top: cy - innerH / 2, width: innerW, height: innerH }}>
          <FitBox w={innerW} h={innerH}>
            {center}
          </FitBox>
        </div>
      )}
      {links.length > 0 && (
        <svg className="pointer-events-none absolute inset-0 z-[2] overflow-visible" width={size.w} height={size.h} aria-hidden="true">
          {links.map((l) => {
            const a = geo.get(l.from);
            const b = geo.get(l.to);
            if (!a || !b) return null;
            return <Arrow key={l.id} a={a} b={b} r={seatR} link={l} />;
          })}
        </svg>
      )}
      {ordered.map((id) => {
        const g = geo.get(id)!;
        return (
          <div key={id} className="absolute z-[3] -translate-x-1/2 -translate-y-1/2" style={{ left: g.x, top: g.y }}>
            {renderSeat(id, g)}
          </div>
        );
      })}
    </div>
  );
}

/** Plus grand rectangle centré qui ne touche aucune place (on essaie plusieurs largeurs). */
function freeCenter(seats: SeatGeometry[], cx: number, cy: number, seat: { w: number; h: number }, rx: number) {
  const margin = 6;
  let best = { w: 0, h: 0 };
  for (let k = 1; k <= 24; k++) {
    const half = (rx * k) / 24;
    let halfH = Infinity;
    for (const g of seats) {
      const dx = Math.abs(g.x - cx) - seat.w / 2 - margin;
      if (dx >= half) continue;
      halfH = Math.min(halfH, Math.abs(g.y - cy) - seat.h / 2 - margin);
    }
    if (halfH <= 0) break;
    if (!Number.isFinite(halfH)) halfH = cy - margin;
    // Préférer un peu la largeur : les plateaux s'étalent mieux en largeur.
    if (half * 2 * Math.min(halfH * 2, half * 1.4) > best.w * Math.min(best.h, best.w * 0.7)) best = { w: half * 2, h: halfH * 2 };
  }
  return best;
}

/** Réduit le contenu du centre s'il est plus haut que la place disponible. */
function FitBox({ w, h, children }: { w: number; h: number; children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const measure = () => setScale(Math.min(1, h / Math.max(1, el.offsetHeight)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [h]);
  return (
    <div style={{ width: w, transform: `scale(${scale})`, transformOrigin: 'center', flex: 'none' }}>
      <div ref={inner} className="flex w-full justify-center">
        {children}
      </div>
    </div>
  );
}

function Arrow({ a, b, r, link }: { a: SeatGeometry; b: SeatGeometry; r: number; link: TableLink }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Courbe légère : A→B et B→A passent de part et d'autre.
  const bend = Math.min(60, len * 0.16) * (link.curve ?? 1);
  const mx = (a.x + b.x) / 2 - uy * bend;
  const my = (a.y + b.y) / 2 + ux * bend;
  // Départ et arrivée au bord des médaillons.
  const sx0 = mx - a.x;
  const sy0 = my - a.y;
  const sl = Math.hypot(sx0, sy0) || 1;
  const p0x = a.x + (sx0 / sl) * r;
  const p0y = a.y + (sy0 / sl) * r;
  const ex0 = mx - b.x;
  const ey0 = my - b.y;
  const el = Math.hypot(ex0, ey0) || 1;
  const p2x = b.x + (ex0 / el) * (r + 4);
  const p2y = b.y + (ey0 / el) * (r + 4);
  // Pointe de flèche orientée selon la tangente d'arrivée.
  const tx = p2x - mx;
  const ty = p2y - my;
  const tl = Math.hypot(tx, ty) || 1;
  const hx = tx / tl;
  const hy = ty / tl;
  const w = link.width ?? 3;
  const head = link.head === false ? 0 : 5 + w * 2.2;
  const base = { x: p2x - hx * head, y: p2y - hy * head };
  const tip = `${p2x + hx * 2},${p2y + hy * 2} ${base.x - hy * head * 0.55},${base.y + hx * head * 0.55} ${base.x + hy * head * 0.55},${base.y - hx * head * 0.55}`;
  const d = `M${p0x},${p0y} Q${mx},${my} ${base.x},${base.y}`;
  return (
    <g opacity={link.opacity ?? 1} style={link.glow ? { filter: `drop-shadow(0 0 5px ${link.color})` } : undefined}>
      <path d={d} fill="none" stroke="rgba(0,0,0,.55)" strokeWidth={w + 3} strokeLinecap="round" strokeDasharray={link.dash} />
      <path
        d={d}
        fill="none"
        stroke={link.color}
        strokeWidth={w}
        strokeLinecap="round"
        strokeDasharray={link.flow ? '8 8' : link.dash}
        style={link.flow ? { animation: 'tt-flow .9s linear infinite' } : undefined}
      />
      {link.head !== false && <polygon points={tip} fill={link.color} stroke="rgba(0,0,0,.6)" strokeWidth="1" />}
      {link.flow && (
        <style href="tabletop-flow" precedence="default">
          {'@keyframes tt-flow{to{stroke-dashoffset:-16}}'}
        </style>
      )}
    </g>
  );
}

/**
 * Annonce de cinéma (« Manche 2 — Chargez vos pistolets ») au début de chaque étape.
 * Elle ne bloque rien : on peut jouer pendant qu'elle s'efface.
 */
export function Cinematic({
  trigger,
  children,
  duration = 1700,
  onMount = true,
}: {
  /** Une nouvelle valeur relance l'annonce. */
  trigger: string;
  children: ReactNode;
  duration?: number;
  /** Afficher aussi l'annonce à l'apparition du plateau. */
  onMount?: boolean;
}) {
  const [shown, setShown] = useState<{ key: string; node: ReactNode } | null>(onMount ? { key: trigger, node: children } : null);
  const last = useRef(trigger);
  useEffect(() => {
    if (last.current === trigger) return;
    last.current = trigger;
    setShown({ key: trigger, node: children });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(null), duration);
    return () => clearTimeout(t);
  }, [shown, duration]);
  if (!shown) return null;
  return (
    <div key={shown.key} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[44] grid place-items-center px-4">
      {shown.node}
    </div>
  );
}
