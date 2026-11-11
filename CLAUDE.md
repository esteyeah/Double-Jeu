# Consignes pour Claude

## Mettre le site à jour

Le site en ligne (Render, voir `render.yaml`) se redéploie tout seul à chaque push sur `main`.
Le propriétaire veut que chaque modification demandée soit mise en ligne sans étape manuelle de sa part.

Une fois une modification terminée :

1. Vérifier qu'elle ne casse rien :
   - `pnpm typecheck`
   - `pnpm test` (ou au moins les tests du jeu touché : `pnpm --filter @arcade/<jeu> test`)
   - `pnpm build`
2. Si les trois passent : committer et pousser directement sur `main` (`git push origin HEAD:main`).
   Render reconstruit le site en quelques minutes.
3. Si l'un des trois échoue : ne pas pousser sur `main`. Corriger, ou pousser sur une branche à part et l'expliquer.

Ne jamais committer `apps/web/AGENTS.md` (fichier généré par `next dev`).
