'use client';

import { useState } from 'react';
import { Button, Panel } from '../ui/kit';

export function InviteBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/room/${code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Rejoins ma partie', text: `Code du salon : ${code}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* partage annulé par l'utilisateur */
    }
  }

  return (
    <Panel className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
      <div className="flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">Code du salon</div>
        <div className="font-mono text-3xl font-bold tracking-[0.35em] text-accent">{code}</div>
        <p className="text-xs text-muted">Tes amis le saisissent sur l’accueil, ou ouvrent le lien.</p>
      </div>
      <Button onClick={share}>{copied ? 'Lien copié ✓' : 'Partager le lien'}</Button>
    </Panel>
  );
}
