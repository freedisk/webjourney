# Capsule

[![CI](https://github.com/freedisk/webjourney/actions/workflows/ci.yml/badge.svg)](https://github.com/freedisk/webjourney/actions/workflows/ci.yml)

Application personnelle de notes construite avec Next.js, Supabase et Vercel.

Capsule gère l'authentification, le Markdown, les tags, trois vues (cartes,
liste et Kanban), le partage public par token, les statistiques et les résumés
Anthropic. Les notes peuvent également contenir des images privées ajoutées par
fichier ou par copier/coller.

## Stack

- Next.js 16.3.3 et React 19.2.8 ;
- Supabase : PostgreSQL, Auth, RLS et Storage ;
- Vercel : déploiement depuis GitHub ;
- Tailwind CSS 4 et CSS custom ;
- Anthropic pour les résumés de notes.

## Démarrage local

Pré-requis : Node.js 20.9 minimum et npm 10 minimum.

```bash
npm install
copy .env.example .env.local
npm run dev
```

L'application est ensuite disponible sur <http://localhost:3000>.

Variables à renseigner dans `.env.local` :

| Variable | Exposition | Usage |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | navigateur + serveur | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | navigateur + serveur | Clé publique Supabase recommandée |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navigateur + serveur | Compatibilité avec l'ancienne clé `anon` |
| `ANTHROPIC_API_KEY` | serveur uniquement | Résumé IA |
| `SUPABASE_SECRET_KEY` | serveur uniquement | Signature des images sur les notes partagées |

Ne jamais ajouter `SUPABASE_SECRET_KEY` ou `ANTHROPIC_API_KEY` à une variable
préfixée par `NEXT_PUBLIC_`.

## Base de données et images

Les changements Supabase sont versionnés dans `supabase/migrations/`.
La migration `20260826120000_add_note_images.sql` crée :

- la table `note_images` ;
- le bucket privé `note-images` ;
- la limite de 5 Mio et les types JPEG, PNG et WebP ;
- les politiques RLS de lecture, ajout et suppression.

Appliquer cette migration **avant** de déployer le code des images. Deux voies
sont possibles :

1. projet lié au CLI Supabase : `npx supabase db push` ;
2. copier le SQL de la migration dans le SQL Editor du dashboard Supabase.

Les images restent privées. Le contenu Markdown conserve un identifiant stable,
et l'application produit une URL signée d'une heure au moment du rendu. La page
publique ne signe que les images appartenant à la note trouvée par son token.

Voir [docs/IMAGES.md](docs/IMAGES.md) pour le modèle complet et
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) pour l'ordre de mise en production.

## Commandes

```bash
npm run dev             # serveur local
npm run lint            # analyse statique
npm test                # tests unitaires Vitest
npm run build           # build de production
npm run validate        # lint + tests + build
npm run security:audit  # audit complet des dépendances
```

## Structure essentielle

```text
app/
  page.js                    interface et opérations principales
  api/resumer/route.js       résumé Anthropic authentifié
  share/[token]/page.js      lecture publique et signature serveur
components/
  NoteContentEditor.js       texte, fichier, collage et aperçus
  MarkdownRenderer.js        Markdown et images signées
lib/
  note-images.js             format stable et validations
  note-image-storage.js      upload, copie, suppression, signature
  supabase.js                client navigateur
  supabase-admin.js          client serveur à clé secrète
supabase/migrations/         schéma et politiques versionnés
tests/                       tests unitaires
```

Documentation technique détaillée : [CLAUDE.md](CLAUDE.md) et
[DEVELOPMENT.md](DEVELOPMENT.md).

## Production

- Application : <https://webjourney-one.vercel.app/>
- Dépôt : <https://github.com/freedisk/webjourney>

Le push Git ne doit intervenir qu'après `npm run validate`, `npm audit` et la
vérification de la migration Supabase sur l'environnement ciblé.
