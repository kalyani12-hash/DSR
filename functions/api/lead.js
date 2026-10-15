/**
 * Cloudflare Pages Function: /api/lead
 * Handles incoming lead submissions from brochure, visit, and inline capture forms.
 */
export async function onRequestPost({ request, env }) {
  try {
    const payload = await request.json();

    // Validate phone number
    if (!payload.phone || !/^\+91[6-9]\d{9}$/.test(payload.phone)) {
      return new Response(
        JSON.stringify({ message: 'A valid Indian mobile number is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Log the lead
    console.log('[LEAD RECEIVED]', {
      leadId: payload.leadId,
      name: payload.name,
      phone: payload.phone,
      source: payload.source,
      channel: payload.channel,
      interest: payload.interest,
      device: payload.device,
      timeOnSite: payload.timeOnSite,
      campaignName: payload.campaignName,
      at: payload.at || new Date().toISOString()
    });

    // If an external CRM webhook or PropFlo URL is configured in env
    if (env && env.CRM_WEBHOOK_URL) {
      try {
        await fetch(env.CRM_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (crmErr) {
        console.error('[CRM FORWARD FAILED]', crmErr);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, message: 'Lead captured successfully.' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (err) {
    console.error('[LEAD API ERROR]', err);
    return new Response(
      JSON.stringify({
        message: 'We could not record your details just now. Please call us on +91 99999 99999.'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

