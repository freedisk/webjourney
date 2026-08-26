# Photographie déclarative de production

Ce dossier a été généré le 2026-08-26 depuis le projet Supabase lié
`yteconbqwmozpxjaxxey` avec :

```powershell
npx supabase db pull --linked --declarative --schema public --strict-coverage
```

La CLI a confirmé `remoteHistoryUpdated: false` et l'export
`.pgdelta-export.json` active `redactSecrets`. Cette photographie a servi à
reconstituer la baseline `20260826000000_baseline_existing_schema.sql` et à
contrôler l'état réellement déployé avant la réparation de l'historique.

Les fichiers SQL de ce dossier représentent le catalogue observé, y compris les
policies Storage liées aux images. Ils ne contiennent pas les lignes de données
de `storage.buckets` : le bucket privé `note-images` reste donc déclaré par la
migration `20260826120000_add_note_images.sql`.

Ne pas éditer cette photographie à la main. Pour la rafraîchir :

1. créer une branche dédiée ;
2. vérifier la cible liée avec `supabase projects list` ;
3. régénérer avec la commande ci-dessus ;
4. relire le diff, notamment les grants et les policies ;
5. ne jamais utiliser cette commande comme substitut à une migration
   forward-only.
