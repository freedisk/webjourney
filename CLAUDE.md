# WebJourney — App de Notes

## Contexte

App de notes personnelles avec authentification. Projet d'apprentissage Next.js + Supabase + Vercel.

## Stack technique

- **Next.js 16.1.6** (App Router, React 19, React Compiler activé)
- **Supabase** (PostgreSQL + Auth email/password + Row Level Security)
- **Vercel** (déploiement via `npx vercel --prod`, projet lié : `webjourney-one.vercel.app`)
- **Tailwind CSS 4** + CSS custom (variables, glassmorphism, brutalism)
- **Geist** (police Google Fonts : sans + mono)

## Règles de code

- Commentaires en français
- Pas de TypeScript (JavaScript uniquement, jsconfig.json avec alias `@/*`)
- Composants simples, pas d'abstraction prématurée
- Pas de state management externe (Redux, Zustand)
- Toujours gérer les 4 états : chargement, erreur, vide, succès
- Les pages interactives utilisent `"use client"`, le layout reste Server Component

## Structure du projet

```
webjourney/
├── app/
│   ├── globals.css          # Design system : variables CSS, thèmes clair/sombre, classes glass-card, btn-brutal, input-glass
│   ├── layout.js            # Layout racine (Server Component) : polices Geist, metadata, script anti-flash thème
│   ├── page.js              # Page principale : notes CRUD, édition inline, tags colorés, recherche, filtrage
│   ├── login/
│   │   └── page.js          # Page connexion/inscription : formulaire email + mot de passe
│   └── favicon.ico
├── lib/
│   └── supabase.js          # Client Supabase initialisé avec NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY
├── public/                   # Assets statiques (SVG Next.js, Vercel, etc.)
├── CLAUDE.md                 # Ce fichier
├── package.json              # Dépendances : next, react, @supabase/supabase-js, tailwindcss
├── next.config.mjs           # Config Next.js (reactCompiler: true)
├── jsconfig.json             # Alias de chemin @/* → ./*
├── postcss.config.mjs        # PostCSS avec plugin Tailwind
├── eslint.config.mjs         # ESLint avec config next/core-web-vitals
└── .env.local                # Variables d'environnement Supabase (non versionné)
```

## Base de données Supabase

### Table `notes`

| Colonne      | Type         | Description                          |
|-------------|-------------|--------------------------------------|
| `id`        | uuid (PK)   | Identifiant unique, `gen_random_uuid()` |
| `user_id`   | uuid (FK)   | Référence vers `auth.users(id)`, cascade on delete |
| `titre`     | text         | Titre de la note (requis)            |
| `contenu`   | text         | Contenu de la note (optionnel)       |
| `created_at`| timestamptz  | Date de création, `now()` par défaut |

### Table `tags`

| Colonne      | Type         | Description                          |
|-------------|-------------|--------------------------------------|
| `id`        | uuid (PK)   | Identifiant unique, `gen_random_uuid()` |
| `user_id`   | uuid (FK)   | Référence vers `auth.users(id)`, cascade on delete |
| `nom`       | text         | Nom du tag (requis)                  |
| `couleur`   | text         | Code hexadécimal (ex: `#ef4444`)     |
| `created_at`| timestamptz  | Date de création, `now()` par défaut |

### Table `notes_tags` (liaison many-to-many)

| Colonne    | Type       | Description                          |
|-----------|-----------|--------------------------------------|
| `note_id` | uuid (FK) | Référence vers `notes(id)`, cascade on delete |
| `tag_id`  | uuid (FK) | Référence vers `tags(id)`, cascade on delete |

Clé primaire composite : `(note_id, tag_id)`

### Row Level Security (RLS)

- RLS activé sur les 3 tables (`notes`, `tags`, `notes_tags`)
- Table `notes` : `auth.uid() = user_id` pour toutes les opérations
- Table `tags` : `auth.uid() = user_id` pour toutes les opérations
- Table `notes_tags` : accès via jointure (l'utilisateur ne peut lier que ses propres notes et tags)
- Chaque utilisateur ne voit et ne modifie que ses propres données

## Design system

Style **brutalism + glassmorphism** avec mode sombre/clair :
- `.glass-card` : fond semi-transparent, backdrop-blur, bordure épaisse, ombre offset brutale
- `.btn-brutal` : boutons uppercase bold avec ombre décalée (variantes : `primary`, `danger`, `ghost`)
- `.input-glass` : inputs vitreux avec glow accent au focus
- `.tag` : badges typographiques uppercase
- Thème géré par classe `.dark` sur `<html>`, persisté dans `localStorage`
- Formes floues colorées en arrière-plan pour la profondeur

## Fonctionnalités en place

- [x] Auth email / mot de passe (connexion + inscription)
- [x] Redirection automatique si non connecté
- [x] CRUD complet des notes (ajout, lecture, modification, suppression)
- [x] Édition inline dans les cards
- [x] Duplication de notes (préfixe "Copie de — ")
- [x] Confirmation avant suppression
- [x] Grille responsive (1 / 2 / 3 colonnes)
- [x] Mode sombre / clair avec toggle et persistance
- [x] Feedback visuel : messages de succès temporaires (3s), erreurs
- [x] Recherche instantanée (titre + contenu, insensible aux accents et à la casse)
- [x] Tags colorés : CRUD, 8 couleurs prédéfinies, panneau de gestion
- [x] Assignation de tags aux notes (bouton +, dropdown, badges cliquables pour retirer)
- [x] Filtrage par tag (cumulable avec la recherche textuelle)
- [x] Duplication de notes avec copie des tags
- [x] Déploiement Vercel en production

## Fonctionnalités à venir

- [ ] Tri des notes (date, titre)
- [ ] Éditeur de contenu enrichi (Markdown)
- [ ] Partage de notes
