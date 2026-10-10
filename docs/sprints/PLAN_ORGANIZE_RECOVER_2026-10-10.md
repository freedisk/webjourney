# Capsule — Organiser et retrouver sans perdre

## Statut et autorisation

- Date de conception : 2026-10-10, America/Miquelon.
- Lot choisi par l'utilisateur : « Organiser et retrouver sans perdre ».
- Identité Capsule et défilement validé à conserver.
- Rétention choisie explicitement : conserver jusqu'à suppression manuelle.
- Phase : **ACCEPTED — livré en 1.2.0**, PR #32, 400caac.
- L’utilisateur a validé le plan et les maquettes, puis autorisé le code,
  la PR et le Quality gate. Il autorise explicitement la production Supabase,
  sans projet de test ni stack locale. Préflight : sauvegarde de schéma et
  tests SQL dans une transaction annulée, puis contrôle après migration.
- Référence livrée : Capsule 1.1.1, build public final 6d3b291, PR #30/#31.
  Correctif de zoom confirmé sur mobile par l'utilisateur ; appareil et OS
  non précisés, sans recette complète Safari/PWA extrapolée.
- Continuité locale : codex/mobile-search-close ; 4be78dc et les trois
  commits documentaires d'origine conservés. Les mises à jour documentaires
  de validation mobile déjà présentes sont préservées.

Le plan et les maquettes sont validés. Le sélecteur de périmètre est intégré
au compteur près du logo pour éviter une barre supplémentaire : la recette
confirme que les hauteurs de liste UX-003 restent identiques, y compris les
47 px disponibles à 667 × 375. Les exemples de maquettes restent fictifs.
SEC-001 reste P1 avec échéance 2026-10-24T23:59:59Z ; cette conception ne
change pas l'exception de lint ni la disponibilité du correctif amont.

## Résultat attendu

Garder les notes utiles dans les vues courantes, retrouver les notes archivées
et récupérer une suppression accidentelle avec les images encore présentes.
Les commandes doivent distinguer clairement une mise à la corbeille réversible
d'une suppression définitive.

| Inclus | Conservé | Évolutions ultérieures |
|---|---|---|
| Corbeille, restauration et suppression manuelle d'une note | Identité, accent violet, bordures et ombres franches | Purge automatique et vidage collectif |
| Archivage et désarchivage | Cartes, Liste, Kanban ; navigation mobile actuelle | Sélection multiple et opérations en masse |
| Sélecteur Notes / Archives / Corbeille et compteurs | Défilement interne UX-003 ; recherche tactile >=16 px | Dossiers, multi-filtres, modèles de notes |
| Annuler archive/corbeille et retour à la note restaurée | Édition manuelle, Markdown, images privées, IA explicite | Versions historiques, autosave et brouillons persistants |
| Recherche avec périmètre explicite | Isolation des comptes, RLS, partage contrôlé et cache statique | Export/import JSON et recherche serveur |

Les maquettes contiennent uniquement des notes fictives. Aucune donnée
Supabase, image privée, session réelle ou requête réseau n'y est utilisée.
Elles se concentrent sur les parcours du lot ; les formulaires illustratifs
ne constituent pas une proposition de refonte de l'éditeur UX-004.

## Parcours et règles produit

### Notes, archives et corbeille

- **Notes** : notes actives ; périmètre ouvert par défaut au chargement.
- **Archives** : notes rangées ; lecture et édition conservées. Le bouton
  Désarchiver les remet dans Notes, en gardant leurs tags, images, épingle
  et colonne/ordre Kanban.
- **Corbeille** : notes retirées de Notes/Archives, conservées sans échéance
  automatique. Lecture et consultation des images par le propriétaire ;
  restauration et suppression définitive seulement. Édition, IA,
  duplication et nouveau partage sont indisponibles dans cet état.
- Une note archivée puis mise à la corbeille revient dans **Archives** à la
  restauration ; une note active revient dans **Notes**. Le message de
  succès nomme ce périmètre.
- Les compteurs donnent le total de chaque périmètre avant les filtres ;
  un résultat filtré indique séparément « x résultat(s) ».
- Une nouvelle note est créée dans Notes. Créée depuis Archives/Corbeille,
  elle ouvre l'éditeur habituel puis propose de la retrouver dans Notes.

### Archiver et annuler

1. Ouvrir Plus, puis Archiver.
2. Après réussite confirmée, la note quitte le périmètre actif.
3. Message « Note archivée », avec Annuler et accès aux Archives.
4. Annuler agit uniquement sur le cycle de vie de cette note, sans réécrire
   un ancien contenu ou réactiver un partage.
5. Si la note a changé sur un autre appareil, relire son état et proposer
   une action explicite ; une annulation obsolète ne doit pas l'écraser.

L'archivage conserve un partage déjà actif : ranger une note ne la rend pas
privée. Un repère « Lien partagé actif » reste visible dans Archives, et la
révocation demeure accessible. Ce choix sera explicitement montré au passage
par Plus avant la première utilisation de l'archivage d'une note partagée.

### Mettre à la corbeille

1. Depuis Plus : « Mettre à la corbeille » remplace « Supprimer… ».
2. Déplacement réversible après confirmation brève si la note est partagée :
   « Le lien partagé sera désactivé. Tu pourras restaurer cette note. »
   Pour une note privée, déplacement direct avec Annuler.
3. Révoquer le token dans la même transition transactionnelle.
4. Conserver corps, tags, couleurs, épingle, Kanban, métadonnées d'images
   et objets Storage. Aucune suppression de fichier à cette étape.
5. Message « Note déplacée dans la corbeille », bouton Annuler ; la corbeille
   reste accessible après disparition de ce message.

### Restaurer

1. Depuis la corbeille, ouvrir une note en lecture.
2. Bouton principal Restaurer ; Plus contient la suppression définitive.
3. Remettre la note dans Notes ou Archives selon son état d'origine.
4. Message « Note restaurée dans Notes/Archives », bouton Voir la note.
5. Maintenir le token révoqué. Une publication ultérieure doit être explicite
   et utiliser un nouveau token ; aucun ancien lien n'est réactivé.

Les mots Restaurer et Annuler ne promettent pas de récupérer les suppressions
définitives effectuées avant ce lot. Seules les futures mises à la corbeille
seront récupérables.

### Supprimer définitivement

- Action disponible pour une seule note dans Corbeille > Plus.
- Confirmation dédiée montrant le titre, le nombre d'images et la phrase
  « Cette action est irréversible. » Deux boutons explicites :
  « Conserver la note » et « Supprimer définitivement ».
- Aucun timer de rétention, tâche planifiée, vidage collectif ou geste
  tactile seul ne déclenche cette opération.
- Après confirmation, l'état passe à une suppression en cours, puis fichiers
  et ligne sont retirés. Si une étape échoue, afficher « Suppression à
  terminer » et Réessayer. Une suppression commencée n'est plus présentée
  comme une note intégralement restaurable.
- L'échec ne doit jamais annoncer « supprimée » ni retirer silencieusement
  la dernière possibilité de terminer le nettoyage.

## UX/UI desktop et mobile

### Desktop

Ajouter un sélecteur de périmètre compact dans la barre de travail, près des
vues, avec Notes / Archives / Corbeille et compteurs. Conserver le shell :
liste défilable à gauche, lecture à droite. Les archives gardent Modifier/Plus ;
la corbeille utilise Restaurer/Plus et un repère de lecture.

Le changement de périmètre conserve la vue Cartes/Liste/Kanban et les filtres
de tag/texte. Chaque périmètre retrouve son scroll et sa sélection si la note
existe encore. Le retrait de la note sélectionnée affiche un état vide utile ;
il ne fait pas sauter la lecture sur une autre note sans action utilisateur.

### Mobile

Un bouton « Notes (x) » au-dessus de la recherche ouvre une feuille de choix
du périmètre. Il se ferme au choix, à Retour/Échap ou avec Fermer. Il ne crée
pas de nouveaux onglets dans la navigation Cartes/Liste/Kanban/Chercher/Nouveau.

Liste, filtres et compteurs restent dans leur chaîne de hauteur actuelle ;
le scroll interne UX-003 est conservé. Le retour d'une note retrouve la
position de la liste dans le périmètre concerné. Champs éditables >=16 px,
cibles tactiles >=44 px, zones sûres, zoom par pincement disponible.

La note de corbeille a le même confort de lecture que la note courante :
contenu et image consultables, pied Restaurer/Plus. La confirmation de
suppression définitive a un bouton Conserver visible et un titre précis.

### Recherche

- Filtre local : périmètre courant seulement ; titre et texte comme aujourd'hui.
- Palette globale : recherche dans Notes par défaut, indépendamment du filtre
  local ; sélecteur Notes / Notes et archives / Corbeille.
- Notes et archives : badge Archives sur les correspondances rangées ;
  ouvrir un résultat ne désarchive pas la note.
- Corbeille : recherche explicite et lecture restreinte ; pas de résultat
  supprimé dans les huit récentes ou la recherche ordinaire.
- Conserver classement, normalisation, pagination et extraits textuels
  sans références/UUID d'images de UX-004.
- Revenir d'un résultat conserve vue, périmètre, filtre local et scroll de
  départ. La lecture d'une note hors périmètre est un contexte temporaire.

États à couvrir : aucun résultat, périmètre vide, restauration réussie,
transition en cours, erreur réessayable et note modifiée ailleurs. Les états
vides proposent Notes/Archives ou une recherche réinitialisée ; pas d'animation
qui déplace la liste sous le doigt.

## Conception de données proposée

Le schéma actuel ne possède pas d'archive ou de suppression logique.
supprimerNote retire les objets Storage avant DELETE notes ; les grants/RLS
actuels autorisent le DELETE du propriétaire. Un simple filtre client ne
pourrait donc pas fournir une corbeille sûre.

La future migration ajouterait des champs de cycle de vie à notes :

| Champ proposé | Fonction |
|---|---|
| archived_at, nullable | État/date d'archivage, conservé lors d'une mise à la corbeille |
| deleted_at, nullable | Mise à la corbeille sans effacement |
| purge_started_at, nullable | Suppression définitive engagée ; reprise du nettoyage, restauration bloquée |

État dérivé : purge engagée > corbeille > archive > active. Les notes existantes
gardent des valeurs nulles et deviennent actives, sans transfert de contenu.
Des contraintes empêchent les combinaisons incohérentes ; index ciblés selon
les requêtes réellement retenues et mesurées dans l'environnement de test.

Les transitions passent par des RPC transactionnelles identifiées en anglais :
verrou de ligne, propriété auth.uid(), contrôle de l'état attendu, résultat
idempotent ou conflit explicite. EXECUTE révoqué de PUBLIC/anon, search_path
fixé et références qualifiées. Champs de cycle de vie non modifiables par
un UPDATE arbitraire du navigateur. Les mutations ordinaires continuent
à mettre à jour uniquement les champs nécessaires à l'édition.

L'ouverture de la purge et sa finalisation seront réservées au serveur
authentifié, avec contrôle de propriétaire avant tout accès admin. Le client
ne choisit jamais un chemin Storage arbitraire à supprimer.

### Compatibilité et images

La migration et le code doivent empêcher le vieux client 1.1.1 de retirer les
images puis de lancer un DELETE notes. Réviser ensemble grants et policies de
notes, note_images et storage.objects :

- DELETE direct notes depuis un navigateur retiré ; purge uniquement par le
  parcours authentifié contrôlé, après déplacement à la corbeille.
- DELETE des métadonnées d'images attachées retiré au navigateur ; suppression
  explicite d'image à l'édition adaptée au parcours serveur autorisé.
- DELETE Storage navigateur interdit pour un objet attaché à une note conservée.
  Une compensation d'upload provisoire sans métadonnée peut rester autorisée
  si ownership et état sont vérifiés. Ce cas doit être testé, pas supposé.
- INSERT d'image et mutation de tags/contenu interdits pour une note à la
  corbeille ou en cours de purge ; consultation du propriétaire conservée
  en corbeille.
- En purge : lister les objets depuis les métadonnées fiables, contrôler
  préfixe user/note, supprimer par API Storage puis finaliser la ligne/cascade.
  Les compensations, images retirées de l'éditeur et duplication nécessitent
  des tests de non-régression après ce changement de droits.

Ces points sont des obligations de conception, pas une migration écrite ou
validée dans cette phase. Le détail des grants/RPC et l'ordre de déploiement
doivent être prouvés avant livraison. L’utilisateur autorise la cible production
sans stack locale/isolée : transaction SQL annulée et fixtures HTTP créées
uniquement pour la recette, avec nettoyage vérifié.

### RLS et partage

- Le propriétaire consulte ses notes actives, archivées et à la corbeille.
  Autres comptes et anon ne lisent pas ses archives privées ou sa corbeille.
- La policy publique de note partageable doit imposer un token non nul,
  deleted_at nul et purge_started_at nul. Les pages, métadonnées Open Graph
  et signatures d'images appliquent aussi ce contrat.
- Trash/restore révoquent le token atomiquement, y compris si la Data API est
  appelée directement. Restaurer reste privé ; archiver conserve le partage.
- Une URL d'image signée déjà émise peut rester utilisable jusqu'à son
  expiration existante de dix minutes. Ne pas promettre sa révocation
  immédiate ; refuser toute nouvelle signature pour un lien révoqué.
- Les RPC de purge serveur, droits RLS et routes ne changent pas les frontières
  Vault/IA ; lib/supabase-admin.js reste serveur.
- Aucun contenu de note, état de corbeille, image ou token dans localStorage,
  le cache PWA, les logs ou un index persistant de recherche.

## Découpage de l'implémentation future

| Étape | Livrable vérifiable | Sortie |
|---|---|---|
| A — Conception | Ce plan, maquettes et rétention manuelle | Parcours/maquettes examinés par l'utilisateur |
| B — Données et corbeille | Migration forward-only, RPC, protection anciens clients, endpoints images/purge, corbeille/restauration | Tests SQL, propriété entre deux comptes, ancienne version sans perte d'images |
| C — Archivage et navigation | Archive/désarchive, périmètres et compteurs, recherche, Annuler | Trois vues, filtres/scroll et états vides cohérents |
| D — Gate et livraison | Docs synchronisées, validate/audit, PR et Quality gate, préflight SQL, Vercel/smoke | Schéma et code compatibles, SHA public vérifié, recette physique distincte |

L'ordre B/C est un ordre de travail, pas un déploiement partiel automatique.
La première production sera une livraison coordonnée dont les étapes
intermédiaires restent sûres pour les clients déjà ouverts. Pas de bascule
vers main, reset/rebase ou worktree qui abandonne les changements de reprise.
Créer la branche codex/ appropriée depuis l'état local préservé à l'entrée
de l'implémentation ; les seuls extractions/refactors envisagés sont ciblés.

## Critères d'acceptation

1. Déplacer une note active ou archivée ne supprime aucun fichier ; reload
   puis restauration rendent corps, tags, couleur, épingle et Kanban intacts.
2. Une note archivée va dans Archives et revient dans Notes au désarchivage.
3. Annuler agit sur le bon ID ; double clic, erreur et conflit interappareil
   ne dupliquent pas l'action et n'effacent pas des modifications récentes.
4. Déplacer une note partagée révoque l'ancien lien ; après restauration,
   il reste refusé et seul un nouveau partage explicite peut publier la note.
5. Aucune lecture/mutation/signature intercompte ou anonyme sur la corbeille.
6. Un ancien client ou DELETE direct Data API ne détruit ni note conservée
   ni image attachée ; l'échec reste lisible, sans succès trompeur.
7. Une purge demande une confirmation explicite avec titre et compte d'images ;
   erreurs partielles réessayables, état engagé non restaurable, aucun objet
   orphelin à la fin. La purge automatique est absente.
8. Cartes/Liste/Kanban retrouvent périmètre, filtres, sélection et scroll ;
   dernière note accessible, portrait/paysage, 320 à 1416 px.
9. Recherche ordinaire sans corbeille ; archives seulement au périmètre
   explicite ; badges et retour sans changement caché d'état.
10. Focus, Échap/Retour, clavier, cibles 44 px et champs >=16 px restent
    corrects ; zoom utilisateur permis ; deux thèmes sans débordement.
11. Upload, édition d'image, compensation, duplication, partage, PDF et IA
    active/archivée restent fonctionnels. Aucune note privée mise en cache.

## Validation et release à prévoir

- Tests unitaires : états/transitions, filtrage/recherche, compteurs, restauration
  de l'état d'origine et conflit d'annulation.
- Cible production autorisée : deux comptes fictifs, client anon, note privée/partagée,
  image attachée/provisoire, grants/RPC/RLS et triggers ; QA-001 ciblé sur ces
  parcours. Aucun compte, contenu ou mutation de production pour la recette.
- Pannes : upload entre deux transitions, échec Storage avant/pendant purge,
  échec SQL après retrait de fichiers, ancien client 1.1.1, appels directs
  et double soumission. Pas de validation RLS par mock seulement.
- Recettes Chromium/WebKit : six tailles existantes, trois vues, 60 notes,
  suppression/restauration/archive/recherche/retour, image et défilement réel.
- Safari/PWA identifié : clavier, rotation, retour, archive/corbeille,
  restauration et annulation ; distinguer de la simulation WebKit.
- npm run validate et npm run security:audit -- --audit-level=high requis.
  Aucun élargissement ou report implicite de l'exception SEC-001.
- Avant toute application SQL : comparaison de l'état lié, sauvegarde du
  schéma et supabase db push --dry-run --linked. SQL versionné, préflight
  tracé ; aucune commande reset --linked.
- PR main à jour, Quality gate vert et GitHub fusionnable ; déroulement
  coordonné code/schéma, vérification Vercel et smoke public du SHA final.
  Les pages anonymes partagées et le périmètre de cache restent contrôlés.

Un simple rollback vers le client 1.1.1 ne suffirait pas après retrait des
droits de suppression navigateur. Prévoir un build de repli compatible avec
le nouveau schéma et garder les données logiques, sans migration inverse
destructive. Le dossier de livraison devra prouver cette compatibilité.

## Références

- Sources locales : AGENTS.md, MEMORY, BACKLOG (DATA-001, QA-001, SEC-001),
  ARCHITECTURE, DECISIONS, DEVBOOK, MISTAKES, TESTING ; baseline et migration
  images ; app/page.js supprimerNote.
- Maquettes : capsule-organize-recover-desktop.html (Notes et archives,
  Corbeille et restauration) et capsule-organize-recover-mobile.html (Liste
  et périmètre, Corbeille et restauration, Suppression définitive).
- [Supabase — suppression des objets](https://supabase.com/docs/guides/storage/management/delete-objects) :
  retrait par API Storage, jamais DELETE SQL dans storage.objects.
- [Supabase — RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Supabase — accès Storage](https://supabase.com/docs/guides/storage/security/access-control).

## Vérification de conception

Maquettes finales vérifiées : **16/16 scénarios** Chromium/WebKit, desktop
et mobile, largeurs 320/390/736/1024 px, clair et sombre. Deux variantes
desktop et trois mobile inspectées ; retour à la liste et scroll, archive/
annulation, corbeille/annulation, restauration vers Notes ou Archives, image
conservée, partage non réactivé, confirmation puis suppression fictive et
recherche par périmètre. Champs >=16 px et absence de débordement contrôlés.

L'inspection visuelle a conduit à réserver la place des icônes et à conserver
une lecture successive sur le desktop étroit, pour éviter les déplacements
de layout ou les commandes masquées. Les contrôles sont locaux à la maquette.

La recette de conception valide ces interactions et leur disposition,
pas l'implémentation de Capsule, une RLS réelle ou une migration Supabase.
La phase de conception était sans changement applicatif ni SQL. Le plan et
les maquettes ont ensuite été validés explicitement, puis implémentés.
Livraison 1.2.0 par PR #32, 400caac, avec migration et gate : 137 tests, UI
locale 32/32, préflight SQL annulé 50/50, audits post-migration 41/41, recette
HTTP réelle 21/21 et zéro résidu synthétique, smoke public 23/23.
La recette physique avec clavier reste distincte.
