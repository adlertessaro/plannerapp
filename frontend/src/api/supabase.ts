///<reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

// Essas informações você pega no Dashboard do Supabase (Project Settings > API)
const supabaseUrl = import.meta.env.VITE_DB_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL ou Anon Key não estão definidos nas variáveis de ambiente.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


