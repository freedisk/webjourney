# Déploiement Capsule

## Préflight local

```bash
git status --short --branch
npm install
npm run validate
npm audit
```

Résultats attendus : lint sans erreur, tests verts, build réussi et aucune
vulnérabilité npm.

## Gate GitHub obligatoire

La production ne doit plus recevoir de push direct. Travailler sur une branche
`codex/**`, ouvrir une pull request vers `main` et attendre le contrôle
`Quality gate`. Il exécute sous Node 24 :

- `npm ci` ;
- `npm run lint` ;
- `npm test` ;
- `npm run build` ;
- `npm audit --audit-level=high`.

La règle de branche `main` impose la pull request et la réussite du contrôle.
Après fusion, l'intégration GitHub → Vercel déclenche le déploiement Production.

## 1. Supabase

Le projet Webjourney possède désormais un historique CLI aligné. Avant chaque
release contenant une nouvelle migration :

```powershell
npx supabase migration list --linked
npx supabase db push --dry-run --linked
npx supabase db push --linked
npx supabase db query --linked --file supabase/tests/production_schema_audit.sql
```

Les versions `20260826000000` (baseline) et `20260826120000` (images) sont déjà
appliquées en production. Ne pas les éditer ou les rejouer ; créer une nouvelle
migration forward-only.

Contrôles dashboard :

- table `public.note_images` avec RLS activée ;
- bucket `note-images` privé ;
- `file_size_limit = 5242880` ;
- MIME autorisés : JPEG, PNG, WebP ;
- trois policies sur `note_images` ;
- trois policies SELECT/INSERT/DELETE sur `storage.objects`.

Ne pas modifier directement les lignes `storage.objects` pour supprimer un
fichier et ne jamais exécuter `supabase db reset --linked`.

## 2. Vercel

Dans Settings → Environment Variables, définir pour Production et Preview :

- `NEXT_PUBLIC_SUPABASE_URL` ;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ou l'ancienne `ANON_KEY` ;
- `ANTHROPIC_API_KEY` ;
- `SUPABASE_SECRET_KEY` (recommandée) ou `SUPABASE_SERVICE_ROLE_KEY`
  pour la clé `service_role` historique.

Déclencher un nouveau déploiement après toute modification de variable.

## 3. Smoke test

Suivre la recette de `docs/IMAGES.md`, au minimum : fichier, collage, reload,
duplication, suppression et lien partagé en navigation privée.

Contrôles PWA complémentaires :

- `/manifest.webmanifest` répond en `200` avec `display: standalone` ;
- `/sw.js` répond en JavaScript avec `Cache-Control: no-cache, no-store` ;
- Safari propose **Sur l'écran d'accueil** et utilise l'icône Capsule ;
- après installation, l'application s'ouvre sans barre d'adresse ;
- une navigation sans réseau affiche la page Capsule hors ligne, sans note ni
  image privée dans le cache.

Voir `docs/PWA.md` pour la recette iPhone/iPad complète.

## Rollback

1. Revenir au déploiement Vercel précédent.
2. Ne pas supprimer immédiatement la table ni le bucket : l'ancien code les
   ignore et les images restent récupérables.
3. Diagnostiquer et corriger le code.
4. Si l'abandon devient définitif, exporter les objets avant toute suppression.

Un rollback de schéma destructif n'est pas fourni volontairement afin d'éviter
la perte irréversible des images utilisateurs.
