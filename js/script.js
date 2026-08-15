function escapeHtml(value){
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(text){
    return escapeHtml(String(text || ""))
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
}

function renderSafeMarkdown(markdownText){
    const text = String(markdownText == null ? "" : markdownText).replace(/\r\n/g, "\n");
    if (!text.trim()) {
        return "";
    }

    const blocks = text.split(/\n\s*\n+/).filter(Boolean);

    return blocks.map(function (block) {
        const trimmedBlock = block.trim();

        if (/^#{1,6}\s+/.test(trimmedBlock)) {
            const match = trimmedBlock.match(/^(#{1,6})\s+(.*)$/);
            if (match) {
                const level = Math.min(match[1].length, 6);
                const content = renderInlineMarkdown(match[2]);
                return `<h${level}>${content}</h${level}>`;
            }
        }

        const lines = trimmedBlock.split(/\n/).map(function (line) {
            return line.trim();
        }).filter(Boolean);

        if (lines.length && lines.every(function (line) {
            return /^[-*]\s+/.test(line);
        })) {
            return "<ul>" + lines.map(function (line) {
                return "<li>" + renderInlineMarkdown(line.replace(/^[-*]\s+/, "")) + "</li>";
            }).join("") + "</ul>";
        }

        if (lines.length && lines.every(function (line) {
            return /^\d+\.\s+/.test(line);
        })) {
            return "<ol>" + lines.map(function (line) {
                return "<li>" + renderInlineMarkdown(line.replace(/^\d+\.\s+/, "")) + "</li>";
            }).join("") + "</ol>";
        }

        return "<p>" + renderInlineMarkdown(trimmedBlock) + "</p>";
    }).join("");
}

function buildTypingIndicator(){
    const typing = document.createElement("div");
    typing.className = "message avery-message typing-message";
    typing.innerHTML = '<strong>Ada:</strong><div class="typing-indicator"><span class="typing-label">Ada is typing...</span><span class="typing-dots" aria-label="Ada is typing"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></span></div>';
    return typing;
}

function formatDisplayDate(dateValue){
    if (!dateValue) {
        return "Not scheduled";
    }

    const rawValue = String(dateValue).trim();
    if (!rawValue) {
        return "Not scheduled";
    }

    const safeDate = new Date(rawValue.includes("T") ? rawValue : rawValue + "T00:00:00");
    if (Number.isNaN(safeDate.getTime())) {
        return rawValue;
    }

    return safeDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

function formatDisplayTime(timeValue){
    if (!timeValue) {
        return "Not scheduled";
    }

    const rawValue = String(timeValue).trim();
    if (!rawValue) {
        return "Not scheduled";
    }

    const [hours, minutes] = rawValue.split(":");
    if (hours === undefined || minutes === undefined) {
        return rawValue;
    }

    const hourValue = Number(hours);
    const minuteValue = Number(minutes || 0);
    if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) {
        return rawValue;
    }

    const date = new Date();
    date.setHours(hourValue, minuteValue, 0, 0);
    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
    });
}

function getOwnerOperationalRecord(response){
    if (!response || !response.tool_results || !Array.isArray(response.tool_results)) {
        return null;
    }

    for (const toolResult of response.tool_results) {
        const result = toolResult && toolResult.result;
        if (!result) {
            continue;
        }

        const records = Array.isArray(result) ? result : [];
        if (records.length > 0 && (records[0].tracking_number || records[0].assigned_driver || records[0].status)) {
            return records[0];
        }
    }

    return null;
}

function renderOwnerActionButtons(record){
    if (!record || !record.tracking_number) {
        return "";
    }

    return [
        {
            label: "View Pickup",
            action: "view-pickup",
            trackingNumber: record.tracking_number
        }
    ].map(function (button) {
        const dataset = `data-action="${button.action}"` + (button.trackingNumber ? ` data-tracking-number="${escapeHtml(String(button.trackingNumber))}"` : "");
        return `<button type="button" class="owner-ada-action" ${dataset}>${escapeHtml(button.label)}</button>`;
    }).join("");
}

function appendOwnerActionSummary(response){
    const messages = document.getElementById("ownerAveryMessages");
    if (!messages) {
        return;
    }

    const toolResults = response && response.tool_results && Array.isArray(response.tool_results) ? response.tool_results : [];
    const specificLookup = toolResults.find(function (toolResult) {
        return toolResult && toolResult.toolName === "lookup_pickup";
    });

    const record = specificLookup ? getOwnerOperationalRecord({ tool_results: [specificLookup] }) : null;
    if (!record) {
        return;
    }

    const summary = document.createElement("div");
    summary.className = "owner-ada-summary-card";

    const requestDate = record.pickup_date || record.requested_pickup_date || "";
    const requestTime = record.pickup_time || record.requested_pickup_time || "";
    const scheduledDate = record.scheduled_pickup_date || "";
    const scheduledTime = record.scheduled_pickup_time || "";
    const status = record.status || "Awaiting Dispatch";
    const driver = record.assigned_driver || "Not assigned";

    summary.innerHTML = `
        <div class="owner-ada-summary-header">
            <div>
                <div class="owner-ada-summary-kicker">Pickup</div>
                <div class="owner-ada-summary-tracking">${escapeHtml(record.tracking_number || "Not available")}</div>
            </div>
        </div>
        <div class="owner-ada-summary-grid">
            <div><div class="owner-ada-summary-label">Pickup address</div><div>${escapeHtml(record.pickup_address || "Not provided")}</div></div>
            <div><div class="owner-ada-summary-label">Delivery address</div><div>${escapeHtml(record.delivery_address || "Not provided")}</div></div>
            <div><div class="owner-ada-summary-label">Customer requested</div><div>${escapeHtml(formatDisplayDate(requestDate) + (requestTime ? " at " + formatDisplayTime(requestTime) : ""))}</div></div>
            <div><div class="owner-ada-summary-label">Scheduled</div><div>${escapeHtml(formatDisplayDate(scheduledDate) + (scheduledTime ? " at " + formatDisplayTime(scheduledTime) : ""))}</div></div>
            <div><div class="owner-ada-summary-label">Driver</div><div>${escapeHtml(driver)}</div></div>
            <div><div class="owner-ada-summary-label">Status</div><div>${escapeHtml(status)}</div></div>
        </div>
        <div class="owner-ada-action-row">${renderOwnerActionButtons(record)}</div>
    `;

    messages.appendChild(summary);
    messages.scrollTop = messages.scrollHeight;

    const buttons = summary.querySelectorAll(".owner-ada-action");
    buttons.forEach(function (button) {
        button.addEventListener("click", function () {
            const action = button.getAttribute("data-action");
            const trackingNumber = button.getAttribute("data-tracking-number");

            if (action === "view-pickup" && trackingNumber) {
                const requests = Array.isArray(window.dashboardRequestsCache)
                    ? window.dashboardRequestsCache
                    : JSON.parse(localStorage.getItem("requests") || "[]");
                const match = requests.find(function (request) {
                    const tracking = request && (request.trackingId || request.tracking_number || request.quoteReference);
                    return tracking && String(tracking).toLowerCase() === String(trackingNumber).toLowerCase();
                });

                if (match && typeof openScheduleModal === "function") {
                    const index = requests.indexOf(match);
                    openScheduleModal(index);
                }
            }
        });
    });
}

function getOwnerAveryResponse(text){
    const lowerText = (text || "").toLowerCase();
    const tools = window.AveryTools;
    const analytics = window.AveryAnalytics;
    const today = tools && typeof tools.getTodaySchedule === "function"
        ? tools.getTodaySchedule()
        : (analytics && typeof analytics.getTodayOperations === "function"
            ? analytics.getTodayOperations()
            : null);
    const overview = tools && typeof tools.getBusinessOverview === "function"
        ? tools.getBusinessOverview()
        : (analytics && typeof analytics.getBusinessOverview === "function"
            ? analytics.getBusinessOverview()
            : null);
    const requests = tools && typeof tools.getRecentRequests === "function"
        ? tools.getRecentRequests(5)
        : JSON.parse(localStorage.getItem("requests") || "[]");

    if (lowerText.includes("today's schedule") || lowerText.includes("todays schedule") || lowerText.includes("schedule today") || lowerText.includes("what's today's schedule") || lowerText.includes("what is today's schedule")) {
        if (!today) {
            return (tools && typeof tools.buildNotEnoughInformationMessage === "function"
                ? tools.buildNotEnoughInformationMessage("today's schedule")
                : "I don't have enough operational data yet to summarize today's schedule.");
        }
        return `
            <strong>Today's schedule</strong><br>
            • Pickups scheduled today: ${today.pickupsScheduledToday || 0}<br>
            • Pending requests: ${today.pendingRequests || 0}<br>
            • Active deliveries: ${today.activeDeliveries || 0}
        `;
    }

    if (lowerText.includes("how is business doing") || lowerText.includes("business doing") || lowerText.includes("business health") || lowerText.includes("how is the business")) {
        if (!overview) {
            return (tools && typeof tools.buildNotEnoughInformationMessage === "function"
                ? tools.buildNotEnoughInformationMessage("business performance")
                : "I don't have enough business data yet to summarize performance.");
        }
        return `
            <strong>Business snapshot</strong><br>
            • Total pickups: ${overview.totalPickups || 0}<br>
            • Total customers: ${overview.totalCustomers || 0}<br>
            • Top customer: ${overview.topCustomer || "No activity yet"}<br>
            • Most used route: ${overview.mostUsedRoute || "No route data yet"}
        `;
    }

    if (lowerText.includes("top customers") || lowerText.includes("who are my top customers") || lowerText.includes("customer activity")) {
        if (!overview || !overview.customerCounts) {
            return "I don't have enough customer activity data yet.";
        }
        const customerEntries = Object.entries(overview.customerCounts).sort(function (a, b) {
            return b[1] - a[1];
        }).slice(0, 5);
        if (!customerEntries.length) {
            return "No customer activity has been recorded yet.";
        }
        return `
            <strong>Top customers</strong><br>
            ${customerEntries.map(function (entry) {
                return `• ${escapeHtml(entry[0])}: ${entry[1]} request${entry[1] === 1 ? "" : "s"}`;
            }).join("<br>")}
        `;
    }

    if (lowerText.includes("routes") || lowerText.includes("route") || lowerText.includes("what routes do we use most") || lowerText.includes("most used route")) {
        if (!overview || !overview.routeCounts) {
            return "I don't have enough route data yet.";
        }
        const routeEntries = Object.entries(overview.routeCounts).sort(function (a, b) {
            return b[1] - a[1];
        }).slice(0, 5);
        if (!routeEntries.length) {
            return "No route activity has been recorded yet.";
        }
        return `
            <strong>Most used routes</strong><br>
            ${routeEntries.map(function (entry) {
                return `• ${escapeHtml(entry[0])}: ${entry[1]} time${entry[1] === 1 ? "" : "s"}`;
            }).join("<br>")}
        `;
    }

    if (lowerText.includes("recent requests") || lowerText.includes("show recent requests") || lowerText.includes("latest requests")) {
        if (!requests.length) {
            return (tools && typeof tools.buildNotEnoughInformationMessage === "function"
                ? tools.buildNotEnoughInformationMessage("recent requests")
                : "There are no recent requests to display yet.");
        }
        const recentRequests = Array.isArray(requests) ? requests.slice(-5).reverse() : [];
        return `
            <strong>Recent requests</strong><br>
            ${recentRequests.map(function (request) {
                const customer = request && request.customer && (request.customer.companyName || request.customer.customerName)
                    ? request.customer.companyName || request.customer.customerName
                    : "Customer";
                const status = request && request.status ? request.status : "Pending";
                const date = request && request.createdAt ? new Date(request.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "recently";
                return `• ${escapeHtml(customer)} — ${escapeHtml(status)} — ${escapeHtml(date)}`;
            }).join("<br>")}
        `;
    }

    return AveryResponses.OWNER_HELP || "I can summarize today's schedule, business performance, top customers, route usage, and recent requests.";
}

function getOwnerAverySuggestionPrompts(){
    return [];
}

function appendOwnerAverySuggestionRow(messageElement){
    if (!messageElement) {
        return;
    }

    if (messageElement.querySelector(".owner-avery-suggestions")) {
        return;
    }

    const suggestions = document.createElement("div");
    suggestions.className = "owner-avery-suggestions";
    suggestions.innerHTML = "";

    messageElement.appendChild(suggestions);
}

function populateOwnerAveryInput(text){
    const input = document.getElementById("ownerAveryInput");
    if (!input) {
        return;
    }

    input.value = text || "";
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
}

function attachOwnerAverySuggestionHandlers(messages){
    if (!messages || messages.dataset.suggestionsBound === "true") {
        return;
    }

    messages.dataset.suggestionsBound = "true";
    messages.addEventListener("click", function (event) {
        const link = event.target.closest(".owner-avery-suggestion");
        if (!link) {
            return;
        }

        event.preventDefault();
        populateOwnerAveryInput(link.getAttribute("data-prompt") || link.textContent);
    });
}

function appendOwnerAveryMessage(role, content){
    const messages = document.getElementById("ownerAveryMessages");
    if (!messages) {
        return;
    }

    const wrapperClass = role === "user" ? "user-message" : "avery-message";
    const label = role === "user" ? "You" : "Ada";
    const message = document.createElement("div");
    message.className = `message ${wrapperClass}`;

    if (role === "avery") {
        message.innerHTML = `<strong>${escapeHtml(label)}:</strong><div class="message-body">${renderSafeMarkdown(content)}</div>`;
    } else {
        message.innerHTML = `<strong>${escapeHtml(label)}:</strong><div class="message-body">${escapeHtml(String(content || ""))}</div>`;
    }

    messages.appendChild(message);

    messages.scrollTop = messages.scrollHeight;
}

async function sendOwnerAveryMessage(){
    const input = document.getElementById("ownerAveryInput");
    const messages = document.getElementById("ownerAveryMessages");
    const button = document.getElementById("ownerAverySend");

    if (!input || !messages) {
        return;
    }

    const text = input.value.trim();
    if (!text) {
        return;
    }

    if (button) {
        button.disabled = true;
    }
    input.disabled = true;

    appendOwnerAveryMessage("user", text);
    input.value = "";

    const typing = buildTypingIndicator();
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;

    try {
        const response = await callAveryChatEdgeFunction(text, "owner_employee");
        const assistantText = response && typeof response.assistant_text === "string"
            ? response.assistant_text
            : "I’m sorry, I couldn’t process that request right now.";

        if (typing.parentNode) {
            typing.remove();
        }

        appendOwnerAveryMessage("avery", assistantText);
        appendOwnerActionSummary(response);
    } catch (error) {
        if (typing.parentNode) {
            typing.remove();
        }

        appendOwnerAveryMessage("avery", getOwnerAveryResponse(text));
    } finally {
        if (button) {
            button.disabled = false;
        }
        input.disabled = false;
        input.focus();
    }
}

function buildOwnerProactiveInsight(){
    const tools = window.AveryTools;
    const analytics = window.AveryAnalytics;
    const today = tools && typeof tools.getTodaySchedule === "function"
        ? tools.getTodaySchedule()
        : (analytics && typeof analytics.getTodayOperations === "function"
            ? analytics.getTodayOperations()
            : null);
    const overview = tools && typeof tools.getBusinessOverview === "function"
        ? tools.getBusinessOverview()
        : (analytics && typeof analytics.getBusinessOverview === "function"
            ? analytics.getBusinessOverview()
            : null);
    const requests = tools && typeof tools.getRecentRequests === "function"
        ? tools.getRecentRequests(5)
        : JSON.parse(localStorage.getItem("requests") || "[]");

    if (!today && !overview && !requests.length) {
        return (tools && typeof tools.buildNotEnoughInformationMessage === "function"
            ? tools.buildNotEnoughInformationMessage("current operations")
            : "Good morning. I’m ready to help you manage your operations. Once requests start coming in, I’ll provide insights and recommendations here.");
    }

    const conflictInsight = window.DasherLabScheduleInsights && typeof window.DasherLabScheduleInsights.getScheduleInsights === "function"
        ? window.DasherLabScheduleInsights.getScheduleInsights()
        : null;

    if (conflictInsight && conflictInsight.type === "scheduling_conflict" && conflictInsight.affectedRequests && conflictInsight.affectedRequests.length > 0) {
        return conflictInsight.message;
    }

    const pickupCount = today && typeof today.pickupsScheduledToday === "number"
        ? today.pickupsScheduledToday
        : 0;
    const pendingCount = today && typeof today.pendingRequests === "number"
        ? today.pendingRequests
        : 0;
    const topCustomer = overview && overview.topCustomer
        ? overview.topCustomer
        : "";

    if (pickupCount > 0) {
        return `Good morning. I reviewed today's operations. You have ${pickupCount} pickup${pickupCount === 1 ? "" : "s"} scheduled today. Your schedule looks consistent, and I can help you review today's requests if needed.`;
    }

    if (topCustomer) {
        return `${topCustomer} has been one of your most active customers recently. You may want to consider offering them a recurring route package.`;
    }

    if (pendingCount > 0) {
        return `You currently have ${pendingCount} request${pendingCount === 1 ? "" : "s"} waiting for review. I can help you prioritize them.`;
    }

    return "Good morning. I’m ready to help you manage your operations. Once requests start coming in, I’ll provide insights and recommendations here.";
}

function displayOwnerMessage(content){
    const messages = document.getElementById("ownerAveryMessages");
    if (!messages) {
        return;
    }

    const cleanedContent = String(content || "")
        .replace(/^Avery:\s*/i, "")
        .replace(/^Ada:\s*/i, "")
        .trim();

    const message = document.createElement("div");
    message.className = "message avery-message";
    message.innerHTML = `<strong>Ada:</strong><div>${cleanedContent}</div>`;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
}

function initOwnerAveryDashboard(){
    const input = document.getElementById("ownerAveryInput");
    const button = document.getElementById("ownerAverySend");
    const messages = document.getElementById("ownerAveryMessages");

    if (!input || !button || !messages) {
        return;
    }

    if (input.dataset.bound === "true") {
        return;
    }

    input.dataset.bound = "true";
    button.addEventListener("click", sendOwnerAveryMessage);
    input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            sendOwnerAveryMessage();
        }
    });
    attachOwnerAverySuggestionHandlers(messages);

    const existingGreeting = messages.querySelector(".message.avery-message");
    if (existingGreeting) {
        appendOwnerAverySuggestionRow(existingGreeting);
    } else {
        const initialMessage = document.createElement("div");
        initialMessage.className = "message avery-message";
        const welcomeText = String(AveryResponses.OWNER_WELCOME || "I can help with your daily operations.").replace(/^Avery:\s*/i, "").replace(/^Ada:\s*/i, "");
        initialMessage.innerHTML = `<strong>Ada:</strong><div>${welcomeText}</div>`;
        messages.appendChild(initialMessage);
        appendOwnerAverySuggestionRow(initialMessage);
    }
    messages.scrollTop = messages.scrollHeight;

    setTimeout(function () {
        const proactiveInsight = buildOwnerProactiveInsight();
        if (proactiveInsight) {
            displayOwnerMessage(proactiveInsight);
        }
    }, 250);
}

async function callAveryChatEdgeFunction(message, context = "client"){
    if (!window.supabaseClient) {
        throw new Error("Supabase client not initialized");
    }

    let authorizationHeader = "";
    try {
        const sessionResult = await window.supabaseClient.auth.getSession();
        const session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
        const accessToken = session && session.access_token ? session.access_token : "";
        if (accessToken) {
            authorizationHeader = `Bearer ${accessToken}`;
        }
    } catch (sessionError) {
        console.warn("[avery-chat] unable to read session for Authorization header", sessionError);
    }

    const { data, error } = await window.supabaseClient.functions.invoke("avery-chat", {
        body: { message, context },
        headers: authorizationHeader ? {
            Authorization: authorizationHeader,
            apikey: window.DASHERLAB_SUPABASE_CONFIG && window.DASHERLAB_SUPABASE_CONFIG.anonKey ? window.DASHERLAB_SUPABASE_CONFIG.anonKey : ""
        } : undefined
    });

    if (error) {
        throw new Error(error.message || "Edge function request failed");
    }

    return data || {};
}

async function sendMessage(){

    const input = document.getElementById("userInput");
    const messages = document.getElementById("messages");
    const sendButton = document.querySelector(".chat-box button");

    if (!input || !messages) {
        return;
    }

    const text = input.value.trim();

    if(text === ""){
        return;
    }

    if (sendButton) {
        sendButton.disabled = true;
    }
    input.disabled = true;

    if (!AveryConversation.currentIntent) {
        const intent = detectIntent(text);
        AveryConversation.setIntent(intent);
    }

    const userMessage = document.createElement("div");
    userMessage.className = "message user-message";
    userMessage.textContent = text;
    messages.appendChild(userMessage);

    input.value = "";

    const typing = buildTypingIndicator();
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;

    try {
        const intent = detectIntent(text);
        if (intent === AveryIntents.START_PICKUP) {
            const assistantMessage = document.createElement("div");
            assistantMessage.className = "message avery-message";
            assistantMessage.innerHTML = "<strong>Ada:</strong><div class=\"message-body\">I’ll open the pickup request form and pass you through to dispatch in just a moment.</div>";
            if (typing.parentNode) {
                typing.remove();
            }
            messages.appendChild(assistantMessage);
            messages.scrollTop = messages.scrollHeight;
            setTimeout(function () {
                if (typeof window.resolvePortalPath === "function") {
                    window.location.href = window.resolvePortalPath("pages/pickup.html");
                    return;
                }
                window.location.href = "pages/pickup.html";
            }, 1200);
            return;
        }

        if (intent === AveryIntents.REQUEST_QUOTE) {
            const assistantMessage = document.createElement("div");
            assistantMessage.className = "message avery-message";
            assistantMessage.innerHTML = "<strong>Ada:</strong><div class=\"message-body\">Absolutely. I’ll open the quote request form for you.</div>";
            if (typing.parentNode) {
                typing.remove();
            }
            messages.appendChild(assistantMessage);
            messages.scrollTop = messages.scrollHeight;
            setTimeout(function () {
                if (typeof window.resolvePortalPath === "function") {
                    window.location.href = window.resolvePortalPath("pages/quote.html");
                    return;
                }
                window.location.href = "pages/quote.html";
            }, 1200);
            return;
        }

        if (intent === AveryIntents.CONTACT_DISPATCH) {
            const assistantMessage = document.createElement("div");
            assistantMessage.className = "message avery-message";
            assistantMessage.innerHTML = "<strong>Ada:</strong><div class=\"message-body\">Of course. I’ll open the contact form for you.</div>";
            if (typing.parentNode) {
                typing.remove();
            }
            messages.appendChild(assistantMessage);
            messages.scrollTop = messages.scrollHeight;
            setTimeout(function () {
                if (typeof window.resolvePortalPath === "function") {
                    window.location.href = window.resolvePortalPath("pages/contact.html");
                    return;
                }
                window.location.href = "pages/contact.html";
            }, 1200);
            return;
        }

        const response = await callAveryChatEdgeFunction(text, "client");
        const assistantText = response && typeof response.assistant_text === "string"
            ? response.assistant_text
            : "I’m sorry, I couldn’t respond right now.";

        if (typing.parentNode) {
            typing.remove();
        }

        const assistantMessage = document.createElement("div");
        assistantMessage.className = "message avery-message";
        assistantMessage.innerHTML = `<strong>Ada:</strong><div class="message-body">${renderSafeMarkdown(assistantText)}</div>`;
        messages.appendChild(assistantMessage);
        messages.scrollTop = messages.scrollHeight;
    } catch (error) {
        if (typing.parentNode) {
            typing.remove();
        }

        const fallback = document.createElement("div");
        fallback.className = "message avery-message";
        fallback.innerHTML = "<strong>Ada:</strong><div class=\"message-body\">Sorry, I couldn’t reach the AI assistant right now. Please try again in a moment.</div>";
        messages.appendChild(fallback);
        messages.scrollTop = messages.scrollHeight;
    } finally {
        if (sendButton) {
            sendButton.disabled = false;
        }
        input.disabled = false;
        input.focus();
    }
}

const userInput = document.getElementById("userInput");

if (userInput) {

    userInput.addEventListener("keydown", function(event){

        if(event.key === "Enter"){

            event.preventDefault();

            sendMessage();

        }

    });

}
function toggleMenu(){

    document.getElementById("sideMenu")
    .classList.toggle("active");
}

function getRequestTitle(request){
    if(request && request.sourceType === "contact"){
        return "👤 Human Follow-Up";
    }

    if(request && request.trackingId){
        return "📦 Pickup Request";
    }

    if(request && request.type === "Quote Request"){
        return "💬 Quote Request";
    }

    if(request && request.type === "Human Follow-Up"){
        return "👤 Human Follow-Up";
    }

    return "📋 Service Request";
}

function getRequestBusiness(request){
    if(request && request.customer && request.customer.companyName){
        return request.customer.companyName;
    }
    return request && (request.businessName || request.company) ? (request.businessName || request.company) : "Individual Customer";
}

function getRequestContact(request){
    if(request && request.sourceType === "quote"){
        return "";
    }

    if(request && request.customer && request.customer.customerName){
        return request.customer.customerName;
    }
    if(request && request.name){
        return request.name;
    }
    return request && (request.contact || request.customerName) ? (request.contact || request.customerName) : "Not specified";
}

function getRequestEmail(request){
    if(request && request.customer && request.customer.email){
        return request.customer.email;
    }
    return request && request.email ? request.email : "Not provided";
}

function getRequestPhone(request){
    if(request && request.customer && request.customer.phoneNumber){
        return request.customer.phoneNumber;
    }
    return request && request.phone ? request.phone : "Not provided";
}

function getRequestService(request){
    if(request && request.sourceType === "contact"){
        return request.requestTypeLabel || "Contact Dispatch";
    }

    if(request && request.delivery && request.delivery.serviceLevel){
        return request.delivery.serviceLevel;
    }
    if(request && request.delivery && request.delivery.deliveryType){
        return request.delivery.deliveryType;
    }
    return request && request.service ? request.service : "Not specified";
}

function getRequestPriority(request){
    if(request && request.sourceType === "quote" && request.quote && request.quote.priority){
        return request.quote.priority;
    }

    if(request && request.sourceType === "contact" && request.priority){
        return request.priority;
    }

    return request && request.priority ? request.priority : ((request && request.delivery && request.delivery.serviceLevel) || "Standard");
}

function normalizeRequestStatus(status){
    if (!status) {
        return "Awaiting Dispatch";
    }

    const normalized = String(status).trim().toLowerCase();

    if (normalized === "completed" || normalized.includes("complete")) {
        return "Completed";
    }

    if (normalized === "active" || normalized.includes("active") || normalized === "accepted" || normalized === "in progress" || normalized === "assigned" || normalized === "dispatched") {
        return "Active";
    }

    return "Awaiting Dispatch";
}

function getRequestStatus(request){
    return normalizeRequestStatus(request && request.status ? request.status : "Awaiting Dispatch");
}

function getRequestStatusClass(status){
    return status === "Completed" ? "completed" : status === "Active" ? "active" : "";
}

async function updateRequestStatus(index, status){
    const cachedRequests = Array.isArray(window.dashboardRequestsCache) ? window.dashboardRequestsCache : null;
    const requests = cachedRequests || JSON.parse(localStorage.getItem("requests") || "[]");
    const targetRequest = requests[index];

    if (!targetRequest) {
        return;
    }

    if(targetRequest.sourceTable && targetRequest.sourceId && window.supabaseClient){
        const updateResult = await window.supabaseClient
            .from(targetRequest.sourceTable)
            .update({ status: status })
            .eq("id", targetRequest.sourceId);

        if(updateResult.error){
            return;
        }
    }

    targetRequest.status = status;
    window.dashboardRequestsCache = requests;
    localStorage.setItem("requests", JSON.stringify(requests));
    loadDashboard();
}

async function updateRequestStatusFromSelect(index, status){
    await updateRequestStatus(index, status);
}

function getRequestCreatedAt(request){
    if(request && request.createdAt){
        return new Date(request.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }
    return "Recently submitted";
}

function getRequestTrackingNumber(request){
    if(request && request.quoteReference){
        return request.quoteReference;
    }
    return request && request.trackingId ? request.trackingId : "Not available";
}

function getRequestPickupAddress(request){
    if(request && request.delivery && request.delivery.pickupAddress){
        return request.delivery.pickupAddress;
    }
    return request && request.pickupAddress ? request.pickupAddress : "Not provided";
}

function getRequestDeliveryAddress(request){
    if(request && request.delivery && request.delivery.deliveryAddress){
        return request.delivery.deliveryAddress;
    }
    return request && request.deliveryAddress ? request.deliveryAddress : "Not provided";
}

function getRequestNotes(request){
    if(request && request.sourceType === "contact"){
        return request.message || "No additional notes provided.";
    }

    if(request && request.delivery && request.delivery.notes){
        return request.delivery.notes;
    }
    if(request && request.description){
        return request.description;
    }
    if(request && request.message){
        return request.message;
    }
    return "No additional notes provided.";
}

function getRequestScheduleDate(request){
    if(!request){
        return "";
    }
    return request.scheduled_pickup_date || request.scheduledPickupDate || request.scheduleDate || "";
}

function getRequestScheduleTime(request){
    if(!request){
        return "";
    }
    return request.scheduled_pickup_time || request.scheduledPickupTime || request.scheduleTime || "";
}

function getRequestAssignedDriver(request){
    if(!request){
        return "";
    }
    return request.assigned_driver || request.assignedDriver || request.driverName || "";
}

function formatScheduleDateValue(value){
    if(!value){
        return "Not scheduled";
    }
    const date = new Date(value + "T00:00:00");
    if(Number.isNaN(date.getTime())){
        return String(value);
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatScheduleTimeValue(value){
    if(!value){
        return "Time TBD";
    }
    if(value.includes("T")){
        const date = new Date(value);
        if(!Number.isNaN(date.getTime())){
            return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        }
    }
    const [hours, minutes] = String(value).split(":");
    if(hours === undefined || minutes === undefined){
        return String(value);
    }
    const hourValue = Number(hours);
    const minutesValue = Number(minutes);
    const safeDate = new Date();
    safeDate.setHours(hourValue, minutesValue, 0, 0);
    return safeDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getRequestSummaryLabel(request){
    if(!request){
        return "Pickup request";
    }
    const customer = request.customer && (request.customer.companyName || request.customer.customerName)
        ? (request.customer.companyName || request.customer.customerName)
        : (request.businessName || "Pickup request");
    return customer;
}

function openScheduleModal(index){
    const requests = Array.isArray(window.dashboardRequestsCache)
        ? window.dashboardRequestsCache
        : JSON.parse(localStorage.getItem("requests") || "[]");
    const request = requests[index];
    if(!request || request.sourceType !== "pickup"){
        return;
    }

    const modal = document.getElementById("pickupScheduleModal");
    const dateField = document.getElementById("schedulePickupDate");
    const timeField = document.getElementById("schedulePickupTime");
    const driverInput = document.getElementById("schedulePickupDriver");
    const summary = document.getElementById("scheduleModalRequestSummary");

    if(!modal || !dateField || !timeField || !driverInput || !summary){
        return;
    }

    window.DasherLabDashboardSchedule = window.DasherLabDashboardSchedule || {};
    window.DasherLabDashboardSchedule.activeRequestIndex = index;

    dateField.value = getRequestScheduleDate(request) || "";
    timeField.value = getRequestScheduleTime(request) || "";
    driverInput.value = getRequestAssignedDriver(request) || "";

    const requestName = getRequestSummaryLabel(request);
    const requestAddress = request.delivery && request.delivery.pickupAddress ? request.delivery.pickupAddress : "No pickup address available";
    const requestStatus = getRequestStatus(request);
    summary.innerHTML = `<strong>${escapeHtml(requestName)}</strong><br>${escapeHtml(requestAddress)}<br><span>Status: ${escapeHtml(requestStatus)}</span>`;

    const card = document.querySelector(`.request-card[data-index="${index}"]`);
    if(card){
        card.classList.add("expanded");
    }

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
}

function closeScheduleModal(){
    const modal = document.getElementById("pickupScheduleModal");
    if(!modal){
        return;
    }
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
}

async function savePickupSchedule(event){
    event.preventDefault();

    const modal = document.getElementById("pickupScheduleModal");
    const dateField = document.getElementById("schedulePickupDate");
    const timeField = document.getElementById("schedulePickupTime");
    const driverInput = document.getElementById("schedulePickupDriver");

    if(!modal || !dateField || !timeField || !driverInput){
        return;
    }

    const requests = Array.isArray(window.dashboardRequestsCache)
        ? window.dashboardRequestsCache
        : JSON.parse(localStorage.getItem("requests") || "[]");
    const index = window.DasherLabDashboardSchedule && window.DasherLabDashboardSchedule.activeRequestIndex;
    const targetRequest = requests[index];

    if(!targetRequest || targetRequest.sourceType !== "pickup"){
        closeScheduleModal();
        return;
    }

    const nextDate = dateField.value || null;
    const nextTime = timeField.value || null;
    const nextDriver = (driverInput.value || "").trim() || null;

    if(window.supabaseClient && targetRequest.sourceTable && targetRequest.sourceId){
        const updateResult = await window.supabaseClient
            .from(targetRequest.sourceTable)
            .update({
                scheduled_pickup_date: nextDate,
                scheduled_pickup_time: nextTime,
                assigned_driver: nextDriver
            })
            .eq("id", targetRequest.sourceId);

        if(updateResult.error){
            return;
        }
    }

    targetRequest.scheduled_pickup_date = nextDate;
    targetRequest.scheduled_pickup_time = nextTime;
    targetRequest.assigned_driver = nextDriver;

    window.dashboardRequestsCache = requests;
    localStorage.setItem("requests", JSON.stringify(requests));
    closeScheduleModal();
    renderDashboardRequests(requests);
    renderPickupCalendar();
}

async function clearPickupSchedule(){
    const requests = Array.isArray(window.dashboardRequestsCache)
        ? window.dashboardRequestsCache
        : JSON.parse(localStorage.getItem("requests") || "[]");
    const index = window.DasherLabDashboardSchedule && window.DasherLabDashboardSchedule.activeRequestIndex;
    const targetRequest = requests[index];

    if(!targetRequest || targetRequest.sourceType !== "pickup"){
        return;
    }

    if(window.supabaseClient && targetRequest.sourceTable && targetRequest.sourceId){
        const updateResult = await window.supabaseClient
            .from(targetRequest.sourceTable)
            .update({
                scheduled_pickup_date: null,
                scheduled_pickup_time: null,
                assigned_driver: null
            })
            .eq("id", targetRequest.sourceId);

        if(updateResult.error){
            return;
        }
    }

    targetRequest.scheduled_pickup_date = null;
    targetRequest.scheduled_pickup_time = null;
    targetRequest.assigned_driver = null;

    window.dashboardRequestsCache = requests;
    localStorage.setItem("requests", JSON.stringify(requests));
    const dateField = document.getElementById("schedulePickupDate");
    const timeField = document.getElementById("schedulePickupTime");
    const driverInput = document.getElementById("schedulePickupDriver");
    if(dateField){ dateField.value = ""; }
    if(timeField){ timeField.value = ""; }
    if(driverInput){ driverInput.value = ""; }
    renderDashboardRequests(requests);
    renderPickupCalendar();
}

function renderPickupCalendar(){
    const calendar = document.getElementById("pickupCalendar");
    if(!calendar){
        return;
    }

    const monthLabel = document.getElementById("pickupCalendarMonthLabel");
    if(monthLabel){
        const monthDate = window.DasherLabDashboardSchedule && window.DasherLabDashboardSchedule.currentMonth
            ? new Date(window.DasherLabDashboardSchedule.currentMonth)
            : new Date();
        monthLabel.textContent = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }

    const monthDate = window.DasherLabDashboardSchedule && window.DasherLabDashboardSchedule.currentMonth
        ? new Date(window.DasherLabDashboardSchedule.currentMonth)
        : new Date();
    const month = monthDate.getMonth();
    const year = monthDate.getFullYear();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const requests = Array.isArray(window.dashboardRequestsCache) ? window.dashboardRequestsCache : JSON.parse(localStorage.getItem("requests") || "[]");

    const scheduleItems = requests.filter(function(request){
        return request && request.sourceType === "pickup" && request.scheduled_pickup_date;
    });

    const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const headerHtml = dayHeaders.map(function(day){
        return `<div class="pickup-calendar-day-header">${escapeHtml(day)}</div>`;
    }).join("");

    const cells = [];
    for(let i = 0; i < startOffset; i += 1){
        cells.push({ date: null, outsideMonth: true });
    }
    for(let day = 1; day <= totalDays; day += 1){
        cells.push({ date: new Date(year, month, day), outsideMonth: false });
    }
    while(cells.length % 7 !== 0){
        cells.push({ date: null, outsideMonth: true });
    }

    const calendarHtml = cells.map(function(cell){
        if(!cell.date){
            return '<div class="pickup-calendar-cell outside-month"></div>';
        }
        const dateIso = cell.date.toISOString().slice(0, 10);
        const items = scheduleItems.filter(function(request){
            return request.scheduled_pickup_date === dateIso;
        });
        const itemsHtml = items.map(function(request){
            const requestIndex = requests.indexOf(request);
            const driverName = getRequestAssignedDriver(request) ? `Driver: ${getRequestAssignedDriver(request)}` : "Driver: Unassigned";
            const timeText = formatScheduleTimeValue(request.scheduled_pickup_time || "");
            const customerName = getRequestSummaryLabel(request);
            const address = request.delivery && request.delivery.pickupAddress ? request.delivery.pickupAddress : "Pickup";
            return `<div class="pickup-calendar-item" data-schedule-request-index="${requestIndex}" title="${escapeHtml(customerName)}">` +
                `<strong>${escapeHtml(timeText)}</strong>` +
                `${escapeHtml(customerName)}<br>${escapeHtml(address)}<br>${escapeHtml(driverName)}` +
                `</div>`;
        }).join("");

        const isToday = new Date().toDateString() === cell.date.toDateString();
        return `<div class="pickup-calendar-cell ${cell.outsideMonth ? "outside-month" : ""} ${isToday ? "today" : ""}"><div class="pickup-calendar-date">${cell.date.getDate()}</div>${itemsHtml}</div>`;
    }).join("");

    calendar.innerHTML = headerHtml + calendarHtml;

    const scheduleItemsInCalendar = calendar.querySelectorAll(".pickup-calendar-item");
    scheduleItemsInCalendar.forEach(function(item){
        item.addEventListener("click", function(){
            const index = Number(item.getAttribute("data-schedule-request-index"));
            if(Number.isFinite(index) && index >= 0){
                openScheduleModal(index);
                const card = document.querySelector(`.request-card[data-index="${index}"]`);
                if(card){
                    card.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }
        });
    });
}

function bindCalendarDrawerEvents(){
    const toggleButton = document.getElementById("floatingCalendarToggle");
    const drawer = document.getElementById("calendarDrawer");
    const closeButton = document.getElementById("calendarDrawerClose");
    if(!toggleButton || !drawer){
        return;
    }

    if(toggleButton.dataset.bound === "true"){
        return;
    }

    toggleButton.dataset.bound = "true";

    toggleButton.addEventListener("click", function(){
        const willOpen = drawer.classList.contains("hidden");
        drawer.classList.toggle("hidden", !willOpen);
        drawer.setAttribute("aria-hidden", willOpen ? "false" : "true");
        if(willOpen){
            renderPickupCalendar();
        }
    });

    if(closeButton){
        closeButton.addEventListener("click", function(){
            drawer.classList.add("hidden");
            drawer.setAttribute("aria-hidden", "true");
        });
    }

    document.addEventListener("click", function(event){
        if(!drawer.classList.contains("hidden") && !drawer.contains(event.target) && !toggleButton.contains(event.target)){
            drawer.classList.add("hidden");
            drawer.setAttribute("aria-hidden", "true");
        }
    });
}

function attachCalendarControls(){
    const prevButton = document.getElementById("pickupCalendarPrev");
    const nextButton = document.getElementById("pickupCalendarNext");
    if(!prevButton || !nextButton){
        return;
    }

    prevButton.onclick = function(){
        window.DasherLabDashboardSchedule = window.DasherLabDashboardSchedule || {};
        const monthDate = window.DasherLabDashboardSchedule.currentMonth || new Date();
        const prevMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
        window.DasherLabDashboardSchedule.currentMonth = prevMonth;
        renderPickupCalendar();
    };

    nextButton.onclick = function(){
        window.DasherLabDashboardSchedule = window.DasherLabDashboardSchedule || {};
        const monthDate = window.DasherLabDashboardSchedule.currentMonth || new Date();
        const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
        window.DasherLabDashboardSchedule.currentMonth = nextMonth;
        renderPickupCalendar();
    };
}

function bindScheduleModalEvents(){
    const modal = document.getElementById("pickupScheduleModal");
    if(!modal || modal.dataset.bound === "true"){
        return;
    }
    modal.dataset.bound = "true";

    modal.addEventListener("click", function(event){
        const closeTarget = event.target.closest("[data-close-schedule-modal]");
        if(closeTarget){
            closeScheduleModal();
        }
    });

    const form = document.getElementById("schedulePickupForm");
    if(form){
        form.addEventListener("submit", savePickupSchedule);
    }

    const clearButton = document.getElementById("clearScheduleButton");
    if(clearButton){
        clearButton.addEventListener("click", clearPickupSchedule);
    }
}

function getRequestDetailHtml(request){
    const customerName = request && request.customer && request.customer.customerName ? request.customer.customerName : (request && request.contact ? request.contact : "Not provided");
    const businessName = getRequestBusiness(request);
    const email = getRequestEmail(request);
    const phone = getRequestPhone(request);
    const pickupAddress = getRequestPickupAddress(request);
    const deliveryAddress = getRequestDeliveryAddress(request);
    const serviceLevel = getRequestService(request);
    const shipmentType = (request && request.pickup && request.pickup.packageType) || (request && request.shipmentType) || "Not provided";
    const pickupContact = (request && request.pickup && request.pickup.pickupContact) || (request && request.pickupContact) || "Not provided";
    const pickupPhone = (request && request.pickup && request.pickup.pickupPhone) || (request && request.pickupPhone) || "Not provided";
    const deliveryContact = (request && request.pickup && request.pickup.deliveryContact) || (request && request.deliveryContact) || "Not provided";
    const deliveryPhone = (request && request.pickup && request.pickup.deliveryPhone) || (request && request.deliveryPhone) || "Not provided";
    const scheduleDate = (request && request.delivery && request.delivery.pickupDate) || (request && request.date) || "Not provided";
    const scheduleTime = (request && request.delivery && request.delivery.pickupTime) || (request && request.time) || "Not provided";
    const quoteReference = request && request.quoteReference ? request.quoteReference : "Not provided";
    const quoteMileage = request && request.quote && typeof request.quote.mileage === "number" ? request.quote.mileage + " miles" : "Not provided";
    const quotePriority = request && request.quote && request.quote.priority ? request.quote.priority : getRequestPriority(request);
    const quoteRequestedDate = request && request.quote && request.quote.requestedDate ? request.quote.requestedDate : "Not provided";

    if(request && request.sourceType === "contact"){
        const contactName = request && request.name ? request.name : customerName;
        return `
            <div class="request-details-grid">
                <div>
                    <h4>Contact Information</h4>
                    <p><strong>Name:</strong> ${escapeHtml(contactName)}</p>
                    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
                    <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
                </div>
                <div>
                    <h4>Request Details</h4>
                    <p><strong>Type:</strong> ${escapeHtml(getRequestService(request))}</p>
                    <p><strong>Priority:</strong> ${escapeHtml(getRequestPriority(request))}</p>
                    <p><strong>Status:</strong> ${escapeHtml(getRequestStatus(request))}</p>
                </div>
                <div>
                    <h4>Message</h4>
                    <p>${escapeHtml(getRequestNotes(request))}</p>
                </div>
            </div>
        `;
    }

    if(request && request.sourceType === "quote"){
        return `
            <div class="request-details-grid">
                <div>
                    <h4>Route Details</h4>
                    <p><strong>Pickup address:</strong> ${escapeHtml(pickupAddress)}</p>
                    <p><strong>Delivery address:</strong> ${escapeHtml(deliveryAddress)}</p>
                    <p><strong>Mileage:</strong> ${escapeHtml(quoteMileage)}</p>
                </div>
                <div>
                    <h4>Quote Details</h4>
                    <p><strong>Reference:</strong> ${escapeHtml(quoteReference)}</p>
                    <p><strong>Service type:</strong> ${escapeHtml(serviceLevel)}</p>
                    <p><strong>Priority:</strong> ${escapeHtml(quotePriority)}</p>
                    <p><strong>Estimated total:</strong> ${request && request.quote && request.quote.estimatedTotal ? "$" + Number(request.quote.estimatedTotal).toLocaleString() : "Pending review"}</p>
                    <p><strong>Status:</strong> ${escapeHtml(getRequestStatus(request))}</p>
                </div>
                <div>
                    <h4>Scheduling</h4>
                    <p><strong>Requested date:</strong> ${escapeHtml(quoteRequestedDate)}</p>
                    <p><strong>Submitted:</strong> ${escapeHtml(getRequestCreatedAt(request))}</p>
                    <p><strong>Notes:</strong> ${escapeHtml(getRequestNotes(request))}</p>
                </div>
            </div>
        `;
    }

    return `
        <div class="request-details-grid">
            <div>
                <h4>Customer Information</h4>
                <p><strong>Name:</strong> ${escapeHtml(customerName)}</p>
                <p><strong>Business:</strong> ${escapeHtml(businessName)}</p>
                <p><strong>Email:</strong> ${escapeHtml(email)}</p>
                <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
            </div>
            <div>
                <h4>Pickup Details</h4>
                <p><strong>Pickup address:</strong> ${escapeHtml(pickupAddress)}</p>
                <p><strong>Pickup contact:</strong> ${escapeHtml(pickupContact)}</p>
                <p><strong>Pickup phone:</strong> ${escapeHtml(pickupPhone)}</p>
            </div>
            <div>
                <h4>Delivery Details</h4>
                <p><strong>Delivery address:</strong> ${escapeHtml(deliveryAddress)}</p>
                <p><strong>Delivery contact:</strong> ${escapeHtml(deliveryContact)}</p>
                <p><strong>Delivery phone:</strong> ${escapeHtml(deliveryPhone)}</p>
            </div>
            <div>
                <h4>Service Details</h4>
                <p><strong>Delivery type:</strong> ${escapeHtml(serviceLevel)}</p>
                <p><strong>Shipment type:</strong> ${escapeHtml(shipmentType)}</p>
                <p><strong>Special instructions:</strong> ${escapeHtml(getRequestNotes(request))}</p>
            </div>
            <div>
                <h4>Scheduling</h4>
                <p><strong>Date:</strong> ${escapeHtml(scheduleDate)}</p>
                <p><strong>Time:</strong> ${escapeHtml(scheduleTime)}</p>
                <p><strong>Notes:</strong> ${escapeHtml(getRequestNotes(request))}</p>
            </div>
        </div>
    `;
}

function toggleRequestDetails(index){
    const card = document.querySelector(`.request-card[data-index="${index}"]`);
    if(!card){
        return;
    }

    card.classList.toggle("expanded");
    const button = card.querySelector(".request-toggle");
    if(button){
        button.innerText = card.classList.contains("expanded") ? "Show Less" : "Show More";
    }
}

function getActiveRequestTypeFilter(){
    const activeTab = document.querySelector('.request-type-tab.active');
    return activeTab ? activeTab.getAttribute('data-request-type') : 'pickup';
}

function getDashboardRequestFilter(){
    const activeTab = document.querySelector('.request-status-tab.active');
    return activeTab && activeTab.getAttribute('data-filter') === 'completed' ? 'completed' : 'active';
}

function getRequestTypeKey(request){
    if(!request){
        return 'pickup';
    }
    if(request.sourceType === 'quote'){
        return 'quote';
    }
    if(request.sourceType === 'contact'){
        return 'contact';
    }
    return 'pickup';
}

function getRequestDateForGrouping(request){
    if(!request){
        return '';
    }

    if(request.sourceType === 'pickup'){
        return request.delivery && request.delivery.pickupDate ? request.delivery.pickupDate : (request.pickup_date || request.pickupDate || request.createdAt || '');
    }

    if(request.sourceType === 'quote'){
        return request.quote && request.quote.requestedDate ? request.quote.requestedDate : (request.delivery && request.delivery.pickupDate ? request.delivery.pickupDate : request.createdAt || '');
    }

    return request.createdAt || '';
}

function getRequestTimeForGrouping(request){
    if(!request){
        return '';
    }

    if(request.sourceType === 'pickup'){
        return request.delivery && request.delivery.pickupTime ? request.delivery.pickupTime : (request.pickup_time || request.pickupTime || '');
    }

    return '';
}

function timeToMinutes(value){
    if(!value){
        return 86400;
    }

    const raw = String(value).trim();
    const ampmMatch = raw.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if(ampmMatch){
        let hour = Number(ampmMatch[1]);
        const minute = Number(ampmMatch[2]);
        const meridian = ampmMatch[3].toUpperCase();
        if(meridian === 'AM' && hour === 12){ hour = 0; }
        if(meridian === 'PM' && hour < 12){ hour += 12; }
        return hour * 60 + minute;
    }

    const match = raw.match(/(\d{1,2}):(\d{2})/);
    if(match){
        return Number(match[1]) * 60 + Number(match[2]);
    }

    return 86400;
}

function buildRequestGroups(requests){
    const monthMap = new Map();
    const noDate = [];

    requests.forEach(function(request){
        const dateValue = getRequestDateForGrouping(request);
        if(!dateValue){
            noDate.push(request);
            return;
        }

        const parsedDate = new Date(dateValue.includes('T') ? dateValue : dateValue + 'T00:00:00');
        if(Number.isNaN(parsedDate.getTime())){
            noDate.push(request);
            return;
        }

        const monthKey = parsedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const dayKey = parsedDate.toISOString().slice(0, 10);

        if(!monthMap.has(monthKey)){
            monthMap.set(monthKey, { key: monthKey, sort: new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1).getTime(), days: new Map() });
        }

        const monthEntry = monthMap.get(monthKey);
        if(!monthEntry.days.has(dayKey)){
            monthEntry.days.set(dayKey, { key: dayKey, sort: parsedDate.getTime(), items: [] });
        }

        monthEntry.days.get(dayKey).items.push(request);
    });

    const monthEntries = Array.from(monthMap.values()).sort(function(left, right){
        return left.sort - right.sort;
    }).map(function(monthEntry){
        const days = Array.from(monthEntry.days.values()).sort(function(left, right){
            return left.sort - right.sort;
        }).map(function(dayEntry){
            dayEntry.items.sort(function(left, right){
                const leftTime = timeToMinutes(getRequestTimeForGrouping(left));
                const rightTime = timeToMinutes(getRequestTimeForGrouping(right));
                return leftTime - rightTime;
            });
            return dayEntry;
        });
        return { ...monthEntry, days };
    });

    return { monthEntries, noDate };
}

function renderDashboardRequests(requests){
    const requestList = document.getElementById("requestList");
    if(!requestList){
        return;
    }

    const filter = getDashboardRequestFilter();
    const requestTypeFilter = getActiveRequestTypeFilter();
    const visibleRequests = requests.filter(function (request) {
        const status = getRequestStatus(request);
        const typeMatch = requestTypeFilter === 'all' || getRequestTypeKey(request) === requestTypeFilter;
        if (filter === 'completed') {
            return typeMatch && status === 'Completed';
        }
        return typeMatch && status !== 'Completed';
    });

    if(visibleRequests.length === 0){
        requestList.innerHTML = `
            <div class="empty-state">
                <h3>No ${requestTypeFilter === 'pickup' ? 'pickup' : requestTypeFilter === 'quote' ? 'quote' : 'contact'} ${filter === 'completed' ? 'completed' : 'active or pending'} requests yet</h3>
                <p>${filter === 'completed' ? 'Completed requests will appear here once they are marked complete.' : 'Active and pending requests will appear here as they come in.'}</p>
            </div>
        `;
        return;
    }

    const groups = buildRequestGroups(visibleRequests);
    const currentMonthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const currentDayKey = new Date().toISOString().slice(0, 10);

    const monthHtml = groups.monthEntries.map(function(monthEntry, monthIndex){
        const thisMonthExpanded = monthIndex === 0 || monthEntry.key === currentMonthLabel;
        const dayHtml = monthEntry.days.map(function(dayEntry, dayIndex){
            const thisDayExpanded = dayIndex === 0 || dayEntry.key === currentDayKey;
            const dayItems = dayEntry.items.map(function(request){
                const originalIndex = requests.indexOf(request);
                const status = getRequestStatus(request);
                const statusClass = getRequestStatusClass(status);
                const trackingId = getRequestTrackingNumber(request);
                const quoteSummary = request && request.quote ? `
                    <div class="quote-summary">
                        <p><strong>Reference:</strong> ${escapeHtml(request.quoteReference || "Not provided")}</p>
                        <p><strong>Estimated total:</strong> ${request.quote.estimatedTotal ? "$" + request.quote.estimatedTotal.toLocaleString() : "Pending review"}</p>
                        <p><strong>Priority:</strong> ${escapeHtml(request.quote.priority || getRequestPriority(request))}</p>
                        <p><strong>Requested date:</strong> ${escapeHtml(request.quote.requestedDate || "Not provided")}</p>
                    </div>
                ` : "";

                const requestMetaHtml = request && request.sourceType === "quote"
                    ? `
                        <div class="request-meta">
                            <div><strong>Created</strong><br>${escapeHtml(getRequestCreatedAt(request))}</div>
                            <div><strong>Service</strong><br>${escapeHtml(getRequestService(request))}</div>
                        </div>
                    `
                    : `
                        <div class="request-meta">
                            <div><strong>Created</strong><br>${escapeHtml(getRequestCreatedAt(request))}</div>
                            <div><strong>Contact</strong><br>${escapeHtml(getRequestContact(request))}</div>
                        </div>
                    `;

                const scheduleSummary = request && request.sourceType === "pickup" && (getRequestScheduleDate(request) || getRequestScheduleTime(request) || getRequestAssignedDriver(request))
                    ? `<div class="quote-summary"><p><strong>Scheduled:</strong> ${escapeHtml(formatScheduleDateValue(getRequestScheduleDate(request)))} ${getRequestScheduleTime(request) ? "at " + escapeHtml(formatScheduleTimeValue(getRequestScheduleTime(request))) : ""}</p><p><strong>Driver:</strong> ${escapeHtml(getRequestAssignedDriver(request) || "Unassigned")}</p></div>`
                    : "";

                return `
                    <article class="request-card" data-index="${originalIndex}">
                        <div class="request-card-header">
                            <div>
                                <h3>${escapeHtml(getRequestTitle(request))}</h3>
                                <p class="request-subtitle">${escapeHtml(getRequestService(request))}</p>
                            </div>
                            <span class="status-pill ${statusClass}">${escapeHtml(status)}</span>
                        </div>

                        <div class="request-status-row">
                            <label class="request-status-label" for="requestStatus-${originalIndex}">Status</label>
                            <select class="request-status-select ${statusClass}" id="requestStatus-${originalIndex}" onchange="updateRequestStatusFromSelect(${originalIndex}, this.value)">
                                <option value="Awaiting Dispatch" ${status === "Awaiting Dispatch" ? "selected" : ""}>Awaiting Dispatch</option>
                                <option value="Active" ${status === "Active" ? "selected" : ""}>Active</option>
                                <option value="Completed" ${status === "Completed" ? "selected" : ""}>Completed</option>
                            </select>
                        </div>

                        <div class="request-tracking">Tracking Number<br><strong>${escapeHtml(trackingId)}</strong></div>

                        ${requestMetaHtml}

                        ${quoteSummary}
                        ${scheduleSummary}

                        <div class="request-actions">
                            <a class="request-link" href="pages/tracking-status.html">Track Request</a>
                            ${request && request.sourceType === "pickup" ? `<button type="button" class="schedule-pickup-button" onclick="openScheduleModal(${originalIndex})">${getRequestScheduleDate(request) || getRequestScheduleTime(request) ? "Edit Schedule" : "Schedule Pickup"}</button>` : ""}
                            <button type="button" class="request-toggle" onclick="toggleRequestDetails(${originalIndex})">Show More</button>
                        </div>

                        <div class="request-details">
                            ${getRequestDetailHtml(request)}
                        </div>
                    </article>
                `;
            }).join('');

            return `
                <div class="date-group day-group ${thisDayExpanded ? 'expanded' : ''}" data-group-type="day" data-group-key="${dayEntry.key}">
                    <button type="button" class="date-group-toggle" data-group-target="day-${dayEntry.key}">
                        <span>${new Date(dayEntry.key + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span class="date-group-count">${dayEntry.items.length}</span>
                    </button>
                    <div class="date-group-body">
                        ${dayItems}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="date-group month-group ${thisMonthExpanded ? 'expanded' : ''}" data-group-type="month" data-group-key="${monthEntry.key}">
                <button type="button" class="date-group-toggle" data-group-target="month-${monthEntry.key}">
                    <span>${monthEntry.key}</span>
                    <span class="date-group-count">${monthEntry.days.reduce(function(total, dayEntry){ return total + dayEntry.items.length; }, 0)}</span>
                </button>
                <div class="date-group-body">
                    ${dayHtml}
                </div>
            </div>
        `;
    }).join('');

    const noDateHtml = groups.noDate.length ? `
        <div class="date-group month-group expanded" data-group-type="no-date" data-group-key="no-date">
            <button type="button" class="date-group-toggle" data-group-target="no-date">
                <span>No Date</span>
                <span class="date-group-count">${groups.noDate.length}</span>
            </button>
            <div class="date-group-body">
                ${groups.noDate.map(function(request){
                    const originalIndex = requests.indexOf(request);
                    const status = getRequestStatus(request);
                    const statusClass = getRequestStatusClass(status);
                    const trackingId = getRequestTrackingNumber(request);
                    const quoteSummary = request && request.quote ? `
                        <div class="quote-summary">
                            <p><strong>Reference:</strong> ${escapeHtml(request.quoteReference || "Not provided")}</p>
                            <p><strong>Estimated total:</strong> ${request.quote.estimatedTotal ? "$" + request.quote.estimatedTotal.toLocaleString() : "Pending review"}</p>
                            <p><strong>Priority:</strong> ${escapeHtml(request.quote.priority || getRequestPriority(request))}</p>
                            <p><strong>Requested date:</strong> ${escapeHtml(request.quote.requestedDate || "Not provided")}</p>
                        </div>
                    ` : "";

                    const requestMetaHtml = request && request.sourceType === "quote"
                        ? `
                            <div class="request-meta">
                                <div><strong>Created</strong><br>${escapeHtml(getRequestCreatedAt(request))}</div>
                                <div><strong>Service</strong><br>${escapeHtml(getRequestService(request))}</div>
                            </div>
                        `
                        : `
                            <div class="request-meta">
                                <div><strong>Created</strong><br>${escapeHtml(getRequestCreatedAt(request))}</div>
                                <div><strong>Contact</strong><br>${escapeHtml(getRequestContact(request))}</div>
                            </div>
                        `;

                    const scheduleSummary = request && request.sourceType === "pickup" && (getRequestScheduleDate(request) || getRequestScheduleTime(request) || getRequestAssignedDriver(request))
                        ? `<div class="quote-summary"><p><strong>Scheduled:</strong> ${escapeHtml(formatScheduleDateValue(getRequestScheduleDate(request)))} ${getRequestScheduleTime(request) ? "at " + escapeHtml(formatScheduleTimeValue(getRequestScheduleTime(request))) : ""}</p><p><strong>Driver:</strong> ${escapeHtml(getRequestAssignedDriver(request) || "Unassigned")}</p></div>`
                        : "";

                    return `
                        <article class="request-card" data-index="${originalIndex}">
                            <div class="request-card-header">
                                <div>
                                    <h3>${escapeHtml(getRequestTitle(request))}</h3>
                                    <p class="request-subtitle">${escapeHtml(getRequestService(request))}</p>
                                </div>
                                <span class="status-pill ${statusClass}">${escapeHtml(status)}</span>
                            </div>

                            <div class="request-status-row">
                                <label class="request-status-label" for="requestStatus-${originalIndex}">Status</label>
                                <select class="request-status-select ${statusClass}" id="requestStatus-${originalIndex}" onchange="updateRequestStatusFromSelect(${originalIndex}, this.value)">
                                    <option value="Awaiting Dispatch" ${status === "Awaiting Dispatch" ? "selected" : ""}>Awaiting Dispatch</option>
                                    <option value="Active" ${status === "Active" ? "selected" : ""}>Active</option>
                                    <option value="Completed" ${status === "Completed" ? "selected" : ""}>Completed</option>
                                </select>
                            </div>

                            <div class="request-tracking">Tracking Number<br><strong>${escapeHtml(trackingId)}</strong></div>

                            ${requestMetaHtml}

                            ${quoteSummary}
                            ${scheduleSummary}

                            <div class="request-actions">
                                <a class="request-link" href="pages/tracking-status.html">Track Request</a>
                                ${request && request.sourceType === "pickup" ? `<button type="button" class="schedule-pickup-button" onclick="openScheduleModal(${originalIndex})">${getRequestScheduleDate(request) || getRequestScheduleTime(request) ? "Edit Schedule" : "Schedule Pickup"}</button>` : ""}
                                <button type="button" class="request-toggle" onclick="toggleRequestDetails(${originalIndex})">Show More</button>
                            </div>

                            <div class="request-details">
                                ${getRequestDetailHtml(request)}
                            </div>
                        </article>
                    `;
                }).join('')}
            </div>
        </div>
    ` : '';

    requestList.innerHTML = `${monthHtml}${noDateHtml}`;

    document.querySelectorAll('.date-group-toggle').forEach(function(button){
        button.addEventListener('click', function(){
            const parent = button.closest('.date-group');
            if(parent){
                parent.classList.toggle('expanded');
            }
        });
    });
}

function attachRequestFilterHandlers(){
    document.querySelectorAll('.request-status-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.request-status-tab').forEach(function (item) {
                item.classList.remove('active');
                item.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            const requests = Array.isArray(window.dashboardRequestsCache)
                ? window.dashboardRequestsCache
                : JSON.parse(localStorage.getItem("requests") || "[]");
            renderDashboardRequests(requests);
        });
    });

    document.querySelectorAll('.request-type-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.request-type-tab').forEach(function (item) {
                item.classList.remove('active');
                item.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            const requests = Array.isArray(window.dashboardRequestsCache)
                ? window.dashboardRequestsCache
                : JSON.parse(localStorage.getItem("requests") || "[]");
            renderDashboardRequests(requests);
        });
    });
}

async function getOwnerDashboardBusinessId(){
    if(!window.supabaseClient || !window.supabaseClient.auth){
        return null;
    }

    const sessionResult = await window.supabaseClient.auth.getSession();
    const session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
    if(!session || !session.user || !session.user.id){
        return null;
    }

    const userResult = await window.supabaseClient
        .from("users")
        .select("business_id")
        .eq("id", session.user.id)
        .maybeSingle();

    if(userResult.error || !userResult.data || !userResult.data.business_id){
        return null;
    }

    return userResult.data.business_id;
}

function mapSupabaseQuoteToDashboardRequest(quote){
    return {
        sourceType: "quote",
        sourceTable: "quotes",
        sourceId: quote.id,
        type: "Quote Request",
        status: quote.status || "Awaiting Review",
        createdAt: quote.created_at || new Date().toISOString(),
        quoteId: quote.id,
        quoteReference: quote.reference || "",
        customer: {
            customerName: quote.customer_name || "Not provided",
            companyName: quote.company_name || "Not provided",
            email: quote.customer_email || "Not provided",
            phoneNumber: quote.customer_phone || "Not provided"
        },
        delivery: {
            pickupAddress: quote.pickup_address || "Not provided",
            deliveryAddress: quote.delivery_address || "Not provided",
            serviceLevel: quote.service_type || "Not specified",
            mileage: typeof quote.mileage === "number" ? quote.mileage : null,
            notes: quote.notes || "",
            pickupDate: quote.requested_date || ""
        },
        service: quote.service_type || "Not specified",
        priority: quote.priority || "Standard",
        quote: {
            estimatedTotal: typeof quote.estimated_total === "number" ? quote.estimated_total : null,
            mileage: typeof quote.mileage === "number" ? quote.mileage : null,
            priority: quote.priority || "Standard",
            requestedDate: quote.requested_date || "Not provided",
            timeline: "Pending review"
        }
    };
}

function mapSupabasePickupToDashboardRequest(pickup){
    return {
        sourceType: "pickup",
        sourceTable: "pickup_requests",
        sourceId: pickup.id,
        trackingId: pickup.tracking_number || "",
        type: "Pickup Request",
        status: pickup.status || "Awaiting Dispatch",
        createdAt: pickup.created_at || new Date().toISOString(),
        scheduled_pickup_date: pickup.scheduled_pickup_date || null,
        scheduled_pickup_time: pickup.scheduled_pickup_time || null,
        assigned_driver: pickup.assigned_driver || null,
        customer: {
            customerName: pickup.customer_name || "Not provided",
            companyName: pickup.business_name || "Not provided",
            email: pickup.email || "Not provided",
            phoneNumber: pickup.phone || "Not provided"
        },
        pickup: {
            packageType: pickup.package_type || "Not provided",
            pickupFacility: pickup.pickup_facility || "Not provided",
            pickupContact: pickup.pickup_contact || "Not provided",
            pickupPhone: pickup.pickup_phone || "Not provided",
            deliveryFacility: pickup.delivery_facility || "Not provided",
            deliveryContact: pickup.delivery_contact || "Not provided",
            deliveryPhone: pickup.delivery_phone || "Not provided"
        },
        delivery: {
            pickupAddress: pickup.pickup_address || "Not provided",
            deliveryAddress: pickup.delivery_address || "Not provided",
            serviceLevel: pickup.service_type || "Not specified",
            deliveryType: pickup.priority || pickup.service_type || "Standard",
            pickupDate: pickup.pickup_date || "",
            pickupTime: pickup.pickup_time || "",
            notes: pickup.notes || ""
        },
        service: pickup.service_type || "Not specified",
        priority: pickup.priority || "Standard"
    };
}

function mapSupabaseContactToDashboardRequest(contact){
    const requestType = contact.request_type || "contact_dispatch";
    const requestTypeLabel = requestType === "emergency_dispatch"
        ? "Emergency Dispatch"
        : requestType === "general_contact"
            ? "General Contact"
            : "Contact Dispatch";

    return {
        sourceType: "contact",
        sourceTable: "contact_requests",
        sourceId: contact.id,
        type: "Human Follow-Up",
        requestTypeLabel: requestTypeLabel,
        name: contact.name || "Not provided",
        email: contact.email || "Not provided",
        phone: contact.phone || "Not provided",
        message: contact.message || "",
        priority: contact.priority || "Standard",
        status: contact.status || "Needs Review",
        createdAt: contact.created_at || new Date().toISOString()
    };
}

async function fetchSupabaseDashboardRequests(){
    const businessId = await getOwnerDashboardBusinessId();
    if(!businessId){
        return null;
    }

    const [pickupResult, quoteResult, contactResult] = await Promise.all([
        window.supabaseClient
            .from("pickup_requests")
            .select("id, tracking_number, customer_name, business_name, email, phone, pickup_facility, pickup_address, pickup_contact, pickup_phone, delivery_facility, delivery_address, delivery_contact, delivery_phone, pickup_date, pickup_time, scheduled_pickup_date, scheduled_pickup_time, assigned_driver, service_type, priority, package_type, notes, status, created_at")
            .eq("business_id", businessId)
            .order("created_at", { ascending: false })
            .limit(150),
        window.supabaseClient
            .from("quotes")
            .select("id, reference, pickup_address, delivery_address, service_type, mileage, priority, estimated_total, requested_date, notes, status, created_at")
            .eq("business_id", businessId)
            .order("created_at", { ascending: false })
            .limit(150),
        window.supabaseClient
            .from("contact_requests")
            .select("id, name, phone, email, message, request_type, priority, status, created_at")
            .eq("business_id", businessId)
            .order("created_at", { ascending: false })
            .limit(150)
    ]);

    if(pickupResult.error || quoteResult.error || contactResult.error){
        return null;
    }

    const pickupRequests = (pickupResult.data || []).map(mapSupabasePickupToDashboardRequest);
    const quoteRequests = (quoteResult.data || []).map(mapSupabaseQuoteToDashboardRequest);
    const contactRequests = (contactResult.data || []).map(mapSupabaseContactToDashboardRequest);

    return pickupRequests
        .concat(quoteRequests)
        .concat(contactRequests)
        .sort(function(left, right){
            return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
        });
}

async function loadDashboard(){
    initOwnerAveryDashboard();

    let requests = [];
    const supabaseRequests = await fetchSupabaseDashboardRequests();
    if(Array.isArray(supabaseRequests)){
        requests = supabaseRequests;
    } else {
        requests = JSON.parse(localStorage.getItem("requests") || "[]");
    }

    window.dashboardRequestsCache = requests;
    localStorage.setItem("requests", JSON.stringify(requests));
    const requestList = document.getElementById("requestList");

    if(!requestList){
        return;
    }

    attachRequestFilterHandlers();
    bindScheduleModalEvents();
    bindCalendarDrawerEvents();
    window.DasherLabDashboardSchedule = window.DasherLabDashboardSchedule || {};
    if(!window.DasherLabDashboardSchedule.currentMonth){
        window.DasherLabDashboardSchedule.currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    }
    attachCalendarControls();

    if(requests.length === 0){
        requestList.innerHTML = `
            <div class="empty-state">
                <h3>No requests yet</h3>
                <p>Submit a pickup request or request a quote to see your activity here.</p>
            </div>
        `;
        updateOverview([]);
        renderDashboardAnalytics();
        return;
    }

    renderDashboardRequests(requests);
    renderPickupCalendar();
    updateOverview(requests);
    renderDashboardAnalytics();
}

function updateOverview(requests){
    let pending = 0;
    let inProgress = 0;
    let activeTasks = 0;
    let completed = 0;

    requests.forEach(request => {
        const status = getRequestStatus(request);

        if(["Pending", "Pending Review", "Awaiting Dispatch", "Awaiting Review"].includes(status)){
            pending++;
        }

        if(["Accepted", "In Progress", "Assigned", "Dispatched", "Active"].includes(status)){
            inProgress++;
            activeTasks++;
        }

        if(status === "Completed"){
            completed++;
        }
    });

    const pendingCount = document.getElementById("pendingCount");
    const acceptedCount = document.getElementById("acceptedCount");
    const assignedCount = document.getElementById("assignedCount");
    const completedCount = document.getElementById("completedCount");

    if(pendingCount){ pendingCount.innerText = pending; }
    if(acceptedCount){ acceptedCount.innerText = inProgress; }
    if(assignedCount){ assignedCount.innerText = activeTasks; }
    if(completedCount){ completedCount.innerText = completed; }
}

function renderDashboardAnalytics(){
    const analytics = window.AveryAnalytics && typeof window.AveryAnalytics.getTodayOperations === "function"
        ? window.AveryAnalytics.getTodayOperations()
        : null;
    const overview = window.AveryAnalytics && typeof window.AveryAnalytics.getBusinessOverview === "function"
        ? window.AveryAnalytics.getBusinessOverview()
        : null;
    const insights = window.AveryAnalytics && typeof window.AveryAnalytics.getAveryInsights === "function"
        ? window.AveryAnalytics.getAveryInsights()
        : [];

    if(analytics){
        const pickups = document.getElementById("todayPickupsCount");
        const pending = document.getElementById("todayPendingCount");
        const active = document.getElementById("todayActiveCount");
        const completed = document.getElementById("todayCompletedCount");

        if(pickups){ pickups.innerText = analytics.pickupsScheduledToday || 0; }
        if(pending){ pending.innerText = analytics.pendingRequests || 0; }
        if(active){ active.innerText = analytics.activeDeliveries || 0; }
        if(completed){ completed.innerText = analytics.completedDeliveries || 0; }
    }

    if(overview){
        const totalPickups = document.getElementById("analyticsTotalPickups");
        const totalCustomers = document.getElementById("analyticsTotalCustomers");
        const topCustomer = document.getElementById("analyticsTopCustomer");
        const mostUsedRoute = document.getElementById("analyticsMostUsedRoute");
        const revenue = document.getElementById("analyticsEstimatedRevenue");

        if(totalPickups){ totalPickups.innerText = overview.totalPickups || 0; }
        if(totalCustomers){ totalCustomers.innerText = overview.totalCustomers || 0; }
        if(topCustomer){ topCustomer.innerText = overview.topCustomer || "—"; }
        if(mostUsedRoute){ mostUsedRoute.innerText = overview.mostUsedRoute || "—"; }
        if(revenue){ revenue.innerText = overview.estimatedRevenue ? "$" + overview.estimatedRevenue.toLocaleString() : "$0"; }
    }

    const insightsList = document.getElementById("averyInsightsList");
    if(insightsList){
        if(insights && insights.length){
            insightsList.innerHTML = insights.map(function(insight){
                return `<div class="activity-item"><span>✨</span><p>${insight}</p></div>`;
            }).join("");
        } else {
            insightsList.innerHTML = '<p>Continue processing requests and Avery will learn your business patterns.</p>';
        }
    }
}

function acceptRequest(id){

    let requests =
    JSON.parse(localStorage.getItem("pickupRequests")) || [];

    requests = requests.map(request => {

        if(request.id === id){

            request.status = "Accepted";

        }

        return request;

    });

    localStorage.setItem(
        "pickupRequests",
        JSON.stringify(requests)
    );

    loadDashboard();

}

function assignDriver(id){

    let requests =
    JSON.parse(localStorage.getItem("pickupRequests")) || [];


    requests = requests.map(request => {


        if(request.id === id){

            request.status = "Assigned";

            request.driver = "Driver Pending";

        }


        return request;


    });


    localStorage.setItem(
        "pickupRequests",
        JSON.stringify(requests)
    );


    loadDashboard();

}
