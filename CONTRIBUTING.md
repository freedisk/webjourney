# Contribuer à Capsule

Capsule est un projet personnel déployé en production. Toute contribution doit
préserver les données Supabase existantes et le circuit GitHub → Vercel.

## Préparer le projet

```powershell
git status --short --branch
npm install
Copy-Item .env.example .env.local
npm run dev
```

Renseigner `.env.local` sans jamais commiter ce fichier.

## Branche et commits

- Partir d'un `main` synchronisé.
- Créer une branche `codex/<sujet>`.
- Produire des commits cohérents et descriptifs.
- Ne pas mélanger une migration, un refactor sans rapport et une mise à jour de
  dépendances dans le même commit.

## Validation locale

```powershell
npm run validate
npm run security:audit -- --audit-level=high
```

Pour une évolution Supabase :

```powershell
npx supabase migration list --linked
npx supabase db push --dry-run --linked
```

La commande destructrice `supabase db reset --linked` est interdite sur la
production.

## Pull request

La PR doit contenir :

- objectif et périmètre ;
- risques et stratégie de rollback ;
- migrations et variables nécessaires ;
- validations exécutées ;
- documentation mise à jour.

Le contrôle GitHub `Quality gate` doit être vert. Après fusion, vérifier que le
nouveau déploiement Vercel Production est `READY` et effectuer les smoke tests
de `docs/RUNBOOK.md`.

## Documentation de fin de tâche

Mettre à jour, selon le changement :

- `docs/DEVBOOK.md` pour le travail effectué ;
- `docs/BACKLOG.md` pour les états ;
- `docs/MEMORY.md` pour les faits stables ;
- `MISTAKES.md` pour les incidents et apprentissages ;
- le journal de session actif.
