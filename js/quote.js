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

function calculateQuoteEstimate(serviceType, mileage, priority){
    const mileageValue = Number(mileage) || 0;
    let base = 35;

    switch(serviceType){
        case "Same-Day Courier":
            base = 45;
            break;
        case "Scheduled Route":
            base = 65;
            break;
        case "Recurring Route":
            base = 95;
            break;
        case "Long-Haul Transfer":
            base = 140;
            break;
    }

    if(priority === "STAT" || priority === "High Priority" || priority === "ASAP"){
        base += 20;
    }

    if(serviceType === "Recurring Route"){
        base += 40;
    }

    if(mileageValue > 15){
        base += Math.round((mileageValue - 15) * 1.25);
    }

    if(mileageValue > 50){
        base += 25;
    }

    return Math.max(base, 35);
}

function renderQuoteSummary(){
    const customerName = document.getElementById("quoteCustomerName").value.trim();
    const businessName = document.getElementById("quoteCompany").value.trim();
    const serviceType = document.getElementById("quoteService").value;
    const mileage = parseFloat(document.getElementById("quoteMileage").value) || 0;
    const priority = document.getElementById("quotePriority").value;
    const estimate = calculateQuoteEstimate(serviceType, mileage, priority);

    document.getElementById("generatedQuote").innerText = `$${estimate.toFixed(0)}`;
    document.getElementById("quoteResultCustomer").innerText = customerName || "Customer";
    document.getElementById("quoteResultBusiness").innerText = businessName || "Business";
    document.getElementById("quoteResultService").innerText = serviceType || "Scheduled";
    document.getElementById("quoteResultMileage").innerText = mileage > 0 ? `${mileage} miles` : "Standard service area";
    document.getElementById("quoteResultNotes").innerText = document.getElementById("quoteNotes").value.trim() || "No additional notes provided.";
    document.getElementById("quoteResultPriority").innerText = priority || "Standard";
    document.getElementById("quoteResultDate").innerText = document.getElementById("quoteDate").value || "Pending review";
}

function generateQuote(){
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
            pickupAddress: document.getElementById("quotePickupLocation").value.trim(),
            deliveryAddress: document.getElementById("quoteDeliveryLocation").value.trim(),
            serviceLevel: serviceType,
            mileage: mileage || 0,
            notes: document.getElementById("quoteNotes").value.trim()
        },
        service: serviceType,
        quote: {
            estimatedTotal: estimate,
            timeline: "Prepared for your requested timeframe",
            priority
        },
        priority,
        source: "portal"
    };

    const requests = JSON.parse(localStorage.getItem("requests") || "[]");
    requests.push(quoteRequest);
    localStorage.setItem("requests", JSON.stringify(requests));

    window.location.href = "../dashboard.html";
}

window.nextQuoteStep = nextQuoteStep;
window.submitQuote = submitQuote;
window.validateQuoteStep = validateQuoteStep;