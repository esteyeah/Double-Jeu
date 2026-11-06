'use client';

import { useEffect, useState } from 'react';
import { Button } from '../ui/kit';

/**
 * Écran de passage du téléphone. Le bouton reste inactif un court instant pour éviter
 * qu'un double-tap du joueur précédent n'affiche les secrets du suivant.
 */
export function Handoff({
  name,
  onReady,
  onCancel,
}: {
  name: string;
  onReady: () => void;
  onCancel?: () => void;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    setArmed(false);
    const t = setTimeout(() => setArmed(true), 700);
    return () => clearTimeout(t);
  }, [name]);

  return (
    <div className="flex min-h-[75dvh] animate-pop flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="text-sm uppercase tracking-[0.25em] text-muted">Passe le téléphone à</div>
      <div className="max-w-full break-words text-5xl font-black">{name}</div>
      <p className="max-w-xs text-sm text-muted">
        Les autres joueurs ne doivent pas regarder l’écran.
      </p>
      <Button
        variant="primary"
        disabled={!armed}
        onClick={onReady}
        className="px-8 py-4 text-base"
      >
        Je suis {name}, afficher
      </Button>
      {onCancel && (
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      )}
    </div>
  );
}
