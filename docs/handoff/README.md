# Kit de reprise — Capsule

Préparé le 10 octobre 2026 pour ouvrir une nouvelle tâche dans le même projet.
Le projet est à un point stable : UX-003 livré et défilement liste validé par
l'utilisateur. Une nouvelle tâche est conseillée pour la suite, pas imposée par
une limite de contexte mesurée.

## Démarrer la nouvelle tâche

1. Sélectionner le projet **Webjourney Capsule - Prise de note**.
2. Choisir une tâche **Local**, dans le dossier existant :

       C:\Users\Pc\Downloads\Claude Code Webjourney Tuto\webjourney

3. Copier le texte du [prompt de démarrage](START_PROMPT_2026-10-10.md) dans
   le premier message. Titre proposé : **Capsule — Reprise après UX-003**.
4. Laisser la nouvelle tâche réaliser le préflight et créer son propre journal.
   Donner ensuite l'objectif du prochain travail.

L'ancienne tâche **Reprise et continuation du projet ClaudeCode** peut être
conservée comme historique. Ce kit ne crée, ne déplace ni n'archive de tâche.

## Fichiers du kit

| Fichier | Usage |
|---|---|
| [HANDOFF_2026-10-10.md](HANDOFF_2026-10-10.md) | État, frontières, priorités et checklist de reprise |
| [START_PROMPT_2026-10-10.md](START_PROMPT_2026-10-10.md) | Message prêt à copier dans la nouvelle tâche |
| [LOCAL_STATE_2026-10-10.json](LOCAL_STATE_2026-10-10.json) | Photographie structurée avant création du kit |

## Préserver les éléments locaux

Au relevé initial, deux commits documentaires n'étaient pas publiés sur GitHub.
Le kit ajoute son propre commit local. Reprendre dans le même checkout conserve
ces éléments ainsi que les configurations locales ignorées par Git.
Une tâche créée directement depuis main, un worktree neuf ou un autre
ordinateur pourrait ne pas les retrouver. Vérifier Git avant toute bascule ;
les commandes détaillées figurent dans le document de reprise.

Les instantanés sont datés. Les fichiers vivants du projet et les observations
actuelles priment sur une photographie ancienne. Le kit ne contient aucun
secret, code d'authentification ou contenu privé de note.

## Continuité entre tâches

Une tâche distincte garde son propre historique ; les fichiers du projet et
AGENTS.md permettent une reprise durable. Ce kit fournit l'état utile sans
supposer la transmission automatique de toute cette conversation.
Voir la [documentation officielle OpenAI sur les projets et discussions](https://learn.chatgpt.com/docs/projects)
et le [guide sur la mémoire durable de projet](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex).
