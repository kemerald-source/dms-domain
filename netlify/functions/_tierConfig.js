// Shared tier config used by every Netlify function that needs to know what
// a customer is paying for. Single source of truth — don't duplicate product
// IDs across function files, they will drift.
//
// Underscore prefix keeps Netlify's function bundler from treating this as a
// deployable endpoint.

// ─── New products (launched April 2026) ────────────────────────
export const PRODUCTS = {
  ADVENTURER:     'prod_ULF6FZNu3OFvzk', // $5.99/mo — organizational features, no AI
  DUNGEON_MASTER: 'prod_ULF6O8fgrEvYXP', // $9.99/mo — everything including AI
  BUNDLE:         'prod_ULF7Ic9G7Vd5iy', // $14.99/mo — DM tier + Character Evolver Pro
};

// ─── Legacy products (still honored) ───────────────────────────
// Existing subscribers on the old $5.99 DM and $9.99 Bundle products keep
// their AI access while we migrate them to the new tier structure.
export const LEGACY_PRODUCTS = {
  DMD_LEGACY:    'prod_UH5JJZwg8AdVaI', // old "DM tier" — treat as dungeon_master
  BUNDLE_LEGACY: 'prod_UH5KKwFpmJ46aw', // old "Bundle"  — treat as dungeon_master
};

// Set of product IDs that unlock AI features. Adventurer is paid but
// deliberately excluded — they get the organizational tier without AI.
export const AI_PRODUCT_IDS = new Set([
  PRODUCTS.DUNGEON_MASTER,
  PRODUCTS.BUNDLE,
  LEGACY_PRODUCTS.DMD_LEGACY,
  LEGACY_PRODUCTS.BUNDLE_LEGACY,
]);

// Set of every paid product — covers general "is this a paying customer"
// checks (campaign limits, NPC caps, etc.).
export const PAID_PRODUCT_IDS = new Set([
  PRODUCTS.ADVENTURER,
  ...AI_PRODUCT_IDS,
]);

// Map a Stripe productId → the tier enum.
// Bundle is its own tier so callers can distinguish it from DM (e.g. for the
// CE-side Adventurer cross-app perk and for analytics). DMD feature access is
// identical for Bundle and DM — see TIER_LIMITS below.
export function tierForProduct(productId) {
  if (productId === PRODUCTS.ADVENTURER) return 'adventurer';
  if (productId === PRODUCTS.DUNGEON_MASTER || productId === LEGACY_PRODUCTS.DMD_LEGACY) {
    return 'dungeon_master';
  }
  if (productId === PRODUCTS.BUNDLE || productId === LEGACY_PRODUCTS.BUNDLE_LEGACY) {
    return 'bundle';
  }
  return null;
}

// Given multiple tiers a customer might have from stacked subs, pick the
// highest-value one.
const TIER_RANK = { bundle: 3, dungeon_master: 2, adventurer: 1, free: 0 };
export function highestTier(tiers) {
  return tiers.reduce(
    (best, t) => (!best || (TIER_RANK[t] || 0) > (TIER_RANK[best] || 0) ? t : best),
    null
  );
}

// ─── Tier limits (canonical) ───────────────────────────────────
// Single source of truth for what each tier can do. -1 means unlimited.
// check-tier returns the limits for the resolved tier so callers don't need
// to duplicate this table.
export const TIER_LIMITS = {
  free: {
    activeCampaigns: 1,
    archivedCampaigns: 0,
    npcs: 2,
    aiImprovQuota: 3,
    aiNpcGenQuota: 1,
    aiSummaryQuota: 1,
  },
  adventurer: {
    activeCampaigns: 3,
    archivedCampaigns: 5,
    npcs: -1,
    aiImprovQuota: 0,
    aiNpcGenQuota: 0,
    aiSummaryQuota: 0,
  },
  dungeon_master: {
    activeCampaigns: 6,
    archivedCampaigns: -1,
    npcs: -1,
    aiImprovQuota: -1,
    aiNpcGenQuota: -1,
    aiSummaryQuota: -1,
  },
  bundle: {
    activeCampaigns: 6,
    archivedCampaigns: -1,
    npcs: -1,
    aiImprovQuota: -1,
    aiNpcGenQuota: -1,
    aiSummaryQuota: -1,
  },
};

export function limitsForTier(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

// ─── Usage tracking ────────────────────────────────────────────
// Calendar-month bucket key for user_ai_usage. UTC for consistency — the
// server has no notion of the user's local timezone, and this matches Stripe
// billing cycles.
export function currentMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7); // 'YYYY-MM'
}

// ─── Admin overrides ───────────────────────────────────────────
export const ADMIN_EMAILS = ['kcolburn@eg4h.net', 'centersfocus@gmail.com', 'redeyedcyborg@gmail.com'];

export function isAdmin(email) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

// ─── Stripe price IDs (for checkout sessions) ──────────────────
export const STRIPE_PRICES = {
  adventurer: 'price_1TMYceGABqpCtjhU83jMEK2w', // $5.99/mo
  dm:         'price_1TMYcoGABqpCtjhUWMAmfgNQ', // $9.99/mo
  bundle:     'price_1TMYcyGABqpCtjhU4cCkxAYv', // $14.99/mo
};
