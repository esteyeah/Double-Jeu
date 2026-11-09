'use client';

import { useId } from 'react';
import type { LootItem } from '../shared';

/** Petit hachage stable : chaque pirate garde le même visage d'une partie à l'autre. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  // Brassage final : des noms presque identiques (local_0, local_1…) donnent des visages bien différents.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#d7a27a'];
const HAIR = ['#2b1b0e', '#6b3e1d', '#b5651d', '#d9c08a', '#8a8a8a', '#a33b1e', '#111111'];
const SCARF = ['#b3261e', '#1e5aa8', '#2f7d32', '#7b1fa2', '#d28b16', '#263238', '#c2185b'];
const SEA = ['#1d5a73', '#16485c', '#24687a', '#1b4f66', '#2a6f86'];

/** Portrait de pirate dessiné à partir de son nom : bandana ou tricorne, barbe, bandeau, boucle d'oreille… */
export function Avatar({
  seed,
  size = 56,
  captain = false,
  hurt = 0,
  sunk = false,
}: {
  seed: string;
  size?: number;
  captain?: boolean;
  hurt?: number;
  sunk?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const h = hash(seed);
  const skin = SKIN[h % SKIN.length]!;
  const hair = HAIR[(h >>> 3) % HAIR.length]!;
  const scarf = SCARF[(h >>> 6) % SCARF.length]!;
  const bg = SEA[(h >>> 9) % SEA.length]!;
  const patch = (h >>> 12) % 3 === 0;
  const beard = (h >>> 14) % 3 !== 0;
  const earring = (h >>> 16) % 2 === 0;
  const scar = (h >>> 17) % 4 === 0;
  const stripes = (h >>> 19) % 2 === 0;
  const hat = captain ? 'bicorne' : (['bandana', 'tricorne', 'bandana', 'hair'] as const)[(h >>> 21) % 4];
  const shade = 'rgba(0,0,0,0.18)';

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={sunk ? 'pl-sunk' : undefined} aria-hidden>
      <defs>
        <clipPath id={`c${id}`}>
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="31" fill={bg} stroke="#e8b64c" strokeWidth="2" />
      <g clipPath={`url(#c${id})`}>
        <path d="M6 66 Q10 47 32 46 Q54 47 58 66 Z" fill={stripes ? '#f3efe2' : scarf} />
        {stripes &&
          [52, 57, 62].map((y) => <path key={y} d={`M6 ${y} H58`} stroke="#1e3a5f" strokeWidth="2.5" />)}
        <rect x="27" y="39" width="10" height="9" fill={skin} />
        <ellipse cx="19" cy="31" rx="3" ry="4" fill={skin} />
        <ellipse cx="45" cy="31" rx="3" ry="4" fill={skin} />
        <ellipse cx="32" cy="30" rx="13" ry="15" fill={skin} />
        <path d="M19 30 Q32 47 45 30 Q44 42 32 45 Q20 42 19 30 Z" fill={shade} />
        {earring && <circle cx="18.5" cy="36" r="2.2" fill="none" stroke="#e8b64c" strokeWidth="1.4" />}
        {beard && <path d="M19 31 Q20 49 32 49 Q44 49 45 31 Q40 41 32 41 Q24 41 19 31 Z" fill={hair} />}
        <path d="M24.5 37.5 Q32 33 39.5 37.5 Q32 36.2 24.5 37.5 Z" fill={hair} />
        <path d="M23 24.5 L29 25.5 M35 25.5 L41 24.5" stroke={hair} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="27" cy="28.5" r="1.9" fill="#1b1b1b" />
        {patch ? (
          <>
            <path d="M18 21 L46 31" stroke="#111" strokeWidth="1.4" />
            <ellipse cx="37" cy="28.5" rx="4.2" ry="3.6" fill="#111" />
          </>
        ) : (
          <circle cx="37" cy="28.5" r="1.9" fill="#1b1b1b" />
        )}
        <path d="M32 29 Q29.5 34 33 34.5" fill="none" stroke={shade} strokeWidth="1.6" strokeLinecap="round" />
        {scar && <path d="M23 21 L27.5 32" stroke="#a8473a" strokeWidth="1.2" />}
        {hat === 'hair' && <path d="M19 27 Q19 12 32 12 Q45 12 45 27 Q41 18 32 18.5 Q23 18 19 27 Z" fill={hair} />}
        {hat === 'bandana' && (
          <>
            <path d="M18.5 25 Q32 6 45.5 25 Q32 19.5 18.5 25 Z" fill={scarf} />
            <path d="M44 22 L54 25 L48 31 Z" fill={scarf} />
            {[24, 31, 38].map((x) => (
              <circle key={x} cx={x} cy={17 + Math.abs(x - 31) / 4} r="1.1" fill="#fff" opacity="0.8" />
            ))}
          </>
        )}
        {hat === 'tricorne' && (
          <path d="M9 23 Q32 0 55 23 Q44 18.5 32 20 Q20 18.5 9 23 Z" fill="#2a1c12" stroke="#d9b04c" strokeWidth="1.5" />
        )}
        {hat === 'bicorne' && (
          <>
            <path d="M4 25 Q32 -4 60 25 Q32 16 4 25 Z" fill="#141418" stroke="#e8b64c" strokeWidth="2" />
            <circle cx="32" cy="13" r="3.4" fill="#f1e6c8" />
            <path d="M30.6 12.6 h0.1 M33.4 12.6 h0.1" stroke="#141418" strokeWidth="1.6" strokeLinecap="round" />
          </>
        )}
        {hurt > 0 && (
          <>
            <path d="M19 22.5 L45 26" stroke="#f3efe2" strokeWidth="4" strokeLinecap="round" />
            <circle cx="39" cy="25" r="1.6" fill="#b3261e" />
            {hurt > 1 && <path d="M38 36 l6 3 M44 36 l-6 3" stroke="#f3efe2" strokeWidth="2.4" strokeLinecap="round" />}
          </>
        )}
      </g>
      {sunk && (
        <g>
          <circle cx="32" cy="32" r="31" fill="rgba(6,19,27,0.55)" />
          <Skull x={20} y={18} size={24} />
        </g>
      )}
    </svg>
  );
}

/** Le butin, dessiné. */
export function LootIcon({ item, size = 48 }: { item: Pick<LootItem, 'kind' | 'value'>; size?: number }) {
  const id = useId().replace(/:/g, '');
  switch (item.kind) {
    case 'coin': {
      const r = item.value === 20 ? 28 : item.value === 10 ? 25 : 22;
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
          <defs>
            <radialGradient id={`g${id}`} cx="38%" cy="32%" r="75%">
              <stop offset="0" stopColor="#fff6c2" />
              <stop offset="0.45" stopColor="#f2c94c" />
              <stop offset="1" stopColor="#a06c10" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="32" r={r} fill={`url(#g${id})`} stroke="#6f4a08" strokeWidth="3" />
          <circle cx="32" cy="32" r={r - 6} fill="none" stroke="#b8862f" strokeWidth="1.6" strokeDasharray="2.5 2.5" />
          <text x="32" y="39" textAnchor="middle" fontSize="19" fontWeight="800" fill="#5c3b05" fontFamily="Georgia, serif">
            {item.value}
          </text>
        </svg>
      );
    }
    case 'pearl':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
          <defs>
            <radialGradient id={`p${id}`} cx="38%" cy="35%" r="70%">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.55" stopColor="#ece8f5" />
              <stop offset="1" stopColor="#a9a1bd" />
            </radialGradient>
          </defs>
          <path d="M6 42 Q32 66 58 42 Q32 50 6 42 Z" fill="#e9b7a3" stroke="#8f5642" strokeWidth="2" />
          {[16, 24, 32, 40, 48].map((x) => (
            <path key={x} d={`M32 56 L${x} 44`} stroke="#c98d78" strokeWidth="1.2" />
          ))}
          <circle cx="32" cy="31" r="14" fill={`url(#p${id})`} stroke="#9a92ad" strokeWidth="1" />
          <circle cx="27" cy="26" r="3.8" fill="#fff" opacity="0.95" />
        </svg>
      );
    case 'map':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
          <path
            d="M8 14 L20 9 L30 14 L42 8 L56 13 L53 26 L57 38 L52 53 L40 55 L28 50 L16 55 L9 45 L12 31 Z"
            fill="#ead6a6"
            stroke="#8b6a33"
            strokeWidth="2"
          />
          <path d="M16 18 Q22 26 18 34 M44 40 Q50 44 48 50" fill="none" stroke="#b49559" strokeWidth="1.2" />
          <path d="M14 45 C22 37 26 41 32 33 S42 25 45 21" fill="none" stroke="#8b4a2b" strokeWidth="2" strokeDasharray="3 3" />
          <path d="M41 15 l8 8 M49 15 l-8 8" stroke="#b3261e" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      );
    case 'rum':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
          <rect x="26.5" y="3" width="11" height="7" rx="2" fill="#c79a5b" stroke="#7a5a2c" />
          <path
            d="M27 9 h10 v8 q0 3 3 6 q7 6 7 14 v19 q0 4 -4 4 h-22 q-4 0 -4 -4 v-19 q0 -8 7 -14 q3 -3 3 -6 z"
            fill="#4b2a10"
            stroke="#24130a"
            strokeWidth="2"
          />
          <path d="M23 30 v22" stroke="#fff" strokeOpacity="0.22" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="20" y="35" width="24" height="15" rx="2" fill="#efdcb0" stroke="#8b6a33" />
          <text x="32" y="45.5" textAnchor="middle" fontSize="8" fontWeight="800" fill="#7a1d14" fontFamily="Georgia, serif">
            RHUM
          </text>
        </svg>
      );
    case 'powder':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
          <path d="M40 13 Q45 5 51 7" fill="none" stroke="#3b230f" strokeWidth="2" />
          <path className="pl-flicker" d="M51 3 l1.6 3.4 3.6 0.6 -2.7 2.4 0.7 3.6 -3.2 -1.8 -3.2 1.8 0.7 -3.6 -2.7 -2.4 3.6 -0.6 z" fill="#ffd54a" />
          <path d="M15 17 Q11 33 15 49 Q32 57 49 49 Q53 33 49 17 Q32 23 15 17 Z" fill="#8b5a2b" stroke="#3b230f" strokeWidth="2" />
          <ellipse cx="32" cy="17" rx="17" ry="5" fill="#6e4520" stroke="#3b230f" strokeWidth="2" />
          <path d="M13.5 27 Q32 33 50.5 27 M13.5 40 Q32 46 50.5 40" fill="none" stroke="#2b1a0e" strokeWidth="3" />
          <text x="32" y="37" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#f1dfb8" fontFamily="Georgia, serif">
            POUDRE
          </text>
        </svg>
      );
    case 'bicorne':
      return (
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
          <path d="M4 42 Q32 2 60 42 Q32 31 4 42 Z" fill="#17171c" stroke="#e8b64c" strokeWidth="2.5" />
          <path d="M10 39 Q32 30 54 39" fill="none" stroke="#e8b64c" strokeWidth="1.2" strokeDasharray="2 2" />
          <circle cx="32" cy="24" r="6" fill="#f1e6c8" />
          <path d="M29.6 23.5 h0.1 M34.4 23.5 h0.1" stroke="#17171c" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M27 31 l10 4 M37 31 l-10 4" stroke="#f1e6c8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

export function Skull({ x = 0, y = 0, size = 16, color = '#f1e6c8' }: { x?: number; y?: number; size?: number; color?: string }) {
  return (
    <svg x={x} y={y} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M12 2 C6.5 2 3 5.8 3 10.5 c0 3 1.5 5 3.5 6 V20 h11 v-3.5 c2 -1 3.5 -3 3.5 -6 C21 5.8 17.5 2 12 2 Z" fill={color} />
      <circle cx="8.6" cy="11" r="2.3" fill="#1b1b1b" />
      <circle cx="15.4" cy="11" r="2.3" fill="#1b1b1b" />
      <path d="M12 13.6 l-1.3 2.4 h2.6 Z" fill="#1b1b1b" />
      <path d="M9 20 v-2.5 M12 20 v-2.5 M15 20 v-2.5" stroke="#1b1b1b" strokeWidth="1" />
    </svg>
  );
}

export function Heart({ full, size = 16 }: { full: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M12 21 C5 15.5 2 12.3 2 8.4 C2 5.4 4.3 3 7.2 3 c2 0 3.6 1 4.8 2.7 C13.2 4 14.8 3 16.8 3 C19.7 3 22 5.4 22 8.4 c0 3.9 -3 7.1 -10 12.6 Z"
        fill={full ? '#d23a2e' : 'none'}
        stroke={full ? '#7f1810' : '#a87c7c'}
        strokeWidth="1.8"
      />
      {!full && <path d="M12 6 l-2 4 3 2 -2 5" fill="none" stroke="#a87c7c" strokeWidth="1.4" />}
    </svg>
  );
}

/** Pistolet à silex, canon vers la droite. */
export function Pistol({ size = 26, color = '#c9c9d1' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 40 20" width={size} height={size / 2} aria-hidden>
      <rect x="12" y="5" width="26" height="4.5" rx="1.2" fill={color} stroke="#3a3a40" strokeWidth="0.8" />
      <rect x="36" y="4" width="2.5" height="6.5" rx="0.8" fill="#8f8f98" />
      <path d="M2 7 h13 v4.5 l-4.5 7 h-6.5 l2.5 -7 h-4.5 Z" fill="#6b3e1d" stroke="#3b230f" strokeWidth="0.8" />
      <path d="M12.5 5 l2 -3.5 h2.6 l-1.2 3.5 Z" fill="#3a3a40" />
      <path d="M14 11.5 q2.5 4.5 6 0" fill="none" stroke="#3a3a40" strokeWidth="1.2" />
    </svg>
  );
}

/** Corne à poudre : les charges restantes. */
export function PowderHorn({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M3 6 Q14 4 20 14 L17 17 Q10 10 3 10 Z" fill="#d9c08a" stroke="#6b4a1a" strokeWidth="1.2" />
      <rect x="17" y="13.5" width="4" height="5" rx="1" transform="rotate(45 19 16)" fill="#b8862f" />
      <path d="M3 6 v4" stroke="#6b4a1a" strokeWidth="1.6" />
    </svg>
  );
}

export function Chest({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 56" width={size} height={(size * 56) / 64} aria-hidden>
      <ellipse cx="32" cy="22" rx="22" ry="5" fill="#f2c94c" />
      {[18, 26, 34, 42].map((x, i) => (
        <circle key={x} cx={x} cy={19 - (i % 2) * 2} r="3.2" fill="#ffe08a" stroke="#a06c10" strokeWidth="0.8" />
      ))}
      <path d="M7 22 Q9 4 32 4 Q55 4 57 22" fill="#7a4a24" stroke="#3b230f" strokeWidth="2" transform="rotate(-8 7 22)" />
      <rect x="6" y="22" width="52" height="28" rx="3" fill="#8b5a2b" stroke="#3b230f" strokeWidth="2" />
      <rect x="13" y="22" width="5" height="28" fill="#e8b64c" stroke="#7a520b" strokeWidth="0.8" />
      <rect x="46" y="22" width="5" height="28" fill="#e8b64c" stroke="#7a520b" strokeWidth="0.8" />
      <rect x="28" y="27" width="8" height="10" rx="1.5" fill="#e8b64c" stroke="#7a520b" />
      <circle cx="32" cy="31" r="1.3" fill="#3b230f" />
    </svg>
  );
}

/** Trappe de la cale (pour ceux qui plongent). */
export function Hatch({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <rect x="3" y="3" width="26" height="26" rx="3" fill="#5c3a20" stroke="#2a180c" strokeWidth="2" />
      {[10, 16, 22].map((y) => (
        <path key={y} d={`M4 ${y} H28`} stroke="#2a180c" strokeWidth="1.4" />
      ))}
      <circle cx="16" cy="16" r="4" fill="none" stroke="#b8862f" strokeWidth="2" />
    </svg>
  );
}

/** Sabres croisés (tenir bon). */
export function Sabers({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      {[1, -1].map((dir) => (
        <g key={dir} transform={dir === -1 ? 'scale(-1 1) translate(-32 0)' : undefined}>
          <path d="M6 4 Q20 10 26 24" fill="none" stroke="#d7dbe2" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M23 21 l6 -2 M24 22 l-2 6" stroke="#b8862f" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M26 24 l3 4" stroke="#6b3e1d" strokeWidth="3" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}

/** Éclat de tir : « PAN ! ». */
export function Burst({ text, size = 64, color = '#e2452f' }: { text: string; size?: number; color?: string }) {
  const points = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const r = i % 2 ? 18 : 30;
    return `${32 + Math.cos(a) * r},${32 + Math.sin(a) * r}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className="pl-pop" aria-hidden>
      <polygon points={points} fill="#ffd54a" stroke={color} strokeWidth="2.5" />
      <text x="32" y="38" textAnchor="middle" fontSize="14" fontWeight="900" fill={color} fontFamily="Georgia, serif">
        {text}
      </text>
    </svg>
  );
}

/** Vagues animées en bas du plateau. */
export function Waves() {
  const wave = 'M0 20 Q 25 8 50 20 T 100 20 T 150 20 T 200 20 V 40 H 0 Z';
  return (
    <div className="pointer-events-none relative -mx-3 -mb-3 h-10 overflow-hidden" aria-hidden>
      <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="pl-waves absolute bottom-0 left-0 h-full w-[200%]">
        <path d={wave} fill="#1d5a73" opacity="0.7" transform="scale(0.5 1)" />
        <path d={wave} fill="#1d5a73" opacity="0.7" transform="translate(100 0) scale(0.5 1)" />
      </svg>
      <svg viewBox="0 0 200 40" preserveAspectRatio="none" className="pl-waves-slow absolute bottom-0 left-0 h-3/4 w-[200%]">
        <path d={wave} fill="#2b7d96" opacity="0.85" transform="scale(0.5 1)" />
        <path d={wave} fill="#2b7d96" opacity="0.85" transform="translate(100 0) scale(0.5 1)" />
      </svg>
    </div>
  );
}
