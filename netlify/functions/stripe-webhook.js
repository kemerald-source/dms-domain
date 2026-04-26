// ─── DMD Stripe Webhook Handler ────────────────────────────────
// Handles subscription lifecycle events for DMD and Bundle products.
// Stripe sends events here when subscriptions are created, updated, or deleted.

import { PAID_PRODUCT_IDS } from './_tierConfig.js';

// Matches any paid DMD product: Adventurer, Dungeon Master, Bundle, or legacy.
function isDmdSubscription(subscription) {
  return (subscription.items?.data || []).some(item => PAID_PRODUCT_IDS.has(item.price?.product));
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
  const obj = data?.object;

  // Subscription lifecycle events — no DB writes; check-tier reads Stripe in
  // real time so a fresh tier check picks up the change on the user's next
  // request. We log for audit + future hook points (welcome emails, etc.).
  const subscriptionEvents = [
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ];

  if (subscriptionEvents.includes(type)) {
    if (!obj || !isDmdSubscription(obj)) {
      return { statusCode: 200, body: JSON.stringify({ received: true, ignored: true, reason: 'not a DMD subscription' }) };
    }
    const customerEmail = obj.customer_email || 'unknown';
    console.log(`Stripe webhook: ${type} — customer=${obj.customer}, email=${customerEmail}, status=${obj.status}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, event: type, customer: obj.customer, status: obj.status }),
    };
  }

  // Failed payment — log for support visibility. Stripe retries automatically;
  // we don't take action here. (Customer email + dunning UX are a follow-up.)
  if (type === 'invoice.payment_failed') {
    const subId = obj?.subscription;
    const amountDue = obj?.amount_due;
    const attempt = obj?.attempt_count;
    console.log(`Stripe webhook: invoice.payment_failed — customer=${obj?.customer}, email=${obj?.customer_email || 'unknown'}, sub=${subId}, attempt=${attempt}, amount_due=${amountDue}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, event: type, customer: obj?.customer, attempt }),
    };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true, ignored: true }) };
}
