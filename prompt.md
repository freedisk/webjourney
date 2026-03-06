Ajoute des animations de transition à l'app.

ANIMATIONS À IMPLÉMENTER :

1. CARDS (card view)
   - Apparition initiale de la grille : chaque card fade-in + slide-up 
     au chargement (opacity 0→1, translateY 20px→0)
   - Cards en stagger : délai progressif par index (index * 50ms)
   - Durée : 300ms, easing : ease-out

2. MODALE
   - Ouverture : fade-in overlay + scale-up contenu (scale 0.95→1, opacity 0→1)
   - Fermeture : inverse (scale 1→0.95, opacity 1→0)
   - Durée : 200ms, easing : ease-out

3. TOGGLE CARD/LIST VIEW
   - Transition douce entre les deux modes (opacity 0→1)
   - Durée : 200ms

4. PANNEAU DROIT (list view)
   - Quand une note est sélectionnée : fade-in du contenu (opacity 0→1)
   - Durée : 150ms

5. BOUTONS D'ACTION
   - Hover : légère élévation (translateY -2px) + transition douce
   - Durée : 150ms
   - Déjà présents partiellement → vérifier et uniformiser

6. NOTE ÉPINGLÉE
   - Quand on épingle/désépingle : bref scale pulse (1→1.05→1)
   - Durée : 200ms

CONTRAINTES TECHNIQUES :
- Utiliser uniquement CSS transitions et @keyframes
- Pas de librairie d'animation (pas de framer-motion, pas de react-spring)
- Respecter prefers-reduced-motion :
  @media (prefers-reduced-motion: reduce) { 
    * { animation: none !important; transition: none !important; } 
  }
- Les animations ne doivent pas bloquer les interactions
- Pas de layout shift visible (réserver l'espace avant l'animation)

IMPLÉMENTATION :
- Ajouter les styles dans le fichier CSS global existant (globals.css)
  ou via style inline si plus approprié
- Classes CSS réutilisables : .fade-in, .slide-up, .scale-in
- Pour le stagger des cards : style inline sur chaque card 
  (animationDelay: `${index * 50}ms`)

NE PAS MODIFIER :
- Logique CRUD
- Système de tags
- Markdown
- Notes épinglées
- Couleurs de cards
- Résumé IA

Mettre à jour le CLAUDE.md et commiter :
"Animations de transition — fade-in cards, modale, list view, boutons"