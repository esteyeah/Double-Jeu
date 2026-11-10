'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import { Icon, RichIcon, sfx, useAmbient, useOnChange, type GameIconName, type Metal } from '@arcade/tabletop';
import {
  LOOT_LABEL,
  MAX_WOUNDS,
  PEARL_BONUS,
  PEARL_VALUE,
  RUM_VALUE,
  type Charge,
  type LootItem,
  type PirateView,
  type PlunderMove,
  type PlunderView,
  type Shot,
} from '../shared';
import { PLUNDER_CSS } from './theme';

export { skin } from './skin';

type Props = BoardProps<PlunderView, PlunderMove>;
type NameOf = (id: PlayerId | null) => string;

/** Émail et emblème de chaque place à bord (dans l'ordre des sièges). */
const ENAMEL = ['#8e1b14', '#173f74', '#1d5a3a', '#5b2a73', '#a36a10', '#155f66', '#3b3b3b', '#7a3b12'];
const EMBLEM: GameIconName[] = ['bandana', 'pirate-skull', 'eyepatch', 'mustache', 'parrot-head', 'figurehead', 'pirate-captain', 'pirate-hook'];

const CHARGE_TEXT: Record<Charge, { title: string; icon: GameIconName; metal: Metal; hint: string }> = {
  dry: { title: 'Pistolet chargé', icon: 'bullet-impacts', metal: 'ruby', hint: 'le coup part' },
  wet: { title: 'Balle à blanc', icon: 'smoke-bomb', metal: 'silver', hint: 'du bruit, rien de plus' },
};

export default function PlunderBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const nameOf: NameOf = (id) => view.pirates.find((p) => p.id === id)?.name ?? '?';
  const seatOf = (id: PlayerId | null) => Math.max(0, view.pirates.findIndex((p) => p.id === id));
  const self = view.pirates.find((p) => p.id === actingAs);
  const privateView = viewer !== null && viewer === actingAs;
  const canAct = !!self && !self.sunk;

  useAmbient('sea');
  const [fight, setFight] = useState<{ shots: Shot[]; divers: PlayerId[] } | null>(null);
  const shotsKey = `${view.round}|${view.shots.map((s) => `${s.shooter}${s.charge}${s.hit}`).join(',')}`;
  useOnChange(shotsKey, () => {
    if (view.shots.length > 0 && view.phase !== 'prepare') {
      setFight({ shots: view.shots, divers: view.pirates.filter((p) => p.fled).map((p) => p.id) });
    }
  });
  useOnChange(`${view.round}|${view.board.length}`, (prev) => {
    const [round, count] = prev.split('|').map(Number);
    if (view.phase === 'loot' && round === view.round && view.board.length < count!) sfx.coins();
  });
  useOnChange(view.phase, () => {
    if (view.phase === 'over') sfx.fanfare(0.6);
  });


  return (
    <div className="bt">
      <style href="arcade-plunder-v2" precedence="default">
        {PLUNDER_CSS}
      </style>
      <div className="bt-deck" />
      <div className="bt-light" />

      <Bastingage view={view} nameOf={nameOf} seatOf={seatOf} />
      <div className="mx-auto mt-4 grid w-[min(1240px,calc(100%-20px))] gap-x-6 gap-y-2 pb-16 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          <Treasure view={view} actingAs={actingAs} sendMove={sendMove} />
          <div className="bt-dock">
            <Dock view={view} actingAs={actingAs} privateView={privateView} canAct={canAct} mode={mode} nameOf={nameOf} seatOf={seatOf} sendMove={sendMove} />
          </div>
          {view.shots.length > 0 && <ShotReport view={view} nameOf={nameOf} seatOf={seatOf} />}
          <div className="hidden lg:block">
            <Journal lines={view.log} />
          </div>
        </div>
        <div className="min-w-0">
          <Crew view={view} viewer={viewer} nameOf={nameOf} seatOf={seatOf} />
          <div className="lg:hidden">
            <Journal lines={view.log} />
          </div>
        </div>
      </div>

      {fight && <Gunfight {...fight} nameOf={nameOf} seatOf={seatOf} captain={view.captain} onDone={() => setFight(null)} />}
    </div>
  );
}

// ───────── Médaillons ─────────

function Medal({
  seat,
  size = 54,
  captain = false,
  hurt = false,
  sunk = false,
}: {
  seat: number;
  size?: number;
  captain?: boolean;
  hurt?: boolean;
  sunk?: boolean;
}) {
  const c = ENAMEL[seat % ENAMEL.length]!;
  return (
    <span
      className="bt-medal"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 28%, color-mix(in srgb, ${c} 50%, white), ${c} 55%, color-mix(in srgb, ${c} 55%, black))`,
        filter: sunk ? 'grayscale(1) brightness(.6)' : undefined,
      }}
    >
      <RichIcon name={EMBLEM[seat % EMBLEM.length]!} metal="bone" size={size * 0.7} />
      {captain && (
        <span className="bt-token absolute -right-2 -top-2" style={{ background: '#17171c', width: size * 0.48, height: size * 0.48 }}>
          <RichIcon name="pirate-hat" metal="gold" size={size * 0.34} />
        </span>
      )}
      {hurt && !sunk && (
        <span className="bt-token absolute -bottom-1.5 -left-1.5" style={{ background: '#7a1d14', width: size * 0.42, height: size * 0.42 }}>
          <RichIcon name="bandage-roll" metal="bone" size={size * 0.28} />
        </span>
      )}
      {sunk && (
        <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45">
          <RichIcon name="skull-crossed-bones" metal="bone" size={size * 0.6} />
        </span>
      )}
    </span>
  );
}

// ───────── Bastingage : ciel, mer, titre ─────────

const PHASE_TITLE: Record<PlunderView['phase'], string> = {
  prepare: 'Chargez vos pistolets',
  order: 'Le Capitaine a la main',
  courage: 'L’heure de vérité',
  loot: 'Partage du butin',
  over: 'Fin du voyage',
};

function Bastingage({ view, nameOf, seatOf }: { view: PlunderView; nameOf: NameOf; seatOf: (id: PlayerId | null) => number }) {
  const wave = 'M0 26 Q 25 12 50 26 T 100 26 T 150 26 T 200 26 V 60 H 0 Z';
  return (
    <header className="bt-sky">
      <div className="bt-stars" />
      <div className="bt-moonpath" />
      <div className="bt-sea" aria-hidden>
        <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="bt-wave1">
          <path d={wave} fill="#0f2a40" transform="scale(1 1)" />
          <path d={wave} fill="#0f2a40" transform="translate(200 0)" />
        </svg>
        <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="bt-wave2" style={{ height: '70%' }}>
          <path d={wave} fill="#173a55" />
          <path d={wave} fill="#173a55" transform="translate(200 0)" />
        </svg>
      </div>
      <div className="bt-railtop" />
      <div className="bt-posts" />
      <div className="bt-rail" />

      <div className="absolute inset-x-0 top-12 flex justify-center px-3 sm:top-5">
        <div className="bt-plate bt-nails max-w-full text-center">
          <span className="text-[11px] uppercase tracking-[0.32em] text-[#d9bd8a]">
            {view.phase === 'over' ? 'Le trésor est partagé' : `Manche ${view.round} sur ${view.rounds}`}
          </span>
          <h3 className="bt-title bt-gold text-[1.9rem] sm:text-[2.4rem]">{PHASE_TITLE[view.phase]}</h3>
          {view.phase !== 'over' && (
            <span className="flex items-center gap-1.5 text-[13px] text-[#e9d3a8]">
              <Medal seat={seatOf(view.captain)} size={22} />
              Capitaine : <strong className="font-normal text-[#f6e3b8]">{nameOf(view.captain)}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[7px] flex items-center justify-between px-3">
        <ol className="flex items-center gap-1.5" aria-label={`Manche ${view.round} sur ${view.rounds}`}>
          {Array.from({ length: view.rounds }, (_, i) => {
            const n = i + 1;
            const past = n < view.round || view.phase === 'over';
            const now = n === view.round && view.phase !== 'over';
            return (
              <li
                key={n}
                className={past || now ? 'bt-coin' : ''}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  ...(past || now
                    ? { boxShadow: now ? '0 0 10px 2px rgba(255,214,120,.9)' : undefined }
                    : { background: '#1a0e06', boxShadow: 'inset 0 2px 3px rgba(0,0,0,.9), 0 1px 0 rgba(255,220,170,.15)' }),
                }}
              />
            );
          })}
        </ol>
        <span className="flex items-center gap-1 text-[#f3dcaa]" title="Trésors encore dans la cale du navire">
          <RichIcon name="open-treasure-chest" metal="gold" size={30} />
          <span className="bt-num text-lg">{view.deckLeft}</span>
        </span>
      </div>
    </header>
  );
}

// ───────── Le butin sur la toile ─────────

function itemText(item: LootItem): string {
  return item.kind === 'coin' ? `${item.value} doublons` : LOOT_LABEL[item.kind];
}

const ITEM_HINT: Record<LootItem['kind'], string> = {
  coin: 'Des pièces d’or sonnantes et trébuchantes.',
  pearl: `${PEARL_VALUE} doublons, et +${PEARL_BONUS} pour le plus gros collier.`,
  map: 'Rassemble les fragments : 5, 15, 30, 50… doublons.',
  rum: `Soigne une blessure, sinon vaut ${RUM_VALUE} doublons.`,
  powder: 'Une balle réelle de plus pour ton pistolet.',
  bicorne: 'Tu seras Capitaine à la manche suivante.',
};

const SHORT: Record<LootItem['kind'], string> = {
  coin: 'doublons',
  pearl: 'Perle',
  map: 'Carte',
  rum: 'Rhum',
  powder: 'Munitions',
  bicorne: 'Bicorne',
};

function Doubloons({ value, size = 38 }: { value: number; size?: number }) {
  const stack = value >= 20 ? 3 : value >= 10 ? 2 : 1;
  return (
    <span className="relative inline-block" style={{ width: size + (stack - 1) * 7, height: size + (stack - 1) * 4 }}>
      {Array.from({ length: stack }, (_, i) => (
        <span
          key={i}
          className="bt-coin"
          style={{ position: 'absolute', width: size, height: size, left: i * 7, top: (stack - 1 - i) * 4, fontSize: size * 0.48 }}
        >
          {i === stack - 1 ? value : ''}
        </span>
      ))}
    </span>
  );
}

function LootObject({ item, size = 54 }: { item: Pick<LootItem, 'kind' | 'value'>; size?: number }) {
  switch (item.kind) {
    case 'coin':
      return <Doubloons value={item.value ?? 5} size={size * 0.72} />;
    case 'pearl':
      return <RichIcon name="oyster-pearl" metal="bone" size={size} />;
    case 'map':
      return <RichIcon name="treasure-map" metal="bone" size={size} />;
    case 'rum':
      return <RichIcon name="brandy-bottle" metal="copper" size={size} />;
    case 'powder':
      return <RichIcon name="bullets" metal="brass" size={size} />;
    case 'bicorne':
      return <RichIcon name="pirate-hat" metal="iron" size={size} />;
  }
}

function Treasure({ view, actingAs, sendMove }: { view: PlunderView; actingAs: PlayerId | null; sendMove: (m: PlunderMove) => void }) {
  const myTurn = view.phase === 'loot' && actingAs !== null && view.picker === actingAs;
  return (
    <section className="bt-cloth" aria-label="Sur le pont">
      <div className="mb-1 flex items-baseline justify-between px-2">
        <h3 className="bt-title text-[1.55rem] text-[#3a2410] [text-shadow:0_1px_0_rgba(255,235,190,.55)]">Sur le pont</h3>
        <span className="bt-label">
          {view.board.length} trésor{view.board.length > 1 ? 's' : ''}
        </span>
      </div>
      {view.board.length === 0 ? (
        <p className="py-6 text-center italic text-[#3a2410]">Le pont est vide… pour l’instant.</p>
      ) : (
        <ul className="grid grid-cols-4 gap-y-2 sm:grid-cols-8">
          {view.board.map((item, i) => {
            const inner = (
              <>
                <span className="bt-obj grid h-[60px] place-items-center" style={{ animationDelay: `${(i % 4) * 0.5}s` }}>
                  <LootObject item={item} />
                </span>
                <span className="bt-label">{item.kind === 'coin' ? `${item.value} ${SHORT.coin}` : SHORT[item.kind]}</span>
              </>
            );
            return (
              <li key={i} className="flex justify-center">
                {myTurn ? (
                  <button
                    type="button"
                    className="bt-item bt-take"
                    onClick={() => sendMove({ type: 'take', index: i })}
                    aria-label={`Prendre : ${itemText(item)}`}
                    title={ITEM_HINT[item.kind]}
                  >
                    {inner}
                  </button>
                ) : (
                  <div className="bt-item" title={`${itemText(item)} — ${ITEM_HINT[item.kind]}`}>
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ───────── Rapport de la fusillade ─────────

function shotResult(s: Shot): { text: string; tone: string } {
  if (s.charge === 'wet') return { text: 'clic… à blanc', tone: 'text-[#9fb8c6] italic' };
  if (s.hit) return { text: 'PAN ! touché', tone: 'text-[#ff7b6b] font-bold' };
  return { text: 'PAN… dans le vide', tone: 'text-[#f3c75a]' };
}

function ShotReport({ view, nameOf, seatOf }: { view: PlunderView; nameOf: NameOf; seatOf: (id: PlayerId | null) => number }) {
  const divers = view.pirates.filter((p) => p.fled);
  return (
    <section className="mt-6 rounded-xl border border-[#3a2410] bg-black/45 p-3 backdrop-blur-[2px]">
      <h3 className="bt-title text-xl text-[#f0c35c]">{view.phase === 'prepare' ? 'La fusillade précédente' : 'La fusillade'}</h3>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {view.shots.map((s) => {
          const r = shotResult(s);
          return (
            <li key={s.shooter} className="flex items-center gap-1.5 rounded-lg bg-black/30 px-2 py-1">
              <Medal seat={seatOf(s.shooter)} size={26} />
              <RichIcon name="blunderbuss" metal="steel" size={24} />
              <Medal seat={seatOf(s.target)} size={26} />
              <span className="min-w-0 flex-1 truncate text-sm">
                {nameOf(s.shooter)} → {nameOf(s.target)}
              </span>
              <span className={`shrink-0 text-sm ${r.tone}`}>{r.text}</span>
            </li>
          );
        })}
      </ul>
      {view.phase !== 'prepare' && divers.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-[#cfae7c]">
          <RichIcon name="floor-hatch" metal="brass" size={20} /> Dans la cale : {divers.map((p) => p.name).join(', ')}
        </p>
      )}
    </section>
  );
}

// ───────── L'équipage ─────────

function Crew({ view, viewer, nameOf, seatOf }: { view: PlunderView; viewer: PlayerId | null; nameOf: NameOf; seatOf: (id: PlayerId | null) => number }) {
  const over = view.phase === 'over';
  const ranked = over ? [...view.pirates].sort((a, b) => Number(a.sunk) - Number(b.sunk) || b.score - a.score) : view.pirates;
  const showAims = view.phase === 'order' || view.phase === 'courage';
  return (
    <section className="mt-6 lg:mt-2">
      <h3 className="bt-title bt-gold mb-2 text-2xl">{over ? 'Le partage final' : 'L’équipage'}</h3>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {ranked.map((p, rank) => {
          const threat = showAims && !!viewer && p.aim === viewer;
          const turn = view.phase === 'loot' && view.picker === p.id;
          return (
            <li key={p.id} className={`bt-plaque bt-nails ${threat ? 'is-threat' : turn ? 'is-turn' : ''} ${p.sunk ? 'is-sunk' : ''}`}>
              <span className="bt-medal-abs">
                <Medal seat={seatOf(p.id)} captain={p.id === view.captain && !over} hurt={p.wounds > 0} sunk={p.sunk} />
                {over && !p.sunk && rank < 3 && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xl" aria-label={`${rank + 1}e place`}>
                    {['🥇', '🥈', '🥉'][rank]}
                  </span>
                )}
              </span>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`bt-title min-w-[3.5rem] truncate text-[1.4rem] text-[#f6e3b8] ${p.sunk ? 'line-through' : ''}`}>{p.name}</span>
                    {p.id === viewer && <span className="text-xs text-[#9fd3df]">(toi)</span>}
                    {p.isBot && <span className="text-xs text-[#c9ab7c]">· bot</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    {p.sunk ? (
                      <span className="bt-chip text-[#e7a097]">coulé par le fond</span>
                    ) : (
                      <span className="flex items-center gap-0.5" aria-label={`${MAX_WOUNDS - p.wounds} vie(s) sur ${MAX_WOUNDS}`}>
                        {Array.from({ length: MAX_WOUNDS }, (_, i) =>
                          i < MAX_WOUNDS - p.wounds ? <RichIcon key={i} name="hearts" metal="ruby" size={16} /> : <span key={i} className="bt-socket" />,
                        )}
                      </span>
                    )}
                    {!p.sunk && (
                      <span className="bt-chip" title="Balles restantes">
                        <RichIcon name="bullets" metal="brass" size={16} />×{p.charges}
                      </span>
                    )}
                    <Loot loot={p.loot} pearlLeader={view.pearlLeaders.includes(p.id)} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {p.id === view.captain && !over && <Ribbon icon="pirate-hat">Capitaine</Ribbon>}
                    {p.id === view.nextCaptain && <Ribbon icon="pirate-hat">prochain Capitaine</Ribbon>}
                    <Status view={view} p={p} />
                    {showAims && p.aim && !p.sunk && (
                      <span
                        className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs ${
                          threat ? 'border-[#ff8a7a] bg-[#a3241a] text-white' : 'border-[#f0c35c]/30 bg-black/35 text-[#f1dfb8]'
                        }`}
                      >
                        <RichIcon name="blunderbuss" metal="steel" size={16} />
                        <Medal seat={seatOf(p.aim)} size={16} />
                        {nameOf(p.aim)}
                        {threat ? ' (toi !)' : ''}
                        {view.order?.pirate === p.id ? ' · sur ordre' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="bt-num bt-gold text-[1.8rem] leading-none">{p.score}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[#cfae7c]">doublons</div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Ribbon({ icon, children, tone = 'gold' }: { icon?: GameIconName; children: ReactNode; tone?: 'gold' | 'green' | 'blue' | 'red' | 'dim' }) {
  const style = {
    gold: 'border-[#f0c35c]/45 text-[#f6dc95]',
    green: 'border-[#7fb36a]/50 text-[#bfe3a8]',
    blue: 'border-[#5aa2c0]/50 text-[#a8dcef]',
    red: 'border-[#e2604f]/60 text-[#ffb0a4]',
    dim: 'border-[#a88a5c]/35 text-[#cdb48a]',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border bg-black/35 px-1.5 py-0.5 text-xs ${style}`}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

function Status({ view, p }: { view: PlunderView; p: PirateView }) {
  if (p.sunk) return null;
  if (view.phase === 'prepare') return <Ribbon tone={p.prepared ? 'green' : 'dim'}>{p.prepared ? 'pistolet prêt' : 'charge son arme…'}</Ribbon>;
  if (view.phase === 'courage') return <Ribbon tone={p.decided ? 'green' : 'dim'}>{p.decided ? 'a décidé' : 'hésite…'}</Ribbon>;
  if (view.phase === 'loot') {
    if (p.fled) return <Ribbon tone="blue" icon="floor-hatch">dans la cale</Ribbon>;
    if (p.hit) return <Ribbon tone="red" icon="bandage-roll">touché</Ribbon>;
  }
  return null;
}

function Loot({ loot, pearlLeader }: { loot: LootItem[]; pearlLeader: boolean }) {
  const coins = loot.reduce((s, l) => s + (l.kind === 'coin' ? (l.value ?? 0) : 0), 0);
  const count = (k: LootItem['kind']) => loot.filter((l) => l.kind === k).length;
  const chips: { key: string; node: ReactNode; label: string; title: string }[] = [];
  if (coins) chips.push({ key: 'coin', node: <span className="bt-coin" style={{ width: 15, height: 15 }} />, label: `${coins}`, title: 'Doublons en pièces' });
  if (count('pearl'))
    chips.push({
      key: 'pearl',
      node: <RichIcon name="oyster-pearl" metal="bone" size={17} />,
      label: `×${count('pearl')}${pearlLeader ? ' ★' : ''}`,
      title: pearlLeader ? 'Plus gros collier de perles' : 'Perles',
    });
  if (count('map')) chips.push({ key: 'map', node: <RichIcon name="treasure-map" metal="bone" size={17} />, label: `×${count('map')}`, title: 'Fragments de carte' });
  if (count('rum')) chips.push({ key: 'rum', node: <RichIcon name="brandy-bottle" metal="copper" size={17} />, label: `×${count('rum')}`, title: 'Rhum' });
  return (
    <>
      {chips.map((c) => (
        <span key={c.key} className="bt-chip" title={c.title}>
          {c.node}
          {c.label}
        </span>
      ))}
    </>
  );
}

// ───────── Parchemin d'action ─────────

function Dock({
  view,
  actingAs,
  privateView,
  canAct,
  mode,
  nameOf,
  seatOf,
  sendMove,
}: {
  view: PlunderView;
  actingAs: PlayerId | null;
  privateView: boolean;
  canAct: boolean;
  mode: Props['mode'];
  nameOf: NameOf;
  seatOf: (id: PlayerId | null) => number;
  sendMove: (m: PlunderMove) => void;
}) {
  const afloat = view.pirates.filter((p) => !p.sunk);
  const call = (rest: string) => (mode === 'hotseat' && actingAs ? `${nameOf(actingAs)}, ${rest}` : rest.charAt(0).toUpperCase() + rest.slice(1));

  if (view.phase === 'prepare' && canAct && privateView && view.me) {
    if (view.me.prepared) {
      const c = CHARGE_TEXT[view.me.prepared.charge];
      return (
        <Note icon="blunderbuss">
          {c.title}, braqué sur <strong>{nameOf(view.me.prepared.target)}</strong>. Les autres chargent encore… (
          {afloat.filter((p) => p.prepared).length}/{afloat.length})
        </Note>
      );
    }
    return <Prepare view={view} me={view.me} seatOf={seatOf} sendMove={sendMove} />;
  }
  if (view.phase === 'order' && canAct && actingAs === view.captain) {
    return <CaptainOrder view={view} nameOf={nameOf} seatOf={seatOf} sendMove={sendMove} />;
  }
  if (view.phase === 'courage' && canAct && view.config.courage === 'secret' && privateView) {
    if (view.me?.courage !== null && view.me?.courage !== undefined) {
      return <Note icon={view.me.courage ? 'floor-hatch' : 'crossed-sabres'}>{view.me.courage ? 'Tu plonges dans la cale.' : 'Tu tiens bon, sabre au clair.'} En attente des autres…</Note>;
    }
    return <Courage view={view} me={actingAs!} seatOf={seatOf} sendMove={sendMove} />;
  }
  if (view.phase === 'courage' && canAct && view.config.courage === 'table' && actingAs === view.reporter && view.toReport.length > 0) {
    return <ReportCowards view={view} nameOf={nameOf} seatOf={seatOf} sendMove={sendMove} />;
  }

  switch (view.phase) {
    case 'prepare':
      return <Note icon="blunderbuss">Chacun charge son pistolet et vise en secret… {afloat.filter((p) => p.prepared).length}/{afloat.length} prêts</Note>;
    case 'order':
      return <Note icon="pirate-hat">Le Capitaine {nameOf(view.captain)} peut forcer un pirate qui le vise à changer de cible.</Note>;
    case 'courage':
      return view.config.courage === 'table' ? (
        <Note icon="crossed-sabres">À trois, chacun annonce à voix haute : tenir bon ou plonger dans la cale !</Note>
      ) : (
        <Note icon="crossed-sabres">Tenir bon ou plonger dans la cale ? {afloat.filter((p) => p.decided).length}/{afloat.length} décidés</Note>
      );
    case 'loot':
      return view.picker === actingAs ? (
        <Note icon="open-treasure-chest" strong>
          {call('à toi de te servir : touche un trésor sur la toile.')}
        </Note>
      ) : (
        <Note icon="open-treasure-chest">
          <strong>{nameOf(view.picker)}</strong> se sert. Ordre : {view.pickers.map(nameOf).join(' → ')}
        </Note>
      );
    default:
      return <Note icon="open-treasure-chest">Fin du voyage : on compte les doublons !</Note>;
  }
}

function Note({ icon, children, strong = false }: { icon: GameIconName; children: ReactNode; strong?: boolean }) {
  return (
    <p className={`flex items-center gap-3 text-[1.02rem] ${strong ? 'font-bold text-[#7a1d14]' : ''}`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#7a1d14] shadow-[inset_0_-3px_0_rgba(0,0,0,.35),0_2px_4px_rgba(0,0,0,.4)]">
        <RichIcon name={icon} metal="gold" size={26} />
      </span>
      <span>{children}</span>
    </p>
  );
}

function Prepare({
  view,
  me,
  seatOf,
  sendMove,
}: {
  view: PlunderView;
  me: NonNullable<PlunderView['me']>;
  seatOf: (id: PlayerId | null) => number;
  sendMove: (m: PlunderMove) => void;
}) {
  const [charge, setCharge] = useState<Charge | null>(null);
  const [target, setTarget] = useState<PlayerId | null>(null);
  useEffect(() => {
    setCharge(null);
    setTarget(null);
  }, [view.round, me.id]);
  const targets = view.pirates.filter((p) => !p.sunk && p.id !== me.id);
  const left: Record<Charge, number> = { dry: me.dry, wet: me.wet };

  return (
    <div>
      <h4 className="bt-title text-center text-[1.7rem]">Charge ton pistolet et vise</h4>
      <div className="mt-3 flex justify-center gap-4 px-2">
        {(['dry', 'wet'] as const).map((k) => {
          const c = CHARGE_TEXT[k];
          return (
            <button
              key={k}
              type="button"
              className="bt-card"
              aria-pressed={charge === k}
              aria-label={`${c.title} : ${c.hint}, reste ${left[k]}`}
              disabled={left[k] === 0}
              onClick={() => {
                sfx.click();
                setCharge(k);
              }}
            >
              <span className="bt-corner left-3 top-3">{left[k]}</span>
              <span className="bt-corner bottom-3 right-3 rotate-180">{left[k]}</span>
              <span className="absolute inset-x-0 top-[15%] flex justify-center">
                <span className="relative">
                  <RichIcon name="crossed-pistols" metal="steel" size={84} />
                  <span className="absolute -bottom-2 -right-3">
                    <RichIcon name={c.icon} metal={c.metal} size={40} />
                  </span>
                </span>
              </span>
              <span className="absolute inset-x-3 bottom-[13%]">
                <span className="bt-title block text-[1.3rem] leading-tight text-[#7a1d14]">{c.title}</span>
                <span className="bt-muted block text-xs">
                  {c.hint} · {left[k]} en réserve
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="bt-muted mt-4 text-center text-sm italic">Qui vises-tu ?</div>
      <div className="mt-1 flex flex-wrap justify-center gap-1.5" role="radiogroup" aria-label="Cible">
        {targets.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={target === p.id}
            onClick={() => {
              sfx.click();
              setTarget(p.id);
            }}
            className="bt-pick relative"
          >
            <span className="relative">
              <Medal seat={seatOf(p.id)} size={48} captain={p.id === view.captain} hurt={p.wounds > 0} />
              {target === p.id && (
                <span className="pointer-events-none absolute -inset-2 grid place-items-center text-[#b3261e]">
                  <Icon name="crosshair" size={64} />
                </span>
              )}
            </span>
            <span className="bt-title text-lg leading-none">{p.name}</span>
            <span className="bt-muted text-[11px]">{p.score} doublons</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          className="bt-btn"
          disabled={!charge || !target}
          onClick={() => {
            if (!charge || !target) return;
            sfx.click(0, 0.4);
            sendMove({ type: 'prepare', charge, target });
          }}
        >
          Charger et viser
        </button>
      </div>
    </div>
  );
}

function PortraitPicker({
  items,
  value,
  onPick,
  label,
  view,
  seatOf,
}: {
  items: PirateView[];
  value: PlayerId | null;
  onPick: (id: PlayerId) => void;
  label: string;
  view: PlunderView;
  seatOf: (id: PlayerId | null) => number;
}) {
  return (
    <div className="mt-1 flex flex-wrap justify-center gap-1.5" role="radiogroup" aria-label={label}>
      {items.map((p) => (
        <button key={p.id} type="button" role="radio" aria-checked={value === p.id} onClick={() => onPick(p.id)} className="bt-pick">
          <Medal seat={seatOf(p.id)} size={44} captain={p.id === view.captain} hurt={p.wounds > 0} />
          <span className="bt-title text-lg leading-none">{p.name}</span>
        </button>
      ))}
    </div>
  );
}

function CaptainOrder({
  view,
  nameOf,
  seatOf,
  sendMove,
}: {
  view: PlunderView;
  nameOf: NameOf;
  seatOf: (id: PlayerId | null) => number;
  sendMove: (m: PlunderMove) => void;
}) {
  const aimers = view.pirates.filter((p) => !p.sunk && p.aim === view.captain);
  const [pirate, setPirate] = useState<PlayerId | null>(null);
  const [target, setTarget] = useState<PlayerId | null>(null);
  const targets = view.pirates.filter((p) => !p.sunk && p.id !== pirate && p.id !== view.captain);
  return (
    <div>
      <h4 className="bt-title text-center text-[1.7rem]">Ordre du Capitaine</h4>
      <p className="bt-muted text-center text-sm italic">Des pirates te visent ! Lequel doit changer de cible ?</p>
      <PortraitPicker items={aimers} value={pirate} onPick={setPirate} label="Pirate" view={view} seatOf={seatOf} />
      {pirate && (
        <>
          <p className="bt-muted mt-3 text-center text-sm italic">Nouvelle cible pour {nameOf(pirate)} :</p>
          <PortraitPicker items={targets} value={target} onPick={setTarget} label="Nouvelle cible" view={view} seatOf={seatOf} />
        </>
      )}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className="bt-btn"
          disabled={!pirate || !target}
          onClick={() => pirate && target && sendMove({ type: 'order', pirate, target })}
        >
          {pirate && target ? `Ordonner : ${nameOf(pirate)} vise ${nameOf(target)}` : 'Choisis un pirate et une cible'}
        </button>
        <button type="button" className="bt-btn2" onClick={() => sendMove({ type: 'order' })}>
          Laisser faire
        </button>
      </div>
    </div>
  );
}

function Courage({ view, me, seatOf, sendMove }: { view: PlunderView; me: PlayerId; seatOf: (id: PlayerId | null) => number; sendMove: (m: PlunderMove) => void }) {
  const threats = view.pirates.filter((p) => !p.sunk && p.aim === me);
  const choice = (flee: boolean, title: string, icon: GameIconName, metal: Metal, hint: string) => (
    <button
      type="button"
      className="bt-card"
      aria-label={title}
      onClick={() => {
        sfx.click();
        if (flee) sfx.splash(0.1);
        sendMove({ type: 'courage', flee });
      }}
    >
      <span className="absolute inset-x-0 top-[16%] flex justify-center">
        <RichIcon name={icon} metal={metal} size={86} />
      </span>
      <span className="absolute inset-x-3 bottom-[13%]">
        <span className="bt-title block text-[1.3rem] leading-tight text-[#7a1d14]">{title}</span>
        <span className="bt-muted block text-xs">{hint}</span>
      </span>
    </button>
  );
  return (
    <div>
      <h4 className="bt-title text-center text-[1.7rem]">
        {threats.length ? `${threats.length} pistolet${threats.length > 1 ? 's' : ''} te visent !` : 'Personne ne te vise'}
      </h4>
      {threats.length > 0 && (
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {threats.map((p) => (
            <span key={p.id} className="flex items-center gap-1 rounded-full bg-[#7a1d14]/15 py-0.5 pl-0.5 pr-2 text-sm">
              <Medal seat={seatOf(p.id)} size={26} />
              <RichIcon name="blunderbuss" metal="steel" size={22} />
              {p.name}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex justify-center gap-4 px-2">
        {choice(false, 'Tenir bon', 'crossed-sabres', 'gold', 'tu prendras ta part… si tu survis')}
        {choice(true, 'Plonger dans la cale', 'floor-hatch', 'brass', 'à l’abri, mais rien pour toi')}
      </div>
    </div>
  );
}

function ReportCowards({ view, nameOf, seatOf, sendMove }: { view: PlunderView; nameOf: NameOf; seatOf: (id: PlayerId | null) => number; sendMove: (m: PlunderMove) => void }) {
  const [fled, setFled] = useState<PlayerId[]>([]);
  useEffect(() => setFled([]), [view.round]);
  const toggle = (id: PlayerId) => setFled((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  return (
    <div>
      <h4 className="bt-title text-center text-[1.7rem]">Qui a plongé dans la cale ?</h4>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {view.toReport.map((id) => (
          <button key={id} type="button" aria-pressed={fled.includes(id)} onClick={() => toggle(id)} className="bt-pick">
            <span className="relative">
              <Medal seat={seatOf(id)} size={44} />
              {fled.includes(id) && (
                <span className="absolute -bottom-1 -right-1">
                  <RichIcon name="floor-hatch" metal="brass" size={22} />
                </span>
              )}
            </span>
            <span className="bt-title text-lg leading-none">{nameOf(id)}</span>
            <span className="bt-muted text-[11px]">{fled.includes(id) ? 'a plongé' : 'tient bon'}</span>
          </button>
        ))}
      </div>
      <p className="bt-muted mt-1 text-center text-xs italic">Les bots ont déjà décidé en secret.</p>
      <div className="mt-3 flex justify-center">
        <button type="button" className="bt-btn" onClick={() => sendMove({ type: 'cowards', fled })}>
          Feu !
        </button>
      </div>
    </div>
  );
}

// ───────── La fusillade, plein écran ─────────

function Gunfight({
  shots,
  divers,
  nameOf,
  seatOf,
  captain,
  onDone,
}: {
  shots: Shot[];
  divers: PlayerId[];
  nameOf: NameOf;
  seatOf: (id: PlayerId | null) => number;
  captain: PlayerId;
  onDone: () => void;
}) {
  /** -1 : plongeons, puis un tir après l'autre. */
  const [step, setStep] = useState(-1);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (step === -1) {
      divers.forEach((_, k) => sfx.splash(k * 0.15));
      t = setTimeout(() => setStep(0), divers.length ? 1100 : 250);
    } else if (step < shots.length) {
      const s = shots[step]!;
      if (s.charge === 'wet') sfx.blank(0.35);
      else sfx.bang(0.35, s.hit ? 0.75 : 0.45);
      t = setTimeout(() => setStep(step + 1), 1250);
    } else {
      t = setTimeout(onDone, 300);
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const shot = step >= 0 ? shots[step] : undefined;
  return (
    <div className="bt-fight" onClick={onDone} role="dialog" aria-label="La fusillade">
      <div className="flex w-full flex-col items-center gap-6 px-4 text-center text-[#f4e6c4] [font-family:'Bt_Digits','IM_Fell_English',Georgia,serif]">
        {!shot ? (
          <div className="bt-bang">
            <div className="bt-title bt-gold text-5xl">Feu !</div>
            {divers.length > 0 && (
              <p className="mt-4 flex items-center justify-center gap-2 text-lg text-[#cfe6f0]">
                <RichIcon name="water-splash" metal="silver" size={34} />
                {divers.map(nameOf).join(', ')} plonge{divers.length > 1 ? 'nt' : ''} dans la cale !
              </p>
            )}
          </div>
        ) : (
          <div key={step} className={shot.hit ? 'bt-shake' : ''}>
            <div className="flex items-center justify-center gap-3 sm:gap-6">
              <div className="flex flex-col items-center gap-2">
                <Medal seat={seatOf(shot.shooter)} size={86} captain={shot.shooter === captain} />
                <span className="bt-title text-2xl text-[#f6e3b8]">{nameOf(shot.shooter)}</span>
              </div>
              <div className="relative">
                <span className="bt-recoil inline-block">
                  <RichIcon name="blunderbuss" metal="steel" size={110} />
                </span>
                {shot.charge === 'wet' ? <span className="bt-smoke" /> : <span className="bt-flash" />}
              </div>
              <div className="flex flex-col items-center gap-2">
                <Medal seat={seatOf(shot.target)} size={86} captain={shot.target === captain} hurt={shot.hit} />
                <span className="bt-title text-2xl text-[#f6e3b8]">{nameOf(shot.target)}</span>
              </div>
            </div>
            <div className="bt-bang mt-6">
              {shot.charge === 'wet' ? (
                <span className="bt-title text-5xl text-[#b9c9d3]">Clic… à blanc</span>
              ) : shot.hit ? (
                <span className="bt-title text-7xl text-[#ff5a3d] [text-shadow:0_0_30px_rgba(255,120,40,.8),0_4px_0_#4a0d06]">PAN !</span>
              ) : (
                <span className="bt-title text-5xl text-[#f3c75a]">PAN… dans le vide</span>
              )}
            </div>
          </div>
        )}
        <div className="flex gap-1.5" aria-hidden>
          {shots.map((_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i <= step ? 'bg-[#f0c35c]' : 'bg-white/20'}`} />
          ))}
        </div>
        <span className="text-xs uppercase tracking-[0.3em] text-white/50">toucher pour passer</span>
      </div>
    </div>
  );
}

// ───────── Journal de bord ─────────

function Journal({ lines }: { lines: string[] }) {
  const recent = lines.slice(-8).reverse();
  return (
    <details className="mt-6 rounded-xl border border-[#3a2410] bg-black/40 px-4 py-2.5 text-[0.95rem] backdrop-blur-[2px]">
      <summary className="bt-title cursor-pointer select-none text-xl text-[#f0c35c]">Journal de bord</summary>
      <ol className="mt-1 flex flex-col gap-1">
        {recent.map((line, i) => (
          <li key={lines.length - i} className={i === 0 ? 'text-[#f6e3b8]' : 'text-[#c9ab7c]'}>
            {line}
          </li>
        ))}
      </ol>
    </details>
  );
}
