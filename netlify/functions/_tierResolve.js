// ─── Tier + AI quota gate (shared) ─────────────────────────────
// Centralizes the Stripe customer/subscription lookup that check-tier and
// every AI function need, plus the read-then-upsert quota counter.
//
// Underscore prefix keeps Netlify's function bundler from treating this as a
// deployable endpoint.

import { createClient } from '@supabase/supabase-js';
import {
  isAdmin,
  tierForProduct,
  highestTier,
  limitsForTier,
  currentMonthKey,
} from './_tierConfig.js';

// AI feature → corresponding limit field + usage column + response key.
const FEATURE_MAP = {
  improv:  { limitKey: 'aiImprovQuota',  column: 'improv_count',  usageKey: 'improvUsed'  },
  npc_gen: { limitKey: 'aiNpcGenQuota',  column: 'npc_gen_count', usageKey: 'npcGenUsed'  },
  summary: { limitKey: 'aiSummaryQuota', column: 'summary_count', usageKey: 'summaryUsed' },
};

const ZERO_USAGE = { improvUsed: 0, npcGenUsed: 0, summaryUsed: 0 };

// ─── Tier resolution ───────────────────────────────────────────

export async function resolveTier(email) {
  if (isAdmin(email)) return { tier: 'bundle', source: 'admin' };

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return { tier: 'free', source: 'no_stripe_key' };

  try {
    const custRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=5`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const custData = await custRes.json();
    if (!custData.data?.length) return { tier: 'free', source: 'no_customer' };

    const foundTiers = [];
    for (const customer of custData.data) {
      const subRes = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=active&limit=10`,
        { headers: { Authorization: `Bearer ${stripeKey}` } }
      );
      const subData = await subRes.json();
      for (const sub of (subData.data || [])) {
        for (const item of (sub.items?.data || [])) {
          const t = tierForProduct(item.price?.product);
          if (t) foundTiers.push(t);
        }
      }
    }

    const best = highestTier(foundTiers);
    if (best) return { tier: best, source: 'stripe' };
    return { tier: 'free', source: 'no_subscription' };
  } catch (err) {
    console.error('Stripe check error:', err);
    return { tier: 'free', source: 'error' };
  }
}

// ─── Usage tracking ────────────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function fetchUsage(email) {
  const supabase = getSupabase();
  if (!supabase) return { ...ZERO_USAGE };
  try {
    const { data } = await supabase
      .from('user_ai_usage')
      .select('improv_count, npc_gen_count, summary_count')
      .eq('user_email', email)
      .eq('month_key', currentMonthKey())
      .maybeSingle();
    return {
      improvUsed: data?.improv_count || 0,
      npcGenUsed: data?.npc_gen_count || 0,
      summaryUsed: data?.summary_count || 0,
    };
  } catch (err) {
    console.error('Usage fetch error:', err);
    return { ...ZERO_USAGE };
  }
}

// Read-then-upsert. Not atomic. Worst-case race = 1 undercount per user
// across the system lifetime — acceptable for MVP. Atomic-via-RPC is a
// follow-up.
async function incrementUsage(email, feature) {
  const map = FEATURE_MAP[feature];
  if (!map) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const monthKey = currentMonthKey();
  try {
    const { data: existing } = await supabase
      .from('user_ai_usage')
      .select(map.column)
      .eq('user_email', email)
      .eq('month_key', monthKey)
      .maybeSingle();
    const next = (existing?.[map.column] || 0) + 1;
    const { error } = await supabase
      .from('user_ai_usage')
      .upsert({
        user_email: email,
        month_key: monthKey,
        [map.column]: next,
        updated_at: new Date().toISOString(),
      });
    if (error) console.error('Usage upsert error:', error);
  } catch (err) {
    console.error('Increment usage error:', err);
  }
}

// ─── AI gate ───────────────────────────────────────────────────
//
// Used by every AI Netlify function. Returns one of:
//   { ok: true, tier, recordUsage(): Promise<void> }
//   { blocked: { statusCode, headers, body } }
//
// Callers MUST invoke recordUsage() only after a successful upstream AI call —
// errors and bad-format responses should not burn the user's quota.
//
// Kill switch: AI_QUOTA_ENFORCED=false bypasses the tier check, the quota
// check, AND the increment so the counter doesn't get poisoned by Adventurer
// or free-tier traffic during a disabled window.
export async function gateAi({ email, feature, corsHeaders = {} }) {
  if (!email) return { blocked: respond(400, { error: 'userEmail is required' }, corsHeaders) };
  const map = FEATURE_MAP[feature];
  if (!map) return { blocked: respond(500, { error: `Unknown AI feature: ${feature}` }, corsHeaders) };

  const enforced = process.env.AI_QUOTA_ENFORCED !== 'false';
  const { tier } = await resolveTier(email);

  if (!enforced) {
    return { ok: true, tier, recordUsage: async () => {} };
  }

  // DM / Bundle → unlimited, no counter increment.
  if (tier === 'dungeon_master' || tier === 'bundle') {
    return { ok: true, tier, recordUsage: async () => {} };
  }

  // Adventurer is paid but excluded from AI per the spec.
  if (tier === 'adventurer') {
    return {
      blocked: respond(402, {
        error: 'tier_required',
        requiredTier: 'dungeon_master',
        upgradeUrl: '/pricing',
      }, corsHeaders),
    };
  }

  // Free tier — quota-gated.
  const limits = limitsForTier(tier);
  const usage = await fetchUsage(email);
  const limit = limits[map.limitKey];
  const used = usage[map.usageKey];

  if (limit === 0 || (limit > 0 && used >= limit)) {
    return {
      blocked: respond(402, {
        error: 'quota_exceeded',
        feature,
        used,
        limit,
        upgradeUrl: '/pricing',
      }, corsHeaders),
    };
  }

  return {
    ok: true,
    tier,
    recordUsage: () => incrementUsage(email, feature),
  };
}

function respond(statusCode, body, corsHeaders) {
  return {
    statusCode,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
