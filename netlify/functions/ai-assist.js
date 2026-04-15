// ─── DMD AI Assist — Netlify Serverless Function ─────────────
// Handles NPC generation, improv suggestions, and session summaries
// via the Anthropic Messages API.

const SYSTEM_PROMPTS = {
  npc: `You are a D&D 5e NPC generator. Given a brief description, create a complete NPC with: name, role, personality (2-3 sentences), quirk (one memorable habit), motivation (what they want), voice_notes (how they speak), and optionally a secret the DM knows but players don't. Keep it concise and immediately usable at the table.

Respond ONLY with valid JSON in this exact format:
{
  "name": "Full Name",
  "role": "Role/Occupation",
  "personality": "2-3 sentence personality description",
  "quirks": "One memorable habit or quirk",
  "motivation": "What they want",
  "voice_notes": "How they speak",
  "secret": "Optional DM secret"
}`,

  improv: `You are a D&D 5e DM assistant. The DM needs help with an unexpected situation. Given the context of the campaign and the DM's question, provide 2-3 brief, actionable suggestions. Each should be 1-2 sentences max. Focus on what the DM can say or do RIGHT NOW at the table. Don't lecture — just give options.

Respond ONLY with valid JSON in this exact format:
{
  "suggestions": [
    "First suggestion here.",
    "Second suggestion here.",
    "Third suggestion here."
  ]
}`,

  summary: `You are a session note organizer. Given raw session notes from a D&D game, create a clean summary with: key events (bullet points), NPCs encountered (name + what happened), unresolved threads (things left hanging), and a one-paragraph narrative summary. Keep it concise.

Respond ONLY with valid JSON in this exact format:
{
  "key_events": ["Event 1", "Event 2"],
  "npcs_encountered": [{"name": "NPC Name", "details": "What happened"}],
  "unresolved_threads": ["Thread 1", "Thread 2"],
  "narrative_summary": "One paragraph summary."
}`,
};

function buildUserMessage(type, prompt, context) {
  let msg = prompt || '';

  if (context) {
    const parts = [];
    if (context.campaignName) parts.push(`Campaign: ${context.campaignName}`);
    if (context.campaignDescription) parts.push(`Setting: ${context.campaignDescription}`);
    if (context.npcs?.length) {
      parts.push(`Current NPCs: ${context.npcs.map(n => `${n.name} (${n.role || 'unknown role'})`).join(', ')}`);
    }
    if (context.threads?.length) {
      parts.push(`Active story threads: ${context.threads.map(t => t.title).join(', ')}`);
    }
    if (context.sessionNotes) {
      parts.push(`Session notes:\n${context.sessionNotes}`);
    }
    if (parts.length) {
      msg = `${parts.join('\n')}\n\n${msg}`;
    }
  }

  return msg;
}

// ─── Tier verification ─────────────────────────────────────────
// AI features require Dungeon Master tier or Bundle (or legacy DM/Bundle).
// Adventurer is paid but does NOT get AI — enforced here server-side.
import { AI_PRODUCT_IDS, isAdmin } from './_tierConfig.js';

async function verifyAiTier(email) {
  if (!email) return false;
  if (isAdmin(email)) return true;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return false;
  try {
    const custRes = await fetch(`https://api.stripe.com/v1/customers/search?query=email:'${encodeURIComponent(email)}'`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const custData = await custRes.json();
    if (!custData.data?.length) return false;
    for (const customer of custData.data) {
      const subRes = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=active&limit=10`, {
        headers: { Authorization: `Bearer ${stripeKey}` },
      });
      const subData = await subRes.json();
      for (const sub of (subData.data || [])) {
        for (const item of (sub.items?.data || [])) {
          if (AI_PRODUCT_IDS.has(item.price?.product)) return true;
        }
      }
    }
  } catch (e) { console.error('Stripe tier check error:', e); }
  return false;
}

// AI-gated types that require paid tier
const PAID_TYPES = ['summary', 'improv'];

export async function handler(event) {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST' };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { type, prompt, context, userEmail } = body;

  // Tier gate for AI-powered features — requires Dungeon Master or Bundle.
  if (PAID_TYPES.includes(type) && userEmail) {
    const hasAi = await verifyAiTier(userEmail);
    if (!hasAi) {
      return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: `AI ${type} requires Dungeon Master tier. Adventurer tier does not include AI features.` }) };
    }
  }

  if (!type || !SYSTEM_PROMPTS[type]) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid type. Must be: npc, improv, or summary' }) };
  }

  if (!prompt && type !== 'summary') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Prompt is required' }) };
  }

  const userMessage = buildUserMessage(type, prompt, context);
  const maxTokens = type === 'summary' ? 2048 : 1024;

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
        max_tokens: maxTokens,
        system: SYSTEM_PROMPTS[type],
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', response.status, errData);
      return {
        statusCode: response.status === 429 ? 429 : 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: response.status === 429 ? 'Rate limited — try again in a moment' : 'AI service error' }),
      };
    }

    const data = await response.json();
    let text = data.content?.[0]?.text || '';

    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // If JSON parsing fails, return raw text
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: text }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result: parsed }),
    };
  } catch (err) {
    console.error('AI assist error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}
