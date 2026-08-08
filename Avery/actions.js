// Avery Action Registry
// This file contains every action Avery is allowed to perform.

const AveryActions = {

    // Navigation Actions

    goHome: function () {
        window.location.href = window.resolvePortalPath ? window.resolvePortalPath("index.html") : "index.html";
    },

    openPickup: function () {
        window.location.href = window.resolvePortalPath ? window.resolvePortalPath("pages/pickup.html") : "pages/pickup.html";
    },

    openQuote: function () {
        window.location.href = window.resolvePortalPath ? window.resolvePortalPath("pages/quote.html") : "pages/quote.html";
    },

    openDispatch: function () {
        window.location.href = window.resolvePortalPath ? window.resolvePortalPath("pages/contact.html") : "pages/contact.html";
    },


    // User Actions

    logout: function () {
        localStorage.clear();
        window.location.href = window.resolvePortalPath ? window.resolvePortalPath("login.html") : "login.html";
    },


    // Avery System Actions

    populatePickupForm: function(task) {
        const currentTask = task || AveryMemory.get("currentTask", null);
        if(!currentTask){
            console.log("No Avery task found");
            return null;
        }

        const fields = currentTask.fields || {};
        console.log("✅ Task fields populated", fields);

        const setValue = function(id, value) {
            const element = document.getElementById(id);
            if(element){
                element.value = value || "";
            }
        };

        setValue("fullName", fields.fullName || fields.customerName || fields.contactName || "");
        setValue("businessName", fields.businessName || fields.companyName || "");
        setValue("email", fields.email || "");
        setValue("phone", fields.phone || fields.phoneNumber || "");
        setValue("deliveryType", fields.deliveryType || fields.serviceLevel || "");
        setValue("pickupFacility", fields.pickupFacility || "");
        setValue("pickupAddress", fields.pickupAddress || "");
        setValue("pickupContact", fields.pickupContact || "");
        setValue("pickupPhone", fields.pickupPhone || fields.pickupPhoneNumber || "");
        setValue("deliveryFacility", fields.deliveryFacility || "");
        setValue("deliveryAddress", fields.deliveryAddress || "");
        setValue("deliveryContact", fields.deliveryContact || "");
        setValue("deliveryPhone", fields.deliveryPhone || "");
        setValue("packageType", fields.packageType || "");

        if(typeof window.populateReview === "function") {
            window.populateReview();
        }

        console.log("✅ HTML form populated", fields);
        return currentTask;
    },

    showMessage: function(message) {
        console.log("Avery:", message);
    }

};


// Make Avery actions available everywhere
window.AveryActions = AveryActions;

AveryActions.startPickupTask = function(forceNew){

    const existingTask = AveryMemory.get("currentTask", null);
    const shouldReset = forceNew === true || AveryConversation.getData("forceNewRoute") === true;
    const hasExistingValues = existingTask && existingTask.fields && Object.keys(existingTask.fields).some(function(key){
        const value = existingTask.fields[key];
        return value !== "" && value !== null && value !== undefined;
    });

    if(!shouldReset && existingTask && hasExistingValues){
        console.log("✅ Reusing existing pickup task", existingTask);
        return existingTask;
    }

    const task = AveryTaskModel.createPickupTask();

    AveryMemory.set("currentTask", task);
    console.log("✅ Task created", task);

    return task;

};