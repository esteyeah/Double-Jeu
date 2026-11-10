import type { CSSProperties } from 'react';
import { RichIcon, type StageSkin } from '@arcade/tabletop';
import { COMPASS_CSS } from './theme';

/** Habillage des écrans communs de Boussole : parchemin et chêne ciré. */
export const skin: StageSkin = {
  css: { href: 'arcade-compass-v1', text: COMPASS_CSS },
  backdrop: '#3a2410',
  scenery: (
    <div className="bs" style={{ position: 'fixed', inset: 0, minHeight: 0 }} aria-hidden="true">
      <div className="bs-desk" />
      <div className="bs-light" />
    </div>
  ),
  vars: {
    '--color-fg': '#2a1d0e',
    '--color-muted': '#6b5432',
    '--color-accent': '#1f5f7a',
    '--color-bg': '#fbf3df',
    '--color-surface': '#f6ecd4',
    '--color-surface-2': '#fbf4e2',
    '--color-line': '#b8995e',
    '--color-key': '#8e3a14',
  } as CSSProperties,
  cls: {
    panel: 'bs-ui-panel',
    kicker: 'bs-ui-kicker',
    title: 'bs-ui-title',
    text: 'bs-ui-text',
    primary: 'bs-btn',
    secondary: 'bs-btn2',
    hud: 'bs-hud',
    drawer: 'bs-ui-drawer',
    drawerTitle: "text-2xl text-[#2a1d0e] [font-family:'IM_Fell_English',Georgia,serif]",
    pill: 'bs-ui-pill',
    toast: 'bs-ui-pill',
  },
  icons: {
    win: <RichIcon name="compass" metal="gold" size={80} />,
    lose: <RichIcon name="compass" metal="iron" size={76} />,
    handoff: <RichIcon name="treasure-map" metal="bone" size={62} />,
  },
  words: {
    handoffKicker: 'Carte secrète',
    handoffLead: 'Passe le téléphone à',
    handoffWarning: 'Les autres ne regardent pas la carte.',
    win: 'Belle traversée !',
    lose: 'Cap perdu…',
  },
};
