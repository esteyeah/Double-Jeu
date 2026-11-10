import type { CSSProperties } from 'react';
import { RichIcon, type StageSkin } from '@arcade/tabletop';
import { INTERROGATION_CSS } from './theme';

/** Habillage des écrans communs de Garde à vue : dossier kraft, néon et mur vert. */
export const skin: StageSkin = {
  css: { href: 'arcade-interrogation-v1', text: INTERROGATION_CSS },
  backdrop: '#2b3328',
  scenery: (
    <div className="gv" style={{ position: 'fixed', inset: 0, minHeight: 0 }} aria-hidden="true">
      <div className="gv-wall" />
      <div className="gv-light" />
      <div className="gv-neon" />
    </div>
  ),
  vars: {
    '--color-fg': '#e9ecdf',
    '--color-muted': '#c9d1c0',
    '--color-accent': '#ffe08a',
    '--color-bg': '#1c201a',
    '--color-surface': '#262c24',
    '--color-surface-2': '#30382d',
    '--color-line': 'rgba(233,236,223,.25)',
    '--color-key': '#ffe08a',
  } as CSSProperties,
  cls: {
    panel: 'gv-ui-panel',
    kicker: 'gv-ui-kicker',
    title: 'gv-ui-title',
    text: 'gv-ui-text',
    primary: 'gv-btn',
    secondary: 'gv-btn2',
    hud: 'gv-hud',
    drawer: 'gv-ui-drawer',
    drawerTitle: "text-lg text-[#f4f6ea] [font-family:'Special_Elite',monospace]",
    pill: 'gv-ui-pill',
    toast: 'gv-ui-pill',
  },
  icons: {
    win: <RichIcon name="police-badge" metal="gold" size={80} />,
    lose: <RichIcon name="handcuffs" metal="steel" size={76} />,
    handoff: <RichIcon name="open-folder" metal="brass" size={62} />,
  },
  words: {
    handoffKicker: 'Pièce confidentielle',
    handoffLead: 'Passe le téléphone à',
    handoffWarning: 'Que les autres ne regardent pas le dossier.',
    win: 'Affaire classée !',
    lose: 'Affaire perdue…',
  },
};
