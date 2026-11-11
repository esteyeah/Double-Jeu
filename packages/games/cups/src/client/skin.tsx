import type { CSSProperties } from 'react';
import { RichIcon, type StageSkin } from '@arcade/tabletop';
import { CUPS_CSS } from './theme';
import { Vault } from './vault';

/** Habillage des écrans communs de Gobelets : taverne, cuir, bois et chandelle. */
export const skin: StageSkin = {
  css: { href: 'arcade-cups-v1', text: CUPS_CSS },
  backdrop: '#120a05',
  scenery: (
    <div className="go" style={{ position: 'fixed', inset: 0, minHeight: 0 }} aria-hidden="true">
      <div className="go-wall" />
      <Vault />
      <div className="go-light" />
    </div>
  ),
  vars: {
    '--color-fg': '#f3e3c6',
    '--color-muted': '#bfa780',
    '--color-accent': '#ffd07a',
    '--color-bg': '#140a04',
    '--color-surface': '#22130a',
    '--color-surface-2': '#2e1a0d',
    '--color-line': 'rgba(255,208,122,.28)',
    '--color-sabo': '#ff7a6a',
    '--color-key': '#ffd07a',
  } as CSSProperties,
  cls: {
    panel: 'go-ui-panel',
    kicker: 'go-ui-kicker',
    title: 'go-ui-title',
    text: 'go-ui-text',
    primary: 'go-btn',
    secondary: 'go-btn2',
    hud: 'go-hud',
    drawer: 'go-ui-drawer',
    drawerTitle: "text-2xl text-[#ffd07a] [font-family:'Pirata_One',serif]",
    pill: 'go-ui-pill',
    toast: 'go-ui-pill',
  },
  icons: {
    win: <RichIcon name="beer-stein" metal="gold" size={82} />,
    lose: <RichIcon name="rolling-dice-cup" metal="iron" size={76} />,
    handoff: <RichIcon name="rolling-dice-cup" metal="copper" size={62} />,
  },
  words: {
    handoffKicker: 'Ne montre pas tes dés',
    handoffLead: 'Passe le téléphone à',
    handoffWarning: 'Que les autres joueurs détournent le regard.',
    win: 'Tournée générale !',
    lose: 'Plus un dé en poche…',
  },
};
