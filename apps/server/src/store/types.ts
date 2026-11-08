/** Données durables : comptes, sessions de connexion et mots ajoutés depuis le site. */

export interface UserRecord {
  id: string;
  /** Pseudo tel que choisi (affichage). */
  name: string;
  /** Pseudo normalisé (unicité insensible à la casse et aux accents). */
  nameKey: string;
  /** `scrypt$<sel>$<empreinte>` : jamais le mot de passe lui-même. */
  passwordHash: string;
  createdAt: number;
}

export interface WordRecord {
  id: string;
  game: string;
  word: string;
  wordKey: string;
  createdBy: string;
  createdAt: number;
}

export interface RecordRow {
  id: string;
  game: string;
  key: string;
  value: number;
  detail: string | null;
  /** Nom(s) du ou des joueurs, tels qu'affichés au tableau. */
  names: string[];
  /** Tous les joueurs étaient connectés à leur compte. */
  verified: boolean;
  createdAt: number;
}

export interface Store {
  /** Prépare le stockage (tables, fichier…). */
  init(): Promise<void>;
  close(): Promise<void>;

  /** Crée le compte, ou renvoie null si le pseudo est déjà pris. */
  createUser(user: UserRecord): Promise<UserRecord | null>;
  findUserByKey(nameKey: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;

  /** Les jetons de connexion sont stockés hachés : une fuite de la base ne donne accès à aucun compte. */
  saveToken(tokenHash: string, userId: string, expiresAt: number): Promise<void>;
  /** Renvoie l'identifiant du compte si le jeton existe et n'a pas expiré. */
  findToken(tokenHash: string, now: number): Promise<string | null>;
  deleteToken(tokenHash: string): Promise<void>;

  listWords(): Promise<WordRecord[]>;
  /** Ajoute les mots ; ceux déjà présents (même clé, même jeu) sont ignorés. Renvoie ceux ajoutés. */
  addWords(words: WordRecord[]): Promise<WordRecord[]>;
  deleteWord(game: string, id: string): Promise<boolean>;

  listRecords(): Promise<RecordRow[]>;
  addRecord(record: RecordRow): Promise<void>;
  deleteRecords(ids: string[]): Promise<void>;
}
