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

function getRequestStatus(request){
    return request && request.status ? request.status : "Awaiting Dispatch";
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

function loadDashboard(){
    const requests = JSON.parse(localStorage.getItem("requests") || "[]");
    const requestList = document.getElementById("requestList");

    if(!requestList){
        return;
    }

    if(requests.length === 0){
        requestList.innerHTML = `
            <div class="empty-state">
                <h3>No requests yet</h3>
                <p>Submit a pickup request or request a quote to see your activity here.</p>
            </div>
        `;
        updateOverview([]);
        return;
    }

    requestList.innerHTML = "";

    requests.forEach((request, index)=>{
        const trackingId = getRequestTrackingNumber(request);
        const quoteSummary = request && request.quote ? `
            <div class="quote-summary">
                <p><strong>Estimated total:</strong> ${request.quote.estimatedTotal ? "$" + request.quote.estimatedTotal.toLocaleString() : "Pending review"}</p>
                <p><strong>Timeline:</strong> ${request.quote.timeline || "Pending review"}</p>
            </div>
        ` : "";

        requestList.innerHTML += `
            <article class="request-card" data-index="${index}">
                <div class="request-card-header">
                    <div>
                        <h3>${getRequestTitle(request)}</h3>
                        <p class="request-subtitle">${getRequestService(request)}</p>
                    </div>
                    <span class="status-pill">${getRequestStatus(request)}</span>
                </div>

                <div class="request-tracking">Tracking Number<br><strong>${trackingId}</strong></div>

                <div class="request-meta">
                    <div><strong>Created</strong><br>${getRequestCreatedAt(request)}</div>
                    <div><strong>Contact</strong><br>${getRequestContact(request)}</div>
                </div>

                ${quoteSummary}

                <div class="request-actions">
                    <a class="request-link" href="pages/tracking-status.html">Track Request</a>
                    <button type="button" class="request-toggle" onclick="toggleRequestDetails(${index})">Show More</button>
                </div>

                <div class="request-details">
                    ${getRequestDetailHtml(request)}
                </div>
            </article>
        `;
    });

    updateOverview(requests);
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

        if(["Accepted", "In Progress", "Assigned", "Dispatched"].includes(status)){
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
