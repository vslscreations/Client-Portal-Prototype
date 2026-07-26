function sendMessage(){

    const input = document.getElementById("userInput");

    const messages = document.getElementById("messages");


    let text = input.value;


    if(text.trim() === ""){
        return;
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



if (
    lowerText.includes("appointment") ||
    lowerText.includes("schedule") ||
    lowerText.includes("book") ||
    lowerText.includes("meeting")
){
        response = `
        I'd be happy to help schedule an appointment.

        <br><br>

        <button onclick="location.href='pickup.html'">
        Schedule Appointment
        </button>
        `;

    }


    else if(lowerText.includes("quote")
    || lowerText.includes("price")
    || lowerText.includes("cost")){

        response = `
        I can help you request a delivery quote.

        <br><br>

        <button onclick="location.href='quote.html'">
        💰 Get Your Instant Estimate
        </button>
        `;

    }


else if(
lowerText.includes("contact") ||
lowerText.includes("person") ||
lowerText.includes("human") ||
lowerText.includes("representative") ||
lowerText.includes("someone")
){

response = `

I'd be happy to connect you with a member of our team.

<br><br>

I'll collect your information and make sure
the right person follows up.

<br><br>

<button onclick="location.href='contact.html'">

📞 Contact Team

</button>

`;

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

<button onclick="location.href='quote.html'">

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

document.getElementById("userInput").addEventListener("keydown", function(event){

    if(event.key === "Enter"){

        event.preventDefault();

        sendMessage();

    }

});

function nextStep(step){

    // Hide all steps
    document.querySelectorAll(".form-card").forEach(card=>{
        card.classList.add("hidden");
    });

    // Show current step
    document.getElementById("step" + step).classList.remove("hidden");



    // Update progress text
    document.getElementById("progressText").innerText =
    `Step ${step} of 4`;



    // Update progress bar
    let percent = 25;

    if(step === 1) percent = 25;
    if(step === 2) percent = 50;
    if(step === 3) percent = 75;
    if(step === 4) percent = 100;

    document.getElementById("progressFill").style.width =
    percent + "%";



    // Populate Review Screen
    if(step === 4){

        document.getElementById("reviewCompany").innerText =
        document.getElementById("company").value;

        document.getElementById("reviewContact").innerText =
        document.getElementById("contact").value;

        document.getElementById("reviewEmail").innerText =
        document.getElementById("email").value;

        document.getElementById("reviewPhone").innerText =
        document.getElementById("phone").value;

        document.getElementById("reviewRequestType").innerText =
        document.getElementById("requestType").value;

        document.getElementById("reviewService").innerText =
        document.getElementById("service").value;

        document.getElementById("reviewDescription").innerText =
        document.getElementById("description").value;

        document.getElementById("reviewDate").innerText =
        document.getElementById("date").value;

        document.getElementById("reviewPriority").innerText =
        document.getElementById("priority").value;

        document.getElementById("reviewNotes").innerText =
        document.getElementById("notes").value;

    }

}

function submitRequest(){


const request = {


company:
document.getElementById("company").value,


contact:
document.getElementById("contact").value,


email:
document.getElementById("email").value,


phone:
document.getElementById("phone").value,


requestType:
document.getElementById("requestType").value,


service:
document.getElementById("service").value,


description:
document.getElementById("description").value,


date:
document.getElementById("date").value,


priority:
document.getElementById("priority").value,


notes:
document.getElementById("notes").value,


status:
"Pending",


createdBy:
"Avery AI"

};





let requests =
JSON.parse(localStorage.getItem("requests")) || [];



requests.push(request);



localStorage.setItem(
"requests",
JSON.stringify(requests)
);




alert("Your request has been submitted!");



window.location.href="index.html";

}function toggleMenu(){

    document.getElementById("sideMenu")
    .classList.toggle("active");
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
${request.company || "Individual Customer"}
</p>


<p>
<strong>Contact:</strong>
${request.contact}
</p>


<p>
<strong>Service:</strong>
${request.service || "Not specified"}
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
${request.priority}
</p>


<p>
<strong>Status:</strong>
${request.status}
</p>


<p>
<strong>Created By:</strong>
${request.createdBy}
</p>



</div>

`;

});

// Update dashboard counters

document.getElementById("pendingCount").innerText =
requests.filter(request => request.status === "Pending").length;


document.getElementById("acceptedCount").innerText =
requests.filter(request => request.status === "Accepted").length;


document.getElementById("assignedCount").innerText =
requests.filter(request => request.status === "In Progress").length;


document.getElementById("completedCount").innerText =
requests.filter(request => request.status === "Completed").length;
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
