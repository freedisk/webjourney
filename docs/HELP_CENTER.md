# Centre d'aide contextuel — HELP-001

## Objectif

Le centre d'aide explique Capsule dans l'application, au moment où une question
se pose. Il ne remplace pas la documentation technique : son contenu est court,
orienté usage et versionné avec le code livré.

## Points d'entrée

- menu utilisateur : **Centre d'aide** ;
- palette `Ctrl/Cmd+K` : **Ouvrir le centre d'aide** ;
- état vide : **Découvrir Capsule** ;
- barre Markdown : rubrique **Notes et Markdown** ;
- zone d'ajout d'images : rubrique **Images et galerie** ;
- paramètres IA : rubrique **Paramètres IA**.

Le démarrage rapide peut aussi ouvrir la création d'une note ou les paramètres
IA. Une action ferme d'abord l'aide afin de conserver une seule couche active.

## Contenu et recherche

`lib/help-content.js` est la source canonique des neuf rubriques, des cinq étapes
de démarrage et des raccourcis clavier. `filterHelpSections` normalise la casse
et les accents puis exige que chaque terme recherché soit présent dans une même
rubrique. Aucun service distant ni index externe n'intervient.

`components/HelpCenterDialog.js` utilise la primitive accessible `Dialog` :
focus initial dans la recherche, confinement, fermeture par `Échap`, restitution
au déclencheur, titres nommés et état actif annoncé. Sur mobile, les rubriques
deviennent une navigation horizontale et l'article garde son propre défilement.

## Données et confidentialité

Le centre d'aide ne lit ni note, ni tag, ni image, ni réglage IA. Il n'appelle
aucune API. La préférence facultative utilise la clé
`capsule-help-progress-v1` dans `localStorage` et contient seulement :

```json
{
  "completed": ["create-note"],
  "checklistHidden": false
}
```

Les identifiants inconnus sont supprimés à la lecture. Un blocage du stockage
n'empêche pas l'aide de fonctionner ; la progression reste alors en mémoire.

## PWA et hors ligne

Le contenu est inclus dans les assets JavaScript de Capsule et n'ajoute aucun
appel réseau une fois l'application chargée. Le service worker continue de ne
jamais mettre en cache une navigation authentifiée : après un rechargement sans
réseau, `/offline` s'affiche et aucune donnée privée n'est exposée.

## Évolution

- garder le texte aligné avec les fonctions réellement déployées ;
- ne jamais inclure de secret, donnée utilisateur ou conseil de coût figé ;
- ajouter des mots-clés plutôt qu'une dépendance de recherche ;
- conserver un repli si une action contextuelle est absente ;
- étendre les tests de `tests/help-content.test.js` avec chaque nouvelle
  rubrique ou point d'entrée.

La recette manuelle de référence se trouve dans `docs/TESTING.md`.
