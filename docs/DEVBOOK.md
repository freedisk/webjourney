# Devbook — Capsule

Le devbook résume les travaux techniques et leurs preuves. La transcription
complète des échanges se trouve dans `docs/journal/`.

## 2026-03-05 — Fondation

- Initialisation Next.js et identité visuelle.
- Authentification Supabase email/mot de passe.
- CRUD des notes, recherche instantanée, tags et filtres.
- Résumé Anthropic et premières corrections UI.
- Documentation pilotée historiquement par `CLAUDE.md`.

## 2026-03-06 — Lecture, organisation et partage

- Modale détail, copie, édition inline et cartes dépliables.
- Couleurs, vue liste/split panel et notes épinglées.
- Rendu Markdown, animations et raccourcis clavier.
- Statistiques Recharts.
- Partage public par token avec policy RLS anonyme.
- Vue Kanban et persistance de colonne/ordre.

## 2026-03-07 — Ergonomie et renommage

- Création par modale et protection contre la perte de modifications.
- Taille de caractères persistée et réorganisation des actions.
- Renommage de Webjourney vers Capsule.

## 2026-08-26 — Audit initial de reprise

### Constat

- `app/page.js` proche de 3 000 lignes.
- README générique et documentation en dérive.
- Huit erreurs lint, aucun test, cinq vulnérabilités élevées.
- Aucun Storage ou migration versionnée pour les images.
- Schéma historique Supabase absent de Git.

### Décision

Ajouter les images sans refactor global : helpers purs, éditeur réutilisable,
bucket privé, références Markdown stables et compensations explicites.

## 2026-08-26 — Images privées

- Commit principal : `3a6c28e feat: add private images to notes`.
- Ajout par sélecteur multiple et copier/coller au curseur.
- Table `note_images`, bucket `note-images`, six policies RLS/Storage.
- Duplication avec nouveaux UUID et nouveaux objets.
- Suppression Storage avant cascade SQL.
- Partage avec signature serveur de dix minutes.
- Migration appliquée via SQL Editor puis privilèges durcis.

### Validation

- Recette utilisateur : collage, duplication et suppression validés.
- Supabase : 11 contrôles structurels et 10 contrôles détaillés verts.
- Audit npm ramené de cinq alertes élevées à zéro.
- Production Vercel validée.

## 2026-08-26 — CI et protection de `main`

- `16682be` : workflow GitHub Actions.
- `20ac113` puis PR #1 : alignement et validation réelle du gate.
- Ruleset `main-quality-gate` : PR obligatoire, branche à jour et contrôle
  `Quality gate` strict, sans bypass.
- Le workflow utilise Node 24 et exécute installation, lint, tests, build et
  audit élevé.

## 2026-08-26 — PWA iPhone/iPad

- `5b77dd3` : manifeste, service worker, offline et icônes.
- `ff44ae9` : archivage du prompt Claude historique.
- PR #2 fusionnée au commit `8018800`.
- Production Vercel `READY`, endpoints PWA en 200 et assets identiques au Git.
- Installation Safari validée fonctionnelle par l'utilisateur sur iPad.

## 2026-08-26 — Documentation durable et baseline Supabase

### Objectif

- Reconstituer le journal complet de la tâche.
- Installer une documentation pérenne et une gouvernance de mise à jour.
- Baseliner le schéma Supabase et activer l'historique CLI sans rejouer de DDL
  déjà appliqué.

### Réalisation

- Branche : `codex/supabase-baseline-docs`.
- Journal : reconstitué depuis le début de la tâche, puis maintenu au fil des
  opérations ; secrets et contexte interne exclus.
- Documentation durable : socle créé, liens locaux contrôlés et anciennes
  affirmations Supabase remises à jour.
- CLI Supabase 2.116.0 installée comme dépendance de développement.
- Accès local `Capsule-CLI` créé puis dépôt lié au projet Webjourney
  `yteconbqwmozpxjaxxey`.
- Photographie déclarative stricte de production conservée dans
  `supabase/schemas`, sans donnée métier ni secret.
- Baseline `20260826000000_baseline_existing_schema.sql` créée à partir de cet
  état ; migration images conservée comme seconde étape.
- Audit SQL réutilisable : 12/12 invariants vrais avant et après réparation.
- Les deux migrations ont été exécutées dans une transaction de validation,
  puis entièrement annulées par `ROLLBACK`.
- Historique distant réparé sans rejouer le SQL : les versions
  `20260826000000` et `20260826120000` sont alignées local/distant.
- `supabase db push --dry-run --linked` confirme la base distante à jour.
- Commits `889c16d` et `b8d1148`, PR GitHub #3 fusionnée au commit `1c634d2`.
- Les deux exécutions finales du `Quality gate` sont vertes.
- Déploiement Vercel Production `dpl_75up2j5sSVdMfpTU9AGbNYbT356t` en `READY`,
  SHA Git vérifié, alias public actif et six smoke tests conformes.
- Après réapparition ponctuelle d'un ancien compte Supabase dans le gestionnaire
  d'identifiants Windows, l'accès nommé `Capsule-CLI` a été recréé. Deux
  processus CLI indépendants ont confirmé le projet Webjourney actif et les deux
  versions de migration alignées local/production.

### Limite isolée

Docker Desktop n'est pas installé sur ce poste ; le `db reset` conteneurisé est
donc suivi séparément par `TOOL-002`. Cette absence n'a pas bloqué la capture
stricte, la validation transactionnelle ni l'activation de l'historique CLI.

## 2026-08-26 — Sprint produit images

### Objectif

Améliorer l'acquisition et la consultation des images sans changer le schéma
Supabase ni les invariants de confidentialité et d'upload différé.

### Changements

- Pipeline navigateur : sources JPEG/PNG/WebP jusqu'à 20 Mio, décodage protégé
  à 40 mégapixels, réduction à 2 048 px et tentatives WebP jusqu'à 5 Mio.
- Ajout par sélection, copier/coller ou glisser-déposer, traitement séquentiel,
  erreurs par fichier et progression de préparation puis de sauvegarde.
- Cartes d'aperçu enrichies et visionneuse plein écran avec compteur, clavier,
  geste horizontal, confinement/restitution du focus et original signé.
- Progression Storage par phase/fichier et compensation conservée ; le callback
  d'interface ne peut pas interrompre l'opération.
- `OPS-001` : audit read-only des références Markdown, métadonnées et objets du
  bucket, avec classificateur pur testé et commande d'exploitation.
- `TOOL-001` : Node 24.19 / npm 11 verrouillés par fichiers de version et
  métadonnées package.
- Documentation images, architecture, décisions, tests, runbook et backlog
  synchronisés.

### Validation locale et distante

- `npm run validate` : ESLint propre, 5 fichiers et 31/31 tests, build Next.js
  16.3.3 réussi.
- `npm run security:audit -- --audit-level=high` : zéro vulnérabilité.
- Recette Chrome réelle : PNG 3 200×2 000 vers WebP 2 048×1 280, sous la limite,
  Markdown inséré, aperçu et fermeture de la visionneuse par `Échap`.
- Recette authentifiée à deux images : rendu, compteur, navigation et édition
  validés ; objets, note et compte synthétiques ensuite supprimés et vérifiés.
- `npm run ops:audit-images` sur la production : 20 notes, 1 métadonnée,
  1 objet Storage et zéro incohérence dans les six catégories.
- Supabase : deux migrations alignées, dry-run vide et audit de schéma 12/12.
- Smoke build local : `/`, `/login`, manifeste, service worker et `/offline` en
  200 ; `/api/resumer` sans session en 401.

### Décisions

- Pas de migration : le contrat final reste JPEG/PNG/WebP, 5 Mio et bucket
  privé existant.
- La progression indique des phases et fichiers ; l'API Supabase ne publie pas
  de mesure fiable des octets envoyés.
- Aucun nettoyage automatique des orphelins ; toute suppression exige une revue
  et une autorisation distinctes.
- `QA-001`, `SEC-001`, `OPS-002` et la corbeille restent séparés : ils exigent
  respectivement une cible de test isolée, une politique de quota, une solution
  d'observabilité et une règle de rétention.

### Références

- Branche : `codex/image-product-sprint`.
- Sprint : `docs/sprints/SPRINT_IMAGE_PRODUCT_2026-08-26.md`.

## Modèle d'entrée

```markdown
## YYYY-MM-DD — Sujet

### Objectif

### Changements

### Décisions

### Validation

### Références
```
