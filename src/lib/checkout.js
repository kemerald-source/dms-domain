// Shared Stripe Checkout entry point. The actual create-checkout function
// lives in netlify/functions/create-checkout.js and accepts plan values
// 'adventurer' | 'dm' | 'bundle'.

const PLAN_STORAGE_KEY = 'dmd-intended-plan';

/**
 * Post to create-checkout and redirect the browser to Stripe on success.
 * Returns { ok: true } on redirect, { ok: false, error } on failure.
 */
export async function startCheckout(email, plan) {
  if (!email) return { ok: false, error: 'Not signed in' };
  if (!plan) return { ok: false, error: 'Missing plan' };

  try {
    const res = await fetch('/.netlify/functions/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        plan,
        successUrl: `${window.location.origin}/dashboard?checkout=success`,
        cancelUrl: `${window.location.origin}/dashboard?checkout=cancel`,
      }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
      return { ok: true };
    }
    return { ok: false, error: data.error || 'Failed to create checkout session.' };
  } catch (err) {
    console.error('Checkout error:', err);
    return { ok: false, error: 'Network error — check your connection and try again.' };
  }
}

/**
 * Open the Stripe Billing Portal for a paying customer. Redirects the
 * browser on success. Returns { ok: false, error } when no Stripe customer
 * exists or the portal session can't be created.
 */
export async function openCustomerPortal(email) {
  if (!email) return { ok: false, error: 'Not signed in' };
  try {
    const res = await fetch('/.netlify/functions/customer-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        returnUrl: `${window.location.origin}/dashboard`,
      }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
      return { ok: true };
    }
    return { ok: false, error: data.error || 'Could not open billing portal.' };
  } catch (err) {
    console.error('Portal error:', err);
    return { ok: false, error: 'Network error — check your connection and try again.' };
  }
}

// Let the landing page stash a plan before sending the user through OAuth.
// Dashboard picks it up on mount once they're authed and launches checkout.
export function stashIntendedPlan(plan) {
  try { sessionStorage.setItem(PLAN_STORAGE_KEY, plan); } catch { /* ignore */ }
}
export function readIntendedPlan() {
  try {
    const p = sessionStorage.getItem(PLAN_STORAGE_KEY);
    return p || null;
  } catch { return null; }
}
export function clearIntendedPlan() {
  try { sessionStorage.removeItem(PLAN_STORAGE_KEY); } catch { /* ignore */ }
}
