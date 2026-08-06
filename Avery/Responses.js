const AveryResponses = {

    START_PICKUP: `
        I'd be happy to help schedule your pickup.

        <br><br>

        <button onclick="AveryActions.openPickup()">
        📦 Start Pickup Request
        </button>
    `,


    REQUEST_QUOTE: `
        I can help you request a delivery quote.

        <br><br>

        <button onclick="AveryActions.openQuote()">
        💰 Get Your Instant Estimate
        </button>
    `,


    CONTACT_DISPATCH: `
        I'd be happy to connect you with a member of our team.

        <br><br>

        <button onclick="AveryActions.openDispatch()">
        📞 Contact Team
        </button>
    `,


    UNKNOWN: `
        I'd be happy to help.

        <br><br>

        I can assist with:
        <br>
        ✔ Pickup requests
        <br>
        ✔ Quotes
        <br>
        ✔ Contacting our team
    `

};


window.AveryResponses = AveryResponses;