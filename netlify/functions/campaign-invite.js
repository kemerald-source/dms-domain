// ─── Campaign Invite API ────────────────────────────────────────
// GET  ?code=xK7mQ2           → Validate invite, return campaign info
// POST { code, email, characterId? } → Join campaign via invite
// Used by CE's /join/:inviteCode page.

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

function respond(statusCode, body) {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders };

  const supabase = getSupabase();
  if (!supabase) return respond(500, { error: 'Database not configured' });

  // ─── GET: Validate invite code ──────────────────────────────
  if (event.httpMethod === 'GET') {
    const code = event.queryStringParameters?.code;
    if (!code) return respond(400, { error: 'code parameter required' });

    const { data: invite, error } = await supabase
      .from('campaign_invites')
      .select('*, campaigns(id, name, description, dm_email)')
      .eq('invite_code', code)
      .single();

    if (error || !invite) return respond(404, { error: 'Invalid invite link. Check with your DM.' });
    if (!invite.is_active) return respond(410, { error: 'This invite link has been deactivated.' });
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return respond(410, { error: 'This invite link has expired. Ask your DM for a new one.' });
    }
    if (invite.max_uses && invite.use_count >= invite.max_uses) {
      return respond(410, { error: 'This invite link has reached its limit. Ask your DM for a new one.' });
    }

    return respond(200, {
      valid: true,
      campaign: {
        id: invite.campaigns.id,
        name: invite.campaigns.name,
        description: invite.campaigns.description,
        dm_email: invite.campaigns.dm_email,
      },
      invite: {
        code: invite.invite_code,
        expires_at: invite.expires_at,
        max_uses: invite.max_uses,
        use_count: invite.use_count,
      },
    });
  }

  // ─── POST: Join campaign via invite ─────────────────────────
  if (event.httpMethod === 'POST') {
    let body;
    try { body = JSON.parse(event.body); } catch {
      return respond(400, { error: 'Invalid JSON' });
    }

    const { code, email, characterId } = body;
    if (!code || !email) return respond(400, { error: 'code and email are required' });

    // Validate invite
    const { data: invite, error: invErr } = await supabase
      .from('campaign_invites')
      .select('*, campaigns(id, name, dm_email, party_id)')
      .eq('invite_code', code)
      .single();

    if (invErr || !invite) return respond(404, { error: 'Invalid invite link.' });
    if (!invite.is_active) return respond(410, { error: 'This invite link has been deactivated.' });
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return respond(410, { error: 'This invite link has expired.' });
    }
    if (invite.max_uses && invite.use_count >= invite.max_uses) {
      return respond(410, { error: 'This invite link has reached its limit.' });
    }

    // Check if DM is clicking own invite
    if (email.toLowerCase() === invite.campaigns.dm_email?.toLowerCase()) {
      return respond(400, { error: "This is your campaign! Share this link with your players." });
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('campaign_members')
      .select('id, character_id')
      .eq('campaign_id', invite.campaign_id)
      .eq('user_email', email.toLowerCase())
      .single();

    if (existing) {
      return respond(409, { error: "You're already in this campaign.", member: existing });
    }

    // Create campaign member
    const { data: member, error: memErr } = await supabase
      .from('campaign_members')
      .insert({
        campaign_id: invite.campaign_id,
        user_email: email.toLowerCase(),
        character_id: characterId || null,
        role: 'player',
      })
      .select()
      .single();

    if (memErr) {
      console.error('Error creating campaign member:', memErr);
      return respond(500, { error: 'Failed to join campaign.' });
    }

    // If character selected and campaign has a party, add to party_members
    if (characterId && invite.campaigns.party_id) {
      const { error: pmErr } = await supabase
        .from('party_members')
        .insert({
          party_id: invite.campaigns.party_id,
          character_id: characterId,
          user_email: email.toLowerCase(),
          role: 'player',
        });
      if (pmErr) console.error('Error adding to party_members:', pmErr);
    }

    // Increment use count
    await supabase
      .from('campaign_invites')
      .update({ use_count: (invite.use_count || 0) + 1 })
      .eq('id', invite.id);

    return respond(200, {
      joined: true,
      campaign: {
        id: invite.campaigns.id,
        name: invite.campaigns.name,
      },
      member,
    });
  }

  return respond(405, { error: 'Method not allowed' });
}
