# Mémoire projet — Capsule

Ce fichier contient uniquement les faits stables nécessaires à une reprise. Les
détails chronologiques vont dans `DEVBOOK.md` et les incidents dans
`../MISTAKES.md`.

## Identité

- **Produit** : Capsule, application personnelle de notes.
- **Dépôt** : `https://github.com/freedisk/webjourney`.
- **Production** : `https://webjourney-one.vercel.app/`.
- **Hébergement** : Vercel depuis GitHub `main`.
- **Données** : Supabase PostgreSQL, Auth et Storage.
- **Langue du code existant** : UI et messages majoritairement en français.

## État validé au 2026-08-26

- Images par fichier et copier/coller fonctionnelles en local et production.
- Pipeline image amélioré déployé : glisser-déposer, compression WebP 2 048 px /
  5 Mio, progression et visionneuse clavier/tactile.
- Duplication et suppression d'images validées par recette utilisateur.
- Bucket `note-images` privé, limite 5 Mio, JPEG/PNG/WebP.
- Grants `note_images` pour `authenticated` limités à SELECT/INSERT/DELETE.
- PWA installée et validée fonctionnelle sur iPad via Safari.
- `main` protégé par PR et contrôle `Quality gate`.
- Référence CI : lint, 31 tests, build Next.js et audit élevé.
- Audit read-only des images disponible par `npm run ops:audit-images` ; état de
  production observé propre le 2026-08-26.
- Référence de livraison images : PR #6, fusion `4c77786`, Vercel
  `dpl_J2uYuQ7qoiG8xztaHNMrwcmr73b5` en `READY` sur Node 24.x.

## Invariants

1. Une image privée n'est jamais rendue publique par URL persistante.
2. Le Markdown stocke `capsule-image/<uuid>`, jamais une URL signée.
3. Aucun upload n'a lieu avant la sauvegarde de la note.
4. La duplication crée de nouveaux objets et UUID.
5. Le partage public signe seulement après validation complète de propriété.
6. Le service worker ne met aucune donnée privée en cache.
7. `main` n'est modifié que par PR après `Quality gate`.
8. Une évolution Supabase est versionnée et prévisualisée avant application.

## Environnement

- Next.js 16.3.3, React 19.2.8, Supabase JS 2.112.4.
- Node de référence verrouillé : 24.19.0 avec npm 11 ; GitHub Actions utilise
  la même version majeure.
- Supabase CLI 2.116.0 est une dépendance de développement versionnée.
- Projet Supabase lié : Webjourney, référence `yteconbqwmozpxjaxxey`.
- JavaScript uniquement, pas de TypeScript.
- `.env.local` n'est jamais versionné.
- Variables publiques : URL et clé publishable/anon Supabase.
- Variables serveur : clé Anthropic et clé secrète/service-role Supabase.

## État Supabase validé

- `supabase/config.toml` et la CLI 2.116.0 sont versionnés.
- `supabase/schemas` est la photographie déclarative stricte du schéma observé
  le 2026-08-26 ; elle est expurgée de secrets et ne contient aucune donnée.
- `20260826000000_baseline_existing_schema.sql` reconstitue le noyau historique.
- `20260826120000_add_note_images.sql` ajoute/réaffirme les images et crée le
  bucket privé, absent des exports de schéma.
- Les deux versions sont présentes dans `supabase_migrations.schema_migrations`
  et parfaitement alignées avec le dépôt.
- Le dry-run distant est vide et l'audit `production_schema_audit.sql` passe à
  12/12.
- La validation SQL a été exécutée dans une transaction puis annulée. Le test
  `supabase db reset` sous Docker reste un confort local suivi par `TOOL-002`.

## Commandes de référence

```powershell
npm run dev
npm run validate
npm run security:audit -- --audit-level=high
npm run ops:audit-images
npx supabase migration list --linked
npx supabase db push --dry-run --linked
npx supabase db query --linked --file supabase/tests/production_schema_audit.sql
```

Ne jamais lancer `supabase db reset --linked` sur la production.

## Prochaines priorités

1. `QA-001` — E2E des parcours critiques.
2. `SEC-001` — rate-limit du résumé Anthropic.
3. `OPS-002` — observabilité sans données de note ni secret.
4. `TOOL-002` — validation locale Supabase conteneurisée.
