# PWA et installation iPhone/iPad

Capsule est installable depuis Safari comme une application autonome. Elle
dispose d'un manifeste, d'icônes dédiées, des métadonnées Apple et d'un service
worker enregistré uniquement dans le build de production.

Le manifeste expose deux raccourcis progressifs, lorsqu'ils sont pris en charge
par le système : **Nouvelle note** et **Rechercher**. Leur URL ouvre directement
l'action demandée après restauration de la session. L'interface conserve ses
boutons habituels sur les plateformes qui ignorent ces raccourcis.

## Installer depuis Safari

1. Ouvrir <https://webjourney-one.vercel.app/> dans **Safari**.
2. Se connecter et vérifier que l'application fonctionne normalement.
3. Toucher **Partager** dans la barre de Safari.
4. Choisir **Sur l'écran d'accueil**.
5. Conserver le nom `Capsule`, puis toucher **Ajouter**.

L'icône Capsule apparaît alors sur l'écran d'accueil. L'application s'ouvre en
mode autonome, sans la barre d'adresse Safari, et conserve la session Supabase
selon les règles habituelles du navigateur.

Si une ancienne icône reste affichée après une mise à jour, supprimer le
raccourci puis refaire l'installation : iOS met fortement en cache les icônes
d'écran d'accueil.

## Périmètre hors ligne

Le service worker met uniquement en cache :

- la page d'information hors ligne ;
- le manifeste et les icônes ;
- les fichiers statiques versionnés de Next.js.

Les notes, les images privées, les réponses Supabase et `/api/resumer` ne sont
jamais mises en cache. Une connexion reste donc nécessaire pour consulter ou
modifier les notes. En cas de coupure, une page explicite remplace la
navigation en échec, sans exposer de données privées.

## Vérification locale

Le service worker est volontairement désactivé avec `npm run dev` pour ne pas
perturber le rechargement à chaud. Tester le comportement PWA avec un build de
production :

```bash
npm run build
npm run start -- -p 3001
```

Puis ouvrir <http://localhost:3001> et vérifier :

1. `/manifest.webmanifest` renvoie le manifeste `Capsule` ;
2. `/sw.js` renvoie du JavaScript avec `Cache-Control: no-cache, no-store` ;
3. le service worker contrôle la page après un rechargement ;
4. le mode hors ligne affiche `/offline` ;
5. les notes redeviennent disponibles après le retour du réseau.

`localhost` est accepté comme contexte sécurisé pour le développement. La
recette iPhone/iPad finale doit néanmoins être faite sur l'URL HTTPS Vercel.

## Fichiers principaux

```text
app/manifest.js                 manifeste Web App
app/offline/page.js             repli sans connexion
components/PWARegistration.js  enregistrement côté navigateur
public/sw.js                    cache statique sans données privées
public/icons/                   source SVG et rendus PNG
public/apple-touch-icon.png     icône Safari iOS 180 × 180
```

Si la liste des fichiers précachés ou le manifeste change, modifier
`CACHE_NAME` dans `public/sw.js` afin de nettoyer l'ancien cache lors de
l'activation. UX-002 utilise `capsule-static-v2` pour diffuser les raccourcis
sans conserver l'ancien manifeste.
