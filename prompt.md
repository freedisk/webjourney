joute le partage de note par lien public avec token unique.

SCHÉMA DB :
La colonne share_token (TEXT DEFAULT NULL) a déjà été ajoutée 
dans Supabase. La policy RLS publique est aussi déjà en place.
Ne pas recréer ces éléments.

LOGIQUE DU TOKEN :
- Note privée  → share_token = NULL
- Note partagée → share_token = UUID généré (crypto.randomUUID())
- Activer le partage  → générer un token + UPDATE en base
- Désactiver le partage → share_token = NULL + UPDATE en base
- Le lien de partage : https://[domaine]/share/[token]

TOGGLE DE PARTAGE :
- Bouton 🔗 sur la card (à côté des autres boutons d'action)
- Bouton 🔗 dans la modale
- États visuels :
  · Privée : icône grisée, tooltip "Partager"
  · Partagée : icône colorée (verte ou accent), tooltip "Lien copié !"
- Clic sur une note privée :
  · Générer crypto.randomUUID() comme token
  · UPDATE notes SET share_token = token WHERE id = note.id
  · Copier automatiquement le lien dans le presse-papier
  · Feedback : "Lien copié !" (3 secondes)
- Clic sur une note déjà partagée :
  · Demander confirmation : "Désactiver le partage public ?"
  · Si oui → UPDATE notes SET share_token = NULL
  · Feedback : "Partage désactivé"

PAGE PUBLIQUE — NOUVELLE ROUTE :
Créer app/share/[token]/page.js

COMPORTEMENT :
- Page Server Component (pas de "use client")
- Récupérer la note via le token :
  const { data } = await supabase
    .from('notes')
    .select('titre, contenu, tags(*), created_at')
    .eq('share_token', token)
    .single()
- Si note non trouvée (token invalide ou partage désactivé) →
  afficher page 404 élégante :
  "Cette note n'existe pas ou n'est plus partagée."
- Si note trouvée → afficher la note en lecture seule

CONTENU DE LA PAGE PUBLIQUE :
- Header simple : logo/nom de l'app + lien "Créer mon compte"
- Titre de la note (grand, lisible)
- Contenu rendu en Markdown (réutiliser MarkdownRenderer)
- Tags (badges colorés, lecture seule)
- Date de création (format : "Partagée le 6 mars 2026")
- Footer discret : "Créé avec WebJourney"
- Pas de boutons d'action (lecture seule)
- Même charte graphique que l'app (glassmorphism, mode sombre/clair)
- Responsive mobile

SÉCURITÉ :
- La page publique utilise un client Supabase sans session 
  (createClient côté serveur, pas de cookies auth)
- Le token est un UUID opaque — impossible de deviner
- Aucune donnée de l'utilisateur n'est exposée 
  (pas de user_id, pas d'email)
- Une note désactivée (share_token = NULL) devient 
  immédiatement inaccessible

METTRE À JOUR :
- Les requêtes SELECT existantes pour inclure share_token 
  dans les données des notes (utile pour l'état du bouton)
- INSERT : share_token = null par défaut (déjà le cas)

NE PAS MODIFIER :
- Logique CRUD existante
- Système de tags
- Markdown
- Notes épinglées
- Couleurs de cards
- Résumé IA
- Raccourcis clavier
- Statistiques
- Animations

Mettre à jour le CLAUDE.md et commiter :
"Partage public par token — route /share/[token] + toggle card/modale + RLS"