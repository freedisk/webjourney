# Aperçus sociaux — Capsule

## Objectif

Lorsqu'un lien Capsule est collé dans Messenger ou un service compatible avec
Open Graph, il doit afficher une carte reconnaissable : nom, description et
visuel neo-brutaliste de l'application.

## Contrat publié

| URL | Titre | Description | Image |
|---|---|---|---|
| `/` et pages applicatives | Capsule — Mes Notes | Présentation de Capsule | Carte générique Capsule |
| `/share/<token>` valide | Titre de la note publique — Capsule | Description générique | Même carte générique |
| `/share/<token>` invalide ou révoqué | Note introuvable — Capsule | Description générique | Même carte générique |

Le layout expose Open Graph et `summary_large_image` pour les lecteurs qui
comprennent les cartes Twitter/X. Les URL relatives sont résolues vers
`https://webjourney-one.vercel.app` par `metadataBase`.

La route statique `/opengraph-image` produit un PNG 1 200 × 630 avec
`ImageResponse`. Elle réutilise `public/icons/icon-512.png` et les codes visuels
de Capsule ; aucun service d'image externe ni nouvelle dépendance n'est requis.

## Confidentialité

- Le visuel et la description sont génériques et ne contiennent aucune note,
  image privée, URL signée, identité ou clé.
- Une page `/share/<token>` peut annoncer le titre de la note : ce titre faisait
  déjà partie du HTML public de ce lien. Le corps, les tags et les images ne
  sont jamais copiés dans les métadonnées ou dans la carte.
- Révoquer le partage rend le titre indisponible lors d'une nouvelle lecture.
  Un service social peut toutefois conserver temporairement son aperçu en
  cache ; Capsule ne peut pas purger ce cache tiers.
- La carte publique peut être mise en cache. Les pages, API, notes et URL
  signées restent exclues du cache PWA.

## Recette locale

Utiliser un build de production, car la route d'image est générée par Next.js :

```powershell
npm run build
npm run start -- -p 3102
Invoke-WebRequest http://localhost:3102/ -Headers @{
  'User-Agent' = 'facebookexternalhit/1.1'
}
Invoke-WebRequest http://localhost:3102/opengraph-image
```

Contrôler dans le HTML :

- `og:title`, `og:description`, `og:url`, `og:site_name` et `og:type` ;
- `og:image` en HTTPS avec type `image/png`, largeur `1200`, hauteur `630` et
  texte alternatif ;
- `twitter:card=summary_large_image`, titre, description et image ;
- aucune donnée de note dans la carte générique.

Ouvrir ensuite `/opengraph-image` dans un navigateur et vérifier visuellement
la lisibilité à sa taille native. Tester aussi un lien partagé valide et un
token révoqué avec le user-agent d'un robot social.

## Recette production et cache Messenger

Après le déploiement, refaire les contrôles sur
`https://webjourney-one.vercel.app/` et vérifier que l'image retourne `200` en
`image/png`. Pour un lien déjà collé dans Messenger, demander une nouvelle
analyse dans le [Sharing Debugger de Meta](https://developers.facebook.com/tools/debug/)
avec **Scrape Again**, puis recoller le lien. Un délai peut subsister dans les
conversations qui possèdent déjà une carte en cache.

## Rollback

Réassigner le dernier déploiement Vercel sain. Ce changement ne crée ni donnée,
ni migration, ni variable d'environnement ; Supabase reste inchangé.
