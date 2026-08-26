# Changelog

Les changements notables de Capsule sont consignés ici. Le projet utilise une
chronologie simple tant qu'aucune version publique sémantique n'est publiée.

## Non publié

### Expérience images

- Compression WebP locale, limite source de 20 Mio, dimension maximale de
  2 048 px et garde-fou contre les images démesurées.
- Ajout par glisser-déposer, progression de préparation/envoi et erreurs par
  fichier sans abandonner les fichiers valides.
- Galerie responsive avec visionneuse plein écran, navigation clavier et geste
  horizontal.
- Rapport d'intégrité read-only entre Markdown, métadonnées et Storage privé.
- Runtime de développement, CI et hébergement verrouillé sur Node 24 / npm 11.

### Documentation

- Journal horodaté reconstitué depuis le début de la tâche Codex.
- Gouvernance documentaire, architecture, devbook, mémoire, backlog, runbook,
  décisions, tests, sécurité et registre des erreurs.

### Base de données

- CLI Supabase 2.116.0 versionnée et dépôt lié au projet Webjourney.
- Photographie déclarative stricte du schéma de production.
- Baseline historique `20260826000000` et audit SQL non destructif 12/12.
- Historique distant aligné sur les deux migrations sans rejeu du DDL ; dry-run
  de production vide.

### Déployé

- PR #3 fusionnée sur `main` au commit `1c634d2`.
- Déploiement Vercel Production vérifié `READY`, alias public et smoke tests
  conformes.

## 2026-08-26 — PWA, CI et images privées

### Ajouté

- Images privées dans les notes par fichier et copier/coller.
- Métadonnées `note_images`, bucket privé et politiques RLS Storage.
- Duplication, suppression compensée et partage par URL signée.
- Tests unitaires Vitest.
- Workflow GitHub Actions et protection obligatoire de `main`.
- PWA installable sur iPhone/iPad, icônes et repli hors ligne.
- Documentation de développement, images, déploiement et PWA.

### Sécurité

- Réduction des privilèges `authenticated` sur `note_images`.
- Authentification de `/api/resumer` avant tout détail de configuration.
- Réduction à dix minutes des URL signées de partage public.
- Mise à jour des dépendances : audit npm ramené de cinq alertes élevées à zéro.

### Déployé

- Images en production sur Vercel et Supabase.
- PWA validée fonctionnelle après installation Safari sur iPad.
