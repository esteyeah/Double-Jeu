import type { CSSProperties } from 'react';
import { RichIcon, type StageSkin } from '@arcade/tabletop';
import { REACTOR_CSS } from './theme';

/** Habillage des écrans communs de Réacteur : acier riveté, écrans cyan, bandes de danger. */
export const skin: StageSkin = {
  css: { href: 'arcade-reactor-v2', text: REACTOR_CSS },
  backdrop: '#05080c',
  scenery: (
    <div className="rx" style={{ position: 'fixed', inset: 0, minHeight: 0 }} aria-hidden="true">
      <div className="rx-wall" />
      <div className="rx-plates" />
      <div className="rx-light" />
      <div className="rx-scan" />
    </div>
  ),
  vars: {
    '--color-fg': '#dfe8f2',
    '--color-muted': '#8197aa',
    '--color-accent': '#58f3ff',
    '--color-bg': '#03080c',
    '--color-surface': '#0b151c',
    '--color-surface-2': '#10202a',
    '--color-line': 'rgba(88,243,255,.24)',
    '--color-key': '#ffb547',
  } as CSSProperties,
  cls: {
    panel: 'rx-ui-panel',
    kicker: 'rx-ui-kicker',
    title: 'rx-ui-title',
    text: 'rx-ui-text',
    primary: 'rx-btn',
    secondary: 'rx-btn2',
    hud: 'rx-hud',
    drawer: 'rx-ui-drawer',
    drawerTitle: 'rx-title rx-glow text-sm',
    pill: 'rx-ui-pill',
    toast: 'rx-ui-pill',
  },
  icons: {
    win: <RichIcon name="atom-core" variant="neon" glow="#58f3ff" size={72} />,
    lose: <RichIcon name="mushroom-cloud" variant="neon" glow="#ff4433" size={72} />,
    handoff: <RichIcon name="key-card" variant="neon" glow="#ffb547" size={58} />,
  },
  words: {
    handoffKicker: 'Transmission chiffrée',
    handoffLead: 'Terminal réservé à',
    handoffWarning: 'Les autres, détournez les yeux de l’écran.',
    win: 'Mission accomplie',
    lose: 'Mission échouée',
  },
};
