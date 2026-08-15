import {
  applyAuthenticatedBusinessScope,
  applyOperationalDateFilters,
  buildOpenAIToolDefinitionsForContext,
  CLIENT_ADA_SYSTEM_PROMPT,
  extractTrackingNumberFromMessage,
  getAllowedToolsForContext,
  getLookupPickupColumnsForContext,
  isClientOperationalQuery,
  OWNER_EMPLOYEE_ADA_SYSTEM_PROMPT,
  resolveAdaContext,
  validateToolRequest
} from "./tools.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

function getContextAwarePrompt(context: string | null | undefined) {
  const resolvedContext = resolveAdaContext(context);
  return resolvedContext === "owner_employee" ? OWNER_EMPLOYEE_ADA_SYSTEM_PROMPT : CLIENT_ADA_SYSTEM_PROMPT;
}

function getContextAwareTools(context: string | null | undefined) {
  const resolvedContext = resolveAdaContext(context);
  return buildOpenAIToolDefinitionsForContext(resolvedContext);
}

function formatPickupDateTime(dateValue: string | null | undefined, timeValue: string | null | undefined) {
  const dateText = typeof dateValue === "string" ? dateValue.trim() : "";
  const timeText = typeof timeValue === "string" ? timeValue.trim() : "";

  if (!dateText && !timeText) return null;

  const dateTimeInput = dateText && timeText && !dateText.includes("T")
    ? `${dateText}T${timeText}`
    : dateText.includes("T")
      ? dateText
      : dateText || timeText;

  const parsedDate = new Date(dateTimeInput);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateText || timeText || null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(parsedDate);
}

function buildClientPickupSummary(pickup: Record<string, any> | null) {
  if (!pickup) return "I couldn’t find that pickup for your account.";

  const trackingNumber = pickup.tracking_number || pickup.id || "this pickup";
  const status = pickup.status ? String(pickup.status) : null;
  const schedule = formatPickupDateTime(pickup.scheduled_pickup_date || pickup.pickup_date, pickup.scheduled_pickup_time || pickup.pickup_time);
  const pickupAddress = pickup.pickup_address || null;
  const deliveryAddress = pickup.delivery_address || null;
  const serviceType = pickup.service_type ? String(pickup.service_type) : null;
  const assignedDriver = pickup.assigned_driver ? String(pickup.assigned_driver) : null;

  const sentences: string[] = [];
  sentences.push("I found that pickup for you.");

  const statusSentence = status
    ? `${trackingNumber} is currently ${status.toLowerCase()}${schedule ? ` and is scheduled for ${schedule}` : ""}.`
    : schedule
      ? `${trackingNumber} is scheduled for ${schedule}.`
      : `${trackingNumber} is on file.`;
  sentences.push(statusSentence);

  if (pickupAddress || deliveryAddress) {
    const routeSentence = pickupAddress && deliveryAddress
      ? `The pickup is scheduled for ${pickupAddress}, with delivery to ${deliveryAddress}.`
      : pickupAddress
        ? `The pickup is scheduled for ${pickupAddress}.`
        : `The delivery is scheduled for ${deliveryAddress}.`;
    sentences.push(routeSentence);
  }

  if (serviceType) {
    const serviceSentence = serviceType.toLowerCase().includes("same") || serviceType.toLowerCase().includes("day")
      ? `This is a ${serviceType.toLowerCase()} delivery.`
      : `This is a ${serviceType.toLowerCase()} service.`;
    sentences.push(serviceSentence);
  }

  if (assignedDriver) {
    sentences.push(`The assigned driver is ${assignedDriver}.`);
  }

  sentences.push("If you'd like, I can also help you check another pickup or provide any other available details.");

  return sentences.join("\n\n");
}

// EskoDSK platform capabilities remain reusable across businesses.
// The current DasherLab persona and company information are treated as business-specific configuration.
const BUSINESS_CONFIGURATION = {
  companyName: "Dasher Lab Medical Courier",
  companyLegalName: "Dasher Lab Medical Courier, a division of Eleven10 Group LLC",
  businessDescription: "provides reliable, HIPAA-aware medical transportation services throughout Nevada",
  contactPhone: "725-444-4358",
  serviceAreas: [
    "Las Vegas",
    "Henderson",
    "North Las Vegas",
    "Boulder City",
    "Pahrump",
    "Mesquite",
    "Reno",
    "Sparks",
    "Carson City",
    "Statewide and custom long-distance routes"
  ],
  hours: {
    mondayFriday: "Monday-Friday: 6:00 AM-8:00 PM",
    saturday: "Saturday: 7:00 AM-4:00 PM",
    sunday: "Sunday: emergency and scheduled deliveries only"
  }
};

const ASSISTANT_PERSONA = {
  name: "Ada",
  title: "Virtual Dispatch Coordinator",
  company: BUSINESS_CONFIGURATION.companyName,
  tone: "professional, friendly, confident"
};

const BASE_CLIENT_ADA_SYSTEM_PROMPT = `You are ${ASSISTANT_PERSONA.name}, the customer-facing ${ASSISTANT_PERSONA.title.toLowerCase()} for ${BUSINESS_CONFIGURATION.companyName}.

Your job is to assist customers with logistics and transportation questions for ${BUSINESS_CONFIGURATION.companyName}.

You are a professional, friendly, confident virtual dispatch coordinator. Speak naturally like a knowledgeable member of the ${BUSINESS_CONFIGURATION.companyName} dispatch team. Be concise and helpful for simple questions.

Business identity:
- Name: ${ASSISTANT_PERSONA.name}
- Job title: ${ASSISTANT_PERSONA.title}
- Company: ${BUSINESS_CONFIGURATION.companyName}

Authoritative business knowledge:

${BUSINESS_CONFIGURATION.companyLegalName} ${BUSINESS_CONFIGURATION.businessDescription}.

BUSINESS HOURS
- ${BUSINESS_CONFIGURATION.hours.mondayFriday}
- ${BUSINESS_CONFIGURATION.hours.saturday}
- ${BUSINESS_CONFIGURATION.hours.sunday}

SERVICE AREAS
- ${BUSINESS_CONFIGURATION.serviceAreas.join("\n- ")}

SERVICES
- STAT medical deliveries
- Same-day deliveries
- Laboratory specimen transportation
- Blood and urine transport
- Pharmacy prescription delivery
- Medical equipment transport
- Interoffice mail
- Scheduled recurring routes

DELIVERY OPTIONS
- STAT: immediate direct pickup
- Rush: typically within about 60 minutes
- Same-day: completed before close of business
- Scheduled recurring routes

SAMPLE PRICING
- Local delivery: starting at $35
- Rush: starting at $50
- STAT: starting at $65
- Dedicated routes: custom contract pricing
- Mileage outside the standard service area: approximately $1.75-$2.50 per mile

IMPORTANT: These are sample starting prices, not guaranteed final quotes. Do not promise an exact price unless the application has calculated or provided one. When appropriate, direct the customer to request a quote.

PICKUP REQUIREMENTS
Customers should:
- Have shipments packaged and ready for pickup
- Have specimens labeled correctly
- Have all required paperwork completed before pickup

DELIVERY WINDOWS
- STAT: direct/immediate pickup and delivery
- Rush: typically within about 2 hours
- Same-day: before close of business
- Scheduled recurring routes: based on the agreed schedule

CANCELLATION POLICY
- No cancellation fee if canceled before dispatch
- Dispatch fees may apply after a driver has been assigned
- Dry-run fees may apply if a driver arrives and the shipment is not ready
- Contract recurring routes require advance notice for cancellation

TRACKING / DOCUMENTATION
Each shipment includes:
- Documented pickup time
- Documented delivery time
- Proof of delivery
- Secure chain-of-custody tracking

COMPLIANCE
Dasher Lab follows HIPAA-aware handling and safe transportation practices.

COMMON CUSTOMER QUESTIONS
Help customers with:
- Service areas
- STAT delivery availability
- Same-day delivery
- Rush delivery
- Recurring pickups/routes
- Pickup requirements
- General pricing information
- How to request a quote
- How to contact Dasher Lab

CONTACT
Phone: ${BUSINESS_CONFIGURATION.contactPhone}

Behavior rules:
- Never invent services, prices, locations, business hours, policies, delivery guarantees, medical/legal advice, or company capabilities.
- If a customer asks about a specific pickup, delivery, tracking number, scheduled pickup, or assigned driver, use the lookup_pickup tool before giving a general response. Do not default to the phone number unless the lookup tool fails or the customer does not provide enough information for a specific lookup.
- If the information is not contained in the provided business knowledge or supplied by the application, say that you do not have that information and, when appropriate, direct the customer to contact ${BUSINESS_CONFIGURATION.companyName} at ${BUSINESS_CONFIGURATION.contactPhone} or request a quote.
- Distinguish between general information, sample pricing, actual quotes, and confirmed pickup/scheduling information.
- Do not claim that a pickup, quote, driver assignment, or delivery has been completed unless the application actually provides that information.
- For medical information, only discuss transportation and logistics. Do not provide medical advice.
- Keep responses plain text only. No markdown formatting unless the user asked for a list and plain text bullets are appropriate.
- Do not mention that you are an AI model or that you are using OpenAI.

Customer-facing response expectations:
- Answer directly and clearly.
- If the question is general logistics information, give the known business answer.
- If the user asks for pricing, share sample starting pricing and clearly indicate it is a sample, not a guaranteed quote.
- If the user asks for an exact price or a confirmed delivery commitment, explain that the application must provide that information or the customer should request a quote.
- Keep your tone professional, helpful, and confident.

You are ${ASSISTANT_PERSONA.name}, the customer-facing assistant for ${BUSINESS_CONFIGURATION.companyName}.`;

const ADA_SYSTEM_PROMPT = BASE_CLIENT_ADA_SYSTEM_PROMPT;

async function getAuthenticatedBusinessContext(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    console.error("Supabase auth configuration missing for read-only lookup");
    return null;
  }

  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authHeader.replace(/^bearer\s+/i, "").trim();
  if (!token) {
    return null;
  }

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.53.0");
    const { jwtVerify, importJWK } = await import("https://esm.sh/jose@5.9.0");

    const jwtHeaderBase64 = token.split(".")[0];
    const jwtHeaderJson = JSON.parse(atob(jwtHeaderBase64.replace(/-/g, "+").replace(/_/g, "/")));
    const jwksUrl = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
    const jwksResponse = await fetch(jwksUrl, {
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json"
      }
    });

    if (!jwksResponse.ok) {
      throw new Error(`Failed to fetch JWT keys: ${jwksResponse.status}`);
    }

    const jwksPayload = await jwksResponse.json();
    const jwks = jwksPayload && Array.isArray(jwksPayload.keys) ? jwksPayload.keys : [];
    const signingKeyData = jwks.find((key: Record<string, unknown>) => key.kid === jwtHeaderJson.kid) || null;

    if (!signingKeyData) {
      throw new Error("No matching JWT signing key found for this session.");
    }

    const publicKey = await importJWK({
      kty: signingKeyData.kty,
      crv: signingKeyData.crv,
      x: signingKeyData.x,
      y: signingKeyData.y,
      kid: signingKeyData.kid,
      alg: signingKeyData.alg,
      use: signingKeyData.use
    }, signingKeyData.alg || "ES256");

    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ["ES256"],
      issuer: `${supabaseUrl}/auth/v1`
    });

    const userId = typeof payload?.sub === "string" ? payload.sub : null;
    if (!userId) {
      throw new Error("JWT is missing a valid subject claim.");
    }

    const serviceRoleClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

  const { data: userRecord, error: userError } = await serviceRoleClient
    .from("users")
    .select("business_id")
    .eq("id", userId)
    .maybeSingle();

    if (userError || !userRecord || !userRecord.business_id) {
      console.error("Authenticated user's business lookup failed", {
        userId,
        message: userError?.message || "No business association"
      });
      return null;
    }

    console.log("[avery-chat:auth-context-resolved]", {
      userId,
      businessId: userRecord.business_id
    });

    return {
      userId,
      businessId: userRecord.business_id
    };
  } catch (error) {
    console.error("Supabase JWT validation failed for read-only lookup", {
      message: error instanceof Error ? error.message : String(error),
      authHeaderPresent: !!authHeader,
      authHeaderPrefix: authHeader ? authHeader.slice(0, 20) : null
    });
    return null;
  }
}

async function runReadOnlyTool(
  toolName: string,
  rawArgs: Record<string, unknown> = {},
  authContext: { businessId: string } | null = null,
  context: string | null | undefined = "client"
) {
  const request = validateToolRequest(toolName, rawArgs);
  if (!authContext || !authContext.businessId) {
    throw new Error("The user must be signed in with a linked business before using private pickup lookups.");
  }

  const requestColumns = toolName === "lookup_pickup" && resolveAdaContext(context) === "client"
    ? getLookupPickupColumnsForContext("client")
    : request.columns;

  const scopedFilters = applyAuthenticatedBusinessScope(toolName, request.filters, authContext.businessId);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Read-only tool configuration missing for", toolName);
    throw new Error("Read-only tool configuration is missing.");
  }

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.53.0");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  let query = supabase
    .from(request.table)
    .select(requestColumns.join(","));

  Object.entries(scopedFilters).forEach(([column, value]) => {
    if (column === "window" || column === "driver_name" || column === "status" || column === "start_time" || column === "end_time") {
      return;
    }
    query = query.eq(column, String(value));
  });

  if (toolName === "list_scheduled_pickups" || toolName === "list_pickups_by_status" || toolName === "list_pickups_by_driver" || toolName === "get_next_pickup") {
    query = applyOperationalDateFilters(query, scopedFilters);
  }

  if (toolName === "list_unscheduled_pickups") {
    query = query.is("scheduled_pickup_date", null);
    if (scopedFilters.driver_name) {
      query = query.ilike("assigned_driver", `%${String(scopedFilters.driver_name).trim()}%`);
    }
    if (scopedFilters.status) {
      query = query.eq("status", String(scopedFilters.status));
    }
  }

  query = query.limit(request.maxRows);

  if (request.defaultOrder) {
    query = query.order(request.defaultOrder.field, {
      ascending: request.defaultOrder.direction !== "desc"
    });
  }

  const { data, error } = await query;

  if (error) {
    console.error("Read-only tool query failed", {
      toolName,
      table: request.table,
      filters: scopedFilters,
      message: error.message
    });
    throw new Error(error.message || "A read-only lookup failed.");
  }

  return data ?? [];
}

async function callOpenAIChat(messages: Array<Record<string, unknown>>, useTools = false, tools: Array<Record<string, unknown>> = []) {
  const effectiveTools = Array.isArray(tools) && tools.length > 0 ? tools : [];
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.7,
      max_tokens: 300,
      tools: useTools && effectiveTools.length > 0 ? effectiveTools : undefined,
      tool_choice: useTools && effectiveTools.length > 0 ? "auto" : undefined,
      messages
    })
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = responseData?.error?.message || "OpenAI request failed.";
    throw new Error(errorMessage);
  }

  return responseData;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const requestedContext = typeof body?.context === "string" ? body.context : "client";
    const resolvedContext = resolveAdaContext(requestedContext);
    const authContext = await getAuthenticatedBusinessContext(req);
    const contextAwarePrompt = getContextAwarePrompt(resolvedContext);
    const contextAwareTools = getContextAwareTools(resolvedContext);

    if (!message) {
      return new Response(
        JSON.stringify({ assistant_text: "I need a message to respond to." }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    if (resolvedContext === "owner_employee" && !authContext) {
      return new Response(
        JSON.stringify({
          assistant_text: "Please sign in to access owner and employee dispatch information."
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          assistant_text: "The AI assistant is not configured yet. Please check the OpenAI secret in Supabase."
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    if (resolvedContext === "client") {
      const trackingNumber = extractTrackingNumberFromMessage(message);
      console.log("[avery-chat:client-tracking-path]", {
        context: resolvedContext,
        userId: authContext?.userId || null,
        businessId: authContext?.businessId || null,
        trackingNumber: trackingNumber || null,
        messagePreview: message.slice(0, 120)
      });

      if (trackingNumber) {
        if (!authContext || !authContext.businessId) {
          console.log("[avery-chat:client-tracking-auth-missing]", {
            context: resolvedContext,
            userId: authContext?.userId || null,
            businessId: authContext?.businessId || null,
            trackingNumber
          });
          return new Response(
            JSON.stringify({ assistant_text: "I couldn’t verify your account for that pickup lookup." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const clientPickup = await runReadOnlyTool("lookup_pickup", { tracking_number: trackingNumber }, authContext, resolvedContext);
        const pickup = Array.isArray(clientPickup) ? clientPickup[0] : null;

        console.log("[avery-chat:client-tracking-result]", {
          context: resolvedContext,
          userId: authContext?.userId || null,
          businessId: authContext?.businessId || null,
          trackingNumber,
          found: !!pickup,
          recordCount: Array.isArray(clientPickup) ? clientPickup.length : 0
        });

        if (!pickup) {
          return new Response(
            JSON.stringify({ assistant_text: "I couldn’t find a pickup with that tracking number for your account." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            assistant_text: buildClientPickupSummary(pickup)
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (isClientOperationalQuery(message)) {
        const clientFallback = "I can help with your pickup or answer questions about Dasher Lab's services, but I don't have access to the internal dispatch schedule. Please contact Dasher Lab at 725-444-4358 for dispatch assistance.";
        return new Response(
          JSON.stringify({ assistant_text: clientFallback }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const openAIResponse = await callOpenAIChat(
      [
        { role: "system", content: contextAwarePrompt },
        { role: "user", content: message }
      ],
      contextAwareTools.length > 0,
      contextAwareTools
    );

    const assistantMessage = openAIResponse?.choices?.[0]?.message;
    const toolCalls = Array.isArray(assistantMessage?.tool_calls) ? assistantMessage.tool_calls : [];
    const allowedToolNames = new Set(getAllowedToolsForContext(resolvedContext));
    const validToolCalls = toolCalls.filter((toolCall) => {
      const toolName = typeof toolCall.function?.name === "string" ? toolCall.function.name : "";
      return allowedToolNames.has(toolName);
    });

    if (toolCalls.length > 0 && validToolCalls.length === 0) {
      const clientFallback = "I can help with your pickup or answer questions about Dasher Lab's services, but I don't have access to the internal dispatch schedule. Please contact Dasher Lab at 725-444-4358 for dispatch assistance.";
      return new Response(
        JSON.stringify({ assistant_text: clientFallback }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    if (validToolCalls.length > 0) {
      const toolResults = [];
      const toolMessagePayload = [
        { role: "system", content: contextAwarePrompt },
        { role: "user", content: message },
        {
          role: "assistant",
          tool_calls: validToolCalls.map((toolCall) => ({
            id: toolCall.id,
            type: toolCall.type,
            function: {
              name: toolCall.function?.name,
              arguments: toolCall.function?.arguments || "{}"
            }
          }))
        }
      ];

      for (const toolCall of validToolCalls) {
        try {
          const fnName = toolCall.function?.name;
          const args = JSON.parse(toolCall.function?.arguments || "{}") || {};
          const toolResult = await runReadOnlyTool(fnName, args, authContext, resolvedContext);
          toolResults.push({
            toolCallId: toolCall.id,
            toolName: fnName,
            result: toolResult
          });
          toolMessagePayload.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: fnName,
            content: JSON.stringify(toolResult)
          });
        } catch (toolError) {
          const messageText = toolError instanceof Error ? toolError.message : "The read-only lookup failed.";
          console.error("Read-only tool execution failed", {
            toolName: toolCall.function?.name,
            message: messageText
          });
          toolResults.push({
            toolCallId: toolCall.id,
            toolName: toolCall.function?.name,
            result: { error: messageText }
          });
          toolMessagePayload.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function?.name,
            content: JSON.stringify({ error: messageText })
          });
        }
      }

      const toolSummaryResponse = await callOpenAIChat(toolMessagePayload, contextAwareTools.length > 0, contextAwareTools);
      const finalAssistantMessage = toolSummaryResponse?.choices?.[0]?.message;
      const finalText = typeof finalAssistantMessage?.content === "string"
        ? finalAssistantMessage.content.trim()
        : "I checked the requested information and I’m ready to help.";

      return new Response(
        JSON.stringify({
          assistant_text: finalText,
          tool_results: toolResults
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    const assistantText =
      assistantMessage?.content?.trim() ||
      "I’m here to help. Please try again in a moment.";

    return new Response(
      JSON.stringify({ assistant_text: assistantText }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    const fallbackMessage =
      error instanceof Error && error.message
        ? error.message
        : "I’m temporarily unable to reach the AI assistant right now.";

    return new Response(
      JSON.stringify({
        assistant_text: `I’m sorry, I couldn’t reach the AI assistant right now. ${fallbackMessage}`
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});
