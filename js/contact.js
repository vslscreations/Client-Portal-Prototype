function getContactSubmitButton(){
    return document.querySelector('.form-card .primary-button[onclick*="submitContact"]');
}

function getOrCreateContactStatusElement(){
    let statusEl = document.getElementById("contactSubmitStatus");
    if(statusEl){
        return statusEl;
    }

    const card = document.querySelector(".form-card");
    if(!card){
        return null;
    }

    statusEl = document.createElement("p");
    statusEl.id = "contactSubmitStatus";
    statusEl.className = "empty-state";
    statusEl.setAttribute("role", "status");
    statusEl.setAttribute("aria-live", "polite");
    statusEl.style.marginTop = "14px";
    card.appendChild(statusEl);
    return statusEl;
}

function setContactSubmitState(isBusy){
    const button = getContactSubmitButton();
    if(!button){
        return;
    }

    if(isBusy){
        if(!button.dataset.originalText){
            button.dataset.originalText = button.textContent;
        }
        button.disabled = true;
        button.textContent = "Submitting...";
        button.setAttribute("aria-busy", "true");
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || "Send Request";
        button.removeAttribute("aria-busy");
    }
}

function showContactSubmitStatus(message, type){
    const statusEl = getOrCreateContactStatusElement();
    if(!statusEl){
        return;
    }

    statusEl.textContent = message;
    statusEl.style.color = type === "error" ? "#b42318" : "#0b2f6b";
}

function classifyContactRequest(message){
    const text = String(message || "").toLowerCase();
    if(text.includes("emergency") || text.includes("urgent") || text.includes("asap") || text.includes("immediately")){
        return { requestType: "emergency_dispatch", priority: "Urgent" };
    }

    if(text.includes("dispatch") || text.includes("driver") || text.includes("pickup")){
        return { requestType: "contact_dispatch", priority: "Standard" };
    }

    return { requestType: "general_contact", priority: "Standard" };
}

async function submitContact(){
    const nameField = document.getElementById("contactName");
    const phoneField = document.getElementById("contactPhone");
    const emailField = document.getElementById("contactEmail");
    const messageField = document.getElementById("contactMessage");

    if(!nameField || !emailField || !messageField){
        return;
    }

    const name = nameField.value.trim();
    const phone = phoneField ? phoneField.value.trim() : "";
    const email = emailField.value.trim();
    const message = messageField.value.trim();

    if(!name){
        nameField.reportValidity();
        showContactSubmitStatus("Please enter your name.", "error");
        return;
    }

    if(!email || !emailField.checkValidity()){
        emailField.reportValidity();
        showContactSubmitStatus("Please enter a valid email address.", "error");
        return;
    }

    if(!message){
        messageField.reportValidity();
        showContactSubmitStatus("Please enter details so our team can help.", "error");
        return;
    }

    if(!window.DasherLabClientAuth || !window.supabaseClient){
        window.location.replace(resolvePortalPath("client-login.html"));
        return;
    }

    setContactSubmitState(true);
    showContactSubmitStatus("", "success");

    try {
        const sessionResult = await window.supabaseClient.auth.getSession();
        const session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
        if(!session || !session.user || !session.user.id){
            window.location.replace(resolvePortalPath("client-login.html"));
            return;
        }

        const association = await window.DasherLabClientAuth.getClientAssociationByUserId(session.user.id);
        if(!association || !association.ok || !association.context || !association.context.businessId){
            showContactSubmitStatus("Your account is not linked to an active business profile. Please contact support.", "error");
            return;
        }

        const classification = classifyContactRequest(message);
        const payload = {
            business_id: association.context.businessId,
            created_by_user_id: session.user.id,
            client_user_id: session.user.id,
            name: name,
            phone: phone || null,
            email: email,
            message: message,
            request_type: classification.requestType,
            priority: classification.priority,
            status: "Needs Review"
        };

        const insertResult = await window.supabaseClient
            .from("contact_requests")
            .insert(payload)
            .select("id")
            .maybeSingle();

        if(insertResult.error || !insertResult.data || !insertResult.data.id){
            showContactSubmitStatus("We could not submit your request right now. Please try again.", "error");
            return;
        }

        try {
            await window.DasherLabEmailNotifications.sendRequestNotification("contact_dispatch_submitted", {
                eventType: "contact_dispatch_submitted",
                type: "contact",
                requestType: "contact",
                reference: insertResult.data.id,
                customerName: name,
                customerEmail: email,
                customerPhone: phone,
                message: message,
                submittedAt: new Date().toISOString(),
                businessId: association.context.businessId,
                createdByUserId: session.user.id
            });
        } catch (error) {
            console.warn("[contact-email] notification failed but request already saved", error);
        }

        showContactSubmitStatus("Your request was sent to the dispatch team.", "success");
        setTimeout(function(){
            window.location.href = resolvePortalPath("index.html");
        }, 900);
    } catch (error) {
        showContactSubmitStatus("We could not submit your request right now. Please try again.", "error");
    } finally {
        setContactSubmitState(false);
    }
}

window.submitContact = submitContact;
