// ─── AI feature pref (shared) ──────────────────────────────────
// Reads user_preferences.ai_enabled. Default = TRUE when no row exists
// (per-spec lazy write: rows are only inserted when a user toggles off
// at least once). Underscore prefix keeps Netlify's bundler from
// treating this as a deployable endpoint.

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function fetchAiEnabled(email) {
  if (!email) return true;
  const supabase = getSupabase();
  if (!supabase) return true;
  try {
    const { data } = await supabase
      .from('user_preferences')
      .select('ai_enabled')
      .eq('user_email', email)
      .maybeSingle();
    // No row → default true. Explicit false → false. Anything else → true.
    return data?.ai_enabled !== false;
  } catch (err) {
    console.error('AI pref fetch error:', err);
    // Fail-open: don't break AI for everyone if the prefs table glitches.
    return true;
  }
}

export async function setAiEnabled(email, aiEnabled) {
  if (!email) return false;
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_email: email,
        ai_enabled: !!aiEnabled,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      console.error('AI pref upsert error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('AI pref set error:', err);
    return false;
  }
}
