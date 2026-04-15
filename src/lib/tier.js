import { useState, useEffect } from 'react';

// ─── Admin tier override ─────────────────────────────────────
const ADMIN_EMAILS = ['kcolburn@eg4h.net', 'centersfocus@gmail.com'];

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
};

// ─── Stripe price IDs (for checkout) ─────────────────────────
// Mirrors netlify/functions/_tierConfig.js — keep in sync when prices change.
export const STRIPE_PRICES = {
  adventurer: 'price_1TMYceGABqpCtjhU83jMEK2w', // $5.99/mo
  dm:         'price_1TMYcoGABqpCtjhUWMAmfgNQ', // $9.99/mo
  bundle:     'price_1TMYcyGABqpCtjhU4cCkxAYv', // $14.99/mo
};

/**
 * React hook that fetches and caches the user's tier.
 * Tier values: 'free' | 'adventurer' | 'dungeon_master'.
 * Bundle subscribers come back as 'dungeon_master' — feature access is identical.
 */
export function useTier(userEmail) {
  const [tier, setTier] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) {
      setTier('free');
      setLoading(false);
      return;
    }

    if (ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      setTier('dungeon_master');
      setLoading(false);
      return;
    }

    const cacheKey = `dmd-tier-${userEmail.toLowerCase()}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { tier: cachedTier, ts } = JSON.parse(cached);
        if (Date.now() - ts < 10 * 60 * 1000) {
          setTier(cachedTier);
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
      .then(data => {
        const t = data.tier || 'free';
        setTier(t);
        sessionStorage.setItem(cacheKey, JSON.stringify({ tier: t, ts: Date.now() }));
      })
      .catch(() => setTier('free'))
      .finally(() => setLoading(false));
  }, [userEmail]);

  const resolved = tier || 'free';
  const isDM = resolved === 'dungeon_master';

  return {
    tier: resolved,
    loading,
    // Paying customer (any paid tier, including Adventurer)
    isPaid: resolved !== 'free',
    // Has AI — Dungeon Master tier only (Bundle collapses to 'dungeon_master')
    hasAi: isDM,
    // DM-exclusive features (Homebrew, Gallery) — same set as hasAi today
    isDM,
    // Active-campaign limit for this tier
    campaignLimit: CAMPAIGN_LIMITS[resolved] ?? CAMPAIGN_LIMITS.free,
  };
}
