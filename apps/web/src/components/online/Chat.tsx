'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CHAT_MAX } from '@arcade/protocol';
import { request, useOnline } from '@/lib/online';
import { Button } from '../ui/kit';

export function Chat({ className = '' }: { className?: string }) {
  const chat = useOnline((s) => s.chat);
  const me = useOnline((s) => s.playerId);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText('');
    const res = await request('chat:send', { text: t });
    if (!res.ok) setText(t);
  }

  return (
    <div className={`flex min-h-0 flex-col rounded-2xl border border-line bg-surface/90 ${className}`}>
      <div className="border-b border-line px-4 py-2.5 text-sm font-semibold">Discussion</div>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm">
        {chat.length === 0 && <p className="text-muted">Aucun message pour l’instant.</p>}
        <ul className="flex flex-col gap-1.5">
          {chat.map((m) =>
            m.system ? (
              <li key={m.id} className="text-xs text-muted italic">
                {m.text}
              </li>
            ) : (
              <li key={m.id} className="break-words">
                <span className={`font-semibold ${m.playerId === me ? 'text-accent' : 'text-fg'}`}>
                  {m.name}
                </span>
                <span className="text-muted"> : </span>
                {m.text}
              </li>
            ),
          )}
        </ul>
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-line p-2">
        <input
          value={text}
          maxLength={CHAT_MAX}
          onChange={(e) => setText(e.target.value)}
          placeholder="Écrire un message…"
          aria-label="Message"
          className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <Button type="submit" variant="primary" className="px-3 py-2">
          Envoyer
        </Button>
      </form>
    </div>
  );
}
