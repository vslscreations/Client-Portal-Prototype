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

    if(request.type === "Quote Request"){
        return "💰 Quote Request";
    }

    if(request.type === "Human Follow-Up"){
        return "👤 Human Follow-Up";
    }

    return "📋 Service Request";
}

function getRequestBusiness(request){
    if(request.customer && request.customer.companyName){
        return request.customer.companyName;
    }
    return request.company || "Individual Customer";
}

function getRequestContact(request){
    if(request.customer && request.customer.customerName){
        return request.customer.customerName;
    }
    return request.contact || "Not specified";
}

function getRequestService(request){
    if(request.delivery && request.delivery.serviceLevel){
        return request.delivery.serviceLevel;
    }
    return request.service || "Not specified";
}

function getRequestPriority(request){
    return request.priority || (request.delivery && request.delivery.serviceLevel) || "Standard";
}

function getRequestStatus(request){
    return request.status || "Awaiting Dispatch";
}

function getRequestCreatedBy(request){
    return request.createdBy || "Portal";
}

function loadDashboard(){


let requests = JSON.parse(localStorage.getItem("requests")) || [];



const requestList = document.getElementById("requestList");



if(requests.length === 0){

    requestList.innerHTML = `
    <p>No new requests yet.</p>
    `;

    return;

}



requestList.innerHTML = "";



requests.forEach((request, index)=>{


requestList.innerHTML += `

<div class="request-card">


<h3>

${
request.type === "Quote Request"

?

"💰 Quote Request"


:

request.type === "Human Follow-Up"

?

"👤 Human Follow-Up"


:

"📋 " + (request.requestType || "Service Request")

}

</h3>
<p>
<strong>Business:</strong>
${getRequestBusiness(request)}
</p>


<p>
<strong>Contact:</strong>
${getRequestContact(request)}
</p>


<p>
<strong>Service:</strong>
${getRequestService(request)}
</p>

${
request.type === "Sales Opportunity"

?

`
<p>
<strong>Budget:</strong>
${request.budget}
</p>

<p>
<strong>Description:</strong>
${request.description}
</p>
`

:

""

}

${
request.type === "Human Follow-Up"

?

`
<p>
<strong>Email:</strong>
${request.email}
</p>


<p>
<strong>Message:</strong>
${request.message}
</p>


<p>
<strong>Status:</strong>
Needs Team Review
</p>
`

:

""

}

<p>
<strong>Priority:</strong>
${getRequestPriority(request)}
</p>


<p>
<strong>Status:</strong>
${getRequestStatus(request)}
</p>


<p>
<strong>Created By:</strong>
${getRequestCreatedBy(request)}
</p>



</div>

`;

});

// Update dashboard counters

document.getElementById("pendingCount").innerText =
requests.filter(request => ["Pending", "Awaiting Dispatch", "Pending Review"].includes(getRequestStatus(request))).length;


document.getElementById("acceptedCount").innerText =
requests.filter(request => getRequestStatus(request) === "Accepted").length;


document.getElementById("assignedCount").innerText =
requests.filter(request => ["In Progress", "Assigned"].includes(getRequestStatus(request))).length;


document.getElementById("completedCount").innerText =
requests.filter(request => getRequestStatus(request) === "Completed").length;
}
function updateOverview(requests){


let pending = 0;
let accepted = 0;
let assigned = 0;
let completed = 0;



requests.forEach(request => {


if(request.status === "Pending Review"){

pending++;

}


if(request.status === "Accepted"){

accepted++;

}


if(request.status === "Assigned"){

assigned++;

}


if(request.status === "Completed"){

completed++;

}


});



document.getElementById("pendingCount").innerText =
pending;


document.getElementById("acceptedCount").innerText =
accepted;


document.getElementById("assignedCount").innerText =
assigned;


document.getElementById("completedCount").innerText =
completed;


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
