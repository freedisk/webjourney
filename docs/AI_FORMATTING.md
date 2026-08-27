# Mise en forme intelligente — AI-002

## Usage

Dans **Nouvelle note** ou après **Modifier**, saisir du texte puis utiliser le
bouton **IA** de la barre Markdown. Capsule ouvre un comparatif :

- **Texte actuel** reste le brouillon de référence ;
- **Proposition IA** montre le Markdown retourné après les contrôles serveur ;
- **Aperçu** compare les rendus, **Markdown** compare les sources ;
- **Appliquer à l'éditeur** remplace seulement le brouillon actif ;
- **Fermer sans appliquer** et l'annulation pendant la génération ne changent
  jamais le contenu.

Après application, **Sauver** ou **Créer** reste obligatoire. AI-002 ne réalise
aucune écriture Supabase et ne conserve aucune proposition sur le serveur.

Pour une note longue, le dialogue annonce un traitement par sections, affiche
le temps écoulé et conserve le bouton d'annulation. Une attente client ne peut
pas rester infinie : elle s'arrête automatiquement après 1 min 40 avec une
erreur réessayable, sans modifier le brouillon.

## Contrat éditorial

La consigne serveur demande à Anthropic de conserver la langue, les faits, les
nombres, les liens, les citations, les tâches et le code. Le modèle peut
uniquement réorganiser les paragraphes et ajouter avec parcimonie titres,
listes, citations ou emphases Markdown.

AI-002 n'est ni un résumé, ni une traduction, ni une réécriture créative. Le
comparatif demeure le contrôle humain de référence : aucune vérification
automatique ne peut garantir à elle seule l'équivalence sémantique d'un texte.

## Références et faits protégés

Avant l'appel Anthropic, `lib/ai-formatting.js` remplace chaque référence
complète `![alt](capsule-image/<uuid>)` — ainsi que tout chemin privé brut — par
un marqueur aléatoire opaque. L'identifiant et la légende de l'image ne quittent
donc pas le serveur Capsule. Les nombres, URL et cases à cocher reçoivent aussi
des marqueurs opaques : ils sont restaurés caractère pour caractère après la
génération, ce qui empêche le modèle de modifier silencieusement une date, une
mesure, une adresse, un lien ou l'état d'une tâche.

La réponse est acceptée seulement si :

1. elle se termine normalement et n'est pas tronquée ;
2. chaque marqueur attendu est présent exactement une fois ;
3. les marqueurs restent dans le même ordre ;
4. aucun marqueur inconnu ni chemin `capsule-image/` n'est introduit ;
5. nombres, URL et tâches reviennent dans le même ordre et sans ajout ;
6. la sortie restaurée reste sous 30 000 caractères et sous une expansion
   raisonnable par rapport à la source.

Tout écart rejette la proposition entière. Le brouillon source reste intact.

## Architecture

`POST /api/ai/format` réutilise les invariants d'AI-001 :

- Bearer Supabase obligatoire ;
- clé de session via l'en-tête privé ou clé synchronisée lue dans Vault ;
- modèle explicitement validé ;
- contenu limité à 20 000 caractères ;
- quota atomique partagé de 10 actions IA par minute et utilisateur ;
- appel `/v1/messages` serveur, `no-store`, délais bornés et erreurs
  normalisées ; l'annulation client est transmise au fournisseur ;
- au-delà de 10 000 caractères, découpage aux frontières de phrases en blocs
  de 5 000 caractères maximum, traités avec une concurrence de deux ;
- sur Sonnet/Opus 5, désactivation ciblée du raisonnement adaptatif pour cette
  transformation mécanique ; le modèle choisi par l'utilisateur reste utilisé ;
- une section tronquée ou ayant altéré un fait peut être relancée une seule
  fois ; aucune section partielle n'est renvoyée au navigateur ;
- réponse JSON `no-store` contenant uniquement `formattedContent`, `modelId` et
  l'état public du quota.

Le client conserve un snapshot exact du brouillon. Si celui-ci ne correspond
plus au moment d'appliquer, la proposition est invalidée et doit être relancée.

## Recette

Contrôler au minimum :

1. texte vide et note composée uniquement d'images refusés sans appel externe ;
2. 401 sans session, 428 sans configuration et erreurs fournisseur sûres ;
3. proposition visible en rendu et en Markdown, sans application automatique ;
4. fermeture, `Échap` et annulation réseau sans modification du brouillon ;
5. application dans l'éditeur, puis sauvegarde manuelle distincte ;
6. image privée visible avant/après et référence Markdown strictement identique ;
7. sortie tronquée ou marqueur perdu/dupliqué/réordonné rejeté ;
8. aucun débordement à 390, 1 024 et 1 416 px, focus restitué au déclencheur ;
9. note proche de 20 000 caractères terminée avant le délai client, avec temps
   visible, nombres/liens/tâches restaurés et aucune proposition partielle ;
10. smoke BYOK réel vert et compte synthétique supprimé avec compteurs à zéro.

## Rollback

Le rollback est uniquement applicatif : réassigner le dernier déploiement sain.
AI-002 n'ajoute ni migration, table, objet Storage, réglage, cache privé ou état
persistant à supprimer.
