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

## Contrat éditorial

La consigne serveur demande à Anthropic de conserver la langue, les faits, les
nombres, les liens, les citations, les tâches et le code. Le modèle peut
uniquement réorganiser les paragraphes et ajouter avec parcimonie titres,
listes, citations ou emphases Markdown.

AI-002 n'est ni un résumé, ni une traduction, ni une réécriture créative. Le
comparatif demeure le contrôle humain de référence : aucune vérification
automatique ne peut garantir à elle seule l'équivalence sémantique d'un texte.

## Images privées

Avant l'appel Anthropic, `lib/ai-formatting.js` remplace chaque référence
complète `![alt](capsule-image/<uuid>)` — ainsi que tout chemin privé brut — par
un marqueur aléatoire opaque. L'identifiant et la légende de l'image ne quittent
donc pas le serveur Capsule.

La réponse est acceptée seulement si :

1. elle se termine normalement et n'est pas tronquée ;
2. chaque marqueur attendu est présent exactement une fois ;
3. les marqueurs restent dans le même ordre ;
4. aucun marqueur inconnu ni chemin `capsule-image/` n'est introduit ;
5. la sortie restaurée reste sous 30 000 caractères.

Tout écart rejette la proposition entière. Le brouillon source reste intact.

## Architecture

`POST /api/ai/format` réutilise les invariants d'AI-001 :

- Bearer Supabase obligatoire ;
- clé de session via l'en-tête privé ou clé synchronisée lue dans Vault ;
- modèle explicitement validé ;
- contenu limité à 20 000 caractères ;
- quota atomique partagé de 10 appels externes par minute et utilisateur ;
- appel `/v1/messages` serveur, `no-store`, délai de 90 secondes et erreurs
  normalisées ;
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
9. smoke BYOK réel vert et compte synthétique supprimé avec compteurs à zéro.

## Rollback

Le rollback est uniquement applicatif : réassigner le dernier déploiement sain.
AI-002 n'ajoute ni migration, table, objet Storage, réglage, cache privé ou état
persistant à supprimer.
