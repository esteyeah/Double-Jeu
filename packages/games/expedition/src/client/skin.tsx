import type { CSSProperties } from 'react';
import { RichIcon, type StageSkin } from '@arcade/tabletop';
import { EXPEDITION_CSS } from './theme';

/** Habillage des écrans communs d'Expédition : carnet de bord, nuit polaire et aurore. */
export const skin: StageSkin = {
  css: { href: 'arcade-expedition-v1', text: EXPEDITION_CSS },
  backdrop: '#06101e',
  scenery: (
    <div className="ex" style={{ position: 'fixed', inset: 0, minHeight: 0 }} aria-hidden="true">
      <div className="ex-stars" />
      <div className="ex-aurora" />
      <div className="ex-snow far" />
      <div className="ex-snow" />
    </div>
  ),
  vars: {
    '--color-fg': '#eef6ff',
    '--color-muted': '#9fb8cc',
    '--color-accent': '#bfe3ff',
    '--color-bg': '#04101f',
    '--color-surface': '#0a1f36',
    '--color-surface-2': '#0f2a47',
    '--color-line': 'rgba(180,220,255,.28)',
    '--color-key': '#ffd27a',
  } as CSSProperties,
  cls: {
    panel: 'ex-ui-panel',
    kicker: 'ex-ui-kicker',
    title: 'ex-ui-title',
    text: 'ex-ui-text',
    primary: 'ex-btn',
    secondary: 'ex-btn2',
    hud: 'ex-hud',
    drawer: 'ex-ui-drawer',
    drawerTitle: "text-lg text-[#bfe3ff] [font-family:'Special_Elite',monospace]",
    pill: 'ex-ui-pill',
    toast: 'ex-ui-pill',
  },
  icons: {
    win: <RichIcon name="flying-flag" metal="gold" size={80} />,
    lose: <RichIcon name="iceberg" metal="silver" size={78} />,
    handoff: <RichIcon name="notebook" metal="bone" size={60} />,
  },
  words: {
    handoffKicker: 'Carnet confidentiel',
    handoffLead: 'Passe le téléphone à',
    handoffWarning: 'Que les autres explorateurs détournent le regard.',
    win: 'Victoire !',
    lose: 'Défaite…',
  },
};
