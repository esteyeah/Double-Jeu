import type { CSSProperties } from 'react';
import { RichIcon, type StageSkin } from '@arcade/tabletop';
import { COURT_CSS } from './theme';

/** Habillage des écrans communs de La Cité : carton d'invitation doré, damas et masques. */
export const skin: StageSkin = {
  css: { href: 'arcade-court-v1', text: COURT_CSS },
  backdrop: '#1a0608',
  scenery: (
    <div className="ct" style={{ position: 'fixed', inset: 0, minHeight: 0 }} aria-hidden="true">
      <div className="ct-wall" />
      <div className="ct-light" />
    </div>
  ),
  vars: {
    '--color-fg': '#f3e6cc',
    '--color-muted': '#c9ab8c',
    '--color-accent': '#f2d37a',
    '--color-bg': '#1a0306',
    '--color-surface': '#2a070c',
    '--color-surface-2': '#3a0b12',
    '--color-line': 'rgba(242,211,122,.3)',
    '--color-sabo': '#ff7a6a',
    '--color-key': '#f2d37a',
  } as CSSProperties,
  cls: {
    panel: 'ct-ui-panel',
    kicker: 'ct-ui-kicker',
    title: 'ct-ui-title',
    text: 'ct-ui-text',
    primary: 'ct-btn',
    secondary: 'ct-btn2',
    hud: 'ct-hud',
    drawer: 'ct-ui-drawer',
    drawerTitle: "text-xl text-[#f2d37a] [font-family:'Cinzel',serif] font-bold",
    pill: 'ct-ui-pill',
    toast: 'ct-ui-pill',
  },
  icons: {
    win: <RichIcon name="laurel-crown" metal="gold" size={82} />,
    lose: <RichIcon name="drama-masks" metal="bone" size={78} />,
    handoff: <RichIcon name="carnival-mask" metal="gold" size={64} />,
  },
  words: {
    handoffKicker: 'Sous le masque',
    handoffLead: 'Passe le téléphone à',
    handoffWarning: 'Que les autres invités détournent le regard.',
    win: 'Vous régnez sur la Cité !',
    lose: 'Démasqué…',
  },
};
