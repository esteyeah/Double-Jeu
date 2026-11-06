import type { GameResult, PlayerId } from '@arcade/game-sdk';
import type { Ack, ChatMessage, RoomState, RoomStatus } from '@arcade/protocol';
import { GameSession } from './gameSession';
import { getGame } from './games';
import type { ArcadeSocket, IO } from './types';

/** Délai avant de libérer le siège d'un joueur déconnecté dans le lobby. */
export const LOBBY_GRACE_MS = 60_000;
/** Délai avant qu'un bot ne reprenne la main d'un joueur déconnecté en partie. */
export const GAME_GRACE_MS = 30_000;
const CHAT_HISTORY = 100;
const BOT_NAMES = ['Ada', 'Kepler', 'Vega', 'Orion', 'Nova', 'Hopper', 'Lyra', 'Atlas', 'Cassini'];

interface SeatEntry {
  id: PlayerId;
  name: string;
  isBot: boolean;
}

const ok = { ok: true } as const;

function defaultConfigOf(gameId: string): Record<string, unknown> {
  return { ...((getGame(gameId)?.defaultConfig as Record<string, unknown> | undefined) ?? {}) };
}
const fail = (error: string) => ({ ok: false, error }) as const;

export class Room {
  hostId: PlayerId;
  gameId: string;
  config: Record<string, unknown>;
  status: RoomStatus = 'lobby';
  private seats: SeatEntry[] = [];
  private spectators = new Map<PlayerId, string>();
  /** playerId → ids des sockets connectés (un joueur peut avoir plusieurs onglets). */
  private presence = new Map<PlayerId, Set<string>>();
  private graceTimers = new Map<PlayerId, NodeJS.Timeout>();
  private autopilot = new Set<PlayerId>();
  private game: GameSession | null = null;
  private chat: ChatMessage[] = [];
  private chatSeq = 0;
  private botSeq = 0;
  /** Horodatage du moment où plus aucun humain n'est connecté (pour le nettoyage). */
  emptySince: number | null = Date.now();

  constructor(
    private readonly io: IO,
    readonly code: string,
    hostId: PlayerId,
    gameId: string,
  ) {
    this.hostId = hostId;
    this.gameId = gameId;
    this.config = defaultConfigOf(gameId);
  }

  private get channel(): string {
    return `room:${this.code}`;
  }

  private get maxSeats(): number {
    return getGame(this.gameId)?.meta.maxPlayers ?? 8;
  }

  // ───────── Présence ─────────

  join(socket: ArcadeSocket, playerId: PlayerId, name: string): Ack {
    const seat = this.seats.find((s) => s.id === playerId);
    if (seat) {
      seat.name = name;
    } else if (this.spectators.has(playerId)) {
      this.spectators.set(playerId, name);
    } else if (this.status === 'lobby' && this.seats.length < this.maxSeats) {
      this.seats.push({ id: playerId, name, isBot: false });
      this.system(`${name} a rejoint le salon.`);
    } else {
      this.spectators.set(playerId, name);
      this.system(`${name} regarde la partie.`);
    }

    let sockets = this.presence.get(playerId);
    if (!sockets) this.presence.set(playerId, (sockets = new Set()));
    sockets.add(socket.id);
    socket.join(this.channel);
    socket.data.roomCode = this.code;
    this.emptySince = null;

    this.clearGrace(playerId);
    if (this.autopilot.delete(playerId)) {
      this.system(`${name} est de retour.`);
      this.game?.scheduleBots();
    }

    socket.emit('chat:history', this.chat);
    if (this.game) socket.emit('game:snapshot', this.game.snapshot(this.viewerFor(playerId)));
    else socket.emit('game:cleared');
    this.broadcastState();
    return ok;
  }

  /** Un socket se déconnecte (onglet fermé, réseau coupé…). */
  detach(socketId: string, playerId: PlayerId): void {
    const sockets = this.presence.get(playerId);
    if (!sockets?.delete(socketId)) return;
    if (sockets.size > 0) return;
    this.presence.delete(playerId);
    this.onPlayerOffline(playerId);
    this.touchEmptiness();
    this.broadcastState();
  }

  /** Départ volontaire, ou exclusion par l'hôte. */
  leave(playerId: PlayerId, reason: 'left' | 'kicked'): void {
    for (const socketId of this.presence.get(playerId) ?? []) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (!socket) continue;
      socket.leave(this.channel);
      socket.data.roomCode = null;
      socket.emit('room:left', { reason });
    }
    this.presence.delete(playerId);
    this.clearGrace(playerId);

    if (this.spectators.delete(playerId)) {
      this.touchEmptiness();
      this.broadcastState();
      return;
    }
    const seat = this.seats.find((s) => s.id === playerId);
    if (!seat) return;
    if (this.status === 'playing') {
      // On ne retire pas un siège en pleine partie : un bot prend le relais.
      this.autopilot.add(playerId);
      this.system(`${seat.name} a quitté la partie : un bot joue à sa place.`);
      this.game?.scheduleBots();
    } else {
      this.seats = this.seats.filter((s) => s.id !== playerId);
      this.system(`${seat.name} ${reason === 'kicked' ? 'a été exclu' : 'a quitté le salon'}.`);
    }
    this.ensureHost();
    this.touchEmptiness();
    this.broadcastState();
  }

  private onPlayerOffline(playerId: PlayerId): void {
    if (this.spectators.delete(playerId)) return;
    const seat = this.seats.find((s) => s.id === playerId);
    if (!seat || seat.isBot) return;
    this.clearGrace(playerId);
    const grace = this.status === 'playing' ? GAME_GRACE_MS : LOBBY_GRACE_MS;
    this.graceTimers.set(
      playerId,
      setTimeout(() => {
        this.graceTimers.delete(playerId);
        if (this.isConnected(playerId)) return;
        if (this.status === 'playing') {
          this.autopilot.add(playerId);
          this.system(`${seat.name} est absent : un bot joue à sa place.`);
          this.game?.scheduleBots();
        } else {
          this.seats = this.seats.filter((s) => s.id !== playerId);
          this.system(`${seat.name} a quitté le salon.`);
          this.ensureHost();
        }
        this.broadcastState();
      }, grace),
    );
  }

  private clearGrace(playerId: PlayerId): void {
    const t = this.graceTimers.get(playerId);
    if (t) clearTimeout(t);
    this.graceTimers.delete(playerId);
  }

  private isConnected(playerId: PlayerId): boolean {
    return (this.presence.get(playerId)?.size ?? 0) > 0;
  }

  private touchEmptiness(): void {
    if (this.presence.size === 0) this.emptySince ??= Date.now();
  }

  /** Si l'hôte n'est plus là, on passe la main au premier humain présent. */
  private ensureHost(): void {
    const humans = this.seats.filter((s) => !s.isBot).map((s) => s.id);
    const candidates = [...humans, ...this.spectators.keys()];
    if (candidates.includes(this.hostId) && this.isConnected(this.hostId)) return;
    const next = candidates.find((id) => this.isConnected(id)) ?? candidates[0];
    if (next && next !== this.hostId) {
      this.hostId = next;
      this.system(`${this.nameOf(next)} est maintenant l'hôte.`);
    }
  }

  // ───────── Actions de l'hôte ─────────

  private requireHost(playerId: PlayerId): Ack | null {
    return playerId === this.hostId ? null : fail("Seul l'hôte peut faire ça.");
  }

  setGame(playerId: PlayerId, gameId: string): Ack {
    const denied = this.requireHost(playerId);
    if (denied) return denied;
    if (this.status !== 'lobby') return fail('Impossible pendant une partie.');
    if (!getGame(gameId)) return fail('Ce jeu n’est pas encore disponible.');
    this.gameId = gameId;
    this.config = defaultConfigOf(gameId);
    this.broadcastState();
    return ok;
  }

  setConfig(playerId: PlayerId, config: Record<string, unknown>): Ack {
    const denied = this.requireHost(playerId);
    if (denied) return denied;
    if (this.status !== 'lobby') return fail('Impossible pendant une partie.');
    const mod = getGame(this.gameId);
    const parsed = mod?.configSchema.safeParse({ ...this.config, ...config });
    if (!parsed?.success) return fail('Option invalide.');
    this.config = parsed.data as Record<string, unknown>;
    this.broadcastState();
    return ok;
  }

  addBot(playerId: PlayerId): Ack {
    const denied = this.requireHost(playerId);
    if (denied) return denied;
    if (this.status !== 'lobby') return fail('Impossible pendant une partie.');
    if (!getGame(this.gameId)?.meta.supportsBots) return fail('Ce jeu se joue sans bots.');
    if (this.seats.length >= this.maxSeats) return fail('Le salon est complet.');
    const used = new Set(this.seats.map((s) => s.name));
    const name =
      BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${this.botSeq + 1}`;
    this.seats.push({ id: `bot_${this.code}_${++this.botSeq}`, name, isBot: true });
    this.broadcastState();
    return ok;
  }

  removeSeat(playerId: PlayerId, target: PlayerId): Ack {
    const denied = this.requireHost(playerId);
    if (denied) return denied;
    if (this.status === 'playing') return fail('Impossible pendant une partie.');
    if (target === playerId) return fail('Utilise « Quitter » pour partir.');
    const seat = this.seats.find((s) => s.id === target);
    if (!seat) return fail('Joueur introuvable.');
    if (seat.isBot) {
      this.seats = this.seats.filter((s) => s.id !== target);
      this.broadcastState();
    } else {
      this.leave(target, 'kicked');
    }
    return ok;
  }

  start(playerId: PlayerId): Ack {
    const denied = this.requireHost(playerId);
    if (denied) return denied;
    if (this.status === 'playing') return fail('La partie a déjà commencé.');
    const mod = getGame(this.gameId);
    if (!mod) return fail('Jeu indisponible.');
    const n = this.seats.length;
    if (n < mod.meta.minPlayers || n > mod.meta.maxPlayers) {
      return fail(`${mod.meta.name} se joue de ${mod.meta.minPlayers} à ${mod.meta.maxPlayers} joueurs.`);
    }
    if (!mod.meta.supportsBots && this.seats.some((s) => s.isBot)) {
      return fail(`${mod.meta.name} se joue sans bots : retire-les d'abord.`);
    }

    this.game?.dispose();
    this.autopilot.clear();
    this.status = 'playing';
    this.game = new GameSession(
      mod,
      this.seats.map((s) => ({ id: s.id, name: s.name, isBot: s.isBot })),
      this.config,
      {
        isAutomated: (id) => this.seats.find((s) => s.id === id)?.isBot === true || this.autopilot.has(id),
        onChange: () => this.broadcastSnapshots(),
        onEnd: (result) => this.onGameEnd(result),
      },
    );
    // Les absents du lobby repartent sur le délai de grâce « partie ».
    for (const s of this.seats) {
      if (!s.isBot && !this.isConnected(s.id)) this.onPlayerOffline(s.id);
    }
    this.system(`La partie de ${mod.meta.name} commence !`);
    this.broadcastState();
    this.broadcastSnapshots();
    this.game.scheduleBots();
    return ok;
  }

  backToLobby(playerId: PlayerId): Ack {
    const denied = this.requireHost(playerId);
    if (denied) return denied;
    if (this.status === 'lobby') return ok;
    const aborted = this.status === 'playing';
    this.game?.dispose();
    this.game = null;
    this.status = 'lobby';
    this.autopilot.clear();
    // Les absents libèrent leur siège, les spectateurs prennent les places libres.
    for (const s of [...this.seats]) {
      if (!s.isBot && !this.isConnected(s.id)) {
        this.clearGrace(s.id);
        this.seats = this.seats.filter((x) => x.id !== s.id);
      }
    }
    for (const [id, name] of [...this.spectators]) {
      if (this.seats.length >= this.maxSeats) break;
      this.spectators.delete(id);
      this.seats.push({ id, name, isBot: false });
    }
    this.ensureHost();
    this.system(aborted ? "L'hôte a interrompu la partie." : 'Retour au salon.');
    this.io.to(this.channel).emit('game:cleared');
    this.broadcastState();
    return ok;
  }

  // ───────── Jeu et chat ─────────

  move(playerId: PlayerId, move: unknown): Ack {
    if (!this.game || this.status !== 'playing') return fail('Aucune partie en cours.');
    if (this.autopilot.has(playerId)) {
      this.autopilot.delete(playerId);
      this.game.scheduleBots();
    }
    const error = this.game.submit(playerId, move);
    return error ? fail(error) : ok;
  }

  say(playerId: PlayerId, text: string): Ack {
    if (!this.presence.has(playerId)) return fail("Tu n'es pas dans ce salon.");
    this.pushChat({ playerId, name: this.nameOf(playerId), text });
    return ok;
  }

  private system(text: string): void {
    this.pushChat({ playerId: null, name: '', text, system: true });
  }

  private pushChat(msg: Omit<ChatMessage, 'id' | 'at'>): void {
    const full: ChatMessage = { ...msg, id: ++this.chatSeq, at: Date.now() };
    this.chat.push(full);
    if (this.chat.length > CHAT_HISTORY) this.chat.shift();
    this.io.to(this.channel).emit('chat:message', full);
  }

  // ───────── Diffusion ─────────

  private onGameEnd(result: GameResult): void {
    this.status = 'ended';
    const winners = result.winners.map((id) => this.nameOf(id)).join(', ');
    this.system(`${result.title} — ${winners}`);
    this.broadcastState();
  }

  /** Seuls les humains assis voient leur information privée ; les autres ont la vue publique. */
  private viewerFor(playerId: PlayerId): PlayerId | null {
    const seat = this.seats.find((s) => s.id === playerId);
    return seat && !seat.isBot && this.game?.players.some((p) => p.id === playerId) ? playerId : null;
  }

  /**
   * LE point clé anti-triche : chaque socket reçoit la vue calculée pour SON joueur,
   * par un emit individuel. L'état complet n'est jamais diffusé au salon.
   */
  private broadcastSnapshots(): void {
    if (!this.game) return;
    for (const [playerId, sockets] of this.presence) {
      const snapshot = this.game.snapshot(this.viewerFor(playerId));
      for (const socketId of sockets) this.io.to(socketId).emit('game:snapshot', snapshot);
    }
  }

  broadcastState(): void {
    this.io.to(this.channel).emit('room:state', this.publicState());
  }

  publicState(): RoomState {
    return {
      code: this.code,
      hostId: this.hostId,
      gameId: this.gameId,
      config: this.config,
      status: this.status,
      seats: this.seats.map((s) => ({
        id: s.id,
        name: s.name,
        isBot: s.isBot,
        connected: s.isBot || this.isConnected(s.id),
        autopilot: this.autopilot.has(s.id),
      })),
      spectators: [...this.spectators].map(([id, name]) => ({ id, name })),
    };
  }

  private nameOf(playerId: PlayerId): string {
    return this.seats.find((s) => s.id === playerId)?.name ?? this.spectators.get(playerId) ?? '?';
  }

  dispose(): void {
    this.game?.dispose();
    for (const t of this.graceTimers.values()) clearTimeout(t);
    this.graceTimers.clear();
  }
}
