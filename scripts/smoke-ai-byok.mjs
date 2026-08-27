import { createClient } from "@supabase/supabase-js";
import {
  ANTHROPIC_KEY_HEADER,
  chooseDefaultAIModel,
} from "../lib/ai-config.js";

const baseUrlArgument = process.argv.find((argument) => argument.startsWith("--base-url="));
const baseUrl = (baseUrlArgument?.slice("--base-url=".length) || "http://localhost:3101")
  .replace(/\/$/, "");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SECRET_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY;
const anthropicKey = process.env.AI_SMOKE_ANTHROPIC_API_KEY
  || process.env.ANTHROPIC_API_KEY;

if (process.env.AI_SMOKE_ALLOW_SYNTHETIC_WRITES !== "1") {
  throw new Error("Définir AI_SMOKE_ALLOW_SYNTHETIC_WRITES=1 pour autoriser le compte temporaire.");
}
if (!supabaseUrl || !publicKey || !serviceKey || !anthropicKey) {
  throw new Error("Variables Supabase et clé Anthropic de recette requises.");
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const publicClient = createClient(supabaseUrl, publicKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let syntheticUserId = null;
let accessToken = "";
let failure = null;
const checks = [];

function assert(condition, label) {
  if (!condition) throw new Error(`Échec smoke AI-001 : ${label}`);
  checks.push(label);
}

async function api(path, { method = "GET", body, apiKey, authenticated = true } = {}) {
  const headers = {};
  if (authenticated && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (apiKey) headers[ANTHROPIC_KEY_HEADER] = apiKey;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = response.status === 204
    ? null
    : await response.json().catch(() => ({}));
  return { response, payload };
}

try {
  for (const [path, method] of [
    ["/api/ai/settings", "GET"],
    ["/api/ai/models", "POST"],
    ["/api/resumer", "POST"],
  ]) {
    const { response } = await api(path, {
      method,
      body: method === "POST" ? {} : undefined,
      authenticated: false,
    });
    assert(response.status === 401, `${method} ${path} refuse une requête anonyme`);
  }

  const suffix = crypto.randomUUID();
  const email = `ai001-${suffix}@capsule.invalid`;
  const password = `Ai001!${suffix}`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { purpose: "AI-001 synthetic smoke" },
  });
  if (createError || !created.user) throw new Error("Création du compte synthétique impossible.");
  syntheticUserId = created.user.id;

  const { data: signedIn, error: signInError } = await publicClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !signedIn.session) throw new Error("Connexion synthétique impossible.");
  accessToken = signedIn.session.access_token;

  let result = await api("/api/ai/settings");
  assert(result.response.status === 200 && result.payload?.configured === false,
    "configuration initiale absente");

  result = await api("/api/resumer", {
    method: "POST",
    body: { titre: "Smoke AI-001", contenu: "Configuration absente." },
  });
  assert(result.response.status === 428 && result.payload?.code === "AI_CONFIGURATION_REQUIRED",
    "résumé sans configuration refusé en 428");

  const invalidKey = "sk-ant-invalide";
  result = await api("/api/ai/models", { method: "POST", apiKey: invalidKey });
  assert(result.response.status === 400 && result.payload?.code === "AI_KEY_INVALID_FORMAT",
    "format de clé invalide refusé sans détail fournisseur");
  assert(!JSON.stringify(result.payload).includes(invalidKey), "clé invalide absente de la réponse");

  result = await api("/api/ai/models", { method: "POST", apiKey: anthropicKey });
  assert(result.response.status === 200 && Array.isArray(result.payload?.models)
    && result.payload.models.length > 0, "catalogue Anthropic chargé en mode session");
  const modelId = chooseDefaultAIModel(result.payload.models);
  assert(Boolean(modelId), "modèle disponible sélectionné");

  result = await api("/api/resumer", {
    method: "POST",
    apiKey: anthropicKey,
    body: {
      titre: "Recette session",
      contenu: "Capsule vérifie une clé éphémère sans la persister.",
      modelId,
    },
  });
  assert(result.response.status === 200 && typeof result.payload?.resume === "string"
    && result.payload.resume.length > 0, "résumé réel en mode session");
  assert(!JSON.stringify(result.payload).includes(anthropicKey), "clé session absente de la réponse");

  result = await api("/api/ai/settings", {
    method: "PUT",
    body: { apiKey: anthropicKey, modelId },
  });
  assert(result.response.status === 200 && result.payload?.configured === true,
    "clé synchronisée enregistrée dans Vault");

  result = await api("/api/ai/settings");
  assert(result.response.status === 200 && result.payload?.configured === true
    && result.payload?.modelId === modelId && !("apiKey" in result.payload),
  "statut Vault retourné sans secret");

  result = await api("/api/resumer", {
    method: "POST",
    body: {
      titre: "Recette Vault",
      contenu: "Capsule relit la clé uniquement sur le serveur.",
    },
  });
  assert(result.response.status === 200 && typeof result.payload?.resume === "string",
    "résumé réel avec la clé Vault");

  result = await api("/api/ai/settings", { method: "DELETE" });
  assert(result.response.status === 204, "suppression explicite du réglage Vault");
  result = await api("/api/ai/settings");
  assert(result.response.status === 200 && result.payload?.configured === false,
    "configuration absente après suppression");

  const { error: quotaResetError } = await admin
    .from("ai_rate_limits")
    .delete()
    .eq("user_id", syntheticUserId);
  if (quotaResetError) throw new Error("Réinitialisation du quota synthétique impossible.");
  for (let index = 0; index < 11; index += 1) {
    const { data, error } = await admin.rpc("consume_ai_quota", {
      p_user_id: syntheticUserId,
    });
    if (error || !Array.isArray(data) || !data[0]) {
      throw new Error("RPC de quota synthétique indisponible.");
    }
    assert(Boolean(data[0].allowed) === (index < 10),
      `quota atomique appel ${index + 1}`);
  }
} catch (error) {
  failure = error;
} finally {
  if (syntheticUserId) {
    await admin.rpc("delete_user_ai_credential", { p_user_id: syntheticUserId });
    await admin.auth.admin.deleteUser(syntheticUserId);

    const [settings, quota, user] = await Promise.all([
      admin.from("user_ai_settings").select("user_id", { count: "exact", head: true })
        .eq("user_id", syntheticUserId),
      admin.from("ai_rate_limits").select("user_id", { count: "exact", head: true })
        .eq("user_id", syntheticUserId),
      admin.auth.admin.getUserById(syntheticUserId),
    ]);
    assert(settings.count === 0, "zéro réglage synthétique résiduel");
    assert(quota.count === 0, "zéro quota synthétique résiduel");
    assert(!user.data?.user, "compte synthétique supprimé");
  }
}

if (failure) throw failure;
console.log(JSON.stringify({ ok: true, baseUrl, checks: checks.length }));
