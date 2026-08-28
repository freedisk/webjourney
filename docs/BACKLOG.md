# Backlog — Capsule

## Légende

- **P0** : incident ou perte de données possible ;
- **P1** : fiabilité/sécurité à traiter rapidement ;
- **P2** : amélioration structurante à fort ROI ;
- **P3** : confort ou optimisation.

États : `TODO`, `IN_PROGRESS`, `REVIEW_REQUIRED`, `DONE`, `BLOCKED`.

## En cours

Aucun sprint actif.

## Prochaines priorités

### QA-001 — E2E des parcours critiques

- **Priorité** : P1.
- **ROI / effort** : très élevé / 1–2 jours.
- **État** : `TODO`.
- **Périmètre** : auth, note texte, fichier, collage, reload, duplication,
  suppression, partage et révocation.
- **Sortie** : environnement Supabase de test isolé et tests reproductibles.

### OPS-002 — Observabilité

- **Priorité** : P2.
- **ROI / effort** : élevé / 0,5–1 jour.
- **État** : `TODO`.
- **Sortie** : erreurs serveur, uploads, signatures et compensations suivies
  sans contenu de note ni secret.

### TOOL-002 — Stack Supabase locale conteneurisée

- **Priorité** : P2.
- **ROI / effort** : moyen / 1–2 heures, hors installation Docker Desktop.
- **État** : `TODO`.
- **Contexte** : la baseline a été validée par export strict, audit distant et
  transaction PostgreSQL annulée. Docker n'est pas installé sur ce poste.
- **Sortie** : Docker Desktop disponible, `supabase db reset` réussi depuis un
  environnement vierge, puis `supabase db lint` local archivé comme preuve.

### DATA-001 — Corbeille et restauration

- **Priorité** : P2.
- **ROI / effort** : moyen/élevé / 1–2 jours.
- **État** : `TODO`.
- **Sortie** : suppression récupérable et politique de rétention documentée.

### ARCH-001 — Extraction progressive de `app/page.js`

- **Priorité** : P2, uniquement lors d'évolutions fonctionnelles.
- **ROI / effort** : moyen / 3–5 jours cumulés.
- **État** : `TODO`.
- **Sortie** : hooks/services testés sans réécriture globale.

### EXPORT-001 — Export JSON structuré

- **Priorité** : P3.
- **ROI / effort** : moyen / à estimer.
- **État** : `TODO`.
- **Note** : le besoin PDF est couvert par `PRINT-001` ; ce ticket concerne
  uniquement un format de données réimportable.

## Terminé

| ID | Sujet | Date | Preuve |
|---|---|---|---|
| REL-001 | Version, À propos et mises à jour | 2026-08-28 | PR #24, `3abbf81`, 105 tests, preview 8/8, smoke public 21/21, Vercel `READY` |
| SHARE-001 | Aperçu social Open Graph | 2026-08-27 | PR #22, `bb0afc4`, 98 tests, smoke robot 34/34, Vercel `READY` |
| PRINT-001 | Impression et PDF fidèle | 2026-08-27 | PR #20, `532dd9a`, 91 tests, smoke public 9/9, assets live et Vercel `READY` |
| AI-002-R1 | Fiabilité des notes longues | 2026-08-27 | PR #18, `f9e4880`, 80 tests, smoke production 40/40, cas réel 37,95 s, Vercel `READY` |
| AI-002 | Mise en forme intelligente | 2026-08-27 | PR #16, `029183a`, 72 tests, smoke production 36/36, Vercel `READY` |
| HELP-001 | Centre d'aide contextuel | 2026-08-27 | PR #14, `21f5a0c`, 64 tests, gate 4/4, smoke public 8/8, recette UI et Vercel `READY` |
| AI-001 | BYOK Anthropic sécurisé | 2026-08-27 | PR #12, `02816d7`, 59 tests, audit SQL 9/9, smoke production 30/30, Vercel `READY` |
| UX-002-A11Y | Stabilisation modale et labels | 2026-08-27 | PR #10, `d270646`, 46 tests, recette privée synthétique et nettoyage vérifié |
| UX-002 | Neo-brutalism fonctionnel | 2026-08-27 | PR #8, `b07dc19`, 43 tests, recette multi-viewport, Vercel `READY` |
| UX-001 | Compression, dépôt, progression et galerie | 2026-08-26 | PR #6, `4c77786`, 31 tests, recette Chrome, Vercel `READY` |
| OPS-001 | Audit read-only des images orphelines | 2026-08-26 | PR #6, six catégories propres après déploiement |
| TOOL-001 | Runtime Node/npm verrouillé | 2026-08-26 | PR #6, Node 24.x confirmé par Vercel |
| DB-001 | Baseline Supabase et historique CLI | 2026-08-26 | PR #3, `1c634d2`, versions alignées, dry-run vide, audit 12/12, Vercel READY |
| DOC-002 | Documentation durable et journal de session | 2026-08-26 | index, architecture, mémoire, devbook, backlog, décisions, runbook, tests, mistakes |
| IMG-001 | Images privées fichier/collage | 2026-08-26 | `3a6c28e`, recette utilisateur |
| CI-001 | Quality gate obligatoire | 2026-08-26 | PR #1, ruleset actif |
| PWA-001 | Installation Safari iPhone/iPad | 2026-08-26 | PR #2, validation iPad |
| DOC-001 | Archivage du prompt obsolète | 2026-08-26 | `ff44ae9` |
