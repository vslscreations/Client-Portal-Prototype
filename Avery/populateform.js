function populatePickupForm(){

    const task = AveryMemory.get("currentTask", null);


    if(!task){
        console.log("No Avery task found");
        return;
    }


    const fields = task.fields || {};

    const setValue = (id, value) => {
        const element = document.getElementById(id);
        if(element){
            element.value = value || "";
        }
    };

    setValue("fullName", fields.customerName || fields.contactName || "");
    setValue("businessName", fields.companyName || "");
    setValue("deliveryType", fields.serviceLevel || "");
    setValue("email", fields.email || "");
    setValue("phone", fields.phoneNumber || "");
    setValue("pickupAddress", fields.pickupAddress || "");
    setValue("deliveryAddress", fields.deliveryAddress || "");

    console.log("Avery populated pickup form");

}