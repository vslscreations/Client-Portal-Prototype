function escapeHtml(value){
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
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
    return [
        { label: "Today's schedule", prompt: "What's today's schedule?" },
        { label: "Business health", prompt: "How is business doing?" },
        { label: "Recent requests", prompt: "Show recent requests" }
    ];
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
    suggestions.innerHTML = getOwnerAverySuggestionPrompts().map(function (item) {
        return `<a href="#" class="owner-avery-suggestion" data-prompt="${escapeHtml(item.prompt)}">${escapeHtml(item.label)}</a>`;
    }).join("");

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
    const label = role === "user" ? "You" : "Avery";
    const message = document.createElement("div");
    message.className = `message ${wrapperClass}`;
    message.innerHTML = `<strong>${escapeHtml(label)}:</strong><div>${content}</div>`;
    messages.appendChild(message);

    if (role === "avery") {
        appendOwnerAverySuggestionRow(message);
    }

    messages.scrollTop = messages.scrollHeight;
}

function sendOwnerAveryMessage(){
    const input = document.getElementById("ownerAveryInput");
    const messages = document.getElementById("ownerAveryMessages");

    if (!input || !messages) {
        return;
    }

    const text = input.value.trim();
    if (!text) {
        return;
    }

    appendOwnerAveryMessage("user", escapeHtml(text));
    input.value = "";

    const typing = document.createElement("div");
    typing.className = "message avery-message owner-avery-typing";
    typing.innerHTML = "<strong>Avery:</strong><div>is typing…</div>";
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;

    setTimeout(function () {
        if (typing.parentNode) {
            typing.remove();
        }
        appendOwnerAveryMessage("avery", getOwnerAveryResponse(text));
    }, 700);
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

    const message = document.createElement("div");
    message.className = "message avery-message";
    message.innerHTML = `<strong>Avery:</strong><div>${content}</div>`;
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
        initialMessage.innerHTML = `<strong>Avery:</strong><div>${AveryResponses.OWNER_WELCOME || "I can help with your daily operations."}</div>`;
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

function sendMessage(){

    const input = document.getElementById("userInput");

    const messages = document.getElementById("messages");


    let text = input.value;


    if(text.trim() === ""){
        return;
    }
// Avery Intelligence Layer

if (!AveryConversation.currentIntent) {
    const intent = detectIntent(text);
    AveryConversation.setIntent(intent);
}

    messages.innerHTML += `

    <div class="message user-message">

        ${text}

    </div>

    `;


    input.value = "";


// Show typing indicator

messages.innerHTML += `

<div class="message avery-message typing">

<strong>Avery:</strong>

<span>is typing</span>

</div>

`;


messages.scrollTop = messages.scrollHeight;



setTimeout(()=>{

    let response = "";

    let lowerText = text.toLowerCase();

    let intent = detectIntent(text);

    const isWorkflowStartMessage = lowerText.includes("appointment") ||
        lowerText.includes("schedule") ||
        lowerText.includes("book") ||
        lowerText.includes("meeting") ||
        lowerText.includes("pickup") ||
        lowerText.includes("package") ||
        lowerText.includes("courier");

if(
    AveryConversation.currentIntent === "START_PICKUP" &&
    AveryConversation.currentStep >= 1 &&
    !isWorkflowStartMessage
){

    response = AveryWorkflowEngine.handleResponse(text);

    if (AveryConversation.currentIntent === "START_PICKUP" && AveryConversation.currentStep === 4) {
        setTimeout(() => {
            AveryActions.openPickup();
        }, 150);
    }

}
else if (isWorkflowStartMessage){

response = AveryWorkflowEngine.start("START_PICKUP");
}
    else if(lowerText.includes("quote")
    || lowerText.includes("price")
    || lowerText.includes("cost")
){

response = AveryResponses.REQUEST_QUOTE;

    }


else if(
lowerText.includes("contact") ||
lowerText.includes("person") ||
lowerText.includes("human") ||
lowerText.includes("representative") ||
lowerText.includes("someone")
){

response = AveryResponses.CONTACT_DISPATCH;
}

else if(
lowerText.includes("service") ||
lowerText.includes("offer") ||
lowerText.includes("do you do")
){

response = `

We help businesses with:

<br><br>

✔ AI customer support
<br>
✔ Automated scheduling
<br>
✔ Quote generation
<br>
✔ Lead capture
<br>
✔ Workflow automation

<br><br>

Would you like to see how Avery can help your business?

`;

}



else if(
lowerText.includes("price") ||
lowerText.includes("pricing") ||
lowerText.includes("cost")
){

response = `

${businessKnowledge.pricing}

<br><br>

I can help you generate a custom estimate.

<br><br>

<button onclick="goTo('pages/quote.html')">

💰 Get a Quote

</button>

`;

}



else if(
lowerText.includes("hours") ||
lowerText.includes("open")
){

response = `

Our business hours are:

<br><br>

${businessKnowledge.hours}

`;

}



else {

response = `

${businessKnowledge.description}

<br><br>

I can help answer questions, create quotes,
or connect you with a team member.

`;

}

    // Remove typing indicator

    let typing = document.querySelector(".typing");

    if(typing){
        typing.remove();
    }



    messages.innerHTML += `

    <div class="message avery-message">

    <strong>Avery:</strong>

    ${response}

    </div>

    `;


    messages.scrollTop = messages.scrollHeight;


},1200);
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
    if(request && request.customer && request.customer.customerName){
        return request.customer.customerName;
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
    if(request && request.delivery && request.delivery.serviceLevel){
        return request.delivery.serviceLevel;
    }
    if(request && request.delivery && request.delivery.deliveryType){
        return request.delivery.deliveryType;
    }
    return request && request.service ? request.service : "Not specified";
}

function getRequestPriority(request){
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

function updateRequestStatus(index, status){
    const requests = JSON.parse(localStorage.getItem("requests") || "[]");
    if (!requests[index]) {
        return;
    }

    requests[index].status = status;
    localStorage.setItem("requests", JSON.stringify(requests));
    loadDashboard();
}

function updateRequestStatusFromSelect(index, status){
    updateRequestStatus(index, status);
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

    return `
        <div class="request-details-grid">
            <div>
                <h4>Customer Information</h4>
                <p><strong>Name:</strong> ${customerName}</p>
                <p><strong>Business:</strong> ${businessName}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone}</p>
            </div>
            <div>
                <h4>Pickup Details</h4>
                <p><strong>Pickup address:</strong> ${pickupAddress}</p>
                <p><strong>Pickup contact:</strong> ${pickupContact}</p>
                <p><strong>Pickup phone:</strong> ${pickupPhone}</p>
            </div>
            <div>
                <h4>Delivery Details</h4>
                <p><strong>Delivery address:</strong> ${deliveryAddress}</p>
                <p><strong>Delivery contact:</strong> ${deliveryContact}</p>
                <p><strong>Delivery phone:</strong> ${deliveryPhone}</p>
            </div>
            <div>
                <h4>Service Details</h4>
                <p><strong>Delivery type:</strong> ${serviceLevel}</p>
                <p><strong>Shipment type:</strong> ${shipmentType}</p>
                <p><strong>Special instructions:</strong> ${getRequestNotes(request)}</p>
            </div>
            <div>
                <h4>Scheduling</h4>
                <p><strong>Date:</strong> ${scheduleDate}</p>
                <p><strong>Time:</strong> ${scheduleTime}</p>
                <p><strong>Notes:</strong> ${getRequestNotes(request)}</p>
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

function getDashboardRequestFilter(){
    const activeTab = document.querySelector('.request-tab.active');
    return activeTab && activeTab.getAttribute('data-filter') === 'completed' ? 'completed' : 'active';
}

function renderDashboardRequests(requests){
    const requestList = document.getElementById("requestList");
    if(!requestList){
        return;
    }

    const filter = getDashboardRequestFilter();
    const visibleRequests = requests.filter(function (request) {
        const status = getRequestStatus(request);
        if (filter === 'completed') {
            return status === 'Completed';
        }
        return status !== 'Completed';
    });

    if(visibleRequests.length === 0){
        requestList.innerHTML = `
            <div class="empty-state">
                <h3>No ${filter === 'completed' ? 'completed' : 'active or pending'} requests yet</h3>
                <p>${filter === 'completed' ? 'Completed requests will appear here once they are marked complete.' : 'Active and pending requests will appear here as they come in.'}</p>
            </div>
        `;
        return;
    }

    requestList.innerHTML = "";

    visibleRequests.forEach((request, visibleIndex)=>{
        const originalIndex = requests.indexOf(request);
        const status = getRequestStatus(request);
        const statusClass = getRequestStatusClass(status);
        const trackingId = getRequestTrackingNumber(request);
        const quoteSummary = request && request.quote ? `
            <div class="quote-summary">
                <p><strong>Estimated total:</strong> ${request.quote.estimatedTotal ? "$" + request.quote.estimatedTotal.toLocaleString() : "Pending review"}</p>
                <p><strong>Timeline:</strong> ${request.quote.timeline || "Pending review"}</p>
            </div>
        ` : "";

        requestList.innerHTML += `
            <article class="request-card" data-index="${originalIndex}">
                <div class="request-card-header">
                    <div>
                        <h3>${getRequestTitle(request)}</h3>
                        <p class="request-subtitle">${getRequestService(request)}</p>
                    </div>
                    <span class="status-pill ${statusClass}">${status}</span>
                </div>

                <div class="request-status-row">
                    <label class="request-status-label" for="requestStatus-${originalIndex}">Status</label>
                    <select class="request-status-select ${statusClass}" id="requestStatus-${originalIndex}" onchange="updateRequestStatusFromSelect(${originalIndex}, this.value)">
                        <option value="Awaiting Dispatch" ${status === "Awaiting Dispatch" ? "selected" : ""}>Awaiting Dispatch</option>
                        <option value="Active" ${status === "Active" ? "selected" : ""}>Active</option>
                        <option value="Completed" ${status === "Completed" ? "selected" : ""}>Completed</option>
                    </select>
                </div>

                <div class="request-tracking">Tracking Number<br><strong>${trackingId}</strong></div>

                <div class="request-meta">
                    <div><strong>Created</strong><br>${getRequestCreatedAt(request)}</div>
                    <div><strong>Contact</strong><br>${getRequestContact(request)}</div>
                </div>

                ${quoteSummary}

                <div class="request-actions">
                    <a class="request-link" href="pages/tracking-status.html">Track Request</a>
                    <button type="button" class="request-toggle" onclick="toggleRequestDetails(${originalIndex})">Show More</button>
                </div>

                <div class="request-details">
                    ${getRequestDetailHtml(request)}
                </div>
            </article>
        `;
    });
}

function attachRequestFilterHandlers(){
    document.querySelectorAll('.request-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.request-tab').forEach(function (item) {
                item.classList.remove('active');
                item.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            const requests = JSON.parse(localStorage.getItem("requests") || "[]");
            renderDashboardRequests(requests);
        });
    });
}

function loadDashboard(){
    initOwnerAveryDashboard();

    const requests = JSON.parse(localStorage.getItem("requests") || "[]");
    const requestList = document.getElementById("requestList");

    if(!requestList){
        return;
    }

    attachRequestFilterHandlers();

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
