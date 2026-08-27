# Documentation Capsule

Ce dossier regroupe la documentation vivante du projet. Les documents archivés
ne sont jamais des instructions actives.

## Commencer ici

| Document | Usage |
|---|---|
| [MEMORY.md](MEMORY.md) | État stable et reprise rapide |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Composants, flux et frontières de sécurité |
| [DEVBOOK.md](DEVBOOK.md) | Journal de développement synthétique |
| [BACKLOG.md](BACKLOG.md) | Priorités, états et critères d'acceptation |
| [DECISIONS.md](DECISIONS.md) | Décisions d'architecture durables |
| [RUNBOOK.md](RUNBOOK.md) | Exploitation, release, rollback et incidents |
| [TESTING.md](TESTING.md) | Stratégie et recettes de test |

## Guides spécialisés

| Document | Usage |
|---|---|
| [IMAGES.md](IMAGES.md) | Modèle et recette des images privées |
| [PWA.md](PWA.md) | Installation Safari et périmètre hors ligne |
| [AI_BYOK.md](AI_BYOK.md) | Configuration Anthropic, modèle Vault et recette sûre |
| [HELP_CENTER.md](HELP_CENTER.md) | Contenu, confidentialité et recette du centre d'aide |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Préflight et livraison Vercel |
| [Schéma Supabase](../supabase/schemas/README.md) | Photographie déclarative et règles de rafraîchissement |
| [Audit Supabase](../supabase/tests/production_schema_audit.sql) | Contrat SQL non destructif de production |
| [Sprint produit images](sprints/SPRINT_IMAGE_PRODUCT_2026-08-26.md) | Objectifs, critères et preuves du pipeline image amélioré |
| [Sprint UX-002](sprints/SPRINT_UX_002_2026-08-27.md) | Neo-brutalism fonctionnel, recette et preuves de livraison |
| [Sprint AI-001](sprints/SPRINT_AI_001_2026-08-27.md) | BYOK Anthropic sécurisé, quota et critères de livraison |
| [Sprint HELP-001](sprints/SPRINT_HELP_001_2026-08-27.md) | Centre d'aide contextuel et critères de livraison |
| [journal/](journal/) | Transcriptions horodatées des tâches |
| [archive/](archive/) | Documents historiques obsolètes |

## Documents racine complémentaires

- `AGENTS.md` : règles obligatoires pour les agents et automations ;
- `CONTRIBUTING.md` : cycle de contribution ;
- `MISTAKES.md` : registre des incidents et prévention ;
- `SECURITY.md` : règles de sécurité et réponse ;
- `CHANGELOG.md` : changements notables ;
- `CLAUDE.md` : contexte historique et fonctionnel détaillé.

## Hiérarchie en cas d'écart

1. code et migrations validés sur `main` ;
2. décisions acceptées et mémoire projet ;
3. architecture et runbook ;
4. guides spécialisés ;
5. devbook et journaux historiques.

Tout écart constaté doit être corrigé dans la même PR que le changement ou
enregistré dans le backlog avec un propriétaire et un critère de sortie.
