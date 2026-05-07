// ─── DMD User Preferences — Netlify Serverless Function ────────
// GET-style and SET-style under one POST endpoint (matches the rest of
// our function patterns). Currently only handles the global AI toggle;
// this function is designed to grow as more per-user prefs land.
//
// Request shape:
//   { email, action: 'get' }                        → { aiEnabled }
//   { email, action: 'set', aiEnabled: boolean }    → { aiEnabled }
//
// No-row reads return aiEnabled: true (default). Sets are upserts —
// rows are only created when a user actually toggles, per the lazy-
// write spec.

import { fetchAiEnabled, setAiEnabled } from './_aiPref.js';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST',
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { ...cors, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' });
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return respond(400, { error: 'Invalid JSON' }); }

  const { email, action, aiEnabled } = body || {};
  if (!email) return respond(400, { error: 'email required' });

  if (action === 'set') {
    if (typeof aiEnabled !== 'boolean') {
      return respond(400, { error: 'aiEnabled must be boolean' });
    }
    const ok = await setAiEnabled(email, aiEnabled);
    if (!ok) return respond(500, { error: 'Failed to save preference' });
    return respond(200, { aiEnabled });
  }

  // Default: get
  const current = await fetchAiEnabled(email);
  return respond(200, { aiEnabled: current });
}
