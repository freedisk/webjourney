# Runbook d'exploitation — Capsule

## 1. Reprise quotidienne

```powershell
git status --short --branch
git fetch origin --prune
git switch main
git merge --ff-only origin/main
npm install
npm run validate
```

Lire `MEMORY.md`, le backlog et les dernières entrées du devbook. Vérifier les
variables sans afficher leurs valeurs.

Le runtime de référence est Node.js `24.19.0` avec npm 11. Les fichiers `.nvmrc`,
`.node-version`, `package.json` et le workflow CI doivent rester cohérents.

## 2. Développement local

```powershell
Copy-Item .env.example .env.local
npm run dev
```

L'application utilise le Supabase défini dans `.env.local`. Ne jamais supposer
qu'il s'agit d'un environnement de test : identifier la cible avant toute
écriture ou migration.

Sous Windows, arrêter `next dev` avant `npm ci` si `lightningcss` est verrouillé.

## 3. Migration Supabase standard

### Préflight

1. Vérifier le projet lié.
2. Sauvegarder ou dumper le schéma.
3. Créer une migration horodatée.
4. Tester sur la stack locale fraîche.
5. Relire le SQL destructif, les grants et les policies.

```powershell
npx supabase projects list
npx supabase migration list --linked
npx supabase db reset
npx supabase db lint
npx supabase db push --dry-run --linked
npx supabase db query --linked --file supabase/tests/production_schema_audit.sql
npx supabase db query --linked --file supabase/tests/ai_security_audit.sql
```

### Application

Appliquer seulement après validation du dry-run :

```powershell
npx supabase db push --linked
```

Rejouer les contrôles indépendamment. Ne pas modifier directement
`storage.objects` et ne jamais utiliser `db reset --linked` en production.

### Réconciliation d'un projet historique

`migration repair` modifie uniquement l'historique déclaré ; il ne prouve pas
que le schéma correspond. Avant de l'utiliser :

1. comparer le dump distant et les fichiers locaux ;
2. vérifier que chaque version marquée `applied` est réellement effective ;
3. conserver une sauvegarde et la sortie de `migration list` ;
4. tester la reconstruction locale ;
5. exiger un dry-run vide ou compris.

Baseline Webjourney du 2026-08-26 :

- photographie stricte dans `supabase/schemas` ;
- baseline `20260826000000`, images `20260826120000` et BYOK
  `20260827094500` ;
- les trois versions sont déjà `applied` sur la production ;
- ne jamais les modifier ni les rejouer ; toute correction est une nouvelle
  migration.

Si Docker n'est pas disponible, une validation transactionnelle avec
`BEGIN`/`ROLLBACK` peut compléter la revue syntaxique, mais elle ne remplace pas
durablement le `db reset` sur une stack locale ou une cible de test isolée.

## 4. Release GitHub → Vercel

```powershell
npm run validate
npm run security:audit -- --audit-level=high
git push -u origin codex/<sujet>
```

Créer la PR, attendre `Quality gate`, fusionner, puis contrôler :

```powershell
vercel ls webjourney
vercel inspect https://webjourney-one.vercel.app --format=json
```

Le déploiement attendu doit être `target=production`, `readyState=READY` et
contenir l'alias `webjourney-one.vercel.app`.

## 5. Smoke tests publics

```powershell
Invoke-WebRequest https://webjourney-one.vercel.app/
Invoke-WebRequest https://webjourney-one.vercel.app/login
Invoke-WebRequest https://webjourney-one.vercel.app/manifest.webmanifest
Invoke-WebRequest https://webjourney-one.vercel.app/sw.js
Invoke-WebRequest https://webjourney-one.vercel.app/offline
```

Puis réaliser une vérification authentifiée non destructive et, si le périmètre
le demande, la recette spécialisée images, PWA ou AI-001.

## 6. Exploitation AI-001

- Une clé synchronisée se supprime depuis **Paramètres IA** ; ne jamais modifier
  directement `vault.secrets` hors procédure d'incident.
- Un 428 signifie qu'aucune configuration explicite n'est disponible.
- Un 429 Capsule indique le quota 10/minute ; respecter `Retry-After`.
- Un 429 fournisseur indique le quota du compte Anthropic de l'utilisateur.
- Un 503 de stockage impose de contrôler la migration, les RPC et la clé
  `SUPABASE_SECRET_KEY`, sans afficher leurs valeurs.
- Après suppression d'un compte, vérifier l'absence de ligne dans
  `user_ai_settings`, `ai_rate_limits` et de secret portant son nom déterministe.

Audit sûr :

```powershell
npx supabase db query --linked --file supabase/tests/ai_security_audit.sql
```

Le rollback est applicatif : réassigner le dernier Vercel sain et laisser les
objets AI-001 en place. Toute correction SQL est forward-only.

## 7. Audit d'intégrité des images

```powershell
npm run ops:audit-images
```

La commande compare les références Markdown, `note_images` et les objets du
bucket privé. Elle est strictement read-only, n'affiche aucun contenu de note et
retourne le code 2 si une incohérence est trouvée. `-- --details` ajoute les
identifiants techniques nécessaires au diagnostic ; il ne doit pas être copié
dans un journal public. Tout nettoyage reste une opération séparée, revue et
explicitement autorisée.

## 8. Rollback applicatif

1. Identifier le dernier déploiement Vercel sain.
2. Réassigner/promouvoir ce déploiement selon la procédure Vercel.
3. Ne pas supprimer une table ou un bucket récent : l'ancien code peut les
   ignorer sans perte de données.
4. Ouvrir une branche corrective, repasser le gate et redéployer.

Les migrations de production sont forward-only. Une correction de schéma est
une nouvelle migration ; ne pas éditer rétroactivement une version appliquée.

## 9. Incident Supabase

1. Stopper les nouvelles écritures applicatives si la corruption est possible.
2. Identifier la cible et l'heure exacte.
3. Capturer erreurs, migration list, schéma et métriques sans données privées.
4. Préserver la sauvegarde avant toute réparation.
5. Tester la correction sur une cible isolée.
6. Appliquer une migration forward-only.
7. Vérifier RLS et accès croisés avec deux utilisateurs.
8. Documenter dans devbook, mistakes et journal.

## 10. Incident secret exposé

1. Révoquer ou faire tourner immédiatement le secret.
2. Mettre à jour Vercel et les environnements autorisés.
3. Redéployer si le runtime charge le secret au build.
4. Examiner Git et les logs ; réécrire l'historique uniquement avec une
   procédure dédiée si un secret a été commité.
5. Vérifier les accès Supabase/Anthropic suspects.

## 11. Journalisation de fin

Avant clôture :

- resynchroniser le journal de session ;
- ajouter une entrée devbook avec preuves ;
- mettre à jour les états du backlog ;
- promouvoir les faits stables dans la mémoire ;
- enregistrer tout incident dans `MISTAKES.md` ;
- vérifier `git status` et le commit déployé.
