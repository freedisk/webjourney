# Backlog — Capsule

## Légende

- **P0** : incident ou perte de données possible ;
- **P1** : fiabilité/sécurité à traiter rapidement ;
- **P2** : amélioration structurante à fort ROI ;
- **P3** : confort ou optimisation.

États : `TODO`, `IN_PROGRESS`, `REVIEW_REQUIRED`, `DONE`, `BLOCKED`.

## En revue

### UX-001 — Pipeline image amélioré

- **Priorité** : P2.
- **ROI / effort** : élevé côté UX / 1–2 jours.
- **État** : `REVIEW_REQUIRED`.
- **Périmètre** : compression locale, progression, glisser-déposer, erreurs
  détaillées et galerie responsive accessible.
- **Plan de sprint** : `docs/sprints/SPRINT_IMAGE_PRODUCT_2026-08-26.md`.

### OPS-001 — Images orphelines

- **Priorité** : P1.
- **ROI / effort** : élevé / 1 jour.
- **État** : `REVIEW_REQUIRED`.
- **Sortie livrée** : rapport read-only Markdown / métadonnées / Storage,
  code de sortie non nul en cas d'écart et aucune suppression automatique.

### TOOL-001 — Verrouiller le runtime Node

- **Priorité** : P2.
- **ROI / effort** : moyen/élevé / 1–2 heures.
- **État** : `REVIEW_REQUIRED`.
- **Sortie livrée** : Node 24.19 et npm 11 cohérents entre fichiers de version,
  `package.json` et CI.

## Prochaines priorités

### QA-001 — E2E des parcours critiques

- **Priorité** : P1.
- **ROI / effort** : très élevé / 1–2 jours.
- **État** : `TODO`.
- **Périmètre** : auth, note texte, fichier, collage, reload, duplication,
  suppression, partage et révocation.
- **Sortie** : environnement Supabase de test isolé et tests reproductibles.

### SEC-001 — Rate-limit et quota Anthropic

- **Priorité** : P1.
- **ROI / effort** : élevé / 0,5–1 jour.
- **État** : `TODO`.
- **Sortie** : limite par utilisateur, réponse 429, métriques et tests.

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

### EXPORT-001 — Export JSON/PDF

- **Priorité** : P3.
- **ROI / effort** : moyen / à estimer.
- **État** : `TODO`.

## Terminé

| ID | Sujet | Date | Preuve |
|---|---|---|---|
| DB-001 | Baseline Supabase et historique CLI | 2026-08-26 | PR #3, `1c634d2`, versions alignées, dry-run vide, audit 12/12, Vercel READY |
| DOC-002 | Documentation durable et journal de session | 2026-08-26 | index, architecture, mémoire, devbook, backlog, décisions, runbook, tests, mistakes |
| IMG-001 | Images privées fichier/collage | 2026-08-26 | `3a6c28e`, recette utilisateur |
| CI-001 | Quality gate obligatoire | 2026-08-26 | PR #1, ruleset actif |
| PWA-001 | Installation Safari iPhone/iPad | 2026-08-26 | PR #2, validation iPad |
| DOC-001 | Archivage du prompt obsolète | 2026-08-26 | `ff44ae9` |
