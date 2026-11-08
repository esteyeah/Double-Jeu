/** localStorage peut être indisponible (navigation privée, stockage bloqué) : on ne plante jamais. */
export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* ignoré */
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignoré */
    }
  },
};

export const KEYS = {
  token: 'arcade.token',
  name: 'arcade.name',
  localRoster: 'arcade.localRoster',
  /** Jeton de connexion au compte (distinct du jeton de session de jeu). */
  account: 'arcade.account',
} as const;
