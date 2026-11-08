# Double Jeu

Jeux de société de bluff et de déduction : en ligne entre amis, ou sur un seul téléphone qu'on se passe.

Jeux disponibles :

- **Réacteur** (4 à 8 joueurs) : bluff et cartes coupées à l'aveugle, bots possibles.
- **Garde à vue** (4 à 8 joueurs) : jeu de parole. Un Enquêteur interroge des suspects qui glissent des mots secrets dans leurs réponses : les innocents partagent la même liste, le Coupable en a une autre. Avant l'accusation, chaque suspect parie en secret sur la réussite de l'Enquêteur. Il se joue autour d'une table ou en appel vocal.
- **Le Trône Vide** (5 à 10 joueurs) : élections, édits votés en secret, pouvoirs du Régent et un Usurpateur caché. Bots possibles ; vote à main levée proposé en mode un seul téléphone.
- **Butin** (3 à 8 joueurs) : des pirates se partagent un trésor, pistolet au poing. Charge sèche ou mouillée, visées, plongeon dans la cale, partage. Bots possibles ; plongeon annoncé à voix haute en mode un seul téléphone.
- **Expédition** (5 à 10 joueurs) : des Mutins sabotent une expédition polaire. Cordées votées, cartes Réussite/Sabotage secrètes, rôles spéciaux au choix (Cartographe, avec ou sans Espion). Bots possibles ; vote à main levée proposé en mode un seul téléphone.
- **La Cité** (2 à 6 joueurs) : bluff à la cour d'une cité marchande. Deux influences cachées, des écus, des actions de personnage qu'on peut annoncer sans les avoir (Banquier, Bourreau, Brigand, Émissaire, Garde, Mouchard, Mercenaire), des contres et des contestations dans un délai imposé. Avant la partie, l'hôte coche les personnages en jeu ; le lancement vérifie qu'il y a assez de cartes pour la table. Les annonces de chacun restent affichées (« A revendiqué : … ») : qui revendique plus de personnages que de cartes bluffe forcément. Bots possibles, qui contestent en tenant compte de ces annonces.
- **Le Chaudron** (3 à 8 joueurs) : une guilde d'alchimistes remplit un chaudron, ingrédient par ingrédient, en annonçant à voix haute ce qu'elle verse. Les Empoisonneurs y glissent de la Ciguë en mentant. Goûter (en secret), Écumer, Soupçonner (3 jetons : chassé de la guilde) et voter pour servir la potion quand on pense qu'elle atteint sa force. Bots possibles ; vote à main levée proposé en mode un seul téléphone.
- **Gobelets** (2 à 8 joueurs) : dés cachés sous les gobelets et enchères sur l'ensemble de la table (« 4 × Cinq »), As jokers, « Menteur ! » pour soulever les gobelets. Variantes : « Pile ! » (enchère exacte : on gagne un dé, même au-delà du nombre de départ), manche sèche au dernier dé, 3 à 5 dés par joueur. Bots possibles ; en mode un seul téléphone, on se passe le téléphone à chaque enchère.
- **Boussole** (2 à 6 joueurs) : jeu coopératif d'association de mots. Chacun écrit en secret quatre indices pour relier les mots de ses cartes (Nord, Est, Sud, Ouest), puis l'équipe reconstitue chaque boussole (cartes à replacer et à tourner, avec un ou deux leurres) pendant que son auteur reste muet. 522 mots de base, plus ceux que l'administrateur ajoute depuis le site. Sans bots.

## Obtenir un lien à partager

[![Déployer sur Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/esteyeah/double-jeu)

**Avant de cliquer** (5 minutes, gratuit, une seule fois) : crée la base qui gardera les comptes et les mots ajoutés.

1. Va sur [neon.com](https://neon.com), crée un compte (possible avec GitHub), puis un projet (région Europe, par exemple Frankfurt).
2. Copie l'adresse de connexion proposée par Neon (bouton « Connect »). Elle commence par `postgresql://`.

**Ensuite, sur Render :**

1. Clique sur le bouton ci-dessus et connecte-toi à Render avec ton compte GitHub.
2. Render demande deux valeurs :
   - `DATABASE_URL` : colle l'adresse copiée sur Neon ;
   - `ADMIN_USERS` : le pseudo que tu utiliseras pour ton compte (ex. `esteyeah`).
3. Valide (« Apply » ou « Deploy Blueprint »). Le premier build prend quelques minutes.
4. Render affiche l'adresse du jeu, du type `https://double-jeu-xxxx.onrender.com`, à partager à tes amis.
5. Sur le site, « Se connecter » → « Créer un compte » avec exactement le pseudo donné à l'étape 2 (fais-le tout de suite, avant que quelqu'un ne prenne ce pseudo). La page « Gérer les mots des jeux » apparaît dans « Mon compte ».

Le site est hébergé en Europe (Francfort) ; choisis aussi une région européenne pour la base Neon. Tout est gratuit, sans limite de durée : le site sur Render (formule gratuite) et la base sur Neon (offre gratuite). La configuration vient de `render.yaml`. Les deux valeurs se modifient plus tard dans l'onglet « Environment » du service sur Render.

À savoir :
- Avec la formule gratuite, le site s'endort après environ 15 minutes sans visite : la première visite suivante prend une minute environ. Un réveil ou un redéploiement coupe les salons en cours, mais pas les comptes ni les mots (ils sont dans la base).
- La base Neon se met en veille quand personne ne s'en sert et se réveille toute seule en quelques instants.
- Si la base est injoignable (adresse fausse, base supprimée, panne), le site démarre quand même : tous les jeux marchent, seuls les comptes et les mots ajoutés ne sont gardés qu'en mémoire jusqu'au redémarrage. La page « Mots des jeux » affiche alors un avertissement.
- Sur la page « Mots des jeux », « Télécharger (.txt) » fait une copie de secours de tes mots ; « Importer un fichier .txt » les remet.
- Évite les bases PostgreSQL gratuites de Render : elles expirent au bout de 30 jours.

## Jouer tout de suite

Prérequis :
- Node.js 22 (version « LTS » sur nodejs.org) ;
- pnpm, à installer une fois avec `npm install -g pnpm`.

```bash
pnpm install
```

```bash
pnpm play
```

Le terminal affiche deux adresses :

- `http://localhost:8080`, à ouvrir sur ton ordinateur ;
- `http://192.168.x.x:8080`, à donner à tes amis connectés au même Wi-Fi, sur leur téléphone.

Si un téléphone n'arrive pas à se connecter, autorise Node.js dans le pare-feu de l'ordinateur (Windows le demande au premier lancement). Pour relancer sans recompiler : `pnpm play --no-build`.

En local, les comptes et les mots ajoutés sont enregistrés dans `data/arcade.json`. Pour être administrateur :

```bash
ADMIN_USERS=TonPseudo pnpm play
```

(Sous Windows, dans PowerShell : `$env:ADMIN_USERS="TonPseudo"; pnpm play`.) Crée ensuite ton compte avec ce pseudo.

## Records

La page « 🏆 Records » (`/records`) garde les 10 meilleures performances de chaque record :

| Jeu | Records |
| --- | --- |
| Butin | plus gros butin en une partie |
| La Cité | plus d'écus amassés, plus de bluffs démasqués en une partie |
| Gobelets | plus de « Pile ! » réussis en une partie, plus de dés sous son gobelet (au-delà du départ) |
| Boussole | meilleur score d'équipe (en % du maximum) |

Seules les parties **en ligne** comptent (le serveur arbitre tout ; une partie sur un seul téléphone tourne dans le navigateur et pourrait être truquée), et jamais les bots ni un joueur remplacé par un bot. Le nom affiché est celui du compte si le joueur est connecté (avec un ✓), sinon son pseudo de salon. Quand une performance entre au tableau, le salon l'annonce dans la discussion.

Pour ajouter un record à un jeu : décrire le record dans `meta.records` (`key`, `label`, `unit`, `team`) et renvoyer les performances de fin de partie avec `recordValues(state)`.

## Comptes

- On peut toujours jouer **sans compte**. Un compte (pseudo + mot de passe, sans e-mail) garde ton pseudo ; les points et les déblocages viendront s'y rattacher.
- Mots de passe hachés avec scrypt (sel aléatoire) ; jetons de connexion aléatoires, stockés hachés en base, valables 30 jours ; 10 tentatives de connexion par minute et par adresse.
- **Administrateur** : les pseudos listés dans `ADMIN_USERS` (séparés par des virgules). Eux seuls voient la page « Mots des jeux » (`/admin/mots`) et peuvent appeler l'API d'ajout ou de suppression.
- Stockage : PostgreSQL si `DATABASE_URL` est défini, sinon un fichier JSON dans `DATA_DIR` (par défaut `./data`).

API (`/api`, même adresse que le jeu) :

| Requête | Rôle |
| --- | --- |
| `POST /api/auth/register`, `POST /api/auth/login` | `{ name, password }` → `{ token, user }` |
| `GET /api/auth/me`, `POST /api/auth/logout` | avec `Authorization: Bearer <token>` |
| `GET /api/records` | tableau des records (public) |
| `GET /api/words/compass` | mots ajoutés (public) |
| `POST /api/words/compass`, `DELETE /api/words/compass/:id` | réservé aux administrateurs |

## Développement

```bash
pnpm dev
```

- Front : http://localhost:3000
- Serveur de jeu : http://localhost:4000 (état : `/health`)

**Tester depuis un téléphone** sur le même Wi-Fi : ouvre `http://<IP-de-ton-ordinateur>:3000`. Le front contacte automatiquement le serveur sur le même hôte, port 4000.

| Commande | Rôle |
| --- | --- |
| `pnpm dev` | Front + serveur en mode développement |
| `pnpm test` | Tests des moteurs et tests d'intégration du serveur |
| `pnpm typecheck` | Vérification TypeScript de tout le monorepo |
| `pnpm build` puis `pnpm start` | Build et lancement en production |

## Structure

```
apps/
  web/        Next.js : accueil, salons en ligne, mode local, chat
  server/     Node + Socket.io : seule source de vérité des parties en ligne
packages/
  game-sdk/   Contrat GameModule, hasard (crypto / graine), runtime commun, simulateur
  protocol/   Événements Socket.io typés + schémas Zod
  games/
    reactor/        Moteur pur, bot, plateau React, tests
    interrogation/  Garde à vue : moteur, contenu (affaires, mots), plateau, tests
    throne/         Le Trône Vide : moteur, bots, plateau, tests
    plunder/        Butin : moteur, bots, plateau, tests
    expedition/     Expédition : moteur, bots (raisonnement probabiliste), plateau, tests
    court/          La Cité : moteur (annonces, contres, contestations), bots, plateau, tests
    cauldron/       Le Chaudron : moteur, bots (indices tirés des dégustations), plateau, tests
    cups/           Gobelets : moteur, bots (probabilités binomiales), plateau, tests
    compass/        Boussole : moteur, liste de mots, plateau, tests
```

## Comment ça marche

**Un jeu est une suite de fonctions pures** (`packages/game-sdk/src/types.ts`) :
`setup → expectedActors → validate → apply → view → result`, plus un `bot` facultatif et
`hotseat.needsPrivacy`. Le même module tourne :

- **en ligne** sur le serveur (`apps/server/src/gameSession.ts`) ;
- **en local** dans le navigateur (`apps/web/src/components/local/LocalGame.tsx`), sans connexion.

**Anti-triche (mode en ligne)**

1. L'état complet ne quitte jamais le serveur. Chaque socket reçoit `view(state, sonJoueur)` par un envoi individuel (`Room.broadcastSnapshots`).
2. L'identité vient d'un jeton secret (`sessions.ts`), jamais d'un identifiant envoyé par le client.
3. Chaque message passe par une limite de débit, une validation Zod, puis `validate` côté règles.
4. Le hasard est cryptographique (`cryptoRng`). Les positions des cartes cachées ne sont jamais envoyées.
5. Les bots reçoivent la même vue filtrée que les humains.

**Mode un seul téléphone** : avec un seul humain face à des bots, rien n'est caché : il voit toujours ses informations. Avec plusieurs humains, quand `needsPrivacy` est vrai, l'écran demande de passer le téléphone au joueur attendu. Ce joueur confirme, puis l'écran privé s'affiche, et il se reverrouille après chaque action. Sinon, un écran public partagé n'affiche que la vue spectateur. Un bouton permet de « revoir ses informations secrètes ».

**Robustesse** : déconnexion → 30 s de grâce, puis un bot joue à la place du joueur jusqu'à son retour. Le jeton dans `localStorage` permet de reprendre sa place après un rafraîchissement.

## Ajouter un jeu

1. Créer `packages/games/<id>/` sur le modèle de `reactor/` :
   - `shared.ts` : types, schémas de coups ;
   - `engine.ts` : le module ;
   - `bot.ts` ;
   - `client/Board.tsx` : reçoit `BoardProps`.
2. L'enregistrer dans `apps/server/src/games.ts` et dans `apps/web/src/games/registry.ts` (et passer `ready: true` dans le catalogue).
3. L'ajouter à `transpilePackages` dans `apps/web/next.config.ts`, et en dépendance de `apps/web` et `apps/server`.

Pour un jeu de mots, déclarer `wordBank: { base: LISTE }` : l'administrateur peut alors ajouter des mots depuis le site, et `setup(players, config, rng, extras)` les reçoit dans `extras.words` (en ligne comme en local).

Pour un chrono imposé, implémenter `deadline(state)` et `onDeadline(state, rng, now)` : le serveur (ou le navigateur, en mode local) applique l'échéance même si personne ne joue. Garde à vue s'en sert pour la fin de l'interrogatoire et le délai d'accusation.

Dans `meta` : `supportsBots: false` pour un jeu de parole (le lobby masque alors les bots), et `settings` pour proposer des options à l'hôte (durée, manches… ; `kind: 'multi'` pour des choix multiples bornés par `min`/`max`, `hint` pour décrire un choix). `canStart(joueurs, options)` permet de refuser un lancement avec un message clair (ex. pas assez de cartes), avec `hotseatDefaults` pour les valeurs suggérées en mode un seul téléphone. Les valeurs sont validées par le `configSchema` du jeu.
4. Écrire les tests, dont une simulation de milliers de parties avec `simulate()`.

Les plateaux utilisent les jetons de couleur de la plateforme (`bg-surface`, `text-muted`, `text-tech`…) définis dans `apps/web/src/app/globals.css`.

## Déploiement

- **Tout-en-un (Render ou tout hébergeur Node)** : build avec `NEXT_PUBLIC_SERVER_URL=same-origin pnpm build`, puis `node scripts/play.mjs --no-build`. Le service écoute sur `PORT`. Voir `render.yaml`.
- **Serveur** : `pnpm --filter @arcade/server build` puis `node apps/server/dist/index.js`. Variables : `PORT`, `CORS_ORIGIN` (origines autorisées, séparées par des virgules ; obligatoire en production), `DATABASE_URL` (PostgreSQL), `ADMIN_USERS` (pseudos administrateurs). Il faut un hébergeur qui garde les WebSockets ouverts : Fly.io, Railway, Render, VPS…
- **Front** : Vercel ou `next start`. Variable : `NEXT_PUBLIC_SERVER_URL`, l'URL publique du serveur de jeu.

## Limites actuelles

- Parties et sessions en mémoire : un redémarrage du serveur coupe les parties en cours (Redis prévu).
- Comptes sans e-mail : pas de récupération de mot de passe oublié. Points et déblocages pas encore branchés (prévus).
- Mode local : il fonctionne sans réseau une fois la page chargée, mais l'application n'est pas encore installable hors ligne (PWA prévue).
- Bots du Trône Vide : entre bots seulement, la Couronne gagne 55 à 85 % des parties selon la table.
- Bots d'Expédition : les loyaux déduisent les Mutins des sabotages, mais sans discussion les Mutins gagnent encore 46 à 93 % des parties entre bots (plus à 8 joueurs et au-delà).
- Bots du Chaudron : la force visée a été réglée par simulation ; entre bots, les Alchimistes gagnent 53 à 64 % des parties de 5 à 8 joueurs, mais 75 % à 3 ou 4 joueurs (un seul Empoisonneur, vite démasqué par les dégustations).
- Bots de Réacteur volontairement simples : entre bots seulement, les Saboteurs gagnent environ 85 % des parties. Avec des humains, c'est la discussion qui équilibre.
