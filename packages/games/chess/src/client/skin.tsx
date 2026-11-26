import type { CSSProperties } from 'react';
import { RichIcon, type StageSkin } from '@arcade/tabletop';
import { CHESS_CSS } from './theme';

const PANEL = 'rounded-2xl border border-[#d3d9e2] bg-[#ffffff] text-[#18202d] shadow-[0_30px_70px_rgba(0,0,0,.6)] p-6';

/** Habillage des écrans communs des Échecs Sournois : ardoise claire et laiton. */
export const skin: StageSkin = {
  css: { href: 'arcade-chess-v1', text: CHESS_CSS },
  backdrop: '#eceff3',
  scenery: <div className="ch" style={{ position: 'fixed', inset: 0, minHeight: 0 }} aria-hidden="true" />,
  vars: {
    '--color-fg': '#18202d',
    '--color-muted': '#5a6475',
    '--color-accent': '#a8701a',
    '--color-bg': '#eceff3',
    '--color-surface': '#ffffff',
    '--color-surface-2': '#f5f7fa',
    '--color-line': '#d3d9e2',
    '--color-key': '#a8701a',
  } as CSSProperties,
  cls: {
    panel: PANEL,
    kicker: 'text-xs uppercase tracking-[.25em] text-[#a8701a]',
    title: "text-3xl font-bold text-[#18202d] [font-family:'Bricolage_Grotesque',system-ui,sans-serif]",
    text: 'text-[#5a6475]',
    primary: 'rounded-xl bg-[#a8701a] px-5 py-3 font-semibold text-[#ffffff]',
    secondary: 'rounded-xl border border-[#d3d9e2] bg-[#f5f7fa] px-4 py-2.5 font-semibold text-[#18202d]',
    hud: 'rounded-full border border-[#d3d9e2] bg-white/90 text-[#18202d] shadow-lg',
    drawer: 'border-l border-[#d3d9e2] bg-[#ffffff] text-[#18202d]',
    drawerTitle: "text-2xl text-[#18202d] [font-family:'Bricolage_Grotesque',system-ui,sans-serif]",
    pill: 'rounded-full border border-[#d3d9e2] bg-[#ffffff] px-3 py-1 text-sm text-[#18202d]',
    toast: 'rounded-full border border-[#d3d9e2] bg-[#ffffff] px-4 py-2 text-sm text-[#18202d] shadow-lg',
  },
  icons: {
    win: <RichIcon name="chess-king" metal="gold" size={80} />,
    lose: <RichIcon name="chess-king" metal="iron" size={76} />,
    handoff: <RichIcon name="chess-queen" metal="gold" size={62} />,
  },
  words: {
    handoffKicker: 'Secrets de la partie',
    handoffLead: 'Passe l’appareil à',
    handoffWarning: 'L’adversaire ne regarde pas l’écran.',
    win: 'Échec et mat !',
    lose: 'Partie perdue…',
  },
};
