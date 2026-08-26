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

## 1. Supabase

Appliquer `supabase/migrations/20260826120000_add_note_images.sql`.

Contrôles dashboard :

- table `public.note_images` avec RLS activée ;
- bucket `note-images` privé ;
- `file_size_limit = 5242880` ;
- MIME autorisés : JPEG, PNG, WebP ;
- trois policies sur `note_images` ;
- trois policies SELECT/INSERT/DELETE sur `storage.objects`.

Ne pas modifier directement les lignes `storage.objects` pour supprimer un
fichier.

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

## Rollback

1. Revenir au déploiement Vercel précédent.
2. Ne pas supprimer immédiatement la table ni le bucket : l'ancien code les
   ignore et les images restent récupérables.
3. Diagnostiquer et corriger le code.
4. Si l'abandon devient définitif, exporter les objets avant toute suppression.

Un rollback de schéma destructif n'est pas fourni volontairement afin d'éviter
la perte irréversible des images utilisateurs.
