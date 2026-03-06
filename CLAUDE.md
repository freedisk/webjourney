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
│   ├── globals.css              # Design system : variables CSS clair/sombre, glass-card, btn-brutal, input-glass, tag, modal, texture bruit
│   ├── layout.js                # Layout racine (Server Component) : polices Geist, metadata, script anti-flash thème
│   ├── page.js                  # Page principale : CRUD notes, édition inline, tags colorés, recherche, filtrage, résumé IA, modale détail, copier, accordéon
│   ├── login/
│   │   └── page.js              # Page connexion/inscription : formulaire email + mot de passe, toggle thème
│   ├── api/
│   │   └── resumer/
│   │       └── route.js         # API Route server-side : appel Anthropic Claude pour résumé de notes (clé secrète)
│   └── favicon.ico
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
- [x] CRUD notes (créer, lire, modifier inline, supprimer avec confirmation, dupliquer avec tags)
- [x] Affichage en cards responsive (grille adaptative 1-2 colonnes)
- [x] Mode accordéon sur les cards (contenu tronqué à 5 lignes si dense, bouton voir plus/réduire)
- [x] Design brutalism + glassmorphism avec mode sombre/clair (toggle + persistance localStorage)
- [x] Recherche instantanée (filtre temps réel sur titre + contenu, insensible aux accents et à la casse)
- [x] Tags colorés (CRUD, 8 couleurs prédéfinies, panneau de gestion)
- [x] Assignation de tags aux notes (bouton +, dropdown, badges cliquables pour retirer)
- [x] Filtrage par tags (combinable avec la recherche texte)
- [x] Modale de détail au clic sur une note (React Portal vers body, overlay sombre, fermeture Escape/overlay/×)
- [x] Édition inline dans la modale (titre + contenu, protection perte de modifications avec confirmation)
- [x] Copier une note dans le presse-papier (bouton sur card + modale, copie titre + contenu)
- [x] Couleur de fond personnalisable sur les notes (8 pastels prédéfinis + aucune, sélecteur swatches dans le formulaire, appliquée sur la card et dans la modale, champ `couleur` TEXT nullable en base)
- [x] Textarea auto-extensible en mode édition card (auto-resize via scrollHeight)
- [x] Résumé IA via API Route `/api/resumer` (clé protégée côté serveur)
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
- `.modal-overlay` + `.modal-content` : modale centrée via React Portal (`createPortal` vers `document.body`), overlay sombre `backdrop-blur(6px)`, animations fade-in + slide-up avec scale, body scrollable, responsive
- Variables modale dédiées : `--modal-bg` (fond quasi-opaque), `--modal-border`, `--modal-separator` (contrastes optimisés clair/sombre)
- Thème : classe `.dark` sur `<html>`, persisté dans `localStorage`, script inline anti-flash
- Formes floues colorées (accent + danger) en arrière-plan pour la profondeur
- Texture de bruit SVG en overlay pour le côté brutaliste

## Fonctionnalités à venir

- [ ] Tri des notes (date, titre)
- [ ] Éditeur de contenu enrichi (Markdown)
- [ ] Partage de notes
- [ ] Export des notes (PDF, JSON)
