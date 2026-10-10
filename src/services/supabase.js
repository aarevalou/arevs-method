import { createClient } from "@supabase/supabase-js";
import {
  prepareSessionStorage,
  SUPABASE_AUTH_STORAGE_KEY,
} from "./sessionPersistence";

try {
  prepareSessionStorage();
} catch (error) {
  console.error("No se pudo preparar el almacenamiento de sesión.", error);
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storageKey: SUPABASE_AUTH_STORAGE_KEY,
      },
    })
  : null;
