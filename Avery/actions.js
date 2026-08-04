// Avery Action Registry
// This file contains every action Avery is allowed to perform.

const AveryActions = {

    // Navigation Actions

    goHome: function () {
        window.location.href = "index.html";
    },

    openPickup: function () {
        window.location.href = "pickup.html";
    },

    openQuote: function () {
        window.location.href = "quote.html";
    },

    openDispatch: function () {
        window.location.href = "contact.html";
    },


    // User Actions

    logout: function () {
        localStorage.clear();
        window.location.href = "login.html";
    },


    // Avery System Actions

    showMessage: function(message) {
        console.log("Avery:", message);
    }

};


// Make Avery actions available everywhere
window.AveryActions = AveryActions;