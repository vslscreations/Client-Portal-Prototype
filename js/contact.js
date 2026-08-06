function submitContact(){
    const contactRequest = {
        type: "Human Follow-Up",
        name: document.getElementById("contactName").value,
        email: document.getElementById("contactEmail").value,
        message: document.getElementById("contactMessage").value,
        status: "Needs Review",
        createdBy: "Avery AI"
    };

    const requests = JSON.parse(localStorage.getItem("requests")) || [];
    requests.push(contactRequest);
    localStorage.setItem("requests", JSON.stringify(requests));
    alert("Your request has been sent to our team!");
    window.location.href = resolvePortalPath("index.html");
}

window.submitContact = submitContact;
