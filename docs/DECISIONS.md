# Journal des décisions d'architecture

Les décisions acceptées sont durables. Une décision remplacée reste dans le
journal avec un lien vers celle qui la remplace.

## ADR-001 — Images dans un bucket privé

- **Statut** : accepté.
- **Date** : 2026-08-26.
- **Contexte** : les notes privées doivent accepter fichiers et collage.
- **Décision** : bucket Supabase privé `note-images`, RLS par propriétaire et
  métadonnées dans `public.note_images`.
- **Conséquences** : aucune URL publique stable ; signature requise au rendu ;
  suppression Storage distincte de la cascade SQL.

## ADR-002 — Référence Markdown stable

- **Statut** : accepté.
- **Date** : 2026-08-26.
- **Décision** : stocker `![alt](capsule-image/<uuid>)` dans `notes.contenu`.
- **Raison** : une URL signée expire et ne constitue pas un identifiant durable.
- **Conséquences** : le renderer a besoin d'une table UUID → URL signée ; les
  duplications doivent réécrire les UUID.

## ADR-003 — Upload différé et compensation

- **Statut** : accepté.
- **Date** : 2026-08-26.
- **Décision** : conserver les fichiers en mémoire jusqu'à Sauver/Créer, puis
  supprimer les objets déjà envoyés si une étape ultérieure échoue.
- **Raison** : réduire les objets orphelins lors d'une annulation ou d'un échec.
- **Conséquences** : les très gros brouillons restent limités par la mémoire du
  navigateur ; la limite unitaire est fixée à 5 Mio.

## ADR-004 — Partage public signé côté serveur

- **Statut** : accepté.
- **Date** : 2026-08-26.
- **Décision** : la page serveur valide token, note, image et chemin avant de
  signer pour dix minutes avec une clé serveur.
- **Raison** : permettre le partage sans rendre le bucket public.
- **Conséquences** : une URL déjà émise peut rester valable au plus dix minutes
  après désactivation du partage.

## ADR-005 — PWA sans données privées hors ligne

- **Statut** : accepté.
- **Date** : 2026-08-26.
- **Décision** : précacher uniquement le shell, les icônes et `/offline`.
- **Raison** : éviter une copie non chiffrée de notes privées dans le cache.
- **Conséquences** : l'application est installable, mais les notes nécessitent
  une connexion.

## ADR-006 — Gate GitHub avant Vercel

- **Statut** : accepté.
- **Date** : 2026-08-26.
- **Décision** : PR obligatoire vers `main`, branche à jour, contrôle strict
  `Quality gate`, aucun bypass ; Vercel déploie uniquement après fusion.
- **Raison** : rendre lint, tests, build et audit bloquants.
- **Conséquences** : une latence GitHub Actions bloque volontairement la release.

## ADR-007 — Baseline Supabase puis migrations forward-only

- **Statut** : accepté.
- **Date** : 2026-08-26.
- **Contexte** : le noyau historique a été créé via Dashboard/SQL Editor et la
  migration images a été exécutée manuellement.
- **Décision** : conserver une photographie déclarative stricte, versionner la
  baseline `20260826000000`, marquer cette baseline et la migration images
  `20260826120000` comme déjà appliquées, puis imposer des migrations
  versionnées et forward-only.
- **Validation** : transaction SQL complète annulée par `ROLLBACK`, audit
  12/12, historique local/distant aligné et `db push --dry-run` vide.
- **Conséquences** : le dépôt devient reconstructible ; toute correction de
  production passe par une nouvelle migration, jamais par l'édition d'une
  migration déjà appliquée. Le test conteneurisé `db reset` reste suivi
  séparément par `TOOL-002`.

## ADR-008 — Compression locale et progression non intrusive

- **Statut** : accepté.
- **Date** : 2026-08-26.
- **Contexte** : les photos mobiles peuvent dépasser la limite Storage de 5 Mio
  et Supabase JS ne fournit pas de progression réseau en octets via l'upload
  utilisé par Capsule.
- **Décision** : accepter une source jusqu'à 20 Mio, la préparer séquentiellement
  dans le navigateur vers un WebP de 2 048 px maximum, puis afficher une
  progression déterministe par fichier et par phase Storage.
- **Raison** : réduire transfert, stockage et mémoire tout en conservant l'upload
  différé et les policies existantes.
- **Conséquences** : la progression d'envoi représente les fichiers terminés et
  la finalisation des métadonnées, pas un compteur d'octets réseau ; une source
  de plus de 40 Mpx est refusée pour protéger le navigateur.

## ADR-009 — Neo-brutalism fonctionnel et capacités progressives

- **Statut** : accepté.
- **Date** : 2026-08-27.
- **Contexte** : l'identité visuelle était cohérente, mais l'en-tête, les
  retours d'état et les actions secondaires manquaient de hiérarchie, surtout
  sur mobile et au tactile.
- **Décision** : conserver bordures franches, ombres décalées, faible rayon et
  accent violet, puis construire la modernisation avec des primitives
  accessibles et des capacités Web progressives.
- **Raison** : améliorer vitesse, lisibilité et confiance sans refonte de marque
  ni dépendance supplémentaire.
- **Conséquences** : Web Share, View Transition et raccourcis de manifeste sont
  optionnels ; chaque fonction dispose d'un repli. Les dialogues confinent et
  restituent le focus, les contrôles tactiles visent 44 px et le mouvement réduit
  reste prioritaire.

## ADR-010 — BYOK Anthropic derrière le proxy serveur

- **Statut** : accepté.
- **Date** : 2026-08-27.
- **Contexte** : une clé Vercel partagée finance actuellement les résumés de
  tous les comptes et le modèle Anthropic est codé en dur.
- **Décision** : conserver le proxy Next.js et proposer soit une clé éphémère
  gardée uniquement en mémoire React, soit une clé par utilisateur chiffrée par
  Supabase Vault. La préférence de modèle est séparée du secret et validée à
  partir de l'API Models Anthropic. La clé partagée n'est pas un repli implicite.
- **Raison** : attribuer coût et quota au propriétaire de la clé sans exposer un
  secret persistant au JavaScript du navigateur ni appeler Anthropic directement.
- **Conséquences** : les routes IA authentifient d'abord la session, ne
  renvoient jamais la clé, désactivent le cache, bornent modèle et contenu,
  appliquent un quota persistant et purgent le secret à la suppression du compte.

## ADR-011 — Aide embarquée et progression locale minimale

- **Statut** : accepté.
- **Date** : 2026-08-27.
- **Contexte** : les fonctions notes, images, PWA et BYOK sont riches, mais leur
  documentation externe oblige l'utilisateur à quitter son action courante.
- **Décision** : embarquer un centre d'aide statique, recherchable et accessible
  depuis les contextes utiles. Seuls les identifiants des étapes de démarrage
  cochées et l'état masqué de la checklist sont conservés dans `localStorage`.
- **Raison** : rendre l'aide immédiate et cohérente avec la version livrée, sans
  nouvelle table, télémétrie, profilage ni dépendance réseau.
- **Conséquences** : le contenu est versionné avec le code ; il fonctionne sans
  appel réseau une fois l'application chargée. Une navigation PWA rechargée hors
  ligne conserve volontairement l'écran de repli, car aucune page privée n'est
  mise en cache.

## ADR-012 — Proposition IA réversible et images privées opaques

- **Statut** : accepté.
- **Date** : 2026-08-27.
- **Contexte** : améliorer la lisibilité d'une note exige d'envoyer son texte au
  modèle, mais une sortie générative ne doit jamais écraser silencieusement le
  contenu ni exposer les identifiants ou légendes des images privées.
- **Décision** : la mise en forme produit seulement une proposition comparée à
  un snapshot exact. Son application explicite modifie le brouillon, jamais la
  base ; la sauvegarde reste distincte. Avant l'appel externe, le serveur masque
  toute référence `capsule-image` par un marqueur aléatoire et n'accepte la
  sortie que si chaque marqueur revient exactement une fois, dans le même ordre.
- **Raison** : conserver le contrôle humain, éviter les écrasements concurrents
  et réduire les métadonnées privées confiées au fournisseur.
- **Conséquences** : une réponse tronquée ou un seul marqueur altéré invalide la
  proposition entière. Le quota, la clé et le modèle d'AI-001 sont réutilisés ;
  aucune migration ni persistance de résultat IA n'est ajoutée.

## ADR-013 — Traitement sectionné et sans thinking des notes longues

- **Statut** : accepté.
- **Date** : 2026-08-27.
- **Contexte** : Sonnet 5 active le thinking adaptatif par défaut et son budget
  partage `max_tokens` avec la réponse visible ; une note de 18 389 caractères
  atteignait donc la limite après 75 secondes sans proposition exploitable.
- **Décision** : au-delà de 10 000 caractères, masquer aussi nombres, URL et
  tâches, découper aux frontières de phrases, traiter deux sections à la fois et
  désactiver le thinking seulement pour les modèles 5 qui l'acceptent. Une
  section invalide dispose d'une reprise unique ; l'ensemble reste atomique.
- **Raison** : cette transformation mécanique bénéficie davantage d'un budget
  réservé au texte visible que d'un raisonnement profond, tout en exigeant une
  conservation exacte des faits structurés.
- **Conséquences** : une action utilisateur peut provoquer plusieurs appels
  fournisseur mais ne consomme qu'une unité du quota Capsule. Le coût reste
  borné par les budgets de section, la concurrence de deux, la reprise unique et
  le timeout client ; aucune sortie partielle n'est applicable.

## ADR-014 — Impression native avant moteur PDF dédié

- **Statut** : accepté.
- **Date** : 2026-08-27.
- **Contexte** : les notes longues et illustrées doivent pouvoir devenir un
  document papier ou PDF lisible, sans exposer les images privées ni ajouter un
  service de rendu complexe.
- **Décision** : construire dans le navigateur une vue papier non interactive
  de la version enregistrée, attendre et décoder toutes ses images, puis appeler
  `window.print()`. Le navigateur ou le système reste responsable de la
  destination, du format final et du fichier PDF éventuel.
- **Raison** : conserver texte et liens sélectionnables, réutiliser le rendu
  Markdown, fonctionner dans Safari/PWA et éviter une dépendance de capture ou
  un traitement serveur de contenu privé.
- **Conséquences** : la pagination exacte varie selon le moteur ; les images
  manquantes bloquent l'action, la préparation est bornée et annulable, et une
  copie exportée sort du contrôle de Capsule. Un moteur PDF déterministe ne sera
  envisagé que pour un besoin de gabarit strict ou de valeur probatoire.

## Modèle ADR

```markdown
## ADR-XXX — Titre

- **Statut** : proposé | accepté | remplacé.
- **Date** : YYYY-MM-DD.
- **Contexte** :
- **Décision** :
- **Raison** :
- **Conséquences** :
```
