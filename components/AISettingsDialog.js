"use client";

import { useEffect, useRef, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import Icon from "@/components/ui/Icon";
import {
  ANTHROPIC_KEY_HEADER,
  chooseDefaultAIModel,
  validateAnthropicApiKey,
} from "@/lib/ai-config";
import { supabase } from "@/lib/supabase";

async function authenticatedRequest(path, options = {}, apiKey = "") {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const error = new Error("Session expirée. Reconnecte-toi.");
    error.code = "AUTH_INVALID";
    throw error;
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${session.access_token}`,
  };
  if (options.body) headers["Content-Type"] = "application/json";
  if (apiKey) headers[ANTHROPIC_KEY_HEADER] = apiKey;

  const response = await fetch(path, { ...options, headers, cache: "no-store" });
  const payload = response.status === 204
    ? null
    : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error || "Configuration IA indisponible.");
    error.code = payload?.code || "AI_REQUEST_FAILED";
    error.status = response.status;
    throw error;
  }
  return payload;
}

export default function AISettingsDialog({
  open,
  onClose,
  sessionCredential,
  onUseSessionCredential,
  onClearSessionCredential,
  onConfigured,
  onOpenHelp,
}) {
  const keyInputRef = useRef(null);
  const [storageMode, setStorageMode] = useState("stored");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState([]);
  const [modelId, setModelId] = useState("");
  const [storedConfigured, setStoredConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setApiKey("");
    setModels([]);
    setError("");
    setMessage("");
    setDeleteArmed(false);
    setLoading(true);

    async function loadSettings() {
      try {
        const settings = await authenticatedRequest("/api/ai/settings");
        if (!active) return;
        setStoredConfigured(Boolean(settings.configured));
        const useSession = Boolean(sessionCredential?.apiKey);
        setStorageMode(useSession ? "session" : "stored");
        setModelId(
          useSession
            ? sessionCredential.modelId || ""
            : settings.modelId || "",
        );

        if (settings.configured || useSession) {
          const catalog = await authenticatedRequest(
            "/api/ai/models",
            { method: "POST" },
            useSession ? sessionCredential.apiKey : "",
          );
          if (!active) return;
          setModels(catalog.models || []);
          setModelId((current) => chooseDefaultAIModel(catalog.models, current));
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSettings();
    return () => { active = false; };
  }, [open, sessionCredential]);

  async function loadModels() {
    setError("");
    setMessage("");
    const candidateKey = apiKey.trim()
      || (storageMode === "session" ? sessionCredential?.apiKey || "" : "");
    if (candidateKey) {
      const validation = validateAnthropicApiKey(candidateKey);
      if (!validation.valid) {
        setError("Le format de la clé Anthropic est invalide.");
        return null;
      }
    } else if (storageMode === "session" || !storedConfigured) {
      setError("Renseigne une clé Anthropic avant le test.");
      return null;
    }

    setTesting(true);
    try {
      const catalog = await authenticatedRequest(
        "/api/ai/models",
        { method: "POST" },
        candidateKey,
      );
      const availableModels = catalog.models || [];
      setModels(availableModels);
      setModelId((current) => chooseDefaultAIModel(availableModels, current));
      setMessage(`${availableModels.length} modèle${availableModels.length > 1 ? "s" : ""} disponible${availableModels.length > 1 ? "s" : ""}.`);
      return { models: availableModels, apiKey: candidateKey };
    } catch (testError) {
      setError(testError.message);
      return null;
    } finally {
      setTesting(false);
    }
  }

  async function saveSettings() {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const tested = await loadModels();
      if (!tested) return;
      const selected = tested.models.some((model) => model.id === modelId)
        ? modelId
        : chooseDefaultAIModel(tested.models, modelId);
      if (!selected) {
        setError("Sélectionne un modèle Anthropic.");
        return;
      }

      if (storageMode === "session") {
        onUseSessionCredential({ apiKey: tested.apiKey, modelId: selected });
        onConfigured?.("Clé IA active pour cette session uniquement.");
      } else {
        await authenticatedRequest("/api/ai/settings", {
          method: "PUT",
          body: JSON.stringify({
            apiKey: apiKey.trim() || undefined,
            modelId: selected,
          }),
        });
        onClearSessionCredential();
        setStoredConfigured(true);
        onConfigured?.("Clé IA chiffrée et modèle synchronisé.");
      }
      setApiKey("");
      onClose();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteStoredSettings() {
    if (!deleteArmed) {
      setDeleteArmed(true);
      setMessage("Clique une seconde fois pour confirmer la suppression définitive.");
      return;
    }

    setDeleting(true);
    setError("");
    try {
      await authenticatedRequest("/api/ai/settings", { method: "DELETE" });
      setStoredConfigured(false);
      setDeleteArmed(false);
      setModels([]);
      setModelId("");
      setMessage("Clé synchronisée supprimée.");
      onConfigured?.("Clé IA synchronisée supprimée.");
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeleting(false);
    }
  }

  function clearSessionSettings() {
    onClearSessionCredential();
    setModels([]);
    setModelId("");
    setMessage("Clé de session oubliée.");
  }

  const busy = loading || testing || saving || deleting;

  function closeDialog() {
    if (busy) return;
    setApiKey("");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={closeDialog}
      title="Paramètres IA"
      description="Ta clé finance uniquement tes appels Anthropic. Capsule ne la réaffiche jamais."
      className="ai-settings-dialog"
      initialFocusRef={keyInputRef}
      closeOnBackdrop={!busy}
      footer={(
        <>
          <button type="button" className="btn-brutal ghost" onClick={closeDialog} disabled={busy}>
            Annuler
          </button>
          <button type="button" className="btn-brutal primary" onClick={saveSettings} disabled={busy}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </>
      )}
    >
      <div className="ai-settings-stack">
        <div className="ai-status-card" role="status">
          <span className={`ai-status-dot ${storedConfigured ? "is-ready" : ""}`} />
          <div>
            <strong>{storedConfigured ? "Clé synchronisée configurée" : "Aucune clé synchronisée"}</strong>
            <small>{sessionCredential?.apiKey ? "Une clé éphémère est active dans cette page." : "Aucun secret n'est conservé dans le stockage du navigateur."}</small>
          </div>
        </div>

        <fieldset className="ai-mode-fieldset" disabled={busy}>
          <legend>Conservation de la clé</legend>
          <label className={storageMode === "stored" ? "is-selected" : ""}>
            <input
              type="radio"
              name="ai-storage-mode"
              value="stored"
              checked={storageMode === "stored"}
              onChange={() => { setStorageMode("stored"); setError(""); }}
            />
            <span>
              <strong>Synchronisée et chiffrée</strong>
              <small>Supabase Vault, disponible sur tes appareils connectés.</small>
            </span>
          </label>
          <label className={storageMode === "session" ? "is-selected" : ""}>
            <input
              type="radio"
              name="ai-storage-mode"
              value="session"
              checked={storageMode === "session"}
              onChange={() => { setStorageMode("session"); setError(""); }}
            />
            <span>
              <strong>Cette session uniquement</strong>
              <small>Mémoire vive seulement ; oubliée au rechargement.</small>
            </span>
          </label>
        </fieldset>

        <div className="ai-form-field">
          <label htmlFor="anthropic-api-key">Clé API Anthropic</label>
          <input
            ref={keyInputRef}
            id="anthropic-api-key"
            type="password"
            value={apiKey}
            onChange={(event) => { setApiKey(event.target.value); setError(""); setMessage(""); }}
            placeholder={storedConfigured && storageMode === "stored"
              ? "Laisser vide pour conserver la clé actuelle"
              : "sk-ant-…"}
            className="input-glass"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            data-1p-ignore
            disabled={busy}
          />
          <small>La clé n’est jamais incluse dans une note, une réponse JSON ou un log applicatif.</small>
        </div>

        <button
          type="button"
          className="btn-brutal ghost ai-test-button"
          onClick={loadModels}
          disabled={busy}
        >
          <Icon name="sparkles" size={17} />
          {testing ? "Vérification…" : "Tester et charger les modèles"}
        </button>

        <div className="ai-form-field">
          <label htmlFor="anthropic-model">Modèle</label>
          <select
            id="anthropic-model"
            className="input-glass"
            value={modelId}
            onChange={(event) => setModelId(event.target.value)}
            disabled={busy || models.length === 0}
          >
            <option value="">Tester la clé pour charger les modèles</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.displayName} — {model.id}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="ai-settings-message is-error" role="alert">{error}</p>}
        {message && <p className="ai-settings-message" role="status">{message}</p>}

        <div className="ai-privacy-note">
          <Icon name="key" size={18} />
          <div>
            <p>Lors d’un résumé, le titre et le texte de la note sont transmis à Anthropic via le serveur Capsule. Les images et le résumé ne sont pas persistés par Capsule.</p>
            {onOpenHelp && (
              <button type="button" className="help-inline-link" onClick={onOpenHelp} disabled={busy}>
                Comprendre les modes et la confidentialité
              </button>
            )}
          </div>
        </div>

        {(sessionCredential?.apiKey || storedConfigured) && (
          <div className="ai-danger-zone">
            {sessionCredential?.apiKey && (
              <button type="button" className="btn-brutal ghost" onClick={clearSessionSettings} disabled={busy}>
                Oublier la clé de session
              </button>
            )}
            {storedConfigured && (
              <button
                type="button"
                className={`btn-brutal ghost ${deleteArmed ? "is-danger" : ""}`}
                onClick={deleteStoredSettings}
                disabled={busy}
              >
                {deleting ? "Suppression…" : deleteArmed ? "Confirmer la suppression" : "Supprimer la clé synchronisée"}
              </button>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
