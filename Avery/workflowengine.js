console.log("NEW WORKFLOW ENGINE LOADED");

const AveryWorkflowEngine = {

    start(workflowName){

        console.log("Workflow started:", workflowName);

        const workflow = AveryWorkflows[workflowName];

        if(!workflow){
            return "I don't know how to handle that yet.";
        }


        const forceNewRoute = AveryConversation.getData("forceNewRoute") === true;

        AveryConversation.setIntent(workflowName);
        AveryConversation.saveData("forceNewRoute", forceNewRoute);

        if(workflowName === "START_PICKUP"){

            AveryActions.startPickupTask(forceNewRoute);

            const isPickupPage = window.location.pathname.includes('/pickup.html') || window.location.pathname.endsWith('/pickup.html');
            const handoffMessageFlag = AveryConversation.getData("showAutoPopulatedRouteMessage") || AveryMemory.get("showAutoPopulatedRouteMessage", false);
            if(isPickupPage && handoffMessageFlag){
                AveryConversation.saveData("showAutoPopulatedRouteMessage", null);
                AveryMemory.remove("showAutoPopulatedRouteMessage");
                AveryConversation.setStep(1);

                const isFreshRoute = AveryConversation.getData("forceNewRoute") === true || AveryConversation.getData("freshRouteHandoff") === true || AveryMemory.get("freshRouteHandoff", false) === true;
                return isFreshRoute
                    ? "Your pickup form is now ready. The next time you submit a request, we’ll auto-fill the fields to save you time."
                    : "Your form has been auto-populated to save you time. Review the details and enter the time and date of your new pickup.";
            }

            if(forceNewRoute){
                AveryConversation.saveData("forceNewRoute", null);
                AveryConversation.setStep(1);
                return workflow[1].message;
            }

            const profile = AveryMemory && typeof AveryMemory.getCustomerProfile === "function"
                ? AveryMemory.getCustomerProfile()
                : null;

            if(profile && (profile.firstName || profile.companyName)){
                console.log("Returning customer detected", profile);
                AveryConversation.saveData("returningCustomer", true);

                const savedRoutes = AveryMemory && typeof AveryMemory.getSavedRoutes === "function"
                    ? AveryMemory.getSavedRoutes()
                    : [];

                const accountName = profile.companyName ? ` ${profile.companyName}` : "";
                const isPickupPage = window.location.pathname.includes('/pickup.html') || window.location.pathname.endsWith('/pickup.html');
                let response = `Welcome back${profile.firstName ? ` ${profile.firstName}` : ""}! I found your${accountName} account.`;

                if(savedRoutes.length){
                    response += `<br><br>I also found ${savedRoutes.length} saved route${savedRoutes.length > 1 ? "s" : ""} for you.`;
                    response += isPickupPage
                        ? `<br><br><button class="avery-inline-action" type="button" onclick="window.handleReturningCustomerChoice('useRoute')">Use saved route</button>`
                        : `<br><br>Reply with "use saved route" or let me know if you want to start a new route.`;
                } else {
                    response += `<br><br>I can help you start a fresh pickup request.`;
                }

                AveryConversation.setStep(1);
                return response;
            }

        }

        AveryConversation.setStep(1);


        return workflow[1].message;

    },

    applyRouteToPickup(route){
        if(!route){
            return null;
        }

        console.log("Saved route loaded", route);

        let task = AveryMemory.get("currentTask", null);
        if(!task){
            task = { type: "pickup", fields: {} };
        }

        task.fields = task.fields || {};
        task.fields.pickupAddress = route.pickupAddress || "";
        task.fields.deliveryAddress = route.deliveryAddress || "";
        task.fields.deliveryType = route.deliveryType || task.fields.deliveryType || task.fields.serviceLevel || "";
        task.fields.serviceLevel = route.deliveryType || task.fields.serviceLevel || task.fields.deliveryType || "";
        task.fields.companyName = route.companyName || route.nickname || "";
        task.fields.businessName = route.companyName || route.nickname || "";
        task.fields.fullName = (AveryMemory.getCustomerProfile ? AveryMemory.getCustomerProfile().firstName || "" : "") + ((AveryMemory.getCustomerProfile ? AveryMemory.getCustomerProfile().lastName || "" : "") ? ` ${AveryMemory.getCustomerProfile().lastName || ""}` : "");
        task.fields.email = AveryMemory.getCustomerProfile ? AveryMemory.getCustomerProfile().email || "" : "";
        task.fields.phone = AveryMemory.getCustomerProfile ? AveryMemory.getCustomerProfile().phone || "" : "";
        task.fields.pickupFacility = route.pickupFacility || "";
        task.fields.deliveryFacility = route.deliveryFacility || "";
        task.fields.pickupContact = route.pickupContact || "";
        task.fields.pickupPhone = route.pickupPhone || "";
        task.fields.deliveryContact = route.deliveryContact || "";
        task.fields.deliveryPhone = route.deliveryPhone || "";
        task.fields.packageType = route.packageType || "";

        AveryMemory.set("currentTask", task);
        AveryConversation.saveData("routeLoaded", true);
        AveryConversation.saveData("pickupAddress", route.pickupAddress || "");
        AveryConversation.saveData("deliveryAddress", route.deliveryAddress || "");
        AveryConversation.saveData("serviceLevel", route.deliveryType || "");
        AveryConversation.saveData("companyName", route.companyName || route.nickname || "");

        console.log("✅ Saved route loaded", route);
        console.log("✅ Task created", task);
        console.log("✅ Task fields populated", task.fields);

        if(window.AveryActions && typeof window.AveryActions.populatePickupForm === "function") {
            window.AveryActions.populatePickupForm(task);
        } else if(typeof window.populatePickupForm === "function") {
            window.populatePickupForm();
        }

        if(document.getElementById("step1")){
            document.getElementById("step1").classList.remove("hidden");
        }
        document.querySelectorAll(".form-card").forEach(function(card){
            if(card.id !== "step1"){
                card.classList.add("hidden");
            }
        });
        const stepText = document.getElementById("progressText");
        if(stepText){
            stepText.innerText = "Step 1 of 4";
        }
        const progressFill = document.getElementById("progressFill");
        if(progressFill){
            progressFill.style.width = "25%";
        }

        return task;
    },

    handleReturningCustomerChoice(choice){
        const savedRoutes = AveryMemory && typeof AveryMemory.getSavedRoutes === "function"
            ? AveryMemory.getSavedRoutes()
            : [];

        if(choice === "useRoute" && savedRoutes.length){
            const latestRoute = savedRoutes.slice().sort(function(a, b){
                const aTime = a.lastUsed || "";
                const bTime = b.lastUsed || "";
                return bTime.localeCompare(aTime);
            })[0];

            this.applyRouteToPickup(latestRoute);
            AveryConversation.saveData("pendingPickupPrompt", "pickupDatePickupTimeNotes");
            AveryConversation.saveData("showAutoPopulatedRouteMessage", true);
            AveryConversation.saveData("freshRouteHandoff", false);
            AveryMemory.set("showAutoPopulatedRouteMessage", true);
            AveryMemory.remove("freshRouteHandoff");
            return "I have auto-populated the form to match your saved route. Verify it’s all correct, then enter the time and date of your new request.";
        }

        AveryConversation.saveData("pendingPickupPrompt", "pickupDatePickupTimeNotes");
        return "No problem. I’ll keep this quick and ask only for the pickup date, pickup time, and any additional notes.";
    },


    handleResponse(message){

        console.log("Workflow response received:", message);

        const intent = AveryConversation.currentIntent;

        const step = AveryConversation.currentStep;

        if(intent === "START_PICKUP" && AveryConversation.getData("pendingPickupPrompt") === "pickupDatePickupTimeNotes"){
            AveryConversation.saveData("pendingPickupPrompt", null);
            AveryConversation.setStep(4);
            return "Perfect. I have your route ready. Please share the pickup date, pickup time, and any additional notes.";
        }

        if(intent === "START_PICKUP" && typeof message === "string" && message.toLowerCase().includes("use saved route")){
            const savedRoutes = AveryMemory && typeof AveryMemory.getSavedRoutes === "function"
                ? AveryMemory.getSavedRoutes()
                : [];
            if(savedRoutes.length){
                const latestRoute = savedRoutes.slice().sort(function(a, b){
                    const aTime = a.lastUsed || "";
                    const bTime = b.lastUsed || "";
                    return bTime.localeCompare(aTime);
                })[0];
                this.applyRouteToPickup(latestRoute);
                AveryConversation.saveData("pendingPickupPrompt", "pickupDatePickupTimeNotes");
                AveryConversation.saveData("showAutoPopulatedRouteMessage", true);
                AveryConversation.saveData("freshRouteHandoff", false);
                AveryMemory.set("showAutoPopulatedRouteMessage", true);
                AveryMemory.remove("freshRouteHandoff");

                if(window.AveryActions && typeof window.AveryActions.openPickup === "function"){
                    window.AveryActions.openPickup();
                } else {
                    window.location.href = window.resolvePortalPath ? window.resolvePortalPath("pages/pickup.html") : "pages/pickup.html";
                }

                return "I have auto-populated the form to match your saved route. Verify it’s all correct, then enter the time and date of your new request.";
            }
        }

        const workflow = AveryWorkflows[intent];


        if(!workflow){
            return null;
        }


        const currentQuestion = workflow[step];


if(currentQuestion){

    // Save to conversation memory
    AveryConversation.saveData(
        currentQuestion.field,
        message
    );


    // Save to current task
    let task = AveryMemory.get("currentTask", null);


    if(task){

        task.fields[currentQuestion.field] = message;

        AveryMemory.set("currentTask", task);

    }

}

        if(intent === "START_PICKUP" && step === 2 && typeof message === "string"){
            const currentQuestion = workflow[step];
            if(currentQuestion && currentQuestion.field === "companyName"){
                AveryConversation.setStep(4);
                AveryConversation.saveData("pendingPickupPrompt", "pickupDatePickupTimeNotes");
                AveryConversation.saveData("showAutoPopulatedRouteMessage", true);
                AveryMemory.set("showAutoPopulatedRouteMessage", true);

                const isFreshRoute = AveryConversation.getData("forceNewRoute") === true || AveryConversation.getData("freshRouteHandoff") === true || AveryMemory.get("freshRouteHandoff", false) === true;
                if(!isFreshRoute){
                    AveryConversation.saveData("freshRouteHandoff", true);
                    AveryMemory.set("freshRouteHandoff", true);
                }

                const handoffMessage = isFreshRoute || AveryConversation.getData("freshRouteHandoff") === true || AveryMemory.get("freshRouteHandoff", false) === true
                    ? "Your pickup form is now ready. The next time you submit a request, we’ll auto-fill the fields to save you time."
                    : "Your form has been auto-populated to save you time. Review the details and enter the time and date of your new pickup.";

                setTimeout(function(){
                    if(window.AveryActions && typeof window.AveryActions.openPickup === "function"){
                        window.AveryActions.openPickup();
                    } else {
                        window.location.href = window.resolvePortalPath ? window.resolvePortalPath("pages/pickup.html") : "pages/pickup.html";
                    }
                }, 1000);

                return `
                    <div class="avery-handoff">
                        <div class="avery-handoff-dots" aria-hidden="true">
                            <span></span><span></span><span></span>
                        </div>
                        <div>${handoffMessage}</div>
                    </div>
                `;
            }
        }

        const nextStep = step + 1;


        if(workflow[nextStep]){

            AveryConversation.setStep(nextStep);

            return workflow[nextStep].message;

        }


        return "Thank you. I have collected all the information I need.";

    }

};


window.AveryWorkflowEngine = AveryWorkflowEngine;
window.handleReturningCustomerChoice = function(choice){
    const result = AveryWorkflowEngine.handleReturningCustomerChoice(choice);
    console.log("Returning customer choice", choice, result);
    const prompt = document.getElementById("averyPrompt");
    if(prompt){
        prompt.innerHTML = result;
    }
    return result;
};