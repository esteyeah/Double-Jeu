import type { CSSProperties } from 'react';
import { RichIcon, type StageSkin } from '@arcade/tabletop';
import { CAULDRON_CSS } from './theme';

/** Habillage des écrans communs du Chaudron : page de grimoire, pierre et lueurs vertes. */
export const skin: StageSkin = {
  css: { href: 'arcade-cauldron-v1', text: CAULDRON_CSS },
  backdrop: '#070a08',
  scenery: (
    <div className="ch" style={{ position: 'fixed', inset: 0, minHeight: 0 }} aria-hidden="true">
      <div className="ch-stone" />
      <div className="ch-glow" />
    </div>
  ),
  vars: {
    '--color-fg': '#e7efd9',
    '--color-muted': '#a8b89a',
    '--color-accent': '#b6ff9e',
    '--color-bg': '#060906',
    '--color-surface': '#10160e',
    '--color-surface-2': '#172014',
    '--color-line': 'rgba(170,255,170,.25)',
    '--color-sabo': '#ff7a6a',
    '--color-key': '#ffd27a',
  } as CSSProperties,
  cls: {
    panel: 'ch-ui-panel',
    kicker: 'ch-ui-kicker',
    title: 'ch-ui-title',
    text: 'ch-ui-text',
    primary: 'ch-btn',
    secondary: 'ch-btn2',
    hud: 'ch-hud',
    drawer: 'ch-ui-drawer',
    drawerTitle: "text-xl text-[#c9ffb8] [font-family:'Uncial_Antiqua',serif]",
    pill: 'ch-ui-pill',
    toast: 'ch-ui-pill',
  },
  icons: {
    win: <RichIcon name="magic-potion" metal="gold" size={80} />,
    lose: <RichIcon name="poison-bottle" metal="ruby" size={76} />,
    handoff: <RichIcon name="spell-book" metal="gold" size={60} />,
  },
  words: {
    handoffKicker: 'Grimoire scellé',
    handoffLead: 'Passe le téléphone à',
    handoffWarning: 'Que les autres alchimistes détournent le regard.',
    win: 'Victoire !',
    lose: 'Défaite…',
  },
};
