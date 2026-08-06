function populatePickupForm(){
    if(window.AveryActions && typeof window.AveryActions.populatePickupForm === "function") {
        return window.AveryActions.populatePickupForm(AveryMemory.get("currentTask", null));
    }

    const task = AveryMemory.get("currentTask", null);
    if(!task){
        console.log("No Avery task found");
        return null;
    }

    const fields = task.fields || {};
    const setValue = (id, value) => {
        const element = document.getElementById(id);
        if(element){
            element.value = value || "";
        }
    };

    setValue("fullName", fields.fullName || fields.customerName || fields.contactName || "");
    setValue("businessName", fields.businessName || fields.companyName || "");
    setValue("deliveryType", fields.deliveryType || fields.serviceLevel || "");
    setValue("email", fields.email || "");
    setValue("phone", fields.phone || fields.phoneNumber || "");
    setValue("pickupFacility", fields.pickupFacility || "");
    setValue("pickupAddress", fields.pickupAddress || "");
    setValue("pickupContact", fields.pickupContact || "");
    setValue("pickupPhone", fields.pickupPhone || fields.pickupPhoneNumber || "");
    setValue("deliveryFacility", fields.deliveryFacility || "");
    setValue("deliveryAddress", fields.deliveryAddress || "");
    setValue("deliveryContact", fields.deliveryContact || "");
    setValue("deliveryPhone", fields.deliveryPhone || "");
    setValue("packageType", fields.packageType || "");
    console.log("Avery populated pickup form");
    return task;
}