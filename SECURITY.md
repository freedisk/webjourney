# Politique de sécurité — Capsule

## Périmètre

Capsule traite des notes et images privées. Les composants sensibles sont :

- Supabase Auth et les sessions navigateur ;
- PostgreSQL et les politiques RLS ;
- le bucket privé `note-images` ;
- la clé serveur utilisée pour signer les images partagées ;
- l'API `/api/resumer` et la clé Anthropic ;
- GitHub Actions et les variables Vercel.

## Secrets

Ne jamais commiter ni journaliser :

- `.env.local` ;
- `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` ;
- `ANTHROPIC_API_KEY` ;
- jetons CLI GitHub, Supabase ou Vercel ;
- cookies ou mots de passe de base de données.

Les clés serveur ne doivent jamais porter le préfixe `NEXT_PUBLIC_`.

## Modèle d'accès

- Les utilisateurs authentifiés accèdent uniquement à leurs lignes via RLS.
- Les notes partagées sont lues anonymement uniquement avec un `share_token`
  actif.
- Le bucket `note-images` reste privé.
- Une URL signée publique n'est créée qu'après validation du token, de la note,
  de l'UUID de l'image et du préfixe Storage attendu.
- Le rôle `authenticated` ne doit obtenir sur `note_images` que `SELECT`,
  `INSERT` et `DELETE`.
- Aucun `UPDATE`, `UPSERT` ou accès public au bucket n'est autorisé.

## PWA

Le service worker peut mettre en cache le shell statique et `/offline`. Il ne
doit jamais mettre en cache les notes, images signées, réponses Supabase ou
résumés Anthropic.

## Dépendances et livraison

Chaque PR exécute lint, tests, build et audit de dépendances. `main` exige une
PR et le contrôle `Quality gate`. Toute vulnérabilité élevée bloque la fusion.

## Signalement et réponse

Ne pas ouvrir de ticket public contenant un secret ou une note privée. Prévenir
directement le propriétaire du dépôt, révoquer la clé concernée, désactiver le
partage si nécessaire, préserver les journaux sans données privées puis suivre
la procédure d'incident de `docs/RUNBOOK.md`.
