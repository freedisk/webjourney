"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

// Noms courts des jours de la semaine
const JOURS_COURTS = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

export default function StatsDrawer({ ouvert, onFermer, notes, tags, notesTags, sombre }) {
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [activite7j, setActivite7j] = useState([]);
  const [repartitionTags, setRepartitionTags] = useState([]);

  // Charger les données à l'ouverture
  useEffect(() => {
    if (!ouvert) return;
    chargerStats();
  }, [ouvert]);

  // Fermer avec Échap
  useEffect(() => {
    if (!ouvert) return;
    document.body.style.overflow = "hidden";
    function handleEsc(e) {
      if (e.key === "Escape") onFermer();
    }
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEsc);
    };
  }, [ouvert, onFermer]);

  async function chargerStats() {
    setChargement(true);
    setErreur(null);

    try {
      // Activité 7 derniers jours
      const il7jours = new Date();
      il7jours.setDate(il7jours.getDate() - 6);
      il7jours.setHours(0, 0, 0, 0);

      const { data: notesRecentes, error: errActivite } = await supabase
        .from("notes")
        .select("created_at")
        .gte("created_at", il7jours.toISOString());

      if (errActivite) throw errActivite;

      // Construire les 7 jours avec compteurs
      const jours = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        jours.push({
          date: d.toISOString().slice(0, 10),
          jour: JOURS_COURTS[d.getDay()],
          total: 0,
        });
      }

      for (const n of notesRecentes || []) {
        const dateStr = n.created_at.slice(0, 10);
        const j = jours.find((j) => j.date === dateStr);
        if (j) j.total++;
      }

      setActivite7j(jours);

      // Répartition par tags
      const { data: tagsData, error: errTags } = await supabase
        .from("tags")
        .select("id, nom, couleur");

      if (errTags) throw errTags;

      const { data: ntData, error: errNt } = await supabase
        .from("notes_tags")
        .select("tag_id");

      if (errNt) throw errNt;

      // Compter les notes par tag
      const compteurs = {};
      for (const row of ntData || []) {
        compteurs[row.tag_id] = (compteurs[row.tag_id] || 0) + 1;
      }

      const repartition = (tagsData || []).map((tag) => ({
        nom: tag.nom,
        couleur: tag.couleur,
        total: compteurs[tag.id] || 0,
      })).sort((a, b) => b.total - a.total);

      setRepartitionTags(repartition);
    } catch (err) {
      setErreur("Impossible de charger les statistiques : " + err.message);
    } finally {
      setChargement(false);
    }
  }

  if (!ouvert) return null;

  // Calculs côté client
  const totalNotes = notes.length;
  const notesEpinglees = notes.filter((n) => n.epinglee).length;
  const totalTags = tags.length;
  const totalMots = notes.reduce((acc, n) => acc + (n.contenu ? n.contenu.trim().split(/\s+/).filter(Boolean).length : 0), 0);

  // Évolution mois en cours vs mois dernier
  const maintenant = new Date();
  const debutMoisActuel = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const debutMoisDernier = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);

  const notesCeMois = notes.filter((n) => new Date(n.created_at) >= debutMoisActuel).length;
  const notesMoisDernier = notes.filter((n) => {
    const d = new Date(n.created_at);
    return d >= debutMoisDernier && d < debutMoisActuel;
  }).length;

  const evolution = notesCeMois - notesMoisDernier;
  const evolutionIcone = evolution > 0 ? "\u2191" : evolution < 0 ? "\u2193" : "=";
  const evolutionCouleur = evolution > 0 ? "var(--success)" : evolution < 0 ? "var(--danger)" : "var(--text-muted)";

  // Couleur des barres du graphique activité
  const couleurBarre = sombre ? "#8b6fff" : "#5b2eff";

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      {/* Overlay */}
      <div
        onClick={onFermer}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          animation: "fadeIn 200ms ease-out",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "relative",
          width: "400px",
          maxWidth: "100%",
          height: "100%",
          background: "var(--modal-bg)",
          borderLeft: "2px solid var(--modal-border)",
          boxShadow: "-6px 0 24px rgba(0, 0, 0, 0.3)",
          display: "flex",
          flexDirection: "column",
          animation: "drawerSlideIn 250ms ease-out",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.25rem",
            borderBottom: "1.5px solid var(--modal-separator)",
            flexShrink: 0,
          }}
        >
          <h2 className="font-black text-sm" style={{ color: "var(--text-primary)" }}>
            Mes statistiques
          </h2>
          <button
            onClick={onFermer}
            className="btn-brutal ghost"
            style={{ fontSize: "1.2rem", padding: "0.15rem 0.4rem", lineHeight: 1 }}
          >
            &times;
          </button>
        </div>

        {/* Body scrollable */}
        <div style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: "1rem 1.25rem" }}>
          {chargement ? (
            <div className="flex items-center justify-center py-12">
              <div
                className="inline-block w-6 h-6 border-3 rounded-full animate-spin"
                style={{ borderColor: "var(--accent)", borderTopColor: "transparent", borderWidth: "3px" }}
              />
              <span className="text-xs font-bold uppercase tracking-wider ml-3" style={{ color: "var(--text-muted)" }}>
                Chargement...
              </span>
            </div>
          ) : erreur ? (
            <div className="p-4 text-sm font-bold" style={{ color: "var(--danger)" }}>
              {erreur}
            </div>
          ) : (
            <div className="space-y-6">

              {/* SECTION 1 — Chiffres clés */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                  Chiffres cl&eacute;s
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Total notes", valeur: totalNotes, icone: "\uD83D\uDCDD" },
                    { label: "Épinglées", valeur: notesEpinglees, icone: "\uD83D\uDCCC" },
                    { label: "Tags créés", valeur: totalTags, icone: "\uD83C\uDFF7\uFE0F" },
                    { label: "Mots écrits", valeur: totalMots, icone: "\uD83D\uDCD6" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        background: "var(--panel-bg)",
                        border: "2px solid var(--panel-border)",
                        borderRadius: "2px",
                        padding: "0.75rem",
                        textAlign: "center",
                      }}
                    >
                      <p style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{item.icone}</p>
                      <p className="font-black text-lg" style={{ color: "var(--text-primary)" }}>
                        {item.valeur.toLocaleString("fr-FR")}
                      </p>
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 2 — Activité 7 jours */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                  Activit&eacute; — 7 derniers jours
                </p>
                <div style={{ width: "100%", height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activite7j} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                      <XAxis
                        dataKey="jour"
                        tick={{ fontSize: 11, fill: sombre ? "#a0a0b0" : "#555" }}
                        axisLine={{ stroke: sombre ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: sombre ? "#a0a0b0" : "#555" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: sombre ? "#1e1e2a" : "#fff",
                          border: "2px solid " + (sombre ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"),
                          borderRadius: "2px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                        labelStyle={{ color: sombre ? "#f0f0f0" : "#1a1a1a" }}
                        formatter={(value) => [value + " note" + (value !== 1 ? "s" : ""), ""]}
                      />
                      <Bar dataKey="total" fill={couleurBarre} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* SECTION 3 — Répartition par tags */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                  R&eacute;partition par tags
                </p>
                {repartitionTags.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Aucun tag cr&eacute;&eacute;</p>
                ) : (
                  <div style={{ width: "100%", height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={repartitionTags.filter((t) => t.total > 0)}
                          dataKey="total"
                          nameKey="nom"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          strokeWidth={2}
                          stroke={sombre ? "#0e0e12" : "#f0eee6"}
                        >
                          {repartitionTags.filter((t) => t.total > 0).map((entry, i) => (
                            <Cell key={i} fill={entry.couleur} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: sombre ? "#1e1e2a" : "#fff",
                            border: "2px solid " + (sombre ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"),
                            borderRadius: "2px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                          formatter={(value, name) => [value + " note" + (value !== 1 ? "s" : ""), name]}
                        />
                        <Legend
                          formatter={(value) => (
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                              {value}
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {/* Tags sans notes */}
                {repartitionTags.filter((t) => t.total === 0).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {repartitionTags.filter((t) => t.total === 0).map((tag) => (
                      <span
                        key={tag.nom}
                        style={{
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          color: "var(--text-muted)",
                          background: "var(--panel-bg)",
                          border: "1px solid var(--panel-border)",
                          borderRadius: "2px",
                          padding: "0.1rem 0.35rem",
                          textTransform: "uppercase",
                        }}
                      >
                        {tag.nom} (0)
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 4 — Évolution */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                  &Eacute;volution
                </p>
                <div
                  style={{
                    background: "var(--panel-bg)",
                    border: "2px solid var(--panel-border)",
                    borderRadius: "2px",
                    padding: "0.75rem",
                  }}
                >
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Ce mois-ci : <strong style={{ color: "var(--text-primary)" }}>{notesCeMois} note{notesCeMois !== 1 ? "s" : ""}</strong>
                    {" — "}
                    Mois dernier : <strong style={{ color: "var(--text-primary)" }}>{notesMoisDernier} note{notesMoisDernier !== 1 ? "s" : ""}</strong>
                  </p>
                  <p className="text-sm font-bold mt-1" style={{ color: evolutionCouleur }}>
                    {evolutionIcone} {Math.abs(evolution)} note{Math.abs(evolution) !== 1 ? "s" : ""} {evolution > 0 ? "de plus" : evolution < 0 ? "de moins" : ""}
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
