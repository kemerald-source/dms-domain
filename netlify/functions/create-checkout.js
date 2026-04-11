// ─── DMD Stripe Checkout Session Creator ───────────────────────
// Creates a Stripe checkout session for DM tier or Bundle tier.

const STRIPE_PRICES = {
  dm: 'price_1TIX9HGABqpCtjhU69JegQgR',       // $5.99/mo
  bundle: 'price_1TIX9bGABqpCtjhUn3eLmget',     // $9.99/mo
};

export async function handler(event) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Stripe not configured' }) };

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { email, plan, successUrl, cancelUrl } = body;
  if (!email || !plan) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'email and plan are required' }) };
  }

  const priceId = STRIPE_PRICES[plan];
  if (!priceId) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid plan. Must be: dm or bundle' }) };
  }

  try {
    // Check if customer already exists (use list endpoint — more reliable than search)
    const custListRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const custListData = await custListRes.json();
    let customerId = custListData.data?.[0]?.id;

    // Create customer if not found
    if (!customerId) {
      const createRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `email=${encodeURIComponent(email)}`,
      });
      const createData = await createRes.json();
      if (createData.error) {
        console.error('Stripe customer create error:', createData.error);
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: createData.error.message }) };
      }
      customerId = createData.id;
    }

    console.log(`[create-checkout] Plan: ${plan}, Price: ${priceId}, Customer: ${customerId}`);

    // Create checkout session
    const params = new URLSearchParams({
      'customer': customerId,
      'mode': 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': successUrl || 'https://dms-domain.netlify.app/dashboard?checkout=success',
      'cancel_url': cancelUrl || 'https://dms-domain.netlify.app/dashboard?checkout=cancel',
      'allow_promotion_codes': 'true',
    });

    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const sessionData = await sessionRes.json();

    if (sessionData.error) {
      console.error('Stripe session error:', sessionData.error);
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: sessionData.error.message }) };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: sessionData.url }),
    };
  } catch (err) {
    console.error('Checkout error:', err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Internal server error' }) };
  }
}
