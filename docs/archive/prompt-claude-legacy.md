# Archive — ancienne interface ClaudeAI → Claude Code

> **Statut : obsolète.** Ce fichier n'est plus une instruction active du projet.
> Il est conservé uniquement pour l'historique du développement antérieur à
> l'utilisation directe de Codex. Le contenu original commence ci-dessous.

```
Objectif : remplacer le nom "WEBJOURNEY" dans le header par "CAPSULE"
et lui donner un traitement visuel marquant avec une animation discrète.

Rendu attendu :
- Texte "CAPSULE" en majuscules, fonte bold, taille généreuse (1.2–1.4rem)
- Traitement visuel au choix parmi : dégradé de couleur sur le texte
  (ex: accent → violet), ou lettrage avec légère ombre colorée offset
  (style brutalism), ou combinaison des deux
- Animation discrète au chargement : fade-in + très léger slide-up (transform translateY)
  durée 0.4s, easing ease-out — une seule fois au montage, pas en boucle
- Animation au hover : très subtile — légère intensification du dégradé
  ou micro-scale (1.02), transition 0.2s
- Le badge "N NOTES" à côté doit rester lisible et cohérent avec le nouveau style
- Compatible mode sombre ET mode clair

Contraintes :
- NE PAS modifier la structure ou le positionnement du header
- NE PAS toucher aux autres éléments (toggles, boutons, etc.)
- L'animation doit respecter prefers-reduced-motion (pas d'animation si activé)
- Modifier uniquement le rendu visuel du nom — pas de nouveau composant

Montre-moi le JSX actuel du logo dans le header avant d'écrire quoi que ce soit.
Je validerai avant toute modification.

Une fois validé et testé en local (clair + sombre) :
1. Mettre à jour CLAUDE.md — remplacer "WEBJOURNEY" par "CAPSULE"
   dans la description du header
2. Commiter : git add . && git commit -m "Renommage app : WEBJOURNEY → CAPSULE + style logo animé"
3. Pusher : git push
```
