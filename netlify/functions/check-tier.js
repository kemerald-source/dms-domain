// ─── DMD Tier Check — Netlify Serverless Function ────────────
// Resolves a user's tier from admin list or active Stripe subscriptions.
// Returns: 'free' | 'adventurer' | 'dungeon_master'.

import { isAdmin, tierForProduct, highestTier } from './_tierConfig.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST',
};

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

  // Admin override → top tier
  if (isAdmin(email)) {
    return json({ tier: 'dungeon_master', source: 'admin' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return json({ tier: 'free', source: 'no_stripe_key' });
  }

  try {
    const custRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=5`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const custData = await custRes.json();
    if (!custData.data?.length) return json({ tier: 'free', source: 'no_customer' });

    // Collect every tier this email has an active sub for; return the highest.
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
    if (best) return json({ tier: best, source: 'stripe' });
    return json({ tier: 'free', source: 'no_subscription' });
  } catch (err) {
    console.error('Stripe check error:', err);
    return json({ tier: 'free', source: 'error' });
  }
}

function json(payload) {
  return {
    statusCode: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}
