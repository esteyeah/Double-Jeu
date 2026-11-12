import type { CSSProperties } from 'react';
import { RichIcon, type StageSkin } from '@arcade/tabletop';
import { THRONE_CSS } from './theme';
import { PalaceHall } from './palace';

/** Habillage des écrans communs du Trône Vide : parchemin scellé, pierre et chandelles. */
export const skin: StageSkin = {
  css: { href: 'arcade-throne-v1', text: THRONE_CSS },
  backdrop: '#0d0906',
  scenery: (
    <div className="tv" style={{ position: 'fixed', inset: 0, minHeight: 0 }} aria-hidden="true">
      <div className="tv-wall" />
      <PalaceHall />
      <div className="tv-light" />
    </div>
  ),
  vars: {
    '--color-fg': '#efe3c8',
    '--color-muted': '#bba77f',
    '--color-accent': '#e9c46a',
    '--color-bg': '#120b06',
    '--color-surface': '#1e140b',
    '--color-surface-2': '#2a1c0f',
    '--color-line': 'rgba(233,196,106,.28)',
    '--color-sabo': '#ff7a6a',
    '--color-key': '#e9c46a',
  } as CSSProperties,
  cls: {
    panel: 'tv-ui-panel',
    kicker: 'tv-ui-kicker',
    title: 'tv-ui-title',
    text: 'tv-ui-text',
    primary: 'tv-btn',
    secondary: 'tv-btn2',
    hud: 'tv-hud',
    drawer: 'tv-ui-drawer',
    drawerTitle: "text-xl text-[#e9c46a] [font-family:'Marcellus_SC',serif]",
    pill: 'tv-ui-pill',
    toast: 'tv-ui-pill',
  },
  icons: {
    win: <RichIcon name="laurel-crown" metal="gold" size={82} />,
    lose: <RichIcon name="broken-shield" metal="iron" size={76} />,
    handoff: <RichIcon name="wax-seal" metal="ruby" size={62} />,
  },
  words: {
    handoffKicker: 'Pli scellé',
    handoffLead: 'Remets le téléphone à',
    handoffWarning: 'Que les autres conseillers détournent le regard.',
    win: 'Victoire !',
    lose: 'Défaite…',
  },
};
