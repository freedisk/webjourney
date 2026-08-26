# Capsule

[![CI](https://github.com/freedisk/webjourney/actions/workflows/ci.yml/badge.svg)](https://github.com/freedisk/webjourney/actions/workflows/ci.yml)

Application personnelle de notes construite avec Next.js, Supabase et Vercel.

Capsule gère l'authentification, le Markdown, les tags, trois vues (cartes,
liste et Kanban), le partage public par token, les statistiques et les résumés
Anthropic. Les notes peuvent également contenir des images privées ajoutées par
sélection, copier/coller ou glisser-déposer. Elles sont optimisées localement,
accompagnées d'une progression et consultables dans une galerie plein écran.

Capsule est également une PWA installable sur l'écran d'accueil d'un iPhone ou
d'un iPad depuis Safari. Elle s'ouvre alors en mode autonome avec une icône
dédiée. Voir [docs/PWA.md](docs/PWA.md) pour l'installation et le périmètre hors
ligne.

## Stack

- Next.js 16.3.3 et React 19.2.8 ;
- Supabase : PostgreSQL, Auth, RLS et Storage ;
- Vercel : déploiement depuis GitHub ;
- Tailwind CSS 4 et CSS custom ;
- Anthropic pour les résumés de notes.
- Web App Manifest et service worker minimal pour l'installation PWA.

## Démarrage local

Pré-requis : Node.js 24 (version de référence `24.19.0`) et npm 11.

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
La baseline `20260826000000_baseline_existing_schema.sql` décrit le noyau
historique. La migration `20260826120000_add_note_images.sql` crée :

- la table `note_images` ;
- le bucket privé `note-images` ;
- la limite de 5 Mio et les types JPEG, PNG et WebP ;
- les politiques RLS de lecture, ajout et suppression.

Pour une nouvelle évolution, créer une migration forward-only et utiliser le
CLI lié :

```bash
npx supabase migration list --linked
npx supabase db push --dry-run --linked
npx supabase db push --linked
```

Les deux migrations existantes sont déjà marquées appliquées sur Webjourney.
Ne pas les modifier ni revenir au SQL Editor pour contourner l'historique.

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
npm run ops:audit-images # rapport read-only Markdown / métadonnées / Storage
```

## Structure essentielle

```text
app/
  page.js                    interface et opérations principales
  manifest.js                manifeste d'installation PWA
  offline/page.js            page de repli sans connexion
  api/resumer/route.js       résumé Anthropic authentifié
  share/[token]/page.js      lecture publique et signature serveur
components/
  PWARegistration.js         enregistrement du service worker
  NoteContentEditor.js       texte, sélection, collage, dépôt et progression
  MarkdownRenderer.js        Markdown et galerie d'images signées
  ImageLightbox.js           visionneuse clavier, tactile et accessible
lib/
  note-images.js             format stable et validations
  image-compression.js       optimisation WebP locale et garde-fous
  note-image-storage.js      upload, copie, suppression, signature
  note-image-audit.mjs       classification d'intégrité read-only
  supabase.js                client navigateur
  supabase-admin.js          client serveur à clé secrète
scripts/
  audit-note-images.mjs      audit opératoire du bucket privé
supabase/migrations/         schéma et politiques versionnés
supabase/schemas/            photographie déclarative de production
supabase/tests/              audit SQL non destructif
tests/                       tests unitaires
public/sw.js                 cache statique, jamais les notes privées
public/icons/                icônes PWA et source SVG
```

## Documentation

- [Index documentaire](docs/README.md) ;
- [architecture technique](docs/ARCHITECTURE.md) ;
- [mémoire projet](docs/MEMORY.md) ;
- [devbook](docs/DEVBOOK.md) et [backlog](docs/BACKLOG.md) ;
- [runbook d'exploitation](docs/RUNBOOK.md) ;
- [stratégie de test](docs/TESTING.md) ;
- [décisions d'architecture](docs/DECISIONS.md) ;
- [registre des erreurs](MISTAKES.md) et [politique de sécurité](SECURITY.md).

`CLAUDE.md` conserve le contexte fonctionnel détaillé et `AGENTS.md` définit les
règles obligatoires pour les agents et les automations.

## Production

- Application : <https://webjourney-one.vercel.app/>
- Dépôt : <https://github.com/freedisk/webjourney>

Le push Git ne doit intervenir qu'après `npm run validate`, `npm audit` et la
vérification de la migration Supabase sur l'environnement ciblé.
