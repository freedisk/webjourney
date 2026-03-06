Ajoute des raccourcis clavier à l'app.

RACCOURCIS À IMPLÉMENTER :

1. GLOBAUX (actifs partout sauf quand on est dans un champ de saisie)
   - N          → ouvre le formulaire de création de nouvelle note
   - /          → focus sur la barre de recherche
   - Échap      → ferme la modale / annule l'édition en cours
   - 1          → bascule en Card View
   - 2          → bascule en List View

2. MODALE OUVERTE
   - Échap      → ferme la modale (déjà implémenté — vérifier et conserver)
   - E          → passe en mode édition
   - Suppr      → déclenche la confirmation de suppression

3. LIST VIEW — PANNEAU GAUCHE
   - ↑ / ↓      → naviguer entre les notes de la liste
   - Entrée     → sélectionner la note surligné

CONTRAINTES TECHNIQUES :
- Utiliser useEffect + addEventListener('keydown') au niveau page
- Toujours vérifier que l'événement ne vient pas d'un input/textarea/select
  avant d'intercepter :
  const isTyping = ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)
  if (isTyping) return
- Nettoyer les listeners dans le return du useEffect (removeEventListener)
- Un seul listener global — pas un par composant
- Pas de conflit avec les raccourcis navigateur (éviter Ctrl+*, Alt+*)

UI — AIDE CONTEXTUELLE :
- Bouton "?" discret dans le coin bas-droite de l'écran
- Clic → ouvre une petite modale/tooltip listant tous les raccourcis
- Même style que l'app (glassmorphism, mode sombre/clair)
- Raccourci pour fermer cette aide : Échap

FORMAT D'AFFICHAGE DES RACCOURCIS DANS L'AIDE :
┌─────────────────────────────┐
│ ⌨️ Raccourcis clavier        │
├─────────────────────────────┤
│ N          Nouvelle note     │
│ /          Rechercher        │
│ 1 / 2      Card / List view  │
│ Échap      Fermer / Annuler  │
│ ↑ ↓        Naviguer (liste)  │
│ Entrée     Sélectionner      │
│ E          Éditer (modale)   │
└─────────────────────────────┘

NE PAS MODIFIER :
- Logique CRUD
- Système de tags
- Markdown
- Notes épinglées
- Couleurs de cards
- Résumé IA
- Animations

Mettre à jour le CLAUDE.md et commiter :
"Raccourcis clavier — navigation, actions, aide contextuelle (?)"