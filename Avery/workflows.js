const AveryWorkflows = {


START_PICKUP: {

    1: {
        message:
        "Let's get your pickup scheduled. First, may I have your full name?",
        field:
        "customerName"
    },


    2: {
        message:
        "What business are you with?",
        field:
        "companyName"
    },


    3: {
        message:
        "Perfect. I have the business details I need, and I’ll carry the rest of the request forward for you.",
        field:
        null
    },


    4: {
        message:
        "Great! I have enough information to start your pickup request. I've already filled in the basics for you. Please review the remaining details before submitting.",
        field:
        null
    }

}


};


window.AveryWorkflows = AveryWorkflows;