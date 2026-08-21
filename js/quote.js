function validateQuoteStep(step){
    const fieldsByStep = {
        1: ["#quoteCustomerName", "#quoteCompany", "#quoteEmail", "#quotePhone"],
        2: ["#quoteService", "#quotePickupLocation", "#quoteDeliveryLocation", "#quoteMileage", "#quotePriority"],
        3: ["#quoteDate"]
    };

    const fields = fieldsByStep[step] || [];

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

function nextQuoteStep(step){
    if(step > 1 && !validateQuoteStep(step - 1)){
        return;
    }

    document.querySelectorAll(".form-card").forEach(card => {
        card.classList.add("hidden");
    });

    const target = document.getElementById("quoteStep" + step);
    if(target){
        target.classList.remove("hidden");
    }

    const progressText = document.getElementById("quoteProgressText");
    if(progressText){
        progressText.innerText = `Step ${step} of 4`;
    }

    const progressFill = document.getElementById("quoteProgressFill");
    if(progressFill){
        progressFill.style.width = `${step * 25}%`;
    }

    if(step === 4){
        renderQuoteSummary();
    }
}

function getSavedQuoteRouteDefaults(){
    const savedRoutes = window.AveryMemory && typeof window.AveryMemory.getSavedRoutes === "function"
        ? window.AveryMemory.getSavedRoutes()
        : [];

    if (!savedRoutes.length) {
        return null;
    }

    const latestRoute = savedRoutes[savedRoutes.length - 1];
    return {
        pickupLocation: latestRoute.pickupAddress || "",
        deliveryLocation: latestRoute.deliveryAddress || "",
        serviceType: latestRoute.deliveryType || "Scheduled Route",
        packageType: latestRoute.packageType || "",
        customerName: latestRoute.fullName || "",
        companyName: latestRoute.companyName || ""
    };
}

function populateSavedQuoteDefaults(){
    const defaults = getSavedQuoteRouteDefaults();
    if (!defaults) {
        return;
    }

    const pickupField = document.getElementById("quotePickupLocation");
    const deliveryField = document.getElementById("quoteDeliveryLocation");
    const serviceField = document.getElementById("quoteService");
    const customerField = document.getElementById("quoteCustomerName");
    const companyField = document.getElementById("quoteCompany");

    if (pickupField && !pickupField.value) {
        pickupField.value = defaults.pickupLocation;
    }

    if (deliveryField && !deliveryField.value) {
        deliveryField.value = defaults.deliveryLocation;
    }

    if (serviceField && !serviceField.value) {
        serviceField.value = defaults.serviceType;
    }

    if (customerField && !customerField.value) {
        customerField.value = defaults.customerName;
    }

    if (companyField && !companyField.value) {
        companyField.value = defaults.companyName;
    }
}

function calculateQuoteEstimate(serviceType, mileage, priority){
    if (window.DasherLabQuotePricing && typeof window.DasherLabQuotePricing.calculateQuoteEstimate === "function") {
        return window.DasherLabQuotePricing.calculateQuoteEstimate(serviceType, mileage, priority);
    }

    const mileageValue = Number(mileage) || 0;
    const baseFee = 35;
    const mileageFee = mileageValue * 2.25;
    const subtotal = baseFee + mileageFee;
    const urgency = String(priority || "Standard").trim().toLowerCase();
    let surchargePercent = 0;

    if (urgency === "stat") {
        surchargePercent = 0.75;
    } else if (urgency === "after-hours" || urgency === "after hours") {
        surchargePercent = 0.4;
    } else if (urgency === "rush" || urgency === "high priority" || urgency === "asap") {
        surchargePercent = 0.25;
    }

    const surchargeAmount = subtotal * surchargePercent;
    return {
        baseFee: baseFee,
        mileage: mileageValue,
        mileageFee: mileageFee,
        subtotal: subtotal,
        surchargePercent: surchargePercent,
        surchargeAmount: surchargeAmount,
        estimatedTotal: subtotal + surchargeAmount,
        urgencyLabel: urgency === "stat" ? "STAT" : urgency === "after-hours" || urgency === "after hours" ? "After-hours" : urgency === "rush" || urgency === "high priority" || urgency === "asap" ? "Rush" : "Standard",
        serviceType: serviceType || "Scheduled Route"
    };
}

function renderQuoteSummary(){
    const customerName = document.getElementById("quoteCustomerName").value.trim();
    const businessName = document.getElementById("quoteCompany").value.trim();
    const serviceType = document.getElementById("quoteService").value;
    const pickupAddress = document.getElementById("quotePickupLocation").value.trim();
    const deliveryAddress = document.getElementById("quoteDeliveryLocation").value.trim();
    const mileage = parseFloat(document.getElementById("quoteMileage").value) || 0;
    const priority = document.getElementById("quotePriority").value;
    const estimate = calculateQuoteEstimate(serviceType, mileage, priority);

    document.getElementById("generatedQuote").innerText = `$${estimate.estimatedTotal.toFixed(2)}`;
    document.getElementById("quoteResultCustomer").innerText = customerName || "Customer";
    document.getElementById("quoteResultBusiness").innerText = businessName || "Business";
    document.getElementById("quoteResultService").innerText = serviceType || "Scheduled";
    document.getElementById("quoteResultPickup").innerText = pickupAddress || "Not provided";
    document.getElementById("quoteResultDelivery").innerText = deliveryAddress || "Not provided";
    document.getElementById("quoteResultMileage").innerText = mileage > 0 ? `${mileage} miles` : "Estimated mileage pending";
    document.getElementById("quoteResultNotes").innerText = document.getElementById("quoteNotes").value.trim() || "No additional notes provided.";
    document.getElementById("quoteResultPriority").innerText = estimate.urgencyLabel || priority || "Standard";
    document.getElementById("quoteResultDate").innerText = document.getElementById("quoteDate").value || "Pending review";

    const breakdown = document.getElementById("quoteBreakdown");
    if (breakdown) {
        breakdown.innerHTML = `
            <p><strong>Base pickup:</strong> $${estimate.baseFee.toFixed(2)}</p>
            <p><strong>Mileage:</strong> ${estimate.mileage} miles × $${window.DasherLabQuotePricing ? window.DasherLabQuotePricing.MILEAGE_RATE.toFixed(2) : "2.25"} = $${estimate.mileageFee.toFixed(2)}</p>
            <p><strong>${estimate.urgencyLabel === "Standard" ? "Urgency" : `${estimate.urgencyLabel} surcharge`}:</strong> ${estimate.surchargePercent > 0 ? `+${(estimate.surchargePercent * 100).toFixed(0)}%` : "No surcharge"} (${estimate.surchargeAmount > 0 ? `$${estimate.surchargeAmount.toFixed(2)}` : "$0.00"})</p>
        `;
    }

    const averyMessage = document.getElementById("quoteAveryMessage");
    if (averyMessage) {
        averyMessage.innerText = `Based on the route details and delivery urgency you selected, your estimated delivery cost is $${estimate.estimatedTotal.toFixed(2)}.`;
    }
}

function generateQuote(){
    populateSavedQuoteDefaults();
    nextQuoteStep(4);
}

let quoteSubmissionInProgress = false;

function getQuoteSubmitButton(){
    return document.querySelector('#quoteStep4 .primary-button[onclick*="submitQuote"]');
}

function clearQuoteSubmissionError(){
    const existing = document.getElementById("quoteSubmitError");
    if(existing){
        existing.remove();
    }
}

function showQuoteSubmissionError(message){
    const step4 = document.getElementById("quoteStep4");
    if(!step4){
        return;
    }

    clearQuoteSubmissionError();

    const error = document.createElement("p");
    error.id = "quoteSubmitError";
    error.className = "empty-state";
    error.style.color = "#b42318";
    error.style.marginTop = "14px";
    error.textContent = message;
    step4.appendChild(error);
}

function setQuoteSubmitState(isBusy){
    const submitButton = getQuoteSubmitButton();
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
        submitButton.textContent = submitButton.dataset.originalText || "Submit Quote Request";
        submitButton.removeAttribute("aria-busy");
    }
}

function buildQuoteReference(){
    const date = new Date();
    const y = String(date.getFullYear());
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const t = String(date.getHours()).padStart(2, "0") + String(date.getMinutes()).padStart(2, "0") + String(date.getSeconds()).padStart(2, "0");
    return "Q-" + y + m + d + "-" + t;
}

function buildQuoteSupabasePayload(formValues, businessId, estimate, quoteReference, createdByUserId, clientUserId){
    return {
        business_id: businessId,
        created_by_user_id: createdByUserId || null,
        client_user_id: clientUserId || null,
        pickup_address: formValues.pickupAddress,
        delivery_address: formValues.deliveryAddress,
        service_type: formValues.serviceType,
        mileage: formValues.mileage,
        priority: formValues.priority,
        estimated_total: Number(estimate.estimatedTotal.toFixed(2)),
        requested_date: formValues.requestedDate || null,
        notes: formValues.notes || null,
        reference: quoteReference,
        status: "Awaiting Review"
    };
}

async function createQuoteInSupabase(payload){
    if(!window.supabaseClient){
        return { ok: false, message: "Quote submission is unavailable right now. Please try again." };
    }

    const insertResult = await window.supabaseClient
        .from("quotes")
        .insert(payload)
        .select("id, business_id, reference, status, created_at")
        .maybeSingle();

    if(insertResult.error){
        return { ok: false, message: "We could not submit your quote request right now. Please review and try again.", error: insertResult.error };
    }

    if(!insertResult.data || !insertResult.data.id){
        return { ok: false, message: "Quote submission could not be confirmed. Please try again." };
    }

    return { ok: true, record: insertResult.data };
}

async function submitQuote(){
    if(quoteSubmissionInProgress){
        return;
    }

    clearQuoteSubmissionError();

    const requiredFields = [
        document.getElementById("quoteCustomerName"),
        document.getElementById("quoteCompany"),
        document.getElementById("quoteEmail"),
        document.getElementById("quotePhone"),
        document.getElementById("quoteService"),
        document.getElementById("quotePickupLocation"),
        document.getElementById("quoteDeliveryLocation"),
        document.getElementById("quoteMileage"),
        document.getElementById("quoteDate"),
        document.getElementById("quotePriority")
    ];

    for(const field of requiredFields){
        if(!field || !field.value.trim() || !field.checkValidity()){
            field.reportValidity();
            return;
        }
    }

    quoteSubmissionInProgress = true;
    setQuoteSubmitState(true);

    if(!window.DasherLabClientAuth || !window.supabaseClient){
        quoteSubmissionInProgress = false;
        setQuoteSubmitState(false);
        window.location.replace(resolvePortalPath("client-login.html"));
        return;
    }

    const sessionResult = await window.supabaseClient.auth.getSession();
    const session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
    if(!session || !session.user || !session.user.id){
        quoteSubmissionInProgress = false;
        setQuoteSubmitState(false);
        window.location.replace(resolvePortalPath("client-login.html"));
        return;
    }

    const association = await window.DasherLabClientAuth.getClientAssociationByUserId(session.user.id);
    if(!association || !association.ok || !association.context || !association.context.businessId){
        quoteSubmissionInProgress = false;
        setQuoteSubmitState(false);
        showQuoteSubmissionError("Your account is not linked to an active business profile. Please contact support.");
        return;
    }

    const serviceType = document.getElementById("quoteService").value;
    const mileage = parseFloat(document.getElementById("quoteMileage").value) || 0;
    const priority = document.getElementById("quotePriority").value;
    const estimate = calculateQuoteEstimate(serviceType, mileage, priority);
    const pickupAddress = document.getElementById("quotePickupLocation").value.trim();
    const deliveryAddress = document.getElementById("quoteDeliveryLocation").value.trim();
    const requestedDate = document.getElementById("quoteDate").value;
    const notes = document.getElementById("quoteNotes").value.trim();

    const formValues = {
        serviceType,
        mileage,
        priority,
        pickupAddress,
        deliveryAddress,
        requestedDate,
        notes
    };

    const quoteReference = buildQuoteReference();
    const supabasePayload = buildQuoteSupabasePayload(
        formValues,
        association.context.businessId,
        estimate,
        quoteReference,
        session.user.id,
        session.user.id
    );
    const quoteInsert = await createQuoteInSupabase(supabasePayload);

    if(!quoteInsert.ok){
        quoteSubmissionInProgress = false;
        setQuoteSubmitState(false);
        showQuoteSubmissionError(quoteInsert.message);
        return;
    }

    const quoteRequest = {
        type: "Quote Request",
        status: "Awaiting Review",
        createdAt: new Date().toISOString(),
        quoteId: quoteInsert.record.id,
        quoteReference: quoteReference,
        createdBy: "Client Portal",
        customer: {
            customerName: document.getElementById("quoteCustomerName").value.trim(),
            companyName: document.getElementById("quoteCompany").value.trim(),
            email: document.getElementById("quoteEmail").value.trim(),
            phoneNumber: document.getElementById("quotePhone").value.trim()
        },
        delivery: {
            pickupAddress: pickupAddress,
            deliveryAddress: deliveryAddress,
            serviceLevel: serviceType,
            mileage: mileage || 0,
            notes: notes,
            pickupDate: requestedDate || ""
        },
        service: serviceType,
        quote: {
            estimatedTotal: Number(estimate.estimatedTotal.toFixed(2)),
            baseFee: Number(estimate.baseFee.toFixed(2)),
            mileageFee: Number(estimate.mileageFee.toFixed(2)),
            mileage: Number(estimate.mileage.toFixed(2)),
            surchargePercent: Number(estimate.surchargePercent.toFixed(2)),
            surchargeAmount: Number(estimate.surchargeAmount.toFixed(2)),
            subtotal: Number(estimate.subtotal.toFixed(2)),
            urgency: estimate.urgencyLabel,
            priority: priority,
            timeline: "Prepared for your requested timeframe"
        },
        priority,
        source: "portal"
    };

    const requests = JSON.parse(localStorage.getItem("requests") || "[]");
    requests.push(quoteRequest);
    localStorage.setItem("requests", JSON.stringify(requests));
    localStorage.setItem("latestQuoteRequest", JSON.stringify({
        id: quoteInsert.record.id,
        reference: quoteReference,
        status: quoteInsert.record.status || "Awaiting Review",
        estimatedTotal: quoteRequest.quote.estimatedTotal
    }));

    try {
        await window.DasherLabEmailNotifications.sendRequestNotification("quote_request_submitted", {
            eventType: "quote_request_submitted",
            type: "quote",
            requestType: "quote",
            reference: quoteReference,
            customerName: document.getElementById("quoteCustomerName").value.trim(),
            businessName: document.getElementById("quoteCompany").value.trim(),
            customerEmail: document.getElementById("quoteEmail").value.trim(),
            customerPhone: document.getElementById("quotePhone").value.trim(),
            pickupAddress: pickupAddress,
            deliveryAddress: deliveryAddress,
            serviceType: serviceType,
            requestedDate: requestedDate,
            notes: notes,
            priority: priority,
            estimatedTotal: Number(estimate.estimatedTotal.toFixed(2)),
            businessId: association.context.businessId,
            createdByUserId: session.user.id
        });
    } catch (error) {
        console.warn("[quote-email] notification failed but request already saved", error);
    }

    if (window.AveryMemory && typeof window.AveryMemory.savePickupRoute === "function") {
        window.AveryMemory.savePickupRoute({
            fullName: quoteRequest.customer.customerName,
            companyName: quoteRequest.customer.companyName,
            email: quoteRequest.customer.email,
            phone: quoteRequest.customer.phoneNumber,
            pickupAddress: pickupAddress,
            deliveryAddress: deliveryAddress,
            deliveryType: serviceType,
            packageType: document.getElementById("quoteService").value || ""
        }, quoteRequest.createdAt || "quote-request");
    }

    quoteSubmissionInProgress = false;
    window.location.href = resolvePortalPath("index.html");
}

window.nextQuoteStep = nextQuoteStep;
window.submitQuote = submitQuote;
window.validateQuoteStep = validateQuoteStep;
window.populateSavedQuoteDefaults = populateSavedQuoteDefaults;

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", populateSavedQuoteDefaults);
} else {
    populateSavedQuoteDefaults();
}