'use client';

import { useAmbiance } from '@/lib/ambiance';

/** Petit interrupteur pour les écrans simples : rallumer (ou couper) l'ambiance de tous les jeux. */
export function AmbianceToggle({ className = '' }: { className?: string }) {
  const [on, setOn] = useAmbiance();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn(!on)}
      title={on ? 'Passer aux jeux simples, sans thème' : 'Remettre les décors et les personnages'}
      className={`inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-fg ${className}`}
    >
      <span className={`h-2 w-2 rounded-full ${on ? 'bg-good' : 'bg-muted'}`} />
      Ambiance : {on ? 'activée' : 'coupée'}
    </button>
  );
}
