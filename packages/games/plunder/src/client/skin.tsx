import type { CSSProperties } from 'react';
import { RichIcon, type StageSkin } from '@arcade/tabletop';
import { PLUNDER_CSS } from './theme';

/** Habillage des écrans communs de Butin : parchemin, bois du pont, laiton. */
export const skin: StageSkin = {
  css: { href: 'arcade-plunder-v2', text: PLUNDER_CSS },
  backdrop: '#120b06',
  scenery: (
    <div className="bt" style={{ position: 'fixed', inset: 0, minHeight: 0 }} aria-hidden="true">
      <div className="bt-deck" />
      <div className="bt-light" />
    </div>
  ),
  vars: {
    '--color-fg': '#f4e6c4',
    '--color-muted': '#c4ab7c',
    '--color-accent': '#f0c35c',
    '--color-bg': '#140b04',
    '--color-surface': '#24160a',
    '--color-surface-2': '#2e1d0d',
    '--color-line': 'rgba(240,195,92,.28)',
    '--color-sabo': '#ff7a6a',
    '--color-key': '#f0c35c',
  } as CSSProperties,
  cls: {
    panel: 'bt-ui-panel',
    kicker: 'bt-ui-kicker',
    title: 'bt-ui-title',
    text: 'bt-ui-text',
    primary: 'bt-btn',
    secondary: 'bt-btn2',
    hud: 'bt-hud',
    drawer: 'bt-ui-drawer',
    drawerTitle: "text-2xl text-[#f3cd6b] [font-family:'Pirata_One',Georgia,serif]",
    pill: 'bt-ui-pill',
    toast: 'bt-ui-pill',
  },
  icons: {
    win: <RichIcon name="open-treasure-chest" metal="gold" size={84} />,
    lose: <RichIcon name="pirate-grave" metal="iron" size={78} />,
    handoff: <RichIcon name="treasure-map" metal="bone" size={64} />,
  },
  words: {
    handoffKicker: 'Pli confidentiel',
    handoffLead: 'Passe le téléphone à',
    handoffWarning: 'Que les autres pirates détournent le regard !',
    win: 'Victoire, moussaillon !',
    lose: 'Coulé par le fond…',
  },
};
