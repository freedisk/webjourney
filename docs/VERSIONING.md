# Version, build et mises à jour — Capsule

## Identité d'une livraison

Capsule distingue trois informations :

| Champ | Source | Sens |
|---|---|---|
| Version | `package.json` | étape fonctionnelle publique en SemVer |
| Build | SHA Git du commit | code exact construit et déployé |
| Date | instant ISO du build | moment où les assets ont été produits |

La version initiale publique est `1.0.0`. Une évolution compatible ajoute une
version mineure, un correctif compatible une version patch et une rupture de
contrat une version majeure. `package-lock.json`, `lib/release-notes.js` et
`CHANGELOG.md` doivent rester cohérents avec `package.json`.

Le build n'est pas un compteur métier. Vercel fournit
`VERCEL_GIT_COMMIT_SHA` ; en local, `next.config.mjs` utilise `git rev-parse
HEAD`, puis la valeur sûre `local` si les métadonnées Git sont absentes. Le SHA
complet traverse uniquement le contrat technique ; l'interface en affiche les
sept premiers caractères.

La date est calculée une seule fois au chargement de `next.config.mjs`. La
variable serveur facultative `CAPSULE_BUILD_DATE` permet uniquement de rendre un
build reproductible ; elle n'est pas requise sur Vercel et une valeur invalide
est ignorée.

## Injection et confidentialité

`next.config.mjs` injecte explicitement :

- `NEXT_PUBLIC_CAPSULE_VERSION` ;
- `NEXT_PUBLIC_CAPSULE_BUILD_ID` ;
- `NEXT_PUBLIC_CAPSULE_BUILT_AT`.

Ces valeurs sont publiques et figées dans les assets du build. Aucun parcours
automatique des variables d'environnement n'est autorisé : les clés Supabase
secrètes, clés Anthropic, tokens et autres variables Vercel ne doivent jamais
entrer dans ce mécanisme.

## Contrôle de mise à jour

La PWA chargée possède son propre `CURRENT_BUILD_INFO`. Au clic sur **Vérifier
les mises à jour**, elle appelle `GET /api/version` sur l'alias courant avec
`cache: no-store`. La route retourne seulement :

```json
{
  "version": "1.0.0",
  "buildId": "0123456789abcdef0123456789abcdef01234567",
  "builtAt": "2026-08-28T15:00:00.000Z"
}
```

La réponse est strictement validée. Une version ou un SHA différent annonce une
nouvelle livraison ; **Recharger maintenant** demande d'abord au service worker
de vérifier sa mise à jour, puis recharge la page. Une erreur réseau ne ferme
pas l'application et n'altère aucune donnée.

La compatibilité de ce JSON est un contrat de release : conserver les champs et
leur sens permet à un ancien client déjà ouvert de comparer son build avec une
production plus récente.

## Règles PWA

- le footer ne déclenche aucun appel réseau ;
- le contrôle est manuel, jamais au démarrage ;
- `/api/version` reste hors du cache du service worker avec toutes les routes
  `/api/` ;
- aucune page privée, note ou image ne participe à la vérification ;
- hors ligne, le build chargé et le changelog statique restent consultables ;
- un rechargement hors ligne conserve le comportement sûr décrit dans
  `docs/PWA.md`.

## Procédure de release

1. Choisir la prochaine version SemVer selon l'impact utilisateur.
2. Mettre à jour `package.json` et les deux versions racine du lockfile.
3. Ajouter une entrée utilisateur concise en tête de `lib/release-notes.js` et
   conserver trois à cinq jalons au maximum.
4. Déplacer les changements concernés dans la version correspondante de
   `CHANGELOG.md`.
5. Exécuter `npm run validate` et l'audit élevé.
6. Après déploiement, comparer `/api/version` au SHA de fusion et vérifier les
   en-têtes `no-store` et `nosniff`.
7. Ouvrir **À propos** depuis une session chargée, contrôler **À jour**, puis
   vérifier le footer à 390, 1 024 et 1 416 px.

## Diagnostic

- **Version `0.0.0`, build `local`** : le build n'a pas reçu les constantes
  injectées ; vérifier qu'il passe bien par `next.config.mjs`.
- **Nouvelle livraison annoncée après un rollback** : l'alias courant est la
  source de vérité ; recharger sert le build réassigné, même si son SemVer est
  inférieur.
- **Impossible de vérifier** : contrôler le réseau et `GET /api/version`. Ne
  jamais vider manuellement les données privées pour résoudre ce seul état.
- **PWA toujours ancienne** : utiliser **Recharger maintenant**, fermer puis
  rouvrir l'icône installée et confirmer le nouveau SHA court.

## Rollback

Réassigner le précédent déploiement Vercel. La version et le build reflètent
alors automatiquement ce déploiement ; aucune table, donnée ou configuration
Supabase n'est concernée.
