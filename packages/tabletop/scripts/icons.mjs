#!/usr/bin/env node
/**
 * Copie dans src/icons.generated.ts les icônes game-icons.net utilisées par les jeux
 * (et seulement elles : la collection complète pèse plusieurs mégaoctets).
 * Licence des icônes : CC BY 3.0 — Lorc, Delapouite et contributeurs (https://game-icons.net).
 *
 *   pnpm --filter @arcade/tabletop icons
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const set = JSON.parse(readFileSync(require.resolve('@iconify-json/game-icons/icons.json'), 'utf8'));

const WANTED = [
  // Le Trône Vide
  'stone-throne', 'throne-king', 'crown', 'imperial-crown', 'queen-crown', 'crowned-skull', 'wax-seal', 'scroll-unfurled', 'tied-scroll',
  'quill-ink', 'candle-holder', 'candles', 'candle-light', 'all-seeing-eye', 'evil-eyes', 'snake', 'snake-spiral', 'fleur-de-lys',
  'vote', 'guillotine', 'executioner-hood', 'hooded-assassin', 'cloak-dagger', 'crystal-ball', 'magnifying-glass', 'knight-banner',
  'tattered-banner', 'torch', 'castle', 'rose', 'dagger-rose', 'banging-gavel', 'chess-king', 'chess-queen', 'broken-shield',
  'heraldic-sun', 'thumb-up', 'thumb-down', 'check-mark', 'cancel', 'scales', 'laurel-crown', 'laurels-trophy', 'tombstone',
  // La Cité
  'carnival-mask', 'domino-mask', 'drama-masks', 'duality-mask', 'iron-mask', 'bird-mask', 'curly-mask', 'assassin-pocket', 'coins',
  'money-stack', 'pay-money', 'receive-money', 'take-my-money', 'jester-hat', 'spy', 'stiletto', 'plain-dagger', 'feather', 'duel',
  'secret-door', 'love-letter', 'envelope', 'lips', 'silence', 'shield',
  // Expédition
  'snowflake-1', 'snowflake-2', 'snowing', 'igloo', 'penguin', 'mountains', 'mountaintop', 'mountain-climbing', 'flying-flag',
  'flag-objective', 'camping-tent', 'frozen-block', 'campfire', 'backpack', 'iceberg', 'icebergs', 'wolf-howl', 'lantern',
  'sitting-dog', 'footsteps', 'winter-gloves', 'rope-bridge', 'ship-wreck', 'sinking-ship',
  // Le Chaudron
  'cauldron', 'bubbling-flask', 'round-bottom-flask', 'fizzing-flask', 'potion-ball', 'standing-potion', 'round-potion',
  'poison-bottle', 'magic-potion', 'health-potion', 'vial', 'mushrooms', 'spotted-mushroom', 'herbs-bundle', 'crystal-cluster',
  'pestle-mortar', 'spell-book', 'frog', 'spider-web', 'candle-skull', 'bat', 'bubbles', 'poison-cloud', 'witch-face', 'plant-roots',
  // Gobelets
  'dice-six-faces-one', 'dice-six-faces-two', 'dice-six-faces-three', 'dice-six-faces-four', 'dice-six-faces-five',
  'dice-six-faces-six', 'rolling-dice-cup', 'beer-stein', 'tavern-sign', 'hand',
  // Garde à vue
  'police-officer-head', 'handcuffs', 'cigarette', 'smoking-pipe', 'open-folder', 'full-folder', 'files', 'rotary-phone',
  'desk-lamp', 'revolver', 'coffee-cup', 'stopwatch', 'hourglass', 'notebook', 'fountain-pen', 'finger-print', 'mug-shot',
  'talk', 'idea', 'post-stamp',
  // Boussole
  'pointy-hat', 'top-hat', 'western-hat', 'winter-hat', 'compass', 'clover', 'linked-rings', 'knot', 'puzzle', 'globe', 'telescope', 'sextant', 'scroll-quill', 'paper-boat',
  // Butin
  'pirate-captain', 'pirate-skull', 'pirate-hook', 'pirate-hat', 'eyepatch', 'parrot-head', 'pirate-coat', 'pirate-flag',
  'pirate-grave', 'pistol-gun', 'crossed-pistols', 'bullets', 'heavy-bullets', 'bullet-impacts', 'smoke-bomb',
  'two-coins', 'coins-pile', 'crown-coin', 'oyster-pearl', 'pearl-necklace', 'treasure-map', 'open-treasure-chest',
  'locked-chest', 'brandy-bottle', 'powder-bag', 'crossed-sabres', 'floor-hatch', 'anchor', 'ship-wheel',
  'lantern-flame', 'old-lantern', 'compass', 'spyglass', 'kraken-tentacle', 'shark-fin', 'rope-coil', 'skull-crossed-bones',
  'bandage-roll', 'blood', 'water-splash', 'wave-crest', 'crosshair', 'gunshot', 'click', 'bright-explosion',
  'blunderbuss', 'bandana', 'mustache', 'figurehead', 'hearts',
  // Réacteur
  'reactor', 'radioactive', 'atom-core', 'nuclear', 'hazard-sign', 'power-lightning', 'lever', 'valve', 'gears',
  'spanner', 'circuitry', 'electric', 'key-card', 'astronaut-helmet', 'robot-helmet', 'cyborg-face', 'gas-mask',
  'siren', 'ringing-alarm', 'laser-warning', 'mushroom-cloud', 'airtight-hatch', 'cpu', 'processor', 'plug',
  'battery-100', 'battery-0', 'spy', 'hooded-figure', 'lightning-helix', 'explosion-rays', 'speedometer', 'pipes',
  'test-tubes', 'biohazard', 'power-button', 'police-badge', 'skeleton-key',
];

const UNIQUE = [...new Set(WANTED)];
const missing = UNIQUE.filter((n) => !set.icons[n]);
if (missing.length) throw new Error(`Icônes introuvables : ${missing.join(', ')}`);

const lines = UNIQUE.map((name) => {
  const icon = set.icons[name];
  const w = icon.width ?? set.width ?? 512;
  const h = icon.height ?? set.height ?? 512;
  return `  ${JSON.stringify(name)}: { w: ${w}, h: ${h}, body: ${JSON.stringify(icon.body)} },`;
});

writeFileSync(
  new URL('../src/icons.generated.ts', import.meta.url),
  `// Fichier généré par scripts/icons.mjs — ne pas modifier à la main.
// Icônes : game-icons.net (Lorc, Delapouite et contributeurs), licence CC BY 3.0.
export const GAME_ICONS = {
${lines.join('\n')}
} as const;

export type GameIconName = keyof typeof GAME_ICONS;
`,
);
console.log(`${UNIQUE.length} icônes écrites.`);
