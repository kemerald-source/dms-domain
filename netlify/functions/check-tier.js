// ─── DMD Tier Check — Netlify Serverless Function ────────────
// Checks admin override, then Stripe for active subscriptions
// to DMD or Bundle products.

const ADMIN_EMAILS = ['kcolburn@eg4h.net', 'centersfocus@gmail.com'];

const DMD_PRODUCT_ID = 'prod_UH5JJZwg8AdVaI';
const BUNDLE_PRODUCT_ID = 'prod_UH5KKwFpmJ46aw';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST' } };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { email } = body;
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email required' }) };
  }

  // Admin override
  if (ADMIN_EMAILS.includes(email.toLowerCase())) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: 'dungeon_master', source: 'admin' }),
    };
  }

  // Check Stripe for active subscription
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    // No Stripe key configured — default to free
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: 'free', source: 'no_stripe_key' }),
    };
  }

  try {
    // Find Stripe customers by email
    const custRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=5`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const custData = await custRes.json();

    if (!custData.data?.length) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'free', source: 'no_customer' }),
      };
    }

    // Check each customer for active subscriptions to DMD or Bundle
    for (const customer of custData.data) {
      const subRes = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=active&limit=10`,
        { headers: { Authorization: `Bearer ${stripeKey}` } }
      );
      const subData = await subRes.json();

      for (const sub of (subData.data || [])) {
        for (const item of (sub.items?.data || [])) {
          const productId = item.price?.product;
          if (productId === DMD_PRODUCT_ID || productId === BUNDLE_PRODUCT_ID) {
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tier: 'dungeon_master', source: 'stripe' }),
            };
          }
        }
      }
    }

    // No matching subscription found
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: 'free', source: 'no_subscription' }),
    };
  } catch (err) {
    console.error('Stripe check error:', err);
    // On error, default to free (fail closed)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: 'free', source: 'error' }),
    };
  }
}
