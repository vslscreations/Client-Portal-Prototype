import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@dasherlab.org';
const DASHERLAB_OWNER_EMAIL = Deno.env.get('DASHERLAB_OWNER_EMAIL') || 'admin@dasherlab.org';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing Bearer token' };
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { user: null, error: 'Supabase auth configuration is missing' };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { user: null, error: error?.message || 'Invalid session' };
  }

  return { user, error: null };
}

function safeText(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function formatDate(value: string | null | undefined) {
  const text = safeText(value);
  if (!text) return 'Not provided';

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(parsed);
}

function formatTime(value: string | null | undefined) {
  const text = safeText(value);
  if (!text) return 'Not provided';

  const [hours, minutes] = text.split(':');
  if (hours === undefined || minutes === undefined) return text;

  const date = new Date();
  date.setHours(Number(hours), Number(minutes || 0), 0, 0);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function buildHtmlTableRows(rows: Array<[string, string]>) {
  return rows
    .map(([label, value]) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #1f2937;">${label}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #374151;">${value}</td>
      </tr>
    `)
    .join('');
}

function buildEmailTemplate(subject: string, intro: string, rows: Array<[string, string]>) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin:0; background:#f4f7fb; font-family:Arial, sans-serif; color:#1f2937;">
        <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
          <div style="background:#0b2f6b; padding:18px 24px; color:#ffffff; font-size:20px; font-weight:700;">DasherLab</div>
          <div style="padding:24px;">
            <h2 style="margin:0 0 12px; font-size:24px; color:#111827;">${subject}</h2>
            <p style="margin:0 0 20px; line-height:1.6; color:#374151;">${intro}</p>
            <table style="width:100%; border-collapse:collapse; background:#fafafa; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
              <tbody>
                ${buildHtmlTableRows(rows)}
              </tbody>
            </table>
            <p style="margin:18px 0 0; color:#4b5563; line-height:1.6;">Thank you,<br>DasherLab Team</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function sendResendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject,
      html,
      text
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend request failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

function normalizeRequestEvent(payload: Record<string, any>, type: string) {
  const eventType = type || payload?.eventType || payload?.type || '';
  const normalized = { ...payload };
  normalized.eventType = eventType;
  return normalized;
}

async function getRequestContext(payload: Record<string, any>) {
  const businessId = safeText(payload.businessId || payload.business_id);
  const requestType = safeText(payload.requestType || payload.type || 'request');
  const trackingNumber = safeText(payload.trackingNumber || payload.tracking_number || payload.reference || payload.referenceNumber || '');
  const customerName = safeText(payload.customerName || payload.customer_name || payload.fullName || payload.name || '');
  const businessName = safeText(payload.businessName || payload.business_name || payload.companyName || payload.company || '');
  const customerEmail = safeText(payload.customerEmail || payload.email || payload.customer_email || '');
  const customerPhone = safeText(payload.customerPhone || payload.phone || payload.customer_phone || '');

  const requestContext = {
    businessId,
    requestType,
    trackingNumber,
    customerName,
    businessName,
    customerEmail,
    customerPhone
  };

  if (requestContext.requestType === 'pickup') {
    requestContext.requestType = 'pickup';
  }

  return requestContext;
}

function buildPickupOwnerRows(payload: Record<string, any>) {
  const trackingNumber = safeText(payload.trackingNumber || payload.tracking_number || payload.reference || '');
  const customerName = safeText(payload.customerName || payload.customer_name || payload.fullName || '');
  const businessName = safeText(payload.businessName || payload.business_name || payload.companyName || '');
  const pickupDate = formatDate(payload.pickupDate || payload.pickup_date);
  const pickupTime = formatTime(payload.pickupTime || payload.pickup_time);
  const pickupFacility = safeText(payload.pickupFacility || payload.pickup_facility || payload.pickupLocation || '');
  const pickupAddress = safeText(payload.pickupAddress || payload.pickup_address || '');
  const deliveryFacility = safeText(payload.deliveryFacility || payload.delivery_facility || payload.deliveryLocation || '');
  const deliveryAddress = safeText(payload.deliveryAddress || payload.delivery_address || '');
  const deliveryType = safeText(payload.deliveryType || payload.service_type || payload.delivery_type || '');
  const packageType = safeText(payload.packageType || payload.package_type || '');
  const email = safeText(payload.customerEmail || payload.email || '');
  const phone = safeText(payload.customerPhone || payload.phone || '');

  return [
    ['Request type', 'Pickup Request'],
    ['Tracking number', trackingNumber || 'Not provided'],
    ['Customer', customerName || 'Not provided'],
    ['Business', businessName || 'Not provided'],
    ['Customer email', email || 'Not provided'],
    ['Customer phone', phone || 'Not provided'],
    ['Pickup date', pickupDate],
    ['Pickup time', pickupTime],
    ['Pickup facility', pickupFacility || 'Not provided'],
    ['Pickup address', pickupAddress || 'Not provided'],
    ['Delivery facility', deliveryFacility || 'Not provided'],
    ['Delivery address', deliveryAddress || 'Not provided'],
    ['Delivery type', deliveryType || 'Not provided'],
    ['Package type', packageType || 'Not provided']
  ];
}

function buildPickupCustomerRows(payload: Record<string, any>) {
  const trackingNumber = safeText(payload.trackingNumber || payload.tracking_number || payload.reference || '');
  const pickupDate = formatDate(payload.pickupDate || payload.pickup_date);
  const pickupTime = formatTime(payload.pickupTime || payload.pickup_time);
  const pickupAddress = safeText(payload.pickupAddress || payload.pickup_address || '');
  const deliveryAddress = safeText(payload.deliveryAddress || payload.delivery_address || '');
  return [
    ['Request type', 'Pickup Request'],
    ['Tracking number', trackingNumber || 'Not provided'],
    ['Pickup date', pickupDate],
    ['Pickup time', pickupTime],
    ['Pickup address', pickupAddress || 'Not provided'],
    ['Delivery address', deliveryAddress || 'Not provided']
  ];
}

function buildQuoteOwnerRows(payload: Record<string, any>) {
  const reference = safeText(payload.reference || payload.quoteReference || payload.requestReference || '');
  const customerName = safeText(payload.customerName || payload.customer_name || payload.fullName || '');
  const businessName = safeText(payload.businessName || payload.business_name || payload.companyName || '');
  const email = safeText(payload.customerEmail || payload.email || '');
  const phone = safeText(payload.customerPhone || payload.phone || '');
  const serviceType = safeText(payload.serviceType || payload.service_type || payload.service || '');
  const pickupAddress = safeText(payload.pickupAddress || payload.pickup_address || '');
  const deliveryAddress = safeText(payload.deliveryAddress || payload.delivery_address || '');
  const requestedDate = formatDate(payload.requestedDate || payload.requested_date || payload.quoteDate || payload.date);
  const notes = safeText(payload.notes || payload.requestNotes || '');

  return [
    ['Request type', 'Quote Request'],
    ['Reference number', reference || 'Not provided'],
    ['Customer', customerName || 'Not provided'],
    ['Business', businessName || 'Not provided'],
    ['Customer email', email || 'Not provided'],
    ['Customer phone', phone || 'Not provided'],
    ['Service type', serviceType || 'Not provided'],
    ['Pickup address', pickupAddress || 'Not provided'],
    ['Delivery address', deliveryAddress || 'Not provided'],
    ['Requested date', requestedDate],
    ['Notes', notes || 'No additional notes']
  ];
}

function buildQuoteCustomerRows(payload: Record<string, any>) {
  const reference = safeText(payload.reference || payload.quoteReference || payload.requestReference || '');
  const requestedDate = formatDate(payload.requestedDate || payload.requested_date || payload.quoteDate || payload.date);
  return [
    ['Request type', 'Quote Request'],
    ['Reference number', reference || 'Not provided'],
    ['Requested date', requestedDate],
    ['Status', 'Received']
  ];
}

function buildContactOwnerRows(payload: Record<string, any>) {
  const reference = safeText(payload.reference || payload.requestReference || payload.contactReference || '');
  const name = safeText(payload.customerName || payload.name || '');
  const email = safeText(payload.customerEmail || payload.email || '');
  const phone = safeText(payload.customerPhone || payload.phone || '');
  const requestType = safeText(payload.requestType || payload.type || 'Contact Dispatch');
  const submittedAt = formatDate(payload.submittedAt || payload.createdAt || payload.created_at || new Date().toISOString());
  const messageText = safeText(payload.message || payload.details || '');
  return [
    ['Request type', requestType || 'Contact Dispatch'],
    ['Reference number', reference || 'Not provided'],
    ['Customer', name || 'Not provided'],
    ['Customer email', email || 'Not provided'],
    ['Customer phone', phone || 'Not provided'],
    ['Submitted', submittedAt],
    ['Message', messageText || 'No message provided']
  ];
}

function buildContactCustomerRows(payload: Record<string, any>) {
  const reference = safeText(payload.reference || payload.requestReference || payload.contactReference || '');
  return [
    ['Request type', 'Contact Request'],
    ['Reference number', reference || 'Not provided'],
    ['Status', 'Received']
  ];
}

async function handleRequestEmail(eventType: string, payload: Record<string, any>) {
  const normalized = normalizeRequestEvent(payload, eventType);
  const context = await getRequestContext(normalized);

  if (!context.customerEmail && !context.businessId && eventType !== 'contact_dispatch_submitted') {
    return { ok: true, skipped: true, reason: 'No customer email context available' };
  }

  const recipientList = {
    pickup_request_submitted: {
      owner: {
        to: DASHERLAB_OWNER_EMAIL,
        subject: `New Pickup Request${context.trackingNumber ? ` - ${context.trackingNumber}` : ''}`,
        intro: 'A new pickup request has been submitted and requires review.',
        rows: buildPickupOwnerRows(normalized)
      },
      customer: {
        to: context.customerEmail || normalized.customerEmail || normalized.email || '',
        subject: `Pickup Request Received${context.trackingNumber ? ` - ${context.trackingNumber}` : ''}`,
        intro: 'We have received your pickup request and will review it shortly.',
        rows: buildPickupCustomerRows(normalized)
      }
    },
    quote_request_submitted: {
      owner: {
        to: DASHERLAB_OWNER_EMAIL,
        subject: `New Quote Request${context.trackingNumber ? ` - ${context.trackingNumber}` : ''}`,
        intro: 'A new quote request has been submitted and is awaiting review.',
        rows: buildQuoteOwnerRows(normalized)
      },
      customer: {
        to: context.customerEmail || normalized.customerEmail || normalized.email || '',
        subject: `Quote Request Received${context.trackingNumber ? ` - ${context.trackingNumber}` : ''}`,
        intro: 'We have received your quote request and will review it shortly.',
        rows: buildQuoteCustomerRows(normalized)
      }
    },
    contact_dispatch_submitted: {
      owner: {
        to: DASHERLAB_OWNER_EMAIL,
        subject: `New Contact Dispatch Request${context.trackingNumber ? ` - ${context.trackingNumber}` : ''}`,
        intro: 'A new contact dispatch request has been submitted and is awaiting review.',
        rows: buildContactOwnerRows(normalized)
      },
      customer: {
        to: context.customerEmail || normalized.customerEmail || normalized.email || '',
        subject: `Contact Request Received${context.trackingNumber ? ` - ${context.trackingNumber}` : ''}`,
        intro: 'We have received your contact request and will follow up as needed.',
        rows: buildContactCustomerRows(normalized)
      }
    }
  } as Record<string, any>;

  const recipients = recipientList[eventType];
  if (!recipients) {
    return { ok: true, skipped: true, reason: `Unsupported event: ${eventType}` };
  }

  const emailTargets = [
    { label: 'owner', ...recipients.owner },
    { label: 'customer', ...recipients.customer }
  ];

  const results = [];

  for (const target of emailTargets) {
    const emailTo = safeText(target.to);
    if (!emailTo) {
      results.push({ label: target.label, ok: false, skipped: true, reason: 'Missing recipient email' });
      continue;
    }

    try {
      const html = buildEmailTemplate(target.subject, target.intro, target.rows);
      const text = [target.subject, '', target.intro, '', ...target.rows.map(([label, value]) => `${label}: ${value}`)].join('\n');
      const response = await sendResendEmail({
        to: emailTo,
        subject: target.subject,
        html,
        text
      });
      results.push({ label: target.label, ok: true, id: response?.id || null });
    } catch (error) {
      results.push({ label: target.label, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { ok: true, results };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const body = await req.json();
    const eventType = safeText(body?.eventType || body?.type || '');
    const payload = (body && typeof body.payload === 'object' && body.payload ? body.payload : body) || {};

    if (!eventType) {
      return new Response(JSON.stringify({ ok: false, error: 'eventType is required' }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      return new Response(JSON.stringify({ ok: false, error: 'Authentication required', reason: auth.error }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const currentUserEmail = safeText(auth.user.email);
    const payloadCustomerEmail = safeText((payload as Record<string, any>).customerEmail || (payload as Record<string, any>).email || '');

    if (payloadCustomerEmail && currentUserEmail && payloadCustomerEmail.toLowerCase() !== currentUserEmail.toLowerCase()) {
      return new Response(JSON.stringify({ ok: false, error: 'Customer email does not match the authenticated user.' }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ ok: false, skipped: true, error: 'Email provider is not configured.' }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('Notification email function missing Supabase service configuration');
    }

    const result = await handleRequestEmail(eventType, payload as Record<string, any>);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('notify-request-email failed:', error);
    return new Response(JSON.stringify({ ok: false, error: 'Email notification failed' }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
