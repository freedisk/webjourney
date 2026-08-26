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

### Limite isolée

Docker Desktop n'est pas installé sur ce poste ; le `db reset` conteneurisé est
donc suivi séparément par `TOOL-002`. Cette absence n'a pas bloqué la capture
stricte, la validation transactionnelle ni l'activation de l'historique CLI.

## Modèle d'entrée

```markdown
## YYYY-MM-DD — Sujet

### Objectif

### Changements

### Décisions

### Validation

### Références
```
