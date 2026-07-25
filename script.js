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



    if(lowerText.includes("appointment")){
    lowerText.includes("schedule") ||
    lowerText.includes("book") ||
    lowerText.includes("meeting")

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
        💰 Request Quote
        </button>
        `;

    }


    else if(
    lowerText.includes("dispatch") ||
    lowerText.includes("contact") ||
    lowerText.includes("person") ||
    lowerText.includes("call") ||
    lowerText.includes("speak") ||
    lowerText.includes("someone") ||
    lowerText.includes("representative")
    ){

        response = `
        I'll help connect you with dispatch.

        <br><br>

        <button onclick="location.href='contact.html'">
        📞 Contact Dispatch
        </button>
        `;

    }


    else {

        response = `
        I'm here to help with pickups,
        quotes, and delivery questions.
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
function nextStep(step){

["step1","step2","step3","step4"].forEach(id => {

    const section = document.getElementById(id);

    if(section){

        section.classList.add("hidden");

    }

});
    document.getElementById("step" + step).classList.remove("hidden");

document.getElementById("progressText").innerText =
"Step " + step + " of 4";
document.querySelector(".progress-fill").style.width =
(step * 25) + "%";

    let prompt = document.getElementById("averyPrompt");

if(step === 2){

    prompt.innerText =
    "Great! Now let's enter the delivery information so we know exactly where your package is going.";

}
    if(step === 3){

        prompt.innerText =
        "Almost done! Just a few more details before we review your request.";

    }

    if(step === 4){

        prompt.innerText =
        "Please review your request before submitting.";

        document.getElementById("reviewPickup").innerText =
        document.getElementById("pickupAddress").value;

        document.getElementById("reviewDelivery").innerText =
        document.getElementById("deliveryAddress").value;

        document.getElementById("reviewContact").innerText =
        document.getElementById("contact").value;

        document.getElementById("reviewPhone").innerText =
        document.getElementById("phone").value;

        document.getElementById("reviewDate").innerText =
        document.getElementById("date").value;

        document.getElementById("reviewTime").innerText =
        document.getElementById("time").value;

    }

}



function submitRequest(){

    document.getElementById("step1").classList.add("hidden");
document.getElementById("step2").classList.add("hidden");
document.getElementById("step3").classList.add("hidden");
document.getElementById("step4").classList.add("hidden");
    document.getElementById("step3").classList.add("hidden");
const request = {

    company: document.getElementById("company").value,

    contact: document.getElementById("contact").value,

    phone: document.getElementById("phone").value,

    pickup: document.getElementById("pickupAddress").value,

    delivery: document.getElementById("deliveryAddress").value,

    date: document.getElementById("date").value,

    time: document.getElementById("time").value,

    status: "Pending Review"

};


let requests =
JSON.parse(localStorage.getItem("pickupRequests")) || [];


request.id = "DL-" + (1001 + requests.length);


requests.push(request);


localStorage.setItem(
    "pickupRequests",
    JSON.stringify(requests)
);    document.getElementById("complete").classList.remove("hidden");


document.getElementById("progressText").innerText =
"Complete";

    document.querySelector(".progress-fill").style.width = "100%";

    document.getElementById("averyPrompt").innerText =
"Perfect! I've received your pickup request. A DasherLab dispatcher will review it shortly.";
}
function toggleMenu(){

    document.getElementById("sideMenu")
    .classList.toggle("active");
}

function loadDashboard(){

    const requests =
    JSON.parse(localStorage.getItem("pickupRequests")) || [];

    updateOverview(requests);

    const container =
    document.getElementById("requestList");

    if(!container) return;

    if(requests.length === 0){

        container.innerHTML =
        "<p>No new requests yet.</p>";

        return;

    }

    container.innerHTML = "";

    requests.forEach(request => {

        container.innerHTML += `

        <div class="request-card">

            <h3>${request.id}</h3>

            <p>
                <strong>Company:</strong>
                ${request.company}
            </p>

            <p>
                <strong>Contact:</strong>
                ${request.contact}
            </p>

            <p>
                <strong>Pickup:</strong>
                ${request.pickup}
            </p>

            <p>
                <strong>Delivery:</strong>
                ${request.delivery}
            </p>

<p>

<strong>Status:</strong>

<span class="${
request.status === "Accepted"
? "status-accepted"
: "status-pending"
}">

${request.status}

</span>

</p>
${request.driver 
?
`<p>
<strong>Driver:</strong>
${request.driver}
</p>`
:
""
}
            ${
                request.status === "Pending Review"

                ? `<button class="primary-button"
                    onclick="acceptRequest('${request.id}')">
                    Accept Request
                   </button>`

: `<button class="secondary-button" onclick="assignDriver('${request.id}')">

Assign Driver

</button>`            }

        </div>

        `;

    });

}   // <-- loadDashboard ends HERE

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
