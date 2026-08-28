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
- isolation du fond de page et restauration exacte de `inert`/`aria-hidden` ;
- action de toast affichée au-dessus d'une modale et incluse dans son ordre de
  focus.
- validation des clés et modèles Anthropic, catalogue dédupliqué et résumé
  normalisé sans fuite du corps d'erreur fournisseur ;
- invariants AI-001 : aucune persistance navigateur, aucune clé Vercel implicite,
  authentification et quota présents sur chaque route.
- contenu HELP-001 complet, recherche insensible aux accents, progression locale
  nettoyée, points d'entrée contextuels et styles responsive.
- invariants AI-002 : détection du texte utile, segmentation des notes longues,
  masquage/restauration exacte des images, nombres, URL et tâches, reprise
  ciblée unique, timeout explicite, sortie tronquée refusée et application sur
  snapshot inchangé.
- invariants PRINT-001 : titre sûr, références privées disponibles, décodage de
  toutes les images, progression, timeout, annulation, rendu non interactif et
  isolation du document sous `@media print`.
- invariants SHARE-001 : contrat Open Graph/Twitter, image 1 200 × 630,
  normalisation des titres et absence de contenu privé dans la carte.
- invariants REL-001 : cohérence SemVer/lockfile/changelog, validation de
  l'identité, comparaison de builds, requête `no-store`, surface API minimale et
  branchements menu/palette/footer/dialogue.

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
4. `GET /api/ai/settings` et `POST /api/ai/models` sans session répondent 401 ;
5. `/api/ai/format` sans session répond 401 ;
6. `/api/version` répond 200, `no-store`, avec version, SHA et date attendus ;
7. une opération non destructive représentative fonctionne ;
8. la console ne révèle ni secret ni erreur nouvelle.

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
npx supabase db query --linked --file supabase/tests/ai_security_audit.sql
npx supabase migration list --linked
npx supabase db push --dry-run --linked
npm run ops:audit-images
```

État de référence du 2026-08-27 : audit historique 12/12, audit AI-001 9/9,
trois versions enregistrées et aucune migration en attente.

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

## 5. Recette AI-001

La recette complète est décrite dans `docs/AI_BYOK.md`. Elle couvre au minimum :

- 401 sans session et 428 avec session sans configuration ;
- rejet sûr d'une clé invalide ;
- catalogue réel, sélection d'un modèle disponible et résumé en mode session ;
- mise en forme réelle en modes session et Vault, avec référence privée
  restaurée strictement à l'identique ;
- oubli au rechargement ;
- enregistrement Vault, résumé sans renvoyer la clé et suppression explicite ;
- contrôle du quota et en-tête `Retry-After` ;
- compte synthétique supprimé avec zéro ligne de réglage/quota résiduelle.

La clé réelle ne doit apparaître ni dans les captures, ni dans les sorties de
commande, ni dans le journal.

Smoke synthétique automatisé contre un build déjà démarré :

```powershell
$env:AI_SMOKE_ALLOW_SYNTHETIC_WRITES = '1'
npm run test:ai:smoke -- --base-url=http://localhost:3101
Remove-Item Env:AI_SMOKE_ALLOW_SYNTHETIC_WRITES
```

La garde explicite évite toute création accidentelle. Le script utilise une clé
de recette depuis `AI_SMOKE_ANTHROPIC_API_KEY` ou, pour compatibilité locale,
`ANTHROPIC_API_KEY`. Il n'affiche ni clé, ni identifiant, ni résumé et supprime
le compte synthétique dans son bloc de nettoyage.

## 6. Recette AI-002

Le contrat complet est décrit dans `docs/AI_FORMATTING.md`. Contrôler :

- bouton IA désactivé sans texte et accessible dans les éditeurs de création et
  de modification ;
- états génération, erreur et succès annoncés, annulation réseau disponible ;
- comparatif **Aperçu/Markdown**, source inchangée et application explicite ;
- `Échap`, fermeture et erreur sans mutation ; focus restitué au déclencheur ;
- après application, le contenu n'est qu'un brouillon et le bouton Sauver/Créer
  reste nécessaire ;
- à 390 px, une seule colonne sans débordement ; à 1 024 et 1 416 px, deux
  colonnes lisibles et dialogue contenu dans le viewport ;
- en présence d'une image privée, référence Markdown identique avant/après et
  aucun UUID/légende présent dans la requête fournisseur testée.

Le smoke BYOK couvre aussi 401, 428, les deux modes réels, la restauration d'une
référence privée et le nettoyage du compte synthétique. Sa sortie ne doit
contenir ni clé, ni identifiant utilisateur, ni texte généré.

Une régression longue peut être ajoutée au même smoke sans afficher son contenu :

```powershell
$env:AI_SMOKE_ALLOW_SYNTHETIC_WRITES = '1'
npm run test:ai:smoke -- --base-url=http://localhost:3101 --long-format-file="C:\chemin\note-longue.txt"
Remove-Item Env:AI_SMOKE_ALLOW_SYNTHETIC_WRITES
```

Le résultat doit annoncer `longFormat.ok=true`, terminer avant 100 secondes et
confirmer la restauration des faits. Le fichier source n'est jamais copié dans
le dépôt, le journal ou la sortie du script.

## 7. Recette HELP-001

Avec une session synthétique sans note, contrôler :

1. **Découvrir Capsule**, le menu et `Ctrl/Cmd+K` ouvrent le dialogue nommé
   **Centre d'aide** avec le focus dans la recherche ;
2. `clé Anthropic` ne conserve que la rubrique IA ; une recherche absente rend
   un état vide explicite et réversible ;
3. une case du démarrage rapide persiste après fermeture/réouverture, puis
   **Réinitialiser la progression** revient à 0/5 ;
4. l'aide de la barre Markdown ouvre **Notes et Markdown**, **Guide images**
   ouvre **Images et galerie**, et le lien des paramètres IA ouvre la rubrique
   IA sans perdre le dialogue sous-jacent ;
5. `Échap` ferme l'aide et restitue le focus au déclencheur ; thèmes clair et
   sombre restent lisibles ;
6. à 390 px et 1 024 px, la navigation et l'article ne créent aucun débordement
   horizontal et les zones sûres iOS restent respectées.

Le contenu ne déclenche aucun `fetch`. `capsule-help-progress-v1` ne doit
contenir que `completed: string[]` et `checklistHidden: boolean`. Une session PWA
déjà chargée conserve l'aide grâce aux assets statiques ; un rechargement hors
ligne affiche volontairement `/offline` et jamais une page privée mise en cache.

## 8. Recette PRINT-001

Depuis une note enregistrée, suivre `docs/PRINTING.md` et contrôler :

- aperçu avec titre, date, tags, Markdown, liens, légendes et plusieurs images ;
- refus d'une référence privée sans URL signée, actualisation puis nouvelle
  tentative ;
- progression visible et **Annuler la préparation** réellement interruptible ;
- fermeture par bouton et `Échap`, puis restitution du focus au déclencheur ;
- notes courte, vide et proche de 20 000 caractères sans coupure incohérente ;
- aucun débordement horizontal à 390, 1 024 et 1 416 px ;
- sortie papier claire sans overlay, boutons, ombres ou visionneuse ;
- dialogue natif Chrome desktop puis Safari/PWA iPhone ou iPad.

L'automatisation ne doit jamais ouvrir le dialogue natif d'impression, qui peut
bloquer la session. Elle valide le préflight et les styles ; la destination PDF
reste une recette manuelle sur l'appareil.

## 9. Recette SHARE-001

Suivre `docs/SOCIAL_SHARING.md` avec un build de production et contrôler :

- la racine avec le user-agent `facebookexternalhit/1.1` ;
- les propriétés Open Graph fondamentales, leurs valeurs absolues et les
  propriétés structurées de l'image ;
- la grande carte Twitter/X ;
- `/opengraph-image` en `200 image/png`, réellement en 1 200 × 630 ;
- le rendu visuel sans texte coupé et la console sans erreur ;
- un token partagé valide puis révoqué, sans corps, tag, image privée ou URL
  signée dans le HTML social ;
- après production, une nouvelle analyse Meta avant de conclure sur un lien
  déjà mis en cache par Messenger.

## 10. Recette REL-001

Suivre `docs/VERSIONING.md` et contrôler :

1. footer complet à 1 024 et 1 416 px, footer court à 390 px, sans recouvrement
   de la navigation mobile ni débordement horizontal ;
2. menu, palette et footer ouvrent le même dialogue nommé **À propos de
   Capsule** ; fermeture bouton/`Échap` et restitution du focus ;
3. version `1.0.0`, SHA court et date lisible correspondent à `/api/version` ;
4. changelog limité, lisible en thèmes clair/sombre et entièrement défilable sur
   un iPhone ;
5. **Vérifier les mises à jour** annonce **Capsule est à jour** sur le build
   courant, sans requête préalable au clic ;
6. réseau coupé, le dialogue reste disponible et affiche une erreur actionnable
   sans fermer l'application ni vider un stockage ;
7. l'endpoint retourne `Cache-Control: no-store`, `nosniff` et seulement
   `version`, `buildId`, `builtAt` ;
8. après une nouvelle production, un ancien build ouvert annonce la nouvelle
   livraison et **Recharger maintenant** charge le nouveau SHA.

## 11. Critères de release

Une release est refusée si :

- lint, tests, build ou audit élevé échouent ;
- une migration n'est pas appliquée ou son état est ambigu ;
- le rollback n'est pas défini pour un changement risqué ;
- une clé serveur apparaît dans le client, Git ou les logs ;
- les tests manuels requis ne sont pas tracés.

## 12. Lacunes connues

- aucun E2E automatisé avec session Supabase réelle ;
- pas de tests SQL pgTAP des policies ;
- pas de test de charge sur les uploads ni de simulation concurrente prolongée
  du quota IA ;
- le rapport automatisé des images orphelines est read-only ; aucun nettoyage
  automatique n'est autorisé ;
- Docker Desktop absent du poste de reprise ; le `db reset` local complet est
  suivi par `TOOL-002`.
