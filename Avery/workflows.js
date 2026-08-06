const AveryWorkflows = {


START_PICKUP: {

    1: {
        message:
        "Let's get your pickup scheduled. First, may I have your first and last name?",
        field:
        "customerName"
    },


    2: {
        message:
        "What type of delivery do you need? STAT, Rush, Same-Day, or Scheduled?",
        field:
        "serviceLevel"
    },


    3: {
        message:
        "What business are you with?",
        field:
        "companyName"
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