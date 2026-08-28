"use client";

// Page principale — Card view + List view avec toggle, tags colorés, recherche, design brutalism + glassmorphism
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AIFormattingDialog from "@/components/AIFormattingDialog";
import AISettingsDialog from "@/components/AISettingsDialog";
import AboutDialog from "@/components/AboutDialog";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";
import CommandPalette from "@/components/CommandPalette";
import HelpCenterDialog from "@/components/HelpCenterDialog";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import MobileNavigation from "@/components/MobileNavigation";
import NoteContentEditor from "@/components/NoteContentEditor";
import PrintNoteDialog from "@/components/PrintNoteDialog";
import StatsDrawer from "@/components/StatsDrawer";
import EmptyState from "@/components/ui/EmptyState";
import Icon from "@/components/ui/Icon";
import { AppSkeleton } from "@/components/ui/Skeleton";
import ToastViewport, { useToasts } from "@/components/ui/ToastViewport";
import {
  createSignedImageMap,
  duplicateStoredImages,
  removeStoredImageFiles,
  removeStoredImages,
  uploadPendingImages,
} from "@/lib/note-image-storage";
import { extractImageIds, stripImagesForText } from "@/lib/note-images";
import { getModalFocusable, isolateBodyContent, isWithinModalFocus } from "@/lib/modal-isolation";
import { runViewTransition, shareOrCopy } from "@/lib/ui-capabilities";
import { ANTHROPIC_KEY_HEADER } from "@/lib/ai-config";
import {
  AI_FORMAT_CLIENT_TIMEOUT_MS,
  containsFormattableText,
} from "@/lib/ai-formatting";

// Couleurs de fond prédéfinies pour les notes (pastels clair/sombre)
const COULEURS_NOTES = [
  { nom: "Aucune", hex: null },
  { nom: "Jaune doux", hex: "#fef9c3", hexDark: "#3d3a20" },
  { nom: "Vert menthe", hex: "#dcfce7", hexDark: "#1a3326" },
  { nom: "Bleu ciel", hex: "#dbeafe", hexDark: "#1a2640" },
  { nom: "Rose poudré", hex: "#fce7f3", hexDark: "#3d1a2e" },
  { nom: "Lavande", hex: "#ede9fe", hexDark: "#2a1f4d" },
  { nom: "Pêche", hex: "#ffedd5", hexDark: "#3d2a1a" },
  { nom: "Gris perle", hex: "#f1f5f9", hexDark: "#1e2430" },
  { nom: "Rouge crème", hex: "#fef2f2", hexDark: "#3d1f1f" },
];

// Couleurs prédéfinies pour les tags
const COULEURS_TAGS = [
  { nom: "Rouge", hex: "#ef4444" },
  { nom: "Orange", hex: "#f59e0b" },
  { nom: "Vert", hex: "#22c55e" },
  { nom: "Bleu", hex: "#3b82f6" },
  { nom: "Violet", hex: "#8b5cf6" },
  { nom: "Rose", hex: "#ec4899" },
  { nom: "Gris", hex: "#6b7280" },
  { nom: "Cyan", hex: "#06b6d4" },
];

// Colonnes Kanban
const KANBAN_COLONNES = [
  { id: "todo", nom: "\u00c0 faire", couleur: "var(--text-muted)" },
  { id: "inprogress", nom: "En cours", couleur: "#f59e0b" },
  { id: "done", nom: "Termin\u00e9", couleur: "var(--success)" },
];

function formatImageOperationProgress(progress) {
  const percent = Math.max(0, Math.min(100, progress.percent || 0));
  if (progress.phase === "metadata") {
    return { percent, label: "Finalisation de la galerie…" };
  }
  if (progress.phase === "rollback") {
    return { percent, label: "Annulation de l'envoi incomplet…" };
  }
  if (progress.phase === "complete") {
    return { percent: 100, label: "Images prêtes" };
  }
  const action = progress.phase === "copying" ? "Copie" : "Envoi";
  return {
    percent,
    label: `${action} de l'image ${progress.current}/${progress.total}`,
  };
}

function createClientAIError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export default function Home() {
  const router = useRouter();
  const [utilisateur, setUtilisateur] = useState(null);
  const [notes, setNotes] = useState([]);
  const notesRef = useRef([]);
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [couleurNote, setCouleurNote] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [sombre, setSombre] = useState(false);
  const { toasts, pushToast, dismissToast } = useToasts();

  // --- Taille des caractères notes ---
  const [noteFontSize, setNoteFontSize] = useState(14);

  // Édition inline
  const [editionId, setEditionId] = useState(null);
  const [editionTitre, setEditionTitre] = useState("");
  const [editionContenu, setEditionContenu] = useState("");
  const [editionCouleur, setEditionCouleur] = useState(null);

  // Confirmation de suppression
  const [confirmSuppId, setConfirmSuppId] = useState(null);

  // Recherche instantanée
  const [recherche, setRecherche] = useState("");

  // --- Tags ---
  const [tags, setTags] = useState([]);
  const [notesTags, setNotesTags] = useState({});
  const [panneauTagsOuvert, setPanneauTagsOuvert] = useState(false);
  const [nouveauTagNom, setNouveauTagNom] = useState("");
  const [nouveauTagCouleur, setNouveauTagCouleur] = useState(COULEURS_TAGS[0].hex);
  const [confirmSuppTagId, setConfirmSuppTagId] = useState(null);
  const [dropdownTagNoteId, setDropdownTagNoteId] = useState(null);
  const dropdownRef = useRef(null);
  const rechercheRef = useRef(null);
  const titreRef = useRef(null);
  const modalPanelRef = useRef(null);
  const modalOverlayRef = useRef(null);
  const modalCloseRef = useRef(null);
  const [filtreTagId, setFiltreTagId] = useState(null);

  // --- Toggle Card / List ---
  const [viewMode, setViewMode] = useState("card");

  // --- Card view : modale + accordéon ---
  const [noteDetailId, setNoteDetailId] = useState(null);
  const [notesDepliees, setNotesDepliees] = useState({});

  // --- Split panel (list view) ---
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [triAscendant, setTriAscendant] = useState(false);
  const [mobileDetail, setMobileDetail] = useState(false);

  // --- Centre d’aide contextuel ---
  const [aideOuverte, setAideOuverte] = useState(false);
  const [helpInitialSection, setHelpInitialSection] = useState("quick-start");

  // --- Version, à propos et mises à jour ---
  const [aboutOpen, setAboutOpen] = useState(false);

  // --- Impression de la version enregistrée ---
  const [printNoteId, setPrintNoteId] = useState(null);

  // --- Palette de commandes ---
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // --- Drawer statistiques ---
  const [statsOuvert, setStatsOuvert] = useState(false);

  // --- Animation pulse épinglage ---
  const [pulseNoteId, setPulseNoteId] = useState(null);

  // --- Modale création ---
  const [modeCreation, setModeCreation] = useState(false);

  // --- Kanban drag & drop ---
  const [dragNoteId, setDragNoteId] = useState(null);
  const [dragOverColonne, setDragOverColonne] = useState(null);
  const kanbanPointerRef = useRef(null);

  // --- Résumé IA ---
  const [resumes, setResumes] = useState({});
  const [aiSettingsOpen, setAISettingsOpen] = useState(false);
  const [sessionAICredential, setSessionAICredential] = useState(null);
  const [aiFormatting, setAIFormatting] = useState(null);
  const aiFormattingRequestRef = useRef({ id: 0, controller: null });

  // --- Images privées des notes ---
  const [noteImages, setNoteImages] = useState({});
  const [imageUrls, setImageUrls] = useState({});
  const [creationPendingImages, setCreationPendingImages] = useState([]);
  const [editionPendingImages, setEditionPendingImages] = useState([]);
  const [noteSaving, setNoteSaving] = useState(false);
  const [imagePreparing, setImagePreparing] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(null);
  const [imageFeatureError, setImageFeatureError] = useState(null);
  const noteBusy = noteSaving || imagePreparing;

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Les anciens appels métier conservent une API simple et alimentent les toasts.
  function setSucces(message) {
    if (message) pushToast(message, { tone: "success" });
  }

  function setErreur(message) {
    if (message) pushToast(message, { tone: "error", duration: 8000 });
  }

  function openHelp(sectionId = "quick-start") {
    setHelpInitialSection(sectionId);
    setAideOuverte(true);
  }

  // Obtenir la couleur de fond d'une note selon le thème actuel
  function getCouleurFond(couleur) {
    if (!couleur) return undefined;
    const entry = COULEURS_NOTES.find((c) => c.hex === couleur);
    if (entry && sombre) return entry.hexDark;
    return couleur;
  }

  // Normaliser une chaîne : minuscule + sans accents (pour la recherche)
  function normaliser(str) {
    return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  // Filtrer et trier les notes
  const notesFiltrees = notes
    .filter((note) => {
      if (recherche.trim()) {
        const terme = normaliser(recherche);
        const searchableContent = stripImagesForText(note.contenu);
        const matchTexte = normaliser(note.titre).includes(terme) || normaliser(searchableContent).includes(terme);
        if (!matchTexte) return false;
      }
      if (filtreTagId) {
        const tagsDeLaNote = notesTags[note.id] || [];
        if (!tagsDeLaNote.includes(filtreTagId)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Épinglées en premier
      if (a.epinglee && !b.epinglee) return -1;
      if (!a.epinglee && b.epinglee) return 1;
      // Tri chronologique à l'intérieur de chaque groupe
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return triAscendant ? dateA - dateB : dateB - dateA;
    });

  // Note actuellement sélectionnée (list view)
  const noteSelectionnee = selectedNoteId ? notes.find((n) => n.id === selectedNoteId) : null;

  // Note détaillée dans la modale (card view)
  const noteModale = noteDetailId ? notes.find((n) => n.id === noteDetailId) : null;

  // Note préparée dans le dialogue d'impression.
  const printNote = printNoteId ? notes.find((n) => n.id === printNoteId) : null;

  // Vérifier la session et charger les données au montage
  useEffect(() => {
    let active = true;
    let imageRefreshTimer = null;
    setSombre(document.documentElement.classList.contains("dark"));

    // Restaurer la taille des caractères depuis localStorage
    const savedSize = localStorage.getItem("noteFontSize");
    if (savedSize) {
      const parsed = parseInt(savedSize, 10);
      if (!isNaN(parsed) && parsed >= 11 && parsed <= 22) setNoteFontSize(parsed);
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      if (!active) return;
      setUtilisateur(user);
      await Promise.all([
        chargerNotes(user.id),
        chargerTags(user.id),
        chargerNotesTags(),
        chargerNoteImages(),
      ]);
      if (!active) return;
      setChargement(false);

      // Les raccourcis PWA sont progressifs et ne modifient jamais le cache privé.
      const launchUrl = new URL(window.location.href);
      const launchAction = launchUrl.searchParams.get("action");
      if (launchAction === "new") setModeCreation(true);
      if (launchAction === "search") setCommandPaletteOpen(true);
      if (launchAction) {
        launchUrl.searchParams.delete("action");
        window.history.replaceState({}, "", launchUrl.pathname + launchUrl.search + launchUrl.hash);
      }

      // Renouveler les URL signées avant leur expiration d'une heure.
      imageRefreshTimer = setInterval(() => chargerNoteImages(), 50 * 60 * 1000);
    }

    init();
    return () => {
      active = false;
      if (imageRefreshTimer) clearInterval(imageRefreshTimer);
    };
  // Le chargement initial reste volontairement lié au cycle du routeur.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Fermer le dropdown de tags au clic extérieur
  useEffect(() => {
    function handleClickExterieur(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownTagNoteId(null);
      }
    }
    document.addEventListener("mousedown", handleClickExterieur);
    return () => document.removeEventListener("mousedown", handleClickExterieur);
  }, []);

  // Maintenir le callback de fermeture à jour sans réinitialiser le focus à chaque saisie.
  useEffect(() => {
    modalCloseRef.current = modeCreation ? fermerModaleCreation : fermerModale;
  // Les fonctions lisent volontairement les états de formulaire listés ici.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeCreation, noteDetailId, editionId, editionTitre, editionContenu, editionCouleur, editionPendingImages.length, creationPendingImages.length, noteBusy]);

  // Modales historiques : scroll, focus initial, confinement et restitution.
  useEffect(() => {
    if (!noteDetailId && !modeCreation) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const restoreIsolation = isolateBodyContent(modalOverlayRef.current);
    requestAnimationFrame(() => {
      const panel = modalPanelRef.current;
      const target = panel?.querySelector("input, textarea, button:not([disabled]), select") || panel;
      target?.focus({ preventScroll: true });
    });

    function handleModalKeyDown(event) {
      if (document.querySelector(".image-lightbox")) return;
      if (!isWithinModalFocus(modalPanelRef.current, document.activeElement)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        modalCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab" || !modalPanelRef.current) return;
      const focusable = getModalFocusable(modalPanelRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleModalKeyDown);
    return () => {
      restoreIsolation();
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleModalKeyDown);
      if (document.contains(previousFocus)) previousFocus?.focus({ preventScroll: true });
    };
  }, [noteDetailId, modeCreation]);

  // Raccourcis clavier globaux
  useEffect(() => {
    function handleKeyDown(e) {
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);
      const hasBlockingDialog = aboutOpen || aideOuverte || statsOuvert || aiSettingsOpen || aiFormatting || printNoteId || noteDetailId || modeCreation;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (hasBlockingDialog && !commandPaletteOpen) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
        return;
      }

      if (commandPaletteOpen) return;

      // Échap — fermer aide, annuler édition (modale gérée séparément)
      if (e.key === "Escape") {
        if (aboutOpen || aideOuverte || aiSettingsOpen || aiFormatting || printNoteId) return;
        if (!noteDetailId && editionId) { annulerEdition(); return; }
        return;
      }

      // Les raccourcis de navigation ne doivent jamais agir derrière une modale.
      if (hasBlockingDialog) return;

      // Ne pas intercepter si on tape dans un champ
      if (isTyping) return;

      // N → ouvrir la modale de création
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setModeCreation(true);
        return;
      }

      // / → focus sur la recherche
      if (e.key === "/") {
        e.preventDefault();
        rechercheRef.current?.focus();
        return;
      }

      // 1 → Card View
      if (e.key === "1") {
        changerVue("card");
        return;
      }

      // 2 → List View
      if (e.key === "2") {
        changerVue("list");
        return;
      }

      // 3 → Kanban View
      if (e.key === "3") {
        changerVue("kanban");
        return;
      }

      // Raccourcis modale ouverte
      if (noteDetailId && noteModale) {
        if (e.key === "e" || e.key === "E") {
          if (!editionId) { commencerEdition(noteModale); }
          return;
        }
        if (e.key === "Delete") {
          setConfirmSuppId(noteModale.id);
          setEditionId(null);
          return;
        }
      }

      // Raccourcis list view — navigation ↑↓ + Entrée
      if (viewMode === "list" && notesFiltrees.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const currentIndex = notesFiltrees.findIndex((n) => n.id === selectedNoteId);
          const nextIndex = currentIndex < notesFiltrees.length - 1 ? currentIndex + 1 : 0;
          setSelectedNoteId(notesFiltrees[nextIndex].id);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          const currentIndex = notesFiltrees.findIndex((n) => n.id === selectedNoteId);
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : notesFiltrees.length - 1;
          setSelectedNoteId(notesFiltrees[prevIndex].id);
          return;
        }
        if (e.key === "Enter" && selectedNoteId) {
          setMobileDetail(true);
          return;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  // Basculer le thème sombre/clair
  function changerVue(nextView) {
    if (nextView === viewMode) return;
    runViewTransition(() => {
      setViewMode(nextView);
      annulerEdition();
      if (nextView !== "card") setNoteDetailId(null);
      if (nextView !== "list") setMobileDetail(false);
    });
  }

  function toggleTheme() {
    const isDark = !sombre;
    setSombre(isDark);
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }

  // Changer la taille des caractères des notes
  function changerTailleNote(delta) {
    setNoteFontSize((prev) => {
      const next = Math.max(11, Math.min(22, prev + delta));
      localStorage.setItem("noteFontSize", String(next));
      return next;
    });
  }

  // Boutons A- / A+ (réutilisable)
  function renderBoutonsTaille() {
    return (
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => changerTailleNote(-1)}
          disabled={noteFontSize <= 11}
          className="btn-brutal ghost disabled:opacity-30"
          style={{ fontSize: "0.65rem", padding: "0.2rem 0.4rem", fontWeight: 800 }}
          title="R\u00e9duire la taille du texte"
        >
          A-
        </button>
        <button
          onClick={() => changerTailleNote(1)}
          disabled={noteFontSize >= 22}
          className="btn-brutal ghost disabled:opacity-30"
          style={{ fontSize: "0.65rem", padding: "0.2rem 0.4rem", fontWeight: 800 }}
          title="Augmenter la taille du texte"
        >
          A+
        </button>
      </div>
    );
  }

  function ouvrirImpression(note) {
    if (!note) return;
    if (editionId === note.id) {
      setErreur("Sauvegarde ou annule les modifications avant d'imprimer cette note.");
      return;
    }
    setDropdownTagNoteId(null);
    setPrintNoteId(note.id);
  }

  // === CHARGEMENT DES DONNÉES ===

  async function chargerNotes(userId) {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      setErreur("Impossible de charger les notes : " + error.message);
      return;
    }
    setNotes(data);
  }

  async function chargerTags(userId) {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", userId)
      .order("nom");

    if (error) {
      setErreur("Impossible de charger les tags : " + error.message);
      return;
    }
    setTags(data);
  }

  async function chargerNotesTags() {
    const { data, error } = await supabase
      .from("notes_tags")
      .select("*");

    if (error) {
      setErreur("Impossible de charger les associations : " + error.message);
      return;
    }

    const map = {};
    for (const row of data) {
      if (!map[row.note_id]) map[row.note_id] = [];
      map[row.note_id].push(row.tag_id);
    }
    setNotesTags(map);
  }

  async function chargerNoteImages() {
    const { data, error } = await supabase
      .from("note_images")
      .select("id, note_id, storage_path, original_name, mime_type, size_bytes, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      setNoteImages({});
      setImageUrls({});
      setImageFeatureError(
        error.code === "42P01" || error.code === "PGRST205"
          ? "Les images ne sont pas encore configurées dans Supabase. Applique la migration avant utilisation."
          : "Impossible de charger les images : " + error.message
      );
      return false;
    }

    const map = {};
    for (const image of data || []) {
      if (!map[image.note_id]) map[image.note_id] = [];
      map[image.note_id].push(image);
    }
    setNoteImages(map);
    setImageFeatureError(null);

    try {
      setImageUrls(await createSignedImageMap(supabase, data || []));
    } catch (signError) {
      setImageUrls({});
      setImageFeatureError(signError.message);
      return false;
    }
    return true;
  }

  function clearPendingImagePreviews(images, setter) {
    for (const image of images) {
      if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
    }
    setter([]);
  }

  // === SÉLECTION DE NOTE (list view, avec protection édition) ===

  function selectionnerNote(noteId) {
    if (noteBusy) return;
    if (editionId) {
      const note = notes.find((n) => n.id === selectedNoteId);
      const titreModifie = note && editionTitre !== note.titre;
      const contenuModifie = note && editionContenu !== (note.contenu || "");
      const couleurModifiee = note && editionCouleur !== (note.couleur || null);
      if (titreModifie || contenuModifie || couleurModifiee || editionPendingImages.length > 0) {
        if (!window.confirm("Tu as des modifications non sauvegardées. Changer de note quand même ?")) {
          return;
        }
      }
      annulerEdition();
    }
    setSelectedNoteId(noteId);
    setConfirmSuppId(null);
    setMobileDetail(true);
  }

  // Retour à la liste sur mobile (list view)
  function retourListe() {
    if (noteBusy) return;
    if (editionId) {
      const note = notes.find((n) => n.id === selectedNoteId);
      const titreModifie = note && editionTitre !== note.titre;
      const contenuModifie = note && editionContenu !== (note.contenu || "");
      const couleurModifiee = note && editionCouleur !== (note.couleur || null);
      if (titreModifie || contenuModifie || couleurModifiee || editionPendingImages.length > 0) {
        if (!window.confirm("Tu as des modifications non sauvegardées. Revenir quand même ?")) {
          return;
        }
      }
      annulerEdition();
    }
    setMobileDetail(false);
  }

  // Fermer la modale (card view, avec protection édition)
  function fermerModale() {
    if (noteBusy) return;
    if (editionId) {
      const note = notes.find((n) => n.id === noteDetailId);
      const titreModifie = note && editionTitre !== note.titre;
      const contenuModifie = note && editionContenu !== (note.contenu || "");
      const couleurModifiee = note && editionCouleur !== (note.couleur || null);
      if (titreModifie || contenuModifie || couleurModifiee || editionPendingImages.length > 0) {
        if (!window.confirm("Tu as des modifications non sauvegardées. Fermer quand même ?")) {
          return;
        }
      }
      annulerEdition();
    }
    setNoteDetailId(null);
    setConfirmSuppId(null);
  }

  // Fermer la modale de création (sans créer, avec protection)
  function fermerModaleCreation() {
    if (noteBusy) return;
    const modifie = titre.trim() !== "" || contenu.trim() !== "" || couleurNote !== null || creationPendingImages.length > 0;
    if (modifie) {
      if (!window.confirm("Des modifications non sauvegard\u00e9es seront perdues. Quitter quand m\u00eame ?")) {
        return;
      }
    }
    setModeCreation(false);
    setTitre("");
    setContenu("");
    setCouleurNote(null);
    clearPendingImagePreviews(creationPendingImages, setCreationPendingImages);
  }

  // === CRUD NOTES ===

  async function ajouterNote(e) {
    if (e) e.preventDefault();
    setErreur(null);
    if (!titre.trim() || noteBusy) return;

    setNoteSaving(true);
    setImageUploadProgress({ percent: 3, label: "Création de la note…" });
    const noteId = crypto.randomUUID();
    let noteCreated = false;

    try {
      const { error } = await supabase.from("notes").insert({
        id: noteId,
        titre: titre.trim(),
        contenu: contenu.trim(),
        couleur: couleurNote,
        user_id: utilisateur.id,
      });

      if (error) throw new Error(error.message);
      noteCreated = true;

      await uploadPendingImages({
        supabase,
        userId: utilisateur.id,
        noteId,
        content: contenu,
        pendingImages: creationPendingImages,
        onProgress: (progress) => setImageUploadProgress(formatImageOperationProgress(progress)),
      });

      setImageUploadProgress({ percent: 96, label: "Actualisation de la galerie…" });

      setTitre("");
      setContenu("");
      setCouleurNote(null);
      setModeCreation(false);
      clearPendingImagePreviews(creationPendingImages, setCreationPendingImages);
      setSucces("Note ajout\u00e9e !");
      await Promise.all([chargerNotes(utilisateur.id), chargerNoteImages()]);
    } catch (saveError) {
      if (noteCreated) {
        await supabase.from("notes").delete().eq("id", noteId);
      }
      setErreur("Erreur lors de l'ajout : " + saveError.message);
    } finally {
      setNoteSaving(false);
      setImageUploadProgress(null);
    }
  }

  async function supprimerNote(noteId) {
    setErreur(null);
    if (noteBusy) return;
    setNoteSaving(true);

    try {
      await removeStoredImageFiles(supabase, noteImages[noteId] || []);
      const { error } = await supabase.from("notes").delete().eq("id", noteId);
      if (error) throw new Error(error.message);

      setConfirmSuppId(null);
      // Désélectionner si c'est la note active
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null);
        setMobileDetail(false);
      }
      // Fermer la modale si c'est la note affichée
      if (noteDetailId === noteId) {
        setNoteDetailId(null);
      }
      setSucces("Note supprimée.");
      await Promise.all([
        chargerNotes(utilisateur.id),
        chargerNotesTags(),
        chargerNoteImages(),
      ]);
    } catch (deleteError) {
      setErreur("Erreur lors de la suppression : " + deleteError.message);
    } finally {
      setNoteSaving(false);
    }
  }

  async function dupliquerNote(note) {
    setErreur(null);
    if (noteBusy) return;
    setNoteSaving(true);
    setImageUploadProgress({ percent: 3, label: "Création de la copie…" });

    const targetNoteId = crypto.randomUUID();
    const sourceImages = noteImages[note.id] || [];
    const containsImages = extractImageIds(note.contenu).length > 0;
    let duplicatedImages = [];
    let targetCreated = false;

    try {
      const sourceImageIds = new Set(sourceImages.map((image) => image.id));
      if (extractImageIds(note.contenu).some((imageId) => !sourceImageIds.has(imageId))) {
        throw new Error("Une image de la note est indisponible. Recharge la page avant de dupliquer.");
      }

      const { error: insertError } = await supabase.from("notes").insert({
        id: targetNoteId,
        titre: "Copie de — " + note.titre,
        contenu: containsImages ? stripImagesForText(note.contenu) : note.contenu,
        couleur: note.couleur,
        user_id: utilisateur.id,
      });

      if (insertError) throw new Error(insertError.message);
      targetCreated = true;

      const duplicateResult = await duplicateStoredImages({
        supabase,
        userId: utilisateur.id,
        targetNoteId,
        content: note.contenu || "",
        sourceImages,
        onProgress: (progress) => setImageUploadProgress(formatImageOperationProgress(progress)),
      });
      duplicatedImages = duplicateResult.images;

      if (containsImages) {
        const { error: updateError } = await supabase
          .from("notes")
          .update({ contenu: duplicateResult.content })
          .eq("id", targetNoteId);
        if (updateError) throw new Error(updateError.message);
      }

      const originalTagIds = notesTags[note.id] || [];
      if (originalTagIds.length > 0) {
        const { error: tagsError } = await supabase.from("notes_tags").insert(
          originalTagIds.map((tagId) => ({ note_id: targetNoteId, tag_id: tagId }))
        );
        if (tagsError) throw new Error(tagsError.message);
      }

      setSucces("Note dupliquée !");
      await Promise.all([
        chargerNotes(utilisateur.id),
        chargerNotesTags(),
        chargerNoteImages(),
      ]);
    } catch (duplicateError) {
      if (duplicatedImages.length > 0) {
        await removeStoredImages(supabase, duplicatedImages).catch(() => {});
      }
      if (targetCreated) {
        await supabase.from("notes").delete().eq("id", targetNoteId);
      }
      setErreur("Erreur lors de la duplication : " + duplicateError.message);
    } finally {
      setNoteSaving(false);
      setImageUploadProgress(null);
    }
  }

  function commencerEdition(note) {
    clearPendingImagePreviews(editionPendingImages, setEditionPendingImages);
    setEditionId(note.id);
    setEditionTitre(note.titre);
    setEditionContenu(note.contenu || "");
    setEditionCouleur(note.couleur || null);
    setConfirmSuppId(null);
  }

  function annulerEdition() {
    setEditionId(null);
    setEditionTitre("");
    setEditionContenu("");
    setEditionCouleur(null);
    clearPendingImagePreviews(editionPendingImages, setEditionPendingImages);
  }

  async function sauvegarderEdition(noteId) {
    setErreur(null);
    if (!editionTitre.trim() || noteBusy) return;
    setNoteSaving(true);
    setImageUploadProgress({ percent: 3, label: "Préparation de la sauvegarde…" });

    let uploadedImages = [];

    try {
      uploadedImages = await uploadPendingImages({
        supabase,
        userId: utilisateur.id,
        noteId,
        content: editionContenu,
        pendingImages: editionPendingImages,
        onProgress: (progress) => setImageUploadProgress(formatImageOperationProgress(progress)),
      });

      setImageUploadProgress({ percent: 92, label: "Sauvegarde de la note…" });

      const { error } = await supabase
        .from("notes")
        .update({ titre: editionTitre.trim(), contenu: editionContenu.trim(), couleur: editionCouleur })
        .eq("id", noteId);

      if (error) throw new Error(error.message);

      const referencedIds = new Set(extractImageIds(editionContenu));
      const removedImages = (noteImages[noteId] || []).filter((image) => !referencedIds.has(image.id));
      let cleanupWarning = null;

      if (removedImages.length > 0) {
        try {
          await removeStoredImages(supabase, removedImages);
        } catch (cleanupError) {
          cleanupWarning = cleanupError.message;
        }
      }

      clearPendingImagePreviews(editionPendingImages, setEditionPendingImages);
      setEditionId(null);
      setEditionTitre("");
      setEditionContenu("");
      setEditionCouleur(null);
      setSucces(cleanupWarning ? "Note modifiée, avec un nettoyage d'image à reprendre." : "Note modifiée !");
      if (cleanupWarning) setErreur(cleanupWarning);
      await Promise.all([chargerNotes(utilisateur.id), chargerNoteImages()]);
    } catch (saveError) {
      if (uploadedImages.length > 0) {
        await removeStoredImages(supabase, uploadedImages).catch(() => {});
      }
      setErreur("Erreur lors de la modification : " + saveError.message);
    } finally {
      setNoteSaving(false);
      setImageUploadProgress(null);
    }
  }

  // === CRUD TAGS ===

  async function creerTag(e) {
    e.preventDefault();
    setErreur(null);
    if (!nouveauTagNom.trim()) return;

    const { error } = await supabase.from("tags").insert({
      nom: nouveauTagNom.trim(),
      couleur: nouveauTagCouleur,
      user_id: utilisateur.id,
    });

    if (error) {
      setErreur("Erreur lors de la création du tag : " + error.message);
      return;
    }

    setNouveauTagNom("");
    setNouveauTagCouleur(COULEURS_TAGS[0].hex);
    setSucces("Tag créé !");
    await chargerTags(utilisateur.id);
  }

  async function supprimerTag(tagId) {
    setErreur(null);
    const { error } = await supabase.from("tags").delete().eq("id", tagId);

    if (error) {
      setErreur("Erreur lors de la suppression du tag : " + error.message);
      return;
    }

    setConfirmSuppTagId(null);
    if (filtreTagId === tagId) setFiltreTagId(null);
    setSucces("Tag supprimé.");
    await Promise.all([chargerTags(utilisateur.id), chargerNotesTags()]);
  }

  async function ajouterTagANote(noteId, tagId) {
    setErreur(null);
    const { error } = await supabase.from("notes_tags").insert({ note_id: noteId, tag_id: tagId });

    if (error) {
      if (error.code === "23505") return;
      setErreur("Erreur : " + error.message);
      return;
    }

    setDropdownTagNoteId(null);
    await chargerNotesTags();
  }

  async function retirerTagDeNote(noteId, tagId) {
    setErreur(null);
    const { error } = await supabase
      .from("notes_tags")
      .delete()
      .eq("note_id", noteId)
      .eq("tag_id", tagId);

    if (error) {
      setErreur("Erreur : " + error.message);
      return;
    }

    await chargerNotesTags();
  }

  function getTag(tagId) {
    return tags.find((t) => t.id === tagId);
  }

  // === RÉSUMÉ IA ===

  async function resumerNote(note) {
    setResumes((prev) => ({ ...prev, [note.id]: { texte: null, chargement: true, erreur: null } }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setResumes((prev) => ({ ...prev, [note.id]: { texte: null, chargement: false, erreur: "Session expirée. Reconnecte-toi." } }));
        return;
      }

      const res = await fetch("/api/resumer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          ...(sessionAICredential?.apiKey
            ? { [ANTHROPIC_KEY_HEADER]: sessionAICredential.apiKey }
            : {}),
        },
        body: JSON.stringify({
          titre: note.titre,
          contenu: stripImagesForText(note.contenu),
          modelId: sessionAICredential?.modelId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "AI_CONFIGURATION_REQUIRED") {
          setAISettingsOpen(true);
        }
        setResumes((prev) => ({ ...prev, [note.id]: { texte: null, chargement: false, erreur: data.error || "Erreur inconnue" } }));
        return;
      }

      setResumes((prev) => ({ ...prev, [note.id]: { texte: data.resume, chargement: false, erreur: null } }));
    } catch {
      setResumes((prev) => ({ ...prev, [note.id]: { texte: null, chargement: false, erreur: "Impossible de contacter le serveur." } }));
    }
  }

  function masquerResume(noteId) {
    setResumes((prev) => {
      const copie = { ...prev };
      delete copie[noteId];
      return copie;
    });
  }

  function formattingImageUrls(pendingImages = []) {
    const urls = { ...imageUrls };
    for (const image of pendingImages) urls[image.id] = image.previewUrl;
    return urls;
  }

  async function demanderMiseEnForme(target) {
    aiFormattingRequestRef.current.controller?.abort();
    const requestId = aiFormattingRequestRef.current.id + 1;
    const controller = new AbortController();
    let clientTimedOut = false;
    const clientTimeout = window.setTimeout(() => {
      clientTimedOut = true;
      controller.abort();
    }, AI_FORMAT_CLIENT_TIMEOUT_MS);
    aiFormattingRequestRef.current = { id: requestId, controller };
    setAIFormatting({
      ...target,
      proposal: "",
      loading: true,
      error: null,
      startedAt: Date.now(),
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw createClientAIError("AUTH_INVALID", "Session expirée. Reconnecte-toi.");
      }

      const response = await fetch("/api/ai/format", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          ...(sessionAICredential?.apiKey
            ? { [ANTHROPIC_KEY_HEADER]: sessionAICredential.apiKey }
            : {}),
        },
        body: JSON.stringify({
          contenu: target.source,
          modelId: sessionAICredential?.modelId,
        }),
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw createClientAIError(
          payload.code || "AI_PROVIDER_ERROR",
          payload.error || "La mise en forme est temporairement indisponible.",
        );
      }
      if (typeof payload.formattedContent !== "string" || !payload.formattedContent) {
        throw createClientAIError(
          "AI_FORMAT_RESPONSE_INVALID",
          "La proposition IA n'a pas pu être validée. Ton contenu reste inchangé.",
        );
      }

      if (aiFormattingRequestRef.current.id !== requestId) return;
      setAIFormatting((current) => current ? {
        ...current,
        proposal: payload.formattedContent,
        loading: false,
        error: null,
      } : current);
    } catch (requestError) {
      if (aiFormattingRequestRef.current.id !== requestId) {
        return;
      }
      if (requestError?.name === "AbortError" && clientTimedOut) {
        setAIFormatting((current) => current ? {
          ...current,
          proposal: "",
          loading: false,
          error: {
            code: "AI_PROVIDER_TIMEOUT",
            message: "La mise en forme a dépassé 1 min 40. Ton contenu reste intact : réessaie ou choisis un modèle plus rapide.",
          },
        } : current);
        return;
      }
      if (requestError?.name === "AbortError") return;
      const error = {
        code: requestError?.code || "AI_PROVIDER_UNREACHABLE",
        message: requestError?.message || "Impossible de contacter le serveur.",
      };
      setAIFormatting((current) => current ? {
        ...current,
        proposal: "",
        loading: false,
        error,
      } : current);
    } finally {
      window.clearTimeout(clientTimeout);
      if (aiFormattingRequestRef.current.id === requestId) {
        aiFormattingRequestRef.current.controller = null;
      }
    }
  }

  function ouvrirMiseEnFormeCreation() {
    if (!containsFormattableText(contenu)) {
      setErreur("Ajoute du texte à mettre en forme.");
      return;
    }
    void demanderMiseEnForme({
      kind: "creation",
      noteId: null,
      source: contenu,
      imageUrls: formattingImageUrls(creationPendingImages),
    });
  }

  function ouvrirMiseEnFormeEdition(noteId) {
    if (!containsFormattableText(editionContenu)) {
      setErreur("Ajoute du texte à mettre en forme.");
      return;
    }
    void demanderMiseEnForme({
      kind: "edition",
      noteId,
      source: editionContenu,
      imageUrls: formattingImageUrls(editionPendingImages),
    });
  }

  function fermerMiseEnForme() {
    aiFormattingRequestRef.current.controller?.abort();
    aiFormattingRequestRef.current = {
      id: aiFormattingRequestRef.current.id + 1,
      controller: null,
    };
    setAIFormatting(null);
  }

  function relancerMiseEnForme() {
    if (!aiFormatting) return;
    if (aiFormatting.kind === "creation") {
      if (!containsFormattableText(contenu)) {
        setAIFormatting((current) => current ? {
          ...current,
          error: { code: "AI_FORMAT_CONTENT_REQUIRED", message: "Ajoute du texte à mettre en forme." },
        } : current);
        return;
      }
      void demanderMiseEnForme({
        ...aiFormatting,
        source: contenu,
        imageUrls: formattingImageUrls(creationPendingImages),
      });
      return;
    }

    if (editionId !== aiFormatting.noteId || !containsFormattableText(editionContenu)) {
      setAIFormatting((current) => current ? {
        ...current,
        error: {
          code: "AI_DRAFT_CHANGED",
          message: "Le brouillon d'origine n'est plus ouvert. Ferme cette proposition puis relance-la depuis l'éditeur.",
        },
      } : current);
      return;
    }
    void demanderMiseEnForme({
      ...aiFormatting,
      source: editionContenu,
      imageUrls: formattingImageUrls(editionPendingImages),
    });
  }

  function appliquerMiseEnForme() {
    if (!aiFormatting?.proposal) return;
    if (aiFormatting.kind === "creation") {
      if (!modeCreation || contenu !== aiFormatting.source) {
        setAIFormatting((current) => current ? {
          ...current,
          proposal: "",
          error: {
            code: "AI_DRAFT_CHANGED",
            message: "Le brouillon a changé pendant la génération. Relance la mise en forme pour éviter d'écraser tes modifications.",
          },
        } : current);
        return;
      }
      setContenu(aiFormatting.proposal);
    } else {
      if (editionId !== aiFormatting.noteId || editionContenu !== aiFormatting.source) {
        setAIFormatting((current) => current ? {
          ...current,
          proposal: "",
          error: {
            code: "AI_DRAFT_CHANGED",
            message: "Le brouillon a changé pendant la génération. Relance la mise en forme pour éviter d'écraser tes modifications.",
          },
        } : current);
        return;
      }
      setEditionContenu(aiFormatting.proposal);
    }
    fermerMiseEnForme();
    setSucces("Mise en forme appliquée au brouillon. Sauvegarde la note pour la conserver.");
  }

  async function copierNote(note) {
    const copyableContent = stripImagesForText(note.contenu);
    const texte = copyableContent ? note.titre + "\n\n" + copyableContent : note.titre;
    try {
      await navigator.clipboard.writeText(texte);
      setSucces("Note copiée !");
    } catch {
      setErreur("Impossible de copier la note.");
    }
  }

  // Épingler / désépingler une note
  async function toggleEpingle(note) {
    setErreur(null);
    const nouvelleValeur = !note.epinglee;
    const { error } = await supabase
      .from("notes")
      .update({ epinglee: nouvelleValeur })
      .eq("id", note.id);

    if (error) {
      setErreur("Erreur lors de l'épinglage : " + error.message);
      return;
    }

    setPulseNoteId(note.id);
    setTimeout(() => setPulseNoteId(null), 250);
    await chargerNotes(utilisateur.id);
    pushToast(nouvelleValeur ? "Note épinglée." : "Note désépinglée.", {
      tone: "success",
      duration: 8000,
      actionLabel: "Annuler",
      onAction: async () => {
        const noteActuelle = notesRef.current.find((item) => item.id === note.id);
        if (!noteActuelle || noteActuelle.epinglee !== nouvelleValeur) {
          setSucces("La note a changé depuis cette action.");
          return;
        }
        const { error: undoError } = await supabase
          .from("notes")
          .update({ epinglee: note.epinglee })
          .eq("id", note.id);
        if (undoError) {
          setErreur("Impossible d'annuler l'épinglage : " + undoError.message);
          return;
        }
        await chargerNotes(utilisateur.id);
        setSucces("Épinglage restauré.");
      },
    });
  }

  // Partager / désactiver le partage d'une note
  async function togglePartage(note) {
    setErreur(null);

    if (note.share_token) {
      // Déjà partagée → demander confirmation pour désactiver
      if (!window.confirm("Désactiver le partage public ?")) return;

      const { error } = await supabase
        .from("notes")
        .update({ share_token: null })
        .eq("id", note.id);

      if (error) {
        setErreur("Erreur : " + error.message);
        return;
      }

      setSucces("Partage désactivé.");
    } else {
      // Privée → générer un token et partager
      const token = crypto.randomUUID();
      const { error } = await supabase
        .from("notes")
        .update({ share_token: token })
        .eq("id", note.id);

      if (error) {
        setErreur("Erreur : " + error.message);
        return;
      }

      const lien = window.location.origin + "/share/" + token;
      try {
        const result = await shareOrCopy({
          title: `Capsule — ${note.titre}`,
          text: "Une note Capsule a été partagée avec toi.",
          url: lien,
        });
        if (result === "shared") setSucces("Note partagée avec le système.");
        if (result === "copied") setSucces("Partage activé, lien copié.");
        if (result === "cancelled") setSucces("Partage activé.");
      } catch (shareError) {
        setErreur("Partage activé, mais le lien n'a pas pu être transmis : " + shareError.message);
      }
    }

    await chargerNotes(utilisateur.id);
  }

  // Partager le lien via le système, avec repli presse-papiers.
  async function copierLienPartage(note) {
    if (!note.share_token) return;
    const lien = window.location.origin + "/share/" + note.share_token;
    try {
      const result = await shareOrCopy({
        title: `Capsule — ${note.titre}`,
        text: "Une note Capsule a été partagée avec toi.",
        url: lien,
      });
      if (result === "shared") setSucces("Lien partagé.");
      if (result === "copied") setSucces("Lien copié.");
    } catch (shareError) {
      setErreur("Impossible de partager le lien : " + shareError.message);
    }
  }

  // Déplacer une note dans le kanban (colonne + ordre)
  async function deplacerNoteKanban(noteId, nouvelleColonne) {
    const noteAvant = notesRef.current.find((n) => n.id === noteId);
    if (!noteAvant) return;

    const ancienneColonne = noteAvant.kanban_colonne || "todo";
    const ancienOrdre = noteAvant.kanban_ordre || 0;
    if (ancienneColonne === nouvelleColonne) return;

    // Optimistic update
    setNotes((prev) => {
      const next = prev.map((n) =>
        n.id === noteId ? { ...n, kanban_colonne: nouvelleColonne, kanban_ordre: 0 } : n
      );
      notesRef.current = next;
      return next;
    });

    const { error } = await supabase
      .from("notes")
      .update({ kanban_colonne: nouvelleColonne, kanban_ordre: 0 })
      .eq("id", noteId);

    if (error) {
      // Rollback
      setNotes((prev) => {
        const next = prev.map((n) =>
          n.id === noteId ? { ...n, kanban_colonne: ancienneColonne, kanban_ordre: ancienOrdre } : n
        );
        notesRef.current = next;
        return next;
      });
      setErreur("Erreur lors du d\u00e9placement : " + error.message);
      return;
    }

    pushToast("Note déplacée.", {
      tone: "success",
      duration: 8000,
      actionLabel: "Annuler",
      onAction: async () => {
        const noteActuelle = notesRef.current.find((note) => note.id === noteId);
        if (!noteActuelle || (noteActuelle.kanban_colonne || "todo") !== nouvelleColonne) {
          setSucces("La note a changé depuis ce déplacement.");
          return;
        }
        const { error: undoError } = await supabase
          .from("notes")
          .update({ kanban_colonne: ancienneColonne, kanban_ordre: ancienOrdre })
          .eq("id", noteId);
        if (undoError) {
          setErreur("Impossible d'annuler le déplacement : " + undoError.message);
          return;
        }
        await chargerNotes(utilisateur.id);
        setSucces("Déplacement annulé.");
      },
    });
  }

  function commencerGlisserKanban(event, noteId) {
    if (noteBusy) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    kanbanPointerRef.current = {
      pointerId: event.pointerId,
      noteId,
      startX: event.clientX,
      startY: event.clientY,
      targetColumn: null,
      moved: false,
    };
    setDragNoteId(noteId);
  }

  function continuerGlisserKanban(event) {
    const pointer = kanbanPointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    const distance = Math.hypot(
      event.clientX - pointer.startX,
      event.clientY - pointer.startY,
    );
    if (distance < 7 && !pointer.moved) return;

    event.preventDefault();
    pointer.moved = true;
    const column = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest?.("[data-kanban-column]")
      ?.getAttribute("data-kanban-column");
    pointer.targetColumn = column || null;
    setDragOverColonne(pointer.targetColumn);
  }

  function terminerGlisserKanban(event) {
    const pointer = kanbanPointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    kanbanPointerRef.current = null;
    setDragNoteId(null);
    setDragOverColonne(null);
    if (pointer.moved && pointer.targetColumn) {
      void deplacerNoteKanban(pointer.noteId, pointer.targetColumn);
    }
  }

  function annulerGlisserKanban() {
    kanbanPointerRef.current = null;
    setDragNoteId(null);
    setDragOverColonne(null);
  }

  // Déconnexion
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // === RENDU — Tags d'une note (réutilisable) ===
  function renderTagsBadges(note, opts = {}) {
    const tagIds = notesTags[note.id] || [];
    const tagsDeNote = tagIds.map(getTag).filter(Boolean);
    const tagsDisponibles = tags.filter((t) => !tagIds.includes(t.id));
    const canRemove = opts.canRemove !== false;

    return (
      <>
        {/* Tags cliquables */}
        {tagsDeNote.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tagsDeNote.map((tag) => (
              canRemove ? (
                <button
                  key={tag.id}
                  onClick={(e) => { e.stopPropagation(); retirerTagDeNote(note.id, tag.id); }}
                  title={"Retirer \u00ab " + tag.nom + " \u00bb"}
                  style={{
                    background: tag.couleur + "25",
                    color: tag.couleur,
                    border: "1px solid " + tag.couleur,
                    borderRadius: "2px",
                    padding: "0.1rem 0.4rem",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    lineHeight: 1.4,
                  }}
                >
                  {tag.nom} &times;
                </button>
              ) : (
                <span
                  key={tag.id}
                  style={{
                    background: tag.couleur + "25",
                    color: tag.couleur,
                    border: "1px solid " + tag.couleur,
                    borderRadius: "2px",
                    padding: "0.1rem 0.4rem",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    lineHeight: 1.4,
                  }}
                >
                  {tag.nom}
                </span>
              )
            ))}
          </div>
        )}
      </>
    );
  }

  // === RENDU — Boutons d'action d'une note (réutilisable modale + détail) ===
  function renderNoteActions(note) {
    const tagIds = notesTags[note.id] || [];
    const tagsDisponibles = tags.filter((t) => !tagIds.includes(t.id));
    const enEdition = editionId === note.id;

    return (
      <>
        {/* Confirmation de suppression */}
        {confirmSuppId === note.id ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase" style={{ color: "var(--danger)" }}>
              Supprimer ?
            </span>
            <button
              onClick={() => supprimerNote(note.id)}
              className="btn-brutal danger"
              style={{ fontSize: "0.65rem", padding: "0.25rem 0.6rem" }}
            >
              Oui
            </button>
            <button
              onClick={() => setConfirmSuppId(null)}
              className="btn-brutal ghost"
              style={{ fontSize: "0.65rem", padding: "0.25rem 0.6rem" }}
            >
              Non
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {enEdition ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => sauvegarderEdition(note.id)}
                  disabled={noteBusy}
                  className="btn-brutal primary disabled:opacity-50"
                  style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}
                >
                  {imagePreparing ? "Optimisation..." : noteSaving ? "Sauvegarde..." : "Sauver"}
                </button>
                <button
                  onClick={annulerEdition}
                  disabled={noteBusy}
                  className="btn-brutal ghost disabled:opacity-50"
                  style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}
                >
                  Annuler
                </button>
              </div>
            ) : (
              <>
                {/* Ligne 1 — Actions principales */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => toggleEpingle(note)}
                    className="btn-brutal ghost"
                    style={{
                      fontSize: "0.85rem",
                      padding: "0.35rem 0.5rem",
                      color: note.epinglee ? "var(--accent)" : "var(--text-muted)",
                      lineHeight: 1,
                    }}
                    title={note.epinglee ? "Désépingler" : "Épingler"}
                    aria-label={note.epinglee ? "Désépingler la note" : "Épingler la note"}
                    aria-pressed={note.epinglee}
                  >
                    {"\uD83D\uDCCC"}
                  </button>
                  <button
                    onClick={() => commencerEdition(note)}
                    className="btn-brutal primary"
                    style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => dupliquerNote(note)}
                    className="btn-brutal ghost"
                    style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}
                  >
                    Dupliquer
                  </button>
                  <button
                    onClick={() => copierNote(note)}
                    className="btn-brutal ghost"
                    style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}
                  >
                    Copier
                  </button>
                  <button
                    onClick={() => ouvrirImpression(note)}
                    className="btn-brutal ghost"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}
                  >
                    <Icon name="printer" size={15} />
                    Imprimer / PDF
                  </button>
                  <button
                    onClick={() => resumerNote(note)}
                    disabled={!note.contenu || resumes[note.id]?.chargement}
                    className="btn-brutal ghost disabled:opacity-30"
                    style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem", color: "var(--accent)" }}
                    title={note.contenu ? "Résumer avec l'IA" : "Ajoute du contenu pour résumer"}
                  >
                    Résumer
                  </button>
                  {/* Bouton + tag */}
                  <div className="relative" ref={dropdownTagNoteId === note.id ? dropdownRef : null}>
                    <button
                      onClick={() => setDropdownTagNoteId(dropdownTagNoteId === note.id ? null : note.id)}
                      className="btn-brutal ghost"
                      style={{ fontSize: "0.7rem", padding: "0.35rem 0.5rem", color: "var(--accent)" }}
                      title="Ajouter un tag"
                    >
                      + Tag
                    </button>
                    {dropdownTagNoteId === note.id && (
                      <div
                        className="absolute left-0 bottom-full mb-1"
                        style={{
                          background: "var(--glass-bg)",
                          backdropFilter: "blur(16px)",
                          WebkitBackdropFilter: "blur(16px)",
                          border: "2px solid var(--glass-border)",
                          borderRadius: "2px",
                          boxShadow: "4px 4px 0 var(--brutal-shadow)",
                          padding: "0.4rem",
                          minWidth: "120px",
                          zIndex: 50,
                        }}
                      >
                        {tagsDisponibles.length === 0 ? (
                          <p className="text-xs px-1" style={{ color: "var(--text-muted)" }}>
                            {tags.length === 0 ? "Crée un tag d'abord" : "Tous assignés"}
                          </p>
                        ) : (
                          tagsDisponibles.map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => ajouterTagANote(note.id, tag.id)}
                              className="flex items-center gap-1.5 w-full text-left px-2 py-1 text-xs font-bold"
                              style={{ color: tag.couleur, borderRadius: "1px", cursor: "pointer" }}
                              onMouseEnter={(e) => e.currentTarget.style.background = tag.couleur + "15"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              <span
                                style={{ width: "0.5rem", height: "0.5rem", background: tag.couleur, borderRadius: "1px", display: "inline-block", flexShrink: 0 }}
                              />
                              {tag.nom}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ligne 2 — Partage + Supprimer */}
                <div className="flex items-center gap-2">
                  {note.share_token ? (
                    <>
                      <button
                        onClick={() => copierLienPartage(note)}
                        className="btn-brutal ghost"
                        style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem", color: "var(--success)" }}
                        title="Partager ou copier le lien"
                      >
                        {"\uD83D\uDD17"} Partager le lien
                      </button>
                      <button
                        onClick={() => togglePartage(note)}
                        className="btn-brutal ghost"
                        style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem", color: "var(--danger)" }}
                        title="Désactiver le partage public"
                      >
                        Désactiver
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => togglePartage(note)}
                      className="btn-brutal ghost"
                      style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem", color: "var(--text-muted)" }}
                      title="Partager cette note"
                    >
                      {"\uD83D\uDD17"} Partager
                    </button>
                  )}
                  <button
                    onClick={() => { setConfirmSuppId(note.id); setEditionId(null); }}
                    className="btn-brutal ghost ml-auto"
                    style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem", color: "var(--danger)" }}
                  >
                    Supprimer
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </>
    );
  }

  // === RENDU — Résumé IA d'une note ===
  function renderResume(note) {
    if (!resumes[note.id]) return null;
    return (
      <div
        className="mt-4 p-2"
        style={{
          background: "var(--accent-glow)",
          border: "1.5px solid var(--accent)",
          borderRadius: "2px",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
            Résumé IA
          </p>
          {!resumes[note.id].chargement && (
            <button
              onClick={() => masquerResume(note.id)}
              aria-label="Masquer le résumé"
              style={{ color: "var(--accent)", fontSize: "0.9rem", lineHeight: 1 }}
            >
              &times;
            </button>
          )}
        </div>
        {resumes[note.id].chargement ? (
          <p className="text-xs mt-1 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <span
              className="inline-block w-3 h-3 border-2 rounded-full animate-spin"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
            Résumé en cours...
          </p>
        ) : resumes[note.id].erreur ? (
          <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>
            {resumes[note.id].erreur}
          </p>
        ) : (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-primary)" }}>
            {resumes[note.id].texte}
          </p>
        )}
      </div>
    );
  }

  // === RENDU — Éditeur de couleur de note ===
  function renderCouleurEditor() {
    return (
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
          Couleur de la note
        </p>
        <div className="flex flex-wrap gap-2">
          {COULEURS_NOTES.map((c) => (
            <button
              key={c.nom}
              type="button"
              onClick={() => setEditionCouleur(c.hex)}
              title={c.nom}
              aria-label={`Couleur ${c.nom}`}
              aria-pressed={editionCouleur === c.hex}
              style={{
                width: "1.75rem",
                height: "1.75rem",
                borderRadius: "50%",
                background: c.hex ? (sombre ? c.hexDark : c.hex) : "transparent",
                border: editionCouleur === c.hex
                  ? "3px solid var(--accent)"
                  : "2px solid var(--input-border)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                boxShadow: editionCouleur === c.hex ? "0 0 0 2px var(--accent-glow)" : "none",
                transition: "all 0.15s",
              }}
            >
              {c.hex === null && "\u00d7"}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // === RENDU — Panneau détail (list view) ===

  function renderNoteDetail() {
    if (!noteSelectionnee) {
      return (
        <EmptyState
          icon="list"
          title="Sélectionne une note"
          description="Choisis une note dans la colonne de gauche pour consulter ou modifier son contenu."
        />
      );
    }

    const note = noteSelectionnee;
    const enEdition = editionId === note.id;

    return (
      <div
        key={note.id}
        className="flex flex-col h-full fade-in-fast"
        style={{ backgroundColor: enEdition ? getCouleurFond(editionCouleur) : getCouleurFond(note.couleur) }}
      >
        {/* Header détail */}
        <div className="detail-header">
          {/* Bouton retour mobile */}
          <button
            onClick={retourListe}
            className="btn-brutal ghost md:hidden"
            style={{ fontSize: "0.7rem", padding: "0.25rem 0.5rem", flexShrink: 0 }}
          >
            &larr; Notes
          </button>

          {enEdition ? (
            <input
              type="text"
              aria-label="Titre de la note"
              value={editionTitre}
              onChange={(e) => setEditionTitre(e.target.value)}
              className="input-glass"
              style={{ fontWeight: 700, fontSize: "1rem", flex: 1, minWidth: 0 }}
            />
          ) : (
            <h2 className="font-black text-base" style={{ color: "var(--text-primary)", flex: 1, minWidth: 0, wordBreak: "break-word" }}>
              {note.titre}
            </h2>
          )}
          {!enEdition && renderBoutonsTaille()}
        </div>

        {/* Body */}
        <div className="detail-body flex-1 overflow-y-auto">
          {enEdition ? (
            <div className="space-y-3">
              <NoteContentEditor
                value={editionContenu}
                onChange={setEditionContenu}
                pendingImages={editionPendingImages}
                onPendingImagesChange={setEditionPendingImages}
                existingImages={noteImages[note.id] || []}
                imageUrls={imageUrls}
                rows={12}
                minHeight="200px"
                disabled={noteSaving}
                imageDisabled={Boolean(imageFeatureError)}
                uploadProgress={imageUploadProgress}
                onProcessingChange={setImagePreparing}
                onOpenHelp={openHelp}
                onSmartFormat={() => ouvrirMiseEnFormeEdition(note.id)}
                smartFormatBusy={aiFormatting?.loading}
              />
              {renderCouleurEditor()}
            </div>
          ) : (
            <>
              {renderTagsBadges(note)}

              {note.share_token && (
                <div
                  className="flex items-center gap-2 mb-3"
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "var(--success)",
                    background: "var(--success)" + "10",
                    border: "1px solid var(--success)",
                    borderRadius: "2px",
                    padding: "0.35rem 0.6rem",
                  }}
                >
                  <span>{"\uD83D\uDD17"} Partage actif</span>
                  <button
                    onClick={() => copierLienPartage(note)}
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: "var(--success)",
                      background: "none",
                      border: "1px solid var(--success)",
                      borderRadius: "2px",
                      padding: "0.15rem 0.4rem",
                      cursor: "pointer",
                    }}
                  >
                    Partager le lien
                  </button>
                </div>
              )}

              {note.contenu ? (
                <div className="leading-relaxed" style={{ fontSize: noteFontSize + "px" }}>
                  <MarkdownRenderer content={note.contenu} imageUrls={imageUrls} />
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                  Aucun contenu
                </p>
              )}

              {renderResume(note)}

              <p className="text-xs font-mono mt-4" style={{ color: "var(--text-muted)" }}>
                {new Date(note.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="detail-footer">
          {renderNoteActions(note)}
        </div>
      </div>
    );
  }

  // === RENDU — Modale de détail (card view) ===
  function renderModale() {
    if (!noteModale) return null;

    const note = noteModale;
    const enEdition = editionId === note.id;

    return createPortal(
      <div
        ref={modalOverlayRef}
        className="modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            fermerModale();
          }
        }}
      >
        <div
          ref={modalPanelRef}
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{ backgroundColor: enEdition ? getCouleurFond(editionCouleur) : getCouleurFond(note.couleur) || "var(--modal-bg)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={enEdition ? undefined : "note-detail-title"}
          aria-label={enEdition ? "Modifier la note" : undefined}
          tabIndex={-1}
        >
          {/* Header modale */}
          <div className="modal-header" style={{ flexDirection: "column", gap: "0.5rem" }}>
            <div className="flex items-start justify-between gap-2 w-full">
              {enEdition ? (
                <input
                  type="text"
                  aria-label="Titre de la note"
                  value={editionTitre}
                  onChange={(e) => setEditionTitre(e.target.value)}
                  className="input-glass"
                  style={{ fontWeight: 700, fontSize: "1rem", flex: 1, minWidth: 0 }}
                />
              ) : (
                <h2 id="note-detail-title" className="font-black text-base" style={{ color: "var(--text-primary)", flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                  {note.titre}
                </h2>
              )}
              <button
                onClick={fermerModale}
                aria-label="Fermer la note"
                className="btn-brutal ghost"
                style={{ fontSize: "1.2rem", padding: "0.15rem 0.4rem", lineHeight: 1, flexShrink: 0 }}
              >
                &times;
              </button>
            </div>
            {!enEdition && (
              <div className="flex items-center gap-2 w-full">
                {/* + Tag */}
                <div className="relative" ref={dropdownTagNoteId === note.id ? dropdownRef : null}>
                  <button
                    onClick={() => setDropdownTagNoteId(dropdownTagNoteId === note.id ? null : note.id)}
                    className="btn-brutal ghost"
                    style={{ fontSize: "0.65rem", padding: "0.25rem 0.5rem", color: "var(--accent)" }}
                    title="Ajouter un tag"
                  >
                    + Tag
                  </button>
                  {dropdownTagNoteId === note.id && (
                    <div
                      className="absolute left-0 top-full mt-1"
                      style={{
                        background: "var(--modal-bg)",
                        border: "2px solid var(--modal-border)",
                        borderRadius: "2px",
                        boxShadow: "4px 4px 0 var(--brutal-shadow)",
                        padding: "0.4rem",
                        minWidth: "120px",
                        zIndex: 50,
                      }}
                    >
                      {tags.filter((t) => !(notesTags[note.id] || []).includes(t.id)).length === 0 ? (
                        <p className="text-xs px-1" style={{ color: "var(--text-muted)" }}>
                          {tags.length === 0 ? "Crée un tag d'abord" : "Tous assignés"}
                        </p>
                      ) : (
                        tags.filter((t) => !(notesTags[note.id] || []).includes(t.id)).map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => ajouterTagANote(note.id, tag.id)}
                            className="flex items-center gap-1.5 w-full text-left px-2 py-1 text-xs font-bold"
                            style={{ color: tag.couleur, borderRadius: "1px", cursor: "pointer" }}
                            onMouseEnter={(e) => e.currentTarget.style.background = tag.couleur + "15"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          >
                            <span style={{ width: "0.5rem", height: "0.5rem", background: tag.couleur, borderRadius: "1px", display: "inline-block", flexShrink: 0 }} />
                            {tag.nom}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {/* Supprimer */}
                {confirmSuppId === note.id ? (
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-xs font-bold uppercase" style={{ color: "var(--danger)" }}>Supprimer ?</span>
                    <button onClick={() => supprimerNote(note.id)} className="btn-brutal danger" style={{ fontSize: "0.65rem", padding: "0.25rem 0.5rem" }}>Oui</button>
                    <button onClick={() => setConfirmSuppId(null)} className="btn-brutal ghost" style={{ fontSize: "0.65rem", padding: "0.25rem 0.5rem" }}>Non</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setConfirmSuppId(note.id); setEditionId(null); }}
                    className="btn-brutal ghost ml-auto"
                    style={{ fontSize: "0.65rem", padding: "0.25rem 0.5rem", color: "var(--danger)" }}
                  >
                    Supprimer
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Body modale */}
          <div className="modal-body">
            {enEdition ? (
              <div className="space-y-3">
                <NoteContentEditor
                  value={editionContenu}
                  onChange={setEditionContenu}
                  pendingImages={editionPendingImages}
                  onPendingImagesChange={setEditionPendingImages}
                  existingImages={noteImages[note.id] || []}
                  imageUrls={imageUrls}
                  rows={10}
                  minHeight="150px"
                  disabled={noteSaving}
                  imageDisabled={Boolean(imageFeatureError)}
                  uploadProgress={imageUploadProgress}
                  onProcessingChange={setImagePreparing}
                  onOpenHelp={openHelp}
                  onSmartFormat={() => ouvrirMiseEnFormeEdition(note.id)}
                  smartFormatBusy={aiFormatting?.loading}
                />
                {renderCouleurEditor()}
              </div>
            ) : (
              <>
                {renderTagsBadges(note)}

                {note.share_token && (
                  <div
                    className="flex items-center gap-2 mb-3"
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "var(--success)",
                      background: "var(--success)" + "10",
                      border: "1px solid var(--success)",
                      borderRadius: "2px",
                      padding: "0.35rem 0.6rem",
                    }}
                  >
                    <span>{"\uD83D\uDD17"} Partage actif</span>
                    <button
                      onClick={() => copierLienPartage(note)}
                      style={{
                        marginLeft: "auto",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: "var(--success)",
                        background: "none",
                        border: "1px solid var(--success)",
                        borderRadius: "2px",
                        padding: "0.15rem 0.4rem",
                        cursor: "pointer",
                      }}
                    >
                      Partager le lien
                    </button>
                  </div>
                )}

                {note.contenu ? (
                  <div className="leading-relaxed" style={{ fontSize: noteFontSize + "px" }}>
                    <MarkdownRenderer content={note.contenu} imageUrls={imageUrls} />
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                    Aucun contenu
                  </p>
                )}

                {renderResume(note)}

                <p className="text-xs font-mono mt-4" style={{ color: "var(--text-muted)" }}>
                  {new Date(note.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </>
            )}
          </div>

          {/* Footer modale */}
          <div className="modal-footer space-y-2">
            {enEdition ? (
              <div className="flex items-center gap-2">
                <button onClick={() => sauvegarderEdition(note.id)} disabled={noteBusy} className="btn-brutal primary disabled:opacity-50" style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}>
                  {imagePreparing ? "Optimisation..." : noteSaving ? "Sauvegarde..." : "Sauver"}
                </button>
                <button onClick={annulerEdition} disabled={noteBusy} className="btn-brutal ghost disabled:opacity-50" style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}>
                  Annuler
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                  {renderBoutonsTaille()}
                  <button
                    onClick={() => toggleEpingle(note)}
                    className="btn-brutal ghost"
                    style={{ fontSize: "0.85rem", padding: "0.35rem 0.5rem", color: note.epinglee ? "var(--accent)" : "var(--text-muted)", lineHeight: 1 }}
                    title={note.epinglee ? "Désépingler" : "Épingler"}
                    aria-label={note.epinglee ? "Désépingler la note" : "Épingler la note"}
                    aria-pressed={note.epinglee}
                  >
                    {"\uD83D\uDCCC"}
                  </button>
                  <button onClick={() => commencerEdition(note)} className="btn-brutal primary" style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}>
                    Modifier
                  </button>
                  <button onClick={() => dupliquerNote(note)} className="btn-brutal ghost" style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}>
                    Dupliquer
                  </button>
                  {note.share_token ? (
                    <>
                      <button onClick={() => copierLienPartage(note)} className="btn-brutal ghost" style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem", color: "var(--success)" }} title="Partager ou copier le lien">
                        {"\uD83D\uDD17"} Lien
                      </button>
                      <button onClick={() => togglePartage(note)} className="btn-brutal ghost" style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem", color: "var(--danger)" }} title="Désactiver le partage">
                        Désactiver
                      </button>
                    </>
                  ) : (
                    <button onClick={() => togglePartage(note)} className="btn-brutal ghost" style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem", color: "var(--text-muted)" }} title="Partager cette note">
                      {"\uD83D\uDD17"} Partager
                    </button>
                  )}
                  <button
                    onClick={() => resumerNote(note)}
                    disabled={!note.contenu || resumes[note.id]?.chargement}
                    className="btn-brutal ghost disabled:opacity-30"
                    style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem", color: "var(--accent)" }}
                    title={note.contenu ? "Résumer avec l'IA" : "Ajoute du contenu pour résumer"}
                  >
                    Résumer
                  </button>
                  <button onClick={() => copierNote(note)} className="btn-brutal ghost" style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}>
                    Copier
                  </button>
                  <button
                    onClick={() => ouvrirImpression(note)}
                    className="btn-brutal ghost"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}
                  >
                    <Icon name="printer" size={15} />
                    Imprimer / PDF
                  </button>
                </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const commandItems = [
    {
      id: "new-note",
      label: "Nouvelle note",
      description: "Créer une capsule texte ou image",
      keywords: "ajouter créer écrire",
      icon: "plus",
      shortcut: "N",
      onSelect: () => setModeCreation(true),
    },
    {
      id: "focus-search",
      label: "Rechercher dans les notes",
      description: "Placer le curseur dans le filtre courant",
      keywords: "filtrer trouver",
      icon: "search",
      shortcut: "/",
      onSelect: () => {
        if (viewMode === "list") setMobileDetail(false);
        requestAnimationFrame(() => rechercheRef.current?.focus());
      },
    },
    ...[
      ["card", "Vue cartes", "cards", "1"],
      ["list", "Vue liste", "list", "2"],
      ["kanban", "Vue Kanban", "kanban", "3"],
    ].map(([id, label, icon, shortcut]) => ({
      id: `view-${id}`,
      label,
      description: id === viewMode ? "Vue active" : "Changer l'organisation des notes",
      keywords: "affichage organisation",
      icon,
      shortcut,
      onSelect: () => changerVue(id),
    })),
    {
      id: "open-ai-settings",
      label: "Configurer l'IA",
      description: "Clé Anthropic, modèle et confidentialité",
      keywords: "anthropic claude modèle api clé résumé",
      icon: "sparkles",
      onSelect: () => setAISettingsOpen(true),
    },
    {
      id: "manage-tags",
      label: panneauTagsOuvert ? "Fermer les tags" : "Gérer les tags",
      description: "Créer, filtrer et supprimer des tags",
      keywords: "étiquette catégorie",
      icon: "tags",
      onSelect: () => setPanneauTagsOuvert((open) => !open),
    },
    {
      id: "open-stats",
      label: "Ouvrir les statistiques",
      description: "Activité, mots et répartition des tags",
      keywords: "graphiques activité",
      icon: "chart",
      onSelect: () => setStatsOuvert(true),
    },
    {
      id: "toggle-theme",
      label: sombre ? "Activer le thème clair" : "Activer le thème sombre",
      description: "Adapter immédiatement le contraste",
      keywords: "apparence nuit jour",
      icon: sombre ? "sun" : "moon",
      onSelect: toggleTheme,
    },
    {
      id: "open-help",
      label: "Ouvrir le centre d’aide",
      description: "Fonctionnalités, usages, IA, PWA et raccourcis",
      keywords: "aide guide tutoriel clavier image anthropic pwa partage",
      icon: "help",
      onSelect: () => openHelp("quick-start"),
    },
    {
      id: "open-about",
      label: "À propos de Capsule",
      description: "Version, build, changelog et mises à jour",
      keywords: "version build date changelog mise à jour actualiser",
      icon: "info",
      onSelect: () => setAboutOpen(true),
    },
    ...notes.slice(0, 8).map((note) => ({
      id: `note-${note.id}`,
      label: note.titre,
      description: "Ouvrir une note récente",
      keywords: `${stripImagesForText(note.contenu)} ${(notesTags[note.id] || []).map((tagId) => getTag(tagId)?.nom || "").join(" ")}`,
      icon: "chevron",
      onSelect: () => {
        changerVue("card");
        setNoteDetailId(note.id);
      },
    })),
  ];

  // État de chargement
  if (chargement) {
    return <AppSkeleton />;
  }

  return (
    <div className="app-shell">
      {/* Formes décoratives en arrière-plan */}
      <div
        className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "var(--accent)", zIndex: -1 }}
      />
      <div
        className="fixed bottom-[-15%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: "var(--danger)", zIndex: -1 }}
      />

      {/* === HEADER === */}
      <AppHeader
        noteCount={notes.length}
        viewMode={viewMode}
        onViewChange={changerVue}
        onNewNote={() => setModeCreation(true)}
        onOpenCommand={() => setCommandPaletteOpen(true)}
        tagsOpen={panneauTagsOuvert}
        onToggleTags={() => setPanneauTagsOuvert((open) => !open)}
        onOpenStats={() => setStatsOuvert(true)}
        onOpenAISettings={() => setAISettingsOpen(true)}
        isDark={sombre}
        onToggleTheme={toggleTheme}
        onOpenHelp={() => openHelp("quick-start")}
        onOpenAbout={() => setAboutOpen(true)}
        email={utilisateur.email}
        onLogout={handleLogout}
        busy={noteBusy}
      />

      {/* === PANNEAU DE GESTION DES TAGS === */}
      {panneauTagsOuvert && (
        <div className="glass-card p-5 space-y-4" style={{ flexShrink: 0 }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Gestion des tags
          </p>

          <form onSubmit={creerTag} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[150px]">
              <input
                type="text"
                aria-label="Nom du tag"
                value={nouveauTagNom}
                onChange={(e) => setNouveauTagNom(e.target.value)}
                placeholder="Nom du tag"
                required
                className="input-glass"
              />
            </div>
            <div className="flex gap-1.5">
              {COULEURS_TAGS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setNouveauTagCouleur(c.hex)}
                  title={c.nom}
                  aria-label={`Couleur ${c.nom}`}
                  aria-pressed={nouveauTagCouleur === c.hex}
                  style={{
                    width: "1.5rem",
                    height: "1.5rem",
                    background: c.hex,
                    border: nouveauTagCouleur === c.hex ? "3px solid var(--text-primary)" : "2px solid transparent",
                    borderRadius: "2px",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
            <button type="submit" className="btn-brutal primary" style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}>
              + Créer
            </button>
          </form>

          {tags.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Aucun tag créé.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-1.5"
                  style={{
                    background: tag.couleur + "20",
                    border: "1.5px solid " + tag.couleur,
                    borderRadius: "2px",
                    padding: "0.25rem 0.5rem",
                  }}
                >
                  <span
                    style={{ width: "0.5rem", height: "0.5rem", background: tag.couleur, borderRadius: "1px", display: "inline-block" }}
                  />
                  <span className="text-xs font-bold" style={{ color: tag.couleur }}>
                    {tag.nom}
                  </span>
                  {confirmSuppTagId === tag.id ? (
                    <>
                      <button
                        onClick={() => supprimerTag(tag.id)}
                        className="text-xs font-bold ml-1"
                        style={{ color: "var(--danger)" }}
                      >
                        Oui
                      </button>
                      <button
                        onClick={() => setConfirmSuppTagId(null)}
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Non
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmSuppTagId(tag.id)}
                      className="text-xs ml-1"
                      style={{ color: "var(--text-muted)", lineHeight: 1 }}
                      title="Supprimer ce tag"
                      aria-label={`Supprimer le tag ${tag.nom}`}
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {imageFeatureError && (
        <div className="app-status-strip" role="alert">
          <strong>Images indisponibles</strong>
          <span>{imageFeatureError}</span>
        </div>
      )}
      {noteSaving && (
        <div className="app-status-strip is-progress" role="status" aria-live="polite">
          <strong>{imageUploadProgress?.label || "Sauvegarde en cours…"}</strong>
          {imageUploadProgress && (
            <progress value={imageUploadProgress.percent} max="100">
              {imageUploadProgress.percent}%
            </progress>
          )}
        </div>
      )}

      {/* === CARD VIEW === */}
      {viewMode === "card" && (
        <div className="workspace-view flex-1 overflow-y-auto fade-in">
          {/* Barre recherche + filtres */}
          <div className="glass-card p-3 space-y-2 mb-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  ref={rechercheRef}
                  type="text"
                  aria-label="Rechercher dans les notes"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher..."
                  className="input-glass"
                  style={{ paddingRight: "2.5rem", fontSize: "0.8rem", padding: "0.5rem 0.7rem" }}
                />
                {recherche && (
                  <button
                    onClick={() => setRecherche("")}
                    aria-label="Effacer la recherche"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1, padding: "0.15rem" }}
                  >
                    &times;
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  {notesFiltrees.length} note{notesFiltrees.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setTriAscendant(!triAscendant)}
                  className="text-xs font-bold uppercase"
                  style={{ color: "var(--accent)", cursor: "pointer", background: "none", border: "none", padding: "0.15rem 0.3rem" }}
                  title={triAscendant ? "Plus récentes en premier" : "Plus anciennes en premier"}
                >
                  {triAscendant ? "\u2191 Ancien" : "\u2193 Récent"}
                </button>
              </div>
            </div>
            {/* Filtres tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setFiltreTagId(filtreTagId === tag.id ? null : tag.id)}
                    style={{
                      background: filtreTagId === tag.id ? tag.couleur : tag.couleur + "20",
                      color: filtreTagId === tag.id ? "#fff" : tag.couleur,
                      border: "1px solid " + tag.couleur,
                      borderRadius: "2px",
                      padding: "0.1rem 0.35rem",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      transition: "all 0.15s",
                    }}
                  >
                    {tag.nom}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grille de cards */}
          {notes.length === 0 ? (
            <div className="glass-card">
              <EmptyState
                icon="plus"
                title="Ta première capsule commence ici"
                description="Crée une note, ajoute du Markdown ou dépose une image. Elle restera privée tant que tu ne l'auras pas partagée."
                actionLabel="Créer une note"
                onAction={() => setModeCreation(true)}
                secondaryActionLabel="Découvrir Capsule"
                onSecondaryAction={() => openHelp("quick-start")}
              />
            </div>
          ) : notesFiltrees.length === 0 ? (
            <div className="glass-card">
              <EmptyState
                icon="search"
                title="Aucune note ne correspond"
                description="Efface la recherche ou le filtre de tag pour retrouver toutes tes notes."
                actionLabel="Réinitialiser les filtres"
                onAction={() => { setRecherche(""); setFiltreTagId(null); }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {notesFiltrees.map((note, index) => {
                const tagIds = notesTags[note.id] || [];
                const tagsDeNote = tagIds.map(getTag).filter(Boolean);
                const isDepliee = notesDepliees[note.id];
                const contenuLong = note.contenu && note.contenu.length > 200;

                return (
                  <div
                    key={note.id}
                    className={"glass-card fade-slide-up p-4 flex flex-col gap-2 cursor-pointer" + (pulseNoteId === note.id ? " scale-pulse" : "")}
                    onClick={() => setNoteDetailId(note.id)}
                    style={{
                      backgroundColor: getCouleurFond(note.couleur),
                      borderColor: note.epinglee ? "var(--accent)" : undefined,
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    {/* Titre */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-black text-sm" style={{ color: "var(--text-primary)", wordBreak: "break-word", flex: 1 }}>
                        {note.epinglee && <span style={{ marginRight: "0.3rem" }}>{"\uD83D\uDCCC"}</span>}
                        {note.titre}
                      </h3>
                      <button
                        onClick={(e) => { e.stopPropagation(); copierNote(note); }}
                        className="btn-brutal ghost"
                        style={{ fontSize: "0.65rem", padding: "0.2rem 0.4rem", flexShrink: 0 }}
                        title="Copier la note"
                      >
                        Copier
                      </button>
                    </div>

                    {/* Tags */}
                    {tagsDeNote.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tagsDeNote.map((tag) => (
                          <span
                            key={tag.id}
                            style={{
                              background: tag.couleur + "25",
                              color: tag.couleur,
                              border: "1px solid " + tag.couleur,
                              borderRadius: "2px",
                              padding: "0.1rem 0.4rem",
                              fontSize: "0.6rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              lineHeight: 1.4,
                            }}
                          >
                            {tag.nom}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Contenu avec accordéon */}
                    {note.contenu && (
                      <div>
                        <div
                          className="leading-relaxed"
                          style={{
                            fontSize: noteFontSize + "px",
                            overflow: "hidden",
                            maxHeight: isDepliee ? "none" : "4.5em",
                            transition: "max-height 0.3s ease",
                          }}
                        >
                          <MarkdownRenderer content={note.contenu} imageUrls={imageUrls} compact />
                        </div>
                        {contenuLong && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setNotesDepliees((prev) => ({ ...prev, [note.id]: !prev[note.id] })); }}
                            className="text-xs font-bold mt-1"
                            style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                          >
                            {isDepliee ? "Voir moins \u25B2" : "Voir plus \u25BC"}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Date + indicateur partage */}
                    <div className="flex items-center gap-2 mt-auto">
                      <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                        {new Date(note.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      {note.share_token && (
                        <span
                          style={{
                            fontSize: "0.55rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            color: "var(--success)",
                            background: "var(--success)" + "15",
                            border: "1px solid var(--success)",
                            borderRadius: "2px",
                            padding: "0.05rem 0.3rem",
                          }}
                        >
                          {"\uD83D\uDD17"} Partage actif
                        </span>
                      )}
                    </div>

                    {/* Boutons d'action */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 mt-2" style={{ borderTop: "1px solid var(--panel-border)" }} onClick={(e) => e.stopPropagation()}>
                      {renderBoutonsTaille()}
                      <button
                        onClick={() => toggleEpingle(note)}
                        className="btn-brutal ghost"
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.2rem 0.4rem",
                          color: note.epinglee ? "var(--accent)" : "var(--text-muted)",
                          lineHeight: 1,
                        }}
                        title={note.epinglee ? "Désépingler" : "Épingler"}
                        aria-label={note.epinglee ? "Désépingler la note" : "Épingler la note"}
                        aria-pressed={note.epinglee}
                      >
                        {"\uD83D\uDCCC"}
                      </button>
                      <button
                        onClick={() => { setNoteDetailId(note.id); commencerEdition(note); }}
                        className="btn-brutal primary"
                        style={{ fontSize: "0.6rem", padding: "0.2rem 0.5rem" }}
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => dupliquerNote(note)}
                        className="btn-brutal ghost"
                        style={{ fontSize: "0.6rem", padding: "0.2rem 0.5rem" }}
                      >
                        Dupliquer
                      </button>
                      {note.share_token ? (
                        <>
                          <button
                            onClick={() => copierLienPartage(note)}
                            className="btn-brutal ghost"
                            style={{ fontSize: "0.6rem", padding: "0.2rem 0.5rem", color: "var(--success)" }}
                            title="Copier le lien de partage"
                          >
                            {"\uD83D\uDD17"} Lien
                          </button>
                          <button
                            onClick={() => togglePartage(note)}
                            className="btn-brutal ghost"
                            style={{ fontSize: "0.6rem", padding: "0.2rem 0.5rem", color: "var(--danger)" }}
                            title="Désactiver le partage"
                          >
                            {"\u00d7"} Partage
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => togglePartage(note)}
                          className="btn-brutal ghost"
                          style={{ fontSize: "0.6rem", padding: "0.2rem 0.5rem", color: "var(--text-muted)" }}
                          title="Partager"
                          aria-label="Partager la note"
                        >
                          {"\uD83D\uDD17"}
                        </button>
                      )}
                      <button
                        onClick={() => resumerNote(note)}
                        disabled={!note.contenu || resumes[note.id]?.chargement}
                        className="btn-brutal ghost disabled:opacity-30"
                        style={{ fontSize: "0.6rem", padding: "0.2rem 0.5rem", color: "var(--accent)" }}
                        title={note.contenu ? "Résumer avec l'IA" : "Ajoute du contenu pour résumer"}
                      >
                        Résumer
                      </button>
                      <div className="relative" ref={dropdownTagNoteId === note.id ? dropdownRef : null}>
                        <button
                          onClick={() => setDropdownTagNoteId(dropdownTagNoteId === note.id ? null : note.id)}
                          className="btn-brutal ghost"
                          style={{ fontSize: "0.6rem", padding: "0.2rem 0.5rem", color: "var(--accent)" }}
                          title="Ajouter un tag"
                        >
                          + Tag
                        </button>
                        {dropdownTagNoteId === note.id && (
                          <div
                            className="absolute left-0 bottom-full mb-1"
                            style={{
                              background: "var(--glass-bg)",
                              backdropFilter: "blur(16px)",
                              WebkitBackdropFilter: "blur(16px)",
                              border: "2px solid var(--glass-border)",
                              borderRadius: "2px",
                              boxShadow: "4px 4px 0 var(--brutal-shadow)",
                              padding: "0.4rem",
                              minWidth: "120px",
                              zIndex: 50,
                            }}
                          >
                            {tags.filter((t) => !(notesTags[note.id] || []).includes(t.id)).length === 0 ? (
                              <p className="text-xs px-1" style={{ color: "var(--text-muted)" }}>
                                {tags.length === 0 ? "Crée un tag d'abord" : "Tous assignés"}
                              </p>
                            ) : (
                              tags.filter((t) => !(notesTags[note.id] || []).includes(t.id)).map((tag) => (
                                <button
                                  key={tag.id}
                                  onClick={() => ajouterTagANote(note.id, tag.id)}
                                  className="flex items-center gap-1.5 w-full text-left px-2 py-1 text-xs font-bold"
                                  style={{ color: tag.couleur, borderRadius: "1px", cursor: "pointer" }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = tag.couleur + "15"}
                                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                >
                                  <span style={{ width: "0.5rem", height: "0.5rem", background: tag.couleur, borderRadius: "1px", display: "inline-block", flexShrink: 0 }} />
                                  {tag.nom}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      {confirmSuppId === note.id ? (
                        <div className="flex items-center gap-1 ml-auto">
                          <span className="text-xs font-bold uppercase" style={{ color: "var(--danger)", fontSize: "0.6rem" }}>Supprimer ?</span>
                          <button onClick={() => supprimerNote(note.id)} className="btn-brutal danger" style={{ fontSize: "0.6rem", padding: "0.2rem 0.5rem" }}>Oui</button>
                          <button onClick={() => setConfirmSuppId(null)} className="btn-brutal ghost" style={{ fontSize: "0.6rem", padding: "0.2rem 0.5rem" }}>Non</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmSuppId(note.id)}
                          className="btn-brutal ghost ml-auto"
                          style={{ fontSize: "0.6rem", padding: "0.2rem 0.5rem", color: "var(--danger)" }}
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* === KANBAN VIEW === */}
      {viewMode === "kanban" && (
        <div className="workspace-view flex-1 overflow-hidden fade-in flex flex-col">
          {/* Barre recherche + filtres */}
          <div className="glass-card p-3 space-y-2 mb-3" style={{ flexShrink: 0 }}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  ref={rechercheRef}
                  type="text"
                  aria-label="Rechercher dans les notes"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher..."
                  className="input-glass"
                  style={{ paddingRight: "2.5rem", fontSize: "0.8rem", padding: "0.5rem 0.7rem" }}
                />
                {recherche && (
                  <button
                    onClick={() => setRecherche("")}
                    aria-label="Effacer la recherche"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1, padding: "0.15rem" }}
                  >
                    &times;
                  </button>
                )}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {notesFiltrees.length} note{notesFiltrees.length !== 1 ? "s" : ""}
              </span>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setFiltreTagId(filtreTagId === tag.id ? null : tag.id)}
                    style={{
                      background: filtreTagId === tag.id ? tag.couleur : tag.couleur + "20",
                      color: filtreTagId === tag.id ? "#fff" : tag.couleur,
                      border: "1px solid " + tag.couleur,
                      borderRadius: "2px",
                      padding: "0.1rem 0.35rem",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      transition: "all 0.15s",
                    }}
                  >
                    {tag.nom}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Colonnes Kanban */}
          <div className="kanban-container">
            {KANBAN_COLONNES.map((col) => {
              const notesColonne = notesFiltrees
                .filter((n) => (n.kanban_colonne || "todo") === col.id)
                .sort((a, b) => {
                  if (a.epinglee && !b.epinglee) return -1;
                  if (!a.epinglee && b.epinglee) return 1;
                  return (a.kanban_ordre || 0) - (b.kanban_ordre || 0);
                });

              return (
                <div
                  key={col.id}
                  data-kanban-column={col.id}
                  className={"kanban-colonne" + (dragOverColonne === col.id ? " kanban-colonne-dragover" : "")}
                  style={{
                    borderColor: dragOverColonne === col.id ? col.couleur : undefined,
                  }}
                >
                  {/* Header colonne */}
                  <div className="kanban-colonne-header">
                    <span
                      className="kanban-colonne-dot"
                      style={{ background: col.couleur }}
                    />
                    <span className="kanban-colonne-nom">{col.nom}</span>
                    <span className="kanban-colonne-compteur">{notesColonne.length}</span>
                  </div>

                  {/* Cards */}
                  <div className="kanban-colonne-scroll">
                    {notesColonne.length === 0 ? (
                      <div className="kanban-vide">
                        <p style={{ color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase" }}>
                          Aucune note
                        </p>
                      </div>
                    ) : (
                      notesColonne.map((note) => {
                        const tagIds = notesTags[note.id] || [];
                        const tagsDeNote = tagIds.map(getTag).filter(Boolean).slice(0, 2);

                        return (
                          <div
                            key={note.id}
                            className={"kanban-card" + (dragNoteId === note.id ? " kanban-card-dragging" : "")}
                            onClick={() => setNoteDetailId(note.id)}
                            style={{
                              backgroundColor: getCouleurFond(note.couleur),
                              borderColor: note.epinglee ? "var(--accent)" : undefined,
                            }}
                          >
                            <div className="kanban-card-topline">
                              <p className="kanban-card-titre">
                                {note.epinglee && <span style={{ marginRight: "0.25rem" }}>{"\uD83D\uDCCC"}</span>}
                                {note.titre}
                              </p>
                              <button
                                type="button"
                                className="kanban-drag-handle"
                                aria-label={`Faire glisser ${note.titre}`}
                                title="Glisser vers une colonne"
                                onClick={(event) => event.stopPropagation()}
                                onPointerDown={(event) => commencerGlisserKanban(event, note.id)}
                                onPointerMove={continuerGlisserKanban}
                                onPointerUp={terminerGlisserKanban}
                                onPointerCancel={annulerGlisserKanban}
                              >
                                <Icon name="move" size={15} />
                              </button>
                            </div>
                            {tagsDeNote.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {tagsDeNote.map((tag) => (
                                  <span
                                    key={tag.id}
                                    style={{
                                      background: tag.couleur + "25",
                                      color: tag.couleur,
                                      border: "1px solid " + tag.couleur,
                                      borderRadius: "2px",
                                      padding: "0 0.3rem",
                                      fontSize: "0.55rem",
                                      fontWeight: 700,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    {tag.nom}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="kanban-card-footer" onClick={(event) => event.stopPropagation()}>
                              <select
                                className="kanban-move-select"
                                value={note.kanban_colonne || "todo"}
                                aria-label={`Déplacer ${note.titre} vers une colonne`}
                                onChange={(event) => void deplacerNoteKanban(note.id, event.target.value)}
                              >
                                {KANBAN_COLONNES.map((targetColumn) => (
                                  <option key={targetColumn.id} value={targetColumn.id}>
                                    Déplacer vers — {targetColumn.nom}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === LIST VIEW (Split Panel) === */}
      {viewMode === "list" && (
        <div className="workspace-view split-container fade-in" style={{ borderRadius: "4px", overflow: "hidden", border: "2px solid var(--glass-border)" }}>

          {/* === PANNEAU GAUCHE — Liste === */}
          <div className={"panel-left" + (mobileDetail ? " hidden-mobile" : "")}>
            {/* Recherche */}
            <div className="p-3 space-y-2" style={{ borderBottom: "1px solid var(--panel-border)", flexShrink: 0 }}>
              <div className="relative">
                <input
                  ref={rechercheRef}
                  type="text"
                  aria-label="Rechercher dans les notes"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher..."
                  className="input-glass"
                  style={{ paddingRight: "2.5rem", fontSize: "0.8rem", padding: "0.5rem 0.7rem" }}
                />
                {recherche && (
                  <button
                    onClick={() => setRecherche("")}
                    aria-label="Effacer la recherche"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1, padding: "0.15rem" }}
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Filtres tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => setFiltreTagId(filtreTagId === tag.id ? null : tag.id)}
                      style={{
                        background: filtreTagId === tag.id ? tag.couleur : tag.couleur + "20",
                        color: filtreTagId === tag.id ? "#fff" : tag.couleur,
                        border: "1px solid " + tag.couleur,
                        borderRadius: "2px",
                        padding: "0.1rem 0.35rem",
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        transition: "all 0.15s",
                      }}
                    >
                      {tag.nom}
                    </button>
                  ))}
                </div>
              )}

              {/* Tri + compteur */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  {notesFiltrees.length} note{notesFiltrees.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setTriAscendant(!triAscendant)}
                  className="text-xs font-bold uppercase"
                  style={{ color: "var(--accent)", cursor: "pointer", background: "none", border: "none", padding: "0.15rem 0.3rem" }}
                  title={triAscendant ? "Plus récentes en premier" : "Plus anciennes en premier"}
                >
                  {triAscendant ? "\u2191 Ancien" : "\u2193 Récent"}
                </button>
              </div>
            </div>

            {/* Liste des notes */}
            <div className="panel-left-scroll">
              {notes.length === 0 ? (
                <EmptyState
                  compact
                  icon="plus"
                  title="Aucune note"
                  description="Crée ta première capsule."
                  actionLabel="Créer"
                  onAction={() => setModeCreation(true)}
                />
              ) : notesFiltrees.length === 0 ? (
                <EmptyState
                  compact
                  icon="search"
                  title="Aucun résultat"
                  actionLabel="Réinitialiser"
                  onAction={() => { setRecherche(""); setFiltreTagId(null); }}
                />
              ) : (
                notesFiltrees.map((note) => {
                  const tagIds = notesTags[note.id] || [];
                  const tagsDeNote = tagIds.map(getTag).filter(Boolean);
                  const tagsVisibles = tagsDeNote.slice(0, 2);
                  const tagsRestants = tagsDeNote.length - 2;

                  return (
                    <div
                      key={note.id}
                      className={"note-item" + (selectedNoteId === note.id ? " active" : "")}
                      onClick={() => selectionnerNote(note.id)}
                    >
                      {/* Indicateur couleur */}
                      {note.couleur && (
                        <div
                          style={{
                            width: "4px",
                            flexShrink: 0,
                            background: getCouleurFond(note.couleur),
                            marginRight: "0.6rem",
                            borderRadius: "2px",
                          }}
                        />
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Titre tronqué */}
                        <p
                          className="text-xs font-bold"
                          style={{
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {note.epinglee && <span style={{ marginRight: "0.25rem" }}>{"\uD83D\uDCCC"}</span>}
                          {note.titre}
                        </p>

                        <div className="flex items-center gap-2 mt-0.5">
                          {/* Date courte */}
                          <span className="text-xs font-mono" style={{ color: "var(--text-muted)", fontSize: "0.6rem", flexShrink: 0 }}>
                            {new Date(note.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                          </span>

                          {/* Tags mini */}
                          {tagsVisibles.length > 0 && (
                            <div className="flex gap-1" style={{ minWidth: 0, overflow: "hidden" }}>
                              {tagsVisibles.map((tag) => (
                                <span
                                  key={tag.id}
                                  style={{
                                    background: tag.couleur + "25",
                                    color: tag.couleur,
                                    border: "1px solid " + tag.couleur,
                                    borderRadius: "2px",
                                    padding: "0 0.25rem",
                                    fontSize: "0.5rem",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {tag.nom}
                                </span>
                              ))}
                              {tagsRestants > 0 && (
                                <span className="text-xs" style={{ color: "var(--text-muted)", fontSize: "0.5rem" }}>
                                  +{tagsRestants}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* === PANNEAU DROIT — Détail === */}
          <div className={"panel-right" + (!mobileDetail ? " hidden-mobile" : "")}>
            {renderNoteDetail()}
          </div>
        </div>
      )}

      {/* Modale card/kanban view (portail) */}
      {(viewMode === "card" || viewMode === "kanban") && renderModale()}

      <AppFooter onOpenAbout={() => setAboutOpen(true)} />

      {/* Modale de création */}
      {modeCreation && createPortal(
        <div
          ref={modalOverlayRef}
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) fermerModaleCreation();
          }}
        >
          <div
            ref={modalPanelRef}
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: getCouleurFond(couleurNote) || "var(--modal-bg)" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-note-title"
            tabIndex={-1}
          >
            {/* Header */}
            <div className="modal-header">
              <h2 id="new-note-title" className="font-black text-sm" style={{ color: "var(--text-primary)" }}>
                Nouvelle note
              </h2>
              <button
                onClick={fermerModaleCreation}
                aria-label="Fermer la création"
                className="btn-brutal ghost"
                style={{ fontSize: "1.2rem", padding: "0.15rem 0.4rem", lineHeight: 1, flexShrink: 0 }}
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">
              <div className="space-y-3">
                <div>
                  <label htmlFor="new-note-title-input" className="text-xs font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
                    Titre
                  </label>
                  <input
                    id="new-note-title-input"
                    ref={titreRef}
                    type="text"
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    placeholder="Titre de la note"
                    className="input-glass"
                    style={{ fontWeight: 700, fontSize: "1rem" }}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>
                    Contenu
                  </label>
                  <NoteContentEditor
                    value={contenu}
                    onChange={setContenu}
                    pendingImages={creationPendingImages}
                    onPendingImagesChange={setCreationPendingImages}
                    existingImages={[]}
                    imageUrls={imageUrls}
                    placeholder="Contenu (optionnel) — supporte le Markdown"
                    rows={8}
                    minHeight="120px"
                    disabled={noteSaving}
                    imageDisabled={Boolean(imageFeatureError)}
                    uploadProgress={imageUploadProgress}
                    onProcessingChange={setImagePreparing}
                    onOpenHelp={openHelp}
                    onSmartFormat={ouvrirMiseEnFormeCreation}
                    smartFormatBusy={aiFormatting?.loading}
                  />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
                    Couleur de la note
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COULEURS_NOTES.map((c) => (
                      <button
                        key={c.nom}
                        type="button"
                        onClick={() => setCouleurNote(c.hex)}
                        title={c.nom}
                        aria-label={`Couleur ${c.nom}`}
                        aria-pressed={couleurNote === c.hex}
                        style={{
                          width: "1.75rem",
                          height: "1.75rem",
                          borderRadius: "50%",
                          background: c.hex ? (sombre ? c.hexDark : c.hex) : "transparent",
                          border: couleurNote === c.hex
                            ? "3px solid var(--accent)"
                            : "2px solid var(--input-border)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                          boxShadow: couleurNote === c.hex ? "0 0 0 2px var(--accent-glow)" : "none",
                          transition: "all 0.15s",
                        }}
                      >
                        {c.hex === null && "\u00d7"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => ajouterNote()}
                  disabled={!titre.trim() || noteBusy}
                  className="btn-brutal primary disabled:opacity-30"
                  style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}
                >
                  {imagePreparing ? "Optimisation..." : noteSaving ? "Enregistrement..." : "Créer"}
                </button>
                <button
                  onClick={fermerModaleCreation}
                  disabled={noteBusy}
                  className="btn-brutal ghost disabled:opacity-50"
                  style={{ fontSize: "0.7rem", padding: "0.35rem 0.75rem" }}
                >
                  Annuler
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>
                Supporte le Markdown &mdash; **gras**, *italique*, # titre, - liste
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Drawer statistiques */}
      <StatsDrawer
        ouvert={statsOuvert}
        onFermer={() => setStatsOuvert(false)}
        notes={notes}
        tags={tags}
        notesTags={notesTags}
        sombre={sombre}
      />

      <AIFormattingDialog
        open={Boolean(aiFormatting)}
        source={aiFormatting?.source || ""}
        proposal={aiFormatting?.proposal || ""}
        loading={Boolean(aiFormatting?.loading)}
        startedAt={aiFormatting?.startedAt || 0}
        error={aiFormatting?.error || null}
        imageUrls={aiFormatting?.imageUrls || {}}
        onClose={fermerMiseEnForme}
        onRetry={relancerMiseEnForme}
        onApply={appliquerMiseEnForme}
        onConfigure={() => setAISettingsOpen(true)}
        onOpenHelp={() => openHelp("ai")}
      />

      <AISettingsDialog
        open={aiSettingsOpen}
        onClose={() => setAISettingsOpen(false)}
        sessionCredential={sessionAICredential}
        onUseSessionCredential={setSessionAICredential}
        onClearSessionCredential={() => setSessionAICredential(null)}
        onConfigured={setSucces}
        onOpenHelp={() => openHelp("ai")}
      />

      {printNote && (
        <PrintNoteDialog
          open
          note={printNote}
          tags={(notesTags[printNote.id] || []).map(getTag).filter(Boolean)}
          imageUrls={imageUrls}
          onClose={() => setPrintNoteId(null)}
          onRefreshImages={chargerNoteImages}
        />
      )}

      {aideOuverte && (
        <HelpCenterDialog
          open
          onClose={() => setAideOuverte(false)}
          initialSection={helpInitialSection}
          onCreateNote={() => setModeCreation(true)}
          onOpenAISettings={() => setAISettingsOpen(true)}
        />
      )}

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commandItems}
      />

      <MobileNavigation
        viewMode={viewMode}
        onViewChange={changerVue}
        onNewNote={() => setModeCreation(true)}
        onOpenCommand={() => setCommandPaletteOpen(true)}
        busy={noteBusy}
      />

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
