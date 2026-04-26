// ─── DMD Tier Check — Netlify Serverless Function ────────────
// Resolves a user's tier and returns canonical limits + current-month AI
// usage. The Stripe lookup + usage fetch live in _tierResolve.js so AI
// functions can share them.
//
// Response shape:
//   { tier, limits, usage, source }
// where tier is one of 'free' | 'adventurer' | 'dungeon_master' | 'bundle'.

import { limitsForTier } from './_tierConfig.js';
import { resolveTier, fetchUsage } from './_tierResolve.js';

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

  const { tier, source } = await resolveTier(email);
  const usage = await fetchUsage(email);

  return {
    statusCode: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tier,
      limits: limitsForTier(tier),
      usage,
      source,
    }),
  };
}
