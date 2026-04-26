// ─── DMD Tier Check — Netlify Serverless Function ────────────
// Resolves a user's tier from admin list or active Stripe subscriptions and
// returns the canonical limits + current-month AI usage for that user.
//
// Response shape:
//   { tier, limits, usage, source }
// where tier is one of 'free' | 'adventurer' | 'dungeon_master' | 'bundle'.

import { createClient } from '@supabase/supabase-js';
import {
  isAdmin,
  tierForProduct,
  highestTier,
  limitsForTier,
  currentMonthKey,
} from './_tierConfig.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST',
};

const ZERO_USAGE = { improvUsed: 0, npcGenUsed: 0, summaryUsed: 0 };

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { email } = body;
  if (!email) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Email required' }) };
  }

  // Resolve tier first (admin override, then Stripe lookup, then free fallback).
  const { tier, source } = await resolveTier(email);

  // Fetch this user's current-month AI usage. Errors are non-fatal — return
  // zero usage rather than failing the whole request.
  const usage = await fetchUsage(email);

  return respond({
    tier,
    limits: limitsForTier(tier),
    usage,
    source,
  });
}

async function resolveTier(email) {
  // Admin override → top tier (Bundle, so CE-side cross-app checks pass).
  if (isAdmin(email)) {
    return { tier: 'bundle', source: 'admin' };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { tier: 'free', source: 'no_stripe_key' };
  }

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

async function fetchUsage(email) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return { ...ZERO_USAGE };

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
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

function respond(payload) {
  return {
    statusCode: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}
