# Capsule — Recherche et édition confortables

## Conception validée

Conception et maquettes validées par l'utilisateur le 10 octobre 2026.
L'implémentation avec PR et Quality gate est autorisée. Le lot doit permettre de retrouver
une note ancienne depuis la palette, lire avec moins de commandes permanentes
et écrire sur mobile avec un état de sauvegarde clair. La version publique
reste 1.0.1, build 4397f81 ; ce document décrit une évolution proposée.

État du lot : **DONE**, version 1.1.0 livrée par PR #28, fusion 3ab6a20.
Aucune migration. Les choix ci-dessous
définissent la conception acceptée, pas des invariants déjà livrés.

## Périmètre et frontières

| Inclus dans le lot | Préservé | Reporté |
|---|---|---|
| Palette cherchant dans toutes les notes chargées | Identité Capsule, accent violet, bordures et ombres franches | Brouillons persistants et sauvegarde automatique |
| Résultats de notes distincts des commandes | Cartes, Liste, Kanban et navigation actuelle | Nouvelle navigation mobile, corbeille et archivage |
| Actions secondaires regroupées | Tous les traitements existants, images et partage | Modèles, multi-tags, import/export et historique |
| Éditeur mobile plus ample | Défilement liste UX-003 validé | Schéma, RLS, Storage, Vault et contrats API |
| État de saisie/sauvegarde et protections de sortie | Sauvegarde manuelle et application IA explicite | Nouvelle dépendance, service ou télémétrie |

Le lot ne nécessite pas de migration Supabase. Les contenus privés, images,
clés et sorties API restent hors cache PWA et hors stockage navigateur
persistant. Les maquettes emploient uniquement des textes fictifs, sans API.

## Référence actuelle

- Checkout : C:\Users\Pc\Downloads\Claude Code Webjourney Tuto\webjourney.
- Branche à conserver : codex/ux-003-session-close.
- HEAD initial : 2ef1936fa87429905c743cb713a1b01336a28c46.
- Trois commits documentaires non publiés conservés.
- Recherche du filtre principal : titre et corps normalisés, toutes les notes
  chargées, puis filtre d'un tag et tri chronologique.
- Palette : notes.slice(0,8), en plus des commandes.
- Lecture liste mobile : neuf commandes permanentes en pied.
- Édition : confirmations de sortie internes, sauvegarde manuelle, images
  locales en attente ; pas de brouillon récupérable après fermeture.

Sources : AGENTS.md, MEMORY, BACKLOG, ARCHITECTURE, DECISIONS, DEVBOOK,
MISTAKES, TESTING et code actuel. Les captures synthétiques du 10 octobre
montrent desktop 1416×975 et mobile 390×844. Elles ne constituent pas une
recette physique Safari/PWA, notamment avec le clavier virtuel.

## Conception recommandée

### Recherche globale

La palette garde huit notes récentes et les commandes lorsque la requête est
vide. Dès qu'une requête est saisie, elle cherche dans **toutes les notes du
compte chargées en mémoire**, indépendamment du filtre de tag de la vue.
Elle ne devient pas un moteur serveur, un index persistant ou une recherche
dans d'autres comptes.

- Normalisation identique au filtre : casse et accents ignorés.
- Conserver la recherche par sous-chaîne pour ce premier lot ; pas de langage
  de requête, de recherche floue ou de nouvelle règle AND/OR.
- Champs de note : titre, texte utile et noms des tags.
- Exclure les références et UUID d'images de l'index et des extraits.
- Classer d'abord les correspondances du titre, puis les autres ; conserver
  le tri récent dans chaque groupe.
- Montrer le titre, le tag pertinent et un extrait textuel de 160 caractères
  maximum autour de la correspondance. Rendu texte échappé, jamais HTML brut.
- Séparer visuellement « Notes » et « Actions ». Annoncer le nombre de notes
  trouvées ; ne pas compter les commandes comme des notes.
- Afficher un premier groupe de 20 notes avec « Afficher les autres résultats »
  si nécessaire. Aucun plafond caché de recherche : toutes les notes restent
  accessibles.
- État vide : « Aucune note trouvée » et action pour effacer la recherche ;
  conserver les commandes pertinentes.

Ouverture recommandée depuis la palette : dans Liste, sélectionner le panneau
détail existant sans changer les filtres ; une note hors filtre reste consultable
dans le lecteur. Dans Cartes et Kanban, utiliser la lecture modale existante
sans forcer un passage en Cartes. Le retour conserve la vue précédente, ses
filtres et la position de liste. Rouvrir la recherche restitue la requête et
les résultats conservés en mémoire. La navigation depuis les lignes de la
liste conserve son fonctionnement actuel.

Au clavier : Ctrl/Cmd+K, saisie, flèches, Entrée, Échap ; focus confiné dans
la palette, puis rendu à son déclencheur. Les actions et résultats doivent
rester accessibles par leurs noms complets.

### Lecture et actions

Garder deux commandes en pied : **Modifier** et **Plus**. Les tags de la note
et la date de création restent lisibles. Ne pas présenter cette date comme
une dernière modification, inexistante dans le schéma actuel.

Le menu Plus regroupe les fonctions actuelles, sans modifier leurs traitements :

| Groupe | Commandes conservées |
|---|---|
| Organiser | Épingler/Désépingler, ajouter un tag |
| Utiliser | Copier le contenu, dupliquer |
| Diffuser | Partager/révoquer selon l'état, imprimer/PDF |
| Lire | Résumer, taille du texte |
| Action destructive | Supprimer, séparé des autres groupes |

La suppression ouvre la confirmation actuelle ; ouvrir Plus ne supprime rien.
Une opération en cours conserve les règles de blocage actuelles. Le résumé IA,
le partage signé et l'impression gardent leurs contrats de sécurité et erreurs.

Le menu tient dans le viewport ; sur petit écran, une feuille d'actions peut
remplacer le popover. Échap ferme et restitue le focus. La taille du texte reste
une préférence commune, pas une commande répétée sur chaque carte.

### Édition desktop et mobile

Desktop : conserver une édition modale, avec le titre et la sauvegarde dans
un en-tête compact. Les modes Écrire, Double et Aperçu restent disponibles.
Double offre deux colonnes lorsque la largeur le permet.

Mobile : une feuille occupant la surface disponible, avec :

1. en-tête Retour, titre du contexte et bouton Enregistrer/Créer ;
2. état de sauvegarde lisible, puis champ titre ;
3. barre principale : emphase, titre, listes ; les commandes restantes sous
   Format, avec noms accessibles ;
4. texte sur la plus grande hauteur restante ;
5. ajout d'image et aperçus locaux disponibles ; couleur dans un volet repliable.

La création conserve un titre obligatoire. Les fichiers, collage, dépôt,
compression et modes d'aperçu restent disponibles. Une simplification visuelle
ne doit pas retirer une fonction ou rendre ses actions dépendantes du survol.

Clavier mobile : maintenir l'en-tête et l'action de sauvegarde dans la surface
visible. La navigation principale reste dans le shell, isolée et masquée par
la feuille, puis revient à la fermeture. Prévoir la zone sûre et le viewport
dynamique ; utiliser VisualViewport seulement si la recette réelle l'exige,
avec repli et nettoyage des événements.

Les maquettes proposent un état « clavier ouvert » pour comparer les hauteurs.
C'est une simulation de conception, pas une preuve iOS.

### Sauvegarde et sorties

| État | Message | Action et conservation |
|---|---|---|
| Lecture enregistrée / édition sans changement | Enregistré / Aucun changement | Bouton désactivé si aucune modification |
| Titre, contenu, couleur ou image en attente modifiés | Modifications non enregistrées | Sauvegarde explicite ; sortie protégée |
| Préparation d'image | Préparation des images… | Gardes actuelles et progression conservées |
| Enregistrement | Enregistrement… | Pas de double envoi ; sortie bloquée comme actuellement |
| Succès confirmé du flux complet | Enregistré | Actualiser la référence de comparaison |
| Erreur | Enregistrement impossible — Réessayer | Conserver texte, couleur et images en attente |

Comparer au snapshot capturé à l'entrée en édition, pas à une note rafraîchie
en arrière-plan. Ne jamais annoncer « Enregistré » dès le clic ou avant la fin
du flux texte/images. Ne pas attribuer à la note ouverte le succès d'une autre
opération.

Pour les sorties internes, proposer Continuer l'édition ou Quitter sans
enregistrer ; pas de sauvegarde automatique. Ne pas perdre une saisie par
changement de vue, sélection d'une autre note, palette ou fermeture.

Pour fermeture/rechargement de l'onglet, installer beforeunload seulement
pendant une saisie modifiée ; le retirer quand la saisie est enregistrée ou
abandonnée. Le navigateur choisit le texte et peut ne pas déclencher ce signal,
notamment sur mobile. Cette garde ne promet donc pas la récupération après
fermeture forcée. Aucun contournement par stockage local n'est prévu.

Une proposition IA reste distincte : Appliquer change le brouillon, Sauver
reste une seconde action. Annuler une image en attente n'appelle pas Storage.

## Conservation du défilement UX-003

Les règles de hauteur validées constituent une contrainte d'acceptation :

- shell en 100dvh avec repli 100vh ;
- aucun minimum 100vh contradictoire ;
- panneau liste mobile flexible, flex:1 ;
- min-height:0 sur la chaîne de conteneurs ;
- défilement dans panel-left-scroll, distinct du corps de note.

Éviter de modifier ces règles pour installer la nouvelle feuille d'édition.
Le conteneur de liste ne doit pas être démonté et recréé à chaque ouverture
de palette, menu ou éditeur. Préserver ancre/position et filtres au retour.
La dernière note d'un corpus de 60 notes reste accessible ; la navigation basse
ne se déplace pas avec la liste.

## Découpage d'implémentation proposé

| Incrément | Périmètre minimal | Preuve de sortie |
|---|---|---|
| Recherche | Fonction pure ciblée dans lib, CommandPalette, branchements de app/page | Une note hors des huit récentes est retrouvée ; aucune référence privée dans l'extrait |
| Lecture | Extraction ciblée d'un menu d'actions, branchements Carte/Liste/Kanban | Toutes les commandes actuelles accessibles ; vue et position conservées |
| Saisie | Fonction pure pour comparer la saisie, états et gardes dans app/page | Erreur sans perte, succès exact, annulation IA indépendante |
| Éditeur | NoteContentEditor, feuille d'édition et CSS ciblé | Clavier et petites hauteurs utilisables ; fonctions image/Markdown conservées |
| Recette | Données synthétiques, tests pertinents et documentation | Non-régression UX-003, validations et preuves de release |

Lire les guides pertinents de node_modules/next/dist/docs avant le code.
Ne pas réécrire globalement app/page.js. Préférer de petites extractions qui
permettent de garder les opérations existantes.

Après validation de la conception, créer codex/search-editor-comfort depuis
le HEAD local conservé, en emportant les trois commits et les documents de
cette tâche. Ne pas faire de reset, rebase ou bascule vers main pour démarrer.

## Critères d'acceptation

| ID | Scénario | Attendu |
|---|---|---|
| R1 | Requête vide | Huit notes récentes et commandes clairement séparées |
| R2 | Note plus ancienne que les huit récentes | Retrouvée par titre, corps ou tag |
| R3 | Accents et casse | Résultats cohérents avec le filtre actuel |
| R4 | Plus de 20 résultats | Suite accessible, sans exclusion du corpus |
| R5 | Image privée dans Markdown | Aucun UUID, chemin ou URL signée dans l'extrait |
| R6 | Ouvrir/fermer depuis Liste ou Kanban | Vue, filtres et position restaurés |
| L1 | Pied de lecture mobile | Modifier et Plus ; toutes les autres commandes disponibles |
| L2 | Supprimer depuis Plus | Confirmation existante avant toute suppression |
| E1 | Modifier texte, titre, couleur ou image | État non enregistré exact |
| E2 | Échec réseau ou upload | Saisie et images conservées ; Réessayer disponible |
| E3 | Save en cours puis succès | Un seul envoi ; Enregistré après réussite complète |
| E4 | Appliquer une sortie IA | Brouillon modifié, aucun enregistrement implicite |
| E5 | Quitter une saisie modifiée | Confirmation interne et garde navigateur selon ses capacités |
| E6 | Clavier mobile ouvert | Titre, champ de saisie et sauvegarde atteignables |
| S1 | 60 notes, dernière note, recherche, retour | Défilement validé conservé, sans scroll horizontal |
| A1 | Clavier, lecteur d'écran, thèmes | Focus visible/confiné/restauré et libellés lisibles |

## Validation et livraison

Conception : examiner desktop et mobile, recherche d'une note ancienne,
menu Plus, double aperçu, texte long, état erreur et clavier simulé.
Les contrôles du prototype vérifient uniquement ces maquettes.

Implémentation : tests utiles sur classement/recherche/masquage, comparaison
de saisie et restauration après erreur ; éviter les tests qui recopient le JSX.
Recette UI synthétique Chromium/WebKit : 320×568, 390×844, 430×932,
667×375, 1024×768 et 1416×900, clair/sombre, Tab/Échap, palette et 60 notes.
Compléter par une recette utilisateur Safari/PWA sur appareil identifié,
avec clavier ouvert. Ne pas présenter une simulation comme cette recette.

Commandes requises avant PR :

    npm run validate
    npm run security:audit -- --audit-level=high
    npm run test:ui:scroll

La recette scroll utilise le runtime Playwright externe et la cible isolée
définie dans TESTING.md ; aucune production CRUD n'est utilisée.

Synchroniser BACKLOG, DEVBOOK, MEMORY, TESTING et documents concernés avec
les changements réellement livrés. Enregistrer dans MISTAKES uniquement
un incident réel et sa prévention.

PR vers main, Quality gate strict, GitHub fusionnable, puis contrôle Vercel
et smoke public. Aucun bypass du gate, ni nouveau déploiement dans la phase
de conception. SEC-001 reste prioritaire : l'exception expire
2026-10-24T23:59:59Z et toute nouvelle livraison doit repasser l'audit actuel.

## Choix validés le 10 octobre 2026

1. Garder la navigation mobile actuelle pour ce lot.
2. Regrouper les actions sous Plus, avec Modifier comme action permanente.
3. Utiliser une feuille mobile ample et garder la sauvegarde manuelle.
4. Chercher dans tout le corpus chargé, avec résultats distincts des commandes.
5. Reporter récupération des brouillons et fonctionnalités de données.

Les maquettes de la conversation illustrent ces choix. Les interactions y
sont locales et fictives ; elles ne constituent pas une nouvelle version
de Capsule.

## Résultats du candidat

Livraison confirmée le 10 octobre 2026 : PR #28, deux Quality gate verts
au SHA d5b621c, GitHub clean, fusion 3ab6a20. Production Vercel en succès,
identité publique 1.1.0 / 3ab6a20 et smoke 21/21. La recette éditeur sur
les assets live passe 12/12 avec session et mutations Supabase simulées.

- Lint, 126 tests et build de production verts.
- Audit production à zéro ; seule chaîne de développement SEC-001 annoncée
  par le contrôleur, aux versions et à l'échéance inchangées.
- Défilement UX-003 : 12/12 dans Chromium/WebKit.
- Recette du lot sur build optimisé : 12/12, avec reprise après erreur,
  envoi unique, viewport tactile réduit, trois vues et image non envoyée.
- Contrôle visuel desktop/mobile et ouverture de la palette depuis
  Cartes/Kanban ; filtre de liste conservé pour une note hors filtre.
- La recette physique Safari/PWA reste distincte et non effectuée.
