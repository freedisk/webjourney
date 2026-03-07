# WebJourney — App de Notes

## Contexte

App de notes personnelles avec authentification, tags colorés, recherche instantanée et résumé IA. Projet d'apprentissage Next.js + Supabase + Vercel pour JC (développeur WinDev en transition vers le web moderne).

## Stack technique

- **Next.js 16.1.6** (App Router, React 19, React Compiler activé)
- **Supabase** (PostgreSQL + Auth + RLS)
- **Vercel** (déploiement automatique via GitHub)
- **Tailwind CSS 4** + CSS custom (variables, glassmorphism, brutalism)
- **API Anthropic** (Claude Sonnet 4.5) pour les résumés IA
- **Geist** (police Google Fonts : sans + mono)

## URLs

- Production : https://webjourney-one.vercel.app/
- Repo GitHub : https://github.com/freedisk/webjourney
- Dashboard Supabase : (accès via supabase.com/dashboard)

## Règles de code

- Commentaires en français
- Noms de fichiers/variables en anglais
- Pas de TypeScript (JavaScript uniquement, jsconfig.json avec alias `@/*`)
- Composants simples, pas d'abstraction prématurée
- Pas de state management externe (Redux, Zustand)
- Toujours gérer les 4 états : chargement, erreur, vide, succès
- Ne pas modifier de fichiers sans demande explicite
- Les pages interactives utilisent `"use client"`, le layout reste Server Component

## Structure du projet

```
webjourney/
├── app/
│   ├── globals.css              # Design system : variables CSS clair/sombre, glass-card, btn-brutal, input-glass, tag, split panel, kanban, texture bruit
│   ├── layout.js                # Layout racine (Server Component) : polices Geist, metadata, script anti-flash thème
│   ├── page.js                  # Page principale : card/list/kanban view toggle, CRUD notes, édition inline, tags colorés, recherche, filtrage, résumé IA, copier, épinglage, Markdown, drag & drop kanban
│   ├── login/
│   │   └── page.js              # Page connexion/inscription : formulaire email + mot de passe, toggle thème
│   ├── api/
│   │   └── resumer/
│   │       └── route.js         # API Route server-side : appel Anthropic Claude pour résumé de notes (clé secrète)
│   ├── share/
│   │   └── [token]/
│   │       └── page.js           # Page publique de note partagée (Server Component, lecture seule, Markdown)
│   └── favicon.ico
├── components/
│   ├── MarkdownRenderer.js      # Composant de rendu Markdown (react-markdown + styles custom brutalism)
│   └── StatsDrawer.js           # Drawer statistiques (recharts, agrégations Supabase, chiffres clés)
├── lib/
│   └── supabase.js              # Client Supabase initialisé avec NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
├── public/                       # Assets statiques (file.svg, globe.svg, next.svg, vercel.svg, window.svg)
├── CLAUDE.md                     # Ce fichier — documentation du projet
├── package.json                  # Dépendances : next, react, @supabase/supabase-js, tailwindcss
├── next.config.mjs               # Config Next.js (reactCompiler: true)
├── jsconfig.json                 # Alias de chemin @/* → ./*
├── postcss.config.mjs            # PostCSS avec plugin Tailwind
├── eslint.config.mjs             # ESLint avec config next/core-web-vitals
└── .env.local                    # Variables d'environnement (non versionné)
```

## Base de données Supabase

### Table `notes`

| Colonne      | Type         | Description                                          |
|-------------|-------------|------------------------------------------------------|
| `id`        | uuid (PK)   | Identifiant unique, `gen_random_uuid()`              |
| `user_id`   | uuid (FK)   | Référence vers `auth.users(id)`, cascade on delete   |
| `titre`     | text         | Titre de la note (requis)                            |
| `contenu`   | text         | Contenu de la note (optionnel)                       |
| `couleur`   | text         | Code hex couleur de fond (ex: `#fef9c3`), `NULL` = défaut glassmorphism |
| `created_at`| timestamptz  | Date de création, `now()` par défaut                 |
| `kanban_colonne` | text      | Colonne kanban : `'todo'` / `'inprogress'` / `'done'`, défaut `'todo'` |
| `kanban_ordre`   | integer   | Ordre dans la colonne kanban, défaut `0`             |

RLS : `auth.uid() = user_id` pour toutes les opérations (SELECT, INSERT, UPDATE, DELETE)

### Table `tags`

| Colonne      | Type         | Description                                          |
|-------------|-------------|------------------------------------------------------|
| `id`        | uuid (PK)   | Identifiant unique, `gen_random_uuid()`              |
| `user_id`   | uuid (FK)   | Référence vers `auth.users(id)`, cascade on delete   |
| `nom`       | text         | Nom du tag (requis)                                  |
| `couleur`   | text         | Code hexadécimal (ex: `#ef4444`)                     |
| `created_at`| timestamptz  | Date de création, `now()` par défaut                 |

RLS : `auth.uid() = user_id` pour toutes les opérations

### Table `notes_tags` (liaison N-N)

| Colonne    | Type       | Description                                            |
|-----------|-----------|--------------------------------------------------------|
| `note_id` | uuid (FK) | Référence vers `notes(id)`, cascade on delete          |
| `tag_id`  | uuid (FK) | Référence vers `tags(id)`, cascade on delete           |

Clé primaire composite : `(note_id, tag_id)`
RLS : basée sur la propriété de la note liée

## Variables d'environnement

| Variable                        | Portée           | Description                    |
|--------------------------------|-----------------|--------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`     | client + serveur | URL du projet Supabase         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| client + serveur | Clé anonyme Supabase           |
| `ANTHROPIC_API_KEY`            | serveur uniquement | Clé API Anthropic (pas de préfixe NEXT_PUBLIC_) |

Toutes configurées en local (`.env.local`) ET sur Vercel (Settings > Environment Variables).

## Fonctionnalités en place

- [x] Auth email/mot de passe (inscription + validation email + connexion + déconnexion)
- [x] Redirection automatique si non connecté
- [x] CRUD notes (créer via bouton "+ Nouvelle note" → modale de création, lire, modifier inline, supprimer avec confirmation, dupliquer avec tags)
- [x] **Toggle Card View / List View / Kanban** (icônes grille ⊞ / liste ☰ / colonnes SVG dans le header, bouton actif visuellement distinct)
- [x] **Card View** : grille responsive 1-2 colonnes, accordéon pour contenu long, modale détail au clic (via `createPortal`), boutons d'action complets sur chaque card (Modifier, Dupliquer, Copier, Résumer, + Tag, Supprimer)
- [x] **List View — split panel** desktop (panneau gauche 300px liste + panneau droit détail) + mobile responsive (liste plein écran → note plein écran avec bouton retour ← Notes)
- [x] Panneau gauche : liste compacte (titre tronqué, date courte, tags mini max 2 + "+N", indicateur couleur), recherche, filtres tags, tri chronologique toggle ↑↓
- [x] Panneau droit : NoteDetail permanent (contenu complet, tags cliquables, résumé IA, actions Modifier/Dupliquer/Copier/Résumer/Supprimer/+Tag)
- [x] Modale : max-width 700px, boutons alignés sur une ligne (Supprimer aligné à droite), variables CSS dédiées (`--modal-bg/border/separator`) pour contraste clair/sombre
- [x] Protection perte de modifications : confirmation lors du changement de note, retour liste, ou fermeture modale si édition en cours. Protection perte données : confirmation si fermeture avec modifications non sauvegardées (modes création ET édition, tous les triggers de fermeture : overlay, Échap, bouton ×)
- [x] Design brutalism + glassmorphism avec mode sombre/clair (toggle + persistance localStorage)
- [x] Recherche instantanée (filtre temps réel sur titre + contenu, insensible aux accents et à la casse)
- [x] Tags colorés (CRUD, 8 couleurs prédéfinies, panneau de gestion)
- [x] Assignation de tags aux notes (bouton + Tag, dropdown, badges cliquables pour retirer)
- [x] Filtrage par tags (combinable avec la recherche texte, intégré au panneau gauche)
- [x] Copier une note dans le presse-papier (bouton dans le panneau détail, copie titre + contenu)
- [x] Couleur de fond personnalisable sur les notes (8 pastels prédéfinis + aucune, sélecteur swatches, appliquée sur le détail et indicateur dans la liste, champ `couleur` TEXT nullable en base)
- [x] Notes épinglées (champ `epinglee` BOOLEAN en base, tri prioritaire en tête de liste, toggle 📌 sur card/modale/list view, indicateur visuel)
- [x] Support Markdown dans les notes (rendu formaté en lecture sur cards, modale et list view via `react-markdown`, composant `MarkdownRenderer`, gras/italique/titres/listes/code/blockquote/liens, compatible sombre/clair, textarea brut en édition, aide visuelle dans le formulaire)
- [x] Résumé IA via API Route `/api/resumer` (clé protégée côté serveur)
- [x] Animations de transition (fade-in + slide-up cards avec stagger, fade-in toggle view et panneau droit, scale-pulse épinglage, modale scale-up, boutons hover lift, `prefers-reduced-motion` respecté)
- [x] **Kanban View** — 3 colonnes fixes (À faire / En cours / Terminé), drag & drop HTML5 natif, cards compactes (titre + 2 tags + icône épinglée), clic → modale, optimistic update avec rollback, colonnes scrollables, responsive (empilé sur mobile), champs `kanban_colonne` / `kanban_ordre` en base
- [x] Raccourcis clavier (N=ouvre modale création, /=recherche, 1/2/3=card/list/kanban view, Échap=fermer/annuler, E=éditer modale, Suppr=supprimer modale, ↑↓=naviguer liste, Entrée=sélectionner, bouton ? aide contextuelle)
- [x] Statistiques personnelles (drawer latéral slide-in, chiffres clés 2×2, activité 7j BarChart, répartition tags PieChart, évolution mois, `recharts`, composant `StatsDrawer`, bouton 📊 header)
- [x] Partage public par token (champ `share_token` TEXT nullable, toggle 🔗 sur card/modale/list view, copie automatique du lien, badge "Partage actif" vert, bouton copier le lien + désactiver, route `/share/[token]` Server Component, page lecture seule avec Markdown + tags, 404 élégante, RLS publique)
- [x] Feedback visuel : messages de succès temporaires (3s), erreurs, spinner de chargement
- [x] RLS complet sur toutes les tables
- [x] Déploiement auto via `git push` → Vercel

## Architecture des appels API

```
Navigateur → /api/resumer (API Route Next.js) → api.anthropic.com
```

- La clé `ANTHROPIC_API_KEY` ne transite jamais côté client
- Modèle utilisé : `claude-sonnet-4-5-20250929`
- Prompt système : résumé concis en 2 phrases max, en français, texte brut sans markdown
- max_tokens : 150
- Nettoyage côté serveur : suppression du markdown résiduel et préfixes "Résumé :"

## Design system

Style **brutalism + glassmorphism** avec mode sombre/clair :

- `.glass-card` : fond semi-transparent, `backdrop-blur(16px)`, bordure 2px, ombre offset 4px brutale, hover lift
- `.btn-brutal` : boutons uppercase bold 700, ombre décalée 3px, animations press/hover (variantes : `primary`, `danger`, `ghost`)
- `.input-glass` : inputs vitreux avec glow accent au focus (`box-shadow` accent-glow)
- `.tag` : badges typographiques uppercase, bordure fine
- `.split-container` + `.panel-left` + `.panel-right` : layout split panel flex, panneau gauche 300px fixe, panneau droit flex-1, scrolls indépendants
- `.note-item` : items de liste avec hover, état actif (bordure accent), indicateur couleur
- `.detail-header` + `.detail-body` + `.detail-footer` : structure du panneau détail
- Variables panel dédiées : `--panel-bg`, `--panel-border`, `--panel-hover`, `--panel-active`
- Responsive mobile (`< 768px`) : panneaux empilés, classes `.hidden-mobile` pour toggle liste/détail
- Thème : classe `.dark` sur `<html>`, persisté dans `localStorage`, script inline anti-flash
- Formes floues colorées (accent + danger) en arrière-plan pour la profondeur
- Texture de bruit SVG en overlay pour le côté brutaliste

## Fonctionnalités à venir

- [ ] Éditeur de contenu enrichi (Markdown)
- [ ] Partage de notes
- [ ] Export des notes (PDF, JSON)
