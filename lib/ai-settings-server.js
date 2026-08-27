import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { AI_RATE_LIMIT } from "@/lib/ai-config";

export class AISettingsError extends Error {
  constructor(code, status = 503) {
    super(code);
    this.name = "AISettingsError";
    this.code = code;
    this.status = status;
  }
}

function adminClient() {
  const admin = getSupabaseAdmin();
  if (!admin) throw new AISettingsError("AI_STORAGE_UNAVAILABLE");
  return admin;
}

function firstRow(data) {
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

export async function getAISettings(userId) {
  const { data, error } = await adminClient()
    .from("user_ai_settings")
    .select("provider, model_id, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new AISettingsError("AI_STORAGE_UNAVAILABLE");
  if (!data) return { configured: false, provider: "anthropic", modelId: null };
  return {
    configured: true,
    provider: data.provider,
    modelId: data.model_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getStoredAICredential(userId) {
  const { data, error } = await adminClient().rpc("get_user_ai_credential", {
    p_user_id: userId,
  });
  if (error) throw new AISettingsError("AI_STORAGE_UNAVAILABLE");
  const row = firstRow(data);
  if (!row?.api_key || !row?.model_id) return null;
  return { apiKey: row.api_key, modelId: row.model_id };
}

export async function storeAICredential(userId, apiKey, modelId) {
  const { error } = await adminClient().rpc("store_user_ai_credential", {
    p_user_id: userId,
    p_api_key: apiKey,
    p_model_id: modelId,
  });
  if (error) throw new AISettingsError("AI_STORAGE_WRITE_FAILED");
}

export async function updateStoredAIModel(userId, modelId) {
  const { data, error } = await adminClient()
    .from("user_ai_settings")
    .update({ model_id: modelId, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();
  if (error || !data) throw new AISettingsError("AI_STORAGE_WRITE_FAILED");
}

export async function deleteStoredAICredential(userId) {
  const { error } = await adminClient().rpc("delete_user_ai_credential", {
    p_user_id: userId,
  });
  if (error) throw new AISettingsError("AI_STORAGE_WRITE_FAILED");
}

export async function consumeAIQuota(userId) {
  const { data, error } = await adminClient().rpc("consume_ai_quota", {
    p_user_id: userId,
  });
  if (error) throw new AISettingsError("AI_QUOTA_UNAVAILABLE");
  const row = firstRow(data);
  if (!row) throw new AISettingsError("AI_QUOTA_UNAVAILABLE");
  return {
    allowed: Boolean(row.allowed),
    remaining: Number(row.remaining_requests),
    resetAt: row.reset_at,
    limit: AI_RATE_LIMIT.requests,
  };
}
