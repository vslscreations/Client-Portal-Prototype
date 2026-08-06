function detectIntent(message) {

    const text = message.toLowerCase();

    if (
        text.includes("pickup") ||
        text.includes("package") ||
        text.includes("courier")
    ) {
        return AveryIntents.START_PICKUP;
    }

    if (
        text.includes("quote") ||
        text.includes("price")
    ) {
        return AveryIntents.REQUEST_QUOTE;
    }

    if (
        text.includes("dispatch") ||
        text.includes("call")
    ) {
        return AveryIntents.CONTACT_DISPATCH;
    }

    if (
        text.includes("dashboard")
    ) {
        return AveryIntents.VIEW_DASHBOARD;
    }

    if (
        text.includes("profile")
    ) {
        return AveryIntents.OPEN_PROFILE;
    }

    if (
        text.includes("home")
    ) {
        return AveryIntents.GO_HOME;
    }

    return AveryIntents.UNKNOWN;

}

window.detectIntent = detectIntent;