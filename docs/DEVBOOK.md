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
- PR #6 : commits `66a8ca6` et `42ebd7d`, deux passages du `Quality gate` verts.
- GitHub a conservé temporairement `mergeable: unknown` malgré l'absence de
  conflit ; l'API de fusion standard a appliqué le ruleset sans bypass et créé
  le commit `4c77786`.
- Vercel Production `dpl_J2uYuQ7qoiG8xztaHNMrwcmr73b5` : `READY`, branche
  `main`, SHA exact `4c77786`, alias public actif et Node 24.x confirmé.
- Smoke public : `/`, `/login`, manifeste, service worker et `/offline` en 200 ;
  manifeste `standalone` avec trois icônes, service worker `no-store` et API
  sans session en 401.
- Audit images rejoué après déploiement : 20 notes, 1 métadonnée, 1 objet et
  zéro incohérence.

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
- Pull request : GitHub #6.
- Fusion : `4c77786a260b4f0a2cc286603ec22f0d593930e8`.
- Déploiement : `dpl_J2uYuQ7qoiG8xztaHNMrwcmr73b5`.
- Sprint : `docs/sprints/SPRINT_IMAGE_PRODUCT_2026-08-26.md`.

## 2026-08-27 — UX-002 Neo-brutalism fonctionnel

### Objectif

Faire évoluer l'identité brutaliste vers une expérience plus lisible,
productive et tactile, sans changer le modèle Supabase ni la confidentialité.

### Changements

- en-tête hiérarchisé, sélecteur de vues, menu secondaire et navigation mobile
  tenant compte des zones sûres iOS ;
- primitives `IconButton`, `Dialog`, `ToastViewport`, `Skeleton` et
  `EmptyState`, avec focus visible, confinement/restauration et annonces ARIA ;
- palette `Ctrl/Cmd+K` pour créer, rechercher, changer de vue ou ouvrir une note ;
- barre de mise en forme Markdown, modes écrire/double/aperçu et transformations
  pures testées ;
- Kanban Pointer Events tactile avec poignée dédiée et sélecteur de colonne ;
- partage Web Share avec repli presse-papiers, transitions de vues progressives
  et mouvement réduit ;
- raccourcis PWA Nouvelle note/Rechercher et cache statique renouvelé en `v2` ;
- annulation réversible des déplacements et épinglages, feedback en toasts,
  skeleton initial et états vides orientés action ;
- écran de connexion aligné sur la nouvelle hiérarchie visuelle.

### Validation locale

- ESLint propre et **46/46 tests** répartis dans neuf fichiers ;
- recette synthétique sans donnée privée : 390 × 844, 1 024 × 1 366 et
  1 416 × 975 sans débordement horizontal ;
- thèmes clair/sombre, palette, dialogue, focus initial, aperçu Markdown double,
  toast Annuler et menu secondaire contrôlés dans le navigateur ;
- aucune migration ni écriture Supabase nécessaire.

### État de livraison

`DONE` — PR fonctionnelle #8 puis stabilisation #10, avec deux gates de branche
verts pour chaque livraison, fusions standard `b07dc19` puis `d270646`, gates de
`main` verts et Vercel Production `READY`. La recette authentifiée synthétique
couvre Markdown, accessibilité modale, annulations, Kanban, duplication et
suppression. Le compte éphémère, ses notes et ses objets ont été supprimés et
leur absence contrôlée. Les sept routes/URL publiques répondent, l'API sans
session reste en 401 et l'audit images demeure propre.

### Références

- Branche : `codex/ux-002-neo-brutalism`.
- Pull requests : GitHub #8 et #10.
- Fusions : `b07dc19aa9764f7fd585366c14d190a7a5e580f2` puis
  `d270646901a3404987427b439c4c2caf1810c5dc`.
- Déploiement fonctionnel final : `dpl_DdJPSbouBg8eGzKS2N7P333SQsr2`.
- Sprint : `docs/sprints/SPRINT_UX_002_2026-08-27.md`.

## 2026-08-27 — AI-001 BYOK Anthropic sécurisé

### Objectif

Remplacer le modèle et la clé partagée codés en dur par une configuration
Anthropic explicite par utilisateur, sans persistance navigateur dangereuse ni
régression sur les notes, images et la PWA.

### Changements

- dialogue **Paramètres IA** accessible depuis le menu et `Ctrl/Cmd+K` ;
- clé éphémère conservée uniquement en mémoire ou clé multi-appareil chiffrée
  dans Supabase Vault ;
- catalogue `/v1/models`, sélection validée et préférence synchronisée ;
- routes serveur authentifiées, `no-store`, entrées bornées et erreurs sûres ;
- quota PostgreSQL atomique de 10 sorties externes par minute/utilisateur ;
- suppression explicite du secret et purge automatique à la suppression du
  compte ; aucun fallback vers `ANTHROPIC_API_KEY`.

### Validation et livraison

- migration `20260827094500` prévisualisée dans `BEGIN`/`ROLLBACK`, puis
  appliquée atomiquement et inscrite dans l'historique distant ;
- un premier dry-run a identifié une révocation Vault trop large, corrigée avant
  toute écriture persistante ;
- audit production AI-001 : 9/9 ; cycle factice chiffrer/lire/purger exécuté
  dans une transaction annulée, sans résidu ;
- `npm run validate` : ESLint propre, 12 fichiers et 59/59 tests, build Next.js
  réussi ;
- PR #12 fusionnée sans bypass après quatre contrôles verts au SHA
  `02816d7462a2a8a5c11ad52c13b99b1f397839fe` ;
- Vercel Production `dpl_Hqd243nNWJc3c8asExazAi4XN4GN` vérifié `READY` sur le
  SHA exact, alias public actif ;
- smoke production 30/30 et recette UI authentifiée conformes ; tous les objets
  synthétiques ont été purgés et leur absence contrôlée.

### État de livraison

`DONE` — migration, application, gate, déploiement, recette et nettoyage sont
validés en production.

### Références

- Branche : `codex/ai-byok-analysis`.
- Pull request : GitHub #12.
- Fusion : `02816d7462a2a8a5c11ad52c13b99b1f397839fe`.
- Déploiement : `dpl_Hqd243nNWJc3c8asExazAi4XN4GN`.
- Sprint : `docs/sprints/SPRINT_AI_001_2026-08-27.md`.
- Guide : `docs/AI_BYOK.md`.

## 2026-08-27 — HELP-001 Centre d'aide contextuel

### Objectif

Rendre les fonctions de Capsule compréhensibles dans leur contexte, sans visite
forcée, assistant distant ni nouvelle donnée serveur.

### Changements

- centre d'aide neo-brutaliste avec neuf rubriques et recherche locale
  insensible aux accents ;
- démarrage rapide facultatif de cinq repères, masquable et réinitialisable ;
- accès depuis le menu, la palette, l'état vide, l'éditeur et les paramètres IA ;
- ouverture directe sur Notes, Images ou IA selon le déclencheur ;
- progression minimale nettoyée dans `localStorage`, sans identifiant, note,
  image, clé ni télémétrie ;
- documentation d'usage, architecture, ADR et recette durable.

### Validation locale

- `npm run validate` : ESLint propre, 13 fichiers et 64/64 tests, build réussi ;
- audit npm élevé : zéro vulnérabilité ;
- recette Chrome authentifiée : recherche, navigation, checklist persistante,
  reset, actions contextuelles, palette, thèmes et restitution du focus validés ;
- mesure à 1 024 px sans débordement ; contrat mobile 390 px couvert par les
  règles responsive et leur test statique ;
- compte synthétique et ses dépendances supprimés, compteurs finaux à zéro.

### État de livraison

`DONE` — PR #14 fusionnée après 4/4 contrôles verts, déploiement Vercel
Production `READY`, smoke public 8/8 et recette UI authentifiée conformes. Le
compte synthétique a été supprimé avec tous les compteurs contrôlés à zéro.

### Références

- Branche : `codex/help-001-contextual-help`.
- Pull request : GitHub #14.
- Fusion : `21f5a0c3c5fc65fff19cb3de8d44a7728c61adfd`.
- Déploiement : `dpl_Aei4LLUvZjAfakpV9gno9Fposk4Z`.
- Sprint : `docs/sprints/SPRINT_HELP_001_2026-08-27.md`.
- Guide : `docs/HELP_CENTER.md`.

## 2026-08-27 — AI-002 Mise en forme intelligente

### Objectif

Proposer une mise en forme Markdown plus lisible sans résumé, sauvegarde
automatique, migration ou exposition des références d'images privées.

### Changements

- route authentifiée `POST /api/ai/format` réutilisant clé, modèle et quota
  atomique d'AI-001 ;
- consigne serveur bornée et sortie acceptée seulement avec `stop_reason`
  complet ;
- masquage opaque de chaque référence ou chemin privé, puis restauration après
  contrôle d'unicité et d'ordre de tous les marqueurs ;
- dialogue accessible comparant rendu et source Markdown, avec génération,
  erreur, annulation et application explicite ;
- application au seul brouillon si le snapshot est inchangé, puis sauvegarde
  manuelle habituelle ;
- aide contextuelle, documentation, tests unitaires et smoke BYOK étendus.

### Validation locale

- lint propre, **72/72 tests** dans quatorze fichiers et build Next.js 16.3.3
  réussi avec la nouvelle route dynamique ;
- smoke réel **36/36** : 401, 428, catalogue, résumé, mise en forme session et
  Vault, référence privée restaurée, suppression et quota ;
- chaque compte synthétique créé par un essai, y compris les deux diagnostics
  initiaux, a été supprimé par le nettoyage vérifié du script ;
- recette du composant final : rendu/Markdown, chargement, erreur, annulation,
  `Échap`, application et restitution du focus conformes ;
- mesures sans débordement à 390 × 844, 1 024 × 768 et 1 416 × 975 ; harnais
  temporaire supprimé après la recette ;
- un rejet réel du paramètre facultatif `temperature: 0` a été isolé sans corps
  d'erreur ni secret, corrigé puis inscrit dans `MISTAKES.md`.

### État de livraison

`REVIEW_REQUIRED` — validation locale terminée ; PR protégée et production
encore requises.

### Références

- Branche : `codex/ai-002-intelligent-formatting`.
- Sprint : `docs/sprints/SPRINT_AI_002_2026-08-27.md`.
- Guide : `docs/AI_FORMATTING.md`.

## Modèle d'entrée

```markdown
## YYYY-MM-DD — Sujet

### Objectif

### Changements

### Décisions

### Validation

### Références
```
