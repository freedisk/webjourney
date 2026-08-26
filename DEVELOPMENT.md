# Capsule — Guide de développement et de reprise

Ce guide décrit comment travailler sur le projet. `docs/MEMORY.md` fournit la
reprise rapide, `docs/ARCHITECTURE.md` décrit les frontières et `AGENTS.md`
définit le cycle obligatoire. Les fichiers SQL sous `supabase/migrations/` sont
la source de vérité des changements de base.

## 1. Installation

```bash
npm install
copy .env.example .env.local
npm run dev
```

Pré-requis : Node.js 20.9+ et npm 10+.

Ne jamais commiter `.env.local`. La clé `SUPABASE_SECRET_KEY` et la clé
`ANTHROPIC_API_KEY` sont exclusivement serveur.

## 2. Reprise rapide

1. `git status --short --branch` : identifier les modifications existantes.
2. `npm install`.
3. Vérifier `.env.local` sans afficher ses valeurs.
4. Lire `docs/MEMORY.md`, `docs/BACKLOG.md` et les migrations non appliquées.
5. Exécuter `npm run validate` et `npm audit`.
6. Tester l'authentification et une note texte avant une migration fonctionnelle.
7. Ouvrir ou mettre à jour le journal de session selon `AGENTS.md`.

## 3. Architecture

```text
Client Next.js
├── Supabase Auth
├── Data API protégée par RLS
├── Storage privé protégé par RLS
└── /api/resumer avec Bearer token

Server Component /share/[token]
├── lecture anonyme de la note partagée
└── signature Storage avec clé secrète serveur
```

Le client Supabase principal conserve la session dans le navigateur. La page de
partage n'utilise pas la session du visiteur. Le client administrateur doit donc
rester dans `lib/supabase-admin.js` et ne jamais être importé par un Client
Component.

## 4. Activation des images

Sur la production Webjourney, la baseline et la migration images sont déjà
alignées dans l'historique CLI. Pour un environnement neuf, l'ordre obligatoire
est :

1. appliquer toutes les migrations avec `npx supabase db push` ;
2. vérifier le bucket privé, ses limites et les policies ;
3. ajouter `SUPABASE_SECRET_KEY` dans Vercel ou, pour un projet historique,
   `SUPABASE_SERVICE_ROLE_KEY` ;
4. lancer la recette manuelle décrite dans `docs/IMAGES.md` ;
5. déployer le code.

Le code désactive uniquement l'ajout d'images si la table n'est pas disponible ;
l'édition texte continue de fonctionner et un message de configuration est
affiché.

## 5. Cycle de vie des images

- Sélection/collage : validation locale et `blob:` d'aperçu.
- Sauvegarde : note créée si nécessaire, upload Storage, insertion métadonnées.
- Échec : suppression compensatoire des objets déjà envoyés.
- Retrait en édition : la référence disparaît immédiatement du brouillon ; le
  fichier est supprimé lors de la sauvegarde.
- Duplication : nouvel objet, nouvel UUID et réécriture du Markdown.
- Suppression de note : suppression Storage puis suppression de la note ; la FK
  cascade sur les métadonnées.
- Partage : URL signée dix minutes côté public, jamais stockée dans `contenu` ;
  l'interface propriétaire utilise une heure avec renouvellement à 50 minutes.

## 6. Gates

```bash
npm run lint
npm test
npm run build
npm audit
```

`npm run validate` enchaîne les trois premiers contrôles.

Le workflow `.github/workflows/ci.yml` exécute les mêmes contrôles sous Node 24
sur chaque branche `codex/**`, chaque pull request vers `main` et chaque push sur
`main`. Le contrôle distant `Quality gate` doit être vert avant fusion.

Cycle Git attendu :

1. créer une branche `codex/<sujet>` ;
2. pousser la branche et ouvrir une pull request vers `main` ;
3. attendre `Quality gate` ;
4. fusionner seulement lorsque GitHub autorise la fusion ;
5. laisser l'intégration GitHub → Vercel déployer le `main` validé.

Les tests unitaires couvrent les formats, la limite, l'insertion au curseur, le
parsing Markdown, la copie, la suppression de référence, l'upload filtré, la
duplication et la correspondance des URL signées.

## 7. Points de sécurité à surveiller

1. Confirmer dans Supabase que `notes_tags` ne laisse lire que les associations
   appartenant à l'utilisateur.
2. Ne jamais rendre le bucket `note-images` public.
3. Conserver la validation stricte du préfixe `<user>/<note>/` avant signature
   sur la page partagée.
4. Ne jamais utiliser `upsert` pour les images : chaque chemin UUID est immuable.
5. Ajouter ultérieurement un rate-limit persistant au résumé Anthropic.
6. Les suppressions Storage doivent toujours passer par l'API Storage.

## 8. Limites structurelles

- `app/page.js` est un monolithe historique d'environ 3 000 lignes.
- La baseline historique et la migration images sont versionnées et alignées en
  production ; le `db reset` local conteneurisé reste à automatiser (`TOOL-002`).
- Aucun E2E ne pilote encore une session Supabase réelle.
- Le projet utilise encore le nom de package historique `webjourney`.
- La PWA est installable et fournit un repli hors ligne, mais les notes restent
  volontairement en ligne uniquement afin de ne pas mettre de données privées
  dans le cache du service worker.

Éviter un refactor global opportuniste. Extraire uniquement une logique lorsque
la fonctionnalité en cours bénéficie réellement de sa réutilisation ou de tests.

## 9. PWA

Le service worker est enregistré uniquement en production. Ne pas l'activer
avec `next dev`, car un cache persistant perturberait le rechargement à chaud.

Après toute modification de `public/sw.js` ou des ressources précachées :

1. incrémenter `CACHE_NAME` ;
2. lancer `npm run validate` ;
3. tester `npm run start` sur un port libre ;
4. vérifier le manifeste, le scope `/` et la page `/offline` ;
5. refaire une installation Safari sur un appareil iOS avant production.

La recette détaillée se trouve dans `docs/PWA.md`.

## 10. Déploiement et rollback

Le détail se trouve dans `docs/DEPLOYMENT.md`. Ne pas pousser vers la production
avant d'avoir confirmé que la migration est appliquée. En cas de rollback du
code, conserver la table et le bucket : ils sont rétrocompatibles avec la
version texte et empêchent la perte des images déjà enregistrées.
