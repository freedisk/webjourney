# Images dans les notes

## Objectif

Permettre l'ajout d'images dans le contenu d'une note par sélection de fichier ou
par copier/coller, sans rendre publiques les images des notes privées.

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
- Taille comprise entre 1 octet et 5 Mio.
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
3. Les fichiers valides obtiennent immédiatement un UUID et un aperçu `blob:`.
4. La référence Markdown est insérée à la position du curseur.
5. Aucun upload n'a lieu avant Créer/Sauver.
6. Une image retirée du brouillon n'est pas envoyée.

## Recette navigateur obligatoire

À effectuer sur un projet Supabase de test ou sur la production après sauvegarde :

- [ ] créer une note texte sans image ;
- [ ] ajouter un PNG par le sélecteur ;
- [ ] coller une capture PNG dans le textarea ;
- [ ] vérifier les deux aperçus avant sauvegarde ;
- [ ] annuler et confirmer qu'aucun objet Storage n'a été créé ;
- [ ] sauvegarder puis recharger la page ;
- [ ] vérifier cartes, modale et panneau liste en clair et sombre ;
- [ ] vérifier l'affichage mobile ;
- [ ] refuser SVG, HEIC, fichier vide et image > 5 Mio ;
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
