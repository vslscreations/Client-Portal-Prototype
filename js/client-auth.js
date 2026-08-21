(function initDasherLabClientAuth(global) {
  "use strict";

  var CLIENT_CONTEXT_KEY = "dasherlab_client_context";

  function isPagesRoute() {
    var currentPath = global.location && global.location.pathname ? global.location.pathname : "";
    return currentPath.indexOf("/pages/") !== -1;
  }

  function resolvePath(path) {
    if (typeof global.resolvePortalPath === "function") {
      return global.resolvePortalPath(path);
    }
    return isPagesRoute() ? "../" + path : path;
  }

  function getClientLoginPath() {
    return resolvePath("client-login.html");
  }

  function getClientHomePath() {
    return resolvePath("index.html");
  }

  function getClientSetupPath() {
    return resolvePath("client-setup.html");
  }

  function normalizeLoginUsername(value) {
    var text = typeof value === "string" ? value.trim() : "";
    if (!text) {
      return "";
    }

    var lower = text.toLowerCase();
    var normalized = lower
      .replace(/\s+/g, ".")
      .replace(/[^a-z0-9._-]+/g, "")
      .replace(/[._-]{2,}/g, function (match) {
        return match.replace(/\./g, ".").replace(/-/g, "-").replace(/_/g, "_");
      })
      .replace(/^\.+|\.+$/g, "")
      .replace(/^[-_]+|[-_]+$/g, "");

    return normalized;
  }

  function hasPasswordChangeRequired(user) {
    if (!user) {
      return false;
    }

    var userMetadata = user.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {};
    var appMetadata = user.app_metadata && typeof user.app_metadata === "object" ? user.app_metadata : {};

    var userNeedsPasswordChange = !!(
      userMetadata.requires_password_change || userMetadata.needs_password_change
    );
    if (userMetadata && Object.prototype.hasOwnProperty.call(userMetadata, "requires_password_change")) {
      return userNeedsPasswordChange;
    }

    if (userMetadata && Object.prototype.hasOwnProperty.call(userMetadata, "needs_password_change")) {
      return userNeedsPasswordChange;
    }

    return !!(
      appMetadata.requires_password_change || appMetadata.needs_password_change
    );
  }

  function isClientLoginRoute() {
    var currentUrl = global.location && global.location.href ? global.location.href : "";
    return currentUrl.indexOf("/client-login.html") !== -1 || currentUrl.indexOf("client-login.html") !== -1;
  }

  function hideProtectedContent() {
    try {
      if (global.document && global.document.documentElement) {
        global.document.documentElement.style.visibility = "hidden";
      }
    } catch (err) {
      // Ignore visibility errors while checking auth state.
    }
  }

  function restoreProtectedContent() {
    try {
      if (global.document && global.document.documentElement) {
        global.document.documentElement.style.visibility = "";
      }
    } catch (err) {
      // Ignore visibility errors while checking auth state.
    }
  }

  async function enforceClientRouteProtection() {
    if (isClientLoginRoute()) {
      return false;
    }

    hideProtectedContent();

    if (!global.supabaseClient || !global.supabaseClient.auth || typeof global.supabaseClient.auth.getSession !== "function") {
      if (global.location) {
        global.location.replace(getClientLoginPath());
      }
      return false;
    }

    try {
      var sessionResult = await global.supabaseClient.auth.getSession();
      var session = sessionResult && sessionResult.data ? sessionResult.data.session : null;

      if (!session || !session.user || !session.user.id) {
        if (global.location) {
          global.location.replace(getClientLoginPath());
        }
        return false;
      }

      var association = await getClientAssociationByUserId(session.user.id);
      if (!association || !association.ok || !association.context || !association.context.businessId) {
        if (global.location) {
          global.location.replace(getClientLoginPath());
        }
        return false;
      }

      restoreProtectedContent();
      return true;
    } catch (error) {
      if (global.location) {
        global.location.replace(getClientLoginPath());
      }
      return false;
    }
  }

  function clearClientContext() {
    try {
      global.sessionStorage.removeItem(CLIENT_CONTEXT_KEY);
    } catch (err) {
      // Ignore storage errors to avoid blocking auth flow.
    }
  }

  function saveClientContext(context) {
    try {
      global.sessionStorage.setItem(CLIENT_CONTEXT_KEY, JSON.stringify(context));
    } catch (err) {
      // Ignore storage errors to avoid blocking auth flow.
    }
  }

  function getClientContext() {
    try {
      var raw = global.sessionStorage.getItem(CLIENT_CONTEXT_KEY);
      if (!raw) {
        return null;
      }

      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  async function getClientAssociationByUserId(userId) {
    if (!global.supabaseClient || !userId) {
      return { ok: false, reason: "missing_user" };
    }

    var result = await global.supabaseClient
      .from("users")
      .select("id, business_id, role")
      .eq("id", userId)
      .maybeSingle();

    if (result.error) {
      return { ok: false, reason: "association_lookup_failed", error: result.error };
    }

    if (!result.data || !result.data.business_id) {
      return { ok: false, reason: "no_business_association" };
    }

    var role = result.data.role ? String(result.data.role).toLowerCase() : "";
    var context = {
      userId: result.data.id,
      businessId: result.data.business_id,
      role: role
    };

    saveClientContext(context);
    return { ok: true, context: context };
  }

  async function resolveClientEmailFromUsername(username) {
    if (!global.supabaseClient || !username) {
      return null;
    }

    var rawValue = String(username).trim();
    if (!rawValue) {
      return null;
    }

    var looksLikeEmail = /@/.test(rawValue);
    if (looksLikeEmail) {
      return rawValue.toLowerCase();
    }

    var normalizedUsername = normalizeLoginUsername(rawValue);
    if (!normalizedUsername) {
      return null;
    }

    var result = await global.supabaseClient
      .from("users")
      .select("id, email, username")
      .ilike("username", normalizedUsername)
      .maybeSingle();

    if (result.error || !result.data || !result.data.email) {
      return null;
    }

    return result.data.email;
  }

  async function signInClient(email, password) {
    if (!global.supabaseClient) {
      return { ok: false, message: "Authentication is unavailable right now. Please try again." };
    }

    var authResult = await global.supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (authResult.error) {
      return { ok: false, message: "Invalid email or password.", error: authResult.error };
    }

    var session = authResult.data && authResult.data.session ? authResult.data.session : null;
    var user = session && session.user ? session.user : null;

    if (!user || !user.id) {
      return { ok: false, message: "Unable to validate your account. Please try again." };
    }

    var association = await getClientAssociationByUserId(user.id);

    if (!association.ok) {
      await global.supabaseClient.auth.signOut();
      clearClientContext();
      return {
        ok: false,
        message: "Your account is not linked to an active business profile. Please contact support.",
        reason: association.reason,
        error: association.error || null
      };
    }

    var requiresPasswordChange = hasPasswordChangeRequired(user);

    return {
      ok: true,
      session: session,
      user: user,
      businessId: association.context.businessId,
      redirectToSetup: requiresPasswordChange
    };
  }

  async function signInClientUsername(username, password) {
    if (!global.supabaseClient) {
      return { ok: false, message: "Authentication is unavailable right now. Please try again." };
    }

    var email = await resolveClientEmailFromUsername(username);
    if (!email) {
      return { ok: false, message: "Invalid username or password." };
    }

    var result = await signInClient(email, password);
    if (result && result.ok && result.redirectToSetup) {
      return {
        ok: true,
        session: result.session,
        user: result.user,
        businessId: result.businessId,
        redirectToSetup: true
      };
    }

    return result;
  }

  async function requireClientSession(options) {
    var opts = options || {};
    var shouldRedirect = opts.redirect !== false;

    if (!global.supabaseClient) {
      if (shouldRedirect) {
        global.location.replace(getClientLoginPath());
      }
      return null;
    }

    var sessionResult = await global.supabaseClient.auth.getSession();
    var session = sessionResult && sessionResult.data ? sessionResult.data.session : null;

    if (!session || !session.user || !session.user.id) {
      clearClientContext();
      if (shouldRedirect) {
        global.location.replace(getClientLoginPath());
      }
      return null;
    }

    var association = await getClientAssociationByUserId(session.user.id);

    if (!association.ok) {
      clearClientContext();
      if (shouldRedirect) {
        global.location.replace(getClientLoginPath());
      }
      return null;
    }

    if (association.context && association.context.role) {
      var role = String(association.context.role).toLowerCase();
      var currentPath = global.location && global.location.pathname ? global.location.pathname.toLowerCase() : "";
      var isClientHomeRoute = currentPath === "/index.html" || currentPath === "/" || currentPath.endsWith("/index.html");

      if (role !== "client" && !isClientHomeRoute) {
        clearClientContext();
        if (shouldRedirect && global.location) {
          global.location.replace("dashboard.html");
        }
        return null;
      }
    }

    var requiresPasswordChange = hasPasswordChangeRequired(session.user);

    if (requiresPasswordChange && shouldRedirect) {
      if (global.location) {
        global.location.replace(getClientSetupPath());
      }
      return {
        session: session,
        user: session.user,
        businessId: association.context.businessId,
        requiresPasswordChange: true
      };
    }

    return {
      session: session,
      user: session.user,
      businessId: association.context.businessId,
      requiresPasswordChange: false
    };
  }

  async function guardProtectedClientRoute(options) {
    var opts = options || {};
    var allowLoginRoute = !!opts.allowLoginRoute;

    if (!allowLoginRoute && isClientLoginRoute()) {
      return false;
    }

    if (!isProtectedClientRoute()) {
      return false;
    }

    hideProtectedContent();

    var sessionData = await requireClientSession({ redirect: false });
    if (!sessionData) {
      clearClientContext();
      if (global.location) {
        global.location.replace(getClientLoginPath());
      }
      return false;
    }

    if (sessionData.requiresPasswordChange) {
      clearClientContext();
      if (global.location) {
        global.location.replace(getClientSetupPath());
      }
      return false;
    }

    restoreProtectedContent();
    return true;
  }

  function isProtectedClientRoute() {
    var currentPath = global.location && global.location.pathname ? global.location.pathname : "";
    var normalized = currentPath.toLowerCase();
    var protectedRoutes = [
      "/client-portal.html",
      "/index.html",
      "/pages/pickup.html",
      "/pages/quote.html",
      "/pages/contact.html",
      "/pages/tracking-status.html"
    ];

    return protectedRoutes.some(function (route) {
      return normalized === route || normalized.endsWith(route);
    });
  }

  async function signOutClient(options) {
    var opts = options || {};
    var shouldRedirect = opts.redirect !== false;

    clearClientContext();

    if (global.supabaseClient && global.supabaseClient.auth) {
      await global.supabaseClient.auth.signOut();
    }

    if (shouldRedirect) {
      global.location.replace(getClientLoginPath());
    }
  }

  function getClientPasswordResetRedirectUrl() {
    var configuredBase = global.DASHERLAB_SUPABASE_CONFIG && global.DASHERLAB_SUPABASE_CONFIG.appUrl
      ? global.DASHERLAB_SUPABASE_CONFIG.appUrl
      : null;

    var origin = configuredBase && String(configuredBase).trim()
      ? String(configuredBase).trim().replace(/\/$/, "")
      : (global.location && global.location.origin ? global.location.origin : "https://dasherlab.org");

    return origin.replace(/\/$/, "") + "/reset-password.html";
  }

  async function requestClientPasswordReset(email) {
    if (!global.supabaseClient) {
      return { ok: false, message: "Password reset is unavailable right now." };
    }

    if (!email) {
      return { ok: false, message: "Enter your email first, then try again." };
    }

    var redirectUrl = getClientPasswordResetRedirectUrl();
    var result = await global.supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });

    if (result.error) {
      return { ok: false, message: "Unable to send reset instructions right now.", error: result.error };
    }

    return { ok: true, message: "Password reset instructions were sent if your email is registered." };
  }

  global.DasherLabClientAuth = {
    signInClient: signInClient,
    signInClientUsername: signInClientUsername,
    resolveClientEmailFromUsername: resolveClientEmailFromUsername,
    requireClientSession: requireClientSession,
    guardProtectedClientRoute: guardProtectedClientRoute,
    enforceClientRouteProtection: guardProtectedClientRoute,
    signOutClient: signOutClient,
    requestClientPasswordReset: requestClientPasswordReset,
    getClientAssociationByUserId: getClientAssociationByUserId,
    getClientContext: getClientContext,
    getClientLoginPath: getClientLoginPath,
    getClientHomePath: getClientHomePath,
    getClientSetupPath: getClientSetupPath,
    clearClientContext: clearClientContext,
    hasPasswordChangeRequired: hasPasswordChangeRequired
  };

  if (!isClientLoginRoute() && isProtectedClientRoute()) {
    guardProtectedClientRoute();
  }
})(window);
