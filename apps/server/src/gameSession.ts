import {
  applyDeadline,
  applyMove,
  cryptoRng,
  nextBotMove,
  snapshotFor,
  type AnyGameModule,
  type GameResult,
  type GameSnapshot,
  type PlayerId,
  type PlayerInfo,
  type SetupExtras,
} from '@arcade/game-sdk';

export interface GameSessionHooks {
  /** Bot, ou humain déconnecté depuis trop longtemps. */
  isAutomated(id: PlayerId): boolean;
  /** Appelé après chaque coup accepté : le salon renvoie une vue à chaque joueur. */
  onChange(): void;
  onEnd(result: GameResult): void;
}

/** Une partie en cours côté serveur : l'état complet ne sort jamais d'ici. */
export class GameSession {
  private state: unknown;
  private seq = 0;
  private readonly rng = cryptoRng();
  private botTimer: NodeJS.Timeout | null = null;
  private deadlineTimer: NodeJS.Timeout | null = null;
  private disposed = false;

  constructor(
    readonly mod: AnyGameModule,
    readonly players: PlayerInfo[],
    config: unknown,
    private readonly hooks: GameSessionHooks,
    extras?: SetupExtras,
  ) {
    this.state = mod.setup(players, config, this.rng, extras);
    this.scheduleDeadline();
  }

  get result(): GameResult | null {
    return this.mod.result(this.state);
  }

  snapshot(viewer: PlayerId | null): GameSnapshot {
    return snapshotFor(this.mod, this.state, viewer, this.seq);
  }

  /** Renvoie `null` si le coup est accepté, sinon le motif du refus. */
  submit(by: PlayerId, rawMove: unknown): string | null {
    const out = applyMove(this.mod, this.state, by, rawMove, this.rng);
    if (!out.ok) return out.error;
    this.commit(out.state);
    return null;
  }

  /** À appeler quand la liste des joueurs automatisés change. */
  scheduleBots(): void {
    if (this.disposed) return;
    if (this.botTimer) clearTimeout(this.botTimer);
    this.botTimer = null;
    if (this.result || !this.mod.bot) return;
    if (!this.players.some((p) => this.hooks.isAutomated(p.id))) return;

    // Petit délai pour que les coups des bots restent lisibles à l'écran.
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      if (this.disposed) return;
      const automated = this.players.map((p) => p.id).filter((id) => this.hooks.isAutomated(id));
      const next = nextBotMove(this.mod, this.state, automated, this.rng);
      if (!next) return;
      const out = applyMove(this.mod, this.state, next.by, next.move, this.rng);
      if (out.ok) this.commit(out.state);
      else console.warn(`[bot] coup refusé pour ${next.by} : ${out.error}`);
    }, 450 + this.rng.int(650));
  }

  dispose(): void {
    this.disposed = true;
    if (this.botTimer) clearTimeout(this.botTimer);
    if (this.deadlineTimer) clearTimeout(this.deadlineTimer);
    this.botTimer = null;
    this.deadlineTimer = null;
  }

  /** Chrono imposé par le serveur : à l'échéance, le moteur décide de la suite. */
  private scheduleDeadline(): void {
    if (this.deadlineTimer) clearTimeout(this.deadlineTimer);
    this.deadlineTimer = null;
    const at = this.mod.deadline?.(this.state) ?? null;
    if (this.disposed || at === null || this.result) return;
    this.deadlineTimer = setTimeout(
      () => {
        this.deadlineTimer = null;
        if (this.disposed) return;
        const next = applyDeadline(this.mod, this.state, this.rng);
        if (next) this.commit(next);
        else this.scheduleDeadline();
      },
      Math.max(0, at - Date.now()) + 50,
    );
  }

  private commit(state: unknown): void {
    this.state = state;
    this.seq++;
    this.hooks.onChange();
    const result = this.result;
    if (result) this.hooks.onEnd(result);
    this.scheduleDeadline();
    this.scheduleBots();
  }
}
