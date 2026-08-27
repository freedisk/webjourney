# Impression et PDF — PRINT-001

## Objectif

Capsule prépare une version papier fidèle d'une note enregistrée, puis délègue
l'impression ou l'enregistrement PDF au dialogue natif du navigateur. Le texte,
les liens et le Markdown restent sélectionnables ; aucun PDF n'est produit,
stocké ou transmis par Capsule.

## Parcours utilisateur

1. ouvrir une note enregistrée depuis la vue cartes ou liste ;
2. choisir **Imprimer / PDF** hors du mode édition ;
3. contrôler l'aperçu clair : titre, date de création, tags, Markdown et images ;
4. choisir **Imprimer / PDF** et attendre la préparation de toutes les images ;
5. sélectionner une imprimante ou l'option PDF proposée par le système.

Une préparation lente peut être annulée avec **Annuler la préparation**, puis
relancée sans fermer la note. Une référence privée absente ou une image non
décodable bloque volontairement l'ouverture du dialogue système. **Actualiser
les images** renouvelle alors les URL signées.

Sur iPhone et iPad, les intitulés et destinations disponibles dépendent de la
version de Safari/iOS et des applications installées. Capsule s'appuie sur le
dialogue système, y compris lorsqu'elle est lancée depuis l'écran d'accueil.

## Architecture

- `components/PrintableNote.js` construit le document sémantique non
  interactif ;
- `components/PrintNoteDialog.js` affiche l'aperçu, prépare les images, gère la
  progression, l'annulation et l'appel à `window.print()` ;
- `lib/note-printing.js` normalise le titre, détecte les signatures absentes et
  attend le chargement/décodage avec un délai maximal de 15 secondes ;
- `components/MarkdownRenderer.js` conserve son rendu interactif habituel et
  expose un mode papier sans bouton ni visionneuse ;
- `app/globals.css` isole le document sous `@media print`, impose un thème clair
  et applique les règles A4 et anti-coupure prises en charge par le navigateur.

Le titre temporaire du document suggère un nom utile lors d'un export PDF. Il
est restauré, comme la classe CSS d'impression, même après une erreur ou la
fermeture du dialogue système.

## Confidentialité et données

- seule la version déjà enregistrée de la note est imprimable ;
- les images privées utilisent les URL signées éphémères déjà chargées par la
  session ; elles ne sont jamais recopiées dans le Markdown ;
- le document n'entre ni dans Supabase, ni dans le cache PWA, ni dans un service
  tiers ;
- une impression papier ou un PDF enregistré sort du contrôle de Capsule et ne
  peut pas être révoqué avec la note ou son partage ;
- aucune migration, variable Vercel ou dépendance PDF n'est requise.

## Limites assumées

La pagination exacte, les en-têtes/pieds répétés et le nom final du fichier
dépendent du moteur d'impression. Le mode A4 est une préférence CSS et peut être
adapté au format local par le système. Une génération PDF déterministe côté
serveur reste hors périmètre tant qu'un besoin probatoire ou de gabarit strict
n'est pas démontré.

## Recette

Contrôler au minimum :

1. note texte courte et note proche de 20 000 caractères ;
2. Markdown avec titres, listes, tâches, lien, citation, tableau et code ;
3. note sans image puis avec plusieurs images et légendes ;
4. progression, annulation d'une préparation et nouvelle tentative ;
5. signature manquante, actualisation et erreur de décodage explicites ;
6. absence de boutons, overlays, ombres applicatives et thème sombre sur papier ;
7. absence de débordement à 390, 1 024 et 1 416 px ;
8. fermeture par bouton et `Échap`, puis restitution du focus ;
9. impression/enregistrement PDF depuis Chrome desktop et Safari/PWA iOS.

La dernière étape dépend du dialogue natif et reste une recette manuelle sur
l'appareil réel. Les tests automatisés vérifient la préparation, le timeout,
l'annulation, les références privées et l'isolation CSS.
