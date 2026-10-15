/**
 * Vercel Serverless Function: /api/lead
 * Handles lead submissions (Brochure, Site Visit, Inline Enquiry forms) on Vercel.
 */
module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const payload = req.body || {};

    // Validate phone number (+91 followed by 10 digits starting with 6-9)
    if (!payload.phone || !/^\+91[6-9]\d{9}$/.test(payload.phone)) {
      return res.status(400).json({
        message: 'A valid Indian mobile number is required.'
      });
    }

    // Log the lead in Vercel Runtime Logs
    console.log('[LEAD RECEIVED ON VERCEL]', {
      leadId: payload.leadId,
      name: payload.name,
      phone: payload.phone,
      source: payload.source,
      channel: payload.channel,
      interest: payload.interest,
      device: payload.device,
      timeOnSite: payload.timeOnSite,
      campaignName: payload.campaignName,
      receivedAt: new Date().toISOString()
    });

    // Optional: Forward to an external CRM, webhook, Google Sheet, or Slack if configured
    if (process.env.CRM_WEBHOOK_URL) {
      try {
        await fetch(process.env.CRM_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (crmErr) {
        console.error('[CRM FORWARD FAILED]', crmErr);
      }
    }

    return res.status(200).json({
      ok: true,
      message: 'Thank you! We have received your inquiry.'
    });
  } catch (error) {
    console.error('[VERCEL LEAD API ERROR]', error);
    return res.status(500).json({
      message: 'We could not record your details just now. Please call us on +91 99999 99999.'
    });
  }
};

