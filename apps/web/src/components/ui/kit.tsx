import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-bg font-semibold hover:brightness-110',
  secondary: 'border border-line bg-surface-2 text-fg hover:border-accent/60',
  ghost: 'text-muted hover:text-fg',
  danger: 'border border-sabo/50 text-sabo hover:bg-sabo/10',
};

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface/80 p-4 sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

export function Rules({ rules, open = false }: { rules: string[]; open?: boolean }) {
  return (
    <details className="group text-sm" open={open}>
      <summary className="cursor-pointer select-none font-semibold text-accent">Règles du jeu</summary>
      <div className="mt-2 flex flex-col gap-2 text-muted">
        {rules.map((r, i) => (
          <p key={i}>{r}</p>
        ))}
      </div>
    </details>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg border border-sabo/40 bg-sabo/10 px-3 py-2 text-sm text-sabo">
      {children}
    </p>
  );
}

export function ResultBanner({
  title,
  detail,
  winners,
}: {
  title: string;
  detail?: string;
  winners: string[];
}) {
  return (
    <div className="animate-pop rounded-2xl border border-key/50 bg-key/10 p-4 text-center">
      <div className="text-xl font-bold text-key">{title}</div>
      {detail && <p className="mt-1 text-sm text-fg">{detail}</p>}
      {winners.length > 0 && (
        <p className="mt-2 text-sm text-muted">Gagnants : {winners.join(', ')}</p>
      )}
    </div>
  );
}
