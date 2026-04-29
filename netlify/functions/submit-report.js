// Netlify serverless function — accepts a content report from any
// authenticated campaign member, writes a row to the Supabase
// profile_reports table using the service role, and emails support a
// digest of the report.
//
// DMD-side report flow targets `campaign_gallery` content (DM/player
// gallery uploads). The same table is shared with Character Evolver,
// which submits `character_profile` reports via its own copy of this
// function. We keep the schemas aligned and accept either report_type
// here so the function is safe to reuse across both products.
//
// Environment variables expected:
//   SUPABASE_URL                — same project the client uses
//   SUPABASE_SERVICE_ROLE_KEY   — service role; bypasses RLS for the insert
//   RESEND_API_KEY              — Resend HTTP API key. If absent the row
//                                 is still recorded; only the email is
//                                 skipped.
//   REPORT_NOTIFY_EMAIL         — optional override for the recipient
//                                 (defaults to support@eg4h.net).
//   REPORT_FROM_EMAIL           — optional override for the From: address
//                                 (defaults to reports@eg4h.net).

import { createClient } from '@supabase/supabase-js';

const ALLOWED_REASONS = new Set([
  'inappropriate_artwork',
  'hate_speech',
  'spam',
  'copyright',
  'other',
]);

const ALLOWED_REPORT_TYPES = new Set([
  'character_profile',
  'campaign_gallery',
]);

const DEFAULT_NOTIFY = 'support@eg4h.net';
const DEFAULT_FROM = 'reports@eg4h.net';

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function reportTypeLabel(t) {
  if (t === 'campaign_gallery') return 'Campaign gallery upload';
  if (t === 'character_profile') return 'Character profile';
  return t;
}

async function sendReportEmail({ row, contextUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[submit-report] RESEND_API_KEY not set — skipping email send');
    return { sent: false, reason: 'no_api_key' };
  }

  const to = process.env.REPORT_NOTIFY_EMAIL || DEFAULT_NOTIFY;
  const from = process.env.REPORT_FROM_EMAIL || DEFAULT_FROM;
  const typeLabel = reportTypeLabel(row.report_type);

  const subject = `[DMD Report] ${typeLabel} — ${row.reason} — ${row.reported_user_email || 'unknown owner'}`;
  const text = [
    `A new content report was submitted on DM's Domain.`,
    ``,
    `Type: ${typeLabel}`,
    `Reason: ${row.reason}`,
    `Reported item id: ${row.reported_character_id}`,
    `Owner email: ${row.reported_user_email || '(unknown)'}`,
    `Reporter: ${row.reporter_email || '(anonymous)'}`,
    `Context: ${contextUrl || '(none)'}`,
    `Submitted: ${row.created_at || new Date().toISOString()}`,
    ``,
    `Details:`,
    row.details || '(none)',
  ].join('\n');

  const html = `
    <h2>New DM's Domain report</h2>
    <table style="font-family: system-ui, sans-serif; font-size: 14px; border-collapse: collapse;">
      <tr><td style="padding:4px 8px;color:#666;">Type</td><td style="padding:4px 8px;"><strong>${escapeHtml(typeLabel)}</strong></td></tr>
      <tr><td style="padding:4px 8px;color:#666;">Reason</td><td style="padding:4px 8px;"><strong>${escapeHtml(row.reason)}</strong></td></tr>
      <tr><td style="padding:4px 8px;color:#666;">Item id</td><td style="padding:4px 8px;">${escapeHtml(row.reported_character_id)}</td></tr>
      <tr><td style="padding:4px 8px;color:#666;">Owner</td><td style="padding:4px 8px;">${escapeHtml(row.reported_user_email || '(unknown)')}</td></tr>
      <tr><td style="padding:4px 8px;color:#666;">Reporter</td><td style="padding:4px 8px;">${escapeHtml(row.reporter_email || '(anonymous)')}</td></tr>
      <tr><td style="padding:4px 8px;color:#666;">Context</td><td style="padding:4px 8px;">${contextUrl ? `<a href="${escapeHtml(contextUrl)}">${escapeHtml(contextUrl)}</a>` : '(none)'}</td></tr>
      <tr><td style="padding:4px 8px;color:#666;vertical-align:top;">Details</td><td style="padding:4px 8px;white-space:pre-wrap;">${escapeHtml(row.details || '(none)')}</td></tr>
    </table>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text, html }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[submit-report] Resend error:', res.status, errText);
      return { sent: false, reason: `resend_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error('[submit-report] email send threw:', err.message);
    return { sent: false, reason: 'fetch_threw' };
  }
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[submit-report] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return jsonResponse(500, { error: 'Server not configured' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  // Spec note: `reported_character_id` is the stable id of the reported
  // item. For DMD gallery reports we pass the campaign_images.id (uuid)
  // through this same field so reports across products share a schema.
  const reportedItemId = (payload.reportedItemId || payload.reportedCharacterId || '').toString().trim();
  const reportedUserEmail = payload.reportedUserEmail
    ? String(payload.reportedUserEmail).trim().toLowerCase()
    : null;
  const reporterEmail = payload.reporterEmail
    ? String(payload.reporterEmail).trim().toLowerCase()
    : null;
  const reason = (payload.reason || '').toString().trim();
  // Cap details at 1000 chars to match the client limit and prevent abuse.
  const details = payload.details ? String(payload.details).slice(0, 1000) : null;
  const reportTypeRaw = (payload.reportType || 'campaign_gallery').toString().trim();
  // Best-effort context URL the operator can click in the email digest.
  const contextUrl = payload.contextUrl ? String(payload.contextUrl).slice(0, 500) : null;

  if (!reportedItemId) {
    return jsonResponse(400, { error: 'Missing reportedItemId' });
  }
  if (!ALLOWED_REASONS.has(reason)) {
    return jsonResponse(400, { error: 'Invalid reason' });
  }
  const reportType = ALLOWED_REPORT_TYPES.has(reportTypeRaw) ? reportTypeRaw : 'campaign_gallery';
  // Schema requires reported_user_email NOT NULL — fall back to a sentinel
  // when the gallery row's owner email is unknown. The DM email is
  // typically known on the campaign record, so this is rare in practice.
  const ownerEmailForRow = reportedUserEmail || 'unknown@dmsdomain.eg4h.net';

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let insertedRow = null;
  try {
    const { data, error } = await supabase
      .from('profile_reports')
      .insert({
        reported_user_email: ownerEmailForRow,
        reported_character_id: reportedItemId,
        reporter_email: reporterEmail,
        reason,
        details,
        report_type: reportType,
      })
      .select()
      .single();

    if (error) {
      console.error('[submit-report] Supabase insert error:', error.message, error.details);
      return jsonResponse(500, { error: 'Failed to record report' });
    }
    insertedRow = data;
    console.log('[submit-report] Inserted report id:', data.id, 'type:', data.report_type);
  } catch (err) {
    console.error('[submit-report] insert threw:', err.message);
    return jsonResponse(500, { error: 'Failed to record report' });
  }

  // Email send is best-effort — never fail the user-facing request because
  // the mailer hiccupped. The Supabase row is the source of truth.
  const emailResult = await sendReportEmail({ row: insertedRow, contextUrl });

  return jsonResponse(200, {
    ok: true,
    id: insertedRow.id,
    emailSent: emailResult.sent,
  });
}
