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
      .select("id, business_id")
      .eq("id", userId)
      .maybeSingle();

    if (result.error) {
      return { ok: false, reason: "association_lookup_failed", error: result.error };
    }

    if (!result.data || !result.data.business_id) {
      return { ok: false, reason: "no_business_association" };
    }

    var context = {
      userId: result.data.id,
      businessId: result.data.business_id
    };

    saveClientContext(context);
    return { ok: true, context: context };
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

    return {
      ok: true,
      session: session,
      user: user,
      businessId: association.context.businessId
    };
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

    return {
      session: session,
      user: session.user,
      businessId: association.context.businessId
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

    restoreProtectedContent();
    return true;
  }

  function isProtectedClientRoute() {
    var currentPath = global.location && global.location.pathname ? global.location.pathname : "";
    var normalized = currentPath.toLowerCase();
    var protectedRoutes = [
      "/dashboard.html",
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

  async function requestClientPasswordReset(email) {
    if (!global.supabaseClient) {
      return { ok: false, message: "Password reset is unavailable right now." };
    }

    if (!email) {
      return { ok: false, message: "Enter your email first, then try again." };
    }

    var redirectUrl = new URL(resolvePath("client-login.html"), global.location.href).href;
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
    requireClientSession: requireClientSession,
    guardProtectedClientRoute: guardProtectedClientRoute,
    enforceClientRouteProtection: guardProtectedClientRoute,
    signOutClient: signOutClient,
    requestClientPasswordReset: requestClientPasswordReset,
    getClientAssociationByUserId: getClientAssociationByUserId,
    getClientContext: getClientContext,
    getClientLoginPath: getClientLoginPath,
    getClientHomePath: getClientHomePath,
    clearClientContext: clearClientContext
  };

  if (!isClientLoginRoute() && isProtectedClientRoute()) {
    guardProtectedClientRoute();
  }
})(window);
