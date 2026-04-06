// ─── DMD Stripe Webhook Handler ────────────────────────────────
// Handles subscription lifecycle events for DMD and Bundle products.
// Stripe sends events here when subscriptions are created, updated, or deleted.

const DMD_PRODUCT_ID = 'prod_UH5JJZwg8AdVaI';
const BUNDLE_PRODUCT_ID = 'prod_UH5KKwFpmJ46aw';

function isDmdSubscription(subscription) {
  return (subscription.items?.data || []).some(item => {
    const prodId = item.price?.product;
    return prodId === DMD_PRODUCT_ID || prodId === BUNDLE_PRODUCT_ID;
  });
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey) {
    return { statusCode: 500, body: 'Stripe not configured' };
  }

  // Parse the event — if webhook secret is set, verify signature
  let stripeEvent;
  try {
    stripeEvent = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid payload' };
  }

  // If webhook secret is configured, verify the signature
  if (webhookSecret) {
    const sig = event.headers['stripe-signature'];
    if (!sig) {
      return { statusCode: 400, body: 'Missing stripe-signature header' };
    }

    // Manual HMAC verification for Stripe webhook signatures
    const crypto = await import('crypto');
    const timestamp = sig.split(',').find(s => s.startsWith('t='))?.split('=')[1];
    const v1Sig = sig.split(',').find(s => s.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !v1Sig) {
      return { statusCode: 400, body: 'Invalid signature format' };
    }

    const payload = `${timestamp}.${event.body}`;
    const expectedSig = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');

    if (expectedSig !== v1Sig) {
      console.error('Webhook signature verification failed');
      return { statusCode: 400, body: 'Signature verification failed' };
    }

    // Check timestamp tolerance (5 minutes)
    const tolerance = 300;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > tolerance) {
      return { statusCode: 400, body: 'Timestamp outside tolerance' };
    }
  }

  const { type, data } = stripeEvent;
  const subscription = data?.object;

  // Only process subscription events for DMD/Bundle products
  const relevantEvents = [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ];

  if (!relevantEvents.includes(type)) {
    return { statusCode: 200, body: JSON.stringify({ received: true, ignored: true }) };
  }

  if (!subscription || !isDmdSubscription(subscription)) {
    return { statusCode: 200, body: JSON.stringify({ received: true, ignored: true, reason: 'not a DMD subscription' }) };
  }

  // Log the event for debugging
  const customerEmail = subscription.customer_email || 'unknown';
  const status = subscription.status;
  console.log(`Stripe webhook: ${type} — customer=${subscription.customer}, email=${customerEmail}, status=${status}`);

  // The tier system uses real-time Stripe API checks (check-tier.js),
  // so no database updates are needed here. The webhook serves as:
  // 1. An audit log (console.log above)
  // 2. A hook point for future features (e.g., welcome emails, provisioning)
  // 3. Cache invalidation — if we add server-side tier caching later

  return {
    statusCode: 200,
    body: JSON.stringify({
      received: true,
      event: type,
      customer: subscription.customer,
      status,
    }),
  };
}
