const lookupToolDefinitions = {
  lookup_pickup: {
    name: "lookup_pickup",
    description: "Look up a specific pickup or delivery by tracking_number for the authenticated user's business. The business_id is resolved server-side from the authenticated Supabase user; user messages must not include business_id.",
    table: "pickup_requests",
    allowedFilters: ["tracking_number"],
    allowedColumns: [
      "id",
      "business_id",
      "tracking_number",
      "customer_name",
      "business_name",
      "email",
      "phone",
      "pickup_facility",
      "pickup_address",
      "pickup_contact",
      "pickup_phone",
      "delivery_facility",
      "delivery_address",
      "delivery_contact",
      "delivery_phone",
      "pickup_date",
      "pickup_time",
      "scheduled_pickup_date",
      "scheduled_pickup_time",
      "assigned_driver",
      "service_type",
      "priority",
      "package_type",
      "notes",
      "status",
      "created_at"
    ],
    maxRows: 10,
    defaultOrder: { field: "created_at", direction: "desc" }
  },
  lookup_quote: {
    name: "lookup_quote",
    description: "Look up a quote request by reference for the authenticated user's business. The business_id is resolved server-side from the authenticated Supabase user.",
    table: "quotes",
    allowedFilters: ["reference"],
    allowedColumns: [
      "id",
      "business_id",
      "reference",
      "pickup_address",
      "delivery_address",
      "service_type",
      "mileage",
      "priority",
      "estimated_total",
      "requested_date",
      "notes",
      "status",
      "created_at"
    ],
    maxRows: 10,
    defaultOrder: { field: "created_at", direction: "desc" }
  },
  get_business_info: {
    name: "get_business_info",
    description: "Return the authenticated business profile for the current user. The business_id is resolved server-side from the authenticated Supabase user.",
    table: "businesses",
    allowedFilters: [],
    allowedColumns: [
      "id",
      "name",
      "contact_name",
      "phone",
      "email",
      "address",
      "city",
      "state",
      "zip_code",
      "created_at"
    ],
    maxRows: 1,
    defaultOrder: { field: "created_at", direction: "asc" }
  },
  list_scheduled_pickups: {
    name: "list_scheduled_pickups",
    description: "List scheduled pickup requests for the authenticated business within a supported operational window such as today, tomorrow, or this week. The business_id is resolved server-side and is never user-supplied.",
    table: "pickup_requests",
    allowedFilters: ["window", "driver_name", "start_time", "end_time"],
    allowedColumns: [
      "id",
      "business_id",
      "tracking_number",
      "pickup_address",
      "delivery_address",
      "pickup_date",
      "pickup_time",
      "scheduled_pickup_date",
      "scheduled_pickup_time",
      "assigned_driver",
      "service_type",
      "priority",
      "package_type",
      "status",
      "notes",
      "created_at"
    ],
    maxRows: 200,
    defaultOrder: { field: "scheduled_pickup_date", direction: "asc" }
  },
  list_pickups_by_status: {
    name: "list_pickups_by_status",
    description: "List pickup requests for the authenticated business by status, optionally filtered to a supported operational window such as today or this week.",
    table: "pickup_requests",
    allowedFilters: ["status", "window", "driver_name"],
    allowedColumns: [
      "id",
      "business_id",
      "tracking_number",
      "pickup_address",
      "delivery_address",
      "scheduled_pickup_date",
      "scheduled_pickup_time",
      "assigned_driver",
      "service_type",
      "priority",
      "package_type",
      "status",
      "created_at"
    ],
    maxRows: 200,
    defaultOrder: { field: "scheduled_pickup_date", direction: "asc" }
  },
  list_pickups_by_driver: {
    name: "list_pickups_by_driver",
    description: "List a driver's scheduled pickups for the authenticated business within an operational window. The driver is a text name field and is filtered by the authenticated business only.",
    table: "pickup_requests",
    allowedFilters: ["driver_name", "window", "status"],
    allowedColumns: [
      "id",
      "business_id",
      "tracking_number",
      "pickup_address",
      "delivery_address",
      "scheduled_pickup_date",
      "scheduled_pickup_time",
      "assigned_driver",
      "service_type",
      "priority",
      "package_type",
      "status",
      "created_at"
    ],
    maxRows: 200,
    defaultOrder: { field: "scheduled_pickup_date", direction: "asc" }
  },
  get_next_pickup: {
    name: "get_next_pickup",
    description: "Return the next scheduled pickup for the authenticated business. The business_id is resolved server-side and the result is limited to the current business.",
    table: "pickup_requests",
    allowedFilters: ["window"],
    allowedColumns: [
      "id",
      "business_id",
      "tracking_number",
      "pickup_address",
      "delivery_address",
      "scheduled_pickup_date",
      "scheduled_pickup_time",
      "assigned_driver",
      "service_type",
      "priority",
      "package_type",
      "status",
      "created_at"
    ],
    maxRows: 1,
    defaultOrder: { field: "scheduled_pickup_date", direction: "asc" }
  },
  list_unscheduled_pickups: {
    name: "list_unscheduled_pickups",
    description: "Return pickup requests from the authenticated business that do not have a scheduled date/time yet. This is a read-only operational query.",
    table: "pickup_requests",
    allowedFilters: ["window"],
    allowedColumns: [
      "id",
      "business_id",
      "tracking_number",
      "pickup_address",
      "delivery_address",
      "pickup_date",
      "pickup_time",
      "scheduled_pickup_date",
      "scheduled_pickup_time",
      "assigned_driver",
      "service_type",
      "priority",
      "package_type",
      "status",
      "created_at"
    ],
    maxRows: 200,
    defaultOrder: { field: "created_at", direction: "desc" }
  }
};

const allowedToolTables = new Set(Object.values(lookupToolDefinitions).map((definition) => definition.table));

const CLIENT_PICKUP_SAFE_COLUMNS = [
  "id",
  "tracking_number",
  "pickup_address",
  "delivery_address",
  "pickup_date",
  "pickup_time",
  "scheduled_pickup_date",
  "scheduled_pickup_time",
  "service_type",
  "status"
];

const CLIENT_CONTEXT = "client";
const OWNER_EMPLOYEE_CONTEXT = "owner_employee";

const CLIENT_ADA_SYSTEM_PROMPT = `You are Ada, the customer-facing Virtual Dispatch Coordinator for Dasher Lab Medical Courier.

Your job is to help customers with Dasher Lab services, service areas, business hours, sample pricing, request a quote, request a pickup, custody and pickup requirements, recurring routes, FAQ questions, contact and dispatch information, and general customer support.

Important restrictions:
- When an authenticated client asks about a specific tracking number, use lookup_pickup.
- Do not tell the client that specific pickup lookups are unavailable.
- The lookup must be restricted to the authenticated client's business by the server.
- Do not expose internal dispatch-wide information, other customers' records, business-wide schedules, driver searches, or operational dispatch lists.
- If a customer asks about internal dispatch operations, scheduled pickup lists, unscheduled pickup lists, assigned drivers, active pickups, completed pickups, or pickup attention items, politely explain that you cannot access internal dispatch operations and direct them to contact Dasher Lab at 725-444-4358.
- If the tracking number does not exist or does not belong to the authenticated client's business, politely say that the pickup could not be found and do not reveal whether a record exists elsewhere.
- Keep answers customer-focused, professional, and brief.
- Use accurate business information from the configured Dasher Lab business context only.
- If a question is not answered by the business knowledge or the application, say so and direct the customer to request a quote or contact Dasher Lab at 725-444-4358.
- Keep responses plain text; no markdown unless the user asks for a simple list.`;

const OWNER_EMPLOYEE_ADA_SYSTEM_PROMPT = `You are Ada, the authenticated owner/employee dispatch assistant for the current business.

You may use the read-only operational tools for the authenticated business to answer operational questions about pickup scheduling, dispatch status, assigned drivers, and unscheduled work.

Business-scoped rules:
- The authenticated user's business_id is resolved server-side from the Supabase session and must never be chosen by the model or browser.
- Every operational query must be restricted to the authenticated business.
- Do not accept or rely on browser-supplied business_id values.
- Do not expose service-role credentials or any write capability.
- Keep all responses read-only and grounded in the authenticated business data.
- Use accurate labels: Requested Pickup Date, Requested Pickup Time, Scheduled Pickup Date, Scheduled Pickup Time, Assigned Driver, and Current Status.
- Do not claim an actual pickup occurred unless the database provides that information.
- If the user asks for a list or summary query such as scheduled pickups, by-driver pickups, unscheduled pickups, status groups, or next pickup, use the matching operational tool instead of asking for a tracking number.
- If the user asks for a specific pickup by tracking number, use lookup_pickup.
- Use the correct data terminology: pickup_date and pickup_time are the customer's originally requested pickup date/time. scheduled_pickup_date and scheduled_pickup_time are the actual dispatch schedule entered by the owner/employee. assigned_driver is the manually entered driver name attached to the scheduled pickup.
- Operational questions about "scheduled pickups" should use scheduled_pickup_date and scheduled_pickup_time. Questions about "requested pickups" should use pickup_date and pickup_time. Questions about assigned drivers should use assigned_driver.
- Never confuse requested pickup time with scheduled pickup time.
- Keep the tone professional and concise.`;

const CONTEXT_TOOL_ALLOWLIST = {
  [CLIENT_CONTEXT]: ["lookup_pickup", "lookup_quote", "get_business_info"],
  [OWNER_EMPLOYEE_CONTEXT]: [
    "lookup_pickup",
    "lookup_quote",
    "get_business_info",
    "list_scheduled_pickups",
    "list_pickups_by_status",
    "list_pickups_by_driver",
    "get_next_pickup",
    "list_unscheduled_pickups"
  ]
};

function resolveAdaContext(rawContext) {
  const normalized = typeof rawContext === "string" ? rawContext.trim().toLowerCase() : "";
  if (normalized === OWNER_EMPLOYEE_CONTEXT) {
    return OWNER_EMPLOYEE_CONTEXT;
  }
  return CLIENT_CONTEXT;
}

function getAllowedToolsForContext(context = CLIENT_CONTEXT) {
  const resolvedContext = resolveAdaContext(context);
  return [...new Set(CONTEXT_TOOL_ALLOWLIST[resolvedContext] || CONTEXT_TOOL_ALLOWLIST[CLIENT_CONTEXT])];
}

function getLookupPickupColumnsForContext(context = CLIENT_CONTEXT) {
  const resolvedContext = resolveAdaContext(context);
  return resolvedContext === OWNER_EMPLOYEE_CONTEXT
    ? [...lookupToolDefinitions.lookup_pickup.allowedColumns]
    : [...CLIENT_PICKUP_SAFE_COLUMNS];
}

function buildOpenAIToolDefinitionsForContext(context = CLIENT_CONTEXT) {
  const allowedNames = new Set(getAllowedToolsForContext(context));

  return Object.values(lookupToolDefinitions)
    .filter((definition) => allowedNames.has(definition.name))
    .map((definition) => {
      let required = [];

      if (definition.name === "lookup_pickup") {
        required = ["tracking_number"];
      }
      if (definition.name === "lookup_quote") {
        required = ["reference"];
      }

      return {
        type: "function",
        function: {
          name: definition.name,
          description: definition.description,
          parameters: {
            type: "object",
            properties: definition.allowedFilters.reduce((schema, filterName) => {
              schema[filterName] = { type: "string" };
              return schema;
            }, {}),
            required,
            additionalProperties: false
          }
        }
      };
    });
}

function isValidUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validateToolTableName(tableName) {
  if (typeof tableName !== "string" || !allowedToolTables.has(tableName)) {
    throw new Error(`Invalid table name "${String(tableName)}". Only read-only tool tables are allowed.`);
  }
}

const VALID_PICKUP_STATUSES = ["Awaiting Dispatch", "Active", "Completed"];
const VALID_WINDOWS = ["today", "tomorrow", "this_week", "future", "upcoming", "all"];

function formatDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveOperationalWindow(windowName = "today", baseDate = new Date()) {
  const normalized = typeof windowName === "string" ? windowName.trim().toLowerCase() : "today";
  if (!VALID_WINDOWS.includes(normalized)) {
    return null;
  }

  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + 1);

  if (normalized === "today") {
    return { start: formatDateValue(today), end: formatDateValue(today) };
  }

  if (normalized === "tomorrow") {
    return { start: formatDateValue(nextDay), end: formatDateValue(nextDay) };
  }

  if (normalized === "this_week") {
    const monday = new Date(today);
    const dayOfWeek = monday.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(monday.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: formatDateValue(monday), end: formatDateValue(sunday) };
  }

  if (normalized === "future" || normalized === "upcoming") {
    return { start: formatDateValue(today), end: null };
  }

  return { start: null, end: null };
}

function normalizeDriverName(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function validateStatusValue(value) {
  if (typeof value !== "string") {
    throw new Error("Status must be a string.");
  }
  const normalized = value.trim();
  if (!VALID_PICKUP_STATUSES.includes(normalized)) {
    throw new Error(`Invalid status "${value}". Valid statuses are: ${VALID_PICKUP_STATUSES.join(", ")}.`);
  }
  return normalized;
}

function validateWindowValue(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!VALID_WINDOWS.includes(normalized)) {
    throw new Error(`Invalid operational window "${value}". Supported windows are: ${VALID_WINDOWS.join(", ")}.`);
  }
  return normalized;
}

function buildOpenAIToolDefinitions() {
  return buildOpenAIToolDefinitionsForContext(CLIENT_CONTEXT);
}

function assertNoBusinessIdOverride(toolName, rawArgs = {}) {
  if (rawArgs && typeof rawArgs === "object" && !Array.isArray(rawArgs) && Object.prototype.hasOwnProperty.call(rawArgs, "business_id")) {
    throw new Error(`Tool "${toolName}" does not accept business_id. The authenticated user's business is used automatically for authorization.`);
  }
}

function applyAuthenticatedBusinessScope(toolName, filters = {}, authenticatedBusinessId) {
  if (!authenticatedBusinessId || !isValidUuid(String(authenticatedBusinessId))) {
    throw new Error(`Tool "${toolName}" requires an authenticated user's business_id.`);
  }
  return {
    ...filters,
    business_id: String(authenticatedBusinessId)
  };
}

function validateToolRequest(toolName, rawArgs = {}) {
  const definition = lookupToolDefinitions[toolName];
  if (!definition) {
    throw new Error(`Unknown tool "${toolName}".`);
  }

  validateToolTableName(definition.table);

  const raw = rawArgs && typeof rawArgs === "object" && !Array.isArray(rawArgs) ? rawArgs : {};
  assertNoBusinessIdOverride(toolName, raw);

  const allowedKeys = new Set(definition.allowedFilters);
  const filters = {};

  Object.keys(raw).forEach((key) => {
    if (!allowedKeys.has(key)) {
      throw new Error(`Tool "${toolName}" does not allow the field "${key}".`);
    }
  });

  if (definition.name === "lookup_pickup") {
    const trackingNumber = typeof raw.tracking_number === "string" ? raw.tracking_number.trim() : "";
    if (!trackingNumber) {
      throw new Error('Tool "lookup_pickup" requires tracking_number.');
    }
    filters.tracking_number = trackingNumber.toUpperCase();
  }

  if (definition.name === "lookup_quote") {
    const reference = typeof raw.reference === "string" ? raw.reference.trim() : "";
    if (!reference) {
      throw new Error('Tool "lookup_quote" requires reference.');
    }
    filters.reference = reference;
  }

  if (definition.name === "list_scheduled_pickups" || definition.name === "list_pickups_by_status" || definition.name === "list_pickups_by_driver" || definition.name === "get_next_pickup" || definition.name === "list_unscheduled_pickups") {
    if (Object.prototype.hasOwnProperty.call(raw, "window")) {
      filters.window = validateWindowValue(raw.window);
    }

    if (Object.prototype.hasOwnProperty.call(raw, "driver_name")) {
      const driverName = normalizeDriverName(raw.driver_name);
      if (!driverName) {
        throw new Error('Tool "' + definition.name + '" requires a non-empty driver_name when provided.');
      }
      filters.driver_name = driverName;
    }

    if (Object.prototype.hasOwnProperty.call(raw, "status")) {
      filters.status = validateStatusValue(raw.status);
    }

    if (Object.prototype.hasOwnProperty.call(raw, "start_time")) {
      const startTime = typeof raw.start_time === "string" ? raw.start_time.trim() : "";
      if (!startTime) {
        throw new Error('Tool "' + definition.name + '" requires a valid start_time when provided.');
      }
      filters.start_time = startTime;
    }

    if (Object.prototype.hasOwnProperty.call(raw, "end_time")) {
      const endTime = typeof raw.end_time === "string" ? raw.end_time.trim() : "";
      if (!endTime) {
        throw new Error('Tool "' + definition.name + '" requires a valid end_time when provided.');
      }
      filters.end_time = endTime;
    }
  }

  return {
    table: definition.table,
    filters,
    columns: definition.allowedColumns,
    maxRows: definition.maxRows,
    defaultOrder: definition.defaultOrder || null
  };
}

function applyOperationalDateFilters(query, filters = {}) {
  const windowName = filters.window || "today";
  const windowRange = resolveOperationalWindow(windowName, new Date());

  if (windowRange && (windowRange.start || windowRange.end)) {
    if (windowRange.start && windowRange.end) {
      query = query.gte("scheduled_pickup_date", windowRange.start);
      query = query.lte("scheduled_pickup_date", windowRange.end);
    }
  }

  if (filters.start_time) {
    query = query.gte("scheduled_pickup_time", String(filters.start_time));
  }

  if (filters.end_time) {
    query = query.lte("scheduled_pickup_time", String(filters.end_time));
  }

  if (filters.driver_name) {
    query = query.ilike("assigned_driver", `%${String(filters.driver_name).trim()}%`);
  }

  if (filters.status) {
    query = query.eq("status", String(filters.status));
  }

  return query;
}

module.exports = {
  lookupToolDefinitions,
  allowedToolTables,
  CLIENT_CONTEXT,
  OWNER_EMPLOYEE_CONTEXT,
  CLIENT_PICKUP_SAFE_COLUMNS,
  CLIENT_ADA_SYSTEM_PROMPT,
  OWNER_EMPLOYEE_ADA_SYSTEM_PROMPT,
  resolveAdaContext,
  getAllowedToolsForContext,
  getLookupPickupColumnsForContext,
  buildOpenAIToolDefinitionsForContext,
  isValidUuid,
  validateToolTableName,
  buildOpenAIToolDefinitions,
  assertNoBusinessIdOverride,
  applyAuthenticatedBusinessScope,
  applyOperationalDateFilters,
  resolveOperationalWindow,
  normalizeDriverName,
  validateStatusValue,
  validateWindowValue,
  validateToolRequest
};
