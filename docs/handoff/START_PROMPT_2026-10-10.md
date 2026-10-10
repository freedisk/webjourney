# Prompt à copier dans la nouvelle tâche

Copier tout le bloc ci-dessous dans une nouvelle tâche Local du projet
Webjourney Capsule - Prise de note. Le texte fixe seulement le périmètre
initial de reprise ; l'objectif du prochain sprint sera donné ensuite.

---

Tu reprends le projet Capsule dans une nouvelle tâche locale.

Projet Codex : Webjourney Capsule - Prise de note.
Dossier exact : C:\Users\Pc\Downloads\Claude Code Webjourney Tuto\webjourney

Lis d'abord AGENTS.md et docs/handoff/HANDOFF_2026-10-10.md. Puis lis
docs/MEMORY.md, docs/BACKLOG.md, docs/ARCHITECTURE.md, docs/DECISIONS.md,
les dernières entrées de docs/DEVBOOK.md et MISTAKES.md. Respecte les sources
de vérité, les frontières de sécurité et le workflow de PR/gate.

Commence par une reprise bornée :

1. Confirme le dossier, l'association au projet, l'état Git et la version
   publique de l'application, avec des vérifications non destructives.
2. Préserve la branche courante et les commits documentaires locaux.
   Au relevé précédant le kit, deux commits n'étaient pas publiés ; le kit
   ajoute son propre commit. Revalide le nombre actuel au lieu de le supposer.
   Ne fais pas de reset, rebase, bascule vers main ou nouveau worktree qui
   abandonnerait ces éléments. N'expose aucun secret de configuration.
3. Crée le journal de cette nouvelle tâche dans docs/journal avec sa date
   réelle et un suffixe unique si nécessaire. Consigne mes messages et tes
   réponses visibles avec les heures locales America/Miquelon et UTC.
   Conserve docs/journal/SESSION_2026-08-26.md comme historique ; ne le
   réécris pas et n'y mélange pas les échanges de la nouvelle tâche.
4. Fournis un état des lieux bref et les prochaines priorités. La première
   est SEC-001, retrait de l'exception temporaire du lint avant son échéance
   UTC du 24 octobre 2026, après disponibilité d'un correctif compatible.

État de référence : Capsule v1.0.1, build 4397f81, PR #26 et #27 fusionnées,
113 tests, smoke public 21/21, recette Chromium/WebKit live 12/12.
UX-003 est DONE ; j'ai confirmé que le défilement de la vue liste est celui
attendu. Cette validation ne précise pas l'appareil ni le mode Safari/PWA.

Ce message autorise le préflight en lecture et la création/mise à jour du
journal de reprise. Il ne demande pas de changement applicatif, de migration
Supabase, de suppression, de nouveau déploiement ni de lancement automatique
d'un sprint. Une fois la continuité confirmée, propose la prochaine action
concrète pour que je donne l'objectif de travail.

---
