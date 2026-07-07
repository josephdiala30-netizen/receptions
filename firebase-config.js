// Supabase Configuration (replaces Firebase)
var SUPABASE_URL = 'https://xhweqrlyppvtksqbqrne.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_UMaXwhml3R_i0HFxYDuzXg_LtFmx96A';

var supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});
