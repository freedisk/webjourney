# Changelog

Les changements notables de Capsule sont consignés ici. Le projet utilise une
chronologie simple tant qu'aucune version publique sémantique n'est publiée.

## Non publié

### AI-002 — Mise en forme intelligente

- Bouton IA dans les éditeurs de création et de modification, avec proposition
  Markdown destinée à améliorer la lisibilité sans résumé ni enrichissement.
- Dialogue comparatif rendu/source, annulation sûre et application explicite au
  brouillon ; la sauvegarde reste une action utilisateur distincte.
- Masquage serveur des références et légendes d'images privées, restauration
  uniquement après contrôle exact de présence, unicité et ordre des marqueurs.
- Route BYOK authentifiée `no-store`, quota AI-001 partagé, sortie tronquée ou
  invalide rejetée sans modifier la note et aucune migration Supabase.

### HELP-001 — Centre d'aide contextuel

- Centre d'aide statique, recherchable et utilisable au clavier avec neuf
  rubriques couvrant notes, images, organisation, partage, PWA, IA et dépannage.
- Démarrage rapide facultatif dont la progression non sensible reste uniquement
  dans le navigateur et peut être masquée ou réinitialisée.
- Accès depuis le menu, `Ctrl/Cmd+K`, l'état vide, la barre Markdown, le guide
  images et les paramètres IA, avec ouverture directe de la bonne rubrique.
- Mise en page neo-brutaliste responsive, focus confiné/restitué et aucun appel
  réseau propre au centre d'aide.

### AI-001 — BYOK Anthropic sécurisé

- Modes clé de session en mémoire et clé synchronisée chiffrée par Supabase
  Vault, sans relecture du secret dans l'interface.
- Catalogue Anthropic dynamique et modèle choisi parmi ceux réellement
  disponibles avec la clé utilisateur.
- Authentification systématique, entrées/sorties bornées, erreurs fournisseur
  normalisées et quota atomique de 10 appels par minute et par utilisateur.
- Routes `no-store`, purge Vault à la suppression et aucun fallback implicite
  vers la clé Vercel historique.
- Migration `20260827094500`, audit SQL 9/9 et 59 tests locaux verts.

### UX-002 — Neo-brutalism fonctionnel

- En-tête responsive hiérarchisé, menu secondaire et navigation mobile iOS.
- Dialogues accessibles, toasts avec annulation, skeletons et états vides.
- Palette `Ctrl/Cmd+K` et barre Markdown avec écriture, double vue et aperçu.
- Kanban tactile Pointer Events avec déplacement explicite de repli.
- Partage système, transitions progressives et mouvement réduit.
- Raccourcis PWA Nouvelle note/Rechercher et cache statique `v2`.
- Correctif de stabilisation : champs nommés, fond de modale inerte et toasts
  réversibles portés au-dessus des overlays.

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

- HELP-001 : PR #14, fusion `21f5a0c`, Vercel Production
  `dpl_Aei4LLUvZjAfakpV9gno9Fposk4Z`, gate 4/4, smoke public 8/8, recette UI
  authentifiée et nettoyage synthétique vérifiés.
- AI-001 : PR #12, fusion `02816d7`, Vercel Production
  `dpl_Hqd243nNWJc3c8asExazAi4XN4GN`, smoke réel 30/30, recette UI et
  nettoyage synthétique vérifiés.
- Stabilisation UX-002 : PR #10, fusion `d270646`, Vercel Production
  `dpl_DdJPSbouBg8eGzKS2N7P333SQsr2`, recette authentifiée synthétique et
  nettoyage contrôlé.
- UX-002 : PR #8, fusion `b07dc19`, Vercel Production
  `dpl_GbTa5UHM6fuZU1z1abRnMXYxhXa5` et smoke publics conformes.
- PR #6 fusionnée au commit `4c77786` ; sprint produit images en production.
- Vercel Production `dpl_J2uYuQ7qoiG8xztaHNMrwcmr73b5` vérifié `READY` sur
  Node 24.x, alias public et smoke tests conformes.
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
