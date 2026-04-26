// ─── DMD AI NPC Embellish — Netlify Serverless Function ───────
// Takes sparse NPC input + campaign context, returns fleshed-out NPC.
// Preserves everything the DM explicitly wrote; AI only fills gaps.

import { createClient } from '@supabase/supabase-js';
import { gateAi } from './_tierResolve.js';

const SYSTEM_PROMPT = `You are the NPC embellishment engine inside DM's Domain, a D&D 5e campaign management tool. The DM has created a rough NPC and wants you to flesh it out.

RULES:
1. PRESERVE everything the DM wrote — do not rephrase, soften, or replace their input
2. Only FILL IN fields the DM left empty or very sparse (a few words)
3. Use the campaign context to make the NPC fit naturally into the world — reference active NPCs, locations, plot threads, and party members where appropriate
4. Keep each field concise: personality 2-3 sentences, quirks 1 sentence, voice 1 sentence, motivation 1-2 sentences
5. The NPC should feel like they belong in THIS campaign, not a generic fantasy world

Return a JSON object with these fields (include ALL fields even if unchanged):
{
  "name": "NPC name",
  "role": "Role/Occupation",
  "personality": "2-3 sentence personality",
  "quirks": "One memorable habit or quirk",
  "voice_notes": "How they speak — cadence, accent, volume",
  "motivation": "What drives them, what they want",
  "location": "Where they can be found"
}

Respond ONLY with valid JSON, no preamble, no markdown.`;

// ─── Context fetching (lightweight — just what NPC generation needs) ─

function truncate(str, max) {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max) + '…';
}

async function fetchNpcContext(supabase, campaignId) {
  const [campRes, npcsRes, threadsRes, loreRes, homebrewRes] = await Promise.all([
    supabase.from('campaigns').select('name, description, party_id').eq('id', campaignId).single(),
    supabase.from('npcs').select('name, role, status').eq('campaign_id', campaignId).in('status', ['alive', 'unknown']).limit(15),
    supabase.from('story_threads').select('title, thread_type').eq('campaign_id', campaignId).neq('status', 'resolved').limit(5),
    supabase.from('world_lore').select('name, type').eq('campaign_id', campaignId).limit(10),
    supabase.from('homebrew').select('name, type, notes').eq('campaign_id', campaignId),
  ]);

  const campaign = campRes.data;
  if (!campaign) return null;

  // Fetch party (CE + manual) if linked
  let party = [];
  if (campaign.party_id) {
    const { data: members } = await supabase
      .from('party_members').select('character_id, role').eq('party_id', campaign.party_id);
    const players = (members || []).filter(m => m.role !== 'dm' && m.character_id);
    if (players.length > 0) {
      const { data: chars } = await supabase
        .from('characters').select('id, character_data').in('id', players.map(m => m.character_id));
      party = (chars || []).map(c => {
        const cd = c.character_data;
        return cd ? `${cd.name || 'Unknown'} (${cd.race || ''} ${cd.class || ''} ${cd.level || ''})`.trim() : null;
      }).filter(Boolean);
    }
  }
  // Add manual characters
  const { data: manualChars } = await supabase
    .from('manual_characters').select('name, class, level, race').eq('campaign_id', campaignId);
  (manualChars || []).forEach(mc => {
    party.push(`${mc.name} (${mc.race || ''} ${mc.class || ''} ${mc.level || ''})`.trim());
  });

  const parts = [`Campaign: ${campaign.name}${campaign.description ? ` — ${campaign.description}` : ''}`];
  if (party.length) parts.push(`Party: ${party.join(', ')}`);
  if (npcsRes.data?.length) parts.push(`Existing NPCs: ${npcsRes.data.map(n => `${n.name} (${n.role || n.status})`).join(', ')}`);
  if (threadsRes.data?.length) parts.push(`Active threads: ${threadsRes.data.map(t => t.title).join(', ')}`);
  if (loreRes.data?.length) parts.push(`World lore: ${loreRes.data.map(l => `${l.name} (${l.type})`).join(', ')}`);
  if (homebrewRes.data?.length) parts.push(`Homebrew content: ${homebrewRes.data.map(h => `${h.name} (${h.type})${h.notes ? ` — ${h.notes}` : ''}`).join(', ')}`);

  return parts.join('\n');
}

// ─── Handler ────────────────────────────────────────────────────

export async function handler(event) {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST' };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!apiKey) return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }) };
  if (!supabaseUrl || !supabaseKey) return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Supabase not configured' }) };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { campaignId, userEmail, npcInput } = body;
  if (!campaignId || !userEmail || !npcInput?.name?.trim()) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'campaignId, userEmail, and npcInput.name are required' }) };
  }

  // Tier + quota gate (free: 1/mo, Adventurer: blocked, DM/Bundle: unlimited)
  const gate = await gateAi({ email: userEmail, feature: 'npc_gen', corsHeaders });
  if (gate.blocked) return gate.blocked;

  // Fetch campaign context
  const supabase = createClient(supabaseUrl, supabaseKey);
  let context = '';
  try {
    context = await fetchNpcContext(supabase, campaignId) || '';
  } catch (err) {
    console.error('Context fetch error:', err);
    // Continue without context — AI can still embellish
  }

  // Build the user message
  const dmInput = Object.entries(npcInput)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k}: ${v.trim()}`)
    .join('\n');

  const userMessage = context
    ? `CAMPAIGN CONTEXT:\n---\n${context}\n---\n\nDM'S NPC INPUT:\n${dmInput}`
    : `DM'S NPC INPUT:\n${dmInput}`;

  // Call Anthropic API
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        temperature: 0.8,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', response.status, errData);
      return {
        statusCode: response.status === 429 ? 429 : 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: response.status === 429 ? 'Rate limited — try again in a moment' : 'AI service error' }),
      };
    }

    const data = await response.json();
    let text = data.content?.[0]?.text || '';
    text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    let npc;
    try {
      npc = JSON.parse(text);
    } catch {
      console.error('Failed to parse AI NPC response:', text);
      return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'AI returned invalid format. Try again.' }) };
    }

    // Mark which fields were AI-generated vs DM-provided
    const aiFields = [];
    for (const key of ['personality', 'quirks', 'voice_notes', 'motivation', 'location', 'role']) {
      const dmVal = (npcInput[key] || '').trim();
      const aiVal = (npc[key] || '').trim();
      if (aiVal && (!dmVal || aiVal !== dmVal)) aiFields.push(key);
    }

    await gate.recordUsage();

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ npc, aiFields, tier: gate.tier }),
    };
  } catch (err) {
    console.error('NPC embellish error:', err);
    return { statusCode: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: "Couldn't reach the AI. Try again in a moment." }) };
  }
}
