import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedCorsOrigins = new Set([
  'http://127.0.0.1:5500',
  'http://localhost:5500'
]);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || req.headers.get('origin');
  const resolvedOrigin = origin && allowedCorsOrigins.has(origin) ? origin : 'http://127.0.0.1:5500';

  return {
    'Access-Control-Allow-Origin': resolvedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

function safeText(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeUsername(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]+/g, '')
    .replace(/[._-]{2,}/g, (match) =>
      match.replace(/\./g, '.').replace(/-/g, '-').replace(/_/g, '_')
    )
    .replace(/^\.+|\.+$/g, '')
    .replace(/^[-_]+|[-_]+$/g, '');
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPassword(value: string) {
  return typeof value === 'string' && value.length >= 8;
}

function jsonResponse(status: number, body: Record<string, unknown>, req: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json'
    }
  });
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Authentication required.' };
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { user: null, error: 'Supabase authentication configuration is missing.' };
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
    return { user: null, error: error?.message || 'Authentication required.' };
  }

  return { user, error: null };
}

async function getOwnerProfile(serviceRoleClient: ReturnType<typeof createClient>, ownerUserId: string) {
  const { data, error } = await serviceRoleClient
    .from('users')
    .select('id, business_id, role, email')
    .eq('id', ownerUserId)
    .maybeSingle();

  if (error) {
    return { record: null, error: error.message || 'Unable to load owner profile.' };
  }

  return { record: data, error: null };
}

async function findExistingProfileByEmail(serviceRoleClient: ReturnType<typeof createClient>, email: string) {
  const { data, error } = await serviceRoleClient
    .from('users')
    .select('id, business_id, email, username, role')
    .ilike('email', email)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return { record: null, error: error.message || 'Unable to check for existing email.' };
  }

  return { record: data, error: null };
}

async function findExistingProfileByUsername(serviceRoleClient: ReturnType<typeof createClient>, businessId: string, username: string) {
  const { data, error } = await serviceRoleClient
    .from('users')
    .select('id, business_id, username, role')
    .eq('business_id', businessId)
    .eq('username', username)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return { record: null, error: error.message || 'Unable to check for existing username.' };
  }

  return { record: data, error: null };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req)
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' }, req);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, {
      ok: false,
      code: 'CONFIG_MISSING',
      message: 'Server-side Supabase configuration is missing.'
    }, req);
  }

  let stage = 'start';

  try {
    stage = 'parse-body';
    const body = await req.json().catch(() => ({}));

    const firstName = safeText(body?.first_name ?? body?.firstName);
    const lastName = safeText(body?.last_name ?? body?.lastName);
    const email = safeText(body?.email).toLowerCase();
    const username = normalizeUsername(safeText(body?.username));
    const temporaryPassword = safeText(body?.temporary_password ?? body?.temporaryPassword);

    if (Object.prototype.hasOwnProperty.call(body, 'business_id') || Object.prototype.hasOwnProperty.call(body, 'businessId')) {
      return jsonResponse(400, {
        ok: false,
        code: 'TENANT_ISOLATION_ERROR',
        message: 'Business ID must be determined server-side and cannot be provided by the browser.'
      }, req);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'role')) {
      return jsonResponse(400, {
        ok: false,
        code: 'ROLE_IS_SERVER_ASSIGNED',
        message: 'Role must be assigned server-side and cannot be provided by the browser.'
      }, req);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'password')) {
      return jsonResponse(400, {
        ok: false,
        code: 'PASSWORD_NOT_ALLOWED',
        message: 'Passwords must be set by the admin and provided as a temporary password in this creation flow.'
      }, req);
    }

    stage = 'validate';
    if (!firstName) {
      return jsonResponse(400, { ok: false, code: 'INVALID_FIRST_NAME', message: 'First name is required.' }, req);
    }

    if (!lastName) {
      return jsonResponse(400, { ok: false, code: 'INVALID_LAST_NAME', message: 'Last name is required.' }, req);
    }

    if (!email || !isValidEmail(email)) {
      return jsonResponse(400, { ok: false, code: 'INVALID_EMAIL', message: 'A valid client email is required.' }, req);
    }

    if (!username) {
      return jsonResponse(400, { ok: false, code: 'INVALID_USERNAME', message: 'Username is required.' }, req);
    }

    if (username.length < 3 || username.length > 30 || !/^[A-Za-z0-9._-]+$/.test(username)) {
      return jsonResponse(400, {
        ok: false,
        code: 'INVALID_USERNAME',
        message: 'Username may contain only letters, numbers, periods, underscores, and hyphens, and must be 3-30 characters long.'
      }, req);
    }

    if (!temporaryPassword || !isValidPassword(temporaryPassword)) {
      return jsonResponse(400, {
        ok: false,
        code: 'INVALID_PASSWORD',
        message: 'Temporary password must be at least 8 characters long.'
      }, req);
    }

    stage = 'auth-session';
    const authResult = await getAuthenticatedUser(req);
    if (!authResult.user) {
      return jsonResponse(401, {
        ok: false,
        code: 'AUTHENTICATION_REQUIRED',
        message: authResult.error || 'Authentication required.'
      }, req);
    }

    const serviceRoleClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    stage = 'owner-profile';
    const ownerProfile = await getOwnerProfile(serviceRoleClient, authResult.user.id);
    if (ownerProfile.error || !ownerProfile.record) {
      return jsonResponse(403, {
        ok: false,
        code: 'OWNER_REQUIRED',
        message: 'Only a business owner can create client accounts.'
      }, req);
    }

    const ownerRole = safeText(ownerProfile.record.role).toLowerCase();
    if (ownerRole !== 'owner') {
      return jsonResponse(403, {
        ok: false,
        code: 'OWNER_REQUIRED',
        message: 'Only a business owner can create client accounts.'
      }, req);
    }

    const ownerBusinessId = safeText(ownerProfile.record.business_id);
    if (!ownerBusinessId) {
      return jsonResponse(403, {
        ok: false,
        code: 'BUSINESS_REQUIRED',
        message: 'The current owner is not assigned to a valid business.'
      }, req);
    }

    stage = 'duplicate-check';
    const existingEmail = await findExistingProfileByEmail(serviceRoleClient, email);
    if (existingEmail.error) {
      return jsonResponse(500, {
        ok: false,
        code: 'PROFILE_LOOKUP_FAILED',
        message: 'Unable to verify the client email at this time.'
      }, req);
    }

    if (existingEmail.record) {
      return jsonResponse(409, {
        ok: false,
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'A user with that email already exists.'
      }, req);
    }

    const existingUsername = await findExistingProfileByUsername(serviceRoleClient, ownerBusinessId, username);
    if (existingUsername.error) {
      return jsonResponse(500, {
        ok: false,
        code: 'PROFILE_LOOKUP_FAILED',
        message: 'Unable to verify the client username at this time.'
      }, req);
    }

    if (existingUsername.record) {
      return jsonResponse(409, {
        ok: false,
        code: 'USERNAME_ALREADY_EXISTS',
        message: 'That username is already in use for this business.'
      }, req);
    }

    stage = 'create-auth-user';
    const authUser = await serviceRoleClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        username,
        business_id: ownerBusinessId,
        role: 'client',
        requires_password_change: true,
        needs_password_change: true
      },
      app_metadata: {
        business_id: ownerBusinessId,
        role: 'client',
        requires_password_change: true,
        needs_password_change: true
      }
    });

    if (authUser.error || !authUser.data?.user) {
      const status = typeof authUser.error?.status === 'number' ? authUser.error.status : 400;
      const message = typeof authUser.error?.message === 'string'
        ? authUser.error.message
        : 'Client account creation failed.';

      return jsonResponse(status, {
        ok: false,
        code: 'AUTH_USER_CREATE_FAILED',
        message,
        error: authUser.error ? { code: authUser.error.code, message: authUser.error.message } : null
      }, req);
    }

    stage = 'create-profile';
    const authUserId = authUser.data.user.id;
    const profileInsert = await serviceRoleClient
      .from('users')
      .insert({
        id: authUserId,
        email,
        username,
        first_name: firstName,
        last_name: lastName,
        role: 'client',
        business_id: ownerBusinessId,
        name: `${firstName} ${lastName}`.trim()
      })
      .select('id, business_id, role, email, username')
      .single();

    if (profileInsert.error || !profileInsert.data) {
      try {
        await serviceRoleClient.auth.admin.deleteUser(authUserId);
      } catch (cleanupError) {
        console.error('[create-client] cleanup failed after profile insert error', cleanupError);
      }

      return jsonResponse(500, {
        ok: false,
        code: 'PROFILE_CREATION_FAILED',
        message: 'Client account creation failed after Auth creation, and the auth account was rolled back.'
      }, req);
    }

    return jsonResponse(200, {
      ok: true,
      code: 'CLIENT_CREATED',
      message: 'Client account created successfully. Share the login details with the client and ask them to sign in with the temporary password.',
      client: {
        id: profileInsert.data.id,
        email: profileInsert.data.email,
        username: profileInsert.data.username,
        business_id: ownerBusinessId,
        role: 'client'
      }
    }, req);
  } catch (error) {
    console.error('[create-client] unexpected error', { stage, error });
    return jsonResponse(500, {
      ok: false,
      code: 'UNEXPECTED_CREATE_FAILURE',
      message: error instanceof Error ? error.message : 'Unexpected client creation failure.'
    }, req);
  }
});
