import { createClient } from "@supabase/supabase-js";

export class RequestAuthError extends Error {
  constructor(code, status) {
    super(code);
    this.name = "RequestAuthError";
    this.code = code;
    this.status = status;
  }
}

export async function requireSupabaseUser(request) {
  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!accessToken) throw new RequestAuthError("AUTH_REQUIRED", 401);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new RequestAuthError("SERVER_CONFIGURATION_ERROR", 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) throw new RequestAuthError("AUTH_INVALID", 401);

  return user;
}
