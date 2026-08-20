// Public browser-safe config only. Never use service_role in frontend.
window.DASHERLAB_SUPABASE_CONFIG = window.DASHERLAB_SUPABASE_CONFIG || {
  url: "https://oezpjyuxlxluplfnylhj.supabase.co",
  anonKey: "sb_publishable_QSl106qGZkyP33SCmFVmcA_OAp89elR",
  ownerNotificationEmail: "admin@dasherlab.org",
  appUrl: (function getAppUrl() {
    if (typeof window === "undefined") {
      return "https://dasherlab.org";
    }

    if (window.location && window.location.origin) {
      return window.location.origin;
    }

    return "https://dasherlab.org";
  })()
};

window.DasherLabEmailNotifications = window.DasherLabEmailNotifications || {
  async sendRequestNotification(eventType, payload) {
    if (!window.supabaseClient || !window.supabaseClient.functions) {
      return { ok: false, skipped: true, reason: "supabase_functions_unavailable" };
    }

    const safePayload = payload && typeof payload === "object" ? payload : {};
    const requestPayload = Object.assign({}, safePayload, {
      ownerNotificationEmail: safePayload.ownerNotificationEmail || window.DASHERLAB_SUPABASE_CONFIG.ownerNotificationEmail || "admin@dasherlab.org"
    });

    try {
      const result = await window.supabaseClient.functions.invoke("notify-request-email", {
        body: {
          eventType: eventType,
          payload: requestPayload
        }
      });

      if (result && result.error) {
        console.warn("[email] request notification failed:", result.error);
        return { ok: false, error: result.error };
      }

      return { ok: true, data: result && result.data ? result.data : null };
    } catch (error) {
      console.warn("[email] request notification failed:", error);
      return { ok: false, error: error && error.message ? error.message : String(error) };
    }
  }
};
