function getStoredTrackingValue(key, fallback) {
    if (window.AveryMemory && typeof window.AveryMemory.get === "function") {
        return window.AveryMemory.get(key, fallback);
    }

    return localStorage.getItem(key) === null ? fallback : JSON.parse(localStorage.getItem(key));
}

function setStoredTrackingValue(key, value) {
    if (window.AveryMemory && typeof window.AveryMemory.set === "function") {
        window.AveryMemory.set(key, value);
        return;
    }

    localStorage.setItem(key, JSON.stringify(value));
}

function generateTrackingId() {
    const today = new Date();
    const dateStamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

    const storageKey = "dasherlab_tracking_sequence";
    let sequence = parseInt(getStoredTrackingValue(storageKey, "0"), 10) + 1;
    const existingRequests = JSON.parse(localStorage.getItem("requests") || "[]");

    let trackingId = `DL-${dateStamp}-${String(sequence).padStart(5, "0")}`;
    while (existingRequests.some((request) => request.trackingId === trackingId)) {
        sequence += 1;
        trackingId = `DL-${dateStamp}-${String(sequence).padStart(5, "0")}`;
    }

    setStoredTrackingValue(storageKey, sequence);
    return trackingId;
}

function buildPickupRequestRecord(formValues) {
    const trackingId = generateTrackingId();

    return {
        trackingId,
        status: "Awaiting Dispatch",
        createdAt: new Date().toISOString(),
        customer: {
            customerName: formValues.fullName,
            companyName: formValues.businessName,
            email: formValues.email,
            phoneNumber: formValues.phone
        },
        delivery: {
            serviceLevel: formValues.deliveryType,
            pickupAddress: formValues.pickupAddress,
            deliveryAddress: formValues.deliveryAddress,
            pickupDate: formValues.pickupDate,
            pickupTime: formValues.pickupTime,
            notes: formValues.comments || ""
        },
        pickup: {
            pickupFacility: formValues.pickupFacility,
            pickupContact: formValues.pickupContact,
            pickupPhone: formValues.pickupPhone,
            deliveryFacility: formValues.deliveryFacility,
            deliveryContact: formValues.deliveryContact,
            deliveryPhone: formValues.deliveryPhone,
            packageType: formValues.packageType
        },
        createdBy: "Avery AI",
        // Future backend:
        // Save request record to database here.
        // Future:
        // Retrieve live shipment status here.
        source: "portal"
    };
}

function savePickupRequestRecord(record) {
    const requests = JSON.parse(localStorage.getItem("requests") || "[]");
    requests.push(record);
    localStorage.setItem("requests", JSON.stringify(requests));

    // Future backend:
    // POST record to backend API here.
    return record;
}

function getLatestPickupRequest() {
    const latestStored = localStorage.getItem("latestPickupRequest");
    if (latestStored) {
        try {
            const parsed = JSON.parse(latestStored);
            if (parsed && parsed.trackingId) {
                return parsed;
            }
        } catch (err) {
            // Fall back to the request list if the stored payload is invalid.
        }
    }

    const requests = JSON.parse(localStorage.getItem("requests") || "[]");
    return requests.length ? requests[requests.length - 1] : null;
}

function buildGoogleMapsUrl(origin, destination) {
    if (!origin || !destination) {
        return "";
    }

    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
}

window.generateTrackingId = generateTrackingId;
window.buildPickupRequestRecord = buildPickupRequestRecord;
window.savePickupRequestRecord = savePickupRequestRecord;
window.getLatestPickupRequest = getLatestPickupRequest;
window.buildGoogleMapsUrl = buildGoogleMapsUrl;
