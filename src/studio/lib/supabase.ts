import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseBrowser } from '../../lib/supabaseBrowser';

const client = supabaseBrowser();
if (!client) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set for the studio.');
}

export const supabase: SupabaseClient = client;
