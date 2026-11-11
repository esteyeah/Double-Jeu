'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { BoardProps, PlayerId } from '@arcade/game-sdk';
import {
  Avatar,
  Cinematic,
  Icon,
  PirateDeck3D,
  RichIcon,
  RoundTable,
  Table3D,
  sfx,
  useAmbient,
  useMediaQuery,
  useOnChange,
  useSkins,
  useWebGL,
  type DeckAim,
  type DeckAnchors,
  type DeckDuel,
  type DeckPirate,
  type GameIconName,
  type Metal,
  type TableLink,
} from '@arcade/tabletop';
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

/** Pour dessiner un pirate où qu'on soit : son nom (son visage) et sa place (sa couleur). */
const CrewContext = createContext<(id: PlayerId | null) => { name: string; seat: number }>(() => ({ name: '?', seat: 0 }));

export default function PlunderBoard(props: Props) {
  const { view } = props;
  const crew = (id: PlayerId | null) => {
    const seat = view.pirates.findIndex((p) => p.id === id);
    return { name: view.pirates[seat]?.name ?? '?', seat: Math.max(0, seat) };
  };
  return (
    <CrewContext.Provider value={crew}>
      <PlunderTable {...props} />
    </CrewContext.Provider>
  );
}

function PlunderTable({ view, viewer, actingAs, mode, sendMove }: Props) {
  const nameOf: NameOf = (id) => view.pirates.find((p) => p.id === id)?.name ?? '?';
  const seatOf = (id: PlayerId | null) => Math.max(0, view.pirates.findIndex((p) => p.id === id));
  const self = view.pirates.find((p) => p.id === actingAs);
  const privateView = viewer !== null && viewer === actingAs;
  const canAct = !!self && !self.sunk;
  const wide = useMediaQuery('(min-width: 1024px)');

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
    else if (view.phase !== 'loot') sfx.whoosh(0.05, 0.12);
  });

  // Cible choisie pendant la préparation : la flèche apparaît sur le pont avant même de confirmer.
  const [aim, setAim] = useState<PlayerId | null>(null);
  useEffect(() => setAim(null), [view.round, actingAs]);
  const choosing = view.phase === 'prepare' && canAct && privateView && !!view.me && !view.me.prepared;

  // Annonce de chaque étape (la fusillade a déjà son propre écran).
  const bannerKey = useRef('');
  if (view.phase === 'prepare' || view.phase === 'order' || view.phase === 'courage') bannerKey.current = `${view.round}-${view.phase}`;
  const banner = BANNER[view.phase as keyof typeof BANNER];

  const action = actionFor({ view, actingAs, privateView, canAct, nameOf, seatOf, sendMove, aim, setAim });
  const gl = useWebGL();
  const [duel, setDuel] = useState<DeckDuel | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (fight && gl !== false) stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [fight, gl]);
  const fightView = fight && (
    <Gunfight
      {...fight}
      cinematic={gl !== false}
      round={view.round}
      onStep={setDuel}
      nameOf={nameOf}
      seatOf={seatOf}
      captain={view.captain}
      onDone={() => {
        setDuel(null);
        setFight(null);
      }}
    />
  );
  const bannerView = banner && (
    <Cinematic trigger={bannerKey.current} onMount={mode !== 'hotseat'}>
      <div className="bt-banner">
        <div className="k">
          Manche {view.round} sur {view.rounds}
        </div>
        <div className="bt-title bt-gold text-[2.6rem] sm:text-6xl">{banner.title}</div>
        <div className="s">{banner.sub}</div>
      </div>
    </Cinematic>
  );

  if (gl !== false) {
    return (
      <div className="bt bt3">
        <style href="arcade-plunder-v2" precedence="default">
          {PLUNDER_CSS}
        </style>
        <DeckStage
          stageRef={stageRef}
          view={view}
          viewer={viewer}
          actingAs={actingAs}
          wide={wide}
          fight={fight}
          duel={duel}
          aim={choosing ? aim : null}
          onAim={choosing ? setAim : undefined}
          action={action}
          instruction={<Instruction {...instructionFor({ view, viewer, actingAs, privateView, canAct, mode, nameOf })} />}
          steps={<StepTrack view={view} fighting={!!fight} />}
          treasure={<Treasure view={view} actingAs={actingAs} sendMove={sendMove} bare />}
          nameOf={nameOf}
        />
        <div className="mx-auto mt-4 grid w-[min(1240px,calc(100%-20px))] gap-4 pb-16 lg:grid-cols-2 lg:items-start">
          {view.phase === 'over' && <Ranking view={view} viewer={viewer} seatOf={seatOf} />}
          <LootDetails view={view} seatOf={seatOf} />
          <Journal lines={view.log} open={wide} />
        </div>
        {bannerView}
        {fightView}
      </div>
    );
  }

  const treasure = <Treasure view={view} actingAs={actingAs} sendMove={sendMove} bare={wide} />;
  const table = (
    <DeckTable
      view={view}
      viewer={viewer}
      wide={wide}
      aim={choosing ? aim : null}
      onAim={choosing ? setAim : undefined}
      center={wide ? treasure : <TableHeart view={view} nameOf={nameOf} />}
    />
  );

  return (
    <div className="bt">
      <style href="arcade-plunder-v2" precedence="default">
        {PLUNDER_CSS}
      </style>
      <div className="bt-deck" />
      <div className="bt-light" />
      {wide && (
        <>
          <Lantern side="left" />
          <Lantern side="right" />
        </>
      )}

      <Bastingage view={view} nameOf={nameOf} seatOf={seatOf} />
      <div className="mx-auto w-[min(1240px,calc(100%-20px))]">
        <StepTrack view={view} fighting={!!fight} />
        <Instruction {...instructionFor({ view, viewer, actingAs, privateView, canAct, mode, nameOf })} />
      </div>

      <div className="mx-auto mt-3 grid w-[min(1240px,calc(100%-20px))] gap-x-6 gap-y-4 pb-16 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        {action && <div className="bt-dock lg:col-start-2 lg:row-start-1 lg:mt-2">{action}</div>}
        {!wide && view.phase === 'loot' && treasure}
        <div className="min-w-0 lg:col-start-1 lg:row-span-3 lg:row-start-1">{table}</div>
        {!wide && view.phase !== 'loot' && treasure}
        <div className="min-w-0 lg:col-start-2 lg:row-start-2">
          {view.phase === 'over' && <Ranking view={view} viewer={viewer} seatOf={seatOf} />}
          {!wide && <LootDetails view={view} seatOf={seatOf} />}
          <Journal lines={view.log} open={wide} />
        </div>
      </div>

      {bannerView}
      {fightView}
    </div>
  );
}

// ───────── Le pont en 3D, vu à la première personne ─────────

const TINTS = ['#b9d2ff', '#ffd0b0', '#c8f0c0'];

/** Un modèle 3D différent par joueur (selon son pseudo et son skin), teinté si tous sont pris. */
function assignModels(pirates: PirateView[], skins: Record<string, number>): Map<PlayerId, { model: number; tint?: string }> {
  const out = new Map<PlayerId, { model: number; tint?: string }>();
  const used = new Map<number, number>();
  for (const p of pirates) {
    const seed = `${p.name}#${skins[p.id] ?? 0}`;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0;
    // Les pirates humains d'abord (capitaine, Anne, Henry), puis le squelette et les requins.
    const start = h % 3;
    const order = [...[0, 1, 2].map((k) => (start + k) % 3), 5, 3, 4];
    const model = order.find((m) => !used.has(m)) ?? order[h % order.length]!;
    const n = used.get(model) ?? 0;
    used.set(model, n + 1);
    out.set(p.id, { model, tint: n > 0 ? TINTS[(n - 1) % TINTS.length] : undefined });
  }
  return out;
}

function DeckStage({
  stageRef,
  view,
  viewer,
  actingAs,
  wide,
  fight,
  duel,
  aim,
  onAim,
  action,
  instruction,
  steps,
  treasure,
  nameOf,
}: {
  stageRef: RefObject<HTMLElement | null>;
  view: PlunderView;
  viewer: PlayerId | null;
  actingAs: PlayerId | null;
  wide: boolean;
  fight: { shots: Shot[]; divers: PlayerId[] } | null;
  duel: DeckDuel | null;
  aim: PlayerId | null;
  onAim?: (id: PlayerId) => void;
  action: ReactNode;
  instruction: ReactNode;
  steps: ReactNode;
  treasure: ReactNode;
  nameOf: NameOf;
}) {
  const skins = useSkins();
  const skinKey = view.pirates.map((p) => `${p.id}:${skins[p.id] ?? 0}`).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const models = useMemo(() => assignModels(view.pirates, skins), [skinKey]);
  const [anchors, setAnchors] = useState<DeckAnchors | null>(null);
  const me = viewer ?? actingAs;
  const over = view.phase === 'over';
  const best = over ? Math.max(...view.pirates.map((p) => p.score)) : -1;

  const crew: DeckPirate[] = view.pirates.map((p) => {
    const m = models.get(p.id) ?? { model: 0 };
    let pose: DeckPirate['pose'] = 'idle';
    if (p.sunk) pose = 'down';
    else if (duel?.shooter === p.id) pose = 'shoot';
    else if (duel?.target === p.id) pose = duel.hit ? 'hit' : 'duck';
    else if (over && p.score === best) pose = 'cheer';
    return { id: p.id, model: m.model, tint: m.tint, pose, hidden: !!fight && fight.divers.includes(p.id) };
  });

  const aims: DeckAim[] = [];
  if (view.phase === 'order' || view.phase === 'courage') {
    for (const p of view.pirates) {
      if (!p.aim || p.sunk) continue;
      const atMe = p.aim === me;
      aims.push({ from: p.id, to: p.aim, color: atMe ? '#ff3b2e' : view.order?.pirate === p.id ? '#f0c35c' : '#fff3d6', dashed: view.order?.pirate === p.id });
    }
  } else if (view.phase === 'prepare' && me) {
    const target = aim ?? view.me?.prepared?.target ?? null;
    if (target) aims.push({ from: me, to: target, color: '#ff3b2e' });
  }

  let coins = 0;
  let rum = 0;
  let powder = 0;
  for (const item of view.board) {
    if (item.kind === 'rum') rum++;
    else if (item.kind === 'powder') powder++;
    else coins++;
  }
  const time = over || view.round > Math.ceil(view.rounds / 2) ? 'night' : 'sunset';
  const self = view.pirates.find((p) => p.id === me);

  return (
    <section ref={stageRef} className="bt3-stage" aria-label="Le pont du navire">
      <div className="bt3-roll">
        <PirateDeck3D
          crew={crew}
          viewer={me}
          time={time}
          storm={!!fight}
          duel={duel}
          aims={aims}
          loot={{ coins, rum, powder }}
          base="/themes/plunder/3d/"
          onAnchors={setAnchors}
          onPick={onAim}
          pickable={view.pirates.filter((p) => !p.sunk && p.id !== me).map((p) => p.id)}
          fallback={<div className="bt3-loading">Le navire approche…</div>}
        />
        {anchors &&
          view.pirates.map((p) => {
            const a = anchors[p.id];
            if (!a) return null;
            return <DeckTag key={p.id} p={p} view={view} viewer={me} at={a} aimed={aim === p.id} onAim={onAim && !p.sunk ? () => onAim(p.id) : undefined} />;
          })}
      </div>
      <div className="bt3-shade" />

      <div className="bt3-top">
        <div className="bt3-brand">
          <span className="bt-title bt-gold bt3-logo text-[2.5rem] leading-none">Butin</span>
          <span className="bt3-chip">{over ? 'Fin du voyage' : `Manche ${view.round} / ${view.rounds}`}</span>
          {!over && (
            <span className="bt3-chip bt3-cap">
              <RichIcon name="ship-wheel" metal="gold" size={18} /> Capitaine : {nameOf(view.captain)}
            </span>
          )}
        </div>
      </div>
      {wide ? (
        <>
          <div className="bt3-center">
            {steps}
            {instruction}
          </div>
          {action && <div className="bt-dock bt3-dock">{action}</div>}
          <div className="bt3-side">
            {self && <MeBadge p={self} />}
            {view.board.length > 0 && <div className="bt3-treasure">{treasure}</div>}
          </div>
        </>
      ) : null}
      {!wide && self && (
        <div className="bt3-me-mobile">
          <MeBadge p={self} />
        </div>
      )}
      {!wide && (
        <div className="bt3-below">
          {steps}
          {instruction}
          {action && <div className="bt-dock mt-3">{action}</div>}
          {view.board.length > 0 && <div className="bt3-treasure mt-3">{treasure}</div>}
        </div>
      )}
    </section>
  );
}

function MeBadge({ p }: { p: PirateView }) {
  return (
    <div className="bt3-me" aria-label={`Toi : ${p.score} doublons, ${MAX_WOUNDS - p.wounds} vies, ${p.charges} balles`}>
      <span className="font-extrabold">Toi</span>
      <span className="flex items-center gap-0.5">
        {Array.from({ length: MAX_WOUNDS }, (_, i) => (
          <span key={i} style={{ opacity: i < MAX_WOUNDS - p.wounds ? 1 : 0.25 }}>
            <RichIcon name="hearts" metal="ruby" size={15} />
          </span>
        ))}
      </span>
      <span className="flex items-center gap-1">
        <RichIcon name="bullets" metal="brass" size={15} />×{p.charges}
      </span>
      <span className="bt3-coin">{p.score}</span>
    </div>
  );
}

/** Étiquette flottant au-dessus d'un pirate : nom, état, vies, doublons ; on la touche pour viser. */
function DeckTag({
  p,
  view,
  viewer,
  at,
  aimed,
  onAim,
}: {
  p: PirateView;
  view: PlunderView;
  viewer: PlayerId | null;
  at: { x: number; y: number };
  aimed: boolean;
  onAim?: () => void;
}) {
  const status = seatStatus(view, p);
  const threat = (view.phase === 'order' || view.phase === 'courage') && !!viewer && p.aim === viewer && !p.sunk;
  const captain = p.id === view.captain && view.phase !== 'over';
  const turn = view.phase === 'loot' && view.picker === p.id;
  const cls = `bt3-tag ${aimed ? 'is-aimed' : ''} ${threat ? 'is-threat' : ''} ${turn ? 'is-turn' : ''} ${p.sunk ? 'is-sunk' : ''}`;
  const body = (
    <>
      {threat ? <span className="bt3-tag-chip tone-red">te vise !</span> : status && <span className={`bt3-tag-chip tone-${status.tone}`}>{status.text}</span>}
      <span className="bt3-tag-name">
        {captain && <RichIcon name="ship-wheel" metal="gold" size={16} />}
        {p.name}
        {p.isBot && <span className="text-[11px] font-semibold opacity-70">bot</span>}
        <span className="bt3-coin">{p.score}</span>
      </span>
      {!p.sunk && (
        <span className="bt3-tag-life" aria-label={`${MAX_WOUNDS - p.wounds} vie(s) sur ${MAX_WOUNDS}, ${p.charges} balles`}>
          {Array.from({ length: MAX_WOUNDS }, (_, i) => (
            <span key={i} style={{ opacity: i < MAX_WOUNDS - p.wounds ? 1 : 0.25 }}>
              ♥
            </span>
          ))}
          <span className="ml-1 text-[#f3dcaa]">×{p.charges}</span>
        </span>
      )}
      {aimed && <span className="bt3-reticle" aria-hidden="true" />}
    </>
  );
  const style = { left: at.x, top: at.y };
  if (onAim) {
    return (
      <button
        type="button"
        className={cls}
        style={style}
        aria-label={`Viser ${p.name}`}
        aria-pressed={aimed}
        onClick={() => {
          sfx.click();
          onAim();
        }}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={cls} style={style}>
      {body}
    </div>
  );
}

const BANNER = {
  prepare: { title: 'Chargez vos pistolets', sub: 'Chacun choisit sa balle et sa cible, en secret.' },
  order: { title: 'Le Capitaine a la main', sub: 'Visé, il peut détourner un pistolet.' },
  courage: { title: 'Tenir bon… ou plonger ?', sub: 'Regardez les flèches : qui vise qui ?' },
} as const;

// ───────── Étapes de la manche et consigne ─────────

const STEPS: { label: string; icon: GameIconName }[] = [
  { label: 'Charger', icon: 'crossed-pistols' },
  { label: 'Ordre', icon: 'pirate-hat' },
  { label: 'Courage', icon: 'crossed-sabres' },
  { label: 'Feu', icon: 'bright-explosion' },
  { label: 'Partage', icon: 'open-treasure-chest' },
];

function StepTrack({ view, fighting }: { view: PlunderView; fighting: boolean }) {
  const now = { prepare: 0, order: 1, courage: 2, loot: fighting ? 3 : 4, over: 5 }[view.phase];
  return (
    <ol className="bt-steps" aria-label="Étapes de la manche">
      {STEPS.map((step, i) => (
        <li key={step.label} className={i < now ? 'done' : i === now ? 'now' : ''} aria-current={i === now ? 'step' : undefined}>
          <span className="n">
            <Icon name={step.icon} size={14} />
          </span>
          <span className="t">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

function instructionFor({
  view,
  viewer,
  actingAs,
  privateView,
  canAct,
  mode,
  nameOf,
}: {
  view: PlunderView;
  viewer: PlayerId | null;
  actingAs: PlayerId | null;
  privateView: boolean;
  canAct: boolean;
  mode: Props['mode'];
  nameOf: NameOf;
}): { icon: GameIconName; mine: boolean; text: ReactNode } {
  const afloat = view.pirates.filter((p) => !p.sunk);
  const you = (rest: string) => (mode === 'hotseat' && actingAs ? `${nameOf(actingAs)}, ${rest}` : rest.charAt(0).toUpperCase() + rest.slice(1));
  const me = view.pirates.find((p) => p.id === viewer);
  switch (view.phase) {
    case 'prepare': {
      const ready = `${afloat.filter((p) => p.prepared).length}/${afloat.length} prêts`;
      if (canAct && privateView && view.me && !view.me.prepared)
        return { icon: 'crossed-pistols', mine: true, text: you('à toi : choisis ta balle (chargée ou à blanc), puis le pirate que tu vises.') };
      if (view.me?.prepared)
        return {
          icon: 'crossed-pistols',
          mine: false,
          text: `${CHARGE_TEXT[view.me.prepared.charge].title}, braqué sur ${nameOf(view.me.prepared.target)}. On attend les autres : ${ready}.`,
        };
      return { icon: 'crossed-pistols', mine: false, text: `Chacun charge son pistolet et vise en secret… ${ready}.` };
    }
    case 'order':
      if (canAct && actingAs === view.captain)
        return { icon: 'pirate-hat', mine: true, text: you('tu es Capitaine et on te vise : tu peux obliger un tireur à viser quelqu’un d’autre.') };
      return { icon: 'pirate-hat', mine: false, text: `Le Capitaine ${nameOf(view.captain)} est visé : il peut obliger un tireur à changer de cible.` };
    case 'courage': {
      if (view.config.courage === 'table')
        return { icon: 'crossed-sabres', mine: false, text: 'À trois, chacun annonce à voix haute : tenir bon ou plonger dans la cale !' };
      const decided = `${afloat.filter((p) => p.decided).length}/${afloat.length} ont décidé`;
      if (canAct && privateView && view.me && view.me.courage === null) {
        const threats = afloat.filter((p) => p.aim === actingAs).length;
        return {
          icon: 'crossed-sabres',
          mine: true,
          text: you(
            threats
              ? `${threats} pistolet${threats > 1 ? 's' : ''} te vise${threats > 1 ? 'nt' : ''} (flèches rouges). Tiens bon pour ta part du butin, ou plonge pour éviter les balles.`
              : 'personne ne te vise ! Tiens bon pour prendre ta part du butin.',
          ),
        };
      }
      if (view.me && view.me.courage !== null)
        return { icon: 'crossed-sabres', mine: false, text: `${view.me.courage ? 'Tu plonges dans la cale' : 'Tu tiens bon'}. On attend les autres : ${decided}.` };
      return { icon: 'crossed-sabres', mine: false, text: `Tenir bon ou plonger dans la cale ? ${decided}.` };
    }
    case 'loot': {
      if (canAct && view.picker === actingAs)
        return { icon: 'open-treasure-chest', mine: true, text: you('à toi de te servir : touche un trésor sur le pont.') };
      const next = view.pickers.filter((id) => id !== view.picker).map(nameOf);
      const out = me && !view.pickers.includes(me.id) && !me.sunk ? (me.fled ? ' Toi, tu es resté dans la cale : rien pour toi.' : me.hit ? ' Toi, tu es blessé : pas de part cette manche.' : '') : '';
      return {
        icon: 'open-treasure-chest',
        mine: false,
        text: (
          <>
            <strong>{nameOf(view.picker)}</strong> se sert{next.length ? `, puis ${next.join(', ')}` : ''}.{out}
          </>
        ),
      };
    }
    default:
      return { icon: 'open-treasure-chest', mine: false, text: 'Fin du voyage : on compte les doublons !' };
  }
}

function Instruction({ icon, mine, text }: { icon: GameIconName; mine: boolean; text: ReactNode }) {
  return (
    <div className={`bt-call ${mine ? 'is-mine' : ''}`}>
      <span className="ic">
        <RichIcon name={icon} metal="gold" size={28} />
      </span>
      <p>{text}</p>
    </div>
  );
}

// ───────── Le pont : l'équipage autour du trésor ─────────

function DeckTable({
  view,
  viewer,
  wide,
  aim,
  onAim,
  center,
}: {
  view: PlunderView;
  viewer: PlayerId | null;
  wide: boolean;
  aim: PlayerId | null;
  onAim?: (id: PlayerId) => void;
  center: ReactNode;
}) {
  const links: TableLink[] = [];
  if (view.phase === 'order' || view.phase === 'courage') {
    for (const p of view.pirates) {
      if (!p.aim || p.sunk) continue;
      const atMe = p.aim === viewer;
      const ordered = view.order?.pirate === p.id;
      links.push({
        id: p.id,
        from: p.id,
        to: p.aim,
        color: atMe ? '#ff4d3d' : ordered ? '#f0c35c' : '#ecdcb6',
        width: atMe ? 4 : 3,
        glow: atMe,
        dash: ordered ? '9 6' : undefined,
      });
    }
  } else if (view.phase === 'loot' || view.phase === 'over') {
    for (const s of view.shots) {
      links.push({
        id: s.shooter,
        from: s.shooter,
        to: s.target,
        color: s.charge === 'wet' ? '#9fb3bf' : s.hit ? '#ff4d3d' : '#f0c35c',
        dash: s.charge === 'wet' ? '2 7' : s.hit ? undefined : '9 7',
        width: 3,
        opacity: view.phase === 'over' ? 0.35 : 0.6,
      });
    }
  } else if (view.phase === 'prepare' && viewer) {
    const target = aim ?? view.me?.prepared?.target ?? null;
    if (target) links.push({ id: 'aim', from: viewer, to: target, color: '#ff4d3d', width: 3.5, flow: true, glow: true });
  }

  return (
    <div className="bt-table pb-6 lg:pb-2" aria-label="L’équipage sur le pont">
      <RoundTable
        ids={view.pirates.map((p) => p.id)}
        me={viewer}
        seat={wide ? { w: 140, h: 172 } : { w: 92, h: 132 }}
        className={wide ? 'aspect-[1.36] max-h-[calc(100dvh-300px)] min-h-[470px]' : 'aspect-[0.84]'}
        links={links}
        under={<Table3D scene={DECK} inset={{ x: 0.06, y: 0.08 }} fallback={<div className="bt-table-under" />} />}
        center={center}
        renderSeat={(id) => {
          const p = view.pirates.find((x) => x.id === id)!;
          return (
            <Seat
              p={p}
              seat={view.pirates.indexOf(p)}
              view={view}
              viewer={viewer}
              wide={wide}
              aimed={aim === id}
              onAim={onAim && !p.sunk && id !== viewer ? () => onAim(id) : undefined}
            />
          );
        }}
      />
    </div>
  );
}

function seatStatus(view: PlunderView, p: PirateView): { text: string; tone: string } | null {
  if (p.sunk) return { text: 'coulé', tone: 'dim' };
  switch (view.phase) {
    case 'prepare':
      return p.prepared ? { text: 'prêt', tone: 'green' } : { text: 'charge…', tone: 'dim' };
    case 'courage':
      return view.config.courage === 'secret' ? (p.decided ? { text: 'a décidé', tone: 'green' } : { text: 'hésite…', tone: 'dim' }) : null;
    case 'loot':
      if (view.picker === p.id) return { text: 'se sert', tone: 'gold' };
      if (p.fled) return { text: 'à l’abri', tone: 'blue' };
      if (p.hit) return { text: 'touché', tone: 'red' };
      return null;
    default:
      return null;
  }
}

function Seat({
  p,
  seat,
  view,
  viewer,
  wide,
  aimed,
  onAim,
}: {
  p: PirateView;
  seat: number;
  view: PlunderView;
  viewer: PlayerId | null;
  wide: boolean;
  aimed: boolean;
  onAim?: () => void;
}) {
  const over = view.phase === 'over';
  const threat = (view.phase === 'order' || view.phase === 'courage') && !!viewer && p.aim === viewer && !p.sunk;
  const turn = view.phase === 'loot' && view.picker === p.id;
  const status = seatStatus(view, p);
  const cls = `bt-seat ${turn ? 'is-turn' : ''} ${threat ? 'is-threat' : ''} ${aimed ? 'is-aimed' : ''} ${p.id === viewer ? 'is-me' : ''} ${p.sunk ? 'is-sunk' : ''}`;
  const body = (
    <>
      {status && <span className={`bt-seat-status tone-${status.tone}`}>{status.text}</span>}
      <span className="relative">
        <Medal id={p.id} size={wide ? 84 : 62} captain={p.id === view.captain && !over} hurt={p.wounds > 0} sunk={p.sunk} />
        <span className="bt-seat-score" title={`${p.score} doublons`}>
          {p.score}
        </span>
        {aimed && (
          <span className="pointer-events-none absolute -inset-3 grid place-items-center text-[#ff4d3d]">
            <Icon name="crosshair" size={wide ? 90 : 74} />
          </span>
        )}
      </span>
      <span className="bt-seat-plate">
        <span className="bt-seat-name">{p.name}</span>
        {(p.id === viewer || p.isBot) && <span className="bt-seat-tag">{p.id === viewer ? 'toi' : 'bot'}</span>}
      </span>
      {!p.sunk && (
        <span className="flex items-center gap-1" aria-label={`${MAX_WOUNDS - p.wounds} vie(s) sur ${MAX_WOUNDS}, ${p.charges} balles`}>
          {Array.from({ length: MAX_WOUNDS }, (_, i) =>
            i < MAX_WOUNDS - p.wounds ? <RichIcon key={i} name="hearts" metal="ruby" size={wide ? 15 : 12} /> : <span key={i} className="bt-socket" />,
          )}
          <span className="ml-0.5 flex items-center text-[11px] text-[#e9d3a8]" title="Balles restantes">
            <RichIcon name="bullets" metal="brass" size={wide ? 15 : 12} />×{p.charges}
          </span>
        </span>
      )}
      {wide && (
        <span className="flex flex-wrap justify-center gap-1">
          <Loot loot={p.loot} pearlLeader={view.pearlLeaders.includes(p.id)} />
        </span>
      )}
    </>
  );
  if (onAim) {
    return (
      <button
        type="button"
        className={cls}
        style={{ width: wide ? 140 : 92 }}
        aria-label={`Viser ${p.name}`}
        aria-pressed={aimed}
        onClick={() => {
          sfx.click();
          onAim();
        }}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={cls} style={{ width: wide ? 140 : 92 }}>
      {body}
    </div>
  );
}

/** Centre du pont sur téléphone (le trésor est posé juste à côté, avec ses légendes). */
function TableHeart({ view, nameOf }: { view: PlunderView; nameOf: NameOf }) {
  const afloat = view.pirates.filter((p) => !p.sunk);
  const line =
    view.phase === 'prepare'
      ? `${afloat.filter((p) => p.prepared).length}/${afloat.length} prêts`
      : view.phase === 'courage' && view.config.courage === 'secret'
        ? `${afloat.filter((p) => p.decided).length}/${afloat.length} décidés`
        : view.phase === 'loot'
          ? `${nameOf(view.picker)} se sert`
          : view.phase === 'over'
            ? 'Fin du voyage'
            : 'Le Capitaine décide';
  return (
    <div className="flex flex-col items-center text-center">
      <span className="bt-obj">
        <RichIcon name="open-treasure-chest" metal="gold" size={64} />
      </span>
      <span className="bt-label mt-1">
        {view.board.length} trésor{view.board.length > 1 ? 's' : ''}
      </span>
      <span className="mt-1 text-[13px] italic text-[#3a2410]">{line}</span>
    </div>
  );
}

function Ranking({ view, viewer, seatOf }: { view: PlunderView; viewer: PlayerId | null; seatOf: (id: PlayerId | null) => number }) {
  const ranked = [...view.pirates].sort((a, b) => Number(a.sunk) - Number(b.sunk) || b.score - a.score);
  return (
    <section className="bt-dock">
      <h4 className="bt-title text-center text-[1.7rem]">Le partage final</h4>
      <ol className="mt-2 flex flex-col gap-1.5">
        {ranked.map((p, i) => (
          <li key={p.id} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${i === 0 && !p.sunk ? 'bg-[#f0c35c]/25' : ''}`}>
            <span className="bt-num w-6 text-center text-lg text-[#7a1d14]">{i + 1}</span>
            <Medal id={p.id} size={30} sunk={p.sunk} />
            <span className={`bt-title flex-1 truncate text-xl ${p.sunk ? 'line-through opacity-60' : ''}`}>
              {p.name}
              {p.id === viewer ? ' (toi)' : ''}
            </span>
            <span className="bt-num text-lg">{p.sunk ? 'coulé' : `${p.score} doublons`}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function LootDetails({ view, seatOf }: { view: PlunderView; seatOf: (id: PlayerId | null) => number }) {
  if (!view.pirates.some((p) => p.loot.length > 0)) return null;
  return (
    <details className="mt-4 rounded-xl border border-[#3a2410] bg-black/45 px-4 py-2.5 backdrop-blur-[2px]">
      <summary className="bt-title cursor-pointer select-none text-xl text-[#f0c35c]">Les coffres de l’équipage</summary>
      <ul className="mt-2 flex flex-col gap-1.5">
        {view.pirates.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-1.5">
            <Medal id={p.id} size={24} sunk={p.sunk} />
            <span className="bt-title min-w-[4.5rem] text-lg text-[#f6e3b8]">{p.name}</span>
            <Loot loot={p.loot} pearlLeader={view.pearlLeaders.includes(p.id)} />
            <span className="bt-num ml-auto text-[#f3cd6b]">{p.score}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

// ───────── Médaillons ─────────

function Medal({
  id,
  size = 54,
  captain = false,
  hurt = false,
  sunk = false,
}: {
  id: PlayerId | null;
  size?: number;
  captain?: boolean;
  hurt?: boolean;
  sunk?: boolean;
}) {
  const who = useContext(CrewContext)(id);
  const c = ENAMEL[who.seat % ENAMEL.length]!;
  return (
    <span
      className="bt-medal"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 50% 30%, color-mix(in srgb, ${c} 45%, #f4d9a8), ${c} 60%, color-mix(in srgb, ${c} 55%, black))`,
        filter: sunk ? 'grayscale(1) brightness(.6)' : undefined,
      }}
    >
      <Avatar id={id} name={who.name} look="pirate" size={size} round zoom={1.35} />
      {captain && (
        <span className="bt-token absolute -right-2 -top-2 z-[2]" style={{ background: '#17171c', width: size * 0.44, height: size * 0.44 }}>
          <RichIcon name="ship-wheel" metal="gold" size={size * 0.32} />
        </span>
      )}
      {hurt && !sunk && (
        <span className="bt-token absolute -bottom-1.5 -left-1.5 z-[2]" style={{ background: '#7a1d14', width: size * 0.4, height: size * 0.4 }}>
          <RichIcon name="bandage-roll" metal="bone" size={size * 0.26} />
        </span>
      )}
      {sunk && (
        <span className="absolute inset-0 z-[2] grid place-items-center rounded-full bg-black/45">
          <RichIcon name="skull-crossed-bones" metal="bone" size={size * 0.6} />
        </span>
      )}
    </span>
  );
}

// ───────── Bastingage : ciel, mer, titre ─────────

function Bastingage({ view, nameOf, seatOf }: { view: PlunderView; nameOf: NameOf; seatOf: (id: PlayerId | null) => number }) {
  const wave = 'M0 26 Q 25 12 50 26 T 100 26 T 150 26 T 200 26 V 60 H 0 Z';
  return (
    <header className="bt-sky">
      <div className="bt-stars" />
      <div className="bt-moonpath" />
      <svg className="bt-farship" viewBox="0 0 60 40" aria-hidden="true">
        <path d="M6,30 L54,30 L48,37 L12,37 Z" fill="#06101c" />
        <path d="M22,4 V30 M38,8 V30" stroke="#06101c" strokeWidth="1.6" />
        <path d="M23,6 Q34,14 23,26 Z M39,10 Q48,17 39,27 Z M21,8 Q12,16 21,26 Z" fill="#0b1a2c" />
        <circle cx="44" cy="27" r="1" fill="#ffd27a" />
      </svg>
      <span className="bt-gull" aria-hidden="true" />
      <span className="bt-gull b" aria-hidden="true" />
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
          <span className="text-[11px] uppercase tracking-[0.32em] text-[#d9bd8a]">À bord du Vautour</span>
          <div className="bt-title bt-gold text-[1.75rem] sm:text-[2.2rem]">
            {view.phase === 'over' ? 'Fin du voyage' : `Manche ${view.round} sur ${view.rounds}`}
          </div>
          {view.phase !== 'over' && (
            <span className="flex items-center gap-1.5 text-[13px] text-[#e9d3a8]">
              <Medal id={view.captain} size={22} />
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

function Treasure({
  view,
  actingAs,
  sendMove,
  bare = false,
}: {
  view: PlunderView;
  actingAs: PlayerId | null;
  sendMove: (m: PlunderMove) => void;
  /** Posé au centre du pont (grand écran) plutôt que sur sa propre toile. */
  bare?: boolean;
}) {
  const myTurn = view.phase === 'loot' && actingAs !== null && view.picker === actingAs;
  const count = `${view.board.length} trésor${view.board.length > 1 ? 's' : ''}`;
  const items = view.board.map((item, i) => {
    const inner = (
      <>
        <span className="bt-obj grid h-[60px] place-items-center" style={{ animationDelay: `${(i % 4) * 0.5}s` }}>
          <LootObject item={item} />
        </span>
        <span className="bt-label">{item.kind === 'coin' ? `${item.value} ${SHORT.coin}` : SHORT[item.kind]}</span>
      </>
    );
    // Sur le pont, les trésors sont jetés en vrac : chacun garde un petit angle qui lui est propre.
    const tilt = bare ? { transform: `rotate(${((i * 37) % 11) - 5}deg) translateY(${((i * 23) % 9) - 4}px)` } : undefined;
    return (
      <li key={i} className="flex justify-center" style={tilt}>
        {myTurn ? (
          <button type="button" className="bt-item bt-take" onClick={() => sendMove({ type: 'take', index: i })} aria-label={`Prendre : ${itemText(item)}`} title={ITEM_HINT[item.kind]}>
            {inner}
          </button>
        ) : (
          <div className="bt-item" title={`${itemText(item)} — ${ITEM_HINT[item.kind]}`}>
            {inner}
          </div>
        )}
      </li>
    );
  });
  if (bare) {
    return (
      <section className="flex w-full flex-col items-center" aria-label="Sur le pont">
        <h3 className="sr-only">Sur le pont</h3>
        {view.board.length === 0 ? (
          <p className="py-6 text-center italic text-[#3a2410]">Le pont est vide… pour l’instant.</p>
        ) : (
          <ul className={`flex max-w-[430px] flex-wrap justify-center gap-x-3 gap-y-1 ${myTurn ? 'bt-loot-mine' : ''}`}>{items}</ul>
        )}
        <span className="bt-label mt-1.5">{count}</span>
      </section>
    );
  }
  return (
    <section className={`bt-cloth ${myTurn ? 'is-mine' : ''}`} aria-label="Sur le pont">
      <div className="mb-1 flex items-baseline justify-between px-2">
        <h3 className="bt-title text-[1.55rem] text-[#3a2410] [text-shadow:0_1px_0_rgba(255,235,190,.55)]">Sur le pont</h3>
        <span className="bt-label">{count}</span>
      </div>
      {view.board.length === 0 ? (
        <p className="py-6 text-center italic text-[#3a2410]">Le pont est vide… pour l’instant.</p>
      ) : (
        <ul className="grid grid-cols-4 gap-y-2 sm:grid-cols-8">{items}</ul>
      )}
    </section>
  );
}

const DECK = { kind: 'deck' } as const;

/** Lanterne de pont qui se balance doucement et éclaire l'équipage. */
function Lantern({ side }: { side: 'left' | 'right' }) {
  return (
    <div className={`bt-lantern ${side}`} aria-hidden="true">
      <svg viewBox="0 0 60 130" width="60" height="130">
        <defs>
          <radialGradient id="bt-lamp" cx="50%" cy="55%" r="55%">
            <stop offset="0" stopColor="#fffbe0" />
            <stop offset=".4" stopColor="#ffd36a" />
            <stop offset="1" stopColor="#c86a12" />
          </radialGradient>
          <linearGradient id="bt-brass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5e3f12" />
            <stop offset=".4" stopColor="#e9c06a" />
            <stop offset="1" stopColor="#6e4c18" />
          </linearGradient>
        </defs>
        <path d="M30,0 V30" stroke="#2a1a0a" strokeWidth="2.5" />
        <circle cx="30" cy="34" r="5" fill="none" stroke="url(#bt-brass)" strokeWidth="2.5" />
        <path d="M18,48 L30,38 L42,48 Z" fill="url(#bt-brass)" />
        <rect x="16" y="48" width="28" height="4" rx="1.5" fill="url(#bt-brass)" />
        <path d="M18,52 L42,52 L44,100 L16,100 Z" fill="url(#bt-lamp)" opacity=".95" />
        <path d="M30,64 C24,74 26,84 30,88 C34,84 36,74 30,64 Z" fill="#fff" opacity=".9" className="bt-wick" />
        <path d="M18,52 L16,100 M42,52 L44,100 M30,52 V100" stroke="#3a2410" strokeWidth="2.2" />
        <rect x="13" y="100" width="34" height="6" rx="2" fill="url(#bt-brass)" />
        <path d="M20,106 L40,106 L34,114 L26,114 Z" fill="#4a2c10" />
      </svg>
    </div>
  );
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

// ───────── Parchemin d'action (seulement quand c'est à toi) ─────────

function actionFor({
  view,
  actingAs,
  privateView,
  canAct,
  nameOf,
  seatOf,
  sendMove,
  aim,
  setAim,
}: {
  view: PlunderView;
  actingAs: PlayerId | null;
  privateView: boolean;
  canAct: boolean;
  nameOf: NameOf;
  seatOf: (id: PlayerId | null) => number;
  sendMove: (m: PlunderMove) => void;
  aim: PlayerId | null;
  setAim: (id: PlayerId | null) => void;
}): ReactNode {
  if (!canAct) return null;
  if (view.phase === 'prepare' && privateView && view.me && !view.me.prepared) {
    return <Prepare view={view} me={view.me} seatOf={seatOf} sendMove={sendMove} target={aim} setTarget={setAim} />;
  }
  if (view.phase === 'order' && actingAs === view.captain) {
    return <CaptainOrder view={view} nameOf={nameOf} seatOf={seatOf} sendMove={sendMove} />;
  }
  if (view.phase === 'courage' && view.config.courage === 'secret' && privateView && view.me?.courage === null) {
    return <Courage view={view} me={actingAs!} seatOf={seatOf} sendMove={sendMove} />;
  }
  if (view.phase === 'courage' && view.config.courage === 'table' && actingAs === view.reporter && view.toReport.length > 0) {
    return <ReportCowards view={view} nameOf={nameOf} seatOf={seatOf} sendMove={sendMove} />;
  }
  return null;
}

function Prepare({
  view,
  me,
  seatOf,
  sendMove,
  target,
  setTarget,
}: {
  view: PlunderView;
  me: NonNullable<PlunderView['me']>;
  seatOf: (id: PlayerId | null) => number;
  sendMove: (m: PlunderMove) => void;
  target: PlayerId | null;
  setTarget: (id: PlayerId | null) => void;
}) {
  const [charge, setCharge] = useState<Charge | null>(null);
  useEffect(() => setCharge(null), [view.round, me.id]);
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
      <div className="bt-muted mt-4 text-center text-sm italic">Qui vises-tu ? (tu peux aussi toucher un pirate sur le pont)</div>
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
              <Medal id={p.id} size={48} captain={p.id === view.captain} hurt={p.wounds > 0} />
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
          <Medal id={p.id} size={44} captain={p.id === view.captain} hurt={p.wounds > 0} />
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
              <Medal id={p.id} size={26} />
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
              <Medal id={id} size={44} />
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
  cinematic = false,
  round = 0,
  onStep,
}: {
  shots: Shot[];
  divers: PlayerId[];
  nameOf: NameOf;
  seatOf: (id: PlayerId | null) => number;
  captain: PlayerId;
  onDone: () => void;
  /** Le duel est joué en 3D sur le pont : ici, seulement la pluie, l'éclair et le récit. */
  cinematic?: boolean;
  round?: number;
  onStep?: (duel: DeckDuel | null) => void;
}) {
  if (cinematic) return <StormDuel shots={shots} divers={divers} nameOf={nameOf} onDone={onDone} round={round} onStep={onStep} />;
  return <FlatGunfight shots={shots} divers={divers} nameOf={nameOf} seatOf={seatOf} captain={captain} onDone={onDone} />;
}

/** Pluie dessinée en CSS : deux couches (loin, près), des gouttes réparties au hasard mais toujours pareil. */
const RAIN = (() => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const drops = (n: number, near: boolean) =>
    Array.from({ length: n }, () => ({
      left: `${(rnd() * 120 - 10).toFixed(1)}%`,
      h: Math.round(near ? 90 + rnd() * 90 : 40 + rnd() * 50),
      dur: (near ? 0.3 + rnd() * 0.15 : 0.42 + rnd() * 0.25).toFixed(2),
      delay: (-rnd() * 1.2).toFixed(2),
    }));
  return { far: drops(150, false), near: drops(55, true) };
})();

function StormDuel({
  shots,
  divers,
  nameOf,
  onDone,
  round,
  onStep,
}: {
  shots: Shot[];
  divers: PlayerId[];
  nameOf: NameOf;
  onDone: () => void;
  round: number;
  onStep?: (duel: DeckDuel | null) => void;
}) {
  /** -1 : plongeons, puis un tir après l'autre. */
  const [step, setStep] = useState(-1);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (step === -1) {
      onStep?.(null);
      divers.forEach((_, k) => sfx.splash(k * 0.15));
      t = setTimeout(() => setStep(0), divers.length ? 1400 : 600);
    } else if (step < shots.length) {
      const s = shots[step]!;
      onStep?.({ key: `${round}-${step}`, shooter: s.shooter, target: s.target, charge: s.charge, hit: s.hit });
      if (s.charge === 'wet') sfx.blank(0.6);
      else sfx.bang(0.6, s.hit ? 0.75 : 0.45);
      t = setTimeout(() => setStep(step + 1), 2100);
    } else {
      onStep?.(null);
      t = setTimeout(onDone, 300);
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const shot = step >= 0 ? shots[step] : undefined;
  return (
    <div className="bt-fight is-3d" onClick={onDone} role="dialog" aria-label="La fusillade">
      <div className="bt3-rain far" aria-hidden="true">
        {RAIN.far.map((d, i) => (
          <i key={i} style={{ left: d.left, height: d.h, animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` }} />
        ))}
      </div>
      <div className="bt3-rain near" aria-hidden="true">
        {RAIN.near.map((d, i) => (
          <i key={i} style={{ left: d.left, height: d.h, animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` }} />
        ))}
      </div>
      <div className="bt3-lightning" aria-hidden="true" />
      {shot && (
        <div key={step} className="bt3-pan" aria-hidden="true">
          {shot.charge === 'wet' ? <span className="wet">Clic…</span> : shot.hit ? <span>PAN !</span> : <span className="miss">PAN…</span>}
        </div>
      )}
      <div className="bt3-duel-bar" onClick={(e) => e.stopPropagation()}>
        <span className="text-[13px] font-bold uppercase tracking-[0.18em] text-[#b9cad6]">{shot ? `Tir ${step + 1} sur ${shots.length}` : 'Feu !'}</span>
        <span className="flex gap-1.5" aria-hidden>
          {shots.map((_, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full ${i <= step ? 'bg-[#ffd36a]' : 'bg-white/25'}`} />
          ))}
        </span>
        <span className="text-[17px] font-bold">
          {!shot ? (
            divers.length > 0 ? (
              <>
                {divers.map(nameOf).join(', ')} plonge{divers.length > 1 ? 'nt' : ''} dans la cale !
              </>
            ) : (
              'Les pistolets sont braqués…'
            )
          ) : (
            <>
              {nameOf(shot.shooter)} tire sur {nameOf(shot.target)} :{' '}
              {shot.charge === 'wet' ? (
                <strong className="text-[#c9d6df]">balle à blanc, rien ne se passe.</strong>
              ) : shot.hit ? (
                <strong className="text-[#ff7a6b]">touché !</strong>
              ) : (
                <strong className="text-[#ffd36a]">raté, la cible a plongé.</strong>
              )}
            </>
          )}
        </span>
        <button type="button" className="bt3-skip" onClick={onDone}>
          Passer
        </button>
      </div>
    </div>
  );
}

function FlatGunfight({
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
  const roomy = useMediaQuery('(min-width: 640px)');
  const duel = roomy ? 124 : 92;
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
      <div className="flex w-full flex-col items-center gap-6 px-4 text-center text-[#f4e6c4] [font-family:'Outfit',sans-serif]">
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
            <div className="flex items-center justify-center gap-1 sm:gap-6">
              <div className="flex flex-col items-center gap-2">
                <Medal id={shot.shooter} size={duel} captain={shot.shooter === captain} />
                <span className="bt-title text-2xl text-[#f6e3b8]">{nameOf(shot.shooter)}</span>
              </div>
              <div className="relative">
                <span className="bt-recoil inline-block">
                  <RichIcon name="blunderbuss" metal="steel" size={roomy ? 110 : 76} />
                </span>
                {shot.charge === 'wet' ? <span className="bt-smoke" /> : <span className="bt-flash" />}
              </div>
              <div className="flex flex-col items-center gap-2">
                <Medal id={shot.target} size={duel} captain={shot.target === captain} hurt={shot.hit} />
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

function Journal({ lines, open = false }: { lines: string[]; open?: boolean }) {
  const recent = lines.slice(-8).reverse();
  return (
    <details open={open} className="mt-6 rounded-xl border border-[#3a2410] bg-black/40 px-4 py-2.5 text-[0.95rem] backdrop-blur-[2px]">
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
