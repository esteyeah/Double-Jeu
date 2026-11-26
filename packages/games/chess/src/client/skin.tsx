import type { CSSProperties } from 'react';
import { RichIcon, type StageSkin } from '@arcade/tabletop';
import { CHESS_CSS } from './theme';

const PANEL = 'rounded-2xl border border-[#2c3543] bg-[#181f28] text-[#e6eaf0] shadow-[0_30px_70px_rgba(0,0,0,.6)] p-6';

/** Habillage des écrans communs des Échecs Sournois : club d'échecs la nuit, ardoise et laiton. */
export const skin: StageSkin = {
  css: { href: 'arcade-chess-v1', text: CHESS_CSS },
  backdrop: '#10141a',
  scenery: <div className="ch" style={{ position: 'fixed', inset: 0, minHeight: 0 }} aria-hidden="true" />,
  vars: {
    '--color-fg': '#e6eaf0',
    '--color-muted': '#9aa5b6',
    '--color-accent': '#e2a647',
    '--color-bg': '#10141a',
    '--color-surface': '#181f28',
    '--color-surface-2': '#1f2732',
    '--color-line': '#2c3543',
    '--color-key': '#e2a647',
  } as CSSProperties,
  cls: {
    panel: PANEL,
    kicker: 'text-xs uppercase tracking-[.25em] text-[#e2a647]',
    title: "text-3xl font-bold text-[#e6eaf0] [font-family:'Cinzel',Georgia,serif]",
    text: 'text-[#c3ccd8]',
    primary: 'rounded-xl bg-[#e2a647] px-5 py-3 font-semibold text-[#1a1408]',
    secondary: 'rounded-xl border border-[#2c3543] bg-[#1f2732] px-4 py-2.5 font-semibold text-[#e6eaf0]',
    hud: 'rounded-full border border-[#2c3543] bg-[#181f28]/90 text-[#e6eaf0] shadow-lg',
    drawer: 'border-l border-[#2c3543] bg-[#181f28] text-[#e6eaf0]',
    drawerTitle: "text-2xl text-[#e6eaf0] [font-family:'Cinzel',Georgia,serif]",
    pill: 'rounded-full border border-[#2c3543] bg-[#181f28] px-3 py-1 text-sm text-[#e6eaf0]',
    toast: 'rounded-full border border-[#2c3543] bg-[#181f28] px-4 py-2 text-sm text-[#e6eaf0] shadow-lg',
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
