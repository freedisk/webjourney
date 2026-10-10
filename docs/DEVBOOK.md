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

`DONE` — PR #16 fusionnée sans bypass au commit `029183a`, contrôle obligatoire
vert et Vercel Production `dpl_2DC5hXs1uTPp8Sc6oDZ4NE8zDeeT` vérifié `READY`
sur Node 24.x. Le smoke public passe **9/9** et le smoke BYOK authentifié de
production **36/36**, avec nettoyage automatique des objets synthétiques.
Aucune migration ou donnée Supabase n'a été modifiée.

### Références

- Branche : `codex/ai-002-intelligent-formatting`.
- Pull request : GitHub #16.
- Fusion : `029183a4fe00a6128c8d29467bd35953901a192c`.
- Déploiement : `dpl_2DC5hXs1uTPp8Sc6oDZ4NE8zDeeT`.
- Sprint : `docs/sprints/SPRINT_AI_002_2026-08-27.md`.
- Guide : `docs/AI_FORMATTING.md`.

## 2026-08-27 — AI-002-R1 Fiabilité des notes longues

### Diagnostic

- note de reproduction : 18 389 caractères, 3 211 mots, 140 phrases et un
  paragraphe principal de 18 370 caractères ; contenu jamais journalisé ;
- requête monolithique Sonnet 5 arrêtée après 75 secondes avec
  `AI_FORMAT_RESPONSE_TRUNCATED` ;
- métadonnées fournisseur : 3 224 tokens consommés pour seulement 903
  caractères visibles sur une section, à cause du thinking adaptatif par défaut.

### Correction

- découpage à partir de 10 000 caractères, blocs de 5 000 maximum et deux
  requêtes concurrentes ;
- `thinking: disabled` uniquement pour Sonnet/Opus 5 compatibles sur cette tâche
  mécanique, sans changer le modèle sélectionné ;
- masquage opaque des nombres, URL et tâches en plus des images, restauration
  stricte et validation globale de l'ordre et de la taille ;
- une seule reprise automatique de la section invalide, sans proposition
  partielle ; annulation propagée au serveur ;
- compteur visible et timeout client à 1 min 40 avec erreur réessayable.

### Validation locale

- lint, **80/80 tests**, build Next.js 16.3.3 et audit npm élevé à zéro ;
- appel fournisseur direct sur le cas exact : succès en 38,9 secondes ;
- smoke authentifié via la route : **40/40**, cas exact en 35,4 secondes,
  faits restaurés et compte synthétique supprimé ;
- recette du composant final à 1 416 px : temps et sections visibles, aucun
  débordement, annulation active et focus restitué ; harnais ensuite supprimé.

### État de livraison

`DONE` — PR #18 fusionnée sans bypass au commit `f9e4880`, `Quality gate` de
`main` vert et Vercel Production `dpl_Eo4kfkxigsMPTvd7u3zFYNMzxkpr` vérifié
`READY` sur Node 24.x. Smoke public **9/9** et smoke BYOK **40/40** ; le cas
réel termine en 37,95 secondes. Aucune migration Supabase.

### Références

- Branche : `codex/ai-002-long-note-reliability`.
- Pull request : GitHub #18.
- Fusion : `f9e4880217e95e99135708cefc8d448fd28bdeea`.
- Déploiement : `dpl_Eo4kfkxigsMPTvd7u3zFYNMzxkpr`.
- Sprint : `docs/sprints/SPRINT_AI_002_R1_2026-08-27.md`.
- Guide : `docs/AI_FORMATTING.md`.

## 2026-08-27 — PRINT-001 Impression et PDF fidèle

### Objectif

Permettre l'impression ou l'enregistrement PDF d'une note enregistrée, avec un
rendu lisible du Markdown et des images privées, sans moteur PDF, persistance ou
traitement serveur supplémentaire.

### Changements

- action **Imprimer / PDF** dans les détails cartes et liste, masquée pendant
  l'édition ;
- document papier sémantique avec titre, date, tags, contenu, liens, légendes et
  images, sans visionneuse ni contrôle interactif ;
- préflight des signatures privées, chargement et décodage bornés à 15 secondes,
  progression, annulation active et nouvelle tentative ;
- styles A4 progressifs, thème clair forcé, règles anti-coupure et isolation de
  toute l'interface lors de l'impression ;
- titre temporaire sûr, restauration systématique et avertissement sur la copie
  extérieure à Capsule ;
- dixième rubrique d'aide, guide technique, ADR et tests dédiés.

### Validation locale

- lint propre et **91/91 tests** dans seize fichiers ;
- recette synthétique d'une note longue avec deux images, titres, listes, lien,
  tableau et code : aucune erreur ou alerte console après correction M-018 ;
- aperçu desktop 1 416 × 900 et mobile 390 × 844 sans débordement horizontal,
  images décodées, focus initial correct et restitution au déclencheur ;
- harnais de recette supprimé avant commit ; `npm run validate` complet vert,
  build Next.js 16.3.3 réussi et audit npm élevé à zéro vulnérabilité.

### État de livraison

`DONE` — PR #20 fusionnée sans bypass au commit `532dd9a`, contrôle obligatoire
de `main` vert et Vercel Production `dpl_B38TAJBf2AWcUDXhV2tHgr33bawb`
vérifié `READY` sur le SHA exact. Le smoke public passe **9/9** et les onze
assets live contiennent les quatre empreintes fonctionnelles PRINT-001. Aucune
migration, donnée Supabase, variable Vercel ou dépendance n'a été modifiée.

### Références

- Branche : `codex/print-001`.
- Commit fonctionnel : `a679877ce4e4082595b28b69a4da253d7acb2b81`.
- Pull request : GitHub #20.
- Fusion : `532dd9a4365845eeef61b56390c4425cb812cf37`.
- Déploiement : `dpl_B38TAJBf2AWcUDXhV2tHgr33bawb`.
- Sprint : `docs/sprints/SPRINT_PRINT_001_2026-08-27.md`.
- Guide : `docs/PRINTING.md`.

## 2026-08-27 — SHARE-001 Aperçu social Open Graph

### Objectif

Donner aux liens Capsule une carte Messenger/Open Graph identifiable et
cohérente avec l'application, sans exposer le contenu privé des notes.

### Changements

- contrat centralisé pour titre, description, URL canonique, Open Graph et
  carte Twitter/X ;
- route d'image Next.js statique 1 200 × 630 réutilisant l'icône PWA et le
  langage neo-brutaliste ;
- métadonnées dédiées aux notes partagées : titre public seulement, description
  et image génériques ;
- guide de recette et explicitation du cache Messenger ;
- sept tests de contrat et de branchement ajoutés.

### Décisions

La carte n'est pas construite depuis une note : elle ne lit ni corps, ni tag,
ni image, ni URL signée. La seule donnée variable admise est le titre déjà
public sur la page de partage. Aucune migration, variable ou dépendance n'est
nécessaire.

### Validation locale

- défaut live reproduit avant correction : 200 et zéro balise sociale ;
- lint propre, 98/98 tests et build Next.js 16.3.3 réussi ;
- accueil et token invalide : quinze balises sociales chacun ;
- PNG réel 1 200 × 630, 78 628 octets et réponse `image/png` ;
- rendu visuel complet, lisible et sans erreur ou alerte console ;
- `npm run validate` complet vert et audit npm élevé à zéro vulnérabilité.

### État de livraison

`DONE` — PR #22 fusionnée sans bypass au commit `bb0afc4`, contrôle obligatoire
de `main` vert et Vercel Production `dpl_1qZRrzbxRhuDCUD3v9umFhL73Qdd`
vérifié `READY` au SHA exact. Le smoke robot passe **34/34** et le visuel public
est conforme sans erreur console. Aucune migration, donnée, variable ou
dépendance n'a été modifiée.

### Références

- Branche : `codex/share-001-open-graph`.
- Pull request : GitHub #22.
- Fusion : `bb0afc4326b39628d11f52f2637d77df15f52a8b`.
- Déploiement : `dpl_1qZRrzbxRhuDCUD3v9umFhL73Qdd`.
- Sprint : `docs/sprints/SPRINT_SHARE_001_2026-08-27.md`.
- Guide : `docs/SOCIAL_SHARING.md`.

## 2026-08-28 — REL-001 Version, À propos et mises à jour

### Objectif

Permettre d'identifier le build chargé sur chaque PWA, de lire les dernières
évolutions et de comparer explicitement cette identité à la production.

### Changements

- baseline SemVer passée à `1.0.0` dans le package et son lockfile ;
- SHA Git et date ISO figés par `next.config.mjs`, avec valeurs système Vercel
  puis replis Git/local ;
- footer responsive sans requête, menu et palette reliés à un dialogue
  **À propos** accessible ;
- changelog utilisateur de trois jalons, état hors ligne explicite et aide de
  dépannage PWA ;
- route publique `/api/version` dynamique, strictement validée et `no-store` ;
- guide de versioning, ADR-016, sprint et tests de contrat dédiés.

### Décisions

Le SemVer décrit le produit et le SHA le code exact ; aucun compteur externe
n'est introduit. La vérification ne se lance qu'au clic et ne transporte ni
session, ni note, ni image, ni secret. Les routes `/api/` restent hors du cache
du service worker.

### Validation locale

- lint propre, **105/105 tests** dans dix-huit fichiers ;
- build Next.js 16.3.3 réussi avec `/api/version` dynamique ;
- smoke HTTP 7/7 sur accueil, JSON, SemVer, SHA, date et en-têtes anti-cache ;
- audit npm élevé à zéro vulnérabilité ;
- preview Vercel `READY` sur `595987b`, smoke HTTPS authentifié **8/8** et PR
  #24 fusionnable avec deux `Quality gate` et Vercel en succès ;
- aucune migration, variable Vercel, donnée Supabase ou dépendance.

La recette navigateur locale est reportée à la preview HTTPS : le navigateur
intégré a d'abord reçu une connexion refusée, puis sa politique a bloqué toute
navigation depuis la page d'erreur. Aucun contournement n'a été tenté.

### État de livraison

`DONE` — PR #24 fusionnée par squash sur `main` en `3abbf812`. Vercel Production
`dpl_Cxa6Z7RBcrnRPR9VmQSAx5TwDJwp` est `READY` sur ce SHA. Le smoke public passe
**21/21** : routes publiques/PWA/sociales, contrat et en-têtes de version,
protections anonymes IA, et empreintes **À propos**, footer et état « à jour »
dans les assets effectivement servis.

La recette visuelle interactive n'a pas été automatisable, car la politique du
navigateur intégré interdit de quitter sa page d'erreur antérieure. Cette limite
de l'outil est tracée sans contourner la politique ; les tests de composants,
les règles responsive construites et les empreintes de production sont verts.

### Références

- Branche : `codex/rel-001-version-about`.
- PR : [#24](https://github.com/freedisk/webjourney/pull/24).
- Fusion : `3abbf812a50163be3f2dfe66bb6db5746c6d9204`.
- Vercel : `dpl_Cxa6Z7RBcrnRPR9VmQSAx5TwDJwp`.
- Sprint : `docs/sprints/SPRINT_REL_001_2026-08-28.md`.
- Guide : `docs/VERSIONING.md`.

## 2026-10-10 — UX-003 Défilement mobile de la vue liste

### Objectif et diagnostic

Rétablir le défilement de la liste sur mobile. Avec 60 notes synthétiques dans
le vrai écran à 390 × 844, le panneau atteignait 3 306 px pour seulement 650 px
disponibles. La liste avait `clientHeight = scrollHeight = 3 154`, donc aucune
plage de défilement. Le parent masquait le débordement.

### Changements

- Panneau mobile flexible et chaîne de hauteurs minimales nulle ; viewport
  dynamique sans minimum `100vh` contradictoire, avec repli `100vh`.
- Version candidate `1.0.1`, changelog et À propos cohérents.
- Recette reproductible du vrai écran avec API Supabase entièrement simulée,
  gestes tactiles Chromium et contrôles WebKit.
- Dépendances rafraîchies sans `--force`, Next.js/ESLint Next 16.4.0 minimum.
  Le nouveau linter demande trois ajustements ciblés : restauration des
  préférences après résolution de la session, déclaration du chargeur de
  statistiques avant son effet, et exceptions locales justifiées pour la
  purge immédiate de la saisie IA et le chargement immédiat des statistiques.
  Aucun réglage de lint global n'est désactivé.
- Bloc AGENTS ajouté automatiquement par `next dev` 16.4.0, vérifié dans son
  générateur puis conservé ; guides CSS et React Compiler embarqués consultés.

### Validation et livraison en cours

La recette finale sur le build de production local valide 12 scénarios
Chromium/WebKit : liste et contenu long défilables, dernière note accessible,
recherche, retour et thème sombre à six tailles d'écran. `npm run validate`
passe : lint propre, 105/105 tests et build Next.js 16.4.0 réussi. Le protocole
natif de défilement WebKit mobile reste une limite explicite de l'outil.

Audit initial : une critique, neuf élevées et une modérée. Après mises à jour,
l'audit de production est à zéro ; l'audit complet conserve cinq alertes
élevées pour une seule cause dans la chaîne de lint : `braces` 3.0.3,
GHSA-vfj7-8cjw-p6xm, sans version corrigée publiée. Aucune exception n'est
appliquée sans décision utilisateur et aucun bypass de `main` n'est prévu.
La session GitHub existante permet les écritures du dépôt. La session CLI
Vercel est expirée ; le pipeline GitHub et l'endpoint public permettent la
vérification de livraison sans modifier les variables Vercel.

Production consultée avant livraison : version `1.0.0`, build `378f896`.
Le candidat est `REVIEW_REQUIRED`, prêt pour une PR mais non fusionné tant
que l'audit complet bloque le gate. Les notes et réglages réels sont intacts.

### Références

- Branche : `codex/mobile-list-scroll`.
- PR : [#26](https://github.com/freedisk/webjourney/pull/26).
- Commit fonctionnel : `ba465c226db9e2da86bd3f43603fd18f2004d111`.
- CI GitHub : jobs `114116145554` et `114115998645` ; installation, lint,
  tests et build réussis, seule étape `Dependency audit` en échec.
- Vercel Preview : contrôle `Vercel` et `Vercel Preview Comments` en succès.
  PR sans conflit mais `mergeable_state=blocked`. Aucune fusion effectuée.
- Incident : M-021 ; suivi de dépendance : M-022.
- Source amont : https://github.com/advisories/GHSA-vfj7-8cjw-p6xm.

### 2026-10-10 — autorisation et levée ciblée du blocage

Le propriétaire autorise explicitement l'exception temporaire et le déploiement.
`security:audit` conserve un audit production sans exception et n'accepte
dans l'audit complet que la chaîne exacte GHSA-vfj7-8cjw-p6xm, après vérification
des versions, chemins, indicateurs dev, sévérité et causes. Expiration UTC le
2026-10-24T23:59:59Z ; publication d'une autre version de braces bloquante.
Huit tests de non-extension sont verts ; validation complète : lint,
113/113 tests dans 19 fichiers et build Next.js 16.4.0 réussi. Audit local
production à zéro, audit complet sans autre alerte. Le workflow et les
protections main sont conservés.
ADR-017 et ticket de retrait SEC-001 versionnent la décision.

### Livraison validée le 2026-10-10

`DONE` — Les deux Quality gate sont verts au SHA `c2376b3`. La première
preview échoue avant tout build avec `git_info_fail`. Après reconnexion CLI
validée par le propriétaire, relance du même commit : preview
`dpl_2EtVREsvJMjJNJMAGZwxWp8SYqof` READY, Node 24.x et contrôle Vercel vert.
GitHub confirme la PR clean ; fusion squash #26 en
`6325b7f90758f6a3335333bfaf12cae4192619ae`, sans bypass.

GitHub déclenche automatiquement la Production
`dpl_6UDgdNTRwB6zFpgvHFP1hg46iHNs`, READY avec l'alias
`webjourney-one.vercel.app`, version 1.0.1 et SHA exact. Le smoke public passe
21/21 : routes, PWA, Open Graph, identité sans cache et protections anonymes IA.
La recette sur les assets live passe 12/12 : listes et notes longues défilables,
dernière note, recherche, retour et thèmes à six tailles dans Chromium/WebKit.
Aucune écriture Supabase, aucun contenu réel utilisé, aucune erreur JS.

Le premier smoke avait supposé à tort le nom complet du manifeste égal à
Capsule. Le vrai contrat est « Capsule — Mes Notes », nom court Capsule.
L'assertion invalide est corrigée depuis le source ; seul le smoke complet
21/21 est retenu. Aucun défaut produit ni modification du manifeste.

Limite : le geste WebKit mobile est programmatique et n'est pas une recette
physique iPhone/iPad. L'exception dev reste contrôlée et suivie par SEC-001.

### Recette utilisateur confirmée le 2026-10-10

L'utilisateur valide la partie liste : « le défilment est celui attendu ».
La conformité fonctionnelle du défilement est donc confirmée après livraison.
Cette acceptation concerne la vue liste ; l'appareil et le mode Safari/PWA
ne sont pas précisés dans le retour. Aucun changement applicatif n'est requis.

## 2026-10-10 — Kit de reprise pour une nouvelle tâche

À la demande de l'utilisateur, préparation de docs/handoff : guide de
démarrage, état vérifié, prompt prêt à copier et photographie JSON locale.
Projet et association à la tâche contrôlés ; production 1.0.1 / 4397f81.
Deux commits documentaires locaux non publiés sont recensés avant le kit.

La reprise recommandée utilise le même checkout en mode Local, conserve ces
commits et crée son propre journal. Les priorités distinguent SEC-001, urgent
avant l'échéance de l'exception, et les évolutions futures à demander ensuite.
Les secrets et contenus privés sont exclus ; aucun changement applicatif,
écriture de base, nouvelle tâche ou déploiement n'est déclenché par le kit.
Les fichiers datés sont des photographies à revalider, pas des sources
remplaçant les documents vivants et les observations actuelles.

Validation du kit : quatre fichiers, 18 liens locaux vérifiés, JSON valide,
scan de secrets propre et diff exclusivement documentaire. Lint, 113 tests
et build réussis ; audit production à zéro, seule exception dev annoncée et
aucune autre alerte. Enregistrement local pour une reprise dans le même dossier.

## 2026-10-10 — UX-004 Recherche et édition confortables

### Objectif

Implémenter le plan et les maquettes validés par l'utilisateur, avec PR et
Quality gate, en conservant identité, navigation et défilement UX-003.

### Changements

- Palette sur toutes les notes chargées et les tags, extraits sans sources
  d'images privées, huit récentes à vide et résultats par groupes de 20.
- Éditeur commun extrait des formulaires répétés de app/page.js ; lecture
  Modifier/Plus et opérations existantes conservées dans un dialogue.
- Snapshot initial, état de saisie/envoi/erreur, reprises sans double envoi,
  garde de sortie et absence de persistance de contenu privé dans le navigateur.
- Feuille mobile et adaptation conditionnelle au viewport réduit par le
  clavier, avec repli CSS et prise en compte des capacités tactiles.
- Candidat 1.1.0, aide et documentation synchronisées ; aucune migration
  ni nouvelle dépendance.

### Décisions

Index uniquement en mémoire. Les notes et commandes sont séparées ; seuls
les résultats affichés calculent leurs extraits. Les sources d'images restent
hors de ces extraits. La vue courante et ses filtres ne sont pas modifiés
par l'ouverture d'une note dans la palette.

Les contrôles de fermeture sont attachés/nettoyés avant les nouveaux événements
de l'interface. La mesure du clavier attend un frame de layout stabilisé ;
elle ne transforme pas une simulation en preuve physique Safari/PWA.
L'exception SEC-001 garde sa cause et ses versions exactes, sans extension.

### Validation du candidat

Lint, 126 tests et build optimisé verts ; audit production zéro et seule
exception de lint annoncée. Recette UX-003 : 12/12 ; recette du lot : 12/12
sur le build de production, avec tablette tactile, trois vues, image en
attente et couches de focus. Contrôle visuel desktop/mobile et filtres de
liste conservés depuis la recherche globale.

L'indicateur Next de développement recouvrait Cartes sur petit écran :
la recette utilise le build optimisé, sans clic forcé. Le viewport simulé
attend le layout effectif avant de mesurer la sauvegarde. WebKit peut annoncer
zéro maxTouchPoints malgré le mode tactile ; la détection inclut pointer:coarse.
Les tests physiques Safari/PWA ne sont pas encore effectués.

### Références

- Branche : codex/search-editor-comfort, depuis 2ef1936 ; trois commits locaux
  documentaires conservés.
- Plan : docs/sprints/PLAN_SEARCH_EDITOR_2026-10-10.md.
- Recettes : scripts/smoke-list-scroll.mjs et scripts/smoke-search-editor.mjs.
- Incident de candidat : M-024, corrigé avant production.

### Livraison confirmée

PR #28 : deux Quality gate verts sur d5b621c, Vercel success, GitHub
mergeable/clean puis squash en 3ab6a20. CI main et Vercel en succès ;
production 1.1.0 / 3ab6a20, build du 2026-10-10T18:48:23.669Z.
Smoke public 21/21, recette éditeur sur assets live 12/12 avec données et
mutations Supabase intégralement simulées. Aucune mutation réelle ni donnée
utilisateur employée. La recette physique Safari/PWA reste non effectuée.

Clôture documentaire sur codex/search-editor-close après merge de main dans
l'état local conservé : aucune bascule vers main, aucun reset/rebase,
aucun abandon des commits d'origine.

## 2026-10-10 — UX-004-R1, zoom persistant après recherche mobile

### Objectif

Corriger le zoom signalé en PWA mobile après recherche globale, effacement
et retour aux notes ; modèle et OS non précisés. Conserver identité et scroll.

### Changements et décisions

Version 1.1.1. Recherche globale à 0,92 rem et filtres des trois vues
à 0,8 rem avant correction ; contrôle live synthétique rouge à 12,8 px.
Style ciblé max(16px, 1rem) sur écran <= 767 px ou any-pointer:coarse.
La branche codex/mobile-search-focus conserve l'ascendance documentaire.
Aucun viewport restrictif, restauration de zoom forcée, changement du shell,
migration, nouvelle dépendance ou extension de l'exception de lint.

Le code WebKit _zoomToFocusRect utilise 16/fontSize pour son échelle de focus :
https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/API/ios/WKWebViewIOS.mm.
Cela étaye la cause présumée ; le clavier natif iOS reste hors de Playwright.

### Validation

Recette existante étendue : taille des champs, effacement/fermeture, largeur
des notes, retour du scroll et viewport permettant le zoom utilisateur.
Validate vert : lint, 126 tests et build optimisé ; audit production zéro,
seule exception dev de lint inchangée. Recette étendue 12/12 et recette
UX-003 de défilement 12/12 en local Chromium/WebKit, données simulées.
PR #30 fusionnée après deux gates verts et preview READY sur 7e738b8,
GitHub mergeable=true/clean. Squash 348fe4dc75c1fb2158406571f4643aa5363d0ffa,
CI main verte et Vercel Production READY sur ce SHA. Identité publique 1.1.1,
builtAt 2026-10-10T19:35:34.994Z ; smoke public 21/21 et recette recherche/
éditeur sur assets live 12/12, Supabase intégralement simulé.
L'utilisateur confirme le correctif sur mobile le 2026-10-10 :
« correctif validé sur la version mobile ». Le signalement initial concernait
la PWA ; modèle et OS ne sont pas précisés. La validation porte sur le zoom
signalé, sans établir une recette complète Safari/PWA avec clavier ouvert.

Les conflits de fusion sont uniquement documentaires ; bilans précédents et
commits d'origine préservés. Clôture sur codex/mobile-search-close, sans
changement de code, de schéma ou de configuration.

Les conflits de fusion sont uniquement documentaires ; bilans précédents et
commits d'origine préservés. Clôture sur codex/mobile-search-close, sans
changement de code, de schéma ou de configuration.

### Références

M-025 ; docs/TESTING.md ; scripts/smoke-search-editor.mjs.

## 2026-10-10 — Conception Organiser et retrouver sans perdre

### Objectif

L'utilisateur choisit le lot avec identité Capsule et défilement validé
conservés. Préparer le plan et les maquettes avant implémentation, suivant
l'étape proposée. Rétention confirmée : conserver jusqu'à suppression manuelle.

### Conception

DATA-001 élargi à l'archivage et aux périmètres Notes/Archives/Corbeille,
Annuler et recherche explicite. Deux étapes de travail : données/corbeille,
puis archivage/navigation ; livraison coordonnée à préparer.

Le plan traite les notes, images, liens révoqués, restauration dans l'état
d'origine, droits des anciens clients et erreurs de purge. La suppression
actuelle commence par l'API Storage ; une simple colonne filtrée côté client
ne suffirait pas. ADR-018 proposé, rétention seule déjà validée.

### Validation et limites

Maquettes finales : 16/16 scénarios Chromium/WebKit, desktop/mobile à
320/390/736/1024 px, clair/sombre ; inspection visuelle. Restauration,
annulation, périmètres, image conservée, lien restant révoqué, confirmation
de purge et scroll contrôlés dans les maquettes. Place des icônes réservée
pour stabiliser le layout ; lecture successive sur le desktop étroit.
Textes fictifs, aucune API Supabase, session réelle ou donnée utilisateur.
Les futures preuves SQL/RLS, recettes de l'application et physiques restent
distinctes de ces maquettes. Parcours/maquettes encore en revue ; aucun
code applicatif, SQL, migration ou déploiement lancé dans cette phase.
SEC-001 garde sa priorité et sa date, sans exception étendue.

### Références

Plan : sprints/PLAN_ORGANIZE_RECOVER_2026-10-10.md.
Maquettes : capsule-organize-recover-desktop.html et
capsule-organize-recover-mobile.html dans le dossier de visualisation de la tâche.

## 2026-10-10 — Candidat DATA-001, Organisation et récupération

### Autorisation et continuité

Plan et maquettes validés, implémentation/PR/gate autorisés. L’utilisateur
choisit explicitement Supabase production, sans stack locale ni projet isolé.
Branche codex/organize-recover issue de codex/mobile-search-close ; 4be78dc
et les trois commits documentaires initiaux sont conservés.

### Changements

Version candidate 1.2.0 : Notes/Archives/Corbeille, recherche explicite,
restauration, Annuler et suppression définitive unitaire. Aucun timer de purge.
Lecture hors périmètre et retour au filtre/scroll ; choix compact dans le
compteur du header, sans barre mobile supplémentaire. Aide et changelog adaptés.

SQL forward-only : cycle de vie verrouillé/versionné, révocation de partage,
protection des anciens DELETE et références d’images. Réservation avant upload,
nettoyage et purge via routes serveur authentifiées et API Storage. Aucun
secret exposé ; aucun contenu ou index privé persisté dans le navigateur.

### Préflight et preuves provisoires

Sauvegarde read-only du schéma avant opération, sans données utilisateur,
sous supabase/backups ignoré par Git. Connexion CLI renouvelée ; même profil
confirmé par l’utilisateur et le navigateur, mais login-role reste refusé en
403, avec CLI 2.116 et essai ponctuel 2.120. Dry-run CLI tenté, non réussi.
Fallback navigateur connecté : SQL versionné testé dans une transaction
annulée. Première recette 15/15, recette renforcée 18/18 après contrôle exact
du texte SQL. Aucun schéma appliqué à ce stade ; contrôles post-migration et
recette Storage réelle restent à effectuer.

Candidat local : npm validate réussi, 137 tests, build ; audit production 0,
seule exception lint inchangée avec échéance du 24 octobre 2026 à 23:59:59 UTC.
Recettes synthétiques de l’application : scroll 12/12, éditeur 12/12,
cycle de vie 8/8. Les derniers ajustements UX sont recontrôlés avant commit.
Ces recettes simulent Supabase ; aucune validation physique Safari/PWA avec
clavier n’est extrapolée. PR et production encore à suivre.

### Références

ADR-018 ; PLAN_ORGANIZE_RECOVER_2026-10-10.md ; fichiers SQL sous
supabase/tests/note_lifecycle* ; scripts/smoke-note-lifecycle.mjs.

## Modèle d'entrée

```markdown
## YYYY-MM-DD — Sujet

### Objectif

### Changements

### Décisions

### Validation

### Références
```
