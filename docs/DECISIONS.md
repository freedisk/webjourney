# Journal des décisions d'architecture

Les décisions acceptées sont durables. Une décision remplacée reste dans le
journal avec un lien vers celle qui la remplace.

## ADR-001 — Images dans un bucket privé

- **Statut** : accepté.
- **Date** : 2026-08-26.
- **Contexte** : les notes privées doivent accepter fichiers et collage.
- **Décision** : bucket Supabase privé `note-images`, RLS par propriétaire et
  métadonnées dans `public.note_images`.
- **Conséquences** : aucune URL publique stable ; signature requise au rendu ;
  suppression Storage distincte de la cascade SQL.

## ADR-002 — Référence Markdown stable

- **Statut** : accepté.
- **Date** : 2026-08-26.
- **Décision** : stocker `![alt](capsule-image/<uuid>)` dans `notes.contenu`.
- **Raison** : une URL signée expire et ne constitue pas un identifiant durable.
- **Conséquences** : le renderer a besoin d'une table UUID → URL signée ; les
  duplications doivent réécrire les UUID.

## ADR-003 — Upload différé et compensation

- **Statut** : accepté.
- **Date** : 2026-08-26.
- **Décision** : conserver les fichiers en mémoire jusqu'à Sauver/Créer, puis
  supprimer les objets déjà envoyés si une étape ultérieure échoue.
- **Raison** : réduire les objets orphelins lors d'une annulation ou d'un échec.
- **Conséquences** : les très gros brouillons restent limités par la mémoire du
  navigateur ; la limite unitaire est fixée à 5 Mio.

## ADR-004 — Partage public signé côté serveur

- **Statut** : accepté.
- **Date** : 2026-08-26.
- **Décision** : la page serveur valide token, note, image et chemin avant de
  signer pour dix minutes avec une clé serveur.
- **Raison** : permettre le partage sans rendre le bucket public.
- **Conséquences** : une URL déjà émise peut rester valable au plus dix minutes
  après désactivation du partage.

## ADR-005 — PWA sans données privées hors ligne

- **Statut** : accepté.
- **Date** : 2026-08-26.
- **Décision** : précacher uniquement le shell, les icônes et `/offline`.
- **Raison** : éviter une copie non chiffrée de notes privées dans le cache.
- **Conséquences** : l'application est installable, mais les notes nécessitent
  une connexion.

## ADR-006 — Gate GitHub avant Vercel

- **Statut** : accepté.
- **Date** : 2026-08-26.
- **Décision** : PR obligatoire vers `main`, branche à jour, contrôle strict
  `Quality gate`, aucun bypass ; Vercel déploie uniquement après fusion.
- **Raison** : rendre lint, tests, build et audit bloquants.
- **Conséquences** : une latence GitHub Actions bloque volontairement la release.

## ADR-007 — Baseline Supabase puis migrations forward-only

- **Statut** : accepté.
- **Date** : 2026-08-26.
- **Contexte** : le noyau historique a été créé via Dashboard/SQL Editor et la
  migration images a été exécutée manuellement.
- **Décision** : conserver une photographie déclarative stricte, versionner la
  baseline `20260826000000`, marquer cette baseline et la migration images
  `20260826120000` comme déjà appliquées, puis imposer des migrations
  versionnées et forward-only.
- **Validation** : transaction SQL complète annulée par `ROLLBACK`, audit
  12/12, historique local/distant aligné et `db push --dry-run` vide.
- **Conséquences** : le dépôt devient reconstructible ; toute correction de
  production passe par une nouvelle migration, jamais par l'édition d'une
  migration déjà appliquée. Le test conteneurisé `db reset` reste suivi
  séparément par `TOOL-002`.

## Modèle ADR

```markdown
## ADR-XXX — Titre

- **Statut** : proposé | accepté | remplacé.
- **Date** : YYYY-MM-DD.
- **Contexte** :
- **Décision** :
- **Raison** :
- **Conséquences** :
```
