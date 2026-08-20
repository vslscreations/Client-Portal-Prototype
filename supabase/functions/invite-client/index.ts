import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

function safeText(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeUsername(value: string) {
  return String(value || '')
    .trim();
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
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
    .select('id, business_id, role, email, name')
    .eq('id', ownerUserId)
    .maybeSingle();

  if (error) {
    return { record: null, error: error.message || 'Unable to load owner profile.' };
  }

  return { record: data, error: null };
}

async function findExistingClientByEmail(serviceRoleClient: ReturnType<typeof createClient>, email: string) {
  const { data, error } = await serviceRoleClient
    .from('users')
    .select('id, business_id, role, email, username')
    .ilike('email', email)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return { record: null, error: error.message || 'Unable to check for existing client email.' };
  }

  return { record: data, error: null };
}

async function findExistingClientByUsername(serviceRoleClient: ReturnType<typeof createClient>, businessId: string, username: string) {
  const { data, error } = await serviceRoleClient
    .from('users')
    .select('id, business_id, role, username')
    .eq('business_id', businessId)
    .eq('username', username)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return { record: null, error: error.message || 'Unable to check for existing username.' };
  }

  return { record: data, error: null };
}

async function findProfileByAuthUserId(serviceRoleClient: ReturnType<typeof createClient>, authUserId: string) {
  const { data, error } = await serviceRoleClient
    .from('users')
    .select('id, business_id, role, email, username, first_name, last_name, name')
    .eq('id', authUserId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return { record: null, error: error.message || 'Unable to reconcile profile by auth user id.' };
  }

  return { record: data, error: null };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, {
      ok: false,
      code: 'CONFIG_MISSING',
      message: 'Server-side Supabase configuration is missing.'
    });
  }

  try {
    const body = await req.json().catch(() => ({}));

    if (Object.prototype.hasOwnProperty.call(body, 'business_id') || Object.prototype.hasOwnProperty.call(body, 'businessId')) {
      return jsonResponse(400, {
        ok: false,
        code: 'TENANT_ISOLATION_ERROR',
        message: 'Business ID must be determined server-side. It cannot be provided by the browser.'
      });
    }

    if (Object.prototype.hasOwnProperty.call(body, 'role')) {
      return jsonResponse(400, {
        ok: false,
        code: 'ROLE_IS_SERVER_ASSIGNED',
        message: 'Role must be assigned server-side. It cannot be provided by the browser.'
      });
    }

    if (Object.prototype.hasOwnProperty.call(body, 'auth_user_id') || Object.prototype.hasOwnProperty.call(body, 'authUserId') || Object.prototype.hasOwnProperty.call(body, 'id')) {
      return jsonResponse(400, {
        ok: false,
        code: 'AUTH_ID_IS_SERVER_ASSIGNED',
        message: 'Auth user ID is generated by Supabase and cannot be provided by the browser.'
      });
    }

    if (Object.prototype.hasOwnProperty.call(body, 'password') || Object.prototype.hasOwnProperty.call(body, 'temporaryPassword')) {
      return jsonResponse(400, {
        ok: false,
        code: 'PASSWORD_NOT_ALLOWED',
        message: 'Passwords are not accepted by this invitation flow.'
      });
    }

    const firstName = safeText(body?.first_name ?? body?.firstName);
    const lastName = safeText(body?.last_name ?? body?.lastName);
    const clientEmail = safeText(body?.email).toLowerCase();
    const usernameRaw = safeText(body?.username);
    const username = normalizeUsername(usernameRaw);

    if (!firstName) {
      return jsonResponse(400, {
        ok: false,
        code: 'INVALID_FIRST_NAME',
        message: 'First name is required.'
      });
    }

    if (!lastName) {
      return jsonResponse(400, {
        ok: false,
        code: 'INVALID_LAST_NAME',
        message: 'Last name is required.'
      });
    }

    if (!clientEmail) {
      return jsonResponse(400, {
        ok: false,
        code: 'INVALID_EMAIL',
        message: 'Email is required.'
      });
    }

    if (!isValidEmail(clientEmail)) {
      return jsonResponse(400, {
        ok: false,
        code: 'INVALID_EMAIL',
        message: 'Invalid email address.'
      });
    }

    if (!usernameRaw) {
      return jsonResponse(400, {
        ok: false,
        code: 'INVALID_USERNAME',
        message: 'Username is required.'
      });
    }

    if (username.length < 3 || username.length > 30 || !/^[A-Za-z0-9_-]+$/.test(username)) {
      return jsonResponse(400, {
        ok: false,
        code: 'INVALID_USERNAME',
        message: 'Username may contain only letters, numbers, underscores, and hyphens.'
      });
    }

    const authResult = await getAuthenticatedUser(req);
    if (!authResult.user) {
      return jsonResponse(401, {
        ok: false,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required.'
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const ownerProfile = await getOwnerProfile(supabaseAdmin, authResult.user.id);
    if (ownerProfile.error || !ownerProfile.record) {
      return jsonResponse(403, {
        ok: false,
        code: 'OWNER_REQUIRED',
        message: 'Only business owners can invite clients.'
      });
    }

    const ownerRole = safeText(ownerProfile.record.role).toLowerCase();
    if (ownerRole !== 'owner') {
      return jsonResponse(403, {
        ok: false,
        code: 'OWNER_REQUIRED',
        message: 'Only business owners can invite clients.'
      });
    }

    const ownerBusinessId = safeText(ownerProfile.record.business_id);
    if (!ownerBusinessId) {
      return jsonResponse(403, {
        ok: false,
        code: 'OWNER_REQUIRED',
        message: 'The authenticated owner is not assigned to a valid business.'
      });
    }

    const existingByEmail = await findExistingClientByEmail(supabaseAdmin, clientEmail);
    if (existingByEmail.error) {
      return jsonResponse(500, {
        ok: false,
        code: 'PROFILE_LOOKUP_FAILED',
        message: 'Unable to verify the client email at this time.'
      });
    }

    if (existingByEmail.record) {
      const existingBusinessId = safeText(existingByEmail.record.business_id);
      const existingRole = safeText(existingByEmail.record.role).toLowerCase();

      if (existingBusinessId === ownerBusinessId && existingRole === 'client') {
        return jsonResponse(409, {
          ok: false,
          code: 'CLIENT_ALREADY_EXISTS',
          message: 'A client profile already exists for this email.'
        });
      }

      return jsonResponse(409, {
        ok: false,
        code: 'USER_ALREADY_EXISTS',
        message: 'This email already has an account.'
      });
    }

    const existingByUsername = await findExistingClientByUsername(supabaseAdmin, ownerBusinessId, username);
    if (existingByUsername.error) {
      return jsonResponse(500, {
        ok: false,
        code: 'PROFILE_LOOKUP_FAILED',
        message: 'Unable to verify the client username at this time.'
      });
    }

    if (existingByUsername.record) {
      return jsonResponse(409, {
        ok: false,
        code: 'USERNAME_ALREADY_EXISTS',
        message: 'That username is already in use by another client in this business.'
      });
    }

    const inviteResult = await supabaseAdmin.auth.admin.inviteUserByEmail(clientEmail, {
      data: {
        first_name: firstName,
        last_name: lastName,
        username,
        business_id: ownerBusinessId,
        role: 'client'
      }
    });

    if (inviteResult.error) {
      const msg = safeText(inviteResult.error.message || 'User invitation failed.');
      const lower = msg.toLowerCase();
      if (lower.includes('already') || lower.includes('exists') || lower.includes('duplicate')) {
        return jsonResponse(409, {
          ok: false,
          code: 'USER_ALREADY_EXISTS',
          message: 'This email already has an Auth account.'
        });
      }

      console.error('[invite-client] auth invite failed', inviteResult.error);
      return jsonResponse(500, {
        ok: false,
        code: 'AUTH_INVITE_FAILED',
        message: 'Client invitation could not be sent.'
      });
    }

    const invitedAuthUserId = inviteResult.data?.user?.id;
    if (!invitedAuthUserId) {
      return jsonResponse(500, {
        ok: false,
        code: 'AUTH_INVITE_INTEGRITY_ERROR',
        message: 'Client invitation was created, but the Auth user ID was not returned.'
      });
    }

    const authUserCheck = await supabaseAdmin.auth.admin.getUserById(invitedAuthUserId);
    if (authUserCheck.error || !authUserCheck.data?.user) {
      return jsonResponse(500, {
        ok: false,
        code: 'AUTH_INVITE_INTEGRITY_ERROR',
        message: 'Client invitation was created, but the Auth user could not be verified.'
      });
    }

    const verifiedAuthEmail = safeText(authUserCheck.data.user.email).toLowerCase();
    if (verifiedAuthEmail !== clientEmail) {
      return jsonResponse(500, {
        ok: false,
        code: 'AUTH_INVITE_INTEGRITY_ERROR',
        message: 'Client invitation returned an Auth user that does not match the requested email.'
      });
    }

    const profileInsert = await supabaseAdmin
      .from('users')
      .insert({
        id: invitedAuthUserId,
        business_id: ownerBusinessId,
        email: clientEmail,
        role: 'client',
        first_name: firstName,
        last_name: lastName,
        username,
        name: `${firstName} ${lastName}`.trim()
      })
      .select('id, business_id, role, email, username')
      .single();

    if (profileInsert.error || !profileInsert.data) {
      const existingProfile = await findProfileByAuthUserId(supabaseAdmin, invitedAuthUserId);
      if (!existingProfile.error && existingProfile.record) {
        const resolvedBusinessId = safeText(existingProfile.record.business_id);
        if (resolvedBusinessId === ownerBusinessId && safeText(existingProfile.record.role).toLowerCase() === 'client') {
          return jsonResponse(200, {
            ok: true,
            code: 'INVITATION_COMPLETED',
            message: 'Client invitation sent successfully.',
            clientEmail,
            username,
            businessId: ownerBusinessId,
            role: 'client'
          });
        }
      }

      const errorCode = safeText(profileInsert.error?.code ?? '');
      const errorMessage = safeText(profileInsert.error?.message ?? '');
      const errorDetail = safeText(profileInsert.error?.details ?? '');
      const lower = `${errorCode} ${errorMessage} ${errorDetail}`.toLowerCase();

      if (lower.includes('23505') || lower.includes('users_email_key') || lower.includes('users_business_id_username_unique')) {
        if (lower.includes('users_email_key') || lower.includes('email')) {
          return jsonResponse(409, {
            ok: false,
            code: 'USER_ALREADY_EXISTS',
            message: 'This email already has an account.'
          });
        }

        if (lower.includes('users_business_id_username_unique') || lower.includes('username')) {
          return jsonResponse(409, {
            ok: false,
            code: 'USERNAME_ALREADY_EXISTS',
            message: 'That username is already in use by another client in this business.'
          });
        }
      }

      console.error('[invite-client] profile insert failed', profileInsert.error);
      return jsonResponse(500, {
        ok: false,
        code: 'PROFILE_CREATION_FAILED',
        message: 'Client invitation was created, but the client profile could not be completed. The Auth user remains available for reconciliation.'
      });
    }

    return jsonResponse(200, {
      ok: true,
      code: 'INVITATION_COMPLETED',
      message: 'Client invitation sent successfully.',
      clientEmail,
      username,
      businessId: ownerBusinessId,
      role: 'client'
    });
  } catch (error) {
    console.error('[invite-client] unexpected error', error);
    return jsonResponse(500, {
      ok: false,
      code: 'UNEXPECTED_INVITATION_FAILURE',
      message: 'Unexpected client invitation failure.'
    });
  }
});
