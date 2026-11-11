'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import { Avatar, Cinematic, RichIcon, RoundTable, sfx, useAmbient, useMediaQuery, useOnChange, type GameIconName } from '@arcade/tabletop';
import { CUPS_RULES, FACES, FACE_NAME, bidText, countFace, minQuantity, wild, type CupsMove, type CupsPlayerView, type CupsView, type Face, type Reveal } from '../shared';
import { CUPS_CSS } from './theme';
import { Vault } from './vault';

export { skin } from './skin';

type Props = BoardProps<CupsView, CupsMove>;
type NameOf = (id: PlayerId | null) => string;

export default function CupsBoard({ view, viewer, actingAs, mode, sendMove }: Props) {
  const nameOf: NameOf = (id) => view.players.find((p) => p.id === id)?.name ?? '?';
  const me = view.me && view.me.id === viewer ? view.me : null;
  const privateView = viewer !== null && viewer === actingAs;
  const actor = view.players.find((p) => p.id === actingAs);
  const hotseatName = mode === 'hotseat' && actor ? `${actor.name}, ` : '';
  const wide = useMediaQuery('(min-width: 1024px)');
  useAmbient('hearth');
  const [rulesOpen, setRulesOpen] = useState(false);
  const openRules = () => {
    sfx.click();
    setRulesOpen(true);
  };

  // Nouvelle manche : on secoue les gobelets.
  const [shake, setShake] = useState(0);
  useOnChange(view.round, () => {
    sfx.dice(0, 0.7);
    setShake((n) => n + 1);
  });
  useOnChange(view.history.length, (prev) => {
    if (view.history.length > prev) sfx.knock(0, 0.35);
  });
  // Gobelets levés : on crie, on frappe la table.
  const shout = useRef('');
  if (view.reveal) shout.current = `${view.round}-${view.reveal.caller}-${view.reveal.call}`;
  useOnChange(view.phase, (prev) => {
    if (view.phase === 'reveal' || (view.phase === 'over' && prev === 'bid')) {
      sfx.knock(0, 0.6);
      sfx.knock(0.15, 0.6);
      sfx.drum(0.45, 1);
    }
  });

  let action: ReactNode = null;
  if (view.phase === 'bid' && actor && !actor.out && actingAs === view.active && privateView && me)
    action = <BidPanel view={view} title={`${hotseatName}à toi d’enchérir`} sendMove={sendMove} />;
  else if (view.reveal && view.phase !== 'bid')
    action = <RevealPanel view={view} reveal={view.reveal} nameOf={nameOf} canContinue={view.phase === 'reveal' && actingAs === view.starter} onNext={() => sendMove({ type: 'next' })} />;

  return (
    <div className="go">
      <style href="arcade-cups-v1" precedence="default">
        {CUPS_CSS}
      </style>
      <div className="go-wall" />
      <Vault />
      <div className="go-light" />

      <header className="relative px-3 pt-[3.6rem] text-center sm:pt-4">
        <div className="go-sign">
          <span className="flex items-center gap-2">
            <RichIcon name="beer-stein" metal="brass" size={wide ? 34 : 26} />
            <span className="go-title go-amber text-[2rem] leading-none sm:text-[2.5rem]">Gobelets</span>
            <RichIcon name="rolling-dice-cup" metal="copper" size={wide ? 34 : 26} />
          </span>
          <span className="meta mt-1 flex gap-4">
            <span>
              <span>Manche</span> <strong className="go-num text-[16px] text-[#efe6d6]">{view.round}</strong>
            </span>
            <span>
              <strong className="go-num text-[16px] text-[#f2c27a]">{view.totalDice}</strong> dés en jeu
            </span>
          </span>
        </div>
        <div className="mt-3 flex justify-center">
          <button type="button" className="go-rulesbtn" onClick={openRules} aria-haspopup="dialog">
            <BookIcon />
            Règles
          </button>
        </div>
      </header>
      <div className="mx-auto w-[min(1240px,calc(100%-20px))]">
        <Instruction {...instructionFor(view, actingAs, privateView, mode, nameOf)} />
        {view.dry && view.phase === 'bid' && (
          <div className="go-dry">Manche sèche : les As ne sont pas jokers{view.bid ? ` et la valeur reste ${FACE_NAME[view.bid.face]}` : ''}.</div>
        )}
      </div>

      <div className="mx-auto mt-4 grid w-[min(1240px,calc(100%-20px))] gap-x-6 gap-y-4 pb-16 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
          {me && privateView && view.phase === 'bid' && <MyCup dice={me.dice} view={view} shake={shake} />}
          {action}
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Tavern view={view} viewer={viewer} wide={wide} nameOf={nameOf} shake={shake} />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-2">
          {view.phase === 'bid' && view.history.length > 1 && <Bids view={view} nameOf={nameOf} />}
          <Reference view={view} onOpen={openRules} />
          <Journal lines={view.log} open={wide} />
        </div>
      </div>

      <Cinematic trigger={shout.current || 'calm'} onMount={false} duration={2200}>
        {view.reveal && <ShoutBanner reveal={view.reveal} nameOf={nameOf} />}
      </Cinematic>
      <RulesCodex open={rulesOpen} onClose={() => setRulesOpen(false)} view={view} />
    </div>
  );
}

// ───────── Dés ─────────

const PIPS: Record<Face, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ face, size = 40, hit = false, dim = false, roll = false, delay = 0 }: { face: Face; size?: number; hit?: boolean; dim?: boolean; roll?: boolean; delay?: number }) {
  return (
    <span
      role="img"
      aria-label={FACE_NAME[face]}
      className={`go-die ${face === 1 ? 'ace' : ''} ${hit ? 'hit' : ''} ${dim ? 'dim' : ''} ${roll ? 'go-roll' : ''}`}
      style={{ width: size, height: size, padding: size * 0.14, '--pip': `${Math.max(3, size * (face === 1 ? 0.26 : 0.18))}px`, animationDelay: `${delay}s` } as CSSProperties}
    >
      {Array.from({ length: 9 }, (_, i) => (PIPS[face].includes(i) ? <i key={i} style={{ gridArea: `${Math.floor(i / 3) + 1} / ${(i % 3) + 1}` }} /> : null))}
    </span>
  );
}

// ───────── Consigne ─────────

function instructionFor(view: CupsView, actingAs: PlayerId | null, privateView: boolean, mode: Props['mode'], nameOf: NameOf): { icon: GameIconName; mine: boolean; text: ReactNode } {
  const you = (rest: string) => (mode === 'hotseat' && actingAs ? `${nameOf(actingAs)}, ${rest}` : rest.charAt(0).toUpperCase() + rest.slice(1));
  if (view.phase === 'bid') {
    const mine = actingAs === view.active && privateView;
    if (!view.bid)
      return mine
        ? { icon: 'rolling-dice-cup', mine: true, text: you('ouvre la manche : annonce combien de dés d’une valeur il y a sous TOUS les gobelets.') }
        : { icon: 'rolling-dice-cup', mine: false, text: `${nameOf(view.active)} ouvre la manche avec une première enchère.` };
    return mine
      ? {
          icon: 'rolling-dice-cup',
          mine: true,
          text: you(`${nameOf(view.bid.by)} annonce ${bidText(view.bid)}. Monte l’enchère, ou crie « Menteur ! »${view.config.exact ? ' ou « Pile ! »' : ''}.`),
        }
      : { icon: 'rolling-dice-cup', mine: false, text: `${nameOf(view.active)} doit surenchérir sur ${bidText(view.bid)}… ou crier « Menteur ! ».` };
  }
  if (view.phase === 'reveal') return { icon: 'hand', mine: false, text: 'Gobelets levés ! Regardez les dés sur la table avant la manche suivante.' };
  return { icon: 'beer-stein', mine: false, text: `${nameOf(view.winner)} est le dernier à garder des dés : tournée générale !` };
}

function Instruction({ icon, mine, text }: { icon: GameIconName; mine: boolean; text: ReactNode }) {
  return (
    <div className={`go-call ${mine ? 'is-mine' : ''}`}>
      <span className="ic">
        <RichIcon name={icon} metal="gold" size={26} />
      </span>
      <p>{text}</p>
    </div>
  );
}

// ───────── La table de la taverne ─────────

function Tavern({ view, viewer, wide, nameOf, shake }: { view: CupsView; viewer: PlayerId | null; wide: boolean; nameOf: NameOf; shake: number }) {
  // La table (un dessus de tonneau) déborde un peu l'anneau des places : les gobelets sont posés dessus.
  // Plus il y a de monde, plus elle s'agrandit.
  const crowded = view.players.length >= 6;
  return (
    <section className="relative py-6 lg:py-5" aria-label="La table">
      <h3 className="sr-only">La table</h3>
      <RoundTable
        ids={view.players.map((p) => p.id)}
        me={viewer}
        seat={wide ? { w: 132, h: 166 } : { w: 88, h: 132 }}
        className={wide ? `aspect-[1.3] max-h-[calc(100dvh-140px)] ${crowded ? 'min-h-[600px]' : 'min-h-[520px]'}` : crowded ? 'aspect-[0.76]' : 'aspect-[0.84]'}
        under={<div className="go-table" />}
        center={<Slate view={view} nameOf={nameOf} />}
        renderSeat={(id) => {
          const p = view.players.find((x) => x.id === id)!;
          return <Seat p={p} view={view} viewer={viewer} wide={wide} shake={shake} />;
        }}
      />
    </section>
  );
}

function Seat({ p, view, viewer, wide, shake }: { p: CupsPlayerView; view: CupsView; viewer: PlayerId | null; wide: boolean; shake: number }) {
  const last = view.phase === 'bid' ? [...view.history].reverse().find((b) => b.by === p.id) : undefined;
  const revealed = view.phase !== 'bid' ? view.reveal?.dice[p.id] : undefined;
  const bid = view.reveal?.bid;
  const hit = (d: Face) => !!bid && (d === bid.face || (d === 1 && wild(bid.face, view.reveal!.dry)));
  const cup = wide ? 58 : 44;
  const face = wide ? 56 : 40;
  const tiny = wide ? 18 : 14;
  let chip: { text: string; tone: string } | null = null;
  if (p.out) chip = { text: 'éliminé', tone: 'dim' };
  else if (p.id === view.winner) chip = { text: 'vainqueur', tone: 'green' };
  else if (view.reveal && view.phase === 'reveal' && view.reveal.loser === p.id) chip = { text: '−1 dé', tone: 'red' };
  else if (view.reveal && view.phase === 'reveal' && view.reveal.gainer === p.id) chip = { text: '+1 dé', tone: 'green' };
  else if (p.id === view.active && view.phase === 'bid') chip = { text: 'enchérit…', tone: 'gold' };
  return (
    <div className={`go-seat ${p.id === view.active && view.phase === 'bid' ? 'is-active' : ''} ${p.id === viewer ? 'is-me' : ''} ${p.out ? 'is-out' : ''}`} style={{ width: wide ? 132 : 88 }}>
      {chip && <span className={`go-chip tone-${chip.tone}`}>{chip.text}</span>}
      <span className="relative flex items-end justify-center" style={{ height: cup * 1.05 }}>
        <span className="go-mug" style={{ width: face, height: face }}>
          <Avatar id={p.id} name={p.name} look="tavern" size={face} round zoom={1.3} />
        </span>
        {!p.out && <span key={shake} className={`go-cup ${revealed ? 'lift' : shake ? 'shake' : ''}`} style={{ width: cup, height: cup, marginLeft: -cup * 0.18 }} />}
      </span>
      <span className="go-plate">
        <span className="go-name">{p.name}</span>
        {(p.id === viewer || p.isBot) && <span className="go-tag">{p.id === viewer ? 'toi' : 'bot'}</span>}
      </span>
      {revealed ? (
        <span className="flex max-w-full flex-wrap justify-center gap-[3px]">
          {revealed.map((d, i) => (
            <Die key={i} face={d} size={tiny} hit={hit(d)} dim={!hit(d)} roll delay={i * 0.05} />
          ))}
        </span>
      ) : (
        !p.out && (
          <span className="flex flex-wrap justify-center gap-[3px]" aria-label={`${p.dice} dé${p.dice > 1 ? 's' : ''}`}>
            {Array.from({ length: p.dice }, (_, i) => (
              <span key={i} className="go-hidden" style={{ width: tiny - 2, height: tiny - 2 }} />
            ))}
          </span>
        )
      )}
      {last && (
        <span className="go-bubble">
          {last.quantity} × <Die face={last.face} size={14} />
        </span>
      )}
    </div>
  );
}

function Slate({ view, nameOf }: { view: CupsView; nameOf: NameOf }) {
  if (view.phase === 'over') {
    return (
      <div className="go-slate">
        <RichIcon name="beer-stein" metal="brass" size={48} />
        <span className="chalk text-[1.1rem]">{nameOf(view.winner)} l’emporte</span>
      </div>
    );
  }
  if (view.phase === 'reveal' && view.reveal) {
    const r = view.reveal;
    const held = r.bid.quantity <= r.count;
    return (
      <div className="go-slate">
        <span className="chalk text-[13px]">Il y en avait</span>
        <span className="flex items-center gap-2">
          <span className="go-num text-[2rem]" style={{ color: held ? '#9ff0bd' : '#ff8a7a' }}>
            {r.count}
          </span>
          <Die face={r.bid.face} size={30} />
        </span>
        <span className="chalk text-[13px]">pour {r.bid.quantity} annoncés</span>
      </div>
    );
  }
  const bid = view.bid;
  return (
    <div className="go-slate">
      <span className="chalk text-[13px]">{bid ? 'Enchère en cours' : 'Nouvelle manche'}</span>
      {bid ? (
        <>
          <span className="flex items-center gap-2">
            <span className="go-num text-[2.1rem] leading-none">{bid.quantity} ×</span>
            <Die face={bid.face} size={38} />
          </span>
          <span className="chalk text-[13px]">
            par {nameOf(bid.by)}
            {wild(bid.face, view.dry) ? ' · As compris' : ''}
          </span>
        </>
      ) : (
        <span className="chalk text-[1.05rem]">{nameOf(view.active)} ouvre</span>
      )}
    </div>
  );
}

// ───────── Mon gobelet ─────────

function MyCup({ dice, view, shake }: { dice: Face[]; view: CupsView; shake: number }) {
  const bid = view.bid;
  const matches = (d: Face) => !!bid && (d === bid.face || (d === 1 && wild(bid.face, view.dry)));
  return (
    <section className="go-mycup">
      <div className="text-center text-[15px] text-[#e9d3a8]">Sous ton gobelet (secret) :</div>
      <div key={shake} className="mt-2 flex flex-wrap justify-center gap-2.5">
        {dice.map((d, i) => (
          <Die key={i} face={d} size={50} hit={matches(d)} roll delay={i * 0.08} />
        ))}
      </div>
      <p className="mt-2 text-center text-[14px] text-[#d9c3a0]">
        {bid
          ? `Tu en as ${countFace(dice, bid.face, view.dry)} pour l’enchère en cours ; ${view.totalDice - dice.length} dés sont cachés chez les autres.`
          : `Les As (dorés) sont jokers. ${view.totalDice - dice.length} dés sont cachés chez les autres.`}
      </p>
    </section>
  );
}

// ───────── Enchérir ─────────

function BidPanel({ view, title, sendMove }: { view: CupsView; title: string; sendMove: (m: CupsMove) => void }) {
  const bid = view.bid;
  const [face, setFace] = useState<Face | null>(null);
  const [quantity, setQuantity] = useState(1);
  // En manche sèche, la valeur est imposée : on part directement de la quantité minimale.
  const lockedFace = view.dry && bid ? bid.face : null;
  const lockedMin = lockedFace ? minQuantity(bid, lockedFace, true) : null;
  useEffect(() => {
    setFace(lockedFace);
    setQuantity(lockedMin ?? 1);
  }, [view.history.length, view.round, lockedFace, lockedMin]);

  const min = face === null ? null : minQuantity(bid, face, view.dry);
  const legal = min !== null && quantity >= min && quantity <= view.totalDice;

  const pick = (f: Face) => {
    const m = minQuantity(bid, f, view.dry);
    if (m === null || m > view.totalDice) return;
    sfx.click();
    setFace(f);
    setQuantity((q) => Math.min(view.totalDice, Math.max(q, m)));
  };

  return (
    <section className="go-dock">
      <h4 className="first-letter:uppercase">{title}</h4>
      <div className="muted mt-2 text-center text-[15px] italic">Quelle valeur ?</div>
      <div className="mt-1 flex flex-wrap justify-center gap-1.5" role="radiogroup" aria-label="Valeur">
        {FACES.map((f) => {
          const m = minQuantity(bid, f, view.dry);
          const disabled = m === null || m > view.totalDice;
          return (
            <button key={f} type="button" role="radio" aria-checked={face === f} aria-label={FACE_NAME[f]} disabled={disabled} onClick={() => pick(f)} className="go-face">
              <Die face={f} size={42} />
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <span className="muted text-[15px] italic">Combien ?</span>
        <button type="button" aria-label="Moins" disabled={face === null || min === null || quantity <= min} onClick={() => setQuantity((q) => q - 1)} className="go-step">
          −
        </button>
        <span className="go-num w-12 text-center text-[2rem]" aria-live="polite">
          {face === null ? '–' : quantity}
        </span>
        <button type="button" aria-label="Plus" disabled={face === null || quantity >= view.totalDice} onClick={() => setQuantity((q) => q + 1)} className="go-step">
          +
        </button>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button type="button" className="go-btn" disabled={!legal} onClick={() => face && sendMove({ type: 'bid', quantity, face })}>
          {face ? `Annoncer ${bidText({ quantity, face })}` : 'Choisis une valeur'}
        </button>
        {bid && (
          <button type="button" className="go-btn liar" onClick={() => sendMove({ type: 'liar' })}>
            Menteur !
          </button>
        )}
        {bid && view.config.exact && (
          <button type="button" className="go-btn exact" onClick={() => sendMove({ type: 'exact' })}>
            Pile !
          </button>
        )}
      </div>
      <p className="muted mt-2 text-center text-[14px] italic">
        {!bid
          ? view.dry
            ? 'Manche sèche : la valeur choisie à l’ouverture ne changera plus.'
            : 'On ne peut pas ouvrir sur les As.'
          : view.dry
            ? 'Manche sèche : on ne peut que monter la quantité.'
            : bid.face === 1
              ? `Quitter les As : il faut au moins ${bid.quantity * 2 + 1} dés.`
              : `Monter : plus de dés, ou autant d’une valeur plus forte. Passer aux As : ${Math.ceil(bid.quantity / 2)} suffisent.`}
      </p>
    </section>
  );
}

// ───────── Gobelets levés ─────────

function ShoutBanner({ reveal, nameOf }: { reveal: Reveal; nameOf: NameOf }) {
  return (
    <div className="go-banner">
      <div className="shout" style={{ color: reveal.call === 'liar' ? '#ff6a5a' : '#9ff0bd', textShadow: '0 4px 0 #2a0805, 0 0 30px rgba(0,0,0,.6)' }}>
        {reveal.call === 'liar' ? 'Menteur !' : 'Pile !'}
      </div>
      <div className="s">
        {nameOf(reveal.caller)} conteste {bidText(reveal.bid)} de {nameOf(reveal.bid.by)}… on lève les gobelets !
      </div>
    </div>
  );
}

function RevealPanel({ view, reveal, nameOf, canContinue, onNext }: { view: CupsView; reveal: Reveal; nameOf: NameOf; canContinue: boolean; onNext: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!view.revealUntil) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [view.revealUntil]);
  const left = view.revealUntil ? Math.max(0, Math.ceil((view.revealUntil - now) / 1000)) : null;
  const bid = reveal.bid;
  const hit = (d: Face) => d === bid.face || (d === 1 && wild(bid.face, reveal.dry));
  const held = bid.quantity <= reveal.count;
  const verdict =
    reveal.call === 'liar'
      ? held
        ? `L’enchère tenait : ${nameOf(reveal.caller)} perd un dé.`
        : `${nameOf(bid.by)} bluffait : un dé de perdu.`
      : reveal.count === bid.quantity
        ? `Pile ! ${nameOf(reveal.caller)} gagne un dé.`
        : `Raté : ${nameOf(reveal.caller)} perd un dé.`;

  return (
    <section className="go-dock">
      <h4>
        {nameOf(reveal.caller)} : « {reveal.call === 'liar' ? 'Menteur !' : 'Pile !'} »
      </h4>
      <p className="muted text-center">
        sur {bidText(bid)} de {nameOf(bid.by)}
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {view.players
          .filter((p) => reveal.dice[p.id]?.length)
          .map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <span className="w-20 shrink-0 truncate text-[15px] font-semibold">{p.name}</span>
              <span className="flex flex-wrap gap-1">
                {reveal.dice[p.id]!.map((d, i) => (
                  <Die key={i} face={d} size={22} hit={hit(d)} dim={!hit(d)} />
                ))}
              </span>
            </li>
          ))}
      </ul>
      <p className="mt-3 text-center text-[1.15rem] font-semibold">
        Il y en avait <span style={{ color: held ? '#1f7a46' : '#9c1b14' }}>{reveal.count}</span> pour {bid.quantity} annoncés
        {wild(bid.face, reveal.dry) ? ' (As compris)' : ''}.
      </p>
      <p className="text-center">{verdict}</p>
      {view.phase === 'reveal' &&
        (canContinue ? (
          <div className="mt-3 flex justify-center">
            <button type="button" className="go-btn" onClick={onNext}>
              Secouer les gobelets : manche suivante
            </button>
          </div>
        ) : (
          <p className="muted mt-3 text-center text-[14px] italic">
            {nameOf(view.starter)} ouvre la manche suivante{left !== null ? ` (dans ${left} s)` : '…'}
          </p>
        ))}
    </section>
  );
}

// ───────── Enchères, aide, journal ─────────

function Bids({ view, nameOf }: { view: CupsView; nameOf: NameOf }) {
  return (
    <section className="rounded-xl border border-[rgba(255,208,122,.3)] bg-[rgba(14,6,2,.72)] px-4 py-3">
      <h3 className="go-title text-[1.35rem] text-[#ffd07a]">Les enchères de la manche</h3>
      <ol className="mt-1 flex flex-col gap-1">
        {view.history.map((b, i) => (
          <li key={i} className="flex items-center gap-2 text-[15px]">
            <span className="w-20 truncate">{nameOf(b.by)}</span>
            <span className="go-num">{b.quantity} ×</span>
            <Die face={b.face} size={18} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function Reference({ view, onOpen }: { view: CupsView; onOpen: () => void }) {
  return (
    <details className="rounded border-2 border-[#4a4f57] bg-[rgba(14,15,18,.85)] px-4 py-3">
      <summary className="go-title cursor-pointer select-none text-[1.1rem] text-[#f2c27a]">Les règles de la maison</summary>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-[#c9c2b4]">
        <li>Une enchère porte sur tous les dés de la table : « au moins N dés de cette valeur ».</li>
        <li>Les As (dorés) sont jokers, sauf en manche sèche ou quand on parie sur les As.</li>
        <li>Monter : plus de dés, ou autant d’une valeur plus forte.</li>
        <li>Vers les As : la moitié (arrondie au-dessus) ; depuis les As : le double plus un.</li>
        <li>« Menteur ! » : celui qui a tort perd un dé.</li>
        {view.config.exact && <li>« Pile ! » : exact, on gagne un dé (même au-delà du départ) ; sinon on en perd un.</li>}
        {view.config.dry && <li>Manche sèche quand un joueur tombe à son dernier dé : pas de jokers, valeur fixe.</li>}
      </ul>
      <button type="button" className="go-rulesbtn mt-3" onClick={onOpen} aria-haspopup="dialog">
        <BookIcon />
        Lire le grimoire complet
      </button>
    </details>
  );
}

// ───────── Grimoire des règles (manuscrit enluminé) ─────────

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f2c27a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z" />
      <path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z" />
    </svg>
  );
}

/** Fleuron d'angle : rosace rouge et or, feuille verte, feuille bleue. */
function Fleuron({ style }: { style: CSSProperties }) {
  return (
    <svg className="go-codex-fleur" style={style} viewBox="-16 -16 70 70" aria-hidden="true">
      <circle r="13" fill="#a8321e" stroke="#2b1d12" strokeWidth="2" />
      <circle r="5" fill="#c79a2e" />
      <path d="M13 0 q18 -14 36 0 q-18 14 -36 0 Z" fill="#3f6b3a" stroke="#2b1d12" strokeWidth="1.5" />
      <path d="M0 13 q-14 18 0 36 q14 -18 0 -36 Z" fill="#1f3f8a" stroke="#2b1d12" strokeWidth="1.5" />
    </svg>
  );
}

/** Une règle commençant par « Titre court : … » est rubriquée (titre à l'encre rouge). */
function splitRubric(rule: string): [string | null, string] {
  const m = /^(.{3,30}?) : (.*)$/s.exec(rule);
  return m ? [m[1]!, m[2]!.charAt(0).toUpperCase() + m[2]!.slice(1)] : [null, rule];
}

function RulesCodex({ open, onClose, view }: { open: boolean; onClose: () => void; view: CupsView }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  const [first, ...rest] = CUPS_RULES;
  // Variantes non retenues pour cette partie : affichées, mais estompées.
  const off = (rule: string) => (rule.includes('« Pile ! »') && rule.startsWith('Variante') && !view.config.exact) || (rule.includes('Manche sèche') && !view.config.dry);
  return (
    <dialog
      ref={ref}
      className="go-codex"
      aria-labelledby="go-codex-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="go-codex-page">
        <Fleuron style={{ left: -10, top: -10 }} />
        <Fleuron style={{ right: -10, top: -10, transform: 'rotate(90deg)' }} />
        <Fleuron style={{ right: -10, bottom: -10, transform: 'rotate(180deg)' }} />
        <Fleuron style={{ left: -10, bottom: -10, transform: 'rotate(270deg)' }} />
        <div className="go-codex-head">
          <div>
            <div className="go-codex-kicker">Ici commencent</div>
            <h2 id="go-codex-title" className="go-codex-title">
              Les Règles du Jeu des Gobelets
            </h2>
          </div>
          <button type="button" className="go-codex-close" onClick={onClose} aria-label="Fermer les règles" autoFocus>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="go-codex-body">
          {first && (
            <p>
              <span className="go-codex-lettrine" aria-hidden="true">
                {first.charAt(0)}
              </span>
              <span className="sr-only">{first.charAt(0)}</span>
              {first.slice(1)}
            </p>
          )}
          {rest.map((rule, i) => {
            const [rubric, text] = splitRubric(rule);
            const disabled = off(rule);
            return (
              <p key={i} className={disabled ? 'go-codex-off' : undefined}>
                {rubric && <span className="go-codex-rubric">{rubric}. </span>}
                {text}
                {disabled && <span className="go-codex-tag"> (non retenue pour cette partie)</span>}
              </p>
            );
          })}
        </div>
        <div className="go-codex-foot">
          <span>Ainsi finissent les règles. Que les dés vous soient favorables.</span>
          <button type="button" className="go-codex-seal" onClick={onClose}>
            Retour au jeu
          </button>
        </div>
      </div>
    </dialog>
  );
}

function Journal({ lines, open = false }: { lines: string[]; open?: boolean }) {
  const recent = lines.slice(-10).reverse();
  return (
    <details open={open} className="rounded-xl border border-[rgba(255,208,122,.3)] bg-[rgba(14,6,2,.72)] px-4 py-3">
      <summary className="go-title cursor-pointer select-none text-[1.35rem] text-[#ffd07a]">Ragots de comptoir</summary>
      <ol className="mt-1 flex flex-col gap-1">
        {recent.map((line, i) => (
          <li key={lines.length - i} className={i === 0 ? 'text-[#f6e7cc]' : 'text-[#bfa780]'}>
            {line}
          </li>
        ))}
      </ol>
    </details>
  );
}
