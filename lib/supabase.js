// Client Supabase — initialisation avec les variables d'environnement
import { createClient } from "@supabase/supabase-js";

// URL et clé anonyme du projet Supabase (définies dans .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Création du client Supabase réutilisable dans toute l'application
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
