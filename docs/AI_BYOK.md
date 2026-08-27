# BYOK Anthropic — Capsule

## Usage

Dans l'application authentifiée, ouvrir le menu secondaire puis
**Paramètres IA**. Deux modes sont disponibles :

- **Cette session uniquement** : la clé reste dans l'état React de la page et
  disparaît au rechargement, à la déconnexion ou avec **Oublier la clé** ;
- **Synchronisée et chiffrée** : la clé est chiffrée par Supabase Vault et la
  préférence de modèle est disponible sur les appareils du même compte.

Le bouton **Tester et charger les modèles** interroge le catalogue Anthropic
avec la clé choisie. Capsule ne propose que les identifiants effectivement
retournés par ce catalogue.

## Frontières de sécurité

- La clé n'est jamais écrite dans `localStorage`, `sessionStorage`, IndexedDB,
  une note, une réponse JSON ou un journal applicatif.
- Le navigateur envoie une clé de session uniquement vers les routes same-origin
  de Capsule, par HTTPS en production.
- Une clé synchronisée n'est jamais renvoyée au navigateur : l'API retourne
  seulement `configured`, `provider` et `modelId`.
- Les rôles `anon` et `authenticated` n'ont aucun droit sur les tables IA, le
  schéma Vault ou les RPC de secret.
- Le serveur vérifie le Bearer token Supabase avant toute lecture de réglage ou
  tout appel Anthropic.
- Chaque sortie externe IA consomme un quota atomique de 10 requêtes par minute
  et par utilisateur. Une réponse 429 fournit `Retry-After`.
- Le titre est limité à 500 caractères, le contenu à 20 000 caractères et la
  réponse Anthropic à 150 tokens.
- Les erreurs fournisseur sont traduites en codes sûrs ; leur corps n'est ni
  relayé ni journalisé.

Un JavaScript malveillant déjà exécuté dans l'origine pourrait lire une clé
présente en mémoire. La prévention XSS, les dépendances à jour et l'absence de
HTML Markdown brut restent donc des invariants complémentaires.

## Architecture

| Route | Méthode | Rôle |
|---|---|---|
| `/api/ai/settings` | `GET` | statut et modèle, jamais la clé |
| `/api/ai/settings` | `PUT` | valide la clé et le modèle avant stockage Vault |
| `/api/ai/settings` | `DELETE` | supprime réglage et secret Vault |
| `/api/ai/models` | `POST` | catalogue Anthropic avec clé session ou stockée |
| `/api/resumer` | `POST` | résumé borné avec modèle session ou stocké |

Les tables `user_ai_settings` et `ai_rate_limits` sont privées au rôle serveur,
avec RLS activée et forcée. Les fonctions `SECURITY DEFINER` qualifient tous les
objets avec un `search_path` vide. Le trigger de suppression efface le secret
Vault lors de la suppression du réglage ou du compte utilisateur.

## Migration et audit

Migration forward-only :
`supabase/migrations/20260827094500_add_user_ai_settings.sql`.

Audit structurel read-only :

```powershell
npx supabase db query --linked --file supabase/tests/ai_security_audit.sql
```

Le résultat attendu contient neuf lignes avec `ok = true`. Si la CLI ne peut
pas atteindre le projet, exécuter le fichier dans le SQL Editor après avoir
vérifié le projet, sans jamais coller de clé réelle dans la requête.

## Recette

Utiliser un compte synthétique temporaire :

1. sans configuration, vérifier le code 428 au premier résumé ;
2. tester une clé invalide et vérifier qu'aucun détail Anthropic n'est exposé ;
3. activer le mode session, choisir un modèle, résumer une note puis recharger :
   la configuration doit être oubliée ;
4. activer le mode synchronisé, résumer puis rouvrir le dialogue : seul le
   statut et le modèle doivent apparaître ;
5. supprimer la clé synchronisée et vérifier le retour à l'état non configuré ;
6. supprimer la note et le compte synthétiques ; contrôler l'absence de ligne
   dans `user_ai_settings`, `ai_rate_limits` et de secret Vault associé.

Ne jamais capturer, afficher ou consigner la clé pendant la recette.

Le smoke automatisé `npm run test:ai:smoke -- --base-url=<URL>` reproduit ce
cycle avec un compte temporaire. Il refuse de démarrer sans
`AI_SMOKE_ALLOW_SYNTHETIC_WRITES=1` et purge le compte même en cas d'échec.

## Rollback

Le dernier déploiement antérieur peut être réassigné sur Vercel : il ignore les
deux tables AI-001. Ne pas supprimer les tables ou les secrets par rollback SQL.
Une correction de schéma est une nouvelle migration forward-only. La variable
Vercel historique `ANTHROPIC_API_KEY` peut rester chiffrée le temps de la fenêtre
de retour arrière, mais le code AI-001 ne l'utilise pas implicitement.
