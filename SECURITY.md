# Politique de sécurité — Capsule

## Périmètre

Capsule traite des notes et images privées. Les composants sensibles sont :

- Supabase Auth et les sessions navigateur ;
- PostgreSQL et les politiques RLS ;
- le bucket privé `note-images` ;
- la clé serveur utilisée pour signer les images partagées ;
- les API `/api/ai/*`, `/api/resumer` et les clés Anthropic utilisateur ;
- Supabase Vault, `user_ai_settings` et le quota IA ;
- GitHub Actions et les variables Vercel.

## Secrets

Ne jamais commiter ni journaliser :

- `.env.local` ;
- `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` ;
- `ANTHROPIC_API_KEY` ;
- toute clé BYOK saisie par un utilisateur ;
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
- Les clés Anthropic de session restent uniquement en mémoire React ; aucun
  stockage persistant navigateur n'est autorisé.
- Les clés synchronisées restent dans Supabase Vault ; les réponses exposent
  seulement le statut et le modèle.
- Les tables IA ont RLS activée et forcée sans grant `anon`/`authenticated` ;
  les RPC de secret sont réservées au rôle serveur.
- Toute sortie vers Anthropic exige une session valide, des entrées bornées et
  un quota atomique consommé avant l'appel.
- Les corps d'erreur Anthropic et les en-têtes contenant une clé ne sont jamais
  journalisés ni relayés au client.

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
