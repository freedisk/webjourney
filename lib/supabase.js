// Client Supabase — initialisation avec les variables d'environnement
import { createClient } from "@supabase/supabase-js";

// URL et clé publique du projet Supabase (définies dans .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Création du client Supabase réutilisable dans toute l'application
export const supabase = createClient(supabaseUrl, supabasePublicKey);
