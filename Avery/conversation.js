const AveryConversation = {

    currentIntent: null,

    currentStep: null,

    data: {},


    setIntent(intent){

        this.currentIntent = intent;
        this.currentStep = 1;
        this.data = {};

    },


    setStep(step){

        this.currentStep = step;

    },


    saveData(key,value){

        this.data[key] = value;

    },


    getData(key){

        return this.data[key];

    },


    reset(){

        this.currentIntent = null;
        this.currentStep = null;
        this.data = {};

    }

};


window.AveryConversation = AveryConversation;