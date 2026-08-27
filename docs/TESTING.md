# Stratégie de test — Capsule

## 1. Niveaux

### Statique et build

```powershell
npm run lint
npm run build
npm run security:audit -- --audit-level=high
```

### Tests unitaires

`npm test` couvre actuellement :

- validation des types et des limites source/finale des images ;
- dimensionnement, compression WebP, tentatives de réduction et garde-fou pixels ;
- création, parsing, insertion et remplacement des références Markdown ;
- chemins Storage ;
- upload filtré, progression et compensation ;
- duplication et correspondance des URL signées ;
- classification read-only des incohérences Markdown, métadonnées et Storage ;
- manifeste, raccourcis, icônes et règles du service worker PWA ;
- transformations Markdown de sélection ;
- partage système avec repli presse-papiers et View Transition progressive ;
- invariants statiques des dialogues, commandes, cibles tactiles et mouvement
  réduit.

### Recette navigateur authentifiée

Elle reste obligatoire pour les flux Supabase. Utiliser `docs/IMAGES.md`, puis
contrôler au minimum : connexion, note texte, collage, sélection, glisser-déposer,
compression, progression, galerie, reload, duplication, suppression et partage.

Quand la recette exige des écritures sur la production, utiliser uniquement un
compte et des notes synthétiques temporaires. Supprimer dans cet ordre les objets
Storage, les métadonnées, les notes et le compte, puis vérifier des compteurs à
zéro. Ne jamais consigner les identifiants de test dans le journal.

### Smoke test production

Après chaque déploiement :

1. `/`, `/login`, `/manifest.webmanifest`, `/sw.js` et `/offline` répondent ;
2. une session existante charge les notes ;
3. `/api/resumer` sans session répond 401 ;
4. une opération non destructive représentative fonctionne ;
5. la console ne révèle ni secret ni erreur nouvelle.

## 2. Tests Supabase

Pour chaque migration :

- reconstruire une base locale fraîche avec `supabase db reset` ;
- exécuter `supabase db lint` ;
- comparer `supabase migration list --linked` ;
- prévisualiser `supabase db push --dry-run --linked` ;
- vérifier tables, contraintes, RLS, grants, fonctions, triggers et Storage ;
- tester un utilisateur propriétaire, un autre utilisateur et le rôle anonyme.

Audit non destructif du contrat actuellement déployé :

```powershell
npx supabase db query --linked --file supabase/tests/production_schema_audit.sql
npx supabase migration list --linked
npx supabase db push --dry-run --linked
npm run ops:audit-images
```

État de référence du 2026-08-26 : 12/12 invariants vrais, deux versions
local/distant alignées et aucune migration en attente.

Ne jamais exécuter les tests destructifs sur la production.

## 3. PWA

Tester avec un build de production local, jamais seulement `next dev` :

```powershell
npm run build
npm run start -- -p 3001
```

Vérifier l'enregistrement du service worker, le repli hors ligne, l'absence de
données privées dans Cache Storage et l'installation finale sur Safari iOS.

## 4. Recette responsive UX-002

Utiliser des données synthétiques et contrôler au minimum :

| Cible | Largeur de référence | Contrôles |
|---|---:|---|
| iPhone | 390 px | navigation basse, zones sûres, modale en feuille, aucun débordement |
| iPad | 1 024 px | en-tête compact, noms accessibles conservés, aucune navigation mobile |
| Desktop | 1 416 px | hiérarchie complète, palette, grille et aperçu Markdown double |

Pour chaque cible : thèmes clair/sombre, clavier, focus visible, fermeture
`Échap`, palette `Ctrl/Cmd+K`, message avec action Annuler et
`prefers-reduced-motion`. Le Kanban doit fonctionner par glisser tactile et par
sélecteur de colonne.

## 5. Critères de release

Une release est refusée si :

- lint, tests, build ou audit élevé échouent ;
- une migration n'est pas appliquée ou son état est ambigu ;
- le rollback n'est pas défini pour un changement risqué ;
- une clé serveur apparaît dans le client, Git ou les logs ;
- les tests manuels requis ne sont pas tracés.

## 6. Lacunes connues

- aucun E2E automatisé avec session Supabase réelle ;
- pas de tests SQL pgTAP des policies ;
- pas de test de charge sur les uploads ou `/api/resumer` ;
- le rapport automatisé des images orphelines est read-only ; aucun nettoyage
  automatique n'est autorisé ;
- Docker Desktop absent du poste de reprise ; le `db reset` local complet est
  suivi par `TOOL-002`.
