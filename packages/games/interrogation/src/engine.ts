import {
  defineGame,
  visibleLog,
  type GameMeta,
  type PlayerId,
  type Rng,
} from '@arcade/game-sdk';
import { interrogationBot } from './bot';
import { CASES, WORDS } from './content';
import {
  GRILLS_PER_ROUND,
  WORDS_PER_SUSPECT,
  interrogationConfigSchema,
  interrogationMoveSchema,
  normalizeWord,
  type InterrogationConfig,
  type InterrogationMove,
  type InterrogationState,
  type InterrogationView,
  type RevealedWord,
  type Role,
  type RoundScore,
} from './shared';

export const interrogationMeta: GameMeta = {
  id: 'interrogation',
  name: 'Garde à vue',
  tagline: 'Glissez vos mots secrets dans vos réponses sous le nez de l’enquêteur.',
  minPlayers: 4,
  maxPlayers: 8,
  durationMinutes: [20, 45],
  supportsHotseat: true,
  supportsBots: false,
  settings: [
    {
      key: 'minutes',
      label: 'Durée de l’interrogatoire',
      choices: [
        { value: 3, label: '3 minutes' },
        { value: 5, label: '5 minutes' },
        { value: 7, label: '7 minutes' },
      ],
    },
    {
      key: 'rounds',
      label: 'Nombre de manches',
      choices: [
        { value: 0, label: 'Chacun enquête une fois' },
        { value: 3, label: '3 manches' },
        { value: 5, label: '5 manches' },
      ],
    },
  ],
  rules: [
    'Un fait divers vient d’éclater. À chaque manche, un joueur devient l’Enquêteur et les autres sont suspects. L’un d’eux est le Coupable : lui seul le sait.',
    'Chaque suspect reçoit en secret 3 mots à glisser dans ses réponses. Ceux du Coupable ont un lien avec l’affaire : bien placés, ils rapportent gros ; trop visibles, ils le trahissent.',
    'L’Enquêteur lit l’affaire à voix haute, puis interroge qui il veut, comme il veut, jusqu’à la fin du chrono. Les suspects doivent répondre, quitte à inventer. En ligne, jouez en appel vocal (ou par écrit dans le chat).',
    'S’il pense avoir entendu un mot secret, l’Enquêteur peut le griller (3 essais par manche) : si le mot appartient bien à ce suspect, il ne rapporte plus rien.',
    'Pour finir, l’Enquêteur accuse un suspect. Tout est révélé, chaque suspect coche les mots qu’il a vraiment placés (la table vérifie !), puis on compte les points.',
    'Enquêteur : 3 points s’il arrête le Coupable, +1 par mot grillé. Coupable en fuite : 3 points +1 par mot placé (rien s’il est arrêté). Innocent : 1 point par mot placé, +1 s’il est accusé à tort. Le plus haut total gagne.',
  ],
};

// ───────── Aides ─────────

function nameOf(s: InterrogationState, id: PlayerId): string {
  return s.players.find((p) => p.id === id)?.name ?? '?';
}

function isPlayer(s: InterrogationState, id: PlayerId | null): id is PlayerId {
  return id !== null && s.players.some((p) => p.id === id);
}

function suspects(s: InterrogationState): PlayerId[] {
  return s.players.map((p) => p.id).filter((id) => id !== s.inspector);
}

function isSuspect(s: InterrogationState, id: PlayerId): boolean {
  return isPlayer(s, id) && id !== s.inspector;
}

function wordsOf(s: InterrogationState, id: PlayerId): string[] {
  return Object.hasOwn(s.words, id) ? (s.words[id] as string[]) : [];
}

function burnedOf(s: InterrogationState, id: PlayerId): string[] {
  return Object.hasOwn(s.burned, id) ? (s.burned[id] as string[]) : [];
}

function log(s: InterrogationState, text: string): void {
  s.log.push({ text, visibleTo: 'all' });
}

const revealed = (s: InterrogationState) =>
  s.phase === 'review' || s.phase === 'scores' || s.phase === 'over';

/** Prépare une manche : Enquêteur suivant, nouvelle affaire, Coupable, mots secrets. */
function startRound(s: InterrogationState, round: number, rng: Rng): void {
  s.round = round;
  s.inspector = s.order[(round - 1) % s.order.length] as PlayerId;

  let freeCases = CASES.map((_, i) => i).filter((i) => !s.usedCases.includes(i));
  if (freeCases.length === 0) {
    s.usedCases = [];
    freeCases = CASES.map((_, i) => i);
  }
  s.caseIndex = rng.pick(freeCases);
  s.usedCases.push(s.caseIndex);

  const list = suspects(s);
  s.culprit = rng.pick(list);

  const needed = (list.length - 1) * WORDS_PER_SUSPECT;
  let pool = WORDS.filter((w) => !s.usedWords.includes(w));
  if (pool.length < needed) {
    s.usedWords = [];
    pool = [...WORDS];
  }
  const drawn = rng.shuffle(pool);
  const clues = rng.shuffle(CASES[s.caseIndex]!.clues);
  s.words = {};
  let cursor = 0;
  for (const id of list) {
    if (id === s.culprit) {
      s.words[id] = clues.slice(0, WORDS_PER_SUSPECT);
    } else {
      s.words[id] = drawn.slice(cursor, cursor + WORDS_PER_SUSPECT);
      cursor += WORDS_PER_SUSPECT;
      s.usedWords.push(...s.words[id]);
    }
  }

  s.burned = {};
  s.grills = [];
  s.declared = {};
  s.acked = [];
  s.accused = null;
  s.endsAt = null;
  s.phase = 'briefing';
  log(s, `Manche ${round} : ${nameOf(s, s.inspector)} mène l’enquête sur « ${CASES[s.caseIndex]!.title} ».`);
}

/** Compte les points de la manche une fois que tous les suspects ont déclaré. */
function scoreRound(s: InterrogationState): void {
  const caught = s.accused === s.culprit;
  const lines: RoundScore[] = [];
  let burnedTotal = 0;

  for (const id of suspects(s)) {
    const burned = burnedOf(s, id);
    burnedTotal += burned.length;
    const placed = (s.declared[id] ?? []).filter((w) => !burned.includes(w)).length;
    const reasons: string[] = [];
    let points = 0;
    if (id === s.culprit) {
      if (caught) {
        reasons.push('Arrêté : aucun point');
      } else {
        points += 3 + placed;
        reasons.push('En fuite (+3)');
        if (placed) reasons.push(`${placed} mot${placed > 1 ? 's' : ''} placé${placed > 1 ? 's' : ''} (+${placed})`);
      }
    } else {
      points += placed;
      if (placed) reasons.push(`${placed} mot${placed > 1 ? 's' : ''} placé${placed > 1 ? 's' : ''} (+${placed})`);
      if (s.accused === id) {
        points += 1;
        reasons.push('Accusé à tort (+1)');
      }
    }
    if (burned.length) reasons.push(`${burned.length} grillé${burned.length > 1 ? 's' : ''}`);
    lines.push({ playerId: id, points, reasons });
  }

  const inspectorPoints = (caught ? 3 : 0) + burnedTotal;
  const inspectorReasons: string[] = [];
  if (caught) inspectorReasons.push('Coupable arrêté (+3)');
  else inspectorReasons.push('Mauvaise piste');
  if (burnedTotal) inspectorReasons.push(`${burnedTotal} mot${burnedTotal > 1 ? 's' : ''} grillé${burnedTotal > 1 ? 's' : ''} (+${burnedTotal})`);
  lines.unshift({ playerId: s.inspector, points: inspectorPoints, reasons: inspectorReasons });

  for (const line of lines) s.scores[line.playerId] = (s.scores[line.playerId] ?? 0) + line.points;
  s.lastRound = lines;
  s.phase = 'scores';
  log(s, caught ? `Le Coupable ${nameOf(s, s.culprit)} est sous les verrous !` : `${nameOf(s, s.culprit)}, le vrai Coupable, s’en tire.`);
}

// ───────── Module ─────────

export const interrogation = defineGame<
  InterrogationState,
  InterrogationMove,
  InterrogationView,
  InterrogationConfig
>({
  meta: interrogationMeta,
  configSchema: interrogationConfigSchema,
  defaultConfig: { minutes: 5, rounds: 0 },
  moveSchema: interrogationMoveSchema,

  setup(players, config, rng) {
    const n = players.length;
    if (n < interrogationMeta.minPlayers || n > interrogationMeta.maxPlayers) {
      throw new Error(`Garde à vue se joue de 4 à 8 joueurs (reçu ${n}).`);
    }
    const order = rng.shuffle(players.map((p) => p.id));
    const s: InterrogationState = {
      players: players.map((p) => ({ ...p })),
      config,
      totalRounds: config.rounds === 0 ? n : config.rounds,
      round: 0,
      order,
      inspector: order[0] as PlayerId,
      caseIndex: 0,
      usedCases: [],
      usedWords: [],
      culprit: '',
      words: {},
      burned: {},
      grills: [],
      endsAt: null,
      accused: null,
      declared: {},
      acked: [],
      phase: 'briefing',
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      lastRound: null,
      log: [],
    };
    startRound(s, 1, rng);
    return s;
  },

  expectedActors(s) {
    switch (s.phase) {
      case 'briefing':
        return s.players.map((p) => p.id).filter((id) => !s.acked.includes(id));
      case 'interrogation':
      case 'scores':
        return [s.inspector];
      case 'review':
        return suspects(s).filter((id) => !Object.hasOwn(s.declared, id));
      default:
        return [];
    }
  },

  validate(s, by, move) {
    if (s.phase === 'over') return 'La partie est terminée.';
    if (!isPlayer(s, by)) return 'Tu ne participes pas à cette partie.';
    switch (move.type) {
      case 'ack':
        if (s.phase !== 'briefing') return "Ce n'est pas le moment.";
        if (s.acked.includes(by)) return 'Déjà confirmé.';
        return null;
      case 'grill': {
        if (s.phase !== 'interrogation') return "L'interrogatoire n'a pas lieu.";
        if (by !== s.inspector) return "Seul l'Enquêteur peut griller un mot.";
        if (!isSuspect(s, move.target)) return 'Choisis un suspect.';
        if (s.grills.length >= GRILLS_PER_ROUND) return 'Plus aucun essai pour cette manche.';
        const norm = normalizeWord(move.word);
        if (!norm) return 'Mot invalide.';
        const already = s.grills.some((g) => g.target === move.target && normalizeWord(g.word) === norm);
        if (already) return 'Déjà tenté chez ce suspect.';
        return null;
      }
      case 'accuse':
        if (s.phase !== 'interrogation') return "L'interrogatoire n'a pas lieu.";
        if (by !== s.inspector) return "Seul l'Enquêteur peut accuser.";
        if (!isSuspect(s, move.target)) return 'Choisis un suspect.';
        return null;
      case 'declare': {
        if (s.phase !== 'review') return "Ce n'est pas le moment.";
        if (!isSuspect(s, by)) return "L'Enquêteur n'a pas de mots à déclarer.";
        if (Object.hasOwn(s.declared, by)) return 'Déjà déclaré.';
        const own = wordsOf(s, by);
        const burned = burnedOf(s, by);
        if (new Set(move.placed).size !== move.placed.length) return 'Mot en double.';
        for (const w of move.placed) {
          if (!own.includes(w)) return `« ${w} » n'est pas un de tes mots.`;
          if (burned.includes(w)) return `« ${w} » a été grillé.`;
        }
        return null;
      }
      case 'next':
        if (s.phase !== 'scores') return "Ce n'est pas le moment.";
        if (by !== s.inspector) return "C'est à l'Enquêteur de lancer la suite.";
        return null;
    }
  },

  apply(state, by, move, rng, now) {
    const s = structuredClone(state);
    switch (move.type) {
      case 'ack': {
        s.acked.push(by);
        if (s.acked.length === s.players.length) {
          s.phase = 'interrogation';
          s.endsAt = now + s.config.minutes * 60_000;
          log(s, `L’interrogatoire commence : ${s.config.minutes} minutes.`);
        }
        return s;
      }
      case 'grill': {
        const norm = normalizeWord(move.word);
        const match = wordsOf(s, move.target).find(
          (w) => normalizeWord(w) === norm && !burnedOf(s, move.target).includes(w),
        );
        if (match) s.burned[move.target] = [...burnedOf(s, move.target), match];
        s.grills.push({ target: move.target, word: move.word, hit: !!match });
        log(
          s,
          `L’Enquêteur grille « ${move.word} » chez ${nameOf(s, move.target)} : ${match ? 'touché !' : 'raté.'}`,
        );
        return s;
      }
      case 'accuse': {
        s.accused = move.target;
        s.phase = 'review';
        log(s, `${nameOf(s, by)} accuse ${nameOf(s, move.target)}. Le Coupable était… ${nameOf(s, s.culprit)} !`);
        return s;
      }
      case 'declare': {
        s.declared[by] = move.placed;
        if (suspects(s).every((id) => Object.hasOwn(s.declared, id))) scoreRound(s);
        return s;
      }
      case 'next': {
        if (s.round >= s.totalRounds) {
          s.phase = 'over';
          log(s, 'Fin de l’enquête : place au classement final.');
        } else {
          startRound(s, s.round + 1, rng);
        }
        return s;
      }
    }
  },

  view(s, viewer): InterrogationView {
    const open = revealed(s);
    const me = isPlayer(s, viewer) ? viewer : null;
    const roleOf = (id: PlayerId): Role =>
      id === s.inspector ? 'inspector' : id === s.culprit ? 'culprit' : 'innocent';
    const c = CASES[s.caseIndex]!;

    let reveal: Record<PlayerId, RevealedWord[]> | null = null;
    if (open) {
      reveal = {};
      for (const id of suspects(s)) {
        const declared = Object.hasOwn(s.declared, id) ? (s.declared[id] as string[]) : null;
        reveal[id] = wordsOf(s, id).map((word) => ({
          word,
          burned: burnedOf(s, id).includes(word),
          placed: declared ? declared.includes(word) : null,
        }));
      }
    }

    return {
      phase: s.phase,
      round: s.round,
      totalRounds: s.totalRounds,
      inspector: s.inspector,
      case: { title: c.title, text: c.text },
      endsAt: s.endsAt,
      minutes: s.config.minutes,
      grillsLeft: GRILLS_PER_ROUND - s.grills.length,
      grills: s.grills,
      players: s.players.map((p) => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        score: s.scores[p.id] ?? 0,
        acked: s.acked.includes(p.id),
        declared: Object.hasOwn(s.declared, p.id),
        role: p.id === s.inspector || open || p.id === me ? roleOf(p.id) : null,
      })),
      me: me
        ? {
            id: me,
            role: roleOf(me),
            words: wordsOf(s, me).map((word) => ({ word, burned: burnedOf(s, me).includes(word) })),
          }
        : null,
      accused: s.accused,
      culprit: open ? s.culprit : null,
      reveal,
      lastRound: s.phase === 'scores' || s.phase === 'over' ? s.lastRound : null,
      log: visibleLog(s.log, viewer),
    };
  },

  result(s) {
    if (s.phase !== 'over') return null;
    const best = Math.max(...s.players.map((p) => s.scores[p.id] ?? 0));
    const winners = s.players.filter((p) => (s.scores[p.id] ?? 0) === best);
    return {
      winners: winners.map((p) => p.id),
      title:
        winners.length === 1
          ? `${winners[0]!.name} remporte l’enquête`
          : `Égalité : ${winners.map((p) => p.name).join(', ')}`,
      detail: `${best} point${best > 1 ? 's' : ''}`,
    };
  },

  // Pas de bots aux places (jeu de parole), mais un remplaçant minimal si quelqu'un se déconnecte.
  bot: interrogationBot,

  hotseat: {
    // Le rôle et les mots sont secrets : on se passe le téléphone pendant le briefing.
    needsPrivacy: (s) => s.phase === 'briefing',
  },
});
