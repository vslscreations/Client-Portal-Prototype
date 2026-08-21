(function initDasherLabClientDashboard(global) {
  "use strict";

  function setText(id, value) {
    var element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    if (!value) {
      return "No date yet";
    }

    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }

    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function formatDateTime(value) {
    if (!value) {
      return "Recently updated";
    }

    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }

    return parsed.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function renderEmptyState(containerId, heading, message) {
    var element = document.getElementById(containerId);
    if (!element) {
      return;
    }

    element.innerHTML = [
      '<div class="empty-state">',
      '<h3>' + escapeHtml(heading) + '</h3>',
      '<p>' + escapeHtml(message) + '</p>',
      '</div>'
    ].join("");
  }

  function renderActivityList(containerId, items, emptyHeading, emptyMessage) {
    var element = document.getElementById(containerId);
    if (!element) {
      return;
    }

    if (!items || !items.length) {
      renderEmptyState(containerId, emptyHeading, emptyMessage);
      return;
    }

    element.innerHTML = items.map(function (item) {
      return [
        '<div class="activity-item">',
        '<span>' + escapeHtml(item.icon) + '</span>',
        '<div>',
        '<strong>' + escapeHtml(item.title) + '</strong>',
        '<p>' + escapeHtml(item.body) + '</p>',
        '<small>' + escapeHtml(item.meta) + '</small>',
        '</div>',
        '</div>'
      ].join("");
    }).join("");
  }

  function toCount(result) {
    return typeof result.count === "number" ? result.count : 0;
  }

  async function fetchCount(tableName, businessId, clientUserId) {
    var query = global.supabaseClient
      .from(tableName)
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);

    if (clientUserId) {
      query = query.eq("client_user_id", clientUserId);
    }

    var result = await query;

    return {
      data: toCount(result),
      error: result.error || null
    };
  }

  async function fetchBusiness(businessId) {
    var result = await global.supabaseClient
      .from("businesses")
      .select("id, name")
      .eq("id", businessId)
      .maybeSingle();

    return {
      data: result.data || null,
      error: result.error || null
    };
  }

  async function fetchRecentCustomers(businessId) {
    var result = await global.supabaseClient
      .from("customers")
      .select("id, company_name, contact_name, email, phone, created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(5);

    return {
      data: Array.isArray(result.data) ? result.data : [],
      error: result.error || null
    };
  }

  async function fetchRecentPickups(businessId, clientUserId) {
    var query = global.supabaseClient
      .from("pickup_requests")
      .select("id, pickup_address, delivery_address, pickup_date, pickup_time, service_type, priority, package_type, notes, status, tracking_number, created_at")
      .eq("business_id", businessId);

    if (clientUserId) {
      query = query.eq("client_user_id", clientUserId);
    }

    var result = await query.order("created_at", { ascending: false }).limit(5);

    return {
      data: Array.isArray(result.data) ? result.data : [],
      error: result.error || null
    };
  }

  async function fetchRecentQuotes(businessId, clientUserId) {
    var query = global.supabaseClient
      .from("quotes")
      .select("id, pickup_address, delivery_address, service_type, mileage, priority, estimated_total, requested_date, notes, status, created_at")
      .eq("business_id", businessId);

    if (clientUserId) {
      query = query.eq("client_user_id", clientUserId);
    }

    var result = await query.order("created_at", { ascending: false }).limit(5);

    return {
      data: Array.isArray(result.data) ? result.data : [],
      error: result.error || null
    };
  }

  function buildActivityItems(pickups, quotes) {
    var pickupItems = (pickups || []).map(function (pickup) {
      var trackingNumber = pickup.tracking_number ? String(pickup.tracking_number) : "No tracking number";
      return {
        createdAt: pickup.created_at || pickup.pickup_date || "",
        icon: "📦",
        title: (pickup.service_type || "Pickup request") + " • " + trackingNumber,
        body: [pickup.pickup_address || "Pickup", pickup.delivery_address || "Delivery"]
          .filter(Boolean)
          .join(" -> "),
        meta: [pickup.status || "Awaiting review", pickup.pickup_date ? formatDate(pickup.pickup_date) : null]
          .filter(Boolean)
          .join(" • ")
      };
    });

    var quoteItems = (quotes || []).map(function (quote) {
      return {
        createdAt: quote.created_at || quote.requested_date || "",
        icon: "💰",
        title: quote.service_type || "Quote request",
        body: [quote.pickup_address || "Pickup", quote.delivery_address || "Delivery"]
          .filter(Boolean)
          .join(" -> "),
        meta: [quote.status || "Pending quote", typeof quote.estimated_total === "number" ? "$" + Number(quote.estimated_total).toLocaleString() : null]
          .filter(Boolean)
          .join(" • ")
      };
    });

    return pickupItems.concat(quoteItems).sort(function (left, right) {
      return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
    }).slice(0, 5);
  }

  function buildCustomerItems(customers) {
    return (customers || []).map(function (customer) {
      return {
        icon: "👤",
        title: customer.company_name || customer.contact_name || "Customer contact",
        body: customer.contact_name || customer.email || "Contact details available",
        meta: [customer.email || null, customer.phone || null, formatDateTime(customer.created_at)]
          .filter(Boolean)
          .join(" • ")
      };
    });
  }

  function updateContextBanner(sessionData, businessRecord) {
    var businessName = businessRecord && businessRecord.name ? businessRecord.name : "DasherLab";
    setText("clientBusinessName", businessName);
    setText("clientSessionSummary", (sessionData.user && sessionData.user.email ? sessionData.user.email : "Authenticated client") + " • Client Portal");
  }

  function updateSnapshot(counts) {
    var hasAnyActivity = !!(counts && (counts.customers || counts.pickups || counts.quotes || counts.openItems));
    setText("clientCustomersCount", hasAnyActivity ? String(counts.customers) : "");
    setText("clientPickupCount", hasAnyActivity ? String(counts.pickups) : "");
    setText("clientQuoteCount", hasAnyActivity ? String(counts.quotes) : "");
    setText("clientOpenItemsCount", hasAnyActivity ? String(counts.openItems) : "");
  }

  function setDashboardStatus(message) {
    setText("clientDashboardStatus", message || "No activity yet");
  }

  async function loadClientDashboard() {
    if (!global.DasherLabClientAuth || !global.supabaseClient) {
      global.location.replace("client-login.html");
      return;
    }

    var sessionData = await global.DasherLabClientAuth.requireClientSession();
    if (!sessionData) {
      return;
    }

    var businessId = sessionData.businessId;
    var currentUserId = sessionData.user && sessionData.user.id ? sessionData.user.id : null;
    var results = await Promise.all([
      fetchBusiness(businessId),
      fetchCount("customers", businessId),
      fetchCount("pickup_requests", businessId, currentUserId),
      fetchCount("quotes", businessId, currentUserId),
      fetchRecentCustomers(businessId),
      fetchRecentPickups(businessId, currentUserId),
      fetchRecentQuotes(businessId, currentUserId)
    ]);

    var businessResult = results[0];
    var customerCountResult = results[1];
    var pickupCountResult = results[2];
    var quoteCountResult = results[3];
    var customersResult = results[4];
    var pickupsResult = results[5];
    var quotesResult = results[6];

    updateContextBanner(sessionData, businessResult.data);

    var hadErrors = results.some(function (result) {
      return !!result.error;
    });

    var counts = {
      customers: customerCountResult.data || 0,
      pickups: pickupCountResult.data || 0,
      quotes: quoteCountResult.data || 0,
      openItems: (pickupsResult.data || []).filter(function (pickup) {
        return String(pickup.status || "").toLowerCase() !== "completed";
      }).length + (quotesResult.data || []).filter(function (quote) {
        return String(quote.status || "").toLowerCase() !== "completed";
      }).length
    };

    updateSnapshot(counts);

    if (hadErrors) {
      setDashboardStatus("Some authenticated dashboard data is unavailable right now. Your session is still active.");
    } else if (counts.customers === 0 && counts.pickups === 0 && counts.quotes === 0) {
      setDashboardStatus("No activity yet");
    } else {
      setDashboardStatus("Showing live data for your authenticated business profile.");
    }

    var activityItems = buildActivityItems(pickupsResult.data, quotesResult.data);
    var customerItems = buildCustomerItems(customersResult.data);

    if (counts.customers === 0 && counts.pickups === 0 && counts.quotes === 0) {
      renderEmptyState("clientActivityList", "No activity yet", "Activity will appear here after this account has any pickup or quote activity.");
      renderEmptyState("clientCustomerList", "No customer contacts yet", "Customer records will appear here once activity is created.");
    } else {
      renderActivityList(
        "clientActivityList",
        activityItems,
        "No activity yet",
        "Pickup requests and quote activity will appear here once your authenticated business starts using the portal."
      );

      renderActivityList(
        "clientCustomerList",
        customerItems,
        "No customer contacts yet",
        "Customer records for your authenticated business will appear here once they are added."
      );
    }
  }

  global.DasherLabClientDashboard = {
    load: loadClientDashboard
  };

  document.addEventListener("DOMContentLoaded", function () {
    loadClientDashboard().catch(function () {
      setDashboardStatus("We couldn't load your dashboard right now. Please sign in again.");
      renderEmptyState("clientActivityList", "Dashboard unavailable", "Please refresh the page or sign in again.");
      renderEmptyState("clientCustomerList", "Customer data unavailable", "Please refresh the page or sign in again.");
    });
  });
})(window);