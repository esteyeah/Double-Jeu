'use client';

import { useEffect, useState } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import {
  LOOT_ICON,
  LOOT_LABEL,
  MAX_WOUNDS,
  type Charge,
  type LootItem,
  type PirateView,
  type PlunderMove,
  type PlunderView,
} from '../shared';

type Props = BoardProps<PlunderView, PlunderMove>;

export default function PlunderBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const nameOf = (id: PlayerId | null) => view.pirates.find((p) => p.id === id)?.name ?? '?';
  const privateView = viewer !== null && viewer === actingAs;
  const self = view.pirates.find((p) => p.id === actingAs);
  const canAct = !!self && !self.sunk;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Manche" value={`${view.round} / ${view.rounds}`} />
        <Stat label="Capitaine" value={nameOf(view.captain)} />
        <Stat label="Réserve" value={`${view.deckLeft} objets`} />
      </div>

      <Board view={view} actingAs={actingAs} sendMove={sendMove} />
      <Instruction view={view} actingAs={actingAs} mode={mode} nameOf={nameOf} />

      {canAct && view.phase === 'prepare' && privateView && view.me && (
        <Prepare view={view} me={view.me} sendMove={sendMove} />
      )}
      {(view.phase === 'order' || view.phase === 'courage') && <Aims view={view} viewer={viewer} nameOf={nameOf} />}
      {canAct && view.phase === 'order' && actingAs === view.captain && (
        <CaptainOrder view={view} nameOf={nameOf} sendMove={sendMove} />
      )}
      {canAct && view.phase === 'courage' && view.config.courage === 'secret' && privateView && (
        <Courage view={view} me={actingAs!} sendMove={sendMove} />
      )}
      {canAct && view.phase === 'courage' && view.config.courage === 'table' && actingAs === view.reporter && view.toReport.length > 0 && (
        <ReportCowards view={view} nameOf={nameOf} sendMove={sendMove} />
      )}
      {view.shots.length > 0 && <Shots view={view} nameOf={nameOf} />}

      <Pirates view={view} viewer={viewer} />
      <Journal lines={view.log} />
    </div>
  );
}

// ───────── En-tête et pont ─────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="truncate font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function itemText(item: LootItem): string {
  return item.kind === 'coin' ? `${item.value} doublons` : LOOT_LABEL[item.kind];
}

function Board({
  view,
  actingAs,
  sendMove,
}: {
  view: PlunderView;
  actingAs: PlayerId | null;
  sendMove: (m: PlunderMove) => void;
}) {
  const myTurn = view.phase === 'loot' && actingAs !== null && view.picker === actingAs;
  return (
    <section className={`rounded-2xl border p-4 ${myTurn ? 'border-key/60 bg-key/5' : 'border-line bg-surface'}`}>
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Sur le pont</div>
        <div className="text-xs text-muted">{view.board.length} objets</div>
      </div>
      <ul className="mt-2 flex flex-wrap gap-2">
        {view.board.map((item, i) =>
          myTurn ? (
            <li key={i}>
              <button
                type="button"
                onClick={() => sendMove({ type: 'take', index: i })}
                className="flex items-center gap-1.5 rounded-xl border border-key/50 bg-surface-2 px-3 py-2 text-sm hover:border-key hover:bg-key/10"
              >
                <span aria-hidden>{LOOT_ICON[item.kind]}</span>
                {itemText(item)}
              </button>
            </li>
          ) : (
            <li key={i} className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm">
              <span aria-hidden>{LOOT_ICON[item.kind]}</span>
              {itemText(item)}
            </li>
          ),
        )}
        {view.board.length === 0 && <li className="text-sm text-muted">Le pont est vide.</li>}
      </ul>
    </section>
  );
}

function Instruction({
  view,
  actingAs,
  mode,
  nameOf,
}: {
  view: PlunderView;
  actingAs: PlayerId | null;
  mode: Props['mode'];
  nameOf: (id: PlayerId | null) => string;
}) {
  const call = (id: PlayerId | null, rest: string) =>
    mode === 'hotseat' ? `${nameOf(id)}, ${rest}` : rest.charAt(0).toUpperCase() + rest.slice(1);
  const afloat = view.pirates.filter((p) => !p.sunk);
  let text = '';
  switch (view.phase) {
    case 'prepare':
      text = `Chacun charge son pistolet et vise en secret… ${afloat.filter((p) => p.prepared).length}/${afloat.length} prêts`;
      break;
    case 'order':
      text =
        actingAs === view.captain
          ? call(view.captain, 'tu peux obliger un pirate, qu’il te vise ou non, à viser ailleurs.')
          : `Le Capitaine ${nameOf(view.captain)} peut obliger un pirate à changer de cible.`;
      break;
    case 'courage':
      text =
        view.config.courage === 'table'
          ? 'À trois, chacun annonce à voix haute : tenir bon ou plonger dans la cale !'
          : `Tenir bon ou plonger dans la cale ? ${afloat.filter((p) => p.decided).length}/${afloat.length} décidés`;
      break;
    case 'loot':
      text =
        view.picker === actingAs
          ? call(view.picker, 'à toi de te servir : touche un objet sur le pont.')
          : `${nameOf(view.picker)} se sert. Ordre : ${view.pickers.map(nameOf).join(' → ')}`;
      break;
    case 'over':
      text = 'Fin de la partie : on compte les doublons !';
      break;
  }
  return <div className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">{text}</div>;
}

// ───────── Préparation (secrète) ─────────

function Prepare({
  view,
  me,
  sendMove,
}: {
  view: PlunderView;
  me: NonNullable<PlunderView['me']>;
  sendMove: (m: PlunderMove) => void;
}) {
  const [charge, setCharge] = useState<Charge | null>(null);
  const [target, setTarget] = useState<PlayerId | null>(null);
  useEffect(() => {
    setCharge(null);
    setTarget(null);
  }, [view.round, me.id]);
  const targets = view.pirates.filter((p) => !p.sunk && p.id !== me.id);

  if (me.prepared) {
    const t = view.pirates.find((p) => p.id === me.prepared!.target)?.name;
    return (
      <Panel title="Pistolet chargé">
        <p className="text-sm">
          {me.prepared.charge === 'dry' ? 'Pistolet chargé (le coup part)' : 'Balle à blanc (du bruit)'}, braqué sur {t}. En attente
          des autres…
        </p>
      </Panel>
    );
  }
  return (
    <Panel title="Charge ton pistolet et vise">
      <div className="grid grid-cols-2 gap-2">
        <ChargeButton
          active={charge === 'dry'}
          disabled={me.dry === 0}
          onClick={() => setCharge('dry')}
          title="Pistolet chargé"
          detail={`le coup part · reste ${me.dry}`}
          tone="sabo"
        />
        <ChargeButton
          active={charge === 'wet'}
          disabled={me.wet === 0}
          onClick={() => setCharge('wet')}
          title="Balle à blanc"
          detail={`du bruit · reste ${me.wet}`}
          tone="tech"
        />
      </div>
      <div className="mt-3 text-xs text-muted">Qui vises-tu ?</div>
      <div className="mt-1 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cible">
        {targets.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={target === p.id}
            onClick={() => setTarget(p.id)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              target === p.id ? 'border-sabo bg-sabo/15 text-fg' : 'border-line text-muted hover:text-fg'
            }`}
          >
            {p.name} · {p.score}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!charge || !target}
        onClick={() => charge && target && sendMove({ type: 'prepare', charge, target })}
        className="mt-3 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110 disabled:opacity-40 sm:w-auto"
      >
        Charger et viser
      </button>
    </Panel>
  );
}

function ChargeButton({
  active,
  disabled,
  onClick,
  title,
  detail,
  tone,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  title: string;
  detail: string;
  tone: 'sabo' | 'tech';
}) {
  const on = tone === 'sabo' ? 'border-sabo bg-sabo/15 text-sabo' : 'border-tech bg-tech/15 text-tech';
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl border-2 px-3 py-3 text-left disabled:opacity-30 ${active ? on : 'border-line text-fg'}`}
    >
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-muted">{detail}</div>
    </button>
  );
}

// ───────── Visées, ordre du Capitaine, courage ─────────

function Aims({ view, viewer, nameOf }: { view: PlunderView; viewer: PlayerId | null; nameOf: (id: PlayerId | null) => string }) {
  const shooters = view.pirates.filter((p) => !p.sunk && p.aim);
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 text-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Pistolets braqués</div>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {shooters.map((p) => (
          <li key={p.id} className={p.aim === viewer ? 'font-semibold text-sabo' : ''}>
            {p.name} → {nameOf(p.aim)}
            {p.aim === viewer ? ' (toi !)' : ''}
            {view.order?.pirate === p.id ? ' · sur ordre du Capitaine' : ''}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CaptainOrder({
  view,
  nameOf,
  sendMove,
}: {
  view: PlunderView;
  nameOf: (id: PlayerId | null) => string;
  sendMove: (m: PlunderMove) => void;
}) {
  const shooters = view.pirates
    .filter((p) => !p.sunk && p.id !== view.captain && !!p.aim)
    .sort((a, b) => Number(b.aim === view.captain) - Number(a.aim === view.captain));
  const [pirate, setPirate] = useState<PlayerId | null>(null);
  const [target, setTarget] = useState<PlayerId | null>(null);
  const current = view.pirates.find((p) => p.id === pirate)?.aim ?? null;
  const targets = view.pirates.filter((p) => !p.sunk && p.id !== pirate && p.id !== view.captain && p.id !== current);
  return (
    <Panel title="Ordre du Capitaine">
      <div className="text-xs text-muted">Quel pirate doit changer de cible ?</div>
      <Chips
        items={shooters}
        value={pirate}
        onPick={(id) => {
          setPirate(id);
          setTarget(null);
        }}
        label="Pirate"
      />
      {pirate && (
        <>
          <div className="mt-3 text-xs text-muted">
            {nameOf(pirate)} vise {current === view.captain ? 'toi' : nameOf(current)}. Nouvelle cible :
          </div>
          <Chips items={targets} value={target} onPick={setTarget} label="Nouvelle cible" />
        </>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={!pirate || !target}
          onClick={() => pirate && target && sendMove({ type: 'order', pirate, target })}
          className="rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110 disabled:opacity-40"
        >
          {pirate && target ? `Ordonner : ${nameOf(pirate)} vise ${nameOf(target)}` : 'Choisis un pirate et une cible'}
        </button>
        <button
          type="button"
          onClick={() => sendMove({ type: 'order' })}
          className="rounded-xl border border-line px-4 py-3 text-sm hover:border-accent/60"
        >
          Laisser faire
        </button>
      </div>
    </Panel>
  );
}

function Courage({ view, me, sendMove }: { view: PlunderView; me: PlayerId; sendMove: (m: PlunderMove) => void }) {
  const threats = view.pirates.filter((p) => !p.sunk && p.aim === me);
  if (view.me?.courage !== null && view.me?.courage !== undefined) {
    return (
      <Panel title="Décision prise">
        <p className="text-sm">{view.me.courage ? 'Tu plonges dans la cale.' : 'Tu tiens bon.'} En attente des autres…</p>
      </Panel>
    );
  }
  return (
    <Panel title={threats.length ? `${threats.length} pistolet${threats.length > 1 ? 's' : ''} te visent !` : 'Personne ne te vise'}>
      <p className="-mt-2 mb-3 text-xs text-muted">
        Plonger te met à l’abri, mais tu ne prendras rien cette manche et ton tir ne partira pas.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => sendMove({ type: 'courage', flee: false })}
          className="rounded-xl bg-key px-4 py-4 font-bold text-bg hover:brightness-110"
        >
          Tenir bon
        </button>
        <button
          type="button"
          onClick={() => sendMove({ type: 'courage', flee: true })}
          className="rounded-xl border-2 border-line px-4 py-4 font-bold hover:border-tech"
        >
          Plonger dans la cale
        </button>
      </div>
    </Panel>
  );
}

function ReportCowards({
  view,
  nameOf,
  sendMove,
}: {
  view: PlunderView;
  nameOf: (id: PlayerId | null) => string;
  sendMove: (m: PlunderMove) => void;
}) {
  const [fled, setFled] = useState<PlayerId[]>([]);
  useEffect(() => setFled([]), [view.round]);
  const toggle = (id: PlayerId) => setFled((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  return (
    <Panel title="Qui a plongé dans la cale ?">
      <div className="flex flex-wrap gap-1.5">
        {view.toReport.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={fled.includes(id)}
            onClick={() => toggle(id)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              fled.includes(id) ? 'border-tech bg-tech/15 text-tech' : 'border-line text-muted'
            }`}
          >
            {nameOf(id)} {fled.includes(id) ? '· a plongé' : ''}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">Les bots ont déjà décidé en secret.</p>
      <button
        type="button"
        onClick={() => sendMove({ type: 'cowards', fled })}
        className="mt-3 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-bg hover:brightness-110 sm:w-auto"
      >
        Feu !
      </button>
    </Panel>
  );
}

function Shots({ view, nameOf }: { view: PlunderView; nameOf: (id: PlayerId | null) => string }) {
  const previous = view.phase === 'prepare';
  const divers = view.pirates.filter((p) => p.fled);
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 text-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {previous ? 'Tirs de la manche précédente' : 'Les tirs'}
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {view.shots.map((s) => (
          <li key={s.shooter}>
            {nameOf(s.shooter)} → {nameOf(s.target)} :{' '}
            {s.charge === 'wet' ? (
              <span className="text-muted">clic… à blanc</span>
            ) : s.hit ? (
              <span className="font-bold text-sabo">PAN ! touché</span>
            ) : (
              <span className="text-key">PAN… dans le vide</span>
            )}
          </li>
        ))}
      </ul>
      {!previous && divers.length > 0 && (
        <p className="mt-2 text-xs text-muted">Dans la cale : {divers.map((p) => p.name).join(', ')}</p>
      )}
    </section>
  );
}

// ───────── Équipage ─────────

function Pirates({ view, viewer }: { view: PlunderView; viewer: PlayerId | null }) {
  const ranked = [...view.pirates].sort((a, b) => Number(a.sunk) - Number(b.sunk) || b.score - a.score);
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Équipage</div>
      <ul className="mt-2 flex flex-col gap-2">
        {ranked.map((p) => (
          <li key={p.id} className={`flex flex-col gap-0.5 text-sm ${p.sunk ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-2">
              <span className={`min-w-[5rem] flex-1 truncate font-semibold ${p.sunk ? 'line-through' : ''}`}>
                {p.name}
                {p.id === viewer && <span className="font-normal text-accent"> (toi)</span>}
                {p.isBot && <span className="font-normal text-muted"> · bot</span>}
              </span>
              {p.id === view.captain && view.phase !== 'over' && <Badge className="border-key/60 text-key">Capitaine</Badge>}
              {p.id === view.nextCaptain && <Badge className="border-key/40 text-key">🎩 prochain</Badge>}
              <Status view={view} p={p} />
              <span className="w-12 shrink-0 text-right font-bold tabular-nums">{p.score}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
              <span aria-label={`${p.wounds} blessure(s)`} className="text-sabo">
                {p.sunk ? '☠ coulé' : '♥'.repeat(MAX_WOUNDS - p.wounds) + '♡'.repeat(p.wounds)}
              </span>
              <span>{p.charges} charges</span>
              <LootSummary loot={p.loot} pearlLeader={view.pearlLeaders.includes(p.id)} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Status({ view, p }: { view: PlunderView; p: PirateView }) {
  if (p.sunk) return null;
  if (view.phase === 'prepare') return <span className={`text-xs ${p.prepared ? 'text-good' : 'text-muted'}`}>{p.prepared ? 'prêt' : '…'}</span>;
  if (view.phase === 'courage') return <span className={`text-xs ${p.decided ? 'text-good' : 'text-muted'}`}>{p.decided ? 'décidé' : '…'}</span>;
  if (view.phase === 'loot') {
    if (p.fled) return <Badge className="border-tech/50 text-tech">cale</Badge>;
    if (p.hit) return <Badge className="border-sabo/60 text-sabo">touché</Badge>;
  }
  return null;
}

function LootSummary({ loot, pearlLeader }: { loot: LootItem[]; pearlLeader: boolean }) {
  const coins = loot.reduce((s, l) => s + (l.kind === 'coin' ? (l.value ?? 0) : 0), 0);
  const count = (k: LootItem['kind']) => loot.filter((l) => l.kind === k).length;
  const parts: string[] = [];
  if (coins) parts.push(`${LOOT_ICON.coin}${coins}`);
  if (count('pearl')) parts.push(`${LOOT_ICON.pearl}${count('pearl')}${pearlLeader ? '★' : ''}`);
  if (count('map')) parts.push(`${LOOT_ICON.map}${count('map')}`);
  if (count('rum')) parts.push(`${LOOT_ICON.rum}${count('rum')}`);
  return <span className="text-xs text-muted">{parts.join(' ')}</span>;
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`shrink-0 rounded-md border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}

function Chips({
  items,
  value,
  onPick,
  label,
}: {
  items: PirateView[];
  value: PlayerId | null;
  onPick: (id: PlayerId) => void;
  label: string;
}) {
  return (
    <div className="mt-1 flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
      {items.map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={value === p.id}
          onClick={() => onPick(p.id)}
          className={`rounded-lg border px-3 py-2 text-sm ${
            value === p.id ? 'border-accent bg-accent/15 text-fg' : 'border-line text-muted hover:text-fg'
          }`}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="animate-pop rounded-2xl border border-accent/40 bg-surface-2 p-4">
      <h4 className="mb-3 font-semibold">{title}</h4>
      {children}
    </section>
  );
}

function Journal({ lines }: { lines: string[] }) {
  const recent = lines.slice(-8).reverse();
  return (
    <details className="rounded-xl border border-line bg-surface p-3 text-sm">
      <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-muted">
        Journal
      </summary>
      <ol className="mt-2 flex flex-col gap-1">
        {recent.map((line, i) => (
          <li key={lines.length - i} className={i === 0 ? 'text-fg' : 'text-muted'}>
            {line}
          </li>
        ))}
      </ol>
    </details>
  );
}
