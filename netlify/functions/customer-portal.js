// ─── DMD Stripe Customer Portal Session Creator ─────────────────
// Returns a Billing Portal session URL so paid users can manage their
// subscription (update card, change plan, cancel).

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

  const { email, returnUrl } = body;
  if (!email) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'email is required' }) };
  }

  try {
    const custListRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const custListData = await custListRes.json();
    const customerId = custListData.data?.[0]?.id;

    if (!customerId) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'No Stripe customer found for this email.' }) };
    }

    const params = new URLSearchParams({
      customer: customerId,
      return_url: returnUrl || 'https://dms-domain.netlify.app/dashboard',
    });

    const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const portalData = await portalRes.json();

    if (portalData.error) {
      console.error('Stripe portal error:', portalData.error);
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: portalData.error.message }) };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: portalData.url }),
    };
  } catch (err) {
    console.error('Customer portal error:', err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Internal server error' }) };
  }
}
