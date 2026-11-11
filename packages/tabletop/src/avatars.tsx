'use client';

import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from 'react';
import { createAvatar } from '@dicebear/core';
import * as avataaars from '@dicebear/avataaars';
import * as toonHead from '@dicebear/toon-head';
import { GAME_ICONS, type GameIconName } from './icons.generated';

/**
 * Personnages illustrés : chaque joueur a un visage à lui, habillé selon l'univers du jeu
 * (pirate, explorateur polaire, suspect, invité masqué…). Le visage dépend du pseudo et du
 * « skin » choisi par le joueur : un autre skin, c'est une autre tête, un autre costume.
 *
 * Illustrations : Avataaars (Pablo Stanley, libre d'usage) et Toon Head (Johan Melin, CC BY 4.0),
 * via DiceBear (MIT).
 */

export type AvatarLook = 'pirate' | 'polar' | 'suspect' | 'detective' | 'masked' | 'alchemist' | 'council' | 'tavern' | 'crew' | 'explorer';

const SKIN = ['ffdbb4', 'edb98a', 'd08b5b', 'ae5d29', '614335'];
const HAIR = ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'd6b370', 'c93305', 'e8e1e1'];
const CALM = {
  mouth: ['serious', 'smile', 'twinkle', 'default'],
  eyes: ['default', 'squint', 'side', 'happy', 'wink'],
  eyebrows: ['defaultNatural', 'flatNatural', 'raisedExcitedNatural', 'upDownNatural', 'angryNatural', 'frownNatural'],
};
const SHORT_HAIR = ['shortFlat', 'shortRound', 'theCaesar', 'sides', 'shortWaved', 'shavedSides', 'theCaesarAndSidePart', 'shortCurly'];
const LONG_HAIR = ['shaggy', 'dreads01', 'dreads02', 'frizzle', 'longButNotTooLong', 'shaggyMullet', 'curly', 'straight01', 'bob', 'bun'];

/** Petit hachage stable (FNV-1a) pour tirer des variantes à partir d'une graine. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

interface Overlay {
  icon: GameIconName;
  /** Dégradé du haut vers le bas. */
  colors: [string, string];
  /** Position et taille, en % de l'avatar. */
  box: { left: number; top: number; width: number };
}

interface LookDef {
  build: (seed: string, h: number) => { style: 'avataaars' | 'toon'; options: Record<string, unknown> };
  overlay?: (h: number) => Overlay | null;
}

const PIRATE_HATS: [string, string][] = [
  ['#3a2414', '#120a04'],
  ['#5a1410', '#220604'],
  ['#1d2a3a', '#0a1018'],
];
const MASKS: [string, string][] = [
  ['#ffe9a8', '#9a6414'],
  ['#f4f6fa', '#8a93a3'],
  ['#ff8a7a', '#7a120c'],
  ['#3a3a44', '#0a0a0e'],
];
const WIZARD_HATS: [string, string][] = [
  ['#7a4fd1', '#2a1550'],
  ['#2f8f5a', '#0e3a22'],
  ['#2a5a9a', '#0e2244'],
  ['#8a2a2a', '#3a0a0a'],
];

const LOOKS: Record<AvatarLook, LookDef> = {
  pirate: {
    build: (seed, h) => ({
      style: 'avataaars',
      options: {
        seed,
        ...CALM,
        skinColor: [SKIN[(h >>> 4) % SKIN.length]!],
        hairColor: HAIR,
        facialHairColor: HAIR,
        top: h % 5 < 3 ? SHORT_HAIR : LONG_HAIR,
        accessories: ['eyepatch'],
        accessoriesProbability: 45,
        facialHair: ['beardMajestic', 'beardMedium', 'moustacheMagnum', 'beardLight', 'moustacheFancy'],
        facialHairProbability: 75,
        clothing: ['overall', 'shirtVNeck', 'collarAndSweater', 'shirtScoopNeck'],
        clothesColor: ['8e1b14', '262e33', '3c4f5c', '5a3a1a', 'e6e6e6', '25557c'],
      },
    }),
    overlay: (h) => (h % 5 < 3 ? { icon: 'pirate-hat', colors: PIRATE_HATS[h % PIRATE_HATS.length]!, box: { left: 17, top: -16, width: 66 } } : null),
  },
  polar: {
    build: (seed, h) => ({
      style: 'avataaars',
      options: {
        seed,
        ...CALM,
        skinColor: [SKIN[(h >>> 4) % SKIN.length]!],
        hairColor: HAIR,
        facialHairColor: HAIR,
        facialHairProbability: 25,
        top: ['winterHat1', 'winterHat02', 'winterHat03', 'winterHat04'],
        hatColor: ['e2452f', 'ff8c1a', '1f5f99', '2f9f6a', 'f4f6fa', '262e33', 'ffdeb5'],
        clothing: ['hoodie', 'collarAndSweater', 'blazerAndSweater'],
        clothesColor: ['e2452f', 'ff8c1a', '1f5f99', '2f9f6a', 'f4f6fa', '65c9ff', '262e33'],
        accessoriesProbability: 15,
        accessories: ['wayfarers', 'sunglasses'],
      },
    }),
  },
  suspect: {
    build: (seed, h) => ({
      style: 'avataaars',
      options: {
        seed,
        ...CALM,
        mouth: ['serious', 'concerned', 'disbelief', 'default', 'smile'],
        skinColor: [SKIN[(h >>> 4) % SKIN.length]!],
        hairColor: HAIR,
        facialHairColor: HAIR,
        top: [...SHORT_HAIR, ...LONG_HAIR, 'bigHair', 'fro', 'froBand', 'miaWallace', 'curvy'],
        accessoriesProbability: 30,
        accessories: ['prescription01', 'prescription02', 'round', 'kurt', 'wayfarers'],
        facialHairProbability: 30,
        facialHair: ['beardLight', 'beardMedium', 'moustacheFancy', 'moustacheMagnum'],
      },
    }),
  },
  detective: {
    build: (seed, h) => ({
      style: 'avataaars',
      options: {
        seed,
        ...CALM,
        mouth: ['serious', 'default', 'smile'],
        skinColor: [SKIN[(h >>> 4) % SKIN.length]!],
        hairColor: HAIR,
        facialHairColor: HAIR,
        top: ['hat'],
        hatColor: ['262e33', '3c4f5c', '5a3a1a'],
        clothing: ['blazerAndShirt', 'blazerAndSweater'],
        clothesColor: ['262e33', '3c4f5c', '5a3a1a', '929598'],
        facialHairProbability: 60,
        facialHair: ['moustacheMagnum', 'moustacheFancy', 'beardLight'],
      },
    }),
  },
  masked: {
    build: (seed, h) => ({
      style: 'avataaars',
      options: {
        seed,
        ...CALM,
        skinColor: [SKIN[(h >>> 4) % SKIN.length]!],
        hairColor: HAIR,
        facialHairColor: HAIR,
        top: [...SHORT_HAIR, ...LONG_HAIR, 'bigHair', 'miaWallace', 'curvy'],
        facialHairProbability: 25,
        clothing: ['blazerAndShirt', 'collarAndSweater', 'shirtScoopNeck', 'blazerAndSweater'],
        clothesColor: ['7a1d2a', '1f3f6b', 'd9a440', '262e33', '5b2a73', 'e6e6e6'],
      },
    }),
    overlay: (h) => ({ icon: 'domino-mask', colors: MASKS[h % MASKS.length]!, box: { left: 27, top: 23, width: 46 } }),
  },
  alchemist: {
    build: (seed, h) => ({
      style: 'avataaars',
      options: {
        seed,
        ...CALM,
        skinColor: [SKIN[(h >>> 4) % SKIN.length]!],
        hairColor: HAIR,
        facialHairColor: HAIR,
        accessoriesProbability: 50,
        accessories: ['round', 'prescription01', 'kurt'],
        facialHairProbability: 60,
        facialHair: ['beardMajestic', 'beardMedium', 'beardLight'],
        clothing: ['hoodie', 'collarAndSweater'],
        clothesColor: ['3c4f5c', '25557c', '5b2a73', '2a4a2e', '5a3a1a'],
      },
    }),
    overlay: (h) => ({ icon: 'pointy-hat', colors: WIZARD_HATS[h % WIZARD_HATS.length]!, box: { left: 16, top: -30, width: 70 } }),
  },
  council: {
    build: (seed, h) => ({
      style: 'toon',
      options: { seed, clothes: ['openJacket', 'turtleNeck', 'dress', 'shirt'], beardProbability: 40, clothesColor: ['7a1d2a', '1f3f6b', '1d5a3a', '5b2a73', '8a5a12', '151613'] },
    }),
  },
  tavern: {
    build: (seed, h) => ({
      style: 'toon',
      options: { seed, clothes: ['shirt', 'tShirt', 'openJacket', 'turtleNeck'], beardProbability: 60, clothesColor: ['5a3a1a', '8a5a12', '545454', 'b11f1f', '147f3c', 'e8e9e6'] },
    }),
  },
  crew: {
    build: (seed, h) => ({
      style: 'toon',
      options: { seed, clothes: ['turtleNeck'], beardProbability: 20, clothesColor: ['0b3286', '1f4f5f', '545454', '151613', 'e8e9e6'] },
    }),
  },
  explorer: {
    build: (seed, h) => ({ style: 'toon', options: { seed, beardProbability: 30 } }),
  },
};

const cache = new Map<string, string>();

/** Image (data URI) du personnage de `name` avec ce skin, dans l'univers `look`. */
export function avatarUri(name: string, look: AvatarLook, skin = 0): string {
  const seed = skin ? `${name}#${skin}` : name;
  const key = `${look}|${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { style, options } = LOOKS[look].build(seed, hash(seed));
  const uri = (style === 'toon' ? createAvatar(toonHead, options) : createAvatar(avataaars, options)).toDataUri();
  cache.set(key, uri);
  return uri;
}

function OverlayIcon({ overlay, id }: { overlay: Overlay; id: string }) {
  const { box, colors } = overlay;
  return (
    <svg
      viewBox="0 0 512 512"
      aria-hidden="true"
      style={{ position: 'absolute', left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, filter: 'drop-shadow(0 3px 3px rgba(0,0,0,.45))' }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colors[0]} />
          <stop offset="1" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`} stroke="rgba(255,255,255,.18)" strokeWidth="5" dangerouslySetInnerHTML={{ __html: GAME_ICONS[overlay.icon].body.replaceAll('fill="currentColor"', '') }} />
    </svg>
  );
}

/** Le skin de chaque joueur (en ligne : choisi au salon ; en local : choisi à la préparation). */
const SkinContext = createContext<Record<string, number>>({});

export function AvatarProvider({ skins, children }: { skins: Record<string, number>; children: ReactNode }) {
  return <SkinContext.Provider value={skins}>{children}</SkinContext.Provider>;
}

/** Tous les skins choisis (joueur → numéro). */
export function useSkins(): Record<string, number> {
  return useContext(SkinContext);
}

export function useSkin(playerId: string | null | undefined): number {
  const skins = useContext(SkinContext);
  return playerId ? (skins[playerId] ?? 0) : 0;
}

/** Hauteur relative du centre du visage dans l'illustration, selon le style. */
const FACE_Y: Record<'avataaars' | 'toon', number> = { avataaars: 0.45, toon: 0.44 };

/**
 * Portrait d'un joueur. `id` sert à retrouver son skin ; `name` fait son visage.
 * `round` : portrait rond, cadré sur le visage (le chapeau peut dépasser du cadre).
 */
export function Avatar({
  id,
  name,
  look,
  size,
  skin,
  round = false,
  zoom = 1.3,
  className = '',
  style,
}: {
  id?: string | null;
  name: string;
  look: AvatarLook;
  size: number;
  /** Force un skin (aperçu au salon) ; sinon celui du joueur. */
  skin?: number;
  round?: boolean;
  zoom?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const fromContext = useSkin(id);
  const s = skin ?? fromContext;
  const seed = s ? `${name}#${s}` : name;
  const uri = avatarUri(name, look, s);
  const overlay = useMemo(() => LOOKS[look].overlay?.(hash(seed)) ?? null, [look, seed]);
  const gid = `av${hash(`${look}${seed}`).toString(36)}`;
  if (!round) {
    return (
      <span className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size, ...style }}>
        <img src={uri} alt="" width={size} height={size} draggable={false} style={{ display: 'block', width: '100%', height: '100%' }} />
        {overlay && <OverlayIcon overlay={overlay} id={gid} />}
      </span>
    );
  }
  const box = size * zoom;
  const faceY = FACE_Y[LOOKS[look].build('', 0).style];
  const left = (size - box) / 2;
  const top = size / 2 - faceY * box;
  const mask = `radial-gradient(circle ${size / 2}px at 50% ${faceY * 100}%, #000 calc(100% - 1px), transparent 100%)`;
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size, ...style }}>
      <span style={{ position: 'absolute', left, top, width: box, height: box }}>
        <img src={uri} alt="" draggable={false} style={{ display: 'block', width: '100%', height: '100%', WebkitMaskImage: mask, maskImage: mask }} />
        {overlay && <OverlayIcon overlay={overlay} id={gid} />}
      </span>
    </span>
  );
}
