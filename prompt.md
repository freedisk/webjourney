Ajoute un panneau de statistiques personnelles (drawer latéral).

INSTALLATION :
npm install recharts

ACCÈS :
- Bouton 📊 dans le header (à côté du toggle dark mode)
- Clic → ouvre un drawer depuis la droite (slide-in)
- Fermeture : bouton × + clic sur l'overlay + Échap
- Même style glassmorphism + brutalism, compatible mode sombre/clair

DONNÉES — REQUÊTES SUPABASE :
Toutes les requêtes sont filtrées par auth.uid() (RLS actif).

1. Total notes :
   SELECT COUNT(*) FROM notes WHERE user_id = auth.uid()

2. Notes créées les 7 derniers jours (activité) :
   SELECT DATE(created_at) as jour, COUNT(*) as total
   FROM notes
   WHERE user_id = auth.uid()
   AND created_at >= NOW() - INTERVAL '7 days'
   GROUP BY DATE(created_at)
   ORDER BY jour ASC

3. Répartition par tag :
   SELECT tags.nom, tags.couleur, COUNT(notes_tags.note_id) as total
   FROM tags
   LEFT JOIN notes_tags ON tags.id = notes_tags.tag_id
   WHERE tags.user_id = auth.uid()
   GROUP BY tags.id, tags.nom, tags.couleur
   ORDER BY total DESC

4. Mots écrits au total :
   Calculé côté client — sommer la longueur des contenus de toutes les notes
   en splitant sur les espaces :
   notes.reduce((acc, n) => acc + (n.contenu?.split(' ').length || 0), 0)

5. Évolution — notes ce mois-ci vs mois dernier :
   Calculé côté client depuis les données déjà chargées

CONTENU DU DRAWER :

SECTION 1 — Chiffres clés (cards mini en grille 2x2) :
- 📝 Total notes
- 📌 Notes épinglées
- 🏷️ Tags créés
- 📖 Mots écrits

SECTION 2 — Activité des 7 derniers jours :
- Graphique Recharts BarChart
- Axe X : jours (format court "lun", "mar"...)
- Axe Y : nombre de notes créées
- Couleur des barres : cohérente avec le thème app
- Si aucune activité sur un jour → barre à 0 (afficher quand même les 7 jours)

SECTION 3 — Répartition par tags :
- Graphique Recharts PieChart ou BarChart horizontal
- Couleur de chaque segment = couleur du tag
- Légende avec nom du tag + nombre de notes
- Si aucun tag → message "Aucun tag créé"

SECTION 4 — Évolution :
- Phrase simple : "Ce mois-ci : X notes — Mois dernier : Y notes"
- Indicateur visuel : ↑ vert si progression, ↓ rouge si régression, 
  = gris si identique

STYLE DU DRAWER :
- Largeur : 400px desktop, 100% mobile
- Slide-in depuis la droite (transform translateX)
- Overlay sombre semi-transparent derrière
- Header drawer : titre "📊 Mes statistiques" + bouton ×
- Body scrollable
- Spinner de chargement pendant la récupération des données
- Recharts responsive : utiliser ResponsiveContainer width="100%"

IMPLÉMENTATION :
- Nouveau composant StatsDrawer.js dans components/
- Chargement des données au moment de l'ouverture du drawer 
  (pas au chargement de la page)
- Gestion des états : loading, erreur, vide, données

NE PAS MODIFIER :
- Logique CRUD
- Système de tags
- Markdown
- Notes épinglées
- Couleurs de cards
- Résumé IA
- Raccourcis clavier
- Animations

Mettre à jour le CLAUDE.md et commiter :
"Statistiques personnelles — drawer + Recharts + agrégations Supabase"