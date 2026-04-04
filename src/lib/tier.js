import { useState, useEffect } from 'react';

// ─── Admin tier override ─────────────────────────────────────
const ADMIN_EMAILS = ['kcolburn@eg4h.net', 'centersfocus@gmail.com'];

// ─── Free tier limits ────────────────────────────────────────
export const FREE_LIMITS = {
  campaigns: 1,
  npcs: 5,
  threads: 5,
  lore: 10,
};

// ─── Stripe price IDs (for checkout links) ───────────────────
export const STRIPE_PRICES = {
  dm: 'price_1TIX9HGABqpCtjhU69JegQgR',       // $5.99/mo
  bundle: 'price_1TIX9bGABqpCtjhUn3eLmget',     // $9.99/mo
};

/**
 * React hook that fetches and caches the user's tier.
 * Returns { tier, loading, isDM }
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

    // Quick admin check — skip network call
    if (ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
      setTier('dungeon_master');
      setLoading(false);
      return;
    }

    // Check sessionStorage cache first
    const cacheKey = `dmd-tier-${userEmail.toLowerCase()}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { tier: cachedTier, ts } = JSON.parse(cached);
        // Cache valid for 10 minutes
        if (Date.now() - ts < 10 * 60 * 1000) {
          setTier(cachedTier);
          setLoading(false);
          return;
        }
      } catch { /* ignore bad cache */ }
    }

    // Fetch from serverless function
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
      .catch(() => {
        setTier('free');
      })
      .finally(() => setLoading(false));
  }, [userEmail]);

  return {
    tier: tier || 'free',
    loading,
    isDM: tier === 'dungeon_master',
  };
}
