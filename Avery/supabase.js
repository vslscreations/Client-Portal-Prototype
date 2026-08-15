(function initDasherLabSupabase(global) {
  "use strict";

  var cfg = global.DASHERLAB_SUPABASE_CONFIG || {};
  var url = cfg.url;
  var anonKey = cfg.anonKey;

  function isUuid(value) {
    return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  function looksLikeStubSupabaseClient(client) {
    if (!client || !client.auth) {
      return true;
    }

    if (typeof client.auth.getUser !== "function") {
      return true;
    }

    if (typeof client.auth.getSession !== "function") {
      return true;
    }

    return false;
  }

  if (!global.supabase || typeof global.supabase.createClient !== "function") {
    console.error("[Supabase] SDK not loaded");
    return;
  }

  if (!url || !anonKey) {
    console.warn("[Supabase] Missing public config (url/anonKey)");
    return;
  }

  function createRealSupabaseClient() {
    return global.supabase.createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  if (!global.supabaseClient || looksLikeStubSupabaseClient(global.supabaseClient)) {
    global.supabaseClient = createRealSupabaseClient();
  }

  global.testSupabaseConnection = async function testSupabaseConnection() {
    if (!global.supabaseClient) {
      return { ok: false, hasClient: false, error: "Client not initialized" };
    }

    try {
      var res = await global.supabaseClient.auth.getSession();
      var session = res && res.data ? res.data.session : null;
      var userId = session && session.user ? session.user.id : null;
      var isStubSession = !userId || !isUuid(userId) || (typeof global.supabaseClient.auth.getUser !== "function");

      if (isStubSession) {
        global.supabaseClient = createRealSupabaseClient();
        res = await global.supabaseClient.auth.getSession();
        session = res && res.data ? res.data.session : null;
        userId = session && session.user ? session.user.id : null;
      }

      return {
        ok: !res.error,
        hasClient: true,
        hasSession: !!(res.data && res.data.session),
        userId: userId || null,
        error: res.error ? res.error.message : null
      };
    } catch (err) {
      return {
        ok: false,
        hasClient: true,
        error: err && err.message ? err.message : String(err)
      };
    }
  };
})(window);
