# Images dans les notes

## Objectif

Permettre l'ajout d'images dans le contenu d'une note par sélection de fichier,
copier/coller ou glisser-déposer, sans rendre publiques les images des notes
privées et sans envoyer inutilement les photos dans leur poids d'origine.

## Format logique

Le Markdown ne contient jamais une URL signée, car elle expire. Il conserve une
référence stable :

```markdown
![Description](capsule-image/11111111-1111-4111-8111-111111111111)
```

`MarkdownRenderer` résout cet UUID avec les métadonnées `note_images` et la table
d'URL signées chargée en mémoire.

## Sécurité

- Bucket `note-images` privé.
- JPEG, PNG et WebP uniquement.
- Source locale comprise entre 1 octet et 20 Mio.
- Fichier final réellement envoyé compris entre 1 octet et 5 Mio.
- Chemin `<auth.uid()>/<note_id>/<image_id>.<extension>`.
- La policy Storage confirme également que `note_id` appartient à l'utilisateur.
- Aucun UPDATE/UPSERT Storage n'est accordé.
- La clé secrète Supabase n'est utilisée que dans le Server Component de partage.
- Le serveur filtre les métadonnées par `note_id`, UUID référencés et préfixe de
  chemin avant de demander une signature.
- Les URL du propriétaire durent une heure ; celles émises sur une page publique
  durent dix minutes.

La désactivation du partage bloque immédiatement la page publique. Une URL déjà
signée peut toutefois rester utilisable jusqu'à son expiration (dix minutes au
maximum), et une image déjà téléchargée ne peut pas être rappelée.

## Comportement éditeur

1. Le bouton `+ Image` ouvre un sélecteur multiple.
2. Un collage dans le textarea inspecte les éléments `image/*` du presse-papier.
3. Un dépôt de fichiers sur l'éditeur active une zone visuelle dédiée.
4. Chaque source est décodée puis traitée séquentiellement afin de limiter le pic
   mémoire sur iPhone/iPad.
5. Une image supérieure à 2 048 px ou 750 Kio est proposée en WebP. La qualité
   et, si nécessaire, la dimension sont réduites par étapes jusqu'à 5 Mio.
6. Un petit fichier déjà conforme est conservé ; un réencodage plus lourd que
   l'original n'est pas retenu quand aucun redimensionnement n'est requis.
7. Le brouillon affiche dimensions, poids final et économie obtenue.
8. Les fichiers valides obtiennent un UUID et un aperçu `blob:` ; la référence
   Markdown est insérée à la position du curseur.
9. Aucun upload n'a lieu avant `Créer` ou `Sauver`.
10. La progression distingue préparation, envoi, métadonnées et compensation.
11. Une image retirée du brouillon n'est pas envoyée.

Une image qui dépasserait 40 millions de pixels est refusée avant la création du
canvas afin de réduire le risque de saturation mémoire du navigateur.

## Galerie et visionneuse

- Les aperçus de l'éditeur affichent le nom, le poids et l'état de chaque image.
- Un clic ou une activation clavier ouvre une visionneuse plein écran.
- Les flèches, les touches gauche/droite et un geste horizontal naviguent entre
  les images référencées dans l'ordre du Markdown.
- `Échap`, le bouton de fermeture ou le fond ferment la visionneuse.
- Le lien « Ouvrir l'original » cible uniquement un `blob:` local ou une URL
  Supabase signée et temporaire.
- `prefers-reduced-motion` neutralise les transitions non essentielles.

## Recette navigateur obligatoire

À effectuer sur un projet Supabase de test ou sur la production après sauvegarde :

- [ ] créer une note texte sans image ;
- [ ] ajouter un PNG par le sélecteur ;
- [ ] coller une capture PNG dans le textarea ;
- [ ] déposer plusieurs images sur l'éditeur et vérifier l'indicateur de dépôt ;
- [ ] préparer une photo supérieure à 2 048 px et vérifier le WebP, les
  dimensions finales, le poids et le pourcentage économisé ;
- [ ] vérifier les deux aperçus avant sauvegarde ;
- [ ] annuler et confirmer qu'aucun objet Storage n'a été créé ;
- [ ] sauvegarder puis recharger la page ;
- [ ] vérifier cartes, modale et panneau liste en clair et sombre ;
- [ ] vérifier l'affichage mobile ;
- [ ] ouvrir la visionneuse, naviguer au clavier et par geste horizontal, puis
  fermer avec `Échap` ;
- [ ] refuser SVG, HEIC, fichier vide, source > 20 Mio et image > 40 Mpx ;
- [ ] vérifier qu'un fichier impossible à réduire sous 5 Mio est refusé ;
- [ ] retirer une image puis sauvegarder et contrôler Storage ;
- [ ] dupliquer la note et confirmer des chemins/UUID différents ;
- [ ] supprimer l'original et vérifier que la copie conserve ses images ;
- [ ] activer le partage et ouvrir le lien en navigation privée ;
- [ ] désactiver le partage et vérifier l'inaccessibilité de la note ;
- [ ] supprimer la copie et confirmer l'absence d'objets résiduels.

## États d'erreur

- Migration absente : ajout d'image désactivé, texte toujours éditable.
- Upload ou métadonnées en échec : sauvegarde annulée et compensation tentée.
- URL signée impossible : placeholder « Image privée indisponible ».
- Nettoyage après édition en échec : note sauvegardée, avertissement explicite.
- Décodage/encodage impossible ou source > 20 Mio/40 Mpx : fichier refusé avec
  une erreur nominative ; les autres fichiers valides restent préparés.

## Audit d'intégrité en production

Le rapport suivant est strictement read-only et n'affiche par défaut que des
totaux :

```powershell
npm run ops:audit-images
```

Il compare références Markdown, métadonnées `note_images`, chemins attendus et
objets du bucket. Un résultat non propre positionne le code de sortie à `2`.
L'option `-- --details` est réservée à un diagnostic local contrôlé ; aucune
suppression n'est implémentée dans ce script.
