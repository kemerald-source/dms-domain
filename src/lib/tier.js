// ─── Admin tier override & subscription helpers ──────────────
// Admin emails get Dungeon Master tier without a Stripe subscription.
// When Stripe is wired up, non-admin users will check their subscription status.

const ADMIN_EMAILS = ['kcolburn@eg4h.net'];

// DMD Stripe price IDs (for future payment integration)
export const STRIPE_PRICES = {
  dm: 'price_1TIX9HGABqpCtjhU69JegQgR',       // $5.99/mo
  bundle: 'price_1TIX9bGABqpCtjhUn3eLmget',     // $9.99/mo
};

/**
 * Determine the user's tier.
 * @param {string} userEmail
 * @returns {'dungeon_master' | 'free'}
 */
export function getUserTier(userEmail) {
  if (!userEmail) return 'free';
  if (ADMIN_EMAILS.includes(userEmail.toLowerCase())) return 'dungeon_master';
  // TODO: Check Stripe subscription status via Supabase
  return 'free';
}

/**
 * Check if a user has at least the Dungeon Master tier.
 * @param {string} userEmail
 * @returns {boolean}
 */
export function isDungeonMaster(userEmail) {
  return getUserTier(userEmail) === 'dungeon_master';
}
