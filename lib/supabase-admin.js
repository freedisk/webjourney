import { createClient } from "@supabase/supabase-js";

// Client strictement serveur : la clé secrète contourne les politiques RLS.
export function getSupabaseAdmin() {
  if (typeof window !== "undefined") {
    throw new Error("Le client Supabase administrateur ne peut pas être utilisé dans le navigateur.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !secretKey) return null;

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
