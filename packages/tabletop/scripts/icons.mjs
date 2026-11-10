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

const missing = WANTED.filter((n) => !set.icons[n]);
if (missing.length) throw new Error(`Icônes introuvables : ${missing.join(', ')}`);

const lines = WANTED.map((name) => {
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
console.log(`${WANTED.length} icônes écrites.`);
