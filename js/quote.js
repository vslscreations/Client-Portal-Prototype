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

function submitQuote(){
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

    const serviceType = document.getElementById("quoteService").value;
    const mileage = parseFloat(document.getElementById("quoteMileage").value) || 0;
    const priority = document.getElementById("quotePriority").value;
    const estimate = calculateQuoteEstimate(serviceType, mileage, priority);
    const pickupAddress = document.getElementById("quotePickupLocation").value.trim();
    const deliveryAddress = document.getElementById("quoteDeliveryLocation").value.trim();
    const requestedDate = document.getElementById("quoteDate").value;
    const notes = document.getElementById("quoteNotes").value.trim();

    const quoteRequest = {
        type: "Quote Request",
        status: "Awaiting Review",
        createdAt: new Date().toISOString(),
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