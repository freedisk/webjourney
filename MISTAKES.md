# Capsule — registre des erreurs et apprentissages

Ce registre est factuel et sans recherche de responsabilité. Une entrée reste
présente après correction afin d'éviter la répétition du problème.

## M-001 — Documentation initiale en dérive

- **Date constatée** : 2026-08-26.
- **Symptôme** : README générique et roadmap indiquant comme futures des
  fonctions déjà livrées.
- **Cause** : documentation mise à jour séparément du code.
- **Impact** : reprise et estimation du périmètre incertaines.
- **Correction** : README, CLAUDE, DEVELOPMENT et guides ciblés réécrits.
- **Prévention** : documentation obligatoire dans la même PR et mémoire stable.
- **Statut** : corrigé ; contrôle continu.

## M-002 — Schéma Supabase historique non versionné

- **Date constatée** : 2026-08-26.
- **Symptôme** : seules les images disposent d'une migration Git ; `notes`,
  `tags` et `notes_tags` ne peuvent pas être recréées depuis le dépôt.
- **Cause** : construction historique dans le Dashboard/SQL Editor sans CLI.
- **Impact** : dérive possible, staging difficile, restauration non démontrée.
- **Correction** : photographie stricte, baseline `20260826000000`, migration
  images conservée et historique local/distant aligné sans rejeu du DDL.
- **Prévention** : toute évolution future commence par une migration versionnée.
- **Statut** : corrigé ; `db reset` Docker suivi séparément par `TOOL-002`.

## M-003 — Rejeu involontaire dans le SQL Editor

- **Date constatée** : 2026-08-26.
- **Symptôme** : le contrôle censé être en lecture a renvoyé le résultat du DDL
  précédent ; la migration a été rejouée.
- **Cause** : contenu ou sélection Monaco non remplacé proprement.
- **Impact** : aucun dommage car la migration était idempotente, mais risque
  réel pour un script non idempotent.
- **Correction** : éditeur vidé explicitement avant la requête de contrôle.
- **Prévention** : nouvel onglet SQL, sélection complète vérifiée, script relu,
  puis contrôle indépendant.
- **Statut** : corrigé.

## M-004 — Privilèges implicites trop larges

- **Date constatée** : 2026-08-26.
- **Symptôme** : `authenticated` conservait notamment `UPDATE`, `TRUNCATE`,
  `REFERENCES` et `TRIGGER` sur `note_images`.
- **Cause** : grants par défaut non révoqués avant les grants minimaux.
- **Impact** : surface d'accès supérieure à l'intention, même avec RLS.
- **Correction** : `REVOKE ALL`, puis `GRANT SELECT, INSERT, DELETE` ; production
  contrôlée à 11/11 puis 10/10 vérifications.
- **Prévention** : assertions explicites sur les grants après chaque migration.
- **Statut** : corrigé.

## M-005 — Serveur de développement bloquant `npm ci`

- **Date constatée** : 2026-08-26.
- **Symptôme** : verrou Windows sur le binaire `lightningcss`.
- **Cause** : `next dev` utilisait encore le fichier pendant l'installation
  propre des dépendances.
- **Impact** : gate local interrompu, sans défaut applicatif.
- **Correction** : arrêt ciblé du serveur sur le port 3000, `npm ci`, validation,
  puis redémarrage.
- **Prévention** : arrêter les watchers avant `npm ci` sous Windows.
- **Statut** : corrigé.

## M-006 — Bootstrap GitHub Actions atypique

- **Date constatée** : 2026-08-26.
- **Symptôme** : aucun run depuis la branche secondaire avant que le workflow
  n'existe sur la branche par défaut ; événements ensuite retardés.
- **Cause** : bootstrap initial du workflow et latence GitHub Actions.
- **Impact** : push direct exceptionnel nécessaire avant activation du ruleset.
- **Correction** : workflow installé, run manuel initial, ruleset
  `main-quality-gate` activé puis validé par PR réelle.
- **Prévention** : le workflow est désormais présent sur `main`; aucun nouveau
  bootstrap ne doit être nécessaire.
- **Statut** : corrigé.

## M-007 — Sessions CLI et contrôle Chrome instables

- **Date constatée** : 2026-08-26.
- **Symptôme** : session Vercel CLI initialement expirée et plusieurs timeouts de
  prise de contrôle d'un onglet GitHub Chrome. Lors du baselining Supabase, un
  ancien format de profil Windows a aussi refusé `--profile capsule`, puis le
  mode agent a empêché le prompt interactif jusqu'à l'usage de `--agent no`.
- **Cause** : authentifications et contrôle navigateur indépendants du dépôt.
- **Impact** : délais opérationnels, sans modification incorrecte.
- **Correction** : réauthentification Vercel et usage des identifiants Git déjà
  authentifiés pour l'API GitHub. Pour Supabase, un ancien compte CLI est
  redevenu actif en fin de session ; une nouvelle connexion nommée
  `Capsule-CLI` a été créée et vérifiée dans deux processus séparés sur le projet
  Webjourney et son historique de migrations.
- **Prévention** : vérifier les CLI en lecture seule avant une release et garder
  une voie API authentifiée sans afficher les jetons ; isoler et nommer les
  nouveaux accès persistants lorsque le CLI le permet.
- **Statut** : corrigé pour cette session ; à surveiller si plusieurs comptes
  Supabase partagent de nouveau l'identifiant générique du gestionnaire Windows.

## M-008 — Dette qualité et sécurité non bloquante à l'origine

- **Date constatée** : 2026-08-26.
- **Symptôme** : huit erreurs lint, aucun test et cinq vulnérabilités élevées.
- **Cause** : absence de gate automatisé.
- **Impact** : risque de livrer une régression ou une dépendance vulnérable.
- **Correction** : lint corrigé, 21 tests, dépendances mises à jour, audit à zéro
  et `Quality gate` obligatoire.
- **Prévention** : PR protégée et audit élevé bloquant.
- **Statut** : corrigé.

## M-009 — Outils de baseline dépendants de Docker et limites Windows

- **Date constatée** : 2026-08-26.
- **Symptôme** : `db dump` et la génération locale pg-delta ont exigé Docker
  Desktop ; une validation SQL transmise en argument a dépassé la limite de
  longueur de commande Windows. Le premier audit SQL comparait aussi deux types
  de tableaux PostgreSQL incompatibles et `db lint --linked` a renvoyé 403 pour
  le niveau d'accès de ce compte.
- **Cause** : dépendances conteneurisées de certaines commandes CLI, limite de
  `cmd.exe` et casts implicites insuffisants dans `information_schema`.
- **Impact** : trois tentatives interrompues avant toute écriture persistante.
- **Correction** : export déclaratif distant `--strict-coverage`, casts
  explicites, puis transmission de la transaction de validation par l'entrée
  standard de la CLI ; le lint local est reporté sur la stack conteneurisée.
- **Prévention** : vérifier les prérequis de chaque sous-commande, préférer
  `--file` ou stdin pour le SQL long et typer explicitement les agrégats d'audit.
- **Statut** : contourné ; installation Docker suivie par `TOOL-002`.

## M-010 — Initialisations Supabase CLI concurrentes

- **Date constatée** : 2026-08-26.
- **Symptôme** : `migration list` et l'audit SQL lancés simultanément sont restés
  bloqués sur `Initialising login role...`, alors qu'un dry-run parallèle avait
  déjà obtenu la connexion.
- **Cause** : concurrence probable lors de l'initialisation du rôle de connexion
  par deux processus CLI liés au même profil local.
- **Impact** : deux lectures sans écriture ont été interrompues ; aucune
  modification de base ni perte de preuve.
- **Correction** : arrêt ciblé des deux processus, puis commandes rejouées
  séquentiellement avec succès en environ quatre secondes chacune.
- **Prévention** : sérialiser les commandes Supabase CLI qui initialisent une
  connexion liée ; paralléliser seulement les contrôles sans session partagée.
- **Statut** : corrigé ; procédure inscrite dans ce registre.

## M-011 — Libellé visuel masqué devenu nom accessible vide

- **Date constatée** : 2026-08-27.
- **Symptôme** : au breakpoint iPad, le texte du bouton Nouvelle note était
  masqué pour compacter l'en-tête et son nom accessible disparaissait avec lui.
- **Cause** : le composant comptait sur son texte visible sans fournir de nom
  stable au bouton icône responsive.
- **Impact** : action ambiguë pour un lecteur d'écran à 1 024 px, sans perte de
  fonctionnalité visuelle.
- **Correction** : ajout de `aria-label` explicites aux actions principales,
  épingles, couleurs, suppression et fermeture, puis contrôle du DOM aux trois
  viewports de recette.
- **Prévention** : toute étiquette masquée par CSS doit conserver un nom
  accessible indépendant ; l'invariant est couvert par un test UX statique.
- **Statut** : corrigé.

## M-012 — Annulation Kanban capturant un état React périmé

- **Date constatée** : 2026-08-27.
- **Symptôme** : la première implémentation de l'action Annuler rappelait la
  fonction de déplacement fermée sur le tableau `notes` antérieur ; elle pouvait
  considérer à tort que la note était déjà dans sa colonne d'origine.
- **Cause** : fermeture JavaScript conservée dans un toast asynchrone.
- **Impact** : l'annulation affichée aurait pu ne produire aucun déplacement.
- **Correction** : référence synchronisée vers l'état courant, restauration SQL
  explicite de la colonne et de l'ordre, puis garde contre une modification plus
  récente de la même note.
- **Prévention** : une action différée ne décide jamais depuis un snapshot React
  capturé ; test d'invariant et revue des callbacks asynchrones.
- **Statut** : corrigé avant publication.

## M-013 — Fond de modale encore exposé aux technologies d'assistance

- **Date constatée** : 2026-08-27.
- **Symptôme** : la recette privée retrouvait deux boutons Épingler portant le
  même nom, l'un dans la note et l'autre dans la page située derrière l'overlay.
  Le titre de création et les recherches reposaient aussi sur leur placeholder.
- **Cause** : confinement du focus sans isolation DOM du fond et labels visuels
  non associés à tous les champs historiques.
- **Impact** : navigation ambiguë pour lecteurs d'écran malgré une modale
  visuellement correcte.
- **Correction** : `inert` et `aria-hidden` restaurables sur les racines sœurs
  pour dialogues, drawer, visionneuse et modales historiques ; libellés stables
  sur titres, recherche et création de tags.
- **Prévention** : test unitaire de la couche d'isolation et assertions statiques
  sur les noms accessibles.
- **Statut** : corrigé et validé en production.

## M-014 — Action de toast couverte par l'overlay

- **Date constatée** : 2026-08-27.
- **Symptôme** : cliquer Annuler après un épinglage fermait la modale sans
  exécuter l'action, car le toast appartenait au contexte d'empilement du fond.
- **Cause** : viewport de toasts rendu dans `app-shell` tandis que la modale est
  portée directement sous `body`.
- **Impact** : annulation d'épinglage indisponible tant que le détail restait
  ouvert.
- **Correction** : portail de toasts stable sous `body`, couche explicitement
  exemptée de l'isolation et incluse dans la liste de focus modal.
- **Prévention** : recette réelle du clic Annuler avec dialogue toujours ouvert
  et invariant statique du portail.
- **Statut** : corrigé et validé en production.

## Modèle d'entrée

```markdown
## M-XXX — Titre

- **Date constatée** : YYYY-MM-DD.
- **Symptôme** :
- **Cause** :
- **Impact** :
- **Correction** :
- **Prévention** :
- **Statut** : ouvert | corrigé | surveillé.
```
