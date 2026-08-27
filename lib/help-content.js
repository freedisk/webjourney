export const HELP_PROGRESS_KEY = "capsule-help-progress-v1";

export const HELP_QUICK_START_STEPS = Object.freeze([
  {
    id: "create-note",
    title: "Créer une première note",
    description: "Donne-lui un titre puis ajoute du texte, du Markdown ou une image.",
    sectionId: "notes",
  },
  {
    id: "add-image",
    title: "Essayer une image",
    description: "Choisis un fichier, colle une capture ou dépose une photo dans l’éditeur.",
    sectionId: "images",
  },
  {
    id: "organize",
    title: "Organiser son espace",
    description: "Ajoute un tag, épingle une note ou change de vue.",
    sectionId: "organization",
  },
  {
    id: "install-pwa",
    title: "Installer Capsule",
    description: "Ajoute l’application à l’écran d’accueil depuis Safari sur iPhone ou iPad.",
    sectionId: "pwa",
  },
  {
    id: "configure-ai",
    title: "Configurer l’IA — facultatif",
    description: "Utilise ta propre clé Anthropic en session ou chiffrée dans Supabase Vault.",
    sectionId: "ai",
  },
]);

export const HELP_SHORTCUTS = Object.freeze([
  ["Ctrl / ⌘ + K", "Ouvrir la palette de commandes"],
  ["N", "Créer une note"],
  ["/", "Placer le curseur dans la recherche"],
  ["1 / 2 / 3", "Afficher les cartes, la liste ou le Kanban"],
  ["Échap", "Fermer le dialogue actif ou annuler"],
  ["↑ / ↓", "Naviguer dans une liste ou la palette"],
  ["Entrée", "Sélectionner l’élément actif"],
  ["E", "Modifier la note ouverte"],
  ["Suppr", "Demander la suppression de la note ouverte"],
]);

export const HELP_SECTIONS = Object.freeze([
  {
    id: "quick-start",
    title: "Démarrage rapide",
    icon: "sparkles",
    summary: "Les cinq repères utiles pour prendre en main Capsule à son rythme.",
    keywords: "début commencer tutoriel checklist prise en main découvrir",
    blocks: [],
  },
  {
    id: "notes",
    title: "Notes et Markdown",
    icon: "list",
    summary: "Créer, écrire, prévisualiser, modifier et dupliquer une note.",
    keywords: "note créer écrire édition sauvegarder dupliquer markdown gras italique titre liste lien code aperçu double",
    blocks: [
      {
        title: "Créer et modifier",
        body: "Une note possède un titre obligatoire, un contenu facultatif et une couleur. Les modifications restent dans l’éditeur jusqu’à l’action Sauver.",
        bullets: [
          "Utilise Nouvelle note ou la touche N hors d’un champ de saisie.",
          "Ouvre une note puis choisis Modifier pour retrouver le même éditeur.",
          "Annuler ferme l’éditeur sans enregistrer les changements en attente.",
        ],
      },
      {
        title: "Écrire en Markdown",
        body: "La barre de mise en forme applique le Markdown à la sélection. Les modes Écrire, Double et Aperçu permettent de contrôler le rendu avant la sauvegarde.",
        bullets: [
          "**texte** pour le gras, *texte* pour l’italique et ## pour un titre.",
          "- crée une liste à puces ; 1. crée une liste numérotée.",
          "Les liens, citations et blocs de code disposent aussi d’un bouton dédié.",
        ],
      },
      {
        title: "Copier et dupliquer",
        body: "Copier place le titre et le texte dans le presse-papiers. Dupliquer crée une note indépendante et recopie également ses images privées.",
      },
    ],
  },
  {
    id: "images",
    title: "Images et galerie",
    icon: "cards",
    summary: "Ajouter des photos sans rendre les fichiers privés publics.",
    keywords: "image photo fichier ajouter coller presse-papiers glisser déposer galerie compression webp zoom visionneuse",
    blocks: [
      {
        title: "Trois façons d’ajouter",
        body: "Dans l’éditeur, utilise + Image, colle une image depuis le presse-papiers ou glisse-dépose un fichier sur la zone de contenu.",
        bullets: [
          "Formats acceptés : JPEG, PNG et WebP.",
          "Une source peut peser jusqu’à 20 Mio ; la sortie optimisée reste limitée à 5 Mio.",
          "Les images sont préparées une par une pour protéger la mémoire du mobile.",
        ],
      },
      {
        title: "Avant et après la sauvegarde",
        body: "Avant Sauver ou Créer, les aperçus restent uniquement en mémoire dans la page. L’envoi vers le Storage privé commence après la création de la note.",
      },
      {
        title: "Galerie privée",
        body: "Clique une vignette pour ouvrir la visionneuse. Les flèches du clavier, les boutons et le geste horizontal permettent de parcourir plusieurs images.",
      },
    ],
  },
  {
    id: "organization",
    title: "Organiser et retrouver",
    icon: "tags",
    summary: "Recherche, tags, épingles, couleurs et vues complémentaires.",
    keywords: "organisation rechercher filtre tag étiquette épingle couleur cartes liste kanban colonne tri",
    blocks: [
      {
        title: "Recherche et tags",
        body: "La recherche porte sur les titres et le texte sans tenir compte des accents. Un filtre de tag peut être combiné avec cette recherche.",
      },
      {
        title: "Choisir la bonne vue",
        bullets: [
          "Cartes donne une vue d’ensemble visuelle.",
          "Liste conserve les notes à gauche et le détail à droite sur grand écran.",
          "Kanban répartit les notes entre À faire, En cours et Terminé.",
        ],
      },
      {
        title: "Prioriser",
        body: "Épingler place une note avant les autres. Les couleurs servent de repère visuel ; les tags restent préférables pour filtrer précisément.",
      },
    ],
  },
  {
    id: "sharing",
    title: "Partage et confidentialité",
    icon: "key",
    summary: "Comprendre ce qui reste privé et ce qui devient accessible par lien.",
    keywords: "partage public lien révoquer confidentialité privé sécurité url signé token",
    blocks: [
      {
        title: "Tout reste privé par défaut",
        body: "Les notes, tags et images sont protégés par le compte Supabase. Une image privée n’utilise jamais d’adresse publique permanente.",
      },
      {
        title: "Activer un partage",
        body: "Partager crée un lien opaque vers une seule note. Les images autorisées reçoivent des adresses temporaires au moment de la consultation.",
      },
      {
        title: "Révoquer",
        body: "Désactive le partage depuis la note pour invalider le lien. Une adresse d’image déjà émise peut rester valable quelques minutes, jusqu’à son expiration.",
      },
    ],
  },
  {
    id: "pwa",
    title: "Installation iPhone et iPad",
    icon: "command",
    summary: "Installer Capsule depuis Safari et connaître ses limites hors ligne.",
    keywords: "pwa ios iphone ipad safari écran accueil installer application standalone hors ligne offline",
    blocks: [
      {
        title: "Ajouter à l’écran d’accueil",
        bullets: [
          "Ouvre Capsule dans Safari.",
          "Touche Partager puis Ajouter à l’écran d’accueil.",
          "Confirme le nom et ouvre ensuite Capsule depuis son icône.",
        ],
      },
      {
        title: "Comportement installé",
        body: "Capsule s’ouvre dans une fenêtre autonome et respecte les zones sûres de l’écran. Le thème et les contrôles restent adaptés au tactile.",
      },
      {
        title: "Hors ligne",
        body: "Le shell et l’écran de repli sont disponibles, mais les notes privées exigent une connexion. Elles ne sont volontairement jamais copiées dans le cache du navigateur.",
      },
    ],
  },
  {
    id: "ai",
    title: "Paramètres IA",
    icon: "sparkles",
    summary: "Configurer sa clé Anthropic, son modèle et le niveau de persistance.",
    keywords: "ia intelligence artificielle anthropic claude clé api modèle byok vault session résumé mise forme markdown aperçu appliquer quota coût confidentialité",
    blocks: [
      {
        title: "Ta clé, ton usage",
        body: "Les résumés utilisent uniquement la clé Anthropic que tu fournis. Le modèle est choisi parmi ceux réellement disponibles pour cette clé.",
      },
      {
        title: "Choisir un mode",
        bullets: [
          "Cette session uniquement : la clé reste en mémoire et disparaît au rechargement.",
          "Synchronisée et chiffrée : la clé est protégée par Supabase Vault et utilisable sur tes appareils connectés.",
          "Capsule ne réaffiche jamais une clé enregistrée.",
        ],
      },
      {
        title: "Résumé et confidentialité",
        body: "Lors d’un résumé, le titre et le texte sont transmis à Anthropic. Les images ne sont pas envoyées et le résumé n’est pas enregistré automatiquement par Capsule.",
        bullets: [
          "Le quota Capsule est de dix actions IA par minute et par utilisateur.",
          "Les coûts et conditions du fournisseur restent liés à ton compte Anthropic.",
        ],
      },
      {
        title: "Mise en forme intelligente",
        body: "Depuis l’éditeur Markdown, le bouton IA propose une structure plus lisible sans résumer ni enrichir la note. Compare l’aperçu ou le Markdown, puis applique explicitement la proposition au brouillon.",
        bullets: [
          "Les références et légendes des images privées sont masquées avant l’appel Anthropic, puis restaurées après contrôle.",
          "Une note longue est traitée par sections : le dialogue affiche le temps écoulé et s'arrête automatiquement si le délai maximal est dépassé.",
          "Appliquer ne sauvegarde pas la note : utilise ensuite Sauver ou Créer pour conserver le brouillon.",
          "Fermer, annuler ou rencontrer une erreur laisse toujours le contenu courant intact.",
        ],
      },
    ],
  },
  {
    id: "printing",
    title: "Impression et PDF",
    icon: "printer",
    summary: "Préparer une version papier fidèle d'une note enregistrée.",
    keywords: "imprimer impression imprimante pdf exporter enregistrer fichier papier aperçu a4 airprint",
    blocks: [
      {
        title: "Imprimer une note",
        body: "Ouvre une note enregistrée puis choisis Imprimer / PDF. Capsule prépare le titre, la date, les tags, le Markdown et les images avant d'ouvrir le dialogue système.",
        bullets: [
          "Sauvegarde d'abord toute modification en cours : l'aperçu imprime uniquement la version enregistrée.",
          "Attends la fin de la préparation des images avant de choisir l'imprimante.",
          "Le thème papier reste clair, même lorsque Capsule utilise le thème sombre.",
        ],
      },
      {
        title: "Enregistrer en PDF",
        body: "Dans le dialogue système, utilise l'option PDF ou de partage proposée par l'ordinateur, l'iPhone ou l'iPad. Capsule ne stocke et n'envoie jamais ce fichier automatiquement.",
      },
      {
        title: "Protéger la copie",
        body: "Un PDF enregistré n'est plus protégé par le compte Capsule et ne peut pas être révoqué. Conserve-le dans un emplacement adapté à la sensibilité de la note.",
      },
    ],
  },
  {
    id: "shortcuts",
    title: "Raccourcis clavier",
    icon: "command",
    summary: "Accélérer les actions courantes sans quitter le clavier.",
    keywords: "clavier commande raccourci touche ctrl cmd k entrée échap supprimer navigation",
    blocks: [],
  },
  {
    id: "troubleshooting",
    title: "Dépannage",
    icon: "help",
    summary: "Résoudre les blocages fréquents sans risquer les données.",
    keywords: "dépannage erreur problème clé invalide modèle image format réseau connexion session pwa cache",
    blocks: [
      {
        title: "L’IA demande une configuration",
        body: "Ouvre Paramètres IA, renseigne une clé valide puis utilise Tester et charger les modèles avant d’enregistrer.",
      },
      {
        title: "Une image est refusée",
        body: "Vérifie le format et la taille. HEIC et SVG ne sont pas acceptés ; exporte l’image en JPEG, PNG ou WebP puis recommence.",
      },
      {
        title: "Une image bloque l'impression",
        body: "Choisis Actualiser les images dans l'aperçu d'impression. Si le problème persiste, vérifie la connexion puis ferme et rouvre la note.",
      },
      {
        title: "La session a expiré",
        body: "Reconnecte-toi depuis l’écran de connexion. Une clé IA en mode session devra être renseignée à nouveau, conformément au mode choisi.",
      },
      {
        title: "L’application installée ne charge pas les notes",
        body: "Contrôle la connexion réseau puis relance Capsule. Les données privées ne sont pas disponibles hors ligne par choix de sécurité.",
      },
    ],
  },
]);

export function normalizeHelpText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function searchableSectionText(section) {
  return [
    section.title,
    section.summary,
    section.keywords,
    ...section.blocks.flatMap((block) => [
      block.title,
      block.body,
      ...(block.bullets || []),
    ]),
  ].join(" ");
}

export function filterHelpSections(query, sections = HELP_SECTIONS) {
  const terms = normalizeHelpText(query).trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return sections;

  return sections.filter((section) => {
    const haystack = normalizeHelpText(searchableSectionText(section));
    return terms.every((term) => haystack.includes(term));
  });
}

export function sanitizeHelpProgress(value) {
  const validIds = new Set(HELP_QUICK_START_STEPS.map((step) => step.id));
  const completed = Array.isArray(value?.completed)
    ? [...new Set(value.completed.filter((id) => validIds.has(id)))]
    : [];

  return {
    completed,
    checklistHidden: value?.checklistHidden === true,
  };
}
