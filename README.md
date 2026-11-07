# Faux-Semblants

Arcade de jeux à rôles cachés et de bluff : en ligne entre amis, ou sur un seul téléphone qu'on se passe.

Nom de travail, à changer librement. Jeux disponibles :

- **Réacteur** (4 à 8 joueurs) : bluff et cartes coupées à l'aveugle, bots possibles.
- **Garde à vue** (4 à 8 joueurs) : jeu de parole. Un Enquêteur interroge des suspects qui glissent des mots secrets dans leurs réponses : les innocents partagent la même liste, le Coupable en a une autre. Avant l'accusation, chaque suspect parie en secret sur la réussite de l'Enquêteur. Il se joue autour d'une table ou en appel vocal.
- **Le Trône Vide** (5 à 10 joueurs) : élections, édits votés en secret, pouvoirs du Régent et un Usurpateur caché. Bots possibles ; vote à main levée proposé en mode un seul téléphone.
- **Butin** (3 à 8 joueurs) : des pirates se partagent un trésor, pistolet au poing. Charge sèche ou mouillée, visées, plongeon dans la cale, partage. Bots possibles ; plongeon annoncé à voix haute en mode un seul téléphone.
- **Expédition** (5 à 10 joueurs) : des Mutins sabotent une expédition polaire. Cordées votées, cartes Réussite/Sabotage secrètes, variante avec Cartographe et Espion. Bots possibles ; vote à main levée proposé en mode un seul téléphone.
- **Faux Jetons** (2 à 6 joueurs) : bluff à la cour d'une cité marchande. Deux influences cachées, des ducats, des actions de personnage qu'on peut annoncer sans les avoir, des contres et des contestations dans un délai imposé. Bots possibles.

## Obtenir un lien à partager

[![Déployer sur Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/esteyeah/Plateforme)

1. Clique sur le bouton et connecte-toi à Render avec ton compte GitHub.
2. Valide (« Apply » ou « Deploy Blueprint »). Le premier build prend quelques minutes.
3. Render affiche l'adresse du jeu, du type `https://faux-semblants-xxxx.onrender.com`, à partager à tes amis.

La configuration vient de `render.yaml`. Avec la formule gratuite, le service s'endort après environ 15 minutes sans visite : la première visite suivante prend une minute environ. Un réveil ou un redéploiement efface les salons en cours.

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
    court/          Faux Jetons : moteur (annonces, contres, contestations), bots, plateau, tests
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

**Mode un seul téléphone** : quand `needsPrivacy` est vrai, l'écran demande de passer le téléphone au joueur attendu. Ce joueur confirme, puis l'écran privé s'affiche, et il se reverrouille après chaque action. Sinon, un écran public partagé n'affiche que la vue spectateur. Un bouton permet de « revoir ses informations secrètes ».

**Robustesse** : déconnexion → 30 s de grâce, puis un bot joue à la place du joueur jusqu'à son retour. Le jeton dans `localStorage` permet de reprendre sa place après un rafraîchissement.

## Ajouter un jeu

1. Créer `packages/games/<id>/` sur le modèle de `reactor/` :
   - `shared.ts` : types, schémas de coups ;
   - `engine.ts` : le module ;
   - `bot.ts` ;
   - `client/Board.tsx` : reçoit `BoardProps`.
2. L'enregistrer dans `apps/server/src/games.ts` et dans `apps/web/src/games/registry.ts` (et passer `ready: true` dans le catalogue).
3. L'ajouter à `transpilePackages` dans `apps/web/next.config.ts`, et en dépendance de `apps/web` et `apps/server`.

Pour un chrono imposé, implémenter `deadline(state)` et `onDeadline(state, rng, now)` : le serveur (ou le navigateur, en mode local) applique l'échéance même si personne ne joue. Garde à vue s'en sert pour la fin de l'interrogatoire et le délai d'accusation.

Dans `meta` : `supportsBots: false` pour un jeu de parole (le lobby masque alors les bots), et `settings` pour proposer des options à l'hôte (durée, manches…), avec `hotseatDefaults` pour les valeurs suggérées en mode un seul téléphone. Les valeurs sont validées par le `configSchema` du jeu.
4. Écrire les tests, dont une simulation de milliers de parties avec `simulate()`.

Les plateaux utilisent les jetons de couleur de la plateforme (`bg-surface`, `text-muted`, `text-tech`…) définis dans `apps/web/src/app/globals.css`.

## Déploiement

- **Tout-en-un (Render ou tout hébergeur Node)** : build avec `NEXT_PUBLIC_SERVER_URL=same-origin pnpm build`, puis `node scripts/play.mjs --no-build`. Le service écoute sur `PORT`. Voir `render.yaml`.
- **Serveur** : `pnpm --filter @arcade/server build` puis `node apps/server/dist/index.js`. Variables : `PORT`, `CORS_ORIGIN` (origines autorisées, séparées par des virgules ; obligatoire en production). Il faut un hébergeur qui garde les WebSockets ouverts : Fly.io, Railway, Render, VPS…
- **Front** : Vercel ou `next start`. Variable : `NEXT_PUBLIC_SERVER_URL`, l'URL publique du serveur de jeu.

## Limites actuelles

- Parties et sessions en mémoire : un redémarrage du serveur coupe les parties en cours (Redis prévu).
- Pas encore de comptes, de points ni de déblocages (prévus).
- Mode local : il fonctionne sans réseau une fois la page chargée, mais l'application n'est pas encore installable hors ligne (PWA prévue).
- Bots du Trône Vide : entre bots seulement, la Couronne gagne 55 à 85 % des parties selon la table.
- Bots d'Expédition : les loyaux déduisent les Mutins des sabotages, mais sans discussion les Mutins gagnent encore 46 à 93 % des parties entre bots (plus à 8 joueurs et au-delà).
- Bots de Réacteur volontairement simples : entre bots seulement, les Saboteurs gagnent environ 85 % des parties. Avec des humains, c'est la discussion qui équilibre.
