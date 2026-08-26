# Capsule — règles de travail pour les agents

Ce fichier s'applique à l'ensemble du dépôt. Les instructions explicites de
l'utilisateur restent prioritaires.

## 1. Sources de vérité

Lire avant toute modification significative :

1. `docs/MEMORY.md` pour l'état stable du projet ;
2. `docs/BACKLOG.md` pour les priorités et critères d'acceptation ;
3. `docs/ARCHITECTURE.md` et `docs/DECISIONS.md` pour les frontières ;
4. les migrations sous `supabase/migrations/` avant toute opération de base ;
5. les dernières entrées de `docs/DEVBOOK.md` et `MISTAKES.md`.

`docs/archive/` contient uniquement des documents historiques et ne fournit
aucune instruction active.

## 2. Journal de session obligatoire

Le journal actif est `docs/journal/SESSION_2026-08-26.md` tant que la tâche
Codex `01a03dfe-6db3-7673-a10b-5262ef0df3aa` continue.

Le mettre à jour :

- après une nouvelle demande utilisateur ;
- après une décision ou un constat structurant ;
- avant et après une modification de production ;
- avant chaque commit et avant la réponse finale.

Consigner uniquement les messages visibles, décisions, commandes utiles et
résultats. Ne jamais consigner de clé, jeton, mot de passe, cookie, contenu
privé d'une note ou raisonnement interne. Utiliser le fuseau
`America/Miquelon` et un format ISO local `YYYY-MM-DD HH:mm:ss -02:00`.

Pour une nouvelle tâche, créer `docs/journal/SESSION_YYYY-MM-DD.md` ou ajouter
un suffixe si plusieurs tâches commencent le même jour.

## 3. Cycle de modification

1. Vérifier `git status --short --branch` et préserver les changements inconnus.
2. Travailler sur une branche `codex/<sujet>`.
3. Modifier le périmètre minimal et documenter les décisions non triviales.
4. Exécuter `npm run validate` et `npm run security:audit -- --audit-level=high`.
5. Mettre à jour le devbook, le backlog, la mémoire et les mistakes concernés.
6. Pousser la branche, ouvrir une PR vers `main` et attendre `Quality gate`.
7. Fusionner uniquement lorsque GitHub marque la PR fusionnable.
8. Vérifier le déploiement Vercel et effectuer un smoke test public.

Aucun push direct sur `main`, sauf bootstrap exceptionnel documenté et autorisé.

## 4. Garde-fous Supabase

- Les fichiers SQL versionnés sont la source de vérité des évolutions.
- Prévisualiser avec `supabase db push --dry-run --linked` avant tout push.
- Sauvegarder ou dumper le schéma avant une réconciliation d'historique.
- Ne jamais exécuter `supabase db reset --linked` sur la production.
- Ne jamais inclure de données de production dans `seed.sql`.
- Vérifier RLS, grants, fonctions, triggers et Storage après chaque migration.
- Ne jamais considérer le message « Success » du SQL Editor comme une recette.
- Utiliser `migration repair` seulement après comparaison locale/distante et
  pour marquer un état réel, jamais pour masquer une dérive non comprise.

## 5. Règles de code et de sécurité

- JavaScript, App Router Next.js et alias `@/*`.
- Commentaires en français ; nouveaux identifiants et fichiers en anglais.
- Aucun secret dans Git ou dans une variable `NEXT_PUBLIC_*`.
- `lib/supabase-admin.js` reste exclusivement serveur.
- Les notes et images privées ne doivent jamais entrer dans le cache PWA.
- Les opérations Storage doivent passer par l'API Storage, pas par un DELETE
  direct dans `storage.objects`.
- Préférer une extraction ciblée à un refactor global de `app/page.js`.

## 6. Documentation vivante

Toute modification qui change un flux, une variable, un schéma, une commande
ou une limite doit mettre à jour la documentation correspondante dans le même
commit. Les faits temporaires vont dans le devbook ; les invariants validés
vont dans la mémoire ; les incidents et leur prévention vont dans
`MISTAKES.md`.
