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
- La mise en forme masque côté serveur toute référence et légende d'image
  privée, ainsi que les nombres, URL et cases à cocher ; une sortie ayant perdu,
  dupliqué, réordonné ou inventé un marqueur est rejetée sans toucher au
  brouillon.
- Une note longue est validée section par section puis globalement. Une seule
  reprise ciblée est permise ; aucun fragment incomplet n'est exposé au client.
- Une proposition IA n'est jamais enregistrée ou appliquée implicitement ; le
  client vérifie que le snapshot source n'a pas changé avant l'application.
- Les corps d'erreur Anthropic et les en-têtes contenant une clé ne sont jamais
  journalisés ni relayés au client.

## PWA

Le service worker peut mettre en cache le shell statique et `/offline`. Il ne
doit jamais mettre en cache les notes, images signées, réponses Supabase,
résumés ou propositions Anthropic.

## Dépendances et livraison

Chaque PR exécute lint, tests, build et audit de dépendances. `main` exige une
PR et le contrôle `Quality gate`. Toute vulnérabilité élevée ou critique
bloque la fusion, sauf l'exception de développement explicitement approuvée
et bornée ci-dessous. Aucune exception n'est applicable à la production.

### Exception temporaire de lint — approuvée le 2026-10-10

Le propriétaire a autorisé GHSA-vfj7-8cjw-p6xm pour livrer UX-003. Le code
`lib/dependency-audit.js` fixe le seul périmètre admis : `braces` 3.0.3,
`micromatch` 4.0.8, `fast-glob` 3.3.1, `@next/eslint-plugin-next` 16.4.0 et
`eslint-config-next` 16.4.0, aux chemins racine observés et avec `dev: true`.
Les cinq constats npm ont une seule cause : l'alerte de récursion `braces`.
Une autre alerte, une sévérité critique, un changement de version, de chemin
ou d'usage n'entre pas dans cette exception.

Échéance : **2026-10-24T23:59:59Z**. L'expiration bloque à nouveau l'alerte.
La publication d'une autre version de `braces` impose également une revue et
une mise à jour ; elle est vérifiée contre le registre npm à chaque utilisation
de l'exception. Une panne de registre, un rapport incomplet ou invalide bloque.

`npm run security:audit -- --audit-level=high` exécute un audit production
séparé sans aucune exception, puis l'audit complet et filtre seulement cette
cause de développement après contrôle du lockfile et du graphe de dépendances.
La sortie annonce explicitement l'exception utilisée et son échéance ; le
workflow, le nom `Quality gate` et les protections GitHub restent inchangés.

Après correctif amont : mettre à jour les dépendances, supprimer cette
exception et vérifier `npm audit --audit-level=high` directement. Aucun
`npm audit fix --force`, abaissement global de sévérité ou `--omit=dev` sur
l'audit complet n'est autorisé par cette décision.

## Signalement et réponse

Ne pas ouvrir de ticket public contenant un secret ou une note privée. Prévenir
directement le propriétaire du dépôt, révoquer la clé concernée, désactiver le
partage si nécessaire, préserver les journaux sans données privées puis suivre
la procédure d'incident de `docs/RUNBOOK.md`.
