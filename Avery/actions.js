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

    showMessage: function(message) {
        console.log("Avery:", message);
    }

};


// Make Avery actions available everywhere
window.AveryActions = AveryActions;

AveryActions.startPickupTask = function(){

    const task = AveryTaskModel.createPickupTask();

    AveryMemory.set("currentTask", task);

    return task;

};