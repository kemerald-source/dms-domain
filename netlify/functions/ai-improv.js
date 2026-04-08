// ─── DMD AI Improv Assist — Netlify Serverless Function ───────
// Full-context campaign-aware improv suggestions via Anthropic API.
// Fetches party, NPCs, threads, sessions, lore, and DM notes from Supabase.

import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['kcolburn@eg4h.net', 'centersfocus@gmail.com'];
const DMD_PRODUCT_ID = 'prod_UH5JJZwg8AdVaI';
const BUNDLE_PRODUCT_ID = 'prod_UH5KKwFpmJ46aw';

const SYSTEM_PROMPT = `You are the AI assistant inside DM's Domain, a D&D 5e Dungeon Master companion tool. The DM is in a live session and needs immediate help responding to something unexpected.

You have full context about this campaign — the party, NPCs, active plot threads, recent sessions, world lore, and the DM's secret notes. Use this context to make your suggestions specific and grounded in what's actually happening in this campaign.

Return EXACTLY three suggestions as a JSON array. Each suggestion must:
1. Be 2-3 sentences max — short enough to scan in seconds
2. Be practically usable — the DM should be able to riff from it immediately
3. Reference specific characters, locations, or plot threads from the campaign context
4. Take a DIFFERENT strategic approach from the other two

The three approaches:
- "escalate": Lean into the chaos. Let the unexpected action have real consequences that raise the stakes.
- "redirect": Guide things back gracefully. An NPC intervenes, a new detail emerges, the world responds in a way that channels the energy.
- "deepen": Connect the unexpected moment to an existing story thread, backstory, or secret. Make it matter more than the players realize.

Respond ONLY with valid JSON, no preamble, no markdown:
[
  {"label": "short 2-3 word label", "approach": "escalate", "text": "2-3 sentence suggestion", "connection": "what campaign element this ties to"},
  {"label": "short 2-3 word label", "approach": "redirect", "text": "2-3 sentence suggestion", "connection": "what campaign element this ties to"},
  {"label": "short 2-3 word label", "approach": "deepen", "text": "2-3 sentence suggestion", "connection": "what campaign element this ties to"}
]`;

// ─── Tier verification ──────────────────────────────────────────

async function verifyPaidTier(email) {
  if (ADMIN_EMAILS.includes(email.toLowerCase())) return true;

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return false;

  const custRes = await fetch(
    `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=5`,
    { headers: { Authorization: `Bearer ${stripeKey}` } }
  );
  const custData = await custRes.json();
  if (!custData.data?.length) return false;

  for (const customer of custData.data) {
    const subRes = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=active&limit=10`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const subData = await subRes.json();
    for (const sub of (subData.data || [])) {
      for (const item of (sub.items?.data || [])) {
        const productId = item.price?.product;
        if (productId === DMD_PRODUCT_ID || productId === BUNDLE_PRODUCT_ID) return true;
      }
    }
  }
  return false;
}

// ─── Context fetching ───────────────────────────────────────────

function truncate(str, max) {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max) + '…';
}

async function fetchCampaignContext(supabase, campaignId) {
  const ctx = {};

  // Campaign basics
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name, description, party_id, dm_email')
    .eq('id', campaignId)
    .single();

  if (!campaign) return null;
  ctx.campaignName = campaign.name;
  ctx.campaignDescription = campaign.description;
  ctx.dmEmail = campaign.dm_email;

  // Fetch all context sources in parallel
  const [partyRes, manualRes, npcsRes, threadsRes, sessionsRes, loreRes, notesRes, imagesRes, homebrewRes] = await Promise.all([
    // 1. Party members (from CE)
    campaign.party_id
      ? supabase.from('party_members').select('character_id, user_email, role').eq('party_id', campaign.party_id)
      : { data: [] },
    // 1b. Manual characters
    supabase.from('manual_characters').select('name, class, level, race, notes')
      .eq('campaign_id', campaignId),
    // 2. Active NPCs (alive or unknown, max 10)
    supabase.from('npcs').select('name, role, personality, motivation, quirks, voice_notes')
      .eq('campaign_id', campaignId).in('status', ['alive', 'unknown']).limit(10),
    // 3. Active story threads (not resolved)
    supabase.from('story_threads').select('title, description, thread_type, urgency')
      .eq('campaign_id', campaignId).neq('status', 'resolved').order('urgency', { ascending: false }).limit(10),
    // 4. Recent session notes (last 3)
    supabase.from('session_notes').select('session_number, raw_notes, ai_summary')
      .eq('campaign_id', campaignId).order('created_at', { ascending: false }).limit(3),
    // 5. World lore (max 15)
    supabase.from('world_lore').select('name, description, type')
      .eq('campaign_id', campaignId).limit(15),
    // 6. DM secret notes
    supabase.from('dm_character_notes').select('character_id, notes')
      .eq('campaign_id', campaignId).eq('dm_email', campaign.dm_email),
    // 7. Visual assets (gallery images with captions)
    supabase.from('campaign_images').select('caption, tag')
      .eq('campaign_id', campaignId).not('caption', 'is', null).limit(20),
    // 8. Homebrew content names and types
    supabase.from('homebrew').select('name, type, notes')
      .eq('campaign_id', campaignId),
  ]);

  // Parse party members with character data
  ctx.party = [];
  const members = (partyRes.data || []).filter(m => m.role !== 'dm' && m.character_id);
  if (members.length > 0) {
    const charIds = members.map(m => m.character_id);
    const { data: chars } = await supabase
      .from('characters')
      .select('id, character_data')
      .in('id', charIds);

    const charMap = {};
    (chars || []).forEach(c => { charMap[c.id] = c.character_data; });

    ctx.party = members.map(m => {
      const cd = charMap[m.character_id];
      if (!cd) return null;
      const scores = cd.abilityScores || {};
      const topScores = Object.entries(scores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([k, v]) => `${k.toUpperCase()} ${v}`)
        .join(', ');
      return {
        name: cd.name || 'Unknown',
        race: cd.race || '',
        class: cd.class || '',
        level: cd.level || 1,
        background: cd.background || '',
        backstory: truncate(cd.backstory, 200),
        bonds: truncate(cd.bonds || cd.personalityTraits?.bonds, 200),
        topScores,
      };
    }).filter(Boolean);
  }

  // Add manual characters to party context
  (manualRes.data || []).forEach(mc => {
    ctx.party.push({
      name: mc.name,
      race: mc.race || '',
      class: mc.class || '',
      level: mc.level || 1,
      background: '',
      backstory: truncate(mc.notes, 200),
      bonds: '',
      topScores: '',
    });
  });

  ctx.npcs = (npcsRes.data || []).map(n => ({
    name: n.name,
    role: n.role,
    personality: truncate(n.personality, 150),
    motivation: truncate(n.motivation, 100),
    quirks: truncate(n.quirks, 80),
    voice: truncate(n.voice_notes, 80),
  }));

  ctx.threads = (threadsRes.data || []).map(t => ({
    title: t.title,
    type: t.thread_type,
    urgency: t.urgency,
    description: truncate(t.description, 150),
  }));

  ctx.sessions = (sessionsRes.data || []).map(s => ({
    number: s.session_number,
    notes: truncate(s.raw_notes || s.ai_summary, 500),
  }));

  ctx.lore = (loreRes.data || []).map(l => ({
    name: l.name,
    type: l.type,
    description: truncate(l.description, 150),
  }));

  ctx.dmNotes = (notesRes.data || []).map(n => ({
    characterId: n.character_id,
    notes: truncate(n.notes, 200),
  }));

  ctx.visualAssets = (imagesRes.data || []).map(i => ({
    caption: i.caption,
    tag: i.tag || 'other',
  }));

  ctx.homebrew = (homebrewRes.data || []).map(h => ({
    name: h.name,
    type: h.type,
    notes: truncate(h.notes, 100),
  }));

  return ctx;
}

// ─── Context formatting ─────────────────────────────────────────

function formatContext(ctx) {
  const sections = [];

  sections.push(`CAMPAIGN: ${ctx.campaignName}${ctx.campaignDescription ? ` — ${ctx.campaignDescription}` : ''}`);

  if (ctx.party?.length) {
    sections.push('PARTY:\n' + ctx.party.map(p =>
      `- ${p.name} (${p.race} ${p.class} ${p.level})${p.background ? `, ${p.background}` : ''}${p.topScores ? ` [${p.topScores}]` : ''}${p.backstory ? `\n  Backstory: ${p.backstory}` : ''}${p.bonds ? `\n  Bonds: ${p.bonds}` : ''}`
    ).join('\n'));
  }

  if (ctx.npcs?.length) {
    sections.push('ACTIVE NPCs:\n' + ctx.npcs.map(n =>
      `- ${n.name} (${n.role || 'unknown role'})${n.personality ? `: ${n.personality}` : ''}${n.motivation ? ` Wants: ${n.motivation}` : ''}${n.quirks ? ` Quirk: ${n.quirks}` : ''}`
    ).join('\n'));
  }

  if (ctx.threads?.length) {
    sections.push('ACTIVE STORY THREADS:\n' + ctx.threads.map(t =>
      `- [${t.urgency?.toUpperCase() || 'LOW'}] ${t.title} (${t.type || 'hook'})${t.description ? `: ${t.description}` : ''}`
    ).join('\n'));
  }

  if (ctx.sessions?.length) {
    sections.push('RECENT SESSIONS:\n' + ctx.sessions.map(s =>
      `- Session ${s.number}: ${s.notes || '(no notes)'}`
    ).join('\n'));
  }

  if (ctx.lore?.length) {
    sections.push('WORLD LORE:\n' + ctx.lore.map(l =>
      `- ${l.name} (${l.type}): ${l.description || '(no description)'}`
    ).join('\n'));
  }

  if (ctx.dmNotes?.length) {
    sections.push('DM SECRET NOTES:\n' + ctx.dmNotes.map(n =>
      `- [Character ${n.characterId}]: ${n.notes}`
    ).join('\n'));
  }

  if (ctx.visualAssets?.length) {
    sections.push('VISUAL ASSETS (maps, handouts, portraits the DM has uploaded — reference these when relevant):\n' + ctx.visualAssets.map(a =>
      `- ${a.caption} (${a.tag})`
    ).join('\n'));
  }

  if (ctx.homebrew?.length) {
    sections.push('HOMEBREW CONTENT (custom content the DM has created — reference by name when relevant):\n' + ctx.homebrew.map(h =>
      `- ${h.name} (${h.type})${h.notes ? `: ${h.notes}` : ''}`
    ).join('\n'));
  }

  return sections.join('\n\n');
}

// ─── Handler ────────────────────────────────────────────────────

export async function handler(event) {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST' };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!apiKey) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }) };
  }
  if (!supabaseUrl || !supabaseKey) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Supabase not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { campaignId, userInput, userEmail } = body;

  if (!campaignId || !userInput?.trim()) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'campaignId and userInput are required' }) };
  }
  if (!userEmail) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'userEmail is required' }) };
  }

  // Verify paid tier
  try {
    const hasTier = await verifyPaidTier(userEmail);
    if (!hasTier) {
      return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'AI Improv Assist requires a DM tier subscription.' }) };
    }
  } catch (err) {
    console.error('Tier check error:', err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Could not verify subscription status' }) };
  }

  // Fetch campaign context from Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);
  let ctx;
  try {
    ctx = await fetchCampaignContext(supabase, campaignId);
    if (!ctx) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Campaign not found' }) };
    }
  } catch (err) {
    console.error('Context fetch error:', err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Failed to load campaign context' }) };
  }

  // Resolve DM note character names
  if (ctx.dmNotes?.length && ctx.party?.length) {
    for (const note of ctx.dmNotes) {
      const member = ctx.party.find(p => p.name);
      if (member) note.characterId = member.name;
    }
  }

  // Build prompt
  const contextBlock = formatContext(ctx);
  const userMessage = `CAMPAIGN CONTEXT:\n---\n${contextBlock}\n---\n\nDM'S SITUATION:\n${userInput.trim()}`;

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
        max_tokens: 1000,
        temperature: 0.9,
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

    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    let suggestions;
    try {
      suggestions = JSON.parse(text);
      // Ensure it's an array of 3
      if (!Array.isArray(suggestions)) {
        suggestions = suggestions.suggestions || [suggestions];
      }
    } catch {
      console.error('Failed to parse AI response:', text);
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'AI returned invalid format. Try again.' }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ suggestions }),
    };
  } catch (err) {
    console.error('AI improv error:', err);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: "Couldn't reach the AI. Try again in a moment." }),
    };
  }
}
