import { NextResponse } from "next/server";

const ERROR_MESSAGES = Object.freeze({
  AUTH_REQUIRED: "Authentification requise.",
  AUTH_INVALID: "Session invalide ou expirée.",
  SERVER_CONFIGURATION_ERROR: "Configuration serveur indisponible.",
  REQUEST_INVALID: "Requête invalide.",
  AI_KEY_REQUIRED: "Clé Anthropic requise.",
  AI_KEY_INVALID_FORMAT: "Format de clé Anthropic invalide.",
  AI_KEY_REJECTED: "Clé Anthropic invalide, expirée ou non autorisée.",
  AI_MODEL_INVALID: "Modèle Anthropic invalide.",
  AI_MODEL_UNAVAILABLE: "Ce modèle n'est pas disponible avec cette clé.",
  AI_MODEL_CATALOG_EMPTY: "Aucun modèle Anthropic disponible.",
  AI_CONFIGURATION_REQUIRED: "Configure une clé Anthropic avant d'utiliser l'IA.",
  AI_CONTENT_REQUIRED: "Titre ou contenu requis pour générer un résumé.",
  AI_CONTENT_TOO_LONG: "Note trop longue pour être résumée.",
  AI_FORMAT_CONTENT_REQUIRED: "Ajoute du texte à mettre en forme.",
  AI_FORMAT_CONTENT_TOO_LONG: "Note trop longue pour être mise en forme.",
  AI_FORMAT_IMAGE_REFERENCE_INVALID: "Une référence d'image privée est invalide. Recharge ou corrige la note.",
  AI_FORMAT_RESPONSE_INVALID: "La proposition IA n'a pas pu être validée. Ton contenu reste inchangé.",
  AI_FORMAT_RESPONSE_TRUNCATED: "La proposition IA est incomplète. Ton contenu reste inchangé.",
  AI_RATE_LIMITED: "Trop de requêtes IA. Réessaie dans quelques instants.",
  AI_PROVIDER_RATE_LIMITED: "Quota Anthropic atteint. Réessaie plus tard.",
  AI_PROVIDER_TIMEOUT: "Anthropic a mis trop de temps à répondre. Ton contenu reste inchangé.",
  AI_PROVIDER_UNREACHABLE: "Anthropic est temporairement injoignable.",
  AI_PROVIDER_RESPONSE_INVALID: "Réponse Anthropic invalide.",
  AI_PROVIDER_ERROR: "Erreur temporaire du service Anthropic.",
  AI_STORAGE_UNAVAILABLE: "Configuration IA temporairement indisponible.",
  AI_STORAGE_WRITE_FAILED: "Impossible d'enregistrer la configuration IA.",
  AI_QUOTA_UNAVAILABLE: "Contrôle de quota IA temporairement indisponible.",
});

export function aiJson(payload, { status = 200, headers = {} } = {}) {
  const response = NextResponse.json(payload, { status, headers });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export function aiEmpty(status = 204) {
  return new NextResponse(null, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" },
  });
}

export function aiError(code, status = 500, headers = {}) {
  return aiJson(
    { error: ERROR_MESSAGES[code] || "Erreur IA inattendue.", code },
    { status, headers },
  );
}

export async function readAIJson(request) {
  try {
    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("invalid");
    }
    return payload;
  } catch {
    const error = new Error("REQUEST_INVALID");
    error.code = "REQUEST_INVALID";
    error.status = 400;
    throw error;
  }
}
