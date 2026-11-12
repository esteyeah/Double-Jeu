'use client';

import { createContext, useContext, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { setTable3DEnabled, table3DEnabled, useSoundSetting, type StageSkin } from '@arcade/tabletop';
import { useAmbiance } from '@/lib/ambiance';

/**
 * Scène plein écran : le jeu occupe toute la fenêtre avec son propre décor, sans l'habillage du site.
 * Quelques boutons discrets flottent en haut à droite (discussion, menu, son, plein écran).
 * Les écrans communs (passage du téléphone, fin de partie, panneaux) prennent l'habillage du jeu.
 */

const SkinContext = createContext<StageSkin | null>(null);

/** Classes par défaut, quand un jeu n'a pas d'habillage complet. */
const PLAIN: StageSkin['cls'] = {
  panel:
    'rounded-3xl border border-white/15 bg-black/60 p-7 text-white shadow-[0_30px_80px_rgba(0,0,0,.6)] backdrop-blur-md',
  kicker: 'text-xs uppercase tracking-[0.3em] text-white/60',
  title: 'text-3xl font-bold text-[#f4d58a]',
  text: 'text-white/75',
  primary: 'rounded-xl px-4 py-3 font-semibold transition hover:brightness-110 disabled:opacity-40 bg-[#e9c46a] text-[#1d1408]',
  secondary: 'rounded-xl px-4 py-3 font-semibold transition hover:brightness-110 disabled:opacity-40 border border-white/20 text-white',
  hud: 'rounded-full border border-white/15 bg-black/45 text-white shadow-[0_4px_14px_rgba(0,0,0,.45)] backdrop-blur-md hover:bg-black/70',
  drawer: 'border-l border-white/10 bg-[#0d1119]/95 text-fg',
  drawerTitle: 'font-semibold',
  pill: 'rounded-full border border-white/20 bg-black/60 px-3 py-2 text-xs text-white backdrop-blur',
  toast: 'rounded-full border border-white/15 bg-black/70 px-4 py-2 text-sm text-white backdrop-blur',
};

function useCls() {
  return useContext(SkinContext)?.cls ?? PLAIN;
}

export function Stage({ children, hud, skin }: { children: ReactNode; hud: ReactNode; skin?: StageSkin }) {
  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = previous;
    };
  }, []);
  return (
    <SkinContext.Provider value={skin ?? null}>
      {skin && (
        <style href={skin.css.href} precedence="default">
          {skin.css.text}
        </style>
      )}
      <main
        className="fixed inset-0 z-40 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#05070b]"
        style={skin ? { background: skin.backdrop } : undefined}
      >
        {children}
        <div className="pointer-events-none fixed right-2 top-2 z-50 flex gap-1.5 sm:right-3 sm:top-3 [&>*]:pointer-events-auto">
          {hud}
        </div>
      </main>
    </SkinContext.Provider>
  );
}

export function HudButton({
  label,
  onClick,
  children,
  badge,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  badge?: number;
}) {
  const cls = useCls();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative grid h-10 w-10 place-items-center transition ${cls.hud}`}
    >
      {children}
      {!!badge && (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#e2452f] px-1 text-center font-sans text-[11px] font-bold leading-5 text-white shadow">
          {badge}
        </span>
      )}
    </button>
  );
}

/** Pictogrammes du HUD : traits fins qui prennent la couleur de l'habillage. */
const HUD_PATHS = {
  chat: 'M4 5h16v10H9l-5 4z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  soundOn: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  soundOff: 'M4 9h4l5-4v14l-5-4H4zM16.5 9.5l5 5M21.5 9.5l-5 5',
  full: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  exitFull: 'M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5',
} as const;

export function HudIcon({ name }: { name: keyof typeof HUD_PATHS }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={HUD_PATHS[name]} />
    </svg>
  );
}

export function SoundButton() {
  const [on, setOn] = useSoundSetting();
  return (
    <HudButton label={on ? 'Couper le son' : 'Activer le son'} onClick={() => setOn(!on)}>
      <HudIcon name={on ? 'soundOn' : 'soundOff'} />
    </HudButton>
  );
}

/** Interrupteur du menu : table en 3D ou décor simple (pour les appareils qui chauffent ou rament). */
export function Table3DSetting() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(table3DEnabled()), []);
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
      <span>
        <span className="block font-semibold">Table en 3D</span>
        <span className="block text-xs text-muted">À couper si ton téléphone chauffe ou rame.</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        className="h-5 w-5 accent-[var(--color-accent)]"
        checked={on}
        onChange={(e) => {
          setOn(e.target.checked);
          setTable3DEnabled(e.target.checked);
        }}
      />
    </label>
  );
}

/** Interrupteur du menu : ambiance immersive, ou plateaux simples et sans thème. Vaut pour tous les jeux. */
export function AmbianceSetting() {
  const [on, setOn] = useAmbiance();
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
      <span>
        <span className="block font-semibold">Ambiance</span>
        <span className="block text-xs text-muted">Décors et personnages. Coupée : les jeux simples, sans thème.</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        className="h-5 w-5 accent-[var(--color-accent)]"
        checked={on}
        onChange={(e) => setOn(e.target.checked)}
      />
    </label>
  );
}

export function FullscreenButton() {
  const [supported, setSupported] = useState(false);
  const [full, setFull] = useState(false);
  useEffect(() => {
    setSupported(!!document.documentElement.requestFullscreen);
    const sync = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  if (!supported) return null;
  return (
    <HudButton
      label={full ? 'Quitter le plein écran' : 'Plein écran'}
      onClick={() => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => {});
      }}
    >
      <HudIcon name={full ? 'exitFull' : 'full'} />
    </HudButton>
  );
}

/** Bouton d'action d'un écran commun, à la mode du jeu. */
export function StageButton({
  tone = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'secondary' }) {
  const cls = useCls();
  return <button type="button" {...props} className={`w-full ${tone === 'primary' ? cls.primary : cls.secondary} ${className}`} />;
}

/** Panneau qui glisse depuis la droite (discussion, menu). */
export function Drawer({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  const skin = useContext(SkinContext);
  const cls = skin?.cls ?? PLAIN;
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        className={`flex h-full w-[min(380px,92vw)] animate-[drawer_.25s_ease-out] flex-col shadow-2xl ${cls.drawer}`}
        style={skin?.vars}
        onClick={(e) => e.stopPropagation()}
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className={cls.drawerTitle}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg px-2 py-1 text-muted hover:text-fg">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}

/** Résultat de fin de partie, par-dessus le plateau (que l'on peut encore regarder). */
export function ResultOverlay({
  title,
  detail,
  winners,
  outcome = null,
  actions,
}: {
  title: string;
  detail?: string;
  winners: string[];
  /** Le joueur de cet écran a-t-il gagné ? (`null` : spectateur, ou plusieurs joueurs sur le téléphone) */
  outcome?: 'win' | 'lose' | null;
  actions: ReactNode;
}) {
  const skin = useContext(SkinContext);
  const cls = skin?.cls ?? PLAIN;
  const [shown, setShown] = useState(false);
  const [hidden, setHidden] = useState(false);
  // Un court délai laisse le temps de voir les derniers coups (tirs, cartes retournées…).
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 1800);
    return () => clearTimeout(t);
  }, []);
  if (!shown) return null;
  if (hidden) {
    return (
      <button type="button" onClick={() => setHidden(false)} className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 shadow-2xl ${cls.pill}`}>
        {title} · revoir le résultat
      </button>
    );
  }
  const kicker = outcome === 'win' ? (skin?.words.win ?? 'Victoire !') : outcome === 'lose' ? (skin?.words.lose ?? 'Défaite…') : 'Fin de partie';
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-[3px]">
      <div className={`w-full max-w-md animate-pop text-center ${cls.panel}`}>
        <div className="flex justify-center">{skin ? (outcome === 'lose' ? skin.icons.lose : skin.icons.win) : <span className="text-4xl">🏆</span>}</div>
        <div className={`mt-3 ${cls.kicker}`}>{kicker}</div>
        <h2 className={`mt-1 ${cls.title}`}>{title}</h2>
        {detail && <p className={`mt-3 text-[0.95rem] ${cls.text}`}>{detail}</p>}
        {winners.length > 0 && <p className={`mt-2 text-sm opacity-80 ${cls.text}`}>Gagnants : {winners.join(', ')}</p>}
        <div className="mt-6 flex flex-col gap-2.5">{actions}</div>
        <button type="button" onClick={() => setHidden(true)} className={`mt-4 text-sm underline-offset-4 opacity-75 hover:underline hover:opacity-100 ${cls.text}`}>
          Revoir le plateau
        </button>
      </div>
    </div>
  );
}

/** Écran « passe le téléphone » : rien de secret n'est affiché tant que le bon joueur n'a pas confirmé. */
export function HandoffScreen({
  gameName,
  name,
  onReady,
  onCancel,
}: {
  gameName: string;
  name: string;
  onReady: () => void;
  onCancel?: () => void;
}) {
  const skin = useContext(SkinContext);
  const cls = skin?.cls ?? PLAIN;
  // Inactif un court instant : un double-tap du joueur précédent n'affiche pas les secrets du suivant.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    setArmed(false);
    const t = setTimeout(() => setArmed(true), 700);
    return () => clearTimeout(t);
  }, [name]);
  return (
    <div className="relative grid min-h-[100dvh] place-items-center overflow-hidden p-5 text-center">
      {skin?.scenery}
      <div className={`relative w-full max-w-sm animate-pop ${cls.panel}`}>
        {skin && <div className="mb-3 flex justify-center">{skin.icons.handoff}</div>}
        <div className={cls.kicker}>{skin?.words.handoffKicker ?? gameName}</div>
        <p className={`mt-4 ${cls.text}`}>{skin?.words.handoffLead ?? 'Passe le téléphone à'}</p>
        <p className={`mt-1 break-words ${cls.title}`}>{name}</p>
        <p className={`mt-3 text-sm ${cls.text}`}>{skin?.words.handoffWarning ?? 'Les autres, ne regardez pas l’écran !'}</p>
        <StageButton disabled={!armed} onClick={onReady} className="mt-6">
          Je suis {name}, afficher
        </StageButton>
        {onCancel && (
          <button type="button" onClick={onCancel} className={`mt-3 text-sm opacity-70 hover:opacity-100 ${cls.text}`}>
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

/** Étiquette fixe en haut à gauche (« Écran privé de… »). */
export function StagePill({ children }: { children: ReactNode }) {
  const cls = useCls();
  return <div className={`pointer-events-none fixed left-2 top-2 z-50 max-w-[55vw] truncate sm:left-3 sm:top-3 ${cls.pill}`}>{children}</div>;
}

/** Message éphémère (coup refusé, joueur absent…). */
export function Toast({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' }) {
  const cls = useCls();
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`pointer-events-none fixed bottom-5 left-1/2 z-50 max-w-[92vw] -translate-x-1/2 animate-pop shadow-2xl ${
        tone === 'error' ? 'rounded-full border border-[#e2452f]/60 bg-[#2a0d0a]/90 px-4 py-2 text-sm text-[#ffb3a8] backdrop-blur' : cls.toast
      }`}
    >
      {children}
    </div>
  );
}
