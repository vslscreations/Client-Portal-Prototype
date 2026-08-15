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

let pickupSubmissionInProgress = false;

function getPickupSubmitButton(){
    return document.querySelector('#step4 .primary-button[onclick*="submitRequest"]');
}

function clearPickupSubmissionError(){
    const existing = document.getElementById("pickupSubmitError");
    if(existing){
        existing.remove();
    }
}

function showPickupSubmissionError(message){
    const step4 = document.getElementById("step4");
    if(!step4){
        return;
    }

    clearPickupSubmissionError();

    const error = document.createElement("p");
    error.id = "pickupSubmitError";
    error.className = "empty-state";
    error.style.color = "#b42318";
    error.style.marginTop = "14px";
    error.textContent = message;
    step4.appendChild(error);
}

function setPickupSubmitState(isBusy){
    const submitButton = getPickupSubmitButton();
    if(!submitButton){
        return;
    }

    if(isBusy){
        if(!submitButton.dataset.originalText){
            submitButton.dataset.originalText = submitButton.textContent;
        }
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
        submitButton.setAttribute("aria-busy", "true");
    } else {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalText || "Submit Request";
        submitButton.removeAttribute("aria-busy");
    }
}

function buildPickupSupabasePayload(formValues, businessId, trackingId, createdByUserId){
    return {
        business_id: businessId,
        created_by_user_id: createdByUserId || null,
        customer_name: formValues.fullName || null,
        business_name: formValues.businessName || null,
        email: formValues.email || null,
        phone: formValues.phone || null,
        pickup_facility: formValues.pickupFacility || null,
        pickup_address: formValues.pickupAddress,
        pickup_contact: formValues.pickupContact || null,
        pickup_phone: formValues.pickupPhone || null,
        delivery_facility: formValues.deliveryFacility || null,
        delivery_address: formValues.deliveryAddress,
        delivery_contact: formValues.deliveryContact || null,
        delivery_phone: formValues.deliveryPhone || null,
        pickup_date: formValues.pickupDate,
        pickup_time: formValues.pickupTime,
        service_type: formValues.deliveryType,
        priority: formValues.deliveryType,
        package_type: formValues.packageType,
        notes: formValues.comments || null,
        status: "Awaiting Dispatch",
        tracking_number: trackingId
    };
}

async function createPickupRequestInSupabase(payload){
    if(!window.supabaseClient){
        return { ok: false, message: "Pickup submission is unavailable right now. Please try again." };
    }

    const insertResult = await window.supabaseClient
        .from("pickup_requests")
        .insert(payload)
        .select("id, business_id, tracking_number, status")
        .maybeSingle();

    if(insertResult.error){
        return { ok: false, message: "We could not submit your pickup request right now. Please review and try again.", error: insertResult.error };
    }

    if(!insertResult.data || !insertResult.data.id){
        return { ok: false, message: "Pickup submission could not be confirmed. Please try again." };
    }

    const fetchResult = await window.supabaseClient
        .from("pickup_requests")
        .select("id, tracking_number, status")
        .eq("id", insertResult.data.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if(fetchResult.error){
        return {
            ok: true,
            record: {
                id: insertResult.data.id,
                tracking_number: insertResult.data.tracking_number || payload.tracking_number,
                status: insertResult.data.status || payload.status
            }
        };
    }

    return {
        ok: true,
        record: fetchResult.data || {
            id: insertResult.data.id,
            tracking_number: insertResult.data.tracking_number || payload.tracking_number,
            status: insertResult.data.status || payload.status
        }
    };
}

async function submitRequest(){
    if(pickupSubmissionInProgress){
        return;
    }

    clearPickupSubmissionError();

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

    if(!window.DasherLabClientAuth || !window.supabaseClient){
        window.location.replace(resolvePortalPath("client-login.html"));
        return;
    }

    const sessionResult = await window.supabaseClient.auth.getSession();
    const session = sessionResult && sessionResult.data ? sessionResult.data.session : null;

    if(!session || !session.user || !session.user.id){
        window.location.replace(resolvePortalPath("client-login.html"));
        return;
    }

    const association = await window.DasherLabClientAuth.getClientAssociationByUserId(session.user.id);
    if(!association || !association.ok || !association.context || !association.context.businessId){
        showPickupSubmissionError("Your account is not linked to an active business profile. Please contact support.");
        return;
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

    pickupSubmissionInProgress = true;
    setPickupSubmitState(true);

    const request = buildPickupRequestRecord(formValues);
    const supabasePayload = buildPickupSupabasePayload(
        formValues,
        association.context.businessId,
        request.trackingId,
        session.user.id
    );
    const createResult = await createPickupRequestInSupabase(supabasePayload);

    if(!createResult.ok){
        pickupSubmissionInProgress = false;
        setPickupSubmitState(false);
        showPickupSubmissionError(createResult.message);
        return;
    }

    savePickupRequestRecord(request);

    try {
        await window.DasherLabEmailNotifications.sendRequestNotification("pickup_request_submitted", {
            eventType: "pickup_request_submitted",
            type: "pickup",
            requestType: "pickup",
            trackingNumber: (createResult.record && createResult.record.tracking_number) || request.trackingId,
            reference: (createResult.record && createResult.record.tracking_number) || request.trackingId,
            customerName: formValues.fullName,
            businessName: formValues.businessName,
            customerEmail: formValues.email,
            customerPhone: formValues.phone,
            pickupDate: formValues.pickupDate,
            pickupTime: formValues.pickupTime,
            pickupFacility: formValues.pickupFacility,
            pickupAddress: formValues.pickupAddress,
            deliveryFacility: formValues.deliveryFacility,
            deliveryAddress: formValues.deliveryAddress,
            deliveryType: formValues.deliveryType,
            packageType: formValues.packageType,
            notes: formValues.comments,
            businessId: association.context.businessId,
            createdByUserId: session.user.id
        });
    } catch (error) {
        console.warn("[pickup-email] notification failed but request already saved", error);
    }

    await saveCustomerProfile(formValues);

    // Keep a reusable route history in Avery's memory so repeated pickup paths can be reused later.
    if (window.AveryMemory && typeof window.AveryMemory.savePickupRoute === "function") {
        window.AveryMemory.savePickupRoute(formValues, request.trackingId);
    }

    const confirmationPayload = {
        trackingId: (createResult.record && createResult.record.tracking_number) || request.trackingId,
        pickupAddress: request.delivery.pickupAddress,
        deliveryAddress: request.delivery.deliveryAddress,
        status: (createResult.record && createResult.record.status) || request.status,
        requestId: createResult.record && createResult.record.id ? createResult.record.id : null
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
                        <p class="confirmation-value">${(createResult.record && createResult.record.tracking_number) || request.trackingId}</p>
                    </div>
                    <div>
                        <p class="confirmation-label">Status</p>
                        <p class="confirmation-value">Awaiting dispatch</p>
                    </div>
                </div>
                ${confirmationPayload.requestId ? `
                <div class="confirmation-address-block">
                    <p class="confirmation-label">Request ID</p>
                    <p class="confirmation-value">${confirmationPayload.requestId}</p>
                </div>
                ` : ""}
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
        pickupSubmissionInProgress = false;
    } else {
        pickupSubmissionInProgress = false;
        window.location.href = resolvePortalPath("index.html");
    }
}

window.nextStep = nextStep;
window.submitRequest = submitRequest;
window.getCurrentStepNumber = getCurrentStepNumber;
window.validateCurrentStep = validateCurrentStep;

async function getCurrentCustomerProfileStorageKey(){
    if (!window.supabaseClient || !window.supabaseClient.auth) {
        return null;
    }

    try {
        const sessionResult = window.supabaseClient.auth.getSession ? await window.supabaseClient.auth.getSession() : null;
        const session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
        const userId = session && session.user ? session.user.id : null;
        if (!userId) {
            return null;
        }
        return `dasherlab_client_profile_${userId}`;
    } catch (error) {
        return null;
    }
}

function normalizeCustomerProfile(profile){
    const raw = profile && typeof profile === "object" ? profile : {};
    const fullName = [raw.fullName || raw.contactName || raw.customerName || "", raw.firstName || "", raw.lastName || ""].filter(Boolean).join(" ").trim();
    const businessName = raw.businessName || raw.companyName || "";
    const email = raw.email || "";
    const phone = raw.phone || "";
    const pickupFacility = raw.pickupFacility || "";
    const pickupAddress = raw.pickupAddress || "";
    const pickupContact = raw.pickupContact || "";
    const pickupPhone = raw.pickupPhone || "";
    const deliveryFacility = raw.deliveryFacility || "";
    const deliveryAddress = raw.deliveryAddress || "";
    const deliveryContact = raw.deliveryContact || "";
    const deliveryPhone = raw.deliveryPhone || "";
    const packageType = raw.packageType || "";
    const deliveryType = raw.deliveryType || "";

    return {
        fullName: fullName || [raw.firstName || "", raw.lastName || ""].filter(Boolean).join(" ").trim(),
        businessName: businessName,
        email: email,
        phone: phone,
        pickupFacility: pickupFacility,
        pickupAddress: pickupAddress,
        pickupContact: pickupContact,
        pickupPhone: pickupPhone,
        deliveryFacility: deliveryFacility,
        deliveryAddress: deliveryAddress,
        deliveryContact: deliveryContact,
        deliveryPhone: deliveryPhone,
        packageType: packageType,
        deliveryType: deliveryType
    };
}

async function getSavedCustomerProfile(){
    const storageKey = await getCurrentCustomerProfileStorageKey();
    if (!storageKey) {
        return null;
    }

    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        return normalizeCustomerProfile(parsed);
    } catch (error) {
        return null;
    }
}

async function saveCustomerProfile(profile){
    const normalized = normalizeCustomerProfile(profile || {});
    const storageKey = await getCurrentCustomerProfileStorageKey();
    if (!storageKey) {
        return normalized;
    }

    try {
        localStorage.setItem(storageKey, JSON.stringify(normalized));
    } catch (error) {
        console.warn("[pickup-profile] unable to save authenticated customer profile", error);
    }

    if (window.AveryMemory && typeof window.AveryMemory.saveCustomerProfile === "function") {
        window.AveryMemory.saveCustomerProfile({
            firstName: (normalized.fullName || "").split(/\s+/)[0] || "",
            lastName: (normalized.fullName || "").split(/\s+/).slice(1).join(" ") || "",
            companyName: normalized.businessName || "",
            email: normalized.email || "",
            phone: normalized.phone || ""
        });
    }

    return normalized;
}

async function applyCustomerProfileToForm(){
    const profile = await getSavedCustomerProfile() || (window.AveryMemory && typeof window.AveryMemory.getCustomerProfile === "function" ? window.AveryMemory.getCustomerProfile() : null);
    if (!profile) {
        return;
    }

    const mappings = {
        fullName: profile.fullName || [profile.firstName || "", profile.lastName || ""].filter(Boolean).join(" ") || "",
        businessName: profile.businessName || profile.companyName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        pickupFacility: profile.pickupFacility || "",
        pickupAddress: profile.pickupAddress || "",
        pickupContact: profile.pickupContact || "",
        pickupPhone: profile.pickupPhone || "",
        deliveryFacility: profile.deliveryFacility || "",
        deliveryAddress: profile.deliveryAddress || "",
        deliveryContact: profile.deliveryContact || "",
        deliveryPhone: profile.deliveryPhone || "",
        packageType: profile.packageType || "",
        deliveryType: profile.deliveryType || ""
    };

    Object.keys(mappings).forEach(function (fieldId) {
        const value = mappings[fieldId];
        if (!value) {
            return;
        }
        const field = document.getElementById(fieldId);
        if (field && !field.value) {
            field.value = value;
        }
    });

    if (typeof populateReview === "function") {
        populateReview();
    }
}

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
    document.addEventListener("DOMContentLoaded", function(){
        initializeReturningCustomerPickupPrompt();
        applyCustomerProfileToForm();
    });
} else {
    initializeReturningCustomerPickupPrompt();
    applyCustomerProfileToForm();
}

