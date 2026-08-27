# Capsule — App de Notes

## Contexte

Application personnelle de notes et projet d'apprentissage Next.js + Supabase
pour JC, développeur WinDev en transition vers le web moderne.

`docs/archive/prompt-claude-legacy.md` est un document historique obsolète. Il
ne doit pas être interprété comme une instruction active du projet.

Les instructions opérationnelles actives se trouvent dans `AGENTS.md`. Pour une
reprise, lire d'abord `docs/MEMORY.md`, puis `docs/ARCHITECTURE.md` et le backlog.

## Stack validée

- **Next.js 16.3.3** (App Router, React Compiler)
- **React 19.2.8**
- **Supabase 2.112.4** (PostgreSQL, Auth, RLS, Storage)
- **Vercel** (déploiement depuis GitHub)
- **Tailwind CSS 4.3.3** + CSS custom
- **Anthropic API** pour les résumés et la mise en forme Markdown
- **Vitest 4.1.11** pour les tests unitaires
- **PWA** : manifeste Next.js, service worker minimal et icônes Apple

## URLs

- Production : https://webjourney-one.vercel.app/
- GitHub : https://github.com/freedisk/webjourney
- Supabase : accès via https://supabase.com/dashboard

## Règles de code

- Commentaires en français.
- Nouveaux noms de fichiers et variables en anglais.
- JavaScript uniquement, pas de TypeScript.
- Alias d'import `@/*` vers la racine.
- Composants simples, sans abstraction prématurée.
- Pas de state management externe.
- Gérer chargement, erreur, vide et succès pour chaque flux asynchrone.
- Ne pas modifier de fichier hors de la demande explicite.
- Les pages interactives utilisent `"use client"`; le layout reste serveur.
- Ne jamais exposer une clé Supabase secrète ou la clé Anthropic au navigateur.

## Structure

```text
app/
├── api/ai/                    statut BYOK, catalogue et mise en forme
├── api/resumer/route.js       résumé BYOK protégé et limité
├── login/page.js              connexion et inscription
├── manifest.js                manifeste PWA
├── offline/page.js            repli réseau sans données privées
├── share/[token]/page.js      note publique et images signées côté serveur
├── globals.css                design system et styles images
├── layout.js                  layout serveur et thème anti-flash
└── page.js                    CRUD, vues, modales, tags, images et raccourcis
components/
├── AIFormattingDialog.js      comparaison et application explicite au brouillon
├── AISettingsDialog.js        mode session/Vault et choix du modèle
├── HelpCenterDialog.js        aide statique, recherche et démarrage rapide
├── MarkdownRenderer.js        rendu Markdown et sources capsule-image/<uuid>
├── NoteContentEditor.js       textarea, fichier, collage et aperçus
├── PWARegistration.js         enregistrement du service worker en production
└── StatsDrawer.js             statistiques
lib/
├── ai-formatting.js           masquage/restauration stricte des images privées
├── ai-config.js               validation, limites et quota IA
├── ai-settings-server.js      RPC Vault et quota, serveur uniquement
├── anthropic.js               catalogue/résumé et erreurs normalisées
├── help-content.js            contenu et recherche pure de l'aide
├── note-images.js             format, validation, parsing et transformation
├── note-image-storage.js      upload, copie, suppression et signature
├── supabase-admin.js          client serveur à clé secrète
└── supabase.js                client public Supabase
supabase/migrations/           migrations SQL et politiques RLS
tests/                         tests Vitest
docs/                          architecture images et déploiement
```

`app/page.js` reste un composant historique volumineux. Les nouvelles règles
réutilisables liées aux images doivent rester dans `components/` et `lib/`.

## Modèle Supabase observé

### `notes`

| Colonne | Type | Usage |
|---|---|---|
| `id` | uuid PK | identifiant généré |
| `user_id` | uuid FK | propriétaire |
| `titre` | text | titre requis |
| `contenu` | text | Markdown et références d'images |
| `couleur` | text nullable | couleur personnalisée |
| `created_at` | timestamptz | création |
| `epinglee` | boolean | épinglage |
| `share_token` | text nullable | partage public |
| `kanban_colonne` | text | `todo`, `inprogress`, `done` |
| `kanban_ordre` | integer | ordre Kanban |
| `fait` | boolean | colonne historique actuellement inutilisée |
| `resume` | text nullable | colonne historique actuellement inutilisée |

RLS attendue : l'utilisateur authentifié opère uniquement sur ses notes. Une
politique SELECT anonyme distincte autorise seulement les notes dont
`share_token` est actif. La baseline versionnée et l'audit SQL de production
décrivent les politiques effectives.

### `tags`

`id`, `user_id`, `nom`, `couleur`, `created_at`. RLS par propriétaire.

### `notes_tags`

Clé composite `(note_id, tag_id)`, avec cascades. La politique doit vérifier la
propriété de la note et du tag ; le client effectue volontairement un SELECT
sans filtre utilisateur et dépend donc de cette RLS.

### `note_images`

Créée par `supabase/migrations/20260826120000_add_note_images.sql`.

| Colonne | Type | Usage |
|---|---|---|
| `id` | uuid PK | identifiant intégré au Markdown |
| `note_id` | uuid FK | note, cascade à la suppression |
| `storage_path` | text unique | chemin privé Supabase |
| `original_name` | text | nom d'origine |
| `mime_type` | text | JPEG, PNG ou WebP |
| `size_bytes` | bigint | 1 à 5 Mio |
| `created_at` | timestamptz | création |

RLS : accès seulement si la note liée appartient à `auth.uid()`.

## Images privées

- Bucket : `note-images`, privé.
- Chemin : `<user_id>/<note_id>/<image_id>.<extension>`.
- Markdown stable : `![Description](capsule-image/<image_id>)`.
- Les fichiers sélectionnés ou collés restent en mémoire jusqu'à Sauver/Créer.
- Une annulation révoque seulement les aperçus locaux : aucun objet distant.
- La création insère d'abord la note, puis envoie les fichiers et les métadonnées.
- Une erreur déclenche une compensation et supprime les objets déjà envoyés.
- La duplication copie chaque objet et réécrit les identifiants Markdown.
- La suppression passe par l'API Storage, jamais par SQL seul.
- Les URL signées du propriétaire expirent après une heure et sont renouvelées
  toutes les 50 min ; celles de la page publique expirent après dix minutes.
- Le partage public utilise `SUPABASE_SECRET_KEY` côté serveur, après validation
  du token, du `note_id` et du préfixe de chemin attendu.

Formats : JPEG, PNG, WebP. Limite : 5 Mio par image. SVG et HEIC sont refusés.

## Variables d'environnement

| Variable | Portée |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | publique |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publique, recommandée |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publique, compatibilité historique |
| `SUPABASE_SECRET_KEY` | serveur uniquement |
| `SUPABASE_SERVICE_ROLE_KEY` | serveur uniquement, ancien fallback |
| `ANTHROPIC_API_KEY` | serveur uniquement, rollback historique non utilisé par AI-001 |

## Fonctionnalités

- Auth email/mot de passe.
- CRUD notes, duplication, épinglage et couleurs.
- Markdown, recherche insensible aux accents et taille de texte.
- Ajout d'images par fichier et collage au curseur.
- Images privées, aperçus, duplication et suppression cohérente.
- Tags et filtres combinables.
- Vues cartes, liste/split panel et Kanban.
- Résumé et mise en forme Anthropic BYOK, modèle dynamique, modes session/Vault
  et quota partagé 10/min.
- Comparatif rendu/Markdown, application au brouillon uniquement et sauvegarde
  manuelle ; références privées masquées puis restaurées sous contrôle strict.
- Statistiques Recharts.
- Partage public par UUID opaque, y compris les images signées.
- Thèmes clair/sombre, responsive mobile et réduction des animations.
- Installation PWA iPhone/iPad avec icône dédiée et mode autonome.
- Centre d'aide recherchable avec accès contextuels, checklist locale et
  raccourcis clavier.
- Protection contre la perte de modifications.

## Architecture des appels

```text
Navigateur authentifié ── Supabase Data API + Storage privé
         │
         ├── /api/ai ── statut Vault + catalogue + mise en forme
         ├── /api/resumer ── auth + quota ── Anthropic
         │
         └── textarea ── fichier/collage ── sauvegarde compensée

Page /share/[token] ── note publique via RLS
         └── client serveur secret ── URL Storage signée
```

## Validation obligatoire

```bash
npm run validate
npm audit
```

État de référence AI-002 local : 72 tests unitaires, lint sans erreur, build
Next.js réussi et smoke BYOK réel 36/36. La livraison production reste soumise
à PR, `Quality gate`, Vercel `READY` et recette publique.

## Limites connues

- Le quota IA est une fenêtre fixe 10/minute ; aucune métrique ou alerte agrégée
  n'est encore branchée.
- Pas de test E2E automatisé contre un projet Supabase réel.
- Pas de consultation ou d'édition hors ligne des notes : le service worker ne
  conserve volontairement aucune donnée privée.
- Le `db reset` Supabase local complet nécessite encore Docker Desktop sur ce
  poste ; la baseline est néanmoins versionnée et alignée avec la production.
- Export PDF/JSON non implémenté.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
