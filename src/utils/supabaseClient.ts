import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a single supabase client instance if credentials are provided
export const supabase = supabaseUrl && supabasePublishableKey 
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;

// Helper to check if Supabase is fully configured
export const isSupabaseConfigured = (): boolean => {
  return !!supabase;
};
