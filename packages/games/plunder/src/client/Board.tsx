'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
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
} from '../shared';
import { Avatar, Burst, Chest, Hatch, Heart, LootIcon, Pistol, PowderHorn, Sabers, Skull, Waves } from './art';
import { bang, clink, fanfare, fizzle, setSoundEnabled, soundEnabled, splash } from './sound';

type Props = BoardProps<PlunderView, PlunderMove>;
type NameOf = (id: PlayerId | null) => string;

/** Ambiance : bois du pont, parchemin, laiton, mer de nuit. Polices d'époque (repli sur une serif si hors ligne). */
const THEME = `
@import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Pirata+One&display=swap');
.pl-root{position:relative;display:flex;flex-direction:column;gap:14px;padding:12px 12px 0;border-radius:24px;overflow:hidden;color:#f3e2bf;
  background:radial-gradient(120% 55% at 50% 0%,#1a5268 0%,#0c2a39 45%,#06131b 100%);box-shadow:inset 0 0 0 2px #24566a,0 18px 50px rgba(0,0,0,.5)}
.pl-title{font-family:'Pirata One','IM Fell English',Georgia,serif;letter-spacing:.03em;font-weight:400;line-height:1.05}
.pl-fell{font-family:'IM Fell English',Georgia,'Times New Roman',serif}
.pl-parch{color:#3b2a14;border-radius:14px;border:1px solid #b28a46;
  background:radial-gradient(120% 90% at 20% 10%,#fbf0d2 0%,#efd9a6 55%,#d6b574 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 0 28px rgba(120,80,20,.38),0 6px 18px rgba(0,0,0,.45)}
.pl-parch .pl-muted{color:#7a5b30}
.pl-deck{position:relative;border-radius:18px;border:5px solid #2a180c;background-color:#5c3a20;
  background-image:repeating-linear-gradient(180deg,rgba(0,0,0,.45) 0 2px,transparent 2px 46px),
    repeating-linear-gradient(90deg,rgba(255,236,200,.035) 0 2px,transparent 2px 9px),linear-gradient(180deg,#6e4626,#4a2d17);
  box-shadow:inset 0 0 50px rgba(0,0,0,.65),0 8px 24px rgba(0,0,0,.5)}
.pl-wood{color:#f3e2bf;border-radius:14px;border:1px solid #6b4a2a;background:linear-gradient(180deg,#43291a,#2b190c);
  box-shadow:inset 0 1px 0 rgba(255,220,160,.12),0 4px 12px rgba(0,0,0,.35)}
.pl-wood .pl-muted{color:#c9ab7c}
.pl-gold{color:#f3c75a}
.pl-token{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;width:100%;border-radius:14px;padding:6px 2px 5px;
  background:radial-gradient(circle at 50% 40%,rgba(255,230,170,.13),rgba(0,0,0,.28));transition:transform .15s}
.pl-token svg{filter:drop-shadow(0 3px 2px rgba(0,0,0,.6))}
.pl-bob{animation:pl-bob 3.4s ease-in-out infinite}
.pl-take{cursor:pointer;outline:2px solid rgba(243,199,90,.75);animation:pl-glow 1.6s ease-in-out infinite}
.pl-take:hover{transform:translateY(-3px) scale(1.05)}
.pl-take:focus-visible{outline:3px solid #fff}
.pl-btn{font-family:'Pirata One','IM Fell English',Georgia,serif;letter-spacing:.04em;font-size:1.2rem;border-radius:12px;padding:.6rem 1rem;
  color:#2b1a0e;border:1px solid #7a520b;background:linear-gradient(180deg,#f7d77a,#c9922b);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 3px 0 #6f4a08,0 6px 14px rgba(0,0,0,.35);transition:transform .1s,filter .1s}
.pl-btn:hover{filter:brightness(1.08)}.pl-btn:active{transform:translateY(2px)}
.pl-btn:disabled{opacity:.45;filter:grayscale(.4);cursor:not-allowed}
.pl-btn2{font-family:'IM Fell English',Georgia,serif;border-radius:12px;padding:.55rem 1rem;color:#f3e2bf;border:1px solid #b8862f;background:linear-gradient(180deg,#4a2d17,#2d1a0c)}
.pl-btn2:hover{border-color:#f3c75a}
.pl-btn2.pl-title{font-family:'Pirata One','IM Fell English',Georgia,serif}
.pl-num{font-family:'IM Fell English',Georgia,serif;font-weight:700;font-variant-numeric:lining-nums tabular-nums}
.pl-choice{border-radius:14px;border:2px solid #8b6a33;background:rgba(255,248,225,.45);transition:transform .12s,box-shadow .12s}
.pl-choice:hover:not(:disabled){transform:translateY(-2px)}
.pl-choice[aria-pressed=true],.pl-choice[aria-checked=true]{border-color:#7a1d14;background:rgba(255,236,190,.9);box-shadow:0 0 0 3px rgba(179,38,30,.35)}
.pl-choice:disabled{opacity:.4}
.pl-danger{box-shadow:0 0 0 2px #d23a2e,0 0 18px rgba(210,58,46,.55)}
.pl-turn{box-shadow:0 0 0 2px #f3c75a,0 0 16px rgba(243,199,90,.45)}
.pl-sunk{filter:grayscale(1) brightness(.75)}
.pl-pop{animation:pl-pop .55s cubic-bezier(.2,.9,.3,1.35) both}
.pl-rise{animation:pl-rise .45s ease-out both}
@keyframes pl-rise{from{transform:translateY(8px);opacity:0}to{transform:none;opacity:1}}
.pl-waves{animation:pl-waves 14s linear infinite}.pl-waves-slow{animation:pl-waves 9s linear infinite reverse}
.pl-flicker{animation:pl-flicker 1.2s infinite}
.pl-sway{animation:pl-sway 6s ease-in-out infinite;transform-origin:50% 100%}
@keyframes pl-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes pl-glow{0%,100%{box-shadow:0 0 8px rgba(243,199,90,.35)}50%{box-shadow:0 0 22px rgba(243,199,90,.8)}}
@keyframes pl-pop{0%{transform:scale(.2) rotate(-14deg);opacity:0}60%{transform:scale(1.15) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0)}}
@keyframes pl-waves{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes pl-flicker{0%,100%{opacity:1}40%{opacity:.55}60%{opacity:.9}}
@keyframes pl-sway{0%,100%{transform:rotate(-1.2deg)}50%{transform:rotate(1.2deg)}}
@media (prefers-reduced-motion:reduce){.pl-root *{animation:none!important;transition:none!important}}
`;

export default function PlunderBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const nameOf: NameOf = (id) => view.pirates.find((p) => p.id === id)?.name ?? '?';
  const privateView = viewer !== null && viewer === actingAs;
  const self = view.pirates.find((p) => p.id === actingAs);
  const canAct = !!self && !self.sunk;
  useSoundEffects(view);

  return (
    <div className="pl-root">
      <style href="arcade-plunder-theme" precedence="default">
        {THEME}
      </style>
      <Header view={view} nameOf={nameOf} />
      <Deck view={view} actingAs={actingAs} sendMove={sendMove} />
      <Instruction view={view} actingAs={actingAs} mode={mode} nameOf={nameOf} />

      {canAct && view.phase === 'prepare' && privateView && view.me && (
        <Prepare view={view} me={view.me} sendMove={sendMove} />
      )}
      {canAct && view.phase === 'order' && actingAs === view.captain && (
        <CaptainOrder view={view} nameOf={nameOf} sendMove={sendMove} />
      )}
      {canAct && view.phase === 'courage' && view.config.courage === 'secret' && privateView && (
        <Courage view={view} me={actingAs!} sendMove={sendMove} />
      )}
      {canAct &&
        view.phase === 'courage' &&
        view.config.courage === 'table' &&
        actingAs === view.reporter &&
        view.toReport.length > 0 && <ReportCowards view={view} nameOf={nameOf} sendMove={sendMove} />}
      {view.shots.length > 0 && <Shots view={view} nameOf={nameOf} />}

      <Crew view={view} viewer={viewer} nameOf={nameOf} />
      <Journal lines={view.log} />
      <Waves />
    </div>
  );
}

// ───────── Bruitages ─────────

/** Joue les sons des événements : tirs révélés, plongeons, butin ramassé, fin du voyage. */
function useSoundEffects(view: PlunderView): void {
  const prev = useRef<{ round: number; phase: string; board: number; shots: string } | null>(null);
  useEffect(() => {
    const shots = `${view.round}|${view.shots.map((s) => `${s.shooter}${s.charge}${s.hit}`).join(',')}`;
    const p = prev.current;
    if (p) {
      if (view.shots.length > 0 && view.phase !== 'prepare' && shots !== p.shots) {
        const divers = view.pirates.filter((x) => x.fled).length;
        for (let i = 0; i < divers; i++) splash(i * 0.12);
        view.shots.forEach((s, i) => {
          const at = 0.25 + i * 0.4;
          if (s.charge === 'wet') fizzle(at);
          else bang(at, s.hit ? 0.6 : 0.35);
        });
      }
      if (view.phase === 'loot' && p.phase === 'loot' && view.round === p.round && view.board.length < p.board) clink();
      if (view.phase === 'over' && p.phase !== 'over') fanfare();
    }
    prev.current = { round: view.round, phase: view.phase, board: view.board.length, shots };
  }, [view]);
}

function SoundToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(soundEnabled()), []);
  return (
    <button
      type="button"
      onClick={() => {
        setSoundEnabled(!on);
        setOn(!on);
      }}
      aria-label={on ? 'Couper le son' : 'Activer le son'}
      title={on ? 'Couper le son' : 'Activer le son'}
      className="grid h-8 w-8 place-items-center rounded-full border border-[#b28a46] bg-[#fff6dc]/60 text-base hover:bg-[#fff6dc]"
    >
      {on ? '🔊' : '🔇'}
    </button>
  );
}

// ───────── En-tête : le journal de bord ─────────

const PHASE_TITLE: Record<PlunderView['phase'], string> = {
  prepare: 'Chargez vos pistolets !',
  order: 'L’ordre du Capitaine',
  courage: 'Tenir bon ou plonger ?',
  loot: 'Le partage du butin',
  over: 'Le trésor est partagé',
};

function Header({ view, nameOf }: { view: PlunderView; nameOf: NameOf }) {
  return (
    <header className="pl-parch relative px-4 pb-3 pt-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="pl-fell pl-muted text-xs uppercase tracking-[0.2em]">
            {view.phase === 'over' ? 'Fin du voyage' : `Manche ${view.round} sur ${view.rounds}`}
          </div>
          <h3 className="pl-title text-[1.6rem] leading-tight text-[#7a1d14] sm:text-3xl">{PHASE_TITLE[view.phase]}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2" title={`Capitaine : ${nameOf(view.captain)}`}>
          <div className="pl-sway">
            <Avatar seed={view.captain} size={46} captain />
          </div>
          <div className="hidden text-right leading-tight min-[380px]:block">
            <div className="pl-fell pl-muted text-[10px] uppercase tracking-widest">Capitaine</div>
            <div className="pl-title max-w-[7rem] truncate text-lg">{nameOf(view.captain)}</div>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <ol className="flex flex-1 items-center gap-1" aria-label={`Manche ${view.round} sur ${view.rounds}`}>
          {Array.from({ length: view.rounds }, (_, i) => {
            const n = i + 1;
            const past = n < view.round || view.phase === 'over';
            const now = n === view.round && view.phase !== 'over';
            return (
              <li
                key={n}
                className={`h-2.5 flex-1 rounded-full border ${
                  past ? 'border-[#7a520b] bg-[#d9a53a]' : now ? 'border-[#7a1d14] bg-[#b3261e]' : 'border-[#b28a46] bg-transparent'
                }`}
              />
            );
          })}
        </ol>
        <SoundToggle />
        <div className="flex shrink-0 items-center gap-1" title="Objets encore dans la réserve">
          <Chest size={30} />
          <span className="pl-num text-lg">{view.deckLeft}</span>
        </div>
      </div>
    </header>
  );
}

// ───────── Le pont et son butin ─────────

function itemText(item: LootItem): string {
  return item.kind === 'coin' ? `${item.value} doublons` : LOOT_LABEL[item.kind];
}

const ITEM_HINT: Record<LootItem['kind'], string> = {
  coin: 'Des pièces d’or sonnantes et trébuchantes.',
  pearl: `${PEARL_VALUE} doublons, et +${PEARL_BONUS} pour le plus gros collier.`,
  map: 'Rassemble les fragments : 5, 15, 30, 50… doublons.',
  rum: `Soigne une blessure, sinon vaut ${RUM_VALUE} doublons.`,
  powder: 'Une charge de poudre sèche en plus.',
  bicorne: 'Tu seras Capitaine à la manche suivante.',
};

const SHORT: Record<LootItem['kind'], string> = {
  coin: 'doublons',
  pearl: 'Perle',
  map: 'Carte',
  rum: 'Rhum',
  powder: 'Poudre',
  bicorne: 'Bicorne',
};

function Deck({
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
    <section className={`pl-deck p-3 ${myTurn ? 'pl-turn' : ''}`} aria-label="Sur le pont">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="pl-title pl-gold text-xl drop-shadow">Sur le pont</span>
        <span className="pl-fell text-xs text-[#e9d3a8]">
          {view.board.length} trésor{view.board.length > 1 ? 's' : ''}
        </span>
      </div>
      {view.board.length === 0 ? (
        <p className="pl-fell py-4 text-center italic text-[#e9d3a8]">Le pont est vide… pour l’instant.</p>
      ) : (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {view.board.map((item, i) => {
            const inner = (
              <>
                <LootIcon item={item} size={46} />
                <span className="pl-fell max-w-full truncate text-[11px] leading-tight text-[#f6e6c4]">
                  {item.kind === 'coin' ? `${item.value} ${SHORT.coin}` : SHORT[item.kind]}
                </span>
              </>
            );
            const delay = { animationDelay: `${(i % 5) * 0.35}s` };
            return (
              <li key={i}>
                {myTurn ? (
                  <button
                    type="button"
                    onClick={() => sendMove({ type: 'take', index: i })}
                    aria-label={`Prendre : ${itemText(item)}`}
                    title={ITEM_HINT[item.kind]}
                    className="pl-token pl-take"
                  >
                    {inner}
                  </button>
                ) : (
                  <div className="pl-token pl-bob" style={delay} title={`${itemText(item)} — ${ITEM_HINT[item.kind]}`}>
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

function Instruction({
  view,
  actingAs,
  mode,
  nameOf,
}: {
  view: PlunderView;
  actingAs: PlayerId | null;
  mode: Props['mode'];
  nameOf: NameOf;
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
          ? call(view.captain, 'des pirates te visent ! Tu peux forcer l’un d’eux à viser ailleurs.')
          : `Le Capitaine ${nameOf(view.captain)} peut forcer un pirate qui le vise à changer de cible.`;
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
          ? call(view.picker, 'à toi de te servir : touche un trésor sur le pont.')
          : `${nameOf(view.picker)} se sert. Ordre : ${view.pickers.map(nameOf).join(' → ')}`;
      break;
    case 'over':
      text = 'Fin du voyage : on compte les doublons !';
      break;
  }
  return (
    <div className="pl-parch pl-fell flex items-center gap-3 px-4 py-2.5 text-[0.95rem]">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#8e1f16] text-[#f6d9a0] shadow-[inset_0_-2px_0_rgba(0,0,0,.35)]">
        <Skull size={18} />
      </span>
      <span>{text}</span>
    </div>
  );
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
      <Parchment title="Pistolet chargé">
        <p className="pl-fell text-[0.95rem]">
          Poudre {me.prepared.charge === 'dry' ? 'sèche : le coup partira' : 'mouillée : pschitt'}, braqué sur{' '}
          <strong>{t}</strong>. En attente des autres…
        </p>
      </Parchment>
    );
  }
  return (
    <Parchment title="Charge ton pistolet et vise">
      <div className="grid grid-cols-2 gap-2">
        <PowderChoice
          active={charge === 'dry'}
          disabled={me.dry === 0}
          onClick={() => setCharge('dry')}
          title="Poudre sèche"
          detail={`le coup part · reste ${me.dry}`}
          wet={false}
        />
        <PowderChoice
          active={charge === 'wet'}
          disabled={me.wet === 0}
          onClick={() => setCharge('wet')}
          title="Poudre mouillée"
          detail={`pschitt · reste ${me.wet}`}
          wet
        />
      </div>
      <div className="pl-fell pl-muted mt-3 text-sm italic">Qui vises-tu ?</div>
      <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Cible">
        {targets.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={target === p.id}
            onClick={() => setTarget(p.id)}
            className="pl-choice relative flex items-center gap-2 px-2 py-1.5 text-left"
          >
            <Avatar seed={p.id} size={38} captain={p.id === view.captain} hurt={p.wounds} />
            <span className="min-w-0">
              <span className="pl-title block truncate text-lg leading-none">{p.name}</span>
              <span className="pl-fell pl-muted text-xs">{p.score} doublons</span>
            </span>
            {target === p.id && <Crosshair />}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!charge || !target}
        onClick={() => charge && target && sendMove({ type: 'prepare', charge, target })}
        className="pl-btn mt-3 w-full sm:w-auto"
      >
        Charger et viser
      </button>
    </Parchment>
  );
}

function Crosshair() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" className="pl-pop absolute right-1.5 top-1.5" aria-hidden>
      <circle cx="12" cy="12" r="8" fill="none" stroke="#b3261e" strokeWidth="2" />
      <path d="M12 1 v6 M12 17 v6 M1 12 h6 M17 12 h6" stroke="#b3261e" strokeWidth="2" />
    </svg>
  );
}

function PowderChoice({
  active,
  disabled,
  onClick,
  title,
  detail,
  wet,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  title: string;
  detail: string;
  wet: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className="pl-choice flex items-center gap-2 px-2.5 py-2 text-left"
    >
      <span className="relative shrink-0">
        <LootIcon item={{ kind: 'powder' }} size={42} />
        {wet && (
          <svg viewBox="0 0 24 24" width="20" height="20" className="absolute -bottom-1 -right-1" aria-hidden>
            <path d="M12 2 C9 7 6 10 6 14 a6 6 0 0 0 12 0 C18 10 15 7 12 2 Z" fill="#4ea3c9" stroke="#1e5a7a" strokeWidth="1.2" />
          </svg>
        )}
      </span>
      <span className="min-w-0">
        <span className="pl-title block text-lg leading-none">{title}</span>
        <span className="pl-fell pl-muted text-xs">{detail}</span>
      </span>
    </button>
  );
}

// ───────── Ordre du Capitaine, courage ─────────

function CaptainOrder({
  view,
  nameOf,
  sendMove,
}: {
  view: PlunderView;
  nameOf: NameOf;
  sendMove: (m: PlunderMove) => void;
}) {
  const aimers = view.pirates.filter((p) => !p.sunk && p.aim === view.captain);
  const [pirate, setPirate] = useState<PlayerId | null>(null);
  const [target, setTarget] = useState<PlayerId | null>(null);
  const targets = view.pirates.filter((p) => !p.sunk && p.id !== pirate && p.id !== view.captain);
  return (
    <Parchment title="Ordre du Capitaine">
      <div className="pl-fell pl-muted text-sm italic">Quel pirate doit changer de cible ?</div>
      <PortraitChips items={aimers} value={pirate} onPick={setPirate} label="Pirate" captain={view.captain} />
      {pirate && (
        <>
          <div className="pl-fell pl-muted mt-3 text-sm italic">Nouvelle cible pour {nameOf(pirate)} :</div>
          <PortraitChips items={targets} value={target} onPick={setTarget} label="Nouvelle cible" captain={view.captain} />
        </>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={!pirate || !target}
          onClick={() => pirate && target && sendMove({ type: 'order', pirate, target })}
          className="pl-btn"
        >
          {pirate && target ? `Ordonner : ${nameOf(pirate)} vise ${nameOf(target)}` : 'Choisis un pirate et une cible'}
        </button>
        <button type="button" onClick={() => sendMove({ type: 'order' })} className="pl-btn2">
          Laisser faire
        </button>
      </div>
    </Parchment>
  );
}

function Courage({ view, me, sendMove }: { view: PlunderView; me: PlayerId; sendMove: (m: PlunderMove) => void }) {
  const threats = view.pirates.filter((p) => !p.sunk && p.aim === me);
  if (view.me?.courage !== null && view.me?.courage !== undefined) {
    return (
      <Parchment title="Décision prise">
        <p className="pl-fell text-[0.95rem]">
          {view.me.courage ? 'Tu plonges dans la cale.' : 'Tu tiens bon, sabre au clair.'} En attente des autres…
        </p>
      </Parchment>
    );
  }
  return (
    <Parchment
      title={threats.length ? `${threats.length} pistolet${threats.length > 1 ? 's' : ''} te visent !` : 'Personne ne te vise'}
      danger={threats.length > 0}
    >
      {threats.length > 0 && (
        <div className="-mt-1 mb-2 flex flex-wrap items-center gap-2">
          {threats.map((p) => (
            <span key={p.id} className="flex items-center gap-1 rounded-full bg-[#7a1d14]/15 py-0.5 pl-0.5 pr-2">
              <Avatar seed={p.id} size={26} captain={p.id === view.captain} hurt={p.wounds} />
              <Pistol size={26} color="#5b5b62" />
              <span className="pl-fell text-sm">{p.name}</span>
            </span>
          ))}
        </div>
      )}
      <p className="pl-fell pl-muted mb-3 text-sm italic">
        Plonger te met à l’abri, mais tu ne prendras rien cette manche et ton tir ne partira pas.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => sendMove({ type: 'courage', flee: false })}
          className="pl-btn flex flex-col items-center gap-1 py-3"
        >
          <Sabers size={34} />
          Tenir bon
        </button>
        <button
          type="button"
          onClick={() => sendMove({ type: 'courage', flee: true })}
          className="pl-btn2 pl-title flex flex-col items-center gap-1 py-3 text-[1.2rem]"
        >
          <Hatch size={34} />
          Plonger dans la cale
        </button>
      </div>
    </Parchment>
  );
}

function ReportCowards({ view, nameOf, sendMove }: { view: PlunderView; nameOf: NameOf; sendMove: (m: PlunderMove) => void }) {
  const [fled, setFled] = useState<PlayerId[]>([]);
  useEffect(() => setFled([]), [view.round]);
  const toggle = (id: PlayerId) => setFled((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  return (
    <Parchment title="Qui a plongé dans la cale ?">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {view.toReport.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={fled.includes(id)}
            onClick={() => toggle(id)}
            className="pl-choice flex items-center gap-2 px-2 py-1.5 text-left"
          >
            <Avatar seed={id} size={34} captain={id === view.captain} />
            <span className="min-w-0">
              <span className="pl-title block truncate text-lg leading-none">{nameOf(id)}</span>
              <span className="pl-fell pl-muted text-xs">{fled.includes(id) ? 'a plongé' : 'tient bon'}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="pl-fell pl-muted mt-2 text-xs italic">Les bots ont déjà décidé en secret.</p>
      <button type="button" onClick={() => sendMove({ type: 'cowards', fled })} className="pl-btn mt-3 w-full sm:w-auto">
        Feu !
      </button>
    </Parchment>
  );
}

// ───────── Les tirs ─────────

function Shots({ view, nameOf }: { view: PlunderView; nameOf: NameOf }) {
  const previous = view.phase === 'prepare';
  const divers = view.pirates.filter((p) => p.fled);
  return (
    <section className="pl-wood p-3">
      <h4 className="pl-title pl-gold text-xl">{previous ? 'Les tirs de la manche précédente' : 'Les tirs'}</h4>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {view.shots.map((s, i) => (
          <li
            key={s.shooter}
            className="pl-rise flex items-center gap-1.5 rounded-xl bg-black/25 px-2 py-1.5"
            style={{ animationDelay: `${i * 0.12}s` }}
          >
            <Avatar seed={s.shooter} size={30} captain={s.shooter === view.captain} />
            <Pistol size={28} />
            <Avatar seed={s.target} size={30} captain={s.target === view.captain} />
            <span className="pl-fell min-w-0 flex-1 truncate text-sm">
              {nameOf(s.shooter)} → {nameOf(s.target)}
            </span>
            {s.charge === 'wet' ? (
              <span className="pl-fell shrink-0 text-sm italic text-[#8fc6dc]">pschitt…</span>
            ) : s.hit ? (
              <span className="flex shrink-0 items-center" title="PAN ! touché">
                <Burst text="PAN !" size={46} />
                <span className="sr-only">PAN ! touché</span>
              </span>
            ) : (
              <span className="pl-fell shrink-0 text-sm text-[#f3c75a]">PAN… dans le vide</span>
            )}
          </li>
        ))}
      </ul>
      {!previous && divers.length > 0 && (
        <p className="pl-fell mt-2 flex items-center gap-1.5 text-sm text-[#c9ab7c]">
          <Hatch size={18} /> Dans la cale : {divers.map((p) => p.name).join(', ')}
        </p>
      )}
    </section>
  );
}

// ───────── L'équipage ─────────

function Crew({ view, viewer, nameOf }: { view: PlunderView; viewer: PlayerId | null; nameOf: NameOf }) {
  const ranked = [...view.pirates].sort((a, b) => Number(a.sunk) - Number(b.sunk) || b.score - a.score);
  const over = view.phase === 'over';
  const showAims = view.phase === 'order' || view.phase === 'courage';
  return (
    <section>
      <h4 className="pl-title pl-gold mb-2 text-xl">{over ? 'Le partage final' : 'L’équipage'}</h4>
      <ul className="grid gap-2 sm:grid-cols-2">
        {ranked.map((p, rank) => {
          const aimsAtViewer = showAims && !!viewer && p.aim === viewer;
          const isPicker = view.phase === 'loot' && view.picker === p.id;
          return (
            <li
              key={p.id}
              className={`pl-wood flex items-start gap-2.5 p-2.5 ${aimsAtViewer ? 'pl-danger' : isPicker ? 'pl-turn' : ''} ${
                p.sunk ? 'opacity-70' : ''
              }`}
            >
              <div className="relative shrink-0">
                <Avatar seed={p.id} size={54} captain={p.id === view.captain && !over} hurt={p.wounds} sunk={p.sunk} />
                {over && !p.sunk && rank < 3 && (
                  <span className="absolute -bottom-1 -right-1 text-xl" aria-label={`${rank + 1}e place`}>
                    {['🥇', '🥈', '🥉'][rank]}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className={`pl-title min-w-[4rem] truncate text-xl ${p.sunk ? 'line-through' : ''}`}>{p.name}</span>
                  {p.id === viewer && <span className="pl-fell text-xs text-[#9fd3df]">(toi)</span>}
                  {p.isBot && <span className="pl-fell pl-muted text-xs">· bot</span>}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {p.sunk ? (
                    <span className="pl-fell flex items-center gap-1 text-xs text-[#e7a097]">
                      <Skull size={14} /> coulé
                    </span>
                  ) : (
                    <span className="flex items-center" aria-label={`${MAX_WOUNDS - p.wounds} vie(s) sur ${MAX_WOUNDS}`}>
                      {Array.from({ length: MAX_WOUNDS }, (_, i) => (
                        <Heart key={i} full={i < MAX_WOUNDS - p.wounds} size={15} />
                      ))}
                    </span>
                  )}
                  {!p.sunk && (
                    <span className="pl-fell pl-muted flex items-center gap-0.5 text-xs" title="Charges de poudre restantes">
                      <PowderHorn size={15} />×{p.charges}
                    </span>
                  )}
                  <Treasure loot={p.loot} pearlLeader={view.pearlLeaders.includes(p.id)} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {p.id === view.captain && !over && <Tag tone="gold">Capitaine</Tag>}
                  {p.id === view.nextCaptain && <Tag tone="gold">🎩 prochain Capitaine</Tag>}
                  <Status view={view} p={p} />
                  {showAims && p.aim && !p.sunk && (
                    <span
                      className={`pl-fell flex items-center gap-1 rounded-full px-1.5 py-px text-xs ${
                        aimsAtViewer ? 'bg-[#b3261e] text-white' : 'bg-black/30 text-[#e9d3a8]'
                      }`}
                    >
                      <Pistol size={20} /> {nameOf(p.aim)}
                      {aimsAtViewer ? ' (toi !)' : ''}
                      {view.order?.pirate === p.id ? ' · sur ordre' : ''}
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="pl-num pl-gold text-2xl leading-none">{p.score}</div>
                <div className="pl-fell pl-muted text-[10px] uppercase tracking-wider">doublons</div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Status({ view, p }: { view: PlunderView; p: PirateView }) {
  if (p.sunk) return null;
  if (view.phase === 'prepare') return <Tag tone={p.prepared ? 'green' : 'dim'}>{p.prepared ? 'chargé' : 'charge…'}</Tag>;
  if (view.phase === 'courage') return <Tag tone={p.decided ? 'green' : 'dim'}>{p.decided ? 'a décidé' : 'hésite…'}</Tag>;
  if (view.phase === 'loot') {
    if (p.fled) return <Tag tone="blue">dans la cale</Tag>;
    if (p.hit) return <Tag tone="red">touché</Tag>;
  }
  return null;
}

function Treasure({ loot, pearlLeader }: { loot: LootItem[]; pearlLeader: boolean }) {
  const coins = loot.reduce((s, l) => s + (l.kind === 'coin' ? (l.value ?? 0) : 0), 0);
  const count = (k: LootItem['kind']) => loot.filter((l) => l.kind === k).length;
  const chips: { kind: LootItem['kind']; label: string; title: string }[] = [];
  if (coins) chips.push({ kind: 'coin', label: `${coins}`, title: `${coins} doublons en pièces` });
  if (count('pearl'))
    chips.push({ kind: 'pearl', label: `${count('pearl')}${pearlLeader ? '★' : ''}`, title: pearlLeader ? 'Plus gros collier de perles' : 'Perles' });
  if (count('map')) chips.push({ kind: 'map', label: `${count('map')}`, title: 'Fragments de carte' });
  if (count('rum')) chips.push({ kind: 'rum', label: `${count('rum')}`, title: 'Rhum' });
  return (
    <span className="flex items-center gap-1.5">
      {chips.map((c) => (
        <span key={c.kind} className="pl-fell flex items-center text-xs text-[#f6e6c4]" title={c.title}>
          <LootIcon item={{ kind: c.kind }} size={18} />
          {c.kind === 'coin' ? '' : '×'}
          {c.label}
        </span>
      ))}
    </span>
  );
}

function Tag({ children, tone }: { children: ReactNode; tone: 'gold' | 'green' | 'blue' | 'red' | 'dim' }) {
  const style = {
    gold: 'border-[#b8862f] text-[#f3c75a]',
    green: 'border-[#4f8a4f] text-[#a8d8a0]',
    blue: 'border-[#3f7f9a] text-[#9fd3df]',
    red: 'border-[#b3261e] text-[#ff9a8f]',
    dim: 'border-[#6b4a2a] text-[#c9ab7c]',
  }[tone];
  return <span className={`pl-fell rounded-full border px-1.5 py-px text-[11px] ${style}`}>{children}</span>;
}

function PortraitChips({
  items,
  value,
  onPick,
  label,
  captain,
}: {
  items: PirateView[];
  value: PlayerId | null;
  onPick: (id: PlayerId) => void;
  label: string;
  captain: PlayerId;
}) {
  return (
    <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={label}>
      {items.map((p) => (
        <button
          key={p.id}
          type="button"
          role="radio"
          aria-checked={value === p.id}
          onClick={() => onPick(p.id)}
          className="pl-choice flex items-center gap-2 px-2 py-1.5 text-left"
        >
          <Avatar seed={p.id} size={34} captain={p.id === captain} hurt={p.wounds} />
          <span className="pl-title truncate text-lg">{p.name}</span>
        </button>
      ))}
    </div>
  );
}

function Parchment({ title, danger = false, children }: { title: string; danger?: boolean; children: ReactNode }) {
  return (
    <section className={`pl-parch animate-pop p-4 ${danger ? 'pl-danger' : ''}`}>
      <h4 className="pl-title mb-3 text-2xl text-[#7a1d14]">{title}</h4>
      {children}
    </section>
  );
}

function Journal({ lines }: { lines: string[] }) {
  const recent = lines.slice(-8).reverse();
  return (
    <details className="pl-parch px-4 py-2.5">
      <summary className="pl-title cursor-pointer select-none text-lg text-[#7a1d14]">Journal de bord</summary>
      <ol className="pl-fell mt-1 flex flex-col gap-1 text-[0.95rem]">
        {recent.map((line, i) => (
          <li key={lines.length - i} className={i === 0 ? '' : 'pl-muted'}>
            {line}
          </li>
        ))}
      </ol>
    </details>
  );
}
