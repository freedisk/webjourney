# Sprint produit — expérience images

## Statut

`REVIEW_REQUIRED` — implémentation et recette locale terminées le 2026-08-26 ;
PR, gate et validation Vercel encore requis.

## Objectif utilisateur

Rendre l'ajout et la consultation d'images rapides et explicites sur ordinateur,
iPhone et iPad, sans affaiblir la confidentialité des notes.

## Incréments

### S1 — Préparation et compression

- accepter un JPEG, PNG ou WebP source jusqu'à 20 Mio ;
- optimiser localement vers un WebP de 2 048 px maximum ;
- garantir un fichier final inférieur ou égal à 5 Mio ;
- conserver le fichier original s'il est déjà conforme et plus léger ;
- afficher le poids avant/après et les erreurs par fichier.

### S2 — Acquisition et progression

- conserver la sélection multiple et le copier/coller ;
- ajouter le glisser-déposer avec état visuel ;
- afficher la progression de préparation puis d'envoi ;
- empêcher un double envoi pendant une sauvegarde ;
- conserver l'upload différé jusqu'à `Créer` ou `Sauver`.

### S3 — Galerie

- grille d'aperçus plus lisible et responsive ;
- visionneuse plein écran ;
- navigation précédente/suivante, clavier et geste horizontal ;
- compteur, légende et ouverture de l'original signé ;
- respect de `prefers-reduced-motion` et des lecteurs d'écran.

### S4 — Qualité et exploitation

- tests unitaires de dimensionnement, compression, progression et compensation ;
- recette locale desktop/mobile ;
- rapport read-only des métadonnées ou objets images orphelins ;
- documentation, devbook, mémoire et registre d'incidents mis à jour.

## Critères de sortie

- aucune URL signée ou donnée de note dans Git, les logs ou le cache PWA ;
- aucun upload avant la sauvegarde de la note ;
- aucune modification du schéma Supabase ;
- lint, tests, build et audit de dépendances verts ;
- historique Supabase toujours aligné et `db push --dry-run` vide ;
- PR fusionnée uniquement après `Quality gate` ;
- déploiement Vercel Production `READY` et smoke tests conformes.

## Preuves avant PR

- ESLint : zéro erreur et zéro avertissement ;
- Vitest : 5 fichiers, 31/31 tests réussis ;
- build Next.js 16.3.3 : réussi, sept routes applicatives générées ;
- audit npm élevé : zéro vulnérabilité ;
- recette Chrome : PNG synthétique 3 200×2 000 convertie en WebP
  2 048×1 280, fichier sous 5 Mio et référence Markdown insérée ;
- visionneuse : ouverture, dialogue accessible et fermeture `Échap` validées ;
- recette Supabase authentifiée : galerie 2 images, navigation et nettoyage de
  toutes les données/comptes synthétiques confirmés ;
- production Supabase : historique aligné, dry-run vide, audit schéma 12/12 ;
- audit images read-only : 20 notes, 1 métadonnée, 1 objet, aucun écart.

## Sprints complémentaires intégrés

- `OPS-001` : classificateur testable et commande read-only
  `npm run ops:audit-images` ;
- `TOOL-001` : `.nvmrc`, `.node-version`, `engines` et `packageManager` alignés
  sur Node 24.19 / npm 11 ;
- renforcement QA/accessibilité : verrou synchrone de préparation, libération
  des URL `blob:`, focus confiné/restitué et navigation clavier/tactile.

## Hors périmètre

- prise en charge HEIC/HEIF ;
- retouche photo ou recadrage manuel ;
- stockage hors ligne des images privées ;
- quotas Anthropic et corbeille des notes, qui restent des décisions produit
  séparées.
