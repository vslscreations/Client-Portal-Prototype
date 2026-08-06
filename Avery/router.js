function routeIntent(intent){

    switch(intent){

        case AveryIntents.START_PICKUP:

            AveryActions.openPickup();

            break;

        case AveryIntents.REQUEST_QUOTE:

            AveryActions.openQuote();

            break;

        case AveryIntents.CONTACT_DISPATCH:

            AveryActions.openDispatch();

            break;

        case AveryIntents.GO_HOME:

            AveryActions.goHome();

            break;

        default:

            AveryActions.showMessage("I'm not sure how to help with that yet.");

    }

}

window.routeIntent = routeIntent;