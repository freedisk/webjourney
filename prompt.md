Ajoute le support Markdown dans les notes.

INSTALLATION :
npm install react-markdown

COMPORTEMENT :
- En mode lecture (card, modale, panneau droit list view) : 
  le contenu de la note est rendu en Markdown formaté
- En mode édition : textarea brut inchangé (on écrit le Markdown en texte)
- Si le contenu ne contient pas de Markdown → s'affiche normalement, 
  aucune régression

RENDU MARKDOWN À SUPPORTER :
- **gras**, *italique*, ~~barré~~
- # Titres H1, ## H2, ### H3
- - listes à puces, 1. listes numérotées
- `code inline` et blocs ```code```
- > citations (blockquote)
- --- séparateur horizontal
- [lien](url)

STYLE DU RENDU :
- Cohérent avec le design brutalism + glassmorphism existant
- Compatible mode sombre/clair
- Titres Markdown plus grands mais pas énormes 
  (H1 ~1.3em, H2 ~1.15em, H3 ~1.05em)
- Blocs de code : fond sombre, police monospace, padding
- Listes : indentées proprement
- Blockquote : bordure gauche colorée, italique
- Ne pas laisser les styles Markdown déborder hors de leur conteneur

IMPLÉMENTATION :
- Installer react-markdown
- Créer un composant MarkdownRenderer.js dans components/
  · Reçoit en props : content (string)
  · Retourne le contenu rendu via <ReactMarkdown>
  · Applique les styles custom via prop components de ReactMarkdown
- Utiliser MarkdownRenderer dans :
  · L'aperçu de la card (mode lecture)
  · NoteDetail.js (modale + panneau droit list view)
- Le textarea d'édition reste inchangé partout

AIDE VISUELLE OPTIONNELLE :
- Dans le formulaire d'édition, ajouter une ligne de texte discret :
  "Supporte le Markdown — **gras**, *italique*, # titre, - liste"

NE PAS MODIFIER :
- Logique CRUD
- Système de tags
- Notes épinglées
- Couleurs de cards
- Résumé IA
- Auth et RLS

Mettre à jour le CLAUDE.md et commiter :
"Support Markdown — rendu formaté en lecture, react-markdown"