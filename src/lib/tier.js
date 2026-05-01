import { useState, useEffect } from 'react';

// ─── Admin tier override ─────────────────────────────────────
const ADMIN_EMAILS = ['kcolburn@eg4h.net', 'centersfocus@gmail.com', 'redeyedcyborg@gmail.com'];

// ─── Free tier limits ────────────────────────────────────────
// Adventurer and Dungeon Master both get unlimited for in-session items
// (NPCs, threads, lore). Campaign counts differ per tier — see CAMPAIGN_LIMITS.
export const FREE_LIMITS = {
  campaigns: 1,
  npcs: 5,
  threads: 5,
  lore: 5,
  gallery: 5,
  homebrew: 3,
};

// Active-campaign caps per tier. Adventurer = 3, DM/Bundle = 6, Free = 1.
// Archived campaigns are separate (Adventurer 5, DM unlimited) — not enforced
// client-side yet; the archive UI will use this when added.
export const CAMPAIGN_LIMITS = {
  free: 1,
  adventurer: 3,
  dungeon_master: 6,
  bundle: 6,
};

// ─── Stripe price IDs (for checkout) ─────────────────────────
// Mirrors netlify/functions/_tierConfig.js — keep in sync when prices change.
export const STRIPE_PRICES = {
  adventurer: 'price_1TMYceGABqpCtjhU83jMEK2w', // $5.99/mo
  dm:         'price_1TMYcoGABqpCtjhUWMAmfgNQ', // $9.99/mo
  bundle:     'price_1TMYcyGABqpCtjhU4cCkxAYv', // $14.99/mo
};

/**
 * React hook that fetches and caches the user's tier + limits + AI usage.
 * Tier values: 'free' | 'adventurer' | 'dungeon_master' | 'bundle'.
 * Bundle and Dungeon Master have identical DMD feature access; Bundle is a
 * distinct value so the CE app can grant its cross-app perk.
 */
const DM_TIER_FEATURES = new Set(['dungeon_master', 'bundle']);

const AI_FEATURE_KEYS = {
  improv:  { limitKey: 'aiImprovQuota',  usageKey: 'improvUsed'  },
  npc_gen: { limitKey: 'aiNpcGenQuota',  usageKey: 'npcGenUsed'  },
  summary: { limitKey: 'aiSummaryQuota', usageKey: 'summaryUsed' },
};

export function useTier(userEmail) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const cacheKey = userEmail ? `dmd-tier-${userEmail.toLowerCase()}` : null;

  useEffect(() => {
    if (!userEmail) {
      setData({ tier: 'free' });
      setLoading(false);
      return;
    }

    if (ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      setData({ tier: 'bundle' });
      setLoading(false);
      return;
    }

    const cached = cacheKey && sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < 10 * 60 * 1000) {
          setData(parsed.data);
          setLoading(false);
          return;
        }
      } catch { /* ignore bad cache */ }
    }

    fetch('/.netlify/functions/check-tier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail }),
    })
      .then(res => res.json())
      .then(payload => {
        const next = {
          tier: payload.tier || 'free',
          limits: payload.limits,
          usage: payload.usage,
          quotaEnforced: payload.quotaEnforced !== false,
        };
        setData(next);
        if (cacheKey) sessionStorage.setItem(cacheKey, JSON.stringify({ data: next, ts: Date.now() }));
      })
      .catch(() => setData({ tier: 'free' }))
      .finally(() => setLoading(false));
  }, [userEmail, cacheKey]);

  const resolved = data?.tier || 'free';
  const hasDmFeatures = DM_TIER_FEATURES.has(resolved);

  // Optimistic local-only increment after a successful AI call. Updates the
  // pill immediately and invalidates sessionStorage so the next page load
  // refetches authoritative usage from the server.
  function consumeAi(feature) {
    const map = AI_FEATURE_KEYS[feature];
    if (!map) return;
    setData(prev => {
      if (!prev) return prev;
      const usage = { ...(prev.usage || {}) };
      usage[map.usageKey] = (usage[map.usageKey] || 0) + 1;
      const next = { ...prev, usage };
      if (cacheKey) {
        try { sessionStorage.removeItem(cacheKey); } catch { /* ignore */ }
      }
      return next;
    });
  }

  // Returns -1 (unlimited), 0 (exhausted), or a positive integer.
  function aiRemaining(feature) {
    const map = AI_FEATURE_KEYS[feature];
    if (!map || !data?.limits) return -1;
    const limit = data.limits[map.limitKey];
    if (limit === -1) return -1;
    if (limit <= 0) return 0;
    const used = data.usage?.[map.usageKey] || 0;
    return Math.max(0, limit - used);
  }

  return {
    tier: resolved,
    loading,
    // Paying customer (any paid tier, including Adventurer)
    isPaid: resolved !== 'free',
    // AI features — Dungeon Master and Bundle
    hasAi: hasDmFeatures,
    // DM-exclusive features (Homebrew, Gallery) — same set as hasAi today;
    // kept for callsite compatibility, also true for Bundle subscribers.
    isDM: hasDmFeatures,
    // Active-campaign limit for this tier
    campaignLimit: CAMPAIGN_LIMITS[resolved] ?? CAMPAIGN_LIMITS.free,
    // Server-returned limits + AI usage (undefined while loading or on error)
    limits: data?.limits,
    usage: data?.usage,
    // True when the server is enforcing the AI quota gate. UI hides quota
    // pills and skips quota-based blocking when this is false.
    quotaEnforced: data?.quotaEnforced !== false,
    // Helpers for AI quota UI / gating.
    aiRemaining,
    consumeAi,
  };
}
