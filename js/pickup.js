function getCurrentStepNumber(){
    const activeCard = document.querySelector(".form-card:not(.hidden)");
    if(!activeCard) return 1;
    const match = activeCard.id.match(/step(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
}

function validateCurrentStep(){
    const currentStep = getCurrentStepNumber();
    const fieldsByStep = {
        1: ["#fullName", "#businessName", "#deliveryType", "#email", "#phone"],
        2: ["#pickupFacility", "#pickupAddress", "#pickupContact", "#pickupPhone", "#deliveryFacility", "#deliveryAddress", "#deliveryContact", "#deliveryPhone", "#packageType"],
        3: ["#pickupDate", "#pickupTime"]
    };

    const fields = fieldsByStep[currentStep] || [];
    for(const selector of fields){
        const field = document.querySelector(selector);
        if(!field) continue;
        if(field.value.trim() === "" || !field.checkValidity()){
            field.reportValidity();
            return false;
        }
    }

    return true;
}

function populateReview(){
    document.getElementById("reviewFullName").innerText = document.getElementById("fullName").value;
    document.getElementById("reviewBusinessName").innerText = document.getElementById("businessName").value;
    document.getElementById("reviewDeliveryType").innerText = document.getElementById("deliveryType").value;
    document.getElementById("reviewEmail").innerText = document.getElementById("email").value;
    document.getElementById("reviewPhone").innerText = document.getElementById("phone").value;
    document.getElementById("reviewPickupFacility").innerText = document.getElementById("pickupFacility").value;
    document.getElementById("reviewPickupAddress").innerText = document.getElementById("pickupAddress").value;
    document.getElementById("reviewPickupContact").innerText = document.getElementById("pickupContact").value;
    document.getElementById("reviewPickupPhone").innerText = document.getElementById("pickupPhone").value;
    document.getElementById("reviewDeliveryFacility").innerText = document.getElementById("deliveryFacility").value;
    document.getElementById("reviewDeliveryAddress").innerText = document.getElementById("deliveryAddress").value;
    document.getElementById("reviewDeliveryContact").innerText = document.getElementById("deliveryContact").value;
    document.getElementById("reviewDeliveryPhone").innerText = document.getElementById("deliveryPhone").value;
    document.getElementById("reviewPackageType").innerText = document.getElementById("packageType").value;
    document.getElementById("reviewPickupDate").innerText = document.getElementById("pickupDate").value;
    document.getElementById("reviewPickupTime").innerText = document.getElementById("pickupTime").value;
    document.getElementById("reviewComments").innerText = document.getElementById("comments").value;
}

function nextStep(step){
    const currentStep = getCurrentStepNumber();
    if(step > currentStep && !validateCurrentStep()){
        return;
    }

    document.querySelectorAll(".form-card").forEach(card => {
        card.classList.add("hidden");
    });

    const target = document.getElementById("step" + step);
    if(target){
        target.classList.remove("hidden");
    }

    const progressText = document.getElementById("progressText");
    if(progressText){
        progressText.innerText = `Step ${step} of 4`;
    }

    let percent = 25;
    if(step === 1) percent = 25;
    if(step === 2) percent = 50;
    if(step === 3) percent = 75;
    if(step === 4) percent = 100;

    const progressFill = document.getElementById("progressFill");
    if(progressFill){
        progressFill.style.width = percent + "%";
    }

    if(step === 4){
        populateReview();
    }
}

function submitRequest(){
    const requiredFields = [
        document.getElementById("fullName"),
        document.getElementById("businessName"),
        document.getElementById("deliveryType"),
        document.getElementById("email"),
        document.getElementById("phone"),
        document.getElementById("pickupFacility"),
        document.getElementById("pickupAddress"),
        document.getElementById("pickupContact"),
        document.getElementById("pickupPhone"),
        document.getElementById("deliveryFacility"),
        document.getElementById("deliveryAddress"),
        document.getElementById("deliveryContact"),
        document.getElementById("deliveryPhone"),
        document.getElementById("packageType"),
        document.getElementById("pickupDate"),
        document.getElementById("pickupTime")
    ];

    for(const field of requiredFields){
        if(!field || !field.value.trim() || !field.checkValidity()){
            field.reportValidity();
            return;
        }
    }

    const formValues = {
        fullName: document.getElementById("fullName").value.trim(),
        businessName: document.getElementById("businessName").value.trim(),
        deliveryType: document.getElementById("deliveryType").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        pickupFacility: document.getElementById("pickupFacility").value.trim(),
        pickupAddress: document.getElementById("pickupAddress").value.trim(),
        pickupContact: document.getElementById("pickupContact").value.trim(),
        pickupPhone: document.getElementById("pickupPhone").value.trim(),
        deliveryFacility: document.getElementById("deliveryFacility").value.trim(),
        deliveryAddress: document.getElementById("deliveryAddress").value.trim(),
        deliveryContact: document.getElementById("deliveryContact").value.trim(),
        deliveryPhone: document.getElementById("deliveryPhone").value.trim(),
        packageType: document.getElementById("packageType").value.trim(),
        pickupDate: document.getElementById("pickupDate").value,
        pickupTime: document.getElementById("pickupTime").value,
        comments: document.getElementById("comments").value.trim()
    };

    const request = buildPickupRequestRecord(formValues);
    savePickupRequestRecord(request);

    // Preserve the latest customer identity in Avery's memory for future repeat workflows.
    if (window.AveryMemory && typeof window.AveryMemory.saveCustomerProfile === "function") {
        window.AveryMemory.saveCustomerProfile({
            firstName: (formValues.fullName || "").trim().split(/\s+/)[0] || "",
            lastName: (formValues.fullName || "").trim().split(/\s+/).slice(1).join(" ") || "",
            companyName: formValues.businessName,
            email: formValues.email,
            phone: formValues.phone
        });
    }

    // Keep a reusable route history in Avery's memory so repeated pickup paths can be reused later.
    if (window.AveryMemory && typeof window.AveryMemory.savePickupRoute === "function") {
        window.AveryMemory.savePickupRoute(formValues, request.trackingId);
    }

    const confirmationPayload = {
        trackingId: request.trackingId,
        pickupAddress: request.delivery.pickupAddress,
        deliveryAddress: request.delivery.deliveryAddress,
        status: request.status
    };

    localStorage.setItem("latestPickupRequest", JSON.stringify(confirmationPayload));

    const confirmationContainer = document.getElementById("confirmationContent");
    if(confirmationContainer){
        const routeUrl = buildGoogleMapsUrl(request.delivery.pickupAddress, request.delivery.deliveryAddress);
        confirmationContainer.innerHTML = `
            <div class="confirmation-shell">
                <div class="confirmation-badge">Request received</div>
                <h2>Pickup request submitted</h2>
                <p class="confirmation-copy">Your request has been registered and queued for dispatcher review.</p>
                <div class="confirmation-grid">
                    <div>
                        <p class="confirmation-label">Tracking number</p>
                        <p class="confirmation-value">${request.trackingId}</p>
                    </div>
                    <div>
                        <p class="confirmation-label">Status</p>
                        <p class="confirmation-value">Awaiting dispatch</p>
                    </div>
                </div>
                <div class="confirmation-address-block">
                    <p class="confirmation-label">Pickup address</p>
                    <p class="confirmation-value">${request.delivery.pickupAddress}</p>
                </div>
                <div class="confirmation-address-block">
                    <p class="confirmation-label">Delivery address</p>
                    <p class="confirmation-value">${request.delivery.deliveryAddress}</p>
                </div>
                <p class="confirmation-link">
                    ${routeUrl ? `<a href="${routeUrl}" target="_blank" rel="noopener">View route in Google Maps</a>` : 'Route link unavailable until both addresses are provided.'}
                </p>
                <div class="button-row">
                    <button class="primary-button" type="button" onclick="window.location.href = resolvePortalPath('index.html')">Return Home</button>
                </div>
            </div>
        `;

        document.querySelectorAll('.form-card').forEach(card => card.classList.add('hidden'));
        document.getElementById('complete').classList.remove('hidden');
        document.getElementById('progressText').innerText = 'Completed';
        document.getElementById('progressFill').style.width = '100%';
    } else {
        window.location.href = resolvePortalPath("index.html");
    }
}

window.nextStep = nextStep;
window.submitRequest = submitRequest;
window.getCurrentStepNumber = getCurrentStepNumber;
window.validateCurrentStep = validateCurrentStep;

function initializeReturningCustomerPickupPrompt(){
    const prompt = document.getElementById("averyPrompt");
    if(!prompt || !window.AveryWorkflowEngine) {
        return;
    }

    const response = window.AveryWorkflowEngine.start("START_PICKUP");
    if(response){
        prompt.innerHTML = response;
    }
}

if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", initializeReturningCustomerPickupPrompt);
} else {
    initializeReturningCustomerPickupPrompt();
}

