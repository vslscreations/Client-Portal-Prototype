import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const PLATFORM_ADMIN_ROLES = new Set(['admin', 'platform_admin', 'super_admin']);

function safeText(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
  const hasAuthHeader = !!authHeader;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[create-business-owner] missing bearer token', {
      hasAuthHeader,
      method: req.method,
      origin: req.headers.get('origin')
    });
    return { user: null, error: 'Missing bearer token.' };
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { user: null, error: 'Supabase auth configuration is missing.' };
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
    console.warn('[create-business-owner] auth validation failed', {
      message: error?.message || 'Invalid session.',
      userId: user?.id || null
    });
    return { user: null, error: error?.message || 'Invalid session.' };
  }

  return { user, error: null };
}

async function checkExistingRoleColumn(serviceRoleClient: ReturnType<typeof createClient>) {
  try {
    const { data, error } = await serviceRoleClient
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'users');

    if (error) {
      console.warn('Unable to inspect users schema for role column:', error.message);
      return false;
    }

    return Array.isArray(data) && data.some((column: Record<string, unknown>) => column.column_name === 'role');
  } catch (error) {
    console.warn('Failed while checking for users.role column:', error);
    return false;
  }
}

async function authorizeOwnerCreation(userId: string, serviceRoleClient: ReturnType<typeof createClient>) {
  const hasRoleColumn = await checkExistingRoleColumn(serviceRoleClient);
  if (!hasRoleColumn) {
    return {
      ok: false,
      reason: 'The users table does not expose a role column yet. Add the existing owner/admin role metadata before enabling business creation.'
    };
  }

  const { data: userRecord, error: userError } = await serviceRoleClient
    .from('users')
    .select('id, business_id, role, email, name')
    .eq('id', userId)
    .maybeSingle();

  if (userError) {
    console.error('Unable to inspect current user for authorization:', userError.message);
    return {
      ok: false,
      reason: 'Could not determine whether the current user is authorized to create a business.'
    };
  }

  if (!userRecord) {
    return {
      ok: false,
      reason: 'The current user account is not linked to a business profile and cannot create a new business.'
    };
  }

  const currentRole = safeText(userRecord.role).toLowerCase();
  if (!PLATFORM_ADMIN_ROLES.has(currentRole)) {
    return {
      ok: false,
      reason: 'Only an EskoDSK platform administrator can create a new business.'
    };
  }

  return {
    ok: true,
    userRecord
  };
}

async function cleanupOnFailure(serviceRoleClient: ReturnType<typeof createClient>, businessId: string | null, authUserId: string | null) {
  if (authUserId) {
    try {
      if (typeof serviceRoleClient.auth.admin?.deleteUser === 'function') {
        await serviceRoleClient.auth.admin.deleteUser(authUserId);
      }
    } catch (error) {
      console.error('Cleanup: removing auth user failed', error);
    }
  }

  if (businessId) {
    try {
      await serviceRoleClient
        .from('businesses')
        .delete()
        .eq('id', businessId);
    } catch (error) {
      console.error('Cleanup: removing business failed', error);
    }
  }
}

Deno.serve(async (req: Request) => {
  const requestOrigin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    console.info('[create-business-owner] handling preflight', {
      origin: requestOrigin,
      method: req.method
    });
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { ok: false, message: 'Method not allowed.' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, {
      ok: false,
      message: 'Server-side Supabase configuration is missing.'
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const businessName = safeText(body?.businessName);
    const ownerName = safeText(body?.ownerName);
    const ownerEmail = safeText(body?.ownerEmail).toLowerCase();

    if (!businessName || !ownerName || !ownerEmail) {
      return jsonResponse(400, {
        ok: false,
        message: 'Business name, owner name, and owner email are required.'
      });
    }

    if (!isValidEmail(ownerEmail)) {
      return jsonResponse(400, {
        ok: false,
        message: 'Owner email must be a valid email address.'
      });
    }

    const authResult = await getAuthenticatedUser(req);
    if (!authResult.user) {
      console.warn('[create-business-owner] unauthenticated request rejected', {
        reason: authResult.error || 'Your session is not valid for this action.'
      });
      return jsonResponse(401, {
        ok: false,
        message: authResult.error || 'Your session is not valid for this action.'
      });
    }

    const serviceRoleClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const authorization = await authorizeOwnerCreation(authResult.user.id, serviceRoleClient);
    if (!authorization.ok) {
      console.warn('[create-business-owner] authorization rejected', {
        userId: authResult.user.id,
        reason: authorization.reason || 'You are not authorized to create a business.'
      });
      return jsonResponse(403, {
        ok: false,
        message: authorization.reason || 'You are not authorized to create a business.'
      });
    }

    const { data: existingBusiness, error: existingBusinessError } = await serviceRoleClient
      .from('businesses')
      .select('id')
      .ilike('name', businessName)
      .maybeSingle();

    if (existingBusinessError && existingBusinessError.code !== 'PGRST116') {
      console.error('Business lookup failed before insert:', existingBusinessError.message);
      return jsonResponse(500, {
        ok: false,
        message: 'Unable to validate the business name.'
      });
    }

    if (existingBusiness) {
      return jsonResponse(409, {
        ok: false,
        message: 'A business with that name already exists.'
      });
    }

    let createdBusiness: { id: string; name?: string } | null = null;
    let authUserId: string | null = null;

    try {
      const businessInsert = await serviceRoleClient
        .from('businesses')
        .insert({
          name: businessName,
          contact_name: ownerName,
          email: ownerEmail
        })
        .select('id, name')
        .single();

      if (businessInsert.error || !businessInsert.data) {
        throw new Error(businessInsert.error?.message || 'Unable to create the business record.');
      }

      createdBusiness = businessInsert.data;

      const newPassword = `${crypto.randomUUID()}-${crypto.randomUUID()}!Aa1`;
      const authUser = await serviceRoleClient.auth.admin.createUser({
        email: ownerEmail,
        password: newPassword,
        email_confirm: false,
        user_metadata: {
          full_name: ownerName,
          business_name: businessName,
          business_id: createdBusiness.id
        }
      });

      if (authUser.error || !authUser.data?.user) {
        throw new Error(authUser.error?.message || 'Authentication account creation failed.');
      }

      authUserId = authUser.data.user.id;

      const profileInsert = await serviceRoleClient
        .from('users')
        .insert({
          id: authUserId,
          business_id: createdBusiness.id,
          role: 'owner',
          name: ownerName,
          email: ownerEmail
        })
        .select('id, business_id, role, name, email')
        .single();

      if (profileInsert.error || !profileInsert.data) {
        throw new Error(profileInsert.error?.message || 'Unable to create the owner profile.');
      }

      let invitationStatus = 'Invitation setup required';
      try {
        if (typeof serviceRoleClient.auth.admin.inviteUserByEmail === 'function') {
          const inviteResult = await serviceRoleClient.auth.admin.inviteUserByEmail(ownerEmail, {
            data: {
              full_name: ownerName,
              business_id: createdBusiness.id,
              role: 'owner'
            }
          });

          if (!inviteResult.error) {
            invitationStatus = 'Invitation sent';
          } else {
            console.warn('Invitation email setup not available or failed:', inviteResult.error.message);
            invitationStatus = 'Invitation setup required';
          }
        }
      } catch (error) {
        console.warn('Invitation email call failed:', error);
      }

      return jsonResponse(200, {
        ok: true,
        message: 'Business and owner account created successfully.',
        businessId: createdBusiness.id,
        businessName: createdBusiness.name || businessName,
        ownerName,
        ownerEmail,
        ownerUserId: authUserId,
        invitationStatus
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The business owner workflow failed.';
      console.error('create-business-owner failed:', message);

      if (createdBusiness?.id || authUserId) {
        await cleanupOnFailure(serviceRoleClient, createdBusiness?.id || null, authUserId);
      }

      if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('already exists') || message.toLowerCase().includes('user already registered')) {
        return jsonResponse(409, {
          ok: false,
          message: 'An account with that owner email already exists.'
        });
      }

      return jsonResponse(400, {
        ok: false,
        message: message
      });
    }
  } catch (error) {
    console.error('Unexpected create-business-owner failure:', error);
    return jsonResponse(500, {
      ok: false,
      message: error instanceof Error ? error.message : 'Unexpected business creation failure.'
    });
  }
});
