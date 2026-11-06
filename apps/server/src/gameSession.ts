import {
  applyMove,
  cryptoRng,
  nextBotMove,
  snapshotFor,
  type AnyGameModule,
  type GameResult,
  type GameSnapshot,
  type PlayerId,
  type PlayerInfo,
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
  private disposed = false;

  constructor(
    readonly mod: AnyGameModule,
    readonly players: PlayerInfo[],
    private readonly hooks: GameSessionHooks,
  ) {
    this.state = mod.setup(players, mod.defaultConfig, this.rng);
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
    this.botTimer = null;
  }

  private commit(state: unknown): void {
    this.state = state;
    this.seq++;
    this.hooks.onChange();
    const result = this.result;
    if (result) this.hooks.onEnd(result);
    this.scheduleBots();
  }
}
