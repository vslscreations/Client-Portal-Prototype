const AveryResponses = {

    START_PICKUP: `
        I'd be happy to help coordinate your dispatch.

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
    `,

    OWNER_WELCOME: `
        I can help you review dispatch operations.

        <br><br>

        Try asking:
        <br>
        • What's today's schedule?
        <br>
        • How is business doing?
        <br>
        • Who are my top customers?
        <br>
        • What routes do we use most?
        <br>
        • Show recent requests
    `,

    OWNER_HELP: `
        I can summarize today's schedule, business performance, top customers, route usage, and recent requests.
    `

};


window.AveryResponses = AveryResponses;