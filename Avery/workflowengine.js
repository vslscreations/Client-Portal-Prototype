console.log("NEW WORKFLOW ENGINE LOADED");

const AveryWorkflowEngine = {

    start(workflowName){

        console.log("Workflow started:", workflowName);

        const workflow = AveryWorkflows[workflowName];

        if(!workflow){
            return "I don't know how to handle that yet.";
        }


        AveryConversation.setIntent(workflowName);

        if(workflowName === "START_PICKUP"){

    AveryActions.startPickupTask();

}

        AveryConversation.setStep(1);


        return workflow[1].message;

    },


    handleResponse(message){

        console.log("Workflow response received:", message);

        const intent = AveryConversation.currentIntent;

        const step = AveryConversation.currentStep;


        const workflow = AveryWorkflows[intent];


        if(!workflow){
            return null;
        }


        const currentQuestion = workflow[step];


if(currentQuestion){

    // Save to conversation memory
    AveryConversation.saveData(
        currentQuestion.field,
        message
    );


    // Save to current task
    let task = AveryMemory.get("currentTask", null);


    if(task){

        task.fields[currentQuestion.field] = message;

        AveryMemory.set("currentTask", task);

    }

}

        const nextStep = step + 1;


        if(workflow[nextStep]){

            AveryConversation.setStep(nextStep);

            return workflow[nextStep].message;

        }


        return "Thank you. I have collected all the information I need.";

    }

};


window.AveryWorkflowEngine = AveryWorkflowEngine;